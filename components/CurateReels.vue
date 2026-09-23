<template>
  <section
    class="showcase"
    :style="{
      '--showcase-slots': Math.max(columnCount, 1),
      '--showcase-bottom-inset': `${SHOWCASE_BOTTOM_INSET_PX}px`,
    }"
    aria-label="Curate"
  >
    <div class="showcase__columns">
      <div
        v-for="(column, slotIndex) in columns"
        :key="column.instanceId"
        class="showcase__column-shell"
      >
        <div
          :ref="(el) => setColumnRef(column.instanceId, el)"
          class="showcase__column"
          :class="{
            'showcase__column--settled': settledIndexes[slotIndex] != null,
            'showcase__column--instant': instantDim[slotIndex],
            'showcase__column--surrender-dim': surrenderDim[slotIndex],
            'showcase__column--locked': column.locked,
          }"
          data-lenis-prevent
        >
          <div
            class="showcase__track"
            :ref="(el) => setTrackRef(column.instanceId, el)"
          >
            <button
              v-for="cell in loopedCells(slotIndex, column)"
              :key="cell.renderKey"
              type="button"
              class="showcase__cell"
              :class="{
                'showcase__cell--active':
                  settledIndexes[slotIndex] === cell.logicalIndex,
              }"
              :data-cell-key="cell.cellKey"
              :data-image-id="cell.image.id"
              :data-logical-index="cell.logicalIndex"
              :data-loop-copy="cell.copyIndex"
              :aria-label="`${column.title} — image ${cell.logicalIndex + 1}`"
              @click="onSelect(column, cell.logicalIndex)"
            >
              <img
                v-if="shouldLoadImage(slotIndex, cell.logicalIndex)"
                :ref="(el) => bindShowcaseImg(el, slotIndex, cell.image.id)"
                class="showcase__img"
                :class="{
                  'showcase__img--in': isImageRevealed(slotIndex, cell.image.id),
                }"
                :src="cell.image.src"
                :alt="column.title"
                :fetchpriority="
                  isSelectedImage(slotIndex, cell.logicalIndex) ? 'high' : 'low'
                "
                :loading="
                  isSelectedImage(slotIndex, cell.logicalIndex) ? 'eager' : 'lazy'
                "
                decoding="async"
                draggable="false"
                @load="onShowcaseImgLoad(slotIndex, cell.image.id)"
                @error="onShowcaseImgLoad(slotIndex, cell.image.id)"
              />
            </button>
          </div>
        </div>

        <div class="showcase__remove-zone">
          <button
            type="button"
            class="showcase__lock"
            :class="{ 'showcase__lock--on': column.locked }"
            :aria-label="column.locked ? `Unlock ${column.title} column` : `Lock ${column.title} column`"
            :aria-pressed="column.locked ? 'true' : 'false'"
            @click.stop="toggleColumnLock(slotIndex)"
          >
            <span class="showcase__lock-circle" aria-hidden="true">
              <svg
                v-if="column.locked"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              <svg
                v-else
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 7.5-2" />
              </svg>
            </span>
          </button>
          <button
            type="button"
            class="showcase__remove"
            :aria-label="`Remove ${column.title} column`"
            @click.stop="removeColumn(slotIndex)"
          >
            <span class="showcase__remove-circle" aria-hidden="true">
              <span class="showcase__remove-minus" />
            </span>
          </button>
          <button
            type="button"
            class="showcase__fork"
            :disabled="!canAddColumn"
            :aria-label="
              canAddColumn
                ? `Add ${column.title} images as a new column to the right`
                : 'Column limit reached'
            "
            @click.stop="forkColumnBeside(slotIndex)"
          >
            <span class="showcase__fork-circle" aria-hidden="true">
              <span class="showcase__fork-plus showcase__fork-plus--h" />
              <span class="showcase__fork-plus showcase__fork-plus--v" />
            </span>
          </button>
        </div>
      </div>

      <div class="showcase__adder">
        <button
          v-if="canAddColumn"
          type="button"
          class="showcase__add"
          aria-label="Add column"
          @click="addColumn"
        >
          <span class="showcase__add-icon" aria-hidden="true">
            <span class="showcase__add-arm showcase__add-arm--h" />
            <span class="showcase__add-arm showcase__add-arm--v" />
          </span>
          <span class="showcase__tooltip interface" aria-hidden="true">Add column</span>
        </button>

        <label
          class="showcase__upload"
          :class="{ 'showcase__upload--disabled': !canAddColumn }"
          :aria-label="canAddColumn ? 'Upload image' : 'Upload image (column limit reached)'"
          :aria-disabled="!canAddColumn ? 'true' : undefined"
        >
          <input
            ref="fileInputRef"
            type="file"
            class="showcase__upload-input"
            accept="image/*"
            :disabled="!canAddColumn"
            @change="onUploadChange"
          />
          <span class="showcase__upload-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 16V5" />
              <path d="M8 9l4-4 4 4" />
              <path d="M5 19h14" />
            </svg>
          </span>
          <span class="showcase__tooltip interface" aria-hidden="true">Upload</span>
        </label>

        <div v-if="COLOUR_WASH_ENABLED" ref="colourToolRef" class="showcase__colour-tool">
          <button
            type="button"
            class="showcase__ctrl"
            :class="{ 'showcase__ctrl--colour-active': Boolean(washColour) }"
            :aria-label="washColour ? 'Change colour wash' : 'Add colour wash'"
            :aria-expanded="colourPickerOpen"
            :aria-pressed="Boolean(washColour)"
            @click="toggleColourPicker"
          >
            <span class="showcase__ctrl-icon" aria-hidden="true">
              <svg
                class="showcase__colour-icon"
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                stroke-width="1"
              >
                <circle cx="9" cy="10" r="5.2" />
                <circle cx="15" cy="10" r="5.2" />
                <circle cx="12" cy="14.8" r="5.2" />
              </svg>
              <span
                v-if="washColour"
                class="showcase__colour-dot"
                :style="{ background: washColour }"
              />
            </span>
            <span class="showcase__tooltip interface" aria-hidden="true">Colour wash</span>
          </button>

          <div
            v-if="colourPickerOpen"
            class="showcase__colour-popover"
            role="dialog"
            aria-label="Colour wash"
          >
            <div
              ref="spectrumEl"
              class="showcase__spectrum"
              :style="{ '--spectrum-hue': `${spectrumHue}` }"
              @pointerdown="onSpectrumPointerDown"
            >
              <span
                class="showcase__spectrum-thumb"
                :style="{
                  left: `${spectrumSat * 100}%`,
                  top: `${(1 - spectrumVal) * 100}%`,
                }"
              />
            </div>
            <label class="showcase__hue">
              <span class="visually-hidden">Hue</span>
              <input
                v-model.number="spectrumHue"
                class="showcase__hue-input"
                type="range"
                min="0"
                max="360"
                step="1"
                aria-label="Hue"
              />
            </label>
            <div class="showcase__colour-row">
              <span
                class="showcase__colour-preview"
                :style="{ background: spectrumHex }"
                aria-hidden="true"
              />
              <input
                v-model="hexDraft"
                class="showcase__colour-hex interface"
                type="text"
                spellcheck="false"
                autocomplete="off"
                maxlength="7"
                aria-label="Hex colour"
                @focus="onHexFocus"
                @input="onHexInput"
                @blur="commitHexDraft"
                @keydown.enter.prevent="commitHexDraft"
              />
              <button
                type="button"
                class="showcase__colour-clear interface"
                :disabled="!washColour"
                @click="clearWashColour"
              >
                Remove
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="showcase__ctrl"
          aria-label="Add all to collection"
          :disabled="!columnCount"
          @click="saveSelection"
        >
          <span class="showcase__ctrl-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </span>
          <span class="showcase__tooltip interface" aria-hidden="true">Add all to collection</span>
        </button>

        <button
          type="button"
          class="showcase__ctrl showcase__ctrl--send"
          aria-label="Send this selection to Based Upon"
          :disabled="!columnCount"
          @click="sendEnquiry"
        >
          <span class="showcase__ctrl-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22l-4-9-9-4 20-7z" />
            </svg>
          </span>
          <span class="showcase__tooltip interface" aria-hidden="true">Send this selection to Based Upon</span>
        </button>
      </div>
      </div>

    <div
      v-if="COLOUR_WASH_ENABLED && washColour"
      class="showcase__wash"
      :style="{ background: washColour }"
      aria-hidden="true"
    />

    <button
      type="button"
      class="showcase__surrender interface"
      :disabled="!columnCount"
      @click="surrenderColumns"
    >
      Surrender
    </button>
  </section>
</template>

<script setup lang="ts">
import Lenis from 'lenis'
import { bucketItemId, type BucketItem } from '~/composables/useBucket'
import {
  demoShowcaseBuckets,
  SHOWCASE_DEFAULT_COLUMNS,
  SHOWCASE_MAX_COLUMNS,
  SHOWCASE_SLOT_COUNT,
  type ShowcaseBucket,
  type ShowcaseBucketImage,
} from '~/composables/useShowcaseCatalog'

type ShowcaseColumn = {
  instanceId: string
  productId: string
  bucketId?: string
  title: string
  slug?: string
  images: ShowcaseBucketImage[]
  /** When true, Surrender leaves this column alone. */
  locked?: boolean
  /** Local object URL to revoke when the column is removed. */
  objectUrl?: string
}

const MAX_COLUMNS = SHOWCASE_MAX_COLUMNS
const DEFAULT_COLUMNS = SHOWCASE_DEFAULT_COLUMNS
const SNAP_IDLE_MS = 150
const SNAP_DURATION = 0.55
const SURRENDER_DURATION = 1.15
/** Don't snap while still coasting from a flick. */
const VELOCITY_SNAP_THRESHOLD = 0.35
/** Must match `--showcase-aspect` (width / height). */
const ASPECT = 0.6
/** Colour wash control — hidden for now. */
const COLOUR_WASH_ENABLED = false
/** Triple-copy track so each column can scroll forever. */
const LOOP_COPIES = 3
const LOOP_MIDDLE = 1
/** Shared floor for Surrender + column lock/minus controls. */
const SHOWCASE_BOTTOM_INSET_PX = 60
const CTRL_SIZE_PX = 44

/** power3.inOut — used for snap + Surrender. */
const power3InOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
const surrenderEasing = power3InOut

/** Lenis internals used to wrap the loop without killing flick velocity. */
type LenisLoopInternals = Lenis & {
  animatedScroll: number
  targetScroll: number
  setScroll: (scroll: number) => void
  preventNextNativeScrollEvent: () => void
  animate: { from: number; to: number; value: number }
}

