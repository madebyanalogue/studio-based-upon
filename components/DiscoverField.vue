<template>
  <section
    ref="stageEl"
    class="discover"
    :class="{ 'discover--touch': isTouch, 'discover--reduce': reduceMotion, 'discover--settled': fieldSettled }"
    :style="{ '--field-zoom': zoom }"
    :data-cursor-label="closeOrbCursor ? 'Close' : undefined"
    aria-label="Discover"
  >
    <p class="sr-only">
      Explore the work surface. Scroll to zoom, unless an orb is open, in which case the scroll turns it. Arrow keys move the field. G toggles the grid, H toggles the lower grid, J toggles the safe zone. Activate an image to view it. A stack splays, a folder opens, an orb turns.
    </p>

    <div v-show="showFloor" class="discover__floor" :style="floorStyle" aria-hidden="true" />

    <div class="discover__world" :style="worldStyle">
      <div class="discover__edge" aria-hidden="true" />
      <div v-show="showGrid" class="discover__grid" :style="gridStyle" aria-hidden="true" />

      <div
        v-if="colourFolder"
        class="discover__node colour folder"
        data-node-id="colour"
        :class="{ 'is-open': openFolders.colour, 'is-dragging': !!hot.colour }"
        :style="nodeStyle('colour')"
      >
        <button
          type="button"
          class="colour__word h4"
          :data-cursor-label="openFolders.colour ? 'Close' : 'Open'"
          :aria-expanded="!!openFolders.colour"
          aria-label="Colour"
          @click="toggleFolder('colour')"
        >
          Colour
        </button>
        <DiscoverPiece
          v-for="piece in colourFolder.pieces"
          :key="piece.id"
          class="folder__piece"
          :class="{ 'is-dragging': !!hot[piece.id] }"
          :piece="piece"
          :live="!!openFolders.colour"
          :controls="false"
          :grid-add="!!openFolders.colour"
          :data-cursor-label="openFolders.colour ? 'Add +' : undefined"
          :frame-style="folderPieceStyle(piece, !!openFolders.colour)"
          loading="lazy"
        />
      </div>

      <span
        v-for="(mark, index) in field.marks"
        :key="`mark-${index}`"
        class="discover__mark interface"
        :style="{ transform: `translate3d(${mark.x}px, ${mark.y}px, 0)` }"
      >
        <svg v-if="mark.cross" class="discover__cross" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 0v16M0 8h16" />
        </svg>
        <span v-if="mark.text">{{ mark.text }}</span>
      </span>

      <article
        v-for="(cluster, clusterIndex) in visibleClusters"
        :key="cluster.id"
        class="discover__node"
        :data-node-id="cluster.id"
        :class="{ 'is-dragging': !!hot[cluster.id] }"
        :style="nodeStyle(cluster.id)"
      >
        <DiscoverPiece
          v-for="piece in cluster.pieces"
          :key="piece.id"
          :piece="piece"
          :class="{ 'is-dragging': !!hot[piece.id] }"
          :frame-style="clusterPieceStyle(piece)"
          :loading="clusterIndex === 0 ? 'eager' : 'lazy'"
        />
      </article>

      <div
        v-for="stack in visibleStacks"
        :key="stack.id"
        class="discover__node stack"
        :data-node-id="stack.id"
        :class="{
          'is-open': openStacks[stack.id],
          'is-fanned': fannedId === stack.id,
          'is-dragging': !!hot[stack.id],
        }"
        :style="nodeStyle(stack.id)"
        @mouseenter="fanStack(stack.id)"
        @mouseleave="unfanStack(stack.id)"
      >
        <div
          class="stack__plate"
          :style="stackPlateStyle(stack)"
          @pointermove="nudgeStack(stack.id, $event)"
          @pointerleave="clearStackNudge(stack.id)"
        >
          <button
            v-if="openStacks[stack.id]"
            type="button"
            class="stack__collapse"
            data-cursor-label="Collapse"
            aria-expanded="true"
            :aria-label="`Collapse ${stack.name}`"
            @click="toggleStack(stack.id)"
          />
          <DiscoverPiece
            v-for="(piece, index) in stack.pieces"
            :key="piece.id"
            class="stack__piece"
            :class="{ 'is-dragging': !!hot[piece.id] }"
            :piece="piece"
            :live="!!openStacks[stack.id]"
            :controls="false"
            :grid-add="!!openStacks[stack.id]"
            :data-cursor-label="openStacks[stack.id] ? 'Add +' : undefined"
            :frame-style="stackPieceStyle(stack, piece, index)"
            loading="lazy"
          />
          <button
            v-if="!openStacks[stack.id]"
            type="button"
            class="stack__toggle"
            data-cursor-label="Open Stack"
            aria-expanded="false"
            :aria-label="`Open Stack ${stack.name}`"
            @click="toggleStack(stack.id)"
          />
          <span class="stack__name h6">{{ stack.name }}</span>
        </div>
      </div>

      <DiscoverPiece
        v-for="piece in loose"
        :key="`loose-${piece.id}`"
        class="loose"
        :piece="piece"
        :frame-style="looseStyle(piece)"
        loading="lazy"
      />

      <DiscoverPiece
        v-for="piece in lifted"
        :key="`lifted-${piece.id}`"
        :piece="piece"
        :frame-style="clusterPieceStyle(piece)"
      />

      <DiscoverPiece
        v-for="piece in kept"
        :key="`kept-${piece.id}`"
        :piece="piece"
        :frame-style="clusterPieceStyle(piece)"
      />

      <div
        v-for="folder in visibleSleeves"
        :key="folder.id"
        class="discover__node folder"
        :data-node-id="folder.id"
        :class="{ 'is-open': openFolders[folder.id], 'is-dragging': !!hot[folder.id] }"
        :style="nodeStyle(folder.id)"
      >
        <button
          type="button"
          class="folder__sleeve"
          :data-cursor-label="openFolders[folder.id] ? 'Close' : 'Open'"
          :aria-expanded="!!openFolders[folder.id]"
          :aria-label="openFolders[folder.id] ? `Close ${folder.kicker}` : `Open ${folder.kicker}`"
          @click="toggleFolder(folder.id)"
        >
          <span class="folder__tab" aria-hidden="true" />
          <span class="folder__kicker interface">{{ folder.kicker }}</span>
          <span class="folder__label interface">{{ folder.label }}</span>
        </button>
        <DiscoverPiece
          v-for="piece in folder.pieces"
          :key="piece.id"
          class="folder__piece"
          :class="{ 'is-dragging': !!hot[piece.id] }"
          :piece="piece"
          :live="!!openFolders[folder.id]"
          :controls="false"
          :grid-add="!!openFolders[folder.id]"
          :data-cursor-label="openFolders[folder.id] ? 'Add +' : undefined"
          :frame-style="folderPieceStyle(piece, !!openFolders[folder.id])"
          loading="lazy"
        />
      </div>

      <div
        v-for="folder in visibleOrbs"
        :key="folder.id"
        class="discover__node orb"
        :data-node-id="folder.id"
        :class="{
          'is-open': openOrbs[folder.id],
          'is-fanned': fannedId === folder.id,
          'is-dragging': !!hot[folder.id],
          'is-opening': orbPhase[folder.id] === 'fan' || orbPhase[folder.id] === 'orb',
          'is-snapping': orbPhase[folder.id] === 'pile',
        }"
        :data-cursor="openOrbs[folder.id] ? 'default' : undefined"
        :style="nodeStyle(folder.id)"
        @mouseenter="fanOrb(folder.id)"
        @mouseleave="unfanOrb(folder.id)"
      >
        <div class="orb__body" :style="{ width: `${ORB_W}px`, height: `${ORB_H}px` }">
          <DiscoverPiece
            v-for="(piece, index) in folder.pieces"
            :key="piece.id"
            class="orb__piece"
            :class="{ 'is-dragging': !!hot[piece.id] }"
            :piece="piece"
            :live="!!openOrbs[folder.id]"
            :data-cursor="openOrbs[folder.id] ? 'default' : undefined"
            :frame-style="orbPieceStyle(folder, piece, index)"
            loading="lazy"
          />
          <button
            v-if="!openOrbs[folder.id]"
            type="button"
            class="orb__toggle"
            data-cursor-label="Open"
            aria-expanded="false"
            :aria-label="`Open ${folder.name}`"
            @click="toggleOrb(folder.id)"
          />
          <span class="orb__name h6">{{ folder.name }}</span>
        </div>
      </div>

      <div
        v-show="showKeep"
        class="discover__keep"
        :style="keepStyle"
      >
        <p class="discover__keep-tab h6">My gathered evidence</p>
      </div>
    </div>

    <svg class="discover__goo" viewBox="0 0 0 0" aria-hidden="true" focusable="false">
      <defs>
        <filter
          :id="entryFilterId"
          x="-60%"
          y="-120%"
          width="220%"
          height="340%"
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

    <p
      v-show="instructionVisible"
      class="discover__entry"
      :aria-hidden="instructionVisible ? undefined : 'true'"
    >
      <span
        class="discover__entry-title"
        :style="{
          filter: entryFilter,
          WebkitFilter: entryFilter,
          opacity: entryMelt.opacity,
        }"
      >Start anywhere.</span>
    </p>

    <button
      type="button"
      class="discover__surrender interface"
      data-cursor="default"
      :disabled="surrendering"
      @click="surrender"
    >
      Surrender
    </button>
  </section>
</template>

<script setup lang="ts">
import type { FieldPiece, FieldStack } from '~/lib/discover/composeField'
import { composeDiscoverField, DISCOVER_GRID, type DiscoverSource } from '~/lib/discover/composeField'
import { lockPageScroll, unlockPageScroll } from '~/composables/usePageScrollLock'
import gsap from 'gsap'

const props = defineProps<{
  sources: DiscoverSource[]
}>()

const field = computed(() => composeDiscoverField(props.sources))
const arrangementIndex = ref(0)
const arrangement = computed(
  () => field.value.arrangements[arrangementIndex.value] || field.value.arrangements[0]!,
)

