<template>
  <div class="products">
    <section class="products__header section">
      <svg class="products__title-filter" viewBox="0 0 0 0" aria-hidden="true" focusable="false">
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
      <h4
        ref="titleEl"
        class="page-title products__title"
        :class="{ 'products__title--pending': !titlePaintReady }"
        :style="{ filter: titleBaseFilter, WebkitFilter: titleBaseFilter }"
      >
        {{ titleText }}
      </h4>
      <p v-if="pageDescription" class="products__intro">{{ pageDescription }}</p>
    </section>

    <div class="products__filter-tool interface" role="search" aria-label="Filter materials and forms">
      <div
        ref="filtersEl"
        class="products__filters"
        role="group"
        aria-label="Filter by type or tag"
      >
        <svg class="products__filters-svg" aria-hidden="true" focusable="false">
          <defs>
            <filter
              :id="filtersGooId"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
              color-interpolation-filters="sRGB"
            >
              <!-- Gooey only on the sliding indicator as it morphs between chips. -->
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
                result="goo"
              />
            </filter>
          </defs>
        </svg>

        <span
          ref="filterPillEl"
          class="products__filters-pill"
          :style="filterPillStyle"
          aria-hidden="true"
        />

        <div class="products__filters-list">
          <button
            type="button"
            class="type-chip"
            data-filter-chip="all"
            :class="{
              'type-chip--active': activeChipKey === 'all',
              'type-chip--lit': activeChipKey === 'all',
            }"
            @click="selectFilter('')"
          >
            All <span class="type-chip__count">({{ filterCount('') }})</span>
          </button>
          <button
            v-for="filter in pageFilters"
            :key="filterKey(filter)"
            type="button"
            class="type-chip"
            :data-filter-chip="filterKey(filter)"
            :class="{
              'type-chip--active': activeChipKey === filterKey(filter),
              'type-chip--lit': activeChipKey === filterKey(filter),
            }"
            @click="selectFilter(filterKey(filter))"
          >
            {{ filter.label }}
            <span class="type-chip__count">({{ filterCount(filterKey(filter)) }})</span>
          </button>

          <label
            class="products__search type-chip"
            data-filter-chip="__search__"
            :class="{
              'type-chip--active': activeChipKey === '__search__',
              'type-chip--lit': activeChipKey === '__search__',
            }"
          >
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
            <button
              v-if="isSearchUiActive"
              type="button"
              class="products__search-clear"
              aria-label="Clear search"
              @click.prevent="clearSearch"
            >
              <span class="products__search-x" aria-hidden="true">
                <span class="products__search-x-arm" />
                <span class="products__search-x-arm" />
              </span>
            </button>
          </label>
        </div>
      </div>
    </div>

    <section class="products__grid-wrap section section--wide">
      <div
        ref="gridEl"
        class="products__grid"
        :class="{
          'products__grid--revealed': gridRevealed,
          'products__grid--animating': gridAnimating,
        }"
      >
        <template v-for="(row, rowIndex) in displayRows" :key="row.slotKey">
          <div
            v-if="row.empty"
            class="products__spacer"
            :class="[
              archiveMeta(row.item, rowIndex).className,
              { 'is-filtered-out': visibilitySeeded && !visibleIds.has(row.item._id) },
            ]"
            :style="archiveMeta(row.item, rowIndex).style"
            :data-flip-id="row.item._id"
            aria-hidden="true"
          />
          <ProductCard
            v-else
            :class="[
              archiveMeta(row.item, rowIndex).className,
              { 'is-filtered-out': visibilitySeeded && !visibleIds.has(row.item._id) },
            ]"
            :item="row.item"
            :image-url="cardImage(row.item)"
            :order-label="orderLabel(row.item._id)"
            :forced-image-index="row.forcedImageIndex"
            :lock-image="row.lockImage"
            :expand-on-click="EXPAND_GALLERY_ON_CLICK && !row.lockImage"
            :style="archiveMeta(row.item, rowIndex).style"
            :data-flip-id="row.item._id"
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
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import type Lenis from 'lenis'
import {
  libraryFilterKey,
  parseLibraryFilterKey,
  type FormalItem,
} from '~/composables/demoData'
import { uniqueImageUrls, productGalleryFrames, productCoverFrame } from '~/composables/productImages'
import type { LibraryItem } from '~/composables/useLibraryCatalog'
import { GRID_RATIO_AR } from '~/composables/useLibraryCatalog'
import { IMAGE_WIDTH } from '~/composables/useSanityImage'

// Custom intro/outro own the leave — skip the global page opacity fade.
definePageMeta({
  pageTransition: false,
})

/** Match InfiniteSplitSlider gooey melt. */
const TITLE_BLUR_MAX = 75
/** Scroll distance after stick before title is fully melted out. */
const TITLE_GOOEY_SCROLL_VH = 0.48
/** Thumbnail clip-mask out / in (shared with title swap timing). */
const CLIP_OUT_DUR = 0.85
const CLIP_IN_DUR = 0.95
/** Title gooey-in — slower than clip so the melt reads clearly. */
const TITLE_GOOEY_IN_DUR = 1.85
/** Beat after paint before intro clip/title starts. */
const INTRO_START_DELAY_MS = 100
/** Title gooeys in shortly after thumbnails begin. */
const INTRO_TITLE_DELAY_MS = 320

/**
 * TEMP: first click fans gallery images into the grid; those tiles open the PDP.
 * Set to `false` to restore open-PDP-on-click + thumbnail arrows.
 */
const EXPAND_GALLERY_ON_CLICK = false

type GridRow = {
  /** Stable Vue key — survives product swaps so the Flip shell DOM stays put. */
  slotKey: string
  item: LibraryItem
  /** Locked gallery frame when expanded; null = normal card behaviour. */
  forcedImageIndex: number | null
  lockImage: boolean
  /** Blank spacer after an expanded gallery. */
  empty?: boolean
}

type FacetId = 'series' | 'feature' | 'materiality' | 'colour'

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
const { pendingGridSwap } = useProductOverlay()

/**
 * Client display order — can diverge from catalog after PDP close swaps the
 * Flip shell with the product that actually closed.
 */
const gridOrderIds = ref<string[] | null>(null)

