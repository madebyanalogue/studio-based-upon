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
}: HorizontalGalleryScrollOptions) {
  let scrollTrigger: import('gsap/ScrollTrigger').ScrollTrigger | null = null
  let gsapContext: ReturnType<typeof import('gsap').default.context> | null = null
  let gsapInstance: typeof import('gsap').default | null = null
  let resizeObserver: ResizeObserver | null = null

  function measureLayout() {
    const pin = pinRef.value
    const track = trackRef.value
    const title = titleRef?.value ?? null
    const items = itemsRef?.value ?? null
    const maxScroll = getMaxScroll(pin, track)
    const hasTitleIntro = Boolean(hasTitle?.value && title)
    const itemsOffset = items?.offsetLeft ?? 0

    return {
      maxScroll,
      hasTitleIntro,
      totalScroll: getTotalScroll({ maxScroll, hasTitleIntro }),
      titleIntroPortion: getTitleIntroPortion({ maxScroll, hasTitleIntro }),
      itemsOffset,
    }
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

    cleanup({ resetVisualState: true })

    gsapInstance = gsap
    section.classList.remove('is--horizontal-gallery-suspended')

    const layout = measureLayout()

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
          onUpdate: (self) => applyProgress(gsap, self.progress),
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

    ScrollTrigger.refresh()
    resetPinSpacerWidth(scrollTrigger)
    applyProgress(gsap, scrollTrigger?.progress ?? 0)
    section.classList.add('is--horizontal-gallery-ready')

    section.querySelectorAll('img').forEach((image) => {
      if (image.complete) return
      image.addEventListener('load', refresh, { once: true })
    })
  }

  function refresh() {
    if (!scrollTrigger) return
    scrollTrigger.refresh()
    resetPinSpacerWidth(scrollTrigger)
    if (gsapInstance) {
      applyProgress(gsapInstance, scrollTrigger.progress ?? 0)
    }
  }

  function cleanup({ resetVisualState = true } = {}) {
    const section = sectionRef.value
    const pin = pinRef.value
    const track = trackRef.value
    const title = titleRef?.value ?? null
    const gsap = gsapInstance

    section?.classList.remove('is--horizontal-gallery-ready')
    section?.classList.remove('is--horizontal-gallery-suspended')

    resizeObserver?.disconnect()
    resizeObserver = null

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
  })

  return { init, cleanup, refresh }
}