const stageEl = ref<HTMLElement | null>(null)
const showGrid = ref(true)
const showFloor = ref(false)
const showKeep = ref(false)
const cam = reactive({ x: 168, y: 128 })
const openStacks = ref<Record<string, boolean>>({})
const openFolders = ref<Record<string, boolean>>({})
const openOrbs = ref<Record<string, boolean>>({})
const orbPhase = ref<Record<string, 'pile' | 'fan' | 'orb' | 'ready'>>({})
const orbTimers = new Map<string, number>()
const fannedId = ref<string | null>(null)
const lifted = ref<FieldPiece[]>([])
const loose = ref<FieldPiece[]>([])
watch(
  () => field.value.loose.map((piece) => piece.id).join('|'),
  (key) => {
    if (!key || loose.value.length) return
    loose.value = field.value.loose.map((piece) => ({ ...piece, materials: [...piece.materials] }))
  },
  { immediate: true },
)
const kept = ref<FieldPiece[]>([])
const GRID = 96
const KEEP_COLS = 18
const KEEP_ROWS = 11
const KEEP_W = GRID * KEEP_COLS
const KEEP_H = GRID * KEEP_ROWS
const keepBox = reactive({ x: 0, y: 0 })
const keepStyle = computed(() => ({
  left: `${keepBox.x}px`,
  top: `${keepBox.y}px`,
  width: `${KEEP_W}px`,
  height: `${KEEP_H}px`,
}))
const instructionVisible = ref(true)
const entryFilterId = `discover-entry-goo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
const entryMelt = reactive({ blur: 0.25, opacity: 1 })
const entryFilter = computed(() => `blur(${entryMelt.blur}px) url(#${entryFilterId})`)
let entryLeaving = false
let entryTween: gsap.core.Tween | null = null
const entryMeltState = { blur: 0.25, opacity: 1 }
const isTouch = ref(false)
const reduceMotion = ref(false)
const fieldSettled = ref(false)
const surrendering = ref(false)
const hot = ref<Record<string, boolean>>({})
const selectedId = ref<string | null>(null)
const ZOOM_START = 1.5
const zoom = ref(ZOOM_START)
const { isOpen: overlayOpen } = useProductOverlay()

const blockClick = ref(false)
const likeDragActive = ref(false)
provide('discover-block-click', blockClick)
provide('discover-selected-id', selectedId)
provide('discover-zoom', zoom)
provide('discover-sources', computed(() => props.sources))
provide('discover-like-drag', likeDragActive)
const homeScrollHint = useHomeScrollHint()

const pieceShift = reactive<Record<string, { x: number; y: number }>>({})
const nodeShift = reactive<Record<string, { x: number; y: number }>>({})
const pieceScale = reactive<Record<string, number>>({})

const returnPiece = (id: string) => {
  const onBoard =
    lifted.value.some((piece) => piece.id === id) || kept.value.some((piece) => piece.id === id)
  if (!onBoard) return false
  lifted.value = lifted.value.filter((piece) => piece.id !== id)
  kept.value = kept.value.filter((piece) => piece.id !== id)
  delete pieceShift[id]
  delete pieceScale[id]
  if (selectedId.value === id) selectedId.value = null
  return true
}
provide('discover-return-piece', returnPiece)

type ResizeDrag = {
  id: string
  corner: 'tl' | 'tr' | 'bl' | 'br'
  x: number
  y: number
  scale: number
  ox: number
  oy: number
  w: number
  h: number
}
let resize: ResizeDrag | null = null

type Drag =
  | { kind: 'frame'; x: number; y: number; camX: number; camY: number }
  | {
      kind: 'piece' | 'node'
      id: string
      x: number
      y: number
      ox: number
      oy: number
    }
  | {
      kind: 'orb'
      id: string
      x: number
      y: number
      lastX: number
      lastY: number
      pieceId: string | null
    }

const EDGE_MIN = 140
const MAX_SPEED = 16
const ZOOM_MIN = 0.4
const ZOOM_MAX = 2.5
let zoomTo = ZOOM_START
let zoomX = 0
let zoomY = 0
let targetX = 0
let targetY = 0
let velX = 0
let velY = 0
let flickX = 0
let flickY = 0
let glideX = 168
let glideY = 128
let raf = 0
let moved = false
let dragged = false
let drag: Drag | null = null
let pointerId = -1
const samples: { x: number; y: number; t: number }[] = []
let surrenderGen = 0
let removeMotionListener = () => {}
let removeStageObserver = () => {}

const FLOOR_PARALLAX = 0.38
const FLOOR_CELL = DISCOVER_GRID * 2
const stageBox = reactive({ w: 0, h: 0 })

const gridStyle = computed(() => ({
  '--grid-cell': `${DISCOVER_GRID}px`,
}))

const worldStyle = computed(() => ({
  width: `${field.value.world.w}px`,
  height: `${field.value.world.h}px`,
  transformOrigin: '0 0',
  transform: `translate3d(${-cam.x * zoom.value}px, ${-cam.y * zoom.value}px, 0) scale(${zoom.value})`,
}))

/** Lower grid uses larger cells that scale with zoom, locks to the main grid at the world centre, and lags toward the edges. */
const floorStyle = computed(() => {
  const z = zoom.value || 1
  const cell = FLOOR_CELL * z
  const centerX = field.value.world.w / 2
  const centerY = field.value.world.h / 2
  const focusX = cam.x + stageBox.w / (2 * z)
  const focusY = cam.y + stageBox.h / (2 * z)
  const screenX = (centerX - cam.x) * z
  const screenY = (centerY - cam.y) * z
  const anchorX = screenX + (focusX - centerX) * z * (1 - FLOOR_PARALLAX)
  const anchorY = screenY + (focusY - centerY) * z * (1 - FLOOR_PARALLAX)
  return {
    backgroundSize: `${cell}px ${cell}px`,
    backgroundPosition: `${anchorX - centerX * z}px ${anchorY - centerY * z}px`,
  }
})

const placementFor = (id: string) => arrangement.value.nodes.find((node) => node.id === id)

const shiftOf = (bag: Record<string, { x: number; y: number }>, id: string) =>
  bag[id] || { x: 0, y: 0 }

const scaleOf = (id: string) => pieceScale[id] || 1

const pieceWidth = (piece: FieldPiece) => piece.w * scaleOf(piece.id)
const pieceHeight = (piece: FieldPiece) => piece.h * scaleOf(piece.id)

const findPiece = (id: string) => {
  const held =
    kept.value.find((entry) => entry.id === id) ||
    lifted.value.find((entry) => entry.id === id) ||
    loose.value.find((entry) => entry.id === id)
  if (held) return held
  for (const cluster of field.value.clusters) {
    const piece = cluster.pieces.find((entry) => entry.id === id)
    if (piece) return piece
  }
  for (const stack of field.value.stacks) {
    const piece = stack.pieces.find((entry) => entry.id === id)
    if (piece) return piece
  }
  for (const folder of field.value.folders) {
    const piece = folder.pieces.find((entry) => entry.id === id)
    if (piece) return piece
  }
  return null
}

const nodeHasSelection = (id: string) => {
  const selected = selectedId.value
  if (!selected) return false
  const cluster = field.value.clusters.find((entry) => entry.id === id)
  if (cluster?.pieces.some((piece) => piece.id === selected)) return true
  const stack = visibleStacks.value.find((entry) => entry.id === id)
  if (stack?.pieces.some((piece) => piece.id === selected)) return true
  const folder = field.value.folders.find((entry) => entry.id === id)
  return !!folder?.pieces.some((piece) => piece.id === selected)
}

const nodeStyle = (id: string) => {
  const node = placementFor(id)
  const shift = shiftOf(nodeShift, id)
  const open = !!openStacks.value[id] || !!openFolders.value[id] || !!openOrbs.value[id]
  return {
    transform: `translate3d(${(node?.x ?? 0) + shift.x}px, ${(node?.y ?? 0) + shift.y}px, 0)`,
    transitionDelay: hot.value[id] ? '0s' : `${node?.delay ?? 0}s`,
    zIndex: hot.value[id] ? 40 : nodeHasSelection(id) ? 36 : open ? 24 : 1,
  }
}

const clusterPieceStyle = (piece: FieldPiece) => {
  const shift = shiftOf(pieceShift, piece.id)
  return {
    left: `${piece.x + shift.x}px`,
    top: `${piece.y + shift.y}px`,
    width: `${pieceWidth(piece)}px`,
    height: `${pieceHeight(piece)}px`,
    zIndex: selectedId.value === piece.id ? 30 : hot.value[piece.id] ? 8 : piece.z,
    transform: 'none',
  }
}

const looseStyle = (piece: FieldPiece) => {
  const shift = shiftOf(pieceShift, piece.id)
  return {
    left: `${piece.x + shift.x}px`,
    top: `${piece.y + shift.y}px`,
    width: `${pieceWidth(piece)}px`,
    height: `${pieceHeight(piece)}px`,
    zIndex: selectedId.value === piece.id || hot.value[piece.id] ? 30 : 5,
    transform: 'none',
  }
}

const STACK_CARD = 148
const OPEN_CARD = 160
const STACK_GAP = 40
const STACK_PAD = 32
const CLOSED_PAD = 36
const STACK_TITLE = 20
const PILE = [
  { x: -6, y: 8, r: -8 },
  { x: 8, y: 3, r: 5 },
  { x: -2, y: -1, r: -3 },
  { x: 5, y: 6, r: 7 },
  { x: -7, y: 2, r: -5 },
]
const FAN = [
  { x: -26, y: -18, r: -7 },
  { x: 28, y: -10, r: 8 },
  { x: 4, y: -30, r: -3 },
  { x: 18, y: 20, r: 6 },
  { x: -20, y: 16, r: -5 },
]

const containedSize = (piece: FieldPiece, card = STACK_CARD) => {
  const aspect = piece.w / Math.max(piece.h, 1)
  if (aspect >= 1) return { w: card, h: Math.max(1, Math.round(card / aspect)) }
  return { w: Math.max(1, Math.round(card * aspect)), h: card }
}

const stackBox = (pieces: FieldPiece[], open: boolean) => {
  if (!open) {
    return {
      w: STACK_CARD + CLOSED_PAD * 2,
      h: STACK_CARD + CLOSED_PAD + 52 + STACK_TITLE,
      cells: [] as { x: number; y: number }[],
      cols: 3,
      ox: 0,
      oy: 0,
    }
  }
  const cols = 3
  const rows = pieces.length > 6 ? 3 : 2
  const cell = DISCOVER_GRID
  const pitch = OPEN_CARD + STACK_GAP
  const groupW = cols * OPEN_CARD + (cols - 1) * STACK_GAP
  const groupH = rows * OPEN_CARD + (rows - 1) * STACK_GAP
  const padX = (cell * cols - groupW) / 2
  const padY = (cell * rows - groupH) / 2
  const cells = pieces.map((_, index) => ({
    x: padX + (index % cols) * pitch,
    y: padY + Math.floor(index / cols) * pitch,
  }))
  return {
    w: cell * cols,
    h: cell * rows + CLOSED_PAD,
    cells,
    cols,
    ox: cell,
    oy: rows > 2 ? cell : 0,
  }
}

const liftedIds = computed(() => new Set(lifted.value.map((piece) => piece.id)))
const keptIds = computed(() => new Set(kept.value.map((piece) => piece.id)))
const hiddenIds = computed(() => new Set([...liftedIds.value, ...keptIds.value]))

const visibleClusters = computed(() =>
  field.value.clusters
    .map((cluster) => ({
      ...cluster,
      pieces: cluster.pieces.filter((piece) => !hiddenIds.value.has(piece.id)),
    }))
    .filter((cluster) => cluster.pieces.length > 0),
)

const visibleFolders = computed(() =>
  field.value.folders.map((folder) => ({
    ...folder,
    pieces: folder.pieces.filter((piece) => !hiddenIds.value.has(piece.id)),
  })),
)

const closeOrbCursor = computed(() => Object.values(openOrbs.value).some(Boolean))
const visibleSleeves = computed(() =>
  visibleFolders.value.filter((folder) => folder.mode === 'sleeve' && folder.pieces.length > 0),
)
const colourFolder = computed(() => visibleFolders.value.find((folder) => folder.mode === 'colour') || null)
const visibleOrbs = computed(() => visibleFolders.value.filter((folder) => folder.mode === 'orb'))

const visibleStacks = computed(() =>
  field.value.stacks
    .map((stack) => ({
      ...stack,
      pieces: stack.pieces.filter((piece) => !hiddenIds.value.has(piece.id)),
    }))
    .filter((stack) => stack.pieces.length > 0),
)

const stackPlateStyle = (stack: FieldStack) => {
  const box = stackBox(stack.pieces, !!openStacks.value[stack.id])
  return {
    width: `${box.w}px`,
    height: `${box.h}px`,
    left: `${-box.ox}px`,
    top: `${-box.oy}px`,
  }
}

const stackFocus = ref<Record<string, number>>({})
const stackSettled = ref<Record<string, boolean>>({})
const stackSettleTimers = new Map<string, number>()

const settleStackHover = (id: string) => {
  const pending = stackSettleTimers.get(id)
  if (pending) window.clearTimeout(pending)
  const next = { ...stackSettled.value }
  delete next[id]
  stackSettled.value = next
  if (reduceMotion.value) {
    stackSettled.value = { ...stackSettled.value, [id]: true }
    return
  }
  stackSettleTimers.set(
    id,
    window.setTimeout(() => {
      stackSettleTimers.delete(id)
      if (!openStacks.value[id]) return
      stackSettled.value = { ...stackSettled.value, [id]: true }
    }, 760),
  )
}

const nudgeStack = (id: string, event: PointerEvent) => {
  if (!openStacks.value[id] || !stackSettled.value[id] || reduceMotion.value || drag?.kind === 'piece' || drag?.kind === 'node') return
  const plate = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
  if (!plate) return
  const pieces = [...plate.querySelectorAll<HTMLElement>('.stack__piece')]
  let closest = -1
  let best = Infinity
  pieces.forEach((el, index) => {
    const rect = el.getBoundingClientRect()
    const dx = event.clientX - (rect.left + rect.width / 2)
    const dy = event.clientY - (rect.top + rect.height / 2)
    const dist = dx * dx + dy * dy
    if (dist < best) {
      best = dist
      closest = index
    }
  })
  if (closest < 0 || stackFocus.value[id] === closest) return
  stackFocus.value = { ...stackFocus.value, [id]: closest }
}

const clearStackNudge = (id: string) => {
  if (stackFocus.value[id] == null) return
  const next = { ...stackFocus.value }
  delete next[id]
  stackFocus.value = next
}

const stackPieceStyle = (stack: FieldStack, piece: FieldPiece, index: number) => {
  const open = !!openStacks.value[stack.id]
  const shift = shiftOf(pieceShift, piece.id)
  const box = stackBox(stack.pieces, open)
  if (!open) {
    const rest = PILE[index % PILE.length]!
    const size = containedSize(piece)
    const x = (box.w - size.w) / 2 + rest.x + shift.x
    const y = CLOSED_PAD + (STACK_CARD - size.h) / 2 + rest.y + shift.y
    const r = rest.r
    return {
      width: `${size.w}px`,
      height: `${size.h}px`,
      zIndex: index + 1,
      opacity: 1,
      transform: `translate(${x}px, ${y}px) rotate(${r}deg)`,
    }
  }
  const cell = box.cells[index] || { x: 0, y: 0 }
  const size = containedSize(piece, OPEN_CARD)
  const rest = [-1, 0.5, -0.4, 1, -0.7][index % 5]!
  const focus = reduceMotion.value || !stackSettled.value[stack.id] ? undefined : stackFocus.value[stack.id]
  const cols = box.cols
  let ox = 0
  let oy = 0
  let rot = rest
  let scale = 1
  if (focus != null && focus >= 0 && !hot.value[piece.id]) {
    if (index === focus) {
      rot = 0
      scale = 1.14
    } else {
      const aCol = focus % cols
      const aRow = Math.floor(focus / cols)
      const col = index % cols
      const row = Math.floor(index / cols)
      const dx = col - aCol
      const dy = row - aRow
      const distSq = dx * dx + dy * dy || 1
      ox = (22 * dx) / distSq
      oy = (22 * dy) / distSq
    }
  }
  return {
    width: `${size.w}px`,
    height: `${size.h}px`,
    zIndex: index === focus ? 16 : selectedId.value === piece.id ? 12 : index + 1,
    opacity: 1,
    transform: `translate(${cell.x + (OPEN_CARD - size.w) / 2 + shift.x + ox}px, ${cell.y + (OPEN_CARD - size.h) / 2 + shift.y + oy}px) rotate(${rot}deg) scale(${scale})`,
  }
}

const ORB_TILE = 208
const ORB_RADIUS = 480
const ORB_W = STACK_CARD + 40
const ORB_H = STACK_CARD + 18 + STACK_TITLE
const orbPose = reactive<Record<string, { x: number; y: number; z: number }>>({})

type OrbRuntime = {
  ids: string[]
  points: { x: number; y: number; z: number }[]
  m: number[]
  tmp: number[]
  turn: number[]
  smooth: { x: number; y: number }
  prevX: number
  prevY: number
  incrX: number
  incrY: number
  quickX: (value: number) => void
  quickY: (value: number) => void
}

const orbRuntime = new Map<string, OrbRuntime>()

const spherePoints = (count: number) => {
  const golden = Math.PI * (3 - Math.sqrt(5))
  return Array.from({ length: count }, (_, index) => {
    const y = 1 - (2 * index) / (Math.max(count - 1, 1))
    const phi = Math.acos(Math.max(-1, Math.min(1, y))) - Math.PI / 2
    const theta = (index * golden) % (2 * Math.PI)
    const ring = Math.cos(phi)
    return { x: ring * Math.cos(theta), y: Math.sin(phi), z: ring * Math.sin(theta) }
  })
}

const paintOrb = (spin: OrbRuntime) => {
  const dy = ((spin.smooth.y - spin.prevY) * Math.PI) / 180
  const dx = ((spin.smooth.x - spin.prevX) * Math.PI) / 180
  spin.prevY = spin.smooth.y
  spin.prevX = spin.smooth.x
  if (dx !== 0 || dy !== 0) {
    const cy = Math.cos(dy)
    const sy = Math.sin(dy)
    const cx = Math.cos(dx)
    const sx = Math.sin(dx)
    const turn = spin.turn
    turn[0] = cy
    turn[1] = 0
    turn[2] = sy
    turn[3] = sx * sy
    turn[4] = cx
    turn[5] = -sx * cy
    turn[6] = -cx * sy
    turn[7] = sx
    turn[8] = cx * cy
    for (let row = 0; row < 3; row += 1) {
      const a = turn[row * 3] || 0
      const b = turn[row * 3 + 1] || 0
      const c = turn[row * 3 + 2] || 0
      for (let col = 0; col < 3; col += 1) {
        spin.tmp[row * 3 + col] = a * (spin.m[col] || 0) + b * (spin.m[3 + col] || 0) + c * (spin.m[6 + col] || 0)
      }
    }
    for (let index = 0; index < 9; index += 1) spin.m[index] = spin.tmp[index] || 0
  }
  spin.ids.forEach((id, index) => {
    const point = spin.points[index]
    if (!point) return
    orbPose[id] = {
      x: (spin.m[0] || 0) * point.x + (spin.m[1] || 0) * point.y + (spin.m[2] || 0) * point.z,
      y: (spin.m[3] || 0) * point.x + (spin.m[4] || 0) * point.y + (spin.m[5] || 0) * point.z,
      z: (spin.m[6] || 0) * point.x + (spin.m[7] || 0) * point.y + (spin.m[8] || 0) * point.z,
    }
  })
}

const mountOrb = (id: string) => {
  const folder = folderById(id)
  if (!folder) return
  const ids = folder.pieces.map((piece) => piece.id)
  const smooth = { x: 0, y: 0 }
  const spin: OrbRuntime = {
    ids,
    points: spherePoints(ids.length),
    m: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    tmp: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    turn: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    smooth,
    prevX: 0,
    prevY: 0,
    incrX: 0,
    incrY: 0,
    quickX: () => {},
    quickY: () => {},
  }
  spin.quickX = gsap.quickTo(smooth, 'x', { duration: reduceMotion.value ? 0 : 1, ease: 'power2', onUpdate: () => paintOrb(spin) })
  spin.quickY = gsap.quickTo(smooth, 'y', { duration: reduceMotion.value ? 0 : 1, ease: 'power2', onUpdate: () => paintOrb(spin) })
  orbRuntime.set(id, spin)
  paintOrb(spin)
}

const releaseOrb = (id: string) => {
  const spin = orbRuntime.get(id)
  orbRuntime.delete(id)
  for (const pieceId of spin?.ids || []) {
    delete orbPose[pieceId]
    const shift = pieceShift[pieceId]
    if (shift) {
      shift.x = 0
      shift.y = 0
    }
  }
}

const nudgeOrb = (id: string, deltaX: number, deltaY: number, mode: 'wheel' | 'drag') => {
  const spin = orbRuntime.get(id)
  if (!spin || !openOrbs.value[id]) return false
  const scale = mode === 'drag' ? (isTouch.value ? 1 : 4) : 10
  const sign = mode === 'drag' ? 1 : -1
  spin.incrY += (sign * deltaY) / scale
  spin.incrX += (sign * deltaX) / scale
  if (reduceMotion.value) {
    spin.smooth.x = spin.incrY
    spin.smooth.y = spin.incrX
    paintOrb(spin)
  } else {
    spin.quickY(spin.incrX)
    spin.quickX(spin.incrY)
  }
  return true
}

const spinOpenOrbs = (deltaX: number, deltaY: number) => {
  let spun = false
  for (const id of orbRuntime.keys()) {
    if (nudgeOrb(id, deltaX, deltaY, 'wheel')) spun = true
  }
  return spun
}

const pointerLeftOrb = (id: string, x: number, y: number) => {
  const node = stageEl.value?.querySelector<HTMLElement>(`[data-node-id="${id}"]`)
  if (!node) return false
  const rect = node.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + (STACK_CARD / 2) * (rect.height / Math.max(ORB_H, 1))
  const scale = rect.width / Math.max(ORB_W, 1)
  const limit = ORB_RADIUS * 1.55 * Math.max(scale, 0.001)
  return Math.hypot(x - cx, y - cy) > limit
}

const closeOpenOrbs = () => {
  const ids = new Set<string>([
    ...Object.keys(openOrbs.value).filter((id) => openOrbs.value[id]),
    ...Object.keys(orbPhase.value),
  ])
  for (const id of ids) shutOrb(id)
}

const orbPieceStyle = (folder: { id: string }, piece: FieldPiece, index: number) => {
  const open = !!openOrbs.value[folder.id]
  const shift = shiftOf(pieceShift, piece.id)
  const phase = orbPhase.value[folder.id]
  if (!open) {
    const rest = PILE[index % PILE.length]!
    const fan = FAN[index % FAN.length]!
    const spread = phase === 'fan' || (phase !== 'pile' && fannedId.value === folder.id)
    const size = containedSize(piece)
    const x = (ORB_W - size.w) / 2 + rest.x + (spread ? fan.x : 0)
    const y = (STACK_CARD - size.h) / 2 + rest.y + (spread ? fan.y : 0)
    const r = rest.r + (spread ? fan.r : 0)
    return {
      width: `${size.w}px`,
      height: `${size.h}px`,
      zIndex: index + 1,
      opacity: 1,
      transform: `translate3d(${x + shift.x}px, ${y + shift.y}px, 0px) rotate(${r}deg)`,
    }
  }
  const pose = orbPose[piece.id] || { x: 0, y: 0, z: 0 }
  return {
    width: `${ORB_TILE}px`,
    height: `${ORB_TILE}px`,
    zIndex: selectedId.value === piece.id ? 30 : Math.max(1, Math.round(pose.z * 40) + 10),
    opacity: 1,
    transform: `translate3d(${ORB_W / 2 + pose.x * ORB_RADIUS - ORB_TILE / 2 + shift.x}px, ${STACK_CARD / 2 - pose.y * ORB_RADIUS - ORB_TILE / 2 + shift.y}px, ${pose.z * ORB_RADIUS}px) rotate(0deg)`,
  }
}

const clearOrbTimer = (id: string) => {
  const timer = orbTimers.get(id)
  if (!timer) return
  window.clearTimeout(timer)
  orbTimers.delete(id)
}

const dropOrbPhase = (id: string) => {
  if (!orbPhase.value[id]) return
  const next = { ...orbPhase.value }
  delete next[id]
  orbPhase.value = next
}

const fanOrb = (id: string) => {
  if (openOrbs.value[id] || orbPhase.value[id] || hot.value[id]) return
  fannedId.value = id
}

const unfanOrb = (id: string) => {
  if (orbPhase.value[id]) return
  if (fannedId.value === id) fannedId.value = null
}

const shutOrb = (id: string) => {
  clearOrbTimer(id)
  dropOrbPhase(id)
  if (fannedId.value === id) fannedId.value = null
  if (openOrbs.value[id]) openOrbs.value = { ...openOrbs.value, [id]: false }
  releaseOrb(id)
}

const finishOrbOpen = (id: string) => {
  if (fannedId.value === id) fannedId.value = null
  openOrbs.value = { ...openOrbs.value, [id]: true }
  orbPhase.value = { ...orbPhase.value, [id]: 'orb' }
  mountOrb(id)
  orbTimers.set(
    id,
    window.setTimeout(() => {
      orbTimers.delete(id)
      if (!openOrbs.value[id]) return
      orbPhase.value = { ...orbPhase.value, [id]: 'ready' }
    }, 640),
  )
}

const beginOrbOpen = (id: string) => {
  clearOrbTimer(id)
  if (reduceMotion.value) {
    finishOrbOpen(id)
    orbPhase.value = { ...orbPhase.value, [id]: 'ready' }
    return
  }
  if (fannedId.value === id) fannedId.value = null
  orbPhase.value = { ...orbPhase.value, [id]: 'pile' }
  nextTick(() => {
    requestAnimationFrame(() => {
      if (orbPhase.value[id] !== 'pile') return
      orbPhase.value = { ...orbPhase.value, [id]: 'fan' }
      orbTimers.set(
        id,
        window.setTimeout(() => {
          orbTimers.delete(id)
          if (orbPhase.value[id] !== 'fan') return
          finishOrbOpen(id)
        }, 640),
      )
    })
  })
}

const toggleOrb = (id: string) => {
  guarded(() => {
    if (openOrbs.value[id] || orbPhase.value[id]) shutOrb(id)
    else beginOrbOpen(id)
  })
}

const settleOrbPiece = (id: string) => {
  const folder = field.value.folders.find(
    (entry) => entry.mode === 'orb' && openOrbs.value[entry.id] && entry.pieces.some((piece) => piece.id === id),
  )
  if (!folder) return
  if (lifted.value.some((entry) => entry.id === id) || kept.value.some((entry) => entry.id === id)) return
  const piece = folder.pieces.find((entry) => entry.id === id)
  const el = stageEl.value?.querySelector<HTMLElement>(`.orb [data-piece-id="${id}"]`)
  if (!piece || !el) return
  const cell = DISCOVER_GRID
  const rect = el.getBoundingClientRect()
  const point = toWorld(new DOMRect(rect.left + rect.width / 2, rect.top + rect.height / 2, 0, 0))
  const maxX = Math.max(0, field.value.world.w - cell)
  const maxY = Math.max(0, field.value.world.h - cell)
  lifted.value = [
    ...lifted.value,
    {
      ...piece,
      x: Math.min(maxX, Math.max(0, point.x - cell / 2)),
      y: Math.min(maxY, Math.max(0, point.y - cell / 2)),
      w: cell,
      h: cell,
      rotate: 0,
      z: 20,
    },
  ]
  delete pieceShift[id]
  delete orbPose[id]
  const spin = orbRuntime.get(folder.id)
  if (spin) {
    const index = spin.ids.indexOf(id)
    if (index >= 0) {
      spin.ids.splice(index, 1)
      spin.points.splice(index, 1)
    }
  }
}

const folderMotion = reactive<Record<string, { x: number; y: number; rotation: number; scale: number; opacity: number }>>({})
const folderShift = reactive<Record<string, { x: number; y: number }>>({})
const folderTweens = new Map<string, gsap.core.Tween[]>()
const folderCloseTimers = new Map<string, number>()
const FOLDER_PARALLAX = [18, 36, 64]
const FOLDER_OPEN_SCALE = 0.72
const folderDepth = new Map<
  string,
  { strength: number; state: { x: number; y: number }; xTo: (value: number) => void; yTo: (value: number) => void }
>()
let folderPointer = { x: 0, y: 0 }

const folderById = (id: string) => field.value.folders.find((entry) => entry.id === id)

const dropFolderDepth = (pieces: { id: string }[]) => {
  for (const piece of pieces) {
    folderDepth.delete(piece.id)
    delete folderShift[piece.id]
  }
}

const shuffledStrengths = (count: number) => {
  const layers = Array.from({ length: count }, (_, index) => index % FOLDER_PARALLAX.length)
  for (let index = layers.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    const current = layers[index]!
    layers[index] = layers[swap]!
    layers[swap] = current
  }
  return layers.map((layer) => FOLDER_PARALLAX[layer]!)
}

const trackFolderPointer = (event: PointerEvent) => {
  const stage = stageEl.value
  if (!stage) return
  const rect = stage.getBoundingClientRect()
  folderPointer = {
    x: (event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5,
    y: (event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5,
  }
  if (!folderDepth.size || isTouch.value || reduceMotion.value) return
  const z = Math.max(zoom.value, ZOOM_MIN)
  const skip = drag?.kind === 'piece' ? drag.id : ''
  for (const [id, item] of folderDepth) {
    if (id === skip) continue
    item.xTo((-folderPointer.x * item.strength * 2) / z)
    item.yTo((-folderPointer.y * item.strength * 2) / z)
  }
}

const flushFolderParallax = () => {
  for (const [id, item] of folderDepth) {
    const shown = folderShift[id]
    if (!shown || shown.x !== item.state.x || shown.y !== item.state.y) {
      folderShift[id] = { x: item.state.x, y: item.state.y }
    }
  }
}

const killFolderMotion = (id: string) => {
  folderTweens.get(id)?.forEach((tween) => tween.kill())
  folderTweens.delete(id)
  const timer = folderCloseTimers.get(id)
  if (timer) window.clearTimeout(timer)
  folderCloseTimers.delete(id)
}

const folderPieceStyle = (piece: FieldPiece, open: boolean) => {
  const shift = shiftOf(pieceShift, piece.id)
  const motion = folderMotion[piece.id]
  const depth = folderShift[piece.id]
  const dx = depth?.x || 0
  const dy = depth?.y || 0
  if (motion) {
    return {
      width: `${pieceWidth(piece)}px`,
      height: `${pieceHeight(piece)}px`,
      zIndex: selectedId.value === piece.id ? 30 : hot.value[piece.id] ? 12 : Math.max(piece.z, 8),
      opacity: motion.opacity,
      transform: `translate(${motion.x + dx + shift.x}px, ${motion.y + dy + shift.y}px) rotate(${motion.rotation}deg) scale(${motion.scale})`,
    }
  }
  if (!open) {
    return {
      width: `${pieceWidth(piece)}px`,
      height: `${pieceHeight(piece)}px`,
      opacity: 0,
      transform: `translate(${14 + shift.x}px, ${20 + shift.y}px) scale(0.35)`,
    }
  }
  return {
    width: `${pieceWidth(piece)}px`,
    height: `${pieceHeight(piece)}px`,
    zIndex: selectedId.value === piece.id ? 30 : hot.value[piece.id] ? 12 : Math.max(piece.z, 8),
    opacity: 1,
    transform: `translate(${piece.x + dx + shift.x}px, ${piece.y + dy + shift.y}px) scale(${FOLDER_OPEN_SCALE})`,
  }
}

const cameraLimits = () => {
  const stage = stageEl.value
  const width = stage?.clientWidth ?? 0
  const height = stage?.clientHeight ?? 0
  const z = Math.max(zoom.value, ZOOM_MIN)
  const over = DISCOVER_GRID * 3
  let minX = -over
  let maxX = field.value.world.w - width / z + over
  let minY = -over
  let maxY = field.value.world.h - height / z + over
  if (maxX < minX) {
    const mid = (minX + maxX) / 2
    minX = mid
    maxX = mid
  }
  if (maxY < minY) {
    const mid = (minY + maxY) / 2
    minY = mid
    maxY = mid
  }
  return { minX, maxX, minY, maxY }
}

const clampAxis = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const clampCam = () => {
  const limits = cameraLimits()
  cam.x = clampAxis(cam.x, limits.minX, limits.maxX)
  cam.y = clampAxis(cam.y, limits.minY, limits.maxY)
}

/** Ease to a stop at the world edge instead of travelling full speed into a hard stop. */
const approach = (pos: number, min: number, max: number, delta: number) => {
  if (!delta) return 0
  const room = delta > 0 ? max - pos : pos - min
  if (room <= 0) return 0
  if (reduceMotion.value) return Math.sign(delta) * Math.min(Math.abs(delta), room)
  const brake = 200 / Math.max(zoom.value, ZOOM_MIN)
  if (room >= brake) return delta
  if (room <= 0.8) return Math.sign(delta) * room
  const maxStep = room * 0.16
  return Math.sign(delta) * Math.min(Math.abs(delta), maxStep)
}

const dismissInstruction = () => {
  if (entryLeaving) return
  entryLeaving = true
  if (reduceMotion.value) {
    instructionVisible.value = false
    return
  }
  entryTween?.kill()
  entryTween = gsap.to(entryMeltState, {
    blur: 75,
    opacity: 0,
    duration: 0.72,
    ease: 'power2.in',
    onUpdate: () => {
      entryMelt.blur = entryMeltState.blur
      entryMelt.opacity = entryMeltState.opacity
    },
    onComplete: () => {
      instructionVisible.value = false
    },
  })
}

const edgeDepth = () => {
  const stage = stageEl.value
  if (!stage) return EDGE_MIN
  return Math.min(220, Math.max(EDGE_MIN, Math.min(stage.clientWidth, stage.clientHeight) * 0.18))
}

/** Vertical lane from Surrender up through the nav, where the top and bottom edges do not pan. */
const quietLane = (rect: DOMRect) => {
  const stage = stageEl.value
  const button = stage?.querySelector('.discover__surrender')?.getBoundingClientRect()
  const nav = document.querySelector('.header__nav')?.getBoundingClientRect()
  const pad = 28
  if (button && nav) {
    return {
      left: Math.min(button.left, nav.left) - pad - rect.left,
      right: Math.max(button.right, nav.right) + pad - rect.left,
    }
  }
  const mid = button ? button.left + button.width / 2 - rect.left : rect.width / 2
  const half = Math.min(280, Math.max(170, rect.width * 0.16))
  return { left: mid - half, right: mid + half }
}

const updateEdge = (x: number, y: number) => {
  const stage = stageEl.value
  if (!stage || isTouch.value || drag || overlayOpen.value) {
    targetX = 0
    targetY = 0
    return
  }
  const rect = stage.getBoundingClientRect()
  const lx = x - rect.left
  const ly = y - rect.top
  if (lx < 0 || ly < 0 || lx > rect.width || ly > rect.height) {
    targetX = 0
    targetY = 0
    return
  }
  const edge = edgeDepth()
  const max = reduceMotion.value ? 16 : MAX_SPEED
  const push = (distance: number) => {
    const t = Math.min(1, Math.max(0, distance / edge))
    return max * t ** 1.05
  }
  const lane = quietLane(rect)
  targetX = 0
  targetY = 0
  if (lx < edge) targetX = -push(edge - lx)
  else if (lx > rect.width - edge) targetX = push(lx - (rect.width - edge))
  if (lx >= lane.left && lx <= lane.right) return
  if (ly < edge) targetY = -push(edge - ly)
  else if (ly > rect.height - edge) targetY = push(ly - (rect.height - edge))
}

const releaseHot = (id: string) => {
  if (!hot.value[id]) return
  const next = { ...hot.value }
  delete next[id]
  hot.value = next
}

const tick = () => {
  raf = requestAnimationFrame(tick)
  flushFolderParallax()
  if (overlayOpen.value || drag) {
    targetX = 0
    targetY = 0
  }
  const ease = (target: number, vel: number) => {
    if (reduceMotion.value) return 1
    return Math.abs(target) + 0.01 >= Math.abs(vel) ? 0.32 : 0.16
  }
  velX += (targetX - velX) * ease(targetX, velX)
  velY += (targetY - velY) * ease(targetY, velY)
  if (Math.abs(velX) < 0.08) velX = 0
  if (Math.abs(velY) < 0.08) velY = 0
  settleZoom()
  const framing = drag?.kind === 'frame'
  const z = Math.max(zoom.value, ZOOM_MIN)
  if (!framing && (velX || velY || flickX || flickY)) {
    const limits = cameraLimits()
    const stepX = approach(cam.x, limits.minX, limits.maxX, (velX + flickX) / z)
    const stepY = approach(cam.y, limits.minY, limits.maxY, (velY + flickY) / z)
    cam.x += stepX
    cam.y += stepY
    glideX += stepX
    glideY += stepY
    glideX = clampAxis(glideX, limits.minX, limits.maxX)
    glideY = clampAxis(glideY, limits.minY, limits.maxY)
  }
  if (flickX || flickY) {
    const decay = reduceMotion.value ? 0 : 0.94
    flickX *= decay
    flickY *= decay
    if (Math.hypot(flickX, flickY) < 0.4) {
      flickX = 0
      flickY = 0
    }
  }
  if (!framing) {
    const follow = reduceMotion.value ? 1 : 0.12
    const gapX = glideX - cam.x
    const gapY = glideY - cam.y
    if (Math.hypot(gapX, gapY) < 0.2) {
      cam.x = glideX
      cam.y = glideY
    } else {
      cam.x += gapX * follow
      cam.y += gapY * follow
    }
  }
}

const rememberSample = (x: number, y: number) => {
  const t = performance.now()
  samples.push({ x, y, t })
  while (samples.length && t - samples[0]!.t > 90) samples.shift()
}

const releaseVelocity = () => {
  if (samples.length < 2) return { vx: 0, vy: 0 }
  const first = samples[0]!
  const last = samples[samples.length - 1]!
  const frames = Math.max((last.t - first.t) / 16.67, 1)
  const cap = 48
  const vx = Math.min(cap, Math.max(-cap, (last.x - first.x) / frames))
  const vy = Math.min(cap, Math.max(-cap, (last.y - first.y) / frames))
  return { vx, vy }
}

const hold = (id: string) => {
  hot.value = { ...hot.value, [id]: true }
}

const ensureShift = (bag: Record<string, { x: number; y: number }>, id: string) => {
  if (!bag[id]) bag[id] = { x: 0, y: 0 }
  return bag[id]!
}

const startResize = (
  event: PointerEvent,
  id: string,
  corner: ResizeDrag['corner'],
) => {
  const piece = findPiece(id)
  if (!piece) return
  const shift = ensureShift(pieceShift, id)
  resize = {
    id,
    corner,
    x: event.clientX,
    y: event.clientY,
    scale: scaleOf(id),
    ox: shift.x,
    oy: shift.y,
    w: piece.w,
    h: piece.h,
  }
  document.documentElement.dataset.resizeCursor =
    corner === 'tl' || corner === 'br' ? 'nwse' : 'nesw'
  try {
    stageEl.value?.setPointerCapture(event.pointerId)
  } catch {
    // Pointer capture is only available for an active pointer.
  }
}
provide('discover-start-resize', startResize)

const keepZone = () => {
  const el = stageEl.value?.querySelector('.discover__keep')
  if (!el) return null
  const rect = el.getBoundingClientRect()
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }
}

const centerInsideKeep = (rect: { left: number; top: number; width: number; height: number }) => {
  const zone = keepZone()
  if (!zone) return false
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  return cx >= zone.left && cx <= zone.right && cy >= zone.top && cy <= zone.bottom
}

const onPointerDown = (event: PointerEvent) => {
  if (event.button !== 0) return
  dismissInstruction()
  const target = event.target instanceof Element ? event.target : null
  if (target?.closest('.discover__surrender, .piece__plus, .piece__handle, .piece__heart, .piece__minus, .piece__clone, .piece__cycle')) return

  const pieceEl = target?.closest<HTMLElement>('.piece[data-piece-id]')
  const nodeEl = target?.closest<HTMLElement>('.discover__node[data-node-id]')
  const orbNode = target?.closest<HTMLElement>('.orb.is-open')
  const onSleeve = !!target?.closest('.stack__toggle, .folder__sleeve, .stack__plate, .orb__toggle, .orb__name, .colour__word')
  samples.length = 0
  rememberSample(event.clientX, event.clientY)
  dragged = false
  pointerId = event.pointerId

  if (orbNode?.dataset.nodeId && !target?.closest('.orb__name, .piece__plus, .piece__handle, .piece__heart, .piece__minus, .piece__clone, .piece__cycle')) {
    const grabbed = pieceEl?.closest('.orb.is-open') ? pieceEl.dataset.pieceId || null : null
    if (grabbed) selectedId.value = grabbed
    drag = {
      kind: 'orb',
      id: orbNode.dataset.nodeId,
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      pieceId: grabbed,
    }
  } else if (pieceEl?.dataset.live === 'true' && pieceEl.dataset.pieceId) {
    const id = pieceEl.dataset.pieceId
    selectedId.value = id
    stackFocus.value = {}
    stopPieceGlide(id)
    const shift = ensureShift(pieceShift, id)
    drag = {
      kind: 'piece',
      id,
      x: event.clientX,
      y: event.clientY,
      ox: shift.x,
      oy: shift.y,
    }
    hold(id)
  } else if (nodeEl?.dataset.nodeId && (onSleeve || pieceEl)) {
    const id = nodeEl.dataset.nodeId
    const shift = ensureShift(nodeShift, id)
    drag = {
      kind: 'node',
      id,
      x: event.clientX,
      y: event.clientY,
      ox: shift.x,
      oy: shift.y,
    }
    hold(id)
  } else {
    drag = { kind: 'frame', x: event.clientX, y: event.clientY, camX: cam.x, camY: cam.y }
    flickX = 0
    flickY = 0
    velX = 0
    velY = 0
  }

  targetX = 0
  targetY = 0
}

const onPointerMove = (event: PointerEvent) => {
  trackFolderPointer(event)
  if (resize) {
    const z = Math.max(zoom.value, ZOOM_MIN)
    const dx = (event.clientX - resize.x) / z
    const dy = (event.clientY - resize.y) / z
    const alongX = resize.corner === 'tr' || resize.corner === 'br' ? dx : -dx
    const alongY = resize.corner === 'bl' || resize.corner === 'br' ? dy : -dy
    const delta = Math.abs(alongX) > Math.abs(alongY) ? alongX : alongY
    const next = Math.min(3.2, Math.max(0.4, resize.scale + delta / resize.w))
    pieceScale[resize.id] = next
    const shift = ensureShift(pieceShift, resize.id)
    const grewX = resize.w * (next - resize.scale)
    const grewY = resize.h * (next - resize.scale)
    const fromLeft = resize.corner === 'tl' || resize.corner === 'bl'
    const fromTop = resize.corner === 'tl' || resize.corner === 'tr'
    shift.x = resize.ox + (fromLeft ? -grewX : 0)
    shift.y = resize.oy + (fromTop ? -grewY : 0)
    return
  }
  if (drag) {
    if (drag.kind === 'orb') {
      const stepX = event.clientX - drag.lastX
      const stepY = event.clientY - drag.lastY
      drag.lastX = event.clientX
      drag.lastY = event.clientY
      const travelX = event.clientX - drag.x
      const travelY = event.clientY - drag.y
      if (!dragged && travelX * travelX + travelY * travelY > 36) {
        dragged = true
        moved = true
        if (pointerId >= 0) {
          try {
            stageEl.value?.setPointerCapture(pointerId)
          } catch {
            // Pointer capture is only available for an active pointer.
          }
        }
      }
      if (!dragged) return
      nudgeOrb(drag.id, stepX, stepY, 'drag')
      const pulled = travelX * travelX + travelY * travelY > 100 * 100
      if (drag.pieceId && pulled && pointerLeftOrb(drag.id, event.clientX, event.clientY)) {
        const pieceId = drag.pieceId
        settleOrbPiece(pieceId)
        hold(pieceId)
        const shift = ensureShift(pieceShift, pieceId)
        drag = { kind: 'piece', id: pieceId, x: event.clientX, y: event.clientY, ox: shift.x, oy: shift.y }
      }
      return
    }
    rememberSample(event.clientX, event.clientY)
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (!dragged && dx * dx + dy * dy > 36) {
      dragged = true
      moved = true
      if (pointerId >= 0) {
        try {
          stageEl.value?.setPointerCapture(pointerId)
        } catch {
          // Pointer capture is only available for an active pointer.
        }
      }
    }
    if (drag.kind === 'frame') {
      const z = Math.max(zoom.value, ZOOM_MIN)
      cam.x = drag.camX - dx / z
      cam.y = drag.camY - dy / z
      clampCam()
      glideX = cam.x
      glideY = cam.y
      return
    }
    if (!dragged) return
    const bag = drag.kind === 'piece' ? pieceShift : nodeShift
    const shift = bag[drag.id]
    if (!shift) return
    const z = Math.max(zoom.value, ZOOM_MIN)
    shift.x = drag.ox + dx / z
    shift.y = drag.oy + dy / z
    return
  }
  if (likeDragActive.value) {
    targetX = 0
    targetY = 0
    return
  }
  const target = event.target instanceof Element ? event.target : null
  if (target?.closest('.discover__surrender')) {
    targetX = 0
    targetY = 0
    return
  }
  updateEdge(event.clientX, event.clientY)
}

const snapToGrid = (value: number, limit: number) => {
  const cell = DISCOVER_GRID
  const max = Math.max(0, limit)
  return Math.min(max, Math.max(0, Math.round(value / cell) * cell))
}

const pieceGlide = new Map<string, gsap.core.Tween>()
const DOT_REACH = 46

const stopPieceGlide = (id: string) => {
  pieceGlide.get(id)?.kill()
  pieceGlide.delete(id)
}

const commitBoardPiece = (id: string) => {
  stopPieceGlide(id)
  const piece =
    lifted.value.find((entry) => entry.id === id) ||
    kept.value.find((entry) => entry.id === id) ||
    loose.value.find((entry) => entry.id === id)
  if (!piece) return
  const shift = pieceShift[id]
  const maxX = Math.max(0, field.value.world.w - piece.w)
  const maxY = Math.max(0, field.value.world.h - piece.h)
  piece.x = Math.min(maxX, Math.max(0, piece.x + (shift?.x || 0)))
  piece.y = Math.min(maxY, Math.max(0, piece.y + (shift?.y || 0)))
  delete pieceShift[id]
  const nx = snapToGrid(piece.x, maxX)
  const ny = snapToGrid(piece.y, maxY)
  if (Math.hypot(piece.x - nx, piece.y - ny) > DOT_REACH) return
  pieceGlide.set(
    id,
    gsap.to(piece, {
      x: nx,
      y: ny,
      delay: 0.18,
      duration: 0.55,
      ease: 'power3.out',
      onComplete: () => pieceGlide.delete(id),
    }),
  )
}

const snapNode = (id: string) => {
  const place = placementFor(id)
  if (!place) return
  const shift = ensureShift(nodeShift, id)
  const cell = DISCOVER_GRID
  shift.x = snapToGrid(place.x + shift.x, field.value.world.w - cell) - place.x
  shift.y = snapToGrid(place.y + shift.y, field.value.world.h - cell) - place.y
}

const onPointerUp = () => {
  if (resize) {
    resize = null
    delete document.documentElement.dataset.resizeCursor
    return
  }
  if (drag?.kind === 'frame' && !dragged) {
    selectedId.value = null
    closeOpenOrbs()
  }
  if (drag && dragged) {
    blockClick.value = true
    window.setTimeout(() => {
      blockClick.value = false
    }, 0)
    if (drag.kind === 'frame') {
      const velocity = releaseVelocity()
      flickX = -velocity.vx
      flickY = -velocity.vy
    } else {
      if (drag.kind === 'node') snapNode(drag.id)
      if (drag.kind === 'piece') {
        settleStackPiece(drag.id)
        settleFolderPiece(drag.id)
        settleOrbPiece(drag.id)
        commitBoardPiece(drag.id)
      }
      releaseHot(drag.id)
    }
  } else if (drag && drag.kind !== 'frame') {
    releaseHot(drag.id)
  }
  drag = null
  dragged = false
  pointerId = -1
  samples.length = 0
}

const onPointerLeave = (event: PointerEvent) => {
  if (drag) return
  const stage = stageEl.value
  if (!stage) return
  const rect = stage.getBoundingClientRect()
  const lx = event.clientX - rect.left
  const ly = event.clientY - rect.top
  if (lx >= 0 && ly >= 0 && lx <= rect.width && ly <= rect.height) return
  targetX = 0
  targetY = 0
}

const onWindowPointerMove = (event: PointerEvent) => {
  if (drag || resize || likeDragActive.value) return
  updateEdge(event.clientX, event.clientY)
}

const settleZoom = () => {
  const prev = zoom.value
  if (Math.abs(zoomTo - prev) < 0.0006) {
    if (zoom.value !== zoomTo) zoom.value = zoomTo
    return
  }
  const next = reduceMotion.value ? zoomTo : prev + (zoomTo - prev) * 0.18
  const settled = Math.abs(zoomTo - next) < 0.0006 ? zoomTo : next
  const shiftX = zoomX * (1 / prev - 1 / settled)
  const shiftY = zoomY * (1 / prev - 1 / settled)
  cam.x += shiftX
  cam.y += shiftY
  glideX += shiftX
  glideY += shiftY
  zoom.value = settled
  const limits = cameraLimits()
  glideX = clampAxis(glideX, limits.minX, limits.maxX)
  glideY = clampAxis(glideY, limits.minY, limits.maxY)
}

const onWheel = (event: WheelEvent) => {
  event.preventDefault()
  if (drag?.kind === 'frame') return
  const stage = stageEl.value
  if (!stage) return
  dismissInstruction()
  if (spinOpenOrbs(event.deltaX, event.deltaY)) {
    moved = true
    return
  }
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1
  const rect = stage.getBoundingClientRect()
  zoomX = event.clientX - rect.left
  zoomY = event.clientY - rect.top
  zoomTo = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomTo * Math.exp(-event.deltaY * unit * 0.00115)))
  moved = true
}

