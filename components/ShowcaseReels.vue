<template>
  <section
    class="showcase"
    :style="{
      '--showcase-slots': Math.max(columnCount, 1),
      '--showcase-bottom-inset': `${SHOWCASE_BOTTOM_INSET_PX}px`,
    }"
    aria-label="Showcase"
  >
    <div class="showcase__columns">
      <div
        v-for="(column, slotIndex) in columns"
        :key="column.instanceId"
        class="showcase__column-shell"
      >
        <div
          :ref="(el) => setColumnRef(slotIndex, el)"
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
            :ref="(el) => setTrackRef(slotIndex, el)"
          >
            <div
              class="showcase__spacer"
              :style="spacerStyle(slotIndex)"
              aria-hidden="true"
            />
            <button
              v-for="(image, imageIndex) in column.images"
              :key="image.id"
              type="button"
              class="showcase__cell"
              :class="{
                'showcase__cell--active': settledIndexes[slotIndex] === imageIndex,
              }"
              :data-cell-key="cellKey(slotIndex, image.id)"
              :aria-label="`${column.title} — image ${imageIndex + 1}`"
              @click="onSelect(column, imageIndex)"
            >
              <img
                v-if="shouldLoadImage(slotIndex, imageIndex)"
                :ref="(el) => bindShowcaseImg(el, slotIndex, image.id)"
                class="showcase__img"
                :class="{ 'showcase__img--in': isImageRevealed(slotIndex, image.id) }"
                :src="image.src"
                :alt="column.title"
                :fetchpriority="isSelectedImage(slotIndex, imageIndex) ? 'high' : 'low'"
                :loading="isSelectedImage(slotIndex, imageIndex) ? 'eager' : 'lazy'"
                decoding="async"
                draggable="false"
                @load="onShowcaseImgLoad(slotIndex, image.id)"
                @error="onShowcaseImgLoad(slotIndex, image.id)"
              />
            </button>
            <div
              class="showcase__spacer"
              :style="spacerStyle(slotIndex)"
              aria-hidden="true"
            />
          </div>
        </div>

        <div
          class="showcase__remove-zone"
          :style="removeZoneStyle(slotIndex)"
        >
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
          v-if="canAddColumn"
          class="showcase__upload"
          aria-label="Upload image"
        >
          <input
            ref="fileInputRef"
            type="file"
            class="showcase__upload-input"
            accept="image/*"
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

        <button
          type="button"
          class="showcase__ctrl"
          aria-label="Save selection"
          :disabled="!columnCount"
          @click="saveSelection"
        >
          <span class="showcase__ctrl-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 3h10v18l-5-3.5L7 21V3z" />
            </svg>
          </span>
          <span class="showcase__tooltip interface" aria-hidden="true">Save</span>
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
const SNAP_IDLE_MS = 55
const SNAP_DURATION = 0.28
const SURRENDER_DURATION = 1.15
const VELOCITY_SNAP_THRESHOLD = 0.12
const ASPECT = 0.8
/** Shared floor for Surrender + column lock/minus controls. */
const SHOWCASE_BOTTOM_INSET_PX = 60
const CTRL_SIZE_PX = 44

const lenisEasing = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
/** Ease in-out with power 3 for Surrender. */
const surrenderEasing = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

