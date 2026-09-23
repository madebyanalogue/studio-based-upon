<template>
  <div
    class="pdp-index"
    :class="{
      'pdp-index--chrome': pdpChromeVisible,
      'pdp-index--index-hidden': !indexRailVisible,
      'pdp-index--related-hidden': !relatedRailVisible,
      'pdp-index--exiting': closingFlip,
    }"
  >
    <div
      class="pdp-index__rail pdp-index__rail--left"
      aria-label="Product index"
      :aria-hidden="!indexRailVisible ? 'true' : undefined"
    >
      <div
        ref="indexStripRef"
        class="pdp-index__strip"
        data-lenis-prevent
      >
        <div ref="indexTrackRef" class="pdp-index__strip-track">
          <div
            v-for="item in indexItems"
            :key="`index-${item._id}`"
            class="pdp-index__tile"
            :class="{
              'pdp-index__tile--active': item.slug === slug,
              'pdp-index__tile--saved': isItemSaved(item),
            }"
          >
            <div class="pdp-index__tile-media">
              <span
                class="pdp-index__frame"
                :class="`pdp-index__frame--${item.orientation}`"
              >
                <img
                  class="pdp-index__tile-image"
                  :src="item.imageUrl || undefined"
                  :alt="item.title"
                  loading="lazy"
                  draggable="false"
                />
              </span>
              <button
                type="button"
                class="pdp-index__tile-hit"
                :aria-label="`View ${item.title}`"
                :aria-current="item.slug === slug ? 'page' : undefined"
                :tabindex="indexRailVisible ? undefined : -1"
                @click="onIndexClick(item)"
              />
              <AddButton
                class="pdp-index__add"
                :active="isItemSaved(item)"
                :label="
                  isItemSaved(item)
                    ? `Remove ${item.title} from selection`
                    : `Add ${item.title} to selection`
                "
                @click.stop="onToggleSave(item, $event)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="pdp-index__reveals pdp-index__reveals--left">
      <button
        type="button"
        class="pdp-index__reveal interface"
        :aria-label="indexRailVisible ? 'Hide index' : 'Show product index'"
        :aria-pressed="indexRailVisible"
        @click="toggleIndexMode"
      >
        {{ indexRailVisible ? 'Hide Index' : 'Index' }}
      </button>
    </div>

    <div v-if="hasSpiritGallery" class="pdp-index__reveals pdp-index__reveals--center">
      <button
        type="button"
        class="pdp-index__reveal interface"
        :class="{ 'pdp-index__reveal--on': spiritMode }"
        :aria-label="spiritMode ? 'Hide spirit imagery' : 'Show spirit imagery'"
        :aria-pressed="spiritMode ? 'true' : 'false'"
        @click="requestSpiritToggle"
      >
        Spirit
      </button>
    </div>

    <div class="pdp-index__reveals pdp-index__reveals--right">
      <button
        type="button"
        class="pdp-index__reveal interface"
        :class="{ 'pdp-index__reveal--muted': !canFilter && !relatedRailVisible }"
        :aria-label="
          relatedRailVisible ? 'Hide more like this' : 'Show more like this'
        "
        :aria-pressed="relatedRailVisible"
        :disabled="!canFilter && !relatedRailVisible"
        @click="toggleRelatedMode"
      >
        {{ relatedRailVisible ? 'Hide Related' : 'More like this' }}
      </button>
    </div>

    <div
      class="pdp-index__rail pdp-index__rail--right"
      aria-label="More like this"
      :aria-hidden="!relatedRailVisible ? 'true' : undefined"
    >
      <div
        ref="relatedStripRef"
        class="pdp-index__strip"
        data-lenis-prevent
        @scroll.passive="onRelatedStripScroll"
      >
        <div
          v-for="item in relatedItems"
          :key="`related-${item._id}`"
          class="pdp-index__tile"
          :class="{
            'pdp-index__tile--active': item.slug === slug,
            'pdp-index__tile--saved': isItemSaved(item),
          }"
        >
          <div class="pdp-index__tile-media">
            <span
              class="pdp-index__frame"
              :class="`pdp-index__frame--${item.orientation}`"
            >
              <img
                class="pdp-index__tile-image"
                :src="item.imageUrl || undefined"
                :alt="item.title"
                loading="lazy"
                draggable="false"
              />
            </span>
            <button
              type="button"
              class="pdp-index__tile-hit"
              :aria-label="`View ${item.title}`"
              :aria-current="item.slug === slug ? 'page' : undefined"
              :tabindex="relatedRailVisible ? undefined : -1"
              @click="onIndexClick(item)"
            />
            <AddButton
              class="pdp-index__add"
              :active="isItemSaved(item)"
              :label="
                isItemSaved(item)
                  ? `Remove ${item.title} from selection`
                  : `Add ${item.title} to selection`
              "
              @click.stop="onToggleSave(item, $event)"
            />
          </div>
        </div>
        <p v-if="!relatedItems.length" class="pdp-index__empty interface">
          No related products
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Lenis from 'lenis'
import { PRODUCT_TYPE_FILTERS } from '~/composables/demoData'
import { IMAGE_WIDTH } from '~/composables/useSanityImage'
import { productCoverFrame } from '~/composables/productImages'
import { productSlug } from '~/composables/useProductCatalog'