const onKey = (event: KeyboardEvent) => {
  const target = event.target instanceof HTMLElement ? event.target : null
  if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
  if (!event.metaKey && !event.ctrlKey && !event.altKey) {
    if (event.key === 'g' || event.key === 'G') {
      showGrid.value = !showGrid.value
      event.preventDefault()
      return
    }
    if (event.key === 'h' || event.key === 'H') {
      showFloor.value = !showFloor.value
      event.preventDefault()
      return
    }
    if (event.key === 'j' || event.key === 'J') {
      showKeep.value = !showKeep.value
      event.preventDefault()
      return
    }
  }
  const active = document.activeElement
  const stage = stageEl.value
  const inside =
    !active ||
    active === document.body ||
    active === document.documentElement ||
    (!!stage && stage.contains(active))
  if (!inside) return
  const step = (event.shiftKey ? 180 : 88) / Math.max(zoom.value, ZOOM_MIN)
  const limits = cameraLimits()
  if (event.key === 'ArrowRight') glideX += step
  else if (event.key === 'ArrowLeft') glideX -= step
  else if (event.key === 'ArrowDown') glideY += step
  else if (event.key === 'ArrowUp') glideY -= step
  else return
  event.preventDefault()
  glideX = clampAxis(glideX, limits.minX, limits.maxX)
  glideY = clampAxis(glideY, limits.minY, limits.maxY)
  moved = true
}

