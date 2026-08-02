<template>
  <Teleport to="body">
    <div
      class="stack"
      :class="{
        'stack--open': isOpen || stagePresent,
        'stack--flipping': isFlipping,
        'stack--soft-enter': softEnter,
        'stack--cells-ready': cellsReady,
        'stack--moodboard': isMoodboard,
        'stack--above-pdp': productOverlayOpen && !isOpen && !stagePresent,
      }"
      :style="stackCssVars"
      :aria-hidden="isOpen || stagePresent || isMoodboard || showRail ? 'false' : 'true'"
    >
      <!-- Selection piles + create slot (bottom-left) -->
      <div
        v-if="showRail"
        class="stack__rail"
        :class="{ 'stack__rail--hot': railHot }"
        @mouseenter="onRailEnter"
        @mouseleave="onRailLeave"
      >
        <div
          v-for="board in railBoards"
          :key="board.id"
          :ref="(el) => setPileWrapRef(board.id, el)"
          class="stack__pile-wrap"
          @mouseenter="onPileMouseEnter(board.id)"
          @mouseleave="onPileMouseLeave(board.id)"
        >
          <button
            :ref="(el) => setPileRef(board.id, el)"
            type="button"
            class="stack__pile"
            :class="{
              'stack__pile--fanned': pileFannedId === board.id,
              'stack__pile--active': board.id === activeMoodboardId,
              'stack__pile--expanded': expandedBoardIds.includes(board.id),
            }"
            :aria-label="`${board.name}, ${board.items.length} items`"
            @click="onPileClick(board.id)"
          >
            <span
              v-for="(item, index) in boardPilePreview(board)"
              :key="item.id"
              class="stack__pile-card stack__pile-card--fan"
              :data-item-id="item.id"
              :data-flip-id="
                flipSurface === 'pile' && board.id === activeMoodboardId
                  ? item.id
                  : undefined
              "
              :style="pileCardStyle(item.id, index, boardPilePreview(board).length)"
            >
              <img
                v-if="item.imageUrl"
                :src="item.imageUrl"
                :alt="item.title"
                class="stack__pile-image"
                draggable="false"
              />
            </span>
          </button>

          <!-- Dispersed column (board builder) -->
          <div
            v-if="expandedBoardIds.includes(board.id)"
            class="stack__column"
            :class="{ 'stack__column--preparing': preparingBoardId === board.id }"
            :ref="(el) => setColumnRef(board.id, el)"
            :style="columnFixedStyle(board.id)"
          >
            <div
              class="stack__column-scroll"
              @wheel.prevent.stop="onColumnWheel"
            >
              <!-- Grows when few items so the column stays pinned to the footprint -->
              <div class="stack__column-pin" aria-hidden="true" />
              <div
                v-for="item in boardColumnItems(board)"
                :key="item.id"
                class="stack__column-thumb"
                :class="{ 'stack__column-thumb--returning': columnReturningId === item.id }"
                :data-column-id="item.id"
                @pointerdown="onColumnThumbPointerDown($event, item, board.id)"
              >
                <img
                  v-if="item.imageUrl"
                  :src="item.imageUrl"
                  :alt="item.title"
                  draggable="false"
                />
              </div>
              <!-- Reserve the pile footprint so the last thumb sits on its top edge -->
              <div class="stack__column-foot" aria-hidden="true" />
            </div>
          </div>

          <!-- Outside column v-if so leave fade can finish after restack -->
          <Transition name="stack-column-close">
            <button
              v-if="showColumnClose(board.id)"
              type="button"
              class="stack__column-close"
              aria-label="Restack selection"
              :style="columnCloseStyle(board.id)"
              @click.stop="restackBoard(board.id)"
            >
              <div class="stack__column-close-icon" aria-hidden="true">
                <div class="stack__column-close-bar" />
                <div class="stack__column-close-bar" />
              </div>
            </button>
          </Transition>
        </div>

        <button
          v-if="showCreateSlot"
          ref="createSlotRef"
          type="button"
          class="stack__create"
          :class="{ 'stack__create--visible': railHot }"
          aria-label="Create new selection"
          @click="onCreateSelection"
        >
          <span class="stack__create-plus" aria-hidden="true">+</span>
        </button>
      </div>

      <!-- Expanded fullscreen (hidden in board builder) -->
      <div
        v-if="!isMoodboard"
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
          :class="{
            'stack__grid--lines': gridLinesVisible,
            'stack__grid--pdp-focus': !!pdpFocusItemId,
          }"
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
  moodboards,
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
  createMoodboard,
  setActiveMoodboard,
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
  parkSelectionItem,
  restoreParkedSelectionItem,
  parkedSelectionItems,
  addItemToMoodboard,
  moodboardSurfaceReady,
  registerMoodboardRestack,
  registerMoodboardReturnToColumn,
} = useBucket()
const { reset: resetMoodboard, addImage } = useMoodboard()
const { createBoard } = useBoards()
const { openFromBucket } = useEnquiryForm()
const {
  open,
  returnImage,
  isOpen: productOverlayOpen,
  beginFlipOpenGate,
  releaseFlipOpenGate,
} = useProductOverlay()
const { fetchProduct } = useProductCatalog()

const gridRef = ref<HTMLElement | null>(null)
/** Active board pile — used for Flip / fly-to landing */
const pileRef = ref<HTMLElement | null>(null)
const pileEls = ref<Record<string, HTMLElement | null>>({})
const pileWrapEls = ref<Record<string, HTMLElement | null>>({})
const columnEls = ref<Record<string, HTMLElement | null>>({})
const createSlotRef = ref<HTMLElement | null>(null)
const railHot = ref(false)
/** Fixed column geometry keyed by board id (viewport coords). */
const columnLayouts = ref<
  Record<string, { left: number; width: number; top: number; height: number }>
>({})
/** Column mounted but thumbs hidden until flyers are placed. */
const preparingBoardId = ref<string | null>(null)
const pileFannedId = ref<string | null>(null)
const expandedBoardIds = ref<string[]>([])
/** Column thumb id reserved (hidden) while a board item Flips back in. */
const columnReturningId = ref<string | null>(null)
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
/** Tip / count visibility — hides on open click, returns with close backdrop. */
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
/** Cart → PDP: fade other items / grid / info before flyer moves */
const PDP_CART_FADE_MS = 300
const pdpFocusItemId = ref<string | null>(null)
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
    'stack__cell--pdp-focus': pdpFocusItemId.value === entry.item.id,
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

