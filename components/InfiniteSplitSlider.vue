<template>
  <section ref="rootEl" class="split-slider" aria-label="Infinite split slider">
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
  </section>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'

export type SplitSliderSlide = {
  title: string
  tags: string[]
  accent: string
  link: string
  linkLabel?: string
  leftImage: string
  rightImage: string
}

const props = defineProps<{
  slides: SplitSliderSlide[]
}>()

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
const linkEl = ref<HTMLElement | null>(null)

const activeKey = ref('')
const activeSlide = ref<SplitSliderSlide | null>(null)
const typeEffect = ref(0)
const linkEffect = ref(0)
const titleSplitReady = ref(false)
const linkSplitReady = ref(false)

let scrollPosition = 1
let scrollTarget = 1
let lastTouchY = 0
let rafId = 0
let running = false
let titleSplitInstance: InstanceType<typeof SplitText> | null = null
let linkSplitInstance: InstanceType<typeof SplitText> | null = null
let lastDataIndex = -1
/** One-shot Showcase-style entrance on first paint. */
let needsIntro = true
let introPlaying = false
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

const linkWords = () =>
  linkEl.value?.querySelectorAll('.split-slider__link-word') ?? []

const revertSplits = () => {
  for (const instance of [titleSplitInstance, linkSplitInstance]) {
    if (!instance) continue
    try {
      instance.revert()
    } catch {
      /* ignore */
    }
  }
  titleSplitInstance = null
  linkSplitInstance = null
  titleSplitReady.value = false
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

  const link = linkEl.value
  if (link && activeSlide.value) {
    linkSplitInstance = new SplitText(link, {
      type: 'words',
      wordsClass: 'split-slider__link-word',
    })
    linkSplitReady.value = true
  }

  if (needsIntro) {
    needsIntro = false
    playIntroType()
  } else {
    applyTypeEffect(typeEffect.value, linkEffect.value)
  }
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
  applyWordEffect(linkWords(), linkFx)
}

/** Same entrance as the former Showcase carousel title. */
const playIntroType = () => {
  const title = titleWords()
  const link = linkWords()
  if (!title.length && !link.length) {
    introPlaying = false
    return
  }

  introPlaying = true
  introTween?.kill()

  gsap.set(title, { filter: `blur(${TITLE_BLUR_MAX}px)`, opacity: 0 })
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
  const link = linkWords()
  if (title.length) gsap.killTweensOf(title)
  if (link.length) gsap.killTweensOf(link)
  applyTypeEffect(typeEffect.value, linkEffect.value)
}

const syncTypeLayer = () => {
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
  const key = `${dataIndex}:${slide.title}:${slide.linkLabel || ''}`

  typeEffect.value = titleFx
  linkEffect.value = linkFx

  if (dataIndex !== lastDataIndex || key !== activeKey.value) {
    lastDataIndex = dataIndex
    activeKey.value = key
    activeSlide.value = slide
    void splitActiveType()
  } else if (!introPlaying) {
    applyTypeEffect(titleFx, linkFx)
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

  syncTypeLayer()
}

const onWheel = (event: WheelEvent) => {
  event.preventDefault()
  cancelIntro()
  scrollTarget += event.deltaY / settings.scrollSensitivity
}

const onTouchStart = (event: TouchEvent) => {
  lastTouchY = event.touches[0]?.clientY ?? 0
}

const onTouchMove = (event: TouchEvent) => {
  cancelIntro()
  const y = event.touches[0]?.clientY ?? lastTouchY
  scrollTarget += ((lastTouchY - y) * 8) / settings.scrollSensitivity
  lastTouchY = y
}

const tick = () => {
  if (!running) return
  scrollPosition += (scrollTarget - scrollPosition) * settings.smoothness
  updateSlider()
  rafId = requestAnimationFrame(tick)
}

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

  updateSlider()
  rafId = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  running = false
  cancelAnimationFrame(rafId)
  cancelIntro()
  unlockPageScroll()
  revertSplits()

  const root = rootEl.value
  root?.removeEventListener('wheel', onWheel)
  root?.removeEventListener('touchstart', onTouchStart)
  root?.removeEventListener('touchmove', onTouchMove)

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
  },
)
</script>

<style scoped>
.split-slider {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100svh;
  display: flex;
  overflow: hidden;
  background: #000;
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

.split-slider__link {
  position: absolute;
  top: 62.5%;
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