const guarded = (run: () => void) => {
  if (blockClick.value) {
    blockClick.value = false
    return
  }
  run()
}

const fanStack = (id: string) => {
  if (openStacks.value[id] || hot.value[id]) return
  if (fannedId.value === id) fannedId.value = null
}

const unfanStack = (id: string) => {
  if (fannedId.value === id) fannedId.value = null
}

const rectsOverlap = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

const gridBlockers = () => {
  const blocks: { x: number; y: number; w: number; h: number }[] = [
    { x: keepBox.x, y: keepBox.y, w: KEEP_W, h: KEEP_H },
  ]
  for (const stack of field.value.stacks) {
    const place = placementFor(stack.id)
    if (!place) continue
    const pieces = stack.pieces.filter((piece) => !hiddenIds.value.has(piece.id))
    if (!pieces.length) continue
    const shift = shiftOf(nodeShift, stack.id)
    const box = stackBox(pieces, !!openStacks.value[stack.id])
    blocks.push({
      x: place.x + shift.x - box.ox,
      y: place.y + shift.y - box.oy,
      w: box.w,
      h: box.h,
    })
  }
  const stage = stageEl.value
  if (stage) {
    stage.querySelectorAll<HTMLElement>('.discover__node.folder, .discover__node.orb').forEach((el) => {
      blocks.push(toWorld(el.getBoundingClientRect()))
    })
  }
  for (const piece of [...lifted.value, ...kept.value, ...loose.value]) {
    blocks.push({ x: piece.x, y: piece.y, w: piece.w, h: piece.h })
  }
  return blocks
}

