<template>
  <article class="product-card">
    <component
      :is="linkTag"
      v-bind="linkProps"
      class="product-card__media"
      :aria-label="item.title"
      @click="onOpen"
    >
      <span class="product-card__type-label">{{ typeLabel }}</span>
      <button
        type="button"
        class="product-card__heart"
        :class="{ 'product-card__heart--active': saved }"
        :aria-label="saved ? `Remove ${item.title} from bucket` : `Save ${item.title} to bucket`"
        @click.stop.prevent="onToggle"
      >
        {{ saved ? '♥' : '♡' }}
      </button>
    </component>

    <component
      :is="linkTag"
      v-bind="linkProps"
      class="product-card__meta"
      :aria-label="href ? `View ${item.title}` : undefined"
      @click="onOpen"
    >
      <p class="product-card__title serif-italic">{{ item.title }}</p>
      <p class="product-card__type">{{ item.itemType }}</p>
    </component>
  </article>
</template>

<script setup lang="ts">
import { PRODUCT_TYPE_FILTERS, type FormalItem } from '~/composables/demoData'
import { productPath } from '~/composables/useProductCatalog'

const props = defineProps<{
  item: FormalItem
  imageUrl: string
}>()

const { requestSave, isSaved } = useBucket()
const { open } = useProductOverlay()
const saved = computed(() => isSaved(props.item._id))

const typeLabel = computed(() => {
  const match = PRODUCT_TYPE_FILTERS.find((t) => t.value === props.item.type)
  if (match) return match.label
  return props.item.type || props.item.itemType || 'Product'
})

const href = computed(() => productPath(props.item))
const productSlug = computed(() => {
  const slug = typeof props.item.slug === 'string' ? props.item.slug : props.item.slug?.current
  return props.item.itemType === 'product' && slug ? slug : null
})

const linkTag = computed(() => (href.value ? 'NuxtLink' : 'div'))
const linkProps = computed(() => (href.value ? { to: href.value } : {}))

const onOpen = (event: MouseEvent) => {
  if (!productSlug.value) return
  // Let modified clicks (new tab, etc.) fall through to the link
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
  event.preventDefault()
  open(productSlug.value)
}

const onToggle = () => {
  requestSave({
    id: props.item._id,
    title: props.item.title,
    imageUrl: props.imageUrl,
    itemType: props.item.itemType,
    link: href.value,
  })
}
</script>

<style scoped>
.product-card {
  display: flex;
  flex-direction: column;
}

.product-card__media {
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

.product-card:hover .product-card__media {
  background: var(--cream);
}

.product-card__type-label {
  font-size: 15cqi;
  line-height: 0.95;
  letter-spacing: -0.02em;
  color: var(--charcoal);
  text-transform: lowercase;
  transition: color 0.3s ease;
  opacity: 0.4;
}

.product-card:hover .product-card__type-label {
  color: var(--accent);
}

.product-card__heart {
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

.product-card__media:hover .product-card__heart,
.product-card__heart--active {
  opacity: 1;
  transform: translateY(0);
}

.product-card__heart--active {
  color: var(--accent);
}

.product-card__meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.6rem;
  color: inherit;
}

.product-card__title {
  margin: 0;
  font-size: var(--text-sm);
}

.product-card__type {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--muted);
  text-transform: capitalize;
}
</style>
