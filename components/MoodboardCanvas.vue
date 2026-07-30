<template>
  <Teleport to="body">
    <div
      v-if="isMoodboard"
      class="moodboard"
      role="dialog"
      aria-modal="true"
      aria-label="Moodboard composer"
    >
      <header class="moodboard__toolbar">
        <div class="moodboard__nav">
          <button type="button" class="btn moodboard__back" @click="onSaveAndClose">
            Save and Close
          </button>
          <button type="button" class="btn moodboard__cancel" @click="onCancelEdits">
            Cancel edits
          </button>
        </div>

        <div ref="switcherRef" class="moodboard__switcher">
          <form
            v-if="titleEditing"
            class="moodboard__title-edit"
            @submit.prevent="saveTitleEdit"
          >
            <input
              ref="titleInput"
              v-model="titleDraft"
              type="text"
              class="moodboard__title-input  interface"
              aria-label="Board name"
              @blur="saveTitleEdit"
              @keydown.esc="cancelTitleEdit"
            />
          </form>
          <template v-else>
            <button
              type="button"
              class="moodboard__switcher-toggle  interface"
              :aria-expanded="switchOpen"
              @click="switchOpen = !switchOpen"
            >
              <span>{{ activeBoard?.name || activeMoodboard?.name || 'My Board 1' }}</span>
              <span
                v-if="boards.length > 1"
                class="moodboard__switcher-caret"
                aria-hidden="true"
              ></span>
            </button>
            <button
              type="button"
              class="moodboard__title-edit-btn"
              aria-label="Rename board"
              title="Rename board"
              @click="startTitleEdit"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 20h4L18.5 9.5a2.121 2.121 0 0 0-3-3L5 17v3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
                <path d="M13.5 6.5l4 4" stroke="currentColor" stroke-width="1.5" />
              </svg>
            </button>
          </template>
          <div v-if="switchOpen && boards.length > 1" class="moodboard__switcher-menu">
            <button
              v-for="board in boards"
              :key="board.id"
              type="button"
              class="moodboard__switcher-option"
              :class="{ 'moodboard__switcher-option--active': board.id === activeBoardId }"
              @click="switchSavedBoard(board.id)"
            >
              {{ board.name }}
            </button>
          </div>
        </div>

        <div class="moodboard__tools">
          <button type="button" class="btn" @click="downloadScreenshot">Download screenshot</button>
          <button type="button" class="btn btn--filled" @click="sendEnquiry">Send as enquiry</button>
        </div>
      </header>

      <div class="moodboard__workspace">
        <MoodboardLibraryPanel
          :open="libraryOpen"
          @close="libraryOpen = false"
          @select="onLibrarySelect"
        />

        <div
          ref="canvasEl"
          class="moodboard__canvas grid-bg"
          :class="{ 'moodboard__canvas--drawing': isDrawing }"
          @click.self="clearActive"
        >
        <svg
          class="moodboard__draw-layer"
          :class="{ 'moodboard__draw-layer--active': isDrawing }"
          @pointerdown="onDrawLayerPointerDown"
          @pointermove="onDrawMove"
          @pointerup="onDrawEnd"
          @pointerleave="onDrawEnd"
        >
          <template v-for="stroke in strokes" :key="stroke.id">
            <g
              v-if="stroke.kind === 'arrow' && stroke.points.length >= 2"
              class="moodboard__arrow"
              :class="{ 'moodboard__arrow--active': activeStrokeId === stroke.id }"
              :data-arrow-id="stroke.id"
            >
              <line
                class="moodboard__arrow-hit"
                :x1="stroke.points[0].x"
                :y1="stroke.points[0].y"
                :x2="stroke.points[1].x"
                :y2="stroke.points[1].y"
                stroke="transparent"
                stroke-width="18"
                stroke-linecap="round"
                @pointerdown.stop="onArrowSelect($event, stroke.id)"
              />
              <line
                class="moodboard__arrow-line"
                :x1="stroke.points[0].x"
                :y1="stroke.points[0].y"
                :x2="arrowLineEnd(stroke.points[0], stroke.points[1], stroke.width).x"
                :y2="arrowLineEnd(stroke.points[0], stroke.points[1], stroke.width).y"
                :stroke="stroke.color"
                :stroke-width="stroke.width"
                stroke-linecap="round"
                pointer-events="none"
              />
              <polygon
                :points="arrowHeadAttr(stroke.points[0], stroke.points[1], stroke.width)"
                :fill="stroke.color"
                pointer-events="none"
              />
              <template v-if="activeStrokeId === stroke.id">
                <circle
                  v-for="(point, endIndex) in stroke.points.slice(0, 2)"
                  :key="`${stroke.id}-h-${endIndex}`"
                  class="moodboard__arrow-handle"
                  :cx="point.x"
                  :cy="point.y"
                  r="7"
                  data-arrow-handle="true"
                  @pointerdown.stop="onArrowHandleStart($event, stroke.id, endIndex === 0 ? 0 : 1)"
                />
              </template>
            </g>
            <polyline
              v-else
              :points="pointsToAttr(stroke.points)"
              :stroke="stroke.color"
              :stroke-width="stroke.width"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
              pointer-events="none"
            />
          </template>
          <template v-if="currentStroke && currentStroke.points.length">
            <g v-if="currentStroke.kind === 'arrow' && currentStroke.points.length >= 2">
              <line
                :x1="currentStroke.points[0].x"
                :y1="currentStroke.points[0].y"
                :x2="arrowLineEnd(currentStroke.points[0], currentStroke.points[1], currentStroke.width).x"
                :y2="arrowLineEnd(currentStroke.points[0], currentStroke.points[1], currentStroke.width).y"
                :stroke="currentStroke.color"
                :stroke-width="currentStroke.width"
                stroke-linecap="round"
              />
              <polygon
                :points="arrowHeadAttr(currentStroke.points[0], currentStroke.points[1], currentStroke.width)"
                :fill="currentStroke.color"
              />
            </g>
            <polyline
              v-else-if="currentStroke.kind !== 'arrow'"
              :points="pointsToAttr(currentStroke.points)"
              :stroke="currentStroke.color"
              :stroke-width="currentStroke.width"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </template>
        </svg>

        <div
          v-for="item in placements"
          :key="item.id"
          class="moodboard__item"
          :class="[
            `moodboard__item--${item.kind}`,
            {
              'moodboard__item--active': activeId === item.id,
              'moodboard__item--resizing': resizeState?.id === item.id,
            },
          ]"
          :style="{
            transform: `translate(${item.x}px, ${item.y}px) scale(${item.scale})`,
            transformOrigin: 'top left',
            zIndex: item.z,
            '--inv-scale': 1 / item.scale,
          }"
          @pointerdown="onPointerDown($event, item.id)"
          @click="bringToFront(item.id)"
        >
          <template v-if="item.kind === 'image'">
            <img :src="item.imageUrl" :alt="item.title" draggable="false" />
            <span class="moodboard__label  interface">{{ item.title }}</span>
            <ImageCycleArrows
              v-if="(item.imageUrls?.length || 0) > 1"
              class="moodboard__cycle"
              :style="{ transform: `translateX(-50%) scale(${1 / item.scale})` }"
              :index="item.imageIndex ?? 0"
              :count="item.imageUrls?.length || 0"
              @prev="cycleItemImage(item.id, -1)"
              @next="cycleItemImage(item.id, 1)"
            />
          </template>

          <template v-else-if="item.kind === 'colour'">
            <div class="moodboard__swatch">
              <span class="moodboard__swatch-fill" :style="{ background: item.colour }" />
              <span class="moodboard__swatch-hex">{{ item.colour }}</span>
            </div>
          </template>

          <template v-else-if="item.kind === 'text'">
            <div
              class="moodboard__text  interface"
              :data-editing="item.id"
              :contenteditable="editingId === item.id"
              @dblclick="startEditing(item.id)"
              @blur="onTextBlur($event, item.id)"
              @keydown.enter.prevent="($event.target as HTMLElement).blur()"
              @pointerdown="onTextPointerDown($event, item.id)"
            >{{ item.text }}</div>
          </template>

          <button
            type="button"
            class="moodboard__clone"
            aria-label="Clone item"
            title="Clone"
            :style="{ transform: `scale(${1 / item.scale})` }"
            @pointerdown.stop
            @click.stop="cloneItem(item.id)"
          >
            Clone
          </button>

          <button
            type="button"
            class="moodboard__remove"
            aria-label="Remove item"
            :style="{ transform: `scale(${1 / item.scale})` }"
            @pointerdown.stop
            @click.stop="removeItem(item.id)"
          >
            ×
          </button>

          <template v-if="activeId === item.id && editingId !== item.id">
            <span
              v-for="corner in corners"
              :key="corner"
              class="moodboard__handle"
              :class="`moodboard__handle--${corner}`"
              :style="{ transform: `translate(-50%, -50%) scale(${1 / item.scale})` }"
              @pointerdown.stop="onResizeStart($event, item.id, corner)"
            />
          </template>
        </div>
      </div>
      </div>

      <div class="moodboard__actions">
        <button
          type="button"
          class="moodboard__action"
          :class="{ 'moodboard__action--active': libraryOpen }"
          :aria-pressed="libraryOpen"
          aria-label="Open library"
          title="Library"
          @click="toggleLibrary"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H11l2 2h5.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" />
          </svg>
        </button>
        <button
          type="button"
          class="moodboard__action"
          aria-label="Add colour swatch"
          title="Add colour swatch"
          @click="openColourPicker"
        >
          <span class="moodboard__action-swatch" />
        </button>
        <button
          type="button"
          class="moodboard__action"
          aria-label="Add text"
          title="Add text"
          @click="onAddText"
        >
          <span class="moodboard__action-text">T</span>
        </button>
        <button
          type="button"
          class="moodboard__action"
          aria-label="Upload image"
          title="Upload image"
          @click="openImagePicker"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="8.5" cy="9.5" r="1.5" />
            <path d="m21 16-5-5L5 20" />
          </svg>
        </button>
        <button
          type="button"
          class="moodboard__action"
          :class="{ 'moodboard__action--active': drawTool === 'pen' }"
          :aria-pressed="drawTool === 'pen'"
          aria-label="Draw"
          title="Draw"
          @click="toggleDrawTool('pen')"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
        <button
          type="button"
          class="moodboard__action"
          :class="{ 'moodboard__action--active': drawTool === 'arrow' }"
          :aria-pressed="drawTool === 'arrow'"
          aria-label="Draw arrow"
          title="Draw arrow"
          @click="toggleDrawTool('arrow')"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </button>
      </div>

      <div v-if="drawTool === 'pen'" class="moodboard__pen-bar">
        <label class="moodboard__pen-swatch" :style="{ background: penColour }" title="Pen colour">
          <input type="color" v-model="penColour" class="moodboard__colour-input" />
        </label>
        <input
          v-model.number="penWidth"
          type="range"
          min="1"
          max="24"
          step="1"
          class="moodboard__pen-range"
          aria-label="Pen thickness"
        />
        <button type="button" class="btn moodboard__pen-clear" @click="clearStrokes">Clear drawing</button>
      </div>

      <input
        ref="colourInput"
        type="color"
        class="moodboard__colour-input"
        :value="pendingColour"
        @input="onColourInput"
        @change="onColourChange"
      />

      <input
        ref="imageInput"
        type="file"
        accept="image/*"
        class="moodboard__colour-input"
        @change="onImageSelected"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { uniqueImageUrls } from '~/composables/productImages'

