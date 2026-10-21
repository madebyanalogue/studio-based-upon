<template>
  <section
    ref="rootEl"
    class="d3-tunnel"
    :class="{
      'd3-tunnel--clear': fieldBg === 'webgl',
      'd3-tunnel--control': mode === 'control',
      'd3-tunnel--enter': pageEntering,
      'd3-tunnel--leave': pageLeaving,
    }"
    data-cursor="default"
    data-d3-gather
    aria-label="D3 tunnel"
    :style="{
      '--item-w': `${itemSize.width}px`,
      '--item-h': `${itemSize.height}px`,
    }"
  >
    <Teleport to="body">
    <div v-show="showModeToggle || showControls" class="d3-tunnel__toggles">
      <div class="d3-tunnel__mode">
        <div
          class="d3-tunnel__meta mono"
          :class="{ 'is-on': metaOn }"
          aria-hidden="true"
        >
          <p class="d3-tunnel__meta-title">{{ hoverCard?.title }}</p>
          <p class="d3-tunnel__meta-provenance">{{ hoverProvenance }}</p>
        </div>
        <SlidingPill
          v-show="showModeToggle"
          label="Field mode"
          :options="modeOptions"
          :model-value="mode"
          @update:model-value="setMode"
        />
      </div>
      <SlidingPill
        v-if="showControls"
        label="Preset"
        :options="presetOptions"
        :model-value="preset"
        @update:model-value="applyPreset"
      />
      <SlidingPill
        v-if="showControls"
        label="Backdrop"
        :options="fieldBgOptions"
        :model-value="fieldBg"
        @update:model-value="setFieldBg"
      />
      <SlidingPill
        v-if="showControls"
        label="Items per layer"
        :options="densityOptions"
        :model-value="String(itemsPerLayer)"
        @update:model-value="setItemsPerLayer"
      />
      <SlidingPill
        v-if="showControls"
        label="Landscape span"
        :options="spanOptions"
        :model-value="colSpanOn ? 'on' : 'off'"
        @update:model-value="setColSpan"
      />
      <SlidingPill
        v-if="showControls"
        label="Grid layout"
        :options="layoutOptions"
        :model-value="layout"
        @update:model-value="setLayout"
      />
      <SlidingPill
        v-if="showControls"
        label="Cell ratio"
        :options="ratioOptions"
        :model-value="ratio"
        @update:model-value="setRatio"
      />
      <div v-if="showControls" class="d3-tunnel__panel" data-cursor="default">
        <label class="d3-tunnel__control interface">
          <span>Gap</span>
          <input
            type="range"
            :min="CONFIG.layerGapMin"
            :max="CONFIG.layerGapMax"
            :step="CONFIG.layerGapStep"
            :value="layerGap"
            aria-label="Layer gap"
            @input="onGapInput"
          />
          <span class="d3-tunnel__control-value">{{ layerGap }}</span>
        </label>
        <label class="d3-tunnel__control interface">
          <span>Distance</span>
          <input
            v-model.number="cellGap"
            type="range"
            :min="CONFIG.cellGapMin"
            :max="CONFIG.cellGapMax"
            :step="CONFIG.cellGapStep"
            aria-label="Cell distance"
          />
          <span class="d3-tunnel__control-value">{{ cellGap }}</span>
        </label>
        <label class="d3-tunnel__control interface">
          <span>Fade</span>
          <input
            v-model.number="fadeFar"
            type="range"
            :min="CONFIG.fadeFarMin"
            :max="CONFIG.fadeFarMax"
            :step="CONFIG.fadeFarStep"
            aria-label="Background fade"
          />
          <span class="d3-tunnel__control-value">{{ fadeFar.toFixed(1) }}</span>
        </label>
        <label class="d3-tunnel__control interface">
          <span>Near</span>
          <input
            v-model.number="nearCut"
            type="range"
            :min="CONFIG.nearCutMin"
            :max="CONFIG.nearCutMax"
            :step="CONFIG.nearCutStep"
            aria-label="Foreground cut"
          />
          <span class="d3-tunnel__control-value">{{ nearCut }}</span>
        </label>
        <label class="d3-tunnel__control interface">
          <span>Start</span>
          <input
            type="range"
            :min="CONFIG.startMin"
            :max="CONFIG.startMax"
            :step="CONFIG.startStep"
            :value="startScroll"
            aria-label="Initial scroll"
            @input="onStartInput"
          />
          <span class="d3-tunnel__control-value">{{ startScroll }}</span>
        </label>
      </div>
    </div>
    </Teleport>
    <div
      ref="rigEl"
      class="d3-tunnel__rig"
      :class="{ 'is-parked': planeActive }"
    >
      <div
        v-for="layer in layers"
        :key="layer.index"
        class="d3-tunnel__layer"
        :ref="(el) => setLayerEl(layer.index, el)"
      >
        <div
          v-if="showGuides"
          class="d3-tunnel__grid"
          aria-hidden="true"
        >
          <span
            v-for="guide in SLOT_GUIDES"
            :key="`slot-${guide.slot}`"
            class="d3-tunnel__grid-slot"
            :style="{ left: guide.left, top: guide.top }"
          >
            <span class="d3-tunnel__grid-slot-label">{{ guide.slot }}</span>
          </span>
        </div>

        <button
          v-for="card in layer.cards"
          :key="card.key"
          type="button"
          class="d3-tunnel__item"
          :class="{
            'd3-tunnel__item--gathered': isGathered(card.frameId),
            'd3-tunnel__item--wide': card.colSpan > 1,
          }"
          :data-frame-id="card.frameId"
          :style="{
            left: card.left,
            top: card.top,
            width: `${card.cellWidth}px`,
            height: `${card.cellHeight}px`,
          }"
          data-cursor="add-selection"
          :aria-label="`Gather ${card.title}`"
          @pointerenter="onItemHover(card, $event)"
          @pointerleave="onItemUnhover"
          @pointerdown="onItemPointerDown"
          @click.stop.prevent="onGather(card, $event)"
        >
          <img :src="card.src" :alt="card.title" draggable="false" />
          <span class="d3-tunnel__veil" aria-hidden="true" />
        </button>
      </div>
    </div>
    <div
      ref="planeEl"
      class="d3-tunnel__plane"
      :class="{ 'is-parked': !planeActive }"
      @pointerdown="onPlanePointerDown"
    >
      <div class="d3-tunnel__tiles" :style="planeTransform">
        <button
          v-for="(card, index) in cards"
          :key="card.frameId"
          type="button"
          class="d3-tunnel__item"
          :class="{ 'd3-tunnel__item--gathered': isGathered(card.frameId) }"
          :data-frame-id="card.frameId"
          :style="controlItemStyle(index)"
          data-cursor="add-selection"
          :aria-label="`Gather ${card.title}`"
          @pointerenter="onItemHover(card, $event)"
          @pointerleave="onItemUnhover"
          @pointerdown="onItemPointerDown"
          @click.stop.prevent="onGather(card, $event)"
        >
          <img :src="card.src" :alt="card.title" draggable="false" />
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import Lenis from 'lenis'
import {
  galleryFromAssets,
  productCoverFrame,
  productGalleryFrames,
} from '~/composables/productImages'
import {
  productPath,
  productSlug,
} from '~/composables/useProductCatalog'
import { bucketItemId } from '~/composables/useBucket'

type TunnelItem = {
  _id: string
  title: string
  slug?: { current?: string } | string
  category?: string
  categories?: string[]
  type?: string
  linkType?: string
  image?: { asset?: { url?: string; _id?: string } }
  gallery?: { asset?: { url?: string; _id?: string } }[]
  imageIndex?: number
  frameAssetId?: string
}

