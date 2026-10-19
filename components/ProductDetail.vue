<template>
  <article
    v-if="product"
    class="pdp"
    :class="{
      'pdp--standalone': standalone,
      'pdp--ready': contentReady,
      'pdp--sides': sidesVisible,
      'pdp--chrome-enter': chromeEnterMotion,
      'pdp--zoomed': imageExpanded,
      'pdp--no-related': true,
      'pdp--index': true,
      'pdp--index-hidden': !indexRailVisible,
      'pdp--related-hidden': !relatedRailVisible,
      'pdp--gallery': galleryVisible,
      'pdp--specs-live': specsLive,
      'pdp--closing': closingFlip,
      'pdp--heart-hold': heartHold,
      'pdp--heart-out': heartOut,
      'pdp--singularity': isSpiritOrOrigin,
      'pdp--precrafted': isPrecrafted,
      'pdp--curate': flipSourceIsCurate(),
    }"
  >
    <div class="pdp__toolbar">
      <button type="button" class="pdp__close interface" @click="requestPdpClose">Close</button>
      <div
        class="pdp__meta interface pdp__pane-fade"
        :class="{ 'pdp__pane-fade--out': !paneContentVisible }"
      >
        <span>{{ typeLabel }}</span>
        <template v-if="orderLabel">
          <span class="pdp__meta-sep" aria-hidden="true">/</span>
          <span class="pdp__meta-order">{{ orderLabel }}</span>
        </template>
      </div>
    </div>
    <aside class="pdp__col pdp__col--left" data-cursor="default">
      <div
        class="pdp__body pdp__pane-fade"
        :class="{ 'pdp__pane-fade--out': !paneContentVisible }"
      >
        <h1 class="pdp__title">
          <AddButton
            class="pdp__title-add"
            :active="isFrameSaved(selectedIndex)"
            :label="
              isFrameSaved(selectedIndex)
                ? `Remove ${product.title} from Stack`
                : `Add ${product.title} to selection`
            "
            @click="onAddFrame(selectedIndex)"
          />
          {{ product.title }}
        </h1>

        <div v-if="isPrecrafted" class="pdp__precrafted">
          <div class="pdp__spec pdp__spec--toggle pdp__precrafted-specs">
            <button
              type="button"
              class="pdp__disclosure pdp__spec-item"
              :aria-expanded="specsShown"
              @click="toggleSpecs"
            >
              <span class="serif-italic">Specifications</span>
              <svg
                class="pdp__disclosure-mark"
                viewBox="0 0 14 12"
                aria-hidden="true"
              >
                <path d="M1 3 L7 9 L13 3" />
              </svg>
            </button>
            <div class="pdp__spec-panel" :class="{ 'is-open': specsShown }">
              <div
                class="pdp__spec-panel-clip"
                :inert="!specsShown"
              >
                <div class="pdp__precrafted-body">
                  <p v-if="product.description" class="pdp__precrafted-description">
                    {{ product.description }}
                  </p>
                  <PrecraftedInfo
                    embedded
                    title=""
                    :pricing-heading="precraftedCopy.pricingHeading"
                    :pricing-intro="precraftedCopy.pricingIntro"
                    :pricing-notes="precraftedCopy.pricingNotes"
                    :lead-times-heading="precraftedCopy.leadTimesHeading"
                    :lead-times="precraftedCopy.leadTimes"
                    :install-heading="precraftedCopy.installHeading"
                    :install-notes="precraftedCopy.installNotes"
                    :panel-sizes="precraftedCopy.panelSizes"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <dl v-else class="pdp__specs">
          <div class="pdp__spec pdp__spec--toggle">
            <button
              type="button"
              class="pdp__disclosure pdp__spec-item"
              :aria-expanded="specsShown"
              @click="toggleSpecs"
            >
              <span class="serif-italic">Specifications</span>
              <svg
                class="pdp__disclosure-mark"
                viewBox="0 0 14 12"
                aria-hidden="true"
              >
                <path d="M1 3 L7 9 L13 3" />
              </svg>
            </button>
            <div class="pdp__spec-panel" :class="{ 'is-open': specsShown }">
              <div class="pdp__spec-panel-clip" :inert="!specsShown">
              <div class="pdp__spec pdp__spec-item">
                <dt class="serif-italic">Year</dt>
                <dd>{{ product.year || '2024' }}</dd>
              </div>
              <div class="pdp__spec pdp__spec-item">
                <dt class="serif-italic">Client</dt>
                <dd>{{ product.client || 'Private Client' }}</dd>
              </div>
              <div class="pdp__spec pdp__spec-item">
                <dt class="serif-italic">Location</dt>
                <dd>{{ product.location || 'London, UK' }}</dd>
              </div>
              <div class="pdp__spec pdp__spec-item">
                <dt class="serif-italic">Dimensions</dt>
                <dd>{{ product.dimensions || '3200mm W × 1200mm H × 20mm D' }}</dd>
              </div>
              <div class="pdp__spec pdp__spec-item">
                <dt class="serif-italic">Materiality</dt>
                <dd>
                  <ul v-if="materials.length" class="pdp__options">
                    <li v-for="material in materials" :key="material">{{ material }}</li>
                  </ul>
                  <template v-else>Tramazite, Camona Gold</template>
                </dd>
              </div>
              <div v-if="product.style" class="pdp__spec pdp__spec-item">
                <dt class="serif-italic">Style</dt>
                <dd>{{ product.style }}</dd>
              </div>
              <div v-if="product.comCol" class="pdp__spec pdp__spec-item">
                <dt class="serif-italic">COM / COL</dt>
                <dd>{{ product.comCol }}</dd>
              </div>
              <div class="pdp__spec pdp__spec-item pdp__spec--download">
                <dt class="serif-italic">Spec Sheet</dt>
                <dd>
                  <button type="button" class="pdp__spec-download" @click="downloadSpec">
                    Download <span class="pdp__spec-download-arrow" aria-hidden="true">↓</span>
                  </button>
                </dd>
              </div>

              <div
                v-if="product.description || product.edition"
                class="pdp__info-copy pdp__spec-item"
              >
                <p v-if="product.description" class="pdp__info-text">{{ product.description }}</p>
                <p v-if="product.edition" class="pdp__info-text">{{ product.edition }}</p>
              </div>

              <ul v-if="product.finishes?.length" class="pdp__finishes pdp__spec-item">
                <li v-for="finish in product.finishes" :key="finish">{{ finish }}</li>
              </ul>
              </div>
            </div>
          </div>
        </dl>

        <div v-if="nextProduct" class="pdp__next">
          <button type="button" class="pdp__next-label interface" @click="goToNext">
            Next Product
          </button>
          <button type="button" class="pdp__next-media" @click="goToNext">
            <img :src="nextImageUrl" :alt="nextProduct.title" />
          </button>
        </div>

        <div class="pdp__actions">
          <button type="button" class="pdp__inquire" @click="sendEnquiry">
            Enquire About This
          </button>
          <button
            type="button"
            class="pdp__rail-btn"
            hidden
            :aria-pressed="indexRailVisible"
            :aria-label="indexRailVisible ? 'Hide product index' : 'Show product index'"
            @click="toggleIndexRail"
          >
            {{ indexRailVisible ? 'Hide Index' : 'Product Index' }}
          </button>
          <div
            class="pdp__action-split"
            :class="{
              'pdp__action-split--pair': galleryEntries.some((entry) => entry.kind === 'image'),
            }"
          >
          <button
            type="button"
            class="pdp__rail-btn pdp__rail-btn--related"
            :aria-pressed="relatedRailVisible"
            aria-label="Related"
            @click="requestRelatedToggle"
          >
            Related
          </button>
          <button
            v-if="galleryEntries.some((entry) => entry.kind === 'image')"
            type="button"
            class="pdp__rail-btn pdp__rail-btn--loupe"
            :aria-pressed="loupeOpen"
            :aria-label="loupeOpen ? 'Close loupe' : 'Open loupe'"
            @click="loupeOpen = !loupeOpen"
          >
            Loupe
          </button>
          </div>
        </div>
      </div>
    </aside>

    <div class="pdp__col pdp__col--center">
      <div
        ref="stageRef"
        class="pdp__stage pdp__pane-fade"
        :class="{ 'pdp__pane-fade--out': !paneContentVisible }"
        data-cursor-label="Close"
        @click="onStageClick"
      >
        <div
          v-if="galleryEntries.length"
          ref="stripRef"
          class="pdp__strip"
          :class="{ 'pdp__strip--single': galleryEntries.length === 1 }"
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
                    'pdp__hero-image--saved': isFrameSaved(i),
                  }"
                  :src="entry.src"
                  :poster="entry.posterSrc || undefined"
                  muted
                  loop
                  playsinline
                  preload="metadata"
                  draggable="false"
                  data-cursor="default"
                  @loadedmetadata="onStripVideoMeta(i, $event)"
                  @click.stop="onGalleryMediaClick"
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
                    'pdp__hero-image--saved': isFrameSaved(i),
                  }"
                  draggable="false"
                  :data-cursor="i === selectedIndex && imageExpanded ? undefined : 'default'"
                  @load="onStripImageLoad(i)"
                  @click.stop="onGalleryMediaClick(i, $event)"
                />
                <AddButton
                  class="pdp__frame-add"
                  :active="isFrameSaved(i)"
                  :label="
                    isFrameSaved(i)
                      ? `Remove ${product.title} image ${i + 1} from Stack`
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
      </div>
    </div>
    <Teleport to="body">
      <div
        v-if="imageExpanded && activeEntry?.kind === 'image'"
        ref="zoomLayerRef"
        class="pdp__zoom"
        :class="{ 'pdp__zoom--hold': !zoomLayerShown }"
        data-lenis-prevent
      >
        <img
          ref="zoomImageRef"
          class="pdp__zoom-image"
          :src="activeEntry.zoomSrc || activeEntry.src"
          :alt="`${product.title} enlarged`"
          :style="
            galleryAspects[activeEntry.id]
              ? { aspectRatio: String(galleryAspects[activeEntry.id]) }
              : undefined
          "
          draggable="false"
          data-cursor-label="Close"
          @click.stop="collapseImageZoom"
        />
      </div>
    </Teleport>
    <Loupe
      v-if="loupeOpen"
      :src="activeEntry?.kind === 'image' ? activeEntry.zoomSrc || activeEntry.src : ''"
      :closing="closingFlip || loupeClosing"
      @close="loupeOpen = false"
    />
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
import { PRODUCT_TYPE_FILTERS, isPrecraftedItem } from '~/composables/demoData'
import { IMAGE_WIDTH, imageAssetKey, prefetchImage } from '~/composables/useSanityImage'
import { productCoverFrame, productGalleryFrames } from '~/composables/productImages'
import { preloadLoupeBitmaps } from '~/components/Loupe.vue'
import {
  ARCHIVE_PDP_CLOSE_EASE,
  ARCHIVE_PDP_CLOSE_S,
  ARCHIVE_PDP_OPEN_EASE,
  ARCHIVE_PDP_OPEN_S,
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
  getFlipSourceProductId,
  flipSourceIsArchiveGrid,
  flipSourceIsCart,
  flipSourceIsCurate,
  flipSourceIsPrecrafted,
  flipSourceStartsImmediately,
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
  requestGridSwap,
  setCloseVeilActive,
  signalArchiveMotion,
  nextSequence,
} = useProductOverlay()
const { openFromProduct } = useEnquiryForm()
const { items: libraryItems } = await useLibraryCatalog()

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

