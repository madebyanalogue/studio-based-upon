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
        :class="{ 'explore__item--dragging': dragId === entry.key }"
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
        />
      </div>
    </div>

    <div class="explore__controls explore__controls--left">
      <button type="button" class="explore__btn" @click="remix">Remix</button>
      <button type="button" class="explore__btn" @click="addRandomElement">
        <span class="explore__btn-plus" aria-hidden="true">+</span>
        Surprise me
      </button>
    </div>

    <div class="explore__controls explore__controls--right">
      <button type="button" class="explore__link" @click="saveAllToComposition">
        Save all to composition
      </button>
    </div>

    <ZoomControls :label="zoomLabel" @zoom-in="zoomIn" @zoom-out="zoomOut" />
  </section>
</template>

<script setup lang="ts">
import { DEFAULT_FILTERS, filterKey, DEMO_GRID_ITEMS } from '~/composables/demoData'

type GridItemData = (typeof DEMO_GRID_ITEMS)[number]

type LayoutEntry = {
  key: string
  item: GridItemData
  x: number
  y: number
  size: number
  z: number
}

const props = defineProps<{
  items?: GridItemData[]
  filterLabels?: string[]
  defaultFilter?: string
}>()

const { imageUrl } = useSanityImage()
const { zoomIn, zoomOut, zoomLabel, zoom } = useGridZoom()
const { activeMoodboard, addItemToMoodboard, openMoodboard } = useBucket()
const { initFromBucket } = useMoodboard()

const filters = computed(() => (props.filterLabels?.length ? props.filterLabels : DEFAULT_FILTERS))
const activeFilter = ref(props.defaultFilter || filters.value[0] || 'All')

watch(filters, (next) => {
  if (!next.includes(activeFilter.value)) {
    activeFilter.value = props.defaultFilter || next[0] || 'All'
  }
})

const gridItems = computed(() => {
  if (props.items?.length) return props.items
  return DEMO_GRID_ITEMS
})

const visibleItems = computed(() => {
  const key = filterKey(activeFilter.value)
  if (key === 'all') return gridItems.value
  return gridItems.value.filter((item) => (item.categories || []).includes(key))
})

/* ---- Virtual field bigger than the viewport so you can explore beyond it ---- */
const FIELD = { w: 2600, h: 1800 }
const MARGIN = 80

const layout = ref<LayoutEntry[]>([])
let zCounter = 1
let seed = 1

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

