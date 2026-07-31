<template>
  <div v-if="entries.length" class="scrub-gallery">
    <figure class="scrub-gallery__stage">
      <img
        class="scrub-gallery__frame"
        :src="activeFrameSrc"
        :alt="activeEntry?.title || 'Scrub preview'"
        draggable="false"
      />
    </figure>

    <div
      v-if="entries.length > 1"
      class="scrub-gallery__thumbs"
      :class="{ 'scrub-gallery__thumbs--visible': thumbsVisible }"
    >
      <button
        v-for="(entry, i) in entries"
        :key="entry.id"
        type="button"
        class="scrub-gallery__thumb"
        :class="{ 'scrub-gallery__thumb--active': i === selectedIndex }"
        :aria-label="entry.title ? `Show ${entry.title}` : `Show sequence ${i + 1}`"
        :aria-current="i === selectedIndex ? 'true' : undefined"
        @click="selectEntry(i)"
      >
        <img
          v-if="entry.poster"
          :src="entry.poster"
          alt=""
          loading="lazy"
          draggable="false"
        />
        <span v-else class="scrub-gallery__thumb-fallback interface">{{ i + 1 }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
export type ScrubGalleryEntry = {
  id: string
  /** Ordered frame URLs for scroll / pointer scrubbing. */
  frames: string[]
  poster: string
  title?: string
}

const props = defineProps<{
  entries: ScrubGalleryEntry[]
  /**
   * When set (0–1), drives the frame sequence from scroll.
   * When null/undefined, falls back to pointer scrubbing.
   */
  progress?: number | null
}>()

const selectedIndex = ref(0)
const frameIndex = ref(0)
const thumbsVisible = ref(false)
let rafId = 0
let pendingFrame = 0
let scrubBound = false
const preloaded = new Set<string>()

const scrollDriven = computed(
  () => typeof props.progress === 'number' && Number.isFinite(props.progress),
)

const activeEntry = computed(
  () => props.entries[selectedIndex.value] || props.entries[0] || null,
)

const activeFrameSrc = computed(() => {
  const frames = activeEntry.value?.frames || []
  if (!frames.length) return activeEntry.value?.poster || ''
  const i = Math.min(frameIndex.value, frames.length - 1)
  return frames[Math.max(0, i)] || frames[0]
})

const preloadFrames = (frames: string[]) => {
  if (!import.meta.client) return
  for (const src of frames) {
    if (!src || preloaded.has(src)) continue
    preloaded.add(src)
    const img = new Image()
    img.decoding = 'async'
    img.src = src
  }
}

const applyFrameFromProgress = (progress: number) => {
  const frames = activeEntry.value?.frames
  if (!frames?.length || !import.meta.client) return
  const clamped = Math.min(1, Math.max(0, progress))
  pendingFrame = Math.round(clamped * (frames.length - 1))
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = 0
    frameIndex.value = pendingFrame
  })
}

watch(
  activeEntry,
  (entry) => {
    if (!scrollDriven.value) frameIndex.value = 0
    if (entry?.frames?.length) preloadFrames(entry.frames)
  },
  { immediate: true },
)

watch(
  () => props.entries,
  (entries) => {
    if (!entries.length) {
      selectedIndex.value = 0
      return
    }
    if (selectedIndex.value >= entries.length) selectedIndex.value = 0
    entries.forEach((entry, i) => {
      if (i !== selectedIndex.value) preloadFrames(entry.frames)
    })
  },
)

watch(
  () => props.progress,
  (progress) => {
    if (typeof progress !== 'number' || !Number.isFinite(progress)) return
    applyFrameFromProgress(progress)
  },
  { immediate: true },
)

watch(scrollDriven, (driven) => {
  if (driven) unbindScrub()
  else bindScrub()
})

const selectEntry = (index: number) => {
  if (index < 0 || index >= props.entries.length) return
  selectedIndex.value = index
  if (scrollDriven.value && typeof props.progress === 'number') {
    applyFrameFromProgress(props.progress)
  } else {
    frameIndex.value = 0
  }
}

const scheduleScrub = (clientX: number, clientY: number) => {
  if (scrollDriven.value) return
  const frames = activeEntry.value?.frames
  if (!frames?.length || !import.meta.client) return
  const width = window.innerWidth || 1
  const height = window.innerHeight || 1
  const progress = Math.min(
    1,
    Math.max(0, (clientX / width + clientY / height) / 2),
  )
  pendingFrame = Math.round(progress * (frames.length - 1))
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = 0
    frameIndex.value = pendingFrame
  })
}

const onPointerMove = (event: PointerEvent) => {
  scheduleScrub(event.clientX, event.clientY)
}

const onTouchMove = (event: TouchEvent) => {
  const touch = event.touches[0]
  if (!touch) return
  scheduleScrub(touch.clientX, touch.clientY)
}

const bindScrub = () => {
  if (!import.meta.client || scrubBound || scrollDriven.value) return
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: true })
  scrubBound = true
}

const unbindScrub = () => {
  if (!import.meta.client || !scrubBound) return
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('touchmove', onTouchMove)
  scrubBound = false
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
}

onMounted(() => {
  if (!scrollDriven.value) bindScrub()
  requestAnimationFrame(() => {
    thumbsVisible.value = true
  })
})

onBeforeUnmount(() => {
  unbindScrub()
})
</script>

<style scoped>
.scrub-gallery {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.scrub-gallery__stage {
  position: relative;
  margin: 0;
  width: 100%;
  height: 100%;
  max-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scrub-gallery__frame {
  display: block;
  width: 100%;
  height: 100%;
  max-height: 100%;
  object-fit: contain;
  background: var(--sand);
  pointer-events: none;
  user-select: none;
}

.scrub-gallery__thumbs {
  position: absolute;
  left: 50%;
  bottom: var(--thumb-ctrl-inset, 4px);
  z-index: 3;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  max-width: calc(100% - 2rem);
  padding: 0.35rem;
  transform: translateX(-50%) translateY(0.75rem);
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.scrub-gallery__thumbs--visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
  pointer-events: auto;
}

.scrub-gallery__thumb {
  width: 56px;
  height: 56px;
  padding: 0;
  border: 1px solid var(--ui-border-color);
  border-radius: var(--thumb-radius);
  background: var(--warm-white);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.scrub-gallery__thumb:hover {
  border-color: var(--charcoal);
}

.scrub-gallery__thumb--active {
  border-color: var(--charcoal);
  border-width: 2px;
}

.scrub-gallery__thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scrub-gallery__thumb-fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  font-size: var(--text-sm);
  color: var(--muted);
}
</style>