const PDP_NARROW_QUERY = '(max-width: 1000px)'

const isNarrowPdp = () =>
  import.meta.client && window.matchMedia(PDP_NARROW_QUERY).matches

/** Open by default. Closed state is remembered for the next product on desktop. */
const specsCookie = useCookie<boolean>('sba-pdp-specs', {
  default: () => true,
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
})
/**
 * null follows the cookie. On a phone this is a session flag that starts closed
 * for every product, so an open panel on the last PDP does not carry over.
 */
const specsOverride = ref<boolean | null>(null)
/** Lets the first paint stay closed on mobile before this ref is applied. */
const specsLive = ref(false)
const specsShown = computed(() =>
  specsOverride.value === null ? !!specsCookie.value : specsOverride.value,
)

const closeSpecsIfNarrow = () => {
  if (isNarrowPdp()) specsOverride.value = false
  else specsOverride.value = null
}

const toggleSpecs = () => {
  if (specsOverride.value !== null) specsOverride.value = !specsOverride.value
  else specsCookie.value = !specsCookie.value
}

let narrowPdpQuery: MediaQueryList | null = null
const onNarrowPdpChange = () => closeSpecsIfNarrow()

watch(() => props.slug, () => {
  closeSpecsIfNarrow()
})
const heroRef = ref<HTMLImageElement | null>(null)
const stageRef = ref<HTMLElement | null>(null)
const stripRef = ref<HTMLElement | null>(null)
const stripTrackRef = ref<HTMLElement | null>(null)
const contentReady = ref(false)
/** Saved-heart on the grid thumb — keep the gallery heart hidden until Flip lands. */
const activeSourceHeart = () => {
  const source = getFlipSource()
  if (!source || !flipSourceIsArchiveGrid()) return null
  const btn = source.closest('.product-card')?.querySelector<HTMLElement>('.product-card__add')
  return btn?.classList.contains('add-btn--active') ? btn : null
}
const heartHold = ref(false)
/** Close: the gallery heart on the active frame leaves before the image. */
const heartOut = ref(false)
let fadedHeart: HTMLElement | null = null
const releaseFadedHeart = () => {
  if (!fadedHeart) return
  gsap.set(fadedHeart, { clearProps: 'opacity' })
  fadedHeart = null
}
if (import.meta.client) {
  const btn = activeSourceHeart()
  if (btn) {
    heartHold.value = true
    fadedHeart = btn
    gsap.to(btn, { opacity: 0, duration: 0.28, ease: 'power2.out', overwrite: true })
  }
}
/** Shared with ProductIndexRail so open/close chrome stays in lockstep. */
const sidesVisible = useState('pdp-chrome-visible', () => false)
/** Overlay flip only — hard-load / standalone skip chrome translate-in. */
const chromeEnterMotion = useState('pdp-chrome-enter-motion', () => false)
const galleryVisible = ref(false)
/** Fades left/center copy + gallery; column rules stay put */
const paneContentVisible = ref(true)
let slugSwapToken = 0
const flipStarted = ref(false)
const flipCloseStarted = ref(false)
const selectedIndex = ref(openImageIndex.value)
/** Full-bleed gallery zoom. A second click collapses it. */
const imageExpanded = ref(false)
const loupeOpen = ref(false)
const loupeClosing = ref(false)
const frameZoomHiRes = ref(false)
let stripScrollRaf = 0
let imageZoomFlip: gsap.core.Tween | null = null
let imageZooming = false
let zoomFlyer: HTMLImageElement | null = null
/** 0–1 down the image. The open zoom centres this point. */
let zoomFocusY = 0.5
/** Trackpad pinch scale of the enlarged image. 1 is full viewport width. */
let pinchScale = 1
const PINCH_MIN = 1
const PINCH_MAX = 4
const zoomLayerRef = ref<HTMLElement | null>(null)
const zoomImageRef = ref<HTMLImageElement | null>(null)
/** Fullscreen layer stays invisible until the flyer has grown into it. */
const zoomLayerShown = ref(false)
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
  if (isSpiritOrOrigin.value) nextTick(() => scrollSelectedIntoView(false))
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
    id: `${recordId}-product-${entries.length}`,
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
        id: `${record._id}-spirit-vid-${entries.length}`,
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
      id: `${record._id}-spirit-${entries.length}`,
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

/** Product frames, then Spirit frames that are not already in the product gallery. */
const galleryEntries = computed((): GalleryEntry[] => {
  const product = productGalleryEntries.value
  const spirit = spiritGalleryEntries.value
  if (!spirit.length) return product
  const seen = new Set(product.map((entry) => entry.src.replace(/\?.*$/, '')))
  const extra = spirit.filter((entry) => !seen.has(entry.src.replace(/\?.*$/, '')))
  return extra.length ? [...product, ...extra] : product
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
    const ratio = node.naturalWidth / node.naturalHeight
    if (galleryAspects[entry.id] !== ratio) galleryAspects[entry.id] = ratio
  }
  if (!galleryReady[entry.id]) galleryReady[entry.id] = true
}

