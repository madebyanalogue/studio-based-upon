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
      'pdp--gallery': galleryVisible,
    }"
  >
    <aside class="pdp__col pdp__col--left">
      <div class="pdp__toolbar">
        <button type="button" class="pdp__close  interface" @click="$emit('close')">Close</button>
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

      <div
        class="pdp__body pdp__pane-fade"
        :class="{ 'pdp__pane-fade--out': !paneContentVisible }"
      >
        <h1 class="pdp__title">{{ product.title }}</h1>

        <dl class="pdp__specs">
          <div class="pdp__spec pdp__spec--toggle">
            <button
              type="button"
              class="pdp__disclosure"
              :aria-expanded="showSpecs"
              @click="showSpecs = !showSpecs"
            >
              <span class="serif-italic">Specifications</span>
              <span class="pdp__disclosure-mark">{{ showSpecs ? '−' : '+' }}</span>
            </button>
            <div v-if="showSpecs" class="pdp__spec-panel">
              <div v-if="product.style" class="pdp__spec">
                <dt class="serif-italic">Style</dt>
                <dd>{{ product.style }}</dd>
              </div>
              <div v-if="product.dimensions" class="pdp__spec">
                <dt class="serif-italic">Dimensions</dt>
                <dd>{{ product.dimensions }}</dd>
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
              <div class="pdp__spec pdp__spec--download">
                <dt class="serif-italic">Spec Sheet</dt>
                <dd>
                  <button type="button" class="pdp__spec-download" @click="downloadSpec">
                    Download <span class="pdp__spec-download-arrow" aria-hidden="true">↓</span>
                  </button>
                </dd>
              </div>
            </div>
          </div>
        </dl>

        <section v-if="product.description || product.edition" class="pdp__info">
          <button
            type="button"
            class="pdp__disclosure pdp__info-toggle"
            :aria-expanded="showInfo"
            @click="showInfo = !showInfo"
          >
            <span class="serif-italic">Info</span>
            <span class="pdp__disclosure-mark">{{ showInfo ? '−' : '+' }}</span>
          </button>
          <div v-if="showInfo" class="pdp__info-panel">
            <p v-if="product.description" class="pdp__info-text">{{ product.description }}</p>
            <p v-if="product.edition" class="pdp__info-text">{{ product.edition }}</p>
          </div>
        </section>

        <div class="pdp__actions">
          <button type="button" class="pdp__inquire" @click="sendEnquiry">Enquire About This</button>
        </div>

        <div v-if="product.finishes?.length" class="pdp__links">
          <button
            type="button"
            class="pdp__link interface"
            @click="showFinishes = !showFinishes"
          >
            Finishes
          </button>
        </div>

        <ul v-if="showFinishes && product.finishes?.length" class="pdp__finishes">
          <li v-for="finish in product.finishes" :key="finish">{{ finish }}</li>
        </ul>

        <div v-if="nextProduct" class="pdp__next">
          <button type="button" class="pdp__next-label  interface" @click="goToNext">
            Next Product
          </button>
          <button type="button" class="pdp__next-media" @click="goToNext">
            <img :src="nextImageUrl" :alt="nextProduct.title" />
          </button>
        </div>
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
          @scroll.passive="onStripScroll"
        >
          <figure
            v-for="(entry, i) in galleryEntries"
            :key="entry.id"
            class="pdp__strip-item"
            :class="{ 'pdp__strip-item--active': i === selectedIndex }"
            :data-strip-index="i"
          >
            <div
              class="pdp__hero-frame"
              :class="{ 'pdp__hero-frame--zoomed': i === selectedIndex && imageExpanded }"
            >
              <img
                :ref="(el) => setStripImageRef(i, el)"
                :src="
                  i === selectedIndex && imageExpanded && frameZoomHiRes
                    ? entry.zoomSrc || entry.src
                    : entry.src
                "
                :alt="`${product.title} — image ${i + 1}`"
                class="pdp__hero-image"
                :class="{ 'pdp__hero-image--zoomed': i === selectedIndex && imageExpanded }"
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
                @click.stop="onStripImageClick(i, $event)"
                @mousemove="onFrameZoomMove($event, i)"
              />
              <AddButton
                class="pdp__add"
                :active="isImageSaved(i)"
                :label="isImageSaved(i) ? `Remove ${product.title} from selection` : `Add ${product.title} to selection`"
                @click.stop="onToggleImage(entry, i, $event)"
              />
            </div>
          </figure>
        </div>

        <p v-else class="pdp__gallery-empty interface">
          No images available.
        </p>
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
import { PRODUCT_TYPE_FILTERS } from '~/composables/demoData'
import { IMAGE_WIDTH, prefetchImage } from '~/composables/useSanityImage'
import {
  PRODUCT_OVERLAY_BACKDROP_CLOSE_EASE,
  PRODUCT_OVERLAY_BACKDROP_OPEN_MS,
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
const { imageUrl } = useSanityImage()
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
const { items: libraryItems } = await useLibraryCatalog()

// Stable key so in-PDP nav never clears `product` (which would unmount the
// index rail and reset its scroll). Soft-swap assigns the next product in place.
const pdpDataKey = props.standalone ? 'product-detail-standalone' : 'product-detail-overlay'
const { data: product, refresh } = await useAsyncData(
  pdpDataKey,
  () => fetchProduct(props.slug),
  {
    getCachedData(key, nuxtApp) {
      const cached =
        nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]
      // Only reuse cache when it matches the slug we're opening
      if (cached && (cached as { slug?: string }).slug === props.slug) {
        return cached
      }
      return undefined
    },
  },
)

