<template>
  <div
    ref="pageEl"
    class="discover-page"
    :class="{ 'discover-page--enter': pageEntering }"
  >
    <svg
      class="discover-page__title-filter"
      viewBox="0 0 0 0"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter
          :id="titleFilterId"
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
          color-interpolation-filters="sRGB"
        >
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140"
          />
        </filter>
      </defs>
    </svg>

    <h2
      ref="titleEl"
      class="h3 discover-page__row-title"
      :class="{ 'discover-page__row-title--pending': !titlePaintReady }"
      :style="{ filter: titleBaseFilter, WebkitFilter: titleBaseFilter }"
      aria-live="polite"
    >
      {{ titleText }}
    </h2>

    <div class="discover-page__content" @pointerleave="onColumnPointerLeave">
      <template v-for="block in page.content" :key="block._key">
        <DiscoverCollectionRail
          v-if="block._type === 'collectionBlock' && block.collection"
          :collection="block.collection"
          :display-mode="block.displayMode"
        />
        <DiscoverStoryBreak
          v-else-if="block._type === 'breakerBlock'"
          :breaker="block"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import {
  typologyPointerPaused,
  typologyRowHoverKey,
  typologyRowsLocked,
} from '~/composables/useTypologyRowHover'

definePageMeta({
  layout: 'curated-discover',
})

const TITLE_BLUR_MAX = 75
const TITLE_GOOEY_OUT_DUR = 0.65
const TITLE_GOOEY_IN_DUR = 2.4
// The color matrix hides anything blurrier than this, so the in-tween starts here.
const TITLE_GOOEY_IN_BLUR = 8
/** Card travel from the open pose before the heading is fully melted. */
const TITLE_GOOEY_SCROLL_VH = 1
/** Fully gone this far before the first item overlaps the heading. */
const TITLE_GOOEY_CLEARANCE = 28

const { page } = await useCuratedDiscover()

useHead(() => ({
  title: page.value.seoTitle || 'Typology — Studio Based Upon',
  meta: page.value.seoDescription
    ? [{ name: 'description', content: page.value.seoDescription }]
    : [],
}))

