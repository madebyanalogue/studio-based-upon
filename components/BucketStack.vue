<template>
  <Teleport to="body">
    <div
      v-if="!isMoodboard"
      class="stack"
      :class="{
        'stack--open': isOpen || stagePresent,
        'stack--flipping': isFlipping,
        'stack--soft-enter': softEnter,
        'stack--cells-ready': cellsReady,
      }"
      :style="stackCssVars"
      :aria-hidden="isOpen || stagePresent ? 'false' : 'true'"
    >
      <!-- Collapsed pile (bottom-left) -->
      <button
        v-if="showPile"
        ref="pileRef"
        type="button"
        class="stack__pile"
        :class="{ 'stack__pile--fanned': pileFanned }"
        :aria-label="`Open selection, ${settledItems.length} items`"
        @mouseenter="onPileMouseEnter"
        @mouseleave="onPileMouseLeave"
        @click="openFromPile"
      >
        <span
          v-for="(item, index) in pilePreview"
          :key="item.id"
          class="stack__pile-card stack__pile-card--fan"
          :data-flip-id="flipSurface === 'pile' ? item.id : undefined"
          :style="pileCardStyle(item.id, index, pilePreview.length)"
        >
          <img
            v-if="item.imageUrl"
            :src="item.imageUrl"
            :alt="item.title"
            class="stack__pile-image"
            draggable="false"
          />
        </span>
        <span
          v-if="false && settledItems.length"
          class="stack__pile-tip"
          :class="{ 'stack__pile-tip--visible': pileFanned && pileCountVisible }"
        >
          {{ activeMoodboard?.name || 'My Selection' }} — {{ settledItems.length }}
        </span>
      </button>

      <!-- Expanded fullscreen -->
      <div
        class="stack__stage"
        :class="{ 'stack__stage--visible': stageVisible }"
        role="dialog"
        aria-modal="true"
        aria-label="My selection"
      >
        <div class="stack__backdrop" @click="requestClose" />

        <!-- Cell shells always stay in flow (squares). Only .stack__cell-media Flips. -->
        <div
          v-if="showSelectionGrid"
          ref="gridRef"
          class="stack__grid"
          :class="{ 'stack__grid--lines': gridLinesVisible }"
          :style="gridStyle"
          data-lenis-prevent
        >
          <div
            v-for="(entry, index) in selectionEntries"
            :key="entry.kind === 'undo' ? `undo-${entry.key}` : entry.item.id"
            class="stack__cell"
            :class="cellClass(entry)"
            :style="softEnter ? softEnterStyle(index) : undefined"
          >
            <div
              v-if="entry.kind === 'undo'"
              class="stack__cell-media stack__cell-media--undo"
            >
              <div class="stack__cell-frame">
                <button
                  type="button"
                  class="stack__undo interface"
                  @click="onUndoClick(entry.key, entry.item)"
                >
                  Undo
                </button>
              </div>
            </div>
            <div
              v-else
              class="stack__cell-media"
              :data-flip-id="flipSurface === 'cells' ? entry.item.id : undefined"
            >
              <div class="stack__cell-frame">
                <div class="stack__cell-figure">
                  <button
                    type="button"
                    class="stack__cell-hit"
                    :aria-label="`Open ${entry.item.title}`"
                    @click="openProduct(entry.item, $event)"
                  >
                    <img
                      v-if="entry.item.imageUrl"
                      :src="entry.item.imageUrl"
                      :alt="entry.item.title"
                      class="stack__cell-image"
                    />
                  </button>
                  <AddButton
                    v-if="galleryCount(entry.item) > 1"
                    class="stack__cell-ctrl stack__cell-ctrl--clone"
                    variant="clone"
                    :label="`Clone ${entry.item.title}`"
                    @click.stop="cloneItem(entry.item.id)"
                  />
                  <AddButton
                    class="stack__cell-ctrl stack__cell-ctrl--remove"
                    variant="remove"
                    :label="`Remove ${entry.item.title}`"
                    @click.stop="onRemoveClick(entry.item)"
                  />
                  <ImageCycleArrows
                    v-if="galleryCount(entry.item) > 1"
                    class="stack__cell-ctrl stack__cell-ctrl--cycle"
                    :index="galleryIndex(entry.item)"
                    :count="galleryCount(entry.item)"
                    hide-count
                    boxed
                    @prev="cycleItemImage(entry.item.id, -1)"
                    @next="cycleItemImage(entry.item.id, 1)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Boards panel hidden until further notice (also avoided flash during stage prelude) -->
      </div>

      <!-- Sibling of stage/pile so z-index can sit above flipping cards -->
      <aside
        class="stack__controls"
        :class="{ 'stack__controls--visible': controlsVisible }"
        aria-label="Selection actions"
      >
        <div class="stack__controls-head">
          <input
            v-if="isEditing"
            ref="titleInput"
            v-model="editName"
            type="text"
            class="stack__title-input"
            aria-label="Selection name"
            @keydown.enter.prevent="saveName"
            @keydown.esc.prevent="cancelEdit"
            @blur="saveName"
          />
          <p v-else class="stack__title">
            {{ activeMoodboard?.name || 'My Selection' }}
          </p>
          <button
            type="button"
            class="stack__close"
            aria-label="Close selection"
            @click="requestClose"
          >
            <span class="stack__close-icon" aria-hidden="true" />
          </button>
        </div>

        <p class="stack__count interface">
          {{ countLabel }}
        </p>

        <div class="stack__control-links">
          <button type="button" class="stack__link interface" @click="startEdit">
            Rename
          </button>
          <button
            v-if="activePendingRemovals.length && !items.length"
            type="button"
            class="stack__link interface"
            :disabled="bulkBusy"
            @click="onUndoAll"
          >
            Undo
          </button>
          <button
            v-else
            type="button"
            class="stack__link interface"
            :disabled="!items.length || bulkBusy"
            @click="onClearAll"
          >
            Clear all
          </button>
        </div>

        <button
          type="button"
          class="btn"
          :disabled="!items.length"
          @click="sendEnquiry"
        >
          Send as enquiry
        </button>
        <button
          type="button"
          class="btn btn--filled"
          :disabled="!items.length"
          @click="onBuildMoodboard"
        >
          Create Board
        </button>
      </aside>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import type { BucketItem, SelectionEntry } from '~/composables/useBucket'