type TunnelCard = {
  key: string
  src: string
  title: string
  slug: string
  productId: string
  itemType: string
  link: string | null
  imageUrls: string[]
  imageIndex: number
  frameId: string
  left: string
  top: string
  slot: number
  colSpan: number
  cellWidth: number
  cellHeight: number
}

const LAYOUTS = {
  '3×3': { cols: 3, rows: 3 },
  '2×3': { cols: 3, rows: 2 },
  '2×5': { cols: 5, rows: 2 },
  '5×2': { cols: 2, rows: 5 },
  '3×5': { cols: 5, rows: 3 },
  '5×3': { cols: 3, rows: 5 },
} as const
type GridLayout = keyof typeof LAYOUTS
const RATIOS = {
  '1:1': { w: 1, h: 1 },
  '3:2': { w: 3, h: 2 },
  '2:3': { w: 2, h: 3 },
  '7:9': { w: 7, h: 9 },
  '7:10': { w: 7, h: 10 },
  '4:3': { w: 4, h: 3 },
} as const
type CellRatio = keyof typeof RATIOS
const DENSITY_VALUES = [2, 3, 4] as const
type LayerDensity = (typeof DENSITY_VALUES)[number]
const PRESETS = {
  free: { id: 'free', label: 'Free' },
  selected: {
    id: 'selected',
    label: 'Selected',
    layout: '2×5' as const,
    ratio: '7:9' as const,
    itemsPerLayer: 3 as LayerDensity,
    layerGap: 600,
    cellGap: 0,
    fadeFar: 2,
    nearCut: 1500,
    startScroll: 1700,
    colSpan: false,
  },
  gallery: {
    id: 'gallery',
    label: 'Gallery',
    layout: '2×5' as const,
    ratio: '7:10' as const,
    itemsPerLayer: 4 as LayerDensity,
    layerGap: 800,
    cellGap: 0,
    fadeFar: 2,
    nearCut: 1500,
    startScroll: 1700,
    colSpan: true,
  },
  tall: {
    id: 'tall',
    label: 'Tall',
    layout: '2×5' as const,
    ratio: '7:10' as const,
    itemsPerLayer: 2 as LayerDensity,
    layerGap: 600,
    cellGap: 0,
    fadeFar: 2,
    nearCut: 1500,
    startScroll: 1700,
    colSpan: true,
  },
} as const
type FieldPreset = keyof typeof PRESETS
type SlotPlace = {
  slot: number
  colSpan: 1 | 2
}
const ITEM_BASE = 240
const CONFIG = {
  scrollSpeed: 2.4,
  layerGap: 600,
  layerGapMin: 600,
  layerGapMax: 4000,
  layerGapStep: 200,
  lerp: 0.08,
  cellGap: 0,
  cellGapMin: 0,
  cellGapMax: 160,
  cellGapStep: 4,
  lookEnabled: false,
  lookTilt: 14,
  lookShift: 56,
  lookLerp: 0.1,
  fadeFar: 2,
  fadeFarMin: 1,
  fadeFarMax: 10,
  fadeFarStep: 0.5,
  nearCut: 1500,
  nearCutMin: 200,
  nearCutMax: 2500,
  nearCutStep: 150,
  startMin: 0,
  startMax: 8000,
  startStep: 100,
}

const openSlotsFor = (cols: number, rows: number) => {
  const total = cols * rows
  const centerCol = Math.floor(cols / 2)
  const centerRow = Math.floor(rows / 2)
  return Array.from({ length: total }, (_, slot) => slot).filter((slot) => {
    const col = slot % cols
    const row = Math.floor(slot / cols)
    if (cols % 2 === 1 && rows % 2 === 1) {
      return !(col === centerCol && row === centerRow)
    }
    if (cols % 2 === 1) return col !== centerCol
    if (rows % 2 === 1) return row !== centerRow
    return true
  })
}

const slotCenter = (
  slot: number,
  cols: number,
  rows: number,
  width: number,
  height: number,
  gap: number,
) => {
  const col = slot % cols
  const row = Math.floor(slot / cols)
  const gridW = cols * width + (cols - 1) * gap
  const gridH = rows * height + (rows - 1) * gap
  return {
    x: -gridW / 2 + col * (width + gap) + width / 2,
    y: -gridH / 2 + row * (height + gap) + height / 2,
  }
}

const mulberry32 = (seed: number) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pickSlots = (count: number, layer: number, seed: number, openSlots: number[]) => {
  const rand = mulberry32(seed * 1009 + layer * 9176 + count * 13 + 1)
  const pool = [...openSlots]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const swap = pool[i]!
    pool[i] = pool[j]!
    pool[j] = swap
  }
  return pool.slice(0, count)
}

const placesForLayer = (
  layer: number,
  count: number,
  seed: number,
  open: number[],
  cols: number,
  span: boolean,
): SlotPlace[] => {
  const asSingle = (slots: number[]): SlotPlace[] =>
    slots.map((slot) => ({ slot, colSpan: 1 }))
  if (!span || cols < 2 || count < 1) {
    return asSingle(pickSlots(count, layer, seed, open))
  }
  const spannable = open.filter((slot) => {
    const col = slot % cols
    return col + 1 < cols && open.includes(slot + 1)
  })
  if (!spannable.length) return asSingle(pickSlots(count, layer, seed, open))
  const rand = mulberry32(seed * 1009 + layer * 9176 + 41)
  const spanSlot = spannable[Math.floor(rand() * spannable.length)]!
  const blocked = new Set([spanSlot, spanSlot + 1])
  const rest = pickSlots(
    Math.max(0, count - 1),
    layer,
    seed,
    open.filter((slot) => !blocked.has(slot)),
  )
  return [{ slot: spanSlot, colSpan: 2 }, ...asSingle(rest)]
}

const contentLayerCountFor = (total: number, perLayer: number) =>
  Math.ceil(total / perLayer)
const totalLayerCountFor = (total: number, perLayer: number) =>
  Math.max(contentLayerCountFor(total, perLayer), 6)

const props = defineProps<{
  items?: TunnelItem[]
  controls?: boolean
  modeToggle?: boolean
  startScroll?: number
  ratio?: CellRatio
  autoPlay?: boolean
}>()

const { imageUrl, getImageSrc } = useSanityImage()
const { isOpen } = useProductOverlay()
const { requestSave, items: pileItems, registerPileFly } = useBucket()

const CONTROL = {
  gap: 16,
  gutter: 112,
  aspect: 16 / 9,
  morph: 0.9,
  hold: 0.4,
  zoom: 0.85,
  zoomRows: 2.7,
  ease: 'power3.inOut',
  lenisDuration: 0.48,
  wheelGain: 1.7,
  flickMin: 0.12,
  flickMax: 2.2,
  flickMs: 260,
  parallax: 28,
  parallaxItem: 14,
  parallaxLerp: 0.12,
  autoTunnel: 1.2,
  autoPan: 0.42,
} as const
const controlLenisEase = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t))

const rootEl = ref<HTMLElement | null>(null)
const rigEl = ref<HTMLElement | null>(null)
const planeEl = ref<HTMLElement | null>(null)
const layerEls: HTMLElement[] = []
const heldIds = new Set<string>()
const heldGhosts = new Map<string, HTMLImageElement>()
const holdTick = ref(0)
const showGuides = ref(false)
const showControls = ref(!!props.controls)
const showModeToggle = computed(() => !!props.modeToggle || showControls.value)
/** Same placeholder as Materials & Forms product cards. */
const hoverProvenance = "Sotheby's London, 2020"
const hoverCard = ref<{ title: string } | null>(null)
const metaOn = ref(false)
let metaHideTimer = 0

