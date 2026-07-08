<template>
  <div class="products">
    <section class="products__header section">
      <h1 class="page-title">Products</h1>
      <p class="products__intro serif-italic">
        A working library of surfaces, textures and forms. Filter, explore, and heart pieces into
        your selection.
      </p>
    </section>

    <div class="products__controls">
      <div class="products__filters" role="group" aria-label="Filter by type">
        <button
          type="button"
          class="type-chip"
          :class="{ 'type-chip--active': activeType === '' }"
          @click="activeType = ''"
        >
          All
        </button>
        <button
          v-for="type in typeFilters"
          :key="type.value"
          type="button"
          class="type-chip"
          :class="{ 'type-chip--active': activeType === type.value }"
          @click="activeType = type.value"
        >
          {{ type.label }}
        </button>
      </div>

      <div class="products__tools">
        <div ref="materialDropdown" class="filter-dropdown">
          <button
            type="button"
            class="filter-dropdown__toggle"
            :class="{ 'filter-dropdown__toggle--active': activeMaterials.length }"
            :aria-expanded="openDropdown === 'material'"
            @click="toggleDropdown('material')"
          >
            Material<span v-if="activeMaterials.length" class="filter-dropdown__count">{{ activeMaterials.length }}</span>
            <span class="filter-dropdown__caret" aria-hidden="true">{{ openDropdown === 'material' ? '−' : '+' }}</span>
          </button>
          <div v-if="openDropdown === 'material'" class="filter-dropdown__menu">
            <button
              v-for="material in materialFilters"
              :key="material.value"
              type="button"
              class="filter-dropdown__option"
              :class="{ 'filter-dropdown__option--active': activeMaterials.includes(material.value) }"
              @click="toggle('material', material.value)"
            >
              {{ material.label }}
            </button>
          </div>
        </div>

        <div ref="colourDropdown" class="filter-dropdown">
          <button
            type="button"
            class="filter-dropdown__toggle"
            :class="{ 'filter-dropdown__toggle--active': activeColours.length }"
            :aria-expanded="openDropdown === 'colour'"
            @click="toggleDropdown('colour')"
          >
            Colour<span v-if="activeColours.length" class="filter-dropdown__count">{{ activeColours.length }}</span>
            <span class="filter-dropdown__caret" aria-hidden="true">{{ openDropdown === 'colour' ? '−' : '+' }}</span>
          </button>
          <div v-if="openDropdown === 'colour'" class="filter-dropdown__menu">
            <button
              v-for="colour in colourFilters"
              :key="colour.value"
              type="button"
              class="filter-dropdown__option"
              :class="{ 'filter-dropdown__option--active': activeColours.includes(colour.value) }"
              @click="toggle('colour', colour.value)"
            >
              {{ colour.label }}
            </button>
          </div>
        </div>

        <div class="products__grid-size" role="group" aria-label="Grid size">
          <button
            v-for="size in gridSizes"
            :key="size"
            type="button"
            class="grid-size-btn"
            :class="{ 'grid-size-btn--active': columns === size }"
            :aria-pressed="columns === size"
            :aria-label="`Show ${size} columns`"
            @click="columns = size"
          >
            <span class="grid-size-btn__icon" :style="{ '--dots': size }">
              <span v-for="n in size * size" :key="n" />
            </span>
          </button>
        </div>
      </div>
    </div>

    <section class="products__grid-wrap section section--wide">
      <p class="products__count">{{ filteredItems.length }} items</p>
      <div class="products__grid" :style="{ '--columns': columns }">
        <ProductCard
          v-for="item in filteredItems"
          :key="item._id"
          :item="item"
          :image-url="item.image.asset.url"
        />
      </div>
      <p v-if="!filteredItems.length" class="products__empty">
        No items match those filters.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  DEMO_PRODUCTS,
  PRODUCT_TYPE_FILTERS,
  PRODUCT_MATERIAL_FILTERS,
  PRODUCT_COLOUR_FILTERS,
  type FormalItem,
} from '~/composables/demoData'

const gridQuery = `*[_type == "gridItem" && itemType in ["product", "material", "shape"]] | order(orderRank) {
  _id,
  title,
  slug,
  itemType,
  categories,
  image { asset-> { _id, url } },
  linkType
}`

const { data: gridData } = await useAsyncData('formalProducts', () =>
  $fetch('/api/sanity/query', { method: 'POST', body: { query: gridQuery } })
    .then((r: { result?: unknown }) => r?.result ?? null)
    .catch(() => null),
)

const items = computed<FormalItem[]>(() => {
  if (Array.isArray(gridData.value) && gridData.value.length) {
    return gridData.value as FormalItem[]
  }
  return DEMO_PRODUCTS
})

const typeFilters = PRODUCT_TYPE_FILTERS
const materialFilters = PRODUCT_MATERIAL_FILTERS
const colourFilters = PRODUCT_COLOUR_FILTERS
const activeType = ref<string>('')
const activeMaterials = ref<string[]>([])
const activeColours = ref<string[]>([])