const boardPilePreview = (board: { id: string; items: typeof items.value }) => {
  const hide = new Set(arrivingIds.value)
  if (pendingFly.value?.itemId && board.id === activeMoodboardId.value) {
    hide.add(pendingFly.value.itemId)
  }
  return board.items.filter((item) => !hide.has(item.id)).slice().reverse()
}

/**
 * Top of pile → top of column (newest first). board.items is prepended on add.
 */
const boardColumnItems = (board: { id: string; items: typeof items.value }) => {
  const hide = new Set(arrivingIds.value)
  if (pendingFly.value?.itemId && board.id === activeMoodboardId.value) {
    hide.add(pendingFly.value.itemId)
  }
  return board.items.filter((item) => !hide.has(item.id))
}

/** Hidden for now — multi-selection create slot. */
const showCreateSlot = computed(() => false)

const showRail = computed(
  () =>
    keepPileForFlip.value ||
    isMoodboard.value ||
    (!isOpen.value &&
      !stagePresent.value &&
      (moodboards.value.some((b) => b.items.length > 0) || arrivingIds.value.length > 0)),
)

/** Board view: only the active selection stack (extra wraps steal drag hits). */
const railBoards = computed(() => {
  if (!isMoodboard.value) return moodboards.value
  const active =
    moodboards.value.find((board) => board.id === activeMoodboardId.value) ||
    moodboards.value[0]
  return active ? [active] : []
})

const setPileRef = (id: string, el: unknown) => {
  const html = el instanceof HTMLElement ? el : null
  pileEls.value[id] = html
  if (id === activeMoodboardId.value) pileRef.value = html
}

const setPileWrapRef = (id: string, el: unknown) => {
  pileWrapEls.value[id] = el instanceof HTMLElement ? el : null
}

const setColumnRef = (id: string, el: unknown) => {
  columnEls.value[id] = el instanceof HTMLElement ? el : null
}

const inactiveRailEls = () => {
  const activeId = activeMoodboardId.value
  const els: HTMLElement[] = []
  for (const board of moodboards.value) {
    if (board.id === activeId) continue
    const el = pileWrapEls.value[board.id]
    if (el) els.push(el)
  }
  if (createSlotRef.value) els.push(createSlotRef.value)
  return els
}

/** Other piles drop out of view while the backdrop fades in. */
const shelveInactiveRail = () => {
  if (!import.meta.client) return
  const duration = BACKDROP_OPEN_MS / 1000
  for (const el of inactiveRailEls()) {
    gsap.killTweensOf(el)
    gsap.to(el, {
      yPercent: 100,
      duration,
      ease: 'power3.in',
      overwrite: true,
    })
  }
}

/** Park inactive piles off-screen instantly (rail remount mid-close). */
const parkInactiveRail = () => {
  if (!import.meta.client) return
  for (const el of inactiveRailEls()) {
    gsap.killTweensOf(el)
    gsap.set(el, { yPercent: 100 })
  }
}

/** Other piles rise back as the backdrop fades out. */
const unshelveInactiveRail = () => {
  if (!import.meta.client) return
  const duration = BACKDROP_CLOSE_MS / 1000
  for (const el of inactiveRailEls()) {
    gsap.killTweensOf(el)
    gsap.to(el, {
      yPercent: 0,
      duration,
      ease: 'power3.out',
      overwrite: true,
    })
  }
}

const resetShelvedRail = () => {
  if (!import.meta.client) return
  for (const board of moodboards.value) {
    const el = pileWrapEls.value[board.id]
    if (!el) continue
    gsap.killTweensOf(el)
    gsap.set(el, { clearProps: 'transform' })
  }
  const create = createSlotRef.value
  if (!create) return
  gsap.killTweensOf(create)
  gsap.set(create, { clearProps: 'transform' })
}

const onRailEnter = () => {
  railHot.value = true
}

const onRailLeave = () => {
  railHot.value = false
  if (!isFlipping.value && !keepPileForFlip.value) {
    pileFannedId.value = null
    pileFanned.value = false
  }
}

const onCreateSelection = () => {
  const board = createMoodboard({ open: false })
  setActiveMoodboard(board.id)
}

/** Same grid DOM for prelude, open, and close — stays mounted through fade-out. */
const showSelectionGrid = computed(
  () =>
    stagePresent.value &&
    panelTab.value === 'selections' &&
    selectionEntries.value.length > 0,
)

/** All settled items in the active pile (reversed so newest sits on top) — Flip ids. */
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

/** Rest pose for a pile card (matches pileCardStyle without fan / landing overrides). */
const pileRestPose = (id: string, index: number, total: number, salt: string) => {
  const t = total <= 1 ? 0 : index / (total - 1)
  const x = (t - 0.5) * 10
  const y = (0.5 - t) * 6
  const isTop = index === total - 1
  const rot = isTop ? hashAngle(id) : hashAngle(id, salt)
  return { x, y, rot }
}

const readStackCellPad = () => {
  if (!import.meta.client) return 50
  const stackEl = document.querySelector('.stack')
  if (!stackEl) return 50
  return (
    Number.parseFloat(getComputedStyle(stackEl).getPropertyValue('--stack-cell-pad')) || 50
  )
}

/** Visual image size inside a padded square stack cell (natural aspect ratio). */
const fitStackContentSize = (natW: number, natH: number, cellSize: number) => {
  const pad = readStackCellPad()
  const max = Math.max(1, cellSize - pad * 2)
  const w = Math.max(1, natW)
  const h = Math.max(1, natH)
  const scale = Math.min(max / w, max / h)
  return { width: w * scale, height: h * scale }
}

