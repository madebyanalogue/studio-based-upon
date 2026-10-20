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
      aria-labelledby="enquiry-header-title"
      data-cursor="default"
    >
            <div
              class="enquiry__backdrop"
              data-lenis-prevent
              :data-cursor-label="formShown ? 'Close' : undefined"
              @click="formShown && close()"
            />

      <div class="enquiry__panel" data-cursor="default">
        <div class="enquiry__body">
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
                <div class="enquiry__frame">
                  <div class="enquiry__figure">
                    <span v-if="item.kind === 'image' && item.imageUrl" class="enquiry__hit">
                      <img
                        class="enquiry__image"
                        :src="item.imageUrl"
                        :alt="item.title"
                      />
                    </span>
                    <span
                      v-else-if="item.kind === 'colour' && item.colour"
                      class="enquiry__colour"
                      :style="{ background: item.colour }"
                    />
                    <span v-else-if="item.kind === 'text'" class="enquiry__text  interface">
                      {{ item.text || item.title }}
                    </span>
                    <AddButton
                      class="enquiry__remove"
                      variant="remove"
                      cursor="pointer"
                      :label="`Remove ${item.title}`"
                      @click.stop="removePreviewItem(item.id)"
                    />
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>

          <div class="enquiry__fields" data-lenis-prevent>
            <header class="enquiry__header" data-lenis-prevent>
              <h2 id="enquiry-header-title" class="enquiry__title">{{ headerTitle }}</h2>
              <button type="button" class="enquiry__close" aria-label="Close" @click="close">
                <span class="enquiry__close-icon" aria-hidden="true" />
              </button>
            </header>

            <div v-if="isSuccess" class="enquiry__success">
              <div class="enquiry__success-copy">
                <p class="enquiry__success-title">Thank you</p>
                <p>Your enquiry has been sent. We will be in touch shortly.</p>
              </div>
              <button type="button" class="btn btn--filled" @click="close">Close</button>
            </div>

            <form v-else class="enquire__form" novalidate @submit.prevent="onSubmit">
              <div class="enquire__fields">
                <label class="enquire__field">
                  <span class="enquire__label interface">
                    Name
                    <span v-if="missing.name" class="enquire__hint enquire__required">Required</span>
                  </span>
                  <input v-model="form.name" type="text" name="name" autocomplete="name" />
                </label>

                <label class="enquire__field">
                  <span class="enquire__label interface">Telephone</span>
                  <input v-model="form.telephone" type="tel" name="telephone" autocomplete="tel" />
                </label>

                <label class="enquire__field enquire__field--full">
                  <span class="enquire__label interface">
                    Email
                    <span v-if="missing.email" class="enquire__hint enquire__required">Required</span>
                  </span>
                  <input v-model="form.email" type="email" name="email" autocomplete="email" />
                </label>
              </div>

              <div class="enquire__message-block">
              <label class="enquire__field">
                <span class="enquire__label interface">Message</span>
                <textarea
                  v-model="form.message"
                  name="message"
                  rows="6"
                  placeholder="Tell us about your project…"
                />
              </label>

              <div class="enquire__field enquire__attach" :class="{ 'enquire__attach--open': attachmentsOpen }">
                <button type="button" class="enquire__attach-trigger enquire__attach-sizer" tabindex="-1" aria-hidden="true">
                  <span class="interface">Attachments</span>
                  <span class="enquire__attach-mark" aria-hidden="true" />
                </button>
                <div class="enquire__attach-sheet" :style="attachmentsLiftStyle">
                <button
                  type="button"
                  class="enquire__attach-trigger"
                  :aria-expanded="attachmentsOpen"
                  @click="toggleAttachments"
                >
                  <span class="interface">Attachments</span>
                  <span class="enquire__attach-mark" aria-hidden="true" />
                </button>
                <div class="enquire__attach-panel">
                  <div class="enquire__attach-panel-inner">
                    <div class="enquire__attach-body">
                      <label
                        class="enquire__drop"
                        :class="{ 'enquire__drop--over': dropActive }"
                        @dragenter.prevent="onDragEnter"
                        @dragover.prevent="onDragOver"
                        @dragleave.prevent="onDragLeave"
                        @drop.prevent="onDrop"
                      >
                        <input
                          ref="fileInput"
                          type="file"
                          class="sr-only"
                          multiple
                          accept="image/*,.pdf,.doc,.docx"
                          @change="onFilesSelected"
                        />
                        <span class="enquire__drop-title">Drop files here</span>
                        <span class="enquire__drop-note">or click to browse. Add several at once — images, PDF or Word, up to 10MB each.</span>
                      </label>
                      <ul v-if="attachments.length" class="enquire__files">
                        <li v-for="file in attachments" :key="file.id" class="enquire__file">
                          <span class="enquire__file-name">{{ file.name }}</span>
                          <span class="enquire__file-size">{{ formatSize(file.size) }}</span>
                          <button
                            type="button"
                            class="enquire__file-remove"
                            :aria-label="`Remove ${file.name}`"
                            @click="removeAttachment(file.id)"
                          >
                            ×
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                </div>
              </div>

              <div class="enquire__field enquire__attach" :class="{ 'enquire__attach--open': selectionsOpen }">
                <button type="button" class="enquire__attach-trigger enquire__attach-sizer" tabindex="-1" aria-hidden="true">
                  <span class="interface">Include selections</span>
                  <span class="enquire__attach-mark" aria-hidden="true" />
                </button>
                <div ref="selectionsSheetEl" class="enquire__attach-sheet">
                <button
                  type="button"
                  class="enquire__attach-trigger"
                  :aria-expanded="selectionsOpen"
                  @click="toggleSelections"
                >
                  <span class="interface">Include selections</span>
                  <span class="enquire__attach-mark" aria-hidden="true" />
                </button>
                <div class="enquire__attach-panel">
                  <div class="enquire__attach-panel-inner">
                    <div class="enquire__attach-body enquire__moodboards">
                      <p v-if="!selectableMoodboards.length" class="enquire__empty mono-copy">
                        You have no saved selections yet. Heart pieces across the site to build one.
                      </p>
                      <ul
                        v-else
                        class="enquire__board-list"
                        :class="{ 'enquire__board-list--single': selectableMoodboards.length === 1 }"
                      >
                        <li v-for="board in selectableMoodboards" :key="board.id">
                          <label class="enquire__board" :class="{ 'enquire__board--active': selectedIds.includes(board.id) }">
                            <input
                              type="checkbox"
                              class="sr-only"
                              :value="board.id"
                              :checked="selectedIds.includes(board.id)"
                              @change="toggleBoard(board.id)"
                            />
                            <span class="enquire__board-thumbs" aria-hidden="true">
                              <span
                                v-for="item in board.items.slice(0, 4)"
                                :key="item.id"
                                class="enquire__board-thumb"
                              >
                                <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.title" loading="lazy" />
                              </span>
                            </span>
                            <span class="enquire__board-meta">
                              <span class="enquire__board-name interface">{{ board.name }}</span>
                              <span class="enquire__board-count mono">{{ board.items.length }} {{ board.items.length === 1 ? 'item' : 'items' }}</span>
                            </span>
                            <span class="enquire__board-check" aria-hidden="true">{{ selectedIds.includes(board.id) ? '✓' : '' }}</span>
                          </label>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                </div>
              </div>
              </div>

              <p v-if="error" class="enquire__error" role="alert">{{ error }}</p>

              <div class="enquire__actions">
                <button type="submit" class="enquire__send" :disabled="isSubmitting">
                  {{ isSubmitting ? 'Sending…' : 'Send enquiry' }}
                </button>
              </div>
            </form>
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

