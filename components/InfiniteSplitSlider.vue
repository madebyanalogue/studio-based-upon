<template>
  <section
    ref="rootEl"
    class="split-slider"
        @pointerenter="onSliderPointerEnter"
    @pointermove="onSliderPointerMove"
    @pointerleave="onSliderPointerLeave"
    :class="{
      'split-slider--ready': surfaceReady,
      'split-slider--type-on': typeLayerVisible,
      'split-slider--opening': openingProduct,
    }"
    aria-label="Infinite split slider"
  >
    <svg class="split-slider__filter" viewBox="0 0 0 0" aria-hidden="true">
      <defs>
        <filter :id="blurFilterId">
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 255 -140"
          />
        </filter>
      </defs>
    </svg>

    <div ref="leftEl" class="split-slider__column split-slider__column--left" />
    <div ref="rightEl" class="split-slider__column split-slider__column--right" />

    <div
      class="split-slider__type"
      :style="{ color: activeSlide?.accent || '#e8e8e8' }"
      aria-live="polite"
    >
      <p
        v-if="activeSlide?.tags?.length"
        class="split-slider__tags"
        :style="{ opacity: typeEffect }"
      >
        <span v-for="(tag, i) in activeSlide.tags" :key="`${activeKey}-tag-${i}`">
          {{ tag }}<br v-if="i < activeSlide.tags.length - 1" />
        </span>
      </p>

      <h1
        ref="titleEl"
        class="split-slider__title serif"
        :class="{ 'split-slider__title--pending': !titleSplitReady }"
        :style="{ filter: titleFilter, WebkitFilter: titleFilter }"
      >
        {{ activeSlide?.title || '' }}
      </h1>

      <p
        v-if="activeSlide?.location"
        ref="locationEl"
        class="split-slider__location"
        :class="{ 'split-slider__location--pending': !locationSplitReady }"
        :style="{
          filter: titleFilter,
          WebkitFilter: titleFilter,
        }"
      >
        {{ activeSlide.location }}
      </p>

      <a
        v-if="activeSlide"
        ref="linkEl"
        class="split-slider__link"
        :class="{ 'split-slider__link--pending': !linkSplitReady }"
        :href="activeSlide.link"
        :style="{
          filter: titleFilter,
          WebkitFilter: titleFilter,
          pointerEvents: linkEffect > 0.55 ? 'auto' : 'none',
        }"
      >
        {{ activeSlide.linkLabel || 'View Full Project' }}
      </a>
    </div>

    <div v-if="activeSlide" class="split-slider__type split-slider__type--caption">
      <a
        class="split-slider__caption-side"
        :href="activeSlide.left.link"
        :data-cursor-label="
          userScrolled ? activeSlide.left.title || activeSlide.title : undefined
        "
        @click="onCaptionClick('left', $event)"
      >
        <p class="split-slider__caption-title">{{ activeSlide.left.title }}</p>
        <p v-if="activeSlide.left.subtitle" class="split-slider__caption-subtitle">
          {{ activeSlide.left.subtitle }}
        </p>
      </a>
      <a
        class="split-slider__caption-side"
        :href="activeSlide.right.link"
        :data-cursor-label="
          userScrolled ? activeSlide.right.title || activeSlide.title : undefined
        "
        @click="onCaptionClick('right', $event)"
      >
        <p class="split-slider__caption-title">{{ activeSlide.right.title }}</p>
        <p v-if="activeSlide.right.subtitle" class="split-slider__caption-subtitle">
          {{ activeSlide.right.subtitle }}
        </p>
      </a>
    </div>
  </section>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'

export type SplitSliderSide = {
  title: string
  subtitle: string
  link: string
  /** Materials & Forms slug — click completes the reveal and flips this frame. */
  productSlug?: string
  productId?: string
  /** Index of the chosen frame in the product gallery. */
  imageIndex?: number
}

export type SplitSliderSlide = {
  title: string
  tags: string[]
  location?: string
  accent: string
  link: string
  linkLabel?: string
  left: SplitSliderSide
  right: SplitSliderSide
  leftImage: string
  rightImage: string
}

const props = withDefaults(
  defineProps<{
    slides: SplitSliderSlide[]
    /** Keep the first-slide type hidden until the homepage intro finishes. */
    holdEntrance?: boolean
  }>(),
  { holdEntrance: false },
)

/** Alignment progress ≥ this → title effect is fully sharp / opaque. */
const TYPE_FULL_THRESHOLD = 0.9
const TITLE_BLUR_MAX = 75

/**
 * Link timing (slideProgress 0→1→2, peak / fully aligned at 1):
 * - IN_START → IN_FULL: fade-in window on the way in (raise IN_START to start later)
 * - OUT_START → OUT_END: fade-out window on the way out
 */
