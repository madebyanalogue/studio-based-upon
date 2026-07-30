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
      label
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
      { _key: '1', text: 'Discovery', path: '/' },
      { _key: '2', text: 'Materials & Forms', path: '/materials-and-forms' },
      { _key: '3', text: '(Pre)Crafted', path: '/pre-crafted' },
      { _key: '4', text: 'About', path: '/about' },
      { _key: '5', text: 'Enquire', path: '/enquire' },
    ],
  }

  const normalizeMenuItems = (items: { _key?: string; text?: string; path?: string }[] = []) =>
    items.map((item) => {
      if (item.path === '/products' || item.path === '/materials-and-forms') {
        return { ...item, text: 'Materials & Forms', path: '/materials-and-forms' }
      }
      if (item.path === '/' || item.text === 'Flow State') return { ...item, text: 'Discovery' }
      if (item.path === '/contact') return { ...item, text: 'Enquire', path: '/enquire' }
      return item
    })

  const withEnquire = (items: { _key?: string; text?: string; path?: string }[] = []) => {
    const filtered = items.filter(
      (item) => item.path !== '/contact' && item.path !== '/enquire',
    )
    return [
      ...normalizeMenuItems(filtered),
      { _key: 'enquire', text: 'Enquire', path: '/enquire' },
    ]
  }

  const headerMenu = computed(() => {
    const menu = settings.value?.headerMenu || defaultMenu
    return {
      ...menu,
      items: withEnquire(menu.items || []),
    }
  })
  const mobileMenu = computed(() => {
    const menu = settings.value?.mobileMenu || settings.value?.headerMenu || defaultMenu
    return {
      ...menu,
      items: withEnquire(menu.items || []),
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