const {
  isMoodboard,
  closeMoodboard,
  activeMoodboard,
  activeMoodboardId,
  renameMoodboard,
} = useBucket()
const {
  boards,
  activeBoard,
  activeBoardId,
  setActiveBoard,
  saveActiveBoard,
  updateBoard,
  renameBoard,
} = useBoards()
const {
  placements,
  strokes,
  activeId,
  activeStrokeId,
  bringToFront,
  updatePosition,
  updateScale,
  clearActive,
  addColour,
  addImage,
  cycleItemImage,
  addStroke,
  updateStrokePoints,
  removeStroke,
  clearStrokes,
  selectStroke,
  addText,
  updateText,
  removeItem,
  cloneItem,
  loadBoard,
  snapshot,
} = useMoodboard()
const { openFromMoodboard } = useEnquiryForm()
const { imageUrl: buildLibraryUrl } = useSanityImage()

type Corner = 'tl' | 'tr' | 'bl' | 'br'
const corners: Corner[] = ['tl', 'tr', 'bl', 'br']

const canvasEl = ref<HTMLElement | null>(null)
const switcherRef = ref<HTMLElement | null>(null)
const switchOpen = ref(false)
const colourInput = ref<HTMLInputElement | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)
const pendingColour = ref('#c8a86b')
const editingId = ref<string | null>(null)
const titleEditing = ref(false)
const titleDraft = ref('')
const titleInput = ref<HTMLInputElement | null>(null)