const titleEl = ref<HTMLElement | null>(null)
const titleText = ref('')
const titlePaintReady = ref(false)
const titleFilterId = `typology-title-goo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
const titleBaseFilter = `url(#${titleFilterId}) blur(0.25px)`

let titleSplitInstance: InstanceType<typeof SplitText> | null = null
let titleSwapLock = false
let titleSwapGen = 0
let titleSwapTween: gsap.core.Tween | null = null
let titleSwapAbort: (() => void) | null = null
let titleIncoming: string | null = null
let pluginsRegistered = false

const prefersReducedMotion = () =>
  import.meta.client &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const titleWords = () =>
  (titleEl.value?.querySelectorAll('.discover-page__title-word') ||
    []) as NodeListOf<Element> | never[]

/** 1 = solid, 0 = melted. Matches the materials & forms scroll scrub. */
const applyTitleGooey = (effect: number) => {
  if (titleSwapLock) return
  const t = Math.max(0, Math.min(1, effect))
  const words = titleWords()
  const target = words.length ? words : titleEl.value
  if (!target) return
  if (prefersReducedMotion() || !words.length) {
    gsap.set(target, { opacity: t })
    return
  }
  gsap.set(words, {
    filter: `blur(${TITLE_BLUR_MAX * (1 - t)}px)`,
    opacity: t,
  })
}

let titleScrubRaf = 0
let titleScrubEffect = 1
/** Furthest the first item has sat from the heading this open — that pose stays solid. */
let titleApproachSpan = 0

/** How solid the heading should be as the open row's first item approaches it. */
const titleApproachEffect = () => {
  const title = titleEl.value
  if (!title || !typologyRowsLocked.value) return 1
  const card = pageEl.value?.querySelector<HTMLElement>(
    '.collection-rail--hot .collection-rail__card--anchor .discover-card__media',
  )
  if (!card) return 1
  const gap = card.getBoundingClientRect().left - title.getBoundingClientRect().right
  const fromClear = gap - TITLE_GOOEY_CLEARANCE
  titleApproachSpan = Math.max(titleApproachSpan, fromClear)
  // Open pose stays solid. The melt then runs for a full viewport of
  // card travel, so the blur eases off instead of dropping out at once.
  const melt = Math.max(
    titleApproachSpan,
    240,
    window.innerHeight * TITLE_GOOEY_SCROLL_VH,
  )
  const traveled = titleApproachSpan - fromClear
  return Math.min(1, Math.max(0, 1 - traveled / melt))
}

const tickTitleScrub = () => {
  titleScrubRaf = requestAnimationFrame(tickTitleScrub)
  if (!typologyRowsLocked.value) return
  const effect = titleApproachEffect()
  if (titleSwapLock) {
    // Wheel moved the first item into the heading while it was still melting in.
    if (effect > 0.96) return
    abortTitleSwapTween()
    titleSwapGen += 1
    titleSwapLock = false
    titlePaintReady.value = true
  }
  if (Math.abs(effect - titleScrubEffect) < 0.002) return
  titleScrubEffect = effect
  applyTitleGooey(effect)
}

const startTitleScrub = () => {
  if (titleScrubRaf) return
  titleScrubEffect = -1
  titleScrubRaf = requestAnimationFrame(tickTitleScrub)
}

const stopTitleScrub = () => {
  if (titleScrubRaf) cancelAnimationFrame(titleScrubRaf)
  titleScrubRaf = 0
  titleScrubEffect = 1
  titleApproachSpan = 0
  if (!titleSwapLock) applyTitleGooey(1)
}

const abortTitleSwapTween = () => {
  const tween = titleSwapTween
  const abort = titleSwapAbort
  titleSwapTween = null
  titleSwapAbort = null
  tween?.kill()
  abort?.()
}

const power3Out = (t: number) => 1 - Math.pow(1 - t, 3)

/** Skip the fully hidden part of the 75px melt and keep the same pace once it shows. */
const gooeyInWindow = () => {
  const hidden = 1 - Math.cbrt(TITLE_GOOEY_IN_BLUR / TITLE_BLUR_MAX)
  return { from: hidden, duration: TITLE_GOOEY_IN_DUR * (1 - hidden) }
}

const gooeyTween = (targets: gsap.TweenTarget, vars: gsap.TweenVars) =>
  new Promise<void>((resolve) => {
    abortTitleSwapTween()
    let settled = false
    const settle = () => {
      if (settled) return
      settled = true
      titleSwapAbort = null
      titleSwapTween = null
      resolve()
    }
    titleSwapAbort = settle
    titleSwapTween = gsap.to(targets, {
      ...vars,
      onComplete: settle,
    })
  })

const resplitTitleWords = () => {
  titleSplitInstance?.revert()
  titleSplitInstance = null
  if (!titleEl.value || prefersReducedMotion()) return
  titleSplitInstance = new SplitText(titleEl.value, {
    type: 'words',
    wordsClass: 'discover-page__title-word',
  })
}

const ensurePlugins = () => {
  if (pluginsRegistered || !import.meta.client) return
  gsap.registerPlugin(SplitText)
  pluginsRegistered = true
}

const titleGooeyOut = async (ownGen = true) => {
  if (!import.meta.client || !titleEl.value) return
  if (!titlePaintReady.value && !titleText.value) return

  if (prefersReducedMotion()) {
    titlePaintReady.value = false
    titleText.value = ''
    return
  }

  const gen = ownGen ? ++titleSwapGen : titleSwapGen
  if (ownGen) abortTitleSwapTween()
  titleSwapLock = true

  const outWords = Array.from(titleWords())
  const outTarget = outWords.length ? outWords : titleEl.value

  await gooeyTween(outTarget, {
    filter: outWords.length ? `blur(${TITLE_BLUR_MAX}px)` : undefined,
    opacity: 0,
    duration: TITLE_GOOEY_OUT_DUR,
    ease: 'power2.in',
  })

  if (gen !== titleSwapGen) return
  if (ownGen) titlePaintReady.value = false
  titleSwapLock = false
}

const titleGooeyIn = async (next: string) => {
  if (!import.meta.client || !titleEl.value) {
    titleText.value = next
    return
  }

  ensurePlugins()
  const gen = titleSwapGen
  titleSwapLock = true

  // Hide before the split is reverted, or the new title paints sharp for a frame.
  titlePaintReady.value = false
  titleEl.value.style.visibility = 'hidden'
  titleSplitInstance?.revert()
  titleSplitInstance = null
  gsap.set(titleEl.value, { clearProps: 'opacity,visibility' })
  titleEl.value.style.visibility = 'hidden'
  titleText.value = next
  await nextTick()
  if (!titleEl.value || gen !== titleSwapGen) return

  if (document.fonts?.status !== 'loaded' && document.fonts?.ready) {
    await document.fonts.ready
  }
  if (!titleEl.value || gen !== titleSwapGen) return

  resplitTitleWords()
  const inWords = Array.from(titleWords())
  const inTarget = inWords.length ? inWords : titleEl.value

  if (prefersReducedMotion()) {
    titleEl.value.style.removeProperty('visibility')
    titleSwapLock = false
    titlePaintReady.value = true
    gsap.set(inTarget, { filter: 'none', opacity: 1 })
    return
  }

  const { from, duration } = gooeyInWindow()
  const applyIn = (t: number) => {
    const progress = power3Out(t)
    gsap.set(inTarget, {
      filter: `blur(${TITLE_BLUR_MAX * (1 - progress)}px)`,
      opacity: progress,
    })
  }
  applyIn(from)
  titleEl.value.style.removeProperty('visibility')
  titlePaintReady.value = true
  await nextTick()
  if (!titleEl.value || gen !== titleSwapGen) return

  const clock = { t: from }
  await gooeyTween(clock, {
    t: 1,
    duration,
    ease: 'none',
    onUpdate: () => applyIn(clock.t),
  })

  if (gen !== titleSwapGen) return
  titleSwapLock = false
}

const swapTitleGooey = async (next: string) => {
  if (!next) return
  if (next === titleIncoming) return
  if (next === titleText.value && titlePaintReady.value && !titleSwapLock) return
  titleIncoming = next
  const gen = ++titleSwapGen
  abortTitleSwapTween()
  try {
    const showing =
      titlePaintReady.value && !!titleText.value && titleText.value !== next
    if (showing) {
      await titleGooeyOut(false)
      if (gen !== titleSwapGen) return
    }
    if (gen !== titleSwapGen) return
    await titleGooeyIn(next)
  } finally {
    if (titleIncoming === next) titleIncoming = null
  }
}

const hideTitleGooey = async () => {
  const genAtStart = titleSwapGen
  await titleGooeyOut()
  // A trigger entered while this was leaving. Leave that title alone.
  if (titleIncoming || titleSwapGen !== genAtStart + 1) return
  titleText.value = ''
  titleSplitInstance?.revert()
  titleSplitInstance = null
}

const setHoveredTitle = (title: string | null) => {
  if (title) {
    void swapTitleGooey(title)
    return
  }
  void hideTitleGooey()
}

const onColumnPointerLeave = () => {
  if (typologyActiveRailId.value) return
  setHoveredTitle(null)
}

provide(typologyRowHoverKey, { setHoveredTitle })

const pageEl = ref<HTMLElement | null>(null)
const pageEntering = ref(true)
const CLIP_IN_S = 1.6
const FADE_IN_S = 2
const FADE_STAGGER = 0.3
let centerPadObserver: ResizeObserver | null = null
let enterTween: gsap.core.Timeline | null = null

const setRowClip = (el: HTMLElement, top: number) => {
  el.style.clipPath = `inset(${top}% 0% 0% 0%)`
}

const playPageEnter = () => {
  if (!import.meta.client || !pageEl.value) return
  const rows = [
    ...pageEl.value.querySelectorAll<HTMLElement>('.discover-page__content > *'),
  ]
  const first = rows[0]
  const rest = rows.slice(1)

  if (prefersReducedMotion() || !first) {
    pageEntering.value = false
    return
  }

  setRowClip(first, 100)
  rest.forEach((el) => {
    el.style.transition = 'none'
    el.style.opacity = '0'
    el.style.pointerEvents = 'none'
  })
  pageEntering.value = false

  enterTween = gsap.timeline({
    onComplete: () => {
      enterTween = null
      first.style.removeProperty('clip-path')
      rest.forEach((el) => {
        el.style.removeProperty('opacity')
        el.style.removeProperty('pointer-events')
        el.style.removeProperty('transition')
      })
    },
  })
  const clip = { top: 100 }
  enterTween.to(
    clip,
    {
      top: 0,
      duration: CLIP_IN_S,
      ease: 'power3.inOut',
      onUpdate: () => setRowClip(first, clip.top),
    },
    0,
  )
  if (rest.length) {
    enterTween.to(
      rest,
      {
        opacity: 1,
        duration: FADE_IN_S,
        ease: 'power2.out',
        stagger: FADE_STAGGER,
      },
      CLIP_IN_S,
    )
  }
}

/** Pad top/bottom so first & last thumbnails’ centers sit on the viewport midline. */
const syncCenterPad = () => {
  if (!import.meta.client || !pageEl.value) return

  const anchors = [
    ...pageEl.value.querySelectorAll<HTMLElement>('.collection-rail__card--anchor'),
  ]
  const cards = [
    ...pageEl.value.querySelectorAll<HTMLElement>('.collection-rail__card'),
  ]
  if (!anchors.length && !cards.length) return

  const firstCard = anchors[0] || cards[0]!
  const lastCard = anchors[anchors.length - 1] || cards[cards.length - 1]!

  const thumbCenterOffset = (card: HTMLElement, from: 'top' | 'bottom') => {
    const rail = card.closest('.collection-rail')
    const media =
      card.querySelector<HTMLElement>('.discover-card__media') || card
    if (!rail) return media.getBoundingClientRect().height / 2
    const railRect = rail.getBoundingClientRect()
    const mediaRect = media.getBoundingClientRect()
    const centerY = mediaRect.top + mediaRect.height / 2
    return from === 'top'
      ? centerY - railRect.top
      : railRect.bottom - centerY
  }

  const mid = window.innerHeight / 2
  const padTop = Math.max(0, mid - thumbCenterOffset(firstCard, 'top'))
  const padBottom = Math.max(0, mid - thumbCenterOffset(lastCard, 'bottom'))

  pageEl.value.style.setProperty('--rail-center-pad-top', `${padTop}px`)
  pageEl.value.style.setProperty('--rail-center-pad-bottom', `${padBottom}px`)
}

const observeCenterPad = () => {
  centerPadObserver?.disconnect()
  centerPadObserver = null
  if (!import.meta.client || !pageEl.value || typeof ResizeObserver === 'undefined') {
    syncCenterPad()
    return
  }
  centerPadObserver = new ResizeObserver(() => syncCenterPad())
  pageEl.value
    .querySelectorAll(
      '.collection-rail, .collection-rail__scroller, .collection-rail__card--anchor, .discover-card__media',
    )
    .forEach((el) => centerPadObserver!.observe(el))
  syncCenterPad()
}

onMounted(() => {
  nextTick(() => {
    observeCenterPad()
    playPageEnter()
    // Images may settle aspect after decode
    window.setTimeout(observeCenterPad, 300)
  })
  window.addEventListener('resize', syncCenterPad)
})

const syncOutsideCloseCursor = (locked: boolean) => {
  if (!import.meta.client) return
  const root = document.documentElement
  if (locked) root.setAttribute('data-cursor', 'close')
  else if (root.getAttribute('data-cursor') === 'close') root.removeAttribute('data-cursor')
}

watch(typologyRowsLocked, (locked) => {
  syncOutsideCloseCursor(locked)
  if (locked) startTitleScrub()
  else stopTitleScrub()
})

const stopPausedPointer = (event: Event) => {
  event.preventDefault()
  event.stopPropagation()
}

const pausedPointerEvents = ['pointerdown', 'pointerup', 'click', 'wheel', 'touchstart', 'touchmove'] as const

const syncPointerPause = (paused: boolean) => {
  if (!import.meta.client) return
  document.documentElement.classList.toggle('typology-pointer-paused', paused)
  for (const name of pausedPointerEvents) {
    if (paused) {
      document.addEventListener(name, stopPausedPointer, { capture: true, passive: false })
    } else {
      document.removeEventListener(name, stopPausedPointer, { capture: true })
    }
  }
}

watch(typologyPointerPaused, syncPointerPause)

onBeforeUnmount(() => {
  syncOutsideCloseCursor(false)
  syncPointerPause(false)
  stopTitleScrub()
  enterTween?.kill()
  enterTween = null
  abortTitleSwapTween()
  titleSplitInstance?.revert()
  titleSplitInstance = null
  window.removeEventListener('resize', syncCenterPad)
  centerPadObserver?.disconnect()
  centerPadObserver = null
})
</script>

<style scoped>
.discover-page {
  --discover-section-gap: 0;
  /* Fallback until measured — JS sets exact pads from thumbnail centers */
  --rail-center-pad-top: calc(50dvh - 12vw);
  --rail-center-pad-bottom: calc(50dvh - 12vw);
  padding-top: var(--rail-center-pad-top);
  padding-bottom: var(--rail-center-pad-bottom);
}

.discover-page--enter .discover-page__content > :first-child {
  clip-path: inset(100% 0% 0% 0%);
}

.discover-page--enter .discover-page__content > :not(:first-child) {
  opacity: 0;
  pointer-events: none;
}

.discover-page__title-filter {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}

.discover-page__row-title {
  position: fixed;
  left: var(--discover-gutter, var(--gutter));
  top: 50%;
  z-index: 30;
  margin: 0;
  max-width: min(36vw, 18rem);
  transform: translateY(-50%) translateX(0);
  pointer-events: none;
  will-change: filter, opacity;
}

.discover-page__row-title--pending {
  visibility: hidden !important;
  opacity: 0 !important;
}

.discover-page__row-title :deep(.discover-page__title-word) {
  display: inline-block;
  will-change: filter, opacity;
}

.discover-page__content {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.discover-page__content :deep(.collection-rail) {
  transition:
    opacity 0.15s ease,
    filter 0.15s ease,
    --rail-open 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Hovering or activating a row fades / grays every other row */
.discover-page__content--row-hot
  :deep(.collection-rail:not(.collection-rail--hot)) {
  opacity: 0.1;
  filter: grayscale(1);
}

/* An open row stays put. Hovering another row's trigger only lifts that cell. */
.discover-page__content--row-locked
  :deep(.collection-rail:not(.collection-rail--hot)) {
  transition:
    opacity 0.5s ease,
    filter 0.5s ease,
    --rail-open 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}

.discover-page__content--row-locked
  :deep(
    .collection-rail:not(.collection-rail--hot):has(.collection-rail__card--trigger:hover)
  ) {
  opacity: 0.5;
  filter: grayscale(1);
}

@media (prefers-reduced-motion: reduce) {
  .discover-page__content :deep(.collection-rail) {
    transition: none;
  }

  .discover-page--enter .discover-page__content > :first-child {
    clip-path: none;
  }

  .discover-page--enter .discover-page__content > :not(:first-child) {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>

<style>
/* Holds every hit target until a row handoff has finished opening. */
html.typology-pointer-paused,
html.typology-pointer-paused * {
  pointer-events: none !important;
}
</style>