const openGridCell = (originX: number, originY: number) => {
  const cell = DISCOVER_GRID
  const blocks = gridBlockers()
  const maxX = Math.max(0, field.value.world.w - cell)
  const maxY = Math.max(0, field.value.world.h - cell)
  const snap = (value: number, max: number) => Math.min(max, Math.max(0, Math.round(value / cell) * cell))
  const ox = snap(originX, maxX)
  const oy = snap(originY, maxY)
  const free = (x: number, y: number) => {
    if (x < 0 || y < 0 || x > maxX || y > maxY) return false
    const rect = { x, y, w: cell, h: cell }
    return blocks.every((block) => !rectsOverlap(rect, block))
  }
  const limit = Math.ceil(Math.max(field.value.world.w, field.value.world.h) / cell)
  for (let radius = 1; radius <= limit; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue
        const x = ox + dx * cell
        const y = oy + dy * cell
        if (free(x, y)) return { x, y }
      }
    }
  }
  return { x: ox, y: oy }
}

const placeStackPiece = (id: string) => {
  const stack = visibleStacks.value.find(
    (entry) => openStacks.value[entry.id] && entry.pieces.some((piece) => piece.id === id),
  )
  const folder = field.value.folders.find(
    (entry) =>
      (entry.mode === 'sleeve' || entry.mode === 'colour') &&
      openFolders.value[entry.id] &&
      entry.pieces.some((piece) => piece.id === id),
  )
  const host = stack || folder
  const piece = host?.pieces.find((entry) => entry.id === id)
  if (!host || !piece) return
  if (lifted.value.some((entry) => entry.id === id) || kept.value.some((entry) => entry.id === id)) return
  const el = stageEl.value?.querySelector<HTMLElement>(
    `${stack ? '.stack' : '.folder'} [data-piece-id="${id}"]`,
  )
  const spot = el ? toWorld(el.getBoundingClientRect()) : { x: piece.x, y: piece.y, w: piece.w, h: piece.h }
  const node = placementFor(host.id)
  const nodeMove = shiftOf(nodeShift, host.id)
  const target = openGridCell((node?.x ?? spot.x) + nodeMove.x, (node?.y ?? spot.y) + nodeMove.y)
  lifted.value = [
    ...lifted.value,
    { ...piece, x: spot.x, y: spot.y, w: spot.w, h: spot.h, rotate: 0, z: 30 },
  ]
  const placed = lifted.value[lifted.value.length - 1]
  if (!placed) return
  delete pieceShift[id]
  delete pieceScale[id]
  if (stack) clearStackNudge(stack.id)
  if (folder) {
    delete folderMotion[piece.id]
    folderDepth.delete(piece.id)
    delete folderShift[piece.id]
  }
  if (reduceMotion.value) {
    placed.x = target.x
    placed.y = target.y
    placed.w = DISCOVER_GRID
    placed.h = DISCOVER_GRID
    return
  }
  gsap.to(placed, {
    x: target.x,
    y: target.y,
    w: DISCOVER_GRID,
    h: DISCOVER_GRID,
    duration: 0.72,
    ease: 'power3.inOut',
  })
}
provide('discover-place-on-grid', placeStackPiece)

