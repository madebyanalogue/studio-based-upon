<template>
  <Teleport to="body">
    <aside v-if="entries.length" class="lab-featured" :class="{ 'is-light': light }">
      <p class="lab-featured__eyebrow">Featured</p>
      <ul class="lab-featured__list">
        <li v-for="entry in entries" :key="entry.slug">
          <button
            type="button"
            class="lab-featured__card"
            :aria-label="`View ${entry.title}`"
            @click="onOpen(entry, $event)"
          >
            <span class="lab-featured__media">
              <img
                v-if="entry.thumb"
                class="lab-featured__image"
                :src="entry.thumb"
                :alt="entry.title"
                loading="lazy"
                draggable="false"
              />
              <span v-else class="lab-featured__placeholder" aria-hidden="true" />
            </span>
            <span class="lab-featured__title">{{ entry.title }}</span>
          </button>
        </li>
      </ul>
    </aside>
  </Teleport>
</template>

<script setup lang="ts">
import { productCoverFrame } from '~/composables/productImages'
import { productSlug as resolveProductSlug } from '~/composables/useProductCatalog'
import type { LibraryItem } from '~/composables/useLibraryCatalog'
import { IMAGE_WIDTH } from '~/composables/useSanityImage'

const props = withDefaults(
  defineProps<{
    slugs: string[]
    light?: boolean
  }>(),
  { light: false },
)

const { items } = await useLibraryCatalog()
const { imageUrl } = useSanityImage()
const { open } = useProductOverlay()

type Entry = {
  slug: string
  title: string
  thumb: string
  item: LibraryItem
}

const itemSlug = (item: LibraryItem) => {
  const raw = item.slug
  if (!raw) return ''
  return typeof raw === 'string' ? raw : raw.current || ''
}

const entries = computed<Entry[]>(() => {
  const bySlug = new Map<string, LibraryItem>()
  for (const item of items.value) {
    const slug = itemSlug(item)
    if (slug) bySlug.set(slug, item)
  }

  return props.slugs.flatMap((slug) => {
    const item = bySlug.get(slug)
    if (!item) return []
    const cover = productCoverFrame(item)
    return [
      {
        slug,
        title: item.title || slug,
        thumb: cover ? imageUrl(cover, IMAGE_WIDTH.thumb) : '',
        item,
      },
    ]
  })
})

const onOpen = (entry: Entry, event: MouseEvent) => {
  const source = (event.currentTarget as HTMLElement | null)?.querySelector(
    '.lab-featured__image',
  ) as HTMLElement | null
  open(resolveProductSlug(entry.item) || entry.slug, {
    source,
    flipSrc: entry.thumb || null,
    productId: entry.item._id,
  })
}
</script>

<style scoped>
.lab-featured {
  position: fixed;
  top: auto;
  left: auto;
  right: 16px;
  bottom: 20px;
  z-index: 40;
  width: min(11.5rem, calc(100vw - 2rem));
  max-height: min(70dvh, calc(100dvh - 8rem));
  overflow: auto;
  padding: 0.75rem 0.8rem 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(31, 28, 24, 0.88);
  backdrop-filter: blur(12px);
  color: #f1ede4;
  pointer-events: auto;
}

.lab-featured.is-light {
  border-color: rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.82);
  color: #222;
}

.lab-featured__eyebrow {
  margin: 0 0 0.55rem;
  font-family: var(--mono, ui-monospace, monospace);
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.55;
}

.lab-featured__list {
  display: grid;
  gap: 0.55rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.lab-featured__card {
  display: grid;
  gap: 0.35rem;
  width: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.lab-featured__media {
  display: block;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
}

.lab-featured.is-light .lab-featured__media {
  background: rgba(0, 0, 0, 0.04);
}

.lab-featured__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lab-featured__placeholder {
  display: block;
  width: 100%;
  height: 100%;
}

.lab-featured__title {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-size: 0.72rem;
  line-height: 1.35;
  letter-spacing: 0.02em;
}

.lab-featured__card:hover .lab-featured__title {
  text-decoration: underline;
  text-underline-offset: 0.15em;
}
</style>