watch(
  items,
  (list) => {
    const ids = (list as LibraryItem[]).map((item) => item._id)
    if (!gridOrderIds.value) {
      gridOrderIds.value = ids
      return
    }
    const alive = new Set(ids)
    const kept = gridOrderIds.value.filter((id) => alive.has(id))
    const keptSet = new Set(kept)
    const added = ids.filter((id) => !keptSet.has(id))
    gridOrderIds.value = [...kept, ...added]
  },
  { immediate: true },
)

const orderedItems = computed(() => {
  const list = items.value as LibraryItem[]
  const order = gridOrderIds.value
  if (!order?.length) return list
  const byId = new Map(list.map((item) => [item._id, item]))
  return order
    .map((id) => byId.get(id))
    .filter((item): item is LibraryItem => !!item)
})

const swapGridProducts = (shellId: string, closingId: string) => {
  if (!shellId || !closingId || shellId === closingId) return
  const order = [...(gridOrderIds.value ?? (items.value as LibraryItem[]).map((i) => i._id))]
  const i = order.indexOf(shellId)
  const j = order.indexOf(closingId)
  if (i < 0 || j < 0) return
  ;[order[i], order[j]] = [order[j], order[i]]
  gridOrderIds.value = order

  // Visibility is keyed by product id — swap flags so the shell stays painted.
  if (visibilitySeeded.value) {
    const next = new Set(visibleIds.value)
    const shellVisible = next.has(shellId)
    const closingVisible = next.has(closingId)
    if (shellVisible) next.add(closingId)
    else next.delete(closingId)
    if (closingVisible) next.add(shellId)
    else next.delete(shellId)
    visibleIds.value = next
  }
}

// Apply shell ↔ closing swap synchronously before Flip measures the shell.
watch(
  pendingGridSwap,
  (swap) => {
    if (!swap) return
    swapGridProducts(swap.shellId, swap.closingId)
    pendingGridSwap.value = null
  },
  { flush: 'sync' },
)

/** Product ids whose galleries have been fanned into the grid. */
const expandedIds = ref<Set<string>>(new Set())

const galleryImageCount = (item: LibraryItem) => {
  const urls = uniqueImageUrls(
    ...productGalleryFrames(item).map((asset) =>
      asset ? imageUrl(asset, IMAGE_WIDTH.thumb) : '',
    ),
  )
  return urls.length
}

