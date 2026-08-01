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
          class="stack__pile-card"
          :class="{ 'stack__pile-card--fan': pileFanSlot(index, pilePreview.length) > 0 }"
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
        <span v-if="settledItems.length" class="stack__pile-count interface">
          {{ settledItems.length }}
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
          :style="gridStyle"
          data-lenis-prevent
        >
          <div
            v-for="(item, index) in items"
            :key="item.id"
            class="stack__cell"
            :style="softEnter ? softEnterStyle(index) : undefined"
          >
            <div
              class="stack__cell-media"
              :data-flip-id="flipSurface === 'cells' ? item.id : undefined"
            >
              <div class="stack__cell-frame">
                <button
                  type="button"
                  class="stack__cell-hit"
                  :aria-label="`Open ${item.title}`"
                  @click="openProduct(item, $event)"
                >
                  <img
                    v-if="item.imageUrl"
                    :src="item.imageUrl"
                    :alt="item.title"
                    class="stack__cell-image"
                  />
                </button>
                <AddButton
                  class="stack__cell-ctrl stack__cell-ctrl--remove"
                  variant="remove"
                  :label="`Remove ${item.title}`"
                  @click.stop="removeItem(item.id)"
                />
                <ImageCycleArrows
                  v-if="galleryCount(item) > 1"
                  class="stack__cell-ctrl stack__cell-ctrl--cycle"
                  :index="galleryIndex(item)"
                  :count="galleryCount(item)"
                  hide-count
                  boxed
                  @prev="cycleItemImage(item.id, -1)"
                  @next="cycleItemImage(item.id, 1)"
                />
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
        <button type="button" class="stack__close interface" @click="requestClose">
          Close
        </button>

        <input
          v-if="isEditing"
          ref="titleInput"
          v-model="editName"
          type="text"
          class="stack__title-input interface"
          aria-label="Selection name"
          @keydown.enter.prevent="saveName"
          @keydown.esc.prevent="cancelEdit"
          @blur="saveName"
        />
        <p v-else class="stack__title interface">
          {{ activeMoodboard?.name || 'My Selection' }}
        </p>

        <div class="stack__control-links">
          <button type="button" class="stack__link interface" @click="startEdit">
            Rename
          </button>
          <button
            type="button"
            class="stack__link interface"
            :disabled="!items.length"
            @click="clearActiveItems"
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
import type { BucketItem } from '~/composables/useBucket'
import { uniqueImageUrls } from '~/composables/productImages'
import { imageAssetKey } from '~/composables/useSanityImage'

const {
  items,
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
  clearActiveItems,
  removeItem,
  cycleItemImage,
  pendingFly,
  consumePendingFly,
} = useBucket()
const { initFromBucket, snapshot } = useMoodboard()
const { createBoard } = useBoards()
const { openFromBucket } = useEnquiryForm()
const { open } = useProductOverlay()

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
/** Controls fade independently — out earlier than the backdrop on close. */
const controlsVisible = ref(false)
/** Which surface currently owns data-flip-id (never both). */
const flipSurface = ref<'pile' | 'cells'>('pile')
/** Keep pile mounted during open Flip so cards can fly free (not clipped by cells). */
const keepPileForFlip = ref(false)
/** Hover fan — locked through open so Flip.fit starts from fanned positions. */
const pileFanned = ref(false)
/** Square track size from grid width / cols — keeps cells square without overlap. */
const cellSizePx = ref(0)
/** Cell images ready (after Flip or soft-enter). Hidden during backdrop-only phase. */
const cellsReady = ref(false)
/** CSS cell fade — only for non-Flip opens (e.g. header). Avoids post-Flip flash. */
const softEnter = ref(false)

const BACKDROP_MS = 550
const CONTROLS_FADE_IN_DELAY_MS = 400
const CONTROLS_FADE_OUT_DELAY_MS = 100
const FLIP_DURATION = 0.95
const FLIP_STAGGER = 0.075
/** Fixed column count — cell = pile = 1/6 viewport width, square */
const STACK_COLS = 6

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

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
    items.value.length > 0,
)

/** All settled items in the pile (reversed so newest sits on top) — needed for Flip ids. */
const pilePreview = computed(() => settledItems.value.slice().reverse())

