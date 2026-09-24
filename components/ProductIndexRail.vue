<template>
  <div
    class="pdp-index"
    :class="{
      'pdp-index--chrome': pdpChromeVisible,
      'pdp-index--chrome-enter': chromeEnterMotion,
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
              'pdp-index__tile--active': item.slug === indexActiveSlug,
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
                :aria-current="item.slug === indexActiveSlug ? 'page' : undefined"
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

    <button
      type="button"
      class="pdp-index__edge-close pdp-index__edge-close--left"
      aria-label="Hide index"
      :tabindex="indexRailVisible && pdpChromeVisible ? undefined : -1"
      :aria-hidden="!indexRailVisible || !pdpChromeVisible ? 'true' : undefined"
      @click="toggleIndexMode"
    >
      <svg
        class="pdp-index__edge-chevron"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M14.5 6.5 9 12l5.5 5.5" />
      </svg>
    </button>

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
        {{ spiritMode ? 'Close' : 'Spirit' }}
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

    <button
      type="button"
      class="pdp-index__edge-close pdp-index__edge-close--right"
      aria-label="Hide related"
      :tabindex="relatedRailVisible && pdpChromeVisible ? undefined : -1"
      :aria-hidden="!relatedRailVisible || !pdpChromeVisible ? 'true' : undefined"
      @click="toggleRelatedMode"
    >
      <svg
        class="pdp-index__edge-chevron"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M9.5 6.5 15 12l-5.5 5.5" />
      </svg>
    </button>
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
const { closingFlip, getFlipSourceProductId } = useProductOverlay()

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