const readImageNaturalSize = async (
  img: HTMLImageElement | null,
  url: string,
): Promise<{ w: number; h: number }> => {
  if (img?.naturalWidth && img.naturalHeight) {
    return { w: img.naturalWidth, h: img.naturalHeight }
  }
  if (!import.meta.client || !url) return { w: 1, h: 1 }
  const probe = new Image()
  probe.src = url
  try {
    if (typeof probe.decode === 'function') await probe.decode()
    else {
      await new Promise<void>((resolve, reject) => {
        probe.onload = () => resolve()
        probe.onerror = () => reject()
      })
    }
  } catch {
    /* keep defaults */
  }
  return {
    w: probe.naturalWidth || img?.naturalWidth || 1,
    h: probe.naturalHeight || img?.naturalHeight || 1,
  }
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

const onPileMouseEnter = (boardId: string) => {
  if (isFlipping.value) return
  railHot.value = true
  if (expandedBoardIds.value.includes(boardId)) return
  pileFanSeed.value += 1
  pileFannedId.value = boardId
  pileFanned.value = true
}

const onPileMouseLeave = (boardId: string) => {
  // Keep fanned pose while opening so Flip reads the spread positions
  if (isFlipping.value || keepPileForFlip.value) return
  if (pileFannedId.value === boardId) {
    pileFannedId.value = null
    pileFanned.value = false
  }
}

/** If the pointer is still over the pile after Flip, ease into the fan. */
const syncPileFanFromHover = async () => {
  await nextTick()
  if (!import.meta.client || isFlipping.value) return
  const id = activeMoodboardId.value
  const el = id ? pileEls.value[id] : null
  const hot = !!el?.matches(':hover')
  pileFanned.value = hot
  pileFannedId.value = hot && id ? id : null
}

const syncColumnLayout = (boardId: string) => {
  if (!import.meta.client) return
  const wrap = pileWrapEls.value[boardId]
  if (!wrap) return
  const rect = wrap.getBoundingClientRect()
  columnLayouts.value = {
    ...columnLayouts.value,
    [boardId]: {
      left: rect.left,
      width: rect.width,
      top: 0,
      height: window.innerHeight,
    },
  }
}

const syncAllColumnLayouts = () => {
  for (const id of expandedBoardIds.value) syncColumnLayout(id)
}

const columnFixedStyle = (boardId: string) => {
  const layout = columnLayouts.value[boardId]
  if (!layout) return undefined
  return {
    left: `${layout.left}px`,
    width: `${layout.width}px`,
    top: `${layout.top}px`,
    height: `${layout.height}px`,
  }
}

/** Hide close as soon as restack starts so the leave fade isn’t delayed. */
const restackingBoardId = ref<string | null>(null)

const showColumnClose = (boardId: string) =>
  expandedBoardIds.value.includes(boardId) && restackingBoardId.value !== boardId

const columnCloseStyle = (boardId: string) => {
  const layout = columnLayouts.value[boardId]
  if (layout) {
    return { left: `${layout.left + layout.width / 2}px` }
  }
  const wrap = pileWrapEls.value[boardId]
  if (!wrap) return undefined
  const rect = wrap.getBoundingClientRect()
  return { left: `${rect.left + rect.width / 2}px` }
}

const onColumnWheel = (event: WheelEvent) => {
  const scroll = event.currentTarget as HTMLElement | null
  if (!scroll) return
  event.preventDefault()
  event.stopPropagation()
  scroll.scrollTop += event.deltaY
}

type ColumnPending = {
  item: BucketItem
  boardId: string
  thumb: HTMLElement
  startX: number
  startY: number
}

type ColumnDrag = {
  item: BucketItem
  boardId: string
  thumb: HTMLElement
  ghost: HTMLElement
  offsetX: number
  offsetY: number
  width: number
  height: number
}

let columnPending: ColumnPending | null = null
let columnDrag: ColumnDrag | null = null

const clearColumnPointerListeners = () => {
  window.removeEventListener('pointermove', onColumnPointerMove)
  window.removeEventListener('pointerup', onColumnPointerUp)
  window.removeEventListener('pointercancel', onColumnPointerUp)
}

const destroyColumnGhost = () => {
  columnDrag?.ghost.remove()
  columnDrag = null
  document.documentElement.classList.remove('stack-column-dragging')
}

const startColumnDrag = (pending: ColumnPending, event: PointerEvent) => {
  const rect = pending.thumb.getBoundingClientRect()
  const img = pending.thumb.querySelector('img')
  const natW = img?.naturalWidth || 1
  const natH = img?.naturalHeight || 1
  const fitted = fitStackContentSize(natW, natH, rect.width)
  // Center the natural-ratio ghost on the square thumb’s content
  const left = rect.left + (rect.width - fitted.width) / 2
  const top = rect.top + (rect.height - fitted.height) / 2

  const ghost = document.createElement('div')
  ghost.className = 'stack__column-ghost'
  const ghostImg = document.createElement('img')
  ghostImg.src = pending.item.imageUrl || img?.src || ''
  ghostImg.alt = pending.item.title
  ghostImg.draggable = false
  ghost.appendChild(ghostImg)
  ghost.style.cssText = [
    'position:fixed',
    `left:${left}px`,
    `top:${top}px`,
    `width:${fitted.width}px`,
    `height:${fitted.height}px`,
    'margin:0',
    'z-index:500',
    'pointer-events:none',
    'opacity:1',
    'cursor:grabbing',
    'box-sizing:border-box',
    'overflow:hidden',
    'background:transparent',
  ].join(';')
  document.body.appendChild(ghost)
  columnDrag = {
    item: pending.item,
    boardId: pending.boardId,
    thumb: pending.thumb,
    ghost,
    offsetX: event.clientX - left,
    offsetY: event.clientY - top,
    width: fitted.width,
    height: fitted.height,
  }
  columnPending = null
  document.documentElement.classList.add('stack-column-dragging')
  // Source leaves with the ghost — feels like dragging the real item
  pending.thumb.classList.add('stack__column-thumb--lifted')
}

const onColumnThumbPointerDown = (
  event: PointerEvent,
  item: BucketItem,
  boardId: string,
) => {
  if (!import.meta.client || event.button !== 0) return
  // Don't start a board-drag from the close control
  if ((event.target as HTMLElement | null)?.closest?.('.stack__column-close')) return
  const thumb = event.currentTarget as HTMLElement
  columnPending = {
    item,
    boardId,
    thumb,
    startX: event.clientX,
    startY: event.clientY,
  }
  window.addEventListener('pointermove', onColumnPointerMove)
  window.addEventListener('pointerup', onColumnPointerUp)
  window.addEventListener('pointercancel', onColumnPointerUp)
}

const onColumnPointerMove = (event: PointerEvent) => {
  if (columnDrag) {
    event.preventDefault()
    columnDrag.ghost.style.left = `${event.clientX - columnDrag.offsetX}px`
    columnDrag.ghost.style.top = `${event.clientY - columnDrag.offsetY}px`
    return
  }
  if (!columnPending) return
  const dx = event.clientX - columnPending.startX
  const dy = event.clientY - columnPending.startY
  if (Math.hypot(dx, dy) < 8) return
  // Mostly vertical → let the column scroll; don't steal the gesture
  if (Math.abs(dy) > Math.abs(dx) * 1.15) {
    columnPending = null
    clearColumnPointerListeners()
    return
  }
  startColumnDrag(columnPending, event)
  event.preventDefault()
}

/** Open column (if needed), animate a gap, then Flip the board item into the slot. */
const returnItemToColumn = async (opts: {
  selectionId: string
  itemId: string
  from: { left: number; top: number; width: number; height: number }
  imageUrl: string
  objectFit?: 'contain' | 'cover'
  item?: BucketItem
}) => {
  if (!import.meta.client) {
    restoreParkedSelectionItem(opts.itemId)
    return
  }

  const { selectionId, itemId, from, imageUrl } = opts
  setActiveMoodboard(selectionId)
  pileRef.value = pileEls.value[selectionId] || pileRef.value

  // Flyer stays on top for the whole sequence
  const flyer = document.createElement('div')
  const img = document.createElement('img')
  img.src = imageUrl
  img.alt = ''
  img.draggable = false
  flyer.appendChild(img)
  document.body.appendChild(flyer)
  gsap.set(flyer, {
    position: 'fixed',
    left: from.left,
    top: from.top,
    width: Math.max(from.width, 1),
    height: Math.max(from.height, 1),
    margin: 0,
    zIndex: 600,
    pointerEvents: 'none',
    boxSizing: 'border-box',
    overflow: 'hidden',
    background: 'transparent',
  })
  gsap.set(img, {
    display: 'block',
    width: '100%',
    height: '100%',
    objectFit: opts.objectFit || 'contain',
    padding: 0,
  })

  // Hide the destination thumb from the first painted frame (avoids pop)
  columnReturningId.value = itemId

  try {
    const boardBefore = moodboards.value.find((entry) => entry.id === selectionId)
    const wasExpanded = expandedBoardIds.value.includes(selectionId)
    const alreadyInSelection = !!boardBefore?.items.some((entry) => entry.id === itemId)
    const isParked = parkedSelectionItems.value.some((entry) => entry.item.id === itemId)

    // 1) Open the column if closed
    if (!wasExpanded) {
      if ((boardBefore?.items.length || 0) > 0) {
        await disperseBoard(selectionId)
      } else {
        const pile = pileEls.value[selectionId]
        if (pile) {
          preparingBoardId.value = selectionId
          expandedBoardIds.value = [...expandedBoardIds.value, selectionId]
          pile.classList.add('stack__pile--dispersing')
          await nextTick()
          syncColumnLayout(selectionId)
          await nextTick()
          await waitFrames(2)
          preparingBoardId.value = null
        }
      }
    }

    let column = columnEls.value[selectionId]
    if (!column) {
      expandedBoardIds.value = [...new Set([...expandedBoardIds.value, selectionId])]
      pileEls.value[selectionId]?.classList.add('stack__pile--dispersing')
      await nextTick()
      syncColumnLayout(selectionId)
      await waitFrames(2)
      column = columnEls.value[selectionId]
    }
    if (!column) {
      if (isParked) restoreParkedSelectionItem(itemId)
      else if (opts.item && !alreadyInSelection) addItemToMoodboard(selectionId, opts.item)
      return
    }

    // 2) Capture sibling layout, then insert the reserved (hidden) slot
    const beforeRect = new Map<string, DOMRect>()
    column.querySelectorAll<HTMLElement>('.stack__column-thumb').forEach((thumb) => {
      const id = thumb.dataset.columnId
      if (id && id !== itemId) {
        gsap.set(thumb, { x: 0, y: 0, clearProps: 'transform' })
        beforeRect.set(id, thumb.getBoundingClientRect())
      }
    })

    const hadThumb = alreadyInSelection
    if (isParked) restoreParkedSelectionItem(itemId)
    else if (!alreadyInSelection && opts.item) addItemToMoodboard(selectionId, opts.item)

    await nextTick()
    await waitFrames(2)

    let destThumb = column.querySelector(
      `[data-column-id="${itemId}"]`,
    ) as HTMLElement | null
    if (!destThumb) return

    // FLIP siblings: hold old positions, then ease into the opened gap
    if (!hadThumb) {
      const movers: HTMLElement[] = []
      column.querySelectorAll<HTMLElement>('.stack__column-thumb').forEach((thumb) => {
        const id = thumb.dataset.columnId
        if (!id || id === itemId) return
        const from = beforeRect.get(id)
        if (!from) return
        const to = thumb.getBoundingClientRect()
        const dx = from.left - to.left
        const dy = from.top - to.top
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          gsap.set(thumb, { x: dx, y: dy })
          movers.push(thumb)
        }
      })

      destThumb.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      await waitFrames(1)

      if (movers.length) {
        await new Promise<void>((resolve) => {
          gsap.to(movers, {
            x: 0,
            y: 0,
            duration: 0.45,
            ease: 'power3.out',
            overwrite: true,
            onComplete: () => resolve(),
          })
        })
      } else {
        await wait(180)
      }
    } else {
      destThumb.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      await wait(180)
    }

    destThumb =
      (column.querySelector(`[data-column-id="${itemId}"]`) as HTMLElement | null) ||
      destThumb
    const dest = destThumb.getBoundingClientRect()

    if (!img.complete) {
      await new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true })
        img.addEventListener('error', () => resolve(), { once: true })
      })
    }

    const cell = Math.max(dest.width, 1)
    const fitted = fitStackContentSize(
      img.naturalWidth || from.width || 1,
      img.naturalHeight || from.height || 1,
      cell,
    )
    const landLeft = dest.left + (cell - fitted.width) / 2
    const landTop = dest.top + (cell - fitted.height) / 2

    // 3) Flip / scale into the empty slot
    await new Promise<void>((resolve) => {
      gsap.fromTo(
        flyer,
        {
          left: from.left,
          top: from.top,
          width: Math.max(from.width, 1),
          height: Math.max(from.height, 1),
        },
        {
          left: landLeft,
          top: landTop,
          width: fitted.width,
          height: fitted.height,
          duration: 0.55,
          ease: 'power3.inOut',
          onComplete: () => resolve(),
        },
      )
    })

    // Reveal the real thumb under the flyer, then drop the flyer
    columnReturningId.value = null
    await nextTick()
  } finally {
    columnReturningId.value = null
    flyer.remove()
  }
}

