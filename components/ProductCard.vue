<template>
  <article class="product-card mono" :class="{ 'product-card--saved': saved }">
    <div class="product-card__pad">
      <component
        :is="linkTag"
        v-bind="linkProps"
        class="product-card__media"
        :class="{
          'product-card__media--image': Boolean(activeImage),
          'product-card__media--link': Boolean(href),
        }"
        :aria-label="item.title"
        @pointerenter="prefetchActiveHero"
        @focusin="prefetchActiveHero"
        @click="onOpen"
      >
        <img
          v-if="activeImage"
          class="product-card__image"
          :class="{ 'product-card__image--cover': imageIndex > 0 }"
          :src="activeImage"
          :alt="item.title"
          loading="lazy"
          draggable="false"
        />
        <span v-else class="product-card__type-label">{{ typeLabel }}</span>

        <AddButton
          class="product-card__add"
          :active="saved"
          :label="saved ? `Remove ${item.title} from bucket` : `Save ${item.title} to bucket`"
          @click.stop.prevent="onToggle"
        />
      </component>

      <ImageCycleArrows
        v-if="!isImageLocked && projectImages.length > 1"
        class="product-card__cycle"
        :index="imageIndex"
        :count="projectImages.length"
        hide-count
        boxed
        @prev="cycle(-1)"
        @next="cycle(1)"
      />
    </div>

    <div class="product-card__meta">
      <component
        :is="linkTag"
        v-bind="linkProps"
        class="product-card__meta-link"
        :aria-label="href ? `View ${item.title}` : undefined"
        @click="onOpen"
      >
        <div class="product-card__meta-main">
          <p class="product-card__title">{{ item.title }}</p>
          <p class="product-card__provenance">{{ provenance }}</p>
        </div>
        <div class="product-card__type">
          <span>{{ typeLabel }}</span>
          <div v-if="orderLabel" class="product-card__sep">/</div>
          <span v-if="orderLabel" class="product-card__order">{{ orderLabel }}</span>
        </div>
      </component>
    </div>
  </article>
</template>

<script setup lang="ts">
import { PRODUCT_TYPE_FILTERS, type FormalItem } from '~/composables/demoData'
import { productPath, productSlug as resolveProductSlug } from '~/composables/useProductCatalog'
import type { LibraryItem } from '~/composables/useLibraryCatalog'
import { uniqueImageUrls, productGalleryFrames } from '~/composables/productImages'
import { IMAGE_WIDTH } from '~/composables/useSanityImage'

const props = withDefaults(
  defineProps<{
    item: FormalItem | LibraryItem
    imageUrl: string
    orderLabel?: string
    /** Lock the card to a single gallery frame (expanded grid tiles). */
    forcedImageIndex?: number | null
    /** Hide scrub / cycle controls. */
    lockImage?: boolean
    /**
     * TEMP Materials & Forms mode: click expands the gallery into the grid
     * instead of opening the PDP. Parent handles `@expand`.
     */
    expandOnClick?: boolean
  }>(),
  {
    forcedImageIndex: null,
    lockImage: false,
    expandOnClick: false,
  },
)

const emit = defineEmits<{
  expand: []
}>()

/** Placeholder until CMS location / year fields exist. */
const provenance = "Sotheby's London, 2020"

const { requestSave, isSaved } = useBucket()
const { open, returnImage } = useProductOverlay()
const { imageUrl: buildUrl, prefetchImage } = useSanityImage()
const saved = computed(() => {
  const index = projectImages.value.length > 1 ? imageIndex.value : undefined
  return isSaved(props.item._id, index)
})

const imageIndex = ref(0)

const isImageLocked = computed(
  () => props.lockImage || props.forcedImageIndex != null,
)

watch(
  () => props.forcedImageIndex,
  (value) => {
    if (typeof value === 'number' && value >= 0) imageIndex.value = value
  },
  { immediate: true },
)

watch(
  returnImage,
  (value) => {
    if (isImageLocked.value) return
    if (value?.productId === props.item._id) {
      imageIndex.value = value.index
    }
  },
)