const startTitleEdit = () => {
  titleDraft.value = activeBoard.value?.name || activeMoodboard.value?.name || ''
  titleEditing.value = true
  switchOpen.value = false
  nextTick(() => titleInput.value?.focus())
}

const saveTitleEdit = () => {
  if (!titleEditing.value) return
  const next = titleDraft.value.trim()
  if (next) {
    if (activeBoardId.value) renameBoard(activeBoardId.value, next)
    else if (activeMoodboardId.value) renameMoodboard(activeMoodboardId.value, next)
  }
  titleEditing.value = false
}

const cancelTitleEdit = () => {
  titleEditing.value = false
}

type DrawTool = 'pen' | 'arrow'
const ARROW_COLOR = '#1a1a1a'
const ARROW_WIDTH = 3
const drawTool = ref<DrawTool | null>(null)
const isDrawing = computed(() => drawTool.value !== null)
const libraryOpen = ref(false)
const penColour = ref('#1a1a1a')
const penWidth = ref(4)
const currentStroke = ref<{
  kind: 'freehand' | 'arrow'
  color: string
  width: number
  points: { x: number; y: number }[]
} | null>(null)
const arrowHandleDrag = ref<{ id: string; end: 0 | 1 } | null>(null)
const dragState = ref<{ id: string; offsetX: number; offsetY: number } | null>(null)
const resizeState = ref<{
  id: string
  anchorX: number
  anchorY: number
  baseW: number
  baseH: number
  corner: Corner
} | null>(null)

