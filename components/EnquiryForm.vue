<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="enquiry"
      :class="{
        'enquiry--concealed': !formShown,
        'enquiry--fly-cover': gridCover,
      }"
      role="dialog"
      aria-modal="true"
      aria-label="Send enquiry"
      data-cursor="default"
    >
            <div class="enquiry__backdrop" data-lenis-prevent @click="formShown && close()" />

      <div class="enquiry__panel">
        <div class="enquiry__body">
          <div class="enquiry__fields" data-lenis-prevent>
            <header class="enquiry__header" data-lenis-prevent>
              <div>
                <h2 class="enquiry__title">Send enquiry</h2>
                <p class="enquiry__subtitle">
                  {{
                    source === 'moodboard'
                      ? 'Your board'
                      : source === 'product'
                        ? 'Product enquiry'
                        : 'Your selection'
                  }}
                </p>
              </div>
              <button type="button" class="enquiry__close" aria-label="Close" @click="close">
                <span class="enquiry__close-icon" aria-hidden="true" />
              </button>
            </header>

            <div v-if="isSuccess" class="enquiry__success">
              <p class="enquiry__success-title  interface">Thank you</p>
              <p>Your enquiry has been sent. We will be in touch shortly.</p>
              <button type="button" class="btn btn--filled" @click="close">Close</button>
            </div>

            <form v-else class="enquiry__form" @submit.prevent="submit">
            <label class="enquiry__field">
              <span class="enquiry__label">Name</span>
              <input
                v-model="form.name"
                type="text"
                name="name"
                autocomplete="name"
                required
              />
            </label>

            <label class="enquiry__field">
              <span class="enquiry__label">Email</span>
              <input
                v-model="form.email"
                type="email"
                name="email"
                autocomplete="email"
                required
              />
            </label>

            <label class="enquiry__field">
              <span class="enquiry__label">Telephone</span>
              <input
                v-model="form.telephone"
                type="tel"
                name="telephone"
                autocomplete="tel"
              />
            </label>

            <label class="enquiry__field">
              <span class="enquiry__label">Message</span>
              <textarea
                v-model="form.message"
                name="message"
                rows="5"
                placeholder="Tell us about your project…"
              />
            </label>

            <div class="enquiry__field">
              <span class="enquiry__label">
                Attachments <span class="enquiry__hint">optional</span>
              </span>
              <label class="enquiry__upload">
                <input
                  ref="fileInput"
                  type="file"
                  class="sr-only"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  @change="onFilesSelected"
                />
                <span class="enquiry__upload-btn">Upload files</span>
                <span class="enquiry__upload-note">Images, PDF or Word · up to 10MB each</span>
              </label>
              <ul v-if="attachments.length" class="enquiry__files">
                <li v-for="file in attachments" :key="file.id" class="enquiry__file">
                  <span class="enquiry__file-name">{{ file.name }}</span>
                  <span class="enquiry__file-size">{{ formatSize(file.size) }}</span>
                  <button
                    type="button"
                    class="enquiry__file-remove"
                    :aria-label="`Remove ${file.name}`"
                    @click="removeAttachment(file.id)"
                  >
                    ×
                  </button>
                </li>
              </ul>
            </div>

            <p v-if="error" class="enquiry__error" role="alert">{{ error }}</p>

            <button type="submit" class="enquiry__send interface" :disabled="isSubmitting">
              {{ isSubmitting ? 'Sending…' : 'Send enquiry' }}
            </button>
            </form>
          </div>

          <div
            ref="previewRef"
            class="enquiry__preview"
            :class="{ 'enquiry__preview--pile': previewClipped }"
            data-lenis-prevent
          >
            <div ref="previewScrollRef" class="enquiry__preview-scroll">
            <figure v-if="compositionImage" class="enquiry__composition">
              <img :src="compositionImage" alt="Moodboard composition" />
              <figcaption>Board preview</figcaption>
            </figure>

            <div
              v-if="previewItems.length"
              class="enquiry__grid"
              :class="{ 'enquiry__grid--lines': gridLines }"
            >
              <div
                v-for="item in previewItems"
                :key="item.id"
                class="enquiry__grid-item"
                :class="{ 'enquiry__grid-item--swatch': item.kind !== 'image' }"
                :data-enquiry-id="item.id"
              >
                <img
                  v-if="item.kind === 'image' && item.imageUrl"
                  :src="item.imageUrl"
                  :alt="item.title"
                  :style="item.aspectRatio ? { aspectRatio: String(item.aspectRatio) } : undefined"
                />
                <span
                  v-else-if="item.kind === 'colour' && item.colour"
                  class="enquiry__colour"
                  :style="{ background: item.colour }"
                />
                <span v-else-if="item.kind === 'text'" class="enquiry__text  interface">
                  {{ item.text || item.title }}
                </span>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import Lenis from 'lenis'