const markGalleryVideoReady = (index: number, video?: HTMLVideoElement | null) => {
  const entry = galleryEntries.value[index]
  if (!entry || entry.kind !== 'video') return
  if (video?.videoWidth && video.videoHeight) {
    const ratio = video.videoWidth / video.videoHeight
    if (galleryAspects[entry.id] !== ratio) galleryAspects[entry.id] = ratio
  }
  if (!galleryReady[entry.id]) galleryReady[entry.id] = true
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

watch(
  () => props.slug,
  () => {
    loupeOpen.value = false
  },
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

/**
 * Reel columns pass their own index, which is not a gallery index.
 * Open on the frame that shares the flying image so the flyer and the
 * gallery are the same photograph.
 */
const galleryIndexForFlipImage = (entries: GalleryEntry[]) => {
  const flip = getFlipImageUrl()
  if (!flip || !entries.length) return -1
  const key = imageAssetKey(flip)
  if (!key) return -1
  return entries.findIndex((entry) => {
    if (entry.kind !== 'image') return false
    return (
      imageAssetKey(entry.src) === key ||
      imageAssetKey(entry.thumbSrc) === key ||
      imageAssetKey(entry.zoomSrc) === key
    )
  })
}

watch(galleryEntries, (entries) => {
  preloadLoupeBitmaps(
    entries.flatMap((entry) => (entry.kind === 'image' ? [entry.src, entry.zoomSrc] : [])),
  )
  if (!entries.length) {
    selectedIndex.value = 0
    return
  }
  if (!flipStarted.value && !contentReady.value) {
    const matched = galleryIndexForFlipImage(entries)
    if (matched >= 0) selectedIndex.value = matched
  }
  if (selectedIndex.value >= entries.length) selectedIndex.value = 0
  // Soft-swap prepares ahead of time; hard-load / late mounts still warm the first frames
  if (import.meta.client && entries.slice(0, 3).some((e) => !galleryReady[e.id])) {
    void prepareGalleryEntries(entries, 3)
  }
  nextTick(syncStripVideos)
}, { immediate: true })

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

const canCycleImage = (direction: 1 | -1) => {
  const count = galleryEntries.value.length
  if (count < 2) return false
  if (direction === 1) return selectedIndex.value < count - 1
  return selectedIndex.value > 0
}

const cycleImage = (direction: 1 | -1) => {
  if (!canCycleImage(direction)) return
  selectImage(selectedIndex.value + direction)
}

/** Strip padding clears the rails — center in that open span. */
const getStripRailPads = (strip: HTMLElement) => {
  const track = stripTrackRef.value
  const style = getComputedStyle(track ?? strip)
  return {
    top: Number.parseFloat(style.paddingTop) || 0,
    bottom: Number.parseFloat(style.paddingBottom) || 0,
  }
}

/**
 * Scroll position that rests this frame in the vertical centre of the clear
 * span. Frames taller than that span pin to the top so they stay padded.
 */
const restingScrollForItem = (item: HTMLElement, strip: HTMLElement) => {
  const { top: padT, bottom: padB } = getStripRailPads(strip)
  const visible = Math.max(0, strip.clientHeight - padT - padB)
  const ideal = item.offsetTop + item.offsetHeight / 2 - padT - visible / 2
  const maxTopClear = Math.max(0, item.offsetTop - padT)
  const minBottomClear = Math.max(
    0,
    item.offsetTop + item.offsetHeight - padT - visible,
  )
  return minBottomClear > maxTopClear
    ? maxTopClear
    : Math.min(Math.max(ideal, minBottomClear), maxTopClear)
}

/** Center the active frame, using the same resting position as scroll sync. */
const scrollSelectedIntoView = (smooth = false) => {
  const strip = stripRef.value
  if (!strip) return
  const item = strip.querySelector<HTMLElement>(
    `[data-strip-index="${selectedIndex.value}"]`,
  )
  if (!item) return
  setStripScroll(restingScrollForItem(item, strip), { immediate: !smooth })
}

const isSpiritOrOrigin = computed(() => {
  const cat = String(product.value?.category || '').toLowerCase()
  return cat === 'spirit' || cat === 'origin'
})

const isPrecrafted = computed(() => {
  const current = product.value
  if (!current) return false
  return isPrecraftedItem({
    type: current.category,
    series: current.series,
    categories: current.categories,
    precrafted: current.precrafted,
  })
})

type PrecraftedBlock = {
  _key?: string
  _type: string
  children?: Array<{ text?: string; marks?: string[] }>
}

const precraftedText = (key: string, text: string): PrecraftedBlock => ({
  _key: key,
  _type: 'block',
  children: [{ text, marks: [] }],
})

const PRECRAFTED_PANEL_SIZES = [
  { dimensions: '3200mm x 1200mm x 20mm', price: '£3,830/panel (approx. £995m²)' },
  { dimensions: '2400mm x 1200mm x 20mm', price: '£2,870/panel (approx. £995m²)' },
]

const PRECRAFTED_PRICING_INTRO =
  '(Pre)Crafted panels are finished on the front face only and are available in the following dimensions:'

const PRECRAFTED_PRICING_NOTES = [
  'All prices are exc. VAT, delivery & installation.',
  'Prices stated are for approx. 30no panel orders. We will honour this volume pricing of £995m² for any volume ordered during our trade launch. Pricing valid until May 2026.',
]

const PRECRAFTED_LEAD_TIMES =
  'Typical lead times are approx. 6–8 weeks (subject to production schedule at the time) with larger orders requiring longer to prepare. Please contact us about your project for more specific timings.'

const PRECRAFTED_INSTALL_NOTES = [
  precraftedText(
    'i1',
    'The edges are black to create a shadow gap detail between panels. We recommend a mechanical fixing system such as split battens to allow for adjustment during fitting.',
  ),
  precraftedText(
    'i2',
    'Speak to your appointed contractor to check specific requirements for your project or please contact us for further advice.',
  ),
]

const { data: precraftedAside } = await useAsyncData(
  'precrafted-pdp-aside-v4',
  () =>
    $fetch('/api/sanity/query', {
      method: 'POST',
      body: {
        useCdn: false,
        query: `*[_type == "preCraftedPage"][0] {
          panelSizes[] { dimensions, price },
          "info": sections[_type == "precraftedInfoSection"][0] {
            pricingHeading,
            pricingIntro,
            pricingNotes,
            leadTimesHeading,
            leadTimes,
            installHeading,
            installNotes
          }
        }`,
      },
    })
      .then(
        (r: {
          result?: {
            panelSizes?: { dimensions?: string; price?: string }[]
            info?: {
              pricingHeading?: string
              pricingIntro?: string
              pricingNotes?: string[]
              leadTimesHeading?: string
              leadTimes?: string
              installHeading?: string
              installNotes?: PrecraftedBlock[]
            } | null
          } | null
        }) => r?.result ?? null,
      )
      .catch(() => null),
)

const precraftedCopy = computed(() => {
  const info = precraftedAside.value?.info
  const notes = Array.isArray(info?.pricingNotes) ? info.pricingNotes.filter(Boolean) : []
  const sizes = (precraftedAside.value?.panelSizes || []).filter(
    (panel: { dimensions?: string; price?: string }) => panel?.dimensions || panel?.price,
  )
  return {
    pricingHeading: info?.pricingHeading || 'Sizes & Trade Launch Pricing',
    pricingIntro: info?.pricingIntro || PRECRAFTED_PRICING_INTRO,
    pricingNotes: notes.length ? notes : PRECRAFTED_PRICING_NOTES,
    leadTimesHeading: info?.leadTimesHeading || 'Lead Times',
    leadTimes: info?.leadTimes || PRECRAFTED_LEAD_TIMES,
    installHeading: info?.installHeading || 'Install',
    installNotes: info?.installNotes?.length ? info.installNotes : PRECRAFTED_INSTALL_NOTES,
    panelSizes: sizes.length ? sizes : PRECRAFTED_PANEL_SIZES,
  }
})

const scrollGalleryInitial = () => {
  scrollSelectedIntoView(false)
}

const syncSelectedFromScroll = () => {
  const strip = stripRef.value
  // Don't retarget the open flyer. A narrow portrait at the left is closer
  // to the next frame's centre than to the viewport centre, and that swap
  // was sending Flip into the second image.
  if (!contentReady.value || pendingFlip.value || imageExpanded.value) return
  if (!strip || !galleryEntries.value.length) return
  const scroll = getStripScroll()
  let best = 0
  let bestDist = Infinity
  strip.querySelectorAll<HTMLElement>('[data-strip-index]').forEach((el) => {
    const index = Number(el.dataset.stripIndex)
    if (!Number.isFinite(index)) return
    const dist = Math.abs(restingScrollForItem(el, strip) - scroll)
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
  galleryLenis?.animatedScroll ?? stripRef.value?.scrollTop ?? 0

const setStripScroll = (
  top: number,
  { immediate = true }: { immediate?: boolean } = {},
) => {
  if (galleryLenis) {
    galleryLenis.scrollTo(top, immediate ? { immediate: true } : { lerp: 0.12 })
    return
  }
  stripRef.value?.scrollTo({
    top,
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
  // The phone gallery is in normal flow and the page scrolls it. Lenis on the
  // strip swallows the touch and leaves nothing to scroll.
  if (isNarrowPdp()) {
    destroyGalleryLenis()
    return
  }
  const wrapper = stripRef.value
  const content = stripTrackRef.value
  const stage = stageRef.value
  if (!wrapper || !content) return

  destroyGalleryLenis()

  galleryLenis = new Lenis({
    wrapper,
    content,
    eventsTarget: stage ?? wrapper,
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    syncTouch: true,
    syncTouchLerp: 0.055,
    touchInertiaExponent: 2.05,
    touchMultiplier: 1.4,
    wheelMultiplier: 1.15,
    lerp: 0.08,
    overscroll: false,
    // Strip keeps data-lenis-prevent for the page scroller; don't self-block.
    // Hold the gallery strip while a zoom is open or its flyer is in flight.
    prevent: () => imageZooming || imageExpanded.value,
  })

  galleryLenis.on('scroll', onStripScroll)
  galleryLenis.resize()
  galleryLenisRaf = requestAnimationFrame(tickGalleryLenis)
}

const resizeGalleryLenis = () => {
  galleryLenis?.resize()
}

watch(imageExpanded, async () => {
  await nextTick()
  resizeGalleryLenis()
  if (!imageZooming) galleryLenis?.start()
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

const frameEl = (index: number) =>
  stripRef.value?.querySelector<HTMLElement>(
    `[data-strip-index="${index}"] .pdp__hero-frame`,
  ) ?? null

const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })

const settleZoomScroll = (top: number) => {
  const layer = zoomLayerRef.value
  if (layer) layer.scrollTop = top
}

const clearZoomFlyer = () => {
  imageZoomFlip?.kill()
  imageZoomFlip = null
  zoomFlyer?.remove()
  zoomFlyer = null
}

const showZoomFrame = (frame: HTMLElement | null) => {
  frame?.style.removeProperty('visibility')
}

/** Scroll so the click sits in the centre, without padding past the image. */
const layoutZoomToFocus = () => {
  const layer = zoomLayerRef.value
  const image = zoomImageRef.value
  if (!layer || !image) return
  image.style.marginTop = '0px'
  settleZoomScroll(0)
  const view = layer.clientHeight
  const focus = image.offsetHeight * zoomFocusY
  const delta = focus - view / 2
  const maxScroll = Math.max(0, layer.scrollHeight - view)
  settleZoomScroll(Math.min(Math.max(0, delta), maxScroll))
}

const spawnZoomFlyer = (img: HTMLImageElement, from: DOMRect) => {
  const flyer = document.createElement('img')
  flyer.src = img.currentSrc || img.src
  flyer.alt = ''
  flyer.setAttribute('aria-hidden', 'true')
  Object.assign(flyer.style, {
    position: 'fixed',
    zIndex: '445',
    top: `${from.top}px`,
    left: `${from.left}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: '0',
    objectFit: 'cover',
    pointerEvents: 'none',
  })
  document.body.appendChild(flyer)
  zoomFlyer = flyer
  return flyer
}

const scaleZoomAtPinch = (event: WheelEvent) => {
  const layer = zoomLayerRef.value
  const image = zoomImageRef.value
  if (!layer || !image) return
  const next = Math.min(
    PINCH_MAX,
    Math.max(PINCH_MIN, pinchScale * Math.exp(-event.deltaY * 0.01)),
  )
  if (Math.abs(next - pinchScale) < 0.0001) return
  const layerRect = layer.getBoundingClientRect()
  const cursorX = event.clientX - layerRect.left
  const cursorY = event.clientY - layerRect.top
  const contentX = layer.scrollLeft + cursorX
  const contentY = layer.scrollTop + cursorY
  const u = image.offsetWidth > 0 ? (contentX - image.offsetLeft) / image.offsetWidth : 0.5
  const v = image.offsetHeight > 0 ? (contentY - image.offsetTop) / image.offsetHeight : 0.5
  pinchScale = next
  image.style.width = `${next * 100}%`
  layer.scrollLeft = image.offsetLeft + u * image.offsetWidth - cursorX
  layer.scrollTop = image.offsetTop + v * image.offsetHeight - cursorY
}

/** Laptop trackpad pinch arrives as a ctrl-wheel and would zoom the whole page. */
const onPinchWheel = (event: WheelEvent) => {
  if (!event.ctrlKey) return
  event.preventDefault()
  event.stopPropagation()
  if (imageZooming) return
  if (!imageExpanded.value) {
    const host =
      event.target instanceof Element ? event.target.closest('[data-strip-index]') : null
    const index = host
      ? Number(host.getAttribute('data-strip-index'))
      : selectedIndex.value
    const img = host?.querySelector('img')
    let focusY = 0.5
    if (img) {
      const rect = img.getBoundingClientRect()
      if (rect.height > 0) focusY = (event.clientY - rect.top) / rect.height
    }
    if (Number.isFinite(index)) void expandImageZoom(index, focusY)
    return
  }
  scaleZoomAtPinch(event)
}

const onSafariPinch = (event: Event) => {
  event.preventDefault()
}

const flyZoom = (
  frame: HTMLElement,
  flyer: HTMLImageElement,
  to: DOMRect,
  revealFrame: boolean,
) => {
  imageZoomFlip = gsap.to(flyer, {
    top: to.top,
    left: to.left,
    width: to.width,
    height: to.height,
    duration: 0.55,
    ease: 'power3.inOut',
    overwrite: true,
    onComplete: () => {
      if (revealFrame) showZoomFrame(frame)
      else zoomLayerShown.value = true
      flyer.remove()
      if (zoomFlyer === flyer) zoomFlyer = null
      imageZoomFlip = null
      imageZooming = false
      resizeGalleryLenis()
    },
  })
}

const expandImageZoom = async (index: number, focusY: number) => {
  if (imageZooming) return
  const frame = frameEl(index)
  const img = frame?.querySelector('img')
  if (!frame || !(img instanceof HTMLImageElement)) return
  selectedIndex.value = index
  heroRef.value = img
  pinchScale = 1
  zoomFocusY = Math.min(1, Math.max(0, focusY))
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  zoomLayerShown.value = reduced
  const from = img.getBoundingClientRect()
  imageZooming = true
  // Gallery frame stays in its padded slot, hidden, for the whole zoom.
  frame.style.visibility = 'hidden'
  const flyer = spawnZoomFlyer(img, from)
  imageExpanded.value = true
  frameZoomHiRes.value = true
  await nextTick()
  await nextFrame()
  layoutZoomToFocus()
  await nextFrame()
  const zoomImage = zoomImageRef.value
  const to = zoomImage?.getBoundingClientRect()
  if (reduced || from.width < 2 || !to || to.width < 2) {
    zoomLayerShown.value = true
    flyer.remove()
    if (zoomFlyer === flyer) zoomFlyer = null
    imageZooming = false
    return
  }
  flyZoom(frame, flyer, to, false)
}

const collapseImageZoom = async () => {
  if (imageZooming || !imageExpanded.value) return
  const frame = frameEl(selectedIndex.value)
  const zoomImage = zoomImageRef.value
  if (!frame || !zoomImage) {
    collapseImage()
    return
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const from = zoomImage.getBoundingClientRect()
  imageZooming = true
  const flyer = spawnZoomFlyer(zoomImage, from)
  imageExpanded.value = false
  frameZoomHiRes.value = false
  await nextTick()
  await nextFrame()
  const to = frame.getBoundingClientRect()
  if (reduced || from.width < 2 || to.width < 2) {
    showZoomFrame(frame)
    flyer.remove()
    if (zoomFlyer === flyer) zoomFlyer = null
    imageZooming = false
    return
  }
  flyZoom(frame, flyer, to, true)
}

const collapseImage = () => {
  const frame = frameEl(selectedIndex.value)
  showZoomFrame(frame)
  clearZoomFlyer()
  pinchScale = 1
  zoomLayerShown.value = false
  imageZooming = false
  imageExpanded.value = false
  frameZoomHiRes.value = false
}

const homeScrollHint = useHomeScrollHint()

const onGalleryMediaClick = (index?: number, event?: MouseEvent) => {
  if (typeof index === 'number' && !isNarrowPdp()) {
    const entry = galleryEntries.value[index]
    if (entry?.kind === 'image') {
      if (imageExpanded.value) {
        void collapseImageZoom()
        return
      }
      const img = event?.currentTarget
      const rect = img instanceof HTMLElement ? img.getBoundingClientRect() : null
      const focusY =
        rect && rect.height > 0 && event
          ? (event.clientY - rect.top) / rect.height
          : 0.5
      void expandImageZoom(index, focusY)
      return
    }
  }
  requestPdpClose()
}

const requestPdpClose = () => {
  if (imageExpanded.value) collapseImage()
  if (props.standalone && loupeOpen.value && !loupeClosing.value && !closingFlip.value) {
    loupeClosing.value = true
    window.setTimeout(() => emit('close'), 220)
    return
  }
  emit('close')
}

/** Letterbox closes the page. A zoomed image collapses first. Controls keep their own clicks. */
const onStageClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null
  if (!target) return
  if (target.closest('button, a, .pdp__hero-image, .pdp__hero-video, .loupe')) return
  if (imageExpanded.value) {
    void collapseImageZoom()
    return
  }
  onGalleryMediaClick()
}

const onGalleryKeydown = (event: KeyboardEvent) => {
  if (loupeOpen.value || imageExpanded.value) return
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
  homeScrollHint.value = false
  closeSpecsIfNarrow()
  specsLive.value = true
  narrowPdpQuery = window.matchMedia(PDP_NARROW_QUERY)
  narrowPdpQuery.addEventListener('change', onNarrowPdpChange)
  nextTick(() => {
    initGalleryLenis()
    scrollGalleryInitial()
    const fromFinish = flipSourceIsPrecrafted()
    if (fromFinish) setBackdropReady(true)
    if (heroRef.value?.complete || (fromFinish && heroRef.value)) void runFlipOpen()
    else if (!activeEntry.value) revealWithoutFlip()
  })
  window.addEventListener('keydown', onGalleryKeydown)
  window.addEventListener('wheel', onPinchWheel, { passive: false, capture: true })
  window.addEventListener('gesturestart', onSafariPinch, { passive: false })
  window.addEventListener('gesturechange', onSafariPinch, { passive: false })
  window.addEventListener('gestureend', onSafariPinch, { passive: false })
})

onUnmounted(() => {
  clearZoomFlyer()
  releaseFadedHeart()
  destroyGalleryLenis()
  narrowPdpQuery?.removeEventListener('change', onNarrowPdpChange)
  window.removeEventListener('keydown', onGalleryKeydown)
  window.removeEventListener('wheel', onPinchWheel, { capture: true })
  window.removeEventListener('gesturestart', onSafariPinch)
  window.removeEventListener('gesturechange', onSafariPinch)
  window.removeEventListener('gestureend', onSafariPinch)
  if (wheelUnlockTimer) clearTimeout(wheelUnlockTimer)
  if (stripScrollRaf) cancelAnimationFrame(stripScrollRaf)
})

const materials = computed(() =>
  [...(product.value?.materials || product.value?.categories || [])]
    .filter(Boolean)
    .map((m) => m.charAt(0).toUpperCase() + m.slice(1)),
)

const libraryItem = computed(() =>
  libraryItems.value.find((item) => item._id === product.value?._id),
)

const typeLabel = computed(() => {
  const key =
    libraryItem.value?.category ||
    libraryItem.value?.type ||
    product.value?.category ||
    product.value?.series ||
    ''
  if (key === 'precrafted') return '(Pre)Crafted'
  const match = PRODUCT_TYPE_FILTERS.find((t) => t.value === key)
  return match?.label || key || 'Item'
})

/** 1-based index in the Materials & Forms catalog, matching ProductCard. */
const orderLabel = computed(() => {
  if (!product.value) return ''
  const list = libraryItems.value
  const index = list.findIndex((item) => item._id === product.value!._id)
  if (index < 0) return ''
  const digits = Math.max(2, String(list.length).length)
  return String(index + 1).padStart(digits, '0')
})

/** Shared with ProductIndexRail — drives gallery left padding. */
const indexRailVisible = useCookie<boolean>('sba-pdp-index-rail', {
  default: () => false,
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
})
indexRailVisible.value = false

/** Shared with ProductIndexRail — session-only (not cookie). */
const { relatedRailVisible, requestRelatedToggle } = usePdpRelatedRail()

const toggleIndexRail = () => {
  indexRailVisible.value = !indexRailVisible.value
}

watch([indexRailVisible, relatedRailVisible], async () => {
  await nextTick()
  resizeGalleryLenis()
  // Pads animate via html @property — refresh limits after the tween.
  window.setTimeout(() => resizeGalleryLenis(), 360)
})

/** Next artwork in the collection that opened this PDP, when one was passed. */
const nextInSequence = computed(() => {
  const list = nextSequence.value
  const slug = product.value?.slug
  if (!list || list.length < 2 || !slug) return null
  const index = list.findIndex((item) => item.slug === slug)
  if (index === -1) return null
  return list[(index + 1) % list.length] ?? null
})

const catalogNext = computed(() => (product.value ? getNextProduct(product.value.slug) : null))

const nextProduct = computed(() => {
  if (nextInSequence.value) return nextInSequence.value
  if (isPrecrafted.value) return null
  return catalogNext.value
})

const nextImageUrl = computed(() => {
  if (nextInSequence.value?.imageUrl) return nextInSequence.value.imageUrl
  if (!catalogNext.value) return ''
  const cover = productCoverFrame(catalogNext.value)
  return cover ? imageUrl(cover, IMAGE_WIDTH.thumb) : ''
})

const goToNext = () => {
  const slug = nextProduct.value && 'slug' in nextProduct.value ? nextProduct.value.slug : ''
  if (slug) emit('navigate', slug)
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
      link: productDetailPath(product.value.slug, product.value),
    },
    // Phone, and a PDP opened from the cart: toggle the heart only.
    // A fly source hides the gallery frame and sends it into the stack.
    isNarrowPdp() || flipSourceIsCart() ? { fly: false } : { source },
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
    path: productDetailPath(product.value.slug, product.value),
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

/** Hero frame radius, so the flyer eases into the same corners the PDP shows. */
const pdpFrameRadius = (el: HTMLElement | null | undefined) => {
  const frame = el?.closest<HTMLElement>('.pdp__hero-frame')
  const radius = frame ? getComputedStyle(frame).borderRadius : ''
  return radius && radius !== '0px' ? radius : '10px'
}

/** Visible thumbnail radius, in px. The image is often square; the clip sits on a parent. */
const sourceRadiusPx = (el: HTMLElement | null) => {
  let node: HTMLElement | null = el
  while (node && node !== document.documentElement) {
    const radius = getComputedStyle(node).borderRadius
    const value = Number.parseFloat(radius)
    if (Number.isFinite(value) && value > 0) return value
    node = node.parentElement
  }
  return 0
}

const frameRadiusPx = (el: HTMLElement | null | undefined) => {
  const raw = pdpFrameRadius(el)
  const value = Number.parseFloat(raw)
  return Number.isFinite(value) ? value : 10
}

const tweenCornerRadius = (
  flyer: HTMLElement,
  from: number,
  to: number,
  duration: number,
  ease: string,
) => {
  gsap.fromTo(
    flyer,
    { borderRadius: from },
    { borderRadius: to, duration, ease, overwrite: 'auto' },
  )
}

const revealWithoutFlip = () => {
  restoreFlipSource()
  heartHold.value = false
  releaseFadedHeart()
  setBackdropReady(true)
  clearPendingFlip()
  chromeEnterMotion.value = false
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

/** Finish opens must not sit invisible if the hero download stalls. */
const waitForImageLimited = (img: HTMLImageElement, ms = 1200) =>
  Promise.race([
    waitForImage(img),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms)
    }),
  ])

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

  // Animate chrome in after the flyer lands (not on hard-load / standalone).
  chromeEnterMotion.value = true

  // Source is already locked at hover look from open() — keep it through load
  source.style.transition = 'none'
  source.style.opacity = '1'
  source.style.filter = 'grayscale(0)'

  const fromPrecrafted = flipSourceIsPrecrafted()
  // Finish thumbs are already on screen. Don't hold the open on the hero file.
  if (!fromPrecrafted) await waitForImage(hero)
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

  // Prefer the gallery file when it is the same asset, so the flyer is the
  // photograph the strip is about to reveal — not a smaller reel crop of it.
  const requestedFlip = getFlipImageUrl()
  const heroSrc = flipHero.currentSrc || flipHero.src
  const sameAsset =
    !!requestedFlip && !!heroSrc && imageAssetKey(requestedFlip) === imageAssetKey(heroSrc)
  const flipSrc =
    (sameAsset ? heroSrc : requestedFlip) ||
    heroSrc ||
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
  const fromRadius = sourceRadiusPx(source)
  const toRadius = frameRadiusPx(flipHero)
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
    overflow: 'hidden',
    borderRadius: `${fromRadius}px`,
    opacity: '1',
  })
  document.body.appendChild(flyer)

  // Cover with flyer, then hide source — no blank frame / no hover-opacity dip
  hideFlipSource(source)

  // Backdrop fades in → hold → flyer scales → PDP UI.
  // From the materials grid the flight starts immediately, with the demo ease.
  const waitMs = (ms: number) =>
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms)
    })

  const fromArchive = flipSourceIsArchiveGrid()
  const fromCart = flipSourceIsCart()
  const startImmediate = flipSourceStartsImmediately()
  // Materials grid and (Pre)Crafted stay clear while the nav slides up.
  if (!fromArchive && !fromPrecrafted) setBackdropReady(true)
  await nextTick()
  if (fromPrecrafted && !(flipHero.complete && flipHero.naturalWidth > 0)) {
    // Page stays up while the nav leaves. Give the hero a short head start.
    await waitForImageLimited(flipHero)
    scrollGalleryInitial()
  } else if (fromArchive || fromCart) {
    // Start as soon as the hero frame has its real size — no cream hold.
    let stable = 0
    for (let i = 0; i < 24; i++) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve())
      })
      const w = flipHero.getBoundingClientRect().width
      if (w > from.width + 40) stable += 1
      else stable = 0
      if (stable >= 2) break
    }
  } else if (!startImmediate) {
    await waitMs(PRODUCT_OVERLAY_BACKDROP_OPEN_MS)
    await waitMs(PRODUCT_OVERLAY_FLYER_PAUSE_MS)
  }

  // Re-measure hero in case layout settled during the fade
  const toAfter = flipHero.getBoundingClientRect()
  const dest = toAfter.width >= 2 ? toAfter : to

  const state = Flip.getState(flyer)

  gsap.set(flyer, {
    top: dest.top,
    left: dest.left,
    width: dest.width,
    height: dest.height,
  })

  if (fromArchive) signalArchiveMotion('open')

  const openDuration = fromArchive ? ARCHIVE_PDP_OPEN_S : PRODUCT_OVERLAY_FLIP_OPEN_S
  // Cart leaves on the click — power2.inOut holds the aspect still at the start.
  const openEase = fromArchive
    ? ARCHIVE_PDP_OPEN_EASE
    : flipSourceIsCart()
      ? 'power3.out'
      : 'power2.inOut'

  // Animate width/height (not scale) so the bitmap isn’t stretched — the
  // cover crop simply reveals more of the image as the box finds its ratio.
  Flip.from(state, {
    duration: openDuration,
    ease: openEase,
    absolute: true,
    scale: false,
    onComplete: () => {
      const reveal = () => {
        // Reveal strip + hero under the flyer before removing it — avoids a
        // blank frame and prevents the gallery from flashing ahead of Flip.
        gsap.set(flipHero, { visibility: 'visible' })
        if (fromArchive || fromPrecrafted) setBackdropReady(true)
        requestAnimationFrame(() => {
          heartHold.value = false
        })
        clearPendingFlip()
        contentReady.value = true
        sidesVisible.value = true
        galleryVisible.value = true
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            flyer.remove()
          })
        })
      }
      if (!fromPrecrafted || (flipHero.complete && flipHero.naturalWidth > 0)) reveal()
      else {
        flipHero.addEventListener('load', reveal, { once: true })
        flipHero.addEventListener('error', reveal, { once: true })
      }
    },
  })
  tweenCornerRadius(flyer, fromRadius, toRadius, openDuration, openEase)
}

const runFlipClose = async () => {
  if (!import.meta.client || flipCloseStarted.value) return
  flipCloseStarted.value = true
  if (imageExpanded.value) collapseImage()
  if (flipSourceIsArchiveGrid() && isFrameSaved(selectedIndex.value)) {
    heartOut.value = true
  }

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

  // After in-PDP nav, Flip still targets the original shell. Swap shell ↔
  // closing in the archive grid first (stable slot keys keep the Flip source
  // DOM in place) so the shell shows the closing product before we measure.
  const shellProductId = getFlipSourceProductId()
  const closingProductId = product.value._id
  if (
    shellProductId &&
    closingProductId &&
    shellProductId !== closingProductId &&
    flipSourceIsArchiveGrid()
  ) {
    requestGridSwap(shellProductId, closingProductId)
    await nextTick()
    await nextTick()
  }

  // Prep return thumb while chrome is exiting (under the solid backdrop)
  setReturnImage(closingProductId, selectedIndex.value, hero.currentSrc || hero.src)
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

  const fromArchive = flipSourceIsArchiveGrid()
  const startImmediate = flipSourceStartsImmediately()
  if (!startImmediate) {
    const chromeElapsed = performance.now() - uiFadeStarted
    await waitMs(Math.max(0, PRODUCT_OVERLAY_CHROME_EXIT_MS - chromeElapsed))
  }

  contentReady.value = false
  sidesVisible.value = false
  chromeEnterMotion.value = false
  await nextTick()
  if (!startImmediate) await waitMs(PRODUCT_OVERLAY_UI_FADE_MS)

  // Panel cream can drop now that chrome is gone. The page backdrop stays
  // up until the return flyer is on screen, so closing doesn't flash empty.
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
    overflow: 'hidden',
    borderRadius: `${frameRadiusPx(hero)}px`,
  })
  // Decode before the hero is hidden — an empty flyer leaves a frame of background.
  if (!flyer.complete) await waitForImage(flyer)
  gsap.set(hero, { visibility: 'hidden' })
  hideFlipSource(source)
  document.body.appendChild(flyer)
  // Cream leaves behind the flyer, once the picture is actually covering it.
  if (startImmediate) setBackdropReady(false)

  // 2) Flyer returns to the grid thumb
  const state = Flip.getState(flyer)
  const closeFromRadius = frameRadiusPx(hero)
  const closeToRadius = sourceRadiusPx(source)

  gsap.set(flyer, {
    top: to.top,
    left: to.left,
    width: to.width,
    height: to.height,
    objectFit: sourceFit,
  })

  const archiveClose = flipSourceIsArchiveGrid()
  const immediateClose = flipSourceStartsImmediately()
  if (archiveClose) signalArchiveMotion('close')

  const closeDuration = archiveClose ? ARCHIVE_PDP_CLOSE_S : PRODUCT_OVERLAY_FLIP_CLOSE_S
  const closeEase = archiveClose
    ? ARCHIVE_PDP_CLOSE_EASE
    : flipSourceIsCart()
      ? 'power3.out'
      : 'power2.inOut'

  Flip.from(state, {
    duration: closeDuration,
    ease: closeEase,
    onComplete: () => {
      // Restore thumb under the flyer, then unmount the overlay immediately.
      // A body-level veil (pointer-events: none) continues the cream fade so
      // the grid is clickable while it dissolves — the overlay shell was
      // blocking hits even at opacity 0.
      source.style.transition = 'none'
      source.style.visibility = ''
      source.style.opacity = '1'
      source.style.filter = 'grayscale(0)'
      if (immediateClose) {
        finishClose()
        flyer.remove()
        return
      }
      const veil = spawnCloseVeil()
      finishClose()
      fadeVeilAndCleanup(veil)
      dismissFlyer(flyer)
    },
  })
  tweenCornerRadius(flyer, closeFromRadius, closeToRadius, closeDuration, closeEase)
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
      applyProduct(next)
      selectedIndex.value = 0

      await nextTick()
      if (token !== slugSwapToken) return
      scrollGalleryInitial()
      resizeGalleryLenis()

      const hero = heroRef.value
      if (hero && !hero.complete) await waitForImage(hero)
      if (token !== slugSwapToken) return

      galleryVisible.value = true
      scrollGalleryInitial()
      return
    }

    galleryVisible.value = false
    flipStarted.value = false
    flipCloseStarted.value = false
    contentReady.value = false
    sidesVisible.value = false
    chromeEnterMotion.value = false
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
  --pdp-aside-padding: 17px;
  --pdp-aside-spec-height: 40px;
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
  transition: none;
  pointer-events: none;
  /* Side columns are not dismiss targets — never inherit the stage close cursor */
  cursor: auto;
}

.pdp--sides .pdp__col--left,
.pdp--sides .pdp__col--right {
  opacity: 1;
  pointer-events: auto;
}

.pdp--chrome-enter .pdp__col--left,
.pdp--chrome-enter .pdp__col--right {
  transition: opacity 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.pdp__col--left {
  position: absolute;
  top: var(--pdp-aside-top);
  left: var(--pdp-aside-left);
  right: auto;
  bottom: unset;
  z-index: 120; /* above header logo (100) and index rail (110) */
  width: var(--side-column-width);
  height: auto;
  max-height: 100%;
  min-height: 0;
  border: 1px solid var(--grid-line);
  corner-shape: squircle;
  background: color-mix(in srgb, var(--cream) 70%, transparent);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  box-sizing: border-box;
  transform: none;
}

.pdp--sides .pdp__col--left {
  transform: none;
}

/* Close: aside fades in place. The index-rail offset stays put. */
.pdp--closing.pdp--sides .pdp__col--left {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.pdp__col--right {
  border-left: 1px solid var(--grid-line);
  overflow: hidden;
}

.pdp__col--center {
  /* Full-bleed gallery — floating aside sits over it.
     Above the fixed header logo (100), below the index rail (110)
     and the info card (120). */
  position: relative;
  grid-column: 1 / -1;
  grid-row: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  align-items: stretch;
  align-self: stretch;
  height: 100%;
  min-height: 0;
  z-index: 105;
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
  overflow-x: hidden;
  overflow-y: auto;
  scroll-behavior: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  /* Don't inherit the stage close cursor into image gaps / strip chrome */
  cursor: auto;
}

.pdp__strip-track {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--pdp-gallery-gap);
  height: max-content;
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  /* Gallery inset on every side. The related rail covers the right of the
     viewport, so the extra right padding keeps frames centred in the clear span. */
  padding: var(--pdp-gallery-padding);
  padding-right: calc(var(--pdp-related-rail-width) + var(--pdp-gallery-padding));
  padding-left: calc(var(--side-column-width) + var(--pdp-gallery-padding) + calc(var(--pdp-aside-left) * 1));
}

.pdp__strip--single .pdp__strip-track {
  height: 100%;
}

.pdp__strip::-webkit-scrollbar {
  display: none;
}

.pdp__strip-item {
  position: relative;
  margin: 0;
  flex: 0 0 auto;
  width: 100%;
  height: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
}

.pdp__strip--single .pdp__strip-item {
  height: 100%;
  max-height: 100%;
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
  /* Width follows the ratio at the capped height, and clamps when the frame is wider than the clear span. */
  width: min(
    100%,
    calc((100vh - (var(--pdp-gallery-gap) * 2)) * var(--pdp-ar, 1))
  );
  max-height: calc(100vh - (var(--pdp-gallery-gap) * 2));
  aspect-ratio: var(--pdp-ar, 1);
  height: auto;
  flex: 0 0 auto;
  display: flex;
  align-items: stretch;
  line-height: 0;
  overflow: hidden;
  border-radius: var(--thumb-radius);
  background: transparent;
  /* Hide the reserved frame until the bitmap is ready — no placeholder wash */
  visibility: hidden;
}

.pdp__strip--single .pdp__strip-item .pdp__hero-frame {
  height: 100%;
  max-height: 100%;
  width: auto;
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

/* Match hero fade — don’t flash the heart over an empty/transparent frame.
   Touch: the heart stays on every ready frame. */
.pdp__hero-frame--ready .pdp__frame-add {
  opacity: 1;
  pointer-events: auto;
}

/* Desktop: an inactive heart only appears over the frame. A saved heart stays. */
@media (hover: hover) and (pointer: fine) {
  .pdp__hero-frame--ready .pdp__frame-add {
    opacity: 0;
    pointer-events: none;
  }

  .pdp__hero-frame--ready:hover .pdp__frame-add,
  .pdp__hero-frame--ready:focus-within .pdp__frame-add,
  .pdp__hero-frame--ready .pdp__frame-add.add-btn--active {
    opacity: 1;
    pointer-events: auto;
  }
}

/* Saved item: heart stays out until the open Flip has landed, then fades in. */
.pdp--heart-hold .pdp__strip-item--active .pdp__frame-add {
  opacity: 0;
  pointer-events: none;
}

/* Close: the heart on the active gallery frame leaves before the image. */
.pdp--heart-out .pdp__strip-item--active .pdp__frame-add {
  opacity: 0;
  pointer-events: none;
  transition-duration: 0.12s;
}

.pdp__frame-add :deep(.add-btn__icon) {
  background: var(--thumb-ctrl-bg);
}

.pdp__strip-item .pdp__hero-image {
  display: block;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: 100%;
  object-fit: cover;
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

/* Above the selection stack (355) and its dock (430). */
.pdp__zoom {
  position: fixed;
  inset: 0;
  z-index: 440;
  overflow: auto;
  background: var(--cream);
  scrollbar-width: none;
  cursor: auto;
  touch-action: none;
}

.pdp__zoom--hold {
  visibility: hidden;
}

.pdp__zoom::-webkit-scrollbar {
  display: none;
}

.pdp__zoom-image {
  display: block;
  width: 100%;
  height: auto;
  max-width: none;
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
    display:none;
}

.pdp__close {
  justify-self: start;
  font-size: var(--text-sm);
  text-decoration: underline;
  text-underline-offset: 4px;
  color: var(--charcoal);
}

.pdp__meta {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  font-size: var(--text-sm);
  color: var(--charcoal);
}

.pdp__meta-sep {
  flex-shrink: 0;
  color: var(--muted);
}

.pdp__meta-order {
  color: var(--muted);
}

.pdp__body {
  width: 100%;
  padding: 0;
  flex: 0 1 auto;
  min-height: 0;
}

.pdp__title {
  margin: 0;
  padding: var(--pdp-aside-padding);
  font-family: var(--mono);
  font-size: 18px;
  line-height: 1.45;
  font-weight: 400;
  color: var(--charcoal);
}

.pdp__action-split--pair {
  display: flex;
}

.pdp__action-split--pair > .pdp__rail-btn {
  flex: 1 1 50%;
  width: 50%;
}

.pdp__action-split--pair > .pdp__rail-btn + .pdp__rail-btn {
  border-left: 1px dotted var(--grid-line);
}

.pdp__title-add {
  float: right;
  margin: 0 0 0 0.35em;
  --thumb-ctrl-size: 23px;
  --thumb-ctrl-color: var(--charcoal);
  --thumb-ctrl-bg: transparent;
  --thumb-ctrl-blend: normal;
  vertical-align: middle;
}

.pdp__title-add:hover {
  --thumb-ctrl-color: var(--charcoal);
}

.pdp__title-add :deep(.add-btn__icon) {
  margin-right: -8px;
  background: transparent;
}

.pdp__specs {
  margin: 0;
}

.pdp__precrafted {
  padding: 0;
}

.pdp__precrafted-body {
  padding: 0 var(--pdp-aside-padding);
}

.pdp__precrafted .pdp__spec-panel {
  padding: 0;
}

.pdp__precrafted-description {
  margin: 0.35rem 0 1.25rem;
  font-size: 13px;
  line-height: 1.55;
  color: color-mix(in srgb, currentColor 80%, transparent);
}

.pdp__precrafted :deep(.info__panel-inner),
.pdp__precrafted :deep(.info__panel-inner p),
.pdp__precrafted :deep(.info__note),
.pdp__precrafted :deep(.info__dimensions) {
  font-size: 13px;
  color: color-mix(in srgb, currentColor 80%, transparent);
}

.pdp__precrafted :deep(.info__price) {
  color: currentColor;
  opacity: 1;
}

.pdp__precrafted :deep(.info__item) {
  border-top: 1px solid var(--grid-line);
}

.pdp__spec {
  display: grid;
  grid-template-columns: 100px 1fr;
  align-items: baseline;
  gap: 0.75rem;
  padding: 0 0;
  /* border-top: 1px solid var(--grid-line); */
}

.pdp__spec--toggle {
  display: block;
  border-top: 1px solid var(--grid-line);
  /* border-bottom: 1px solid var(--grid-line); */
}

.pdp__spec--toggle > .pdp__disclosure {
  display: flex;
  width: 100%;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 14px var(--pdp-aside-padding);
  font-family: var(--mono);
  text-align: left;
}


.pdp__spec-item {
  padding: 14px 0;
  border-top: 1px solid var(--grid-line);
  min-height: var(--pdp-aside-spec-height);
  font-size: var(--text-sm);
}


.pdp__spec-panel {
  display: grid;
  grid-template-rows: 0fr;
  padding: 0 var(--pdp-aside-padding);
  transition: grid-template-rows 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}

.pdp__spec-panel-clip > .pdp__spec-item:last-child {
  padding-bottom: 20px;
}

.pdp__spec-panel.is-open {
  grid-template-rows: 1fr;
}

.pdp__spec-panel-clip {
  min-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.4s ease 0.05s;
}

.pdp__spec-panel.is-open .pdp__spec-panel-clip {
  opacity: 1;
}



@media (prefers-reduced-motion: reduce) {
  .pdp__spec-panel,
  .pdp__spec-panel-clip {
    transition: none;
  }
}

.pdp__spec dt {
  color: var(--charcoal);
  opacity: 0.6;
}

.pdp__spec dd {
  margin: 0;
}

.pdp__disclosure {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  border: 0;
  background: none;
  font-family: inherit;
  font-weight: inherit;
  letter-spacing: normal;
  text-transform: none;
  cursor: pointer;
}

.pdp__disclosure-mark {
  display: block;
  width: 11px;
  height: 9px;
  flex-shrink: 0;
  align-self: center;
  overflow: visible;
}

.pdp__disclosure-mark path {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: butt;
  stroke-linejoin: miter;
  /* Ends and the tip trade Y, so the chevron flips in place. */
  d: path("M1 3 L7 9 L13 3");
  transition: d 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.pdp__disclosure[aria-expanded='true'] .pdp__disclosure-mark path {
  d: path("M1 9 L7 3 L13 9");
}

@media (prefers-reduced-motion: reduce) {
  .pdp__disclosure-mark path {
    transition: none;
  }
}

.pdp__options {
  display: flex;
  flex-direction: column;
  align-items: start;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--charcoal);
  font-size: var(--text-sm);
  text-align: left;
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
  color: var(--charcoal);
  cursor: pointer;
  transition: color 0.2s ease;
  font-size:inherit;
}

.pdp__spec-download:hover {
  color: var(--accent);
}

.pdp__spec-download-arrow {
  font-size: 120%;
  line-height: 1;
}

.pdp__actions {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 0;
  margin-bottom: 0;
  padding: 0;
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

.pdp__rail-btn[hidden] {
  display: none;
}

.pdp__rail-btn {
  display: block;
  width: 100%;
  margin: 0;
  padding: 13px;
  border: 0;
  background: var(--background-color);
  color: currentColor;
  font-size: 12px;
  font-family: var(--mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: opacity 0.2s ease, background 0.2s ease;
}

.pdp__rail-btn:hover {
  background: color-mix(in srgb, var(--background-color) 93%, currentColor);
}

.pdp__rail-btn[aria-pressed='true'],
.pdp__rail-btn[aria-pressed='true']:hover {
  background: color-mix(in srgb, var(--background-color) 86%, currentColor);
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
}

.pdp__info-text {
  margin: 0 0 1rem;
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
  /* First paint, before the phone override is applied: keep specs shut. */
  .pdp:not(.pdp--specs-live) .pdp__spec-panel,
  .pdp:not(.pdp--specs-live) .pdp__spec-panel.is-open {
    grid-template-rows: 0fr;
  }

  .pdp:not(.pdp--specs-live) .pdp__spec-panel-clip {
    opacity: 0;
  }

  .pdp:not(.pdp--specs-live) .pdp__disclosure[aria-expanded='true'] .pdp__disclosure-mark path {
    d: path("M1 3 L7 9 L13 3");
  }

  .pdp,
  .pdp--standalone {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    min-height: 0;
    overflow: auto;
    padding-bottom: 0;
    -webkit-overflow-scrolling: touch;
  }

  .pdp__col {
    height: auto;
    overflow: visible;
  }

  .pdp__col--left,
  .pdp__col--right {
    border: none;
  }

  .pdp__toolbar {
    display: flex;
    position: sticky;
    top: 0;
    z-index: 20;
    flex: 0 0 auto;
    height: var(--toolbar-height);
    min-height: var(--toolbar-height);
    background: var(--background-color);
  }

  /* Aside, body, and actions drop their boxes so Enquire can stick to the page. */
  .pdp__col--left,
  .pdp__body,
  .pdp__actions {
    display: contents;
  }

  .pdp__col--center {
    order: 1;
    position: relative;
    grid-column: auto;
    grid-row: auto;
    flex: 0 0 auto;
    align-self: stretch;
    height: auto;
    min-height: auto;
    max-height: none;
    overflow: visible;
    z-index: auto;
  }

  .pdp__stage {
    position: relative;
    flex: none;
    height: auto;
    min-height: auto;
    max-height: none;
    padding: 0;
    overflow: visible;
  }

  .pdp__strip {
    position: relative;
    flex: none;
    align-items: stretch;
    height: auto;
    min-height: auto;
    max-height: none;
    overflow: visible;
    transition: none;
  }

  .pdp__inquire {
    position: sticky;
    top: var(--toolbar-height);
    z-index: 25;
    flex: 0 0 auto;
  }

  .pdp__strip-track,
  .pdp--index-hidden .pdp__strip-track,
  .pdp--related-hidden .pdp__strip-track,
  .pdp__strip--single .pdp__strip-track {
    position: relative;
    align-items: stretch;
    gap: 0;
    height: auto;
    min-height: 0;
    padding: 0;
  }

  .pdp__strip-item,
  .pdp__strip--single .pdp__strip-item {
    width: 100%;
    height: auto;
    max-height: none;
  }

  .pdp__strip-item .pdp__hero-frame,
  .pdp__strip--single .pdp__strip-item .pdp__hero-frame {
    width: 100%;
    max-width: 100%;
    height: auto;
    max-height: none;
    border-radius: 0;
  }

  .pdp__rail-btn--loupe,
  .pdp__rail-btn--related,
  .pdp__action-split {
    display: none;
  }

  .pdp__col--left {
    position: relative;
    top: auto;
    left: auto;
    right: auto;
    bottom: auto;
    flex: 0 0 auto;
    width: 100%;
    height: auto;
    min-height: auto;
    max-height: none;
    overflow: visible;
    border-radius: 0;
    corner-shape: initial;
    border: none;
    background: transparent;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    z-index: auto;
    transform: none;
  }

  .pdp__col--right {
    display: none;
  }
}
</style>
