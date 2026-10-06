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
        :data-cursor="hitCursor"
        :data-cursor-label="cursorLabel || undefined"
        :aria-label="hitLabel || artwork.title"
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
        v-if="controls"
        class="discover-card__add"
        :active="saved"
        :label="
          saved
            ? `Remove ${artwork.title} from Stack`
            : `Add ${artwork.title} to selection`
        "
        @click.stop.prevent="onToggle"
      />

      <button
        v-if="showImageCycle"
        type="button"
        class="discover-card__edge discover-card__edge--prev"
        :data-cursor="cursorLabel ? undefined : 'prev'"
        :data-cursor-label="cursorLabel || undefined"
        tabindex="-1"
        :aria-label="`Previous image of ${artwork.title}`"
        @click.stop.prevent="cycle(-1)"
      />
      <button
        v-if="showImageCycle"
        type="button"
        class="discover-card__edge discover-card__edge--next"
        :data-cursor="cursorLabel ? undefined : 'next'"
        :data-cursor-label="cursorLabel || undefined"
        tabindex="-1"
        :aria-label="`Next image of ${artwork.title}`"
        @click.stop.prevent="cycle(1)"
      />

      <ImageCycleArrows
        v-if="showImageCycle"
        class="discover-card__cycle"
        :index="imageIndex"
        :count="projectImages.length"
        hide-count
        boxed
        :show-cursor="false"
        :cursor-label="cursorLabel"
        @prev="cycle(-1)"
        @next="cycle(1)"
      />
    </div>

    <div class="discover-card__meta mono">
      <p class="discover-card__title">{{ artwork.title }}</p>
      <p v-if="subtitle" class="discover-card__subtitle">{{ subtitle }}</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { DiscoverArtwork } from '~/composables/useCuratedDiscover'
import type { PdpNextItem } from '~/composables/useProductOverlay'

const props = withDefaults(
  defineProps<{
    artwork: DiscoverArtwork
    /** First cell of a typology row — click activates the row instead of the product. */
    trigger?: boolean
    /** Hearts and image controls. Off until the typology row is active. */
    controls?: boolean
    hitLabel?: string
    /** Replaces the plus cursor with this label, for a locked typology row. */
    cursorLabel?: string
    /** Circle only. No plus, and no image-cycle arrows. */
    circleCursor?: boolean
    /** Collection order for the PDP Next control. */
    sequence?: PdpNextItem[]
  }>(),
  { trigger: false, controls: true, hitLabel: '', cursorLabel: '', circleCursor: false },
)

const emit = defineEmits<{
  activate: []
}>()

const cardRatioCss = computed(() => {
  const ratio = props.artwork.cardRatio
  if (ratio === 'wide') return '1.75'
  if (ratio === '2/3') return '2 / 3'
  if (ratio === '1/1') return '1 / 1'
  return '3 / 2'
})

const { open, returnImage } = useProductOverlay()
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

/** After close, stay on the gallery frame that flipped back into this thumb. */
watch(returnImage, (value) => {
  if (!value || value.productId !== props.artwork.id) return
  const urls = projectImages.value
  if (!urls.length) return
  if (value.src) {
    const key = imageAssetKey(value.src)
    const match = urls.findIndex((url) => imageAssetKey(url) === key)
    if (match >= 0) {
      imageIndex.value = match
      return
    }
  }
  imageIndex.value = Math.min(value.index, urls.length - 1)
})

const subtitle = computed(() => {
  const parts = [props.artwork.artist, props.artwork.year].filter(Boolean)
  return parts.length ? parts.join(' · ') : ''
})

const showImageCycle = computed(
  () => props.controls && !props.circleCursor && projectImages.value.length > 1,
)

const hitCursor = computed(() => {
  if (props.cursorLabel) return undefined
  return props.circleCursor ? 'default' : 'plus'
})

const interactive = computed(() => props.trigger || !!props.artwork.slug)
const hitTag = computed(() => (interactive.value ? 'button' : 'div'))
const hitProps = computed(() =>
  interactive.value ? { type: 'button' as const } : {},
)

const cycle = (direction: 1 | -1) => {
  const count = projectImages.value.length
  if (count < 2) return
  imageIndex.value = (imageIndex.value + direction + count) % count
}

const onOpen = (event: MouseEvent) => {
  if (props.trigger) {
    event.preventDefault()
    emit('activate')
    return
  }
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
    ...(props.sequence ? { sequence: props.sequence } : {}),
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

.discover-card__edge {
  position: absolute;
  top: 0;
  z-index: 2;
  width: 15%;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  pointer-events: none;
}

.discover-card__edge--prev {
  left: 0;
}

.discover-card__edge--next {
  right: 0;
}

@media (hover: hover) and (pointer: fine) {
  .discover-card__edge {
    pointer-events: auto;
  }
}

.discover-card__cycle {
  display: none;
  position: absolute;
  right: var(--thumb-ctrl-inset, 4px);
  left: unset;
  bottom: var(--thumb-ctrl-inset, 4px);
  z-index: 3;
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
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 0;
}

.discover-card__title,
.discover-card__subtitle {
  font-size: clamp(8px, 1vw, 9.5px);
  letter-spacing: 0.125em;
}

.discover-card__title {
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}

.discover-card__subtitle {
  margin: 0;
  line-height: 1.3;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
