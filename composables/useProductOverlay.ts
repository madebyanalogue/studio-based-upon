import { Flip } from 'gsap/Flip'

export type ProductOverlayOpenOptions = {
  /** Clicked thumbnail — Flip animates from / back to this element */
  source?: HTMLElement | null
  /** Gallery index visible on the grid when opening */
  imageIndex?: number
  /** Prefetched hero-sized URL for a sharp Flip flyer (falls back to source src) */
  flipSrc?: string | null
}

export type ProductReturnImage = {
  productId: string
  index: number
}

// Keep Flip source off useState — DOM nodes are not serializable
let flipSourceEl: HTMLElement | null = null
let flipImageUrl: string | null = null

export const useProductOverlay = () => {
  const openSlug = useState<string | null>('product-overlay-slug', () => null)
  const returnUrl = useState<string | null>('product-overlay-return', () => null)
  const pendingFlip = useState<boolean>('product-overlay-pending-flip', () => false)
  const closingFlip = useState<boolean>('product-overlay-closing-flip', () => false)
  const openImageIndex = useState<number>('product-overlay-image-index', () => 0)
  const returnImage = useState<ProductReturnImage | null>(
    'product-overlay-return-image',
    () => null,
  )
  const isOpen = computed(() => !!openSlug.value)

  const open = (slug: string, options: ProductOverlayOpenOptions = {}) => {
    const alreadyOpen = !!openSlug.value

    if (import.meta.client && !alreadyOpen) {
      returnUrl.value =
        window.location.pathname + window.location.search + window.location.hash

      if (options.source) {
        flipSourceEl = options.source
        flipImageUrl = options.flipSrc || null
        pendingFlip.value = true
      } else {
        flipSourceEl = null
        flipImageUrl = null
        pendingFlip.value = false
      }
      closingFlip.value = false
      openImageIndex.value =
        typeof options.imageIndex === 'number' && options.imageIndex >= 0
          ? options.imageIndex
          : 0
      returnImage.value = null
    } else if (!alreadyOpen) {
      flipSourceEl = null
      flipImageUrl = null
      pendingFlip.value = false
      closingFlip.value = false
      openImageIndex.value = 0
    }

    openSlug.value = slug

    if (import.meta.client) {
      const url = `/materials-and-forms/${slug}`
      const state = { productOverlay: slug }
      // First open pushes a history entry; in-overlay navigation replaces it
      // so one Back / close returns to the original page.
      if (alreadyOpen) {
        window.history.replaceState(state, '', url)
        flipSourceEl = null
        flipImageUrl = null
        pendingFlip.value = false
        closingFlip.value = false
        openImageIndex.value = 0
      } else {
        window.history.pushState(state, '', url)
        lockPageScroll()
      }
    }
  }

  /** Source thumb for open + close Flip — kept until finishClose */
  const getFlipSource = () => flipSourceEl

  /** Hero-tier URL preferred for the Flip flyer when prefetched */
  const getFlipImageUrl = () => flipImageUrl

  const clearPendingFlip = () => {
    pendingFlip.value = false
  }

  const setReturnImage = (productId: string, index: number) => {
    returnImage.value = { productId, index }
  }

  const finishClose = () => {
    if (!openSlug.value && !closingFlip.value) return

    const target = returnUrl.value || '/'
    returnUrl.value = null
    flipSourceEl = null
    flipImageUrl = null

    // Unmount while closingFlip is still true so leave isn't a CSS fade
    openSlug.value = null

    if (import.meta.client) {
      unlockPageScroll()

      if (window.history.state?.productOverlay) {
        window.history.back()
      } else if (window.location.pathname.startsWith('/materials-and-forms/')) {
        window.history.replaceState({}, '', target)
      }

      nextTick(() => {
        pendingFlip.value = false
        closingFlip.value = false
      })
    } else {
      pendingFlip.value = false
      closingFlip.value = false
    }
  }

  /**
   * Request close. If a Flip source still exists in the DOM, keep the overlay
   * mounted and set closingFlip so ProductDetail can reverse-animate first.
   */
  const close = () => {
    if (!openSlug.value || closingFlip.value) return

    if (
      import.meta.client &&
      flipSourceEl &&
      document.contains(flipSourceEl)
    ) {
      closingFlip.value = true
      pendingFlip.value = true
      return
    }

    finishClose()
  }

  /** Clear overlay after browser Back — URL already changed via history. */
  const syncFromHistory = () => {
    if (!openSlug.value) return
    openSlug.value = null
    flipSourceEl = null
    flipImageUrl = null
    pendingFlip.value = false
    closingFlip.value = false
    returnUrl.value = null
    if (import.meta.client) {
      unlockPageScroll()
    }
  }

  return {
    openSlug,
    isOpen,
    open,
    close,
    finishClose,
    syncFromHistory,
    getFlipSource,
    getFlipImageUrl,
    clearPendingFlip,
    pendingFlip,
    closingFlip,
    openImageIndex,
    returnImage,
    setReturnImage,
  }
}
