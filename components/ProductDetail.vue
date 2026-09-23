<template>
  <article
    v-if="product"
    class="pdp"
    :class="{
      'pdp--standalone': standalone,
      'pdp--ready': contentReady,
      'pdp--sides': sidesVisible,
      'pdp--zoomed': imageExpanded,
      'pdp--no-related': true,
      'pdp--index': true,
      'pdp--index-hidden': !indexRailVisible,
      'pdp--related-hidden': !relatedRailVisible,
      'pdp--gallery': galleryVisible,
      'pdp--closing': closingFlip,
    }"
  >
    <aside class="pdp__col pdp__col--left">
      <div class="pdp__toolbar">
        <button type="button" class="pdp__close interface" @click="$emit('close')">Close</button>
        <button
          type="button"
          class="pdp__info-toggle interface pdp__pane-fade"
          :class="{ 'pdp__pane-fade--out': !paneContentVisible }"
          :aria-expanded="showInfo"
          @click="showInfo = !showInfo"
        >
          Info
        </button>
      </div>

      <div
        class="pdp__body pdp__pane-fade"
        :class="{ 'pdp__pane-fade--out': !paneContentVisible }"
      >
        <div class="pdp__spec pdp__spec--toggle pdp__spec--title">
          <div class="pdp__disclosure pdp__title-row">
            <h1 class="pdp__title interface">{{ product.title }}</h1>
          </div>
        </div>

        <div v-if="showInfo" class="pdp__info-panel">
          <dl class="pdp__specs">
            <div v-if="product.style" class="pdp__spec">
              <dt class="serif-italic">Style</dt>
              <dd>{{ product.style }}</dd>
            </div>
            <div v-if="product.comCol" class="pdp__spec">
              <dt class="serif-italic">COM / COL</dt>
              <dd>{{ product.comCol }}</dd>
            </div>
            <div v-if="materials.length" class="pdp__spec">
              <dt class="serif-italic">Materiality</dt>
              <dd>
                <ul class="pdp__options">
                  <li v-for="material in materials" :key="material">{{ material }}</li>
                </ul>
              </dd>
            </div>
            <div v-if="product.dimensions" class="pdp__spec">
              <dt class="serif-italic">Dimensions</dt>
              <dd>{{ product.dimensions }}</dd>
            </div>
            <div class="pdp__spec pdp__spec--download">
              <dt class="serif-italic">Spec Sheet</dt>
              <dd>
                <button type="button" class="pdp__spec-download" @click="downloadSpec">
                  Download <span class="pdp__spec-download-arrow" aria-hidden="true">↓</span>
                </button>
              </dd>
            </div>
          </dl>

          <div
            v-if="product.description || product.edition"
            class="pdp__info-copy"
          >
            <p v-if="product.description" class="pdp__info-text">{{ product.description }}</p>
            <p v-if="product.edition" class="pdp__info-text">{{ product.edition }}</p>
          </div>

          <ul v-if="product.finishes?.length" class="pdp__finishes">
            <li v-for="finish in product.finishes" :key="finish">{{ finish }}</li>
          </ul>
        </div>

        <div v-if="nextProduct" class="pdp__next">
          <button type="button" class="pdp__next-label interface" @click="goToNext">
            Next Product
          </button>
          <button type="button" class="pdp__next-media" @click="goToNext">
            <img :src="nextImageUrl" :alt="nextProduct.title" />
          </button>
        </div>
      </div>
      <div class="pdp__actions">
        <button type="button" class="pdp__inquire" @click="sendEnquiry">Enquire</button>
      </div>
    </aside>

    <div class="pdp__col pdp__col--center">
      <div
        ref="stageRef"
        class="pdp__stage pdp__pane-fade"
        :class="{ 'pdp__pane-fade--out': !paneContentVisible }"
        @click="onStageClick"
      >
        <div
          v-if="galleryEntries.length"
          ref="stripRef"
          class="pdp__strip"
          data-lenis-prevent
        >
          <div ref="stripTrackRef" class="pdp__strip-track">
            <figure
              v-for="(entry, i) in galleryEntries"
              :key="entry.id"
              class="pdp__strip-item"
              :class="{ 'pdp__strip-item--active': i === selectedIndex }"
              :data-strip-index="i"
            >
              <div
                class="pdp__hero-frame"
                :class="{
                  'pdp__hero-frame--zoomed':
                    entry.kind === 'image' && i === selectedIndex && imageExpanded,
                  'pdp__hero-frame--ready': galleryReady[entry.id],
                }"
                :style="
                  galleryAspects[entry.id]
                    ? { '--pdp-ar': String(galleryAspects[entry.id]) }
                    : undefined
                "
              >
                <video
                  v-if="entry.kind === 'video'"
                  :ref="(el) => setStripVideoRef(i, el)"
                  class="pdp__hero-image pdp__hero-video"
                  :class="{
                    'pdp__hero-image--ready': galleryReady[entry.id],
                  }"
                  :src="entry.src"
                  :poster="entry.posterSrc || undefined"
                  muted
                  loop
                  playsinline
                  preload="metadata"
                  draggable="false"
                  @loadedmetadata="onStripVideoMeta(i, $event)"
                  @click.stop="selectImage(i)"
                />
                <img
                  v-else
                  :ref="(el) => setStripImageRef(i, el)"
                  :src="
                    i === selectedIndex && imageExpanded && frameZoomHiRes
                      ? entry.zoomSrc || entry.src
                      : entry.src
                  "
                  :alt="`${product.title} — image ${i + 1}`"
                  class="pdp__hero-image"
                  :class="{
                    'pdp__hero-image--zoomed': i === selectedIndex && imageExpanded,
                    'pdp__hero-image--ready': galleryReady[entry.id],
                  }"
                  :style="
                    i === selectedIndex && imageExpanded
                      ? {
                          transformOrigin: `${zoomOriginX}% ${zoomOriginY}%`,
                          transform: `scale(${FRAME_ZOOM_SCALE})`,
                        }
                      : undefined
                  "
                  draggable="false"
                  @load="onStripImageLoad(i)"
                  @click.stop="onStripImageClick(i)"
                />
                <AddButton
                  class="pdp__frame-add"
                  :active="isFrameSaved(i)"
                  :label="
                    isFrameSaved(i)
                      ? `Remove ${product.title} image ${i + 1} from selection`
                      : `Add ${product.title} image ${i + 1} to selection`
                  "
                  @click.stop="onAddFrame(i)"
                />
              </div>
            </figure>
          </div>
        </div>

        <p v-else class="pdp__gallery-empty interface">
          No images available.
        </p>

        <div
          v-if="spiritMode && spiritGalleryEntries.length"
          class="pdp__spirit-layer"
          aria-label="Spirit imagery"
        >
          <div class="pdp__spirit-tray" @click.stop>
            <template v-for="(entry, i) in spiritGalleryEntries" :key="entry.id">
              <video
                v-if="entry.kind === 'video'"
                class="pdp__spirit-media"
                :src="entry.src"
                :poster="entry.posterSrc || undefined"
                muted
                loop
                autoplay
                playsinline
                preload="metadata"
                draggable="false"
              />
              <img
                v-else
                class="pdp__spirit-media"
                :src="entry.src"
                :alt="`${product.title} — spirit ${i + 1}`"
                draggable="false"
              />
            </template>
          </div>
        </div>
      </div>
    </div>
  </article>

  <div v-else class="pdp pdp--missing">
    <h1 class="page-title">Item not found</h1>
    <button type="button" class="pdp__link  interface" @click="$emit('close')">Close</button>
  </div>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import Lenis from 'lenis'
