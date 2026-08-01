<template>
  <article
    v-if="product"
    class="pdp"
    :class="{
      'pdp--standalone': standalone,
      'pdp--ready': contentReady,
      'pdp--sides': sidesVisible,
      'pdp--zoomed': imageExpanded,
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
          <div v-if="materials.length" class="pdp__spec pdp__spec--toggle">
            <dt class="serif-italic">Materials</dt>
            <dd>
              <button type="button" class="pdp__disclosure" @click="showMaterials = !showMaterials">
                Options <span class="pdp__disclosure-mark">{{ showMaterials ? '−' : '+' }}</span>
              </button>
            </dd>
            <ul v-if="showMaterials" class="pdp__options">
              <li v-for="material in materials" :key="material">{{ material }}</li>
            </ul>
          </div>
        </dl>

        <div class="pdp__actions">
          <button type="button" class="pdp__inquire" @click="sendEnquiry">Enquire About This</button>
          <button
            type="button"
            class="pdp__save"
            :class="{ 'pdp__save--active': isCurrentImageSaved }"
            @click="onAddToSelection"
          >
            {{ isCurrentImageSaved ? 'Remove from My Selection' : 'Add to My Selection' }}
          </button>
        </div>

        <div class="pdp__links">
          <button type="button" class="pdp__link  interface" @click="downloadSpec">
            Download Spec Sheet
          </button>
          <button
            v-if="product.finishes?.length"
            type="button"
            class="pdp__link  interface"
            @click="showFinishes = !showFinishes"
          >
            Finishes
          </button>
        </div>

        <ul v-if="showFinishes && product.finishes?.length" class="pdp__finishes">
          <li v-for="finish in product.finishes" :key="finish">{{ finish }}</li>
        </ul>

        <section v-if="product.description || product.edition" class="pdp__info">
          <h2 class="pdp__info-heading  interface">info</h2>
          <p v-if="product.description" class="pdp__info-text">{{ product.description }}</p>
          <p v-if="product.edition" class="pdp__info-text">{{ product.edition }}</p>
        </section>

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
        <figure v-if="activeEntry" class="pdp__hero">
          <div class="pdp__hero-frame">
            <img
              ref="heroRef"
              :key="activeEntry.id"
              :src="activeEntry.src"
              :alt="`${product.title} — image ${selectedIndex + 1}`"
              class="pdp__hero-image"
              @load="onHeroLoad"
              @click.stop="onHeroClick"
            />
            <AddButton
              class="pdp__add"
              :active="isCurrentImageSaved"
              :label="isCurrentImageSaved ? `Remove ${product.title} from selection` : `Add ${product.title} to selection`"
              @click.stop="onToggleImage(activeEntry, selectedIndex)"
            />
          </div>

          <div
            v-if="galleryEntries.length > 1"
            class="pdp__thumbs"
            :class="{ 'pdp__thumbs--visible': galleryVisible }"
          >
            <button
              v-for="(entry, i) in galleryEntries"
              :key="entry.id"
              type="button"
              class="pdp__thumb"
              :class="{ 'pdp__thumb--active': i === selectedIndex }"
              :aria-label="`Show image ${i + 1}`"
              :aria-current="i === selectedIndex ? 'true' : undefined"
              @click.stop="selectImage(i)"
            >
              <img :src="entry.thumbSrc" alt="" loading="lazy" draggable="false" />
            </button>
          </div>
        </figure>

        <p v-else class="pdp__gallery-empty interface">
          No images available.
        </p>
      </div>
    </div>

    <aside
      class="pdp__col pdp__col--right"
      :class="{ 'pdp__col--right-collapsed': !relatedPanelOpen }"
      :aria-hidden="!hasRelatedItems ? true : undefined"
    >
      <template v-if="hasRelatedItems && relatedPanelOpen">
        <div class="pdp__toolbar pdp__related-toolbar">
          <h2 class="pdp__related-heading interface">More like this</h2>
          <button
            type="button"
            class="pdp__related-hide interface"
            @click="relatedPanelOpen = false"
          >
            Hide
          </button>
        </div>
        <div class="pdp__related" data-lenis-prevent>
          <ul class="pdp__related-list">
            <li v-for="item in visibleRelatedItems" :key="item._id" class="pdp__related-item">
              <button
                type="button"
                class="pdp__related-card mono"
                :aria-label="`View ${item.title}`"
                @click="onRelatedClick(item)"
              >
                <span class="pdp__related-pad">
                  <span class="pdp__related-media">
                    <img
                      v-if="item.imageUrl"
                      :src="item.imageUrl"
                      :alt="item.title"
                      loading="lazy"
                      draggable="false"
                    />
                  </span>
                </span>
                <span class="pdp__related-meta">
                  <span class="pdp__related-title">{{ item.title }}</span>
                  <span v-if="item.typeLabel" class="pdp__related-type">{{ item.typeLabel }}</span>
                </span>
              </button>
            </li>
          </ul>
        </div>
      </template>
      <button
        v-else-if="hasRelatedItems"
        type="button"
        class="pdp__related-reveal interface"
        @click="relatedPanelOpen = true"
      >
        More like this
      </button>
    </aside>

    <!-- Zoom covers center + right without resizing the grid -->
    <div
      v-show="zoomMounted"
      ref="zoomRef"
      class="pdp__zoom"
      :class="{
        'pdp__zoom--visible': imageExpanded,
        'pdp__zoom--fit-height': imageExpanded && zoomFit === 'height',
        'pdp__zoom--fit-width': imageExpanded && zoomFit === 'width',
      }"
      :data-lenis-prevent="imageExpanded && zoomFit === 'width' ? '' : undefined"
      @click="collapseImage"
    >
      <img
        v-if="zoomSrc"
        ref="zoomImgRef"
        class="pdp__zoom-image"
        :src="zoomSrc"
        :alt="`${product.title} — zoomed`"
        draggable="false"
        @click.stop="collapseImage"
      />
    </div>
  </article>

  <div v-else class="pdp pdp--missing">
    <h1 class="page-title">Product not found</h1>
    <button type="button" class="pdp__link  interface" @click="$emit('close')">Close</button>
  </div>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import { PRODUCT_TYPE_FILTERS } from '~/composables/demoData'
