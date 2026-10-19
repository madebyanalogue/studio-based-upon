<template>
  <article class="enquire" :class="{ 'enquire--open': sheetIn, 'enquire--intro': introOpen }" data-lenis-prevent>
    <button
      type="button"
      class="enquire__overlay"
      aria-label="Close enquire"
      @click="closeSheet"
    />
    <div class="enquire__columns">
    <aside v-if="introOpen" class="enquire__clients">
      <div class="enquire__clients-body">
        <div class="enquire__clients-head">
          <p class="interface muted">Working with clients</p>
          <button type="button" class="enquire__clients-x" aria-label="Close introduction" @click="introOpen = false">
            <span class="enquire__close-icon" aria-hidden="true" />
          </button>
        </div>
        <div class="enquire__clients-copy flex flex-col gap-2">
          <p class="mono-copy">
            You are a critical part of the process. We collaborate with designers
            and architects to realise work for private residences, yachts, hotels,
            restaurants and fashion houses.
          </p>
          <p class="mono-copy">
            Share a selection, a drawing, or a few words about the project. We will be
            in touch to talk through material, scale and how the work is made.
          </p>
        </div>
      </div>
      <img
        class="enquire__clients-image"
        src="https://cdn.sanity.io/images/k8gpyc57/production/ceb3a72ee6af212efbbd181ca2500edf59cc38fe-2250x3000.jpg?auto=format&w=920"
        alt="Untitled 28"
        width="2250"
        height="3000"
      />
      <div class="enquire__contact">
        <a class="enquire__contact-email interface" :href="`mailto:${enquiryEmail}`">
          <span class="enquire__aside-bracket">[</span>{{ enquiryEmail }}<span class="enquire__aside-bracket">]</span>
        </a>
        <div class="enquire__contact-social">
          <a
            class="enquire__contact-link interface"
            href="https://www.instagram.com/studiobasedupon"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ig
          </a>
          <a
            class="enquire__contact-link interface"
            href="https://www.pinterest.com/Studio_Based_Upon/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Pi
          </a>
        </div>
      </div>
    </aside>
    <div
      class="enquire__stage"
      :class="{ 'enquire__stage--in': stageVisible }"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enquire-sheet-title"
      data-lenis-prevent
      :inert="!stageVisible"
    >
      <div class="enquire__sheet-head">
        <h1 id="enquire-sheet-title" class="enquire__sheet-title">Enquire</h1>
        <button type="button" class="enquire__close" aria-label="Close enquire" @click="closeSheet">
          <span class="enquire__close-icon" aria-hidden="true" />
        </button>
      </div>
      <div class="enquire__copy">
      <header class="enquire__heading">
        <svg class="enquire__title-filter" viewBox="0 0 0 0" aria-hidden="true" focusable="false">
          <defs>
            <filter
              :id="titleFilterId"
              x="-40%"
              y="-40%"
              width="180%"
              height="180%"
              color-interpolation-filters="sRGB"
            >
              <feColorMatrix
                in="SourceGraphic"
                type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140"
              />
            </filter>
          </defs>
        </svg>
        <h1
          ref="titleEl"
          class="h1 enquire__title"
          :class="{ 'enquire__title--pending': !titlePaintReady }"
          :style="{ filter: titleBaseFilter, WebkitFilter: titleBaseFilter }"
        >
          {{ page?.heroTitle || 'Enquire' }}
        </h1>
      </header>

      <aside class="enquire__aside">
        <div class="enquire__aside-block flex flex-col gap-2">
          <h2 class="h6 muted">Contact</h2>
          <p class="mono-copy enquire__aside-line">
            Telephone <a :href="`tel:${phoneTel}`"><span class="enquire__aside-bracket">[</span>{{ phone }}<span class="enquire__aside-bracket">]</span></a>
          </p>
          <p class="mono-copy enquire__aside-line">
            Email <a :href="`mailto:${enquiryEmail}`"><span class="enquire__aside-bracket">[</span>{{ enquiryEmail }}<span class="enquire__aside-bracket">]</span></a>
          </p>
          <p v-if="studioAddress" class="mono-copy enquire__aside-line">
            Address <span class="enquire__aside-bracket">[</span>{{ studioAddress }}<span class="enquire__aside-bracket">]</span>
          </p>
        </div>
      </aside>
      </div>

      <div class="enquire__half">
      <div class="enquire__panel">

    <div v-if="isSuccess" class="enquire__success">
      <p class="enquire__success-title h6 muted">Thank you</p>
      <p class="mono-copy">Your enquiry has been sent. We will be in touch shortly.</p>
      <button type="button" class="enquire__send" @click="resetForm">Send another enquiry</button>
    </div>

    <form v-else class="enquire__form" novalidate @submit.prevent="submit">
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
                      <span class="enquire__board-name  interface">{{ board.name }}</span>
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
  </article>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'