import { IMAGE_WIDTH, prefetchImage } from '~/composables/useSanityImage'
import { productCoverFrame, productGalleryFrames } from '~/composables/productImages'
import {
  PRODUCT_OVERLAY_BACKDROP_CLOSE_EASE,
  PRODUCT_OVERLAY_BACKDROP_OPEN_MS,
  PRODUCT_OVERLAY_CHROME_EXIT_MS,
  PRODUCT_OVERLAY_CLOSE_FLYER_HOLD_MS,
  PRODUCT_OVERLAY_CLOSE_FLYER_FADE_MS,
  PRODUCT_OVERLAY_FLIP_CLOSE_S,
  PRODUCT_OVERLAY_FLIP_OPEN_S,
  PRODUCT_OVERLAY_FLYER_PAUSE_MS,
  PRODUCT_OVERLAY_FLYER_Z,
  PRODUCT_OVERLAY_UI_FADE_MS,
} from '~/composables/useProductOverlay'

const props = withDefaults(
  defineProps<{
    slug: string
    standalone?: boolean
  }>(),
  { standalone: false },
)

const emit = defineEmits<{
  close: []
  navigate: [slug: string]
}>()

const { fetchProduct, getNextProduct } = useProductCatalog()
const { imageUrl, fileUrl } = useSanityImage()
const { requestSave, isSaved } = useBucket()
const {
  close,
  finishClose,
  getFlipSource,
  getFlipImageUrl,
  clearPendingFlip,
  setBackdropReady,
  hideFlipSource,
  restoreFlipSource,
  waitForFlipOpenGate,
  pendingFlip,
  closingFlip,
  openImageIndex,
  setReturnImage,
  setCloseVeilActive,
} = useProductOverlay()
const { openFromProduct } = useEnquiryForm()

// Stable key so in-PDP nav never clears `product` (which would unmount the
// index rail and reset its scroll). Soft-swap assigns the next product in place.
const pdpDataKey = props.standalone ? 'product-detail-standalone' : 'product-detail-overlay'
const { data: product, refresh } = await useAsyncData(
  pdpDataKey,
  () => fetchProduct(props.slug),
  {
    watch: [() => props.slug],
    getCachedData(key, nuxtApp) {
      const cached =
        nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]
      // Only reuse cache when it matches the slug we're opening
      if (cached && (cached as { slug?: string }).slug === props.slug) {
        return cached
      }
      // Drop stale shared payload so soft-nav / remounts don't keep the previous product
      if (cached && nuxtApp.payload.data[key]) {
        delete nuxtApp.payload.data[key]
      }
      return undefined
    },
  },
)

const showInfo = ref(false)
const heroRef = ref<HTMLImageElement | null>(null)
const stageRef = ref<HTMLElement | null>(null)
const stripRef = ref<HTMLElement | null>(null)
const stripTrackRef = ref<HTMLElement | null>(null)
const contentReady = ref(false)
/** Shared with ProductIndexRail so open/close chrome stays in lockstep. */
const sidesVisible = useState('pdp-chrome-visible', () => false)
const galleryVisible = ref(false)
/** Fades left/center copy + gallery; column rules stay put */
const paneContentVisible = ref(true)
let slugSwapToken = 0
const flipStarted = ref(false)
const flipCloseStarted = ref(false)
const selectedIndex = ref(openImageIndex.value)
/** Shared with ProductIndexRail — gallery shows Spirit Imagery when true. */
const spiritMode = useState('pdp-spirit-mode', () => false)
/** Shared with ProductIndexRail — rail increments to request a Spirit toggle. */
const spiritToggleRequest = useState('pdp-spirit-toggle-req', () => 0)
/** In-frame gallery zoom (stays inside the image footprint) */
const imageExpanded = ref(false)
const frameZoomHiRes = ref(false)
const zoomOriginX = ref(50)
const zoomOriginY = ref(50)
const FRAME_ZOOM_SCALE = 2.5
let stripScrollRaf = 0
let frameZoomToken = 0
const stripVideoEls: (HTMLVideoElement | null)[] = []
const stripImageEls: (HTMLImageElement | null)[] = []

const setStripImageRef = (index: number, el: Element | null) => {
  stripImageEls[index] = el instanceof HTMLImageElement ? el : null
  if (el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0) {
    markGalleryImageReady(index, el)
  }
  if (index === selectedIndex.value && el instanceof HTMLImageElement) {
    heroRef.value = el
  }
}

const setStripVideoRef = (index: number, el: Element | null) => {
  stripVideoEls[index] = el instanceof HTMLVideoElement ? el : null
  if (el instanceof HTMLVideoElement && el.readyState >= 1) {
    markGalleryVideoReady(index, el)
  }
  syncStripVideos()
}

const onStripImageLoad = (index: number) => {
  markGalleryImageReady(index)
  if (index !== selectedIndex.value) return
  // Bind hero before Flip measures — ref callbacks can race the first paint
  const img = stripRef.value?.querySelector<HTMLImageElement>(
    `[data-strip-index="${index}"] .pdp__hero-image`,
  )
  if (img) heroRef.value = img
  if (!flipStarted.value) void runFlipOpen()
}

const onStripVideoMeta = (index: number, event: Event) => {
  const video = event.currentTarget as HTMLVideoElement | null
  markGalleryVideoReady(index, video)
  if (index === selectedIndex.value) syncStripVideos()
}

type GalleryEntry = {
  id: string
  kind: 'image' | 'video'
  /** PDP resting hero / video src */
  src: string
  /** Small gallery strip (images) */
  thumbSrc: string
  /** Expanded zoom (images) */
  zoomSrc: string
  /** Optional video poster */
  posterSrc?: string
}

const pushImageEntry = (
  entries: GalleryEntry[],
  seen: Set<string>,
  recordId: string,
  asset: { asset?: { url?: string; _id?: string } } | null | undefined,
) => {
  if (!asset) return
  const src = imageUrl(asset, IMAGE_WIDTH.hero)
  if (!src) return
  const key = src.replace(/\?.*$/, '')
  if (seen.has(key)) return
  seen.add(key)
  entries.push({
    id: `${recordId}-img-${entries.length}`,
    kind: 'image',
    src,
    thumbSrc: imageUrl(asset, IMAGE_WIDTH.strip) || src,
    zoomSrc: imageUrl(asset, IMAGE_WIDTH.zoom) || src,
  })
}

const buildProductGalleryEntries = (
  record: NonNullable<typeof product.value>,
): GalleryEntry[] => {
  const assets = productGalleryFrames(record)
  const seen = new Set<string>()
  const entries: GalleryEntry[] = []
  for (const asset of assets) {
    pushImageEntry(entries, seen, record._id, asset)
  }
  return entries
}

const buildSpiritGalleryEntries = (
  record: NonNullable<typeof product.value>,
): GalleryEntry[] => {
  const items = record.spiritGallery || []
  const seen = new Set<string>()
  const entries: GalleryEntry[] = []

  for (const item of items) {
    if (!item) continue
    if (item._type === 'spiritVideo' || ('file' in item && item.file)) {
      const video = item as {
        file?: { asset?: { url?: string; _id?: string } }
        poster?: { asset?: { url?: string; _id?: string } }
      }
      const src = fileUrl(video.file || null)
      if (!src) continue
      const key = src.replace(/\?.*$/, '')
      if (seen.has(key)) continue
      seen.add(key)
      const posterSrc = video.poster ? imageUrl(video.poster, 1000) : ''
      entries.push({
        id: `${record._id}-vid-${entries.length}`,
        kind: 'video',
        src,
        thumbSrc: posterSrc || src,
        zoomSrc: src,
        posterSrc: posterSrc || undefined,
      })
      continue
    }

    const asset = item as { asset?: { url?: string; _id?: string } }
    const src = imageUrl(asset, 1000)
    if (!src) continue
    const key = src.replace(/\?.*$/, '')
    if (seen.has(key)) continue
    seen.add(key)
    entries.push({
      id: `${record._id}-img-${entries.length}`,
      kind: 'image',
      src,
      thumbSrc: src,
      zoomSrc: src,
    })
  }

  return entries
}

