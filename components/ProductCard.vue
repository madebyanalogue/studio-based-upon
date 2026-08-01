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

        <ImageCycleArrows
          v-if="projectImages.length > 1"
          class="product-card__cycle"
          :index="imageIndex"
          :count="projectImages.length"
          hide-count
          boxed
          @prev="cycle(-1)"
          @next="cycle(1)"
        />
      </component>
    </div>

    <div class="product-card__meta">
      <component
        :is="linkTag"
        v-bind="linkProps"
        class="product-card__meta-link"
        :aria-label="href ? `View ${item.title}` : undefined"
        @click="onOpen"
      >
        <p class="product-card__title">{{ item.title }}</p>
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
import { uniqueImageUrls } from '~/composables/productImages'
import { IMAGE_WIDTH } from '~/composables/useSanityImage'

const props = defineProps<{
  item: FormalItem | LibraryItem
  imageUrl: string
  orderLabel?: string
}>()

const { requestSave, isSaved } = useBucket()
const { open, returnImage } = useProductOverlay()
const { imageUrl: buildUrl, prefetchImage } = useSanityImage()
const saved = computed(() => {
  const index = projectImages.value.length > 1 ? imageIndex.value : undefined
  return isSaved(props.item._id, index)
})

const imageIndex = ref(0)

watch(
  returnImage,
  (value) => {
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
  return [
    item.image,
    ...(item.gallery || []),
    ...(item.spiritGallery || []),
  ]
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
    imageIndex.value = 0
  },
)

watch(projectImages, (urls) => {
  if (imageIndex.value >= urls.length) imageIndex.value = 0
})

const cycle = (direction: 1 | -1) => {
  const count = projectImages.value.length
  if (count < 2) return
  imageIndex.value = (imageIndex.value + direction + count) % count
}

const linkTag = computed(() => (href.value ? 'NuxtLink' : 'div'))
const linkProps = computed(() => (href.value ? { to: href.value } : {}))

const onOpen = (event: MouseEvent) => {
  if (!productSlug.value) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
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
  position: relative;
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

.product-card__cycle {
  position: absolute;
  left: var(--thumb-ctrl-inset);
  bottom: var(--thumb-ctrl-inset);
  z-index: 2;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
  pointer-events: none;
}

.product-card:hover .product-card__cycle {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.product-card__media {
  position: relative;
  display: grid;
  place-items: center;
  container-type: inline-size;
  /* aspect-ratio: 1; */
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
  object-fit: cover;
  display: block;
  pointer-events: none;
  transition: opacity 0.7s ease, filter 0.7s ease;
}

.product-card--saved .product-card__image {
  opacity: 0.1;
  filter: grayscale(1);
}

.product-card--saved:hover .product-card__image {
  opacity: 1;
  filter: grayscale(0);
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
  right: var(--thumb-ctrl-inset);
  bottom: var(--thumb-ctrl-inset);
  z-index: 3;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
  pointer-events: none;
}

.product-card:hover .product-card__add {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.product-card__meta {
  /* position: absolute; */
  inset: auto 0 0 0;
  z-index: 1;
  padding: var(--title-pad);
  min-width: 0;
  opacity: 0;
  transition: opacity 0.6s ease;
  pointer-events: none;
  border-top: 1px dashed var(--ui-border-color);
}

.product-card__meta * {
  font-size: var(--text-sm);
  font-size: clamp(10px,.5cqi, 12px);
}

.product-card__meta *,
.product-card__meta-link {
  pointer-events: none;
  cursor: inherit;
}

.product-card:hover .product-card__meta {
  opacity: 1;
}

.product-card__meta-link {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
  color: inherit;
}

.product-card__title {
  margin: 0;
  min-width: 0;
  flex: 1;
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
  opacity: 1;
  transition: opacity 0.7s ease 0s;
}
.product-card:hover .product-card__type {
  opacity: 1;
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