const onItemHover = (
  card: { title: string },
  event: PointerEvent,
) => {
  if (event.pointerType === 'touch') return
  window.clearTimeout(metaHideTimer)
  hoverCard.value = card
  metaOn.value = true
}

const onItemUnhover = () => {
  window.clearTimeout(metaHideTimer)
  metaHideTimer = window.setTimeout(() => {
    metaOn.value = false
  }, 20)
}
const pageEntering = ref(true)
const pageLeaving = ref(false)
const layerGap = ref(PRESETS.gallery.layerGap)
const cellGap = ref(CONFIG.cellGap)

const layout = ref<GridLayout>('2×5')
const layoutOptions = (Object.keys(LAYOUTS) as GridLayout[]).map((id) => ({
  id,
  label: id,
}))
const ratio = ref<CellRatio>(
  props.ratio && props.ratio in RATIOS ? props.ratio : PRESETS.gallery.ratio,
)
const ratioOptions = (Object.keys(RATIOS) as CellRatio[]).map((id) => ({
  id,
  label: id,
}))

const grid = computed(() => LAYOUTS[layout.value])
const itemSize = computed(() => {
  const { w, h } = RATIOS[ratio.value]
  return {
    width: ITEM_BASE,
    height: Math.round((ITEM_BASE * h) / w),
  }
})
const openSlots = computed(() => openSlotsFor(grid.value.cols, grid.value.rows))

const SLOT_GUIDES = computed(() => {
  const { cols, rows } = grid.value
  const { width, height } = itemSize.value
  const gap = cellGap.value
  return Array.from({ length: cols * rows }, (_, slot) => {
    const { x, y } = slotCenter(slot, cols, rows, width, height, gap)
    return {
      slot,
      left: `${x - width / 2}px`,
      top: `${y - height / 2}px`,
    }
  })
})
/** How many layer-gaps until distant cards are fully veiled. `,` / `.` */
const fadeFar = ref(CONFIG.fadeFar)
/** Close-up cards stay solid until this z, then cut. `;` / `'`. */
const nearCut = ref(CONFIG.nearCut)
const startScroll = ref(
  props.startScroll != null
    ? Math.min(CONFIG.startMax, Math.max(CONFIG.startMin, Math.round(props.startScroll)))
    : PRESETS.gallery.startScroll,
)
const mode = ref<'control' | 'surrender'>('surrender')
const planeActive = ref(false)
const modeOptions = [
  { id: 'control', label: 'Control' },
  { id: 'surrender', label: 'Surrender' },
]
const viewport = reactive({ w: 1440, h: 900 })
const view = reactive({ x: 0, y: 0, scale: 1 })
const look = reactive({ x: 0, y: 0 })
const lookGoal = { x: 0, y: 0 }
const gridMetrics = reactive({ cols: 4, rows: 1, w: 1, h: 1 })
let modeLock = false
let measuringTunnel = false
let modeTween: gsap.core.Animation | null = null
let planeDrag: { x: number; y: number; viewX: number; viewY: number } | null = null
let panPointer = false
let panScrollKey = ''
const panSamples: { t: number; x: number; y: number }[] = []
type PanLenis = { wrapper: HTMLElement; content: HTMLElement; lenis: Lenis }
let panX: PanLenis | null = null
let panY: PanLenis | null = null

const gridLeft = (index: number) =>
  `${(index % gridMetrics.cols) * (itemSize.value.width + CONTROL.gap)}px`
const gridTop = (index: number) =>
  `${Math.floor(index / gridMetrics.cols) * (itemSize.value.height + CONTROL.gap)}px`

const controlItemStyle = (index: number) => {
  const cols = Math.max(1, gridMetrics.cols)
  const rows = Math.max(1, gridMetrics.rows)
  const col = index % cols
  const row = Math.floor(index / cols)
  const depth =
    0.45 +
    Math.hypot(col - (cols - 1) / 2, row - (rows - 1) / 2) * 0.18
  return {
    left: gridLeft(index),
    top: gridTop(index),
    width: `${itemSize.value.width}px`,
    height: `${itemSize.value.height}px`,
    transform: `translate3d(${-look.x * CONTROL.parallaxItem * depth}px, ${-look.y * CONTROL.parallaxItem * depth}px, 0)`,
  }
}

const planeTransform = computed(() => ({
  transform: `translate3d(${viewport.w / 2 + view.x - look.x * CONTROL.parallax}px, ${viewport.h / 2 + view.y - look.y * CONTROL.parallax}px, 0) scale(${view.scale}) translate3d(${-gridMetrics.w / 2}px, ${-gridMetrics.h / 2}px, 0)`,
}))

const syncViewport = () => {
  if (!import.meta.client) return
  viewport.w = window.innerWidth
  viewport.h = window.innerHeight
}

const gridShape = (count: number, aspect: number) => {
  const safe = Math.max(1, count)
  const target = Math.max(aspect, 0.01)
  const stepW = itemSize.value.width + CONTROL.gap
  const stepH = itemSize.value.height + CONTROL.gap
  let bestCols = 1
  let bestScore = Infinity
  for (let cols = 1; cols <= safe; cols += 1) {
    const rows = Math.ceil(safe / cols)
    const width = cols * stepW - CONTROL.gap
    const height = rows * stepH - CONTROL.gap
    const shape = width / Math.max(height, 0.001)
    const last = safe - (rows - 1) * cols
    const score =
      Math.abs(Math.log(shape / target)) + (rows > 1 && last / cols < 0.45 ? 0.12 : 0)
    if (score < bestScore) {
      bestScore = score
      bestCols = cols
    }
  }
  return { cols: bestCols, rows: Math.ceil(safe / bestCols) }
}

const insetBox = () => ({
  w: Math.max(1, viewport.w - CONTROL.gutter * 2),
  h: Math.max(1, viewport.h - CONTROL.gutter * 2),
})

const overviewScale = () => {
  const { w, h } = insetBox()
  return Math.min(w / Math.max(gridMetrics.w, 1), h / Math.max(gridMetrics.h, 1), 1)
}

const closeScale = () => {
  const { h } = insetBox()
  return (
    (h / Math.max(CONTROL.zoomRows * (itemSize.value.height + CONTROL.gap), 1)) *
    0.8
  )
}

const panLimits = () => {
  const { w, h } = insetBox()
  return {
    x: Math.max(0, (gridMetrics.w * view.scale - w) / 2),
    y: Math.max(0, (gridMetrics.h * view.scale - h) / 2),
  }
}

const clampView = () => {
  const { x: limitX, y: limitY } = panLimits()
  view.x = Math.min(limitX, Math.max(-limitX, view.x))
  view.y = Math.min(limitY, Math.max(-limitY, view.y))
}

const makePanLenis = (orientation: 'vertical' | 'horizontal'): PanLenis => {
  const wrapper = document.createElement('div')
  const content = document.createElement('div')
  wrapper.appendChild(content)
  wrapper.setAttribute('aria-hidden', 'true')
  wrapper.setAttribute('data-lenis-prevent', '')
  Object.assign(wrapper.style, {
    position: 'absolute',
    left: '0',
    top: '0',
    width: '8px',
    height: '8px',
    overflow: 'scroll',
    scrollbarWidth: 'none',
    pointerEvents: 'none',
    opacity: '0',
  })
  ;(planeEl.value || rootEl.value || document.body).appendChild(wrapper)
  const lenis = new Lenis({
    wrapper,
    content,
    eventsTarget: wrapper,
    orientation,
    gestureOrientation: orientation,
    smoothWheel: true,
    duration: CONTROL.lenisDuration,
    easing: controlLenisEase,
    overscroll: false,
    autoRaf: false,
    naiveDimensions: true,
  })
  return { wrapper, content, lenis }
}