const displayRows = computed<GridRow[]>(() => {
  const rows: GridRow[] = []
  orderedItems.value.forEach((item, slotIndex) => {
    const count = galleryImageCount(item)
    if (EXPAND_GALLERY_ON_CLICK && expandedIds.value.has(item._id) && count > 1) {
      for (let index = 0; index < count; index++) {
        rows.push({
          slotKey: `slot-${slotIndex}::${index}`,
          item,
          forcedImageIndex: index,
          lockImage: true,
        })
      }
      rows.push({
        slotKey: `slot-${slotIndex}::spacer`,
        item,
        forcedImageIndex: null,
        lockImage: true,
        empty: true,
      })
      return
    }
    rows.push({
      slotKey: `slot-${slotIndex}`,
      item,
      forcedImageIndex: null,
      lockImage: false,
    })
  })
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

const titleEl = ref<HTMLElement | null>(null)
const titleText = ref(
  (pageData.value as { heroTitle?: string } | null)?.heroTitle || 'Materials & Forms',
)
/**
 * Keep the heading fully hidden (incl. during page-enter fade) until the
 * gooey-in has words parked at opacity 0 / full blur, then paint + animate.
 */
const titlePaintReady = ref(false)
const titleFilterId = `maf-title-goo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
const titleBaseFilter = `url(#${titleFilterId}) blur(0.25px)`

let titleSplitInstance: InstanceType<typeof SplitText> | null = null
let titleGooeyTrigger: ScrollTrigger | null = null
let titleGooeyBooted = false
let titleSwapLock = false
let titleSwapGen = 0
let titleSwapTween: gsap.core.Tween | null = null
let titleSwapAbort: (() => void) | null = null

const prefersReducedMotion = () =>
  import.meta.client &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const titleWords = () =>
  (titleEl.value?.querySelectorAll('.products__title-word') ||
    []) as NodeListOf<Element> | never[]

const applyTitleGooey = (effect: number) => {
  if (titleSwapLock) return
  const t = Math.max(0, Math.min(1, effect))
  const words = titleWords()
  if (!words.length) {
    if (titleEl.value) gsap.set(titleEl.value, { opacity: t })
    return
  }
  if (prefersReducedMotion()) {
    gsap.set(words, { filter: 'none', opacity: t })
    return
  }
  gsap.set(words, {
    filter: `blur(${TITLE_BLUR_MAX * (1 - t)}px)`,
    opacity: t,
  })
}

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

const teardownTitleGooey = () => {
  abortTitleSwapTween()
  titleSwapLock = false
  titleGooeyTrigger?.kill()
  titleGooeyTrigger = null
  titleSplitInstance?.revert()
  titleSplitInstance = null
  if (titleEl.value) gsap.set(titleEl.value, { clearProps: 'opacity,filter' })
  // Stay pending — never flash solid type between teardown and the next setup.
  titlePaintReady.value = false
}

const resplitTitleWords = () => {
  titleSplitInstance?.revert()
  titleSplitInstance = null
  if (!titleEl.value || prefersReducedMotion()) return
  titleSplitInstance = new SplitText(titleEl.value, {
    type: 'words',
    wordsClass: 'products__title-word',
  })
}

const scrollTitleEffect = () =>
  titleGooeyTrigger ? 1 - titleGooeyTrigger.progress : 1

/** Gooey-melt the current page title out (text stays until titleGooeyIn). */
const titleGooeyOut = async () => {
  if (!import.meta.client || !titleEl.value || !titleGooeyBooted) return
  if (prefersReducedMotion()) {
    applyTitleGooey(0)
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
    duration: CLIP_OUT_DUR,
    ease: 'power2.in',
  })

  if (gen !== titleSwapGen) return
}

/** Swap title copy and gooey-melt it in. */
const titleGooeyIn = async (next: string, forcedEffect?: number) => {
  if (!import.meta.client || !titleEl.value) {
    titleText.value = next
    return
  }

  const gen = titleSwapGen
  titleSwapLock = true

  titleSplitInstance?.revert()
  titleSplitInstance = null
  if (titleEl.value) gsap.set(titleEl.value, { clearProps: 'opacity' })
  titleText.value = next
  await nextTick()
  if (!titleEl.value || gen !== titleSwapGen) return

  resplitTitleWords()
  const inWords = Array.from(titleWords())
  const inTarget = inWords.length ? inWords : titleEl.value
  // After filter scroll-to-top, ScrollTrigger progress can still read as scrolled
  // for a frame — allow callers to force a fully-visible land.
  const targetEffect =
    forcedEffect != null ? forcedEffect : scrollTitleEffect()

  if (prefersReducedMotion()) {
    titleSwapLock = false
    titlePaintReady.value = true
    applyTitleGooey(targetEffect)
    return
  }

  gsap.set(inTarget, {
    filter: inWords.length ? `blur(${TITLE_BLUR_MAX}px)` : undefined,
    opacity: 0,
  })
  // Reveal only once parked in the gooey-out state — never solid type first.
  titlePaintReady.value = true

  await gooeyTween(inTarget, {
    filter: inWords.length
      ? `blur(${TITLE_BLUR_MAX * (1 - targetEffect)}px)`
      : undefined,
    opacity: targetEffect,
    duration: TITLE_GOOEY_IN_DUR,
    ease: 'power3.out',
  })

  if (gen !== titleSwapGen) return
  titleSwapLock = false
  applyTitleGooey(targetEffect)
}

const swapTitleGooey = async (next: string) => {
  if (next === titleText.value) return
  await titleGooeyOut()
  await titleGooeyIn(next)
}

const setupTitleGooey = async (opts?: { startHidden?: boolean }) => {
  if (!import.meta.client || !titleEl.value) return

  teardownTitleGooey()
  gsap.registerPlugin(ScrollTrigger, SplitText)

  try {
    await document.fonts?.ready
  } catch {
    /* ignore */
  }

  // Allow Vue to paint the latest title text before splitting.
  await nextTick()
  if (!titleEl.value) return

  // Stay CSS-hidden through setup; playTitleGooeyIn / titleGooeyIn reveal.
  titlePaintReady.value = false

  if (!prefersReducedMotion()) {
    resplitTitleWords()
  }

  titleGooeyTrigger = ScrollTrigger.create({
    trigger: titleEl.value.closest('.products__header') || titleEl.value,
    start: 'top top',
    end: () => `+=${Math.max(240, window.innerHeight * TITLE_GOOEY_SCROLL_VH)}`,
    scrub: 0.55,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      const effect = 1 - self.progress
      if (titleSwapLock) {
        // Hard-load + immediate scroll: don't let the intro tween keep a solid
        // title while scrub has already melted past — drop the tween and follow.
        if (self.progress > 0.04) {
          abortTitleSwapTween()
          titleSwapGen += 1
          titleSwapLock = false
          titlePaintReady.value = true
          applyTitleGooey(effect)
        }
        return
      }
      applyTitleGooey(effect)
    },
  })

  if (opts?.startHidden) {
    titleSwapLock = true
    applyTitleGooey(0)
  } else {
    applyTitleGooey(1 - titleGooeyTrigger.progress)
    titlePaintReady.value = true
  }
}

const bootTitleGooey = async (opts?: { startHidden?: boolean }) => {
  titleGooeyBooted = true
  await setupTitleGooey(opts)
}

/** Gooey-melt the current title in without changing copy (page intro). */
const playTitleGooeyIn = async (forcedEffect = 1) => {
  if (!import.meta.client || !titleEl.value || !titleGooeyBooted) return

  const gen = ++titleSwapGen
  abortTitleSwapTween()
  titleSwapLock = true

  let inWords = Array.from(titleWords())
  if (!inWords.length && !prefersReducedMotion()) {
    resplitTitleWords()
    inWords = Array.from(titleWords())
  }
  const inTarget = inWords.length ? inWords : titleEl.value
  // If the user already scrolled during hard-load, land at scrub progress —
  // never animate to solid then snap away.
  const targetEffect = Math.min(forcedEffect, scrollTitleEffect())

  if (prefersReducedMotion() || targetEffect < 0.05) {
    titleSwapLock = false
    titlePaintReady.value = true
    applyTitleGooey(targetEffect)
    return
  }

  gsap.set(inTarget, {
    filter: inWords.length ? `blur(${TITLE_BLUR_MAX}px)` : undefined,
    opacity: 0,
  })
  // First moment the heading may paint — already fully melted out.
  titlePaintReady.value = true

  await gooeyTween(inTarget, {
    filter: inWords.length
      ? `blur(${TITLE_BLUR_MAX * (1 - targetEffect)}px)`
      : undefined,
    opacity: targetEffect,
    duration: TITLE_GOOEY_IN_DUR,
    ease: 'power3.out',
  })

  if (gen !== titleSwapGen) return
  titleSwapLock = false
  applyTitleGooey(scrollTitleEffect())
}

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

const cardImage = (item: FormalItem) => {
  const cover = productCoverFrame(item)
  return cover ? imageUrl(cover, IMAGE_WIDTH.thumb) : ''
}
const filterKey = libraryFilterKey

const route = useRoute()
const router = useRouter()

const prefs = useCookie<LibraryPrefs>('sba-maf-prefs', {
  default: () => ({
    filter: '',
    series: [],
    feature: [],
    materiality: [],
    colours: [],
    search: '',
    columns: 6,
  }),
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
})

const queryString = (value: unknown) =>
  typeof value === 'string' ? value : Array.isArray(value) ? String(value[0] || '') : ''

/** Normalize legacy smushed tag slugs (e.g. liquidmetal → liquid-metal). */
const canonicalizeFilterKey = (key: string) => {
  if (!key) return ''
  const parsed = parseLibraryFilterKey(key)
  return parsed ? libraryFilterKey(parsed) : key
}

const isKnownFilter = (key: string) => {
  if (!key) return true
  const canonical = canonicalizeFilterKey(key)
  return pageFilters.value.some((filter) => filterKey(filter) === canonical)
}

const initialQueryFilter = (() => {
  const fromUrl = canonicalizeFilterKey(queryString(route.query.filter))
  return isKnownFilter(fromUrl) ? fromUrl : ''
})()
const initialQuerySearch = queryString(route.query.q)

const activeFilter = ref(
  initialQueryFilter ||
    (isKnownFilter(prefs.value.filter || '')
      ? canonicalizeFilterKey(prefs.value.filter || '')
      : '') ||
    '',
)
// Facet dropdowns are hidden; clear so cookie state cannot silently filter.
const activeSeries = ref<string[]>([])
const activeFeatures = ref<string[]>([])
const activeMateriality = ref<string[]>([])
const activeColours = ref<string[]>([])
const searchQuery = ref(initialQuerySearch || prefs.value.search || '')
/**
 * Filter remembered when search becomes active — restored by clear (X).
 * Seeded from URL when landing with ?q=.
 */
const filterBeforeSearch = ref<string | null>(
  (initialQuerySearch || prefs.value.search || '').trim()
    ? activeFilter.value
    : null,
)

/** Immediate UI — search owns the active chip as soon as there’s text. */
const isSearchUiActive = computed(() => searchQuery.value.trim().length > 0)

type FilterChipRect = { key: string; x: number; y: number; w: number; h: number }

const filtersEl = ref<HTMLElement | null>(null)
const filterPillEl = ref<HTMLElement | null>(null)
const filterPillReady = ref(false)
const filtersGooId = `maf-filters-goo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
let filterLiquidRaf = 0
let filterResizeObserver: ResizeObserver | null = null

const activeChipKey = computed(() => {
  if (isSearchUiActive.value) return '__search__'
  return activeFilter.value || 'all'
})

const filterPillStyle = computed(() =>
  prefersReducedMotion() ? undefined : { filter: `url(#${filtersGooId})` },
)

const measureFilterPillTarget = (): FilterChipRect | null => {
  const root = filtersEl.value
  if (!root) return null
  const rootRect = root.getBoundingClientRect()
  const chips = Array.from(
    root.querySelectorAll<HTMLElement>('[data-filter-chip]'),
  )
  const el =
    chips.find((c) => c.dataset.filterChip === activeChipKey.value) ||
    chips[0]
  if (!el) return null
  const r = el.getBoundingClientRect()
  return {
    key: el.dataset.filterChip || '',
    x: r.left - rootRect.left,
    y: r.top - rootRect.top,
    w: r.width,
    h: r.height,
  }
}

const syncFilterPill = (immediate = false) => {
  if (!import.meta.client || !filtersEl.value) return

  const pill = filterPillEl.value
  const target = measureFilterPillTarget()
  if (!pill || !target) return

  // Radius is CSS `--ui-border-radius` — clear any leftover GSAP inline radius.
  pill.style.removeProperty('border-radius')

  const vars = {
    x: target.x,
    y: target.y,
    width: target.w,
    height: target.h,
  }

  if (immediate || prefersReducedMotion()) {
    gsap.set(pill, vars)
  } else {
    gsap.to(pill, {
      ...vars,
      duration: 0.55,
      ease: 'power3.out',
      overwrite: 'auto',
    })
  }

  if (!filterPillReady.value) {
    pill.classList.add('is-ready')
    filterPillReady.value = true
  }
}

const scheduleFilterLiquidSync = (immediate = false) => {
  if (!import.meta.client) return
  if (immediate) {
    cancelAnimationFrame(filterLiquidRaf)
    void nextTick(() => syncFilterPill(true))
    return
  }
  cancelAnimationFrame(filterLiquidRaf)
  filterLiquidRaf = requestAnimationFrame(() => {
    syncFilterPill(false)
  })
}

const displayTitle = computed(() => {
  if (isSearchUiActive.value) return pageTitle.value
  if (!activeFilter.value) return pageTitle.value
  const match = pageFilters.value.find(
    (filter) => filterKey(filter) === activeFilter.value,
  )
  return match?.label || pageTitle.value
})

// Sync before first paint (incl. restored cookie filter) — no gooey on load.
titleText.value = displayTitle.value

/** Keep filter + search shareable via ?filter=&q= without spamming history. */
let syncingFromRoute = false
const syncFilterToRoute = () => {
  if (!import.meta.client || syncingFromRoute) return

  const searching = searchQuery.value.trim()
  // Search is its own mode — don’t keep the previous type filter in the URL.
  const nextFilter = searching ? undefined : activeFilter.value || undefined
  const nextQ = searching || undefined
  const curFilter = queryString(route.query.filter) || undefined
  const curQ = queryString(route.query.q) || undefined
  if (curFilter === nextFilter && curQ === nextQ) return

  const query: Record<string, string> = {}
  for (const [key, value] of Object.entries(route.query)) {
    if (key === 'filter' || key === 'q') continue
    const str = queryString(value)
    if (str) query[key] = str
  }
  if (nextFilter) query.filter = nextFilter
  if (nextQ) query.q = nextQ

  void router.replace({ path: route.path, query })
}

watch([activeFilter, searchQuery], syncFilterToRoute, { immediate: true })

watch(
  () => [queryString(route.query.filter), queryString(route.query.q)] as const,
  ([filter, q]) => {
    const nextFilter = isKnownFilter(filter) ? canonicalizeFilterKey(filter) : ''
    const nextQ = q

    if (nextQ.trim()) {
      // Search mode — URL omits type filter on purpose; only react to q (and an
      // explicit filter if somehow present).
      if (nextQ === searchQuery.value) {
        if (nextFilter && nextFilter !== activeFilter.value) {
          syncingFromRoute = true
          activeFilter.value = nextFilter
          filterBeforeSearch.value = nextFilter
          nextTick(() => {
            syncingFromRoute = false
          })
        }
        return
      }
      syncingFromRoute = true
      if (filterBeforeSearch.value === null) {
        filterBeforeSearch.value = activeFilter.value
      }
      if (nextFilter) activeFilter.value = nextFilter
      searchQuery.value = nextQ
      nextTick(() => {
        syncingFromRoute = false
      })
      return
    }

    if (nextFilter === activeFilter.value && !searchQuery.value) return
    syncingFromRoute = true
    filterBeforeSearch.value = null
    activeFilter.value = nextFilter
    searchQuery.value = ''
    nextTick(() => {
      syncingFromRoute = false
    })
  },
)

/** Applied to the grid after typing pauses */
const debouncedSearchQuery = ref(searchQuery.value)
const SEARCH_DEBOUNCE_MS = 350

const selectFilter = (key: string) => {
  filterBeforeSearch.value = null
  if (searchQuery.value) {
    searchQuery.value = ''
    debouncedSearchQuery.value = ''
  }
  activeFilter.value = key
}

const clearSearch = () => {
  const restore = filterBeforeSearch.value
  filterBeforeSearch.value = null
  searchQuery.value = ''
  debouncedSearchQuery.value = ''
  if (restore !== null) activeFilter.value = restore
}

watch(
  [activeChipKey, pageFilters, isSearchUiActive, searchQuery],
  async () => {
    await nextTick()
    scheduleFilterLiquidSync(false)
  },
)
/** Kept for cookie shape only — layout is a fixed 6-col archive grid. */
const columns = ref(6)
const gridEl = ref<HTMLElement | null>(null)
const gridAnimating = ref(false)

/**
 * Tile layout from CMS `gridSize` + cover snap to portrait / square / landscape.
 * Size fallback rhythm when unset: two small, one medium, repeat.
 */
const archiveMeta = (item: LibraryItem, index: number) => {
  const fallbackSize = index % 3 === 2 ? 'medium' : 'small'
  const size = item.gridSize || fallbackSize
  const ratioKey = item.gridRatio || 'square'
  const ar = GRID_RATIO_AR[ratioKey] ?? GRID_RATIO_AR.square

  return {
    className: `product-card--archive-${size}`,
    style: {
      '--thumb-ar': String(ar),
    },
  }
}

const visibleIds = ref<Set<string>>(new Set())
/** Distinguishes "no matches" from "not yet computed" — an empty set means both. */
const visibilitySeeded = ref(false)
const visibleCount = computed(() => visibleIds.value.size)
let filterTransitionsReady = false
let searchFlipTimer: ReturnType<typeof setTimeout> | null = null
let filterTransitionGen = 0

const { $lenis } = useNuxtApp()

const scrollPageToTop = () => {
  const lenis = $lenis as Lenis | undefined
  if (lenis) lenis.scrollTo(0, { immediate: true })
  else window.scrollTo(0, 0)
  // Lenis immediate scroll can lag ScrollTrigger by a frame — force sync.
  ScrollTrigger.update()
  titleGooeyTrigger?.refresh()
  ScrollTrigger.update()
}

type CardClipPrep = {
  card: HTMLElement
  media: HTMLElement | null
  meta: HTMLElement | null
  lineMovers: HTMLElement[]
  lineSplits: InstanceType<typeof SplitText>[]
}

const CLIP_VISIBLE = 'inset(0% 0% 0% 0%)'
/** Clip from the top downward — layout size stays put, crop unchanged. */
const CLIP_HIDDEN = 'inset(100% 0% 0% 0%)'

const clearCardClipProps = (prep: CardClipPrep) => {
  for (const split of prep.lineSplits) {
    try {
      split.revert()
    } catch {
      /* ignore */
    }
  }
  prep.lineSplits.length = 0
  prep.lineMovers.length = 0
  if (prep.media) gsap.set(prep.media, { clearProps: 'clipPath,webkitClipPath' })
  if (prep.meta) gsap.set(prep.meta, { clearProps: 'clipPath,webkitClipPath' })
  gsap.set(prep.card, { clearProps: 'opacity,visibility' })
}

const maskMetaLines = (meta: HTMLElement) => {
  const splits: InstanceType<typeof SplitText>[] = []
  const movers: HTMLElement[] = []
  meta
    .querySelectorAll<HTMLElement>('.product-card__title, .product-card__provenance')
    .forEach((el) => {
      if (!el.textContent?.trim()) return
      const split = new SplitText(el, {
        type: 'lines',
        linesClass: 'product-card__clip-line',
      })
      splits.push(split)
      split.lines.forEach((line) => {
        const lineEl = line as HTMLElement
        const mask = document.createElement('div')
        mask.className = 'product-card__line-mask'
        lineEl.parentNode?.insertBefore(mask, lineEl)
        mask.appendChild(lineEl)
        movers.push(lineEl)
      })
    })
  return { splits, movers }
}

/** Clip-path only — thumbnail layout height never changes. */
const prepareCardClip = (card: HTMLElement, collapsed: boolean): CardClipPrep => {
  const media = card.querySelector<HTMLElement>('.product-card__media')
  const meta = card.querySelector<HTMLElement>('.product-card__meta')

  let lineSplits: InstanceType<typeof SplitText>[] = []
  let lineMovers: HTMLElement[] = []
  if (meta && !prefersReducedMotion()) {
    const masked = maskMetaLines(meta)
    lineSplits = masked.splits
    lineMovers = masked.movers
  }

  if (media) {
    gsap.set(media, { clipPath: collapsed ? CLIP_HIDDEN : CLIP_VISIBLE })
  }
  if (lineMovers.length) {
    gsap.set(lineMovers, { yPercent: collapsed ? 110 : 0 })
  }

  return { card, media, meta, lineMovers, lineSplits }
}

const animateCardsOut = (cards: HTMLElement[]) => {
  if (!cards.length) return Promise.resolve([] as CardClipPrep[])
  gsap.registerPlugin(SplitText)
  const prepared = cards.map((card) => prepareCardClip(card, false))

  if (prefersReducedMotion()) {
    for (const prep of prepared) {
      if (prep.media) gsap.set(prep.media, { clipPath: CLIP_HIDDEN })
      if (prep.lineMovers.length) gsap.set(prep.lineMovers, { yPercent: 110 })
    }
    return Promise.resolve(prepared)
  }

  const medias = prepared.map((p) => p.media).filter(Boolean) as HTMLElement[]
  const lines = prepared.flatMap((p) => p.lineMovers)

  return new Promise<CardClipPrep[]>((resolve) => {
    const tl = gsap.timeline({
      onComplete: () => resolve(prepared),
    })
    if (medias.length) {
      tl.to(
        medias,
        {
          clipPath: CLIP_HIDDEN,
          duration: CLIP_OUT_DUR,
          ease: 'power3.inOut',
          stagger: { amount: 0.2, from: 'random' },
        },
        0,
      )
    }
    if (lines.length) {
      tl.to(
        lines,
        {
          yPercent: 110,
          duration: CLIP_OUT_DUR * 0.45,
          ease: 'power3.in',
          stagger: { amount: 0.12, from: 'random' },
        },
        0,
      )
    }
    if (!medias.length && !lines.length) resolve(prepared)
  })
}

const animateCardsIn = (prepared: CardClipPrep[]) => {
  if (!prepared.length) return Promise.resolve()

  if (prefersReducedMotion()) {
    for (const prep of prepared) clearCardClipProps(prep)
    return Promise.resolve()
  }

  const medias = prepared.map((p) => p.media).filter(Boolean) as HTMLElement[]
  const lines = prepared.flatMap((p) => p.lineMovers)

  return new Promise<void>((resolve) => {
    const tl = gsap.timeline({
      onComplete: () => {
        for (const prep of prepared) clearCardClipProps(prep)
        resolve()
      },
    })
    if (medias.length) {
      tl.fromTo(
        medias,
        { clipPath: CLIP_HIDDEN },
        {
          clipPath: CLIP_VISIBLE,
          duration: CLIP_IN_DUR,
          ease: 'power3.inOut',
          stagger: { amount: 0.22, from: 'random' },
        },
        0,
      )
    }
    if (lines.length) {
      tl.fromTo(
        lines,
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: CLIP_IN_DUR * 0.45,
          ease: 'power3.out',
          stagger: { amount: 0.12, from: 'random' },
        },
        CLIP_IN_DUR * 0.55,
      )
    }
    if (!medias.length && !lines.length) {
      for (const prep of prepared) clearCardClipProps(prep)
      resolve()
    }
  })
}

