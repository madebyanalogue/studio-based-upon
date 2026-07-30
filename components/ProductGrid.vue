<template>
  <section
    ref="viewport"
    class="explore"
    :class="{ 'explore--panning': isPanning }"
    aria-label="Explore canvas"
    @pointerdown="onCanvasPointerDown"
  >
    <div class="explore__canvas" :style="canvasStyle">
      <div
        v-for="entry in layout"
        :key="entry.key"
        class="explore__item"
        :class="{
          'explore__item--dragging': dragId === entry.key,
          'explore__item--visible': entry.visible,
        }"
        :style="{
          left: `${entry.x}px`,
          top: `${entry.y}px`,
          width: `${entry.size}px`,
          zIndex: entry.z,
        }"
        @pointerdown="onItemPointerDown($event, entry)"
        @click.capture="onItemClickCapture"
      >
        <GridItem
          :item="entry.item"
          :tile-size="entry.size"
          :image-url="getItemImage(entry.item)"
          @bottom-anchor="onBottomAnchor(entry, $event)"
        />
      </div>
    </div>

    <div class="explore__controls explore__controls--left">
      <button type="button" class="explore__pill" @click="surrender">Surrender</button>
    </div>

    <div class="explore__controls explore__controls--right">
      <button type="button" class="explore__link" @click="saveAllToComposition">
        Save to Board
        <span class="explore__link-arrow" aria-hidden="true">→</span>
      </button>
    </div>

    <ZoomControls :label="zoomLabel" @zoom-in="zoomIn" @zoom-out="zoomOut" />
  </section>
</template>

<script setup lang="ts">
import { DEFAULT_FILTERS, filterKey, isPrecraftedItem } from '~/composables/demoData'
import { productPath } from '~/composables/useProductCatalog'
import { toDiscoveryItem, demoLibraryItems } from '~/composables/useLibraryCatalog'
import {
  useDiscoveryCanvas,
  type DiscoveryLayoutEntry,
} from '~/composables/useDiscoveryCanvas'

type GridItemData = {
  _id: string
  title: string
  slug?: { current?: string }
  itemType?: string
  category?: string
  categories?: string[]
  materials?: string[]
  colours?: string[]
  image?: { asset?: { url?: string } }
  linkType?: string
  externalUrl?: string
}

type LayoutEntry = DiscoveryLayoutEntry

const props = defineProps<{
  items?: GridItemData[]
  filterLabels?: string[]
  defaultFilter?: string
}>()

const { imageUrl } = useSanityImage()
const { zoomIn, zoomOut, zoomLabel, zoom } = useGridZoom()
const { activeMoodboard, addItemToMoodboard, openMoodboard } = useBucket()
const { initFromBucket, snapshot } = useMoodboard()
const { createBoard } = useBoards()
const { affinity, clearAffinity } = useDiscoveryAffinity()
const {
  layout,
  pan,
  seed,
  zCounter,
  activeFilter,
} = useDiscoveryCanvas()

const filters = computed(() => (props.filterLabels?.length ? props.filterLabels : DEFAULT_FILTERS))

if (!layout.value.length && props.defaultFilter && activeFilter.value === 'All') {
  activeFilter.value = props.defaultFilter
}

watch(filters, (next) => {
  if (!next.includes(activeFilter.value)) {
    activeFilter.value = props.defaultFilter || next[0] || 'All'
  }
})


const gridItems = computed(() => {
  const source = props.items?.length
    ? props.items
    : (demoLibraryItems().map(toDiscoveryItem) as GridItemData[])
  return source.filter((item) => !isPrecraftedItem(item))
})

const visibleItems = computed(() => {
  const key = filterKey(activeFilter.value)
  if (key === 'all') return gridItems.value
  return gridItems.value.filter((item) => (item.categories || []).includes(key))
})

const poolForAffinity = (categories: string[], excludeId?: string) => {
  const cats = new Set(categories.map((c) => c.toLowerCase()))
  const similar = visibleItems.value.filter((item) => {
    if (excludeId && item._id === excludeId) return false
    const itemCats = [
      ...(item.categories || []),
      ...((item as { materials?: string[] }).materials || []),
    ]
    return itemCats.some((c) => cats.has(c.toLowerCase()))
  })
  return similar.length ? similar : visibleItems.value.filter((item) => item._id !== excludeId)
}