import { IMAGE_WIDTH, prefetchImage } from '~/composables/useSanityImage'
import { productSlug } from '~/composables/useProductCatalog'

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
  closingFlip,
  openImageIndex,
  setReturnImage,
} = useProductOverlay()
const { openFromProduct } = useEnquiryForm()
const { items: libraryItems } = await useLibraryCatalog()

const { data: product, refresh } = await useAsyncData(
  () => `product-detail-${props.slug}`,
  () => fetchProduct(props.slug),
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

const showMaterials = ref(false)
const showFinishes = ref(false)
const heroRef = ref<HTMLImageElement | null>(null)
const stageRef = ref<HTMLElement | null>(null)
const zoomRef = ref<HTMLElement | null>(null)
const zoomImgRef = ref<HTMLImageElement | null>(null)
const contentReady = ref(false)
const sidesVisible = ref(false)
const galleryVisible = ref(false)
/** Fades left/center copy + gallery; column rules stay put */
const paneContentVisible = ref(true)
const CONTENT_FADE_MS = 220
let slugSwapToken = 0
const flipStarted = ref(false)
const flipCloseStarted = ref(false)
const selectedIndex = ref(openImageIndex.value)
/** Zoom overlay is visible over center + right */
const imageExpanded = ref(false)
/** Keep zoom DOM mounted while loading / open */
const zoomMounted = ref(false)
const zoomSrc = ref('')
/** Expanded layout: fill container height (landscape) or full width with vertical scroll (tall). */
const zoomFit = ref<'width' | 'height'>('width')

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
  imageExpanded.value = false
  zoomMounted.value = false
  zoomSrc.value = ''
  clearExpandCloseListener()
}