const visibleGridCards = () =>
  gridEl.value?.querySelectorAll<HTMLElement>('.product-card:not(.is-filtered-out)') ??
  []

const transitionFilter = async (nextIds: Set<string>) => {
  if (!import.meta.client || !filterTransitionsReady) {
    visibleIds.value = nextIds
    return
  }

  const same =
    nextIds.size === visibleIds.value.size &&
    [...nextIds].every((id) => visibleIds.value.has(id))
  if (same) return

  const gen = ++filterTransitionGen
  const titleNext = displayTitle.value
  const titleNeedsSwap = titleNext !== titleText.value

  // Claim title ownership so displayTitle watch doesn't double-animate.
  gridAnimating.value = true
  titleSwapLock = true

  if (gridEl.value) {
    gsap.killTweensOf(
      gridEl.value.querySelectorAll(
        '.product-card__media, .product-card__clip-line',
      ),
    )
  }

  const leavingCards = Array.from(visibleGridCards())

  const preparedOut = await Promise.all([
    animateCardsOut(leavingCards),
    titleNeedsSwap ? titleGooeyOut() : Promise.resolve(null),
  ]).then(([out]) => out)

  if (gen !== filterTransitionGen) return

  // Screen is empty — jump to top before revealing the next set.
  scrollPageToTop()

  visibleIds.value = nextIds
  await nextTick()
  if (gen !== filterTransitionGen) return

  // Restore only cards that left the set (they're display:none now).
  for (const prep of preparedOut) {
    const id = prep.card.getAttribute('data-flip-id') || ''
    if (!nextIds.has(id)) clearCardClipProps(prep)
  }

  const enterCards = Array.from(visibleGridCards())
  gsap.registerPlugin(SplitText)
  const preparedIn = enterCards.map((card) => {
    const id = card.getAttribute('data-flip-id') || ''
    const prior = preparedOut.find(
      (prep) => (prep.card.getAttribute('data-flip-id') || '') === id,
    )
    if (prior) {
      // Still clipped — reuse for clip-in.
      if (prior.media) gsap.set(prior.media, { clipPath: CLIP_HIDDEN })
      if (prior.lineMovers.length) gsap.set(prior.lineMovers, { yPercent: 110 })
      return prior
    }
    return prepareCardClip(card, true)
  })

  await Promise.all([
    animateCardsIn(preparedIn),
    (async () => {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 220)
      })
      if (gen !== filterTransitionGen) return
      if (titleNeedsSwap) await titleGooeyIn(titleNext, 1)
      else {
        titleSwapLock = false
        applyTitleGooey(1)
      }
    })(),
  ])

  if (gen !== filterTransitionGen) return

  titleSwapLock = false
  titleGooeyTrigger?.refresh()
  ScrollTrigger.update()
  applyTitleGooey(1)
  gridAnimating.value = false
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
let introRan = false
let pageOutroRan = false

