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

        <div ref="facetsEl" class="products__facets">
          <div v-for="facet in facets" :key="facet.id" class="filter-dropdown">
            <button
              type="button"
              class="filter-dropdown__toggle"
              :class="{ 'filter-dropdown__toggle--active': facet.active.length }"
              :aria-expanded="openDropdown === facet.id"
              @click="toggleDropdown(facet.id)"
            >
              {{ facet.label }}<span
                v-if="facet.mode === 'single' && facet.active.length"
                class="filter-dropdown__value"
              >{{ activeOptionLabel(facet) }}</span>
              <span
                v-else-if="facet.active.length"
                class="filter-dropdown__count"
              >{{ facet.active.length }}</span>
              <span class="filter-dropdown__caret" aria-hidden="true">{{ openDropdown === facet.id ? '−' : '+' }}</span>
            </button>
            <div
              v-if="openDropdown === facet.id"
              class="filter-dropdown__menu"
              :role="facet.mode === 'single' ? 'radiogroup' : undefined"
              :aria-label="facet.label"
            >
              <button
                v-if="facet.mode === 'single' && facet.options.length"
                type="button"
                role="radio"
                :aria-checked="!facet.active.length"
                class="filter-dropdown__option filter-dropdown__option--radio"
                :class="{ 'filter-dropdown__option--active': !facet.active.length }"
                @click="clearFacet(facet.id)"
              >
                <span class="filter-dropdown__radio" aria-hidden="true" />
                All
              </button>
              <button
                v-for="option in facet.options"
                :key="option.value"
                type="button"
                :role="facet.mode === 'single' ? 'radio' : 'menuitemcheckbox'"
                :aria-checked="facet.active.includes(option.value)"
                class="filter-dropdown__option"
                :class="{
                  'filter-dropdown__option--active': facet.active.includes(option.value),
                  'filter-dropdown__option--radio': facet.mode === 'single',
                }"
                @click="toggle(facet.id, option.value)"
              >
                <span
                  v-if="facet.mode === 'single'"
                  class="filter-dropdown__radio"
                  aria-hidden="true"
                />
                {{ option.label }}
              </button>
              <p v-if="!facet.options.length" class="filter-dropdown__empty">
                Nothing tagged yet
              </p>
            </div>
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
          'products__grid--wide': columns === 10,
          'products__grid--dense': columns === 6 || columns === 10,
        }"
        :style="{ '--columns': columns }"
      >
        <template v-for="row in displayRows" :key="row.key">
          <div
            v-if="row.empty"
            class="products__spacer"
            :class="{ 'is-filtered-out': visibilitySeeded && !visibleIds.has(row.item._id) }"
            :style="thumbStyle(row.key)"
            :data-flip-id="row.key"
            aria-hidden="true"
          />
          <ProductCard
            v-else
            :class="{ 'is-filtered-out': visibilitySeeded && !visibleIds.has(row.item._id) }"
            :item="row.item"
            :image-url="cardImage(row.item)"
            :order-label="orderLabel(row.item._id)"
            :forced-image-index="row.forcedImageIndex"
            :lock-image="row.lockImage"
            :expand-on-click="EXPAND_GALLERY_ON_CLICK && !row.lockImage"
            :style="thumbStyle(row.key)"
            :data-flip-id="row.key"
            @expand="expandGallery(row.item._id)"
          />
        </template>
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
  libraryFilterKey,
  parseLibraryFilterKey,
  type FormalItem,
} from '~/composables/demoData'
import { uniqueImageUrls } from '~/composables/productImages'
import type { LibraryItem } from '~/composables/useLibraryCatalog'
import { IMAGE_WIDTH } from '~/composables/useSanityImage'

/**
 * TEMP: first click fans gallery images into the grid; those tiles open the PDP.
 * Set to `false` to restore open-PDP-on-click + thumbnail arrows.
 */
const EXPAND_GALLERY_ON_CLICK = false

type GridRow = {
  key: string
  item: LibraryItem
  /** Locked gallery frame when expanded; null = normal card behaviour. */
  forcedImageIndex: number | null
  lockImage: boolean
  /** Blank spacer after an expanded gallery. */
  empty?: boolean
}

type FacetId = 'series' | 'feature' | 'materiality' | 'colour'