const writeLenisFromView = () => {
  if (!panX || !panY) return
  const { x: limitX, y: limitY } = panLimits()
  panX.lenis.scrollTo(view.x + limitX, { immediate: true, force: true })
  panY.lenis.scrollTo(limitY - view.y, { immediate: true, force: true })
}

const applyLenisToView = () => {
  if (!panX || !panY) return
  const { x: limitX, y: limitY } = panLimits()
  if (panX.lenis.limit > 1) view.x = -limitX + panX.lenis.animatedScroll
  if (panY.lenis.limit > 1) view.y = limitY - panY.lenis.animatedScroll
}

const syncPanScrollRange = (fromView = false) => {
  if (!panX || !panY) return
  const { x: limitX, y: limitY } = panLimits()
  const key = `${limitX.toFixed(2)}|${limitY.toFixed(2)}|${view.scale.toFixed(4)}`
  if (key !== panScrollKey) {
    panY.content.style.height = `${limitY * 2 + Math.max(1, panY.wrapper.clientHeight)}px`
    panX.content.style.width = `${limitX * 2 + Math.max(1, panX.wrapper.clientWidth)}px`
    panY.lenis.resize()
    panX.lenis.resize()
    fromView = true
  }
  panScrollKey = key
  if (fromView) writeLenisFromView()
}

const setLookFromPointer = (clientX: number, clientY: number) => {
  if (mode.value !== 'control' || modeLock) return
  const nx = viewport.w ? (clientX / viewport.w) * 2 - 1 : 0
  const ny = viewport.h ? (clientY / viewport.h) * 2 - 1 : 0
  lookGoal.x = Math.max(-1, Math.min(1, nx))
  lookGoal.y = Math.max(-1, Math.min(1, ny))
}

const stepLook = () => {
  if (mode.value !== 'control') {
    lookGoal.x = 0
    lookGoal.y = 0
  }
  look.x += (lookGoal.x - look.x) * CONTROL.parallaxLerp
  look.y += (lookGoal.y - look.y) * CONTROL.parallaxLerp
}

const tickControlLenis = () => {
  stepLook()
  if (mode.value !== 'control' || modeLock || !panX || !panY) return
  const now = performance.now()
  panY.lenis.raf(now)
  panX.lenis.raf(now)
  const gliding =
    panY.lenis.isScrolling === 'smooth' || panX.lenis.isScrolling === 'smooth'
  if (gliding && !panPointer) applyLenisToView()
  else writeLenisFromView()
}

const rememberPanSample = (x: number, y: number) => {
  const now = performance.now()
  panSamples.push({ t: now, x, y })
  const cutoff = now - 100
  while (panSamples.length > 1 && panSamples[0]!.t < cutoff) panSamples.shift()
}

const releasePanFlick = () => {
  if (!pointerDragged || panSamples.length < 2 || !panX || !panY || modeLock) {
    panSamples.length = 0
    return
  }
  const first = panSamples[0]!
  const last = panSamples[panSamples.length - 1]!
  panSamples.length = 0
  const dt = Math.max(16, last.t - first.t)
  let vx = (last.x - first.x) / dt
  let vy = (last.y - first.y) / dt
  const speed = Math.hypot(vx, vy)
  if (speed < CONTROL.flickMin) return
  const cap = Math.min(speed, CONTROL.flickMax) / speed
  vx *= cap
  vy *= cap
  syncPanScrollRange()
  const glide = {
    programmatic: false,
    duration: CONTROL.lenisDuration,
    easing: controlLenisEase,
  }
  panX.lenis.scrollTo(panX.lenis.targetScroll + vx * CONTROL.flickMs, glide)
  panY.lenis.scrollTo(panY.lenis.targetScroll - vy * CONTROL.flickMs, glide)
}

const autoAllowed = () =>
  !!props.autoPlay &&
  !modeLock &&
  !pageEntering.value &&
  !pageLeaving.value &&
  !isOpen.value &&
  !prefersReducedMotion()

const tickAuto = () => {
  if (!autoAllowed()) return
  if (mode.value === 'control') {
    const { x: limitX, y: limitY } = panLimits()
    if (limitY > 1) {
      view.y += autoDir * CONTROL.autoPan
      if (view.y >= limitY) {
        view.y = limitY
        autoDir = -1
      } else if (view.y <= -limitY) {
        view.y = -limitY
        autoDir = 1
      }
    } else if (limitX > 1) {
      view.x += autoDir * CONTROL.autoPan
      if (view.x >= limitX) {
        view.x = limitX
        autoDir = -1
      } else if (view.x <= -limitX) {
        view.x = -limitX
        autoDir = 1
      }
    }
    writeLenisFromView()
    return
  }
  targetScroll += CONTROL.autoTunnel
}

const hideTunnelLayers = () => {
  layers.value.forEach((_, index) => {
    const el = layerEls[index]
    if (el) gsap.set(el, { visibility: 'hidden', '--overlay': 1 })
  })
}
const fieldBg = ref<'cream' | 'webgl'>('cream')
const fieldBgOptions = [
  { id: 'cream', label: 'Cream' },
  { id: 'webgl', label: 'WebGL' },
]
const setFieldBg = (id: string) => {
  fieldBg.value = id === 'webgl' ? 'webgl' : 'cream'
}
const syncFieldBgClass = () => {
  if (!import.meta.client) return
  document.body.classList.toggle('d3-clear', fieldBg.value === 'webgl')
}
watch(fieldBg, syncFieldBgClass)
const itemsPerLayer = ref<LayerDensity>(PRESETS.gallery.itemsPerLayer)
const densityOptions = DENSITY_VALUES.map((n) => ({ id: String(n), label: String(n) }))
const colSpanOn = ref(PRESETS.gallery.colSpan)
const spanOptions = [
  { id: 'off', label: 'Off' },
  { id: 'on', label: '2 cells' },
]
const preset = ref<FieldPreset>('gallery')
const presetOptions = (Object.keys(PRESETS) as FieldPreset[]).map((id) => ({
  id,
  label: PRESETS[id].label,
}))
const shuffleSeed = ref(1)

const applyPreset = (id: string) => {
  if (id === 'selected' || id === 'gallery' || id === 'tall') {
    const next = PRESETS[id]
    layout.value = next.layout
    ratio.value = next.ratio
    itemsPerLayer.value = next.itemsPerLayer
    setLayerGap(next.layerGap)
    cellGap.value = next.cellGap
    fadeFar.value = next.fadeFar
    nearCut.value = next.nearCut
    colSpanOn.value = next.colSpan
    setStartScroll(next.startScroll)
    preset.value = id
    shuffleSeed.value += 1
    return
  }
  preset.value = 'free'
}

const setColSpan = (id: string) => {
  const next = id === 'on'
  if (next === colSpanOn.value) return
  colSpanOn.value = next
  shuffleSeed.value += 1
}

const setLayout = (id: string) => {
  if (!(id in LAYOUTS) || id === layout.value) return
  layout.value = id as GridLayout
  preset.value = 'free'
  shuffleSeed.value += 1
}

const setRatio = (id: string) => {
  if (!(id in RATIOS)) return
  ratio.value = id as CellRatio
  const current = PRESETS[preset.value]
  if ('ratio' in current && id !== current.ratio) preset.value = 'free'
}

