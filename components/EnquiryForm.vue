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
      data-lenis-prevent
    >
            <div class="enquiry__backdrop" @click="formShown && close()" />

      <div class="enquiry__panel">
        <header class="enquiry__header">
          <div>
            <h2 class="enquiry__title  interface">Send enquiry</h2>
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
          <button type="button" class="enquiry__close" aria-label="Close" @click="close">×</button>
        </header>

        <div v-if="isSuccess" class="enquiry__success">
          <p class="enquiry__success-title  interface">Thank you</p>
          <p>Your enquiry has been sent. We will be in touch shortly.</p>
          <button type="button" class="btn btn--filled" @click="close">Close</button>
        </div>

        <form v-else class="enquiry__body" @submit.prevent="submit">
          <div class="enquiry__preview">
            <figure v-if="compositionImage" class="enquiry__composition">
              <img :src="compositionImage" alt="Moodboard composition" />
              <figcaption>Board preview</figcaption>
            </figure>

            <div v-if="previewItems.length" class="enquiry__grid">
              <div
                v-for="item in previewItems"
                :key="item.id"
                class="enquiry__grid-item"
                :class="{ 'enquiry__grid-item--swatch': item.kind !== 'image' }"
                :data-enquiry-id="item.id"
                :title="item.title"
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

          <div class="enquiry__fields">
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
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import gsap from 'gsap'
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

const formShown = ref(true)
const gridCover = ref(false)
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
    await tweenEnquiryFlyers(pileBoxes(sources, size), SPREAD_S)
    if (id !== runId) return
  }

  if (formShown.value || phase === 'covered' || leavingGrid) {
    // Leaving the grid: keep the pile in front so it stays visible while the
    // form fades. Still behind the form (covered): fade the form off the pile.
    if (!leavingGrid) setEnquiryFlyFront(false)
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
    getEnquiryFlyBridge()?.setParked(false)
    phase = 'idle'
    return
  }

  const grid = measureGrid()
  const sample = grid.values().next().value
  const size = sample?.width || 120
  const ids = origins.map((origin) => origin.id)

  await tweenEnquiryFlyers(pileBoxes(origins, size), GATHER_S)
  if (id !== runId) return

  phase = 'covered'
  formShown.value = true
  await wait(FORM_FADE_MS)
  if (id !== runId) return

  phase = 'spread'
  setEnquiryFlyFront(true)
  await tweenEnquiryFlyers(boxesFor(ids, measureGrid()), SPREAD_S)
  if (id !== runId) return

  gridCover.value = false
  await nextTick()
  await frames(1)
  if (id !== runId) return
  showFlyers(false)
  setEnquiryFlyFront(false)
  phase = 'settled'
}

const close = async () => {
  if (!isOpen.value || closing.value) return
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
      phase = 'idle'
      gridCover.value = false
      closing.value = false
      closeEnquiry()
      formShown.value = true
    }
  }
}

watch(isOpen, async (open) => {
  if (!import.meta.client || !open) return
  const origins = flyOrigins.value
  if (!origins?.length) {
    formShown.value = true
    gridCover.value = false
    phase = 'idle'
    return
  }
  const id = ++runId
  formShown.value = false
  gridCover.value = true
  phase = 'gather'
  await nextTick()
  if (id !== runId) return
  await gatherIntoGrid(id, origins)
})

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
  width: min(920px, 100%);
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
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--grid-line);
}

.enquiry__title {
  margin: 0;
  font-size: var(--text-xl);
}

.enquiry__subtitle {
  margin: 0.35rem 0 0;
  font-size: var(--text-sm);
  color: var(--muted);
}

.enquiry__close {
  font-size: 1.75rem;
  line-height: 1;
  color: var(--muted);
}

.enquiry__body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  overflow: auto;
  flex: 1;
}

.enquiry__preview {
  padding: 1.5rem;
  border-right: 1px solid var(--grid-line);
  background: var(--cream);
  overflow: auto;
}

.enquiry__composition {
  margin: 0 0 1rem;
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
  --bucket-thumb-width: 120px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--bucket-thumb-width), 1fr));
  gap: 20px;
  align-items: start;
}

.enquiry__grid-item {
  min-width: 0;
}

.enquiry__grid-item--swatch {
  aspect-ratio: 1;
}

.enquiry__grid-item img {
  display: block;
  width: 100%;
  height: auto;
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
  padding: 1.5rem;
  overflow: auto;
}

.enquiry__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.enquiry__label {
  font-size: var(--text-sm);
  color: var(--muted);
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
  padding: 2.5rem 1.5rem;
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
    border-right: none;
    border-bottom: 1px solid var(--grid-line);
  }
}
</style>