const LINK_IN_START = 0
const LINK_IN_FULL = .85
const LINK_OUT_START = 1.14
const LINK_OUT_END = 2
const LINK_INTRO_DELAY = 0
/** Arrival wipe — ease in and out so the open doesn’t lurch off the intro. */
const WIPE_IN_DURATION = 1.6
const WIPE_OUT_DURATION = 0.9
const TEXT_FADE_DURATION = 0.55
const CLIP_OPEN = 'inset(0% 0% 0% 0%)'
/** Left column closes upward; right column closes downward. */
const CLIP_LEFT_SHUT = 'inset(0% 0% 100% 0%)'
const CLIP_RIGHT_SHUT = 'inset(100% 0% 0% 0%)'

const settings = {
  scrollSensitivity: 1200,
  smoothness: 0.05,
  bufferSlides: 3,
  imageShift: 6,
  revealOverlap: 0.5,
}

const blurFilterId = 'split-slider-blur-matrix'
const titleFilter = `url(#${blurFilterId}) blur(0.25px)`

const rootEl = ref<HTMLElement | null>(null)
const leftEl = ref<HTMLElement | null>(null)
const rightEl = ref<HTMLElement | null>(null)
const titleEl = ref<HTMLElement | null>(null)
const locationEl = ref<HTMLElement | null>(null)
const linkEl = ref<HTMLElement | null>(null)

const activeKey = ref('')
const activeSlide = ref<SplitSliderSlide | null>(null)
const typeEffect = ref(0)
const linkEffect = ref(0)
const titleSplitReady = ref(false)
const locationSplitReady = ref(false)
const linkSplitReady = ref(false)
/** Columns fade in once active images + clip paths are ready. */
const surfaceReady = ref(false)
/** Type layer revealed after a short delay following the surface fade. */
const typeLayerVisible = ref(false)

let scrollPosition = 1
let scrollTarget = 1
let lastTouchY = 0
let rafId = 0
let running = false
let titleSplitInstance: InstanceType<typeof SplitText> | null = null
let locationSplitInstance: InstanceType<typeof SplitText> | null = null
let linkSplitInstance: InstanceType<typeof SplitText> | null = null
let lastDataIndex = -1
/** One-shot Showcase-style entrance on first paint. */
let needsIntro = true
let introPlaying = false
let leaving = false
let leavePromise: Promise<void> | null = null
let entranceStarted = false
const userScrolled = ref(false)
let pointerOverSlider = false
let hoverX = 0
let hoverY = 0
let lastCursorScroll = -1
let scrollHintReady = false
let captionSwapGen = 0
const homeScrollHint = useHomeScrollHint()
const { resolveFromPoint } = useCursor()

const syncScrollHint = () => {
  const show =
    scrollHintReady && pointerOverSlider && !userScrolled.value && !leaving && running
  if (homeScrollHint.value !== show) homeScrollHint.value = show
}

const dismissScrollHint = () => {
  if (userScrolled.value) return
  userScrolled.value = true
  homeScrollHint.value = false
  for (const side of ['left', 'right'] as const) {
    for (const el of columns[side].visibleSlides.values()) {
      const name = el.dataset.projectName
      if (name) el.dataset.cursorLabel = name
    }
  }
  if (pointerOverSlider) nextTick(() => resolveFromPoint(hoverX, hoverY))
}

const showScrollHint = () => {
  scrollHintReady = true
  pointerOverSlider = rootEl.value?.matches(':hover') ?? false
  syncScrollHint()
}

const onSliderPointerEnter = (event: PointerEvent) => {
  pointerOverSlider = true
  hoverX = event.clientX
  hoverY = event.clientY
  syncScrollHint()
}

const onSliderPointerMove = (event: PointerEvent) => {
  pointerOverSlider = true
  hoverX = event.clientX
  hoverY = event.clientY
  syncScrollHint()
}

const onSliderPointerLeave = () => {
  pointerOverSlider = false
  syncScrollHint()
}
let columnWipe: gsap.core.Timeline | null = null
/** Product open in progress — wheel stays locked until the overlay closes. */
const openingProduct = ref(false)
let introTween: gsap.core.Timeline | null = null

type Side = 'left' | 'right'

const columns: Record<
  Side,
  { el: HTMLElement | null; visibleSlides: Map<number, HTMLElement> }
> = {
  left: { el: null, visibleSlides: new Map() },
  right: { el: null, visibleSlides: new Map() },
}

const ensurePlugins = () => {
  if (!import.meta.client) return
  gsap.registerPlugin(SplitText)
}