const cycleImage = (direction: 1 | -1) => {
  const count = galleryEntries.value.length
  if (count < 2) return
  selectedIndex.value = (selectedIndex.value + direction + count) % count
}

let wheelLocked = false
let wheelUnlockTimer: ReturnType<typeof setTimeout> | null = null
let expandCloseBound: ((event: MouseEvent) => void) | null = null

const clearExpandCloseListener = () => {
  if (!expandCloseBound || !import.meta.client) return
  window.removeEventListener('click', expandCloseBound, true)
  window.removeEventListener('click', expandCloseBound)
  expandCloseBound = null
}

const collapseImage = () => {
  imageExpanded.value = false
  zoomMounted.value = false
  zoomSrc.value = ''
  clearExpandCloseListener()
}

const updateZoomFit = () => {
  const layer = zoomRef.value
  const img = zoomImgRef.value
  if (!layer || !img?.naturalWidth || !img.naturalHeight) {
    zoomFit.value = 'width'
    return
  }
  const stageW = layer.clientWidth
  const stageH = layer.clientHeight
  if (!stageW || !stageH) {
    zoomFit.value = 'width'
    return
  }
  // If the image at full layer width would be shorter than the layer, fill height instead
  const heightAtFullWidth = stageW * (img.naturalHeight / img.naturalWidth)
  zoomFit.value = heightAtFullWidth < stageH ? 'height' : 'width'
}

const expandImage = async () => {
  const src = activeEntry.value?.zoomSrc
  if (!src || !import.meta.client) return

  clearExpandCloseListener()

  // Prefetch first — only reveal the overlay once the zoom bitmap is ready
  await prefetchImage(src)
  zoomSrc.value = src
  zoomMounted.value = true
  imageExpanded.value = false
  await nextTick()

  const img = zoomImgRef.value
  if (img && !img.complete) await waitForImage(img)
  updateZoomFit()
  imageExpanded.value = true

  // Attach after this click finishes so it doesn't immediately collapse
  requestAnimationFrame(() => {
    expandCloseBound = () => {
      collapseImage()
    }
    window.addEventListener('click', expandCloseBound)
  })
}

const onHeroClick = () => {
  if (imageExpanded.value) collapseImage()
  else void expandImage()
}

/** Close PDP when clicking empty stage chrome (not the image / thumbs / controls). */
const onStageClick = (event: MouseEvent) => {
  if (imageExpanded.value) return
  const target = event.target as HTMLElement | null
  if (!target) return
  if (target.closest('.pdp__hero-frame, .pdp__thumbs, .pdp__add, button, a')) return
  emit('close')
}

const onStageWheel = (event: WheelEvent) => {
  if (imageExpanded.value) return
  if (galleryEntries.value.length < 2) return
  event.preventDefault()
  if (wheelLocked) return
  if (Math.abs(event.deltaY) < 2 && Math.abs(event.deltaX) < 2) return

  const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX
  if (!delta) return

  wheelLocked = true
  cycleImage(delta > 0 ? 1 : -1)
  if (wheelUnlockTimer) clearTimeout(wheelUnlockTimer)
  wheelUnlockTimer = setTimeout(() => {
    wheelLocked = false
    wheelUnlockTimer = null
  }, 420)
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
  // Cached image may already be complete before @load fires
  nextTick(() => {
    stageRef.value?.addEventListener('wheel', onStageWheel, { passive: false })
    if (heroRef.value?.complete) void runFlipOpen()
    else if (!activeEntry.value) revealWithoutFlip()
  })
  window.addEventListener('resize', updateZoomFit)
  window.addEventListener('keydown', onGalleryKeydown)
})

onUnmounted(() => {
  stageRef.value?.removeEventListener('wheel', onStageWheel)
  window.removeEventListener('resize', updateZoomFit)
  window.removeEventListener('keydown', onGalleryKeydown)
  clearExpandCloseListener()
  if (wheelUnlockTimer) clearTimeout(wheelUnlockTimer)
})

