<template>
  <section
    v-if="collection?.artworks?.length"
    ref="railEl"
    class="collection-rail"
    :class="[
      `collection-rail--${displayMode}`,
      { 'collection-rail--hot': isHot },
    ]"
    :aria-label="collection.title"
    @pointerenter="setHot(true)"
    @pointerleave="setHot(false)"
  >
    <header class="collection-rail__header" aria-hidden="true">
      <div class="collection-rail__heading">
        <h2 class="collection-rail__title serif">{{ collection.title }}</h2>
      </div>
    </header>

    <div
      ref="scrollerEl"
      class="collection-rail__scroller"
      data-lenis-prevent-horizontal
    >
      <div ref="trackEl" class="collection-rail__track">
        <DiscoverArtworkCard
          v-for="(artwork, index) in collection.artworks"
          :key="artwork.id"
          class="collection-rail__card"
          :class="{ 'collection-rail__card--anchor': index === anchorIndex }"
          :artwork="artwork"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import Lenis from 'lenis'
import type {
  DiscoverCollection,
  DiscoverDisplayMode,
} from '~/composables/useCuratedDiscover'
import { typologyRowHoverKey } from '~/composables/useTypologyRowHover'

const props = withDefaults(
  defineProps<{
    collection: DiscoverCollection | null
    displayMode?: DiscoverDisplayMode
  }>(),
  { displayMode: 'gallery' },
)

const rowHover = inject(typologyRowHoverKey, null)

const scrollerEl = ref<HTMLElement | null>(null)
const trackEl = ref<HTMLElement | null>(null)
const railEl = ref<HTMLElement | null>(null)
const isHot = ref(false)
/** Card index locked to the viewport center when the row is at rest. */
const anchorIndex = ref(0)

let railLenis: Lenis | null = null
let railLenisRaf = 0
let railResizeObserver: ResizeObserver | null = null
let centerRaf = 0
let snapIdleTimer: ReturnType<typeof setTimeout> | null = null

const destroyRailLenis = () => {
  if (snapIdleTimer) {
    clearTimeout(snapIdleTimer)
    snapIdleTimer = null
  }
  railResizeObserver?.disconnect()
  railResizeObserver = null
  if (railLenisRaf) {
    cancelAnimationFrame(railLenisRaf)
    railLenisRaf = 0
  }
  railLenis?.destroy()
  railLenis = null
}

const tickRailLenis = (time: number) => {
  railLenis?.raf(time)
  railLenisRaf = requestAnimationFrame(tickRailLenis)
}

const getCards = () =>
  [
    ...(trackEl.value?.querySelectorAll<HTMLElement>('.collection-rail__card') ||
      []),
  ]

/** Index of the card whose center is closest to the viewport midpoint. */
const findNearestCardIndex = () => {
  const wrapper = scrollerEl.value
  const cards = getCards()
  if (!wrapper || !cards.length) return 0

  const centerX = wrapper.getBoundingClientRect().left + wrapper.clientWidth / 2
  let best = 0
  let bestDist = Infinity
  cards.forEach((card, i) => {
    const rect = card.getBoundingClientRect()
    const dist = Math.abs(rect.left + rect.width / 2 - centerX)
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  })
  return best
}

/** Scroll so a given card sits in the horizontal center of the page. */
const centerCardAt = (index: number, immediate = true) => {
  const wrapper = scrollerEl.value
  const card = getCards()[index]
  if (!wrapper || !card) return

  const wrapperRect = wrapper.getBoundingClientRect()
  const cardRect = card.getBoundingClientRect()
  const cardCenter =
    wrapper.scrollLeft + (cardRect.left - wrapperRect.left) + cardRect.width / 2
  const target = Math.max(0, cardCenter - wrapper.clientWidth / 2)

  if (railLenis) {
    const wasStopped = !isHot.value
    if (wasStopped) railLenis.start()
    railLenis.scrollTo(target, immediate ? { immediate: true } : { lerp: 0.14 })
    if (wasStopped) {
      window.setTimeout(() => {
        if (!isHot.value) railLenis?.stop()
      }, immediate ? 0 : 420)
    }
    return
  }
  if (immediate) wrapper.scrollLeft = target
  else wrapper.scrollTo({ left: target, behavior: 'smooth' })
}

const scheduleCenter = (immediate = true) => {
  if (!import.meta.client) return
  if (centerRaf) cancelAnimationFrame(centerRaf)
  centerRaf = requestAnimationFrame(() => {
    centerRaf = 0
    centerCardAt(anchorIndex.value, immediate)
  })
}

/** Snap the nearest card to center and remember it as the resting anchor. */
const snapToNearest = (immediate = false) => {
  const nearest = findNearestCardIndex()
  anchorIndex.value = nearest
  centerCardAt(nearest, immediate)
}

const onRailScroll = () => {
  if (!isHot.value) return
  if (snapIdleTimer) clearTimeout(snapIdleTimer)
  snapIdleTimer = setTimeout(() => {
    snapIdleTimer = null
    if (!isHot.value) return
    snapToNearest(false)
  }, 140)
}

