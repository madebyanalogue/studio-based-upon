<template>
  <article
    class="grid-item"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <component
      :is="linkTag"
      v-bind="linkProps"
      class="grid-item__media"
      :aria-label="item.title"
      @click="onOpen"
    >
      <img :src="imageUrl" :alt="item.title" loading="lazy" draggable="false" />
    </component>

    <div class="grid-item__meta" :class="{ 'grid-item__meta--visible': hovered || saved }">
      <button
        type="button"
        class="grid-item__heart"
        :class="{ 'grid-item__heart--active': saved }"
        :aria-label="saved ? `Remove ${item.title} from bucket` : `Save ${item.title} to bucket`"
        @click.stop="onToggle"
      >
        {{ saved ? '♥' : '♡' }}
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { productPath } from '~/composables/useProductCatalog'

type GridItemData = {
  _id: string
  title: string
  slug?: { current?: string }
  itemType?: string
  image?: { asset?: { url?: string } }
  linkType?: string
  externalUrl?: string
  project?: { slug?: { current?: string } }
}

const props = defineProps<{
  item: GridItemData
  imageUrl: string
  index?: number
  tileSize?: number
}>()

const { requestSave, isSaved } = useBucket()
const { imageUrl: buildUrl } = useSanityImage()
const { open } = useProductOverlay()
const hovered = ref(false)
const saved = computed(() => isSaved(props.item._id))

const productSlug = computed(() =>
  props.item.itemType === 'product' && props.item.slug?.current
    ? props.item.slug.current
    : null,
)

const onOpen = (event: MouseEvent) => {
  if (!productSlug.value) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
  event.preventDefault()
  open(productSlug.value)
}

const href = computed(() => {
  const productLink = productPath({
    itemType: props.item.itemType,
    slug: props.item.slug,
  })
  if (productLink) return productLink

  if (props.item.linkType === 'url' && props.item.externalUrl) return props.item.externalUrl
  if (props.item.linkType === 'project' && props.item.project?.slug?.current) {
    return `/work/${props.item.project.slug.current}`
  }
  return null
})

const linkTag = computed(() => (href.value ? 'NuxtLink' : 'div'))
const linkProps = computed(() => (href.value ? { to: href.value } : {}))

const onToggle = () => {
  requestSave({
    id: props.item._id,
    title: props.item.title,
    imageUrl: props.imageUrl || buildUrl(props.item.image),
    itemType: props.item.itemType || 'product',
    link: href.value,
  })
}
</script>

<style scoped>
.grid-item {
  position: relative;
  width: 100%;
  transition: transform 0.3s ease;
}

.grid-item:hover {
  transform: scale(1.03);
}

.grid-item__media {
  display: block;
  aspect-ratio: 1;
  overflow: hidden;
}

.grid-item__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.grid-item__meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.grid-item__meta--visible {
  opacity: 1;
}

.grid-item__heart {
  font-size: 1.1rem;
  line-height: 1;
  color: var(--charcoal);
}

.grid-item__heart--active {
  color: #000;
}
</style>
