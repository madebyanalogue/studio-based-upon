<template>
  <section
    ref="rootEl"
    class="d3-tunnel"
    data-cursor="default"
    data-d3-gather
    aria-label="D3 tunnel"
    :style="{
      '--item-w': `${CONFIG.itemWidth}px`,
      '--item-h': `${CONFIG.itemHeight}px`,
    }"
  >
    <div class="d3-tunnel__toggles">
      <SlidingPill
        label="Field mode"
        :options="modeOptions"
        :model-value="mode"
        @update:model-value="mode = $event === 'control' ? 'control' : 'surrender'"
      />
      <div class="d3-tunnel__panel" data-cursor="default">
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
      </div>
    </div>
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
          :style="{ '--orbit': `${CONFIG.orbit}px` }"
        >
          <span class="d3-tunnel__grid-ring" />
          <span
            v-for="guide in SLOT_GUIDES"
            :key="`ray-${guide.slot}`"
            class="d3-tunnel__grid-ray"
            :style="{ transform: `rotate(${guide.deg - 90}deg)` }"
          />
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
            'd3-tunnel__item--gathered': isGathered(card.productId),
            'd3-tunnel__item--dragging': draggingId === card.productId,
          }"
          :style="{ left: card.left, top: card.top }"
          data-cursor="add-selection"
          :aria-label="`Gather ${card.title}`"
          @pointerdown="onItemPointerDown(card, $event)"
          @click.stop.prevent="onGather(card, $event)"
        >
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
import { productIdFromBucketId } from '~/composables/useBucket'

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
  left: string
  top: string
  slot: number
}

const SLOTS = 8
const FILLED_SLOTS = [4, 5]
const ITEMS_PER_LAYER = FILLED_SLOTS.length
const PAIR_GAP = 5
const CONFIG = {
  scrollSpeed: 2.4,
  layerGap: 600,
  layerGapMin: 600,
  layerGapMax: 4000,
  layerGapStep: 200,
  lerp: 0.08,
  itemWidth: 180,
  itemHeight: 240,
  orbit: 380,
  lookEnabled: false,
  lookTilt: 14,
  lookShift: 56,
  lookLerp: 0.1,
  fadeFar: 3,
  fadeFarMin: 1,
  fadeFarMax: 10,
  fadeFarStep: 0.5,
  nearCut: 1500,
  nearCutMin: 200,
  nearCutMax: 2500,
  nearCutStep: 150,
}

const slotCenter = (slot: number) => {
  const angle = (slot / SLOTS) * Math.PI * 2 - Math.PI / 2
  let x = Math.cos(angle) * CONFIG.orbit
  let y = Math.sin(angle) * CONFIG.orbit
  // 5 sits 5px to the right of 6; 4 sits 5px to the left of 2.
  if (slot === 5) {
    const left = slotCenter(6)
    x = left.x + CONFIG.itemWidth + PAIR_GAP
    y = left.y
  } else if (slot === 4) {
    const right = slotCenter(2)
    x = right.x - CONFIG.itemWidth - PAIR_GAP
    y = right.y
  }
  const ray = Math.atan2(y, x)
  return {
    angle: ray,
    deg: (ray * 180) / Math.PI,
    x,
    y,
  }
}

const SLOT_GUIDES = Array.from({ length: SLOTS }, (_, slot) => {
  const { deg, x, y } = slotCenter(slot)
  return {
    slot,
    deg,
    left: `${x - CONFIG.itemWidth / 2}px`,
    top: `${y - CONFIG.itemHeight / 2}px`,
  }
})

const contentLayerCountFor = (total: number) => Math.ceil(total / ITEMS_PER_LAYER)
const totalLayerCountFor = (total: number) => Math.max(contentLayerCountFor(total), 6)

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
const layerGap = ref(CONFIG.layerGap)
/** How many layer-gaps until distant cards are fully veiled. `,` / `.` */
const fadeFar = ref(CONFIG.fadeFar)
/** Close-up cards stay solid until this z, then cut. `;` / `'`. */
const nearCut = ref(CONFIG.nearCut)
const mode = ref<'control' | 'surrender'>('surrender')
const modeOptions = [
  { id: 'control', label: 'Control' },
  { id: 'surrender', label: 'Surrender' },
]
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

