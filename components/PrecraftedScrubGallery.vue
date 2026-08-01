<template>
  <div v-if="entries.length" class="scrub-gallery">
    <figure class="scrub-gallery__stage">
      <img
        v-if="activeEntry?.poster"
        class="scrub-gallery__frame scrub-gallery__poster"
        :class="{ 'scrub-gallery__poster--hidden': scrubReady }"
        :src="activeEntry.poster"
        :alt="activeEntry?.title || 'Scrub preview'"
        draggable="false"
      />

      <video
        v-if="resolvedVideoSrc"
        ref="videoRef"
        class="scrub-gallery__frame scrub-gallery__video"
        :class="{
          'scrub-gallery__video--ready': scrubReady,
          'scrub-gallery__video--solo': !activeEntry?.poster,
        }"
        :src="resolvedVideoSrc"
        muted
        playsinline
        preload="auto"
        disablepictureinpicture
        @loadedmetadata="onVideoMeta"
        @canplaythrough="onVideoReady"
      />

      <div
        v-if="showLoadingLine"
        class="scrub-gallery__load"
        aria-hidden="true"
      >
        <span
          class="scrub-gallery__load-line"
          :style="{ transform: `scaleX(${Math.min(1, Math.max(0, loadProgress))})` }"
        />
      </div>
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
  /** Scrub video — scroll progress seeks `currentTime`. */
  video: string
  poster: string
  title?: string
}

const props = withDefaults(
  defineProps<{
    entries: ScrubGalleryEntry[]
    /**
     * When set (0–1), drives the sequence from scroll.
     * When null/undefined, falls back to pointer scrubbing.
     */
    progress?: number | null
    /** When false, freeze the current frame (avoids dual-video seek jank). */
    scrubActive?: boolean
    /** Remote/blob URL to use once the page has loaded this clip. */
    loadedSrc?: string | null
    /** 0–1 download progress for the loading line. */
    loadProgress?: number
    /** Show the bottom-right loading line. */
    isLoading?: boolean
  }>(),
  {
    scrubActive: true,
  },
)

const emit = defineEmits<{
  ready: []
}>()

const selectedIndex = ref(0)
const thumbsVisible = ref(false)
const videoRef = ref<HTMLVideoElement | null>(null)
const videoDuration = ref(0)
const mediaReady = ref(false)
let scrubBound = false
let readyEmitted = false
let seekInFlight = false
let pendingSeekTime: number | null = null
let seekedHandler: (() => void) | null = null

const scrollDriven = computed(
  () => typeof props.progress === 'number' && Number.isFinite(props.progress),
)

const activeEntry = computed(
  () => props.entries[selectedIndex.value] || props.entries[0] || null,
)

const resolvedVideoSrc = computed(() => props.loadedSrc || '')

const scrubReady = computed(() => Boolean(resolvedVideoSrc.value) && mediaReady.value)

const canSeek = computed(() => scrubReady.value && props.scrubActive !== false)

const showLoadingLine = computed(
  () => Boolean(props.isLoading) && !scrubReady.value,
)

const loadProgress = computed(() =>
  typeof props.loadProgress === 'number' && Number.isFinite(props.loadProgress)
    ? props.loadProgress
    : 0,
)

function clearSeekQueue() {
  const video = videoRef.value
  if (video && seekedHandler) {
    video.removeEventListener('seeked', seekedHandler)
  }
  seekedHandler = null
  seekInFlight = false
  pendingSeekTime = null
}

function flushSeek(time: number) {
  const video = videoRef.value
  if (!video || !videoDuration.value) return

  try {
    video.pause()
  } catch {
    // ignore
  }

  if (Math.abs(video.currentTime - time) <= 0.01) {
    if (pendingSeekTime !== null) {
      const next = pendingSeekTime
      pendingSeekTime = null
      flushSeek(next)
    }
    return
  }

  seekInFlight = true
  seekedHandler = () => {
    const el = videoRef.value
    if (el && seekedHandler) el.removeEventListener('seeked', seekedHandler)
    seekedHandler = null
    seekInFlight = false
    if (pendingSeekTime === null) return
    const next = pendingSeekTime
    pendingSeekTime = null
    flushSeek(next)
  }
  video.addEventListener('seeked', seekedHandler)

  try {
    video.currentTime = time
  } catch {
    clearSeekQueue()
  }
}

/** Pause + set currentTime; coalesce seeks until the previous one finishes. */
function seekToProgress(progress: number) {
  if (!canSeek.value) return
  const video = videoRef.value
  if (!video || !videoDuration.value) return
  const clamped = Math.min(Math.max(progress, 0), 1)
  const time = clamped * videoDuration.value

  if (seekInFlight) {
    pendingSeekTime = time
    return
  }
  flushSeek(time)
}