const typeLabel = computed(() => {
  const key =
    ('category' in props.item && props.item.category) ||
    props.item.type ||
    ''
  const match = PRODUCT_TYPE_FILTERS.find((t) => t.value === key)
  return match?.label || key || 'Item'
})

const href = computed(() =>
  productPath({
    _id: props.item._id,
    linkType: props.item.linkType,
    slug: props.item.slug,
    category:
      ('category' in props.item && props.item.category) ||
      props.item.type ||
      undefined,
  }),
)
const productSlug = computed(() =>
  resolveProductSlug({
    _id: props.item._id,
    linkType: props.item.linkType,
    slug: props.item.slug,
    category:
      ('category' in props.item && props.item.category) ||
      props.item.type ||
      undefined,
  }),
)

const imageAssets = computed(() => {
  const item = props.item as LibraryItem
  return productGalleryFrames(item)
})

/** Grid display — thumb tier */
const projectImages = computed(() =>
  uniqueImageUrls(
    props.imageUrl,
    ...imageAssets.value.map((asset) =>
      asset ? buildUrl(asset, IMAGE_WIDTH.thumb) : '',
    ),
  ),
)

/** Hero tier for Flip flyer / PDP handoff */
const heroImages = computed(() =>
  uniqueImageUrls(
    ...imageAssets.value.map((asset) =>
      asset ? buildUrl(asset, IMAGE_WIDTH.hero) : '',
    ),
  ),
)

const activeImage = computed(
  () => projectImages.value[imageIndex.value] || props.imageUrl || '',
)

const activeHeroImage = computed(
  () => heroImages.value[imageIndex.value] || activeImage.value || '',
)

const prefetchActiveHero = () => {
  if (activeHeroImage.value) void prefetchImage(activeHeroImage.value)
}

watch(
  () => props.item._id,
  () => {
    if (typeof props.forcedImageIndex === 'number' && props.forcedImageIndex >= 0) {
      imageIndex.value = props.forcedImageIndex
      return
    }
    imageIndex.value = 0
  },
)

watch(projectImages, (urls) => {
  if (imageIndex.value >= urls.length) {
    imageIndex.value =
      typeof props.forcedImageIndex === 'number' && props.forcedImageIndex >= 0
        ? Math.min(props.forcedImageIndex, Math.max(0, urls.length - 1))
        : 0
  }
})

const cycle = (direction: 1 | -1) => {
  if (isImageLocked.value) return
  const count = projectImages.value.length
  if (count < 2) return
  imageIndex.value = (imageIndex.value + direction + count) % count
}

const linkTag = computed(() => (href.value ? 'NuxtLink' : 'div'))
const linkProps = computed(() => (href.value ? { to: href.value } : {}))

const onOpen = (event: MouseEvent) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return

  // TEMP expand mode: first click fans the gallery into the grid.
  if (props.expandOnClick && projectImages.value.length > 1) {
    event.preventDefault()
    emit('expand')
    return
  }

  if (!productSlug.value) return
  event.preventDefault()
  const card = (event.currentTarget as HTMLElement | null)?.closest('.product-card')
  const source =
    (card?.querySelector('.product-card__image') as HTMLElement | null) ||
    ((event.currentTarget as HTMLElement | null)?.querySelector('img') as HTMLElement | null)
  const flipSrc = activeHeroImage.value
  if (flipSrc) void prefetchImage(flipSrc)
  open(productSlug.value, {
    source,
    imageIndex: imageIndex.value,
    flipSrc: flipSrc || null,
  })
}

const onToggle = (event?: MouseEvent) => {
  const urls = projectImages.value
  const idx = imageIndex.value
  const source =
    ((event?.currentTarget as HTMLElement | null)
      ?.closest('.product-card')
      ?.querySelector('.product-card__image') as HTMLElement | null) || null
  requestSave(
    {
      id: props.item._id,
      title: props.item.title,
      imageUrl: urls[idx] || props.imageUrl,
      itemType: typeLabel.value,
      link: href.value,
      imageUrls: urls.length > 1 ? urls : undefined,
      imageIndex: urls.length > 1 ? idx : undefined,
    },
    { source },
  )
}
</script>