type OpenSnapshot = {
  boardId: string | null
  name: string
  placements: ReturnType<typeof snapshot>['placements']
  strokes: ReturnType<typeof snapshot>['strokes']
}

const openSnapshot = ref<OpenSnapshot | null>(null)

// Module-level so revert can finish after this dialog unmounts.
let cancelRevertTimer: ReturnType<typeof setTimeout> | null = null

watch(
  isMoodboard,
  (open) => {
    if (!open) return
    if (cancelRevertTimer) {
      clearTimeout(cancelRevertTimer)
      cancelRevertTimer = null
    }
    const state = snapshot()
    openSnapshot.value = {
      boardId: activeBoardId.value,
      name: activeBoard.value?.name || activeMoodboard.value?.name || 'My Board 1',
      placements: state.placements,
      strokes: state.strokes,
    }
  },
  { immediate: true },
)

const onSaveAndClose = () => {
  if (cancelRevertTimer) {
    clearTimeout(cancelRevertTimer)
    cancelRevertTimer = null
  }
  saveActiveBoard(placements.value, strokes.value)
  switchOpen.value = false
  closeMoodboard()
}

const onCancelEdits = () => {
  const snap = openSnapshot.value
  const revert = updateBoard
  const restore = loadBoard
  switchOpen.value = false
  closeMoodboard()

  // Revert after the composer has left the page.
  if (cancelRevertTimer) clearTimeout(cancelRevertTimer)
  cancelRevertTimer = setTimeout(() => {
    cancelRevertTimer = null
    if (!snap) return
    if (snap.boardId) {
      revert(snap.boardId, {
        name: snap.name,
        placements: snap.placements,
        strokes: snap.strokes,
      })
    }
    restore(snap.placements, snap.strokes)
  }, 350)
}

const switchSavedBoard = (id: string) => {
  if (id === activeBoardId.value) {
    switchOpen.value = false
    return
  }
  // Persist current canvas before switching.
  if (activeBoardId.value) {
    saveActiveBoard(placements.value, strokes.value)
  }
  setActiveBoard(id)
  const board = boards.value.find((b) => b.id === id)
  if (board) loadBoard(board.placements, board.strokes)
  switchOpen.value = false
  clearActive()
}

const onDocumentClick = (event: MouseEvent) => {
  if (!switcherRef.value?.contains(event.target as Node)) {
    switchOpen.value = false
  }
}

const openColourPicker = () => {
  colourInput.value?.click()
}

const onColourInput = (event: Event) => {
  pendingColour.value = (event.target as HTMLInputElement).value
}

const onColourChange = (event: Event) => {
  const hex = (event.target as HTMLInputElement).value
  pendingColour.value = hex
  addColour(hex)
}

const openImagePicker = () => {
  imageInput.value?.click()
}

const onImageSelected = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      addImage(reader.result, file.name.replace(/\.[^.]+$/, ''))
    }
  }
  reader.readAsDataURL(file)
  input.value = ''
}

const toggleLibrary = () => {
  libraryOpen.value = !libraryOpen.value
  if (libraryOpen.value) {
    drawTool.value = null
    currentStroke.value = null
  }
}

const LIBRARY_PLACEHOLDER =
  `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" rx="112" fill="#ddd6c8"/></svg>',
  )}`

