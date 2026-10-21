<template>
  <section
    ref="rootEl"
    class="d4-tunnel"
    :class="{ 'd4-tunnel--clear': fieldBg === 'webgl' }"
    data-cursor="default"
    data-d4-gather
    aria-label="D4 tunnel"
    :style="{
      '--item-w': `${itemSize.width}px`,
      '--item-h': `${itemSize.height}px`,
    }"
  >
    <Teleport to="body">
    <div v-show="showControls" class="d4-tunnel__toggles">
      <SlidingPill
        label="Preset"
        :options="presetOptions"
        :model-value="preset"
        @update:model-value="applyPreset"
      />
      <SlidingPill
        label="Field mode"
        :options="modeOptions"
        :model-value="mode"
        @update:model-value="mode = $event === 'control' ? 'control' : 'surrender'"
      />
      <SlidingPill
        label="Backdrop"
        :options="fieldBgOptions"
        :model-value="fieldBg"
        @update:model-value="setFieldBg"
      />
      <SlidingPill
        label="Items per layer"
        :options="densityOptions"
        :model-value="String(itemsPerLayer)"
        @update:model-value="setItemsPerLayer"
      />
      <SlidingPill
        label="Row span"
        :options="spanOptions"
        :model-value="rowSpan ? 'on' : 'off'"
        @update:model-value="setRowSpan"
      />
      <SlidingPill
        label="Grid layout"
        :options="layoutOptions"
        :model-value="layout"
        @update:model-value="setLayout"
      />
      <SlidingPill
        label="Cell ratio"
        :options="ratioOptions"
        :model-value="ratio"
        @update:model-value="setRatio"
      />
      <div class="d4-tunnel__panel" data-cursor="default">
        <label class="d4-tunnel__control interface">
          <span>Gap</span>
          <input
            v-model.number="cellGap"
            type="range"
            :min="CONFIG.cellGapMin"
            :max="CONFIG.cellGapMax"
            :step="CONFIG.cellGapStep"
            aria-label="Cell gap"
          />
          <span class="d4-tunnel__control-value">{{ cellGap }}</span>
        </label>
        <label class="d4-tunnel__control interface">
          <span>Depth</span>
          <input
            v-model.number="fadeFar"
            type="range"
            :min="CONFIG.fadeFarMin"
            :max="CONFIG.fadeFarMax"
            :step="CONFIG.fadeFarStep"
            aria-label="Nest depth fade"
          />
          <span class="d4-tunnel__control-value">{{ fadeFar.toFixed(1) }}</span>
        </label>
        <label class="d4-tunnel__control interface">
          <span>Near</span>
          <input
            v-model.number="nearCut"
            type="range"
            :min="CONFIG.nearCutMin"
            :max="CONFIG.nearCutMax"
            :step="CONFIG.nearCutStep"
            aria-label="Foreground fade"
          />
          <span class="d4-tunnel__control-value">{{ nearCut.toFixed(2) }}</span>
        </label>
      </div>
    </div>
    </Teleport>
    <div ref="rigEl" class="d4-tunnel__rig">
      <div
        v-for="layer in layers"
        :key="layer.index"
        class="d4-tunnel__layer"
        :ref="(el) => setLayerEl(layer.index, el)"
      >
        <div
          v-if="showGuides"
          class="d4-tunnel__grid"
          aria-hidden="true"
        >
          <span
            v-for="guide in SLOT_GUIDES"
            :key="`slot-${guide.slot}`"
            class="d4-tunnel__grid-slot"
            :class="{ 'd4-tunnel__grid-slot--center': guide.center }"
            :style="{ left: guide.left, top: guide.top }"
          >
            <span class="d4-tunnel__grid-slot-label">{{ guide.slot }}</span>
          </span>
        </div>

        <button
          v-for="card in layer.cards"
          :key="card.key"
          type="button"
          class="d4-tunnel__item"
          :class="{
            'd4-tunnel__item--gathered': isGathered(card.frameId),
            'd4-tunnel__item--dragging': draggingId === card.frameId,
          }"
          :style="{
            left: card.left,
            top: card.top,
            width: `${card.cellWidth}px`,
            height: `${card.cellHeight}px`,
          }"
          data-cursor="add-selection"
          :aria-label="`Gather ${card.title}`"
          @pointerdown="onItemPointerDown(card, $event)"
          @click.stop.prevent="onGather(card, $event)"
        >
          <span class="d4-tunnel__backing" aria-hidden="true" />
          <img :src="card.src" :alt="card.title" draggable="false" />
          <span class="d4-tunnel__veil" aria-hidden="true" />
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
const DENSITY_VALUES = [1, 2, 3, 4] as const
type LayerDensity = (typeof DENSITY_VALUES)[number]
const RATIOS = {
  '1:1': { w: 1, h: 1 },
  '3:2': { w: 3, h: 2 },
  '2:3': { w: 2, h: 3 },
  '7:9': { w: 7, h: 9 },
  '9:11': { w: 9, h: 11 },
  '4:3': { w: 4, h: 3 },
} as const
type CellRatio = keyof typeof RATIOS
const ITEM_BASE = 240
const CONFIG = {
  scrollSpeed: 0.0022,
  lerp: 0.07,
  cellGap: 0,
  cellGapMin: 0,
  cellGapMax: 160,
  cellGapStep: 4,
  fit: 0.84,
  /** Start veiling as the layer fills the view. */
  exitHold: 0.04,
  /** Generations past full-size until the front layer is fully veiled. */
  nearCut: 0.45,
  nearCutMin: 0.1,
  nearCutMax: 1,
  nearCutStep: 0.05,
  /** Cream drop on the nest sitting in the centre cell. */
  nestVeil: 0.52,
  fadeFar: 4,
  fadeFarMin: 1,
  fadeFarMax: 8,
  fadeFarStep: 0.5,
}