const productGalleryEntries = computed((): GalleryEntry[] =>
  product.value ? buildProductGalleryEntries(product.value) : [],
)

const spiritGalleryEntries = computed((): GalleryEntry[] =>
  product.value ? buildSpiritGalleryEntries(product.value) : [],
)

const hasSpiritGallery = computed(() => spiritGalleryEntries.value.length > 0)

/** Product gallery only — Spirit imagery overlays separately when spiritMode is on. */
const galleryEntries = computed((): GalleryEntry[] => productGalleryEntries.value)

const toggleSpiritMode = () => {
  if (!hasSpiritGallery.value) return
  spiritMode.value = !spiritMode.value
}

watch(spiritToggleRequest, () => {
  if (!import.meta.client) return
  toggleSpiritMode()
})

/** Intrinsic width/height ratio — reserves strip width before paint. */
const galleryAspects = reactive<Record<string, number>>({})
/** True once the bitmap is decoded — drives fade-in. */
const galleryReady = reactive<Record<string, boolean>>({})

const loadGalleryImageMeta = (src: string) =>
  new Promise<{ w: number; h: number }>((resolve) => {
    if (!import.meta.client) {
      resolve({ w: 0, h: 0 })
      return
    }
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve({ w: 0, h: 0 })
    img.src = src
  })

/** Prefetch + measure the first frames so soft-swaps don't reflow the strip. */
const prepareGalleryEntries = async (entries: GalleryEntry[], limit = 3) => {
  if (!import.meta.client || !entries.length) return
  const slice = entries.slice(0, Math.min(limit, entries.length))
  await Promise.all(
    slice.map(async (entry) => {
      if (entry.kind === 'video') {
        galleryReady[entry.id] = true
        return
      }
      const { w, h } = await loadGalleryImageMeta(entry.src)
      if (w > 0 && h > 0) galleryAspects[entry.id] = w / h
      galleryReady[entry.id] = true
    }),
  )
  for (const entry of entries.slice(limit)) {
    if (entry.kind === 'image') void prefetchImage(entry.src)
  }
}

const markGalleryImageReady = (index: number, img?: HTMLImageElement | null) => {
  const entry = galleryEntries.value[index]
  if (!entry || entry.kind !== 'image') return
  const node =
    img ||
    stripRef.value?.querySelector<HTMLImageElement>(
      `[data-strip-index="${index}"] .pdp__hero-image`,
    )
  if (node?.naturalWidth && node.naturalHeight) {
    galleryAspects[entry.id] = node.naturalWidth / node.naturalHeight
  }
  galleryReady[entry.id] = true
}

const markGalleryVideoReady = (index: number, video?: HTMLVideoElement | null) => {
  const entry = galleryEntries.value[index]
  if (!entry || entry.kind !== 'video') return
  if (video?.videoWidth && video.videoHeight) {
    galleryAspects[entry.id] = video.videoWidth / video.videoHeight
  }
  galleryReady[entry.id] = true
}

const syncStripVideos = () => {
  if (!import.meta.client) return
  stripVideoEls.forEach((video, index) => {
    if (!video) return
    if (index === selectedIndex.value && galleryEntries.value[index]?.kind === 'video') {
      void video.play().catch(() => {})
    } else {
      video.pause()
    }
  })
}

const activeEntry = computed(
  () => galleryEntries.value[selectedIndex.value] || galleryEntries.value[0] || null,
)

// Prefetch the full gallery once the PDP is open so thumb clicks aren't cold
watch(
  [galleryEntries, contentReady],
  ([entries, ready]) => {
    if (!ready || !entries.length) return
    for (const entry of entries) {
      if (entry.kind === 'image') void prefetchImage(entry.src)
    }
    // Active zoom first; remaining zoom tiers after heroes have a head start
    const active = entries[selectedIndex.value] || entries[0]
    if (active?.kind === 'image' && active.zoomSrc) void prefetchImage(active.zoomSrc)
    if (!import.meta.client) return
    window.setTimeout(() => {
      for (const entry of entries) {
        if (entry.kind === 'image' && entry.zoomSrc) void prefetchImage(entry.zoomSrc)
      }
    }, 500)
  },
)

watch(galleryEntries, (entries) => {
  if (!entries.length) {
    selectedIndex.value = 0
    return
  }
  if (selectedIndex.value >= entries.length) selectedIndex.value = 0
  // Soft-swap prepares ahead of time; hard-load / late mounts still warm the first frames
  if (import.meta.client && entries.slice(0, 3).some((e) => !galleryReady[e.id])) {
    void prepareGalleryEntries(entries, 3)
  }
  nextTick(syncStripVideos)
})

watch(selectedIndex, () => {
  nextTick(syncStripVideos)
})

const selectImage = (index: number) => {
  if (index < 0 || index >= galleryEntries.value.length) return
  selectedIndex.value = index
  collapseImage()
  nextTick(() => {
    const strip = stripRef.value
    const media = strip?.querySelector<HTMLElement>(
      `[data-strip-index="${index}"] .pdp__hero-image`,
    )
    if (media instanceof HTMLImageElement) heroRef.value = media
    scrollSelectedIntoView(true)
    syncStripVideos()
  })
}

const cycleImage = (direction: 1 | -1) => {
  const count = galleryEntries.value.length
  if (count < 2) return
  selectImage((selectedIndex.value + direction + count) % count)
}

/** Strip padding clears the index / related rails — center in that open span. */
const getStripRailPads = (strip: HTMLElement) => {
  const track = stripTrackRef.value
  const style = getComputedStyle(track ?? strip)
  return {
    left: Number.parseFloat(style.paddingLeft) || 0,
    right: Number.parseFloat(style.paddingRight) || 0,
  }
}

/**
 * Center the active frame in the clear span between rail paddings.
 * Wide frames that can't fit are pinned flush to the start of that span
 * so they never sit under the index rail.
 */
const scrollSelectedIntoView = (smooth = false) => {
  const strip = stripRef.value
  if (!strip) return
  const item = strip.querySelector<HTMLElement>(
    `[data-strip-index="${selectedIndex.value}"]`,
  )
  if (!item) return
  const { left: padL, right: padR } = getStripRailPads(strip)
  const visible = Math.max(0, strip.clientWidth - padL - padR)
  const ideal = item.offsetLeft + item.offsetWidth / 2 - padL - visible / 2
  // Keep the frame's left edge at or past the index padding; right edge
  // at or before the related padding when the frame fits.
  const maxLeftClear = Math.max(0, item.offsetLeft - padL)
  const minRightClear = Math.max(
    0,
    item.offsetLeft + item.offsetWidth - padL - visible,
  )
  const target =
    minRightClear > maxLeftClear
      ? maxLeftClear
      : Math.min(Math.max(ideal, minRightClear), maxLeftClear)
  setStripScroll(target, { immediate: !smooth })
}

/** First frame: flush after index padding. Later frames: center in the clear span. */
const scrollGalleryInitial = () => {
  if (selectedIndex.value === 0) {
    setStripScroll(0, { immediate: true })
    return
  }
  scrollSelectedIntoView(false)
}

