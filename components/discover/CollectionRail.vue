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
      @scroll="onScroll"
    >
      <div class="collection-rail__track">
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
const canPrev = ref(false)
const canNext = ref(false)

const showControls = computed(
  () => props.displayMode !== 'feature' && (props.collection?.artworks.length || 0) > 1,
)

const secondaryArtworks = computed(
  () => props.collection?.artworks.slice(1, 3) || [],
)

const syncControls = () => {
  const el = scrollerEl.value
  if (!el) {
    canPrev.value = false
    canNext.value = false
    return
  }
  const max = el.scrollWidth - el.clientWidth
  canPrev.value = el.scrollLeft > 4
  canNext.value = el.scrollLeft < max - 4
}

const onScroll = () => syncControls()

const scrollByPage = (direction: 1 | -1) => {
  const el = scrollerEl.value
  if (!el) return
  const amount = Math.max(el.clientWidth * 0.85, 240)
  el.scrollBy({ left: direction * amount, behavior: 'smooth' })
}

onMounted(() => {
  nextTick(syncControls)
  window.addEventListener('resize', syncControls)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncControls)
})

watch(
  () => props.collection?.artworks.length,
  () => nextTick(syncControls),
)
</script>

<style scoped>
.collection-rail {
  --rail-card-basis: calc((100% - (var(--discover-rail-gap) * 3)) / 4.15);
  padding: 0 var(--discover-gutter, var(--gutter));
  margin-bottom: var(--discover-section-gap, 5rem);
}

.collection-rail--editorial {
  --rail-card-basis: calc((100% - (var(--discover-rail-gap) * 2)) / 3.2);
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
  max-width: 36rem;
}

.collection-rail__title {
  margin: 0;
  font-size: clamp(1.35rem, 2.4vw, 1.85rem);
  line-height: 1.15;
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
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  margin-inline: calc(var(--discover-gutter, var(--gutter)) * -1);
  padding-inline: var(--discover-gutter, var(--gutter));
}

.collection-rail__scroller::-webkit-scrollbar {
  display: none;
}

.collection-rail__track {
  display: flex;
  align-items: flex-end;
  gap: var(--discover-rail-gap, 1.25rem);
  width: max-content;
  min-width: 100%;
  padding-bottom: 0.25rem;
}

.collection-rail__card {
  width: min(var(--rail-card-basis), 72vw);
  min-width: min(220px, 72vw);
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
    --rail-card-basis: calc((100% - var(--discover-rail-gap)) / 2.25);
  }

  .collection-rail--editorial {
    --rail-card-basis: calc((100% - var(--discover-rail-gap)) / 2.05);
  }

  .collection-rail__feature {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 639px) {
  .collection-rail,
  .collection-rail--editorial {
    --rail-card-basis: 78vw;
  }
}
</style>