type LoopedCell = {
  image: ShowcaseBucketImage
  logicalIndex: number
  copyIndex: number
  renderKey: string
  cellKey: string
}

const loopedCells = (slotIndex: number, column: ShowcaseColumn): LoopedCell[] => {
  const images = column.images
  if (!images.length) return []
  const out: LoopedCell[] = []
  for (let copy = 0; copy < LOOP_COPIES; copy += 1) {
    for (let i = 0; i < images.length; i += 1) {
      const image = images[i]!
      out.push({
        image,
        logicalIndex: i,
        copyIndex: copy,
        renderKey: `${column.instanceId}:${copy}:${image.id}:${i}`,
        cellKey: `${slotIndex}:${copy}:${image.id}`,
      })
    }
  }
  return out
}

const createColumnLenis = (wrapper: HTMLElement, content: HTMLElement) =>
  new Lenis({
    wrapper,
    content,
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    syncTouch: true,
    // Lower lerp = longer coast / smoother flick (Lenis default ~0.075).
    syncTouchLerp: 0.055,
    touchInertiaExponent: 2.05,
    touchMultiplier: 1.55,
    wheelMultiplier: 1.4,
    // Lerp-only wheel (no duration) so successive wheel ticks keep momentum.
    lerp: 0.07,
    overscroll: false,
  })

const props = defineProps<{
  buckets?: ShowcaseBucket[]
}>()

const { open } = useProductOverlay()
const { openFromBucket } = useEnquiryForm()
const { addItem } = useBucket()

const columns = ref<ShowcaseColumn[]>([])
const activeKeys = ref<(string | null)[]>(Array.from({ length: MAX_COLUMNS }, () => null))
/** Settled image index per column — drives fade; null = scrolling / unsettled. */
const settledIndexes = ref<(number | null)[]>(
  Array.from({ length: MAX_COLUMNS }, () => null),
)
const spacerPads = ref<number[]>(Array.from({ length: MAX_COLUMNS }, () => 0))
const instantDim = ref<boolean[]>(Array.from({ length: MAX_COLUMNS }, () => false))
/** Slower post-settle fade after Surrender only. */
const surrenderDim = ref<boolean[]>(Array.from({ length: MAX_COLUMNS }, () => false))
/** Top edge of the flex zone under the selected cell (px from shell top). */
const removeZoneTops = ref<number[]>(Array.from({ length: MAX_COLUMNS }, () => 0))
const fileInputRef = ref<HTMLInputElement | null>(null)
const colourToolRef = ref<HTMLElement | null>(null)
const spectrumEl = ref<HTMLElement | null>(null)
const colourPickerOpen = ref(false)
const washColour = ref<string | null>(null)
const spectrumHue = ref(28)
const spectrumSat = ref(0.55)
const spectrumVal = ref(0.72)
/** Image keys that have finished loading and may fade in. */
const revealedImages = ref<Record<string, true>>({})
/** After the initial selected images load, unlock every other reel image. */
const restLoadsAllowed = ref(false)

const columnCount = computed(() => columns.value.length)
const canAddColumn = computed(() => columnCount.value < MAX_COLUMNS)

const columnEls: (HTMLElement | null)[] = Array.from({ length: MAX_COLUMNS }, () => null)
const trackEls: (HTMLElement | null)[] = Array.from({ length: MAX_COLUMNS }, () => null)
/** Identity maps — index-based refs race during keyed add/remove and wipe live nodes. */
const columnElById = new Map<string, HTMLElement>()
const trackElById = new Map<string, HTMLElement>()
const columnPrimed: boolean[] = Array.from({ length: MAX_COLUMNS }, () => false)
const snapTimers: number[] = Array.from({ length: MAX_COLUMNS }, () => 0)
const lenisBySlot: (Lenis | null)[] = Array.from({ length: MAX_COLUMNS }, () => null)
const snappingSlot: boolean[] = Array.from({ length: MAX_COLUMNS }, () => false)
const settleLockUntil: number[] = Array.from({ length: MAX_COLUMNS }, () => 0)
/** Last wheel/touch on this column — used to ignore cross-column Lenis noise. */
const lastUserIntentAt: number[] = Array.from({ length: MAX_COLUMNS }, () => 0)
const intentAbort: (AbortController | null)[] = Array.from(
  { length: MAX_COLUMNS },
  () => null,
)

let instanceSeq = 0
/** Advances on every bucket-sourced add; wrap around the pool. Never rewinds on remove. */
let nextBucketCursor = 0
let rafId = 0
let resizeObserver: ResizeObserver | null = null
let layoutSilenceDepth = 0
/** Blocks nested onColumnScroll while a scroll handler is already running. */
let scrollHandlerDepth = 0
/** Blocks ResizeObserver realign while add/remove restores selections. */
let structuralLayoutDepth = 0
/** Bumps on each structural restore so stale async passes abort. */
let layoutGeneration = 0
/** Wrapper element each Lenis instance is bound to (detect slot remaps). */
const lenisHostEls: (HTMLElement | null)[] = Array.from(
  { length: MAX_COLUMNS },
  () => null,
)
/** Base floor for “near scroll end” — ends often miss true centre by more than a few px. */
const END_SNAP_PX = 48
const SETTLE_LOCK_MS = 700
/** Scroll without recent intent on this column is treated as layout noise. */
const USER_INTENT_MS = 650
/** Only skip the snap animation when already on the target (not the wide end-pin tolerance). */
const SNAP_DONE_PX = 2

/** Wider end tolerance (~½ cell) so first/last still pin when slightly off-centre. */
const endSnapTolerance = (slotIndex: number) => {
  const el = columnEls[slotIndex]
  const cell = el?.querySelector<HTMLElement>('.showcase__cell')
  const cellHeight =
    cell?.offsetHeight || (el ? el.clientWidth / ASPECT : 120)
  return Math.max(END_SNAP_PX, cellHeight * 0.5)
}

const withLayoutSilence = (run: () => void) => {
  layoutSilenceDepth += 1
  try {
    run()
  } finally {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        layoutSilenceDepth = Math.max(0, layoutSilenceDepth - 1)
      })
    })
  }
}

/** Sync silence for Lenis resize/scrollTo so they can't re-enter onColumnScroll. */
const withScrollSuppressed = (run: () => void) => {
  layoutSilenceDepth += 1
  try {
    run()
  } finally {
    layoutSilenceDepth = Math.max(0, layoutSilenceDepth - 1)
  }
}

const bucketPool = computed(() => {
  const fromProps = (props.buckets || []).filter((bucket) => bucket.images?.length)
  if (fromProps.length) return fromProps
  return demoShowcaseBuckets(Math.max(SHOWCASE_MAX_COLUMNS, MAX_COLUMNS))
})

const cellKey = (slotIndex: number, id: string) => `${slotIndex}:${id}`

const imageRevealKey = (slotIndex: number, id: string) => `${slotIndex}:${id}`

const queryMiddleCell = (
  slotIndex: number,
  opts: { imageId?: string; logicalIndex?: number },
) => {
  const el = columnEls[slotIndex]
  if (!el) return null
  if (opts.imageId) {
    return el.querySelector<HTMLElement>(
      `.showcase__cell[data-loop-copy="${LOOP_MIDDLE}"][data-image-id="${CSS.escape(opts.imageId)}"]`,
    )
  }
  if (opts.logicalIndex != null) {
    return el.querySelector<HTMLElement>(
      `.showcase__cell[data-loop-copy="${LOOP_MIDDLE}"][data-logical-index="${opts.logicalIndex}"]`,
    )
  }
  return el.querySelector<HTMLElement>(
    `.showcase__cell[data-loop-copy="${LOOP_MIDDLE}"]`,
  )
}

const loopPeriodHeight = (slotIndex: number) => {
  const el = columnEls[slotIndex]
  const count = columns.value[slotIndex]?.images.length || 0
  if (!el || !count) return 0
  const cell = el.querySelector<HTMLElement>('.showcase__cell')
  const cellH = cell?.offsetHeight || el.clientWidth / ASPECT
  return cellH * count
}

/** Keep scroll inside the middle copy band so the track never hits a hard end. */
const wrapLoopScroll = (slotIndex: number) => {
  const period = loopPeriodHeight(slotIndex)
  if (period <= 1) return false

  const lenis = lenisBySlot[slotIndex] as LenisLoopInternals | null
  const el = columnEls[slotIndex]
  if (!el) return false

  // Prefer Lenis animated position so wrap stays in sync with in-flight flick.
  let scroll = lenis?.animatedScroll ?? currentScroll(slotIndex)
  let next = scroll
  while (next < period) next += period
  while (next >= period * 2) next -= period
  const delta = next - scroll
  if (Math.abs(delta) < 0.5) return false

  withScrollSuppressed(() => {
    if (lenis) {
      // Shift the live animation window — do NOT scrollTo(immediate) (that resets velocity).
      lenis.animatedScroll += delta
      lenis.targetScroll += delta
      if (lenis.animate) {
        lenis.animate.from += delta
        lenis.animate.to += delta
        lenis.animate.value += delta
      }
      lenis.setScroll(lenis.animatedScroll)
      lenis.preventNextNativeScrollEvent()
    } else {
      el.scrollTop = next
    }
  })
  return true
}

const isImageRevealed = (slotIndex: number, id: string) =>
  Boolean(revealedImages.value[imageRevealKey(slotIndex, id)])

const selectedIndexForSlot = (slotIndex: number) => {
  const settled = settledIndexes.value[slotIndex]
  if (settled != null) return settled

  const key = activeKeys.value[slotIndex]
  const fromKey = imageIdFromActiveKey(slotIndex, key)
  if (fromKey) {
    const idx =
      columns.value[slotIndex]?.images.findIndex((image) => image.id === fromKey) ?? -1
    if (idx >= 0) return idx
  }
  return 0
}

const isSelectedImage = (slotIndex: number, imageIndex: number) =>
  selectedIndexForSlot(slotIndex) === imageIndex

/** Selected / active images always load; the rest wait until heroes are ready. */
const shouldLoadImage = (slotIndex: number, imageIndex: number) => {
  if (restLoadsAllowed.value) return true
  if (isSelectedImage(slotIndex, imageIndex)) return true
  const image = columns.value[slotIndex]?.images[imageIndex]
  if (image && activeKeys.value[slotIndex] === cellKey(slotIndex, image.id)) {
    return true
  }
  return false
}

const markImageRevealed = (slotIndex: number, id: string) => {
  const key = imageRevealKey(slotIndex, id)
  if (revealedImages.value[key]) return
  revealedImages.value = { ...revealedImages.value, [key]: true }
  maybeUnlockRestLoads()
}