import type { EnquiryFlyRect } from '~/composables/useEnquiryForm'

const GATHER_S = 0.85
const SPREAD_S = 0.72
const FORM_FADE_MS = 420

const {
  isOpen,
  source,
  flyOrigins,
  previewItems,
  compositionImage,
  attachments,
  form,
  isSubmitting,
  isSuccess,
  error,
  addAttachments,
  removeAttachment,
  close: closeEnquiry,
  submit,
} = useEnquiryForm()

const formShown = ref(false)
const gridCover = ref(false)
const gridLines = ref(false)
/** Pile has landed in the media column — clip it to that box. */
const previewClipped = ref(false)

const clipFlyersToPreview = () => {
  const root = enquiryFlyLayer()
  const column = document.querySelector<HTMLElement>('.enquiry__preview')
  if (!root || !column) return
  const rect = column.getBoundingClientRect()
  const top = rect.top
  const right = window.innerWidth - rect.right
  const bottom = window.innerHeight - rect.bottom
  const left = rect.left
  root.style.clipPath = `inset(${top}px ${right}px ${bottom}px ${left}px)`
  previewClipped.value = true
}

const releasePreviewClip = () => {
  const root = enquiryFlyLayer()
  if (root) root.style.clipPath = ''
  previewClipped.value = false
}
const closing = ref(false)
let runId = 0
type FlyPhase = 'idle' | 'gather' | 'covered' | 'spread' | 'settled'
let phase: FlyPhase = 'idle'

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

const frames = (count = 2) =>
  new Promise<void>((resolve) => {
    const step = (left: number) => {
      if (left <= 0) resolve()
      else requestAnimationFrame(() => step(left - 1))
    }
    step(count)
  })

/** Pile sits on the media column, which is the left half of the form. */
const mediaColumnCenter = () => {
  const column = document.querySelector('.enquiry__preview')
  if (!column) return undefined
  const rect = column.getBoundingClientRect()
  if (rect.width < 2 || rect.height < 2) return undefined
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  }
}

const measureGrid = () => {
  const map = new Map<string, { left: number; top: number; width: number; height: number }>()
  for (const el of document.querySelectorAll<HTMLElement>('[data-enquiry-id]')) {
    const id = el.dataset.enquiryId || ''
    const rect = el.getBoundingClientRect()
    if (!id || rect.width < 2 || rect.height < 2) continue
    map.set(id, {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    })
  }
  return map
}

const boxesFor = (ids: string[], map: Map<string, { left: number; top: number; width: number; height: number }>) =>
  ids.map((id) => map.get(id))

const showFlyers = (visible: boolean) => {
  for (const img of enquiryFlyImages()) img.style.opacity = visible ? '1' : '0'
}

const flyHome = async (id: number) => {
  releasePreviewClip()
  const bridge = getEnquiryFlyBridge()
  const homes = bridge?.measure() ?? []
  const byId = new Map(homes.map((rect) => [rect.id, rect]))
  const ids = enquiryFlyImages().map((img) => img.dataset.flyId || '')
  if (ids.length && homes.length) {
    await tweenEnquiryFlyers(
      boxesFor(ids, byId),
      GATHER_S,
    )
  }
  if (id !== runId) return
  bridge?.setParked(false)
  await nextTick()
  if (id !== runId) return
  clearEnquiryFlyers()
}

