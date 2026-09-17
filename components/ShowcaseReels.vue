<template>
  <section
    class="showcase"
    :style="{ '--showcase-slots': Math.max(columnCount, 1) }"
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
                class="showcase__img"
                :src="image.src"
                :alt="column.title"
                decoding="async"
                draggable="false"
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

const bucketPool = computed(() => {
  const fromProps = (props.buckets || []).filter((bucket) => bucket.images?.length)
  if (fromProps.length) return fromProps
  return demoShowcaseBuckets(Math.max(SHOWCASE_MAX_COLUMNS, MAX_COLUMNS))
})

const cellKey = (slotIndex: number, id: string) => `${slotIndex}:${id}`

const imageIdFromActiveKey = (slotIndex: number, key: string | null) => {
  if (!key) return null
  const prefix = `${slotIndex}:`
  return key.startsWith(prefix) ? key.slice(prefix.length) : null
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

const removeZoneStyle = (slotIndex: number) => ({
  top: `${removeZoneTops.value[slotIndex] ?? 0}px`,
})

const updateRemoveZone = (slotIndex: number) => {
  const el = columnEls[slotIndex]
  const shell = el?.parentElement
  if (!el || !shell) return

  const key = activeKeys.value[slotIndex]
  const cell = key
    ? el.querySelector<HTMLElement>(`[data-cell-key="${CSS.escape(key)}"]`)
    : findCenteredCell(slotIndex)

  const next = removeZoneTops.value.slice()
  if (!cell) {
    // Match centred-cell geometry: zone = bottom spacer band.
    const pad = spacerPads.value[slotIndex] || 0
    next[slotIndex] = Math.max(0, shell.clientHeight - pad)
  } else {
    const shellRect = shell.getBoundingClientRect()
    const cellRect = cell.getBoundingClientRect()
    next[slotIndex] = Math.max(0, cellRect.bottom - shellRect.top)
  }
  removeZoneTops.value = next
}

const measureSpacerPads = () => {
  const prev = spacerPads.value
  let changed = false
  const next = Array.from({ length: MAX_COLUMNS }, (_, slotIndex) => {
    if (slotIndex >= columns.value.length) return 0
    const el = columnEls[slotIndex]
    if (!el) return prev[slotIndex] ?? 0

    const cell = el.querySelector<HTMLElement>('.showcase__cell')
    const cellHeight = cell?.offsetHeight || el.clientWidth / ASPECT
    const viewportHeight = el.clientHeight || window.innerHeight
    // Round so first/last land cleanly in the centre slot (avoids sub-pixel shortfall).
    const pad = Math.max(0, Math.round((viewportHeight - cellHeight) / 2))
    if (pad !== prev[slotIndex]) changed = true
    return pad
  })
  if (changed) spacerPads.value = next
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
  const max = lenis?.limit ?? Math.max(0, el.scrollHeight - el.clientHeight)
  return { min: 0, max: Math.max(0, max) }
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
  const target = scrollTargetForKey(slotIndex, key)
  if (!target) return

  clearSnapTimer(slotIndex)
  lastUserIntentAt[slotIndex] = 0
  settleLockUntil[slotIndex] = 0
  unsettleColumn(slotIndex)

  const nextSurrender = surrenderDim.value.slice()
  nextSurrender[slotIndex] = true
  surrenderDim.value = nextSurrender

  snappingSlot[slotIndex] = true

  const lenis = lenisBySlot[slotIndex]
  const el = columnEls[slotIndex]
  if (lenis) {
    lenis.scrollTo(target.scroll, {
      duration: SURRENDER_DURATION,
      easing: surrenderEasing,
      onComplete: () => {
        lenis.scrollTo(target.scroll, { immediate: true })
        markSettled(slotIndex, key)
        snappingSlot[slotIndex] = false
      },
    })
  } else if (el) {
    el.scrollTo({ top: target.scroll, behavior: 'smooth' })
    window.setTimeout(() => {
      el.scrollTop = target.scroll
      markSettled(slotIndex, key)
      snappingSlot[slotIndex] = false
    }, SURRENDER_DURATION * 1000)
  } else {
    snappingSlot[slotIndex] = false
  }
}

const surrenderColumns = () => {
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
  const { min, max } = scrollLimits(slotIndex)
  const current = currentScroll(slotIndex)
  const tol = endSnapTolerance(slotIndex)
  const images = columns.value[slotIndex]?.images || []
  const el = columnEls[slotIndex]
  const lenis = lenisBySlot[slotIndex]
  const cells = el
    ? Array.from(el.querySelectorAll<HTMLElement>('.showcase__cell'))
    : []

  let resolvedKey = key ?? findCenteredKey(slotIndex)
  let resolvedIndex = imageIndexForKey(slotIndex, resolvedKey)

  // Hard-pin ends by scroll position — geometry cannot centre first/last.
  if (images.length && current <= tol) {
    resolvedIndex = 0
    resolvedKey = cells[0]?.dataset.cellKey || cellKey(slotIndex, images[0]!.id)
    if (Math.abs(current - min) > SNAP_DONE_PX) {
      if (lenis) lenis.scrollTo(min, { immediate: true })
      else if (el) el.scrollTop = min
    }
  } else if (images.length && current >= max - tol) {
    resolvedIndex = images.length - 1
    resolvedKey =
      cells[cells.length - 1]?.dataset.cellKey ||
      cellKey(slotIndex, images[resolvedIndex]!.id)
    if (Math.abs(current - max) > SNAP_DONE_PX) {
      if (lenis) lenis.scrollTo(max, { immediate: true })
      else if (el) el.scrollTop = max
    }
  } else if (resolvedIndex === 0) {
    resolvedKey = cells[0]?.dataset.cellKey || cellKey(slotIndex, images[0]!.id)
    if (lenis) lenis.scrollTo(min, { immediate: true })
    else if (el) el.scrollTop = min
  } else if (images.length && resolvedIndex === images.length - 1) {
    resolvedKey =
      cells[cells.length - 1]?.dataset.cellKey ||
      cellKey(slotIndex, images[resolvedIndex]!.id)
    if (lenis) lenis.scrollTo(max, { immediate: true })
    else if (el) el.scrollTop = max
  }

  if (resolvedIndex == null && resolvedKey) {
    resolvedIndex = imageIndexForKey(slotIndex, resolvedKey)
  }
  if (resolvedIndex == null && images.length) {
    resolvedIndex = 0
    resolvedKey = cellKey(slotIndex, images[0]!.id)
  }

  const nextActive = activeKeys.value.slice()
  nextActive[slotIndex] = resolvedKey
  activeKeys.value = nextActive

  const nextSettled = settledIndexes.value.slice()
  nextSettled[slotIndex] = resolvedIndex
  settledIndexes.value = nextSettled

  settleLockUntil[slotIndex] = performance.now() + SETTLE_LOCK_MS
  lastUserIntentAt[slotIndex] = 0
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

/** Scroll target that keeps a known active cell centred after layout changes. */
const scrollTargetForKey = (slotIndex: number, key: string) => {
  const el = columnEls[slotIndex]
  if (!el) return null

  const cell = el.querySelector<HTMLElement>(
    `[data-cell-key="${CSS.escape(key)}"]`,
  )
  if (!cell) return null

  const cells = Array.from(el.querySelectorAll<HTMLElement>('.showcase__cell'))
  const { min, max } = scrollLimits(slotIndex)

  if (cell === cells[0]) return { scroll: min, key }
  if (cell === cells[cells.length - 1]) return { scroll: max, key }

  const raw = rawCenterScrollForCell(slotIndex, cell)
  return {
    scroll: Math.min(max, Math.max(min, raw)),
    key,
  }
}

/** Instantly re-centre the current selection after spacer / viewport resize. */
const realignSlotToActive = (slotIndex: number) => {
  if (!columns.value[slotIndex]) return

  const lenis = lenisBySlot[slotIndex]
  const el = columnEls[slotIndex]
  if (!el) return

  clearSnapTimer(slotIndex)
  snappingSlot[slotIndex] = false
  lenis?.resize()

  const key = activeKeys.value[slotIndex]
  const target = key
    ? scrollTargetForKey(slotIndex, key) ?? resolveSnapTarget(slotIndex)
    : resolveSnapTarget(slotIndex)

  if (!target?.key && !key) return

  const scroll = target?.scroll ?? 0
  const resolvedKey = target?.key ?? key

  if (lenis) lenis.scrollTo(scroll, { immediate: true })
  else el.scrollTop = scroll

  markSettled(slotIndex, resolvedKey)
  nextTick(() => updateRemoveZone(slotIndex))
}

let layoutRealignTimer = 0

const realignAllColumns = () => {
  withLayoutSilence(() => {
    measureSpacerPads()
  })

  nextTick(() => {
    requestAnimationFrame(() => {
      withLayoutSilence(() => {
        for (let i = 0; i < MAX_COLUMNS; i += 1) {
          if (!columns.value[i]) continue
          if (activeKeys.value[i] || settledIndexes.value[i] != null) {
            realignSlotToActive(i)
          } else lenisBySlot[i]?.resize()
          updateRemoveZone(i)
        }
      })
    })
  })
}

const scheduleLayoutRealign = () => {
  if (!import.meta.client) return
  window.clearTimeout(layoutRealignTimer)
  layoutRealignTimer = window.setTimeout(() => {
    layoutRealignTimer = 0
    realignAllColumns()
  }, 60)
}

const onColumnScroll = (slotIndex: number) => {
  if (layoutSilenceDepth > 0 || snappingSlot[slotIndex]) return
  if (columns.value[slotIndex]?.locked) return
  if (performance.now() < settleLockUntil[slotIndex]) return

  const settledIndex = settledIndexes.value[slotIndex]
  const activeKey = activeKeys.value[slotIndex]
  const intentAge = performance.now() - lastUserIntentAt[slotIndex]
  const hasRecentIntent = intentAge < USER_INTENT_MS
  const lenis = lenisBySlot[slotIndex]
  const current = currentScroll(slotIndex)
  const { max } = scrollLimits(slotIndex)
  const tol = endSnapTolerance(slotIndex)
  const images = columns.value[slotIndex]?.images || []
  const lastIndex = images.length > 0 ? images.length - 1 : -1
  const { key: snapKey } = resolveSnapTarget(slotIndex)

  // First/last stay faded while scroll remains near that bound.
  if (settledIndex === 0 && current <= tol) {
    updateRemoveZone(slotIndex)
    return
  }
  if (settledIndex === lastIndex && lastIndex >= 0 && current >= max - tol) {
    updateRemoveZone(slotIndex)
    return
  }

  // Keep fade while the snap target is still this cell.
  if (settledIndex != null && activeKey && snapKey === activeKey) {
    const ideal = scrollTargetForKey(slotIndex, activeKey)
    if (ideal && Math.abs(ideal.scroll - current) > SNAP_DONE_PX && hasRecentIntent) {
      scheduleSnap(slotIndex)
    }
    updateRemoveZone(slotIndex)
    return
  }

  // Cross-column Lenis/layout noise must not undim a settled neighbour.
  if (settledIndex != null && !hasRecentIntent) {
    return
  }

  unsettleColumn(slotIndex)

  const velocity = lenis?.velocity ?? 0
  if (Math.abs(velocity) > VELOCITY_SNAP_THRESHOLD) {
    clearSnapTimer(slotIndex)
    return
  }

  scheduleSnap(slotIndex)
}

const onUserIntent = (slotIndex: number) => {
  if (layoutSilenceDepth > 0) return
  if (columns.value[slotIndex]?.locked) return
  // Never interrupt an in-flight snap — that was undoing first/last settle.
  if (snappingSlot[slotIndex]) return
  // Trackpad inertia keeps firing wheel after snap; don't clear the settle lock.
  if (performance.now() < settleLockUntil[slotIndex]) return

  lastUserIntentAt[slotIndex] = performance.now()
  settleLockUntil[slotIndex] = 0
  unsettleColumn(slotIndex)
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

  const lenis = createColumnLenis(wrapper, content)
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

const mountSlot = (slotIndex: number) => {
  nextTick(() => {
    requestAnimationFrame(() => {
      withLayoutSilence(() => {
        initLenisForSlot(slotIndex)
        if (!rafId) startRaf()
        observeColumns()
        measureSpacerPads()
        lenisBySlot[slotIndex]?.resize()
        requestAnimationFrame(() => {
          withLayoutSilence(() => {
            measureSpacerPads()
            lenisBySlot[slotIndex]?.resize()
            primeColumn(slotIndex, true, true)
          })
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

const restoreColumnsAfterLayout = (activeImageIds: (string | null)[]) => {
  const run = (attempt = 0) => {
    nextTick(() => {
      requestAnimationFrame(() => {
        initLenis()
        observeColumns()

        const ready = columns.value.every((_, i) =>
          Boolean(columnEls[i] && trackEls[i] && lenisBySlot[i]),
        )

        if (!ready && attempt < 4) {
          run(attempt + 1)
          return
        }

        requestAnimationFrame(() => {
          withLayoutSilence(() => {
            measureSpacerPads()
            const nextActive = activeKeys.value.slice()
            const nextSettled = settledIndexes.value.slice()
            for (let i = 0; i < columns.value.length; i += 1) {
              const imageId = activeImageIds[i]
              const fallback = columns.value[i]?.images[0]?.id ?? null
              const id = imageId || fallback
              nextActive[i] = id ? cellKey(i, id) : null
              const idx = id
                ? columns.value[i]?.images.findIndex((image) => image.id === id) ?? -1
                : -1
              nextSettled[i] = idx >= 0 ? idx : id ? 0 : null
              columnPrimed[i] = true
              lenisBySlot[i]?.resize()
            }
            activeKeys.value = nextActive
            settledIndexes.value = nextSettled
            for (let i = 0; i < columns.value.length; i += 1) {
              realignSlotToActive(i)
              updateRemoveZone(i)
            }
          })
        })
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

  columns.value = [...columns.value, column]
  const slotIndex = columns.value.length - 1
  columnPrimed[slotIndex] = false
  mountSlot(slotIndex)
  scheduleLayoutRealign()
}

const onUploadChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !file.type.startsWith('image/')) return
  if (!canAddColumn.value) return

  const src = URL.createObjectURL(file)
  const column = createUploadColumn(file, src)
  columns.value = [...columns.value, column]
  const slotIndex = columns.value.length - 1
  columnPrimed[slotIndex] = false
  mountSlot(slotIndex)
  scheduleLayoutRealign()
}

const removeColumn = (slotIndex: number) => {
  const column = columns.value[slotIndex]
  if (!column) return

  // Keep the selected image id for every column that will remain.
  const activeImageIds = columns.value.flatMap((col, index) => {
    if (index === slotIndex) return []
    return [
      imageIdFromActiveKey(index, activeKeys.value[index]) ||
        col.images[0]?.id ||
        null,
    ]
  })

  revokeColumnUrl(column)

  for (let i = 0; i < MAX_COLUMNS; i += 1) {
    clearSnapTimer(i)
    intentAbort[i]?.abort()
    intentAbort[i] = null
    lenisBySlot[i]?.destroy()
    lenisBySlot[i] = null
    columnPrimed[i] = false
    snappingSlot[i] = false
    settleLockUntil[i] = 0
    lastUserIntentAt[i] = 0
  }

  columns.value = columns.value.filter((_, index) => index !== slotIndex)

  // Reset parallel UI state for unused trailing slots.
  const nextActive = activeKeys.value.slice()
  const nextSettled = settledIndexes.value.slice()
  const nextPads = spacerPads.value.slice()
  const nextInstant = instantDim.value.slice()
  const nextZones = removeZoneTops.value.slice()
  const nextSurrender = surrenderDim.value.slice()
  for (let i = columns.value.length; i < MAX_COLUMNS; i += 1) {
    nextActive[i] = null
    nextSettled[i] = null
    nextPads[i] = 0
    nextInstant[i] = false
    nextZones[i] = 0
    nextSurrender[i] = false
  }
  activeKeys.value = nextActive
  settledIndexes.value = nextSettled
  spacerPads.value = nextPads
  instantDim.value = nextInstant
  removeZoneTops.value = nextZones
  surrenderDim.value = nextSurrender

  if (!columns.value.length) return
  restoreColumnsAfterLayout(activeImageIds)
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
  --showcase-surrender-dim-delay: 1s;
  --showcase-surrender-dim-duration: 0.7s;
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
}

.showcase__remove-zone {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
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
  bottom: 100px;
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
