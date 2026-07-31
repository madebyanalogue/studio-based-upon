<template>
  <div class="products">
    <section class="products__header section">
      <h4 class="page-title">{{ pageTitle }}</h4>
      <p v-if="pageDescription" class="products__intro">{{ pageDescription }}</p>
    </section>

    <div class="products__controls">
      <div class="products__filters interface" role="group" aria-label="Filter by type or tag">
        <button
          type="button"
          class="type-chip"
          :class="{ 'type-chip--active': activeFilter === '' }"
          @click="activeFilter = ''"
        >
          All
        </button>
        <button
          v-for="filter in pageFilters"
          :key="filterKey(filter)"
          type="button"
          class="type-chip"
          :class="{ 'type-chip--active': activeFilter === filterKey(filter) }"
          @click="activeFilter = filterKey(filter)"
        >
          {{ filter.label }}
        </button>
      </div>

      <div class="products__tools">
        <label class="products__search">
          <span class="products__search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </span>
          <input
            v-model="searchQuery"
            type="search"
            class="products__search-input"
            placeholder="Search"
            aria-label="Search materials and forms"
          />
        </label>

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
            :key="size.columns"
            type="button"
            class="grid-size-btn interface"
            :class="{ 'grid-size-btn--active': columns === size.columns }"
            :aria-pressed="columns === size.columns"
            :aria-label="size.ariaLabel"
            :disabled="gridAnimating"
            @click="setColumns(size.columns)"
          >
            {{ size.label }}
          </button>
        </div>

        <div class="products__flip-mode" role="group" aria-label="Grid transition style">
          <button
            v-for="mode in flipModes"
            :key="mode.id"
            type="button"
            class="flip-mode-btn interface"
            :class="{ 'flip-mode-btn--active': flipMode === mode.id }"
            :aria-pressed="flipMode === mode.id"
            :disabled="gridAnimating"
            @click="flipMode = mode.id"
          >
            {{ mode.label }}
          </button>
        </div>
      </div>
    </div>

    <section class="products__grid-wrap section section--wide">
      <p class="products__count">{{ visibleCount }} items</p>
      <div
        ref="gridEl"
        class="products__grid"
        :class="{
          'products__grid--revealed': gridRevealed,
          'products__grid--animating': gridAnimating,
        }"
        :style="{ '--columns': columns }"
      >
        <ProductCard
          v-for="item in items"
          :key="item._id"
          :class="{ 'is-filtered-out': visibleIds.size > 0 && !visibleIds.has(item._id) }"
          :item="item"
          :image-url="cardImage(item)"
          :order-label="orderLabel(item._id)"
          :data-flip-id="item._id"
        />
      </div>
      <p v-if="!visibleCount" class="products__empty">
        No items match those filters.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import {
  PRODUCT_MATERIAL_FILTERS,
  PRODUCT_COLOUR_FILTERS,
  libraryFilterKey,
  parseLibraryFilterKey,
  type FormalItem,
} from '~/composables/demoData'

type LibraryPrefs = {
  filter: string
  materials: string[]
  colours: string[]
  search: string
  columns: number
}

const { items } = await useLibraryCatalog()
const { imageUrl } = useSanityImage()
const { libraryFilters: pageFilters } = useSiteSettings()

const pageQuery = `*[_type == "materialsAndFormsPage"][0] {
  seoTitle,
  seoDescription,
  heroTitle,
  heroSubtitle
}`

const { data: pageData } = await useAsyncData('materialsAndFormsPage', () =>
  $fetch('/api/sanity/query', { method: 'POST', body: { query: pageQuery } })
    .then((r: { result?: unknown }) => r?.result ?? null)
    .catch(() => null),
)

const pageTitle = computed(
  () =>
    (pageData.value as { heroTitle?: string } | null)?.heroTitle ||
    'Materials & Forms',
)
const pageDescription = computed(
  () =>
    (pageData.value as { heroSubtitle?: string } | null)?.heroSubtitle ||
    'A library of forms, materials, colour, elements of origin, series and spirit imagery, filtered by category. Heart pieces into your selection.',
)

useHead(() => {
  const page = pageData.value as
    | { seoTitle?: string; seoDescription?: string }
    | null
  return {
    title: page?.seoTitle || pageTitle.value,
    meta: page?.seoDescription
      ? [{ name: 'description', content: page.seoDescription }]
      : [],
  }
})