const createSlide = (side: Side, index: number) => {
  const list = props.slides
  if (!list.length) return
  const slideIndex = ((index % list.length) + list.length) % list.length
  const data = list[slideIndex]!
  const host = columns[side].el
  if (!host) return

  const el = document.createElement('div')
  el.className = 'split-slider__slide'
  el.style.zIndex = String(index)
  // Clip immediately so buffer slides never flash full-bleed before updateSlider
  el.style.clipPath = getRevealShape(side, scrollPosition - index)
  const projectName = (data[side].title || data.title || '').trim()
  if (projectName) {
    el.dataset.projectName = projectName
    if (userScrolled.value) el.dataset.cursorLabel = projectName
  }

  const img = document.createElement('img')
  img.src = side === 'left' ? data.leftImage : data.rightImage
  img.alt = ''
  img.draggable = false

  const overlay = document.createElement('div')
  overlay.className = 'split-slider__overlay'

  el.append(img, overlay)
  host.appendChild(el)
  columns[side].visibleSlides.set(index, el)
}

const getRevealShape = (side: Side, revealAmount: number) => {
  const d =
    Math.max(0, Math.min(1, revealAmount)) * (100 + settings.revealOverlap)
  return side === 'left'
    ? `polygon(0% ${100 - d}%, 100% ${100 - d}%, 100% 100%, 0% 100%)`
    : `polygon(0% 0%, 100% 0%, 100% ${d}%, 0% ${d}%)`
}

/** 0 at slide edges, 1 when both halves are fully revealed / aligned. */
const alignmentProgress = (revealAmount: number) => {
  const slideProgress = Math.max(0, Math.min(2, revealAmount))
  return 1 - Math.abs(slideProgress - 1)
}

/** Map alignment → type effect; full by TYPE_FULL_THRESHOLD (e.g. 90%). */
const typeEffectFromAlignment = (alignment: number) =>
  Math.min(1, Math.max(0, alignment / TYPE_FULL_THRESHOLD))

/** Link: late fade-in, delayed fade-out (raw slide progress, not symmetric alignment). */
const linkEffectFromProgress = (slideProgress: number) => {
  const p = Math.max(0, Math.min(2, slideProgress))
  if (p <= LINK_IN_START) return 0
  if (p <= LINK_IN_FULL) {
    const span = Math.max(0.0001, LINK_IN_FULL - LINK_IN_START)
    return Math.min(1, (p - LINK_IN_START) / span)
  }
  if (p <= LINK_OUT_START) return 1
  return Math.max(0, 1 - (p - LINK_OUT_START) / (LINK_OUT_END - LINK_OUT_START))
}

const titleWords = () =>
  titleEl.value?.querySelectorAll('.split-slider__word') ?? []

const locationWords = () =>
  locationEl.value?.querySelectorAll('.split-slider__location-word') ?? []

const linkWords = () =>
  linkEl.value?.querySelectorAll('.split-slider__link-word') ?? []

const revertSplits = () => {
  for (const instance of [
    titleSplitInstance,
    locationSplitInstance,
    linkSplitInstance,
  ]) {
    if (!instance) continue
    try {
      instance.revert()
    } catch {
      /* ignore */
    }
  }
  titleSplitInstance = null
  locationSplitInstance = null
  linkSplitInstance = null
  titleSplitReady.value = false
  locationSplitReady.value = false
  linkSplitReady.value = false
}

const splitActiveType = async () => {
  revertSplits()
  await nextTick()

  const title = titleEl.value
  if (title && activeSlide.value?.title) {
    titleSplitInstance = new SplitText(title, {
      type: 'words',
      wordsClass: 'split-slider__word',
    })
    titleSplitReady.value = true
  }

  const location = locationEl.value
  if (location && activeSlide.value?.location) {
    locationSplitInstance = new SplitText(location, {
      type: 'words',
      wordsClass: 'split-slider__location-word',
    })
    locationSplitReady.value = true
  }

  const link = linkEl.value
  if (link && activeSlide.value) {
    linkSplitInstance = new SplitText(link, {
      type: 'words',
      wordsClass: 'split-slider__link-word',
    })
    linkSplitReady.value = true
  }

  if (needsIntro) {
    // First paint entrance is owned by runEntranceSequence (surface fade → type).
    applyTypeEffect(0, 0)
    return
  }

  applyTypeEffect(typeEffect.value, linkEffect.value)
}

const applyWordEffect = (words: NodeListOf<Element> | never[], effect: number) => {
  if (!words.length) return
  const blur = TITLE_BLUR_MAX * (1 - effect)
  gsap.set(words, {
    filter: `blur(${blur}px)`,
    opacity: effect,
  })
}

const applyTypeEffect = (titleFx: number, linkFx: number) => {
  applyWordEffect(titleWords(), titleFx)
  applyWordEffect(locationWords(), linkFx)
  applyWordEffect(linkWords(), linkFx)
}