const syncSelectedFromScroll = () => {
  const strip = stripRef.value
  if (!strip || !galleryEntries.value.length) return
  const { left: padL, right: padR } = getStripRailPads(strip)
  const visible = Math.max(0, strip.clientWidth - padL - padR)
  const focusX = getStripScroll() + padL + visible / 2
  let best = 0
  let bestDist = Infinity
  strip.querySelectorAll<HTMLElement>('[data-strip-index]').forEach((el) => {
    const index = Number(el.dataset.stripIndex)
    if (!Number.isFinite(index)) return
    const center = el.offsetLeft + el.offsetWidth / 2
    const dist = Math.abs(center - focusX)
    if (dist < bestDist) {
      bestDist = dist
      best = index
    }
  })
  if (best !== selectedIndex.value) {
    selectedIndex.value = best
    collapseImage()
    const media = strip.querySelector<HTMLElement>(
      `[data-strip-index="${best}"] .pdp__hero-image`,
    )
    if (media instanceof HTMLImageElement) heroRef.value = media
  }
}

const onStripScroll = () => {
  if (stripScrollRaf) cancelAnimationFrame(stripScrollRaf)
  stripScrollRaf = requestAnimationFrame(() => {
    stripScrollRaf = 0
    syncSelectedFromScroll()
  })
}

let galleryLenis: Lenis | null = null
let galleryLenisRaf = 0

const getStripScroll = () =>
  galleryLenis?.animatedScroll ?? stripRef.value?.scrollLeft ?? 0

const setStripScroll = (
  left: number,
  { immediate = true }: { immediate?: boolean } = {},
) => {
  if (galleryLenis) {
    galleryLenis.scrollTo(left, immediate ? { immediate: true } : { lerp: 0.12 })
    return
  }
  stripRef.value?.scrollTo({
    left,
    behavior: immediate ? 'auto' : 'smooth',
  })
}

const destroyGalleryLenis = () => {
  if (galleryLenisRaf) {
    cancelAnimationFrame(galleryLenisRaf)
    galleryLenisRaf = 0
  }
  galleryLenis?.destroy()
  galleryLenis = null
}

const tickGalleryLenis = (time: number) => {
  galleryLenis?.raf(time)
  galleryLenisRaf = requestAnimationFrame(tickGalleryLenis)
}

const initGalleryLenis = () => {
  if (!import.meta.client) return
  const wrapper = stripRef.value
  const content = stripTrackRef.value
  const stage = stageRef.value
  if (!wrapper || !content) return

  destroyGalleryLenis()

  galleryLenis = new Lenis({
    wrapper,
    content,
    eventsTarget: stage ?? wrapper,
    orientation: 'horizontal',
    gestureOrientation: 'both',
    smoothWheel: true,
    syncTouch: true,
    syncTouchLerp: 0.055,
    touchInertiaExponent: 2.05,
    touchMultiplier: 1.4,
    wheelMultiplier: 1.15,
    lerp: 0.08,
    overscroll: false,
    // Strip keeps data-lenis-prevent for the page scroller; don't self-block.
    prevent: () => false,
  })

  galleryLenis.on('scroll', onStripScroll)
  galleryLenis.resize()
  if (imageExpanded.value) galleryLenis.stop()
  galleryLenisRaf = requestAnimationFrame(tickGalleryLenis)
}

const resizeGalleryLenis = () => {
  galleryLenis?.resize()
}

watch(imageExpanded, (expanded) => {
  if (!galleryLenis) return
  if (expanded) galleryLenis.stop()
  else galleryLenis.start()
})

watch(
  () => galleryEntries.value.map((entry) => entry.id).join('|'),
  async () => {
    await nextTick()
    if (!stripRef.value || !stripTrackRef.value) {
      destroyGalleryLenis()
      return
    }
    if (!galleryLenis) initGalleryLenis()
    else resizeGalleryLenis()
  },
)

let wheelUnlockTimer: ReturnType<typeof setTimeout> | null = null

const collapseImage = () => {
  frameZoomToken += 1
  imageExpanded.value = false
  frameZoomHiRes.value = false
}

const onStripImageClick = (index: number) => {
  if (index !== selectedIndex.value) selectImage(index)
}

/** Close PDP when clicking empty stage chrome (not the image / thumbs / controls). */
const onStageClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null
  if (!target) return
  // Dismiss on letterbox / stage chrome only — not the gallery strip, images, or controls
  if (target.closest('.pdp__hero-image, .pdp__strip, .pdp__strip-item, button, a')) return
  emit('close')
}

const onGalleryKeydown = (event: KeyboardEvent) => {
  if (galleryEntries.value.length < 2) return
  if (event.metaKey || event.ctrlKey || event.altKey) return
  const target = event.target as HTMLElement | null
  if (target?.closest?.('input, textarea, select, [contenteditable="true"]')) return

  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    event.preventDefault()
    cycleImage(1)
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    event.preventDefault()
    cycleImage(-1)
  }
}

onMounted(() => {
  nextTick(() => {
    initGalleryLenis()
    scrollGalleryInitial()
    if (heroRef.value?.complete) void runFlipOpen()
    else if (!activeEntry.value) revealWithoutFlip()
  })
  window.addEventListener('keydown', onGalleryKeydown)
})

onUnmounted(() => {
  destroyGalleryLenis()
  window.removeEventListener('keydown', onGalleryKeydown)
  if (wheelUnlockTimer) clearTimeout(wheelUnlockTimer)
  if (stripScrollRaf) cancelAnimationFrame(stripScrollRaf)
})

const materials = computed(() =>
  [...(product.value?.materials || product.value?.categories || [])]
    .filter(Boolean)
    .map((m) => m.charAt(0).toUpperCase() + m.slice(1)),
)

/** Shared with ProductIndexRail — drives gallery left padding. */
const indexRailVisible = useCookie<boolean>('sba-pdp-index-rail', {
  default: () => true,
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
})

/** Shared with ProductIndexRail — session-only (not cookie). */
const { relatedRailVisible } = usePdpRelatedRail()

watch([indexRailVisible, relatedRailVisible], async () => {
  await nextTick()
  resizeGalleryLenis()
  // Pads animate via html @property — refresh limits after the tween.
  window.setTimeout(() => resizeGalleryLenis(), 360)
})

const nextProduct = computed(() => (product.value ? getNextProduct(product.value.slug) : null))
const nextImageUrl = computed(() => {
  if (!nextProduct.value) return ''
  const cover = productCoverFrame(nextProduct.value)
  return cover ? imageUrl(cover, IMAGE_WIDTH.thumb) : ''
})

const goToNext = () => {
  if (nextProduct.value) emit('navigate', nextProduct.value.slug)
}

const isFrameSaved = (index: number) =>
  product.value ? isSaved(product.value._id, index) : false

/** Add / remove a specific gallery frame. */
const onAddFrame = (index: number) => {
  if (!product.value) return
  const entry = galleryEntries.value[index]
  if (!entry?.src) return
  const imageUrls = galleryEntries.value.map((item) => item.src).filter(Boolean)
  const source =
    stripImageEls[index] ||
    (stripVideoEls[index] as HTMLElement | null) ||
    heroRef.value
  requestSave(
    {
      id: product.value._id,
      title: product.value.title,
      imageUrl: entry.src,
      imageUrls,
      imageIndex: index,
      itemType: product.value.series || 'item',
      link: `/materials-and-forms/${product.value.slug}`,
    },
    { source },
  )
}

const sendEnquiry = () => {
  if (!product.value) return
  const cover = productCoverFrame(product.value)
  const image =
    activeEntry.value?.src || (cover ? imageUrl(cover, 900) : undefined) || undefined
  openFromProduct({
    id: product.value._id,
    title: product.value.title,
    imageUrl: image,
    slug: product.value.slug,
  })
}