/** North, east, south, west — the cross of a 3×3, centre and corners empty. */
const NESW_SLOTS = [1, 5, 7, 3]
/** Unused corners of a 3×3. Cross view moves one arm into one of these every third layer. */
const CROSS_CORNERS = [0, 2, 6, 8]
/** 3×2 squares: cells 1, 3, 4 and 6. The centre column stays empty. */
const CORNER_2X3_SLOTS = [0, 2, 3, 5]

const PRESETS = {
  free: { id: 'free', label: 'Free' },
  cross: {
    id: 'cross',
    label: 'Cross view',
    layout: '3×3' as const,
    ratio: '2:3' as const,
    cellGap: 104,
    fadeFar: 1,
    nearCut: 0.45,
    itemsPerLayer: 4 as LayerDensity,
    rowSpan: false,
    nestVeil: 0.82,
    fieldBg: 'webgl' as const,
  },
  wide: {
    id: 'wide',
    label: 'Wide',
    layout: '2×5' as const,
    ratio: '3:2' as const,
    cellGap: 0,
    fadeFar: 1,
    nearCut: 0.45,
    itemsPerLayer: 3 as LayerDensity,
    rowSpan: true,
  },
  squares: {
    id: 'squares',
    label: 'Squares',
    layout: '2×5' as const,
    ratio: '1:1' as const,
    cellGap: 0,
    fadeFar: 1,
    nearCut: 1,
    itemsPerLayer: 4 as LayerDensity,
    rowSpan: false,
  },
  spacial: {
    id: 'spacial',
    label: 'Spacial',
    layout: '2×5' as const,
    ratio: '4:3' as const,
    cellGap: 0,
    fadeFar: 1,
    nearCut: 0.45,
    itemsPerLayer: 4 as LayerDensity,
    rowSpan: true,
    fieldBg: 'webgl' as const,
  },
} as const
type FieldPreset = keyof typeof PRESETS

type SlotPlace = {
  slot: number
  rowSpan: 1 | 2
}

