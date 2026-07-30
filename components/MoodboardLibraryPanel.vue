<template>
  <aside
    v-show="open"
    class="library-panel"
    role="complementary"
    aria-label="Materials library"
  >
    <header class="library-panel__header">
      <h2 class="library-panel__title  interface">Library</h2>
      <button
        type="button"
        class="library-panel__close"
        aria-label="Close library"
        @click="emit('close')"
      >
        ×
      </button>
    </header>

    <div ref="scrollEl" class="library-panel__scroll">
      <section
        v-for="group in groups"
        :key="group.value"
        class="library-panel__section"
      >
        <h3 class="library-panel__section-title">{{ group.label }}</h3>
        <div class="library-panel__grid">
          <button
            v-for="item in group.items"
            :key="item._id"
            type="button"
            class="library-panel__item"
            :title="`Add ${item.title}`"
            @click="emit('select', item)"
          >
            <span class="library-panel__thumb">
              <img
                v-if="thumbUrl(item)"
                :src="thumbUrl(item)"
                :alt="item.title"
                loading="lazy"
                draggable="false"
              />
            </span>
            <span class="library-panel__item-title">{{ item.title }}</span>
          </button>
        </div>
      </section>

      <p v-if="!groups.length" class="library-panel__empty  interface">
        No library items yet.
      </p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import {
  PRODUCT_TYPE_FILTERS,
  filterKey,
  isPrecraftedItem,
} from '~/composables/demoData'
import {
  LIBRARY_QUERY,
  demoLibraryItems,
  normalizeLibraryItem,
  type LibraryItem,
} from '~/composables/useLibraryCatalog'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  select: [item: LibraryItem]
}>()

const { data } = useLazyAsyncData('libraryItems', () =>
  $fetch('/api/sanity/query', { method: 'POST', body: { query: LIBRARY_QUERY } })
    .then((r: { result?: unknown }) => r?.result ?? null)
    .catch(() => null),
)

const { imageUrl } = useSanityImage()

const items = computed<LibraryItem[]>(() => {
  if (Array.isArray(data.value) && data.value.length) {
    return (data.value as Record<string, unknown>[])
      .map(normalizeLibraryItem)
      .filter((item) => item._id && !isPrecraftedItem(item))
  }
  return demoLibraryItems()
})

const thumbUrl = (item: LibraryItem) => {
  const url = imageUrl(item.image, 400)
  if (!url || url.includes('picsum.photos')) return ''
  return url
}

const groups = computed(() =>
  PRODUCT_TYPE_FILTERS.map((filter) => ({
    ...filter,
    items: items.value.filter((item) => {
      const keys = [
        item.type,
        item.category,
        ...(item.categories || []),
      ]
        .filter(Boolean)
        .map((value) => filterKey(String(value)))
      return keys.includes(filter.value) || keys.includes(filterKey(filter.label))
    }),
  })).filter((group) => group.items.length > 0),
)
</script>

<style scoped>
.library-panel {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 350;
  width: min(22rem, 88vw);
  display: flex;
  flex-direction: column;
  background: var(--warm-white, #f7f3ec);
  border-right: 1px solid var(--grid-line);
  box-shadow: 8px 0 32px rgba(0, 0, 0, 0.06);
}

.library-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-shrink: 0;
  padding: 1rem 1.1rem;
  border-bottom: 1px solid var(--grid-line);
}

.library-panel__title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 400;
  color: var(--charcoal);
}

.library-panel__close {
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  font-size: 1.35rem;
  line-height: 1;
  color: var(--charcoal);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 50%;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.library-panel__close:hover {
  background: #fff;
  border-color: var(--grid-line);
}

.library-panel__scroll {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0.75rem 1rem 2rem;
}

.library-panel__section + .library-panel__section {
  margin-top: 1.75rem;
}

.library-panel__section-title {
  margin: 0 0 0.75rem;
  font-size: var(--text-xs);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--charcoal);
  opacity: 0.7;
}

.library-panel__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}

.library-panel__item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0;
  text-align: left;
  background: transparent;
  border: none;
  color: var(--charcoal);
  cursor: pointer;
}

.library-panel__thumb {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background: #ddd6c8;
  border-radius: 28%;
  corner-shape: squircle;
}

.library-panel__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: opacity 0.15s ease;
}

.library-panel__item:hover .library-panel__thumb img {
  opacity: 0.85;
}

.library-panel__item-title {
  font-size: 0.65rem;
  line-height: 1.3;
  letter-spacing: 0.02em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.library-panel__empty {
  margin: 2rem 0;
  text-align: center;
  opacity: 0.6;
}
</style>
