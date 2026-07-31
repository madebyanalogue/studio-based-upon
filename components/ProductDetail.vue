<template>
  <article
    v-if="product"
    class="pdp"
    :class="{
      'pdp--standalone': standalone,
      'pdp--ready': contentReady,
      'pdp--sides': sidesVisible,
    }"
  >
    <aside class="pdp__col pdp__col--left">
      <div class="pdp__toolbar">
        <button type="button" class="pdp__close  interface" @click="$emit('close')">Close</button>
        <div class="pdp__meta interface">
          <span>{{ typeLabel }}</span>
          <template v-if="orderLabel">
            <span class="pdp__meta-sep" aria-hidden="true">/</span>
            <span class="pdp__meta-order">{{ orderLabel }}</span>
          </template>
        </div>
      </div>

      <div class="pdp__body">
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
          <button type="button" class="pdp__save" @click="onMoreLikeThis">
            More Like This
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
        class="pdp__stage"
        :class="{
          'pdp__stage--expanded': imageExpanded,
          'pdp__stage--fit-height': imageExpanded && zoomFit === 'height',
          'pdp__stage--fit-width': imageExpanded && zoomFit === 'width',
        }"
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
              <img :src="entry.src" alt="" loading="lazy" draggable="false" />
            </button>
          </div>
        </figure>

        <p v-else class="pdp__gallery-empty interface">
          No images available.
        </p>
      </div>
    </div>

    <!-- Reserved for the cart panel (same --side-column-width) -->
    <aside class="pdp__col pdp__col--right" aria-hidden="true" />
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
const { close, finishClose, getFlipSource, clearPendingFlip, closingFlip, openImageIndex, setReturnImage } =
  useProductOverlay()
const { setAffinity } = useDiscoveryAffinity()
const { openFromProduct } = useEnquiryForm()
const { items: libraryItems } = await useLibraryCatalog()
const router = useRouter()

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
const contentReady = ref(false)
const sidesVisible = ref(false)
const galleryVisible = ref(false)
const flipStarted = ref(false)
const flipCloseStarted = ref(false)
const selectedIndex = ref(openImageIndex.value)
const imageExpanded = ref(false)
/** Expanded layout: fill container height (landscape) or full width with vertical scroll (tall). */
const zoomFit = ref<'width' | 'height'>('width')

type GalleryEntry = { id: string; src: string }

const galleryEntries = computed((): GalleryEntry[] => {
  if (!product.value) return []

  const urls: string[] = []
  const hero = imageUrl(product.value.image, 1800)
  if (hero) urls.push(hero)

  if (product.value.gallery?.length) {
    product.value.gallery.forEach((img) => {
      const url = imageUrl(img, 1800)
      if (url && !urls.includes(url)) urls.push(url)
    })
  }

  if (product.value.spiritGallery?.length) {
    product.value.spiritGallery.forEach((img) => {
      const url = imageUrl(img, 1800)
      if (url && !urls.includes(url)) urls.push(url)
    })
  }

  return urls.map((src, i) => ({
    id: `${product.value!._id}-img-${i}`,
    src,
  }))
})

const activeEntry = computed(
  () => galleryEntries.value[selectedIndex.value] || galleryEntries.value[0] || null,
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
  clearExpandCloseListener()
}

const updateZoomFit = () => {
  if (!imageExpanded.value) return
  const stage = stageRef.value
  const img = heroRef.value
  if (!stage || !img?.naturalWidth || !img.naturalHeight) {
    zoomFit.value = 'width'
    return
  }
  const stageW = stage.clientWidth
  const stageH = stage.clientHeight
  if (!stageW || !stageH) {
    zoomFit.value = 'width'
    return
  }
  // If the image at full stage width would be shorter than the stage, fill height instead
  const heightAtFullWidth = stageW * (img.naturalHeight / img.naturalWidth)
  zoomFit.value = heightAtFullWidth < stageH ? 'height' : 'width'
}