const maybeUnlockRestLoads = () => {
  if (restLoadsAllowed.value) return
  if (!columns.value.length) return

  const heroesReady = columns.value.every((column, slotIndex) => {
    const imageIndex = selectedIndexForSlot(slotIndex)
    const image = column.images[imageIndex]
    if (!image) return true
    return isImageRevealed(slotIndex, image.id)
  })

  if (heroesReady) restLoadsAllowed.value = true
}

const onShowcaseImgLoad = (slotIndex: number, id: string) => {
  markImageRevealed(slotIndex, id)
}

/** Cached images often skip @load — catch complete elements on bind. */
const bindShowcaseImg = (el: unknown, slotIndex: number, id: string) => {
  if (!(el instanceof HTMLImageElement)) return
  if (el.complete && el.naturalWidth > 0) {
    markImageRevealed(slotIndex, id)
  }
}

const resetImageRevealState = () => {
  revealedImages.value = {}
  restLoadsAllowed.value = false
}

const imageIdFromActiveKey = (slotIndex: number, key: string | null) => {
  if (!key) return null
  const parts = key.split(':')
  if (parts[0] !== String(slotIndex) || parts.length < 2) {
    const colon = key.indexOf(':')
    return colon >= 0 ? key.slice(colon + 1) : key
  }
  // Physical loop key: slot:copy:id — or canonical slot:id
  if (parts.length >= 3 && /^\d+$/.test(parts[1] || '')) {
    return parts.slice(2).join(':')
  }
  return parts.slice(1).join(':')
}

const captureActiveImageIds = () =>
  columns.value.map((column, index) => {
    // Visual centre is source of truth — settled can lag while leave-tol holds an old index.
    const centeredId = imageIdFromActiveKey(index, findCenteredKey(index))
    if (centeredId) return centeredId
    const settled = settledIndexes.value[index]
    if (settled != null && column.images[settled]) {
      return column.images[settled]!.id
    }
    const fromKey = imageIdFromActiveKey(index, activeKeys.value[index])
    if (fromKey) return fromKey
    return column.images[0]?.id ?? null
  })

const applyActiveImageIds = (activeImageIds: (string | null)[]) => {
  const nextActive = activeKeys.value.slice()
  const nextSettled = settledIndexes.value.slice()
  for (let i = 0; i < MAX_COLUMNS; i += 1) {
    if (i >= columns.value.length) {
      nextActive[i] = null
      nextSettled[i] = null
      continue
    }
    const fallback = columns.value[i]?.images[0]?.id ?? null
    const id = activeImageIds[i] || fallback
    nextActive[i] = id ? cellKey(i, id) : null
    const idx = id
      ? columns.value[i]?.images.findIndex((image) => image.id === id) ?? -1
      : -1
    nextSettled[i] = idx >= 0 ? idx : id ? 0 : null
    columnPrimed[i] = true
  }
  activeKeys.value = nextActive
  settledIndexes.value = nextSettled
}

const shuffleImages = (images: ShowcaseBucketImage[]) => {
  const next = images.map((image) => ({ ...image }))
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = next[i]!
    next[i] = next[j]!
    next[j] = tmp
  }
  return next
}

const createColumnFromBucket = (bucket: ShowcaseBucket): ShowcaseColumn | null => {
  if (!bucket.images?.length) return null
  instanceSeq += 1
  const productId =
    bucket.productId || bucket.id || `bucket-${bucket.column || instanceSeq}`
  return {
    instanceId: `col-${instanceSeq}-${bucket.id || productId}`,
    productId,
    bucketId: bucket.id,
    title: bucket.title || `Column ${columns.value.length + 1}`,
    slug: bucket.slug,
    // Randomise reel order each time a bucket is loaded into a column.
    images: shuffleImages(bucket.images),
  }
}

const createUploadColumn = (file: File, src: string): ShowcaseColumn => {
  instanceSeq += 1
  const name = file.name.replace(/\.[^.]+$/, '') || 'Upload'
  return {
    instanceId: `upload-${instanceSeq}`,
    productId: `upload-${instanceSeq}`,
    title: name,
    images: [
      {
        id: `upload-img-${instanceSeq}`,
        src,
        title: name,
      },
    ],
    objectUrl: src,
  }
}

/** Copy a column's product images into a fresh column instance (no shared revoke). */
const cloneColumn = (source: ShowcaseColumn): ShowcaseColumn => {
  instanceSeq += 1
  return {
    instanceId: `fork-${instanceSeq}-${source.productId}`,
    productId: source.productId,
    bucketId: source.bucketId,
    title: source.title,
    slug: source.slug,
    images: source.images.map((image) => ({ ...image })),
  }
}

const pickNextBucket = (): ShowcaseBucket | null => {
  const pool = bucketPool.value.filter(
    (bucket) => bucket.images?.length && bucket.id,
  )
  if (!pool.length) {
    // No CMS pool — mint a unique demo reel.
    instanceSeq += 1
    const demo = demoShowcaseBuckets(MAX_COLUMNS)
    const fallback = demo[(columns.value.length + instanceSeq) % demo.length]
    if (!fallback) return null
    return {
      ...fallback,
      id: `demo-extra-${instanceSeq}`,
      productId: `demo-extra-${instanceSeq}`,
      title: `Column ${columns.value.length + 1}`,
      column: columns.value.length + 1,
      images: fallback.images.map((image, i) => ({
        ...image,
        id: `${image.id}-x${instanceSeq}-${i}`,
      })),
    }
  }

  const bucket = pool[nextBucketCursor % pool.length]!
  nextBucketCursor += 1
  return bucket
}

const spacerStyle = (slotIndex: number) => ({
  height: `${spacerPads.value[slotIndex] ?? 0}px`,
})

/** Column controls sit in CSS between centre and Surrender — no per-cell tracking. */
const updateRemoveZone = (_slotIndex: number) => {}

const updateAllRemoveZones = () => {}

const measureSpacerPads = () => {
  // Infinite loop columns centre via the middle copy — spacers stay at 0.
  const prev = spacerPads.value
  const next = Array.from({ length: MAX_COLUMNS }, () => 0)
  const changed = next.some((pad, i) => pad !== (prev[i] ?? 0))
  if (changed) spacerPads.value = next
  return changed
}

/** Flush spacer DOM + Lenis limits after column-width changes. */
const refreshColumnMetrics = async () => {
  measureSpacerPads()
  await nextTick()
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
  measureSpacerPads()
  await nextTick()
  withScrollSuppressed(() => {
    for (let i = 0; i < columns.value.length; i += 1) {
      lenisBySlot[i]?.resize()
    }
  })
}

/** Wait until flex column widths stop changing after add/remove. */
const waitForStableColumnLayout = async () => {
  let last = ''
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await nextTick()
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
    const sig = columns.value
      .map((_, i) => String(columnEls[i]?.clientWidth ?? 0))
      .join('x')
    const ready =
      sig === last &&
      sig.length > 0 &&
      !sig.split('x').every((width) => width === '0')
    if (ready) return
    last = sig
  }
}

const realignAllSlotsToActive = (imageIds?: (string | null)[]) => {
  for (let i = 0; i < columns.value.length; i += 1) {
    if (imageIds) {
      restoreSlotToImageId(i, imageIds[i] ?? null)
    } else {
      realignSlotToActive(i)
    }
    updateRemoveZone(i)
  }
}

const setColumnRef = (instanceId: string, el: unknown) => {
  if (el instanceof HTMLElement) columnElById.set(instanceId, el)
  else columnElById.delete(instanceId)
  syncSlotElsFromIds()
}

const setTrackRef = (instanceId: string, el: unknown) => {
  if (el instanceof HTMLElement) trackElById.set(instanceId, el)
  else trackElById.delete(instanceId)
  syncSlotElsFromIds()
}

/** Rebuild positional el arrays from identity maps after every keyed list change. */
const syncSlotElsFromIds = () => {
  for (let i = 0; i < MAX_COLUMNS; i += 1) {
    const id = columns.value[i]?.instanceId
    columnEls[i] = id ? columnElById.get(id) ?? null : null
    trackEls[i] = id ? trackElById.get(id) ?? null : null
  }
}

const clearSnapTimer = (slotIndex: number) => {
  window.clearTimeout(snapTimers[slotIndex])
  snapTimers[slotIndex] = 0
}

const clearSlotMotion = (slotIndex: number) => {
  clearSnapTimer(slotIndex)
  intentAbort[slotIndex]?.abort()
  intentAbort[slotIndex] = null
  lenisBySlot[slotIndex]?.destroy()
  lenisBySlot[slotIndex] = null
  // Leave columnEls/trackEls to Vue ref callbacks — nulling them races remount.
  columnPrimed[slotIndex] = false
  snappingSlot[slotIndex] = false

  const nextActive = activeKeys.value.slice()
  nextActive[slotIndex] = null
  activeKeys.value = nextActive

  const nextSettled = settledIndexes.value.slice()
  nextSettled[slotIndex] = null
  settledIndexes.value = nextSettled

  const nextPads = spacerPads.value.slice()
  nextPads[slotIndex] = 0
  spacerPads.value = nextPads

  const nextInstant = instantDim.value.slice()
  nextInstant[slotIndex] = false
  instantDim.value = nextInstant

  const nextSurrender = surrenderDim.value.slice()
  nextSurrender[slotIndex] = false
  surrenderDim.value = nextSurrender

  const nextZones = removeZoneTops.value.slice()
  nextZones[slotIndex] = 0
  removeZoneTops.value = nextZones

  settleLockUntil[slotIndex] = 0
  lastUserIntentAt[slotIndex] = 0
}

const findCenteredCell = (slotIndex: number): HTMLElement | null => {
  const el = columnEls[slotIndex]
  if (!el) return null

  const cells = Array.from(el.querySelectorAll<HTMLElement>('.showcase__cell'))
  if (!cells.length) return null

  const { min, max } = scrollLimits(slotIndex)
  const current = currentScroll(slotIndex)

  let best: HTMLElement | null = null
  let bestDist = Infinity

  for (const cell of cells) {
    const raw = rawCenterScrollForCell(slotIndex, cell)
    const clamped = Math.min(max, Math.max(min, raw))
    const dist = Math.abs(clamped - current)
    if (dist < bestDist) {
      bestDist = dist
      best = cell
    }
  }

  return best
}

const findCenteredKey = (slotIndex: number) => {
  const cell = findCenteredCell(slotIndex)
  if (!cell) return null
  const imageId = cell.dataset.imageId
  return imageId ? cellKey(slotIndex, imageId) : null
}