const settleStackPiece = (id: string) => {
  const stack = visibleStacks.value.find(
    (entry) => openStacks.value[entry.id] && entry.pieces.some((piece) => piece.id === id),
  )
  if (!stack) return
  const index = stack.pieces.findIndex((piece) => piece.id === id)
  const piece = stack.pieces[index]
  if (!piece || index < 0) return
  const box = stackBox(stack.pieces, true)
  const cell = box.cells[index] || { x: 0, y: 0 }
  const size = containedSize(piece, OPEN_CARD)
  const shift = pieceShift[id] || { x: 0, y: 0 }
  const cellSize = DISCOVER_GRID
  const originX = cell.x + (OPEN_CARD - size.w) / 2
  const originY = cell.y + (OPEN_CARD - size.h) / 2
  const cx = originX + shift.x + size.w / 2
  const cy = originY + shift.y + size.h / 2
  const inside = cx >= 0 && cx <= box.w && cy >= 0 && cy <= box.h
  if (inside) {
    window.requestAnimationFrame(() => {
      const current = pieceShift[id]
      if (current) {
        current.x = 0
        current.y = 0
      }
    })
    return
  }
  const node = placementFor(stack.id)
  const nodeMove = shiftOf(nodeShift, stack.id)
  if (lifted.value.some((entry) => entry.id === id)) return
  let x = (node?.x ?? 0) + nodeMove.x - box.ox + originX + shift.x
  let y = (node?.y ?? 0) + nodeMove.y - box.oy + originY + shift.y
  const el = stageEl.value?.querySelector<HTMLElement>(`.stack [data-piece-id="${id}"]`)
  if (el) {
    const spot = toWorld(el.getBoundingClientRect())
    x = spot.x + spot.w / 2 - cellSize / 2
    y = spot.y + spot.h / 2 - cellSize / 2
  }
  const maxX = Math.max(0, field.value.world.w - cellSize)
  const maxY = Math.max(0, field.value.world.h - cellSize)
  x = Math.min(maxX, Math.max(0, x))
  y = Math.min(maxY, Math.max(0, y))
  lifted.value = [
    ...lifted.value,
    {
      ...piece,
      x,
      y,
      w: cellSize,
      h: cellSize,
      rotate: 0,
      z: 20,
    },
  ]
  delete pieceShift[id]
  delete pieceScale[id]
}

const settleFolderPiece = (id: string) => {
  const folder = field.value.folders.find(
    (entry) => openFolders.value[entry.id] && entry.pieces.some((piece) => piece.id === id),
  )
  if (!folder) return
  if (lifted.value.some((entry) => entry.id === id) || kept.value.some((entry) => entry.id === id)) return
  const piece = folder.pieces.find((entry) => entry.id === id)
  if (!piece) return
  const motion = folderMotion[piece.id]
  const depth = folderShift[piece.id]
  const shift = pieceShift[id] || { x: 0, y: 0 }
  const localX = (motion?.x ?? piece.x) + (depth?.x || 0) + shift.x
  const localY = (motion?.y ?? piece.y) + (depth?.y || 0) + shift.y
  const node = placementFor(folder.id)
  const nodeMove = shiftOf(nodeShift, folder.id)
  const cell = DISCOVER_GRID
  let x = (node?.x ?? 0) + nodeMove.x + localX
  let y = (node?.y ?? 0) + nodeMove.y + localY
  const el = stageEl.value?.querySelector<HTMLElement>(`.folder [data-piece-id="${id}"]`)
  if (el) {
    const spot = toWorld(el.getBoundingClientRect())
    x = spot.x + spot.w / 2 - cell / 2
    y = spot.y + spot.h / 2 - cell / 2
  }
  const maxX = Math.max(0, field.value.world.w - cell)
  const maxY = Math.max(0, field.value.world.h - cell)
  x = Math.min(maxX, Math.max(0, x))
  y = Math.min(maxY, Math.max(0, y))
  lifted.value = [
    ...lifted.value,
    {
      ...piece,
      x,
      y,
      w: cell,
      h: cell,
      rotate: 0,
      z: 20,
    },
  ]
  delete pieceShift[id]
  delete pieceScale[id]
  delete folderMotion[piece.id]
  folderDepth.delete(piece.id)
  delete folderShift[piece.id]
}

const toggleStack = (id: string) => {
  guarded(() => {
    const next = !openStacks.value[id]
    openStacks.value = { ...openStacks.value, [id]: next }
    fannedId.value = null
    clearStackNudge(id)
    const pending = stackSettleTimers.get(id)
    if (pending) window.clearTimeout(pending)
    stackSettleTimers.delete(id)
    if (next) settleStackHover(id)
    else {
      const settled = { ...stackSettled.value }
      delete settled[id]
      stackSettled.value = settled
    }
    if (!next) {
      const stack = visibleStacks.value.find((entry) => entry.id === id)
      for (const piece of stack?.pieces || []) {
        const shift = pieceShift[piece.id]
        if (shift) {
          shift.x = 0
          shift.y = 0
        }
      }
    }
  })
}