/** Same entrance as the former Showcase carousel title. */
const playIntroType = () => {
  const title = titleWords()
  const location = locationWords()
  const link = linkWords()
  if (!title.length && !location.length && !link.length) {
    introPlaying = false
    return
  }

  introPlaying = true
  introTween?.kill()

  gsap.set(title, { filter: `blur(${TITLE_BLUR_MAX}px)`, opacity: 0 })
  if (location.length) {
    gsap.set(location, { filter: `blur(${TITLE_BLUR_MAX}px)`, opacity: 0 })
  }
  if (link.length) {
    gsap.set(link, { filter: `blur(${TITLE_BLUR_MAX}px)`, opacity: 0 })
  }

  const tl = gsap.timeline({
    onComplete: () => {
      introPlaying = false
      introTween = null
      applyTypeEffect(typeEffect.value, linkEffect.value)
    },
  })

  if (title.length) {
    tl.fromTo(
      title,
      { filter: `blur(${TITLE_BLUR_MAX}px)`, opacity: 0 },
      {
        filter: 'blur(0px)',
        opacity: 1,
        duration: 2,
        ease: 'power3.out',
      },
      0,
    )
  }

  if (location.length) {
    tl.fromTo(
      location,
      { filter: `blur(${TITLE_BLUR_MAX}px)`, opacity: 0 },
      {
        filter: 'blur(0px)',
        opacity: 1,
        duration: 2,
        ease: 'power3.out',
      },
      LINK_INTRO_DELAY,
    )
  }

  if (link.length) {
    tl.fromTo(
      link,
      { filter: `blur(${TITLE_BLUR_MAX}px)`, opacity: 0 },
      {
        filter: 'blur(0px)',
        opacity: 1,
        duration: 2,
        ease: 'power3.out',
      },
      LINK_INTRO_DELAY,
    )
  }

  introTween = tl
}

