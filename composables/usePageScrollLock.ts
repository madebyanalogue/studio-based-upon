/** Nested overlays (PDP, enquiry, …) share one lock so closing the top layer
 *  doesn’t re-enable page scroll while another layer is still open. */
let lockCount = 0

const getLenis = () => {
  if (!import.meta.client) return null
  return (useNuxtApp().$lenis as { stop?: () => void; start?: () => void } | undefined) ?? null
}

export const lockPageScroll = () => {
  if (!import.meta.client) return
  lockCount += 1
  if (lockCount !== 1) return

  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  getLenis()?.stop?.()
}

export const unlockPageScroll = () => {
  if (!import.meta.client) return
  if (lockCount === 0) return
  lockCount -= 1
  if (lockCount > 0) return

  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
  getLenis()?.start?.()
}