type FacetView = {
  id: FacetId
  label: string
  mode: 'single' | 'multi'
  options: { value: string; label: string }[]
  active: string[]
}

type LibraryPrefs = {
  filter: string
  series: string[]
  feature: string[]
  materiality: string[]
  colours: string[]
  search: string
  columns: number
}

const { items } = await useLibraryCatalog()
const { imageUrl } = useSanityImage()
const { libraryFilters: pageFilters } = useSiteSettings()

/** Product ids whose galleries have been fanned into the grid. */
const expandedIds = ref<Set<string>>(new Set())

const galleryImageCount = (item: LibraryItem) => {
  const urls = uniqueImageUrls(
    imageUrl(item.image, IMAGE_WIDTH.thumb),
    ...(item.gallery || []).map((asset) =>
      asset ? imageUrl(asset, IMAGE_WIDTH.thumb) : '',
    ),
  )
  return urls.length
}

const displayRows = computed<GridRow[]>(() => {
  const rows: GridRow[] = []
  for (const item of items.value as LibraryItem[]) {
    const count = galleryImageCount(item)
    if (EXPAND_GALLERY_ON_CLICK && expandedIds.value.has(item._id) && count > 1) {
      for (let index = 0; index < count; index++) {
        rows.push({
          key: `${item._id}::${index}`,
          item,
          forcedImageIndex: index,
          lockImage: true,
        })
      }
      rows.push({
        key: `${item._id}::spacer`,
        item,
        forcedImageIndex: null,
        lockImage: true,
        empty: true,
      })
      continue
    }
    rows.push({
      key: item._id,
      item,
      forcedImageIndex: null,
      lockImage: false,
    })
  }
  return rows
})

const expandGallery = (productId: string) => {
  if (!EXPAND_GALLERY_ON_CLICK) return
  if (expandedIds.value.has(productId)) return
  expandedIds.value = new Set([...expandedIds.value, productId])
}

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
const pageDescription = computed(() => {
  const subtitle = (pageData.value as { heroSubtitle?: string } | null)?.heroSubtitle
  return typeof subtitle === 'string' ? subtitle.trim() : ''
})

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

const cardImage = (item: FormalItem) => imageUrl(item.image, IMAGE_WIDTH.thumb)
const filterKey = libraryFilterKey

/** Column counts — Wide ≈ Codrops demo 75% (10 cols). */
const gridSizes = [
  { columns: 2, label: '2', ariaLabel: 'Show 2 columns' },
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
    series: [],
    feature: [],
    materiality: [],
    colours: [],
    search: '',
    columns: 3,
  }),
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
})

const activeFilter = ref(prefs.value.filter || '')
// Series is single-select; clamp in case an older cookie stored several.
const activeSeries = ref<string[]>((prefs.value.series || []).slice(0, 1))
const activeFeatures = ref<string[]>([...(prefs.value.feature || [])])
const activeMateriality = ref<string[]>([...(prefs.value.materiality || [])])
const activeColours = ref<string[]>([...(prefs.value.colours || [])])
const searchQuery = ref(prefs.value.search || '')
/** Applied to the grid after typing pauses */
const debouncedSearchQuery = ref(searchQuery.value)
const SEARCH_DEBOUNCE_MS = 350
const columns = ref(
  allowedColumns.includes(prefs.value.columns as (typeof allowedColumns)[number])
    ? prefs.value.columns
    : 5,
)
const gridEl = ref<HTMLElement | null>(null)
const gridAnimating = ref(false)

type ThumbSize = { w: number; h: number }
const gridWidth = ref(0)
const thumbSizes = ref<Record<string, ThumbSize>>({})

const readCardGap = () => {
  if (!import.meta.client || !gridEl.value) return 5
  const raw =
    getComputedStyle(gridEl.value).columnGap ||
    getComputedStyle(gridEl.value).gap ||
    '5'
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : 5
}

