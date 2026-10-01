<template>
  <div ref="pageEl" class="discover-page">
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
      class="page-title discover-page__row-title"
      :class="{ 'discover-page__row-title--pending': !titlePaintReady }"
      :style="{ filter: titleBaseFilter, WebkitFilter: titleBaseFilter }"
      aria-live="polite"
    >
      {{ titleText }}
    </h2>

    <div class="discover-page__content">
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
import { typologyRowHoverKey } from '~/composables/useTypologyRowHover'

definePageMeta({
  layout: 'curated-discover',
})

const TITLE_BLUR_MAX = 75
const TITLE_GOOEY_OUT_DUR = 0.28
const TITLE_GOOEY_IN_DUR = 0.72

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
let leaveHideTimer: ReturnType<typeof setTimeout> | null = null
let pluginsRegistered = false

const prefersReducedMotion = () =>
  import.meta.client &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const titleWords = () =>
  (titleEl.value?.querySelectorAll('.discover-page__title-word') ||
    []) as NodeListOf<Element> | never[]

const abortTitleSwapTween = () => {
  const tween = titleSwapTween
  const abort = titleSwapAbort
  titleSwapTween = null
  titleSwapAbort = null
  tween?.kill()
  abort?.()
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

const titleGooeyOut = async () => {
  if (!import.meta.client || !titleEl.value) return
  if (!titlePaintReady.value && !titleText.value) return

  if (prefersReducedMotion()) {
    titlePaintReady.value = false
    titleText.value = ''
    return
  }

  const gen = ++titleSwapGen
  abortTitleSwapTween()
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
  titlePaintReady.value = false
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

  titleSplitInstance?.revert()
  titleSplitInstance = null
  gsap.set(titleEl.value, { clearProps: 'opacity' })
  titleText.value = next
  await nextTick()
  if (!titleEl.value || gen !== titleSwapGen) return

  try {
    await document.fonts?.ready
  } catch {
    /* ignore */
  }

  resplitTitleWords()
  const inWords = Array.from(titleWords())
  const inTarget = inWords.length ? inWords : titleEl.value

  if (prefersReducedMotion()) {
    titleSwapLock = false
    titlePaintReady.value = true
    gsap.set(inTarget, { filter: 'none', opacity: 1 })
    return
  }

  gsap.set(inTarget, {
    filter: inWords.length ? `blur(${TITLE_BLUR_MAX}px)` : undefined,
    opacity: 0,
  })
  titlePaintReady.value = true

  await gooeyTween(inTarget, {
    filter: inWords.length ? 'blur(0px)' : undefined,
    opacity: 1,
    duration: TITLE_GOOEY_IN_DUR,
    ease: 'power3.out',
  })

  if (gen !== titleSwapGen) return
  titleSwapLock = false
}

const swapTitleGooey = async (next: string) => {
  if (!next) return
  if (next === titleText.value && titlePaintReady.value && !titleSwapLock) return
  await titleGooeyOut()
  await titleGooeyIn(next)
}

const hideTitleGooey = async () => {
  await titleGooeyOut()
  titleText.value = ''
  titleSplitInstance?.revert()
  titleSplitInstance = null
}

const setHoveredTitle = (title: string | null) => {
  if (leaveHideTimer) {
    clearTimeout(leaveHideTimer)
    leaveHideTimer = null
  }
  if (title) {
    void swapTitleGooey(title)
    return
  }
  leaveHideTimer = setTimeout(() => {
    leaveHideTimer = null
    void hideTitleGooey()
  }, 50)
}

provide(typologyRowHoverKey, { setHoveredTitle })

const pageEl = ref<HTMLElement | null>(null)
let centerPadObserver: ResizeObserver | null = null

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
    // Images may settle aspect after decode
    window.setTimeout(observeCenterPad, 300)
  })
  window.addEventListener('resize', syncCenterPad)
})

onBeforeUnmount(() => {
  if (leaveHideTimer) clearTimeout(leaveHideTimer)
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
  font-size: clamp(2.5rem, 6vw, 5.5rem);
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
    opacity 0.4s ease,
    filter 0.4s ease;
}

/* Hovering a row fades / grays every other row */
.discover-page__content--row-hot
  :deep(.collection-rail:not(.collection-rail--hot)) {
  opacity: 0.1;
  filter: grayscale(1);
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .discover-page__content :deep(.collection-rail) {
    transition: none;
  }
}
</style>
