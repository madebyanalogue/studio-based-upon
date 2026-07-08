<template>
  <article class="grid-item">
    <component
      :is="linkTag"
      v-bind="linkProps"
      class="grid-item__media"
      :aria-label="item.title"
      @click="onOpen"
    >
      <span class="grid-item__type-label">{{ typeLabel }}</span>
      <button
        type="button"
        class="grid-item__heart"
        :class="{ 'grid-item__heart--active': saved }"
        :aria-label="saved ? `Remove ${item.title} from bucket` : `Save ${item.title} to bucket`"
        @click.stop.prevent="onToggle"
      >
        {{ saved ? '♥' : '♡' }}
      </button>
    </component>
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
const saved = computed(() => isSaved(props.item._id))

const typeLabel = computed(() => props.item.itemType || 'product')

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
  position: relative;
  display: grid;
  place-items: center;
  container-type: inline-size;
  aspect-ratio: 1;
  overflow: hidden;
  padding: 8%;
  text-align: center;
  background: var(--sand);
  transition: background 0.4s ease;
}

.grid-item:hover .grid-item__media {
  background: var(--sand);
}

.grid-item__type-label {
  font-size: 15cqi;
  line-height: 0.95;
  letter-spacing: -0.02em;
  color: var(--charcoal);
  text-transform: lowercase;
  transition: color 0.3s ease;
  opacity: 0.4;
}

.grid-item:hover .grid-item__type-label {
  color: var(--accent);
}

.grid-item__heart {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  font-size: 1.1rem;
  line-height: 1;
  color: var(--charcoal);
  background: rgba(250, 247, 242, 0.85);
  backdrop-filter: blur(4px);
  border-radius: 999px;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.grid-item__media:hover .grid-item__heart,
.grid-item__heart--active {
  opacity: 1;
  transform: translateY(0);
}

.grid-item__heart--active {
  color: #000;
}
</style>