const scrollLimits = (slotIndex: number) => {
  const el = columnEls[slotIndex]
  if (!el) return { min: 0, max: 0 }
  // Live DOM only — stale lenis.limit after add/remove breaks snap targets.
  return { min: 0, max: Math.max(0, el.scrollHeight - el.clientHeight) }
}

const currentScroll = (slotIndex: number) => {
  const el = columnEls[slotIndex]
  return lenisBySlot[slotIndex]?.scroll ?? el?.scrollTop ?? 0
}

const rawCenterScrollForCell = (slotIndex: number, cell: HTMLElement) => {
  const el = columnEls[slotIndex]
  if (!el) return 0
  const colRect = el.getBoundingClientRect()
  const midY = colRect.top + colRect.height / 2
  const cellRect = cell.getBoundingClientRect()
  const cellCenter = cellRect.top + cellRect.height / 2
  // Use Lenis scroll — native scrollTop can disagree while virtualised.
  return currentScroll(slotIndex) + (cellCenter - midY)
}

/** Pick the snap target from the nearest cell (infinite loop — no hard ends). */
const resolveSnapTarget = (slotIndex: number) => {
  const el = columnEls[slotIndex]
  if (!el) return { scroll: 0, key: null as string | null }

  const cells = Array.from(el.querySelectorAll<HTMLElement>('.showcase__cell'))
  if (!cells.length) return { scroll: el.scrollTop, key: null }

  const { min, max } = scrollLimits(slotIndex)
  const current = currentScroll(slotIndex)

  let bestScroll = min
  let bestCell: HTMLElement | null = null
  let bestDist = Infinity

  for (const cell of cells) {
    const raw = rawCenterScrollForCell(slotIndex, cell)
    const clamped = Math.min(max, Math.max(min, raw))
    const dist = Math.abs(clamped - current)
    if (dist < bestDist) {
      bestDist = dist
      bestScroll = clamped
      bestCell = cell
    }
  }

  const imageId = bestCell?.dataset.imageId
  return {
    scroll: bestScroll,
    key: imageId ? cellKey(slotIndex, imageId) : null,
  }
}



const selectedEnquiryItems = () => {
  // One selected (snapped) image from each visible column
  return columns.value
    .map((slot, slotIndex) => {
      let imageIndex = settledIndexes.value[slotIndex]
      if (imageIndex == null || imageIndex < 0) {
        const activeKey = activeKeys.value[slotIndex]
        imageIndex = slot.images.findIndex(
          (image) => cellKey(slotIndex, image.id) === activeKey,
        )
      }
      if (imageIndex == null || imageIndex < 0) imageIndex = 0
      const image = slot.images[imageIndex]
      if (!image) return null
      const productId = image.productId || slot.productId
      const slug = image.slug || slot.slug
      return {
        id: bucketItemId(productId, imageIndex),
        title: image.title || slot.title,
        imageUrl: image.src,
        itemType: 'product' as const,
        link: slug ? `/materials-and-forms/${slug}` : null,
        imageUrls: slot.images.map((entry) => entry.src),
        imageIndex,
      }
    })
    .filter(Boolean) as BucketItem[]
}

const sendEnquiry = () => {
  const items = selectedEnquiryItems()
  if (!items.length) return
  openFromBucket(items, { colour: washColour.value })
}