const setItemsPerLayer = (id: string) => {
  const next = Number(id)
  if (next !== 2 && next !== 3 && next !== 4) return
  if (next === itemsPerLayer.value) return
  itemsPerLayer.value = next
  preset.value = 'free'
  shuffleSeed.value += 1
}
let flights = 0

const fromTypingField = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    !!target.closest('input, textarea, select, [contenteditable="true"]'))

const setLayerGap = (next: number) => {
  const prev = layerGap.value
  const clamped = Math.min(
    CONFIG.layerGapMax,
    Math.max(CONFIG.layerGapMin, next),
  )
  if (clamped === prev) return
  const scale = clamped / prev
  targetScroll *= scale
  currentScroll *= scale
  layerGap.value = clamped
}

const onGapInput = (event: Event) => {
  const value = Number((event.target as HTMLInputElement).value)
  if (Number.isFinite(value)) setLayerGap(value)
}

const clampStart = (next: number) =>
  Math.min(CONFIG.startMax, Math.max(CONFIG.startMin, Math.round(next)))

const setStartScroll = (next: number) => {
  const clamped = clampStart(next)
  startScroll.value = clamped
  targetScroll = clamped
  currentScroll = clamped
}

const onStartInput = (event: Event) => {
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) return
  setStartScroll(value)
  preset.value = 'free'
}

const onKeyDown = (event: KeyboardEvent) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  if (fromTypingField(event.target)) return
  if ((event.key === 'g' || event.key === 'G') && props.controls) {
    event.preventDefault()
    showGuides.value = !showGuides.value
    return
  }
  if (event.key === 'c' || event.key === 'C') {
    event.preventDefault()
    showControls.value = !showControls.value
    return
  }
  if (event.key === '[' || event.key === '-') {
    event.preventDefault()
    setLayerGap(layerGap.value - CONFIG.layerGapStep)
    return
  }
  if (event.key === ']' || event.key === '=' || event.key === '+') {
    event.preventDefault()
    setLayerGap(layerGap.value + CONFIG.layerGapStep)
    return
  }
  if (event.key === ',' || event.key === '<') {
    event.preventDefault()
    fadeFar.value = Math.max(CONFIG.fadeFarMin, fadeFar.value - CONFIG.fadeFarStep)
    return
  }
  if (event.key === '.' || event.key === '>') {
    event.preventDefault()
    fadeFar.value = Math.min(CONFIG.fadeFarMax, fadeFar.value + CONFIG.fadeFarStep)
    return
  }
  if (event.key === ';' || event.key === ':') {
    event.preventDefault()
    nearCut.value = Math.max(CONFIG.nearCutMin, nearCut.value - CONFIG.nearCutStep)
    return
  }
  if (event.key === "'" || event.key === '"') {
    event.preventDefault()
    nearCut.value = Math.min(CONFIG.nearCutMax, nearCut.value + CONFIG.nearCutStep)
  }
}

const pickFrame = (item: TunnelItem) => {
  const frames = productGalleryFrames(item)
  const assetId = item.frameAssetId
  const matched = assetId
    ? frames.findIndex((frame) => frame.asset?._id === assetId)
    : -1
  const index =
    matched >= 0
      ? matched
      : typeof item.imageIndex === 'number'
        ? item.imageIndex
        : 0
  const frame = frames[index] || productCoverFrame(item) || frames[0]
  return { frames, frame, index: frames.indexOf(frame) >= 0 ? frames.indexOf(frame) : index }
}

const cards = computed(() => {
  const next: Omit<TunnelCard, 'key' | 'left' | 'top' | 'slot' | 'colSpan' | 'cellWidth' | 'cellHeight'>[] = []
  for (const item of props.items || []) {
    const slug = productSlug(item) || (typeof item.slug === 'string' ? item.slug : item.slug?.current) || item._id
    if (!slug) continue
    const { frames, frame, index } = pickFrame(item)
    const src = (frame ? imageUrl(frame, 900) : '') || (frame?.asset ? getImageSrc(frame.asset) : '')
    if (!src) continue
    const imageUrls = galleryFromAssets(frames, (source) => imageUrl(source, 1600) || '').filter(Boolean)
    next.push({
      src,
      title: item.title || 'Untitled',
      slug,
      productId: item._id,
      frameId: bucketItemId(item._id, index),
      imageIndex: index,
      itemType: item.category || item.type || 'Work',
      link: productPath(item),
      imageUrls: imageUrls.length ? imageUrls : [src],
    })
  }
  return next
})

const gatheredIds = computed(() => {
  const ids = new Set<string>()
  for (const item of pileItems.value) ids.add(item.id)
  return ids
})

const isGathered = (frameId: string) => {
  void holdTick.value
  return gatheredIds.value.has(frameId) && !heldIds.has(frameId)
}

const layers = computed(() => {
  const images = cards.value
  const total = images.length
  if (!total) return []
  const perLayer = itemsPerLayer.value
  const seed = shuffleSeed.value
  const contentLayers = contentLayerCountFor(total, perLayer)
  const count = totalLayerCountFor(total, perLayer)
  return Array.from({ length: count }, (_, index) => {
    const sourceIndex = index % contentLayers
    const start = sourceIndex * perLayer
    const { cols, rows } = grid.value
    const { width, height } = itemSize.value
    const gap = cellGap.value
    const places = placesForLayer(
      sourceIndex,
      perLayer,
      seed,
      openSlots.value,
      cols,
      colSpanOn.value,
    )
    const placed: TunnelCard[] = []
    for (let i = 0; i < places.length; i += 1) {
      const image = images[start + i]
      const place = places[i]
      if (!image || place == null) break
      const { x, y } = slotCenter(place.slot, cols, rows, width, height, gap)
      const cellWidth = place.colSpan * width + (place.colSpan - 1) * gap
      placed.push({
        ...image,
        slot: place.slot,
        colSpan: place.colSpan,
        cellWidth,
        cellHeight: height,
        key: `${index}-${image.frameId}-${place.slot}`,
        left: `${x - width / 2}px`,
        top: `${y - height / 2}px`,
      })
    }
    return { index, baseZ: -index * layerGap.value, cards: placed }
  })
})

const setLayerEl = (index: number, el: unknown) => {
  if (el instanceof HTMLElement) layerEls[index] = el
  else if (!el) delete layerEls[index]
}

const tunnelDepth = () => {
  const total = cards.value.length
  const gap = layerGap.value
  if (!total) return gap
  return totalLayerCountFor(total, itemsPerLayer.value) * gap
}

const exitPoint = 1500
const CLICK_DRAG = 6

let targetScroll = startScroll.value
let currentScroll = startScroll.value
let pointerY = 0
let pointerDown: { x: number; y: number } | null = null
let pointerDragged = false
let tickerOn = false
let autoDir = 1
const lookTarget = { x: 0, y: 0 }
const lookCurrent = { x: 0, y: 0 }

const overlayFor = (z: number) => {
  if (z > nearCut.value) return 1
  if (z > 0) return 0
  const gap = layerGap.value
  if (gap <= 0) return 0
  const layersBack = Math.abs(z) / gap
  /** Cream veil on the plane one gap behind — big step off the nearest. */
  const first = 0.82
  if (layersBack <= 1) return first * layersBack
  // fadeFar ~2 still leaves layers 2–3 readable, then cuts to hidden.
  const far = Math.max(fadeFar.value, 1) * 1.75
  if (layersBack >= far) return 1
  const t = (layersBack - 1) / (far - 1)
  return first + (1 - first) * t * t
}

