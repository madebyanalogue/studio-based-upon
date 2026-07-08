<template>
  <article class="section enquire">
    <h1 class="page-title">{{ page?.heroTitle || 'Enquire' }}</h1>
    <p class="enquire__intro serif-italic">
      {{ page?.heroSubtitle || 'For project enquiries, trade pricing, or to discuss a bespoke commission, tell us about your project below.' }}
    </p>

    <div v-if="isSuccess" class="enquire__success">
      <p class="enquire__success-title serif-italic">Thank you</p>
      <p>Your enquiry has been sent. We will be in touch shortly.</p>
      <button type="button" class="btn btn--filled" @click="resetForm">Send another enquiry</button>
    </div>

    <form v-else class="enquire__form" @submit.prevent="submit">
      <div class="enquire__moodboards">
        <p class="enquire__label">Include moodboards <span class="enquire__hint">optional</span></p>

        <p v-if="!selectableMoodboards.length" class="enquire__empty">
          You have no saved moodboards yet. Heart pieces across the site to build one.
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
                <span class="enquire__board-name serif-italic">{{ board.name }}</span>
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
      </div>

      <p v-if="error" class="enquire__error" role="alert">{{ error }}</p>

      <div class="enquire__actions">
        <button type="submit" class="btn btn--filled enquire__send" :disabled="isSubmitting">
          {{ isSubmitting ? 'Sending…' : 'Send enquiry' }}
        </button>
        <p class="enquire__or">
          or email us at
          <a :href="`mailto:${enquiryEmail}`" class="enquire__email serif-italic">{{ enquiryEmail }}</a>
        </p>
      </div>
    </form>

    <p v-if="page?.address" class="enquire__address">{{ page.address }}</p>
  </article>
</template>

<script setup lang="ts">
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
const isSubmitting = ref(false)
const isSuccess = ref(false)
const error = ref<string | null>(null)

const toggleBoard = (id: string) => {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((v) => v !== id)
    : [...selectedIds.value, id]
}

const resetForm = () => {
  form.name = ''
  form.email = ''
  form.telephone = ''
  form.message = ''
  selectedIds.value = []
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
    await $fetch('/api/enquiry', {
      method: 'POST',
      body: {
        ...form,
        source: 'enquire-page',
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

.enquire__field:nth-child(4) {
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