const regenerate = (fresh = false) => {
  if (fresh) seed = Math.floor(Math.random() * 1_000_000) + 1
  const rng = mulberry(seed)
  const pool = shuffle(visibleItems.value, rng)
  if (!pool.length) {
    layout.value = []
    return
  }

  // A random subset so "Surprise me" produces a genuinely new arrangement.
  const maxCount = Math.min(pool.length, 22)
  const minCount = Math.min(pool.length, 8)
  const count = fresh
    ? Math.max(minCount, Math.round(minCount + rng() * (maxCount - minCount)))
    : pool.length
  const chosen = pool.slice(0, count)

  layout.value = chosen.map((item, index) => {
    const size = Math.round(150 + rng() * 200)
    const x = MARGIN + rng() * (FIELD.w - size - MARGIN * 2)
    const y = MARGIN + rng() * (FIELD.h - size - MARGIN * 2)
    return {
      key: `${item._id}-${index}`,
      item,
      x,
      y,
      size,
      z: index + 1,
    }
  })
  zCounter = chosen.length
  centrePan()
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

// Remix = a whole new arrangement with a fresh set of items.
const remix = () => regenerate(true)

// Surprise me = drop a single new random element near the current view.
const addRandomElement = () => {
  const pool = visibleItems.value
  if (!pool.length) return
  measure()
  const item = pool[Math.floor(Math.random() * pool.length)]
  const size = Math.round(150 + Math.random() * 200)
  const centreX = (viewW / 2 - pan.x) / scale.value
  const centreY = (viewH / 2 - pan.y) / scale.value
  const jitter = 220
  const x = clamp(
    centreX - size / 2 + (Math.random() * jitter - jitter / 2),
    MARGIN,
    FIELD.w - size - MARGIN,
  )
  const y = clamp(
    centreY - size / 2 + (Math.random() * jitter - jitter / 2),
    MARGIN,
    FIELD.h - size - MARGIN,
  )
  zCounter += 1
  layout.value.push({
    key: `${item._id}-${Date.now()}`,
    item,
    x,
    y,
    size,
    z: zCounter,
  })
}

// Save all the items currently on the canvas into the moodboard composition.
const saveAllToComposition = () => {
  const board = activeMoodboard.value
  if (!board || !layout.value.length) return
  layout.value.forEach((entry) => {
    addItemToMoodboard(board.id, {
      id: entry.item._id,
      title: entry.item.title,
      imageUrl: getItemImage(entry.item),
      itemType: entry.item.itemType || 'product',
      link: null,
    })
  })
  const refreshed = activeMoodboard.value
  if (refreshed?.items.length) {
    initFromBucket(refreshed.items)
    openMoodboard()
  }
}

watch(visibleItems, () => regenerate(false))

// Zoom scales the whole canvas, keeping the current viewport centre focal.
watch(zoom, (next, prev) => {
  if (!prev) return
  measure()
  const s0 = prev / 100
  const s1 = next / 100
  const focalX = (viewW / 2 - pan.x) / s0
  const focalY = (viewH / 2 - pan.y) / s0
  pan.x = viewW / 2 - focalX * s1
  pan.y = viewH / 2 - focalY * s1
  clampPan()
})

const getItemImage = (item: GridItemData) => imageUrl(item.image, 700)

/* ---------------------------- Pan + drag state ---------------------------- */
const viewport = ref<HTMLElement | null>(null)
const pan = reactive({ x: 0, y: 0 })
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

const canvasStyle = computed(() => ({
  width: `${FIELD.w}px`,
  height: `${FIELD.h}px`,
  transformOrigin: '0 0',
  transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale.value})`,
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
  const minX = Math.min(0, viewW - scaledW)
  const minY = Math.min(0, viewH - scaledH)
  pan.x = Math.min(0, Math.max(minX, pan.x))
  pan.y = Math.min(0, Math.max(minY, pan.y))
}

const centrePan = () => {
  measure()
  pan.x = (viewW - FIELD.w * scale.value) / 2
  pan.y = (viewH - FIELD.h * scale.value) / 2
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
  panOriginX = pan.x
  panOriginY = pan.y
  window.addEventListener('pointermove', onPanMove)
  window.addEventListener('pointerup', onPanUp)
}

const onPanMove = (event: PointerEvent) => {
  if (event.pointerId !== panPointerId) return
  pan.x = panOriginX + (event.clientX - panStartX)
  pan.y = panOriginY + (event.clientY - panStartY)
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
  zCounter += 1
  entry.z = zCounter

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

onMounted(() => {
  regenerate(false)
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
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
  transition: transform 0.2s ease;
}

.explore__item--dragging {
  cursor: grabbing;
}

.explore__item:hover {
  transform: translateY(-4px);
}

.explore__item--dragging:hover {
  transform: none;
}

.explore__controls {
  position: fixed;
  bottom: calc(var(--gutter) + 1.5rem);
  z-index: 90;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.explore__controls--left {
  left: var(--gutter);
}

.explore__controls--right {
  right: var(--gutter);
}

.explore__btn {
  font-size: var(--text-sm);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--charcoal);
  padding: 0.55rem 1.4rem;
  border: 1px solid var(--charcoal);
  border-radius: 999px;
  background: rgba(250, 247, 242, 0.92);
  backdrop-filter: blur(8px);
  transition: background 0.2s ease, color 0.2s ease;
}

.explore__btn:hover {
  background: var(--charcoal);
  color: var(--sand, #faf7f2);
}

.explore__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.explore__btn-plus {
  font-size: 1.05em;
  line-height: 1;
}

.explore__link {
  font-size: var(--text-sm);
  color: var(--charcoal);
  text-decoration: underline;
  text-underline-offset: 4px;
  text-decoration-color: var(--muted);
  transition: text-decoration-color 0.2s ease;
}

.explore__link:hover {
  text-decoration-color: currentColor;
}
</style>