const returnToStack = async (id: number) => {
  const leavingGrid = phase === 'spread' || phase === 'settled'
  if (leavingGrid) {
    showFlyers(true)
    setEnquiryFlyFront(true)
    gridCover.value = true
    await nextTick()
    if (id !== runId) return
    const ids = enquiryFlyImages().map((img) => img.dataset.flyId || '')
    const grid = measureGrid()
    const sample = grid.values().next().value
    const size = sample?.width || 120
    const sources = ids.map((itemId) => {
      const box = grid.get(itemId)
      return box
        ? { width: box.width, height: box.height }
        : { width: size, height: size }
    })
    await tweenEnquiryFlyers(pileBoxes(sources, size, mediaColumnCenter()), SPREAD_S)
    if (id !== runId) return
    clipFlyersToPreview()
  }

  if (formShown.value || phase === 'covered' || leavingGrid) {
    // Keep the pile in front so the form fades out from underneath it.
    setEnquiryFlyFront(true)
    formShown.value = false
    await wait(FORM_FADE_MS)
    if (id !== runId) return
  }

  await flyHome(id)
}

const gatherIntoGrid = async (id: number, origins: EnquiryFlyRect[]) => {
  phase = 'gather'
  await frames(2)
  if (id !== runId) return
  if (!enquiryFlyImages().length) {
    formShown.value = true
    gridCover.value = false
    gridLines.value = true
    getEnquiryFlyBridge()?.setParked(false)
    phase = 'idle'
    return
  }

  const grid = measureGrid()
  const sample = grid.values().next().value
  const size = sample?.width || 120
  const ids = origins.map((origin) => origin.id)

  setEnquiryFlyFront(true)
  await tweenEnquiryFlyers(pileBoxes(origins, size, mediaColumnCenter()), GATHER_S)
  if (id !== runId) return

  phase = 'covered'
  clipFlyersToPreview()
  // Form fades in under the pile. The layer starts behind the dialog.
  setEnquiryFlyFront(true)
  formShown.value = true
  await wait(FORM_FADE_MS)
  if (id !== runId) return

  phase = 'spread'
  await tweenEnquiryFlyers(boxesFor(ids, measureGrid()), SPREAD_S)
  if (id !== runId) return

  gridLines.value = true
  gridCover.value = false
  await nextTick()
  await frames(1)
  if (id !== runId) return
  showFlyers(false)
  setEnquiryFlyFront(false)
  releasePreviewClip()
  phase = 'settled'
}

const close = async () => {
  if (!isOpen.value || closing.value) return
  gridLines.value = false
  const flying = phase !== 'idle' || enquiryFlyImages().length > 0
  if (!flying) {
    closeEnquiry()
    return
  }

  closing.value = true
  const id = ++runId
  gsap.killTweensOf(enquiryFlyImages())
  try {
    await returnToStack(id)
  } finally {
    if (id === runId) {
      getEnquiryFlyBridge()?.setParked(false)
      clearEnquiryFlyers()
      releasePreviewClip()
      phase = 'idle'
      gridCover.value = false
      closing.value = false
      closeEnquiry()
      formShown.value = false
    }
  }
}

const previewRef = ref<HTMLElement | null>(null)
const previewScrollRef = ref<HTMLElement | null>(null)
let previewLenis: Lenis | null = null
let previewLenisRaf = 0
let previewLenisRo: ResizeObserver | null = null

const destroyPreviewLenis = () => {
  previewLenisRo?.disconnect()
  previewLenisRo = null
  if (previewLenisRaf) {
    cancelAnimationFrame(previewLenisRaf)
    previewLenisRaf = 0
  }
  previewLenis?.destroy()
  previewLenis = null
}

const tickPreviewLenis = (time: number) => {
  previewLenis?.raf(time)
  previewLenisRaf = requestAnimationFrame(tickPreviewLenis)
}

const initPreviewLenis = () => {
  if (!import.meta.client) return
  const wrapper = previewRef.value
  const content = previewScrollRef.value
  if (!wrapper || !content) return
  destroyPreviewLenis()
  previewLenis = new Lenis({
    wrapper,
    content,
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    syncTouch: true,
    syncTouchLerp: 0.055,
    touchInertiaExponent: 2.05,
    touchMultiplier: 1.55,
    wheelMultiplier: 1.4,
    lerp: 0.07,
    overscroll: false,
    // The dialog already opts out of the page scroller.
    prevent: () => false,
  })
  previewLenis.resize()
  if (typeof ResizeObserver !== 'undefined') {
    previewLenisRo = new ResizeObserver(() => {
      const y = previewLenis?.animatedScroll ?? 0
      previewLenis?.resize()
      previewLenis?.scrollTo(y, { immediate: true })
    })
    previewLenisRo.observe(content)
  }
  previewLenisRaf = requestAnimationFrame(tickPreviewLenis)
}

