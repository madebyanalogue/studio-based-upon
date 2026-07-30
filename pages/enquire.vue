<template>
  <article class="section enquire">
    <h1 class="page-title">{{ page?.heroTitle || 'Enquire' }}</h1>
    <p class="enquire__intro  interface">
      {{ page?.heroSubtitle || 'Tell us about your project, or request a call back below.' }}
    </p>

    <div v-if="isSuccess" class="enquire__success">
      <p class="enquire__success-title  interface">Thank you</p>
      <p>Your enquiry has been sent. We will be in touch shortly.</p>
      <button type="button" class="btn btn--filled" @click="resetForm">Send another enquiry</button>
    </div>

    <form v-else class="enquire__form" @submit.prevent="submit">
      <div class="enquire__moodboards">
        <p class="enquire__label">Include selections <span class="enquire__hint">optional</span></p>

        <p v-if="!selectableMoodboards.length" class="enquire__empty">
          You have no saved selections yet. Heart pieces across the site to build one.
        </p>

        <ul v-else class="enquire__board-list">
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
          <span class="enquire__label">Name</span>
          <input v-model="form.name" type="text" name="name" autocomplete="name" required />
        </label>

        <label class="enquire__field">
          <span class="enquire__label">Email</span>
          <input v-model="form.email" type="email" name="email" autocomplete="email" required />
        </label>

        <label class="enquire__field">
          <span class="enquire__label">Telephone</span>
          <input v-model="form.telephone" type="tel" name="telephone" autocomplete="tel" />
        </label>

        <label class="enquire__field">
          <span class="enquire__label">Message</span>
          <textarea
            v-model="form.message"
            name="message"
            rows="6"
            placeholder="Tell us about your project…"
          />
        </label>

        <div class="enquire__field enquire__field--full">
          <span class="enquire__label">
            Attachments <span class="enquire__hint">optional</span>
          </span>
          <label class="enquire__upload">
            <input
              type="file"
              class="sr-only"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              @change="onFilesSelected"
            />
            <span class="enquire__upload-btn">Upload files</span>
            <span class="enquire__upload-note">Images, PDF or Word · up to 10MB each</span>
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

      <p v-if="error" class="enquire__error" role="alert">{{ error }}</p>

      <div class="enquire__actions">
        <button type="submit" class="btn btn--filled enquire__send" :disabled="isSubmitting">
          {{ isSubmitting ? 'Sending…' : 'Send enquiry' }}
        </button>
        <p class="enquire__or">
          or email us at
          <a :href="`mailto:${enquiryEmail}`" class="enquire__email  interface">{{ enquiryEmail }}</a>
        </p>
      </div>
    </form>

    <p v-if="page?.address" class="enquire__address">{{ page.address }}</p>
  </article>
</template>

<script setup lang="ts">
type LocalAttachment = {
  id: string
  file: File
  name: string
  size: number
  type: string
}

const { enquiryEmail } = useSiteSettings()
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

const onFilesSelected = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  const next = [...attachments.value]
  for (const file of Array.from(input.files)) {
    if (next.length >= MAX_FILES) {
      error.value = `You can attach up to ${MAX_FILES} files.`
      break
    }
    if (file.size > MAX_FILE_BYTES) {
      error.value = `"${file.name}" is larger than 10MB.`
      continue
    }
    next.push({
      id: `file-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
    })
  }
  attachments.value = next
  input.value = ''
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

useHead(() => ({
  title: page.value?.seoTitle || 'Enquire — Studio Based Upon',
}))
</script>

<style scoped>
.enquire {
  max-width: 900px;
}

.enquire__intro {
  max-width: 40rem;
  margin: 0.75rem 0 2.5rem;
  font-size: var(--text-lg);
  color: var(--muted);
}

.enquire__form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.enquire__fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

.enquire__field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.enquire__field:nth-child(4),
.enquire__field--full {
  grid-column: 1 / -1;
}

.enquire__label {
  font-size: var(--text-sm);
  color: var(--muted);
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
}

.enquire__field input:focus,
.enquire__field textarea:focus {
  outline: none;
  border-color: var(--charcoal);
}

.enquire__upload {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem 1rem;
  cursor: pointer;
}

.enquire__upload-btn {
  display: inline-flex;
  align-items: center;
  padding: 0.55rem 0.85rem;
  border: 1px solid var(--grid-line);
  background: var(--cream);
  font-size: var(--text-sm);
  color: var(--charcoal);
  transition: border-color 0.2s ease, background 0.2s ease;
}

.enquire__upload:hover .enquire__upload-btn {
  border-color: var(--charcoal);
  background: var(--warm-white);
}

.enquire__upload-note {
  font-size: var(--text-xs);
  color: var(--muted);
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
  font-size: var(--text-sm);
  color: var(--muted);
}

.enquire__board-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.75rem;
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

.enquire__board-check {
  display: grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  flex: none;
  border: 1px solid var(--grid-line);
  border-radius: 999px;
  font-size: 0.8rem;
  color: var(--warm-white);
  background: transparent;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.enquire__board--active .enquire__board-check {
  background: var(--charcoal);
  border-color: var(--charcoal);
}

.enquire__error {
  margin: 0;
  font-size: var(--text-sm);
  color: #a33;
}

.enquire__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem 1.5rem;
}

.enquire__send:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.enquire__or {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--muted);
}

.enquire__email {
  color: var(--charcoal);
  text-decoration: underline;
  text-underline-offset: 3px;
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
  font-size: var(--text-xl);
}

.enquire__success p {
  margin: 0;
  color: var(--muted);
}

.enquire__address {
  margin-top: 2.5rem;
  font-size: var(--text-sm);
  color: var(--muted);
}

@media (max-width: 640px) {
  .enquire__fields {
    grid-template-columns: 1fr;
  }
}
</style>