const waitMs = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })

const runPageIntro = async () => {
  if (!import.meta.client || introRan || pageOutroRan) return
  introRan = true

  gridAnimating.value = true
  titleSwapLock = true

  await bootTitleGooey({ startHidden: true })
  await nextTick()

  const cards = Array.from(visibleGridCards())
  gsap.registerPlugin(SplitText)
  const prepared = cards.map((card) => prepareCardClip(card, true))

  // Show the grid (opacity) only once cards are clipped shut.
  gridRevealed.value = true
  await waitMs(INTRO_START_DELAY_MS)

  await Promise.all([
    animateCardsIn(prepared),
    (async () => {
      await waitMs(INTRO_TITLE_DELAY_MS)
      await playTitleGooeyIn(1)
    })(),
  ])

  if (pageOutroRan) return

  titleSwapLock = false
  applyTitleGooey(scrollTitleEffect())
  gridAnimating.value = false
  filterTransitionsReady = true
}

const runPageOutro = async () => {
  if (!import.meta.client || pageOutroRan) return
  pageOutroRan = true
  filterTransitionsReady = false
  gridAnimating.value = true
  titleSwapLock = true
  filterTransitionGen += 1
  titleSwapGen += 1
  abortTitleSwapTween()

  // Card outro changes layout/scroll; kill scrub so it can't unlock and
  // re-apply a visible title after the gooey melt.
  titleGooeyTrigger?.kill()
  titleGooeyTrigger = null

  if (gridEl.value) {
    gsap.killTweensOf(
      gridEl.value.querySelectorAll(
        '.product-card__media, .product-card__clip-line',
      ),
    )
  }

  const cards = Array.from(visibleGridCards())
  await Promise.all([
    animateCardsOut(cards),
    titleGooeyBooted ? titleGooeyOut() : Promise.resolve(),
  ])

  // Hold the melted title hidden through unmount (no solid flash).
  titlePaintReady.value = false
}