const compactColumnAfterPark = async (boardId: string, removedId: string) => {
  const column = columnEls.value[boardId]
  if (!column) {
    parkSelectionItem(boardId, removedId)
    return
  }
  const before = new Map<string, DOMRect>()
  column.querySelectorAll<HTMLElement>('.stack__column-thumb').forEach((thumb) => {
    const id = thumb.dataset.columnId
    if (id) before.set(id, thumb.getBoundingClientRect())
  })
  // Park (not permanently remove) — returns to cart when the board closes
  parkSelectionItem(boardId, removedId)
  await nextTick()
  await waitFrames(2)
  const thumbs = column.querySelectorAll<HTMLElement>('.stack__column-thumb')
  thumbs.forEach((thumb) => {
    const id = thumb.dataset.columnId
    if (!id) return
    const from = before.get(id)
    if (!from) return
    const to = thumb.getBoundingClientRect()
    const dx = from.left - to.left
    const dy = from.top - to.top
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return
    gsap.fromTo(
      thumb,
      { x: dx, y: dy },
      { x: 0, y: 0, duration: 0.4, ease: 'power3.out', overwrite: true },
    )
  })
  // Empty column → restack automatically
  const board = moodboards.value.find((entry) => entry.id === boardId)
  if (board && board.items.length === 0) {
    expandedBoardIds.value = expandedBoardIds.value.filter((id) => id !== boardId)
    pileEls.value[boardId]?.classList.remove('stack__pile--dispersing')
  }
}