const openSlotsFor = (layout: GridLayout, cols: number, rows: number) => {
  if (layout === '3×3') return [...NESW_SLOTS]
  if (layout === '2×3') return [...CORNER_2X3_SLOTS]
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

const slotsForCrossLayer = (layer: number, seed: number) => {
  const slots = [...NESW_SLOTS]
  if ((layer + 1) % 3 !== 0) return slots
  const rand = mulberry32(seed * 1009 + layer * 9176 + 7)
  const move = Math.floor(rand() * slots.length)
  slots[move] = CROSS_CORNERS[Math.floor(rand() * CROSS_CORNERS.length)]!
  return slots
}

const slotsForLayer = (
  layout: GridLayout,
  layer: number,
  count: number,
  seed: number,
  openSlots: number[],
) => {
  if (layout === '3×3') return NESW_SLOTS.slice(0, count)
  if (layout === '2×3') return CORNER_2X3_SLOTS.slice(0, count)
  return pickSlots(count, layer, seed, openSlots)
}

const placesForLayer = (
  layout: GridLayout,
  layer: number,
  count: number,
  seed: number,
  open: number[],
  cols: number,
  rows: number,
  span: boolean,
): SlotPlace[] => {
  const asSingle = (slots: number[]): SlotPlace[] =>
    slots.map((slot) => ({ slot, rowSpan: 1 }))
  if (!span || rows < 2 || count < 1) {
    return asSingle(slotsForLayer(layout, layer, count, seed, open))
  }
  const spannable = open.filter((slot) => {
    const row = Math.floor(slot / cols)
    return row + 1 < rows && open.includes(slot + cols)
  })
  if (!spannable.length) {
    return asSingle(slotsForLayer(layout, layer, count, seed, open))
  }
  const rand = mulberry32(seed * 1009 + layer * 9176 + 31)
  const spanSlot = spannable[Math.floor(rand() * spannable.length)]!
  const blocked = new Set([spanSlot, spanSlot + cols])
  const rest = pickSlots(
    Math.max(0, count - 1),
    layer,
    seed,
    open.filter((slot) => !blocked.has(slot)),
  )
  return [{ slot: spanSlot, rowSpan: 2 }, ...asSingle(rest)]
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

const contentLayerCountFor = (total: number, perLayer: number) =>
  Math.ceil(total / perLayer)
const totalLayerCountFor = (total: number, perLayer: number) =>
  Math.max(contentLayerCountFor(total, perLayer), 8)

const props = defineProps<{
  items?: TunnelItem[]
}>()

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
const showControls = ref(false)
/** Nest levels until deeper cards are fully veiled. `,` / `.` */
const fadeFar = ref(CONFIG.fadeFar)
/** Generations past full-size until the front layer is gone. `;` / `'` */
const nearCut = ref(CONFIG.nearCut)
const nestVeil = ref(CONFIG.nestVeil)
const mode = ref<'control' | 'surrender'>('surrender')
const modeOptions = [
  { id: 'control', label: 'Control' },
  { id: 'surrender', label: 'Surrender' },
]
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
  document.body.classList.toggle('d4-clear', fieldBg.value === 'webgl')
}
watch(fieldBg, syncFieldBgClass)
const preset = ref<FieldPreset>('free')
const presetOptions = (Object.keys(PRESETS) as FieldPreset[]).map((id) => ({
  id,
  label: PRESETS[id].label,
}))
const itemsPerLayer = ref<LayerDensity>(4)
const densityOptions = DENSITY_VALUES.map((n) => ({ id: String(n), label: String(n) }))
const rowSpan = ref(false)
const spanOptions = [
  { id: 'off', label: 'Off' },
  { id: 'on', label: '2 cells' },
]
const layout = ref<GridLayout>('2×3')
const layoutOptions = (Object.keys(LAYOUTS) as GridLayout[]).map((id) => ({
  id,
  label: id,
}))
const ratio = ref<CellRatio>('1:1')
const ratioOptions = (Object.keys(RATIOS) as CellRatio[]).map((id) => ({
  id,
  label: id,
}))
const cellGap = ref(CONFIG.cellGap)
const shuffleSeed = ref(1)

const grid = computed(() => LAYOUTS[layout.value])
const itemSize = computed(() => {
  const { w, h } = RATIOS[ratio.value]
  return {
    width: ITEM_BASE,
    height: Math.round((ITEM_BASE * h) / w),
  }
})
const openSlots = computed(() => openSlotsFor(layout.value, grid.value.cols, grid.value.rows))

const gridSize = computed(() => {
  const { cols, rows } = grid.value
  const { width, height } = itemSize.value
  const gap = cellGap.value
  return {
    width: cols * width + (cols - 1) * gap,
    height: rows * height + (rows - 1) * gap,
  }
})

const nestScale = () => {
  const { width, height } = itemSize.value
  const { width: gridW, height: gridH } = gridSize.value
  if (gridW <= 0 || gridH <= 0) return 1 / grid.value.cols
  // 3×2: the next layer is one cell wide and sits on the vertical middle.
  if (layout.value === '2×3') return width / gridW
  return Math.min(width / gridW, height / gridH)
}

const SLOT_GUIDES = computed(() => {
  const { cols, rows } = grid.value
  const { width, height } = itemSize.value
  const gap = cellGap.value
  const open = new Set(openSlots.value)
  return Array.from({ length: cols * rows }, (_, slot) => {
    const { x, y } = slotCenter(slot, cols, rows, width, height, gap)
    return {
      slot,
      center: !open.has(slot),
      left: `${x - width / 2}px`,
      top: `${y - height / 2}px`,
    }
  })
})

const applyPreset = (id: string) => {
  if (id === 'cross' || id === 'wide' || id === 'squares' || id === 'spacial') {
    const next = PRESETS[id]
    layout.value = next.layout
    ratio.value = next.ratio
    cellGap.value = next.cellGap
    fadeFar.value = next.fadeFar
    nearCut.value = next.nearCut
    itemsPerLayer.value = next.itemsPerLayer
    rowSpan.value = next.rowSpan
    nestVeil.value = 'nestVeil' in next ? next.nestVeil : CONFIG.nestVeil
    if ('fieldBg' in next) fieldBg.value = next.fieldBg
    preset.value = id
    shuffleSeed.value += 1
    return
  }
  preset.value = 'free'
}

const setRowSpan = (id: string) => {
  rowSpan.value = id === 'on'
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
  if (next !== 1 && next !== 2 && next !== 3 && next !== 4) return
  if (next === itemsPerLayer.value) return
  itemsPerLayer.value = next
  preset.value = 'free'
  shuffleSeed.value += 1
}
const offsets = reactive<Record<string, { x: number; y: number }>>({})
let flights = 0

type ItemDrag = {
  pointerId: number
  productId: string
  startX: number
  startY: number
  originX: number
  originY: number
  scaleX: number
  scaleY: number
}

const draggingId = ref('')
let drag: ItemDrag | null = null

const fromTypingField = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    !!target.closest('input, textarea, select, [contenteditable="true"]'))