const boxOf = (rect: DOMRect) => ({
  left: rect.left,
  top: rect.top,
  width: rect.width,
  height: rect.height,
})

const measureGrid = () => {
  const map = new Map<string, { left: number; top: number; width: number; height: number }>()
  for (const el of document.querySelectorAll<HTMLElement>('[data-enquiry-id]')) {
    const id = el.dataset.enquiryId || ''
    const rect = el.getBoundingClientRect()
    if (!id || rect.width < 2 || rect.height < 2) continue
    map.set(id, boxOf(rect))
  }
  return map
}

/** Picture box inside the cell pad — the disperse flight lands here. */
const measureGridContent = () => {
  const map = new Map<string, { left: number; top: number; width: number; height: number }>()
  for (const el of document.querySelectorAll<HTMLElement>('[data-enquiry-id]')) {
    const id = el.dataset.enquiryId || ''
    const inner = el.querySelector<HTMLElement>('.enquiry__figure')
      ?? (el.firstElementChild instanceof HTMLElement ? el.firstElementChild : el)
    const rect = inner.getBoundingClientRect()
    if (!id || rect.width < 2 || rect.height < 2) continue
    map.set(id, boxOf(rect))
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
    // Hold the preview clip for the whole cluster. Flyers sit on a fixed layer,
    // so they would paint outside the column until they are one pile.
    clipFlyersToPreview()
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
  await tweenEnquiryFlyers(boxesFor(ids, measureGridContent()), SPREAD_S)
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
    attempted.value = false
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
      attempted.value = false
    }
  }
}