/* ---- Virtual field bigger than the viewport so you can explore beyond it ---- */
const FIELD = { w: 2600, h: 1800 }
const MARGIN = 80

const mulberry = (a: number) => () => {
  a |= 0
  a = (a + 0x6d2b79f5) | 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const shuffle = <T,>(arr: T[], rng: () => number) => {
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const placeItems = (chosen: GridItemData[], rng: () => number) => {
  const cols = Math.ceil(Math.sqrt((chosen.length * FIELD.w) / FIELD.h))
  const rows = Math.ceil(chosen.length / cols)
  const cellW = (FIELD.w - MARGIN * 2) / cols
  const cellH = (FIELD.h - MARGIN * 2) / rows

  const cellOrder = shuffle(
    Array.from({ length: cols * rows }, (_, i) => i),
    rng,
  )

  layout.value = chosen.map((item, index) => {
    const cell = cellOrder[index]
    const col = cell % cols
    const row = Math.floor(cell / cols)
    const size = Math.round(150 + rng() * 200)
    const maxX = Math.max(0, cellW - size)
    const maxY = Math.max(0, cellH - size)
    const x = MARGIN + col * cellW + rng() * maxX
    const y = MARGIN + row * cellH + rng() * maxY
    return {
      key: `${item._id}-${index}-${Date.now() % 100000}`,
      item,
      x,
      y,
      size,
      z: index + 1,
      visible: false,
    }
  })
  zCounter.value = chosen.length
  centrePan()
  revealSequentially()
}

const regenerate = (
  fresh = false,
  excludeIds: Set<string> = new Set(),
  preferred?: { categories: string[]; excludeId?: string },
) => {
  if (fresh) seed.value = Math.floor(Math.random() * 1_000_000) + 1
  const rng = mulberry(seed.value)

  let pool = preferred?.categories?.length
    ? poolForAffinity(preferred.categories, preferred.excludeId)
    : visibleItems.value

  if (excludeIds.size) {
    const unseen = pool.filter((item) => !excludeIds.has(item._id))
    if (unseen.length >= Math.min(8, pool.length)) {
      pool = unseen
    }
  }

  pool = shuffle(pool, rng)
  if (!pool.length) {
    layout.value = []
    return
  }

  const maxCount = Math.min(pool.length, 22)
  const minCount = Math.min(pool.length, 8)
  const count = fresh
    ? Math.max(minCount, Math.round(minCount + rng() * (maxCount - minCount)))
    : Math.min(pool.length, maxCount)
  const chosen = pool.slice(0, count)

  placeItems(chosen, rng)
}

/* --- Sequential fade-in, in a random order --- */
const REVEAL_STEP = 70
let revealTimers: ReturnType<typeof setTimeout>[] = []

const clearRevealTimers = () => {
  revealTimers.forEach(clearTimeout)
  revealTimers = []
}

const revealSequentially = () => {
  clearRevealTimers()
  const order = shuffle(
    layout.value.map((_, index) => index),
    Math.random,
  )
  order.forEach((idx, n) => {
    revealTimers.push(
      setTimeout(() => {
        const entry = layout.value[idx]
        if (entry) entry.visible = true
      }, n * REVEAL_STEP),
    )
  })
}

// Surrender = replace the canvas with a fresh random set, excluding items currently in view.
const surrender = () => {
  const seen = new Set<string>(layout.value.map((entry) => entry.item._id))
  regenerate(true, seen)
}

// Save all the items currently on the canvas into the active selection / board.
const saveAllToComposition = () => {
  const board = activeMoodboard.value
  if (!board || !layout.value.length) return
  layout.value.forEach((entry) => {
    addItemToMoodboard(board.id, {
      id: entry.item._id,
      title: entry.item.title,
      imageUrl: getItemImage(entry.item),
      itemType: entry.item.categories?.[0] || entry.item.category || 'item',
      link: productPath(entry.item),
    })
  })
  const refreshed = activeMoodboard.value
  if (!refreshed?.items.length) return
  initFromBucket(refreshed.items)
  const { placements, strokes } = snapshot()
  createBoard(placements, strokes)
  openMoodboard()
}

watch(
  affinity,
  (next) => {
    if (!next?.categories?.length) return
    regenerate(true, new Set(), next)
    clearAffinity()
  },
)

// Zoom scales the whole canvas, keeping the current viewport centre focal.
watch(zoom, (next, prev) => {
  if (!prev) return
  measure()
  const s0 = prev / 100
  const s1 = next / 100
  const focalX = (viewW / 2 - pan.value.x) / s0
  const focalY = (viewH / 2 - pan.value.y) / s0
  pan.value.x = viewW / 2 - focalX * s1
  pan.value.y = viewH / 2 - focalY * s1
  clampPan()
})

const getItemImage = (item: GridItemData) => imageUrl(item.image, 700)

/* ---------------------------- Pan + drag state ---------------------------- */
const viewport = ref<HTMLElement | null>(null)
const isPanning = ref(false)
const dragId = ref<string | null>(null)

let viewW = 0
let viewH = 0
let suppressClick = false

// Pan pointer bookkeeping
let panPointerId = -1
let panStartX = 0
let panStartY = 0
let panOriginX = 0
let panOriginY = 0

// Item drag bookkeeping
let dragEntry: LayoutEntry | null = null
let dragStartX = 0
let dragStartY = 0
let dragOriginX = 0
let dragOriginY = 0

const scale = computed(() => zoom.value / 100)

/** Keep tile bottom fixed when cycled images change height */
const onBottomAnchor = (entry: LayoutEntry, payload: { delta: number }) => {
  // delta is layout height (offsetHeight) in canvas space — same units as entry.y
  entry.y -= payload.delta
}

const canvasStyle = computed(() => ({
  width: `${FIELD.w}px`,
  height: `${FIELD.h}px`,
  transformOrigin: '0 0',
  transform: `translate(${pan.value.x}px, ${pan.value.y}px) scale(${scale.value})`,
}))

const measure = () => {
  const el = viewport.value
  if (!el) return
  viewW = el.clientWidth
  viewH = el.clientHeight
}

const clampPan = () => {
  const scaledW = FIELD.w * scale.value
  const scaledH = FIELD.h * scale.value
  // When the scaled canvas is smaller than the viewport, centre it.
  if (scaledW <= viewW) {
    pan.value.x = (viewW - scaledW) / 2
  } else {
    pan.value.x = Math.min(0, Math.max(viewW - scaledW, pan.value.x))
  }
  if (scaledH <= viewH) {
    pan.value.y = (viewH - scaledH) / 2
  } else {
    pan.value.y = Math.min(0, Math.max(viewH - scaledH, pan.value.y))
  }
}

const centrePan = () => {
  measure()
  pan.value.x = (viewW - FIELD.w * scale.value) / 2
  pan.value.y = (viewH - FIELD.h * scale.value) / 2
  clampPan()
}

const onCanvasPointerDown = (event: PointerEvent) => {
  // Only start a pan when clicking empty canvas (not an item or control).
  const target = event.target as HTMLElement
  if (target.closest('.explore__item') || target.closest('button, a')) return
  if (event.button !== 0) return
  measure()
  isPanning.value = true
  panPointerId = event.pointerId
  panStartX = event.clientX
  panStartY = event.clientY
  panOriginX = pan.value.x
  panOriginY = pan.value.y
  window.addEventListener('pointermove', onPanMove)
  window.addEventListener('pointerup', onPanUp)
}

const onPanMove = (event: PointerEvent) => {
  if (event.pointerId !== panPointerId) return
  pan.value.x = panOriginX + (event.clientX - panStartX)
  pan.value.y = panOriginY + (event.clientY - panStartY)
  clampPan()
}

const onPanUp = () => {
  isPanning.value = false
  panPointerId = -1
  window.removeEventListener('pointermove', onPanMove)
  window.removeEventListener('pointerup', onPanUp)
}

const onItemPointerDown = (event: PointerEvent, entry: LayoutEntry) => {
  if (event.button !== 0) return
  // Bring to front on any interaction.
  zCounter.value += 1
  entry.z = zCounter.value

  dragEntry = entry
  dragId.value = entry.key
  dragStartX = event.clientX
  dragStartY = event.clientY
  dragOriginX = entry.x
  dragOriginY = entry.y
  suppressClick = false
  window.addEventListener('pointermove', onItemMove)
  window.addEventListener('pointerup', onItemUp)
}

const onItemMove = (event: PointerEvent) => {
  if (!dragEntry) return
  const dx = event.clientX - dragStartX
  const dy = event.clientY - dragStartY
  if (!suppressClick && Math.hypot(dx, dy) > 4) suppressClick = true
  if (suppressClick) {
    // Translate screen movement into canvas coordinates.
    dragEntry.x = dragOriginX + dx / scale.value
    dragEntry.y = dragOriginY + dy / scale.value
  }
}

const onItemUp = () => {
  dragEntry = null
  dragId.value = null
  window.removeEventListener('pointermove', onItemMove)
  window.removeEventListener('pointerup', onItemUp)
}

// If a drag happened, swallow the click so we don't open/navigate.
const onItemClickCapture = (event: MouseEvent) => {
  if (suppressClick) {
    event.stopPropagation()
    event.preventDefault()
    suppressClick = false
  }
}

const onResize = () => {
  measure()
  clampPan()
}

const restoreSession = () => {
  const byId = new Map(gridItems.value.map((item) => [item._id, item]))
  layout.value = layout.value.map((entry) => {
    const fresh = byId.get(entry.item._id)
    return {
      ...entry,
      item: fresh ? { ...entry.item, ...fresh } : entry.item,
      visible: true,
    }
  })
  measure()
  clampPan()
}

onMounted(() => {
  if (affinity.value?.categories?.length) {
    regenerate(true, new Set(), affinity.value)
    clearAffinity()
  } else if (layout.value.length) {
    restoreSession()
  } else if (visibleItems.value.length) {
    regenerate(false)
  }
  window.addEventListener('resize', onResize)
})

// Items may arrive after mount (async catalog) — seed once if still empty,
// or refresh images on an existing session once Sanity data lands.
watch(visibleItems, (items) => {
  if (!items.length) return
  if (!layout.value.length) {
    if (affinity.value?.categories?.length) return
    regenerate(false)
    return
  }
  const needsImages = layout.value.some((entry) => !entry.item.image?.asset?.url)
  if (needsImages) restoreSession()
})

onBeforeUnmount(() => {
  clearRevealTimers()
  window.removeEventListener('resize', onResize)
  window.removeEventListener('pointermove', onPanMove)
  window.removeEventListener('pointerup', onPanUp)
  window.removeEventListener('pointermove', onItemMove)
  window.removeEventListener('pointerup', onItemUp)
})
</script>

<style scoped>
.explore {
  position: relative;
  height: 100dvh;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
}

.explore--panning {
  cursor: grabbing;
}

.explore__canvas {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
}

.explore__item {
  position: absolute;
  cursor: grab;
  opacity: 0;
  transition: opacity 0.6s ease;
}

.explore__item--visible {
  opacity: 1;
}

.explore__item--dragging {
  cursor: grabbing;
}

.explore__controls {
  position: fixed;
  bottom: 30px;
  z-index: 90;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.explore__controls--left {
  left: var(--gutter);
}

.explore__controls--right {
  right: calc(var(--gutter) + var(--bucket-push));
  transition: right var(--bucket-close-ms) cubic-bezier(0.22, 1, 0.36, 1);
}

.explore__link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: var(--text-sm);
  color: var(--charcoal);
  text-decoration: underline;
  text-underline-offset: 4px;
  text-decoration-color: transparent;
  transition: text-decoration-color 0.2s ease;
}

.explore__link-arrow {
  font-size: 1.05em;
  line-height: 1;
}

.explore__link:hover {
  text-decoration-color: currentColor;
}

.explore__pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: var(--text-sm);
  color: var(--charcoal);
  padding: 0.4rem 1rem .5em;
  border-radius: 8px;
  background: rgba(250, 247, 242, 0.92);
  backdrop-filter: blur(8px);
  transition: background 0.2s ease, color 0.2s ease;
  border-bottom: 1px solid #ddd;
}

.explore__pill:hover {
  background: var(--charcoal);
  color: var(--sand, #faf7f2);
}
</style>