const playFolderOpen = (id: string) => {
  const folder = folderById(id)
  if (!folder) return
  killFolderMotion(id)
  dropFolderDepth(folder.pieces)
  const strengths = shuffledStrengths(folder.pieces.length)
  const z = Math.max(zoom.value, ZOOM_MIN)
  const tweens: gsap.core.Tween[] = []
  folder.pieces.forEach((piece, index) => {
    const rot = (Math.random() - 0.5) * 28
    const strength = strengths[index] || FOLDER_PARALLAX[0]!
    const shift = {
      x: (-folderPointer.x * strength * 2) / z,
      y: (-folderPointer.y * strength * 2) / z,
    }
    const motion = {
      x: piece.x * 0.15,
      y: piece.y * 0.15,
      rotation: rot * 0.3,
      scale: 0.35,
      opacity: 0,
    }
    folderMotion[piece.id] = { ...motion }
    folderShift[piece.id] = { ...shift }
    if (!reduceMotion.value && !isTouch.value) {
      folderDepth.set(piece.id, {
        strength,
        state: shift,
        xTo: gsap.quickTo(shift, 'x', { duration: 0.6, ease: 'power3' }),
        yTo: gsap.quickTo(shift, 'y', { duration: 0.6, ease: 'power3' }),
      })
    }
    if (reduceMotion.value) {
      folderMotion[piece.id] = { x: piece.x, y: piece.y, rotation: rot, scale: FOLDER_OPEN_SCALE, opacity: 1 }
      return
    }
    tweens.push(
      gsap.to(motion, {
        x: piece.x,
        y: piece.y,
        rotation: rot,
        scale: FOLDER_OPEN_SCALE,
        opacity: 1,
        duration: 0.55,
        ease: 'expo.out',
        delay: index * 0.02,
        onUpdate: () => {
          folderMotion[piece.id] = { ...motion }
        },
      }),
    )
  })
  folderTweens.set(id, tweens)
}

const playFolderClose = (id: string) => {
  const folder = folderById(id)
  if (!folder) return
  killFolderMotion(id)
  if (reduceMotion.value) {
    for (const piece of folder.pieces) delete folderMotion[piece.id]
    dropFolderDepth(folder.pieces)
    openFolders.value = { ...openFolders.value, [id]: false }
    return
  }
  const tweens = folder.pieces.flatMap((piece, index) => {
    const motion = folderMotion[piece.id]
    if (!motion) return []
    const state = { ...motion }
    return [
      gsap.to(state, {
        scale: 0.5,
        opacity: 0,
        duration: 0.28,
        ease: 'expo.in',
        delay: index * 0.015,
        onUpdate: () => {
          folderMotion[piece.id] = { ...state }
        },
      }),
    ]
  })
  folderTweens.set(id, tweens)
  const waitFor = 280 + Math.max(folder.pieces.length - 1, 0) * 15 + 40
  folderCloseTimers.set(
    id,
    window.setTimeout(() => {
      folderCloseTimers.delete(id)
      const closing = folderById(id)
      for (const piece of closing?.pieces || []) delete folderMotion[piece.id]
      dropFolderDepth(closing?.pieces || [])
      openFolders.value = { ...openFolders.value, [id]: false }
    }, waitFor),
  )
}

const toggleFolder = (id: string) => {
  guarded(() => {
    if (openFolders.value[id] && !folderCloseTimers.has(id)) {
      playFolderClose(id)
      return
    }
    killFolderMotion(id)
    openFolders.value = { ...openFolders.value, [id]: true }
    playFolderOpen(id)
  })
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

const placeLike = (source: DiscoverSource, rect: DOMRect) => {
  const spot = toWorld(rect)
  const occupied = (id: string) =>
    !!findPiece(id) ||
    lifted.value.some((piece) => piece.id === id) ||
    kept.value.some((piece) => piece.id === id)
  const id = occupied(source.id) ? `${source.id}-like-${Date.now()}` : source.id
  const cell = DISCOVER_GRID
  const maxX = Math.max(0, field.value.world.w - cell)
  const maxY = Math.max(0, field.value.world.h - cell)
  const x = Math.min(maxX, Math.max(0, spot.x + spot.w / 2 - cell / 2))
  const y = Math.min(maxY, Math.max(0, spot.y + spot.h / 2 - cell / 2))
  lifted.value = [
    ...lifted.value,
    {
      ...source,
      id,
      x,
      y,
      w: cell,
      h: cell,
      rotate: 0,
      z: 24,
    },
  ]
}
provide('discover-place-like', placeLike)

const cloneOnGrid = (id: string, rect: DOMRect) => {
  const source = findPiece(id)
  if (!source) return
  const cell = DISCOVER_GRID
  const spot = toWorld(rect)
  const maxX = Math.max(0, field.value.world.w - cell)
  const maxY = Math.max(0, field.value.world.h - cell)
  const originX = Math.min(maxX, Math.max(0, Math.round(spot.x / cell) * cell))
  const originY = Math.min(maxY, Math.max(0, Math.round(spot.y / cell) * cell))
  const options = [
    { x: originX + cell, y: originY },
    { x: originX, y: originY + cell },
    { x: originX - cell, y: originY },
    { x: originX, y: originY - cell },
  ]
  const occupied = (x: number, y: number) =>
    [...lifted.value, ...kept.value].some((piece) => Math.abs(piece.x - x) < 8 && Math.abs(piece.y - y) < 8)
  const next = options.find(
    (option) => option.x >= 0 && option.y >= 0 && option.x <= maxX && option.y <= maxY && !occupied(option.x, option.y),
  ) || { x: originX, y: originY }
  lifted.value = [
    ...lifted.value,
    {
      ...source,
      id: `${source.id}-clone-${Date.now()}`,
      x: next.x,
      y: next.y,
      w: cell,
      h: cell,
      rotate: 0,
      z: 21,
    },
  ]
}
provide('discover-clone-on-grid', cloneOnGrid)

const toWorld = (rect: DOMRect) => {
  const world = stageEl.value?.querySelector('.discover__world')?.getBoundingClientRect()
  const z = Math.max(zoom.value, ZOOM_MIN)
  if (!world) return { x: 0, y: 0, w: rect.width / z, h: rect.height / z }
  return {
    x: (rect.left - world.left) / z,
    y: (rect.top - world.top) / z,
    w: rect.width / z,
    h: rect.height / z,
  }
}

const holdKeep = () => {
  const stage = stageEl.value
  const pinned = new Map<string, { x: number; y: number }>()
  if (!stage) return pinned
  for (const node of [...field.value.stacks, ...field.value.folders]) {
    const el = stage.querySelector<HTMLElement>(`[data-node-id="${node.id}"]`)
    if (!el || !centerInsideKeep(el.getBoundingClientRect())) continue
    const place = placementFor(node.id)
    const shift = shiftOf(nodeShift, node.id)
    if (place) pinned.set(node.id, { x: place.x + shift.x, y: place.y + shift.y })
  }
  const nextKept: FieldPiece[] = []
  const seen = new Set<string>()
  stage.querySelectorAll<HTMLElement>('.piece[data-piece-id]').forEach((el) => {
    const id = el.dataset.pieceId
    if (!id || seen.has(id) || !centerInsideKeep(el.getBoundingClientRect())) return
    const host = el.closest<HTMLElement>('[data-node-id]')
    if (host?.dataset.nodeId && pinned.has(host.dataset.nodeId)) return
    const source = findPiece(id)
    if (!source) return
    nextKept.push({ ...source, ...toWorld(el.getBoundingClientRect()), rotate: 0, z: Math.max(source.z, 18) })
    seen.add(id)
    delete pieceShift[id]
  })
  kept.value = nextKept
  lifted.value = []
  return pinned
}

const placeKeep = () => {
  if (!import.meta.client) return
  const world = field.value.world
  keepBox.x = (world.w - KEEP_W) / 2
  keepBox.y = (world.h - KEEP_H) / 2
  const stage = stageEl.value
  const stageW = stage?.clientWidth || window.innerWidth
  const stageH = stage?.clientHeight || window.innerHeight
  const nodes = field.value.arrangements[0]?.nodes || []
  const hasNodes = nodes.length > 0
  const spanX = world.w + 96
  const spanY = world.h + 96
  const fit = Math.min(stageW / spanX, stageH / spanY, ZOOM_START)
  const z = Math.min(ZOOM_START, Math.max(ZOOM_MIN, fit * 2))
  zoom.value = z
  zoomTo = z
  const fx = hasNodes ? keepBox.x + KEEP_W / 2 : world.w / 2
  const fy = hasNodes ? keepBox.y + KEEP_H / 2 : world.h / 2
  const x = fx - stageW / z / 2
  const y = fy - stageH / z / 2
  cam.x = x
  cam.y = y
  glideX = x
  glideY = y
}

const parkStacks = () => {
  const zone = {
    left: keepBox.x,
    top: keepBox.y,
    right: keepBox.x + KEEP_W,
    bottom: keepBox.y + KEEP_H,
  }
  for (const stack of field.value.stacks) {
    const place = placementFor(stack.id)
    if (!place) continue
    const box = stackBox(stack.pieces, false)
    const shift = ensureShift(nodeShift, stack.id)
    const left = place.x + shift.x
    const top = place.y + shift.y
    const overlaps =
      left < zone.right &&
      left + box.w > zone.left &&
      top < zone.bottom &&
      top + box.h > zone.top
    if (!overlaps) continue
    const options = [
      { dx: zone.left - (left + box.w) - GRID / 4, dy: 0 },
      { dx: zone.right - left + GRID / 4, dy: 0 },
      { dx: 0, dy: zone.top - (top + box.h) - GRID / 4 },
      { dx: 0, dy: zone.bottom - top + GRID / 4 },
    ]
    const move = options.reduce((best, option) =>
      Math.hypot(option.dx, option.dy) < Math.hypot(best.dx, best.dy) ? option : best,
    )
    shift.x += move.dx
    shift.y += move.dy
  }
  for (const folder of field.value.folders) {
    if (folder.mode !== 'orb') continue
    const place = placementFor(folder.id)
    if (!place) continue
    const shift = ensureShift(nodeShift, folder.id)
    const left = place.x + shift.x
    const top = place.y + shift.y
    const overlaps =
      left < zone.right && left + ORB_W > zone.left && top < zone.bottom && top + ORB_H > zone.top
    if (!overlaps) continue
    const options = [
      { dx: zone.left - (left + ORB_W) - GRID / 4, dy: 0 },
      { dx: zone.right - left + GRID / 4, dy: 0 },
      { dx: 0, dy: zone.top - (top + ORB_H) - GRID / 4 },
      { dx: 0, dy: zone.bottom - top + GRID / 4 },
    ]
    const move = options.reduce((best, option) =>
      Math.hypot(option.dx, option.dy) < Math.hypot(best.dx, best.dy) ? option : best,
    )
    shift.x += move.dx
    shift.y += move.dy
  }
}

const surrender = async () => {
  if (surrendering.value || field.value.arrangements.length < 2) return
  const gen = ++surrenderGen
  surrendering.value = true
  dismissInstruction()
  hot.value = {}
  fannedId.value = null
  const pinned = holdKeep()
  const next = (arrangementIndex.value + 1) % field.value.arrangements.length
  const splayed = new Set(
    field.value.arrangements[next]!.nodes.filter((node) => node.splayed).map((node) => node.id),
  )
  const closed: Record<string, boolean> = {}
  for (const [id, open] of Object.entries(openStacks.value)) {
    if (pinned.has(id)) {
      if (open) closed[id] = true
      continue
    }
    if (open && splayed.has(id)) closed[id] = true
  }
  openStacks.value = closed
  const heldFolders: Record<string, boolean> = {}
  for (const [id, open] of Object.entries(openFolders.value)) {
    if (pinned.has(id) && open && !folderCloseTimers.has(id)) heldFolders[id] = true
    else {
      killFolderMotion(id)
      const folder = folderById(id)
      for (const piece of folder?.pieces || []) delete folderMotion[piece.id]
      dropFolderDepth(folder?.pieces || [])
    }
  }
  openFolders.value = heldFolders
  const heldOrbs: Record<string, boolean> = {}
  for (const [id, open] of Object.entries(openOrbs.value)) {
    if (pinned.has(id) && open) heldOrbs[id] = true
    else releaseOrb(id)
  }
  openOrbs.value = heldOrbs
  for (const id of Object.keys(orbPhase.value)) {
    if (heldOrbs[id]) continue
    clearOrbTimer(id)
    dropOrbPhase(id)
    if (fannedId.value === id) fannedId.value = null
  }
  if (!reduceMotion.value) await wait(320)
  if (gen !== surrenderGen) return
  arrangementIndex.value = next
  for (const [id, pos] of pinned) {
    const place = placementFor(id)
    if (!place) continue
    const shift = ensureShift(nodeShift, id)
    shift.x = pos.x - place.x
    shift.y = pos.y - place.y
  }
  if (!reduceMotion.value) await wait(980)
  if (gen !== surrenderGen) return
  const opened = { ...openStacks.value }
  for (const id of splayed) {
    if (!pinned.has(id)) opened[id] = true
  }
  openStacks.value = opened
  surrendering.value = false
}

watch(
  () => field.value.arrangements[0]?.camera,
  (camera) => {
    if (!camera || moved) return
    placeKeep()
  },
  { immediate: true },
)

onMounted(() => {
  homeScrollHint.value = false
  isTouch.value = window.matchMedia('(pointer: coarse)').matches
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const syncMotion = () => {
    reduceMotion.value = motion.matches
  }
  syncMotion()
  motion.addEventListener('change', syncMotion)
  removeMotionListener = () => motion.removeEventListener('change', syncMotion)
  const stage = stageEl.value
  if (stage) {
    const syncStage = () => {
      stageBox.w = stage.clientWidth
      stageBox.h = stage.clientHeight
    }
    syncStage()
    const observer = new ResizeObserver(syncStage)
    observer.observe(stage)
    removeStageObserver = () => observer.disconnect()
  }
  stageEl.value?.addEventListener('pointerdown', dismissInstruction, true)
  stageEl.value?.addEventListener('pointerdown', onPointerDown)
  stageEl.value?.addEventListener('pointermove', onPointerMove)
  stageEl.value?.addEventListener('pointerup', onPointerUp)
  stageEl.value?.addEventListener('pointercancel', onPointerUp)
  stageEl.value?.addEventListener('pointerleave', onPointerLeave)
  stageEl.value?.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('keydown', onKey)
  window.addEventListener('pointermove', onWindowPointerMove)
  lockPageScroll()
  placeKeep()
  parkStacks()
  requestAnimationFrame(() => {
    fieldSettled.value = true
  })
  raf = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  entryTween?.kill()
  pieceGlide.forEach((tween) => tween.kill())
  stackSettleTimers.forEach((timer) => window.clearTimeout(timer))
  removeMotionListener()
  removeStageObserver()
  cancelAnimationFrame(raf)
  stageEl.value?.removeEventListener('pointerdown', dismissInstruction, true)
  stageEl.value?.removeEventListener('pointerdown', onPointerDown)
  stageEl.value?.removeEventListener('pointermove', onPointerMove)
  stageEl.value?.removeEventListener('pointerup', onPointerUp)
  stageEl.value?.removeEventListener('pointercancel', onPointerUp)
  stageEl.value?.removeEventListener('pointerleave', onPointerLeave)
  stageEl.value?.removeEventListener('wheel', onWheel)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('pointermove', onWindowPointerMove)
  unlockPageScroll()
})
</script>

<style scoped>
.discover {
  position: relative;
  height: 100dvh;
  overflow: hidden;
  background: var(--cream);
  touch-action: none;
  user-select: none;
}

.discover__floor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(to right, color-mix(in srgb, var(--charcoal) 11%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in srgb, var(--charcoal) 11%, transparent) 1px, transparent 1px);
}

