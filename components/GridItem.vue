<template>
  <article ref="rootRef" class="grid-item">
    <component
      :is="linkTag"
      v-bind="linkProps"
      class="grid-item__media"
      :class="{ 'grid-item__media--image': Boolean(activeImage) }"
      :aria-label="item.title"
      @click="onOpen"
    >
      <img
        v-if="activeImage"
        ref="imageRef"
        class="grid-item__image"
        :src="activeImage"
        :alt="item.title"
        loading="lazy"
        draggable="false"
        @load="onImageLoad"
      />
      <span v-else class="grid-item__type-label">{{ typeLabel }}</span>
      <AddButton
        class="grid-item__add"
        :active="saved"
        :label="saved ? `Remove ${item.title} from bucket` : `Save ${item.title} to bucket`"
        @click.stop.prevent="onToggle"
      />
      <ImageCycleArrows
        v-if="projectImages.length > 1"
        class="grid-item__cycle"
        :index="imageIndex"
        :count="projectImages.length"
        hide-count
        boxed
        @prev="cycle(-1)"
        @next="cycle(1)"
      />
    </component>
  </article>
</template>

<script setup lang="ts">
import { productPath } from '~/composables/useProductCatalog'
import { PRODUCT_TYPE_FILTERS } from '~/composables/demoData'
import { uniqueImageUrls, randomImageIndex } from '~/composables/productImages'

type GridItemData = {
  _id: string
  title: string
  slug?: { current?: string }
  category?: string
  categories?: string[]
  image?: { asset?: { url?: string } }
  gallery?: { asset?: { url?: string } }[]
  spiritGallery?: { asset?: { url?: string } }[]
  linkType?: string
  externalUrl?: string
}

const props = defineProps<{
  item: GridItemData
  imageUrl: string
  index?: number
  tileSize?: number
}>()

const emit = defineEmits<{
  /** Height grew/shrunk — parent should shift top by -delta so the bottom edge stays put */
  'bottom-anchor': [{ delta: number }]
}>()

const { requestSave, isSaved } = useBucket()
const { imageUrl: buildUrl } = useSanityImage()
const { open, returnImage } = useProductOverlay()
const saved = computed(() => isSaved(props.item._id))
const imageIndex = ref(0)
const rootRef = ref<HTMLElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)
let lastHeight = 0
let anchorOnNextLayout = false

watch(
  returnImage,
  (value) => {
    if (value?.productId === props.item._id) {
      imageIndex.value = value.index
      anchorOnNextLayout = true
    }
  },
)

const typeLabel = computed(() => {
  const key = props.item.category || props.item.categories?.[0] || ''
  const match = PRODUCT_TYPE_FILTERS.find((t) => t.value === key)
  return match?.label || key || props.item.title
})

const productSlug = computed(() => {
  if (props.item.linkType !== 'product') return null
  return props.item.slug?.current || null
})

const onOpen = (event: MouseEvent) => {
  if (!productSlug.value) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
  event.preventDefault()
  const source =
    ((event.currentTarget as HTMLElement | null)?.querySelector('img') as HTMLElement | null) ||
    ((event.target as HTMLElement | null)?.closest?.('img') as HTMLElement | null)
  open(productSlug.value, { source, imageIndex: imageIndex.value })
}

const href = computed(() => {
  const productLink = productPath({
    linkType: props.item.linkType,
    slug: props.item.slug,
  })
  if (productLink) return productLink

  if (props.item.linkType === 'url' && props.item.externalUrl) return props.item.externalUrl
  return null
})

const linkTag = computed(() => (href.value ? 'NuxtLink' : 'div'))
const linkProps = computed(() => (href.value ? { to: href.value } : {}))

const projectImages = computed(() => {
  const assets = [
    props.item.image,
    ...(props.item.gallery || []),
    ...(props.item.spiritGallery || []),
  ]
  const hero = props.imageUrl || buildUrl(props.item.image)
  return uniqueImageUrls(
    hero,
    ...assets.map((asset) => (asset ? buildUrl(asset, 1200) : '')),
  )
})

