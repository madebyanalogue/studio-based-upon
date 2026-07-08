export const useSiteSettings = () => {
  const query = `*[_type == "siteSettings"][0] {
    title,
    logo,
    seoTitle,
    seoDescription,
    disablePreloader,
    enquiryEmail,
    copyright,
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

  const defaultMenu = {
    items: [
      { _key: '1', text: 'Flow State', path: '/' },
      { _key: '2', text: 'Materials & Forms', path: '/products' },
      { _key: '3', text: '(Pre)Crafted', path: '/pre-crafted' },
      { _key: '4', text: 'About', path: '/about' },
    ],
  }

  const normalizeMenuItems = (items: { _key?: string; text?: string; path?: string }[] = []) =>
    items.map((item) =>
      item.path === '/products' ? { ...item, text: 'Materials & Forms' } : item,
    )

  const headerMenu = computed(() => {
    const menu = settings.value?.headerMenu || defaultMenu
    return {
      ...menu,
      items: normalizeMenuItems(
        (menu.items || []).filter((item: { path?: string }) => item.path !== '/contact'),
      ),
    }
  })
  const mobileMenu = computed(() => {
    const menu = settings.value?.mobileMenu || settings.value?.headerMenu || defaultMenu
    return { ...menu, items: normalizeMenuItems(menu.items || []) }
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
    headerMenu,
    mobileMenu,
  }
}