const libraryItem = computed(() =>
  libraryItems.value.find((item) => item._id === product.value?._id),
)

const typeLabel = computed(() => {
  const key =
    libraryItem.value?.category ||
    libraryItem.value?.type ||
    product.value?.series ||
    ''
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

const showSpecs = ref(false)
const showInfo = ref(false)
const showFinishes = ref(false)
const heroRef = ref<HTMLImageElement | null>(null)
const stageRef = ref<HTMLElement | null>(null)
const stripRef = ref<HTMLElement | null>(null)
const contentReady = ref(false)
const sidesVisible = ref(false)
const galleryVisible = ref(false)
/** Fades left/center copy + gallery; column rules stay put */
const paneContentVisible = ref(true)
let slugSwapToken = 0
const flipStarted = ref(false)
const flipCloseStarted = ref(false)
const selectedIndex = ref(openImageIndex.value)
/** In-frame gallery zoom (stays inside the image footprint) */
const imageExpanded = ref(false)
const frameZoomHiRes = ref(false)
const zoomOriginX = ref(50)
const zoomOriginY = ref(50)
const FRAME_ZOOM_SCALE = 2.5
let stripScrollRaf = 0
let frameZoomToken = 0

const setStripImageRef = (index: number, el: Element | null) => {
  if (index === selectedIndex.value && el instanceof HTMLImageElement) {
    heroRef.value = el
  }
}

const isImageSaved = (index: number) =>
  isSaved(product.value?._id || '', galleryEntries.value.length > 1 ? index : undefined)

const onStripImageLoad = (index: number) => {
  if (index !== selectedIndex.value) return
  // Bind hero before Flip measures — ref callbacks can race the first paint
  const img = stripRef.value?.querySelector<HTMLImageElement>(
    `[data-strip-index="${index}"] .pdp__hero-image`,
  )
  if (img) heroRef.value = img
  if (!flipStarted.value) void runFlipOpen()
}

type GalleryEntry = {
  id: string
  /** PDP resting hero */
  src: string
  /** Small gallery strip */
  thumbSrc: string
  /** Expanded zoom */
  zoomSrc: string
}

const galleryEntries = computed((): GalleryEntry[] => {
  if (!product.value) return []

  const assets = [
    product.value.image,
    ...(product.value.gallery || []),
    ...(product.value.spiritGallery || []),
  ].filter(Boolean)

  const seen = new Set<string>()
  const entries: GalleryEntry[] = []

  for (const asset of assets) {
    const src = imageUrl(asset, IMAGE_WIDTH.hero)
    if (!src) continue
    const key = src.replace(/\?.*$/, '')
    if (seen.has(key)) continue
    seen.add(key)
    entries.push({
      id: `${product.value!._id}-img-${entries.length}`,
      src,
      thumbSrc: imageUrl(asset, IMAGE_WIDTH.strip) || src,
      zoomSrc: imageUrl(asset, IMAGE_WIDTH.zoom) || src,
    })
  }

  return entries
})

const activeEntry = computed(
  () => galleryEntries.value[selectedIndex.value] || galleryEntries.value[0] || null,
)

// Prefetch the full gallery once the PDP is open so thumb clicks aren't cold
watch(
  [galleryEntries, contentReady],
  ([entries, ready]) => {
    if (!ready || !entries.length) return
    for (const entry of entries) {
      void prefetchImage(entry.src)
    }
    // Active zoom first; remaining zoom tiers after heroes have a head start
    const active = entries[selectedIndex.value] || entries[0]
    if (active?.zoomSrc) void prefetchImage(active.zoomSrc)
    if (!import.meta.client) return
    window.setTimeout(() => {
      for (const entry of entries) {
        if (entry.zoomSrc) void prefetchImage(entry.zoomSrc)
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
})

const selectImage = (index: number) => {
  if (index < 0 || index >= galleryEntries.value.length) return
  selectedIndex.value = index
  collapseImage()
  nextTick(() => {
    const strip = stripRef.value
    const img = strip?.querySelector<HTMLImageElement>(
      `[data-strip-index="${index}"] .pdp__hero-image`,
    )
    if (img) heroRef.value = img
    scrollSelectedIntoView(true)
  })
}

const cycleImage = (direction: 1 | -1) => {
  const count = galleryEntries.value.length
  if (count < 2) return
  selectImage((selectedIndex.value + direction + count) % count)
}

/** Center the active frame in the visible strip. */
const scrollSelectedIntoView = (smooth = false) => {
  const strip = stripRef.value
  if (!strip) return
  const item = strip.querySelector<HTMLElement>(
    `[data-strip-index="${selectedIndex.value}"]`,
  )
  if (!item) return
  const target = item.offsetLeft + item.offsetWidth / 2 - strip.clientWidth / 2
  strip.scrollTo({
    left: Math.max(0, target),
    behavior: smooth ? 'smooth' : 'auto',
  })
}

/** Hard-load + open rail: park at scrollLeft 0 so frames clear the rail padding. */
const scrollGalleryInitial = () => {
  if (props.standalone && indexRailVisible.value) {
    stripRef.value?.scrollTo({ left: 0, behavior: 'auto' })
    return
  }
  scrollSelectedIntoView(false)
}

const syncSelectedFromScroll = () => {
  const strip = stripRef.value
  if (!strip || !galleryEntries.value.length) return
  const focusX = strip.scrollLeft + strip.clientWidth / 2
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
    const img = strip.querySelector<HTMLImageElement>(
      `[data-strip-index="${best}"] .pdp__hero-image`,
    )
    if (img) heroRef.value = img
  }
}

const onStripScroll = () => {
  if (stripScrollRaf) cancelAnimationFrame(stripScrollRaf)
  stripScrollRaf = requestAnimationFrame(() => {
    stripScrollRaf = 0
    syncSelectedFromScroll()
  })
}

let wheelUnlockTimer: ReturnType<typeof setTimeout> | null = null

const setZoomOriginFromEvent = (event: MouseEvent, el: HTMLElement) => {
  const rect = el.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  zoomOriginX.value = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100))
  zoomOriginY.value = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100))
}

