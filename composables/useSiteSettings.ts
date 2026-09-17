import { resolveLibraryPageFilters } from './demoData'

export const useSiteSettings = () => {
  const query = `*[_type == "siteSettings"][0] {
    title,
    logo,
    seoTitle,
    seoDescription,
    disablePreloader,
    enquiryEmail,
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
  const logo = computed(() => settings.value?.logo || '')
  const disablePreloader = computed(() => settings.value?.disablePreloader === true)
  const enquiryEmail = computed(() => settings.value?.enquiryEmail || 'enquiries@studiobasedupon.com')
  const copyright = computed(() => {
    const text = settings.value?.copyright || '© [year] Studio Based Upon'
    return text.replace(/\[year\]/g, String(new Date().getFullYear()))
  })

  const libraryFilters = computed(() =>
    resolveLibraryPageFilters(settings.value?.libraryFilters),
  )

  const defaultMenu = {
    items: [
      { _key: '0', text: 'Showcase', path: '/' },
      { _key: '1', text: 'Discovery', path: '/discovery' },
      { _key: '2', text: 'Materials & Forms', path: '/materials-and-forms' },
      { _key: '3', text: '(Pre)Crafted', path: '/pre-crafted' },
      { _key: '4', text: 'About', path: '/about' },
    ],
  }

  const normalizeMenuItems = (items: { _key?: string; text?: string; path?: string }[] = []) => {
    const normalized = items
      .filter(
        (item) =>
          item.path !== '/contact' &&
          item.path !== '/enquire' &&
          item.path !== '/gs',
      )
      .map((item) => {
        if (item.path === '/products' || item.path === '/materials-and-forms') {
          return { ...item, text: 'Materials & Forms', path: '/materials-and-forms' }
        }
        // Legacy CMS: homepage used to be Discovery / Flow State
        if (
          item.path === '/' &&
          (item.text === 'Discovery' || item.text === 'Flow State')
        ) {
          return { ...item, text: 'Discovery', path: '/discovery' }
        }
        if (item.path === '/discovery' || item.text === 'Flow State') {
          return { ...item, text: 'Discovery', path: '/discovery' }
        }
        if (item.path === '/' || item.text === 'Showcase' || item.text === 'Home') {
          return { ...item, text: 'Showcase', path: '/' }
        }
        return item
      })

    const hasShowcase = normalized.some((item) => item.path === '/')
    const hasDiscovery = normalized.some((item) => item.path === '/discovery')

    if (!hasShowcase) {
      normalized.unshift({ _key: 'showcase', text: 'Showcase', path: '/' })
    }
    if (!hasDiscovery) {
      const insertAt = normalized.findIndex((item) => item.path === '/')
      normalized.splice(insertAt + 1, 0, {
        _key: 'discovery',
        text: 'Discovery',
        path: '/discovery',
      })
    }

    return normalized
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
    logo,
    disablePreloader,
    enquiryEmail,
    copyright,
    libraryFilters,
    headerMenu,
    mobileMenu,
  }
}