const gridDims = computed(() => {
  const n = Math.max(items.value.length, 1)
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

const hashAngle = (id: string) => {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return ((h % 11) - 5) * 0.9 // about -4.5° … 4.5°
}

/**
 * Fan slot from top of pile (0 = top card, stays put).
 * 1–2 peel up/left/right; 3–4 side; 5–7 drop below — up to 8 cards total.
 */
const FAN_OFFSETS: Array<{ x: number; y: number; r: number } | null> = [
  null, // 1st — top stays
  { x: -34, y: -40, r: -9 }, // 2nd — up-left
  { x: 36, y: -32, r: 8 }, // 3rd — up-right
  { x: -48, y: 4, r: -6 }, // 4th — left
  { x: -26, y: 48, r: -4 }, // 5th — below-left
  { x: 8, y: 58, r: 2 }, // 6th — below
  { x: 34, y: 50, r: 6 }, // 7th — below-right
  { x: 46, y: -8, r: 7 }, // 8th — right
]

/** 0 = no fan; 1–7 = slot in FAN_OFFSETS */
const pileFanSlot = (index: number, total: number) => {
  const fromTop = total - 1 - index
  return fromTop >= 1 && fromTop <= 7 ? fromTop : 0
}

const onPileMouseEnter = () => {
  if (isFlipping.value) return
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

const pileCardStyle = (id: string, index: number, total: number) => {
  const t = total <= 1 ? 0 : index / (total - 1)
  const x = (t - 0.5) * 10
  const y = (0.5 - t) * 6
  const isTop = index === total - 1
  // Top card: fixed slight tilt; others keep their hashed angle
  const rot = isTop ? -1 : hashAngle(id)
  const slot = pileFanSlot(index, total)
  const fan = slot ? FAN_OFFSETS[slot] : null
  const hoverX = fan ? x + fan.x : x
  const hoverY = fan ? y + fan.y : y
  const hoverRot = fan ? rot + fan.r : rot

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
  open(slug, { source })
}

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
  const index = items.value.findIndex((item) => item.id === id)
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
    const medias = gridRef.value?.querySelectorAll<HTMLElement>('.stack__cell-media')
    if (!cards?.length || !medias?.length) {
      resolve()
      return
    }

    const mediaByIndex = Array.from(medias)
    const cardById = new Map(
      Array.from(cards).map((el) => [el.getAttribute('data-flip-id') || '', el]),
    )

    let pending = 0
    const done = () => {
      pending -= 1
      if (pending <= 0) resolve()
    }

    items.value.forEach((item, index) => {
      const card = cardById.get(item.id)
      const media = mediaByIndex[index]
      if (!card || !media) return
      pending += 1
      Flip.fit(card, media, {
        absolute: true,
        duration: FLIP_DURATION,
        delay: staggerDelayForIndex(index, 'open'),
        ease: 'power3.inOut',
        onComplete: done,
      })
    })

    if (pending === 0) resolve()
  })

const fadeOutStage = async () => {
  // Fade opacity first; keep stagePresent so visibility/grid aren’t yanked away
  controlsVisible.value = false
  stageVisible.value = false
  cellsReady.value = false
  softEnter.value = false
  flipSurface.value = 'pile'
  keepPileForFlip.value = false
  await wait(BACKDROP_MS)
  stagePresent.value = false
}

const revealStage = async () => {
  stagePresent.value = true
  await nextTick()
  syncCellSize()
  // Paint opacity:0 once, then enable --visible so the fade-in runs
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      stageVisible.value = true
      resolve()
    })
  })
  await wait(BACKDROP_MS)
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
  isFlipping.value = true
  cellsReady.value = false
  softEnter.value = false
  flipSurface.value = 'pile'
  keepPileForFlip.value = true
  controlsVisible.value = false
  scheduleControlsFadeIn()
  // 1) Fade backdrop + grid chrome; keep pile mounted so cards aren’t cell-clipped
  await revealStage()
  // 2) Open grid (media hidden), fly pile cards from fanned pose into cells
  openDrawer('selections')
  await nextTick()
  syncCellSize()
  await fitPileCardsToCells()
  // 3) Swap to cell media at the same size/place, then drop the pile
  flipSurface.value = 'cells'
  cellsReady.value = true
  keepPileForFlip.value = false
  pileFanned.value = false
  isFlipping.value = false
}

const closeToPile = async () => {
  if (!import.meta.client || isFlipping.value) {
    dismissDrawer()
    controlsVisible.value = false
    stageVisible.value = false
    stagePresent.value = false
    cellsReady.value = false
    flipSurface.value = 'pile'
    keepPileForFlip.value = false
    return
  }
  if (!isOpen.value) {
    await fadeOutStage()
    return
  }
  if (panelTab.value !== 'selections' || !items.value.length) {
    await fadeOutStage()
    dismissDrawer()
    return
  }

  // Controls fade out shortly after click — before the backdrop
  void wait(CONTROLS_FADE_OUT_DELAY_MS).then(() => {
    controlsVisible.value = false
  })

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
    await runFlip(state, cards, { mode: 'close' })
    // Drop Flip inline transforms so CSS pile vars own the pose again
    gsap.set(cards, { clearProps: 'transform,top,left,right,bottom,width,height,position,margin' })
    void pileRef.value?.offsetHeight
  }
  // Re-enable CSS transitions before backdrop fade — otherwise a hover during
  // fade applies the fan with transition:none and it “pops” on next hover too
  isFlipping.value = false
  await syncPileFanFromHover()
  await fadeOutStage()
}