const props = defineProps<{
  slug: string
}>()

const emit = defineEmits<{
  navigate: [slug: string]
}>()

const { imageUrl } = useSanityImage()
const { fetchProduct } = useProductCatalog()
const { requestSave, isSaved } = useBucket()
const { items: libraryItems } = await useLibraryCatalog()

type IndexCard = {
  _id: string
  title: string
  slug: string
  imageUrl: string
  typeLabel: string
  /** landscape (≥1) or portrait (<1) — drives fixed tile aspect */
  orientation: 'landscape' | 'portrait'
}

const INDEX_EXCLUDED_TYPES = new Set(['spirit', 'origin'])

const typeLabelFor = (type?: string) => {
  if (!type) return ''
  return PRODUCT_TYPE_FILTERS.find((t) => t.value === type)?.label || type
}

const indexItems = computed((): IndexCard[] =>
  libraryItems.value
    .map((item) => {
      const slug = productSlug(item)
      if (!slug) return null
      const typeKey = String(item.category || item.type || '')
        .toLowerCase()
        .replace(/[^a-z]/g, '')
      const cats = (item.categories || []).map((c) =>
        String(c).toLowerCase().replace(/[^a-z]/g, ''),
      )
      if (INDEX_EXCLUDED_TYPES.has(typeKey) || cats.some((c) => INDEX_EXCLUDED_TYPES.has(c))) {
        return null
      }
      return {
        _id: item._id,
        title: item.title,
        slug,
        imageUrl: (() => {
          const cover = productCoverFrame(item)
          return cover ? imageUrl(cover, IMAGE_WIDTH.thumb) : ''
        })(),
        typeLabel: typeLabelFor(item.category || item.type),
        orientation: (item.aspectRatio || 1) >= 1 ? 'landscape' : 'portrait',
      }
    })
    .filter((item): item is IndexCard => !!item),
)

const overlapCount = (a: string[] = [], b: string[] = []) => {
  if (!a.length || !b.length) return 0
  const set = new Set(a.map((v) => v.toLowerCase()))
  return b.reduce((n, v) => n + (set.has(v.toLowerCase()) ? 1 : 0), 0)
}

const indexStripScrollTop = useState('pdp-index-rail-scroll', () => 0)
const relatedStripScrollTop = useState('pdp-related-rail-scroll', () => 0)
const indexStripRef = ref<HTMLElement | null>(null)
const indexTrackRef = ref<HTMLElement | null>(null)
const relatedStripRef = ref<HTMLElement | null>(null)

let indexLenis: Lenis | null = null
let indexLenisRaf = 0
let indexResizeObserver: ResizeObserver | null = null

const createRailLenis = (wrapper: HTMLElement, content: HTMLElement) =>
  new Lenis({
    wrapper,
    content,
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    syncTouch: true,
    syncTouchLerp: 0.055,
    touchInertiaExponent: 2.05,
    touchMultiplier: 1.55,
    wheelMultiplier: 1.4,
    lerp: 0.07,
    overscroll: false,
    // Strip keeps data-lenis-prevent for the page scroller; don't self-block.
    prevent: () => false,
  })

const onIndexStripScroll = () => {
  indexStripScrollTop.value =
    indexLenis?.animatedScroll ?? indexStripRef.value?.scrollTop ?? 0
}

const onRelatedStripScroll = () => {
  if (!relatedStripRef.value) return
  relatedStripScrollTop.value = relatedStripRef.value.scrollTop
}