const downloadSpec = () => {
  if (!product.value) return
  const lines = [
    `Studio Based Upon — ${product.value.title}`,
    '',
    product.value.series ? `Series: ${product.value.series}` : '',
    product.value.style ? `Style: ${product.value.style}` : '',
    product.value.dimensions ? `Dimensions: ${product.value.dimensions}` : '',
    product.value.comCol ? `COM / COL: ${product.value.comCol}` : '',
    materials.value.length ? `Materiality: ${materials.value.join(', ')}` : '',
    product.value.finishes?.length ? `Finishes: ${product.value.finishes.join(', ')}` : '',
    '',
    product.value.description || '',
    product.value.edition || '',
  ].filter(Boolean)

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${product.value.slug}-spec.txt`
  a.click()
  URL.revokeObjectURL(url)
}

const revealWithoutFlip = () => {
  restoreFlipSource()
  setBackdropReady(true)
  clearPendingFlip()
  contentReady.value = true
  sidesVisible.value = true
  galleryVisible.value = true
  // Clear any Flip-prep visibility hides if we bailed early
  stripRef.value
    ?.querySelectorAll<HTMLElement>('.pdp__hero-image')
    .forEach((img) => {
      gsap.set(img, { clearProps: 'visibility' })
    })
  nextTick(() => scrollGalleryInitial())
}

const waitForImage = (img: HTMLImageElement) => {
  if (img.complete && img.naturalWidth > 0) return Promise.resolve()
  return new Promise<void>((resolve) => {
    img.addEventListener('load', () => resolve(), { once: true })
    img.addEventListener('error', () => resolve(), { once: true })
  })
}

const runFlipOpen = async () => {
  if (flipStarted.value || !import.meta.client) return
  flipStarted.value = true

  const source = getFlipSource()
  const hero = heroRef.value
  // Cart fade prelude (if any) runs in parallel with image prep
  const gateP = waitForFlipOpenGate()

  if (!source || !hero) {
    await gateP
    revealWithoutFlip()
    return
  }

  // Source is already locked at hover look from open() — keep it through load
  source.style.transition = 'none'
  source.style.opacity = '1'
  source.style.filter = 'grayscale(0)'

  await waitForImage(hero)
  await nextTick()
  // Let flex layout resolve real image boxes before Flip measures
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
  scrollGalleryInitial()
  await nextTick()
  // Re-bind in case the strip shifted the active image node
  const stripHero = stripRef.value?.querySelector<HTMLImageElement>(
    `[data-strip-index="${selectedIndex.value}"] .pdp__hero-image`,
  )
  if (stripHero) heroRef.value = stripHero
  const flipHero = heroRef.value || hero

  // Hide hero first so we don't flash the final size before Flip
  gsap.set(flipHero, { visibility: 'hidden' })
  await nextTick()
  void flipHero.offsetWidth

  // Prefer prefetched hero-tier URL so Flip scales a sharp bitmap, not the grid thumb
  const flipSrc =
    getFlipImageUrl() ||
    flipHero.currentSrc ||
    flipHero.src ||
    (source as HTMLImageElement).currentSrc ||
    (source as HTMLImageElement).src

  // Decode flyer before hiding the source — keeps the grid thumb visible at full opacity
  const flyer = document.createElement('img')
  flyer.src = flipSrc
  flyer.alt = ''
  flyer.setAttribute('aria-hidden', 'true')
  // Prep flyer while cart items/grid/info finish fading
  await Promise.all([
    flyer.complete ? Promise.resolve() : waitForImage(flyer),
    gateP,
  ])

  const from = source.getBoundingClientRect()
  const to = flipHero.getBoundingClientRect()

  if (from.width < 2 || to.width < 2) {
    gsap.set(flipHero, { visibility: 'visible' })
    flyer.remove()
    revealWithoutFlip()
    return
  }

  const sourceFit = getComputedStyle(source).objectFit || 'cover'
  Object.assign(flyer.style, {
    position: 'fixed',
    top: `${from.top}px`,
    left: `${from.left}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: '0',
    // Keep cover through the flight so the square crop opens into the
    // natural frame instead of stretching via Flip scaleX/scaleY.
    objectFit: sourceFit,
    zIndex: String(PRODUCT_OVERLAY_FLYER_Z),
    pointerEvents: 'none',
    borderRadius: getComputedStyle(source).borderRadius,
    opacity: '1',
  })
  document.body.appendChild(flyer)

  // Cover with flyer, then hide source — no blank frame / no hover-opacity dip
  hideFlipSource(source)

  // Backdrop fades in → hold → flyer scales → PDP UI
  const waitMs = (ms: number) =>
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms)
    })

  setBackdropReady(true)
  await nextTick()
  await waitMs(PRODUCT_OVERLAY_BACKDROP_OPEN_MS)
  await waitMs(PRODUCT_OVERLAY_FLYER_PAUSE_MS)

  // Re-measure hero in case layout settled during the fade
  const toAfter = flipHero.getBoundingClientRect()
  const dest = toAfter.width >= 2 ? toAfter : to

  const state = Flip.getState(flyer)

  gsap.set(flyer, {
    top: dest.top,
    left: dest.left,
    width: dest.width,
    height: dest.height,
    borderRadius: '0px',
  })

  // Animate width/height (not scale) so the bitmap isn’t stretched — the
  // cover crop simply reveals more of the image as the box finds its ratio.
  Flip.from(state, {
    duration: PRODUCT_OVERLAY_FLIP_OPEN_S,
    ease: 'power2.inOut',
    absolute: true,
    scale: false,
    onComplete: () => {
      // Reveal strip + hero under the flyer before removing it — avoids a
      // blank frame and prevents the gallery from flashing ahead of Flip.
      gsap.set(flipHero, { visibility: 'visible' })
      clearPendingFlip()
      contentReady.value = true
      sidesVisible.value = true
      galleryVisible.value = true
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          flyer.remove()
        })
      })
    },
  })
}