watch(isSuccess, (success) => {
  if (success) destroyPreviewLenis()
})

watch(previewClipped, (clipped) => {
  if (!previewLenis) return
  if (clipped) previewLenis.stop()
  else previewLenis.start()
})

watch(isOpen, async (open) => {
  if (!import.meta.client) return
  if (!open) {
    destroyPreviewLenis()
    gridLines.value = false
    return
  }
  const origins = flyOrigins.value
  gridLines.value = !origins?.length
  if (!origins?.length) {
    formShown.value = true
    gridCover.value = false
    phase = 'idle'
    await nextTick()
    if (!previewRef.value) await nextTick()
    initPreviewLenis()
    return
  }
  // Hide before the first paint. The form fades in only after the pile lands.
  const id = ++runId
  formShown.value = false
  gridCover.value = true
  phase = 'gather'
  await nextTick()
  if (id !== runId) return
  if (!previewRef.value) await nextTick()
  if (id !== runId) return
  initPreviewLenis()
  await gatherIntoGrid(id, origins)
}, { flush: 'sync' })

const fileInput = ref<HTMLInputElement | null>(null)

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const onFilesSelected = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files?.length) addAttachments(input.files)
  input.value = ''
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isOpen.value) close()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  runId += 1
  releasePreviewClip()
  destroyPreviewLenis()
  clearEnquiryFlyers()
  getEnquiryFlyBridge()?.setParked(false)
})
</script>

<style scoped>
.enquiry {
  position: fixed;
  inset: 0;
  /* Above the open-stack toolbar and enquiry bar (420 / 430) */
  z-index: 460;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--gutter);
}

.enquiry__backdrop,
.enquiry__panel {
  opacity: 1;
  transition: opacity 0.4s ease;
}

.enquiry--concealed .enquiry__backdrop,
.enquiry--concealed .enquiry__panel {
  opacity: 0;
}

.enquiry--fly-cover .enquiry__grid-item > * {
  opacity: 0;
}

.enquiry__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(26, 26, 26, 0.45);
  backdrop-filter: blur(2px);
}

.enquiry__panel {
  position: relative;
  width: min(1080px, 100%);
  max-height: min(90dvh, 820px);
  display: flex;
  flex-direction: column;
  background: var(--warm-white);
  border: 1px solid var(--grid-line);
  overflow: hidden;
}

.enquiry__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 0 35px;
  border-bottom: 1px solid var(--grid-line);
}

.enquiry__title {
  margin: 0;
  font-size: 25px;
  font-family: var(--mono);
}

.enquiry__subtitle {
  margin: 0.35rem 0 0;
  font-size: var(--text-sm);
  color: var(--muted);
}

.enquiry__close {
  flex-shrink: 0;
  width: 25px;
  height: 25px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid currentColor;
  background: var(--elevated-bg, #fff);
  color: var(--charcoal);
  box-sizing: border-box;
  cursor: pointer;
}

.enquiry__close:hover {
  color: var(--accent, var(--charcoal));
  border-color: currentColor;
}

.enquiry__close-icon {
  position: relative;
  display: block;
  width: 11px;
  height: 11px;
}

.enquiry__close-icon::before,
.enquiry__close-icon::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 1px;
  background: currentColor;
}

.enquiry__close-icon::before {
  transform: translate(-50%, -50%) rotate(45deg);
}

.enquiry__close-icon::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}

.enquiry__body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  min-height: 0;
  overflow: hidden;
  flex: 1;
}

.enquiry__preview {
  min-height: 0;
  padding: 0;
  border-left: 1px solid var(--grid-line);
  background: var(--cream);
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;
}

.enquiry__preview-scroll {
  min-height: 100%;
}

.enquiry__preview::-webkit-scrollbar {
  display: none;
}