const onColumnPointerUp = async (event: PointerEvent) => {
  clearColumnPointerListeners()
  const pending = columnPending
  columnPending = null
  const drag = columnDrag
  if (!drag) return

  const canvas = document.querySelector('.moodboard__canvas') as HTMLElement | null
  const canvasRect = canvas?.getBoundingClientRect()
  const overCanvas =
    !!canvasRect &&
    event.clientX >= canvasRect.left &&
    event.clientX <= canvasRect.right &&
    event.clientY >= canvasRect.top &&
    event.clientY <= canvasRect.bottom

  if (overCanvas && canvasRect && drag.item.imageUrl) {
    const img = drag.thumb.querySelector('img')
    const natural = await readImageNaturalSize(img, drag.item.imageUrl)
    const cellSize =
      pileEls.value[drag.boardId]?.getBoundingClientRect().width ||
      drag.thumb.getBoundingClientRect().width ||
      Math.max(drag.width, drag.height)
    const fitted = fitStackContentSize(natural.w, natural.h, cellSize)
    // Prefer live ghost rect (already natural-ratio); fall back to fitted
    const ghostRect = drag.ghost.getBoundingClientRect()
    const width = ghostRect.width || fitted.width
    const height = ghostRect.height || fitted.height
    const x = event.clientX - canvasRect.left - drag.offsetX
    const y = event.clientY - canvasRect.top - drag.offsetY
    addImage(drag.item.imageUrl, drag.item.title, {
      imageUrls: drag.item.imageUrls,
      imageIndex: drag.item.imageIndex,
      x,
      y,
      width,
      height,
      scale: 1,
      objectFit: 'contain',
      sourceBucketItemId: drag.item.id,
      sourceSelectionId: drag.boardId,
    })
    destroyColumnGhost()
    await compactColumnAfterPark(drag.boardId, drag.item.id)
    return
  }

  // Return ghost to the thumb, then restore the source
  const thumbRect = drag.thumb.getBoundingClientRect()
  await new Promise<void>((resolve) => {
    gsap.to(drag.ghost, {
      left: thumbRect.left,
      top: thumbRect.top,
      duration: 0.28,
      ease: 'power3.out',
      onComplete: () => resolve(),
    })
  })
  drag.thumb.classList.remove('stack__column-thumb--lifted')
  destroyColumnGhost()
  void pending
}

/** Rotation in degrees from a computed CSS transform matrix. */
const getRotationDeg = (el: HTMLElement) => {
  const t = getComputedStyle(el).transform
  if (!t || t === 'none') return 0
  try {
    const m = new DOMMatrixReadOnly(t)
    return (Math.atan2(m.b, m.a) * 180) / Math.PI
  } catch {
    return 0
  }
}

const disperseBoard = async (boardId: string) => {
  if (!import.meta.client) return
  if (expandedBoardIds.value.includes(boardId)) return
  const pile = pileEls.value[boardId]
  if (!pile) return

  const pileRect = pile.getBoundingClientRect()
  // Keep the cell size constant through the flight (ignore rotated AABB growth)
  const size = pileRect.width

  // Capture while still fanned/tilted — rotation eases out during disperse
  const fromById = new Map<string, { left: number; top: number; rot: number }>()
  pile.querySelectorAll<HTMLElement>('[data-item-id]').forEach((card) => {
    const id = card.dataset.itemId
    if (!id) return
    const rect = card.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    fromById.set(id, {
      left: cx - size / 2,
      top: cy - size / 2,
      rot: getRotationDeg(card),
    })
  })

  preparingBoardId.value = boardId
  expandedBoardIds.value = [...expandedBoardIds.value, boardId]
  await nextTick()
  syncColumnLayout(boardId)
  await nextTick()
  await waitFrames(2)

  const column = columnEls.value[boardId]
  if (!column) {
    preparingBoardId.value = null
    return
  }
  const scroll = column.querySelector<HTMLElement>('.stack__column-scroll')
  const thumbs = [...column.querySelectorAll<HTMLElement>('.stack__column-thumb')]
  if (!thumbs.length) {
    preparingBoardId.value = null
    return
  }

  // Measure column slots before we pull thumbs into fixed flyers
  const dests = thumbs.map((thumb) => {
    const rect = thumb.getBoundingClientRect()
    return { left: rect.left, top: rect.top }
  })

  // Hold scroll layout while thumbs are position:fixed (out of flow)
  const flightSpacer = document.createElement('div')
  flightSpacer.setAttribute('aria-hidden', 'true')
  flightSpacer.style.cssText = `flex:0 0 ${size * thumbs.length}px;width:100%;pointer-events:none;`
  const foot = scroll?.querySelector('.stack__column-foot')
  if (scroll && foot) scroll.insertBefore(flightSpacer, foot)
  else scroll?.appendChild(flightSpacer)
  if (scroll) scroll.scrollTop = 0

  gsap.killTweensOf(thumbs)
  thumbs.forEach((thumb, i) => {
    const id = thumb.dataset.columnId || ''
    const from = fromById.get(id) || {
      left: pileRect.left,
      top: pileRect.top,
      rot: 0,
    }
    // Top-of-pile (first in column) stays above during flight
    gsap.set(thumb, {
      position: 'fixed',
      left: from.left,
      top: from.top,
      width: size,
      height: size,
      rotation: from.rot,
      transformOrigin: '50% 50%',
      zIndex: 450 + (thumbs.length - 1 - i),
      margin: 0,
      boxSizing: 'border-box',
      opacity: 1,
      visibility: 'visible',
    })
  })

  // Hide source pile only once flyers own the pixels; clear fan off-screen
  pile.classList.add('stack__pile--dispersing')
  pileFannedId.value = null
  pileFanned.value = false
  preparingBoardId.value = null

  await new Promise<void>((resolve) => {
    gsap.to(thumbs, {
      left: (i: number) => dests[i]!.left,
      top: (i: number) => dests[i]!.top,
      width: size,
      height: size,
      rotation: 0,
      duration: 0.6,
      ease: 'power3.inOut',
      stagger: 0,
      onComplete: () => {
        gsap.set(thumbs, {
          clearProps:
            'position,left,top,width,height,zIndex,margin,boxSizing,opacity,visibility,transform,rotation',
        })
        flightSpacer.remove()
        // Stay at the top of the column (where the top-of-pile items land)
        if (scroll) scroll.scrollTop = 0
        requestAnimationFrame(() => {
          if (scroll) scroll.scrollTop = 0
          resolve()
        })
      },
    })
  })
}