const saveSelection = () => {
  const items = selectedEnquiryItems()
  if (!items.length) return
  items.forEach((item) => addItem(item))
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const hsvToHex = (h: number, s: number, v: number) => {
  const hue = ((h % 360) + 360) % 360
  const c = v * s
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0
  if (hue < 60) {
    r = c
    g = x
  } else if (hue < 120) {
    r = x
    g = c
  } else if (hue < 180) {
    g = c
    b = x
  } else if (hue < 240) {
    g = x
    b = c
  } else if (hue < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }
  const toByte = (channel: number) =>
    Math.round((channel + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`
}

/** Accepts #rgb / #rrggbb with or without leading #. */
const normalizeHex = (raw: string) => {
  const trimmed = raw.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(trimmed)) {
    const [r, g, b] = trimmed.split('')
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  if (/^[0-9a-f]{6}$/i.test(trimmed)) return `#${trimmed.toLowerCase()}`
  return null
}

const hexToHsv = (hex: string) => {
  const normalized = normalizeHex(hex)
  if (!normalized) return null
  const value = normalized.slice(1)
  const r = parseInt(value.slice(0, 2), 16) / 255
  const g = parseInt(value.slice(2, 4), 16) / 255
  const b = parseInt(value.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let h = 0
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6
    else if (max === g) h = (b - r) / delta + 2
    else h = (r - g) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : delta / max
  return { h, s, v: max }
}

const spectrumHex = computed(() =>
  hsvToHex(spectrumHue.value, spectrumSat.value, spectrumVal.value),
)

const hexDraft = ref(spectrumHex.value)
const hexFocused = ref(false)

watch(spectrumHex, (hex) => {
  if (!hexFocused.value) hexDraft.value = hex
  if (!colourPickerOpen.value) return
  washColour.value = hex
})

const applyHexToSpectrum = (hex: string) => {
  const hsv = hexToHsv(hex)
  if (!hsv) return false
  spectrumHue.value = Math.round(hsv.h)
  spectrumSat.value = hsv.s
  spectrumVal.value = hsv.v
  return true
}

const onHexFocus = (event: FocusEvent) => {
  hexFocused.value = true
  const input = event.target as HTMLInputElement | null
  nextTick(() => input?.select())
}

const onHexInput = () => {
  const parsed = normalizeHex(hexDraft.value)
  if (!parsed) return
  applyHexToSpectrum(parsed)
}

const commitHexDraft = () => {
  hexFocused.value = false
  const parsed = normalizeHex(hexDraft.value)
  if (parsed && applyHexToSpectrum(parsed)) {
    hexDraft.value = parsed
    return
  }
  hexDraft.value = spectrumHex.value
}

const syncSpectrumFromWash = () => {
  if (!washColour.value) return
  if (!applyHexToSpectrum(washColour.value)) return
  hexDraft.value = spectrumHex.value
}

const toggleColourPicker = () => {
  const next = !colourPickerOpen.value
  if (next) {
    if (washColour.value) syncSpectrumFromWash()
    else washColour.value = spectrumHex.value
    hexDraft.value = spectrumHex.value
    hexFocused.value = false
  }
  colourPickerOpen.value = next
}

const clearWashColour = () => {
  washColour.value = null
  colourPickerOpen.value = false
}

const readSpectrumFromEvent = (event: PointerEvent) => {
  const el = spectrumEl.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  spectrumSat.value = clamp01((event.clientX - rect.left) / rect.width)
  spectrumVal.value = clamp01(1 - (event.clientY - rect.top) / rect.height)
}

const onSpectrumPointerMove = (event: PointerEvent) => {
  readSpectrumFromEvent(event)
}

const onSpectrumPointerUp = () => {
  window.removeEventListener('pointermove', onSpectrumPointerMove)
  window.removeEventListener('pointerup', onSpectrumPointerUp)
}

const onSpectrumPointerDown = (event: PointerEvent) => {
  event.preventDefault()
  spectrumEl.value?.setPointerCapture?.(event.pointerId)
  readSpectrumFromEvent(event)
  window.addEventListener('pointermove', onSpectrumPointerMove)
  window.addEventListener('pointerup', onSpectrumPointerUp)
}

const onColourDocPointerDown = (event: PointerEvent) => {
  if (!colourPickerOpen.value) return
  const target = event.target as Node | null
  if (target && colourToolRef.value?.contains(target)) return
  colourPickerOpen.value = false
}

const scrollColumnToImageIndex = (slotIndex: number, imageIndex: number) => {
  const column = columns.value[slotIndex]
  const image = column?.images[imageIndex]
  if (!image) return

  const key = cellKey(slotIndex, image.id)
  const lenis = lenisBySlot[slotIndex]
  let target: { scroll: number; key: string | null } | null = null
  withScrollSuppressed(() => {
    lenis?.resize()
    target = scrollTargetForKey(slotIndex, key)
  })
  if (!target) return

  clearSnapTimer(slotIndex)
  lastUserIntentAt[slotIndex] = 0
  settleLockUntil[slotIndex] = 0
  unsettleColumn(slotIndex)

  // Point active at the target so it can start loading before rest unlock.
  const nextActive = activeKeys.value.slice()
  nextActive[slotIndex] = key
  activeKeys.value = nextActive

  const nextSurrender = surrenderDim.value.slice()
  nextSurrender[slotIndex] = true
  surrenderDim.value = nextSurrender

  snappingSlot[slotIndex] = true

  const el = columnEls[slotIndex]
  if (lenis) {
    lenis.scrollTo(target.scroll, {
      duration: SURRENDER_DURATION,
      easing: surrenderEasing,
      onComplete: () => {
        // Re-measure — first surrender after column changes often had a stale limit.
        let fresh = target!
        withScrollSuppressed(() => {
          lenis.resize()
          fresh = scrollTargetForKey(slotIndex, key) ?? target!
          lenis.scrollTo(fresh.scroll, { immediate: true })
        })
        markSettled(slotIndex, fresh.key)
        snappingSlot[slotIndex] = false
      },
    })
  } else if (el) {
    el.scrollTo({ top: target.scroll, behavior: 'smooth' })
    window.setTimeout(() => {
      const fresh = scrollTargetForKey(slotIndex, key) ?? target
      el.scrollTop = fresh.scroll
      markSettled(slotIndex, fresh.key)
      snappingSlot[slotIndex] = false
    }, SURRENDER_DURATION * 1000)
  } else {
    snappingSlot[slotIndex] = false
  }
}

const surrenderColumns = async () => {
  // Column add/remove changes widths; wait for spacers + Lenis limits before targeting.
  await refreshColumnMetrics()

  columns.value.forEach((column, slotIndex) => {
    if (column.locked || !column.images.length) return
    const imageIndex = Math.floor(Math.random() * column.images.length)
    scrollColumnToImageIndex(slotIndex, imageIndex)
  })
}

const toggleColumnLock = (slotIndex: number) => {
  const column = columns.value[slotIndex]
  if (!column) return
  const nextLocked = !column.locked
  const next = columns.value.slice()
  next[slotIndex] = { ...column, locked: nextLocked }
  columns.value = next
  applyColumnScrollLock(slotIndex, nextLocked)
}

/** Freeze Lenis + native wheel/touch while a column is locked. */
const applyColumnScrollLock = (slotIndex: number, locked: boolean) => {
  const lenis = lenisBySlot[slotIndex]
  if (!lenis) return
  if (locked) lenis.stop()
  else lenis.start()
}

const imageIndexForKey = (slotIndex: number, key: string | null) => {
  if (!key) return null
  const images = columns.value[slotIndex]?.images
  if (!images?.length) return null
  const index = images.findIndex((image) => cellKey(slotIndex, image.id) === key)
  return index >= 0 ? index : null
}

const markSettled = (slotIndex: number, key?: string | null) => {
  // Lock immediately so Lenis scrollTo pins can't unsettle before state commits.
  settleLockUntil[slotIndex] = performance.now() + SETTLE_LOCK_MS
  lastUserIntentAt[slotIndex] = 0

  const images = columns.value[slotIndex]?.images || []
  const explicitKey = key ?? null
  let resolvedKey = explicitKey ?? findCenteredKey(slotIndex)
  let resolvedIndex = imageIndexForKey(slotIndex, resolvedKey)

  if (resolvedIndex == null && resolvedKey) {
    const imageId = imageIdFromActiveKey(slotIndex, resolvedKey)
    if (imageId) {
      const idx = images.findIndex((image) => image.id === imageId)
      if (idx >= 0) {
        resolvedIndex = idx
        resolvedKey = cellKey(slotIndex, images[idx]!.id)
      }
    }
  }

  if (resolvedIndex == null && images.length) {
    resolvedIndex = 0
    resolvedKey = cellKey(slotIndex, images[0]!.id)
  } else if (resolvedIndex != null && images[resolvedIndex]) {
    resolvedKey = cellKey(slotIndex, images[resolvedIndex]!.id)
  }

  const nextActive = activeKeys.value.slice()
  nextActive[slotIndex] = resolvedKey
  activeKeys.value = nextActive

  const nextSettled = settledIndexes.value.slice()
  nextSettled[slotIndex] = resolvedIndex
  settledIndexes.value = nextSettled

  // Keep the snapped cell in the middle copy band.
  if (resolvedIndex != null) {
    const target = scrollTargetForImageIndex(slotIndex, resolvedIndex)
    if (target) {
      const current = currentScroll(slotIndex)
      if (Math.abs(current - target.scroll) > SNAP_DONE_PX) {
        const lenis = lenisBySlot[slotIndex]
        const el = columnEls[slotIndex]
        withScrollSuppressed(() => {
          if (lenis) lenis.scrollTo(target.scroll, { immediate: true })
          else if (el) el.scrollTop = target.scroll
        })
      }
    }
  }

  nextTick(() => updateRemoveZone(slotIndex))
}

const unsettleColumn = (slotIndex: number) => {
  clearSnapTimer(slotIndex)
  if (surrenderDim.value[slotIndex]) {
    const nextSurrender = surrenderDim.value.slice()
    nextSurrender[slotIndex] = false
    surrenderDim.value = nextSurrender
  }
  if (settledIndexes.value[slotIndex] == null) return
  const nextSettled = settledIndexes.value.slice()
  nextSettled[slotIndex] = null
  settledIndexes.value = nextSettled
}

const snapToCenter = (slotIndex: number) => {
  const lenis = lenisBySlot[slotIndex]
  const el = columnEls[slotIndex]
  if (!el) return

  const { scroll: target, key } = resolveSnapTarget(slotIndex)
  const current = currentScroll(slotIndex)
  // Use a tight threshold — endSnapTolerance is for pinning only, not skipping motion.
  if (Math.abs(target - current) <= SNAP_DONE_PX) {
    if (lenis && Math.abs(target - current) > 0) {
      withScrollSuppressed(() => {
        lenis.scrollTo(target, { immediate: true })
      })
    }
    markSettled(slotIndex, key)
    return
  }

  snappingSlot[slotIndex] = true
  if (lenis) {
    lenis.scrollTo(target, {
      duration: SNAP_DURATION,
      easing: power3InOut,
      onComplete: () => {
        // Settle before releasing the snap lock so residual scroll can't undim ends.
        withScrollSuppressed(() => {
          lenis.scrollTo(target, { immediate: true })
        })
        markSettled(slotIndex, key)
        snappingSlot[slotIndex] = false
      },
    })
  } else {
    el.scrollTo({ top: target, behavior: 'smooth' })
    window.setTimeout(() => {
      el.scrollTop = target
      markSettled(slotIndex, key)
      snappingSlot[slotIndex] = false
    }, SNAP_DURATION * 1000)
  }
}

const scheduleSnap = (slotIndex: number) => {
  clearSnapTimer(slotIndex)
  snapTimers[slotIndex] = window.setTimeout(() => {
    snapToCenter(slotIndex)
  }, SNAP_IDLE_MS)
}

/**
 * Pure layout scroll target — never calls Lenis.resize.
 * Safe to use from onColumnScroll (resize ↔ scroll recursion otherwise).
 */
const scrollTargetForImageIndex = (slotIndex: number, imageIndex: number) => {
  const column = columns.value[slotIndex]
  const image = column?.images[imageIndex]
  const el = columnEls[slotIndex]
  if (!column || !image || !el) return null

  const key = cellKey(slotIndex, image.id)
  const { min, max } = scrollLimits(slotIndex)

  const cell =
    queryMiddleCell(slotIndex, { logicalIndex: imageIndex }) ||
    queryMiddleCell(slotIndex, { imageId: image.id })

  if (cell) {
    const raw = cell.offsetTop + cell.offsetHeight / 2 - el.clientHeight / 2
    return {
      scroll: Math.min(max, Math.max(min, raw)),
      key,
    }
  }

  const cellH = el.clientWidth / ASPECT
  const period = cellH * column.images.length
  const cellTop = period * LOOP_MIDDLE + imageIndex * cellH
  const raw = cellTop + cellH / 2 - el.clientHeight / 2
  return {
    scroll: Math.min(max, Math.max(min, raw)),
    key,
  }
}

/**
 * Force a column onto a specific image after add/remove.
 * Sets selection state directly — never re-infers from scroll position.
 */
const restoreSlotToImageId = (slotIndex: number, imageId: string | null) => {
  const column = columns.value[slotIndex]
  const el = columnEls[slotIndex]
  if (!column?.images.length || !el) return

  let imageIndex = imageId
    ? column.images.findIndex((image) => image.id === imageId)
    : 0
  if (imageIndex < 0) imageIndex = 0
  const image = column.images[imageIndex]
  if (!image) return

  const key = cellKey(slotIndex, image.id)

  withScrollSuppressed(() => {
    const lenis = lenisBySlot[slotIndex]
    lenis?.resize()
    const target = scrollTargetForImageIndex(slotIndex, imageIndex)
    const scroll = target?.scroll ?? 0
    if (lenis) lenis.scrollTo(scroll, { immediate: true })
    else el.scrollTop = scroll
  })

  const nextActive = activeKeys.value.slice()
  nextActive[slotIndex] = key
  activeKeys.value = nextActive

  const nextSettled = settledIndexes.value.slice()
  nextSettled[slotIndex] = imageIndex
  settledIndexes.value = nextSettled

  settleLockUntil[slotIndex] = performance.now() + SETTLE_LOCK_MS
  lastUserIntentAt[slotIndex] = 0
  columnPrimed[slotIndex] = true
  nextTick(() => updateRemoveZone(slotIndex))
}

/** Scroll target that keeps a known active cell centred after layout changes. */
const scrollTargetForKey = (slotIndex: number, key: string) => {
  const imageIndex = imageIndexForKey(slotIndex, key)
  if (imageIndex != null) {
    return scrollTargetForImageIndex(slotIndex, imageIndex)
  }

  // Stale slot-prefixed key — recover id and retry by index.
  const imageId = imageIdFromActiveKey(slotIndex, key)
  if (imageId) {
    const idx =
      columns.value[slotIndex]?.images.findIndex((image) => image.id === imageId) ??
      -1
    if (idx >= 0) return scrollTargetForImageIndex(slotIndex, idx)
  }

  return null
}

/** Instantly re-centre the current selection after spacer / viewport resize. */
const realignSlotToActive = (slotIndex: number) => {
  if (!columns.value[slotIndex]) return

  const lenis = lenisBySlot[slotIndex]
  const el = columnEls[slotIndex]
  if (!el) return

  clearSnapTimer(slotIndex)
  snappingSlot[slotIndex] = false

  let key = activeKeys.value[slotIndex]
  let imageIndex = imageIndexForKey(slotIndex, key)
  if (imageIndex == null) {
    const settled = settledIndexes.value[slotIndex]
    if (settled != null) imageIndex = settled
    else {
      const imageId = imageIdFromActiveKey(slotIndex, key)
      if (imageId) {
        imageIndex =
          columns.value[slotIndex]?.images.findIndex((image) => image.id === imageId) ??
          null
        if (imageIndex != null && imageIndex < 0) imageIndex = null
        if (imageIndex != null) key = cellKey(slotIndex, imageId)
      }
    }
  }

  let target: { scroll: number; key: string | null } | null = null
  let resolvedKey: string | null = key

  withScrollSuppressed(() => {
    lenis?.resize()

    target =
      imageIndex != null ? scrollTargetForImageIndex(slotIndex, imageIndex) : null

    if (!target && key) target = scrollTargetForKey(slotIndex, key)

    if (!target) target = resolveSnapTarget(slotIndex)

    if (!target?.key && !key) return

    const scroll = target?.scroll ?? 0
    resolvedKey = target?.key ?? key

    if (lenis) lenis.scrollTo(scroll, { immediate: true })
    else el.scrollTop = scroll
  })

  if (!resolvedKey && !target?.key) return

  // Pass explicit key so end-tolerance can't replace a middle selection with first.
  markSettled(slotIndex, resolvedKey ?? target?.key ?? null)
  nextTick(() => updateRemoveZone(slotIndex))
}

let layoutRealignTimer = 0

const realignAllColumns = () => {
  const generation = layoutGeneration
  void (async () => {
    await waitForStableColumnLayout()
    if (generation !== layoutGeneration || structuralLayoutDepth > 0) return
    await refreshColumnMetrics()
    if (generation !== layoutGeneration || structuralLayoutDepth > 0) return
    withLayoutSilence(() => {
      realignAllSlotsToActive()
    })
  })()
}

const scheduleLayoutRealign = () => {
  if (!import.meta.client) return
  if (structuralLayoutDepth > 0) return
  window.clearTimeout(layoutRealignTimer)
  layoutRealignTimer = window.setTimeout(() => {
    layoutRealignTimer = 0
    if (structuralLayoutDepth > 0) return
    realignAllColumns()
  }, 60)
}

const onColumnScroll = (slotIndex: number) => {
  // Hard stop: never re-enter (Lenis.resize emits scroll synchronously).
  if (layoutSilenceDepth > 0 || snappingSlot[slotIndex] || scrollHandlerDepth > 0) {
    return
  }
  if (columns.value[slotIndex]?.locked) return
  if (performance.now() < settleLockUntil[slotIndex]) return

  scrollHandlerDepth += 1
  try {
    // Jump between triple-copy bands before snap math runs.
    wrapLoopScroll(slotIndex)

    const settledIndex = settledIndexes.value[slotIndex]
    const intentAge = performance.now() - lastUserIntentAt[slotIndex]
    const hasRecentIntent = intentAge < USER_INTENT_MS
    const lenis = lenisBySlot[slotIndex]
    const current = currentScroll(slotIndex)
    const images = columns.value[slotIndex]?.images || []

    // Stay settled until scroll actually leaves the snapped cell.
    if (settledIndex != null && images[settledIndex]) {
      const ideal = scrollTargetForImageIndex(slotIndex, settledIndex)
      const leaveTol = Math.max(
        SNAP_DONE_PX * 4,
        endSnapTolerance(slotIndex) * 0.25,
      )

      if (ideal && Math.abs(ideal.scroll - current) <= leaveTol) {
        return
      }

      // Layout drift without user input — keep fade; schedule a quiet re-centre.
      if (!hasRecentIntent) {
        scheduleLayoutRealign()
        return
      }
    }

    unsettleColumn(slotIndex)

    const velocity = lenis?.velocity ?? 0
    if (Math.abs(velocity) > VELOCITY_SNAP_THRESHOLD) {
      clearSnapTimer(slotIndex)
      return
    }

    scheduleSnap(slotIndex)
  } finally {
    scrollHandlerDepth = Math.max(0, scrollHandlerDepth - 1)
  }
}

const onUserIntent = (slotIndex: number) => {
  if (layoutSilenceDepth > 0) return
  if (columns.value[slotIndex]?.locked) return
  // Never interrupt an in-flight snap — that was undoing first/last settle.
  if (snappingSlot[slotIndex]) return
  // Trackpad inertia keeps firing wheel after snap; don't clear the settle lock.
  if (performance.now() < settleLockUntil[slotIndex]) return

  lastUserIntentAt[slotIndex] = performance.now()
  // Don't unsettle here — wait until scroll leaves the snapped target so
  // first/last can keep their sibling fade through residual wheel events.
}

const destroyLenisSlot = (slotIndex: number) => {
  intentAbort[slotIndex]?.abort()
  intentAbort[slotIndex] = null
  lenisBySlot[slotIndex]?.destroy()
  lenisBySlot[slotIndex] = null
  lenisHostEls[slotIndex] = null
}

const destroyLenis = () => {
  for (let i = 0; i < MAX_COLUMNS; i += 1) {
    destroyLenisSlot(i)
  }
}

const stopRaf = () => {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
}

const startRaf = () => {
  stopRaf()
  const tick = (time: number) => {
    for (let i = 0; i < MAX_COLUMNS; i += 1) {
      lenisBySlot[i]?.raf(time)
    }
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
}

const initLenisForSlot = (slotIndex: number) => {
  if (!import.meta.client || !columns.value[slotIndex]) return
  syncSlotElsFromIds()
  const wrapper = columnEls[slotIndex]
  const content = trackEls[slotIndex]
  if (!wrapper || !content) return

  // If this wrapper already has Lenis under another slot, drop that first.
  for (let i = 0; i < MAX_COLUMNS; i += 1) {
    if (i !== slotIndex && lenisHostEls[i] === wrapper) {
      destroyLenisSlot(i)
    }
  }

  intentAbort[slotIndex]?.abort()
  const abort = new AbortController()
  intentAbort[slotIndex] = abort

  lenisBySlot[slotIndex]?.destroy()
  // Native scrollTop survives Lenis destroy and poisons remount targeting.
  wrapper.scrollTop = 0

  const lenis = createColumnLenis(wrapper, content)
  withScrollSuppressed(() => {
    lenis.resize()
    const target = scrollTargetForImageIndex(slotIndex, 0)
    const scroll = target?.scroll ?? loopPeriodHeight(slotIndex)
    lenis.scrollTo(scroll, { immediate: true })
  })
  lenis.on('scroll', () => onColumnScroll(slotIndex))
  wrapper.addEventListener(
    'wheel',
    (event) => {
      if (columns.value[slotIndex]?.locked) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      onUserIntent(slotIndex)
    },
    {
      // Need preventDefault when locked — can't be passive.
      passive: false,
      signal: abort.signal,
    },
  )
  wrapper.addEventListener(
    'touchmove',
    (event) => {
      if (!columns.value[slotIndex]?.locked) return
      event.preventDefault()
      event.stopPropagation()
    },
    {
      passive: false,
      signal: abort.signal,
    },
  )
  wrapper.addEventListener('touchstart', () => onUserIntent(slotIndex), {
    passive: true,
    signal: abort.signal,
  })
  lenisBySlot[slotIndex] = lenis
  lenisHostEls[slotIndex] = wrapper
  if (columns.value[slotIndex]?.locked) lenis.stop()
}

/**
 * Remount Lenis for every live column. Partial reuse races when keyed columns
 * shift slots — a destroy on the old index can tear down the new binding.
 */
const remountLenisForColumns = () => {
  if (!import.meta.client) return
  syncSlotElsFromIds()
  destroyLenis()

  for (let i = 0; i < columns.value.length; i += 1) {
    initLenisForSlot(i)
  }

  startRaf()
}

const syncLenisToColumns = () => {
  remountLenisForColumns()
}

const initLenis = () => {
  remountLenisForColumns()
}

const clearInstantDim = (slotIndex: number) => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (instantDim.value[slotIndex]) {
        const next = instantDim.value.slice()
        next[slotIndex] = false
        instantDim.value = next
      }
    })
  })
}