const step = () => {
  tickControlLenis()
  tickAuto()
  if (planeActive.value && !measuringTunnel) {
    hideTunnelLayers()
    return
  }
  const list = layers.value
  const depth = tunnelDepth()
  currentScroll += (targetScroll - currentScroll) * CONFIG.lerp
  if (CONFIG.lookEnabled) {
    lookCurrent.x += (lookTarget.x - lookCurrent.x) * CONFIG.lookLerp
    lookCurrent.y += (lookTarget.y - lookCurrent.y) * CONFIG.lookLerp
  } else {
    lookCurrent.x = 0
    lookCurrent.y = 0
  }
  if (rigEl.value) {
    gsap.set(rigEl.value, {
      xPercent: -50,
      yPercent: -50,
      x: 0,
      y: 0,
      rotateY: 0,
      rotateX: 0,
      force3D: true,
    })
  }
  list.forEach((layer, index) => {
    const el = layerEls[index]
    if (!el) return
    let z = layer.baseZ + currentScroll
    z = ((z % depth) + depth) % depth
    z = z - depth + exitPoint
    const overlay = Math.min(1, Math.max(0, overlayFor(z)))
    const webgl = fieldBg.value === 'webgl'
    gsap.set(el, {
      z,
      '--overlay': webgl ? 0 : overlay,
      '--fade': overlay,
      visibility: overlay >= 1 ? 'hidden' : 'visible',
    })
  })
}

const fromUi = (target: EventTarget | null) =>
  target instanceof Element &&
  !!target.closest('.header, .bucket, .product-overlay, .d3-tunnel__toggles')

const layoutControlGrid = () => {
  syncViewport()
  const count = Math.max(1, cards.value.length)
  const { cols, rows } = gridShape(count, CONTROL.aspect)
  const { width, height } = itemSize.value
  gridMetrics.cols = cols
  gridMetrics.rows = rows
  gridMetrics.w = cols * (width + CONTROL.gap) - CONTROL.gap
  gridMetrics.h = rows * (height + CONTROL.gap) - CONTROL.gap
}

const snapshotFrameRects = (root: ParentNode | null) => {
  const map = new Map<string, DOMRect>()
  if (!root) return map
  for (const el of root.querySelectorAll<HTMLElement>('[data-frame-id]')) {
    const id = el.dataset.frameId
    if (!id) continue
    const layer = el.closest('.d3-tunnel__layer')
    if (layer && getComputedStyle(layer).visibility === 'hidden') continue
    if (getComputedStyle(el).visibility === 'hidden') continue
    const rect = el.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) continue
    const prev = map.get(id)
    if (!prev || rect.width * rect.height > prev.width * prev.height) map.set(id, rect)
  }
  return map
}

const destFrameEls = (root: ParentNode | null) => {
  const map = new Map<string, HTMLElement>()
  if (!root) return map
  for (const el of root.querySelectorAll<HTMLElement>('[data-frame-id]')) {
    const id = el.dataset.frameId
    if (!id || map.has(id)) continue
    const layer = el.closest('.d3-tunnel__layer')
    if (layer && getComputedStyle(layer).visibility === 'hidden') continue
    map.set(id, el)
  }
  return map
}

const srcByFrameId = () => {
  const map = new Map<string, string>()
  for (const card of cards.value) map.set(card.frameId, card.src)
  return map
}

let flightEls: HTMLElement[] = []

const clearFlightEls = () => {
  for (const el of flightEls) {
    gsap.killTweensOf(el)
    el.remove()
  }
  flightEls = []
}

const spawnFlyer = (src: string, rect: DOMRect, frameId?: string) => {
  const el = document.createElement('img')
  el.src = src
  el.alt = ''
  el.setAttribute('aria-hidden', 'true')
  if (frameId) el.dataset.frameId = frameId
  el.className = 'd3-tunnel__flyer'
  Object.assign(el.style, {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    objectFit: 'cover',
    margin: '0',
    padding: '0',
    border: '0',
    pointerEvents: 'none',
    zIndex: '45',
    willChange: 'left, top, width, height',
  })
  document.body.appendChild(el)
  flightEls.push(el)
  return el
}

const playMode = async (next: 'control' | 'surrender') => {
  if (next === mode.value || modeLock) return
  modeLock = true
  modeTween?.kill()
  clearFlightEls()
  const finish = () => {
    modeTween = null
    modeLock = false
  }
  const sources = srcByFrameId()
  if (next === 'control') {
    const fromRects = snapshotFrameRects(rigEl.value)
    layoutControlGrid()
    view.x = 0
    view.y = 0
    view.scale = overviewScale()
    mode.value = next
    planeActive.value = true
    hideTunnelLayers()
    await nextTick()
    const dests = destFrameEls(planeEl.value)
    dests.forEach((el) => gsap.set(el, { opacity: 0 }))
    if (prefersReducedMotion()) {
      dests.forEach((el) => gsap.set(el, { clearProps: 'opacity' }))
      view.scale = closeScale()
      syncPanScrollRange(true)
      finish()
      return
    }
    await nextFrame()
    const timeline = gsap.timeline({
      onComplete: () => {
        syncPanScrollRange(true)
        finish()
      },
    })
    modeTween = timeline
    dests.forEach((el, id) => {
      const from = fromRects.get(id)
      const to = el.getBoundingClientRect()
      const src = sources.get(id)
      if (!from || !src || to.width < 2 || to.height < 2) return
      const flyer = spawnFlyer(src, from, id)
      timeline.to(
        flyer,
        {
          left: to.left,
          top: to.top,
          width: to.width,
          height: to.height,
          duration: CONTROL.morph,
          ease: CONTROL.ease,
        },
        0,
      )
    })
    timeline.add(() => {
      clearFlightEls()
    }, CONTROL.morph)
    dests.forEach((el) => {
      timeline.to(el, { opacity: 1, duration: 0.4, ease: 'power2.out' }, CONTROL.morph)
    })
    timeline.to({}, { duration: CONTROL.hold }, CONTROL.morph + 0.4)
    timeline.to(
      view,
      { scale: closeScale(), duration: CONTROL.zoom, ease: CONTROL.ease },
      CONTROL.morph + 0.4 + CONTROL.hold,
    )
    return
  }

  const measureTunnelRects = () => {
    const rig = rigEl.value
    if (!rig) return new Map<string, DOMRect>()
    measuringTunnel = true
    rig.classList.remove('is-parked')
    rig.style.opacity = '0'
    step()
    const rects = snapshotFrameRects(rig)
    rig.classList.add('is-parked')
    rig.style.removeProperty('opacity')
    measuringTunnel = false
    return rects
  }
  const gridEls = destFrameEls(planeEl.value)
  const fromRects = snapshotFrameRects(planeEl.value)
  const endSurrender = () => {
    clearFlightEls()
    gridEls.forEach((el) => gsap.set(el, { clearProps: 'opacity' }))
    mode.value = 'surrender'
    planeActive.value = false
    step()
    finish()
  }
  if (prefersReducedMotion()) {
    endSurrender()
    return
  }
  gridEls.forEach((el, id) => {
    const from = fromRects.get(id)
    const src = sources.get(id)
    if (from && src) spawnFlyer(src, from, id)
  })
  const timeline = gsap.timeline({ onComplete: endSurrender })
  modeTween = timeline
  gridEls.forEach((el) => {
    timeline.to(el, { opacity: 0, duration: 0.28, ease: 'power2.out' }, 0)
  })
  const toRects = measureTunnelRects()
  const flyAt = 0.28
  flightEls.forEach((flyer) => {
    const id = flyer.dataset.frameId
    const to = id ? toRects.get(id) : undefined
    if (!to) {
      timeline.to(flyer, { opacity: 0, duration: CONTROL.morph * 0.5, ease: 'power2.out' }, flyAt)
      return
    }
    timeline.to(
      flyer,
      {
        left: to.left,
        top: to.top,
        width: to.width,
        height: to.height,
        duration: CONTROL.morph,
        ease: CONTROL.ease,
      },
      flyAt,
    )
  })
  if (!timeline.getChildren().length) endSurrender()
}