const cancelIntro = () => {
  if (!introPlaying && !needsIntro) return
  needsIntro = false
  introPlaying = false
  if (introTween) {
    introTween.kill()
    introTween = null
  }
  const title = titleWords()
  const location = locationWords()
  const link = linkWords()
  if (title.length) gsap.killTweensOf(title)
  if (location.length) gsap.killTweensOf(location)
  if (link.length) gsap.killTweensOf(link)
  if (typeLayerVisible.value) {
    applyTypeEffect(typeEffect.value, linkEffect.value)
  } else {
    applyTypeEffect(0, 0)
  }
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const preloadImage = (src: string) =>
  new Promise<void>((resolve) => {
    if (!src) {
      resolve()
      return
    }
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = src
    if (img.complete) resolve()
  })

const activeSlideData = () => {
  const list = props.slides
  if (!list.length) return null
  const activeIndex = Math.round(scrollPosition - 1)
  const dataIndex = ((activeIndex % list.length) + list.length) % list.length
  return list[dataIndex] || null
}

/** Wait until the aligned slide’s left/right frames are decoded. */
const preloadActiveSlideImages = async () => {
  const slide = activeSlideData()
  if (!slide) return
  await Promise.all([
    preloadImage(slide.leftImage),
    preloadImage(slide.rightImage),
  ])
}

let surfacePromise: Promise<void> | null = null

/** Decode the opening pair once, while the intro is still covering the slider. */
const prepareSurface = () => {
  if (!props.slides.length) {
    return (async () => {
      await preloadActiveSlideImages()
      updateSlider()
      await nextTick()
    })()
  }
  if (!surfacePromise) {
    surfacePromise = (async () => {
      await preloadActiveSlideImages()
      updateSlider()
      await nextTick()
    })()
  }
  return surfacePromise
}

const motionDuration = (seconds: number) =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : seconds

const captionNodes = () =>
  [
    ...(rootEl.value?.querySelectorAll<HTMLElement>('.split-slider__caption-side') ??
      []),
  ]

const clipFrom = (el: HTMLElement | null, fallback: string) => {
  const inline = el?.style.clipPath
  if (inline && inline !== 'none') return inline
  return fallback
}

/** Opposite vertical wipes. In opens from shut; out closes from the current pose. */
const wipeColumns = (direction: 'in' | 'out') =>
  new Promise<void>((resolve) => {
    const left = leftEl.value
    const right = rightEl.value
    const opening = direction === 'in'
    const duration = motionDuration(opening ? WIPE_IN_DURATION : WIPE_OUT_DURATION)
    const ease = opening ? 'power2.inOut' : 'power3.inOut'
    const previous = columnWipe
    columnWipe = null
    previous?.kill()

    let settled = false
    let tl!: gsap.core.Timeline
    const finish = (interrupted: boolean) => {
      if (settled) return
      settled = true
      if (columnWipe === tl) columnWipe = null
      if (opening && !interrupted) {
        for (const el of [left, right]) {
          if (!el) continue
          el.style.transition = 'none'
          el.style.clipPath = 'none'
          el.style.removeProperty('will-change')
          gsap.set(el, { clearProps: 'opacity' })
          el.style.removeProperty('transition')
        }
      }
      resolve()
    }

    for (const el of [left, right]) {
      if (!el) continue
      el.style.transition = 'none'
      if (opening) el.style.willChange = 'clip-path'
    }
    if (opening) {
      if (left) gsap.set(left, { opacity: 1, clipPath: CLIP_LEFT_SHUT })
      if (right) gsap.set(right, { opacity: 1, clipPath: CLIP_RIGHT_SHUT })
      surfaceReady.value = true
      document.dispatchEvent(new CustomEvent('homepage-columns-opening'))
    }

    tl = gsap.timeline({
      onComplete: () => finish(false),
      onInterrupt: () => finish(true),
    })
    columnWipe = tl
    if (left) {
      tl.fromTo(
        left,
        { clipPath: opening ? CLIP_LEFT_SHUT : clipFrom(left, CLIP_OPEN) },
        {
          clipPath: opening ? CLIP_OPEN : CLIP_LEFT_SHUT,
          duration,
          ease,
        },
        0,
      )
    }
    if (right) {
      tl.fromTo(
        right,
        { clipPath: opening ? CLIP_RIGHT_SHUT : clipFrom(right, CLIP_OPEN) },
        {
          clipPath: opening ? CLIP_OPEN : CLIP_RIGHT_SHUT,
          duration,
          ease,
        },
        0,
      )
    }
    if (!left && !right) finish(false)
  })

const fadeCaptions = (opacity: number, seconds = TEXT_FADE_DURATION) =>
  new Promise<void>((resolve) => {
    const nodes = captionNodes()
    if (!nodes.length) {
      resolve()
      return
    }
    gsap.to(nodes, {
      opacity,
      duration: motionDuration(seconds),
      ease: opacity > 0 ? 'power2.out' : 'power2.inOut',
      overwrite: 'auto',
      onComplete: resolve,
    })
  })

/** Nav and stack stay parked until the column wipe has finished. */
const revealIntroChrome = () => {
  const root = document.documentElement
  if (!root.classList.contains('homepage-intro')) return
  root.classList.add('homepage-intro-reveal')
  window.setTimeout(() => {
    clearHomepageIntroLock()
  }, 1800)
}

/** Wipe the columns open, then bring the slide captions in. */
const playEntrance = async () => {
  if (entranceStarted || leaving) return
  entranceStarted = true
  await prepareSurface()
  if (!running || leaving) return
  await wipeColumns('in')
  if (!running || leaving) return
  revealIntroChrome()

  const captions = captionNodes()
  if (captions.length) gsap.set(captions, { opacity: 0 })
  typeLayerVisible.value = true
  await nextTick()
  if (!running || leaving) return
  await fadeCaptions(1)

  if (!running || leaving) return
  showScrollHint()
  if (!needsIntro) {
    applyTypeEffect(typeEffect.value, linkEffect.value)
    return
  }

  for (let i = 0; i < 24; i += 1) {
    if (titleWords().length || !activeSlide.value?.title) break
    await delay(50)
  }
  if (!running || leaving || !needsIntro) return
  needsIntro = false
  playIntroType()
}

/** Fade the captions out, swap the slide, then fade the next titles in. */
const crossfadeCaptions = async (slide: SplitSliderSlide) => {
  const gen = ++captionSwapGen
  const nodes = captionNodes()
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!nodes.length || reduce) {
    activeSlide.value = slide
    void splitActiveType()
    return
  }
  await new Promise<void>((resolve) => {
    gsap.to(nodes, {
      opacity: 0,
      duration: 0.15,
      ease: 'power2.in',
      overwrite: 'auto',
      onComplete: resolve,
    })
  })
  if (gen !== captionSwapGen || !running || leaving) return
  activeSlide.value = slide
  await nextTick()
  if (gen !== captionSwapGen || !running || leaving) return
  void splitActiveType()
  const next = captionNodes()
  if (!next.length) return
  gsap.fromTo(
    next,
    { opacity: 0 },
    {
      opacity: 1,
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto',
    },
  )
}

