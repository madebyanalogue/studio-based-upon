<template>
  <section
    ref="rootEl"
    class="d3-tunnel"
    :class="{
      'd3-tunnel--clear': fieldBg === 'webgl',
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
    <div class="d3-tunnel__toggles">
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
          v-show="showModeToggle || showControls"
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
    <div ref="rigEl" class="d3-tunnel__rig">
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
            'd3-tunnel__item--tall': card.rowSpan > 1,
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
          <span class="d3-tunnel__backing" aria-hidden="true" />
          <img :src="card.src" :alt="card.title" draggable="false" />
          <span class="d3-tunnel__veil" aria-hidden="true" />
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import gsap from 'gsap'
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
  rowSpan: number
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
  '6:5': { w: 6, h: 5 },
  '5:4': { w: 5, h: 4 },
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
    ratio: '7:9' as const,
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
  columns: {
    id: 'columns',
    label: 'Columns',
    layout: '2×3' as const,
    ratio: '4:3' as const,
    itemsPerLayer: 4 as LayerDensity,
    layerGap: 600,
    cellGap: 0,
    fadeFar: 2,
    nearCut: 1500,
    startScroll: 1700,
    colSpan: false,
  },
  freeflow: {
    id: 'freeflow',
    label: 'Freeflow',
    layout: '3×5' as const,
    ratio: '7:9' as const,
    itemsPerLayer: 4 as LayerDensity,
    layerGap: 800,
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
  rowSpan: 1 | 2
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
  autoTunnel: 1.2,
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
  rows: number,
  span: boolean,
): SlotPlace[] => {
  const asSingle = (slots: number[]): SlotPlace[] =>
    slots.map((slot) => ({ slot, colSpan: 1, rowSpan: 1 }))
  if (!span || count < 1) return asSingle(pickSlots(count, layer, seed, open))
  const across = open.filter((slot) => {
    const col = slot % cols
    return col + 1 < cols && open.includes(slot + 1)
  })
  const down = open.filter((slot) => {
    const row = Math.floor(slot / cols)
    return row + 1 < rows && open.includes(slot + cols)
  })
  const vertical = across.length === 0 && down.length > 0
  const spannable = vertical ? down : across
  if (!spannable.length) return asSingle(pickSlots(count, layer, seed, open))
  const rand = mulberry32(seed * 1009 + layer * 9176 + 41)
  const spanSlot = spannable[Math.floor(rand() * spannable.length)]!
  const blocked = new Set(
    vertical ? [spanSlot, spanSlot + cols] : [spanSlot, spanSlot + 1],
  )
  const rest = pickSlots(
    Math.max(0, count - 1),
    layer,
    seed,
    open.filter((slot) => !blocked.has(slot)),
  )
  return [
    {
      slot: spanSlot,
      colSpan: vertical ? 1 : 2,
      rowSpan: vertical ? 2 : 1,
    },
    ...asSingle(rest),
  ]
}

const contentLayerCountFor = (total: number, perLayer: number) =>
  Math.ceil(total / perLayer)
const totalLayerCountFor = (total: number, perLayer: number) =>
  Math.max(contentLayerCountFor(total, perLayer), 6)

const namedPreset = (
  id: string | undefined,
): Exclude<FieldPreset, 'free'> | null => {
  if (
    id === 'selected' ||
    id === 'gallery' ||
    id === 'tall' ||
    id === 'columns' ||
    id === 'freeflow'
  ) {
    return id
  }
  return null
}

const props = defineProps<{
  items?: TunnelItem[]
  controls?: boolean
  modeToggle?: boolean
  startScroll?: number
  ratio?: CellRatio
  preset?: FieldPreset
  autoPlay?: boolean
}>()

const initialPreset = namedPreset(props.preset) ?? 'columns'
const initial = PRESETS[initialPreset]

const { imageUrl, getImageSrc } = useSanityImage()
const { isOpen } = useProductOverlay()
const { requestSave, items: pileItems, registerPileFly } = useBucket()

const rootEl = ref<HTMLElement | null>(null)
const rigEl = ref<HTMLElement | null>(null)
const layerEls: HTMLElement[] = []
const heldIds = new Set<string>()
const heldGhosts = new Map<string, HTMLImageElement>()
const holdTick = ref(0)
const showGuides = ref(false)
const showControls = ref(!!props.controls)
const showModeToggle = ref(false)
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
const layerGap = ref(initial.layerGap)
const cellGap = ref(initial.cellGap)

const layout = ref<GridLayout>(initial.layout)
const layoutOptions = (Object.keys(LAYOUTS) as GridLayout[]).map((id) => ({
  id,
  label: id,
}))
const ratio = ref<CellRatio>(
  props.ratio && props.ratio in RATIOS ? props.ratio : initial.ratio,
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
    : initial.startScroll,
)
const mode = ref<'control' | 'surrender'>(
  initialPreset === 'freeflow' ? 'surrender' : 'control',
)
const modeOptions = [
  { id: 'control', label: 'Control' },
  { id: 'surrender', label: 'Surrender' },
]