import { productIdFromBucketId } from '~/composables/useBucket'
import { uniqueImageUrls } from '~/composables/productImages'
import { imageAssetKey, prefetchImage } from '~/composables/useSanityImage'

type CellPhase = 'scale-out' | 'scale-in' | 'scaled-in' | 'undo-ready' | 'undo-leaving'

const {
  items,
  selectionEntries,
  activePendingRemovals,
  count,
  isOpen,
  panelTab,
  isMoodboard,
  activeMoodboard,
  activeMoodboardId,
  dismissDrawer,
  registerAnimatedClose,
  openDrawer,
  openMoodboard,
  renameMoodboard,
  removeItem,
  removeItems,
  undoRemove,
  undoAllRemovals,
  clearPendingRemovals,
  cloneItem,
  cycleItemImage,
  setItemImageIndex,
  pendingFly,
  consumePendingFly,
} = useBucket()
const { initFromBucket, snapshot } = useMoodboard()
const { createBoard } = useBoards()
const { openFromBucket } = useEnquiryForm()
const { open, returnImage } = useProductOverlay()

const gridRef = ref<HTMLElement | null>(null)
const pileRef = ref<HTMLElement | null>(null)
const titleInput = ref<HTMLInputElement | null>(null)
const isEditing = ref(false)
const editName = ref('')
const pileAnchor = ref<DOMRect | null>(null)
/** Item ids mid fly-in — hidden from the pile until the flyer lands. */
const arrivingIds = ref<string[]>([])
const isFlipping = ref(false)
/** Stage DOM mounted (grid stays until fade-out finishes). */
const stagePresent = ref(false)
/** CSS fade class — toggled after mount / before unmount so opacity can transition. */
const stageVisible = ref(false)
/** Grid borders — shown only after items land (open), hidden before they leave (close). */
const gridLinesVisible = ref(false)
/** Controls fade independently — out earlier than the backdrop on close. */
const controlsVisible = ref(false)
/** Which surface currently owns data-flip-id (never both). */
const flipSurface = ref<'pile' | 'cells'>('pile')
/** Keep pile mounted during open Flip so cards can fly free (not clipped by cells). */
const keepPileForFlip = ref(false)
/** Hover fan — locked through open so Flip.fit starts from fanned positions. */
const pileFanned = ref(false)
/** Pile badge — hides on open click, returns with close backdrop. */
const pileCountVisible = ref(true)
/** Square track size from grid width / cols — keeps cells square without overlap. */
const cellSizePx = ref(0)
/** Cell images ready (after Flip or soft-enter). Hidden during backdrop-only phase. */
const cellsReady = ref(false)
/** CSS cell fade — only for non-Flip opens (e.g. header). Avoids post-Flip flash. */
const softEnter = ref(false)
/** Per-cell remove/undo animation phase (keyed by item id or undo key). */
const cellPhase = ref<Record<string, CellPhase>>({})

const BACKDROP_OPEN_MS = 350
const BACKDROP_CLOSE_MS = 800
const GRID_LINES_MS = 320
const CONTROLS_FADE_IN_DELAY_MS = 400
const CONTROLS_FADE_OUT_DELAY_MS = 100
const FLIP_DURATION = 0.95
const FLIP_STAGGER = 0.075
const CELL_SCALE_MS = 280
const UNDO_FADE_MS = 220
/** Pause after scale-out before Undo appears */
const UNDO_ENTER_DELAY_MS = 350
/** Fixed column count — cell = pile = 1/6 viewport width, square */
const STACK_COLS = 6

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const waitFrames = (n = 2) =>
  new Promise<void>((resolve) => {
    const step = (left: number) => {
      if (left <= 0) {
        resolve()
        return
      }
      requestAnimationFrame(() => step(left - 1))
    }
    step(n)
  })

const setCellPhase = (key: string, phase: CellPhase) => {
  cellPhase.value = { ...cellPhase.value, [key]: phase }
}

const clearCellPhase = (key: string) => {
  const { [key]: _, ...rest } = cellPhase.value
  cellPhase.value = rest
}

const clearAllCellPhases = () => {
  cellPhase.value = {}
}

const cellClass = (entry: SelectionEntry) => {
  if (entry.kind === 'undo') {
    const phase = cellPhase.value[entry.key]
    return {
      'stack__cell--undo': true,
      'stack__cell--undo-ready': phase === 'undo-ready',
      'stack__cell--undo-leaving': phase === 'undo-leaving',
    }
  }
  const phase = cellPhase.value[entry.item.id]
  return {
    'stack__cell--scale-out': phase === 'scale-out',
    'stack__cell--scale-in': phase === 'scale-in',
    'stack__cell--scaled-in': phase === 'scaled-in',
  }
}

const bulkBusy = ref(false)

const countLabel = computed(() => {
  const n = count.value
  return `${n} ${n === 1 ? 'item' : 'items'} in this selection`
})

const onRemoveClick = async (item: BucketItem) => {
  const id = item.id
  if (cellPhase.value[id] || !activeMoodboardId.value || bulkBusy.value) return
  const undoKey = `${activeMoodboardId.value}::${id}`
  setCellPhase(id, 'scale-out')
  await wait(CELL_SCALE_MS)
  if (cellPhase.value[id] !== 'scale-out') return
  removeItem(id)
  clearCellPhase(id)
  await nextTick()
  await waitFrames(2)
  if (!selectionEntries.value.some((e) => e.kind === 'undo' && e.key === undoKey)) return
  await wait(UNDO_ENTER_DELAY_MS)
  if (!selectionEntries.value.some((e) => e.kind === 'undo' && e.key === undoKey)) return
  setCellPhase(undoKey, 'undo-ready')
}

const onUndoClick = async (key: string, item: BucketItem) => {
  const phase = cellPhase.value[key]
  if (
    bulkBusy.value ||
    phase === 'undo-leaving' ||
    phase === 'scale-in' ||
    phase === 'scaled-in'
  ) {
    return
  }
  setCellPhase(key, 'undo-leaving')
  await wait(UNDO_FADE_MS)
  if (cellPhase.value[key] !== 'undo-leaving') return
  undoRemove(key)
  clearCellPhase(key)
  const id = item.id
  setCellPhase(id, 'scale-in')
  await nextTick()
  await waitFrames(2)
  if (cellPhase.value[id] !== 'scale-in') return
  setCellPhase(id, 'scaled-in')
  await wait(CELL_SCALE_MS)
  if (cellPhase.value[id] === 'scaled-in') clearCellPhase(id)
}