const onLibrarySelect = (item: {
  title: string
  image?: { asset?: { url?: string } }
  gallery?: { asset?: { url?: string } }[]
  spiritGallery?: { asset?: { url?: string } }[]
}) => {
  const assets = [item.image, ...(item.gallery || []), ...(item.spiritGallery || [])]
  const urls = uniqueImageUrls(
    ...assets.map((asset) => (asset ? buildLibraryUrl(asset, 1200) : '')),
  )
  const url = urls[0] || item.image?.asset?.url
  const isSample = !url || url.includes('picsum.photos')
  if (isSample) {
    addImage(LIBRARY_PLACEHOLDER, item.title)
    return
  }
  addImage(url, item.title, {
    imageUrls: urls.length > 1 ? urls : undefined,
    imageIndex: 0,
  })
}

const toggleDrawTool = (tool: DrawTool) => {
  drawTool.value = drawTool.value === tool ? null : tool
  if (drawTool.value) {
    clearActive()
    libraryOpen.value = false
  }
  currentStroke.value = null
  arrowHandleDrag.value = null
}

type Point = { x: number; y: number }

const pointsToAttr = (points: Point[]) =>
  points.map((p) => `${p.x},${p.y}`).join(' ')

const arrowHeadSize = (width: number) => ({
  length: Math.max(12, width * 4),
  width: Math.max(8, width * 2.5),
})

const arrowLineEnd = (from: Point, to: Point, strokeWidth: number): Point => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const { length } = arrowHeadSize(strokeWidth)
  if (len <= length) return { ...from }
  return {
    x: to.x - (dx / len) * length,
    y: to.y - (dy / len) * length,
  }
}

const arrowHeadAttr = (from: Point, to: Point, strokeWidth: number) => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const { length, width } = arrowHeadSize(strokeWidth)
  const bx = to.x - ux * length
  const by = to.y - uy * length
  const px = -uy * width
  const py = ux * width
  return `${to.x},${to.y} ${bx + px},${by + py} ${bx - px},${by - py}`
}

const drawPoint = (event: PointerEvent) => {
  const rect = canvasEl.value?.getBoundingClientRect()
  if (!rect) return { x: 0, y: 0 }
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

const onArrowSelect = (_event: PointerEvent, id: string) => {
  selectStroke(id)
  currentStroke.value = null
}

const onArrowHandleStart = (event: PointerEvent, id: string, end: 0 | 1) => {
  event.preventDefault()
  selectStroke(id)
  arrowHandleDrag.value = { id, end }
  ;(event.target as Element).setPointerCapture?.(event.pointerId)
}

const onDrawLayerPointerDown = (event: PointerEvent) => {
  if (!drawTool.value) return
  if ((event.target as Element).closest?.('[data-arrow-id], [data-arrow-handle]')) {
    return
  }
  event.preventDefault()
  selectStroke(null)
  ;(event.currentTarget as Element).setPointerCapture?.(event.pointerId)
  const point = drawPoint(event)
  const isArrow = drawTool.value === 'arrow'
  currentStroke.value = {
    kind: isArrow ? 'arrow' : 'freehand',
    color: isArrow ? ARROW_COLOR : penColour.value,
    width: isArrow ? ARROW_WIDTH : penWidth.value,
    points: isArrow ? [point, point] : [point],
  }
}

const onDrawMove = (event: PointerEvent) => {
  if (arrowHandleDrag.value) {
    const { id, end } = arrowHandleDrag.value
    const stroke = strokes.value.find((s) => s.id === id)
    if (!stroke || stroke.points.length < 2) return
    const point = drawPoint(event)
    const next = stroke.points.map((p) => ({ ...p }))
    next[end] = point
    updateStrokePoints(id, next)
    return
  }
  if (!drawTool.value || !currentStroke.value) return
  const point = drawPoint(event)
  if (currentStroke.value.kind === 'arrow') {
    currentStroke.value.points = [currentStroke.value.points[0], point]
    return
  }
  currentStroke.value.points.push(point)
}

const onDrawEnd = () => {
  if (arrowHandleDrag.value) {
    arrowHandleDrag.value = null
    return
  }
  if (!currentStroke.value) return
  const stroke = currentStroke.value
  const [start, end] = stroke.points
  const worthSaving =
    stroke.kind === 'arrow'
      ? Boolean(start && end && Math.hypot(end.x - start.x, end.y - start.y) > 4)
      : stroke.points.length > 1

  if (worthSaving) {
    const id = `stroke-${Date.now()}-${Math.round(Math.random() * 1000)}`
    addStroke({
      id,
      kind: stroke.kind,
      color: stroke.color,
      width: stroke.width,
      points: stroke.points,
    })
    if (stroke.kind === 'arrow') selectStroke(id)
  }
  currentStroke.value = null
}

const onKeyDown = (event: KeyboardEvent) => {
  if (editingId.value || titleEditing.value) return
  const target = event.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    return
  }
  if ((event.key === 'Delete' || event.key === 'Backspace') && activeStrokeId.value) {
    event.preventDefault()
    removeStroke(activeStrokeId.value)
  }
}