const previewRef = ref<HTMLElement | null>(null)
const previewScrollRef = ref<HTMLElement | null>(null)
let previewLenis: Lenis | null = null

const destroyPreviewLenis = () => {
  previewLenis?.destroy()
  previewLenis = null
}

const initPreviewLenis = () => {
  if (!import.meta.client) return
  const wrapper = previewRef.value
  const content = previewScrollRef.value
  if (!wrapper || !content) return
  destroyPreviewLenis()
  wrapper.scrollTop = 0
  previewLenis = new Lenis({
    wrapper,
    content,
    eventsTarget: wrapper,
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
    autoRaf: true,
    naiveDimensions: true,
  })
  previewLenis.resize()
}

const syncPreviewLenis = () => {
  if (!previewLenis) initPreviewLenis()
  previewLenis?.start()
  previewLenis?.resize()
}

watch(isSuccess, (success) => {
  if (success) destroyPreviewLenis()
})

watch(previewClipped, (clipped) => {
  if (!previewLenis) return
  if (clipped) previewLenis.stop()
  else syncPreviewLenis()
})

watch(previewItems, () => {
  if (!isOpen.value || previewClipped.value) return
  syncPreviewLenis()
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
    syncPreviewLenis()
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
  if (id === runId) syncPreviewLenis()
}, { flush: 'sync' })

const { moodboards, activeMoodboard, removeItem } = useBucket()

const headerTitle = computed(() => {
  if (source.value === 'product') {
    return previewItems.value[0]?.title?.trim() || 'Enquire'
  }
  return activeMoodboard.value?.name?.trim() || 'My Selection'
})

const removePreviewItem = (id: string) => {
  previewItems.value = previewItems.value.filter((item) => item.id !== id)
  if (source.value === 'bucket' && !id.startsWith('wash-')) removeItem(id)
}
const selectableMoodboards = computed(() => moodboards.value.filter((board) => board.items.length))
const selectedIds = ref<string[]>([])
const attempted = ref(false)
const missing = computed(() => ({
  name: attempted.value && !form.value.name.trim(),
  email: attempted.value && !form.value.email.trim(),
}))

const toggleBoard = (id: string) => {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((value) => value !== id)
    : [...selectedIds.value, id]
}

const attachmentsOpen = ref(false)
const selectionsOpen = ref(false)
const dropActive = ref(false)
let dragDepth = 0

const toggleAttachments = () => {
  attachmentsOpen.value = !attachmentsOpen.value
  if (attachmentsOpen.value) selectionsOpen.value = false
}

const toggleSelections = () => {
  selectionsOpen.value = !selectionsOpen.value
  if (selectionsOpen.value) attachmentsOpen.value = false
}

