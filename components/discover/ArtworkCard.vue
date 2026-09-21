<template>
  <article class="discover-card">
    <component
      :is="linkTag"
      v-bind="linkProps"
      class="discover-card__media"
      :aria-label="artwork.title"
      @click="onOpen"
    >
      <img
        class="discover-card__image"
        :src="artwork.imageUrl"
        :alt="artwork.title"
        loading="lazy"
        decoding="async"
        draggable="false"
      />
    </component>
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

const { open } = useProductOverlay()

const subtitle = computed(() => {
  const parts = [props.artwork.artist, props.artwork.year].filter(Boolean)
  return parts.length ? parts.join(' · ') : ''
})

const linkTag = computed(() => (props.artwork.slug ? 'button' : 'div'))
const linkProps = computed(() =>
  props.artwork.slug
    ? { type: 'button' as const }
    : {},
)

const onOpen = (event: MouseEvent) => {
  if (!props.artwork.slug) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
  event.preventDefault()
  const source = (event.currentTarget as HTMLElement | null)?.querySelector('img')
  open(props.artwork.slug, {
    source: source instanceof HTMLElement ? source : null,
    flipSrc: props.artwork.imageUrl,
  })
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
  display: block;
  width: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
  color: inherit;
}

.discover-card__media:not(button) {
  cursor: default;
}

.discover-card__image {
  display: block;
  width: 100%;
  max-width: 900px;
  height: auto;
  max-height: min(68vh, 720px);
  object-fit: contain;
  object-position: center bottom;
  background: transparent;
  transition: opacity 0.45s ease;
}

.discover-card__media:hover .discover-card__image {
  opacity: 0.88;
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