const onClearAll = async () => {
  if (bulkBusy.value || !items.value.length || !activeMoodboardId.value) return
  bulkBusy.value = true
  const live = items.value.slice()
  const undoKeys = live.map((item) => `${activeMoodboardId.value}::${item.id}`)
  for (const item of live) setCellPhase(item.id, 'scale-out')
  await wait(CELL_SCALE_MS)
  removeItems(live.map((item) => item.id))
  for (const item of live) clearCellPhase(item.id)
  await nextTick()
  await waitFrames(2)
  await wait(UNDO_ENTER_DELAY_MS)
  for (const key of undoKeys) {
    if (selectionEntries.value.some((e) => e.kind === 'undo' && e.key === key)) {
      setCellPhase(key, 'undo-ready')
    }
  }
  bulkBusy.value = false
}

const onUndoAll = async () => {
  if (bulkBusy.value || !activePendingRemovals.value.length) return
  bulkBusy.value = true
  const pendings = activePendingRemovals.value.slice()
  for (const pending of pendings) setCellPhase(pending.key, 'undo-leaving')
  await wait(UNDO_FADE_MS)
  const restoreIds = pendings.map((p) => p.item.id)
  for (const pending of pendings) clearCellPhase(pending.key)
  undoAllRemovals()
  await nextTick()
  for (const id of restoreIds) setCellPhase(id, 'scale-in')
  await waitFrames(2)
  for (const id of restoreIds) setCellPhase(id, 'scaled-in')
  await wait(CELL_SCALE_MS)
  for (const id of restoreIds) {
    if (cellPhase.value[id] === 'scaled-in') clearCellPhase(id)
  }
  bulkBusy.value = false
}

const settledItems = computed(() => {
  const hide = new Set(arrivingIds.value)
  if (pendingFly.value?.itemId) hide.add(pendingFly.value.itemId)
  return items.value.filter((item) => !hide.has(item.id))
})

const showPile = computed(
  () =>
    keepPileForFlip.value ||
    (!isOpen.value && (settledItems.value.length > 0 || arrivingIds.value.length > 0)),
)

/** Same grid DOM for prelude, open, and close — stays mounted through fade-out. */
const showSelectionGrid = computed(
  () =>
    stagePresent.value &&
    panelTab.value === 'selections' &&
    selectionEntries.value.length > 0,
)

/** All settled items in the pile (reversed so newest sits on top) — needed for Flip ids. */
const pilePreview = computed(() => settledItems.value.slice().reverse())

const gridDims = computed(() => {
  const n = Math.max(selectionEntries.value.length, 1)
  const cols = STACK_COLS
  const rows = Math.ceil(n / cols)
  return { cols, rows }
})

const softEnterStyle = (index: number) => {
  // Match Flip open: top-right first
  return { animationDelay: `${staggerDelayForIndex(index, 'open')}s` }
}