const collapseImage = () => {
  frameZoomToken += 1
  imageExpanded.value = false
  frameZoomHiRes.value = false
}

const enterFrameZoom = async (event: MouseEvent) => {
  const img = event.currentTarget as HTMLImageElement | null
  if (!img) return
  setZoomOriginFromEvent(event, img)
  imageExpanded.value = true

  const src = activeEntry.value?.zoomSrc
  if (!src || src === activeEntry.value?.src) return

  const token = ++frameZoomToken
  await prefetchImage(src)
  if (token !== frameZoomToken || !imageExpanded.value) return
  frameZoomHiRes.value = true
}

const onHeroClick = (event: MouseEvent) => {
  if (imageExpanded.value) collapseImage()
  else void enterFrameZoom(event)
}

const onStripImageClick = (index: number, event: MouseEvent) => {
  if (index !== selectedIndex.value) {
    selectImage(index)
    return
  }
  onHeroClick(event)
}

const onFrameZoomMove = (event: MouseEvent, index: number) => {
  if (!imageExpanded.value || index !== selectedIndex.value) return
  const img = event.currentTarget as HTMLImageElement | null
  if (!img) return
  setZoomOriginFromEvent(event, img)
}

/** Close PDP when clicking empty stage chrome (not the image / thumbs / controls). */
const onStageClick = (event: MouseEvent) => {
  if (imageExpanded.value) {
    collapseImage()
    return
  }
  const target = event.target as HTMLElement | null
  if (!target) return
  // Dismiss on letterbox / stage chrome only — not the gallery strip, images, or controls
  if (target.closest('.pdp__hero-image, .pdp__strip, .pdp__strip-item, .pdp__add, button, a')) return
  emit('close')
}

