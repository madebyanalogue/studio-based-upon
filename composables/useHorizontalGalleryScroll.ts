import type { Ref } from 'vue'

type GsapModules = {
  gsap: typeof import('gsap').default
  ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger
}

type HorizontalGalleryScrollOptions = {
  sectionRef: Ref<HTMLElement | null>
  pinRef: Ref<HTMLElement | null>
  trackRef: Ref<HTMLElement | null>
  titleRef?: Ref<HTMLElement | null>
  itemsRef?: Ref<HTMLElement | null>
  hasTitle?: Ref<boolean>
  enabled: Ref<boolean>
  /** Called with 0–1 progress through the pinned horizontal scroll. */
  onProgress?: (progress: number) => void
  /**
   * Repeat the track forever. The section must render two copies of its items
   * so the seam matches the start.
   */
  loop?: Ref<boolean>
}

let gsapModulesPromise: Promise<GsapModules | null> | null = null

function getGsapModules() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (!gsapModulesPromise) {
    gsapModulesPromise = Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ]).then(([{ default: gsap }, { ScrollTrigger }]) => {
      gsap.registerPlugin(ScrollTrigger)
      return { gsap, ScrollTrigger }
    })
  }
  return gsapModulesPromise
}

function resetPinSpacerWidth(trigger: { pin?: HTMLElement | null } | null) {
  const pin = trigger?.pin
  if (!pin) return

  pin.style.width = '100%'

  const spacer = pin.parentElement
  if (spacer?.classList.contains('pin-spacer')) {
    spacer.style.width = '100%'
  }
}

function getMaxScroll(pin: HTMLElement | null, track: HTMLElement | null) {
  if (!pin || !track) return 0
  return Math.max(0, track.scrollWidth - pin.clientWidth)
}

/** Distance from the first item set to its duplicate. 0 when there is no copy. */
function getLoopPeriod(track: HTMLElement | null) {
  if (!track) return 0
  const sets = track.querySelectorAll(':scope > .precrafted-h__items')
  if (sets.length < 2) return 0
  const first = sets[0] as HTMLElement
  const second = sets[1] as HTMLElement
  // offsetLeft ignores the track transform, so the period stays stable while scrolling.
  return Math.max(0, second.offsetLeft - first.offsetLeft)
}

const TITLE_INTRO_SCROLL = 600

function getTotalScroll({ maxScroll, hasTitleIntro }: { maxScroll: number; hasTitleIntro: boolean }) {
  return (hasTitleIntro ? TITLE_INTRO_SCROLL : 0) + maxScroll
}

function getTitleIntroPortion({
  maxScroll,
  hasTitleIntro,
}: {
  maxScroll: number
  hasTitleIntro: boolean
}) {
  const total = getTotalScroll({ maxScroll, hasTitleIntro })
  if (!hasTitleIntro || total <= 0) return 0
  return TITLE_INTRO_SCROLL / total
}

function getTrackProgress(
  clampedProgress: number,
  titleIntroPortion: number,
  hasTitleIntro: boolean,
) {
  if (!hasTitleIntro || titleIntroPortion >= 1) return clampedProgress
  return Math.max(
    0,
    Math.min(1, (clampedProgress - titleIntroPortion) / (1 - titleIntroPortion)),
  )
}

