<template>
  <article class="enquire">
    <div
      class="enquire__stage"
      :class="{ 'enquire__stage--in': stageVisible }"
      :inert="!stageVisible"
    >
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
    <div class="enquire__aside-block flex flex-col gap-2">
      <h2 class="h6 muted">Working with clients</h2>
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

    <!-- <p class="enquire__intro mono-copy">
      {{ page?.heroSubtitle || 'Tell us about your project, or request a call back below.' }}
    </p> -->

    <div v-if="isSuccess" class="enquire__success">
      <p class="enquire__success-title h6 muted">Thank you</p>
      <p class="mono-copy">Your enquiry has been sent. We will be in touch shortly.</p>
      <button type="button" class="enquire__send" @click="resetForm">Send another enquiry</button>
    </div>

    <form v-else class="enquire__form" @submit.prevent="submit">
      <div class="enquire__field">
        <span class="enquire__label interface">
          Attachments <span class="enquire__hint">optional</span>
        </span>
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

      <label class="enquire__field">
        <span class="enquire__label interface">Start a conversation§</span>
        <textarea
          v-model="form.message"
          name="message"
          rows="6"
          placeholder="Tell us about your project…"
        />
      </label>

      <div class="enquire__moodboards">
        <p class="enquire__label interface">Include selections <span class="enquire__hint">optional</span></p>

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
                <span class="enquire__board-count">{{ board.items.length }} {{ board.items.length === 1 ? 'item' : 'items' }}</span>
              </span>
              <span class="enquire__board-check" aria-hidden="true">{{ selectedIds.includes(board.id) ? '✓' : '' }}</span>
            </label>
          </li>
        </ul>
      </div>

      <div class="enquire__fields">
        <label class="enquire__field">
          <span class="enquire__label interface">Name</span>
          <input v-model="form.name" type="text" name="name" autocomplete="name" required />
        </label>

        <label class="enquire__field">
          <span class="enquire__label interface">Email</span>
          <input v-model="form.email" type="email" name="email" autocomplete="email" required />
        </label>

        <label class="enquire__field">
          <span class="enquire__label interface">Telephone</span>
          <input v-model="form.telephone" type="tel" name="telephone" autocomplete="tel" />
        </label>
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
}

const submit = async () => {
  if (!form.name.trim() || !form.email.trim()) {
    error.value = 'Please enter your name and email.'
    return
  }

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
  grid-template-columns: minmax(0, 1fr) minmax(0, 640px) minmax(0, 1fr);
  grid-template-areas: "heading form aside";
  align-items: start;
  width: 100%;
  max-width: none;
  text-align: left;
  column-gap: 40px;
  padding: calc(var(--header-height) + 4rem) var(--gutter) 4rem;
  box-sizing: border-box;
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
  grid-area: form;
  display: flex;
  flex-direction: column;
  gap: 40px;
  width: 100%;
  max-width: 640px;
  min-width: 0;
  padding: 0;
  border: 0;
  padding-top: 20px;
}

.enquire__panel {
  display: flex;
  flex-direction: column;
  gap: 60px;
  width: 100%;
  max-width: none;
  min-width: 0;
  border: 0;
  padding: 0;
  background: transparent;
  text-align: left;
}

.enquire__intro {
  max-width: none;
  margin: 0;
}

.enquire__form {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.enquire__fields {
  display: grid;
  grid-template-columns: 1fr;
  gap: 40px;
}

.enquire__field {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.enquire__field:nth-child(4),
.enquire__field--full {
  grid-column: 1 / -1;
}

.enquire__hint {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.6;
}

.enquire__field input,
.enquire__field textarea {
  width: 100%;
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--grid-line);
  background: var(--cream);
  font: inherit;
  color: var(--charcoal);
  resize: vertical;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.enquire__field textarea {
  min-height: calc(1.5 * (6lh + 1.5rem + 2px));
}

.enquire__field input:hover,
.enquire__field textarea:hover {
  border-color: color-mix(in srgb, var(--charcoal) 45%, transparent);
  background: var(--warm-white);
}

.enquire__field input:focus,
.enquire__field textarea:focus {
  outline: none;
  border-color: var(--charcoal);
  background: var(--warm-white);
}

.enquire__drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  min-height: 12.5rem;
  padding: 2.25rem 1.5rem;
  border: 1px dashed color-mix(in srgb, var(--charcoal) 45%, transparent);
  background: var(--cream);
  color: var(--charcoal);
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.enquire__drop:hover,
.enquire__drop--over {
  border-style: solid;
  border-color: var(--charcoal);
  background: var(--warm-white);
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
  margin: 0.5rem 0 0;
  padding: 0;
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
  gap: 0.85rem;
}

.enquire__empty {
  margin: 0;
}

.enquire__board-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.enquire__board-list--single {
  grid-template-columns: 1fr;
}

.enquire__board {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--grid-line);
  border-radius: 12px;
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
  font-size: var(--text-sm);
  color: var(--charcoal);
}

.enquire__board-count {
  font-size: var(--text-xs);
  color: var(--muted);
}

.enquire__board:not(.enquire__board--active) {
  background: transparent;
  border-color: var(--grid-line);
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
  font-size: var(--text-sm);
  color: #a33;
}

.enquire__actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.85rem;
  width: 100%;
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
  padding: 2rem 0;
}

.enquire__success-title {
  margin: 0;
}

@media (max-width: 1100px) {
  .enquire__stage {
    grid-template-columns: minmax(0, 640px);
    grid-template-areas:
      "heading"
      "form"
      "aside";
    justify-content: center;
    width: min(640px, calc(100% - (var(--gutter) * 2)));
    margin-inline: auto;
    padding-inline: 0;
    row-gap: 40px;
  }

  .enquire__heading,
  .enquire__aside {
    justify-self: stretch;
    max-width: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .enquire__aside-block,
  .enquire__panel {
    transition: none;
  }
}
</style>