const route = useRoute()
const { close: closeEnquireSheet, draft, selectedIds, attachments, isSuccess, clearDraft } = useEnquireSheet()

/** Match the materials & forms / typology title melt. */
const TITLE_BLUR_MAX = 75
const TITLE_GOOEY_IN_DUR = 2.6
/** Start the form while the title is still melting in. */
const STAGE_REVEAL_AT = 0.42

const { enquiryEmail, phone, phoneTel, addressDisplay } = useSiteSettings()
const { moodboards } = useBucket()

const query = `*[_type == "contactPage"][0] {
  seoTitle,
  heroTitle,
  heroSubtitle,
  address,
  body
}`

const { data: page } = await useAsyncData('contactPage', () =>
  $fetch('/api/sanity/query', { method: 'POST', body: { query } })
    .then((r: { result?: unknown }) => r?.result ?? null)
    .catch(() => null),
)

const selectableMoodboards = computed(() => moodboards.value.filter((b) => b.items.length))

const studioAddress = computed(() => {
  const fromPage = typeof page.value?.address === 'string' ? page.value.address.trim() : ''
  return fromPage || addressDisplay.value
})

const form = draft.value

const isSubmitting = ref(false)
const error = ref<string | null>(null)

const MAX_FILES = 8
const MAX_FILE_BYTES = 10 * 1024 * 1024

