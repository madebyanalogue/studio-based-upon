<template>
  <section
    v-if="collection?.artworks?.length"
    class="collection-rail"
    :class="`collection-rail--${displayMode}`"
    :aria-label="collection.title"
  >
    <header class="collection-rail__header">
      <div class="collection-rail__heading">
        <h2 class="collection-rail__title serif">{{ collection.title }}</h2>
        <p v-if="collection.description" class="collection-rail__desc">
          {{ collection.description }}
        </p>
      </div>
      <div v-if="showControls" class="collection-rail__controls">
        <button
          type="button"
          class="collection-rail__nav"
          aria-label="Scroll collection backward"
          :disabled="!canPrev"
          @click="scrollByPage(-1)"
        >
          <span aria-hidden="true">←</span>
        </button>
        <button
          type="button"
          class="collection-rail__nav"
          aria-label="Scroll collection forward"
          :disabled="!canNext"
          @click="scrollByPage(1)"
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </header>

    <div
      v-if="displayMode === 'feature'"
      class="collection-rail__feature"
    >
      <DiscoverArtworkCard
        class="collection-rail__feature-primary"
        :artwork="collection.artworks[0]!"
      />
      <div v-if="secondaryArtworks.length" class="collection-rail__feature-secondary">
        <DiscoverArtworkCard
          v-for="artwork in secondaryArtworks"
          :key="artwork.id"
          :artwork="artwork"
        />
      </div>
    </div>

    <div
      v-else
      ref="scrollerEl"
      class="collection-rail__scroller"
      data-lenis-prevent-horizontal
    >
      <div ref="trackEl" class="collection-rail__track">
        <DiscoverArtworkCard
          v-for="artwork in collection.artworks"
          :key="artwork.id"
          class="collection-rail__card"
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

const props = withDefaults(
  defineProps<{
    collection: DiscoverCollection | null
    displayMode?: DiscoverDisplayMode
  }>(),
  { displayMode: 'gallery' },
)

const scrollerEl = ref<HTMLElement | null>(null)
const trackEl = ref<HTMLElement | null>(null)
const canPrev = ref(false)
const canNext = ref(false)

let railLenis: Lenis | null = null
let railLenisRaf = 0
let railResizeObserver: ResizeObserver | null = null

const showControls = computed(
  () => props.displayMode !== 'feature' && (props.collection?.artworks.length || 0) > 1,
)

const secondaryArtworks = computed(
  () => props.collection?.artworks.slice(1, 3) || [],
)

const getScrollLeft = () =>
  railLenis?.animatedScroll ?? scrollerEl.value?.scrollLeft ?? 0

const syncControls = () => {
  const el = scrollerEl.value
  if (!el) {
    canPrev.value = false
    canNext.value = false
    return
  }
  const left = getScrollLeft()
  const max = Math.max(0, el.scrollWidth - el.clientWidth)
  canPrev.value = left > 4
  canNext.value = left < max - 4
}

