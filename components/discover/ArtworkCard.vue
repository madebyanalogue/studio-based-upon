<template>
  <article
    class="discover-card"
    :class="{ 'discover-card--saved': saved }"
    :style="{ '--discover-card-ratio': cardRatioCss }"
  >
    <div class="discover-card__media">
      <component
        :is="hitTag"
        v-bind="hitProps"
        class="discover-card__hit"
        :aria-label="artwork.title"
        @click="onOpen"
      >
        <img
          class="discover-card__image discover-card__image--primary"
          :src="activeImage"
          :alt="artwork.title"
          loading="lazy"
          decoding="async"
          draggable="false"
        />
      </component>

      <AddButton
        class="discover-card__add"
        :active="saved"
        :label="
          saved
            ? `Remove ${artwork.title} from selection`
            : `Add ${artwork.title} to selection`
        "
        @click.stop.prevent="onToggle"
      />

      <ImageCycleArrows
        v-if="projectImages.length > 1"
        class="discover-card__cycle"
        :index="imageIndex"
        :count="projectImages.length"
        hide-count
        boxed
        @prev="cycle(-1)"
        @next="cycle(1)"
      />
    </div>

    <div class="discover-card__meta">
      <p class="discover-card__title">{{ artwork.title }}</p>
      <p v-if="subtitle" class="discover-card__subtitle">{{ subtitle }}</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { DiscoverArtwork } from '~/composables/useCuratedDiscover'

const props = defineProps<{
  artwork: DiscoverArtwork
}>()

const cardRatioCss = computed(() => {
  const ratio = props.artwork.cardRatio
  if (ratio === '2/3') return '2 / 3'
  if (ratio === '1/1') return '1 / 1'
  return '3 / 2'
})

const { open } = useProductOverlay()
const { requestSave, isSaved } = useBucket()

const imageIndex = ref(0)

const projectImages = computed(() => {
  const urls = [
    props.artwork.imageUrl,
    ...(props.artwork.galleryUrls || []),
  ].filter(Boolean)
  return [...new Set(urls)]
})

const activeImage = computed(
  () => projectImages.value[imageIndex.value] || props.artwork.imageUrl,
)

const saved = computed(() => {
  const index = projectImages.value.length > 1 ? imageIndex.value : undefined
  return isSaved(props.artwork.id, index)
})

watch(
  () => props.artwork.id,
  () => {
    imageIndex.value = 0
  },
)

watch(projectImages, (urls) => {
  if (imageIndex.value >= urls.length) imageIndex.value = 0
})

const subtitle = computed(() => {
  const parts = [props.artwork.artist, props.artwork.year].filter(Boolean)
  return parts.length ? parts.join(' · ') : ''
})

const hitTag = computed(() => (props.artwork.slug ? 'button' : 'div'))
const hitProps = computed(() =>
  props.artwork.slug ? { type: 'button' as const } : {},
)

const cycle = (direction: 1 | -1) => {
  const count = projectImages.value.length
  if (count < 2) return
  imageIndex.value = (imageIndex.value + direction + count) % count
}

const onOpen = (event: MouseEvent) => {
  if (!props.artwork.slug) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
  event.preventDefault()
  const source = (event.currentTarget as HTMLElement | null)?.querySelector(
    '.discover-card__image--primary',
  )
  open(props.artwork.slug, {
    source: source instanceof HTMLElement ? source : null,
    imageIndex: imageIndex.value,
    flipSrc: activeImage.value || null,
  })
}

const onToggle = (event?: MouseEvent) => {
  const urls = projectImages.value
  const idx = imageIndex.value
  const source =
    ((event?.currentTarget as HTMLElement | null)
      ?.closest('.discover-card')
      ?.querySelector('.discover-card__image--primary') as HTMLElement | null) ||
    null
  requestSave(
    {
      id: props.artwork.id,
      title: props.artwork.title,
      imageUrl: urls[idx] || props.artwork.imageUrl,
      itemType: 'item',
      link: props.artwork.slug
        ? `/materials-and-forms/${props.artwork.slug}`
        : undefined,
      imageUrls: urls.length > 1 ? urls : undefined,
      imageIndex: urls.length > 1 ? idx : undefined,
    },
    { source },
  )
}
</script>

<style scoped>
.discover-card {
  flex: 0 0 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.discover-card__media {
  position: relative;
  display: block;
  width: 100%;
  margin: 0;
  padding: 0;
  line-height: 0;
  aspect-ratio: var(--discover-card-ratio, 3 / 2);
  overflow: hidden;
}

.discover-card__hit {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
  color: inherit;
  line-height: 0;
}

div.discover-card__hit {
  cursor: default;
}

.discover-card__image {
  display: block;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  object-fit: cover;
  object-position: center center;
  background: transparent;
  pointer-events: none;
}

.discover-card__add {
  position: absolute;
  top: var(--thumb-ctrl-inset, 4px);
  right: var(--thumb-ctrl-inset, 4px);
  z-index: 3;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.discover-card__cycle {
  position: absolute;
  right: var(--thumb-ctrl-inset, 4px);
  left: unset;
  bottom: var(--thumb-ctrl-inset, 4px);
  z-index: 2;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

@media (min-width: 1000px) {
  .discover-card__add,
  .discover-card__cycle {
    opacity: 0;
    transform: translateY(4px);
    pointer-events: none;
  }

  .discover-card:hover .discover-card__add,
  .discover-card:hover .discover-card__cycle,
  .discover-card--saved .discover-card__add {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }
}

@media (hover: none) {
  .discover-card__add,
  .discover-card__cycle {
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }
}

.discover-card__meta {
  padding-right: 0.5rem;
}

.discover-card__title {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.35;
  letter-spacing: 0.02em;
}

.discover-card__subtitle {
  margin: 0.2rem 0 0;
  font-size: var(--text-xs);
  line-height: 1.35;
  color: var(--muted);
}
</style>