const destroyIndexLenis = () => {
  indexResizeObserver?.disconnect()
  indexResizeObserver = null
  if (indexLenisRaf) {
    cancelAnimationFrame(indexLenisRaf)
    indexLenisRaf = 0
  }
  indexLenis?.destroy()
  indexLenis = null
}

const tickIndexLenis = (time: number) => {
  indexLenis?.raf(time)
  indexLenisRaf = requestAnimationFrame(tickIndexLenis)
}

const initIndexLenis = () => {
  if (!import.meta.client) return
  const wrapper = indexStripRef.value
  const content = indexTrackRef.value
  if (!wrapper || !content) return

  destroyIndexLenis()
  indexLenis = createRailLenis(wrapper, content)
  indexLenis.on('scroll', onIndexStripScroll)
  indexLenis.resize()
  indexLenis.scrollTo(indexStripScrollTop.value, { immediate: true })
  if (!indexRailVisible.value) indexLenis.stop()
  if (typeof ResizeObserver !== 'undefined') {
    indexResizeObserver = new ResizeObserver(() => indexLenis?.resize())
    indexResizeObserver.observe(content)
  }
  indexLenisRaf = requestAnimationFrame(tickIndexLenis)
}

const restoreIndexStripScroll = () => {
  if (indexLenis) {
    indexLenis.scrollTo(indexStripScrollTop.value, { immediate: true })
    return
  }
  const el = indexStripRef.value
  if (!el) return
  el.scrollTop = indexStripScrollTop.value
}

const restoreRelatedStripScroll = () => {
  const el = relatedStripRef.value
  if (!el) return
  el.scrollTop = relatedStripScrollTop.value
}

// Payload-backed so SSR HTML and the first client VDOM share the same related
// tile list (local shallowRef + async watch was hydrating empty vs full).
const { data: activeProduct } = await useAsyncData(
  () => `pdp-rail-product-${props.slug}`,
  () => fetchProduct(props.slug),
  { watch: [() => props.slug] },
)

watch(
  () => props.slug,
  async () => {
    const indexTop =
      indexLenis?.animatedScroll ??
      indexStripRef.value?.scrollTop ??
      indexStripScrollTop.value
    indexStripScrollTop.value = indexTop
    const relatedTop =
      relatedStripRef.value?.scrollTop ?? relatedStripScrollTop.value
    relatedStripScrollTop.value = relatedTop

    if (!import.meta.client) return
    await nextTick()
    indexLenis?.resize()
    restoreIndexStripScroll()
    restoreRelatedStripScroll()
    requestAnimationFrame(() => {
      restoreIndexStripScroll()
      restoreRelatedStripScroll()
    })
  },
)

const libraryItem = computed(() =>
  libraryItems.value.find((item) => productSlug(item) === props.slug),
)