const onKeyDown = (event: KeyboardEvent) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  if (fromTypingField(event.target)) return
  if (event.key === 'g' || event.key === 'G') {
    event.preventDefault()
    showGuides.value = !showGuides.value
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

const cards = computed(() => {
  const next: Omit<TunnelCard, 'key' | 'left' | 'top' | 'slot'>[] = []
  for (const item of props.items || []) {
    const slug = productSlug(item) || (typeof item.slug === 'string' ? item.slug : item.slug?.current) || item._id
    if (!slug) continue
    const cover = productCoverFrame(item)
    const src = (cover ? imageUrl(cover, 900) : '') || (cover?.asset ? getImageSrc(cover.asset) : '')
    if (!src) continue
    const frames = productGalleryFrames(item)
    const imageUrls = galleryFromAssets(frames, (source) => imageUrl(source, 1600) || '').filter(Boolean)
    next.push({
      src,
      title: item.title || 'Untitled',
      slug,
      productId: item._id,
      itemType: item.category || item.type || 'Work',
      link: productPath(item),
      imageUrls: imageUrls.length ? imageUrls : [src],
    })
  }
  return next
})

const gatheredIds = computed(() => {
  const ids = new Set<string>()
  for (const item of pileItems.value) ids.add(productIdFromBucketId(item.id))
  return ids
})

const isGathered = (productId: string) => {
  void holdTick.value
  return gatheredIds.value.has(productId) && !heldIds.has(productId)
}

const layers = computed(() => {
  const images = cards.value
  const total = images.length
  if (!total) return []
  const contentLayers = contentLayerCountFor(total)
  const count = totalLayerCountFor(total)
  return Array.from({ length: count }, (_, index) => {
    const start = (index % contentLayers) * ITEMS_PER_LAYER
    const placed: TunnelCard[] = []
    for (let i = 0; i < FILLED_SLOTS.length; i += 1) {
      const slot = FILLED_SLOTS[i]
      const image = images[start + i]
      if (!image) break
      const { x, y } = slotCenter(slot)
      const offset = offsets[image.productId]
      placed.push({
        ...image,
        slot,
        key: `${index}-${image.productId}-${slot}`,
        left: `${x - CONFIG.itemWidth / 2 + (offset?.x || 0)}px`,
        top: `${y - CONFIG.itemHeight / 2 + (offset?.y || 0)}px`,
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
  return totalLayerCountFor(total) * gap
}

const exitPoint = 1500
const initialScroll = 3000
const CLICK_DRAG = 6

let targetScroll = initialScroll
let currentScroll = initialScroll
let pointerY = 0
let pointerDown: { x: number; y: number } | null = null
let pointerDragged = false
let tickerOn = false
const lookTarget = { x: 0, y: 0 }
const lookCurrent = { x: 0, y: 0 }

const overlayFor = (z: number) => {
  const visibleDepth = fadeFar.value * layerGap.value
  if (z > nearCut.value) return 1
  if (z > 0) return 0
  if (z > -visibleDepth) {
    const progress = Math.abs(z) / visibleDepth
    return progress * progress
  }
  return 1
}

const step = () => {
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
    gsap.set(el, {
      z,
      '--overlay': overlay,
      visibility: overlay >= 1 ? 'hidden' : 'visible',
    })
  })
}

const fromUi = (target: EventTarget | null) =>
  target instanceof Element &&
  !!target.closest('.header, .bucket, .product-overlay')

const onWheel = (event: WheelEvent) => {
  if (isOpen.value || fromUi(event.target)) return
  event.preventDefault()
  targetScroll += event.deltaY * CONFIG.scrollSpeed
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
  targetScroll += (pointerY - touch.clientY) * CONFIG.scrollSpeed
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
  const current = offsets[card.productId] || { x: 0, y: 0 }
  drag = {
    pointerId: event.pointerId,
    productId: card.productId,
    startX: event.clientX,
    startY: event.clientY,
    originX: current.x,
    originY: current.y,
    scaleX: rect.width / CONFIG.itemWidth || 1,
    scaleY: rect.height / CONFIG.itemHeight || 1,
  }
  draggingId.value = card.productId
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
    const id = itemId ? productIdFromBucketId(itemId) : heldIds.values().next().value
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
  if (gatheredIds.value.has(card.productId) || heldIds.has(card.productId)) return
  const source =
    (event.currentTarget instanceof HTMLElement &&
      event.currentTarget.querySelector<HTMLElement>('img')) ||
    (event.currentTarget instanceof HTMLElement ? event.currentTarget : null)
  if (!source) return
  const rect = source.getBoundingClientRect()
  if (rect.width < 2 || rect.height < 2) return

  heldIds.add(card.productId)
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
  heldGhosts.set(card.productId, ghost)

  const flying = requestSave(
    {
      id: card.productId,
      title: card.title,
      imageUrl: card.src,
      itemType: card.itemType,
      link: card.link,
      imageUrls: card.imageUrls,
    },
    { source: ghost },
  )
  if (flying) return
  flights = Math.max(0, flights - 1)
  releaseHold(card.productId)
}

onMounted(() => {
  if (!tickerOn) {
    gsap.ticker.add(step)
    tickerOn = true
  }
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

.d3-tunnel__toggles {
  position: fixed;
  left: 50%;
  bottom: calc(60px + var(--bucket-push, 0px));
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  transform: translateX(-50%);
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

.d3-tunnel__grid-ring {
  position: absolute;
  left: 0;
  top: 0;
  width: calc(var(--orbit, 420px) * 2);
  height: calc(var(--orbit, 420px) * 2);
  margin-left: calc(var(--orbit, 420px) * -1);
  margin-top: calc(var(--orbit, 420px) * -1);
  border: 1px dashed color-mix(in srgb, var(--charcoal) 45%, transparent);
  border-radius: 50%;
  box-sizing: border-box;
}

.d3-tunnel__grid-ray {
  position: absolute;
  left: 0;
  top: 0;
  width: 1px;
  height: var(--orbit, 420px);
  margin-left: -0.5px;
  transform-origin: 50% 0;
  background: color-mix(in srgb, var(--charcoal) 28%, transparent);
}

.d3-tunnel__grid-slot {
  position: absolute;
  width: var(--item-w, 180px);
  height: var(--item-h, 240px);
  aspect-ratio: 3 / 4;
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
  aspect-ratio: 3 / 4;
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

.d3-tunnel__item--dragging {
  z-index: 3;
}

.d3-tunnel__item--gathered {
  opacity: 0;
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
</style>