const setMode = (id: string) => {
  void playMode(id === 'control' ? 'control' : 'surrender')
}

const onWheel = (event: WheelEvent) => {
  if (isOpen.value || pageEntering.value || pageLeaving.value || fromUi(event.target)) return
  event.preventDefault()
  if (mode.value === 'control') {
    if (modeLock || !panX || !panY) return
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.h : 1
    const dx = event.deltaX * unit
    const dy = event.deltaY * unit
    if (!dx && !dy) return
    syncPanScrollRange()
    const glide = {
      programmatic: false,
      duration: CONTROL.lenisDuration,
      easing: controlLenisEase,
    }
    if (dy) panY.lenis.scrollTo(panY.lenis.targetScroll + dy * CONTROL.wheelGain, glide)
    if (dx) panX.lenis.scrollTo(panX.lenis.targetScroll - dx * CONTROL.wheelGain, glide)
    return
  }
  if (modeLock) return
  targetScroll += event.deltaY * CONFIG.scrollSpeed
}

const onTouchStart = (event: TouchEvent) => {
  if (isOpen.value || fromUi(event.target)) return
  const touch = event.touches[0]
  if (!touch) return
  pointerY = touch.clientY
  if (mode.value === 'control') {
    panPointer = true
    panSamples.length = 0
    rememberPanSample(touch.clientX, touch.clientY)
    planeDrag = { x: touch.clientX, y: touch.clientY, viewX: view.x, viewY: view.y }
  }
}

const onTouchMove = (event: TouchEvent) => {
  if (isOpen.value || fromUi(event.target)) return
  const touch = event.touches[0]
  if (!touch) return
  if (mode.value === 'control' && planeDrag) {
    rememberPanSample(touch.clientX, touch.clientY)
    view.x = planeDrag.viewX + touch.clientX - planeDrag.x
    view.y = planeDrag.viewY + touch.clientY - planeDrag.y
    clampView()
    writeLenisFromView()
    event.preventDefault()
    return
  }
  targetScroll += (pointerY - touch.clientY) * CONFIG.scrollSpeed
  pointerY = touch.clientY
  event.preventDefault()
}

const beginPlaneDrag = (event: PointerEvent) => {
  pointerDown = { x: event.clientX, y: event.clientY }
  pointerDragged = false
  panPointer = true
  panSamples.length = 0
  rememberPanSample(event.clientX, event.clientY)
  planeDrag = { x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y }
  if (event.currentTarget instanceof HTMLElement) {
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
}

const onPlanePointerDown = (event: PointerEvent) => {
  if (event.button !== 0 || mode.value !== 'control' || modeLock || fromUi(event.target)) return
  beginPlaneDrag(event)
}

const onItemPointerDown = (event: PointerEvent) => {
  if (event.button !== 0) return
  pointerDown = { x: event.clientX, y: event.clientY }
  pointerDragged = false
  if (mode.value === 'control') beginPlaneDrag(event)
}

const onItemPointerMove = (event: PointerEvent) => {
  if (mode.value === 'control') setLookFromPointer(event.clientX, event.clientY)
  if (planeDrag && mode.value === 'control') {
    rememberPanSample(event.clientX, event.clientY)
    const dx = event.clientX - planeDrag.x
    const dy = event.clientY - planeDrag.y
    if (!pointerDragged && Math.hypot(dx, dy) > CLICK_DRAG) pointerDragged = true
    if (pointerDragged) {
      view.x = planeDrag.viewX + dx
      view.y = planeDrag.viewY + dy
      clampView()
      writeLenisFromView()
    }
    return
  }
  if (!pointerDown) return
  if (
    Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > CLICK_DRAG
  ) {
    pointerDragged = true
  }
}

const onItemPointerUp = () => {
  if (mode.value === 'control') releasePanFlick()
  pointerDown = null
  planeDrag = null
  panPointer = false
}

const releaseHold = (id: string) => {
  heldIds.delete(id)
  heldGhosts.get(id)?.remove()
  heldGhosts.delete(id)
  holdTick.value += 1
}

const onPileFly = (phase: 'shown' | 'done', itemId?: string) => {
  if (phase === 'shown') {
    const id = itemId || heldIds.values().next().value
    if (id) releaseHold(id)
    return
  }
  flights = Math.max(0, flights - 1)
  if (flights > 0) return
  for (const id of [...heldIds]) releaseHold(id)
}

const onGather = (card: TunnelCard, event: MouseEvent) => {
  const dragged = pointerDragged
  pointerDown = null
  pointerDragged = false
  if (dragged || event.button !== 0) return
  if (gatheredIds.value.has(card.frameId) || heldIds.has(card.frameId)) return
  const source =
    (event.currentTarget instanceof HTMLElement &&
      event.currentTarget.querySelector<HTMLElement>('img')) ||
    (event.currentTarget instanceof HTMLElement ? event.currentTarget : null)
  if (!source) return
  const rect = source.getBoundingClientRect()
  if (rect.width < 2 || rect.height < 2) return

  heldIds.add(card.frameId)
  holdTick.value += 1
  flights += 1
  const ghost = document.createElement('img')
  ghost.src = card.src
  ghost.alt = ''
  ghost.setAttribute('aria-hidden', 'true')
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    objectFit: 'cover',
    margin: '0',
    padding: '0',
    pointerEvents: 'none',
    visibility: 'hidden',
    zIndex: '400',
  })
  document.body.appendChild(ghost)
  heldGhosts.set(card.frameId, ghost)

  const flying = requestSave(
    {
      id: card.frameId,
      title: card.title,
      imageUrl: card.src,
      itemType: card.itemType,
      link: card.link,
      imageUrls: [card.src],
      imageIndex: card.imageIndex,
    },
    { source: ghost },
  )
  if (flying) return
  flights = Math.max(0, flights - 1)
  releaseHold(card.frameId)
}

const prefersReducedMotion = () =>
  import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })

const setItemClip = (el: HTMLElement, top: number) => {
  el.style.clipPath = `inset(${top}% 0% 0% 0%)`
}

const clearItemClip = (el: HTMLElement) => {
  el.style.removeProperty('clip-path')
}

const visibleLayersByNear = () => {
  if (mode.value === 'control' && planeEl.value) return [planeEl.value]
  return layerEls
    .filter((el): el is HTMLElement => !!el && getComputedStyle(el).visibility !== 'hidden')
    .sort((a, b) => Number(gsap.getProperty(b, 'z')) - Number(gsap.getProperty(a, 'z')))
}

const layerItems = (layer: HTMLElement) =>
  [...layer.querySelectorAll<HTMLElement>('.d3-tunnel__item')]