const expandImage = async () => {
  imageExpanded.value = true
  clearExpandCloseListener()
  await nextTick()
  const img = heroRef.value
  if (img && !img.complete) await waitForImage(img)
  updateZoomFit()
  if (!import.meta.client) return
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

onMounted(() => {
  // Cached image may already be complete before @load fires
  nextTick(() => {
    stageRef.value?.addEventListener('wheel', onStageWheel, { passive: false })
    if (heroRef.value?.complete) void runFlipOpen()
    else if (!activeEntry.value) revealWithoutFlip()
  })
  window.addEventListener('resize', updateZoomFit)
})

onUnmounted(() => {
  stageRef.value?.removeEventListener('wheel', onStageWheel)
  window.removeEventListener('resize', updateZoomFit)
  clearExpandCloseListener()
  if (wheelUnlockTimer) clearTimeout(wheelUnlockTimer)
})

const materials = computed(() =>
  [...(product.value?.materials || product.value?.categories || [])]
    .filter(Boolean)
    .map((m) => m.charAt(0).toUpperCase() + m.slice(1)),
)

const nextProduct = computed(() => (product.value ? getNextProduct(product.value.slug) : null))
const nextImageUrl = computed(() =>
  nextProduct.value ? imageUrl(nextProduct.value.image, 900) : '',
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

const onMoreLikeThis = async () => {
  if (!product.value) return
  const categories = [
    ...(product.value.categories || []),
    ...(product.value.materials || []),
  ]
  setAffinity(categories.length ? categories : ['surfaces'], product.value._id)
  finishClose()
  emit('close')
  if (import.meta.client) {
    window.history.replaceState({}, '', '/')
  }
  if (router.currentRoute.value.path !== '/') {
    await navigateTo('/')
  }
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

  // Fixed flyer on body so overflow clipping can't hide the Flip
  const flyer = document.createElement('img')
  flyer.src = (source as HTMLImageElement).currentSrc || (source as HTMLImageElement).src || hero.src
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
  if (imageExpanded.value) updateZoomFit()
  if (!flipStarted.value) void runFlipOpen()
}

watch(closingFlip, (closing) => {
  if (closing) void runFlipClose()
})

watch(
  () => props.slug,
  () => {
    showMaterials.value = false
    showFinishes.value = false
    flipStarted.value = false
    flipCloseStarted.value = false
    contentReady.value = false
    sidesVisible.value = false
    galleryVisible.value = false
    selectedIndex.value = openImageIndex.value
    imageExpanded.value = false
    clearExpandCloseListener()
    refresh()
    nextTick(() => {
      if (heroRef.value?.complete) void runFlipOpen()
    })
  },
)
</script>

<style scoped>
.pdp {
  display: grid;
  grid-template-columns: var(--side-column-width) 1fr var(--side-column-width);
  height: 100dvh;
  background: transparent;
  border-top: 1px solid var(--grid-line);
  transition: background 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.pdp--ready {
  background: var(--cream);
}

.pdp--standalone {
  height: calc(100dvh - var(--header-height));
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
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.pdp__col--left,
.pdp__col--right {
  opacity: 0;
  transition: opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1);
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
}

.pdp__col--center {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  align-items: stretch;
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
}

.pdp__stage--expanded {
  padding: 0;
}

.pdp__stage--fit-width {
  overflow-x: hidden;
  overflow-y: auto;
}

.pdp__stage--fit-height {
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
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

.pdp__stage--fit-width .pdp__hero {
  display: block;
  height: auto;
  max-height: none;
  container-type: normal;
}

.pdp__stage--fit-height .pdp__hero {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  container-type: normal;
  /* Frame is absolutely centered; stage clips horizontal overflow */
  overflow: visible;
}

.pdp__hero-frame {
  position: relative;
  display: inline-grid;
  max-width: 100%;
  max-height: 100%;
}

.pdp__stage--fit-width .pdp__hero-frame {
  display: block;
  width: 100%;
  max-width: 100%;
  max-height: none;
}

/* Pin frame to hero height so landscape zoom can't grow past it.
   Width comes from the image aspect ratio; stage overflow clips sides. */
.pdp__stage--fit-height .pdp__hero-frame {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  display: block;
  height: 100%;
  max-height: 100%;
  width: auto;
  max-width: none;
  margin: 0;
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

.pdp__stage--fit-width .pdp__hero-image {
  max-width: none;
  max-height: none;
  width: 100%;
  height: auto;
  object-fit: contain;
  cursor: zoom-out;
}

.pdp__stage--fit-height .pdp__hero-image {
  display: block;
  max-width: none;
  max-height: 100%;
  width: auto;
  height: 100%;
  object-fit: contain;
  cursor: zoom-out;
}

.pdp__stage--expanded .pdp__thumbs {
  display: none;
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
  transition: transform 0.2s ease;
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

.pdp__save:hover {
  background: var(--charcoal);
  color: var(--cream);
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
    min-height: calc(100dvh - var(--header-height));
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
}
</style>