const requestClose = () => {
  void closeToPile()
}

const flyIntoPile = (payload: NonNullable<typeof pendingFly.value>) => {
  if (!import.meta.client) {
    clearArriving(payload.itemId)
    return
  }
  measurePileAnchor()
  const dest = pileAnchor.value
  if (!dest) {
    clearArriving(payload.itemId)
    return
  }

  const flyer = document.createElement('img')
  flyer.src = payload.imageUrl
  flyer.alt = ''
  flyer.setAttribute('aria-hidden', 'true')
  Object.assign(flyer.style, {
    position: 'fixed',
    left: `${payload.from.left}px`,
    top: `${payload.from.top}px`,
    width: `${payload.from.width}px`,
    height: `${payload.from.height}px`,
    objectFit: 'contain',
    borderRadius: '2px',
    zIndex: '400',
    pointerEvents: 'none',
    margin: '0',
    boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
  })
  document.body.appendChild(flyer)

  // Land at full cell size — matches open-grid media / pile card
  const destSize = Math.min(dest.width, dest.height)
  const destLeft = dest.left
  const destTop = dest.top

  // Playful arch: rise then settle into the pile (Safari-like)
  const midX = payload.from.left + (destLeft - payload.from.left) * 0.45
  const midY = Math.min(payload.from.top, destTop) - Math.min(140, window.innerHeight * 0.18)

  gsap
    .timeline({
      onComplete: () => {
        flyer.remove()
        clearArriving(payload.itemId)
      },
    })
    .to(flyer, {
      left: midX,
      top: midY,
      width: payload.from.width * 0.85,
      height: payload.from.height * 0.85,
      rotate: hashAngle(payload.itemId) * 0.5,
      duration: 0.32,
      ease: 'power2.out',
    })
    .to(flyer, {
      left: destLeft,
      top: destTop,
      width: destSize,
      height: destSize,
      rotate: hashAngle(payload.itemId),
      duration: 0.42,
      ease: 'power3.in',
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

  // Header / non-Flip open: fade grid first, then stagger cells in
  cellsReady.value = false
  softEnter.value = false
  controlsVisible.value = false
  flipSurface.value = 'cells'
  scheduleControlsFadeIn()
  await revealStage()
  if (!isOpen.value || isFlipping.value) return
  cellsReady.value = true
  softEnter.value = true
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
  left: var(--gutter);
  bottom: var(--gutter);
  z-index: 210;
  /* Same footprint as one open-grid cell so Flip keeps image size */
  width: var(--stack-cell-size);
  height: var(--stack-cell-size);
  overflow: visible;
  pointer-events: auto;
  border: 0;
  background: transparent;
  cursor: pointer;
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

.stack__pile-count {
  position: absolute;
  right: 12%;
  bottom: 12%;
  z-index: 20;
  min-width: 1.6rem;
  padding: 0.25rem 0.45rem;
  border-radius: 6px;
  background: var(--charcoal);
  color: var(--warm-white);
  font-size: var(--text-xs);
}

.stack__stage {
  position: absolute;
  inset: 0;
  z-index: 1;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  /* Delay visibility:hidden until opacity fade finishes */
  transition:
    opacity 0.55s ease,
    visibility 0s linear 0.55s;
}

.stack__stage--visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition:
    opacity 0.55s ease,
    visibility 0s linear 0s;
}

.stack__backdrop {
  position: absolute;
  inset: 0;
  background: var(--background-color, var(--cream));
}


/*
  Keep cell media invisible until cellsReady.
  (Previously :not(.stack--flipping) allowed a flash at rest grid positions on open
  before Flip rewound them to the pile.)
*/
.stack:not(.stack--cells-ready) .stack__cell-media {
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
  border-top: 1px solid var(--grid-line);
  border-left: 1px solid var(--grid-line);
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
  border-right: 1px solid var(--grid-line);
  border-bottom: 1px solid var(--grid-line);
  box-sizing: border-box;
}

/* Only this layer Flips — leaving the shell keeps the grid shape stable */
.stack__cell-media {
  position: absolute;
  inset: 0;
  min-width: 0;
  min-height: 0;
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
}

.stack__cell-hit {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  overflow: hidden;
}

.stack__cell-image {
  display: block;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  object-position: center;
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

.stack__close {
  align-self: flex-end;
  font-size: var(--text-sm);
  text-decoration: underline;
  text-underline-offset: 4px;
  color: var(--charcoal);
}

.stack__title {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--charcoal);
}

.stack__title-input {
  width: 100%;
  margin: 0;
  padding: 0.55rem 0.65rem;
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