const onKeyDown = (event: KeyboardEvent) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  if (fromTypingField(event.target)) return
  if (event.key === 'g' || event.key === 'G') {
    event.preventDefault()
    showGuides.value = !showGuides.value
    return
  }
  if (event.key === 'c' || event.key === 'C') {
    event.preventDefault()
    showControls.value = !showControls.value
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
  const next: Omit<TunnelCard, 'key' | 'left' | 'top' | 'slot' | 'rowSpan' | 'cellWidth' | 'cellHeight'>[] = []
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
  const cross = preset.value === 'cross'
  const contentLayers = contentLayerCountFor(total, cross ? 4 : perLayer)
  const count = totalLayerCountFor(total, cross ? 4 : perLayer)
  const { cols, rows } = grid.value
  const { width, height } = itemSize.value
  const gap = cellGap.value
  const span = rowSpan.value && !cross
  let cursor = 0
  return Array.from({ length: count }, (_, index) => {
    const places = cross
      ? slotsForCrossLayer(index, seed).map((slot) => ({ slot, rowSpan: 1 as const }))
      : placesForLayer(
          layout.value,
          index,
          perLayer,
          seed,
          openSlots.value,
          cols,
          rows,
          span,
        )
    const placed: TunnelCard[] = []
    const sourceIndex = index % contentLayers
    const start = sourceIndex * perLayer
    for (let i = 0; i < places.length; i += 1) {
      const image = cross ? images[cursor % total] : images[start + i]
      if (cross) cursor += 1
      const place = places[i]
      if (!image || place == null) break
      const { x, y } = slotCenter(place.slot, cols, rows, width, height, gap)
      const offset = offsets[image.frameId]
      const cellHeight = place.rowSpan * height + (place.rowSpan - 1) * gap
      placed.push({
        ...image,
        slot: place.slot,
        rowSpan: place.rowSpan,
        cellWidth: width,
        cellHeight,
        key: `${index}-${image.frameId}-${place.slot}`,
        left: `${x - width / 2 + (offset?.x || 0)}px`,
        top: `${y - height / 2 + (offset?.y || 0)}px`,
      })
    }
    return { index, cards: placed }
  })
})