const syncTypeLayer = () => {
  if (leaving) return
  const list = props.slides
  if (!list.length) {
    activeSlide.value = null
    activeKey.value = ''
    typeEffect.value = 0
    linkEffect.value = 0
    applyTypeEffect(0, 0)
    return
  }

  // Fully revealed when scrollPosition ≈ index + 1
  const activeIndex = Math.round(scrollPosition - 1)
  const revealAmount = scrollPosition - activeIndex
  const slideProgress = Math.max(0, Math.min(2, revealAmount))
  const alignment = alignmentProgress(revealAmount)
  const titleFx = typeEffectFromAlignment(alignment)
  const linkFx = linkEffectFromProgress(slideProgress)

  const dataIndex = ((activeIndex % list.length) + list.length) % list.length
  const slide = list[dataIndex]!
  const key = `${dataIndex}:${slide.title}:${slide.location || ''}:${slide.linkLabel || ''}`

  typeEffect.value = titleFx
  linkEffect.value = linkFx

  if (dataIndex !== lastDataIndex || key !== activeKey.value) {
    const slideChanged = dataIndex !== lastDataIndex && lastDataIndex !== -1
    lastDataIndex = dataIndex
    activeKey.value = key
    if (slideChanged && typeLayerVisible.value) {
      void crossfadeCaptions(slide)
    } else {
      activeSlide.value = slide
      void splitActiveType()
    }
  } else if (!introPlaying) {
    if (needsIntro || !typeLayerVisible.value) {
      applyTypeEffect(0, 0)
    } else {
      applyTypeEffect(titleFx, linkFx)
    }
  }
}

const updateSlider = () => {
  const first = Math.floor(scrollPosition) - settings.bufferSlides
  const last = Math.floor(scrollPosition) + settings.bufferSlides + 1

  for (const side of ['left', 'right'] as const) {
    const visibleSlides = columns[side].visibleSlides
    const driftDirection = side === 'left' ? 1 : -1

    for (let i = first; i <= last; i += 1) {
      if (!visibleSlides.has(i)) createSlide(side, i)
    }

    for (const [index, el] of visibleSlides) {
      if (index < first || index > last) {
        el.remove()
        visibleSlides.delete(index)
        continue
      }

      const revealAmount = scrollPosition - index
      const slideProgress = Math.max(0, Math.min(2, revealAmount))

      el.style.clipPath = getRevealShape(side, revealAmount)

      const image = el.querySelector('img')
      if (image) {
        const imageDrift =
          (1 - slideProgress) * settings.imageShift * driftDirection
        image.style.transform = `translateY(${imageDrift}%)`
      }
    }
  }

  if (pointerOverSlider && scrollPosition !== lastCursorScroll) {
    lastCursorScroll = scrollPosition
    resolveFromPoint(hoverX, hoverY)
  }

  syncTypeLayer()
}

const onWheel = (event: WheelEvent) => {
  event.preventDefault()
  if (event.deltaX || event.deltaY) dismissScrollHint()
  if (leaving || openingProduct.value) return
  cancelIntro()
  scrollTarget += event.deltaY / settings.scrollSensitivity
}

const onTouchStart = (event: TouchEvent) => {
  lastTouchY = event.touches[0]?.clientY ?? 0
}

const onTouchMove = (event: TouchEvent) => {
  if (leaving || openingProduct.value) return
  cancelIntro()
  const y = event.touches[0]?.clientY ?? lastTouchY
  if (y !== lastTouchY) dismissScrollHint()
  scrollTarget += ((lastTouchY - y) * 8) / settings.scrollSensitivity
  lastTouchY = y
}

const tick = () => {
  if (!running || leaving) return
  scrollPosition += (scrollTarget - scrollPosition) * settings.smoothness
  updateSlider()
  rafId = requestAnimationFrame(tick)
}

const { open: openProduct, isOpen: productOpen } = useProductOverlay()

const slideIndexFor = (side: Side, el: HTMLElement) => {
  for (const [index, slide] of columns[side].visibleSlides) {
    if (slide === el) return index
  }
  return null
}

const sideDataFor = (side: Side, slideIndex: number) => {
  const list = props.slides
  if (!list.length) return null
  const dataIndex = ((slideIndex % list.length) + list.length) % list.length
  const slide = list[dataIndex]
  if (!slide) return null
  return { slide, side: slide[side], slideIndex }
}