const autoAllowed = () =>
  !!props.autoPlay &&
  !pageEntering.value &&
  !pageLeaving.value &&
  !isOpen.value &&
  !prefersReducedMotion()

const noteTunnelIntent = (delta: number) => {
  if (delta < -0.5) autoHeld = true
  else if (delta > 0.5) autoHeld = false
}

const tickAuto = () => {
  if (!autoAllowed() || autoHeld) return
  targetScroll += CONFIG.autoTunnel
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
const itemsPerLayer = ref<LayerDensity>(initial.itemsPerLayer)
const densityOptions = DENSITY_VALUES.map((n) => ({ id: String(n), label: String(n) }))
const colSpanOn = ref(initial.colSpan)
const spanOptions = [
  { id: 'off', label: 'Off' },
  { id: 'on', label: '2 cells' },
]
const preset = ref<FieldPreset>(initialPreset)
const presetOptions = (Object.keys(PRESETS) as FieldPreset[]).map((id) => ({
  id,
  label: PRESETS[id].label,
}))
const shuffleSeed = ref(1)

const applyPreset = (id: string) => {
  const named = namedPreset(id)
  if (!named) {
    preset.value = 'free'
    return
  }
  const next = PRESETS[named]
  layout.value = next.layout
  ratio.value = next.ratio
  itemsPerLayer.value = next.itemsPerLayer
  setLayerGap(next.layerGap)
  cellGap.value = next.cellGap
  fadeFar.value = next.fadeFar
  nearCut.value = next.nearCut
  colSpanOn.value = next.colSpan
  setStartScroll(next.startScroll)
  preset.value = named
  if (named === 'columns') mode.value = 'control'
  if (named === 'freeflow') mode.value = 'surrender'
  shuffleSeed.value += 1
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
  if (event.key === 's' || event.key === 'S') {
    event.preventDefault()
    showModeToggle.value = !showModeToggle.value
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
  const next: Omit<TunnelCard, 'key' | 'left' | 'top' | 'slot' | 'colSpan' | 'rowSpan' | 'cellWidth' | 'cellHeight'>[] = []
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
      rows,
      colSpanOn.value,
    )
    const placed: TunnelCard[] = []
    for (let i = 0; i < places.length; i += 1) {
      const image = images[start + i]
      const place = places[i]
      if (!image || place == null) break
      const { x, y } = slotCenter(place.slot, cols, rows, width, height, gap)
      const cellWidth = place.colSpan * width + (place.colSpan - 1) * gap
      const cellHeight = place.rowSpan * height + (place.rowSpan - 1) * gap
      placed.push({
        ...image,
        slot: place.slot,
        colSpan: place.colSpan,
        rowSpan: place.rowSpan,
        cellWidth,
        cellHeight,
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
let autoHeld = false
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
  tickAuto()
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

const setMode = (id: string) => {
  const next = id === 'control' ? 'columns' : 'freeflow'
  if (preset.value === next) return
  applyPreset(next)
}

const onWheel = (event: WheelEvent) => {
  if (isOpen.value || pageEntering.value || pageLeaving.value || fromUi(event.target)) return
  event.preventDefault()
  noteTunnelIntent(event.deltaY)
  targetScroll += event.deltaY * CONFIG.scrollSpeed
}

const onTouchStart = (event: TouchEvent) => {
  if (isOpen.value || fromUi(event.target)) return
  const touch = event.touches[0]
  if (!touch) return
  pointerY = touch.clientY
}

const onTouchMove = (event: TouchEvent) => {
  if (isOpen.value || fromUi(event.target)) return
  const touch = event.touches[0]
  if (!touch) return
  const delta = pointerY - touch.clientY
  noteTunnelIntent(delta)
  targetScroll += delta * CONFIG.scrollSpeed
  pointerY = touch.clientY
  event.preventDefault()
}

const onItemPointerDown = (event: PointerEvent) => {
  if (event.button !== 0) return
  pointerDown = { x: event.clientX, y: event.clientY }
  pointerDragged = false
}

const onItemPointerMove = (event: PointerEvent) => {
  if (!pointerDown) return
  if (
    Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > CLICK_DRAG
  ) {
    pointerDragged = true
  }
}

const onItemPointerUp = () => {
  pointerDown = null
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
  void playPageEnter()
})

onUnmounted(() => {
  clipTween?.kill()
  clipTween = null
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

.d3-tunnel__backing {
  position: absolute;
  inset: 0;
  background-color: var(--background-color, var(--cream));
  opacity: 1;
  pointer-events: none;
}

.d3-tunnel__item img {
  position: relative;
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

.d3-tunnel--clear .d3-tunnel__item img {
  opacity: calc(1 - var(--fade, 0));
}

.d3-tunnel--clear .d3-tunnel__item--gathered,
.d3-tunnel--clear .d3-tunnel__item--gathered img {
  opacity: 0;
}
</style>