const activeImage = computed(
  () => projectImages.value[imageIndex.value] || props.imageUrl || '',
)

const randomizeImage = () => {
  imageIndex.value = randomImageIndex(projectImages.value.length)
  anchorOnNextLayout = true
}

onMounted(() => {
  randomizeImage()
})

const measureHeight = () => rootRef.value?.offsetHeight || 0

const commitHeight = (anchorBottom: boolean) => {
  const h = measureHeight()
  if (!h) return
  if (anchorBottom && lastHeight > 0) {
    const delta = h - lastHeight
    if (Math.abs(delta) > 0.5) emit('bottom-anchor', { delta })
  }
  lastHeight = h
}

const onImageLoad = () => {
  nextTick(() => {
    commitHeight(anchorOnNextLayout)
    anchorOnNextLayout = false
  })
}

watch(
  () => props.item._id,
  () => {
    lastHeight = 0
    anchorOnNextLayout = false
    randomizeImage()
  },
)

watch(projectImages, (urls) => {
  if (imageIndex.value >= urls.length) randomizeImage()
})

const cycle = (direction: 1 | -1) => {
  const count = projectImages.value.length
  if (count < 2) return
  lastHeight = measureHeight() || lastHeight
  anchorOnNextLayout = true
  imageIndex.value = (imageIndex.value + direction + count) % count
  nextTick(() => {
    const img = imageRef.value
    if (img?.complete) onImageLoad()
  })
}

const onToggle = () => {
  const urls = projectImages.value
  const idx = imageIndex.value
  const hero = props.imageUrl || buildUrl(props.item.image)
  requestSave({
    id: props.item._id,
    title: props.item.title,
    imageUrl: urls[idx] || hero,
    itemType: typeLabel.value,
    link: href.value,
    imageUrls: urls.length > 1 ? urls : undefined,
    imageIndex: urls.length > 1 ? idx : undefined,
  })
}

onMounted(() => {
  nextTick(() => {
    lastHeight = measureHeight()
  })
})
</script>

<style scoped>
.grid-item {
  position: relative;
  width: 100%;
  transform-origin: bottom center;
  transition: transform 0.3s ease;
}

.grid-item:hover {
  transform: scale(1.03);
}

.grid-item__media {
  position: relative;
  display: grid;
  place-items: center;
  container-type: inline-size;
  overflow: hidden;
  padding: 8%;
  text-align: center;
  background: var(--sand);
  transition: background 0.4s ease;
}

.grid-item__media--image {
  padding: 0;
  background: transparent;
}

.grid-item:hover .grid-item__media {
  background: var(--sand);
}

.grid-item:hover .grid-item__media--image {
  background: transparent;
}

.grid-item__image {
  width: 100%;
  height: auto;
  display: block;
}

.grid-item__type-label {
  font-size: 15cqi;
  line-height: 0.95;
  letter-spacing: -0.02em;
  color: var(--charcoal);
  text-transform: lowercase;
  transition: color 0.3s ease;
  opacity: 0.4;
  /* Text-only tiles keep a readable square footprint */
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  width: 100%;
}

.grid-item:hover .grid-item__type-label {
  color: var(--accent);
}

.grid-item__add {
  position: absolute;
  top: var(--thumb-ctrl-inset);
  right: var(--thumb-ctrl-inset);
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 0.2s ease, transform 0.2s ease, color 0.2s ease;
}

.grid-item:hover .grid-item__add,
.grid-item__add.add-btn--active {
  opacity: 1;
  transform: translateY(0);
}

.grid-item__cycle {
  position: absolute;
  right: var(--thumb-ctrl-inset);
  bottom: var(--thumb-ctrl-inset);
  z-index: 2;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
  pointer-events: none;
}

.grid-item:hover .grid-item__cycle {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
</style>