/** Ease the clicked frame to a full reveal using the slider’s own motion. */
const completeReveal = (slideIndex: number) =>
  new Promise<void>((resolve) => {
    const aligned = slideIndex + 1
    if (Math.abs(scrollPosition - aligned) < 0.012) {
      scrollPosition = aligned
      scrollTarget = aligned
      updateSlider()
      resolve()
      return
    }
    const previous = settings.smoothness
    settings.smoothness = 0.14
    scrollTarget = aligned
    const started = performance.now()
    const step = () => {
      const done =
        Math.abs(scrollPosition - aligned) < 0.012 ||
        performance.now() - started > 2200
      if (done) {
        scrollPosition = aligned
        scrollTarget = aligned
        settings.smoothness = previous
        updateSlider()
        resolve()
        return
      }
      requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })

const restoreAfterProduct = () => {
  openingProduct.value = false
  for (const el of [leftEl.value, rightEl.value]) {
    if (!el) continue
    gsap.killTweensOf(el)
    el.style.transition = 'none'
    gsap.to(el, {
      opacity: 1,
      duration: 0.35,
      ease: 'power2.out',
      onComplete: () => {
        el.style.removeProperty('transition')
      },
    })
  }
  rootEl.value
    ?.querySelectorAll<HTMLElement>('.split-slider__caption-side')
    .forEach((el) => {
      gsap.killTweensOf(el)
      gsap.to(el, { opacity: 1, duration: 0.35, ease: 'power2.out' })
    })
}

/**
 * Finish the reveal so the chosen half is fully open, fade the other half,
 * and Flip that gallery frame up into the product page.
 */
const openSide = async (side: Side, slideIndex: number) => {
  if (openingProduct.value || leaving) return
  const picked = sideDataFor(side, slideIndex)
  if (!picked) return

  if (!picked.side.productSlug) {
    const href = picked.side.link
    if (!href) return
    if (href.startsWith('/')) await navigateTo(href)
    else window.location.assign(href)
    return
  }

  openingProduct.value = true
  cancelIntro()
  await completeReveal(picked.slideIndex)

  const otherEl = side === 'left' ? rightEl.value : leftEl.value
  if (otherEl) {
    otherEl.style.transition = 'none'
    gsap.to(otherEl, { opacity: 0, duration: 0.5, ease: 'power2.inOut' })
  }
  const captions = rootEl.value?.querySelectorAll<HTMLElement>(
    '.split-slider__caption-side',
  )
  const otherCaption = captions?.[side === 'left' ? 1 : 0]
  if (otherCaption) {
    gsap.to(otherCaption, { opacity: 0, duration: 0.35, ease: 'power2.inOut' })
  }

  const clicked = columns[side].visibleSlides.get(picked.slideIndex) || null
  // Flip measures this box. object-fit makes the flyer crop like the slide image.
  if (clicked) clicked.style.objectFit = 'cover'
  const flipSrc = side === 'left' ? picked.slide.leftImage : picked.slide.rightImage
  if (flipSrc) void prefetchImage(flipSrc)
  openProduct(picked.side.productSlug, {
    source: clicked,
    imageIndex: picked.side.imageIndex ?? 0,
    flipSrc: flipSrc || null,
    productId: picked.side.productId || null,
  })
}

const onLeftColumnClick = (event: MouseEvent) => onColumnClick('left', event)
const onRightColumnClick = (event: MouseEvent) => onColumnClick('right', event)

const onColumnClick = (side: Side, event: MouseEvent) => {
  if (openingProduct.value || leaving) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
  const slideEl = (event.target as HTMLElement | null)?.closest(
    '.split-slider__slide',
  )
  if (!(slideEl instanceof HTMLElement)) return
  const slideIndex = slideIndexFor(side, slideEl)
  if (slideIndex == null) return
  void openSide(side, slideIndex)
}

const onCaptionClick = (side: Side, event: MouseEvent) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
    return
  }
  const activeIndex = Math.round(scrollPosition - 1)
  const picked = sideDataFor(side, activeIndex)
  if (!picked?.side.productSlug) return
  event.preventDefault()
  void openSide(side, activeIndex)
}

watch(productOpen, (openNow, wasOpen) => {
  if (wasOpen && !openNow) restoreAfterProduct()
})

/** Clip the columns shut while the slide titles fade out from the first frame. */
const playLeave = () => {
  if (leavePromise) return leavePromise
  leavePromise = new Promise<void>((resolve) => {
    leaving = true
    homeScrollHint.value = false
    introTween?.kill()
    introPlaying = false
    cancelAnimationFrame(rafId)
    columnWipe?.kill()

    void (async () => {
      const fade = typeLayerVisible.value
        ? fadeCaptions(0, WIPE_OUT_DURATION)
        : Promise.resolve()
      const wipe = surfaceReady.value ? wipeColumns('out') : Promise.resolve()
      await Promise.all([fade, wipe])
      resolve()
    })()
  })
  return leavePromise
}

defineExpose({ playLeave })

onMounted(() => {
  ensurePlugins()
  columns.left.el = leftEl.value
  columns.right.el = rightEl.value
  running = true
  lockPageScroll()

  const root = rootEl.value
  root?.addEventListener('wheel', onWheel, { passive: false })
  root?.addEventListener('touchstart', onTouchStart, { passive: true })
  root?.addEventListener('touchmove', onTouchMove, { passive: true })
  leftEl.value?.addEventListener('click', onLeftColumnClick)
  rightEl.value?.addEventListener('click', onRightColumnClick)

  updateSlider()
  rafId = requestAnimationFrame(tick)
  if (props.holdEntrance) void prepareSurface()
  else {
    showScrollHint()
    void playEntrance()
  }
})

watch(
  () => props.holdEntrance,
  (hold, wasHolding) => {
    if (wasHolding && !hold) {
      showScrollHint()
      void playEntrance()
    }
  },
)