const initRailLenis = () => {
  if (!import.meta.client) return
  const wrapper = scrollerEl.value
  const content = trackEl.value
  if (!wrapper || !content) return

  destroyRailLenis()
  railLenis = new Lenis({
    wrapper,
    content,
    orientation: 'horizontal',
    gestureOrientation: 'horizontal',
    smoothWheel: true,
    syncTouch: true,
    syncTouchLerp: 0.055,
    touchInertiaExponent: 2.05,
    touchMultiplier: 1.4,
    wheelMultiplier: 1.15,
    lerp: 0.08,
    overscroll: false,
    prevent: () => false,
  })
  railLenis.on('scroll', onRailScroll)
  if (!isHot.value) railLenis.stop()
  railLenis.resize()
  if (typeof ResizeObserver !== 'undefined') {
    railResizeObserver = new ResizeObserver(() => {
      railLenis?.resize()
      if (!isHot.value) scheduleCenter(true)
    })
    railResizeObserver.observe(content)
    railResizeObserver.observe(wrapper)
  }
  railLenisRaf = requestAnimationFrame(tickRailLenis)
  scheduleCenter(true)
}

const setHot = (hot: boolean) => {
  if (isHot.value === hot) return
  isHot.value = hot
  railEl.value?.parentElement?.classList.toggle(
    'discover-page__content--row-hot',
    hot,
  )
  rowHover?.setHoveredTitle(hot ? props.collection?.title || null : null)

  if (snapIdleTimer) {
    clearTimeout(snapIdleTimer)
    snapIdleTimer = null
  }

  if (!railLenis) return
  if (hot) {
    railLenis.start()
    return
  }
  snapToNearest(false)
  window.setTimeout(() => {
    if (!isHot.value) railLenis?.stop()
  }, 420)
}

const onWindowResize = () => {
  railLenis?.resize()
  if (!isHot.value) scheduleCenter(true)
}

onMounted(() => {
  nextTick(() => {
    initRailLenis()
  })
  window.addEventListener('resize', onWindowResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  if (centerRaf) cancelAnimationFrame(centerRaf)
  if (snapIdleTimer) clearTimeout(snapIdleTimer)
  if (isHot.value) rowHover?.setHoveredTitle(null)
  railEl.value?.parentElement?.classList.remove('discover-page__content--row-hot')
  destroyRailLenis()
})

watch(
  () => props.collection?.artworks.map((a) => a.id).join('|'),
  async () => {
    anchorIndex.value = 0
    await nextTick()
    if (!scrollerEl.value || !trackEl.value) {
      destroyRailLenis()
      return
    }
    if (!railLenis) initRailLenis()
    else {
      railLenis.resize()
      if (!isHot.value) {
        railLenis.stop()
        scheduleCenter(true)
      } else {
        railLenis.start()
      }
    }
  },
)
</script>

<style scoped>
.collection-rail {
  --discover-rail-gap: 5px;
  --rail-cols: 5;
  --rail-gaps: 4;
  --rail-card-basis: calc(
    (100vw - (var(--discover-rail-gap) * var(--rail-gaps))) / var(--rail-cols)
  );
  padding: 0;
  margin-bottom: 0;
}

.collection-rail--editorial {
  --rail-cols: 5;
  --rail-gaps: 4;
}

/* Per-row titles hidden — fixed page title handles labeling */
.collection-rail__header {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.collection-rail__scroller {
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  width: 100%;
}

.collection-rail:not(.collection-rail--hot) .collection-rail__scroller {
  overflow-x: hidden;
}

.collection-rail__scroller::-webkit-scrollbar {
  display: none;
}

.collection-rail__track {
  display: flex;
  align-items: center;
  gap: var(--discover-rail-gap);
  width: max-content;
  padding-inline: calc(50vw - (var(--rail-card-basis) / 2));
  padding-block: calc(var(--discover-rail-gap) / 2);
  box-sizing: content-box;
}

.collection-rail__card {
  flex: 0 0 auto;
  box-sizing: border-box;
  width: var(--rail-card-basis);
  min-width: 0;
  max-width: none;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.35s ease;
}

/* Resting: only the centered (snapped) slide is visible → single column */
.collection-rail__card--anchor {
  opacity: 1;
  pointer-events: auto;
}

/* Hover: reveal the whole row for left/right browsing */
.collection-rail--hot .collection-rail__card {
  opacity: 1;
  pointer-events: auto;
}

.collection-rail__card :deep(.discover-card__meta) {
  display: none;
}

@media (max-width: 899px) {
  .collection-rail {
    --rail-cols: 3.5;
    --rail-gaps: 3;
  }
}

@media (max-width: 599px) {
  .collection-rail {
    --rail-cols: 2.25;
    --rail-gaps: 2;
  }
}

@media (prefers-reduced-motion: reduce) {
  .collection-rail__card {
    transition: none;
  }
}
</style>
