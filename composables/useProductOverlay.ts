import { Flip } from 'gsap/Flip'

export type ProductOverlayOpenOptions = {
  /** Clicked thumbnail — Flip animates from / back to this element */
  source?: HTMLElement | null
  /** Gallery index visible on the grid when opening */
  imageIndex?: number
  /** Prefetched hero-sized URL for a sharp Flip flyer (falls back to source src) */
  flipSrc?: string | null
  /** Cart / selection item id when opening from bucket UI */
  bucketItemId?: string | null
}

export type ProductReturnImage = {
  productId: string
  index: number
  /** When set, cart UI updates this selection entry on close */
  bucketItemId?: string
}

/** Beat on the landed flyer before the cream clears, then the fade itself. */
export const PRODUCT_OVERLAY_CLOSE_FLYER_HOLD_MS = 120
export const PRODUCT_OVERLAY_CLOSE_FLYER_FADE_MS = 380

/** Close backdrop fade — CSS + finishClose timeout must share this. Ends with the flyer. */
export const PRODUCT_OVERLAY_BACKDROP_CLOSE_MS =
  PRODUCT_OVERLAY_CLOSE_FLYER_HOLD_MS + PRODUCT_OVERLAY_CLOSE_FLYER_FADE_MS

/** House expo-out — cream clears straight away instead of snapping at the end */
export const PRODUCT_OVERLAY_BACKDROP_CLOSE_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

/** Flyer clears the overlay (320) but stays under the selection rail (340). */
export const PRODUCT_OVERLAY_FLYER_Z = 330

// Keep Flip source off useState — DOM nodes are not serializable
let flipSourceEl: HTMLElement | null = null
let flipImageUrl: string | null = null
let flipBucketItemId: string | null = null

/** Cart→PDP: hold flyer until the cart fade prelude finishes. */
let flipOpenGate: Promise<void> | null = null
let releaseFlipOpenGateFn: (() => void) | null = null

const beginFlipOpenGate = () => {
  flipOpenGate = new Promise<void>((resolve) => {
    releaseFlipOpenGateFn = () => {
      resolve()
      flipOpenGate = null
      releaseFlipOpenGateFn = null
    }
  })
}

const releaseFlipOpenGate = () => {
  releaseFlipOpenGateFn?.()
}

const waitForFlipOpenGate = async () => {
  if (flipOpenGate) await flipOpenGate
}

const clearFlipOpenGate = () => {
  releaseFlipOpenGateFn?.()
}

/** Keep thumb fully visible while opening — overlay steals :hover. */
const lockFlipSourceFull = (el: HTMLElement) => {
  el.style.transition = 'none'
  el.style.opacity = '1'
  el.style.filter = 'grayscale(0)'
}

const hideFlipSource = (el: HTMLElement) => {
  el.style.transition = 'none'
  el.style.opacity = '0'
  el.style.visibility = 'hidden'
  el.style.filter = 'grayscale(0)'
}

const restoreFlipSource = () => {
  if (!import.meta.client || !flipSourceEl) return
  const el = flipSourceEl

  // Instant handoff — keep visibility/opacity locked until styles clear together
  // so CSS opacity transitions can’t flash a hide→show
  el.style.transition = 'none'
  el.style.visibility = ''
  el.style.opacity = '1'
  el.style.filter = 'grayscale(0)'
  void el.offsetWidth
  el.style.removeProperty('opacity')
  el.style.removeProperty('filter')
  el.style.removeProperty('visibility')
  requestAnimationFrame(() => {
    if (el.style.transition === 'none') el.style.removeProperty('transition')
  })
}

const clearFlipSource = () => {
  flipSourceEl = null
  flipImageUrl = null
  flipBucketItemId = null
}