const setLayerEl = (index: number, el: unknown) => {
  if (el instanceof HTMLElement) layerEls[index] = el
  else if (!el) delete layerEls[index]
}

const layerCount = () => {
  const total = cards.value.length
  if (!total) return 0
  return totalLayerCountFor(total, itemsPerLayer.value)
}

/**
 * Generations behind the frame. 0 fills the view, 1 sits one nest in,
 * and so on. Negative is the ring leaving the edges. Two generations of
 * exit keeps a layer on screen after it outgrows the frame.
 */
const EXIT_SPAN = 2

const behindFor = (index: number, generation: number, count: number) => {
  const shifted = index - generation + EXIT_SPAN
  return ((shifted % count) + count) % count - EXIT_SPAN
}

const CLICK_DRAG = 6

let targetGen = 0
let currentGen = 0
let pointerY = 0
let pointerDown: { x: number; y: number } | null = null
let pointerDragged = false
let tickerOn = false

const frameScale = () => {
  const root = rootEl.value
  if (!root) return 1
  const rect = root.getBoundingClientRect()
  if (rect.width < 2 || rect.height < 2) return 1
  const { width, height } = gridSize.value
  return CONFIG.fit * Math.min(rect.width / width, rect.height / height)
}

const overlayFor = (behind: number) => {
  if (behind <= CONFIG.exitHold) {
    const span = Math.max(nearCut.value, CONFIG.nearCutMin)
    const travel = CONFIG.exitHold - behind
    if (travel >= span) return 1
    return travel / span
  }
  const first = nestVeil.value
  if (behind <= 1) return first * behind
  const far = Math.max(fadeFar.value, 1)
  if (behind >= far) return 1
  const t = (behind - 1) / (far - 1)
  return first + (1 - first) * t * t
}

const step = () => {
  const list = layers.value
  const count = layerCount()
  currentGen += (targetGen - currentGen) * CONFIG.lerp
  if (!count) return
  const fit = frameScale()
  list.forEach((layer, index) => {
    const el = layerEls[index]
    if (!el) return
    const behind = behindFor(index, currentGen, count)
    const scale = fit * nestScale() ** behind
    const overlay = Math.min(1, Math.max(0, overlayFor(behind)))
    const webgl = fieldBg.value === 'webgl'
    gsap.set(el, {
      scale,
      zIndex: Math.round((behind < 0 ? 12 - behind : behind + 2) * 100),
      '--overlay': webgl ? 0 : overlay,
      '--fade': overlay,
      visibility: scale < 0.012 || behind <= -EXIT_SPAN + 0.05 ? 'hidden' : 'visible',
      force3D: true,
    })
  })
}

const fromUi = (target: EventTarget | null) =>
  target instanceof Element &&
  !!target.closest('.header, .bucket, .product-overlay, .d4-tunnel__toggles')

const onWheel = (event: WheelEvent) => {
  if (isOpen.value || fromUi(event.target)) return
  event.preventDefault()
  targetGen += event.deltaY * CONFIG.scrollSpeed
}

const onTouchStart = (event: TouchEvent) => {
  if (isOpen.value || fromUi(event.target) || drag) return
  const touch = event.touches[0]
  if (!touch) return
  pointerY = touch.clientY
}

const onTouchMove = (event: TouchEvent) => {
  if (drag) {
    event.preventDefault()
    return
  }
  if (isOpen.value || fromUi(event.target)) return
  const touch = event.touches[0]
  if (!touch) return
  targetGen += (pointerY - touch.clientY) * CONFIG.scrollSpeed
  pointerY = touch.clientY
  event.preventDefault()
}