const runFlipClose = async () => {
  if (!import.meta.client || flipCloseStarted.value) return
  flipCloseStarted.value = true

  const source = getFlipSource()
  const hero = heroRef.value

  if (!source || !hero || !document.contains(source) || !product.value) {
    finishClose()
    return
  }

  const FLYER_HOLD_MS = PRODUCT_OVERLAY_CLOSE_FLYER_HOLD_MS
  const FLYER_FADE_MS = PRODUCT_OVERLAY_CLOSE_FLYER_FADE_MS
  const waitMs = (ms: number) =>
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms)
    })

  // 1) Chrome exits first (index + aside slide left, siblings fade) while the
  // active hero stays put for the flyer. Keep sidesVisible so opacity chrome
  // doesn’t kill the translate mid-flight.
  const uiFadeStarted = performance.now()
  await nextTick()

  // Prep return thumb while chrome is exiting (under the solid backdrop)
  setReturnImage(product.value._id, selectedIndex.value)
  await nextTick()
  await nextTick()
  if (source instanceof HTMLImageElement) {
    await waitForImage(source)
  }
  // Let GridItem commitHeight → bottom-anchor → ProductGrid shift entry.y
  // before capturing the Flip destination (otherwise the tile stays top-anchored).
  await nextTick()
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })

  const chromeElapsed = performance.now() - uiFadeStarted
  await waitMs(Math.max(0, PRODUCT_OVERLAY_CHROME_EXIT_MS - chromeElapsed))

  contentReady.value = false
  sidesVisible.value = false
  await nextTick()
  await waitMs(PRODUCT_OVERLAY_UI_FADE_MS)

  // Panel cream can drop now that chrome is gone
  pendingFlip.value = true
  await nextTick()

  const from = hero.getBoundingClientRect()
  const to = source.getBoundingClientRect()

  /** Non-interactive cream veil so we can unmount the overlay (clicks work) while fading */
  const spawnCloseVeil = () => {
    const veil = document.createElement('div')
    veil.setAttribute('data-pdp-close-veil', '')
    const bg =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--background-color')
        .trim() || getComputedStyle(document.body).backgroundColor
    Object.assign(veil.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '319',
      background: bg,
      opacity: '1',
      pointerEvents: 'none',
      // Transition applied when the shared hold ends — stay solid until then
      transition: 'none',
    })
    document.body.appendChild(veil)
    // Rail drops out of its above-PDP layer on unmount — hold it above the cream
    setCloseVeilActive(true)
    return veil
  }

  /**
   * Hold cream solid while the flyer sits on the thumb, then fade it away.
   * The flyer stays opaque throughout and is only removed once this is done.
   */
  const fadeVeilAndCleanup = (veil: HTMLElement) => {
    window.setTimeout(() => {
      veil.style.transition = `opacity ${FLYER_FADE_MS}ms ${PRODUCT_OVERLAY_BACKDROP_CLOSE_EASE}`
      requestAnimationFrame(() => {
        veil.style.opacity = '0'
      })
      window.setTimeout(() => {
        veil.remove()
        setCloseVeilActive(false)
      }, FLYER_FADE_MS + 32)
    }, FLYER_HOLD_MS)
  }

  /**
   * Stay opaque over the cream, then swap to the restored thumb underneath.
   * Fading the flyer instead let the veil show through it, washing the
   * thumbnail with cream mid-fade. Drops early only if the grid scrolls.
   */
  const dismissFlyer = (flyer: HTMLElement) => {
    const scrollInputs = ['wheel', 'touchmove', 'scroll'] as const
    let timer = 0
    let dropped = false

    const drop = () => {
      if (dropped) return
      dropped = true
      window.clearTimeout(timer)
      scrollInputs.forEach((type) => window.removeEventListener(type, drop, true))
      flyer.remove()
    }

    scrollInputs.forEach((type) =>
      window.addEventListener(type, drop, { capture: true, passive: true }),
    )

    // Outlast the veil by a frame or two — swapping early would flash cream
    timer = window.setTimeout(drop, FLYER_HOLD_MS + FLYER_FADE_MS + 80)
  }

  if (from.width < 2 || to.width < 2) {
    const veil = spawnCloseVeil()
    finishClose()
    fadeVeilAndCleanup(veil)
    return
  }

  gsap.set(hero, { visibility: 'hidden' })
  hideFlipSource(source)

  const flyer = document.createElement('img')
  flyer.src = hero.currentSrc || hero.src
  flyer.alt = ''
  flyer.setAttribute('aria-hidden', 'true')
  flyer.setAttribute('data-pdp-close-flyer', '')
  const heroFit = getComputedStyle(hero).objectFit || 'contain'
  const sourceFit = getComputedStyle(source).objectFit || 'cover'
  Object.assign(flyer.style, {
    position: 'fixed',
    top: `${from.top}px`,
    left: `${from.left}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: '0',
    objectFit: heroFit,
    zIndex: String(PRODUCT_OVERLAY_FLYER_Z),
    pointerEvents: 'none',
    borderRadius: '0px',
  })
  document.body.appendChild(flyer)
  if (!flyer.complete) await waitForImage(flyer)

  // 2) Flyer returns to the grid thumb
  const state = Flip.getState(flyer)

  gsap.set(flyer, {
    top: to.top,
    left: to.left,
    width: to.width,
    height: to.height,
    borderRadius: getComputedStyle(source).borderRadius,
    objectFit: sourceFit,
  })

  Flip.from(state, {
    duration: PRODUCT_OVERLAY_FLIP_CLOSE_S,
    ease: 'power2.inOut',
    onComplete: () => {
      // Restore thumb under the flyer, then unmount the overlay immediately.
      // A body-level veil (pointer-events: none) continues the cream fade so
      // the grid is clickable while it dissolves — the overlay shell was
      // blocking hits even at opacity 0.
      source.style.transition = 'none'
      source.style.visibility = ''
      source.style.opacity = '1'
      source.style.filter = 'grayscale(0)'
      const veil = spawnCloseVeil()
      finishClose()
      fadeVeilAndCleanup(veil)
      dismissFlyer(flyer)
    },
  })
}

const onHeroLoad = () => {
  if (!flipStarted.value) void runFlipOpen()
}

watch(closingFlip, (closing) => {
  if (closing) void runFlipClose()
})

const applyProduct = (next: NonNullable<typeof product.value>) => {
  product.value = next
  useNuxtApp().payload.data[pdpDataKey] = next
}

/** Keep `product` in lockstep with the route/overlay slug (soft-swap in place). */
watch(
  () => props.slug,
  async (slug, prevSlug) => {
    if (!slug || slug === prevSlug) return

    showInfo.value = false
    collapseImage()

    const token = ++slugSwapToken
    const alreadyOpen = contentReady.value || sidesVisible.value || flipStarted.value

    if (alreadyOpen) {
      flipStarted.value = true
      flipCloseStarted.value = false
      paneContentVisible.value = true
      galleryVisible.value = true

      const next = await fetchProduct(slug)
      if (token !== slugSwapToken) return
      if (!next) return

      const nextEntries = buildProductGalleryEntries(next)
      await prepareGalleryEntries(nextEntries, 3)
      if (token !== slugSwapToken) return

      // Hold the outgoing gallery scroll until the new product is committed.
      // Resetting selectedIndex / scrollLeft earlier scrolls the *current* strip.
      spiritMode.value = false
      applyProduct(next)
      selectedIndex.value = 0

      await nextTick()
      if (token !== slugSwapToken) return
      setStripScroll(0, { immediate: true })
      resizeGalleryLenis()

      const hero = heroRef.value
      if (hero && !hero.complete) await waitForImage(hero)
      if (token !== slugSwapToken) return

      galleryVisible.value = true
      setStripScroll(0, { immediate: true })
      return
    }

    spiritMode.value = false
    galleryVisible.value = false
    flipStarted.value = false
    flipCloseStarted.value = false
    contentReady.value = false
    sidesVisible.value = false
    paneContentVisible.value = true
    selectedIndex.value = openImageIndex.value
    await refresh()
    await nextTick()
    if (heroRef.value?.complete) void runFlipOpen()
  },
)

/** If remount/cache leaves the wrong product for this slug, force a resync. */
watch(
  () => [props.slug, product.value?.slug] as const,
  async ([slug, productSlug]) => {
    if (!import.meta.client || !slug) return
    if (productSlug === slug) return
    // In-place nav is owned by the slug soft-swap watcher above
    if (contentReady.value || sidesVisible.value || flipStarted.value) return

    const token = ++slugSwapToken
    const next = await fetchProduct(slug)
    if (token !== slugSwapToken || !next) return
    await prepareGalleryEntries(buildProductGalleryEntries(next), 3)
    if (token !== slugSwapToken) return
    spiritMode.value = false
    applyProduct(next)
    selectedIndex.value = 0
    await nextTick()
    setStripScroll(0, { immediate: true })
    resizeGalleryLenis()
    galleryVisible.value = true
  },
  { immediate: true },
)
</script>

<style scoped>
.pdp {
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  /* Full viewport — overlay sits above the cart, so don't shrink for --bucket-push */
  height: 100dvh;
  background: transparent;
  transition: background var(--theme-ms) var(--theme-ease);
  --index-tabs-height: 2.25rem;
  --index-rail-width: var(--pdp-rail-open-width);
  --index-motion: var(--pdp-rail-motion);
  /* Always dark UI — independent of site theme (also covers standalone PDP) */
  color-scheme: dark;
  --cream: #1a1a1a;
  --warm-white: #1f1c18;
  --sand: #2a2621;
  --stone: #6b635a;
  --charcoal: #f1ede4;
  --black: #faf7f2;
  --slate: #c8c0b6;
  --accent: #c4a574;
  --grid-line: rgba(255, 255, 255, 0.1);
  --handwritten-color: var(--charcoal);
  --ui-border-color: rgba(255, 255, 255, 0.14);
  --panel-bg: rgba(31, 28, 24, 0.88);
  --elevated-bg: #2a2621;
  --shadow-color: rgba(0, 0, 0, 0.45);
  --thumb-ctrl-color: var(--charcoal);
  --thumb-ctrl-bg: var(--cream);
  --text-color: var(--charcoal);
  --background-color: var(--cream);
}

.pdp--no-related {
  grid-template-columns: 1fr;
}

.pdp--ready {
  background: var(--cream);
}

.pdp--standalone {
  height: 100dvh;
}

.pdp--missing {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 4rem var(--gutter);
}

.pdp__col {
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.pdp__col--left,
.pdp__col--right {
  opacity: 0;
  transition:
    opacity 0.2s cubic-bezier(0.22, 1, 0.36, 1),
    transform var(--pdp-rail-motion, 0.35s linear);
  /* Side columns are not dismiss targets — never inherit the stage close cursor */
  cursor: auto;
}

.pdp--sides .pdp__col--left,
.pdp--sides .pdp__col--right {
  opacity: 1;
}

.pdp__col--left {
  --grid-line: rgba(255, 255, 255, 0.25);
  position: absolute;
  top: 0;
  left: 0;
  right: auto;
  bottom: unset;
  z-index: 120;
  width: var(--index-rail-width);
  height: auto;
  max-height: 100%;
  min-height: 0;
  border: 0 solid var(--grid-line);
  /* border-radius: 30px; */
  corner-shape: squircle;
  background: color-mix(in srgb, var(--cream) 70%, transparent);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  box-sizing: border-box;
  transform: translateX(0);
}

/* Close: aside slides off left before the flyer / backdrop */
.pdp--closing.pdp--sides .pdp__col--left {
  opacity: 0;
  transform: translateX(calc(-100% - 12px));
  pointer-events: none;
}

.pdp__col--right {
  border-left: 1px solid var(--grid-line);
  overflow: hidden;
}

.pdp__col--center {
  /* Full-bleed gallery — floating aside sits over it */
  grid-column: 1 / -1;
  grid-row: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  align-items: stretch;
  align-self: stretch;
  height: 100%;
  min-height: 0;
  z-index: 1;
}

.pdp:not(.pdp--no-related) .pdp__col--right {
  grid-column: 3;
  grid-row: 1;
  z-index: 4;
}

/* Soft product swaps: fade content, not the column shells / rules */
.pdp__pane-fade {
  transition: opacity 0.22s ease;
  opacity: 1;
}

.pdp__pane-fade--out {
  opacity: 0;
  pointer-events: none;
}

.pdp__stage {
  flex: 1;
  min-height: 0;
  width: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 0;
  box-sizing: border-box;
  overscroll-behavior: contain;
  cursor: auto;
  position: relative;
}

.pdp__spirit-layer {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.pdp__spirit-tray {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0rem;
  max-width: 100%;
  pointer-events: auto;
}

.pdp__spirit-media {
  display: block;
  width: auto;
  height: auto;
  max-width: 20vw;
  max-height: 20vw;
  object-fit: cover;
  aspect-ratio: 0.675;
}

.pdp__strip-item .pdp__hero-video {
  background: var(--charcoal);
  object-fit: contain;
  pointer-events: auto;
}

.pdp__strip {
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  /* Don't inherit the stage close cursor into image gaps / strip chrome */
  cursor: auto;
}

.pdp__strip-track {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 1px;
  height: 100%;
  width: max-content;
  min-height: 100%;
  box-sizing: border-box;
  /* Insets follow html @property tokens — same values that slide the rails */
  padding-left: var(--pdp-index-rail-width);
  padding-right: var(--pdp-related-rail-width);
  padding-top: 0;
  padding-bottom: 0;
}

.pdp__strip::-webkit-scrollbar {
  display: none;
}

.pdp__strip-item {
  position: relative;
  margin: 0;
  flex: 0 0 auto;
  height: 100%;
  max-height: 100%;
  display: flex;
  align-items: stretch;
  justify-content: center;
  opacity: 1;
}

/* Hide the whole strip (including the active frame) until Flip lands —
   otherwise the first gallery image flashes at full size before the flyer. */
.pdp:not(.pdp--gallery) .pdp__strip-item {
  opacity: 0;
  pointer-events: none;
  transition: none;
}

/* Sibling frames fade in after open; active snaps under the flyer */
.pdp--gallery .pdp__strip-item:not(.pdp__strip-item--active) {
  transition: opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Close: other gallery frames fade before the flyer / backdrop */
.pdp--closing .pdp__strip-item:not(.pdp__strip-item--active) {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.28s ease;
}

.pdp__strip-item .pdp__hero-frame {
  position: relative;
  height: 100%;
  max-height: 100%;
  /* Reserve width from intrinsic ratio so the strip doesn't reflow on decode */
  aspect-ratio: var(--pdp-ar, 1);
  width: auto;
  flex: 0 0 auto;
  display: flex;
  align-items: stretch;
  line-height: 0;
  overflow: hidden;
  background: transparent;
  /* Hide the reserved frame until the bitmap is ready — no placeholder wash */
  visibility: hidden;
}

.pdp__strip-item .pdp__hero-frame--ready {
  visibility: visible;
}

.pdp__frame-add {
  position: absolute;
  top: var(--thumb-ctrl-inset, 4px);
  right: var(--thumb-ctrl-inset, 4px);
  z-index: 3;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.35s ease;
}

/* Match hero fade — don’t flash the heart over an empty/transparent frame */
.pdp__hero-frame--ready .pdp__frame-add {
  opacity: 1;
  pointer-events: auto;
}

.pdp__frame-add :deep(.add-btn__icon) {
  background: transparent;
}

.pdp__strip-item .pdp__hero-image {
  display: block;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: 100%;
  object-fit: contain;
  cursor: auto;
  transform-origin: center center;
  will-change: transform;
  opacity: 0;
  transition: opacity 0.35s ease;
}

.pdp__strip-item .pdp__hero-image--ready {
  opacity: 1;
}

.pdp__strip-item .pdp__hero-image--zoomed {
  cursor: auto;
}

/* Close cross only after the open flyer has finished — dark UI cursor */
.pdp--ready .pdp__stage {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='25' height='25' viewBox='0 0 25 25'%3E%3Crect x='0.5' y='0.5' width='24' height='24' fill='%232a2621' stroke='%23f2ecdf'/%3E%3Cpath d='M7.5 7.5l10 10M17.5 7.5l-10 10' stroke='%23f2ecdf' stroke-width='1'/%3E%3C/svg%3E") 12 12, pointer;
}

.pdp__hero {
  position: relative;
  margin: 0;
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%;
  max-height: 100%;
  display: grid;
  place-items: center;
  padding: 0;
  background: transparent;
  container-type: size;
}

/* Shrink-wraps to the contained image so letterbox keeps the stage close cursor */
.pdp__hero-frame {
  position: relative;
  max-width: 100%;
  max-height: 100%;
  width: fit-content;
  height: fit-content;
  line-height: 0;
}

.pdp__hero-image {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  cursor: auto;
  will-change: transform;
}

.pdp__thumbs {
  position: absolute;
  left: 50%;
  bottom: var(--thumb-ctrl-inset, 4px);
  z-index: 3;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  max-width: calc(100% - 2rem);
  padding: 0.35rem;
  transform: translateX(-50%) translateY(0.75rem);
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 0.2s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}

.pdp__thumbs--visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
  pointer-events: auto;
}

.pdp__thumb {
  width: 56px;
  height: 56px;
  padding: 0;
  border: 1px solid var(--ui-border-color);
  border-radius: var(--thumb-radius);
  background: var(--warm-white);
  overflow: hidden;
  cursor: pointer;
  opacity: 1;
  transition: opacity 0.2s ease, border-color 0.2s ease;
}

.pdp__thumb:hover {
  border-color: var(--charcoal);
}

.pdp__thumb--active {
  border-color: var(--charcoal);
  border-width: 2px;
}

.pdp__thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pdp__gallery-empty {
  padding: 2rem 0;
  color: var(--muted);
}

.pdp__toolbar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  height: var(--toolbar-height);
  padding: 0 var(--gutter);
  box-sizing: border-box;
  background: transparent;
  border-bottom: 1px solid var(--grid-line);
  transition:
    background var(--theme-ms) var(--theme-ease),
    border-color var(--theme-ms) var(--theme-ease);
}

.pdp__close {
  justify-self: start;
  font-size: var(--text-sm);
  text-decoration: underline;
  text-underline-offset: 4px;
  color: var(--charcoal);
}

.pdp__info-toggle {
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.2s ease;
}

.pdp__info-toggle:hover,
.pdp__info-toggle[aria-expanded='true'] {
  color: var(--charcoal);
}

.pdp__body {
  width: 100%;
  padding: 0;
  flex: 0 1 auto;
  min-height: 0;
}

.pdp__title-row {
  display: flex;
  width: 100%;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 0;
  padding: 0.85rem 0;
  text-align: left;
  pointer-events: none;
}

.pdp__title {
  margin: 0;
  min-width: 0;
  flex: 1;
  font-size: inherit;
  font-weight: 400;
  line-height: 1.4;
  color: var(--charcoal);
}

.pdp__specs {
  margin: 0;
}

.pdp__spec {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  gap: 0.75rem;
  padding: 0.85rem 0;
  /* border-top: 1px solid var(--grid-line); */
}

.pdp__spec:last-child {
  border-bottom: 1px solid var(--grid-line);
}

.pdp__spec--toggle {
  display: block;
  padding: 0 var(--gutter);
  /* border-top: 1px solid var(--grid-line); */
  border-bottom: 1px solid var(--grid-line);
}

.pdp__spec--toggle > .pdp__disclosure {
  display: flex;
  width: 100%;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 0;
  text-align: left;
}

.pdp__spec-panel {
  padding-bottom: 0;
}

.pdp__spec-panel > .pdp__spec {
  border-bottom: 0;
}

.pdp__spec dt {
  font-size: var(--text-sm);
  color: var(--charcoal);
}

.pdp__spec dd {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--charcoal);
  text-align: right;
}

.pdp__disclosure {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--text-sm);
  color: var(--charcoal);
}

.pdp__disclosure-mark {
  position: relative;
  display: inline-block;
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  color: var(--muted);
}

.pdp__disclosure-mark-bar {
  position: absolute;
  left: 0;
  top: 50%;
  width: 10px;
  height: 1px;
  margin-top: -0.5px;
  background: currentColor;
  transform-origin: center center;
}

.pdp__disclosure-mark-bar:last-child {
  transform: rotate(90deg);
}

.pdp__disclosure[aria-expanded='true'] .pdp__disclosure-mark-bar:last-child {
  opacity: 0;
}

.pdp__options {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--charcoal);
  font-size: var(--text-sm);
  text-align: right;
}

.pdp__spec--download {
  align-items: baseline;
}

.pdp__spec-download {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  font-size: var(--text-sm);
  color: var(--charcoal);
  cursor: pointer;
  transition: color 0.2s ease;
}

.pdp__spec-download:hover {
  color: var(--accent);
}

.pdp__spec-download-arrow {
  font-size: 0.85em;
  line-height: 1;
}

.pdp__actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0;
  margin-bottom: 0;
  padding:10px;
}

.pdp__inquire {
  display: block;
  width: 100%;
  padding: 13px;
  background: var(--red);
  color: white;
  font-size: 12px;
  font-family: var(--mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: opacity 0.2s ease;
}

.pdp__inquire:hover {
  opacity: 0.9;
}

.pdp__save {
  display: block;
  width: 100%;
  padding: 1rem 0.85rem;
  border: 1px solid var(--charcoal);
  color: var(--charcoal);
  font-size: var(--text-sm);
  transition: background 0.2s ease, color 0.2s ease;
}

.pdp__save:hover:not(:disabled) {
  background: var(--charcoal);
  color: var(--cream);
}

/* Active stays outline — only hover fills */
.pdp__save--active {
  background: transparent;
  color: var(--charcoal);
}

.pdp__links {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  padding-bottom: 0.5rem;
}

.pdp__link {
  font-size: var(--text-sm);
  color: var(--charcoal);
  text-decoration: underline;
  text-underline-offset: 5px;
  transition: color 0.2s ease;
}

.pdp__link:hover {
  color: var(--accent);
}

.pdp__finishes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin: 1rem 0 0;
  padding: 0 var(--gutter);
  list-style: none;
  color: var(--muted);
  font-size: var(--text-sm);
}

.pdp__info-panel {
  padding: 0 0 0.85rem;
  border-bottom: 1px solid var(--grid-line);
}

.pdp__info-panel .pdp__specs {
  padding: 0 var(--gutter);
}

.pdp__info-copy {
  margin: 0;
  padding: 0.85rem var(--gutter) 0;
}

.pdp__info-text {
  margin: 0 0 1rem;
  font-size: var(--text-sm);
  line-height: 1.55;
  color: var(--charcoal);
}

.pdp__info-text:last-child {
  margin-bottom: 0;
}

.pdp__col--right-collapsed {
  align-items: center;
  justify-content: center;
}

.pdp__next {
  margin-top: 3rem;
  text-align: center;
}

.pdp__next-label {
  display: inline-block;
  margin-bottom: 1rem;
  font-size: var(--text-sm);
  color: var(--charcoal);
}

.pdp__next-media {
  display: block;
  width: 100%;
  aspect-ratio: var(--rail-aspect);
  background: var(--warm-white);
}

.pdp__next-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 1000px) {
  .pdp,
  .pdp--standalone {
    display: flex;
    flex-direction: column;
    height: auto;
    min-height: 100dvh;
  }

  .pdp--standalone {
    min-height: 100dvh;
  }

  .pdp__col {
    height: auto;
    overflow: visible;
  }

  .pdp__col--left,
  .pdp__col--right {
    border: none;
  }

  .pdp__col--center {
    order: -1;
    grid-column: auto;
    grid-row: auto;
  }

  .pdp__stage {
    min-height: 55dvh;
  }

  .pdp__strip {
    align-items: stretch;
    transition: none;
  }

  .pdp__strip-track {
    padding: 0 1rem;
  }

  .pdp--index-hidden .pdp__strip-track {
    padding: 0 1rem;
  }

  .pdp__col--left {
    position: relative;
    top: auto;
    left: auto;
    right: auto;
    bottom: auto;
    width: 100%;
    max-height: none;
    border-radius: 0;
    corner-shape: initial;
    border-bottom: 1px solid var(--grid-line);
    z-index: auto;
    transform: none;
  }

  .pdp__col--right {
    display: none;
  }
}
</style>