const cardImage = (item: FormalItem) => imageUrl(item.image, 900)
const filterKey = libraryFilterKey

const materialFilters = PRODUCT_MATERIAL_FILTERS
const colourFilters = PRODUCT_COLOUR_FILTERS
/** Column counts — Wide ≈ Codrops demo 75% (10 cols). */
const gridSizes = [
  { columns: 3, label: '3', ariaLabel: 'Show 3 columns' },
  { columns: 4, label: '4', ariaLabel: 'Show 4 columns' },
  { columns: 5, label: '5', ariaLabel: 'Show 5 columns' },
  { columns: 6, label: '6', ariaLabel: 'Show 6 columns' },
  { columns: 10, label: 'Wide', ariaLabel: 'Wide grid, 10 columns' },
] as const
const allowedColumns = gridSizes.map((s) => s.columns)

const prefs = useCookie<LibraryPrefs>('sba-maf-prefs', {
  default: () => ({
    filter: '',
    materials: [],
    colours: [],
    search: '',
    columns: 4,
  }),
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
})

const activeFilter = ref(prefs.value.filter || '')
const activeMaterials = ref<string[]>([...(prefs.value.materials || [])])
const activeColours = ref<string[]>([...(prefs.value.colours || [])])
const searchQuery = ref(prefs.value.search || '')
const columns = ref(
  allowedColumns.includes(prefs.value.columns as (typeof allowedColumns)[number])
    ? prefs.value.columns
    : 4,
)
const gridEl = ref<HTMLElement | null>(null)
const gridAnimating = ref(false)

type FlipMode = 'default' | 'stagger'
const flipModes = [
  { id: 'default' as const, label: 'Default' },
  { id: 'stagger' as const, label: 'Stagger' },
]
const flipMode = ref<FlipMode>('default')
const visibleIds = ref<Set<string>>(new Set())
const visibleCount = computed(() => visibleIds.value.size)
let filterTransitionsReady = false
let searchFlipTimer: ReturnType<typeof setTimeout> | null = null

const flipStagger = () =>
  flipMode.value === 'stagger'
    ? { amount: 0.3, from: 'random' as const }
    : undefined

const gridCards = () =>
  gridEl.value?.querySelectorAll<HTMLElement>('.product-card') ?? []

const visibleGridCards = () =>
  gridEl.value?.querySelectorAll<HTMLElement>('.product-card:not(.is-filtered-out)') ??
  []

const setColumns = async (size: number) => {
  if (!import.meta.client || gridAnimating.value || size === columns.value) return

  // Mobile layout ignores --columns — skip Flip.
  if (window.matchMedia('(max-width: 767px)').matches) {
    columns.value = size
    return
  }

  const cards = visibleGridCards()
  if (!cards.length) {
    columns.value = size
    return
  }

  gridAnimating.value = true
  const state = Flip.getState(cards)
  columns.value = size
  await nextTick()

  if (flipMode.value === 'stagger') {
    Flip.from(state, {
      absolute: true,
      duration: 1,
      ease: 'expo.inOut',
      stagger: flipStagger(),
      onComplete: () => {
        gridAnimating.value = false
      },
    })
    return
  }

  Flip.from(state, {
    duration: 0.8,
    ease: 'expo.inOut',
    onComplete: () => {
      gridAnimating.value = false
    },
  })
}