onBeforeUnmount(() => {
  running = false
  homeScrollHint.value = false
  cancelAnimationFrame(rafId)
  cancelIntro()
  unlockPageScroll()
  revertSplits()

  const root = rootEl.value
  root?.removeEventListener('wheel', onWheel)
  root?.removeEventListener('touchstart', onTouchStart)
  root?.removeEventListener('touchmove', onTouchMove)
  leftEl.value?.removeEventListener('click', onLeftColumnClick)
  rightEl.value?.removeEventListener('click', onRightColumnClick)

  for (const side of ['left', 'right'] as const) {
    for (const el of columns[side].visibleSlides.values()) el.remove()
    columns[side].visibleSlides.clear()
  }
})

watch(
  () => props.slides,
  () => {
    lastDataIndex = -1
    activeKey.value = ''
    if (!entranceStarted) surfacePromise = null
  },
)
</script>

<style scoped>
.split-slider {
  position: fixed;
  inset: 10% 7%;
  width: 86%;
  height: 80svh;
  display: flex;
  overflow: visible;
  background: var(--cream);
  z-index: 0;
  touch-action: none;
}

.split-slider__filter {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}

.split-slider__column {
  flex: 1;
  position: relative;
  height: 100%;
  overflow: hidden;
  z-index: 1;
  opacity: 0;
  cursor: pointer;
  transition: opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}

.split-slider:not(.split-slider--ready) .split-slider__column--left {
  clip-path: inset(0% 0% 100% 0%);
}

.split-slider:not(.split-slider--ready) .split-slider__column--right {
  clip-path: inset(100% 0% 0% 0%);
}

.split-slider--opening .split-slider__column {
  cursor: default;
}

.split-slider--ready .split-slider__column {
  opacity: 1;
}

.split-slider :deep(.split-slider__slide) {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.split-slider :deep(.split-slider__slide img) {
  position: absolute;
  left: 0;
  top: -6%;
  width: 100%;
  height: 112%;
  object-fit: cover;
  display: block;
  will-change: transform;
  user-select: none;
}

.split-slider :deep(.split-slider__overlay) {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.1);
  pointer-events: none;
}

.split-slider__type {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  font-family: var(--sans);
  opacity: 0;
}
.split-slider__type:not(.split-slider__type--caption) {
 display:none;
}

.split-slider--type-on .split-slider__type {
  opacity: 1;
}

.split-slider__type--caption {
  inset: auto;
  top: 100%;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  pointer-events: auto;
  font-family: var(--mono);
  font-size: clamp(8px, 1vw, 9.5px);
  letter-spacing: 0.125em;
  line-height: 1.3;
  text-transform: uppercase;
  text-align: left;
  color: var(--charcoal);
}

.split-slider__caption-side {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 16px 0;
  text-align: left;
  text-decoration: none;
  color: inherit;
  pointer-events: auto;
}

.split-slider__caption-title,
.split-slider__caption-subtitle {
  margin: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.split-slider__caption-title {
  opacity: 1;
}

.split-slider__caption-subtitle {
  color: var(--muted);
}

.split-slider__title {
  position: absolute;
  top:50%;
  left: 50%;
  margin: 0;
  transform: translate(-50%, -50%);
  text-transform: uppercase;
  font-family: var(--serif);
  font-size: 5vw;
  font-weight: 400;
  letter-spacing: -0.02em;
  line-height: 1;
  white-space: nowrap;
  text-align: center;
  color: inherit;
}

.split-slider__title--pending {
  visibility: hidden;
}

.split-slider__title :deep(.split-slider__word),
.split-slider__location :deep(.split-slider__location-word),
.split-slider__link :deep(.split-slider__link-word) {
  display: inline-block;
  will-change: filter, opacity;
}

.split-slider__tags {
  position: absolute;
  top: 32.5%;
  left: 50%;
  margin: 0;
  transform: translateX(-50%);
  text-align: center;
  text-transform: uppercase;
  font-size: clamp(0.75rem, 1.4vw, 1.25rem);
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1.15;
  display: none;
}

.split-slider__location {
  position: absolute;
  top: 62.5%;
  left: 50%;
  margin: 0;
  transform: translateX(-50%);
  text-transform: uppercase;
  font-size: clamp(0.75rem, 1.4vw, 1.25rem);
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1;
  color: inherit;
  white-space: nowrap;
  text-align: center;
}

.split-slider__location--pending {
  visibility: hidden;
}

.split-slider__link {
  position: absolute;
  bottom: 10%;
  left: 50%;
  transform: translateX(-50%);
  text-decoration: none;
  text-transform: uppercase;
  font-size: clamp(0.75rem, 1.4vw, 1.25rem);
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1;
  color: inherit;
  cursor: pointer;
  white-space: nowrap;
}

.split-slider__link--pending {
  visibility: hidden;
}
</style>