const onAddText = () => {
  const id = addText()
  nextTick(() => startEditing(id))
}

const startEditing = (id: string) => {
  editingId.value = id
  nextTick(() => {
    const el = document.querySelector<HTMLElement>(`[data-editing="${id}"]`)
    el?.focus()
  })
}

const onTextBlur = (event: FocusEvent, id: string) => {
  const value = (event.target as HTMLElement).innerText.trim()
  updateText(id, value || 'Text')
  editingId.value = null
}

const onTextPointerDown = (event: PointerEvent, id: string) => {
  if (editingId.value === id) {
    event.stopPropagation()
    return
  }
  onPointerDown(event, id)
}

const onPointerDown = (event: PointerEvent, id: string) => {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  dragState.value = {
    id,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
  }
  target.setPointerCapture?.(event.pointerId)
  bringToFront(id)
}

const onResizeStart = (event: PointerEvent, id: string, corner: Corner) => {
  if (!canvasEl.value) return
  const itemEl = (event.target as HTMLElement).closest('.moodboard__item') as HTMLElement | null
  if (!itemEl) return

  const item = placements.value.find((p) => p.id === id)
  const scale = item?.scale ?? 1
  const rect = itemEl.getBoundingClientRect()
  const canvasRect = canvasEl.value.getBoundingClientRect()

  const left = rect.left - canvasRect.left
  const top = rect.top - canvasRect.top
  const right = left + rect.width
  const bottom = top + rect.height

  // Anchor = the corner opposite the one being dragged (stays fixed)
  const anchor = {
    tl: { x: right, y: bottom },
    tr: { x: left, y: bottom },
    bl: { x: right, y: top },
    br: { x: left, y: top },
  }[corner]

  resizeState.value = {
    id,
    corner,
    anchorX: anchor.x,
    anchorY: anchor.y,
    baseW: rect.width / scale,
    baseH: rect.height / scale,
  }
  itemEl.setPointerCapture?.(event.pointerId)
  bringToFront(id)
}

const onPointerMove = (event: PointerEvent) => {
  if (!canvasEl.value) return
  const canvasRect = canvasEl.value.getBoundingClientRect()

  if (arrowHandleDrag.value) {
    const { id, end } = arrowHandleDrag.value
    const stroke = strokes.value.find((s) => s.id === id)
    if (!stroke || stroke.points.length < 2) return
    const point = {
      x: event.clientX - canvasRect.left,
      y: event.clientY - canvasRect.top,
    }
    const next = stroke.points.map((p) => ({ ...p }))
    next[end] = point
    updateStrokePoints(id, next)
    return
  }

  if (resizeState.value) {
    const { id, corner, anchorX, anchorY, baseW, baseH } = resizeState.value
    const px = event.clientX - canvasRect.left
    const py = event.clientY - canvasRect.top
    const newW = Math.abs(px - anchorX)
    const newH = Math.abs(py - anchorY)
    const scale = Math.max(0.25, Math.min(6, Math.max(newW / baseW, newH / baseH)))
    const w = baseW * scale
    const h = baseH * scale
    const x = corner === 'br' || corner === 'tr' ? anchorX : anchorX - w
    const y = corner === 'br' || corner === 'bl' ? anchorY : anchorY - h
    updatePosition(id, x, y)
    updateScale(id, scale)
    return
  }

  if (dragState.value) {
    const x = event.clientX - canvasRect.left - dragState.value.offsetX
    const y = event.clientY - canvasRect.top - dragState.value.offsetY
    updatePosition(dragState.value.id, x, y)
  }
}

const onPointerUp = () => {
  dragState.value = null
  resizeState.value = null
  arrowHandleDrag.value = null
}

const downloadScreenshot = async () => {
  if (!canvasEl.value || !import.meta.client) return
  const { default: html2canvas } = await import('html2canvas')
  const canvas = await html2canvas(canvasEl.value, {
    backgroundColor: '#f4efe6',
    scale: 2,
  })
  const link = document.createElement('a')
  link.download = 'studio-based-upon-moodboard.png'
  link.href = canvas.toDataURL('image/png')
  link.click()
}