const settleColumnInstant = (slotIndex: number) => {
  const first = columns.value[slotIndex]?.images[0]
  const nextInstant = instantDim.value.slice()
  nextInstant[slotIndex] = true
  instantDim.value = nextInstant

  const nextActive = activeKeys.value.slice()
  nextActive[slotIndex] = first ? cellKey(slotIndex, first.id) : null
  activeKeys.value = nextActive

  const nextSettled = settledIndexes.value.slice()
  nextSettled[slotIndex] = first ? 0 : null
  settledIndexes.value = nextSettled

  lastUserIntentAt[slotIndex] = 0

  withScrollSuppressed(() => {
    const lenis = lenisBySlot[slotIndex]
    const el = columnEls[slotIndex]
    lenis?.resize()
    const target = scrollTargetForImageIndex(slotIndex, 0)
    const scroll = target?.scroll ?? loopPeriodHeight(slotIndex)
    if (lenis) lenis.scrollTo(scroll, { immediate: true })
    else if (el) el.scrollTop = scroll
  })

  nextTick(() => {
    updateRemoveZone(slotIndex)
    clearInstantDim(slotIndex)
  })
}

const primeColumn = (slotIndex: number, force = false, settleImmediately = false) => {
  if (!columns.value[slotIndex]) return
  const el = columnEls[slotIndex]
  const lenis = lenisBySlot[slotIndex]
  if (!el) return

  if (force || !columnPrimed[slotIndex]) {
    withScrollSuppressed(() => {
      lenis?.resize()
      const target = scrollTargetForImageIndex(slotIndex, 0)
      const scroll = target?.scroll ?? loopPeriodHeight(slotIndex)
      if (lenis) lenis.scrollTo(scroll, { immediate: true })
      else el.scrollTop = scroll
    })
    columnPrimed[slotIndex] = true

    if (settleImmediately) settleColumnInstant(slotIndex)
    else scheduleSnap(slotIndex)
  }
}

const primeFilledSlots = (force = false, settleImmediately = false) => {
  for (let i = 0; i < MAX_COLUMNS; i += 1) {
    if (columns.value[i]) primeColumn(i, force, settleImmediately)
  }
}

const onSelect = (column: ShowcaseColumn, imageIndex: number) => {
  const image = column.images[imageIndex]
  const slug = image?.slug || column.slug
  if (!slug) return
  open(slug, { imageIndex })
}

const observeColumns = () => {
  resizeObserver?.disconnect()
  if (!import.meta.client || typeof ResizeObserver === 'undefined') return

  syncSlotElsFromIds()
  resizeObserver = new ResizeObserver(() => {
    scheduleLayoutRealign()
  })

  columnEls.forEach((el) => {
    if (el) resizeObserver?.observe(el)
  })
}

const remountMotion = (opts: { settleImmediately?: boolean } = {}) => {
  const settleImmediately = opts.settleImmediately === true
  nextTick(() => {
    // Refs bind asynchronously after keyed list moves — wait one frame.
    requestAnimationFrame(() => {
      initLenis()
      observeColumns()
      requestAnimationFrame(() => {
        withLayoutSilence(() => {
          measureSpacerPads()
          for (let i = 0; i < columns.value.length; i += 1) {
            lenisBySlot[i]?.resize()
          }
          primeFilledSlots(true, settleImmediately)
        })
      })
    })
  })
}

const revokeColumnUrl = (column: ShowcaseColumn | undefined) => {
  if (column?.objectUrl) URL.revokeObjectURL(column.objectUrl)
}

const clearAllMotion = () => {
  for (let i = 0; i < MAX_COLUMNS; i += 1) clearSlotMotion(i)
}