const destroyRailLenis = () => {
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

const initRailLenis = () => {
  if (!import.meta.client) return
  if (props.displayMode === 'feature') {
    destroyRailLenis()
    return
  }
  const wrapper = scrollerEl.value
  const content = trackEl.value
  if (!wrapper || !content) return

  destroyRailLenis()
  railLenis = new Lenis({
    wrapper,
    content,
    orientation: 'horizontal',
    // Horizontal gestures only — vertical wheel/trackpad scrolls the page.
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
  railLenis.on('scroll', syncControls)
  railLenis.resize()
  if (typeof ResizeObserver !== 'undefined') {
    railResizeObserver = new ResizeObserver(() => {
      railLenis?.resize()
      syncControls()
    })
    railResizeObserver.observe(content)
    railResizeObserver.observe(wrapper)
  }
  railLenisRaf = requestAnimationFrame(tickRailLenis)
  syncControls()
}

const scrollByPage = (direction: 1 | -1) => {
  const el = scrollerEl.value
  if (!el) return
  const amount = Math.max(el.clientWidth * 0.85, 240)
  const next = Math.max(
    0,
    Math.min(
      getScrollLeft() + direction * amount,
      Math.max(0, el.scrollWidth - el.clientWidth),
    ),
  )
  if (railLenis) {
    railLenis.scrollTo(next, { lerp: 0.1 })
    return
  }
  el.scrollBy({ left: direction * amount, behavior: 'smooth' })
}

const onWindowResize = () => {
  railLenis?.resize()
  syncControls()
}

onMounted(() => {
  nextTick(() => {
    initRailLenis()
    syncControls()
  })
  window.addEventListener('resize', onWindowResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  destroyRailLenis()
})

watch(
  () => [props.displayMode, props.collection?.artworks.map((a) => a.id).join('|')] as const,
  async () => {
    await nextTick()
    if (props.displayMode === 'feature' || !scrollerEl.value || !trackEl.value) {
      destroyRailLenis()
      syncControls()
      return
    }
    if (!railLenis) initRailLenis()
    else {
      railLenis.resize()
      syncControls()
    }
  },
)
</script>

<style scoped>
.collection-rail {
  --discover-rail-gap: 15px;
  /* 3.5 cards in view → 3 gaps between the visible slots */
  --rail-cols: 3.5;
  --rail-gaps: 3;
  padding: 0 var(--discover-gutter, var(--gutter));
  margin-bottom: var(--discover-section-gap, 5rem);
}

.collection-rail--editorial {
  --rail-cols: 2.5;
  --rail-gaps: 2;
}

.collection-rail__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: clamp(1.25rem, 2.5vw, 2rem);
}

.collection-rail__heading {
  min-width: 0;
  max-width: 100%;
  flex: 1;
}

.collection-rail__title {
  margin: 0;
  font-size: 10vw;
  line-height: 1;
  font-weight: 400;
}

.collection-rail__desc {
  margin: 0.55rem 0 0;
  font-size: var(--text-sm);
  line-height: 1.45;
  color: var(--muted);
}

.collection-rail__controls {
  display: none;
  gap: 0.35rem;
  flex-shrink: 0;
}

@media (hover: hover) and (pointer: fine) {
  .collection-rail__controls {
    display: flex;
  }
}

.collection-rail__nav {
  width: 2.25rem;
  height: 2.25rem;
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--charcoal) 18%, transparent);
  background: transparent;
  color: var(--charcoal);
  cursor: pointer;
  transition: opacity 0.2s ease, border-color 0.2s ease;
}

.collection-rail__nav:disabled {
  opacity: 0.28;
  cursor: default;
}

.collection-rail__nav:not(:disabled):hover {
  border-color: var(--charcoal);
}

.collection-rail__scroller {
  /* Card widths use 100cqi against this box so max-content track = used widths */
  container-type: inline-size;
  container-name: collection-rail;
  --rail-card-basis: calc(
    (100cqi - (var(--discover-rail-gap) * var(--rail-gaps))) / var(--rail-cols)
  );
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  margin-inline: calc(var(--discover-gutter, var(--gutter)) * -1);
  /* Matching end inset — last card stops at the inside right edge */
  padding-inline: var(--discover-gutter, var(--gutter));
}

.collection-rail__scroller::-webkit-scrollbar {
  display: none;
}

.collection-rail__track {
  display: flex;
  align-items: flex-end;
  gap: var(--discover-rail-gap);
  width: max-content;
  padding-bottom: 0.25rem;
}

.collection-rail__card {
  flex: 0 0 auto;
  box-sizing: border-box;
  width: min(var(--rail-card-basis), 72vw, 900px);
  min-width: min(220px, 72vw);
  max-width: 100cqi;
}

.collection-rail__feature {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(0, 0.85fr);
  gap: var(--discover-rail-gap, 1.25rem);
  align-items: end;
}

.collection-rail__feature-secondary {
  display: grid;
  gap: var(--discover-rail-gap, 1.25rem);
}

@media (max-width: 899px) {
  .collection-rail {
    --rail-cols: 2.5;
    --rail-gaps: 2;
  }

  .collection-rail--editorial {
    --rail-cols: 1.35;
    --rail-gaps: 1;
  }

  .collection-rail__feature {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 599px) {
  .collection-rail {
    --rail-cols: 1.35;
    --rail-gaps: 1;
  }
}
</style>