const toggleBoard = (id: string) => {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((v) => v !== id)
    : [...selectedIds.value, id]
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      resolve(result.includes(',') ? result.split(',')[1] : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

const addFiles = (files: File[]) => {
  const next = [...attachments.value]
  for (const file of files) {
    if (next.length >= MAX_FILES) {
      error.value = `You can attach up to ${MAX_FILES} files.`
      break
    }
    if (file.size > MAX_FILE_BYTES) {
      error.value = `"${file.name}" is larger than 10MB.`
      continue
    }
    const duplicate = next.some((item) => item.name === file.name && item.size === file.size)
    if (duplicate) continue
    next.push({
      id: `file-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
    })
  }
  attachments.value = next
}

const onFilesSelected = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  addFiles(Array.from(input.files))
  input.value = ''
}

const dropActive = ref(false)
let dragDepth = 0

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
  if (!files?.length) return
  addFiles(Array.from(files))
}

const removeAttachment = (id: string) => {
  attachments.value = attachments.value.filter((item) => item.id !== id)
}

const resetForm = () => {
  clearDraft()
  error.value = null
  attempted.value = false
}

const attempted = ref(false)
const missing = computed(() => ({
  name: attempted.value && !form.name.trim(),
  email: attempted.value && !form.email.trim(),
}))

const submit = async () => {
  attempted.value = true
  if (!form.name.trim() || !form.email.trim()) return

  isSubmitting.value = true
  error.value = null

  const selectedBoards = moodboards.value.filter((b) => selectedIds.value.includes(b.id))

  try {
    const files = await Promise.all(
      attachments.value.map(async (item) => ({
        name: item.name,
        type: item.type,
        size: item.size,
        data: await fileToBase64(item.file),
      })),
    )

    await $fetch('/api/enquiry', {
      method: 'POST',
      body: {
        ...form,
        source: 'enquire-page',
        files,
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
        items: selectedBoards.flatMap((board) =>
          board.items.map((item) => ({
            id: item.id,
            title: item.title,
            kind: 'image',
            imageUrl: item.imageUrl,
          })),
        ),
      },
    })
    isSuccess.value = true
    attachments.value = []
  } catch {
    error.value = 'Something went wrong. Please try again or email us directly.'
  } finally {
    isSubmitting.value = false
  }
}

const titleEl = ref<HTMLElement | null>(null)
const titlePaintReady = ref(false)
const stageVisible = ref(false)
const sheetIn = ref(false)
const introOpen = ref(true)
const attachmentsOpen = ref(false)
const selectionsOpen = ref(false)

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

const COLUMN_MS = 1150

let closeTimer = 0

const closeSheet = () => {
  if (!sheetIn.value) return
  sheetIn.value = false
  window.clearTimeout(closeTimer)
  const wait = prefersReducedMotion() ? 0 : COLUMN_MS
  closeTimer = window.setTimeout(() => {
    closeEnquireSheet()
  }, wait)
}
const titleFilterId = `enquire-title-goo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
const titleBaseFilter = `url(#${titleFilterId}) blur(0.25px)`

let titleSplit: InstanceType<typeof SplitText> | null = null
let titleTween: gsap.core.Tween | null = null
let titleGen = 0

const prefersReducedMotion = () =>
  import.meta.client &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const titleWords = () =>
  titleEl.value?.querySelectorAll('.enquire__title-word') ?? []

const power3Out = (t: number) => 1 - Math.pow(1 - t, 3)

const revealStage = () => {
  stageVisible.value = true
}

const playTitleGooeyIn = async () => {
  const gen = ++titleGen
  if (!import.meta.client || !titleEl.value) {
    titlePaintReady.value = true
    revealStage()
    return
  }

  gsap.registerPlugin(SplitText)

  try {
    await document.fonts?.ready
  } catch {
    /* ignore */
  }

  await nextTick()
  if (gen !== titleGen || !titleEl.value) return

  if (prefersReducedMotion()) {
    titlePaintReady.value = true
    revealStage()
    return
  }

  titleSplit?.revert()
  titleSplit = new SplitText(titleEl.value, {
    type: 'words',
    wordsClass: 'enquire__title-word',
  })

  const words = Array.from(titleWords())
  const target = words.length ? words : titleEl.value
  const applyIn = (t: number) => {
    const progress = power3Out(t)
    gsap.set(target, {
      filter: `blur(${TITLE_BLUR_MAX * (1 - progress)}px)`,
      opacity: progress,
    })
  }

  applyIn(0)
  titlePaintReady.value = true
  await nextTick()
  if (gen !== titleGen || !titleEl.value) return

  await new Promise<void>((resolve) => {
    const clock = { t: 0 }
    let stageArmed = false
    titleTween = gsap.to(clock, {
      t: 1,
      duration: TITLE_GOOEY_IN_DUR,
      ease: 'none',
      onUpdate: () => {
        if (gen !== titleGen) return
        applyIn(clock.t)
        if (!stageArmed && clock.t >= STAGE_REVEAL_AT) {
          stageArmed = true
          revealStage()
        }
      },
      onComplete: () => resolve(),
    })
  })

  if (gen !== titleGen) return
  revealStage()
}

onMounted(() => {
  document.documentElement.classList.add('enquire-open')
  const lenis = useNuxtApp().$lenis as { stop?: () => void } | undefined
  lenis?.stop?.()
  void playTitleGooeyIn()
  requestAnimationFrame(() => {
    sheetIn.value = true
  })
})

onUnmounted(() => {
  document.documentElement.classList.remove('enquire-open')
  const lenis = useNuxtApp().$lenis as { start?: () => void } | undefined
  lenis?.start?.()
  window.clearTimeout(closeTimer)
  titleGen += 1
  titleTween?.kill()
  titleSplit?.revert()
  titleSplit = null
})

useHead(() => {
  if (route.path !== '/enquire') return {}
  return {
    title: page.value?.seoTitle || 'Enquire — Studio Based Upon',
  }
})
</script>

<style scoped>
.enquire {
  position: fixed;
  inset: 0;
  z-index: 470;
  max-width: none;
  pointer-events: none;
  --grid-line: rgba(0, 0, 0, 0.15);
  --enquire-inset: 15px;
}

:global(html.enquire-open),
:global(html.enquire-open body) {
  overflow: hidden;
}

.enquire__overlay {
  position: absolute;
  inset: 0;
  z-index: 0;
  margin: 0;
  padding: 0;
  border: 0;
  background: rgba(0, 0, 0, 0.46);
  opacity: 0;
  pointer-events: auto;
  cursor: pointer;
  transition: opacity 1.1s ease;
}

.enquire--open .enquire__overlay {
  opacity: 1;
  transition: opacity 0.45s ease;
}

.enquire__sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 2;
  margin: 0;
  padding: var(--enquire-pad);
  border-bottom: var(--enquire-border-style);
  background: white;
}

.enquire__close {
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

.enquire__close:hover {
  color: var(--accent, #111);
  border-color: currentColor;
}

.enquire__close-icon {
  position: relative;
  display: block;
  width: 20px;
  height: 20px;
}

.enquire__close-icon::before,
.enquire__close-icon::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 1px;
  background: currentColor;
}

.enquire__close-icon::before {
  transform: translate(-50%, -50%) rotate(45deg);
}

.enquire__close-icon::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}

.enquire__sheet-title {
  margin: 0;
  padding: 0;
  font-family: var(--mono);
  font-size: 25px;
  font-weight: 400;
  line-height: 0.85;
  color: #111;
}

.enquire__title-filter {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}

.enquire__title {
  width: max-content;
  max-width: 100%;
  pointer-events: none;
  will-change: filter, opacity;
}

.enquire__title--pending {
  visibility: hidden !important;
  opacity: 0 !important;
}

.enquire__title :deep(.enquire__title-word) {
  display: inline-block;
  will-change: filter, opacity;
}

.enquire__columns {
  position: absolute;
  top: var(--enquire-inset);
  right: var(--enquire-inset);
  bottom: var(--enquire-inset);
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: min(840px, calc(100% - calc(2 * var(--enquire-inset))));
  pointer-events: none;
  transition: none;
}

.enquire--intro .enquire__columns {
  width: min(840px, calc(100% - 501px));
}

.enquire__stage {
  position: relative;
  z-index: 1;
  
  display: flex;
    flex-direction: column;
  flex: 1;
  width: 100%;
  min-height: 0;
  max-width: none;
  max-height: calc(100dvh - calc(2 * var(--enquire-inset)));
  overflow: auto;
  overscroll-behavior: contain;
  border-radius: 0px;
  box-sizing: border-box;
  --enquire-pad: 35px;
  --enquire-copy: 14px;
  --enquire-title-pad: 25px;
  --enquire-field-pad: 18px;
  --grid-line: #bbb;
  --enquire-border-style: 1px dotted var(--grid-line);
  background: #fff;
  color: #111;
  --charcoal: #111;
  --text-color: #111;
  --black: #111;
  --cream: #fff;
  --warm-white: #f7f5f0;
  --background-color: #fff;
  --muted: rgba(17, 17, 17, 0.55);
  text-align: left;
  pointer-events: auto;
  transform: translateX(calc(100vw + 20px));
  transition: transform 1s cubic-bezier(0.22, 1, 0.36, 1) 0.12s;
}

.enquire--open .enquire__stage {
  transform: none;
  transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}

.enquire__heading {
  display: none;
}

.enquire__copy {
  display: contents;
}

.enquire__heading {
  grid-area: heading;
  position: relative;
  min-width: 0;
  text-align: left;
}

.enquire__heading .enquire__title {
  width: max-content;
  max-width: 100%;
  font-size: clamp(2.75rem, 4.8vw, 5.25rem);
  transform: none;
}

.enquire__aside {
  display: none;
  grid-area: aside;
  flex-direction: column;
  gap: 110px;
  justify-self: start;
  max-width: 320px;
  min-width: 0;
  text-align: left;
}

.enquire__aside-block,
.enquire__panel {
  opacity: 0;
  transition: opacity 0.7s ease;
}

.enquire__stage--in .enquire__aside-block,
.enquire__stage--in .enquire__panel {
  opacity: 1;
}

.enquire__aside .mono-copy,
.enquire__intro.mono-copy,
.enquire__empty.mono-copy,
.enquire__success .mono-copy {
  min-width: 0;
}

.enquire .mono-copy,
.enquire .mono-copy p {
  margin: 0;
}

.enquire__aside-line a {
  color: currentColor;
  text-decoration: none;
}

.enquire__aside-bracket {
  color: var(--muted);
}

.enquire__half {
  display: flex;
  flex-direction: column;
  gap: 40px;
  width: 100%;
  max-width: none;
  min-width: 0;
  padding: 0;
  border: 0;
  flex: 1;
}

.enquire__panel {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  max-width: none;
  min-width: 0;
  border: 0;
  padding: 0;
  background: transparent;
  text-align: left;
  flex: 1;
}

.enquire__clients {
  position: absolute;
  top: 0;
  bottom: 0;
  right: calc(100% + 1px);
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 50px;
  width: 460px;
  box-sizing: border-box;
  padding: 0;
  background: white;
  color: #111;
  --charcoal: #111;
  --text-color: #111;
  --muted: rgba(17, 17, 17, 0.55);
  --enquire-copy: 14px;
  overflow: auto;
  pointer-events: auto;
  transform: translateX(calc(100vw + 20px));
  transition: transform 1s cubic-bezier(0.22, 1, 0.36, 1);
}

.enquire--open .enquire__clients {
  transform: none;
  transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.1s;
}

.enquire__clients-body {
  padding: 50px 50px 0;
}

.enquire__clients-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 30px;
}

.enquire__clients-head > .interface {
  margin: 0;
}

.enquire__clients-x {
  flex: none;
  display: grid;
  place-items: center;
  width: 11px;
  height: 11px;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}

.enquire__clients-x .enquire__close-icon {
  width: 11px;
  height: 11px;
}

.enquire__clients-copy {
  font-size: var(--enquire-copy);
  padding-right: 20px;
}

.enquire__clients-copy .mono-copy {
  font-size: var(--enquire-copy);
  min-width: unset;
}

.enquire__clients-image {
  display: block;
  width: 100%;
  height: auto;
  margin: 0;
}

.enquire__clients .enquire__contact {
  position: absolute;
  bottom: 0;
  width: 100%;
  box-sizing: border-box;
  padding: 20px 35px;
  background: white;
}

.enquire__form {
  display: flex;
  flex-direction: column;
  gap: 0;
  flex:1;
}

.enquire__fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}

.enquire__fields > .enquire__field:not(.enquire__field--full) {
  border-right: var(--enquire-border-style);
}

.enquire__fields > .enquire__field:nth-child(2n) {
  border-right: 0;
}

.enquire__field--full {
  grid-column: span 2;
}

.enquire__field {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-bottom: var(--enquire-border-style);
}

.enquire__field:nth-child(4),
.enquire__field--full {
  grid-column: 1 / -1;
}

.enquire__label {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin: 0;
  padding: var(--enquire-title-pad) var(--enquire-pad) calc(var(--enquire-title-pad) * 0.5);

}

.enquire__hint {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.6;
}

.enquire__required {
  color: var(--red);
  opacity: 1;
}

.enquire__field input,
.enquire__field textarea {
  width: 100%;
  margin: 0;
  padding: var(--enquire-field-pad) var(--enquire-pad);
  border: 0;
  border-radius: 0;
  background: transparent;
  font-family: var(--mono);
  font-size: var(--enquire-copy);
  color: var(--charcoal);
  resize: vertical;
}

.enquire__field textarea {
  flex: 1 1 auto;
  height: auto;
  min-height: calc(1.5 * (15lh + 1.5rem + 2px));
  max-height: none;
  overflow: auto;
  resize: none;
}

.enquire__attach-trigger {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  margin: 0;
  padding: var(--enquire-title-pad) var(--enquire-pad);
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.enquire__attach-mark {
  position: relative;
  flex: none;
  width: 10px;
  height: 10px;
  margin-bottom: 0.15em;
}

.enquire__attach-mark::before,
.enquire__attach-mark::after {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  width: 10px;
  height: 1px;
  background: currentColor;
}

.enquire__attach-mark::after {
  transform: rotate(90deg);
  transition: transform 0.25s ease;
}

.enquire__attach--open .enquire__attach-mark::after {
  transform: rotate(0deg);
}

.enquire__message-block {
  position: relative;
  flex: 1;

  display: flex;
    flex-direction: column;
}

.enquire__attach {
  position: relative;
}

.enquire__attach--open {
  z-index: 4;
}

.enquire__attach-sizer {
  visibility: hidden;
  pointer-events: none;
}

.enquire__attach-sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  max-height: calc(1.5 * (15lh + 1.5rem + 2px) + var(--enquire-title-pad) * 1.5 + 1.25rem);
}

.enquire__message-block > .enquire__field:not(.enquire__attach) {
  border-bottom: 0;
  flex: 1;
}

.enquire__message-block > .enquire__attach:first-of-type {
  border-bottom: 0;
}

.enquire__message-block > .enquire__attach:first-of-type .enquire__attach-sheet {
  border-top: var(--enquire-border-style);
}

.enquire__message-block > .enquire__attach:first-of-type.enquire__attach--open .enquire__attach-sheet {
  border-bottom: var(--enquire-border-style);
}

.enquire__attach--open + .enquire__attach .enquire__attach-sheet {
  border-top: 0;
}

.enquire__message-block > .enquire__attach + .enquire__attach .enquire__attach-sheet {
  border-top: var(--enquire-border-style);
}

.enquire__attach-panel {
  display: grid;
  grid-template-rows: 0fr;
  min-height: 0;
  overflow: hidden;
  background: #fff;
  transition: grid-template-rows 0.35s ease;
}

.enquire__attach--open .enquire__attach-panel {
  grid-template-rows: 1fr;
}

.enquire__attach--open .enquire__attach-panel-inner {
  overflow: auto;
}

.enquire__attach-panel-inner {
  overflow: hidden;
  min-height: 0;
}

.enquire__attach-body {
  position: relative;
}

.enquire__field input:hover,
.enquire__field textarea:hover,
.enquire__field input:focus,
.enquire__field textarea:focus {
  outline: none;
  background: transparent;
}

.enquire__drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  min-height: 12.5rem;
  padding: 2.25rem var(--enquire-pad);
  border: 0;
  background: transparent;
  color: var(--charcoal);
  text-align: center;
  cursor: pointer;
}

.enquire__drop:hover,
.enquire__drop--over {
  border: 0;
  background: transparent;
}

.enquire__drop-title {
  font-family: var(--mono);
  font-size: 13.5px;
  line-height: 1.4;
}

.enquire__drop-note {
  max-width: 22rem;
  font-family: var(--mono);
  font-size: 11px;
  line-height: 1.6;
  color: color-mix(in srgb, var(--charcoal) 55%, transparent);
}

.enquire__files {
  list-style: none;
  margin: 0;
  padding: 0 var(--enquire-pad) 12px;
  display: grid;
  gap: 0.4rem;
}

.enquire__file {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 0.65rem;
  align-items: center;
  padding: 0.45rem 0.55rem;
  border: 1px solid var(--grid-line);
  background: var(--cream);
  font-size: var(--text-sm);
}

.enquire__file-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--charcoal);
}