const restoreColumnsAfterLayout = (
  activeImageIds: (string | null)[],
  opts: { settleNewInstant?: boolean } = {},
) => {
  const generation = ++layoutGeneration
  structuralLayoutDepth += 1
  window.clearTimeout(layoutRealignTimer)
  layoutRealignTimer = 0

  // Remap keys immediately so ResizeObserver can't realign with stale slot prefixes.
  applyActiveImageIds(activeImageIds)

  let released = false
  const release = () => {
    if (released) return
    released = true
    structuralLayoutDepth = Math.max(0, structuralLayoutDepth - 1)
  }

  const restorePass = (settleNew = false) => {
    withLayoutSilence(() => {
      applyActiveImageIds(activeImageIds)
      if (settleNew && opts.settleNewInstant) {
        const i = columns.value.length - 1
        if (i >= 0) {
          settleColumnInstant(i)
          activeImageIds[i] =
            columns.value[i]?.images[0]?.id ?? activeImageIds[i] ?? null
        }
      }
      realignAllSlotsToActive(activeImageIds)
    })
  }

  const run = (attempt = 0) => {
    if (generation !== layoutGeneration) {
      release()
      return
    }

    nextTick(() => {
      requestAnimationFrame(() => {
        if (generation !== layoutGeneration) {
          release()
          return
        }

        // Always remount Lenis after structural changes — partial reuse races
        // when keyed wrappers shift slots and destroy tears down the new bind.
        remountLenisForColumns()
        observeColumns()

        const ready = columns.value.every((_, i) =>
          Boolean(columnEls[i] && trackEls[i] && lenisBySlot[i]),
        )

        if (!ready && attempt < 12) {
          run(attempt + 1)
          return
        }

        if (!ready) {
          // Last chance — refs may land one frame later.
          remountLenisForColumns()
          observeColumns()
        }

        void (async () => {
          try {
            // Flex widths must settle before spacer pads / snap targets are measured.
            await waitForStableColumnLayout()
            if (generation !== layoutGeneration) return

            await refreshColumnMetrics()
            if (generation !== layoutGeneration) return
            restorePass(true)

            // Second pass after one more layout flush — catches late height changes.
            await refreshColumnMetrics()
            if (generation !== layoutGeneration) return
            restorePass()

            // Third pass after flex has fully finished shrinking.
            await new Promise<void>((resolve) => {
              window.setTimeout(() => resolve(), 90)
            })
            if (generation !== layoutGeneration) return
            await refreshColumnMetrics()
            if (generation !== layoutGeneration) return
            restorePass()

            await nextTick()
            await new Promise<void>((resolve) => {
              requestAnimationFrame(() => resolve())
            })
            if (generation !== layoutGeneration) return
            updateAllRemoveZones()
          } finally {
            release()
          }
        })()
      })
    })
  }

  run()
}

const addColumn = () => {
  if (!canAddColumn.value) return
  const bucket = pickNextBucket()
  const column = bucket ? createColumnFromBucket(bucket) : null
  if (!column) return

  const preserved = captureActiveImageIds()
  for (let i = 0; i < MAX_COLUMNS; i += 1) {
    clearSnapTimer(i)
    snappingSlot[i] = false
  }
  destroyLenis()
  stopRaf()

  columns.value = [...columns.value, column]
  preserved.push(column.images[0]?.id ?? null)
  const slotIndex = columns.value.length - 1
  columnPrimed[slotIndex] = false
  syncSlotElsFromIds()
  restoreColumnsAfterLayout(preserved, { settleNewInstant: true })
}

/** Insert a copy of this column's images immediately to its right. */
const forkColumnBeside = (slotIndex: number) => {
  if (!canAddColumn.value) return
  const source = columns.value[slotIndex]
  if (!source?.images.length) return

  const clone = cloneColumn(source)
  const preserved = captureActiveImageIds()
  const sourceActive =
    preserved[slotIndex] ?? clone.images[0]?.id ?? null
  preserved.splice(slotIndex + 1, 0, sourceActive)

  for (let i = 0; i < MAX_COLUMNS; i += 1) {
    clearSnapTimer(i)
    snappingSlot[i] = false
  }
  destroyLenis()
  stopRaf()

  const next = columns.value.slice()
  next.splice(slotIndex + 1, 0, clone)
  columns.value = next

  columnPrimed[slotIndex + 1] = false
  syncSlotElsFromIds()
  restoreColumnsAfterLayout(preserved)
}

const onUploadChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !file.type.startsWith('image/')) return
  if (!canAddColumn.value) return

  const src = URL.createObjectURL(file)
  const column = createUploadColumn(file, src)
  const preserved = captureActiveImageIds()
  for (let i = 0; i < MAX_COLUMNS; i += 1) {
    clearSnapTimer(i)
    snappingSlot[i] = false
  }
  destroyLenis()
  stopRaf()

  columns.value = [...columns.value, column]
  preserved.push(column.images[0]?.id ?? null)
  const slotIndex = columns.value.length - 1
  columnPrimed[slotIndex] = false
  syncSlotElsFromIds()
  restoreColumnsAfterLayout(preserved, { settleNewInstant: true })
}

const removeColumn = (slotIndex: number) => {
  const column = columns.value[slotIndex]
  if (!column) return

  const preserved = captureActiveImageIds().filter((_, index) => index !== slotIndex)

  revokeColumnUrl(column)

  for (let i = 0; i < MAX_COLUMNS; i += 1) {
    clearSnapTimer(i)
    snappingSlot[i] = false
    settleLockUntil[i] = 0
    lastUserIntentAt[i] = 0
  }

  // Tear Lenis down before the keyed list shifts so destroy can't hit a remapped host.
  destroyLenis()
  stopRaf()

  columns.value = columns.value.filter((_, index) => index !== slotIndex)
  syncSlotElsFromIds()

  // Clear trailing UI state; applyActiveImageIds remaps the live slots.
  const nextPads = spacerPads.value.slice()
  const nextInstant = instantDim.value.slice()
  const nextZones = removeZoneTops.value.slice()
  const nextSurrender = surrenderDim.value.slice()
  for (let i = columns.value.length; i < MAX_COLUMNS; i += 1) {
    nextPads[i] = 0
    nextInstant[i] = false
    nextZones[i] = 0
    nextSurrender[i] = false
    columnPrimed[i] = false
  }
  spacerPads.value = nextPads
  instantDim.value = nextInstant
  removeZoneTops.value = nextZones
  surrenderDim.value = nextSurrender

  if (!columns.value.length) {
    applyActiveImageIds([])
    return
  }
  restoreColumnsAfterLayout(preserved)
}

const resetFromBuckets = () => {
  columns.value.forEach(revokeColumnUrl)
  instanceSeq = 0
  clearAllMotion()

  const pool = bucketPool.value
  const demo = demoShowcaseBuckets(MAX_COLUMNS)
  const sourced = (pool.length ? pool : demo).filter((bucket) => bucket.images?.length)
  const initial = sourced.slice(0, DEFAULT_COLUMNS)
  while (initial.length < DEFAULT_COLUMNS) {
    const fallback = demo[initial.length]
    if (!fallback) break
    initial.push(fallback)
  }

  // Next add continues after the initially loaded pool buckets (wraps later).
  nextBucketCursor = Math.min(DEFAULT_COLUMNS, sourced.length)

  columns.value = initial
    .map((bucket) => createColumnFromBucket(bucket))
    .filter(Boolean) as ShowcaseColumn[]

  resetImageRevealState()
  remountMotion({ settleImmediately: true })
}

watch(
  () => props.buckets,
  () => {
    resetFromBuckets()
  },
  { immediate: true, deep: true },
)

onMounted(() => {
  if (!columns.value.length) resetFromBuckets()
  else remountMotion({ settleImmediately: true })
  if (COLOUR_WASH_ENABLED) {
    document.addEventListener('pointerdown', onColourDocPointerDown)
  }
})

onBeforeUnmount(() => {
  if (COLOUR_WASH_ENABLED) {
    document.removeEventListener('pointerdown', onColourDocPointerDown)
    window.removeEventListener('pointermove', onSpectrumPointerMove)
    window.removeEventListener('pointerup', onSpectrumPointerUp)
  }
  window.clearTimeout(layoutRealignTimer)
  layoutRealignTimer = 0
  resizeObserver?.disconnect()
  resizeObserver = null
  columns.value.forEach(revokeColumnUrl)
  for (let i = 0; i < MAX_COLUMNS; i += 1) clearSnapTimer(i)
  destroyLenis()
  stopRaf()
})
</script>

<style scoped>
.showcase {
  /* Tweak spacing / proportion here */
  --showcase-column-gap: 0px;
  --showcase-item-gap: 0px;
  --showcase-slots: 4;
  --showcase-aspect: 0.6;
  --showcase-dim-opacity: 0.15;
  --showcase-dim-delay: 0.2s;
  --showcase-dim-duration: 0.45s;
  --showcase-surrender-dim-delay: 0.55s;
  --showcase-surrender-dim-duration: 0.7s;
  --showcase-reveal-duration: 0.55s;
  --showcase-adder-width: 60px;
  --showcase-ctrl-size: 44px;
  /* Tracks charcoal so outlines stay dark-on-light / light-on-dark. */
  --showcase-ctrl-outline: color-mix(in srgb, var(--charcoal) 15%, transparent);
  --showcase-ctrl-border: 1px solid var(--showcase-ctrl-outline);

  position: relative;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  background: var(--cream);
}

.showcase__columns {
  position: relative;
  display: flex;
  align-items: stretch;
  width: 100%;
  height: 100%;
  gap: var(--showcase-column-gap);
}