/** Vertical wheel → horizontal scroll; horizontal wheel stays horizontal. */
const onStageWheel = (event: WheelEvent) => {
  if (imageExpanded.value) return
  const strip = stripRef.value
  if (!strip || galleryEntries.value.length < 2) return
  event.preventDefault()
  const delta =
    Math.abs(event.deltaX) >= Math.abs(event.deltaY) ? event.deltaX : event.deltaY
  if (!delta) return
  strip.scrollLeft += delta
}

const onGalleryKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && imageExpanded.value) {
    event.preventDefault()
    collapseImage()
    return
  }
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
  // Cached image may already be complete before @load fires
  nextTick(() => {
    stageRef.value?.addEventListener('wheel', onStageWheel, { passive: false })
    scrollGalleryInitial()
    if (heroRef.value?.complete) void runFlipOpen()
    else if (!activeEntry.value) revealWithoutFlip()
  })
  window.addEventListener('keydown', onGalleryKeydown)
})

onUnmounted(() => {
  stageRef.value?.removeEventListener('wheel', onStageWheel)
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

const nextProduct = computed(() => (product.value ? getNextProduct(product.value.slug) : null))
const nextImageUrl = computed(() =>
  nextProduct.value ? imageUrl(nextProduct.value.image, IMAGE_WIDTH.thumb) : '',
)

const goToNext = () => {
  if (nextProduct.value) emit('navigate', nextProduct.value.slug)
}

const onToggleImage = (entry: GalleryEntry, index: number, event?: Event) => {
  if (!product.value) return
  const urls = galleryEntries.value.map((g) => g.src)
  const fromEvent =
    (event?.currentTarget as HTMLElement | null)?.closest?.('.pdp__hero-frame')?.querySelector(
      '.pdp__hero-image',
    ) || (event?.currentTarget as HTMLElement | null)
  const source =
    (fromEvent instanceof HTMLElement ? fromEvent : null) ||
    heroRef.value ||
    null
  requestSave(
    {
      id: product.value._id,
      title: product.value.title,
      imageUrl: entry.src,
      itemType: product.value.series || 'item',
      link: `/materials-and-forms/${product.value.slug}`,
      imageUrls: urls.length > 1 ? urls : undefined,
      imageIndex: urls.length > 1 ? index : undefined,
    },
    { source },
  )
}

const isCurrentImageSaved = computed(() => {
  if (!product.value) return false
  const index = galleryEntries.value.length > 1 ? selectedIndex.value : undefined
  return isSaved(product.value._id, index)
})

/** Same fly-to-pile as the hero heart — always the current gallery image. */
const onAddToSelection = () => {
  if (!product.value || !activeEntry.value) return
  const entry = activeEntry.value
  const index = selectedIndex.value
  const urls = galleryEntries.value.map((g) => g.src)
  const source = heroRef.value
  requestSave(
    {
      id: product.value._id,
      title: product.value.title,
      imageUrl: entry.src,
      itemType: product.value.series || 'item',
      link: `/materials-and-forms/${product.value.slug}`,
      imageUrls: urls.length > 1 ? urls : undefined,
      imageIndex: urls.length > 1 ? index : undefined,
    },
    { source },
  )
}

const sendEnquiry = () => {
  if (!product.value) return
  const image =
    activeEntry.value?.src || imageUrl(product.value.image, 900) || undefined
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
      // Reveal hero under the flyer first so removing it can’t flash empty
      gsap.set(flipHero, { visibility: 'visible' })
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          flyer.remove()
          // PDP chrome only after the flyer has landed
          clearPendingFlip()
          contentReady.value = true
          sidesVisible.value = true
          galleryVisible.value = true
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

  const UI_FADE_MS = PRODUCT_OVERLAY_UI_FADE_MS
  // Flyer is position:fixed, so it must not outlive the veil — the grid is
  // interactive again as soon as finishClose() runs and would scroll under it.
  const FLYER_HOLD_MS = PRODUCT_OVERLAY_CLOSE_FLYER_HOLD_MS
  const FLYER_FADE_MS = PRODUCT_OVERLAY_CLOSE_FLYER_FADE_MS
  const waitMs = (ms: number) =>
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms)
    })

  // 1) PDP UI fades out first — flyer must not move until this finishes
  const uiFadeStarted = performance.now()
  contentReady.value = false
  sidesVisible.value = false
  galleryVisible.value = false
  await nextTick()

  // Prep return thumb while UI is fading (under the solid backdrop)
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

  const uiElapsed = performance.now() - uiFadeStarted
  await waitMs(Math.max(0, UI_FADE_MS - uiElapsed))

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

    showSpecs.value = false
    showInfo.value = false
    showFinishes.value = false
    collapseImage()

    const token = ++slugSwapToken
    const alreadyOpen = contentReady.value || sidesVisible.value || flipStarted.value

    if (alreadyOpen) {
      flipStarted.value = true
      flipCloseStarted.value = false
      selectedIndex.value = 0
      paneContentVisible.value = true
      galleryVisible.value = true

      const next = await fetchProduct(slug)
      if (token !== slugSwapToken) return
      if (!next) return

      applyProduct(next)

      await nextTick()
      if (token !== slugSwapToken) return

      const hero = heroRef.value
      if (hero && !hero.complete) await waitForImage(hero)
      if (token !== slugSwapToken) return

      galleryVisible.value = true
      scrollSelectedIntoView(false)
      return
    }

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

    const token = ++slugSwapToken
    const next = await fetchProduct(slug)
    if (token !== slugSwapToken || !next) return
    applyProduct(next)
    selectedIndex.value = 0
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
  --index-rail-width: min(18vw, 250px);
  /* Shared by rail slot width + gallery clearance — keep in lockstep */
  --index-motion: 0.35s cubic-bezier(0.22, 1, 0.36, 1);
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
  transition: opacity 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  /* Side columns are not dismiss targets — never inherit the stage close cursor */
  cursor: auto;
}

