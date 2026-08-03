/** Nested overlays (PDP, enquiry, board composer, …) share one lock so closing
 *  the top layer doesn’t re-enable page scroll while another layer is still open. */
let lockCount = 0

const getLenis = () => {
  if (!import.meta.client) return null
  try {
    return (
      (useNuxtApp().$lenis as { stop?: () => void; start?: () => void } | undefined) ??
      null
    )
  } catch {
    return null
  }
}

const applyLock = () => {
  document.documentElement.classList.add('page-scroll-locked')
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  getLenis()?.stop?.()
}

const clearLock = () => {
  document.documentElement.classList.remove('page-scroll-locked')
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
  getLenis()?.start?.()
}

export const lockPageScroll = () => {
  if (!import.meta.client) return
  lockCount += 1
  // Always re-assert stop — Lenis may init after the first lock
  applyLock()
}

export const unlockPageScroll = () => {
  if (!import.meta.client) return
  if (lockCount === 0) return
  lockCount -= 1
  if (lockCount > 0) {
    // Keep Lenis stopped while any overlay still holds a lock
    getLenis()?.stop?.()
    return
  }
  clearLock()
}