const startPageIntro = () => {
  void runPageIntro()
}

onMounted(() => {
  seedVisibility()

  if (document.body.classList.contains('preloader-complete')) {
    startPageIntro()
  } else {
    document.addEventListener('preloader-complete', startPageIntro, { once: true })
  }
  document.addEventListener(
    'basedupon:scroll-system-ready',
    () => {
      titleGooeyTrigger?.refresh()
    },
    { once: true },
  )

  void nextTick(() => {
    syncFilterPill(true)
    if (filtersEl.value && typeof ResizeObserver !== 'undefined') {
      filterResizeObserver = new ResizeObserver(() => {
        scheduleFilterLiquidSync(true)
      })
      filterResizeObserver.observe(filtersEl.value)
    }
    window.addEventListener('resize', onFilterWindowResize)
  })
})

const onFilterWindowResize = () => scheduleFilterLiquidSync(true)

onBeforeRouteLeave(async () => {
  await runPageOutro()
})

onBeforeUnmount(() => {
  introRan = false
  pageOutroRan = false
  filterTransitionGen += 1
  titleSwapGen += 1
  if (revealTimer) clearTimeout(revealTimer)
  if (searchFlipTimer) clearTimeout(searchFlipTimer)
  cancelAnimationFrame(filterLiquidRaf)
  filterResizeObserver?.disconnect()
  filterResizeObserver = null
  window.removeEventListener('resize', onFilterWindowResize)
  if (filterPillEl.value) gsap.killTweensOf(filterPillEl.value)
  teardownTitleGooey()
  if (import.meta.client && gridEl.value) {
    gsap.killTweensOf(
      gridEl.value.querySelectorAll(
        '.product-card__media, .product-card__clip-line',
      ),
    )
  }
})