.pdp--sides .pdp__col--left,
.pdp--sides .pdp__col--right {
  opacity: 1;
}

.pdp__col--left {
  position: absolute;
  top: unset;
  right: 20px;
  bottom: 20px;
  z-index: 4;
  width: var(--side-column-width);
  height: auto;
  max-height: calc(100% - 40px);
  min-height: 0;
  border: 1px solid var(--grid-line);
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
}

.pdp__strip {
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 1px;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  /* Clear the index rail; collapses in lockstep when the rail hides */
  padding-left: var(--index-rail-width);
  padding-right: 0;
  padding-top: 0;
  padding-bottom: 0;
  box-sizing: border-box;
  transition: padding-left var(--index-motion);
  /* Don't inherit the stage close cursor into image gaps / strip chrome */
  cursor: auto;
}

.pdp--index-hidden .pdp__strip {
  padding-left: 0;
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
  /* Sibling frames stay hidden until Flip lands, then fade in */
  opacity: 1;
  transition: opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.pdp:not(.pdp--gallery) .pdp__strip-item:not(.pdp__strip-item--active) {
  opacity: 0;
  pointer-events: none;
}

.pdp__strip-item .pdp__hero-frame {
  position: relative;
  height: 100%;
  max-height: 100%;
  width: auto;
  display: flex;
  align-items: stretch;
  line-height: 0;
  overflow: hidden;
}

.pdp__strip-item .pdp__hero-image {
  display: block;
  width: auto;
  height: 100%;
  max-width: none;
  max-height: 100%;
  object-fit: contain;
  cursor: zoom-in;
  transform-origin: center center;
  will-change: transform;
}

.pdp__strip-item .pdp__hero-image--zoomed {
  cursor: zoom-out;
}

/* Close cross only after the open flyer has finished */
.pdp--ready .pdp__stage {
  /* Match cart close control: 25×25 square with cross */
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='25' height='25' viewBox='0 0 25 25'%3E%3Crect x='0.5' y='0.5' width='24' height='24' fill='%23ffffff' stroke='%231a1a1a'/%3E%3Cpath d='M7.5 7.5l10 10M17.5 7.5l-10 10' stroke='%231a1a1a' stroke-width='1'/%3E%3C/svg%3E") 12 12, pointer;
}

/* Fully global selector — `:global(html.dark) .pdp__stage` was compiling to
   `html.dark { cursor: … }` and painting the close cursor site-wide. */
:global(html.dark .pdp--ready .pdp__stage) {
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
  cursor: zoom-in;
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
  padding: 1rem var(--gutter);
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

.pdp__add {
  position: absolute;
  top: var(--thumb-ctrl-inset);
  right: var(--thumb-ctrl-inset);
  z-index: 2;
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.pdp--ready .pdp__add {
  opacity: 1;
  pointer-events: auto;
}

.pdp__add:hover {
  /* transform: scale(1.06); */
}

.pdp__body {
  width: 100%;
  padding: 1.5rem var(--gutter) 1.65rem;
  flex: 0 1 auto;
  min-height: 0;
}

.pdp__title {
  margin: 0 0 1.5rem;
  font-family: var(--font-serif);
  font-size: var(--text-2xl);
  line-height: 1.15;
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
  border-top: 1px solid var(--grid-line);
}

.pdp__spec:last-child {
  border-bottom: 1px solid var(--grid-line);
}

.pdp__spec--toggle {
  display: block;
  padding: 0;
  border-top: 1px solid var(--grid-line);
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
  color: var(--muted);
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
  margin-top: 1.5rem;
  margin-bottom: 0;
}

.pdp__inquire {
  display: block;
  width: 100%;
  padding: 12px;
  background: var(--red);
  color: white;
  font-size: 14px;
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
  padding: 0;
  list-style: none;
  color: var(--muted);
  font-size: var(--text-sm);
}

.pdp__info {
  margin: 0;
  border-bottom: 1px solid var(--grid-line);
}

.pdp__info-toggle {
  display: flex;
  width: 100%;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 0;
  text-align: left;
}

.pdp__info-panel {
  padding-bottom: 0.85rem;
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
  aspect-ratio: 1;
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
    padding: 0 1rem;
    align-items: stretch;
    transition: none;
  }

  .pdp--index-hidden .pdp__strip {
    padding: 0 1rem;
  }

  .pdp__col--left {
    position: relative;
    top: auto;
    right: auto;
    bottom: auto;
    width: 100%;
    max-height: none;
    border-radius: 0;
    corner-shape: initial;
    border-bottom: 1px solid var(--grid-line);
    z-index: auto;
  }

  .pdp__col--right {
    display: none;
  }
}
</style>