const materials = computed(() =>
  [...(product.value?.materials || product.value?.categories || [])]
    .filter(Boolean)
    .map((m) => m.charAt(0).toUpperCase() + m.slice(1)),
)

const overlapCount = (a: string[] = [], b: string[] = []) => {
  if (!a.length || !b.length) return 0
  const set = new Set(a.map((v) => v.toLowerCase()))
  return b.reduce((n, v) => n + (set.has(v.toLowerCase()) ? 1 : 0), 0)
}

const typeLabelFor = (type?: string) => {
  if (!type) return ''
  return PRODUCT_TYPE_FILTERS.find((t) => t.value === type)?.label || type
}

type RelatedCard = {
  _id: string
  title: string
  slug: string
  imageUrl: string
  typeLabel: string
}

/** Manual Sanity picks first; otherwise score by shared colour / material / tag / type. */
const relatedFromProduct = computed((): RelatedCard[] => {
  if (!product.value) return []

  const manual = (product.value.related || []).filter((item) => item?._id && item.slug)
  if (manual.length) {
    return manual.slice(0, 8).map((item) => ({
      _id: item._id,
      title: item.title,
      slug: item.slug,
      imageUrl: imageUrl(item.image, IMAGE_WIDTH.thumb),
      typeLabel: typeLabelFor(item.category),
    }))
  }

  const current = libraryItem.value
  const type =
    current?.category ||
    current?.type ||
    product.value.category ||
    product.value.series?.toLowerCase() ||
    ''
  const colours = current?.colours || product.value.colours || []
  const mats = current?.materials || product.value.materials || []
  const tags = current?.tags || product.value.tags || []

  const scored = libraryItems.value
    .filter((item) => item._id !== product.value?._id && productSlug(item))
    .map((item) => {
      const itemType = item.category || item.type || ''
      let score = 0
      if (type && itemType && type === itemType) score += 2
      score += overlapCount(colours, item.colours) * 3
      score += overlapCount(mats, item.materials) * 3
      score += overlapCount(tags, item.tags) * 2
      return { item, score }
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, 6)

  return scored.map(({ item }) => ({
    _id: item._id,
    title: item.title,
    slug: productSlug(item) || item._id,
    imageUrl: imageUrl(item.image, IMAGE_WIDTH.thumb),
    typeLabel: typeLabelFor(item.category || item.type),
  }))
})

/** Open until the user hides — remembered across visits */
const relatedPanelOpen = useCookie<boolean>('sba-pdp-related-open', {
  default: () => false,
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
})

/** Current product's related set — replenishes when navigating between items */
const visibleRelatedItems = computed(() =>
  relatedFromProduct.value.filter(
    (item) => item._id !== product.value?._id && item.slug !== props.slug,
  ),
)

const hasRelatedItems = computed(() => visibleRelatedItems.value.length > 0)

const onRelatedClick = (item: RelatedCard) => {
  emit('navigate', item.slug)
}

const nextProduct = computed(() => (product.value ? getNextProduct(product.value.slug) : null))
const nextImageUrl = computed(() =>
  nextProduct.value ? imageUrl(nextProduct.value.image, IMAGE_WIDTH.thumb) : '',
)

const goToNext = () => {
  if (nextProduct.value) emit('navigate', nextProduct.value.slug)
}

const onToggleImage = (entry: GalleryEntry, index: number) => {
  if (!product.value) return
  const urls = galleryEntries.value.map((g) => g.src)
  requestSave({
    id: product.value._id,
    title: product.value.title,
    imageUrl: entry.src,
    itemType: product.value.series || 'item',
    link: `/materials-and-forms/${product.value.slug}`,
    imageUrls: urls.length > 1 ? urls : undefined,
    imageIndex: urls.length > 1 ? index : undefined,
  })
}

const isCurrentImageSaved = computed(() => {
  if (!product.value) return false
  const index = galleryEntries.value.length > 1 ? selectedIndex.value : undefined
  return isSaved(product.value._id, index)
})

const onAddToSelection = () => {
  if (!activeEntry.value) return
  onToggleImage(activeEntry.value, selectedIndex.value)
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
    materials.value.length ? `Materials: ${materials.value.join(', ')}` : '',
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
  clearPendingFlip()
  contentReady.value = true
  sidesVisible.value = true
  galleryVisible.value = true
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

  if (!source || !hero) {
    revealWithoutFlip()
    return
  }

  await waitForImage(hero)
  await nextTick()

  // Hide hero first so we don't flash the final size before Flip
  gsap.set(hero, { visibility: 'hidden' })
  await nextTick()
  void hero.offsetWidth

  const from = source.getBoundingClientRect()
  const to = hero.getBoundingClientRect()

  if (from.width < 2 || to.width < 2) {
    gsap.set(hero, { visibility: 'visible' })
    revealWithoutFlip()
    return
  }

  // Prefer prefetched hero-tier URL so Flip scales a sharp bitmap, not the grid thumb
  const flyer = document.createElement('img')
  const flipSrc =
    getFlipImageUrl() ||
    hero.src ||
    (source as HTMLImageElement).currentSrc ||
    (source as HTMLImageElement).src
  flyer.src = flipSrc
  flyer.alt = ''
  flyer.setAttribute('aria-hidden', 'true')
  Object.assign(flyer.style, {
    position: 'fixed',
    top: `${from.top}px`,
    left: `${from.left}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: '0',
    objectFit: 'cover',
    zIndex: '500',
    pointerEvents: 'none',
    borderRadius: getComputedStyle(source).borderRadius,
  })
  document.body.appendChild(flyer)
  if (!flyer.complete) await waitForImage(flyer)

  gsap.set(source, { opacity: 0 })

  const state = Flip.getState(flyer)

  gsap.set(flyer, {
    top: to.top,
    left: to.left,
    width: to.width,
    height: to.height,
    borderRadius: '0px',
    objectFit: 'contain',
  })

  // Snappy expand with a soft landing
  Flip.from(state, {
    duration: 0.32,
    ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
    onComplete: () => {
      flyer.remove()
      gsap.set(hero, { visibility: 'visible' })
      gsap.set(source, { clearProps: 'opacity' })
      contentReady.value = true
      sidesVisible.value = true
      clearPendingFlip()
    },
  })

  gsap.delayedCall(0.22, () => {
    galleryVisible.value = true
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

  // Push the currently selected gallery image back onto the grid thumb
  setReturnImage(product.value._id, selectedIndex.value)
  await nextTick()
  if (source instanceof HTMLImageElement) {
    await waitForImage(source)
  }
  // Let GridItem commitHeight → bottom-anchor → ProductGrid shift entry.y
  // before capturing the Flip destination (otherwise the tile stays top-anchored).
  await nextTick()
  await nextTick()
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })

  contentReady.value = false
  sidesVisible.value = false
  galleryVisible.value = false
  await nextTick()

  const from = hero.getBoundingClientRect()
  const to = source.getBoundingClientRect()

  if (from.width < 2 || to.width < 2) {
    gsap.set(source, { clearProps: 'opacity' })
    finishClose()
    return
  }

  gsap.set(hero, { visibility: 'hidden' })
  gsap.set(source, { opacity: 0 })

  const flyer = document.createElement('img')
  flyer.src = hero.currentSrc || hero.src
  flyer.alt = ''
  flyer.setAttribute('aria-hidden', 'true')
  Object.assign(flyer.style, {
    position: 'fixed',
    top: `${from.top}px`,
    left: `${from.left}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: '0',
    objectFit: 'contain',
    zIndex: '500',
    pointerEvents: 'none',
    borderRadius: '0px',
  })
  document.body.appendChild(flyer)

  const state = Flip.getState(flyer)

  gsap.set(flyer, {
    top: to.top,
    left: to.left,
    width: to.width,
    height: to.height,
    borderRadius: getComputedStyle(source).borderRadius,
    objectFit: 'cover',
  })

  Flip.from(state, {
    duration: 0.28,
    ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
    onComplete: () => {
      flyer.remove()
      gsap.set(source, { clearProps: 'opacity' })
      finishClose()
    },
  })
}

const onHeroLoad = () => {
  if (!flipStarted.value) void runFlipOpen()
}

watch(closingFlip, (closing) => {
  if (closing) void runFlipClose()
})

watch(
  () => props.slug,
  async () => {
    showMaterials.value = false
    showFinishes.value = false
    imageExpanded.value = false
    zoomMounted.value = false
    zoomSrc.value = ''
    clearExpandCloseListener()
    galleryVisible.value = false

    const softSwap = sidesVisible.value && contentReady.value
    const token = ++slugSwapToken

    if (softSwap) {
      // Fade pane content only — column rules / related rail stay put
      paneContentVisible.value = false
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, CONTENT_FADE_MS)
      })
      if (token !== slugSwapToken) return

      flipStarted.value = true
      flipCloseStarted.value = false
      selectedIndex.value = 0
      await refresh()
      if (token !== slugSwapToken) return
      await nextTick()

      const hero = heroRef.value
      if (hero && !hero.complete) await waitForImage(hero)
      if (token !== slugSwapToken) return

      galleryVisible.value = true
      paneContentVisible.value = true
      return
    }

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
</script>