const gridSizes = [3, 4, 5]
const columns = ref(4)

const openDropdown = ref<'material' | 'colour' | null>(null)
const materialDropdown = ref<HTMLElement | null>(null)
const colourDropdown = ref<HTMLElement | null>(null)

const toggleDropdown = (name: 'material' | 'colour') => {
  openDropdown.value = openDropdown.value === name ? null : name
}

const onDocumentClick = (event: MouseEvent) => {
  const target = event.target as Node
  if (
    materialDropdown.value?.contains(target) ||
    colourDropdown.value?.contains(target)
  ) {
    return
  }
  openDropdown.value = null
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))

const activeFilters = {
  material: activeMaterials,
  colour: activeColours,
} as const

const toggle = (kind: keyof typeof activeFilters, value: string) => {
  const list = activeFilters[kind]
  list.value = list.value.includes(value)
    ? list.value.filter((v) => v !== value)
    : [...list.value, value]
}

const filteredItems = computed(() =>
  items.value.filter((item) => {
    const typeMatch = !activeType.value || activeType.value === item.type
    const materialMatch =
      !activeMaterials.value.length ||
      (item.materials || []).some((m) => activeMaterials.value.includes(m))
    const colourMatch =
      !activeColours.value.length ||
      (item.colours || []).some((c) => activeColours.value.includes(c))
    return typeMatch && materialMatch && colourMatch
  }),
)

useHead(() => ({
  title: 'Products — Studio Based Upon',
}))
</script>

<style scoped>
.products {
  padding-bottom: 5rem;
}

.products__header {
  padding-bottom: 1rem;
}

.products__intro {
  max-width: 34rem;
  font-size: var(--text-lg);
  color: var(--muted);
}

.products__controls {
  position: sticky;
  top: var(--header-height);
  z-index: 50;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem var(--gutter);
}

.products__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1.5rem;
}

.type-chip {
  font-size: var(--text-sm);
  color: var(--charcoal);
  opacity: 0.3;
  transition: opacity 0.2s ease;
}

.type-chip:hover {
  opacity: 1;
}

.type-chip--active {
  opacity: 1;
}

.products__tools {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.filter-dropdown {
  position: relative;
}

.filter-dropdown__toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: var(--text-sm);
  color: var(--muted);
  transition: color 0.2s ease;
}

.filter-dropdown__toggle:hover,
.filter-dropdown__toggle--active {
  color: var(--charcoal);
}

.filter-dropdown__count {
  display: inline-grid;
  place-items: center;
  min-width: 1.15rem;
  height: 1.15rem;
  padding: 0 0.3rem;
  font-size: var(--text-xs);
  color: var(--warm-white);
  background: var(--charcoal);
  border-radius: 999px;
}

.filter-dropdown__caret {
  font-size: 1rem;
  line-height: 1;
  color: var(--muted);
}

.filter-dropdown__menu {
  position: absolute;
  top: calc(100% + 0.75rem);
  right: 0;
  z-index: 60;
  min-width: 11rem;
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
  background: var(--warm-white);
  border: 1px solid var(--grid-line);
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
}

.filter-dropdown__option {
  text-align: left;
  padding: 0.5rem 0.6rem;
  font-size: var(--text-sm);
  color: var(--muted);
  border-radius: 8px;
  transition: color 0.2s ease, background 0.2s ease;
}

.filter-dropdown__option:hover {
  color: var(--charcoal);
  background: var(--cream);
}

.filter-dropdown__option--active {
  color: var(--charcoal);
  background: var(--cream);
}

.filter-dropdown__option--active::after {
  content: '✓';
  float: right;
}

.products__grid-size {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.grid-size-btn {
  display: grid;
  place-items: center;
  padding: 0.25rem;
}

.grid-size-btn__icon {
  display: grid;
  grid-template-columns: repeat(var(--dots), 1fr);
  grid-auto-rows: 1fr;
  gap: 2px;
  width: 1.1rem;
  aspect-ratio: 1;
}

.grid-size-btn__icon span {
  aspect-ratio: 1;
  background: var(--muted);
  transition: background 0.2s ease;
}

.grid-size-btn:hover .grid-size-btn__icon span {
  background: var(--charcoal);
}

.grid-size-btn--active .grid-size-btn__icon span {
  background: var(--charcoal);
}

.products__grid-wrap {
  padding-top: 1.5rem;
}

.products__count {
  padding: 0 var(--gutter);
  margin: 0 0 1rem;
  font-size: var(--text-sm);
  color: var(--muted);
}

.products__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  column-gap: 2rem;
  row-gap: 3rem;
  padding: 1rem var(--gutter) 0;
}

.products__empty {
  padding: 2rem var(--gutter);
  color: var(--muted);
}

@media (min-width: 768px) {
  .products__grid {
    grid-template-columns: repeat(var(--columns), 1fr);
    column-gap: 8rem;
    row-gap: 9rem;
  }
}

@media (max-width: 767px) {
  .products__grid-size {
    display: none;
  }
}
</style>
