<template>
  <div
    class="pdp-index"
    :class="{
      'pdp-index--hidden': !indexRailVisible,
      'pdp-index--chrome': pdpChromeVisible,
    }"
  >
    <div
      class="pdp-index__rail"
      aria-label="Product index"
      :aria-hidden="!indexRailVisible ? 'true' : undefined"
    >
      <div class="pdp-index__toolbar pdp__related-toolbar interface">
        <div class="pdp-index__tabs" role="tablist" aria-label="Index filter">
          <button
            type="button"
            role="tab"
            class="pdp-index__tab"
            :class="{ 'pdp-index__tab--active': indexRailVisible && !relatedFilterOn }"
            :aria-selected="!relatedFilterOn"
            @click="showAllProducts"
          >
            All
          </button>
          <button
            type="button"
            role="tab"
            class="pdp-index__tab"
            :class="{ 'pdp-index__tab--active': indexRailVisible && relatedFilterOn }"
            :aria-selected="relatedFilterOn"
            :disabled="!canFilter && !relatedFilterOn"
            @click="showRelatedProducts"
          >
            Related
          </button>
        </div>
      </div>

      <div
        ref="stripRef"
        class="pdp-index__strip"
        data-lenis-prevent
        @scroll.passive="onStripScroll"
      >
        <div
          v-for="item in indexItems"
          :key="item._id"
          class="pdp-index__tile"
          :class="{
            'pdp-index__tile--active': item.slug === slug,
            'pdp-index__tile--saved': isItemSaved(item),
            'pdp-index__tile--hidden':
              relatedFilterOn && frozenRelatedIds && !frozenRelatedIds.has(item._id),
          }"
        >
          <button
            type="button"
            class="pdp-index__tile-media"
            :aria-label="`View ${item.title}`"
            :aria-current="item.slug === slug ? 'page' : undefined"
            :tabindex="indexRailVisible ? undefined : -1"
            @click="onIndexClick(item)"
          >
            <span
              class="pdp-index__frame"
              :class="`pdp-index__frame--${item.orientation}`"
            >
              <img
                v-if="item.imageUrl"
                class="pdp-index__tile-image"
                :src="item.imageUrl"
                :alt="item.title"
                loading="lazy"
                draggable="false"
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
            </span>
          </button>
        </div>
      </div>
    </div>

    <div class="pdp-index__reveals">
      <button
        type="button"
        class="pdp-index__reveal interface"
        :aria-label="indexModeActive ? 'Hide index' : 'Show product index'"
        @click="toggleIndexMode"
      >
        {{ indexModeActive ? 'Hide' : 'Index' }}
      </button>
      <button
        type="button"
        class="pdp-index__reveal interface"
        :aria-label="relatedModeActive ? 'Hide related' : 'Show more like this'"
        :disabled="!canFilter && !relatedModeActive"
        @click="toggleRelatedMode"
      >
        {{ relatedModeActive ? 'Hide' : 'More like this' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PRODUCT_TYPE_FILTERS } from '~/composables/demoData'
import { IMAGE_WIDTH } from '~/composables/useSanityImage'
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
        imageUrl: imageUrl(item.image, IMAGE_WIDTH.thumb),
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

/**
 * Session state — survives remounts so scroll / filter aren't lost when the
 * page or overlay chrome refreshes around the rail.
 */
const stripScrollTop = useState('pdp-index-rail-scroll', () => 0)
const relatedFilterOn = useState('pdp-index-related-on', () => false)
const frozenRelatedIdList = useState<string[] | null>('pdp-index-frozen-ids', () => null)
const stripRef = ref<HTMLElement | null>(null)

const frozenRelatedIds = computed(() =>
  frozenRelatedIdList.value ? new Set(frozenRelatedIdList.value) : null,
)

const onStripScroll = () => {
  if (!stripRef.value) return
  stripScrollTop.value = stripRef.value.scrollTop
}

const restoreStripScroll = () => {
  const el = stripRef.value
  if (!el) return
  el.scrollTop = stripScrollTop.value
}

/** Soft-loaded product for related picks — never remounts the rail. */
const activeProduct = shallowRef<Awaited<ReturnType<typeof fetchProduct>>>(null)
let relatedToken = 0

watch(
  () => props.slug,
  async (slug) => {
    const top = stripRef.value?.scrollTop ?? stripScrollTop.value
    stripScrollTop.value = top

    const token = ++relatedToken
    const next = await fetchProduct(slug)
    if (token !== relatedToken) return
    activeProduct.value = next

    if (!import.meta.client) return
    await nextTick()
    restoreStripScroll()
    requestAnimationFrame(() => restoreStripScroll())
  },
  { immediate: true },
)

const libraryItem = computed(() =>
  libraryItems.value.find((item) => productSlug(item) === props.slug),
)

/** Related ids for the *current* product — used only when freezing a filter. */
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

const indexRailVisible = useCookie<boolean>('sba-pdp-index-rail', {
  default: () => true,
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
})

/** Shared with ProductDetail — rail chrome fades with the PDP sides. */
const pdpChromeVisible = useState('pdp-chrome-visible', () => false)

const indexModeActive = computed(
  () => indexRailVisible.value && !relatedFilterOn.value,
)
const relatedModeActive = computed(
  () => indexRailVisible.value && relatedFilterOn.value,
)

const showAllProducts = () => {
  relatedFilterOn.value = false
  frozenRelatedIdList.value = null
  indexRailVisible.value = true
}

const showRelatedProducts = () => {
  const ids = computeRelatedIdsForActive()
  if (ids.size <= 1) return
  frozenRelatedIdList.value = [...ids]
  relatedFilterOn.value = true
  indexRailVisible.value = true
}

const hideIndexRail = () => {
  indexRailVisible.value = false
}

const toggleIndexMode = () => {
  if (indexModeActive.value) hideIndexRail()
  else showAllProducts()
}

const toggleRelatedMode = () => {
  if (relatedModeActive.value) hideIndexRail()
  else showRelatedProducts()
}

const onIndexClick = (item: IndexCard) => {
  if (item.slug === props.slug) return
  // Capture scroll before navigate in case the host remounts
  onStripScroll()
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
  nextTick(() => restoreStripScroll())
})
</script>