<style scoped>
.pdp {
  position: relative;
  display: grid;
  grid-template-columns: var(--side-column-width) 1fr var(--side-column-width);
  height: calc(100dvh - var(--bucket-push));
  background: transparent;
  border-top: 1px solid var(--grid-line);
  transition:
    height var(--bucket-close-ms) var(--theme-ease),
    background var(--theme-ms) var(--theme-ease);
}

.pdp--ready {
  background: var(--cream);
}

.pdp--standalone {
  height: calc(100dvh - var(--header-height) - var(--bucket-push));
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
  transition: opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  /* Side columns are not dismiss targets — never inherit the stage close cursor */
  cursor: auto;
}

.pdp--sides .pdp__col--left,
.pdp--sides .pdp__col--right {
  opacity: 1;
}

.pdp__col--left {
  border-right: 1px solid var(--grid-line);
}

.pdp__col--right {
  border-left: 1px solid var(--grid-line);
  overflow: hidden;
}

.pdp__col--center {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  align-items: stretch;
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

/* Zoom layer sits above center + right; grid columns stay put */
.pdp__zoom {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: var(--side-column-width);
  z-index: 6;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--cream);
  opacity: 0;
  pointer-events: none;
  transition: background var(--theme-ms) var(--theme-ease);
}

.pdp__zoom--visible {
  opacity: 1;
  pointer-events: auto;
  cursor: zoom-out;
}