.showcase__column-shell {
  position: relative;
  flex: 1 1 0;
  width: auto;
  min-width: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.showcase__column {
  position: absolute;
  inset: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.showcase__column--locked {
  overflow-y: hidden;
  touch-action: none;
  overscroll-behavior: none;
}

.showcase__column::-webkit-scrollbar {
  display: none;
}

.showcase__track {
  display: flex;
  flex-direction: column;
  gap: var(--showcase-item-gap);
}

.showcase__spacer {
  flex: 0 0 auto;
  width: 100%;
  pointer-events: none;
}

.showcase__cell {
  display: block;
  flex: 0 0 auto;
  width: 100%;
  max-height: 100vh;
  aspect-ratio: var(--showcase-aspect);
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  line-height: 0;
  color: inherit;
  overflow: hidden;
  opacity: 1;
  transition: opacity var(--showcase-dim-duration) ease;
  transition-delay: 0s;
}

.showcase__column--settled .showcase__cell:not(.showcase__cell--active) {
  opacity: var(--showcase-dim-opacity);
  transition-delay: var(--showcase-dim-delay);
}

.showcase__column--settled.showcase__column--surrender-dim .showcase__cell:not(.showcase__cell--active) {
  transition-duration: var(--showcase-surrender-dim-duration);
  transition-delay: var(--showcase-surrender-dim-delay);
}

.showcase__column--settled .showcase__cell--active {
  opacity: 1;
  transition-delay: 0s;
}

.showcase__column--instant .showcase__cell {
  transition: none !important;
}

.showcase__cell:focus-visible {
  outline: 2px solid var(--charcoal);
  outline-offset: -2px;
}

.showcase__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
  -webkit-user-drag: none;
  opacity: 0;
  transition: opacity var(--showcase-reveal-duration) ease;
}

.showcase__img--in {
  opacity: 1;
}

.showcase__remove-zone {
  position: absolute;
  left: 0;
  right: 0;
  /* Midway between screen centre and Surrender (bottom inset). */
  top: calc(
    75% - (var(--showcase-bottom-inset) / 2) -
      (var(--showcase-ctrl-size) * 0.75)
  );
  bottom: auto;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: var(--showcase-ctrl-size);
  pointer-events: none;
}

.showcase__remove,
.showcase__fork,
.showcase__lock {
  position: relative;
  display: grid;
  place-items: center;
  width: var(--showcase-ctrl-size);
  height: var(--showcase-ctrl-size);
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  color: var(--charcoal);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.showcase__fork:disabled {
  cursor: not-allowed;
  opacity: 0;
}

@media (hover: hover) and (pointer: fine) {
  .showcase__column-shell:hover .showcase__remove,
  .showcase__column-shell:hover .showcase__fork:not(:disabled),
  .showcase__column-shell:hover .showcase__lock {
    opacity: 1;
    pointer-events: auto;
  }

  .showcase__column-shell:hover .showcase__fork:disabled {
    opacity: 0.35;
    pointer-events: none;
  }
}

.showcase__lock--on {
  opacity: 1;
  pointer-events: auto;
}

.showcase__remove-circle,
.showcase__fork-circle,
.showcase__lock-circle {
  position: relative;
  box-sizing: border-box;
  width: var(--showcase-ctrl-size);
  height: var(--showcase-ctrl-size);
  border: var(--showcase-ctrl-border);
  border-radius: 50%;
  background: color-mix(in srgb, var(--cream) 82%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.showcase__remove:hover .showcase__remove-circle,
.showcase__remove:focus-visible .showcase__remove-circle,
.showcase__fork:hover:not(:disabled) .showcase__fork-circle,
.showcase__fork:focus-visible:not(:disabled) .showcase__fork-circle,
.showcase__lock:hover .showcase__lock-circle,
.showcase__lock:focus-visible .showcase__lock-circle {
  background: color-mix(in srgb, var(--charcoal) 6%, transparent);
  border-color: var(--charcoal);
}

.showcase__lock--on .showcase__lock-circle {
  background: color-mix(in srgb, var(--charcoal) 8%, transparent);
  border-color: var(--charcoal);
}

.showcase__remove-minus,
.showcase__fork-plus {
  position: absolute;
  top: 50%;
  left: 50%;
  background: currentColor;
  transform: translate(-50%, -50%);
}

.showcase__remove-minus,
.showcase__fork-plus--h {
  width: calc(var(--showcase-ctrl-size) * 0.4);
  height: 1px;
}

.showcase__fork-plus--v {
  width: 1px;
  height: calc(var(--showcase-ctrl-size) * 0.4);
}

.showcase__adder {
  position: absolute;
  top: 50%;
  right: 20px;
  z-index: 6;
  width: var(--showcase-adder-width);
  height: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 15px;
  padding: 8px;
  border-radius: 100px;
  border: var(--showcase-ctrl-border);
  background: color-mix(in srgb, var(--cream) 82%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transform: translateY(-50%);
}

.showcase__add {
  order: 1;
}

.showcase__upload {
  order: 2;
}

.showcase__colour-tool {
  order: 3;
}

.showcase__ctrl:not(.showcase__ctrl--send) {
  order: 4;
}

.showcase__ctrl--send {
  order: 5;
}

.showcase__add {
  position: relative;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  width: var(--showcase-ctrl-size);
  height: var(--showcase-ctrl-size);
  margin: 0;
  padding: 0;
  border: var(--showcase-ctrl-border);
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  color: var(--charcoal);
  transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}

.showcase__add:hover,
.showcase__add:focus-visible {
  background: color-mix(in srgb, var(--charcoal) 6%, transparent);
  border-color: var(--charcoal);
}

.showcase__add-icon {
  position: relative;
  width: 22px;
  height: 22px;
}

.showcase__add-arm {
  position: absolute;
  top: 50%;
  left: 50%;
  background: currentColor;
}

.showcase__add-arm--h {
  width: 14px;
  height: 1px;
  transform: translate(-50%, -50%);
}

.showcase__add-arm--v {
  width: 1px;
  height: 14px;
  transform: translate(-50%, -50%);
}

.showcase__upload {
  position: relative;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  width: var(--showcase-ctrl-size);
  height: var(--showcase-ctrl-size);
  margin: 0;
  padding: 0;
  border: var(--showcase-ctrl-border);
  border-radius: 50%;
  cursor: pointer;
  color: var(--charcoal);
  transition: background 0.2s ease, border-color 0.2s ease;
}

.showcase__upload:hover,
.showcase__upload:focus-within {
  background: color-mix(in srgb, var(--charcoal) 6%, transparent);
  border-color: var(--charcoal);
}

.showcase__upload--disabled {
  opacity: 0.35;
  pointer-events: none;
  cursor: default;
}

.showcase__upload-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.showcase__upload-icon {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
}

.showcase__tooltip {
  position: absolute;
  top: 50%;
  right: calc(100% + 0.55rem + 10px);
  z-index: 2;
  padding: 0.35rem 0.55rem;
  font-size: var(--text-xs);
  color: var(--charcoal);
  white-space: nowrap;
  background: var(--elevated-bg);
  border-radius: 6px;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-50%) translateX(2px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.showcase__add:hover .showcase__tooltip,
.showcase__add:focus-visible .showcase__tooltip,
.showcase__upload:hover .showcase__tooltip,
.showcase__upload:focus-within .showcase__tooltip,
.showcase__ctrl:hover .showcase__tooltip,
.showcase__ctrl:focus-visible .showcase__tooltip {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

.showcase__colour-tool {
  position: relative;
}

.showcase__colour-icon {
  display: block;
}

.showcase__colour-dot {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--cream) 70%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--charcoal) 25%, transparent);
}

.showcase__ctrl--colour-active {
  border-color: var(--charcoal);
}

.showcase__colour-popover {
  position: absolute;
  top: 50%;
  right: calc(100% + 0.75rem);
  z-index: 30;
  width: 220px;
  padding: 0.75rem;
  border: var(--showcase-ctrl-border);
  border-radius: 16px;
  background: color-mix(in srgb, var(--cream) 92%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 12px 32px var(--shadow-color, rgba(0, 0, 0, 0.12));
  transform: translateY(-50%);
}

.showcase__spectrum {
  position: relative;
  width: 100%;
  aspect-ratio: 1.15;
  border-radius: 10px;
  cursor: crosshair;
  touch-action: none;
  background:
    linear-gradient(to top, #000, transparent),
    linear-gradient(to right, #fff, transparent),
    hsl(calc(var(--spectrum-hue) * 1deg), 100%, 50%);
  overflow: hidden;
}

.showcase__spectrum-thumb {
  position: absolute;
  width: 14px;
  height: 14px;
  border: 1.5px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.showcase__hue {
  display: block;
  margin-top: 0.65rem;
}

.showcase__hue-input {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 12px;
  margin: 0;
  border-radius: 999px;
  background: linear-gradient(
    to right,
    hsl(0, 100%, 50%),
    hsl(60, 100%, 50%),
    hsl(120, 100%, 50%),
    hsl(180, 100%, 50%),
    hsl(240, 100%, 50%),
    hsl(300, 100%, 50%),
    hsl(360, 100%, 50%)
  );
  outline: none;
  cursor: pointer;
}

.showcase__hue-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid #fff;
  background: transparent;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
  cursor: pointer;
}

.showcase__hue-input::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid #fff;
  background: transparent;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
  cursor: pointer;
}

.showcase__colour-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.7rem;
}

.showcase__colour-preview {
  flex-shrink: 0;
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--charcoal) 20%, transparent);
}

.showcase__colour-hex {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0.2rem 0.35rem;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  letter-spacing: 0.04em;
  outline: none;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.showcase__colour-hex:hover {
  color: var(--charcoal);
  border-color: color-mix(in srgb, var(--charcoal) 14%, transparent);
}

.showcase__colour-hex:focus {
  color: var(--charcoal);
  border-color: color-mix(in srgb, var(--charcoal) 28%, transparent);
  background: color-mix(in srgb, var(--charcoal) 4%, transparent);
}

.showcase__colour-clear {
  flex-shrink: 0;
  margin: 0;
  padding: 0.2rem 0.45rem;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;
}

.showcase__colour-clear:hover:not(:disabled),
.showcase__colour-clear:focus-visible:not(:disabled) {
  color: var(--charcoal);
  background: color-mix(in srgb, var(--charcoal) 6%, transparent);
}

.showcase__colour-clear:disabled {
  opacity: 0.35;
  cursor: default;
}

.showcase__wash {
  position: fixed;
  top: 0;
  bottom: 0;
  left: var(--selections-panel-width);
  right: var(--boards-panel-width);
  z-index: 4;
  pointer-events: none;
  mix-blend-mode: color;
  transition:
    left 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    right 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.showcase__ctrl {
  position: relative;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  width: var(--showcase-ctrl-size);
  height: var(--showcase-ctrl-size);
  margin: 0;
  padding: 0;
  border: var(--showcase-ctrl-border);
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  color: var(--charcoal);
  transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}

.showcase__ctrl:hover:not(:disabled),
.showcase__ctrl:focus-visible:not(:disabled) {
  background: color-mix(in srgb, var(--charcoal) 6%, transparent);
  border-color: var(--charcoal);
}

.showcase__ctrl:disabled {
  opacity: 0.35;
  cursor: default;
}

.showcase__ctrl-icon {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
}

.showcase__ctrl--send {
  border-color: #c62828;
  background: #c62828;
  color: #fff;
}

.showcase__ctrl--send:hover:not(:disabled),
.showcase__ctrl--send:focus-visible:not(:disabled) {
  background: #b71c1c;
  border-color: #b71c1c;
  color: #fff;
}

.showcase__surrender {
  position: fixed;
  left: calc(
    var(--selections-panel-width) +
      (100vw - var(--selections-panel-width) - var(--boards-panel-width)) / 2
  );
  bottom: var(--showcase-bottom-inset, 60px);
  z-index: 20;
  box-sizing: border-box;
  min-height: var(--showcase-ctrl-size);
  margin: 0;
  padding: 0 1.25rem;
  border: var(--showcase-ctrl-border);
  border-radius: 100px;
  background: color-mix(in srgb, var(--cream) 82%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: var(--charcoal);
  font-size: var(--text-sm);
  letter-spacing: 0.04em;
  cursor: pointer;
  transform: translateX(-50%);
  transition:
    left 0.35s cubic-bezier(0.22, 1, 0.36, 1),
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease;
}

.showcase__surrender:hover:not(:disabled),
.showcase__surrender:focus-visible:not(:disabled) {
  background: color-mix(in srgb, var(--charcoal) 6%, var(--cream));
  border-color: var(--charcoal);
}

.showcase__surrender:disabled {
  opacity: 0.35;
  cursor: default;
}
</style>