const onItemPointerDown = (card: TunnelCard, event: PointerEvent) => {
  if (event.button !== 0) return
  const el = event.currentTarget
  if (!(el instanceof HTMLElement)) return
  event.preventDefault()
  pointerDown = { x: event.clientX, y: event.clientY }
  pointerDragged = false
  const rect = el.getBoundingClientRect()
  const current = offsets[card.frameId] || { x: 0, y: 0 }
  drag = {
    pointerId: event.pointerId,
    productId: card.frameId,
    startX: event.clientX,
    startY: event.clientY,
    originX: current.x,
    originY: current.y,
    scaleX: rect.width / card.cellWidth || 1,
    scaleY: rect.height / card.cellHeight || 1,
  }
  draggingId.value = card.frameId
  el.setPointerCapture?.(event.pointerId)
}

const moveDrag = (event: PointerEvent) => {
  if (!drag || event.pointerId !== drag.pointerId) return
  const dx = (event.clientX - drag.startX) / drag.scaleX
  const dy = (event.clientY - drag.startY) / drag.scaleY
  if (!pointerDragged && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > CLICK_DRAG) {
    pointerDragged = true
  }
  if (!pointerDragged) return
  offsets[drag.productId] = {
    x: drag.originX + dx,
    y: drag.originY + dy,
  }
}

const endDrag = (event?: PointerEvent) => {
  if (event && drag && event.pointerId !== drag.pointerId) return
  drag = null
  draggingId.value = ''
  pointerDown = null
}

const onItemPointerMove = (event: PointerEvent) => {
  if (drag) {
    moveDrag(event)
    return
  }
  if (!pointerDown) return
  if (
    Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > CLICK_DRAG
  ) {
    pointerDragged = true
  }
}

const onItemPointerUp = (event: PointerEvent) => {
  endDrag(event)
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
})

onUnmounted(() => {
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
  document.body.classList.remove('d4-clear')
})
</script>

<style scoped>
.d4-tunnel {
  position: fixed;
  inset: 0;
  background: var(--cream);
  overflow: hidden;
}

.d4-tunnel--clear {
  background: transparent;
}

.d4-tunnel__toggles {
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

.d4-tunnel__panel {
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

.d4-tunnel__control {
  display: grid;
  grid-template-columns: 3.2rem 1fr 2.6rem;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: var(--charcoal);
  font-size: var(--text-sm);
}

.d4-tunnel__control input {
  width: 100%;
  margin: 0;
  accent-color: var(--charcoal);
  cursor: pointer;
}

.d4-tunnel__control-value {
  min-width: 2.6rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.d4-tunnel__rig {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
}

.d4-tunnel__layer {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
  visibility: hidden;
}

.d4-tunnel__grid {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  pointer-events: none;
  z-index: 0;
}

.d4-tunnel__grid-slot {
  position: absolute;
  width: var(--item-w, 180px);
  height: var(--item-h, 240px);
  aspect-ratio: auto;
  box-sizing: border-box;
  border: 1px solid color-mix(in srgb, var(--charcoal) 55%, transparent);
  background: color-mix(in srgb, var(--charcoal) 6%, transparent);
}

.d4-tunnel__grid-slot--center {
  border-style: dashed;
  background: transparent;
}

.d4-tunnel__grid-slot-label {
  position: absolute;
  top: 6px;
  left: 8px;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: color-mix(in srgb, var(--charcoal) 70%, transparent);
}

.d4-tunnel__item {
  position: absolute;
  z-index: 1;
  width: var(--item-w, 180px);
  height: var(--item-h, 240px);
  aspect-ratio: auto;
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
}

.d4-tunnel__item--dragging {
  z-index: 3;
}

.d4-tunnel__item--gathered {
  opacity: 0;
  pointer-events: none;
}

.d4-tunnel__backing {
  position: absolute;
  inset: 0;
  background-color: var(--background-color, var(--cream));
  opacity: 1;
  pointer-events: none;
}

.d4-tunnel__item img {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  object-fit: cover;
  pointer-events: none;
}

.d4-tunnel__veil {
  position: absolute;
  inset: 0;
  background: var(--cream);
  opacity: var(--overlay, 0);
  pointer-events: none;
}

.d4-tunnel--clear .d4-tunnel__veil {
  background: transparent;
  opacity: 0;
}

.d4-tunnel--clear .d4-tunnel__item img {
  opacity: calc(1 - var(--fade, 0));
}

.d4-tunnel--clear .d4-tunnel__item--gathered,
.d4-tunnel--clear .d4-tunnel__item--gathered img {
  opacity: 0;
}
</style>