watch(displayTitle, (next) => {
  if (!import.meta.client) {
    titleText.value = next
    return
  }
  if (!titleGooeyBooted) {
    titleText.value = next
    return
  }
  // Defer so transitionFilter can claim the title on the same tick.
  nextTick(() => {
    if (gridAnimating.value || next === titleText.value) return
    void swapTitleGooey(next)
  })
})

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

const matchesSearch = (item: FormalItem, query: string) => {
  if (!query) return true
  return (
    item.title.toLowerCase().includes(query) ||
    (item.category || '').toLowerCase().includes(query) ||
    (item.type || '').toLowerCase().includes(query) ||
    (item.series || '').toLowerCase().includes(query) ||
    (item.feature || '').toLowerCase().includes(query) ||
    (item.tags || []).some((t) => t.toLowerCase().includes(query)) ||
    (item.materials || []).some((m) => m.toLowerCase().includes(query)) ||
    (item.colours || []).some((c) => c.toLowerCase().includes(query))
  )
}

const matchesFacets = (item: FormalItem) =>
  matchesFacet(item, 'series') &&
  matchesFacet(item, 'feature') &&
  matchesFacet(item, 'materiality') &&
  matchesFacet(item, 'colour')

const filterCounts = computed(() => {
  const counts: Record<string, number> = { '': 0 }

  for (const filter of pageFilters.value) {
    counts[filterKey(filter)] = 0
  }

  for (const item of items.value) {
    if (!matchesFacets(item)) continue
    if (matchesPageFilter(item, '')) counts[''] += 1
    for (const filter of pageFilters.value) {
      const key = filterKey(filter)
      if (matchesPageFilter(item, key)) counts[key] += 1
    }
  }

  return counts
})

const filterCount = (key: string) => filterCounts.value[key] ?? 0