const applyProgress = (progress: number) => {
  if (!import.meta.client || !resolvedVideoSrc.value || !canSeek.value) return
  seekToProgress(progress)
}

function markMediaReady() {
  const video = videoRef.value
  if (!video) return
  videoDuration.value = video.duration || 0
  video.pause()
  if (!mediaReady.value) {
    mediaReady.value = true
    if (canSeek.value && typeof props.progress === 'number') {
      seekToProgress(props.progress)
    } else if (canSeek.value) {
      seekToProgress(0)
    }
  }
  if (!readyEmitted) {
    readyEmitted = true
    emit('ready')
  }
}

const onVideoMeta = () => {
  const video = videoRef.value
  if (!video) return
  videoDuration.value = video.duration || 0
  video.pause()
  // Blob sources are fully local — metadata is enough to seek safely.
  if (resolvedVideoSrc.value.startsWith('blob:')) {
    markMediaReady()
  }
}

const onVideoReady = () => {
  markMediaReady()
}

watch(
  () => props.loadedSrc,
  () => {
    clearSeekQueue()
    mediaReady.value = false
    videoDuration.value = 0
    readyEmitted = false
  },
)

watch(
  activeEntry,
  () => {
    clearSeekQueue()
    mediaReady.value = false
    videoDuration.value = 0
    readyEmitted = false
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
  },
)

watch(
  () => props.progress,
  (progress) => {
    if (typeof progress !== 'number' || !Number.isFinite(progress)) return
    applyProgress(progress)
  },
  { immediate: true },
)

watch(
  () => props.scrubActive,
  (active) => {
    if (!active) {
      clearSeekQueue()
      return
    }
    if (typeof props.progress === 'number') applyProgress(props.progress)
  },
)

watch(scrubReady, (ready) => {
  if (ready && canSeek.value && typeof props.progress === 'number') {
    applyProgress(props.progress)
  }
})

watch(scrollDriven, (driven) => {
  if (driven) unbindScrub()
  else if (scrubReady.value) bindScrub()
})

watch(scrubReady, (ready) => {
  if (!ready) {
    unbindScrub()
    return
  }
  if (!scrollDriven.value) bindScrub()
})

const selectEntry = (index: number) => {
  if (index < 0 || index >= props.entries.length) return
  selectedIndex.value = index
  if (canSeek.value && typeof props.progress === 'number') {
    applyProgress(props.progress)
  }
}

const scheduleScrub = (clientX: number, clientY: number) => {
  if (scrollDriven.value || !canSeek.value) return
  const width = window.innerWidth || 1
  const height = window.innerHeight || 1
  const progress = Math.min(
    1,
    Math.max(0, (clientX / width + clientY / height) / 2),
  )
  applyProgress(progress)
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
  if (!import.meta.client || scrubBound || scrollDriven.value || !scrubReady.value) return
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: true })
  scrubBound = true
}

const unbindScrub = () => {
  if (!import.meta.client || !scrubBound) return
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('touchmove', onTouchMove)
  scrubBound = false
}

onMounted(() => {
  requestAnimationFrame(() => {
    thumbsVisible.value = true
  })
})

onBeforeUnmount(() => {
  clearSeekQueue()
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
  width: auto;
  height: 100%;
  min-height: 0;
}

.scrub-gallery__stage {
  position: relative;
  margin: 0;
  width: auto;
  height: 100%;
  max-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scrub-gallery__frame {
  display: block;
  width: auto;
  height: 100%;
  max-height: 100%;
  object-fit: contain;
  background: var(--sand);
  pointer-events: none;
  user-select: none;
}

.scrub-gallery__poster {
  position: relative;
  z-index: 1;
  transition: opacity 0.35s ease;
}

.scrub-gallery__poster--hidden {
  opacity: 0;
}

.scrub-gallery__video {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 0;
  width: auto;
  height: 100%;
  max-height: 100%;
  object-fit: contain;
  background: transparent;
  opacity: 0;
  transform: translate(-50%, -50%);
  transition: opacity 0.35s ease;
}

.scrub-gallery__video--ready {
  z-index: 2;
  opacity: 1;
}

.scrub-gallery__video--solo {
  position: relative;
  left: auto;
  top: auto;
  transform: none;
}

.scrub-gallery__load {
  position: absolute;
  right: 1rem;
  bottom: 1rem;
  z-index: 2;
  width: 2.75rem;
  height: 1px;
  pointer-events: none;
}

.scrub-gallery__load-line {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--charcoal);
  transform: scaleX(0);
  transform-origin: left center;
  will-change: transform;
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