/** Justified rows: shared row height, widths from image aspect (like discovery proportions). */
const packThumbs = () => {
  if (!import.meta.client) return
  const width = gridWidth.value
  if (width <= 0) return

  const gap = readCardGap()
  const cols = window.matchMedia('(max-width: 767px)').matches ? 2 : columns.value
  const targetH = Math.max(72, (width - gap * Math.max(0, cols - 1)) / cols)

  const visible = displayRows.value.filter(
    (row) => !visibilitySeeded.value || visibleIds.value.has(row.item._id),
  )
  const aspects = visible.map((row) => {
    if (row.empty) return 1
    const ar = row.item.aspectRatio || 1
    return Math.min(2.6, Math.max(0.4, ar))
  })

  const next: Record<string, ThumbSize> = {}
  let rowStart = 0
  let rowNat = 0

  const flush = (end: number, stretch: boolean) => {
    const count = end - rowStart
    if (count <= 0) return
    const gaps = (count - 1) * gap
    let natural = 0
    for (let i = rowStart; i < end; i++) natural += aspects[i]! * targetH
    const h =
      stretch && natural > 0
        ? Math.max(56, ((width - gaps) / natural) * targetH)
        : targetH
    for (let i = rowStart; i < end; i++) {
      next[visible[i]!.key] = { w: h * aspects[i]!, h }
    }
  }

  for (let i = 0; i < visible.length; i++) {
    const w = aspects[i]! * targetH
    const nextW = rowNat === 0 ? w : rowNat + gap + w
    if (rowNat > 0 && nextW > width + 0.5) {
      flush(i, true)
      rowStart = i
      rowNat = w
    } else {
      rowNat = nextW
    }
  }
  flush(visible.length, false)

  for (const row of displayRows.value) {
    if (!next[row.key]) next[row.key] = { w: targetH, h: targetH }
  }
  thumbSizes.value = next
}

const thumbStyle = (key: string) => {
  const size = thumbSizes.value[key]
  if (!size) return undefined
  return {
    '--thumb-w': `${size.w}px`,
    '--thumb-h': `${size.h}px`,
  }
}

type FlipMode = 'default' | 'stagger'
const flipModes = [
  { id: 'default' as const, label: 'Default' },
  { id: 'stagger' as const, label: 'Stagger' },
]
const flipMode = ref<FlipMode>('default')
const visibleIds = ref<Set<string>>(new Set())
/** Distinguishes "no matches" from "not yet computed" — an empty set means both. */
const visibilitySeeded = ref(false)
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

  const FADE_OUT = 0.4
  const FADE_IN = 0.8
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
      ease: 'power4.in',
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
  [
    activeFilter,
    activeSeries,
    activeFeatures,
    activeMateriality,
    activeColours,
    searchQuery,
    columns,
  ],
  () => {
    prefs.value = {
      filter: activeFilter.value,
      series: [...activeSeries.value],
      feature: [...activeFeatures.value],
      materiality: [...activeMateriality.value],
      colours: [...activeColours.value],
      search: searchQuery.value,
      columns: columns.value,
    }
  },
  { deep: true },
)

const gridRevealed = ref(false)
let revealTimer: ReturnType<typeof setTimeout> | null = null
let gridResizeObserver: ResizeObserver | null = null

const openDropdown = ref<FacetId | null>(null)
const facetsEl = ref<HTMLElement | null>(null)

const toggleDropdown = (id: FacetId) => {
  openDropdown.value = openDropdown.value === id ? null : id
}

const onDocumentClick = (event: MouseEvent) => {
  if (facetsEl.value?.contains(event.target as Node)) return
  openDropdown.value = null
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  seedVisibility()
  // Allow one frame so initial filter state paints without a Flip.
  requestAnimationFrame(() => {
    filterTransitionsReady = true
  })
  revealTimer = setTimeout(() => {
    gridRevealed.value = true
  }, 1000)

  if (gridEl.value) {
    gridWidth.value = gridEl.value.clientWidth
    packThumbs()
    gridResizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      const w = entry?.contentRect.width ?? gridEl.value?.clientWidth ?? 0
      if (Math.abs(w - gridWidth.value) < 0.5) return
      gridWidth.value = w
      packThumbs()
    })
    gridResizeObserver.observe(gridEl.value)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  gridResizeObserver?.disconnect()
  gridResizeObserver = null
  if (revealTimer) clearTimeout(revealTimer)
  if (searchFlipTimer) clearTimeout(searchFlipTimer)
  if (import.meta.client && gridEl.value) {
    Flip.killFlipsOf(gridEl.value.querySelectorAll('.product-card'))
  }
})

watch(
  [columns, visibleIds, displayRows, visibilitySeeded],
  () => {
    packThumbs()
  },
  { deep: true },
)