const createColumnLenis = (wrapper: HTMLElement, content: HTMLElement) =>
  new Lenis({
    wrapper,
    content,
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    syncTouch: true,
    syncTouchLerp: 0.12,
    touchInertiaExponent: 1.35,
    touchMultiplier: 1.1,
    wheelMultiplier: 1.05,
    duration: 0.9,
    easing: lenisEasing,
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
/** Image keys that have finished loading and may fade in. */
const revealedImages = ref<Record<string, true>>({})
/** After the initial selected images load, unlock every other reel image. */
const restLoadsAllowed = ref(false)

const columnCount = computed(() => columns.value.length)
const canAddColumn = computed(() => columnCount.value < MAX_COLUMNS)

const columnEls: (HTMLElement | null)[] = Array.from({ length: MAX_COLUMNS }, () => null)
const trackEls: (HTMLElement | null)[] = Array.from({ length: MAX_COLUMNS }, () => null)
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
let rafId = 0
let resizeObserver: ResizeObserver | null = null
let layoutSilenceDepth = 0
/** Blocks nested onColumnScroll while a scroll handler is already running. */
let scrollHandlerDepth = 0
/** Blocks ResizeObserver realign while add/remove restores selections. */
let structuralLayoutDepth = 0
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
  const prefix = `${slotIndex}:`
  if (key.startsWith(prefix)) return key.slice(prefix.length)
  // After add/remove, keys can briefly carry a stale slot prefix — keep the id.
  const colon = key.indexOf(':')
  return colon >= 0 ? key.slice(colon + 1) : key
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

const pickNextBucket = (): ShowcaseBucket | null => {
  const used = new Set(
    columns.value.map((column) => column.bucketId || column.productId),
  )
  const pool = bucketPool.value
  const unused = pool.find(
    (bucket) => bucket.images?.length && bucket.id && !used.has(bucket.id),
  )
  if (unused) return unused

  // Fresh demo reel when the pool is exhausted.
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

const spacerStyle = (slotIndex: number) => ({
  height: `${spacerPads.value[slotIndex] ?? 0}px`,
})

const removeZoneStyle = (slotIndex: number) => {
  const top = removeZoneTops.value[slotIndex]
  // 0 means unmeasured — pin to surrender inset so controls never flash at the top.
  if (top == null || top <= 0) {
    return {
      top: 'auto',
      bottom: `${SHOWCASE_BOTTOM_INSET_PX}px`,
    }
  }
  return {
    top: `${top}px`,
    bottom: 'auto',
  }
}

const updateRemoveZone = (slotIndex: number) => {
  const el = columnEls[slotIndex]
  const shell = el?.parentElement
  if (!el || !shell) return

  const shellH = shell.clientHeight || window.innerHeight || 0
  // Avoid writing top:0 while the shell still has no height.
  if (shellH <= CTRL_SIZE_PX) return

  const maxTop = Math.max(0, shellH - SHOWCASE_BOTTOM_INSET_PX - CTRL_SIZE_PX)

  const key = activeKeys.value[slotIndex]
  const cell = key
    ? el.querySelector<HTMLElement>(`[data-cell-key="${CSS.escape(key)}"]`)
    : el.querySelector<HTMLElement>('.showcase__cell')

  const cellH =
    cell?.offsetHeight || el.clientWidth / ASPECT || Math.round(shellH * 0.5)

  // Full-viewport (or nearly) cells: sit on the same floor as Surrender.
  if (cellH >= shellH - 2) {
    const next = removeZoneTops.value.slice()
    next[slotIndex] = maxTop
    removeZoneTops.value = next
    return
  }

  // Centre in the band under the snapped cell, clamped to the bottom inset.
  const snappedCellBottom = Math.min(shellH, (shellH + cellH) / 2)
  const idealTop = (snappedCellBottom + shellH) / 2 - CTRL_SIZE_PX / 2

  const next = removeZoneTops.value.slice()
  next[slotIndex] = Math.max(0, Math.min(Math.max(idealTop, 1), maxTop))
  removeZoneTops.value = next
}

const updateAllRemoveZones = () => {
  for (let i = 0; i < columns.value.length; i += 1) {
    updateRemoveZone(i)
  }
}

const measureSpacerPads = () => {
  const prev = spacerPads.value
  let changed = false
  const next = Array.from({ length: MAX_COLUMNS }, (_, slotIndex) => {
    if (slotIndex >= columns.value.length) return 0
    const el = columnEls[slotIndex]
    if (!el) return prev[slotIndex] ?? 0

    const cell = el.querySelector<HTMLElement>('.showcase__cell')
    const viewportHeight = el.clientHeight || window.innerHeight
    const fromAspect = el.clientWidth / ASPECT
    // Prefer live column width so pads track flex shrink before paint settles.
    const cellHeight = Math.min(
      cell?.offsetHeight || fromAspect,
      fromAspect,
      viewportHeight,
    )
    // Round so first/last land cleanly in the centre slot (avoids sub-pixel shortfall).
    const pad = Math.max(0, Math.round((viewportHeight - cellHeight) / 2))
    if (pad !== prev[slotIndex]) changed = true
    return pad
  })
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

const setColumnRef = (slotIndex: number, el: unknown) => {
  columnEls[slotIndex] = el instanceof HTMLElement ? el : null
}

const setTrackRef = (slotIndex: number, el: unknown) => {
  trackEls[slotIndex] = el instanceof HTMLElement ? el : null
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
  const tol = endSnapTolerance(slotIndex)

  // Same rules as resolveSnapTarget — geometry midY fails for first/last.
  if (current <= tol) return cells[0] || null
  if (current >= max - tol) return cells[cells.length - 1] || null

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

const findCenteredKey = (slotIndex: number) =>
  findCenteredCell(slotIndex)?.dataset.cellKey || null

const scrollLimits = (slotIndex: number) => {
  const el = columnEls[slotIndex]
  const lenis = lenisBySlot[slotIndex]
  if (!el) return { min: 0, max: 0 }
  const nativeMax = Math.max(0, el.scrollHeight - el.clientHeight)
  const max = Math.max(nativeMax, lenis?.limit ?? 0)
  return { min: 0, max }
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

/** Pick the snap target, clamping to scroll bounds so first/last can settle. */
const resolveSnapTarget = (slotIndex: number) => {
  const el = columnEls[slotIndex]
  if (!el) return { scroll: 0, key: null as string | null }

  const cells = Array.from(el.querySelectorAll<HTMLElement>('.showcase__cell'))
  if (!cells.length) return { scroll: el.scrollTop, key: null }

  const { min, max } = scrollLimits(slotIndex)
  const current = currentScroll(slotIndex)
  const tol = endSnapTolerance(slotIndex)
  const firstKey = cells[0]?.dataset.cellKey || null
  const lastKey = cells[cells.length - 1]?.dataset.cellKey || null

  if (current <= tol) {
    return { scroll: min, key: firstKey }
  }
  if (current >= max - tol) {
    return { scroll: max, key: lastKey }
  }

  let bestScroll = min
  let bestDist = Infinity

  for (const cell of cells) {
    const raw = rawCenterScrollForCell(slotIndex, cell)
    const clamped = Math.min(max, Math.max(min, raw))
    const dist = Math.abs(clamped - current)
    if (dist < bestDist) {
      bestDist = dist
      bestScroll = clamped
    }
  }

  // Multiple cells can clamp to the same bound — always attribute ends to first/last.
  if (bestScroll <= min + SNAP_DONE_PX) {
    return { scroll: min, key: firstKey }
  }
  if (bestScroll >= max - SNAP_DONE_PX) {
    return { scroll: max, key: lastKey }
  }

  const bestCell =
    cells.find((cell) => {
      const raw = rawCenterScrollForCell(slotIndex, cell)
      const clamped = Math.min(max, Math.max(min, raw))
      return Math.abs(clamped - bestScroll) <= SNAP_DONE_PX
    }) || cells[0]!

  return { scroll: bestScroll, key: bestCell.dataset.cellKey || null }
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
  openFromBucket(items)
}

const saveSelection = () => {
  const items = selectedEnquiryItems()
  if (!items.length) return
  items.forEach((item) => addItem(item))
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
        let fresh = target
        withScrollSuppressed(() => {
          lenis.resize()
          fresh = scrollTargetForKey(slotIndex, key) ?? target
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

  const { min, max } = scrollLimits(slotIndex)
  const current = currentScroll(slotIndex)
  const tol = endSnapTolerance(slotIndex)
  const images = columns.value[slotIndex]?.images || []
  const el = columnEls[slotIndex]
  const lenis = lenisBySlot[slotIndex]
  const cells = el
    ? Array.from(el.querySelectorAll<HTMLElement>('.showcase__cell'))
    : []

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

  // Scroll-bound end pin only when we don't already have an explicit selection.
  // (Realign resets scroll to 0 first — that must not steal a middle selection.)
  if (explicitKey == null || resolvedIndex == null) {
    if (images.length && current <= tol) {
      resolvedIndex = 0
      resolvedKey = cells[0]?.dataset.cellKey || cellKey(slotIndex, images[0]!.id)
    } else if (images.length && current >= max - tol) {
      resolvedIndex = images.length - 1
      resolvedKey =
        cells[cells.length - 1]?.dataset.cellKey ||
        cellKey(slotIndex, images[resolvedIndex]!.id)
    }
  }

  if (resolvedIndex == null && images.length) {
    resolvedIndex = 0
    resolvedKey = cellKey(slotIndex, images[0]!.id)
  }

  if (resolvedIndex === 0 && images.length) {
    resolvedKey = cells[0]?.dataset.cellKey || cellKey(slotIndex, images[0]!.id)
  } else if (images.length && resolvedIndex === images.length - 1) {
    resolvedKey =
      cells[cells.length - 1]?.dataset.cellKey ||
      cellKey(slotIndex, images[resolvedIndex]!.id)
  }

  const nextActive = activeKeys.value.slice()
  nextActive[slotIndex] = resolvedKey
  activeKeys.value = nextActive

  const nextSettled = settledIndexes.value.slice()
  nextSettled[slotIndex] = resolvedIndex
  settledIndexes.value = nextSettled

  if (resolvedIndex === 0) {
    if (Math.abs(current - min) > SNAP_DONE_PX) {
      if (lenis) lenis.scrollTo(min, { immediate: true })
      else if (el) el.scrollTop = min
    }
  } else if (images.length && resolvedIndex === images.length - 1) {
    if (Math.abs(current - max) > SNAP_DONE_PX) {
      if (lenis) lenis.scrollTo(max, { immediate: true })
      else if (el) el.scrollTop = max
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
      lenis.scrollTo(target, { immediate: true })
    }
    markSettled(slotIndex, key)
    return
  }

  snappingSlot[slotIndex] = true
  if (lenis) {
    lenis.scrollTo(target, {
      duration: SNAP_DURATION,
      easing: lenisEasing,
      onComplete: () => {
        // Settle before releasing the snap lock so residual scroll can't undim ends.
        lenis.scrollTo(target, { immediate: true })
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
  const min = 0
  // Prefer DOM extent over lenis.limit so scroll handlers stay read-only.
  const max = Math.max(0, el.scrollHeight - el.clientHeight)

  if (imageIndex <= 0) return { scroll: min, key }
  if (imageIndex >= column.images.length - 1) return { scroll: max, key }

  const cell = el.querySelector<HTMLElement>(
    `[data-cell-key="${CSS.escape(key)}"]`,
  )
  if (cell) {
    // offsetTop includes the leading spacer — no dependency on current scroll.
    const raw = cell.offsetTop + cell.offsetHeight / 2 - el.clientHeight / 2
    return {
      scroll: Math.min(max, Math.max(min, raw)),
      key,
    }
  }

  const cellH = el.clientWidth / ASPECT
  const pad = spacerPads.value[slotIndex] ?? 0
  const cellTop = pad + imageIndex * cellH
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
  void (async () => {
    await waitForStableColumnLayout()
    await refreshColumnMetrics()
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
    const settledIndex = settledIndexes.value[slotIndex]
    const intentAge = performance.now() - lastUserIntentAt[slotIndex]
    const hasRecentIntent = intentAge < USER_INTENT_MS
    const lenis = lenisBySlot[slotIndex]
    const current = currentScroll(slotIndex)
    const images = columns.value[slotIndex]?.images || []
    const lastIndex = images.length > 0 ? images.length - 1 : -1

    // Stay settled until scroll actually leaves the snapped cell (esp. first/last).
    // Use image-index math only — never scrollTargetForKey (must stay resize-free).
    if (settledIndex != null && images[settledIndex]) {
      const ideal = scrollTargetForImageIndex(slotIndex, settledIndex)
      const isEnd = settledIndex === 0 || settledIndex === lastIndex
      const leaveTol = isEnd
        ? endSnapTolerance(slotIndex)
        : Math.max(SNAP_DONE_PX * 4, endSnapTolerance(slotIndex) * 0.25)

      if (ideal && Math.abs(ideal.scroll - current) <= leaveTol) {
        return
      }

      // Layout drift without user input — keep fade; don't realign here.
      if (!hasRecentIntent) {
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

const destroyLenis = () => {
  for (let i = 0; i < MAX_COLUMNS; i += 1) {
    intentAbort[i]?.abort()
    intentAbort[i] = null
    lenisBySlot[i]?.destroy()
    lenisBySlot[i] = null
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
  const wrapper = columnEls[slotIndex]
  const content = trackEls[slotIndex]
  if (!wrapper || !content) return

  intentAbort[slotIndex]?.abort()
  const abort = new AbortController()
  intentAbort[slotIndex] = abort

  lenisBySlot[slotIndex]?.destroy()
  // Native scrollTop survives Lenis destroy and poisons remount targeting.
  wrapper.scrollTop = 0

  const lenis = createColumnLenis(wrapper, content)
  withScrollSuppressed(() => {
    lenis.scrollTo(0, { immediate: true })
    lenis.resize()
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
  if (columns.value[slotIndex]?.locked) lenis.stop()
}

const initLenis = () => {
  if (!import.meta.client) return
  destroyLenis()

  for (let i = 0; i < MAX_COLUMNS; i += 1) {
    if (columns.value[i]) initLenisForSlot(i)
  }

  startRaf()
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
    if (lenis) lenis.scrollTo(0, { immediate: true })
    else el.scrollTop = 0
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
  structuralLayoutDepth += 1
  window.clearTimeout(layoutRealignTimer)
  layoutRealignTimer = 0

  // Remap keys immediately so ResizeObserver can't realign with stale slot prefixes.
  applyActiveImageIds(activeImageIds)

  const run = (attempt = 0) => {
    nextTick(() => {
      requestAnimationFrame(() => {
        initLenis()
        observeColumns()

        const ready = columns.value.every((_, i) =>
          Boolean(columnEls[i] && trackEls[i] && lenisBySlot[i]),
        )

        if (!ready && attempt < 6) {
          run(attempt + 1)
          return
        }

        void (async () => {
          // Flex widths must settle before spacer pads / snap targets are measured.
          await waitForStableColumnLayout()
          await refreshColumnMetrics()

          withLayoutSilence(() => {
            applyActiveImageIds(activeImageIds)
            for (let i = 0; i < columns.value.length; i += 1) {
              lenisBySlot[i]?.resize()
              if (opts.settleNewInstant && i === columns.value.length - 1) {
                settleColumnInstant(i)
                // New column starts on first image — keep that in the restore list.
                activeImageIds[i] =
                  columns.value[i]?.images[0]?.id ?? activeImageIds[i] ?? null
              }
            }
            realignAllSlotsToActive(activeImageIds)
          })

          // Second pass after one more layout flush — catches late height changes.
          await refreshColumnMetrics()
          withLayoutSilence(() => {
            realignAllSlotsToActive(activeImageIds)
          })

          await nextTick()
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => resolve())
          })
          updateAllRemoveZones()

          structuralLayoutDepth = Math.max(0, structuralLayoutDepth - 1)
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
  columns.value = [...columns.value, column]
  preserved.push(column.images[0]?.id ?? null)
  const slotIndex = columns.value.length - 1
  columnPrimed[slotIndex] = false
  restoreColumnsAfterLayout(preserved, { settleNewInstant: true })
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
  columns.value = [...columns.value, column]
  preserved.push(column.images[0]?.id ?? null)
  const slotIndex = columns.value.length - 1
  columnPrimed[slotIndex] = false
  restoreColumnsAfterLayout(preserved, { settleNewInstant: true })
}

const removeColumn = (slotIndex: number) => {
  const column = columns.value[slotIndex]
  if (!column) return

  const preserved = captureActiveImageIds().filter((_, index) => index !== slotIndex)

  revokeColumnUrl(column)

  for (let i = 0; i < MAX_COLUMNS; i += 1) {
    clearSnapTimer(i)
    intentAbort[i]?.abort()
    intentAbort[i] = null
    lenisBySlot[i]?.destroy()
    lenisBySlot[i] = null
    if (columnEls[i]) columnEls[i]!.scrollTop = 0
    columnPrimed[i] = false
    snappingSlot[i] = false
    settleLockUntil[i] = 0
    lastUserIntentAt[i] = 0
  }

  columns.value = columns.value.filter((_, index) => index !== slotIndex)

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
})

onBeforeUnmount(() => {
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
  --showcase-aspect: 0.8;
  --showcase-dim-opacity: 0.075;
  --showcase-dim-delay: 0.2s;
  --showcase-dim-duration: 0.25s;
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
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: var(--showcase-ctrl-size);
  pointer-events: none;
}

.showcase__remove,
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

@media (hover: hover) and (pointer: fine) {
  .showcase__column-shell:hover .showcase__remove,
  .showcase__column-shell:hover .showcase__lock {
    opacity: 1;
    pointer-events: auto;
  }
}

.showcase__lock--on {
  opacity: 1;
  pointer-events: auto;
}

.showcase__remove-circle,
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
.showcase__lock:hover .showcase__lock-circle,
.showcase__lock:focus-visible .showcase__lock-circle {
  background: color-mix(in srgb, var(--charcoal) 6%, transparent);
  border-color: var(--charcoal);
}

.showcase__lock--on .showcase__lock-circle {
  background: color-mix(in srgb, var(--charcoal) 8%, transparent);
  border-color: var(--charcoal);
}

.showcase__remove-minus {
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(var(--showcase-ctrl-size) * 0.4);
  height: 1px;
  background: currentColor;
  transform: translate(-50%, -50%);
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
  left: 50%;
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
  transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease;
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