export function useHorizontalGalleryScroll({
  sectionRef,
  pinRef,
  trackRef,
  titleRef,
  itemsRef,
  hasTitle,
  enabled,
  onProgress,
  loop,
}: HorizontalGalleryScrollOptions) {
  let scrollTrigger: import('gsap/ScrollTrigger').ScrollTrigger | null = null
  let gsapContext: ReturnType<typeof import('gsap').default.context> | null = null
  let gsapInstance: typeof import('gsap').default | null = null
  let resizeObserver: ResizeObserver | null = null
  let removeLoopDriver: (() => void) | null = null

  function measureLayout() {
    const pin = pinRef.value
    const track = trackRef.value
    const title = titleRef?.value ?? null
    const items = itemsRef?.value ?? null
    const loopPeriod = loop?.value ? getLoopPeriod(track) : 0
    const looping = loopPeriod > 1
    const maxScroll = looping ? loopPeriod : getMaxScroll(pin, track)
    const hasTitleIntro = Boolean(hasTitle?.value && title)
    const itemsOffset = items?.offsetLeft ?? 0

    return {
      maxScroll,
      hasTitleIntro,
      totalScroll: looping ? loopPeriod * 3 : getTotalScroll({ maxScroll, hasTitleIntro }),
      titleIntroPortion: looping ? 0 : getTitleIntroPortion({ maxScroll, hasTitleIntro }),
      itemsOffset,
      looping,
      loopPeriod,
    }
  }

  function pageLenis() {
    return useNuxtApp().$lenis as
      | {
          on?: (
            event: string,
            callback: (data: { deltaX: number; deltaY: number; event: Event }) => void,
          ) => void
          off?: (
            event: string,
            callback: (data: { deltaX: number; deltaY: number; event: Event }) => void,
          ) => void
          reset?: () => void
        }
      | undefined
  }

  function eventWantsNativeScroll(event: Event) {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : []
    for (const node of path) {
      if (!(node instanceof HTMLElement)) continue
      if (node === document.body || node === document.documentElement) break
      if (
        node.hasAttribute('data-lenis-prevent') ||
        node.hasAttribute('data-lenis-prevent-wheel') ||
        node.hasAttribute('data-lenis-prevent-touch')
      ) {
        return true
      }
      const overflow = getComputedStyle(node).overflowY
      if (/(auto|scroll)/.test(overflow) && node.scrollHeight > node.clientHeight + 1) return true
    }
    return false
  }

  /**
   * Wheel moves the track directly. The page scroll position stays put,
   * so a wrap can't pile onto the smooth-scroll animation.
   * The glide matches Lenis: 1.2s ease, restarted from the current position.
   */
  function startLoopDriver(gsap: typeof import('gsap').default) {
    if (removeLoopDriver) return
    const lenis = pageLenis()
    if (!lenis?.on) return

    const duration = 1.2
    const easeOut = (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t))
    let from = 0
    let to = 0
    let value = 0
    let elapsed = 0
    let moving = false
    let period = getLoopPeriod(trackRef.value)
    let applied = Number.NaN

    const measurePeriod = () => {
      const next = getLoopPeriod(trackRef.value)
      if (next > 1) period = next
    }

    const periodObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measurePeriod) : null
    if (periodObserver && trackRef.value) periodObserver.observe(trackRef.value)

    const onVirtualScroll = (data: { deltaX: number; deltaY: number; event: Event }) => {
      if (data.event.type === 'touchend' || data.event.type === 'touchcancel') return
      if (eventWantsNativeScroll(data.event)) return
      const event = data.event as Event & { lenisStopPropagation?: boolean }
      event.lenisStopPropagation = true
      if (event.cancelable && (data.deltaX !== 0 || data.deltaY !== 0)) event.preventDefault()
      const delta = Math.abs(data.deltaY) >= Math.abs(data.deltaX) ? data.deltaY : data.deltaX
      to += delta
      from = value
      elapsed = 0
      moving = true
    }

    const tick = (_time: number, deltaTime: number) => {
      const track = trackRef.value
      if (!track || period < 2) return
      if (moving) {
        elapsed += deltaTime / 1000
        const t = Math.min(1, elapsed / duration)
        value = from + (to - from) * easeOut(t >= 1 ? 1 : t)
        if (t >= 1) {
          value = to
          moving = false
        }
      }
      const wrapped = ((value % period) + period) % period
      const x = -wrapped
      if (Math.abs(x - applied) < 0.05) return
      applied = x
      track.style.transform = `translate3d(${x}px,0,0)`
      onProgress?.(wrapped / period)
    }

    window.scrollTo(0, 0)
    lenis.reset?.()
    document.documentElement.classList.add('precrafted-loop-lock')
    lenis.on('virtual-scroll', onVirtualScroll)
    gsap.ticker.add(tick)
    removeLoopDriver = () => {
      document.documentElement.classList.remove('precrafted-loop-lock')
      periodObserver?.disconnect()
      lenis.off?.('virtual-scroll', onVirtualScroll)
      gsap.ticker.remove(tick)
      removeLoopDriver = null
    }
  }

  function stopLoopDriver() {
    removeLoopDriver?.()
  }

  function resetAnimationState(
    gsap: typeof import('gsap').default,
    track: HTMLElement | null,
    title: HTMLElement | null,
  ) {
    if (track) gsap.set(track, { x: 0, xPercent: 0, clearProps: 'transform' })
    if (title) gsap.set(title, { opacity: 1, clearProps: 'opacity' })
  }

  function getTitleOpacity(
    layout: ReturnType<typeof measureLayout>,
    clampedProgress: number,
  ) {
    if (!layout.hasTitleIntro) return 1

    if (clampedProgress < layout.titleIntroPortion) {
      const fadeIn =
        layout.titleIntroPortion > 0
          ? clampedProgress / layout.titleIntroPortion
          : 1
      return 1 - (1 - fadeIn) ** 2
    }

    const trackProgress = getTrackProgress(
      clampedProgress,
      layout.titleIntroPortion,
      layout.hasTitleIntro,
    )
    const trackX = layout.maxScroll * trackProgress

    return trackX < layout.itemsOffset ? 1 : 0
  }

  function applyProgress(gsap: typeof import('gsap').default, progress: number) {
    const layout = measureLayout()
    const title = titleRef?.value ?? null
    const track = trackRef.value
    const clampedProgress = Math.max(0, Math.min(1, progress))

    if (layout.hasTitleIntro && title) {
      gsap.set(title, { opacity: getTitleOpacity(layout, clampedProgress) })
    }

    if (layout.looping && track) {
      const trigger = scrollTrigger
      const pos = trigger ? trigger.scroll() - trigger.start : clampedProgress * layout.loopPeriod
      const wrapped = ((pos % layout.loopPeriod) + layout.loopPeriod) % layout.loopPeriod
      gsap.set(track, { x: -wrapped })
      onProgress?.(wrapped / layout.loopPeriod)
      return
    }

    if (layout.maxScroll > 0 && track) {
      const trackProgress = getTrackProgress(
        clampedProgress,
        layout.titleIntroPortion,
        layout.hasTitleIntro,
      )
      gsap.set(track, { x: -layout.maxScroll * trackProgress })
    }

    onProgress?.(clampedProgress)
  }

  async function init() {
    if (!enabled.value) return

    const modules = await getGsapModules()
    const section = sectionRef.value
    const pin = pinRef.value
    const track = trackRef.value
    const title = titleRef?.value ?? null

    if (!modules || !section || !pin || !track) return

    const { gsap, ScrollTrigger } = modules

    cleanup({ resetVisualState: true, keepObserver: true })

    gsapInstance = gsap
    section.classList.remove('is--horizontal-gallery-suspended')

    const layout = measureLayout()

    if (layout.looping) {
      gsapInstance = gsap
      startLoopDriver(gsap)
      section.classList.add('is--horizontal-gallery-ready')
      return
    }

    stopLoopDriver()

    if (layout.totalScroll <= 0) {
      resetAnimationState(gsap, track, title)
      onProgress?.(0)
      section.classList.add('is--horizontal-gallery-ready')
      return
    }

    gsap.set(track, { x: 0, xPercent: 0 })
    if (layout.hasTitleIntro) {
      gsap.set(title, { opacity: 0 })
    }

    gsapContext = gsap.context(() => {
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${measureLayout().totalScroll}`,
          pin,
          scrub: true,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            applyProgress(gsap, self.progress)
          },
          onRefresh: (self) => {
            Object.assign(layout, measureLayout())
            applyProgress(gsap, self.progress)
            resetPinSpacerWidth(self)
          },
          onToggle: (self) => {
            resetPinSpacerWidth(self)
          },
        },
      })

      timeline.to({}, { duration: 1 })

      scrollTrigger = timeline.scrollTrigger ?? null
    }, section)

    // Re-observe after init — refs may have been null on mount.
    if (resizeObserver) {
      resizeObserver.disconnect()
      if (track) resizeObserver.observe(track)
      if (pin) resizeObserver.observe(pin)
      if (title) resizeObserver.observe(title)
      if (itemsRef?.value) resizeObserver.observe(itemsRef.value)
    }

    ScrollTrigger.refresh()
    resetPinSpacerWidth(scrollTrigger)
    applyProgress(gsap, scrollTrigger?.progress ?? 0)
    section.classList.add('is--horizontal-gallery-ready')
    bindImageLoadRefresh(section)
  }

  function bindImageLoadRefresh(section: HTMLElement) {
    section.querySelectorAll('img').forEach((image) => {
      if (image.complete) return
      image.addEventListener('load', refresh, { once: true })
    })
  }

  function refresh() {
    if (!enabled.value) return
    if (removeLoopDriver) return
    // Images / sections can land after a zero-width first pass — remount if needed.
    if (!scrollTrigger) {
      void init()
      return
    }
    scrollTrigger.refresh()
    resetPinSpacerWidth(scrollTrigger)
    if (gsapInstance) {
      applyProgress(gsapInstance, scrollTrigger.progress ?? 0)
    }
    if (sectionRef.value) bindImageLoadRefresh(sectionRef.value)
  }

  function cleanup({ resetVisualState = true, keepObserver = false } = {}) {
    const section = sectionRef.value
    const pin = pinRef.value
    const track = trackRef.value
    const title = titleRef?.value ?? null
    const gsap = gsapInstance

    stopLoopDriver()

    section?.classList.remove('is--horizontal-gallery-ready')
    section?.classList.remove('is--horizontal-gallery-suspended')

    if (!keepObserver) {
      resizeObserver?.disconnect()
      resizeObserver = null
    }

    if (scrollTrigger) {
      try {
        scrollTrigger.enable()
      } catch {
        // Already enabled / disposed.
      }
      scrollTrigger.kill(true)
    }
    scrollTrigger = null

    gsapContext?.revert()
    gsapContext = null
    gsapInstance = null

    if (gsap && resetVisualState) {
      resetAnimationState(gsap, track, title)
      if (pin) {
        gsap.set(pin, {
          clearProps:
            'position,top,left,width,height,margin,x,y,xPercent,yPercent,zIndex,transform',
        })
      }
    }
  }

  function onScrollSystemReady() {
    if (enabled.value) init()
  }

  onMounted(() => {
    if (!import.meta.client) return

    document.addEventListener('basedupon:scroll-system-ready', onScrollSystemReady)

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(refresh)
      if (trackRef.value) resizeObserver.observe(trackRef.value)
      if (pinRef.value) resizeObserver.observe(pinRef.value)
      if (titleRef?.value) resizeObserver.observe(titleRef.value)
      if (itemsRef?.value) resizeObserver.observe(itemsRef.value)
    }

    // Init once DOM is ready; Lenis may already be up.
    requestAnimationFrame(() => {
      if (enabled.value) init()
    })
  })

  onUnmounted(() => {
    if (import.meta.client) {
      document.removeEventListener(
        'basedupon:scroll-system-ready',
        onScrollSystemReady,
      )
    }
    cleanup({ resetVisualState: true })
  })

  watch(enabled, (value) => {
    if (value) init()
    else cleanup()
  }, { flush: 'post' })

  return { init, cleanup, refresh }
}
