import { resolveLibraryPageFilters } from './demoData'

export const useSiteSettings = () => {
  const query = `*[_type == "siteSettings"][0] {
    title,
    logo,
    logoStyle,
    seoTitle,
    seoDescription,
    googleTagId,
    facebookShareImage {
      "url": asset->url,
      "width": asset->metadata.dimensions.width,
      "height": asset->metadata.dimensions.height
    },
    disablePreloader,
    enquiryEmail,
    phone,
    phoneTel,
    streetAddress,
    addressLocality,
    postalCode,
    addressCountry,
    copyright,
    libraryFilters[] {
      filter,
      kind,
      type,
      tag,
      label,
      "materialitySlug": materiality->slug.current,
      "materialityTitle": materiality->title
    },
    headerMenu-> {
      title,
      items[] { _key, text, path }
    },
    mobileMenu-> {
      title,
      items[] { _key, text, path }
    }
  }`

  const { data: settings } = useAsyncData('siteSettings', () =>
    $fetch('/api/sanity/query', {
      method: 'POST',
      body: { query },
    })
      .then((result: { result?: unknown }) => result?.result ?? null)
      .catch(() => null),
    { server: true },
  )

  const title = computed(() => settings.value?.title || 'Studio Based Upon')
  const seoTitle = computed(() => settings.value?.seoTitle || 'Studio Based Upon')
  const seoDescription = computed(() => settings.value?.seoDescription || '')
  const googleTagId = computed(() => {
    const id = String(settings.value?.googleTagId || '').trim()
    return /^(G|GT|AW|DC|GTM)-[A-Z0-9]+$/i.test(id) ? id : ''
  })
  const facebookShareImage = computed(() => {
    const image = settings.value?.facebookShareImage
    const url = typeof image?.url === 'string' ? image.url : ''
    if (!url.startsWith('https://')) return null
    return {
      url,
      width: Number(image?.width) || undefined,
      height: Number(image?.height) || undefined,
    }
  })
  const logo = computed(() => settings.value?.logo || '')
  const logoStyle = computed(() => (settings.value?.logoStyle === 'text' ? 'text' : 'svg'))
  const disablePreloader = computed(() => settings.value?.disablePreloader === true)
  const enquiryEmail = computed(() => settings.value?.enquiryEmail || 'enquiries@studiobasedupon.com')
  const phone = computed(() => settings.value?.phone || '+44 20 8320 2122')
  const phoneTel = computed(
    () => settings.value?.phoneTel || '+442083202122',
  )
  const streetAddress = computed(
    () => settings.value?.streetAddress || '4 Swan Rd',
  )
  const addressLocality = computed(
    () => settings.value?.addressLocality || 'London',
  )
  const postalCode = computed(() => settings.value?.postalCode || 'SE18 5TT')
  const addressCountry = computed(
    () => settings.value?.addressCountry || 'GB',
  )
  const addressDisplay = computed(
    () =>
      [streetAddress.value, addressLocality.value, postalCode.value]
        .filter(Boolean)
        .join(', '),
  )
  const copyright = computed(() => {
    const text = settings.value?.copyright || '© [year] Studio Based Upon'
    return text.replace(/\[year\]/g, String(new Date().getFullYear()))
  })

  const libraryFilters = computed(() =>
    resolveLibraryPageFilters(settings.value?.libraryFilters),
  )

  const MAIN_NAV_ORDER = [
    { path: '/discover', text: 'Discover' },
    { path: '/discovery', text: 'Discovery' },
    { path: '/typology', text: 'Typology' },
    { path: '/materials-and-forms', text: 'Materials & Forms' },
    { path: '/curate', text: 'Curate' },
    { path: '/pre-crafted', text: '(Pre)Crafted' },
    { path: '/about', text: 'About' },
  ] as const

  const defaultMenu = {
    items: MAIN_NAV_ORDER.map((item, index) => ({
      _key: String(index),
      text: item.text,
      path: item.path,
    })),
  }

  const normalizeMenuItems = (items: { _key?: string; text?: string; path?: string }[] = []) => {
    const byPath = new Map<string, { _key?: string; text?: string; path?: string }>()

    for (const item of items) {
      if (
        !item.path ||
        item.path === '/' ||
        item.path === '/#showcase' ||
        item.path === '/contact' ||
        item.path === '/enquire' ||
        item.path === '/gs' ||
        item.path === '/infinite-slider' ||
        item.text === 'Home' ||
        item.text === 'Showcase' ||
        item.text === 'Infinite Slider' ||
        item.text === 'Flow State'
      ) {
        continue
      }

      let path = item.path
      let text = item.text || ''

      if (path === '/discover' || text === 'Discover') {
        path = '/discover'
        text = 'Discover'
      } else if (path === '/discovery' || text === 'Discovery') {
        path = '/discovery'
        text = 'Discovery'
      } else if (path === '/products' || path === '/materials-and-forms') {
        path = '/materials-and-forms'
        text = 'Materials & Forms'
      } else if (
        path === '/typology' ||
        path === '/curated-discovery' ||
        text === 'Typology' ||
        text === 'Curated Discovery'
      ) {
        path = '/typology'
        text = 'Typology'
      } else if (
        path === '/curate' ||
        path === '/#curate' ||
        text === 'Curate' ||
        text === 'Showcase Reels'
      ) {
        path = '/curate'
        text = 'Curate'
      } else if (path === '/pre-crafted' || text === '(Pre)Crafted') {
        path = '/pre-crafted'
        text = '(Pre)Crafted'
      } else if (path === '/about' || text === 'About') {
        path = '/about'
        text = 'About'
      }

      byPath.set(path, { ...item, path, text })
    }

    return MAIN_NAV_ORDER.map((slot, index) => {
      const existing = byPath.get(slot.path)
      return {
        _key: existing?._key || String(index),
        text: slot.text,
        path: slot.path,
      }
    })
  }

  const headerMenu = computed(() => {
    const menu = settings.value?.headerMenu || defaultMenu
    return {
      ...menu,
      items: normalizeMenuItems(menu.items || []),
    }
  })
  const mobileMenu = computed(() => {
    const menu = settings.value?.mobileMenu || settings.value?.headerMenu || defaultMenu
    return {
      ...menu,
      items: normalizeMenuItems(menu.items || []),
    }
  })

  return {
    settings,
    title,
    seoTitle,
    seoDescription,
    googleTagId,
    facebookShareImage,
    logo,
    logoStyle,
    disablePreloader,
    enquiryEmail,
    phone,
    phoneTel,
    streetAddress,
    addressLocality,
    postalCode,
    addressCountry,
    addressDisplay,
    copyright,
    libraryFilters,
    headerMenu,
    mobileMenu,
  }
}