const sendEnquiry = async () => {
  if (!placements.value.length || !import.meta.client) return

  clearActive()
  await nextTick()

  let screenshot: string | null = null
  if (canvasEl.value) {
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(canvasEl.value, {
      backgroundColor: '#f4efe6',
      scale: 1,
    })
    screenshot = canvas.toDataURL('image/png')
  }

  openFromMoodboard(placements.value, screenshot)
}

onMounted(() => {
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('keydown', onKeyDown)
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  // Keep cancelRevertTimer alive so discard can finish after this dialog unmounts.
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('click', onDocumentClick)
})
</script>

<style scoped>
.moodboard {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: var(--cream);
  display: flex;
  flex-direction: column;
}

.moodboard__toolbar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
  padding: 1rem var(--gutter);

}

.moodboard__nav {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.moodboard__back {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.moodboard__cancel {
  opacity: 0.7;
}

.moodboard__cancel:hover {
  opacity: 1;
}

.moodboard__switcher {
  position: relative;
  justify-self: center;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
}

.moodboard__switcher-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: var(--text-lg);
  color: var(--charcoal);
  transition: color 0.2s ease;
}

.moodboard__title-edit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  transition: color 0.2s ease;
}

.moodboard__title-edit-btn:hover {
  color: var(--charcoal);
}

.moodboard__title-input {
  font-size: var(--text-lg);
  color: var(--charcoal);
  text-align: center;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--charcoal);
  padding: 0 0.25rem 0.15rem;
}

.moodboard__title-input:focus {
  outline: none;
}

.moodboard__switcher-toggle:hover {
  color: var(--accent);
}

.moodboard__switcher-caret {
  width: 7px;
  height: 7px;
  border-right: 1px solid var(--muted);
  border-bottom: 1px solid var(--muted);
  transform: rotate(45deg);
  transition: transform 0.2s ease;
  margin-bottom: 3px;
}

.moodboard__switcher-toggle[aria-expanded='true'] .moodboard__switcher-caret {
  transform: rotate(225deg);
  margin-bottom: -3px;
}

.moodboard__switcher-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  min-width: 11rem;
  display: flex;
  flex-direction: column;
  padding: 0.35rem;
  background: var(--warm-white);
  border: 1px solid var(--grid-line);
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
}

.moodboard__switcher-option {
  padding: 0.55rem 0.75rem;
  font-size: var(--text-sm);
  text-align: left;
  color: var(--muted);
  border-radius: 8px;
  transition: color 0.2s ease, background 0.2s ease;
}

.moodboard__switcher-option:hover,
.moodboard__switcher-option--active {
  color: var(--charcoal);
  background: var(--cream);
}

.moodboard__tools {
  justify-self: end;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.moodboard__workspace {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.moodboard__canvas {
  position: relative;
  flex: 1;
  overflow: hidden;
  touch-action: none;
}

.moodboard__draw-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 200;
  pointer-events: none;
}

.moodboard__draw-layer--active {
  pointer-events: auto;
  cursor: crosshair;
}

.moodboard__arrow-hit {
  pointer-events: stroke;
  cursor: pointer;
}

.moodboard__arrow-handle {
  pointer-events: auto;
  fill: #fff;
  stroke: var(--charcoal);
  stroke-width: 1.5;
  cursor: grab;
}

.moodboard__arrow-handle:active {
  cursor: grabbing;
}

.moodboard__canvas--drawing .moodboard__item {
  cursor: crosshair;
  pointer-events: none;
}

.moodboard__item {
  position: absolute;
  top: 0;
  left: 0;
  width: 210px;
  cursor: grab;
  user-select: none;
  transform-origin: center;
  transition: box-shadow 0.2s ease;
}

.moodboard__item--active {
  outline: calc(1px * var(--inv-scale, 1)) solid var(--charcoal);
  outline-offset: 0;
}

/* Resize handles */
.moodboard__handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #fff;
  border: 0.075em solid var(--charcoal);
  border-radius: 2px;
  z-index: 10;
}

.moodboard__handle--tl {
  top: 0;
  left: 0;
  cursor: nwse-resize;
}

.moodboard__handle--tr {
  top: 0;
  left: 100%;
  cursor: nesw-resize;
}

.moodboard__handle--bl {
  top: 100%;
  left: 0;
  cursor: nesw-resize;
}

.moodboard__handle--br {
  top: 100%;
  left: 100%;
  cursor: nwse-resize;
}

.moodboard__item img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