.pdp__zoom--fit-width {
  overflow-x: hidden;
  overflow-y: auto;
  align-items: flex-start;
}

.pdp__zoom--fit-height {
  overflow: hidden;
}

.pdp__zoom-image {
  display: block;
  cursor: zoom-out;
}

.pdp__zoom--fit-width .pdp__zoom-image {
  width: 100%;
  height: auto;
  max-width: none;
  max-height: none;
}

.pdp__zoom--fit-height .pdp__zoom-image {
  width: auto;
  height: 100%;
  max-width: none;
  max-height: 100%;
}

.pdp__stage {
  flex: 1;
  min-height: 0;
  width: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1rem;
  padding: 1.25rem var(--gutter) 1.5rem;
  box-sizing: border-box;
  overscroll-behavior: contain;
  /* X cursor over empty stage / hero chrome; image resets below */
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%231a1a1a' stroke-width='1.5' stroke-linecap='round'%3E%3Cpath d='M6 6l12 12M18 6L6 18'/%3E%3C/svg%3E") 12 12, pointer;
}

/* Fully global selector — `:global(html.dark) .pdp__stage` was compiling to
   `html.dark { cursor: … }` and painting the close cursor site-wide. */
:global(html.dark .pdp__stage) {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23f2ecdf' stroke-width='1.5' stroke-linecap='round'%3E%3Cpath d='M6 6l12 12M18 6L6 18'/%3E%3C/svg%3E") 12 12, pointer;
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

.pdp__hero-frame {
  position: relative;
  display: inline-grid;
  max-width: 100%;
  max-height: 100%;
  cursor: default;
}

.pdp__hero-image {
  display: block;
  max-width: 100cqw;
  max-height: 100cqh;
  width: auto;
  height: auto;
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
    opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
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
  background: var(--cream);
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
    opacity 0.25s ease,
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
  padding: 1.5rem var(--gutter) 4rem;
  flex: 1;
}

.pdp__title {
  margin: 0 0 1.5rem;
  font-family: var(--font-serif);
  font-size: var(--text-2xl);
  line-height: 1.15;
}

.pdp__specs {
  margin: 0 0 1.5rem;
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
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin: 0.5rem 0 0;
  padding: 0;
  list-style: none;
  color: var(--muted);
  font-size: var(--text-sm);
}

.pdp__actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.pdp__inquire {
  display: block;
  width: 100%;
  padding: 1rem 0.85rem;
  background: var(--charcoal);
  color: var(--cream);
  font-size: var(--text-sm);
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

.pdp__save:hover,
.pdp__save--active {
  background: var(--charcoal);
  color: var(--cream);
}

.pdp__save--active:hover {
  opacity: 0.9;
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
  margin-top: 2.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--grid-line);
}

.pdp__info-heading {
  margin: 0 0 1rem;
  font-size: var(--text-sm);
  color: var(--muted);
}

.pdp__info-text {
  margin: 0 0 1rem;
  font-size: var(--text-sm);
  line-height: 1.55;
  color: var(--charcoal);
}

.pdp__col--right-collapsed {
  align-items: center;
  justify-content: center;
}

.pdp__related-toolbar {
  flex-shrink: 0;
  justify-content: space-between;
  position: relative;
}

.pdp__related-heading {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: inherit;
  color: var(--charcoal);
}

.pdp__related-hide {
  margin-left: auto;
  font-size: var(--text-sm);
  color: var(--muted);
  transition: color 0.2s ease;
}

.pdp__related-hide:hover {
  color: var(--charcoal);
}

.pdp__related-reveal {
  font-size: var(--text-sm);
  color: var(--muted);
  text-decoration: none;
  transition: color 0.2s ease;
}

.pdp__related-reveal:hover {
  color: var(--charcoal);
}

.pdp__related {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--gutter) 0 2rem;
}

.pdp__related-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
}

.pdp__related-card {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  width: 100%;
  min-width: 0;
  text-align: left;
  color: var(--charcoal);
  cursor: pointer;
}

.pdp__related-pad {
  position: relative;
  padding: 0 var(--gutter);
}

.pdp__related-media {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 1.4;
  overflow: hidden;
  border-radius: var(--thumb-radius);
}

.pdp__related-media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.pdp__related-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
  padding: 0.5rem var(--gutter) 1rem;
  font-size: var(--text-sm);
}

.pdp__related-title {
  margin: 0;
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pdp__related-type {
  margin: 0;
  flex-shrink: 0;
  color: var(--muted);
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
    min-height: calc(100dvh - var(--bucket-push));
  }

  .pdp--standalone {
    min-height: calc(100dvh - var(--header-height) - var(--bucket-push));
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
  }

  .pdp__stage {
    min-height: 55dvh;
  }

  .pdp__col--left {
    border-bottom: 1px solid var(--grid-line);
  }

  .pdp__col--right {
    display: none;
  }

  .pdp__zoom {
    left: 0;
  }
}
</style>