const stackCssVars = computed(() => {
  const size = cellSizePx.value
  return {
    '--stack-cols': String(STACK_COLS),
    '--stack-cell-size': size > 0 ? `${size}px` : `calc(100vw / ${STACK_COLS})`,
  }
})

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${STACK_COLS}, var(--stack-cell-size))`,
  gridAutoRows: `var(--stack-cell-size)`,
}))

/** Keep pile + grid on the same square size (1/6 width) so Flip doesn’t rescale. */
const syncCellSize = () => {
  if (!import.meta.client) return
  const grid = gridRef.value
  if (grid) {
    cellSizePx.value = grid.clientWidth / STACK_COLS
    return
  }
  cellSizePx.value = window.innerWidth / STACK_COLS
}

/** Stable-ish tilt from id (+ optional salt so underneath cards reshuffle when top changes). */
const hashAngle = (id: string, salt = '') => {
  const key = salt ? `${id}::${salt}` : id
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  return ((h % 11) - 5) * 0.9 // about -4.5° … 4.5°
}

/**
 * Fan directions (max travel). Spread across the whole stack via per-id hash;
 * scale ≤ 1 so nothing moves further than these templates.
 */
const FAN_DIRS: Array<{ x: number; y: number; r: number }> = [
  { x: -34, y: -40, r: -9 }, // up-left
  { x: 36, y: -32, r: 8 }, // up-right
  { x: -48, y: 4, r: -6 }, // left
  { x: -26, y: 48, r: -4 }, // below-left
  { x: 8, y: 58, r: 2 }, // below
  { x: 34, y: 50, r: 6 }, // below-right
  { x: 46, y: -8, r: 7 }, // right
]

const hashInt = (id: string, salt = '') => {
  const key = salt ? `${id}::${salt}` : id
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Bumped on each hover — reshuffles fan directions. */
const pileFanSeed = ref(0)

/** Randomised fan for every non-top card — depth softens travel, never exceeds FAN_DIRS. */
const pileFanOffset = (id: string, index: number, total: number) => {
  const fromTop = total - 1 - index
  if (fromTop <= 0) return null

  const h = hashInt(id, `fan:${pileFanSeed.value}`)
  const dir = FAN_DIRS[h % FAN_DIRS.length]!
  const depthT = fromTop / Math.max(total - 1, 1)
  // Near-top: closer to full template; deeper: smaller nudge (still participates)
  const depthScale = 1 - depthT * 0.55
  const jitter = 0.65 + ((h >> 9) % 36) / 100 // 0.65–1.00
  const s = Math.min(1, depthScale * jitter)

  return { x: dir.x * s, y: dir.y * s, r: dir.r * s }
}

const onPileMouseEnter = () => {
  if (isFlipping.value) return
  pileFanSeed.value += 1
  pileFanned.value = true
}

const onPileMouseLeave = () => {
  // Keep fanned pose while opening so Flip reads the spread positions
  if (isFlipping.value || keepPileForFlip.value) return
  pileFanned.value = false
}

/** If the pointer is still over the pile after Flip, ease into the fan. */
const syncPileFanFromHover = async () => {
  await nextTick()
  if (!import.meta.client || isFlipping.value) return
  pileFanned.value = !!pileRef.value?.matches(':hover')
}

/**
 * Landing id is set at flyer impact (before the card mounts) so under-cards
 * reshuffle immediately; cleared on handoff when settledItems already includes it.
 */
const pileLandingId = ref<string | null>(null)

/** Changes on add/remove / land impact — reshuffles under-card tilts. */
const pilePoseSalt = computed(() => {
  const settled = settledItems.value.map((item) => item.id).join('|')
  if (!pileLandingId.value) return settled
  return settled ? `${pileLandingId.value}|${settled}` : pileLandingId.value
})

const pileCardStyle = (id: string, index: number, total: number) => {
  const t = total <= 1 ? 0 : index / (total - 1)
  const x = (t - 0.5) * 10
  const y = (0.5 - t) * 6
  // While a flyer is landing, every settled card is "under" so they all reshuffle together
  const isTop = !pileLandingId.value && index === total - 1
  const rot = isTop ? hashAngle(id) : hashAngle(id, pilePoseSalt.value)
  const fan = pileFanOffset(id, index, total)
  const hoverX = fan ? x + fan.x : x
  const hoverY = fan ? y + fan.y : y
  const hoverExtra = rot === 0 ? -2 : Math.sign(rot) * 2
  const hoverRot = isTop ? rot + hoverExtra : fan ? rot + fan.r : rot

  return {
    '--pile-x': `${x}px`,
    '--pile-y': `${y}px`,
    '--pile-r': `${rot}deg`,
    '--pile-hover-x': `${hoverX}px`,
    '--pile-hover-y': `${hoverY}px`,
    '--pile-hover-r': `${hoverRot}deg`,
    zIndex: index + 1,
  }
}

/** Whole-pile thump when a flyer hits */
const bumpPileImpact = () => {
  const pile = pileRef.value
  if (!import.meta.client || !pile) return
  gsap.killTweensOf(pile)
  gsap
    .timeline()
    .to(pile, { y: 11, duration: 0.09, ease: 'power3.in' })
    .to(pile, { y: 0, duration: 0.38, ease: 'power3.out' })
}

const productSlug = (item: BucketItem) => {
  if (!item.link) return null
  const match = item.link.match(/\/(?:products|materials-and-forms)\/([^/?#]+)/)
  return match?.[1] || null
}

const galleryUrls = (item: BucketItem) => uniqueImageUrls(...(item.imageUrls || []))

const galleryCount = (item: BucketItem) => galleryUrls(item).length

const galleryIndex = (item: BucketItem) => {
  const urls = galleryUrls(item)
  if (!urls.length) return 0
  if (typeof item.imageIndex === 'number') {
    return Math.min(item.imageIndex, urls.length - 1)
  }
  const idx = urls.findIndex(
    (url) => imageAssetKey(url) === imageAssetKey(item.imageUrl),
  )
  return idx >= 0 ? idx : 0
}

const openProduct = (item: BucketItem, event?: MouseEvent) => {
  const slug = productSlug(item)
  if (!slug) return
  const source =
    ((event?.currentTarget as HTMLElement | null)?.querySelector('img') as HTMLElement | null) ||
    null
  const index = galleryIndex(item)
  const urls = galleryUrls(item)
  const flipSrc = urls[index] || item.imageUrl || null
  if (flipSrc) void prefetchImage(flipSrc)
  open(slug, {
    source,
    imageIndex: index,
    flipSrc,
    bucketItemId: item.id,
  })
}

watch(returnImage, (value) => {
  if (!value) return
  const targetId =
    value.bucketItemId ||
    items.value.find((item) => productIdFromBucketId(item.id) === value.productId)?.id
  if (!targetId) return
  setItemImageIndex(targetId, value.index)
})

const startEdit = () => {
  editName.value = activeMoodboard.value?.name || ''
  isEditing.value = true
  nextTick(() => {
    titleInput.value?.focus()
    titleInput.value?.select()
  })
}

const saveName = () => {
  if (!isEditing.value) return
  if (activeMoodboardId.value && editName.value.trim()) {
    renameMoodboard(activeMoodboardId.value, editName.value)
  }
  isEditing.value = false
}

const cancelEdit = () => {
  isEditing.value = false
}

const sendEnquiry = () => {
  if (!items.value.length) return
  openFromBucket(items.value)
}

const onBuildMoodboard = () => {
  if (!items.value.length) return
  initFromBucket(items.value)
  const { placements, strokes } = snapshot()
  createBoard(placements, strokes)
  dismissDrawer()
  openMoodboard()
}

const markArriving = (id: string) => {
  if (arrivingIds.value.includes(id)) return
  arrivingIds.value = [...arrivingIds.value, id]
}

const clearArriving = (id: string) => {
  arrivingIds.value = arrivingIds.value.filter((entry) => entry !== id)
}

const measurePileAnchor = () => {
  if (!import.meta.client) return
  const el = pileRef.value
  if (el) {
    pileAnchor.value = el.getBoundingClientRect()
    return
  }
  // Default bottom-left footprint before the pile mounts (matches one grid cell)
  syncCellSize()
  const size = cellSizePx.value || window.innerWidth / STACK_COLS
  const pad =
    Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) ||
    24
  pileAnchor.value = new DOMRect(pad, window.innerHeight - size - pad, size, size)
}

/** Delay from animation start for a grid index — open: top-right, close: bottom-left. */
const staggerDelayForIndex = (index: number, mode: 'open' | 'close') => {
  const { cols, rows } = gridDims.value
  const row = Math.floor(index / cols)
  const col = index % cols
  const dist =
    mode === 'open'
      ? row + (cols - 1 - col) // distance from top-right
      : rows - 1 - row + col // distance from bottom-left
  return dist * FLIP_STAGGER
}

const staggerDelayForEl = (el: Element, mode: 'open' | 'close') => {
  const id = el.getAttribute('data-flip-id')
  const index = selectionEntries.value.findIndex(
    (entry) => entry.kind === 'item' && entry.item.id === id,
  )
  return staggerDelayForIndex(index >= 0 ? index : 0, mode)
}

const runFlip = (
  state: ReturnType<typeof Flip.getState>,
  targets: ArrayLike<Element>,
  opts?: { mode?: 'open' | 'close' },
) =>
  new Promise<void>((resolve) => {
    const mode = opts?.mode || 'open'
    const list = Array.from(targets)

    Flip.from(state, {
      targets: list,
      absolute: true,
      absoluteOnLeave: false,
      duration: FLIP_DURATION,
      // Stagger by grid index — keep target DOM order so pile z-index/order stays put
      stagger: (_i: number, target: Element) => staggerDelayForEl(target, mode),
      ease: 'power3.inOut',
      fade: false,
      scale: false,
      // Never clear zIndex — that was reshuffling the pile stack
      clearProps: 'transform,top,left,right,bottom,width,height,position,margin',
      onComplete: () => resolve(),
    })
  })

/** Open: fly pile cards (free, unclipped) into each cell — mirrors close. */
const fitPileCardsToCells = () =>
  new Promise<void>((resolve) => {
    const cards = pileRef.value?.querySelectorAll<HTMLElement>('[data-flip-id]')
    // During open, flip ids stay on the pile — match cells by grid index, not data-flip-id
    const medias = Array.from(
      gridRef.value?.querySelectorAll<HTMLElement>('.stack__cell-media') || [],
    )
    if (!cards?.length || !medias.length) {
      resolve()
      return
    }

    const cardById = new Map(
      Array.from(cards).map((el) => [el.getAttribute('data-flip-id') || '', el]),
    )

    let pending = 0
    const done = () => {
      pending -= 1
      if (pending <= 0) resolve()
    }

    items.value.forEach((item) => {
      const card = cardById.get(item.id)
      const index = selectionEntries.value.findIndex(
        (entry) => entry.kind === 'item' && entry.item.id === item.id,
      )
      const media = index >= 0 ? medias[index] : undefined
      if (!card || !media) return
      pending += 1
      Flip.fit(card, media, {
        absolute: true,
        duration: FLIP_DURATION,
        delay: staggerDelayForIndex(index >= 0 ? index : 0, 'open'),
        ease: 'power3.inOut',
        onComplete: done,
      })
    })

    if (pending === 0) resolve()
  })

const fadeOutStage = async () => {
  // Backdrop only — grid lines already off; keep stagePresent until fade ends
  controlsVisible.value = false
  gridLinesVisible.value = false
  // Count fades in with the backdrop fade-out
  pileCountVisible.value = true
  stageVisible.value = false
  cellsReady.value = false
  softEnter.value = false
  flipSurface.value = 'pile'
  keepPileForFlip.value = false
  await wait(BACKDROP_CLOSE_MS)
  stagePresent.value = false
}

const revealStage = async () => {
  gridLinesVisible.value = false
  stagePresent.value = true
  await nextTick()
  syncCellSize()
  // Paint backdrop at opacity 0, then fade it in (grid lines stay off)
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      stageVisible.value = true
      resolve()
    })
  })
  await wait(BACKDROP_OPEN_MS)
}

const fadeGridLinesIn = async () => {
  gridLinesVisible.value = true
  await wait(GRID_LINES_MS)
}

const fadeGridLinesOut = async () => {
  gridLinesVisible.value = false
  await wait(GRID_LINES_MS)
}

/** Fade controls in after open has started (later than the backdrop). */
const scheduleControlsFadeIn = () => {
  void wait(CONTROLS_FADE_IN_DELAY_MS).then(() => {
    if (stagePresent.value && stageVisible.value) controlsVisible.value = true
  })
}

const openFromPile = async () => {
  if (!import.meta.client || isOpen.value || isFlipping.value) return
  // Lock hover fan so Flip.fit starts from spread positions (no snap-back)
  pileFanned.value = true
  pileCountVisible.value = false
  isFlipping.value = true
  cellsReady.value = false
  softEnter.value = false
  flipSurface.value = 'pile'
  keepPileForFlip.value = true
  controlsVisible.value = false
  gridLinesVisible.value = false
  scheduleControlsFadeIn()
  // 1) Backdrop fade in (no grid lines yet)
  await revealStage()
  // 2) Items disperse into cells over plain backdrop
  openDrawer('selections')
  await nextTick()
  syncCellSize()
  await fitPileCardsToCells()
  // 3) Swap to cell media, then fade grid lines in
  flipSurface.value = 'cells'
  cellsReady.value = true
  keepPileForFlip.value = false
  pileFanned.value = false
  isFlipping.value = false
  await fadeGridLinesIn()
}

const finishClose = async () => {
  await fadeOutStage()
  clearAllCellPhases()
  clearPendingRemovals()
  dismissDrawer()
}

const closeToPile = async () => {
  if (!import.meta.client || isFlipping.value) {
    clearAllCellPhases()
    clearPendingRemovals()
    dismissDrawer()
    controlsVisible.value = false
    gridLinesVisible.value = false
    stageVisible.value = false
    stagePresent.value = false
    cellsReady.value = false
    flipSurface.value = 'pile'
    keepPileForFlip.value = false
    pileCountVisible.value = true
    return
  }
  if (!isOpen.value) {
    await finishClose()
    return
  }
  if (panelTab.value !== 'selections' || !selectionEntries.value.length) {
    await finishClose()
    return
  }

  // Controls fade out shortly after click — before the backdrop
  void wait(CONTROLS_FADE_OUT_DELAY_MS).then(() => {
    controlsVisible.value = false
  })

  // 1) Grid lines out first so items don’t travel over them
  await fadeGridLinesOut()

  // Only undo placeholders left — already faded with grid lines
  if (!items.value.length) {
    await finishClose()
    return
  }

  syncCellSize()
  const medias = gridRef.value?.querySelectorAll('.stack__cell-media[data-flip-id]')
  const state = medias?.length ? Flip.getState(medias) : null
  isFlipping.value = true
  cellsReady.value = false
  // Hand flip ids to pile; cell shells stay put so the grid shape doesn’t change
  flipSurface.value = 'pile'
  dismissDrawer()
  await nextTick()
  await nextTick()
  const cards = pileRef.value?.querySelectorAll('[data-flip-id]')
  if (state && cards?.length) {
    // 2) Items gather back to the pile
    await runFlip(state, cards, { mode: 'close' })
    // Drop Flip inline transforms so CSS pile vars own the pose again
    gsap.set(cards, { clearProps: 'transform,top,left,right,bottom,width,height,position,margin' })
    void pileRef.value?.offsetHeight
  }
  // Re-enable CSS transitions before backdrop fade — otherwise a hover during
  // fade applies the fan with transition:none and it “pops” on next hover too
  isFlipping.value = false
  await syncPileFanFromHover()
  // 3) Backdrop fade out (undos already left with the grid lines)
  await fadeOutStage()
  clearAllCellPhases()
  clearPendingRemovals()
}

const requestClose = () => {
  void closeToPile()
}

type FlyPayload = NonNullable<ReturnType<typeof consumePendingFly>>

const flyIntoPile = (payload: FlyPayload) => {
  if (!import.meta.client) {
    clearArriving(payload.itemId)
    pileLandingId.value = null
    return
  }
  measurePileAnchor()
  const dest = pileAnchor.value
  if (!dest) {
    clearArriving(payload.itemId)
    pileLandingId.value = null
    if (payload.source) {
      payload.source.style.removeProperty('opacity')
      payload.source.style.removeProperty('transition')
      payload.source.removeAttribute('data-bucket-fly')
    }
    return
  }

  const source = payload.source
  // Keep original hidden instantly (no fade-out) while the flyer travels
  if (source) {
    source.setAttribute('data-bucket-fly', payload.itemId)
    source.style.setProperty('transition', 'none')
    source.style.setProperty('opacity', '0')
  }

  // Match pile card structure (full cell + padded image) so handoff doesn’t pop size
  const CELL_PAD = 50
  const wrap = document.createElement('div')
  Object.assign(wrap.style, {
    position: 'fixed',
    left: `${payload.from.left}px`,
    top: `${payload.from.top}px`,
    width: `${payload.from.width}px`,
    height: `${payload.from.height}px`,
    zIndex: '400',
    pointerEvents: 'none',
    margin: '0',
    overflow: 'hidden',
    transformOrigin: 'center center',
    boxSizing: 'border-box',
  })
  const flyerImg = document.createElement('img')
  flyerImg.src = payload.imageUrl
  flyerImg.alt = ''
  flyerImg.setAttribute('aria-hidden', 'true')
  Object.assign(flyerImg.style, {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    objectPosition: 'center',
    padding: '0px',
    boxSizing: 'border-box',
    display: 'block',
    margin: '0',
    border: '0',
  })
  wrap.appendChild(flyerImg)
  document.body.appendChild(wrap)

  const destSize = Math.min(dest.width, dest.height)
  const destLeft = dest.left
  const destTop = dest.top

  // Playful arch: rise, overshoot into the pile, then settle with inertia
  const midX = payload.from.left + (destLeft - payload.from.left) * 0.45
  const midY = Math.min(payload.from.top, destTop) - Math.min(140, window.innerHeight * 0.18)
  const landRot = hashAngle(payload.itemId)
  const overshootRot = landRot + (landRot === 0 ? -5 : Math.sign(landRot) * 5)

  const resolveFlySource = () => {
    if (source && document.contains(source)) return source
    return document.querySelector(
      `img[data-bucket-fly="${CSS.escape(payload.itemId)}"]`,
    ) as HTMLElement | null
  }

  /** Native CSS fade — GSAP opacity tweens fight `transition: opacity` on the thumb. */
  const fadeSourceBack = () => {
    window.setTimeout(() => {
      const el = resolveFlySource()
      if (!el) return
      gsap.killTweensOf(el)
      el.style.setProperty('transition', 'opacity 2s ease')
      el.style.setProperty('opacity', '0')
      void el.offsetWidth
      el.style.setProperty('opacity', '0.1')
      const handoff = () => {
        el.style.removeProperty('transition')
        el.style.removeProperty('opacity')
        el.removeAttribute('data-bucket-fly')
      }
      const onEnd = (e: TransitionEvent) => {
        if (e.propertyName !== 'opacity') return
        el.removeEventListener('transitionend', onEnd)
        handoff()
      }
      el.addEventListener('transitionend', onEnd)
      window.setTimeout(() => {
        el.removeEventListener('transitionend', onEnd)
        handoff()
      }, 2200)
    }, 550)
  }

  // Top card rest offset (matches pileCardStyle) so the swap lines up
  const nextTotal = settledItems.value.length + 1
  const topT = nextTotal <= 1 ? 0 : 1
  const landLeft = destLeft + (topT - 0.5) * 10
  const landTop = destTop + (0.5 - topT) * 6

  gsap
    .timeline({
      onComplete: () => {
        // Mount pile card, then drop flyer before paint — no overlapping clone
        clearArriving(payload.itemId)
        pileLandingId.value = null
        nextTick(() => {
          wrap.remove()
          fadeSourceBack()
        })
      },
    })
    .to(wrap, {
      // Rise — keep source size
      left: midX,
      top: midY,
      rotate: landRot * 0.45,
      duration: 0.32,
      ease: 'power2.out',
    })
    .to(
      wrap,
      {
        // Mid-flight: cell footprint + dive
        left: landLeft,
        top: landTop + 4,
        width: destSize,
        height: destSize,
        rotate: overshootRot,
        duration: 0.4,
        ease: 'power2.inOut',
      },
      'dive',
    )
    .to(
      flyerImg,
      {
        // Match .stack__pile-image padding so the bitmap matches the landed card
        padding: CELL_PAD,
        duration: 0.4,
        ease: 'power2.inOut',
      },
      'dive',
    )
    // Hit a touch early so the pile thump leads the flyer settle
    .call(
      () => {
        pileLandingId.value = payload.itemId
        bumpPileImpact()
      },
      undefined,
      'dive+=0.3',
    )
    .to(wrap, {
      // Settle — position + rotation only (size/padding already final)
      left: landLeft,
      top: landTop,
      rotate: landRot,
      duration: 0.48,
      ease: 'power3.out',
    })
}

watch(
  pendingFly,
  (payload) => {
    if (!payload) return
    const next = consumePendingFly()
    if (!next) return
    markArriving(next.itemId)
    nextTick(() => flyIntoPile(next))
  },
)

watch(isOpen, async (open) => {
  if (!import.meta.client) return
  document.documentElement.classList.toggle(
    'bucket-stack-open',
    open || stagePresent.value,
  )
  if (!open) {
    isEditing.value = false
    softEnter.value = false
    return
  }
  // Flip opens own the sequence — skip soft-enter path
  if (isFlipping.value) return

  // Header / non-Flip open: backdrop → items → grid lines
  pileCountVisible.value = false
  cellsReady.value = false
  softEnter.value = false
  controlsVisible.value = false
  gridLinesVisible.value = false
  flipSurface.value = 'cells'
  scheduleControlsFadeIn()
  await revealStage()
  if (!isOpen.value || isFlipping.value) return
  cellsReady.value = true
  softEnter.value = true
  await fadeGridLinesIn()
})

watch(stagePresent, (present) => {
  if (!import.meta.client) return
  document.documentElement.classList.toggle(
    'bucket-stack-open',
    present || isOpen.value,
  )
  // Nested with PDP scroll lock — closing PDP won’t unlock while cart is open
  if (present) lockPageScroll()
  else unlockPageScroll()
})

watch(activeMoodboardId, () => {
  isEditing.value = false
})

watch(showSelectionGrid, async (show) => {
  if (!show || !import.meta.client) return
  await nextTick()
  syncCellSize()
})

let cellRo: ResizeObserver | null = null

watch(
  gridRef,
  (el, prev) => {
    if (!import.meta.client || typeof ResizeObserver === 'undefined') return
    if (!cellRo) {
      cellRo = new ResizeObserver(() => syncCellSize())
    }
    if (prev) cellRo.unobserve(prev)
    if (el) {
      cellRo.observe(el)
      syncCellSize()
    }
  },
  { flush: 'post' },
)

const onWinResize = () => syncCellSize()

onMounted(() => {
  registerAnimatedClose(() => {
    void closeToPile()
  })
  if (import.meta.client) {
    syncCellSize()
    window.addEventListener('resize', onWinResize)
  }
})

onBeforeUnmount(() => {
  registerAnimatedClose(null)
  cellRo?.disconnect()
  cellRo = null
  if (import.meta.client) {
    window.removeEventListener('resize', onWinResize)
    document.documentElement.classList.remove('bucket-stack-open')
    if (stagePresent.value) unlockPageScroll()
  }
})
</script>

<style scoped>
.stack {
  --stack-cell-pad: 50px;
  position: fixed;
  inset: 0;
  z-index: 200;
  pointer-events: none;
}

.stack--open {
  z-index: 280;
}

.stack__pile {
  position: fixed;
  left: 0;
  bottom: 0;
  z-index: 210;
  /* Same footprint as one open-grid cell so Flip keeps image size */
  width: var(--stack-cell-size);
  height: var(--stack-cell-size);
  overflow: visible;
  pointer-events: auto;
  border: 0;
  background: transparent;
  cursor: pointer;
  will-change: transform;
}

/* Expand hit area so fanned cards (esp. below) keep hover without shifting layout */
.stack__pile::after {
  content: '';
  position: absolute;
  inset: -48px -56px -80px -56px;
}

/* Above stage backdrop/grid, below controls */
.stack--flipping .stack__pile {
  z-index: 2;
  overflow: visible;
}

.stack--flipping .stack__pile-card {
  overflow: visible;
}

.stack__pile-card {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: block;
  overflow: hidden;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  transform-origin: center center;
  transform: translate(var(--pile-x, 0px), var(--pile-y, 0px)) rotate(var(--pile-r, 0deg));
  will-change: transform;
  box-sizing: border-box;
}

.stack__pile-card {
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Only suppress transitions while GSAP is driving the cards */
.stack--flipping .stack__pile-card {
  transition: none;
}

.stack__pile--fanned .stack__pile-card--fan {
  transform: translate(var(--pile-hover-x), var(--pile-hover-y)) rotate(var(--pile-hover-r));
}

@media (prefers-reduced-motion: reduce) {
  .stack__pile-card {
    transition: none;
  }
}

.stack__pile-image {
  display: block;
  width: 100%;
  height: 100%;
  padding: var(--stack-cell-pad, 50px);
  box-sizing: border-box;
  object-fit: contain;
  object-position: center;
  pointer-events: none;
}

.stack__pile-tip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 0.35rem);
  z-index: 30;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--charcoal);
  font-family: var(--serif);
  font-size: var(--text-sm, 14px);
  line-height: 1.2;
  letter-spacing: 0.01em;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transform: translate(-50%, 0.55rem);
  transition:
    opacity 0.28s ease,
    transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.stack__pile-tip--visible {
  opacity: 1;
  transform: translate(-50%, 0);
}

.stack__stage {
  position: absolute;
  inset: 0;
  z-index: 1;
  visibility: hidden;
  pointer-events: none;
  /* Delay visibility:hidden until backdrop opacity fade finishes */
  transition: visibility 0s linear 0.55s;
}

.stack__stage--visible {
  visibility: visible;
  pointer-events: auto;
  transition: visibility 0s linear 0s;
}

.stack__backdrop {
  position: absolute;
  inset: 0;
  background: var(--background-color, var(--cream));
  opacity: 0;
  /* Close fade out */
  transition: opacity 0.8s ease;
}

.stack__stage--visible .stack__backdrop {
  opacity: 1;
  /* Open fade in */
  transition: opacity 0.35s ease;
}


/*
  Keep cell media invisible until cellsReady.
  Undo placeholders stay visible so they can fade with the stage on close.
  (Previously :not(.stack--flipping) allowed a flash at rest grid positions on open
  before Flip rewound them to the pile.)
*/
.stack:not(.stack--cells-ready) .stack__cell-media:not(.stack__cell-media--undo) {
  opacity: 0;
}

.stack__grid {
  --stack-cell-pad: 50px;
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  align-content: start;
  align-items: stretch;
  justify-content: start;
  gap: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 0;
  box-sizing: border-box;
  overflow-x: hidden;
  overflow-y: auto;
  border-top: 1px solid transparent;
  border-left: 1px solid transparent;
  transition: border-color 0.32s ease;
}

.stack__grid--lines {
  border-top-color: var(--grid-line);
  border-left-color: var(--grid-line);
}

/* Shell stays in document flow — square tracks from gridAutoRows = column width */
.stack__cell {
  --stack-cell-pad: 50px;
  position: relative;
  width: 100%;
  height: auto;
  aspect-ratio: 1 / 1;
  align-self: start;
  min-width: 0;
  overflow: hidden;
  background: transparent;
  border-right: 1px solid transparent;
  border-bottom: 1px solid transparent;
  box-sizing: border-box;
  transition: border-color 0.32s ease;
}

.stack__grid--lines .stack__cell {
  border-right-color: var(--grid-line);
  border-bottom-color: var(--grid-line);
}

/* Only this layer Flips — leaving the shell keeps the grid shape stable */
.stack__cell-media {
  position: absolute;
  inset: 0;
  min-width: 0;
  min-height: 0;
}

/* Undo fades with grid lines (same 0.32s window on close) */
.stack__cell-media--undo {
  opacity: 1;
  transition: opacity 0.32s ease;
}

.stack__grid:not(.stack__grid--lines) .stack__cell-media--undo {
  opacity: 0;
  pointer-events: none;
}

.stack__cell-media--undo .stack__cell-frame {
  pointer-events: none;
}

.stack__undo {
  width: auto;
  height: auto;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  font-size: var(--text-sm);
  color: var(--muted);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  pointer-events: auto;
  opacity: 0;
  transition:
    opacity 0.7s ease,
    color 0.2s ease;
}

.stack__cell--undo-ready:not(.stack__cell--undo-leaving) .stack__undo {
  opacity: 1;
}

.stack__cell--undo-leaving .stack__undo {
  opacity: 0;
  transition:
    opacity 0.22s ease,
    color 0.2s ease;
}

.stack__undo:hover {
  color: var(--charcoal);
}

/* Remove: hide controls, scale image out — then undo fades in */
.stack__cell--scale-out .stack__cell-ctrl,
.stack__cell--scale-in .stack__cell-ctrl,
.stack__cell--scaled-in .stack__cell-ctrl {
  opacity: 0 !important;
  pointer-events: none !important;
  transition: none;
}

.stack__cell--scale-out .stack__cell-figure {
  transform: scale(0);
  transform-origin: center center;
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}

/* Undo restore: mount at 0, then scale up; controls return after */
.stack__cell--scale-in .stack__cell-figure {
  transform: scale(0);
  transform-origin: center center;
  pointer-events: none;
}

.stack__cell--scaled-in .stack__cell-figure {
  transform: scale(1);
  transform-origin: center center;
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}

/* Content box = cell minus padding on every side */
.stack__cell-frame {
  position: absolute;
  inset: var(--stack-cell-pad);
  display: grid;
  place-items: center;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  box-sizing: border-box;
  container-type: size;
}

/* Shrink-wraps to the contained image so controls sit on the image, not the square */
.stack__cell-figure {
  position: relative;
  max-width: 100%;
  max-height: 100%;
  width: fit-content;
  height: fit-content;
  line-height: 0;
  transform-origin: center center;
}

.stack__cell-hit {
  display: block;
  max-width: 100%;
  max-height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  line-height: 0;
}

.stack__cell-image {
  display: block;
  width: auto;
  height: auto;
  max-width: 100cqi;
  max-height: 100cqb;
  object-fit: contain;
  pointer-events: none;
}

.stack__cell-ctrl {
  position: absolute;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.stack__cell:hover .stack__cell-ctrl {
  opacity: 1;
  pointer-events: auto;
}

.stack__cell-ctrl--clone {
  top: var(--thumb-ctrl-inset, 4px);
  left: var(--thumb-ctrl-inset, 4px);
}

.stack__cell-ctrl--remove {
  top: var(--thumb-ctrl-inset, 4px);
  right: var(--thumb-ctrl-inset, 4px);
}

.stack__cell-ctrl--cycle {
  right: var(--thumb-ctrl-inset, 4px);
  bottom: var(--thumb-ctrl-inset, 4px);
}

/* Header / non-Flip opens only — never re-run after Flip settles */
.stack--soft-enter .stack__cell-media {
  animation: stack-cell-in 0.7s ease both;
}

.stack--flipping .stack__cell-media {
  animation: none;
}

@keyframes stack-cell-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.stack__boards {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 0.75rem;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: var(--gutter);
  box-sizing: border-box;
  overflow: auto;
}

.stack__boards-empty {
  margin: auto;
  color: var(--muted);
}

.stack__board {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 10rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--charcoal);
  text-align: left;
  cursor: pointer;
}

.stack__board-thumb {
  display: block;
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--sand);
}

.stack__board-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.stack__board-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: var(--text-sm);
}

.stack__board-count {
  color: var(--muted);
}

.stack__controls {
  position: fixed;
  right: var(--gutter);
  bottom: var(--gutter);
  /* Above stage, pile, and GSAP Flip absolute layers */
  z-index: 420;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  width: var(--side-column-width);
  max-width: calc(100vw - (var(--gutter) * 2));
  padding: var(--gutter);
  box-sizing: border-box;
  background: var(--panel-bg);
  border: 1px solid var(--grid-line);
  backdrop-filter: blur(50px);
  -webkit-backdrop-filter: blur(50px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.35s ease;
}

.stack__controls--visible {
  opacity: 1;
  pointer-events: auto;
  /* Slight enter delay; leave has no delay so close feels earlier than backdrop */
  transition: opacity 0.45s ease 0.2s;
}

.stack__controls-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.stack__close {
  flex-shrink: 0;
  width: 25px;
  height: 25px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--charcoal);
  background: var(--elevated-bg, #fff);
  color: var(--charcoal);
  box-sizing: border-box;
  cursor: pointer;
}

.stack__close:hover {
  color: var(--accent, var(--charcoal));
  border-color: currentColor;
}

.stack__close-icon {
  position: relative;
  display: block;
  width: 11px;
  height: 11px;
}

.stack__close-icon::before,
.stack__close-icon::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 1px;
  background: currentColor;
}

.stack__close-icon::before {
  transform: translate(-50%, -50%) rotate(45deg);
}

.stack__close-icon::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}

.stack__title {
  margin: 0;
  min-width: 0;
  flex: 1;
  font-size: var(--text-md);
  color: var(--charcoal);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--serif);
}

.stack__count {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--muted);
}

.stack__title-input {
  min-width: 0;
  flex: 1;
  margin: 0;
  padding: 0.35rem 0.5rem;
  font: inherit;
  font-size: var(--text-sm);
  color: var(--charcoal);
  background: var(--cream);
  border: 1px solid var(--grid-line);
  box-sizing: border-box;
}

.stack__title-input:focus {
  outline: none;
  border-color: var(--charcoal);
}

.stack__control-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
}

.stack__link {
  padding: 0;
  border: 0;
  background: transparent;
  font-size: var(--text-xs);
  color: var(--muted);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.stack__link:hover:not(:disabled) {
  color: var(--charcoal);
}

.stack__link:disabled {
  opacity: 0.4;
  cursor: default;
}

.stack__controls .btn {
  width: 100%;
  border-radius: 0;
}

.stack__controls .btn:disabled {
  opacity: 0.4;
  pointer-events: none;
}

@media (max-width: 767px) {
  .stack__controls {
    width: auto;
    left: var(--gutter);
    right: var(--gutter);
  }
}
</style>