.discover__world {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
  will-change: transform;
}

.discover__edge {
  position: absolute;
  inset: 0;
  z-index: 5;
  box-sizing: border-box;
  border: 1px solid color-mix(in srgb, var(--charcoal) 72%, transparent);
  pointer-events: none;
}

.discover__keep {
  position: absolute;
  z-index: 2;
  box-sizing: border-box;
  border: 1px solid color-mix(in srgb, var(--charcoal) 22%, transparent);
  pointer-events: none;
}

.discover__keep-tab {
  position: absolute;
  left: -1px;
  bottom: calc(100% - 1px);
  width: max-content;
  margin: 0;
  padding: 9px 16px 8px;
  border: 1px solid color-mix(in srgb, var(--charcoal) 22%, transparent);
  border-bottom: 0;
  background: var(--cream);
  color: var(--charcoal);
}

.discover__grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-color: var(--charcoal);
  --grid-cell: 220px;
  mask-image:
    linear-gradient(#000 0 2px, transparent 2px),
    linear-gradient(to right, #000 0 2px, transparent 2px);
  mask-size: 100% var(--grid-cell), var(--grid-cell) 100%;
  mask-position: -1px -1px;
  mask-repeat: repeat;
  mask-composite: intersect;
  -webkit-mask-image:
    linear-gradient(#000 0 2px, transparent 2px),
    linear-gradient(to right, #000 0 2px, transparent 2px);
  -webkit-mask-size: 100% var(--grid-cell), var(--grid-cell) 100%;
  -webkit-mask-position: -1px -1px;
  -webkit-mask-repeat: repeat;
  -webkit-mask-composite: source-in;
}

.discover__mark {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  color: color-mix(in srgb, var(--charcoal) 38%, transparent);
  font-size: 9px;
  letter-spacing: 0.14em;
  pointer-events: none;
  white-space: nowrap;
}

.discover__cross {
  width: 12px;
  height: 12px;
  stroke: currentColor;
  stroke-width: 1;
  fill: none;
}

.discover__node {
  position: absolute;
  left: 0;
  top: 0;
}

.colour {
  z-index: 6;
  width: 440px;
  height: 220px;
}

.colour.is-open {
  z-index: 24;
}

.colour__word {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--charcoal);
}

.discover--settled .discover__node {
  transition: transform 1.15s cubic-bezier(0.22, 1, 0.36, 1);
}

.discover__node.is-dragging,
.discover--reduce .discover__node,
.discover--reduce :deep(.stack__piece),
.discover--reduce :deep(.folder__piece),
.discover--reduce :deep(.piece__like),
:deep(.stack__piece.is-dragging),
:deep(.folder__piece.is-dragging) {
  transition: none;
}

.discover__node.is-dragging,
.discover--reduce .discover__node,
.discover--reduce .stack__plate,
.discover--reduce :deep(.stack__piece),
.discover--reduce :deep(.folder__piece),
.discover--reduce :deep(.piece__like),
:deep(.stack__piece.is-dragging),
:deep(.folder__piece.is-dragging) {
  transition: none;
}

.stack__plate {
  position: relative;
  /* border-radius: 15px; */
  border: 1px solid color-mix(in srgb, var(--charcoal) 10%, transparent);
  background: color-mix(in srgb, var(--cream) 74%, transparent);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  transition:
    left 0.62s cubic-bezier(0.22, 1, 0.36, 1),
    top 0.62s cubic-bezier(0.22, 1, 0.36, 1),
    width 0.62s cubic-bezier(0.22, 1, 0.36, 1),
    height 0.62s cubic-bezier(0.22, 1, 0.36, 1);
}
.stack__plate:hover {
  border: 1px solid color-mix(in srgb, var(--charcoal) 20%, transparent);
}
.stack__name {
  position: absolute;
  left: 20px;
  bottom: 16px;
  z-index: 40;
  max-width: calc(100% - 24px);
  margin: 0;
  color: var(--charcoal);
  pointer-events: none;
}

.stack__toggle {
  z-index: 8;
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
}

.stack:not(.is-open) .stack__toggle,
.stack__collapse {
  position: absolute;
  inset: 0;
}

.stack__collapse {
  z-index: 0;
}

.stack:not(.is-open) :deep(.stack__piece) {
  pointer-events: none;
}

:deep(.stack__piece) {
  transform-origin: center center;
  transition:
    transform 0.62s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.35s ease;
}

.stack.is-open :deep(.stack__piece) {
  transition: transform 0.75s cubic-bezier(0.34, 1.15, 0.64, 1);
}

.discover--reduce .stack.is-open :deep(.stack__piece),
.stack.is-open :deep(.stack__piece.is-dragging) {
  transition: none;
}

:deep(.folder__piece) {
  transform-origin: center center;
}

.orb {
  perspective: 1760px;
  perspective-origin: 50% 40%;
  transform-style: preserve-3d;
}

.orb__body {
  position: relative;
  transform-style: preserve-3d;
}

.orb__name {
  position: absolute;
  left: 0;
  bottom: 0;
  z-index: 6;
  max-width: 100%;
  margin: 0;
  color: var(--charcoal);
  pointer-events: none;
}

.orb.is-open .orb__name {
  pointer-events: auto;
}

.orb__toggle {
  position: absolute;
  inset: 0;
  z-index: 8;
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
}

.orb:not(.is-open) :deep(.orb__piece),
.orb.is-opening :deep(.orb__piece) {
  transition:
    transform 0.62s cubic-bezier(0.22, 1, 0.36, 1),
    width 0.62s cubic-bezier(0.22, 1, 0.36, 1),
    height 0.62s cubic-bezier(0.22, 1, 0.36, 1);
}

.orb.is-snapping :deep(.orb__piece),
.orb.is-dragging :deep(.orb__piece),
.orb.is-open:not(.is-opening) :deep(.orb__piece) {
  transition: none;
}

.orb:not(.is-open) :deep(.orb__piece) {
  pointer-events: none;
}

:deep(.orb__piece) {
  transform-style: preserve-3d;
}

.folder__sleeve {
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  width: 176px;
  min-height: 108px;
  margin-top: 11px;
  padding: 18px 14px 16px;
  text-align: left;
  color: var(--charcoal);
  background: var(--sand);
  border: 1px solid color-mix(in srgb, var(--charcoal) 16%, transparent);
}

.folder__sleeve:focus-visible,
.stack__toggle:focus-visible,
.stack__collapse:focus-visible {
  outline: 1px solid var(--charcoal);
  outline-offset: 4px;
}

.folder__tab {
  position: absolute;
  top: -12px;
  left: -1px;
  width: 72px;
  height: 12px;
  background: var(--sand);
  border: 1px solid color-mix(in srgb, var(--charcoal) 16%, transparent);
  border-bottom: 0;
}

.folder__kicker,
.folder__label {
  font-size: 10px;
  letter-spacing: 0.12em;
}

.folder__kicker {
  color: color-mix(in srgb, var(--charcoal) 62%, transparent);
}

.folder:not(.is-open) :deep(.folder__piece) {
  pointer-events: none;
}

.discover__goo {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}

.discover__entry {
  position: fixed;
  z-index: 30;
  left: 50%;
  top: 50%;
  margin: 0;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.discover__entry-title {
  display: block;
  font-family: var(--serif);
  font-size: clamp(1.55rem, 2.2vw, 2.05rem);
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 1.05;
  color: var(--charcoal);
  white-space: nowrap;
}

.discover__surrender {
  position: fixed;
  z-index: 90;
  left: calc(
    var(--selections-panel-width) +
      var(--boards-panel-width) +
      (100vw - var(--selections-panel-width) - var(--boards-panel-width)) / 2
  );
  bottom: 60px;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  margin: 0;
  padding: 0 1.25rem;
  border: 1px solid color-mix(in srgb, var(--charcoal) 15%, transparent);
  border-radius: 100px;
  background: color-mix(in srgb, var(--cream) 82%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: var(--charcoal);
  font-size: var(--text-sm);
  letter-spacing: 0.04em;
  transform: translateX(-50%);
  transition:
    left 0.35s cubic-bezier(0.22, 1, 0.36, 1),
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease;
}

.discover__surrender:hover:not(:disabled),
.discover__surrender:focus-visible:not(:disabled) {
  background: color-mix(in srgb, var(--charcoal) 6%, var(--cream));
  border-color: var(--charcoal);
}

.discover__surrender:disabled {
  opacity: 0.35;
  cursor: default;
}
</style>