const normalizeTypeKey = (type?: string) =>
  String(type || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')

const isSatelliteType = (type?: string) =>
  INDEX_EXCLUDED_TYPES.has(normalizeTypeKey(type))

const { data: activeProduct } = await useAsyncData(
  () => `pdp-rail-product-${props.slug}`,
  () => fetchProduct(props.slug),
  { watch: [() => props.slug] },
)

/** When a Spirit/Origin PDP is open, Index shows only that singularity. */
const activeSingularity = computed(() => {
  const cat = normalizeTypeKey(activeProduct.value?.category)
  return cat === 'spirit' || cat === 'origin' ? cat : null
})

const indexItems = computed((): IndexCard[] => {
  const singularity = activeSingularity.value
  return libraryItems.value
    .map((item) => {
      const slug = productSlug(item)
      if (!slug) return null
      const typeKey = normalizeTypeKey(item.category || item.type)
      const cats = (item.categories || []).map((c) => normalizeTypeKey(c))
      if (singularity) {
        if (typeKey !== singularity && !cats.includes(singularity)) return null
      } else if (
        INDEX_EXCLUDED_TYPES.has(typeKey) ||
        cats.some((c) => INDEX_EXCLUDED_TYPES.has(c))
      ) {
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
    .filter((item): item is IndexCard => !!item)
})

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
  // Ignore clamp-to-0 events while the rail is closed / closing.
  if (!indexRailVisible.value) return
  indexStripScrollTop.value =
    indexLenis?.animatedScroll ?? indexStripRef.value?.scrollTop ?? 0
}

const onRelatedStripScroll = () => {
  if (!relatedStripRef.value) return
  relatedStripScrollTop.value = relatedStripRef.value.scrollTop
}

const captureIndexStripScroll = () => {
  indexStripScrollTop.value =
    indexLenis?.animatedScroll ??
    indexStripRef.value?.scrollTop ??
    indexStripScrollTop.value
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
    indexResizeObserver = new ResizeObserver(() => {
      // Closing animates --pdp-index-rail-width; resize then clamps scroll to 0.
      if (!indexLenis || !indexRailVisible.value) return
      const y = indexLenis.animatedScroll
      indexLenis.resize()
      indexLenis.scrollTo(y, { immediate: true })
    })
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

/**
 * Highlight the open product. Spirit / Origin now appear in Index, so use
 * their own slug; only fall back for satellite shells that somehow lack a tile.
 */
const indexActiveSlug = computed(() => {
  const product = activeProduct.value
  if (!product || !isSatelliteType(product.category)) return props.slug
  if (indexItems.value.some((item) => item.slug === props.slug)) return props.slug

  const shellId = getFlipSourceProductId()
  if (shellId && shellId !== product._id) {
    const shell = indexItems.value.find((item) => item._id === shellId)
    if (shell) return shell.slug
  }

  return props.slug
})

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
    // Resize after open can clamp — put the strip back where it was.
    indexLenis.scrollTo(indexStripScrollTop.value, { immediate: true })
    if (indexStripRef.value) {
      indexStripRef.value.scrollTop = indexStripScrollTop.value
    }
    requestAnimationFrame(() => restoreIndexStripScroll())
  } else {
    captureIndexStripScroll()
    indexLenis.stop()
    if (indexStripRef.value) {
      indexStripRef.value.scrollTop = indexStripScrollTop.value
    }
  }
})

const {
  relatedRailVisible,
  frozenRelatedIdList,
  syncRelatedRailDom,
  closeRelatedRail,
  relatedToggleRequest,
} = usePdpRelatedRail()

/** Shared with ProductDetail — rail chrome fades with the PDP sides. */
const pdpChromeVisible = useState('pdp-chrome-visible', () => false)
/** Overlay flip only — hard-load skips translate-in. */
const chromeEnterMotion = useState('pdp-chrome-enter-motion', () => false)

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

watch(relatedToggleRequest, (value, previous) => {
  if (value === previous) return
  toggleRelatedMode()
})

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

watch(indexActiveSlug, async (active) => {
  if (!import.meta.client || !active || !indexRailVisible.value) return
  await nextTick()
  const tile = indexTrackRef.value?.querySelector<HTMLElement>(
    '.pdp-index__tile--active',
  )
  if (!tile || !indexLenis) return
  const top = tile.offsetTop - (indexStripRef.value?.clientHeight || 0) / 2 + tile.offsetHeight / 2
  indexLenis.scrollTo(Math.max(0, top), { immediate: true })
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
  --rail-padding: 30px;

  position: absolute;
  inset: 0;
  z-index: 110;
  pointer-events: none;
  opacity: 0;
  transition: none;
}

.pdp-index--chrome {
  opacity: 1;
}

.pdp-index--chrome-enter {
  transition: opacity var(--index-chrome-motion);
}

.pdp-index:not(.pdp-index--chrome) .pdp-index__rail,
.pdp-index:not(.pdp-index--chrome) .pdp-index__reveals,
.pdp-index:not(.pdp-index--chrome) .pdp-index__edge-close {
  pointer-events: none;
}

.pdp-index__rail {
  --rail-surface: color-mix(in srgb, #222 80%, transparent);
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 1;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: var(--index-rail-width);
  overflow: hidden;
  background: var(--rail-surface);
  backdrop-filter: blur(15px);
  pointer-events: auto;
}

.pdp-index__rail--left {
  left: calc(var(--pdp-index-rail-width) - var(--index-rail-width));
  border-right: 1px solid var(--grid-line);
  transform: translateX(0);
  transition: none;
}

.pdp-index--chrome-enter:not(.pdp-index--chrome) .pdp-index__rail--left {
  transform: translateX(-110%);
}

.pdp-index--chrome-enter .pdp-index__rail--left {
  transition: transform var(--index-motion);
}

.pdp-index--chrome .pdp-index__rail--left {
  transform: translateX(0);
}

.pdp-index--index-hidden .pdp-index__rail--left {
  pointer-events: none;
}

.pdp-index__rail--right {
  right: calc(var(--pdp-related-rail-width) - var(--index-rail-width));
  border-left: 1px solid var(--grid-line);
  transform: translateX(0);
  transition: none;
}

.pdp-index--chrome-enter:not(.pdp-index--chrome) .pdp-index__rail--right {
  transform: translateX(110%);
}

.pdp-index--chrome-enter .pdp-index__rail--right {
  transition: transform var(--index-motion);
}

.pdp-index--chrome .pdp-index__rail--right {
  transform: translateX(0);
}

.pdp-index--related-hidden .pdp-index__rail--right {
  pointer-events: none;
}

.pdp-index__edge-close {
  --edge-close-size: 2.75rem;
  --rail-surface: color-mix(in srgb, #222 80%, transparent);
  display: none;
  position: absolute;
  top: 50%;
  z-index: 6;
  box-sizing: border-box;
  place-items: center;
  width: calc(var(--edge-close-size) / 2);
  height: var(--edge-close-size);
  margin: 0;
  padding: 0;
  border: 1px solid var(--grid-line);
  background: var(--rail-surface);
  backdrop-filter: blur(15px);
  color: #fff;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-50%);
  transition:
    opacity 0.2s ease,
    color 0.2s ease,
    left var(--index-motion),
    right var(--index-motion);
}

.pdp-index__edge-close:hover {
  color: color-mix(in srgb, #fff 70%, transparent);
}

/* Flat side flush to panel; half-disc into the gallery. */
.pdp-index__edge-close--left {
  left: var(--pdp-index-rail-width);
  border-left: 0;
  border-radius: 0 999px 999px 0;
}

.pdp-index__edge-close--right {
  right: var(--pdp-related-rail-width);
  border-right: 0;
  border-radius: 999px 0 0 999px;
}

.pdp-index--chrome:not(.pdp-index--index-hidden):not(.pdp-index--exiting)
  .pdp-index__edge-close--left,
.pdp-index--chrome:not(.pdp-index--related-hidden):not(.pdp-index--exiting)
  .pdp-index__edge-close--right {
  opacity: 1;
  pointer-events: auto;
}

.pdp-index__edge-chevron {
  display: block;
}

/* Close: rails slide off before the flyer / backdrop */
.pdp-index--exiting .pdp-index__rail {
  pointer-events: none;
  transition: transform var(--index-motion);
}

.pdp-index--exiting .pdp-index__rail--left,
.pdp-index--exiting.pdp-index--chrome .pdp-index__rail--left {
  transform: translateX(-110%);
}

.pdp-index--exiting .pdp-index__rail--right,
.pdp-index--exiting.pdp-index--chrome .pdp-index__rail--right {
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
  padding-bottom: 4px;
  line-height: 0;
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