const transitionFilter = async (nextIds: Set<string>) => {
  if (!import.meta.client || !filterTransitionsReady) {
    visibleIds.value = nextIds
    return
  }

  const same =
    nextIds.size === visibleIds.value.size &&
    [...nextIds].every((id) => visibleIds.value.has(id))
  if (same) return

  if (gridAnimating.value) {
    visibleIds.value = nextIds
    return
  }

  if (!gridEl.value || window.matchMedia('(max-width: 767px)').matches) {
    visibleIds.value = nextIds
    return
  }

  const prevIds = visibleIds.value
  const leavingIds = [...prevIds].filter((id) => !nextIds.has(id))
  const enteringIds = [...nextIds].filter((id) => !prevIds.has(id))
  const cardById = (id: string) =>
    gridEl.value?.querySelector<HTMLElement>(
      `.product-card[data-flip-id="${CSS.escape(id)}"]`,
    ) ?? null

  gridAnimating.value = true

  const FADE_OUT = 0.7
  const FADE_IN = 0.85
  const BEAT = 120

  // 1) Obvious fade-out for items leaving the filter.
  const leavingEls = leavingIds.map(cardById).filter(Boolean) as HTMLElement[]
  if (leavingEls.length) {
    await gsap.to(leavingEls, {
      autoAlpha: 0,
      duration: FADE_OUT,
      ease: 'power2.out',
    })
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, BEAT)
    })
  }

  // 2) Hide entrants before they re-enter the flow so they never flash opaque.
  const enteringEls = enteringIds.map(cardById).filter(Boolean) as HTMLElement[]
  if (enteringEls.length) gsap.set(enteringEls, { autoAlpha: 0 })

  // Capture positions of items that stay, then apply the new visibility set.
  const stayingEls = [...prevIds]
    .filter((id) => nextIds.has(id))
    .map(cardById)
    .filter(Boolean) as HTMLElement[]

  const state = Flip.getState(stayingEls.length ? stayingEls : gridCards())
  visibleIds.value = nextIds
  await nextTick()

  // Re-assert after display:none is cleared — first paint must stay invisible.
  if (enteringEls.length) gsap.set(enteringEls, { autoAlpha: 0 })

  // Clear leftover visibility on leavers for a clean later re-entry.
  for (const id of leavingIds) {
    const el = cardById(id)
    if (el) gsap.set(el, { clearProps: 'opacity,visibility' })
  }

  const finish = () => {
    gridAnimating.value = false
  }

  const afterRearrange = async () => {
    if (!enteringEls.length) {
      finish()
      return
    }

    // Same beat as after fade-out, then a softer mirrored fade-in.
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, BEAT)
    })

    gsap.to(enteringEls, {
      autoAlpha: 1,
      duration: FADE_IN,
      ease: 'power2.inOut',
      onComplete: () => {
        gsap.set(enteringEls, { clearProps: 'opacity,visibility' })
        finish()
      },
    })
  }

  if (!stayingEls.length) {
    // Nothing to rearrange — just reveal entrants.
    void afterRearrange()
    return
  }

  Flip.from(state, {
    absolute: true,
    duration: flipMode.value === 'stagger' ? 1 : 0.75,
    ease: 'expo.inOut',
    stagger: flipStagger(),
    onComplete: () => {
      void afterRearrange()
    },
  })
}

watch(
  [activeFilter, activeMaterials, activeColours, searchQuery, columns],
  () => {
    prefs.value = {
      filter: activeFilter.value,
      materials: [...activeMaterials.value],
      colours: [...activeColours.value],
      search: searchQuery.value,
      columns: columns.value,
    }
  },
  { deep: true },
)

const gridRevealed = ref(false)
let revealTimer: ReturnType<typeof setTimeout> | null = null

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

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  visibleIds.value = new Set(filteredItems.value.map((item) => item._id))
  // Allow one frame so initial filter state paints without a Flip.
  requestAnimationFrame(() => {
    filterTransitionsReady = true
  })
  revealTimer = setTimeout(() => {
    gridRevealed.value = true
  }, 1000)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  if (revealTimer) clearTimeout(revealTimer)
  if (searchFlipTimer) clearTimeout(searchFlipTimer)
  if (import.meta.client && gridEl.value) {
    Flip.killFlipsOf(gridEl.value.querySelectorAll('.product-card'))
  }
})

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

const matchesType = (item: FormalItem, type: string) => {
  if (item.type === type) return true
  return (item.categories || []).some(
    (c) => c.toLowerCase().replace(/[^a-z]/g, '') === type,
  )
}

const matchesPageFilter = (item: FormalItem, key: string) => {
  if (!key) return true
  const parsed = parseLibraryFilterKey(key)
  if (!parsed) return true
  if (parsed.kind === 'type') return matchesType(item, parsed.value)
  return (item.tags || []).includes(parsed.value)
}

const filteredItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return items.value.filter((item) => {
    const pageMatch = matchesPageFilter(item, activeFilter.value)
    const materialMatch =
      !activeMaterials.value.length ||
      (item.materials || []).some((m) => activeMaterials.value.includes(m))
    const colourMatch =
      !activeColours.value.length ||
      (item.colours || []).some((c) => activeColours.value.includes(c))
    const searchMatch =
      !query ||
      item.title.toLowerCase().includes(query) ||
      (item.category || '').toLowerCase().includes(query) ||
      (item.type || '').toLowerCase().includes(query) ||
      (item.tags || []).some((t) => t.toLowerCase().includes(query)) ||
      (item.materials || []).some((m) => m.toLowerCase().includes(query)) ||
      (item.colours || []).some((c) => c.toLowerCase().includes(query))
    return pageMatch && materialMatch && colourMatch && searchMatch
  })
})

