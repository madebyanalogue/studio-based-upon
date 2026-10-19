<template>
  <article class="enquire">
    <div
      class="enquire__stage"
      :class="{ 'enquire__stage--in': stageVisible }"
      :inert="!stageVisible"
    >
      <div class="enquire__lead">
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

      <div class="enquire__aside-block flex flex-col gap-2">
        <div class="enquire__aside-head">
          <h2 class="h6 muted">Working with clients</h2>
        </div>
        <p class="mono-copy">
          The client is a critical part of the process. We collaborate with designers
          and architects to realise work for private residences, yachts, hotels,
          restaurants and fashion houses.
        </p>
        <p class="mono-copy">
          Share a selection, a drawing, or a few words about the project. We will be
          in touch to talk through material, scale and how the work is made.
        </p>
      </div>

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
      </div>

      <div class="enquire__half">
    <!-- <p class="enquire__intro mono-copy">
      {{ page?.heroSubtitle || 'Tell us about your project, or request a call back below.' }}
    </p> -->

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
  </article>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'

definePageMeta({
  pageTransition: false,
})

/** Match the materials & forms / typology title melt. */
const TITLE_BLUR_MAX = 75
const TITLE_GOOEY_IN_DUR = 2.6
const TITLE_GOOEY_OUT_DUR = 0.85
const STAGE_FADE_MS = 700
/** Start the form while the title is still melting in. */
const STAGE_REVEAL_AT = 0.42

type LocalAttachment = {
  id: string
  file: File
  name: string
  size: number
  type: string
}

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

const form = reactive({
  name: '',
  email: '',
  telephone: '',
  message: '',
})

const selectedIds = ref<string[]>([])
const attachments = ref<LocalAttachment[]>([])
const isSubmitting = ref(false)
const isSuccess = ref(false)
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
  form.name = ''
  form.email = ''
  form.telephone = ''
  form.message = ''
  selectedIds.value = []
  attachments.value = []
  isSuccess.value = false
  error.value = null
  attempted.value = false
}

const attempted = ref(false)
const missing = computed(() => ({
  name: attempted.value && !form.name.trim(),
  email: attempted.value && !form.email.trim(),
}))

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
const titleFilterId = `enquire-title-goo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
const titleBaseFilter = `url(#${titleFilterId}) blur(0.25px)`

let titleSplit: InstanceType<typeof SplitText> | null = null
let titleTween: gsap.core.Tween | null = null
let titleGen = 0
let pageOutroRan = false

const prefersReducedMotion = () =>
  import.meta.client &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const titleWords = () =>
  titleEl.value?.querySelectorAll('.enquire__title-word') ?? []

const power3Out = (t: number) => 1 - Math.pow(1 - t, 3)

const waitMs = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })

const revealStage = () => {
  if (pageOutroRan) return
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

const playTitleGooeyOut = () =>
  new Promise<void>((resolve) => {
    titleTween?.kill()
    titleTween = null
    if (
      prefersReducedMotion() ||
      !titleEl.value ||
      !titlePaintReady.value
    ) {
      titlePaintReady.value = false
      resolve()
      return
    }

    const words = Array.from(titleWords())
    const target = words.length ? words : titleEl.value
    titleTween = gsap.to(target, {
      filter: `blur(${TITLE_BLUR_MAX}px)`,
      opacity: 0,
      duration: TITLE_GOOEY_OUT_DUR,
      ease: 'power2.in',
      onComplete: () => {
        titlePaintReady.value = false
        resolve()
      },
    })
  })

const playPageOut = async () => {
  if (pageOutroRan) return
  pageOutroRan = true
  titleGen += 1
  const stageWasIn = stageVisible.value
  stageVisible.value = false
  await Promise.all([
    playTitleGooeyOut(),
    stageWasIn ? waitMs(STAGE_FADE_MS) : Promise.resolve(),
  ])
}

onMounted(() => {
  void playTitleGooeyIn()
})

onBeforeRouteLeave((to, from) => {
  if (to.path === from.path) return
  return playPageOut()
})

onUnmounted(() => {
  titleGen += 1
  titleTween?.kill()
  titleSplit?.revert()
  titleSplit = null
})

useHead(() => ({
  title: page.value?.seoTitle || 'Enquire — Studio Based Upon',
}))
</script>

<style scoped>
.enquire {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  max-width: none;
  --grid-line: #00000050;
}

html.dark .enquire {
  --grid-line: #ffffff50;
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

.enquire__stage {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(840px, 1fr);
  align-items: start;
  width: 100%;
  max-width: none;
  text-align: left;
  column-gap: 40px;
  padding: calc(var(--header-height) + 4rem) 0 4rem;
  box-sizing: border-box;
}

.enquire__lead {
  display: flex;
  flex-direction: column;
  gap: 40px;
  min-width: 0;
}

.enquire__heading {
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

.enquire__aside-block,
.enquire__half {
  opacity: 0;
  transition: opacity 0.7s ease;
}

.enquire__stage--in .enquire__aside-block,
.enquire__stage--in .enquire__half {
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
  align-items: flex-start;
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
}

.enquire__lead .mono-copy {
  min-width: 0;
}

.enquire__half .enquire__form,
.enquire__half .enquire__success {
  width: 100%;
  max-width: 840px;
}

.enquire__aside-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.enquire__pixel-x {
  position: relative;
  flex: none;
  width: 7px;
  height: 7px;
  color: var(--muted);
}

.enquire__pixel-x::before,
.enquire__pixel-x::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 9px;
  height: 1px;
  background: currentColor;
}

.enquire__pixel-x::before {
  transform: translate(-50%, -50%) rotate(45deg);
}

.enquire__pixel-x::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}

.enquire__intro {
  max-width: none;
  margin: 0;
}


@media (max-width: 1100px) {
  .enquire__stage {
    grid-template-columns: minmax(0, 1fr);
    row-gap: 40px;
  }
}


@media (prefers-reduced-motion: reduce) {
  .enquire__aside-block,
  .enquire__half {
    transition: none;
  }
}
</style>