<style scoped>
.product-card {
  --ui-border-color: transparent;
  --thumb-w: auto;
  --thumb-h: auto;
  position: relative;
  width: var(--thumb-w);
  max-width: 100%;
  flex: 0 0 auto;
  min-width: 0;
  /* border-right: 1px solid var(--ui-border-color);
  border-bottom: 1px solid var(--ui-border-color); */
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.product-card__pad {
  position: relative;
  padding: var(--card-pad);
}

.product-card__media {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 100%;
  height: var(--thumb-h);
  container-type: inline-size;
  overflow: hidden;
  text-align: center;
  border-radius: var(--thumb-radius);
  transition: background 0.4s ease;
}

.product-card__media--link {
  cursor: pointer;
}

.product-card__media--image {
  /* background: var(--cream); */
}

.product-card:hover .product-card__media {
  /* background: var(--cream); */
}

.product-card__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: bottom center;
  display: block;
  pointer-events: none;
  transition: opacity 0.7s ease, filter 0.7s ease;
}

/* Later gallery frames fill the silhouette set by the first image */
.product-card__image--cover {
  object-fit: cover;
  object-position: center center;
}

.product-card__type-label {
  font-size: 15cqi;
  line-height: 0.95;
  letter-spacing: -0.02em;
  color: var(--charcoal);
  text-transform: lowercase;
  transition: color 0.3s ease;
  opacity: 0.4;
  pointer-events: none;
}

.product-card:hover .product-card__type-label {
  color: var(--accent);
}

.product-card__add {
  position: absolute;
  top: var(--thumb-ctrl-inset);
  right: var(--thumb-ctrl-inset);
  z-index: 3;
  transition: opacity 0.2s ease, transform 0.2s ease, color 0.2s ease;
}

.product-card__cycle {
  position: absolute;
  right: var(--thumb-ctrl-inset);
  bottom: var(--thumb-ctrl-inset);
  z-index: 3;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

/* Wide: heart rides the hover; a saved heart stays readable */
@media (min-width: 1000px) {
  .product-card__add,
  .product-card__cycle {
    opacity: 0;
    transform: translateY(4px);
    pointer-events: none;
  }

  .product-card:hover .product-card__add,
  .product-card:hover .product-card__cycle,
  .product-card--saved .product-card__add {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }
}

.product-card__meta {
  /* position: absolute; */
  inset: auto 0 0 0;
  z-index: 1;
  padding: 16px 0;
  min-width: 0;
  opacity: 1;
  transition: opacity 0.6s ease;
  pointer-events: none;
  border-top: 1px dashed var(--ui-border-color);
}

.product-card__meta * {
  font-size: 9px;
  letter-spacing: 0.125em;
}

.product-card__meta *,
.product-card__meta-link {
  pointer-events: none;
  cursor: inherit;
}

@media (hover: none) {
  .product-card:hover .product-card__type-label {
    color: var(--charcoal);
  }

  .product-card__add,
  .product-card__cycle {
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }
}

.product-card__meta-link {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
  color: inherit;
}

.product-card__meta-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.product-card__title {
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-card__provenance {
  margin: 0;
  min-width: 0;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-card__type {
  margin: 0;
  flex-shrink: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  color: var(--muted);
  opacity: 0;
  transition: opacity 0.7s ease 0s;
}

.product-card__sep {
  flex-shrink: 0;
  font-style: normal;
  text-transform: none;
  line-height: 1;
}

.product-card__order {
  /* font-family: var(--handwritten);
  font-style: normal;
  text-transform: none;
  color: var(--handwritten-color);
  line-height: 1;
  letter-spacing: -0.03em;
  display: block;
  transform: translateY(6%) scale(2.3);
  padding: 0px 6px; */
}

.product-card__sep, .product-card__order {
  display: none;
}
</style>