const restackBoard = async (boardId: string) => {
  if (!import.meta.client) return
  if (restackingBoardId.value === boardId) return
  restackingBoardId.value = boardId
  const pile = pileEls.value[boardId]
  const column = columnEls.value[boardId]
  const board = moodboards.value.find((entry) => entry.id === boardId)
  if (pile && column && board) {
    const thumbs = [...column.querySelectorAll<HTMLElement>('.stack__column-thumb')]
    const pileRect = pile.getBoundingClientRect()
    const size = pileRect.width
    const froms = thumbs.map((thumb) => thumb.getBoundingClientRect())
    const preview = boardPilePreview(board)
    const total = preview.length
    // Same salt string as pilePoseSalt / pileCardStyle (unreversed item ids)
    const salt = boardColumnItems(board)
      .map((item) => item.id)
      .join('|')
    const poses = thumbs.map((thumb, i) => {
      const id = thumb.dataset.columnId || ''
      const pileIndex = preview.findIndex((item) => item.id === id)
      const index = pileIndex >= 0 ? pileIndex : Math.max(0, total - 1 - i)
      return pileRestPose(id, index, total, salt)
    })

    // Suppress pile transform transition so handoff doesn’t re-tween
    pile.classList.add('stack__pile--restacking')

    // Column order: top-of-pile first — keep that item highest z through the flight
    thumbs.forEach((thumb, i) => {
      gsap.set(thumb, {
        position: 'fixed',
        left: froms[i]!.left,
        top: froms[i]!.top,
        width: size,
        height: size,
        rotation: 0,
        transformOrigin: '50% 50%',
        zIndex: 450 + (thumbs.length - 1 - i),
        margin: 0,
      })
    })
    await new Promise<void>((resolve) => {
      gsap.to(thumbs, {
        left: (i: number) => pileRect.left + poses[i]!.x,
        top: (i: number) => pileRect.top + poses[i]!.y,
        width: size,
        height: size,
        rotation: (i: number) => poses[i]!.rot,
        duration: 0.45,
        ease: 'power3.inOut',
        stagger: 0,
        onComplete: () => resolve(),
      })
    })

    // Reveal pile under flyers at the same pose, then drop flyers
    pile.classList.remove('stack__pile--dispersing')
    await nextTick()
    gsap.set(thumbs, {
      clearProps: 'position,left,top,width,height,zIndex,margin,transform,rotation',
    })
    pile.classList.remove('stack__pile--restacking')
  } else {
    pileEls.value[boardId]?.classList.remove('stack__pile--dispersing')
  }
  expandedBoardIds.value = expandedBoardIds.value.filter((id) => id !== boardId)
  const { [boardId]: _removed, ...restLayouts } = columnLayouts.value
  columnLayouts.value = restLayouts
  if (restackingBoardId.value === boardId) restackingBoardId.value = null
}