const selectionsSheetEl = ref<HTMLElement | null>(null)
const attachmentsLift = ref(0)
const attachmentsLiftStyle = computed(() =>
  attachmentsLift.value ? { transform: `translateY(${attachmentsLift.value}px)` } : undefined,
)

const syncSelectionsLift = () => {
  const sheet = selectionsSheetEl.value
  const row = sheet?.parentElement
  if (!sheet || !row) {
    attachmentsLift.value = 0
    return
  }
  attachmentsLift.value = Math.min(0, row.offsetHeight - sheet.offsetHeight)
}

watch(selectionsSheetEl, (sheet, _, onCleanup) => {
  if (!sheet) return
  const observer = new ResizeObserver(() => syncSelectionsLift())
  observer.observe(sheet)
  onCleanup(() => observer.disconnect())
})

const onDragEnter = () => {
  dragDepth += 1
  dropActive.value = true
}

const onDragOver = () => {
  dropActive.value = true
}

const onDragLeave = () => {
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) dropActive.value = false
}

const onDrop = (event: DragEvent) => {
  dragDepth = 0
  dropActive.value = false
  const files = event.dataTransfer?.files
  if (files?.length) addAttachments(files)
}

const onSubmit = () => {
  attempted.value = true
  if (!form.value.name.trim() || !form.value.email.trim()) return
  const selectedBoards = moodboards.value.filter((board) => selectedIds.value.includes(board.id))
  submit({
    moodboards: selectedBoards.map((board) => ({
      id: board.id,
      name: board.name,
      items: board.items.map((item) => ({
        id: item.id,
        title: item.title,
        imageUrl: item.imageUrl,
        itemType: item.itemType,
      })),
    })),
  })
}

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
}

.enquiry__panel {
  position: relative;
  width: min(1350px, 100%);
  max-height: min(90dvh, var(--enquire-form-height));
  overflow: visible;
  display: flex;
  flex-direction: column;
  background: #fff;
  color: #111;
  --charcoal: #111;
  --text-color: #111;
  --muted: rgba(17, 17, 17, 0.55);
  --cream: #fff;
  --warm-white: #fff;
  --grid-line: #bbb;
  --enquire-border-style: 1px dotted var(--grid-line);
  --enquire-pad: 35px;
  --enquire-copy: 14px;
  --enquire-title-pad: 20px;
  --enquire-field-pad: 22px;
  --enquire-form-height: 930px;
  border: 0;
}

.enquiry__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  position: relative;
  z-index: 3;
  flex: none;
  width: 100%;
  margin: 0;
  padding: var(--enquire-pad);
  border-bottom: var(--enquire-border-style);
  background: #fff;
  box-sizing: border-box;
}

.enquiry__title {
  margin: 0;
  min-width: 0;
  padding: 0;
  font-family: var(--mono);
  font-size: 25px;
  font-weight: 400;
  line-height: 0.85;
  color: #111;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.enquiry__subtitle {
  margin: 0.35rem 0 0;
  font-size: var(--text-sm);
  color: var(--muted);
}

.enquiry__close {
  flex: none;
  width: 25px;
  height: 25px;
  display: grid;
  place-items: center;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: #111;
  box-sizing: border-box;
  cursor: pointer;
}

.enquiry__close:hover {
  color: var(--accent, var(--charcoal));
}

.enquiry__close-icon {
  position: relative;
  display: block;
  width: 20px;
  height: 20px;
  opacity: 0.6;
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
  grid-template-columns: 1fr 820px;
  gap: 0;
  grid-template-rows: minmax(0, 1fr);
  min-height: 0;
  height: min(var(--enquire-form-height), 90dvh);
  max-height: var(--enquire-form-height);
  overflow: visible;
  flex: 1;
}