.enquire__file-size {
  color: var(--muted);
  font-size: var(--text-xs);
}

.enquire__file-remove {
  font-size: 1.1rem;
  line-height: 1;
  color: var(--muted);
}

.enquire__moodboards {
  display: flex;
  flex-direction: column;
  gap: 30px;
  padding-top: 2px;
  padding-bottom: 35px;
  min-width: 0;
  max-width: 100%;
}

.enquire__empty {
  margin: 0;
  padding-inline: var(--enquire-pad);
}

.enquire__board-list {
  list-style: none;
  margin: 0;
  padding: 0 var(--enquire-pad);
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0.75rem;
  width: 100%;
  min-width: 0;
}

.enquire__board-list > li {
  min-width: 0;
}

.enquire__board-list--single {
  grid-template-columns: minmax(0, 1fr);
}

.enquire__board {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
  max-width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--grid-line);
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.enquire__board:hover {
  border-color: var(--charcoal);
}

.enquire__board--active {
  border-color: var(--charcoal);
  background: var(--cream);
}

.enquire__board-thumbs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2px;
  width: 3rem;
  height: 3rem;
  flex: none;
  border-radius: 6px;
  overflow: hidden;
  background: var(--sand);
}

.enquire__board-thumb {
  overflow: hidden;
  background: var(--sand);
}