.moodboard__label {
  display: none;
  margin-top: 0.5rem;
  font-size: 10px;
  text-align: center;
}

.moodboard__cycle {
  position: absolute;
  left: 50%;
  bottom: 8px;
  z-index: 3;
  transform-origin: center bottom;
}

.moodboard__item:hover .moodboard__label {
  display: block;
}

/* When active (resize mode), keep the title out of flow so it
   doesn't expand the selection outline / shift the handles. */
.moodboard__item--active .moodboard__label {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
}

.moodboard__item--resizing .moodboard__label {
  display: none;
}

/* Colour card */
.moodboard__item--colour {
  width: 160px;
}

.moodboard__swatch {
  display: flex;
  flex-direction: column;
  background: var(--warm-white);
  border: 1px solid var(--grid-line);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
}

.moodboard__swatch-fill {
  display: block;
  width: 100%;
  aspect-ratio: 1;
}

.moodboard__swatch-hex {
  padding: 0.6rem 0.75rem;
  font-size: var(--text-sm);
  letter-spacing: 0.08em;
  text-align: center;
  color: var(--charcoal);
}

/* Text item */
.moodboard__item--text {
  width: auto;
  max-width: 320px;
}

.moodboard__text {
  padding: 0.35rem 0.5rem;
  font-family: monospace;
  font-size: clamp(0.75rem, 1.25vw, 1rem);
  line-height: 1.25;
  color: var(--charcoal);
  outline: none;
  white-space: pre-wrap;
  cursor: grab;
}

.moodboard__text[contenteditable='true'] {
  cursor: text;
  background: rgba(255, 255, 255, 0.6);
  box-shadow: 0 0 0 1px var(--grid-line);
}

/* Clone + remove */
.moodboard__clone {
  position: absolute;
  top: -0.6rem;
  right: 1.15rem;
  height: 1.5rem;
  padding: 0 0.45rem;
  display: grid;
  place-items: center;
  font-size: 9px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1;
  color: var(--charcoal);
  background: var(--warm-white);
  border: 1px solid var(--grid-line);
  border-radius: 999px;
  opacity: 0;
  transition: opacity 0.15s ease;
  cursor: pointer;
  white-space: nowrap;
}

.moodboard__remove {
  position: absolute;
  top: -0.6rem;
  right: -0.6rem;
  width: 1.5rem;
  height: 1.5rem;
  display: grid;
  place-items: center;
  font-size: 1.1rem;
  line-height: 1;
  color: var(--charcoal);
  background: var(--warm-white);
  border: 1px solid var(--grid-line);
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.moodboard__item:hover .moodboard__clone,
.moodboard__item:hover .moodboard__remove,
.moodboard__item--active .moodboard__clone,
.moodboard__item--active .moodboard__remove {
  opacity: 1;
}

/* Fixed tool circles, bottom-right */
.moodboard__actions {
  position: absolute;
  right: var(--gutter);
  bottom: var(--gutter);
  z-index: 400;
  display: flex;
  gap: 0.75rem;
}

.moodboard__action {
  width: 3rem;
  height: 3rem;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid var(--grid-line);
  background: transparent;
  color: var(--charcoal);
  transition: background 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.moodboard__action:hover {
  background: #fff;
  border-color: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.moodboard__action--active {
  background: var(--charcoal);
  color: var(--warm-white);
  border-color: var(--charcoal);
}

.moodboard__action--active:hover {
  background: var(--charcoal);
  color: var(--warm-white);
}

.moodboard__pen-bar {
  position: absolute;
  left: var(--gutter);
  bottom: var(--gutter);
  z-index: 400;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--warm-white);
  border: 1px solid var(--grid-line);
  border-radius: 999px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.moodboard__pen-swatch {
  position: relative;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  border: 1px solid var(--grid-line);
  cursor: pointer;
}

.moodboard__pen-range {
  width: 7rem;
}

.moodboard__pen-clear {
  padding: 0.4rem 0.75rem;
  font-size: var(--text-xs);
}

.moodboard__action-swatch {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    #e0533d,
    #e0c93d,
    #4caf6d,
    #3d8fe0,
    #9b3de0,
    #e0533d
  );
}

.moodboard__action-text {
  font-size: 1.25rem;
  font-weight: 600;
}

.moodboard__colour-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

@media (max-width: 767px) {
  .moodboard__toolbar {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }

  .moodboard__nav,
  .moodboard__switcher,
  .moodboard__tools {
    justify-self: center;
  }

  .moodboard__tools {
    justify-content: center;
  }
}
</style>
