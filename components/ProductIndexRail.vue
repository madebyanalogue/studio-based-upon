<template>
  <div
    class="pdp-index"
    :class="{ 'pdp-index--hidden': !indexRailVisible }"
  >
    <div
      class="pdp-index__rail"
      aria-label="Product index"
      :aria-hidden="!indexRailVisible ? 'true' : undefined"
    >
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
            <img
              v-if="item.imageUrl"
              class="pdp-index__tile-image"
              :src="item.imageUrl"
              :alt="item.title"
              loading="lazy"
              draggable="false"
            />
          </button>
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

    <div class="pdp-index__controls">
      <button
        type="button"
        class="pdp-index__chevron"
        :aria-label="indexRailVisible ? 'Hide index' : 'Show index'"
        :aria-pressed="indexRailVisible"
        @click="toggleIndexRail"
      >
        <span class="pdp-index__chevron-arrow" aria-hidden="true" />
        <span class="pdp-index__tooltip interface" aria-hidden="true">
          {{ indexRailVisible ? 'Hide index' : 'Show index' }}
        </span>
      </button>

      <button
        type="button"
        class="pdp-index__filter"
        :class="{ 'pdp-index__filter--active': relatedFilterOn }"
        aria-label="Filter"
        :aria-pressed="relatedFilterOn"
        :disabled="!canFilter"
        @click="toggleRelatedFilter"
      >
        <svg
          class="pdp-index__filter-icon"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 6h16M7 12h10M10 18h4"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
        <span class="pdp-index__tooltip interface" aria-hidden="true">Filter</span>
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

const toggleRelatedFilter = () => {
  if (relatedFilterOn.value) {
    relatedFilterOn.value = false
    frozenRelatedIdList.value = null
    return
  }

  const ids = computeRelatedIdsForActive()
  if (ids.size <= 1) return
  frozenRelatedIdList.value = [...ids]
  relatedFilterOn.value = true
  indexRailVisible.value = true
}

const toggleIndexRail = () => {
  indexRailVisible.value = !indexRailVisible.value
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
  --index-rail-width: min(18vw, 250px);
  --index-motion: 0.35s cubic-bezier(0.22, 1, 0.36, 1);

  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 110;
  width: var(--index-rail-width);
  pointer-events: none;
}

.pdp-index__rail {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: color-mix(in srgb, var(--cream) 80%, transparent);
  backdrop-filter: blur(15px);
  transform: translateX(0);
  transition: transform var(--index-motion);
  pointer-events: auto;
}

.pdp-index__rail::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: linear-gradient(to right, #111, transparent);
  opacity: 1;
}

.pdp-index--hidden .pdp-index__rail {
  transform: translateX(-100%);
  pointer-events: none;
}

.pdp-index--hidden .pdp-index__rail::after {
  opacity: 0;
}

.pdp-index__controls {
  position: absolute;
  top: 50%;
  left: calc(100% + 20px);
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  pointer-events: auto;
  transform: translateY(-50%);
  transition: left var(--index-motion);
}

.pdp-index--hidden .pdp-index__controls {
  left: 20px;
}

.pdp-index__chevron,
.pdp-index__filter {
  position: relative;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #000;
  color: #fff;
  cursor: pointer;
}

.pdp-index__chevron-arrow {
  display: block;
  width: 7px;
  height: 7px;
  border-left: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  box-sizing: border-box;
  transform: translateX(1px) rotate(45deg);
  transition: transform 0.2s ease;
}

.pdp-index--hidden .pdp-index__chevron-arrow {
  transform: translateX(-1px) rotate(-135deg);
}

.pdp-index__filter-icon {
  display: block;
  width: 16px;
  height: 16px;
}

.pdp-index__filter--active {
  background: var(--charcoal);
  outline: 1.5px solid var(--cream);
  outline-offset: -3px;
}

.pdp-index__filter:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.pdp-index__tooltip {
  position: absolute;
  top: 50%;
  left: calc(100% + 0.55rem);
  z-index: 2;
  padding: 0.35rem 0.55rem;
  font-size: var(--text-xs);
  color: var(--charcoal);
  white-space: nowrap;
  background: var(--elevated-bg, var(--cream));
  border: 1px solid var(--grid-line);
  border-radius: 6px;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-50%) translateX(-4px);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.pdp-index__chevron:hover .pdp-index__tooltip,
.pdp-index__chevron:focus-visible .pdp-index__tooltip,
.pdp-index__filter:hover:not(:disabled) .pdp-index__tooltip,
.pdp-index__filter:focus-visible:not(:disabled) .pdp-index__tooltip {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

.pdp-index__strip {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  height: 100%;
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
  padding: 15px 30px;
  margin: 0;
  line-height: 0;
}

.pdp-index__tile--hidden {
  display: none;
}

.pdp-index__tile-media {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  line-height: 0;
}

.pdp-index__tile-image {
  display: block;
  width: 100%;
  height: auto;
  max-height: none;
  aspect-ratio: 5 / 4;
  object-fit: cover;
  pointer-events: none;
}

.pdp-index__add {
  position: absolute;
  right: calc(30px + var(--thumb-ctrl-inset, 4px));
  bottom: calc(15px + var(--thumb-ctrl-inset, 4px));
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