.enquiry__preview--pile {
  overflow: hidden;
}

.enquiry__composition {
  margin: 0;
  padding: 1.5rem 1.5rem 0;
}

.enquiry__composition img {
  width: 100%;
  border: 1px solid var(--grid-line);
}

.enquiry__composition figcaption {
  margin-top: 0.5rem;
  font-size: var(--text-xs);
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.enquiry__grid {
  --bucket-thumb-width: 135px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--bucket-thumb-width), 1fr));
  gap: 0;
  align-items: start;
  /* Last column's right rule sits under the panel edge. */
  width: calc(100% + 1px);
}

.enquiry__grid-item {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  box-sizing: border-box;
  padding: 12%;
  border-right: 1px solid transparent;
  border-bottom: 1px solid transparent;
  transition: border-color 0.45s ease;
}

.enquiry__grid--lines .enquiry__grid-item {
  border-right-color: var(--grid-line);
  border-bottom-color: var(--grid-line);
}

.enquiry__grid:not(.enquiry__grid--lines) .enquiry__grid-item {
  transition-duration: 0.2s;
}

.enquiry__grid-item--swatch {
  aspect-ratio: 1;
}

.enquiry__grid-item img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.enquiry__colour {
  display: block;
  width: 100%;
  height: 100%;
}

.enquiry__text {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 0.35rem;
  font-size: var(--text-xs);
  text-align: center;
  line-height: 1.2;
  overflow: hidden;
}

.enquiry__fields {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 0;
  padding: 40px;
  overflow: auto;
}

.enquiry__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.enquiry__field {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.enquiry__label {
  font-size: var(--text-sm);
  font-family: var(--mono);
}

.enquiry__hint {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.6;
}

.enquiry__field input,
.enquiry__field textarea {
  width: 100%;
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--grid-line);
  background: var(--cream);
  font: inherit;
  color: var(--charcoal);
  resize: vertical;
}

.enquiry__field input:focus,
.enquiry__field textarea:focus {
  outline: none;
  border-color: var(--charcoal);
}

.enquiry__upload {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem 1rem;
  cursor: pointer;
}

.enquiry__upload-btn {
  display: inline-flex;
  align-items: center;
  padding: 0.55rem 0.85rem;
  border: 1px solid var(--grid-line);
  background: var(--cream);
  font-size: var(--text-sm);
  color: var(--charcoal);
  transition: border-color 0.2s ease, background 0.2s ease;
}

.enquiry__upload:hover .enquiry__upload-btn {
  border-color: var(--charcoal);
  background: var(--warm-white);
}

.enquiry__upload-note {
  font-size: var(--text-xs);
  color: var(--muted);
}

.enquiry__files {
  list-style: none;
  margin: 0.35rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.4rem;
}

.enquiry__file {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 0.65rem;
  align-items: center;
  padding: 0.45rem 0.55rem;
  border: 1px solid var(--grid-line);
  background: var(--cream);
  font-size: var(--text-sm);
}

.enquiry__file-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--charcoal);
}

.enquiry__file-size {
  color: var(--muted);
  font-size: var(--text-xs);
}

.enquiry__file-remove {
  font-size: 1.1rem;
  line-height: 1;
  color: var(--muted);
}

.enquiry__error {
  margin: 0;
  font-size: var(--text-sm);
  color: #a33;
}

.enquiry__send {
  width: 100%;
  min-height: 3.25rem;
  margin-top: 0.25rem;
  padding: 0.9rem 1.25rem;
  border: 0;
  border-radius: var(--ui-border-radius);
  background: var(--red);
  color: #fff;
  cursor: pointer;
}

.enquiry__send:hover:not(:disabled) {
  background: var(--red);
  color: #fff;
  filter: brightness(0.95);
}

.enquiry__send:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.enquiry__success {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0;
}

.enquiry__success-title {
  margin: 0;
  font-size: var(--text-xl);
}

.enquiry__success p {
  margin: 0;
  color: var(--muted);
}

@media (max-width: 767px) {
  .enquiry__body {
    grid-template-columns: 1fr;
  }

  .enquiry__preview {
    border-left: none;
    border-top: 1px solid var(--grid-line);
  }
}
</style>