export const useProductOverlay = () => {
  const openSlug = useState<string | null>('product-overlay-slug', () => null)
  const returnUrl = useState<string | null>('product-overlay-return', () => null)
  const pendingFlip = useState<boolean>('product-overlay-pending-flip', () => false)
  const closingFlip = useState<boolean>('product-overlay-closing-flip', () => false)
  /** Backdrop fades in over the page before the flyer moves (flyer sits above it). */
  const backdropReady = useState<boolean>('product-overlay-backdrop', () => false)
  const openImageIndex = useState<number>('product-overlay-image-index', () => 0)
  const returnImage = useState<ProductReturnImage | null>(
    'product-overlay-return-image',
    () => null,
  )
  /** Cream veil outlives the overlay — layers above it must hold their z-index. */
  const closeVeilActive = useState<boolean>('product-overlay-close-veil', () => false)
  const isOpen = computed(() => !!openSlug.value)

  const setCloseVeilActive = (active: boolean) => {
    closeVeilActive.value = active
  }

  const clearCloseArtifacts = () => {
    closeVeilActive.value = false
    if (!import.meta.client) return
    document
      .querySelectorAll('[data-pdp-close-flyer], [data-pdp-close-veil]')
      .forEach((el) => el.remove())
  }

  const open = (slug: string, options: ProductOverlayOpenOptions = {}) => {
    const alreadyOpen = !!openSlug.value

    if (import.meta.client && !alreadyOpen) {
      clearCloseArtifacts()
      returnUrl.value =
        window.location.pathname + window.location.search + window.location.hash

      if (options.source) {
        flipSourceEl = options.source
        flipImageUrl = options.flipSrc || null
        flipBucketItemId = options.bucketItemId || null
        // Lock opacity 1 before overlay mounts (hover ends → saved CSS would otherwise dip)
        lockFlipSourceFull(options.source)
        // Keep source visible until ProductDetail has a ready flyer (avoids a blank gap)
        pendingFlip.value = true
      } else {
        clearFlipSource()
        pendingFlip.value = false
      }
      closingFlip.value = false
      backdropReady.value = false
      openImageIndex.value =
        typeof options.imageIndex === 'number' && options.imageIndex >= 0
          ? options.imageIndex
          : 0
      returnImage.value = null
    } else if (!alreadyOpen) {
      clearFlipSource()
      pendingFlip.value = false
      closingFlip.value = false
      backdropReady.value = false
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
        // In-overlay nav — restore grid thumb (no return flip for this open)
        restoreFlipSource()
        clearFlipSource()
        pendingFlip.value = false
        closingFlip.value = false
        backdropReady.value = false
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

  const setBackdropReady = (ready: boolean) => {
    backdropReady.value = ready
  }

  const setReturnImage = (productId: string, index: number) => {
    returnImage.value = {
      productId,
      index,
      ...(flipBucketItemId ? { bucketItemId: flipBucketItemId } : {}),
    }
  }

  const finishClose = () => {
    if (!openSlug.value && !closingFlip.value) return

    const target = returnUrl.value || '/'
    returnUrl.value = null
    // Thumb stays hidden until close flyer finishes; restore here as final handoff
    restoreFlipSource()
    clearFlipSource()
    clearFlipOpenGate()
    backdropReady.value = false

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
        backdropReady.value = false
      })
    } else {
      pendingFlip.value = false
      closingFlip.value = false
      backdropReady.value = false
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
      // Keep backdrop + panel cream while PDP UI fades; pendingFlip is set
      // after that fade so the flyer doesn’t start early.
      closingFlip.value = true
      return
    }

    finishClose()
  }

  /** Clear overlay after browser Back — URL already changed via history. */
  const syncFromHistory = () => {
    if (!openSlug.value) return
    openSlug.value = null
    restoreFlipSource()
    clearFlipSource()
    clearFlipOpenGate()
    pendingFlip.value = false
    closingFlip.value = false
    backdropReady.value = false
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
    setBackdropReady,
    hideFlipSource,
    restoreFlipSource,
    beginFlipOpenGate,
    releaseFlipOpenGate,
    waitForFlipOpenGate,
    pendingFlip,
    closingFlip,
    backdropReady,
    openImageIndex,
    returnImage,
    setReturnImage,
    closeVeilActive,
    setCloseVeilActive,
  }
}