const filteredIdSet = computed(
  () => new Set(filteredItems.value.map((item) => item._id)),
)

// Seed visibility before first paint of client filters.
if (!visibleIds.value.size && filteredItems.value.length) {
  visibleIds.value = new Set(filteredItems.value.map((item) => item._id))
}

watch(
  [activeFilter, activeMaterials, activeColours],
  () => {
    void transitionFilter(filteredIdSet.value)
  },
  { deep: true },
)

watch(searchQuery, () => {
  if (searchFlipTimer) clearTimeout(searchFlipTimer)
  searchFlipTimer = setTimeout(() => {
    void transitionFilter(filteredIdSet.value)
  }, 220)
})

watch(
  items,
  () => {
    if (!filterTransitionsReady) {
      visibleIds.value = new Set(filteredItems.value.map((item) => item._id))
    }
  },
  { deep: true },
)

/** 1-based index in Sanity `order(orderRank)` catalog, with leading zeros. */
const orderById = computed(() => {
  const total = items.value.length
  const digits = Math.max(2, String(total).length)
  const map = new Map<string, string>()
  items.value.forEach((item, index) => {
    map.set(item._id, String(index + 1).padStart(digits, '0'))
  })
  return map
})

const orderLabel = (id: string) => orderById.value.get(id) || ''

useHead(() => ({
  title: 'Materials & Forms — Studio Based Upon',
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
  font-size: var(--text-md);
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
  opacity: 1;
  transition: opacity 0.2s ease;
}

.type-chip:hover {
  opacity: 0.3;
}

.type-chip--active {
  opacity: 0.3;
}

.products__tools {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.products__search {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 9rem;
  max-width: 14rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid var(--ui-border-color);
  color: var(--muted);
  transition: color 0.2s ease, border-color 0.2s ease;
}

.products__search:focus-within {
  color: var(--charcoal);
  border-color: var(--charcoal);
}

.products__search-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.products__search-input {
  width: 100%;
  min-width: 0;
  border: 0;
  background: transparent;
  font-size: var(--text-sm);
  color: var(--charcoal);
  outline: none;
}

.products__search-input::placeholder {
  color: var(--muted);
}

.products__search-input::-webkit-search-cancel-button {
  appearance: none;
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
  border: 1px solid var(--ui-border-color);
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
  gap: 0.15rem;
}

.grid-size-btn {
  display: grid;
  place-items: center;
  min-width: 1.75rem;
  padding: 0.3rem 0.45rem;
  font-size: var(--text-sm);
  color: var(--muted);
  transition: color 0.2s ease;
}

.grid-size-btn:last-child {
  min-width: auto;
  padding-inline: 0.55rem;
}

.grid-size-btn:hover:not(:disabled) {
  color: var(--charcoal);
}

.grid-size-btn--active {
  color: var(--charcoal);
}

.grid-size-btn:disabled {
  cursor: default;
}

.products__flip-mode {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  margin-left: 0.5rem;
  padding-left: 0.75rem;
  border-left: 1px solid var(--ui-border-color);
}

.flip-mode-btn {
  padding: 0.3rem 0.5rem;
  font-size: var(--text-sm);
  color: var(--muted);
  transition: color 0.2s ease;
}

.flip-mode-btn:hover:not(:disabled) {
  color: var(--charcoal);
}

.flip-mode-btn--active {
  color: var(--charcoal);
}

.flip-mode-btn:disabled {
  cursor: default;
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
  gap: 0;
  margin: 0 calc(var(--gutter) - var(--card-pad));
  opacity: 0;
  transition: opacity 0.85s ease;
}

.products__grid--revealed {
  opacity: 1;
}

.products__grid--animating {
  pointer-events: none;
}

.products__grid :deep(.product-card.is-filtered-out) {
  display: none !important;
}

.products__empty {
  padding: 2rem var(--gutter);
  color: var(--muted);
}

@media (min-width: 768px) {
  .products__grid {
    grid-template-columns: repeat(var(--columns), 1fr);
  }
}

@media (max-width: 767px) {
  .products__grid-size,
  .products__flip-mode {
    display: none;
  }
}
</style>