const onPileClick = (boardId: string) => {
  const board = moodboards.value.find((entry) => entry.id === boardId)
  setActiveMoodboard(boardId)
  pileRef.value = pileEls.value[boardId] || null
  if (!board?.items.length) return
  if (isMoodboard.value) {
    if (expandedBoardIds.value.includes(boardId)) {
      void restackBoard(boardId)
    } else {
      void disperseBoard(boardId)
    }
    return
  }
  void openFromPile()
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

const openProduct = async (item: BucketItem, event?: MouseEvent) => {
  const slug = productSlug(item)
  if (!slug) return
  const source =
    ((event?.currentTarget as HTMLElement | null)?.querySelector('img') as HTMLElement | null) ||
    null
  const index = galleryIndex(item)
  const urls = galleryUrls(item)
  const flipSrc = urls[index] || item.imageUrl || null
  if (flipSrc) void prefetchImage(flipSrc)

  // Hold flyer until cart UI has faded; product fetch runs in parallel
  beginFlipOpenGate()
  pdpFocusItemId.value = item.id
  controlsVisible.value = false
  gridLinesVisible.value = false

  // Warm ProductDetail's useAsyncData cache so mount isn't cold
  const cacheKey = `product-detail-${slug}`
  const nuxtApp = useNuxtApp()
  if (nuxtApp.payload.data[cacheKey] == null) {
    void fetchProduct(slug).then((data) => {
      if (data) nuxtApp.payload.data[cacheKey] = data
    })
  }

  open(slug, {
    source,
    imageIndex: index,
    flipSrc,
    bucketItemId: item.id,
  })

  await wait(PDP_CART_FADE_MS)
  releaseFlipOpenGate()
}

watch(returnImage, (value) => {
  if (!value) return
  const targetId =
    value.bucketItemId ||
    items.value.find((item) => productIdFromBucketId(item.id) === value.productId)?.id
  if (!targetId) return
  setItemImageIndex(targetId, value.index)
})

watch(productOverlayOpen, (on) => {
  if (on) return
  pdpFocusItemId.value = null
  // Restore cart chrome if the selection stage is still up underneath
  if (stagePresent.value && stageVisible.value) {
    gridLinesVisible.value = true
    controlsVisible.value = true
  }
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

/** Drop cart stage instantly (moodboard cream already covering). */
const dropStageInstant = async () => {
  controlsVisible.value = false
  gridLinesVisible.value = false
  pileCountVisible.value = true
  stageVisible.value = false
  cellsReady.value = false
  softEnter.value = false
  flipSurface.value = 'pile'
  keepPileForFlip.value = false
  stagePresent.value = false
  unshelveInactiveRail()
  await nextTick()
  resetShelvedRail()
}

const onBuildMoodboard = async () => {
  // Empty canvas — selections stay in the rail; drag them on when ready
  resetMoodboard()
  createBoard([], [])

  if (isOpen.value || stagePresent.value) {
    // Gather Flip while keeping the cream cart backdrop, then hand off to board
    await closeToPile({ handoffBackdrop: true })
    openMoodboard({ skipBgFade: true })
    // Wait until board cream is painted before dropping the cart stage
    await nextTick()
    await waitFrames(2)
    await dropStageInstant()
    return
  }

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
  const el =
    pileEls.value[activeMoodboardId.value || ''] ||
    pileRef.value
  if (el) {
    pileRef.value = el
    pileAnchor.value = el.getBoundingClientRect()
    return
  }
  // Default bottom-left footprint before the pile mounts (matches one grid cell)
  syncCellSize()
  const size = cellSizePx.value || window.innerWidth / STACK_COLS
  pileAnchor.value = new DOMRect(0, window.innerHeight - size, size, size)
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
  // Keep rail mounted through the fade so the pile stays visible; other stacks rise
  unshelveInactiveRail()
  await wait(BACKDROP_CLOSE_MS)
  keepPileForFlip.value = false
  stagePresent.value = false
  await nextTick()
  resetShelvedRail()
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
  pileRef.value = pileEls.value[activeMoodboardId.value || ''] || pileRef.value
  pileFanned.value = true
  pileFannedId.value = activeMoodboardId.value
  pileCountVisible.value = false
  isFlipping.value = true
  cellsReady.value = false
  softEnter.value = false
  flipSurface.value = 'pile'
  keepPileForFlip.value = true
  controlsVisible.value = false
  gridLinesVisible.value = false
  scheduleControlsFadeIn()
  // 1) Backdrop fade in — other stacks drop away on the same beat
  shelveInactiveRail()
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

const closeToPile = async (opts?: { handoffBackdrop?: boolean }) => {
  const handoff = !!opts?.handoffBackdrop

  if (!import.meta.client || isFlipping.value) {
    clearAllCellPhases()
    clearPendingRemovals()
    dismissDrawer()
    controlsVisible.value = false
    gridLinesVisible.value = false
    if (!handoff) {
      stageVisible.value = false
      stagePresent.value = false
    }
    cellsReady.value = false
    flipSurface.value = 'pile'
    keepPileForFlip.value = handoff
    pileCountVisible.value = true
    return
  }
  if (!isOpen.value) {
    if (handoff && stagePresent.value) {
      clearAllCellPhases()
      clearPendingRemovals()
      return
    }
    await finishClose()
    return
  }
  if (panelTab.value !== 'selections' || !selectionEntries.value.length) {
    if (handoff) {
      clearAllCellPhases()
      clearPendingRemovals()
      dismissDrawer()
      return
    }
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
    if (handoff) {
      clearAllCellPhases()
      clearPendingRemovals()
      dismissDrawer()
      return
    }
    await finishClose()
    return
  }

  syncCellSize()
  const medias = gridRef.value?.querySelectorAll('.stack__cell-media[data-flip-id]')
  const state = medias?.length ? Flip.getState(medias) : null
  isFlipping.value = true
  cellsReady.value = false
  // Hand flip ids to pile and remount the rail (hidden while cart is open)
  flipSurface.value = 'pile'
  keepPileForFlip.value = true
  dismissDrawer()
  await nextTick()
  await nextTick()
  parkInactiveRail()
  pileRef.value = pileEls.value[activeMoodboardId.value || ''] || pileRef.value
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

  if (handoff) {
    // Keep cream stage up — moodboard mounts on top with the same bg
    clearAllCellPhases()
    clearPendingRemovals()
    return
  }

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
    // PDP: restore full opacity. Grid thumbs: settle at 0.1 (hover brings them back).
    const targetOpacity = productOverlayOpen.value ? '1' : '0.1'
    window.setTimeout(() => {
      const el = resolveFlySource()
      if (!el) return
      gsap.killTweensOf(el)
      el.style.setProperty('transition', 'opacity 2s ease')
      el.style.setProperty('opacity', '0')
      void el.offsetWidth
      el.style.setProperty('opacity', targetOpacity)
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

watch(isMoodboard, (on) => {
  if (import.meta.client) {
    if (on) lockPageScroll()
    else unlockPageScroll()
  }
  if (!on) {
    expandedBoardIds.value = []
    preparingBoardId.value = null
    columnReturningId.value = null
    restackingBoardId.value = null
  }
})

/** After board bg + info panel fade in, open this selection’s column. */
watch(moodboardSurfaceReady, async (ready) => {
  if (!ready || !import.meta.client) return
  const id = activeMoodboardId.value
  if (!id) return
  const board = moodboards.value.find((entry) => entry.id === id)
  if (!board?.items.length) return
  if (expandedBoardIds.value.includes(id)) return
  await nextTick()
  await waitFrames(2)
  await disperseBoard(id)
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

const onWinResize = () => {
  syncCellSize()
  syncAllColumnLayouts()
}

onMounted(() => {
  registerAnimatedClose(() => {
    void closeToPile()
  })
  registerMoodboardRestack(async () => {
    const ids = [...expandedBoardIds.value]
    await Promise.all(ids.map((id) => restackBoard(id)))
  })
  registerMoodboardReturnToColumn((opts) => returnItemToColumn(opts))
  if (import.meta.client) {
    syncCellSize()
    window.addEventListener('resize', onWinResize)
  }
})

onBeforeUnmount(() => {
  registerAnimatedClose(null)
  registerMoodboardRestack(null)
  registerMoodboardReturnToColumn(null)
  cellRo?.disconnect()
  cellRo = null
  clearColumnPointerListeners()
  destroyColumnGhost()
  if (import.meta.client) {
    window.removeEventListener('resize', onWinResize)
    document.documentElement.classList.remove('bucket-stack-open')
    document.documentElement.classList.remove('stack-column-dragging')
    if (stagePresent.value) unlockPageScroll()
    if (isMoodboard.value) unlockPageScroll()
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
  overflow: visible;
}

.stack--open {
  z-index: 280;
}

/* Above ProductOverlay (320) so piles stay visible on PDP */
.stack--above-pdp {
  z-index: 340;
}

.stack--moodboard {
  z-index: 310; /* above MoodboardCanvas (300) */
}

.stack__rail {
  position: fixed;
  left: 0;
  bottom: 0;
  z-index: 210;
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 0;
  pointer-events: none;
  overflow: visible;
}

.stack__pile-wrap {
  position: relative;
  width: var(--stack-cell-size);
  height: var(--stack-cell-size);
  flex: 0 0 auto;
  pointer-events: auto;
  overflow: visible;
}

.stack__pile {
  position: absolute;
  inset: 0;
  z-index: 2;
  /* Same footprint as one open-grid cell so Flip keeps image size */
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: auto;
  border: 0;
  background: transparent;
  cursor: pointer;
  will-change: transform;
  padding: 0;
}

/* Expand hit area so fanned cards (esp. below) keep hover without shifting layout */
.stack__pile::after {
  content: '';
  position: absolute;
  inset: -48px -56px -80px -56px;
}

/* Above stage backdrop/grid, below controls */
.stack--flipping .stack__rail {
  z-index: 2;
}

.stack--flipping .stack__pile {
  overflow: visible;
}

.stack__create {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  width: var(--stack-cell-size);
  height: var(--stack-cell-size);
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  pointer-events: none;
  display: grid;
  place-items: center;
}

.stack__rail--hot .stack__create,
.stack__create--visible {
  pointer-events: auto;
}

.stack__create-plus {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  border: 1px solid var(--charcoal);
  color: var(--charcoal);
  background: var(--cream);
  display: grid;
  place-items: center;
  font-size: 1.5rem;
  line-height: 1;
  opacity: 0;
  transform: scale(0.85);
  transition:
    opacity 0.28s ease,
    transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.stack__create--visible .stack__create-plus,
.stack__rail--hot .stack__create-plus {
  opacity: 1;
  transform: scale(1);
}

.stack__column {
  /* Full viewport height — top edge to bottom edge */
  position: fixed;
  z-index: 312;
  overflow: hidden;
  pointer-events: auto;
}

.stack__column-scroll {
  position: absolute;
  inset: 0;
  overflow-x: hidden;
  overflow-y: scroll;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  pointer-events: auto;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}

/* Pushes thumbs down when there aren't enough to fill the viewport */
.stack__column-pin {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  pointer-events: none;
}

/* Pile footprint reserved at the bottom — last thumb sits on its top edge */
.stack__column-foot {
  flex: 0 0 var(--stack-cell-size);
  width: 100%;
  pointer-events: none;
}

/* Hide laid-out thumbs until flyers are parked on the pile */
.stack__column--preparing .stack__column-thumb {
  opacity: 0;
  visibility: hidden;
}

.stack__column-thumb {
  width: 100%;
  aspect-ratio: 1;
  flex: 0 0 auto;
  overflow: hidden;
  background: transparent;
  cursor: grab;
  cursor: -webkit-grab;
  touch-action: pan-y;
  user-select: none;
}

.stack__column-thumb:hover {
  cursor: grab;
  cursor: -webkit-grab;
}

.stack__column-thumb:active {
  cursor: grabbing;
  cursor: -webkit-grabbing;
}

/* Ghost is the item — source disappears while dragging */
.stack__column-thumb--lifted {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none;
}

/* Reserved slot while a board item Flips back — keeps layout, no image pop */
.stack__column-thumb--returning {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

.stack__column-ghost {
  opacity: 1 !important;
  visibility: visible !important;
  cursor: grabbing;
  cursor: -webkit-grabbing;
  box-shadow: none;
  background: transparent;
}

.stack__column-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: var(--stack-cell-pad, 50px);
  box-sizing: border-box;
  pointer-events: none;
}

/* Ghost is already sized to the visual content box — no square padding */
.stack__column-ghost img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 0;
  box-sizing: border-box;
  pointer-events: none;
}

:global(html.stack-column-dragging),
:global(html.stack-column-dragging *) {
  cursor: grabbing !important;
}

.stack__column-close {
  position: fixed;
  bottom: 20px;
  z-index: 320;
  width: 3.25rem;
  height: 3.25rem;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--charcoal);
  display: grid;
  place-items: center;
  cursor: pointer;
  transform: translateX(-50%);
  pointer-events: auto;
}

.stack-column-close-enter-active {
  transition:
    opacity 0.3s ease 0.15s,
    transform 0.35s cubic-bezier(0.22, 1, 0.36, 1) 0.15s;
}

.stack-column-close-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.stack-column-close-enter-from,
.stack-column-close-leave-to {
  opacity: 0;
  transform: translateX(-50%) scale(0.88);
}

.stack-column-close-enter-to,
.stack-column-close-leave-from {
  opacity: 1;
  transform: translateX(-50%) scale(1);
}

.stack__column-close-icon {
  position: relative;
  display: block;
  width: 1rem;
  height: 1rem;
}

.stack__column-close-bar {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 100%;
  height: 1px;
  background: var(--warm-white);
  transform-origin: center center;
}

.stack__column-close-bar:first-child {
  transform: translate(-50%, -50%) rotate(45deg);
}

.stack__column-close-bar:last-child {
  transform: translate(-50%, -50%) rotate(-45deg);
}

.stack__pile--expanded,
.stack__pile--dispersing {
  pointer-events: none;
}

/* Hide pile only once flyers have taken over — avoids an instant reorder flash */
.stack__pile--dispersing .stack__pile-card {
  visibility: hidden;
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
.stack--flipping .stack__pile-card,
.stack__pile--restacking .stack__pile-card {
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
  transition:
    border-color 0.32s ease,
    opacity 0.3s ease;
}

.stack__grid--lines .stack__cell {
  border-right-color: var(--grid-line);
  border-bottom-color: var(--grid-line);
}

/* Opening PDP from cart — other items fade before the flyer moves */
.stack__grid--pdp-focus .stack__cell:not(.stack__cell--pdp-focus) {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.stack__grid--pdp-focus .stack__cell--pdp-focus .stack__cell-ctrl {
  opacity: 0 !important;
  pointer-events: none !important;
  transition: opacity 0.3s ease;
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
  opacity: 1;
  pointer-events: none;
  /* Park below the viewport; slide up on open */
  transform: translateY(calc(100% + var(--gutter) + 1rem));
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.stack__controls--visible {
  pointer-events: auto;
  transform: translateY(0);
  /* Slight enter delay; leave has no delay so close feels earlier than backdrop */
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1) 0.2s;
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