const activeFacets = {
  series: activeSeries,
  feature: activeFeatures,
  materiality: activeMateriality,
  colour: activeColours,
} as const

/** Values on an item that a given facet filters against. */
const facetValues = (item: FormalItem, id: FacetId): string[] => {
  if (id === 'series') return item.series ? [item.series] : []
  if (id === 'feature') return item.feature ? [item.feature] : []
  if (id === 'materiality') return item.materials || []
  return item.colours || []
}

/** Sanity taxonomy titles arrive display-ready; demo/legacy slugs need casing. */
const optionLabel = (value: string) =>
  value === value.toLowerCase()
    ? value.replace(/\b[a-z]/g, (char) => char.toUpperCase())
    : value

const facetOptions = (id: FacetId) => {
  const labels = new Map<string, string>()
  for (const item of items.value) {
    for (const value of facetValues(item, id)) {
      const trimmed = String(value || '').trim()
      if (trimmed && !labels.has(trimmed)) labels.set(trimmed, optionLabel(trimmed))
    }
  }
  return [...labels.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

const seriesOptions = computed(() => facetOptions('series'))
const featureOptions = computed(() => facetOptions('feature'))
const materialityOptions = computed(() => facetOptions('materiality'))
const colourOptions = computed(() => facetOptions('colour'))

const facets = computed<FacetView[]>(() => [
  {
    id: 'series' as const,
    label: 'Series',
    mode: 'single' as const,
    options: seriesOptions.value,
    active: activeSeries.value,
  },
  {
    id: 'feature' as const,
    label: 'Feature',
    mode: 'multi' as const,
    options: featureOptions.value,
    active: activeFeatures.value,
  },
  {
    id: 'materiality' as const,
    label: 'Materiality',
    mode: 'multi' as const,
    options: materialityOptions.value,
    active: activeMateriality.value,
  },
  {
    id: 'colour' as const,
    label: 'Colour',
    mode: 'multi' as const,
    options: colourOptions.value,
    active: activeColours.value,
  },
])

/** Single-select facets hold at most one value; the array shape stays uniform. */
const SINGLE_SELECT_FACETS = new Set<FacetId>(['series'])

const activeOptionLabel = (facet: FacetView) =>
  facet.options.find((option) => option.value === facet.active[0])?.label ||
  facet.active[0] ||
  ''

const toggle = (id: FacetId, value: string) => {
  const list = activeFacets[id]
  if (SINGLE_SELECT_FACETS.has(id)) {
    list.value = list.value[0] === value ? [] : [value]
    openDropdown.value = null
    return
  }
  list.value = list.value.includes(value)
    ? list.value.filter((v) => v !== value)
    : [...list.value, value]
}

const clearFacet = (id: FacetId) => {
  activeFacets[id].value = []
  openDropdown.value = null
}

const matchesFacet = (item: FormalItem, id: FacetId) => {
  const selected = activeFacets[id].value
  if (!selected.length) return true
  return facetValues(item, id).some((value) => selected.includes(value))
}

const matchesType = (item: FormalItem, type: string) => {
  if (item.type === type) return true
  return (item.categories || []).some(
    (c) => c.toLowerCase().replace(/[^a-z]/g, '') === type,
  )
}

/** Spirit / Origin stay on their own chips — omit from All. */
const ALL_EXCLUDED_TYPES = ['spirit', 'origin'] as const

const slugish = (value: string) =>
  String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const matchesMaterialityFilter = (item: FormalItem, value: string) => {
  const target = slugish(value)
  const targetLower = String(value || '').toLowerCase()
  return (item.materials || []).some((material) => {
    const title = String(material || '')
    return slugish(title) === target || title.toLowerCase() === targetLower
  })
}

const matchesPageFilter = (item: FormalItem, key: string) => {
  if (!key) {
    return !ALL_EXCLUDED_TYPES.some((type) => matchesType(item, type))
  }
  const parsed = parseLibraryFilterKey(key)
  if (!parsed) return true
  if (parsed.kind === 'type') return matchesType(item, parsed.value)
  if (parsed.kind === 'materiality') return matchesMaterialityFilter(item, parsed.value)
  return (item.tags || []).includes(parsed.value)
}

const filteredItems = computed(() => {
  const query = debouncedSearchQuery.value.trim().toLowerCase()

  return items.value.filter((item) => {
    const pageMatch = matchesPageFilter(item, activeFilter.value)
    const facetMatch =
      matchesFacet(item, 'series') &&
      matchesFacet(item, 'feature') &&
      matchesFacet(item, 'materiality') &&
      matchesFacet(item, 'colour')
    const searchMatch =
      !query ||
      item.title.toLowerCase().includes(query) ||
      (item.category || '').toLowerCase().includes(query) ||
      (item.type || '').toLowerCase().includes(query) ||
      (item.series || '').toLowerCase().includes(query) ||
      (item.feature || '').toLowerCase().includes(query) ||
      (item.tags || []).some((t) => t.toLowerCase().includes(query)) ||
      (item.materials || []).some((m) => m.toLowerCase().includes(query)) ||
      (item.colours || []).some((c) => c.toLowerCase().includes(query))
    return pageMatch && facetMatch && searchMatch
  })
})

const filteredIdSet = computed(
  () => new Set(filteredItems.value.map((item) => item._id)),
)

const seedVisibility = () => {
  visibleIds.value = new Set(filteredItems.value.map((item) => item._id))
  visibilitySeeded.value = true
}

// Seed visibility before first paint so SSR markup already reflects saved filters.
seedVisibility()

watch(
  [
    activeFilter,
    activeSeries,
    activeFeatures,
    activeMateriality,
    activeColours,
    debouncedSearchQuery,
  ],
  () => {
    // Collapse expansions so Flip filter transitions still key off product ids.
    if (expandedIds.value.size) expandedIds.value = new Set()
    void transitionFilter(filteredIdSet.value)
  },
  { deep: true },
)

watch(searchQuery, (value) => {
  if (searchFlipTimer) clearTimeout(searchFlipTimer)
  searchFlipTimer = setTimeout(() => {
    debouncedSearchQuery.value = value
  }, SEARCH_DEBOUNCE_MS)
})

watch(
  items,
  () => {
    if (!filterTransitionsReady) seedVisibility()
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
  padding-bottom: 0rem;
  max-width: none;
}

.products__intro {
  max-width: 34rem;
  font-size: var(--text-base);
  color: var(--muted);
}

.products__controls {
  position: sticky;
  top: calc(var(--header-height) + 2.5vw);
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
  align-items: start;
  gap: 0.5rem 1.5rem;
  flex-direction: column;
  text-align: left;
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
  flex-wrap: wrap;
  align-items: center;
  gap: 1.5rem;
}

.products__facets {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1.5rem;
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

.filter-dropdown__value {
  max-width: 8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--charcoal);
}

.filter-dropdown__menu {
  position: absolute;
  top: calc(100% + 0.75rem);
  right: 0;
  z-index: 60;
  min-width: 11rem;
  max-height: 18rem;
  overflow-y: auto;
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

.filter-dropdown__option--radio {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-dropdown__option--radio::after {
  content: none;
}

.filter-dropdown__radio {
  position: relative;
  flex-shrink: 0;
  width: 0.7rem;
  height: 0.7rem;
  border: 1px solid currentColor;
  border-radius: 50%;
  opacity: 0.6;
}

.filter-dropdown__option--radio.filter-dropdown__option--active .filter-dropdown__radio {
  opacity: 1;
}

.filter-dropdown__option--radio.filter-dropdown__option--active
  .filter-dropdown__radio::after {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  background: currentColor;
}

.filter-dropdown__empty {
  margin: 0;
  padding: 0.5rem 0.6rem;
  font-size: var(--text-sm);
  color: var(--muted);
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
  display: none;
}

.products__grid {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--card-gap);
  margin: 0 var(--gutter);
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

.products__spacer {
  width: var(--thumb-w, 100px);
  height: var(--thumb-h, 100px);
  flex: 0 0 auto;
  min-width: 0;
  pointer-events: none;
}

.products__spacer.is-filtered-out {
  display: none !important;
}

.products__grid--dense :deep(.product-card__type) {
  display: none;
}

.products__empty {
  padding: 2rem var(--gutter);
  color: var(--muted);
}

@media (max-width: 767px) {
  .products__grid-size,
  .products__flip-mode {
    display: none;
  }
}
</style>