/** Related ids for the *current* product — includes the active item. */
const computeRelatedIdsForActive = () => {
  const ids = new Set<string>()
  const product = activeProduct.value
  if (!product) return ids
  ids.add(product._id)

  const manual = (product.related || []).filter((item) => item?._id && item.slug)
  if (manual.length) {
    for (const item of manual) ids.add(item._id)
    return ids
  }

  const current = libraryItem.value
  const type =
    current?.category ||
    current?.type ||
    product.category ||
    product.series?.toLowerCase() ||
    ''
  const colours = current?.colours || product.colours || []
  const mats = current?.materials || product.materials || []
  const tags = current?.tags || product.tags || []

  const scored = libraryItems.value
    .filter((item) => item._id !== product._id && productSlug(item))
    .map((item) => {
      const itemType = item.category || item.type || ''
      let score = 0
      if (type && itemType && type === itemType) score += 2
      score += overlapCount(colours, item.colours) * 3
      score += overlapCount(mats, item.materials) * 3
      score += overlapCount(tags, item.tags) * 2
      return { id: item._id, score }
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)

  for (const row of scored) ids.add(row.id)
  return ids
}

const canFilter = computed(() => computeRelatedIdsForActive().size > 1)

const relatedItems = computed((): IndexCard[] => {
  const ids = frozenRelatedIdList.value
    ? new Set(frozenRelatedIdList.value)
    : computeRelatedIdsForActive()
  if (!ids.size) return []
  // Omit the open product — it already fills the gallery.
  return indexItems.value.filter(
    (item) => ids.has(item._id) && item.slug !== props.slug,
  )
})

const indexRailVisible = useCookie<boolean>('sba-pdp-index-rail', {
  default: () => true,
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
})

const syncIndexRailDom = () => {
  if (!import.meta.client) return
  document.documentElement.classList.toggle(
    'pdp-index-rail-closed',
    !indexRailVisible.value,
  )
}

watch(indexRailVisible, syncIndexRailDom, { immediate: true })

watch(indexRailVisible, (visible) => {
  if (!indexLenis) return
  if (visible) {
    indexLenis.start()
    indexLenis.resize()
  } else {
    indexLenis.stop()
  }
})

const {
  relatedRailVisible,
  frozenRelatedIdList,
  syncRelatedRailDom,
  closeRelatedRail,
} = usePdpRelatedRail()

/** Shared with ProductDetail — rail chrome fades with the PDP sides. */
const pdpChromeVisible = useState('pdp-chrome-visible', () => false)
const { closingFlip } = useProductOverlay()

/** Shared with ProductDetail — Spirit imagery gallery mode. */
const spiritMode = useState('pdp-spirit-mode', () => false)
const spiritToggleRequest = useState('pdp-spirit-toggle-req', () => 0)

const hasSpiritGallery = computed(() => {
  const items = activeProduct.value?.spiritGallery
  return Array.isArray(items) && items.length > 0
})

const requestSpiritToggle = () => {
  if (!hasSpiritGallery.value) return
  spiritToggleRequest.value += 1
}

const toggleIndexMode = () => {
  indexRailVisible.value = !indexRailVisible.value
}

const toggleRelatedMode = () => {
  if (relatedRailVisible.value) {
    closeRelatedRail()
    return
  }
  const ids = computeRelatedIdsForActive()
  if (!ids.size) return
  frozenRelatedIdList.value = [...ids]
  relatedRailVisible.value = true
  syncRelatedRailDom()
}

watch(
  relatedRailVisible,
  () => {
    syncRelatedRailDom()
  },
  { immediate: true },
)

// Soft product swaps must keep the stack push if More like this stays open.
watch(
  () => props.slug,
  () => {
    if (relatedRailVisible.value) syncRelatedRailDom()
  },
)

onBeforeUnmount(() => {
  destroyIndexLenis()
  // Only clear the document push when related was closed already, or when there
  // is no overlay session left. Avoid stripping the class while related is still
  // open — remount races were snapping the stack without swapping the PDP.
  if (!import.meta.client) return
  if (relatedRailVisible.value) return
  document.documentElement.classList.remove('pdp-related-rail-open')
})

const onIndexClick = (item: IndexCard) => {
  if (item.slug === props.slug) return
  onIndexStripScroll()
  onRelatedStripScroll()
  emit('navigate', item.slug)
}

const isItemSaved = (item: IndexCard) => isSaved(item._id)

const onToggleSave = (item: IndexCard, event?: MouseEvent) => {
  const source =
    ((event?.currentTarget as HTMLElement | null)
      ?.closest('.pdp-index__tile')
      ?.querySelector('.pdp-index__tile-image') as HTMLElement | null) || null
  requestSave(
    {
      id: item._id,
      title: item.title,
      imageUrl: item.imageUrl,
      itemType: item.typeLabel || 'item',
      link: `/materials-and-forms/${item.slug}`,
    },
    { source },
  )
}

onMounted(() => {
  syncIndexRailDom()
  syncRelatedRailDom()
  requestAnimationFrame(() => {
    document.documentElement.classList.add('pdp-rail-motion-ready')
  })
  nextTick(() => {
    initIndexLenis()
    restoreIndexStripScroll()
    restoreRelatedStripScroll()
  })
})
</script>

<style scoped>
.pdp-index {
  --index-tabs-height: 2.25rem;
  --index-rail-width: var(--pdp-rail-open-width);
  --index-motion: var(--pdp-rail-motion);
  --index-chrome-motion: 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  --rail-padding: 35px;
  --rail-padding: 20px;

  position: absolute;
  inset: 0;
  z-index: 110;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--index-chrome-motion);
}

.pdp-index--chrome {
  opacity: 1;
}

.pdp-index:not(.pdp-index--chrome) .pdp-index__rail,
.pdp-index:not(.pdp-index--chrome) .pdp-index__reveals {
  pointer-events: none;
}

.pdp-index__rail {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 1;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: var(--index-rail-width);
  overflow: hidden;
  background: color-mix(in srgb,var(--cream) 80%,transparent);
  backdrop-filter: blur(15px);
  pointer-events: auto;
  /* Position follows html @property lengths; close exit adds transform */
  transition: none;
}