<style scoped>
.pdp-index {
  --index-tabs-height: 2.25rem;
  --index-rail-width: min(18vw, 280px);
  --index-motion: 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  --index-chrome-motion: 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  --rail-padding: 35px;

  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 110;
  width: var(--index-rail-width);
  pointer-events: none;
  opacity: 0;
  transform: translateX(0);
  transition:
    opacity var(--index-chrome-motion),
    transform var(--index-motion);
}

.pdp-index--chrome {
  opacity: 1;
}

.pdp-index--hidden {
  transform: translateX(-100%);
}

.pdp-index:not(.pdp-index--chrome) .pdp-index__rail,
.pdp-index:not(.pdp-index--chrome) .pdp-index__reveals {
  pointer-events: none;
}

.pdp-index__rail {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: color-mix(in srgb, var(--cream) 80%, transparent);
  backdrop-filter: blur(15px);
  pointer-events: auto;
}

.pdp-index--hidden .pdp-index__rail {
  pointer-events: none;
}

.pdp-index__toolbar {
  position: relative;
  z-index: 2;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.75rem;
  padding: 0;
  border-bottom: 1px solid var(--grid-line);
}

.pdp-index__tabs {
  display: flex;
  align-items: center;
  gap: 0rem;
  min-width: 0;
}

.pdp-index__tab {
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  font-size: var(--text-sm);
  color: var(--muted);
  cursor: pointer;
  transition: color 0.2s ease;
  height: var(--index-tabs-height);
  border-right: 1px solid var(--grid-line);
  padding: 0px calc(var(--rail-padding) / 2);
}

.pdp-index__tab:hover {
  color: var(--charcoal);
}

.pdp-index__tab--active {
  color: var(--charcoal);
}

.pdp-index__tab:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.pdp-index__reveals {
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(100% + 20px);
  z-index: 111;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 20px;
  pointer-events: auto;
}

.pdp-index__reveal {
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  font-size: var(--text-sm);
  color: #fff;
  text-decoration: underline;
  text-underline-offset: 4px;
  cursor: pointer;
}

.pdp-index__reveal:hover:not(:disabled) {
  text-decoration-thickness: 2px;
}

.pdp-index__reveal:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.pdp-index__strip {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  overscroll-behavior: contain;
}

.pdp-index__strip::-webkit-scrollbar {
  display: none;
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

.pdp-index__tile--hidden {
  display: none;
}

.pdp-index__tile-media {
  position: relative;
  display: block;
  aspect-ratio: 1;
  width: 100%;
  height: auto;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  line-height: 0;
  overflow: hidden;
}

.pdp-index__frame {
  position: absolute;
  display: block;
  line-height: 0;
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