.enquire__board-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.enquire__board-meta {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
  margin-right: auto;
}

.enquire__board-name {
  overflow: hidden;
  font-size: var(--text-sm);
  color: var(--charcoal);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.enquire__board-count {
  font-size: var(--text-xs);
  color: var(--muted);
}

.enquire__board:not(.enquire__board--active) {
  background: transparent;
  border-color: var(--grid-line);
}

.enquire__board:not(.enquire__board--active):hover {
  border-color: var(--charcoal);
}

.enquire__board-check {
  display: grid;
  place-items: center;
  width: 1.15rem;
  height: 1.15rem;
  flex: none;
  border: 1px solid var(--ui-border-color);
  border-radius: var(--ui-border-radius);
  font-size: 0.75rem;
  line-height: 1;
  color: transparent;
  background: transparent;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.enquire__board:not(.enquire__board--active) .enquire__board-check {
  background: transparent;
  border-color: var(--ui-border-color);
  color: transparent;
}

.enquire__board--active .enquire__board-check {
  background: var(--charcoal);
  border-color: var(--charcoal);
  color: var(--warm-white);
}

.enquire__error {
  margin: 0;
  padding-inline: var(--enquire-pad);
  font-size: var(--text-sm);
  color: #a33;
}

.enquire__actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.85rem;
  width: 100%;
  padding: var(--enquire-pad);
  margin-top: 0;
}

.enquire__send {
  display: block;
  width: 100%;
  margin: 0;
  padding: 13px;
  border: 0;
  border-radius: 0;
  background: var(--red);
  color: white;
  font-size: 12px;
  font-family: var(--mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.enquire__send:hover:not(:disabled) {
  background: var(--red);
  color: white;
  opacity: 0.9;
}

.enquire__send:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.enquire__success {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 2rem var(--enquire-pad);
}

.enquire__success-title {
  margin: 0;
}

@media (max-width: 1100px) {
  .enquire__heading,
  .enquire__aside {
    justify-self: stretch;
    max-width: none;
  }
}

@media (max-width: 767px) {
  .enquire__clients {
    display: none;
  }

  .enquire__columns,
  .enquire--intro .enquire__columns {
    top: 10px;
    right: 10px;
    width: min(840px, calc(100% - 20px));
  }

  .enquire__stage {
    max-height: calc(100dvh - 20px);
    --enquire-copy: 16px;
  }

  .enquire__fields {
    grid-template-columns: 1fr;
  }

  .enquire__fields > .enquire__field,
  .enquire__field--full {
    grid-column: auto;
    border-right: 0;
  }

  .enquire__board-list,
  .enquire__panel {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .enquire__overlay,
  .enquire__stage,
  .enquire__clients,
  .enquire__aside-block,
  .enquire__panel {
    transition: none;
  }
}
</style>