const wipeLayers = (to: number, duration: number, from = to === 0 ? 100 : 0) => {
  const layers = visibleLayersByNear()
  if (!layers.length) return Promise.resolve()
  return new Promise<void>((resolve) => {
    clipTween?.kill()
    clipTween = gsap.timeline({
      onComplete: () => {
        clipTween = null
        resolve()
      },
    })
    layers.forEach((layer, index) => {
      const items = layerItems(layer)
      if (!items.length) return
      const state = { amount: from }
      const apply = () => items.forEach((el) => setItemClip(el, state.amount))
      apply()
      clipTween!.to(
        state,
        {
          amount: to,
          duration,
          ease: 'power3.inOut',
          onUpdate: apply,
        },
        index * 0.05,
      )
    })
  })
}

let clipTween: gsap.core.Timeline | null = null
let leavePromise: Promise<void> | null = null

const playPageEnter = async () => {
  if (!import.meta.client || !pageEntering.value) return
  await nextTick()
  await nextFrame()
  step()
  if (prefersReducedMotion()) {
    visibleLayersByNear().forEach((layer) => layerItems(layer).forEach(clearItemClip))
    pageEntering.value = false
    return
  }
  await wipeLayers(0, 0.95, 100)
  visibleLayersByNear().forEach((layer) => layerItems(layer).forEach(clearItemClip))
  pageEntering.value = false
}

const playPageLeave = () => {
  if (leavePromise) return leavePromise
  leavePromise = (async () => {
    pageLeaving.value = true
    pageEntering.value = false
    if (prefersReducedMotion()) {
      visibleLayersByNear().forEach((layer) =>
        layerItems(layer).forEach((el) => setItemClip(el, 100)),
      )
      return
    }
    await wipeLayers(100, 0.5, 0)
  })()
  return leavePromise
}

onBeforeRouteLeave((to, from) => {
  if (isOverlayHistoryRestore() || to.path === from.path) return
  return playPageLeave()
})

const onResize = () => {
  if (mode.value !== 'control') return
  layoutControlGrid()
  if (!modeLock) view.scale = closeScale()
  clampView()
  syncPanScrollRange(true)
}

onMounted(() => {
  if (!tickerOn) {
    gsap.ticker.add(step)
    tickerOn = true
  }
  syncFieldBgClass()
  registerPileFly(onPileFly)
  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('pointermove', onItemPointerMove, { passive: true })
  window.addEventListener('pointerup', onItemPointerUp)
  window.addEventListener('pointercancel', onItemPointerUp)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('resize', onResize)
  panY = makePanLenis('vertical')
  panX = makePanLenis('horizontal')
  void playPageEnter()
})

onUnmounted(() => {
  clipTween?.kill()
  clipTween = null
  modeTween?.kill()
  modeTween = null
  clearFlightEls()
  if (tickerOn) gsap.ticker.remove(step)
  tickerOn = false
  registerPileFly(null)
  for (const id of [...heldIds]) releaseHold(id)
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('pointermove', onItemPointerMove)
  window.removeEventListener('pointerup', onItemPointerUp)
  window.removeEventListener('pointercancel', onItemPointerUp)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('resize', onResize)
  panX?.lenis.destroy()
  panY?.lenis.destroy()
  panX?.wrapper.remove()
  panY?.wrapper.remove()
  panX = null
  panY = null
  window.clearTimeout(metaHideTimer)
  document.body.classList.remove('d3-clear')
})
</script>

<style scoped>
.d3-tunnel {
  position: fixed;
  inset: 0;
  background: var(--cream);
  perspective: 800px;
  overflow: hidden;
}

.d3-tunnel--clear {
  background: transparent;
}

.d3-tunnel--control {
  perspective: none;
}

.d3-tunnel__plane {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  touch-action: none;
  background: var(--cream);
  perspective: 1400px;
}

.d3-tunnel__tiles {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  transform-origin: 0 0;
  transform-style: preserve-3d;
  will-change: transform;
}

.d3-tunnel--enter .d3-tunnel__item,
.d3-tunnel--leave .d3-tunnel__item {
  clip-path: inset(100% 0% 0% 0%);
}

@media (prefers-reduced-motion: reduce) {
  .d3-tunnel--enter .d3-tunnel__item,
  .d3-tunnel--leave .d3-tunnel__item {
    clip-path: none;
  }
}

.d3-tunnel__toggles {
  position: fixed;
  left: 50%;
  bottom: calc(60px + var(--bucket-push, 0px));
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  transform: translateX(-50%);
}

.d3-tunnel__mode {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.d3-tunnel__meta {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 4vh + 40px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: max-content;
  max-width: min(72vw, 360px);
  transform: translateX(-50%);
  color: var(--charcoal);
  text-align: center;
  opacity: 0;
  transition: opacity 0.6s ease;
  pointer-events: none;
}

.d3-tunnel__meta.is-on {
  opacity: 1;
}

.d3-tunnel__meta-title,
.d3-tunnel__meta-provenance {
  margin: 0;
  font-size: clamp(8px, 1vw, 9.5px);
  letter-spacing: 0.125em;
}

.d3-tunnel__meta-provenance {
  color: var(--muted);
}

.d3-tunnel__panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 260px;
  margin: 0;
  padding: 10px 14px;
  border: 1px solid var(--grid-line);
  border-radius: 18px;
  background: color-mix(in srgb, var(--background-color, var(--cream)) 88%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.d3-tunnel__control {
  display: grid;
  grid-template-columns: 3.2rem 1fr 2.6rem;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: var(--charcoal);
  font-size: var(--text-sm);
}

.d3-tunnel__control input {
  width: 100%;
  margin: 0;
  accent-color: var(--charcoal);
  cursor: pointer;
}

.d3-tunnel__control-value {
  min-width: 2.6rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.d3-tunnel__rig {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
  transform: translate(-50%, -50%);
  transform-style: preserve-3d;
}

.d3-tunnel__rig.is-parked,
.d3-tunnel__plane.is-parked {
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
}

.d3-tunnel--clear .d3-tunnel__plane {
  background: var(--cream);
}

.d3-tunnel__layer {
  position: absolute;
  transform-style: preserve-3d;
  visibility: hidden;
}

.d3-tunnel__grid {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  pointer-events: none;
  z-index: 0;
}

.d3-tunnel__grid-slot {
  position: absolute;
  width: var(--item-w, 180px);
  height: var(--item-h, 240px);
  box-sizing: border-box;
  border: 1px solid color-mix(in srgb, var(--charcoal) 55%, transparent);
  background: color-mix(in srgb, var(--charcoal) 6%, transparent);
}

.d3-tunnel__grid-slot-label {
  position: absolute;
  top: 6px;
  left: 8px;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: color-mix(in srgb, var(--charcoal) 70%, transparent);
}

.d3-tunnel__item {
  position: absolute;
  z-index: 1;
  width: var(--item-w, 180px);
  height: var(--item-h, 240px);
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  overflow: hidden;
  display: grid;
  place-items: center;
  cursor: none;
  touch-action: none;
  user-select: none;
  transform-origin: center center;
}

.d3-tunnel__item--gathered {
  opacity: 0;
  pointer-events: none;
}

.d3-tunnel__flyer {
  position: fixed;
  display: block;
  object-fit: cover;
  pointer-events: none;
}

.d3-tunnel__item img {
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  object-fit: cover;
  pointer-events: none;
}

.d3-tunnel__veil {
  position: absolute;
  inset: 0;
  background: var(--cream);
  opacity: var(--overlay, 1);
  pointer-events: none;
}

.d3-tunnel--clear .d3-tunnel__veil {
  background: transparent;
  opacity: 0;
}

.d3-tunnel--clear .d3-tunnel__item {
  opacity: calc(1 - var(--fade, 0));
}

.d3-tunnel--clear .d3-tunnel__item--gathered {
  opacity: 0;
}
</style>