const filteredItems = computed(() => {
  const query = debouncedSearchQuery.value.trim().toLowerCase()

  // Search is its own filter: full catalog (all singularities), no type chip.
  if (query) {
    return items.value.filter(
      (item) => matchesFacets(item) && matchesSearch(item, query),
    )
  }

  return items.value.filter(
    (item) =>
      matchesPageFilter(item, activeFilter.value) && matchesFacets(item),
  )
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
  const trimmed = value.trim()
  if (trimmed) {
    if (filterBeforeSearch.value === null) {
      filterBeforeSearch.value = activeFilter.value
    }
  } else if (filterBeforeSearch.value !== null && !syncingFromRoute) {
    // Cleared via keyboard — same as X: restore previous filter.
    const restore = filterBeforeSearch.value
    filterBeforeSearch.value = null
    activeFilter.value = restore
  }
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
  position: sticky;
  top: 0;
  z-index: 40;
  padding-bottom: 110px;
  max-width: none;
}

.products__title-filter {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}

.products__title {
  width: max-content;
  max-width: 100%;
  pointer-events: none;
  will-change: filter, opacity;
}

.products__title--pending {
  visibility: hidden !important;
  opacity: 0 !important;
}

.products__title :deep(.products__title-word) {
  display: inline-block;
  will-change: filter, opacity;
}

.products__intro {
  max-width: 34rem;
  font-size: var(--text-base);
  color: var(--muted);
}

.products__filter-tool {
  position: fixed;
  right: 20px;
  top: 90px;
  z-index: 60;
  display: flex;
  flex-direction: column;
  align-items: end;
  gap: 1rem;
  width: -moz-max-content;
  width: max-content;
  max-width: unset;
  padding: 0;
  pointer-events: auto;
  justify-content: flex-end;
}

.products__filters {
  position: relative;
  display: block;
  width: -moz-max-content;
  width: max-content;
  max-width: 530px;
  text-align: center;
}

.products__filters-svg {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}

.products__filters-pill {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
  border-radius: var(--ui-border-radius);
  background: var(--text-color);
  opacity: 0;
  pointer-events: none;
  will-change: transform, width, height, border-radius;
}

.products__filters-pill.is-ready {
  opacity: 1;
}

.products__filters-list {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: end;
  gap: 3px;
}

.type-chip {
  position: relative;
  font-size: var(--text-sm);
  color: var(--text-color);
  opacity: 1;
  transition:
    color 0.25s ease,
    background 0.25s ease,
    border-radius 1.6s cubic-bezier(0.22, 1, 0.36, 1);
  padding: 12px 20px;
  border: none;
  border-radius: var(--ui-border-radius);
  background: color-mix(in srgb, var(--text-color) 10%, transparent);
  cursor: pointer;
}

.type-chip:hover {
  opacity: 1;
  border-radius: var(--ui-border-radius);
}

.type-chip--active,
.type-chip--lit {
  border-radius: var(--ui-border-radius);
  color: var(--background-color);
}

@media (prefers-reduced-motion: reduce) {
  .products__filters-pill {
    transition: none;
    filter: none !important;
  }
}

.type-chip__count {
  font-variant-numeric: tabular-nums;
  display: none;
}

.products__search {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 7rem;
  max-width: 14rem;
  margin: 0;
  border-color: transparent;
  cursor: pointer;
}

.products__search:hover,
.products__search:focus-within {
  opacity: 1;
  border-radius: var(--ui-border-radius);
}

.products__search:has(.products__search-clear) {
  padding-right: calc(20px + 1.25rem);
}

.products__search-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.products__search-input {
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  font: inherit;
  font-size: inherit;
  font-family: inherit;
  font-weight: inherit;
  letter-spacing: inherit;
  line-height: inherit;
  color: inherit;
  text-transform: uppercase;
  outline: none;
  box-shadow: none;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
}

.products__search-input:focus,
.products__search-input:focus-visible,
.products__search-input:active {
  outline: none;
  border: 0;
  box-shadow: none;
}

.products__search-input::placeholder {
  color: var(--muted);
  font: inherit;
  font-size: inherit;
  letter-spacing: inherit;
  text-transform: uppercase;
  opacity: 1;
}

.products__search-input::-webkit-search-decoration,
.products__search-input::-webkit-search-cancel-button,
.products__search-input::-webkit-search-results-button,
.products__search-input::-webkit-search-results-decoration {
  appearance: none;
  display: none;
}

.products__search-clear {
  position: absolute;
  top: 50%;
  right: 20px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transform: translateY(-50%);
}

.products__search-x {
  position: relative;
  display: block;
  width: 11px;
  height: 11px;
}

.products__search-x-arm {
  position: absolute;
  left: 50%;
  top: 0;
  width: 1px;
  height: 100%;
  background: currentColor;
  transform-origin: center center;
}

.products__search-x-arm:first-child {
  transform: translateX(-50%) rotate(45deg);
}

.products__search-x-arm:last-child {
  transform: translateX(-50%) rotate(-45deg);
}

.products__grid-wrap {
  padding-top: 1.5rem;
}

.products__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  align-items: end;
  margin: 0 var(--gutter);
  opacity: 0;
  grid-auto-flow: dense;
}
@media (min-width: 900px) {
  .products__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (min-width: 1024px) {
  .products__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-auto-flow: unset;
  }
}
@media (min-width: 1400px) {
  .products__grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}
@media (min-width: 2080px) {
  .products__grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}
@media (min-width: 2500px) {
  .products__grid {
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }
}


.products__grid--revealed {
  opacity: 1;
}

.products__grid--animating {
  pointer-events: none;
}

.products__grid :deep(.product-card) {
  width: auto;
  max-width: none;
  flex: none;
  min-width: 0;
}

.products__grid :deep(.product-card--archive-small),
.products__spacer.product-card--archive-small {
  grid-column: span 1;
}

.products__grid :deep(.product-card--archive-medium),
.products__spacer.product-card--archive-medium {
  grid-column: span 1;
}

@media (min-width: 900px) {
  .products__grid :deep(.product-card--archive-medium),
  .products__spacer.product-card--archive-medium {
    grid-column: span 2;
  }
}


.products__grid :deep(.product-card--archive-large),
.products__spacer.product-card--archive-large {
  grid-column: span 4;
}

.products__grid :deep(.product-card--archive-full),
.products__spacer.product-card--archive-full {
  grid-column: span 6;
}

@media (max-width: 2060px) {
  .products__grid .product-card--archive-large, .products__spacer.product-card--archive-large {
    grid-column: span 3;
  }
}

@media (max-width: 899px) {
    .products__grid[data-v-5ef6242e] .product-card--archive-large, .products__spacer.product-card--archive-large[data-v-5ef6242e] {
        grid-column: span 2 !important;
    }
}

.products__grid :deep(.product-card__media) {
  height: auto;
  aspect-ratio: var(--thumb-ar, 1);
}

.products__grid :deep(.product-card__image) {
  object-fit: cover;
  object-position: center center;
}

.products__grid :deep(.product-card.is-filtered-out) {
  display: none !important;
}

.products__grid :deep(.product-card__line-mask) {
  display: block;
  overflow: hidden;
}

.products__grid :deep(.product-card__clip-line) {
  display: block;
}

.products__spacer {
  width: 100%;
  aspect-ratio: var(--thumb-ar, 1);
  min-width: 0;
  pointer-events: none;
}

.products__spacer.is-filtered-out {
  display: none !important;
}

.products__grid :deep(.product-card__type) {
  display: none;
}

.products__empty {
  padding: 2rem var(--gutter);
  color: var(--muted);
}

@media (max-width: 899px) {

  .products__grid :deep(.product-card--archive-large),
  .products__spacer.product-card--archive-large {
    grid-column: span 4;
  }

  .products__grid :deep(.product-card--archive-full),
  .products__spacer.product-card--archive-full {
    grid-column: span 4;
  }
}

@media (max-width: 767px) {
  .products__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .products__grid :deep(.product-card--archive-medium),
  .products__spacer.product-card--archive-medium,
  .products__grid :deep(.product-card--archive-large),
  .products__spacer.product-card--archive-large,
  .products__grid :deep(.product-card--archive-full),
  .products__spacer.product-card--archive-full {
    grid-column: span 2;
  }
}
</style>