.enquiry__preview {
  grid-column: 1;
  align-self: stretch;
  min-height: 0;
  height: 100%;
  max-height: 100%;
  padding: 0;
  background: #222;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

/* .lenis-stopped sets overflow:clip, which swallows the wheel. */
.enquiry__preview.lenis-stopped:not(.enquiry__preview--pile) {
  overflow-x: hidden !important;
  overflow-y: auto !important;
}

.enquiry__fields {
  grid-column: 2;
}

.enquiry__preview-scroll {
  min-height: 100%;
}

.enquiry__preview::-webkit-scrollbar {
  display: none;
}

.enquiry__preview--pile {
  overflow: hidden !important;
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
  --bucket-thumb-width: 50%;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--bucket-thumb-width), 1fr));
  gap: 0;
  align-items: start;
  width: 100%;
}

.enquiry__grid-item {
  position: relative;
  min-width: 0;
  aspect-ratio: 1;
  box-sizing: border-box;
  border-right: 1px solid transparent;
  border-bottom: 1px solid transparent;
  transition: border-color 0.45s ease;
}

.enquiry__frame {
  position: absolute;
  inset: 12%;
  display: grid;
  place-items: center;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  box-sizing: border-box;
  container-type: size;
}

/* Shrink-wraps to the contained image so the minus sits on the picture, not the square. */
.enquiry__figure {
  position: relative;
  max-width: 100%;
  max-height: 100%;
  width: fit-content;
  height: fit-content;
  line-height: 0;
}

.enquiry__grid-item--swatch .enquiry__figure {
  width: 100%;
  height: 100%;
}

.enquiry__hit {
  display: block;
  max-width: 100%;
  max-height: 100%;
  line-height: 0;
}

.enquiry__image {
  display: block;
  width: auto;
  height: auto;
  max-width: 100cqi;
  max-height: 100cqb;
  object-fit: contain;
  pointer-events: none;
}

.enquiry__remove {
  position: absolute;
  z-index: 2;
  top: var(--thumb-ctrl-inset, 4px);
  left: var(--thumb-ctrl-inset, 4px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.enquiry__grid-item:hover .enquiry__remove {
  opacity: 1;
  pointer-events: auto;
}

.enquiry--fly-cover .enquiry__remove {
  opacity: 0;
  pointer-events: none;
}

.enquiry__grid--lines .enquiry__grid-item {
  border-right-color: #111;
  border-bottom-color: #111;
}

.enquire__field textarea {
  height: calc(1.5 * (11lh + 1.5rem + 2px));
  min-height: calc(1.5 * (11lh + 1.5rem + 2px));
  max-height: calc(1.5 * (11lh + 1.5rem + 2px));
}

.enquiry__grid:not(.enquiry__grid--lines) .enquiry__grid-item {
  transition-duration: 0.2s;
}

.enquiry__grid-item--swatch {
  aspect-ratio: 1;
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
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 0;
  padding: 0;
  overflow: visible;
  background: #fff;
}

.enquiry__fields .enquire__form,
.enquiry__fields .enquiry__success {
  flex: 1;
  min-height: 0;
  max-height: 100%;
  overflow: auto;
  font-family: var(--mono);
}

.enquiry__fields .enquire__form {
  padding: 0;
}

.enquiry__success {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: var(--enquire-pad);
}

.enquiry__success-copy {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  width: 100%;
  max-width: 360px;
  align-self: center;
  line-height: 1.6;
  text-align: center;
}

.enquiry__success-title {
  margin: 0;
  font-size: var(--text-xl);
}

.enquiry__success p {
  margin: 0;
  color: var(--muted);
}

.enquiry__success .btn {
  width: 100%;
  margin-top: auto;
  font-family: var(--mono);
}

.enquiry__success .btn.btn--filled:hover {
  background: color-mix(in srgb, var(--charcoal) 88%, white);
  border-color: color-mix(in srgb, var(--charcoal) 88%, white);
  color: var(--warm-white);
}

@media (max-width: 767px) {
  .enquiry__body {
    grid-template-columns: 1fr;
  }

  .enquiry__preview,
  .enquiry__fields {
    grid-column: auto;
    min-height: 0;
  }
}
</style>