.pdp-index__rail--left {
  left: calc(var(--pdp-index-rail-width) - var(--index-rail-width));
  border-right: 1px solid var(--grid-line);
  transform: translateX(0);
}

.pdp-index--index-hidden .pdp-index__rail--left {
  pointer-events: none;
}

.pdp-index__rail--right {
  right: calc(var(--pdp-related-rail-width) - var(--index-rail-width));
  border-left: 1px solid var(--grid-line);
  transform: translateX(0);
}

.pdp-index--related-hidden .pdp-index__rail--right {
  pointer-events: none;
}

/* Close: rails slide off before the flyer / backdrop */
.pdp-index--exiting .pdp-index__rail {
  transition: transform var(--index-motion);
  pointer-events: none;
}

.pdp-index--exiting .pdp-index__rail--left {
  transform: translateX(-110%);
}

.pdp-index--exiting .pdp-index__rail--right {
  transform: translateX(110%);
}

.pdp-index--exiting .pdp-index__reveals {
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.pdp-index__reveals {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 111;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
  /* Column is full-height — only the buttons capture clicks so the
     gallery heart (top-right of the frame) stays reachable */
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.2s ease;
}

.pdp-index__reveals .pdp-index__reveal {
  pointer-events: auto;
}

.pdp-index__reveals--left {
  left: calc(var(--pdp-index-rail-width) + 20px);
  align-items: flex-start;
}

.pdp-index__reveals--center {
  left: 50%;
  transform: translateX(-50%);
  align-items: center;
}

.pdp-index__reveals--right {
  right: calc(var(--pdp-related-rail-width) + 20px);
  align-items: flex-end;
}

.pdp-index__reveal {
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  font-size: var(--text-sm);
  color: #fff;
  cursor: pointer;
  white-space: nowrap;
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.2s ease, opacity 0.2s ease;
}

.pdp-index__reveal:hover:not(:disabled) {
  color: #fff;
}

.pdp-index__reveal--on {
  color: #fff;
}

.pdp-index__reveal:disabled,
.pdp-index__reveal--muted:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.pdp-index__strip {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  overscroll-behavior: contain;
}

.pdp-index__strip-track {
  display: block;
  width: 100%;
}

.pdp-index__strip::-webkit-scrollbar {
  display: none;
}

.pdp-index__empty {
  margin: 2rem var(--rail-padding);
  color: var(--muted);
  font-size: var(--text-xs);
}

.pdp-index__tile {
  position: relative;
  flex: 0 0 auto;
  width: 100%;
  height: auto;
  padding: var(--rail-padding);
  margin: 0;
  line-height: 0;
  border-bottom: 1px solid var(--grid-line);
}

.pdp-index__tile--active {
  opacity: 0.2;
}

.pdp-index__tile-media {
  position: relative;
  display: block;
  aspect-ratio: var(--rail-aspect);
  width: 100%;
  height: auto;
  max-height: none;
  margin: 0;
  padding: 0;
  line-height: 0;
  overflow: hidden;
}

.pdp-index__tile-hit {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  line-height: 0;
}

.pdp-index__frame {
  position: absolute;
  display: block;
  line-height: 0;
  pointer-events: none;
}

.pdp-index__frame--portrait {
  top: 50%;
  left: 50%;
  height: 100%;
  width: auto;
  max-width: 100%;
  aspect-ratio: 4 / 5;
  transform: translate(-50%, -50%);
}

.pdp-index__frame--landscape {
  top: 50%;
  left: 50%;
  width: 100%;
  height: auto;
  max-height: 100%;
  aspect-ratio: 3 / 2;
  transform: translate(-50%, -50%);
}

.pdp-index__frame--landscape,
.pdp-index__frame--portrait {
  aspect-ratio: var(--rail-aspect);
}

.pdp-index__tile-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  pointer-events: none;
}

.pdp-index__add {
  position: absolute;
  top: var(--thumb-ctrl-inset, 4px);
  right: var(--thumb-ctrl-inset, 4px);
  z-index: 3;
  opacity: 0;
  transform: translateY(4px);
  pointer-events: none;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.pdp-index__tile:hover .pdp-index__add,
.pdp-index__tile--saved .pdp-index__add {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

@media (max-width: 1000px) {
  .pdp-index {
    display: none;
  }
}
</style>
