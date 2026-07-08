export const useProductOverlay = () => {
  const openSlug = useState<string | null>('product-overlay-slug', () => null)
  const isOpen = computed(() => !!openSlug.value)

  const open = (slug: string) => {
    openSlug.value = slug
    if (import.meta.client) {
      const url = `/products/${slug}`
      window.history.pushState({ productOverlay: slug }, '', url)
      document.documentElement.style.overflow = 'hidden'
    }
  }

  const close = () => {
    openSlug.value = null
    if (import.meta.client) {
      document.documentElement.style.overflow = ''
    }
  }

  return { openSlug, isOpen, open, close }
}
