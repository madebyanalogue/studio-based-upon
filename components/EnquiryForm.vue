<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="enquiry"
      role="dialog"
      aria-modal="true"
      aria-label="Send enquiry"
    >
      <div class="enquiry__backdrop" @click="close" />

      <div class="enquiry__panel">
        <header class="enquiry__header">
          <div>
            <h2 class="enquiry__title serif-italic">Send enquiry</h2>
            <p class="enquiry__subtitle">
              {{ source === 'moodboard' ? 'Your moodboard composition' : 'Your selection' }}
            </p>
          </div>
          <button type="button" class="enquiry__close" aria-label="Close" @click="close">×</button>
        </header>

        <div v-if="isSuccess" class="enquiry__success">
          <p class="enquiry__success-title serif-italic">Thank you</p>
          <p>Your enquiry has been sent. We will be in touch shortly.</p>
          <button type="button" class="btn btn--filled" @click="close">Close</button>
        </div>

        <form v-else class="enquiry__body" @submit.prevent="submit">
          <div class="enquiry__preview">
            <figure v-if="compositionImage" class="enquiry__composition">
              <img :src="compositionImage" alt="Moodboard composition" />
              <figcaption>Composition preview</figcaption>
            </figure>

            <div v-if="previewItems.length" class="enquiry__grid">
              <div
                v-for="item in previewItems"
                :key="item.id"
                class="enquiry__grid-item"
                :title="item.title"
              >
                <img
                  v-if="item.kind === 'image' && item.imageUrl"
                  :src="item.imageUrl"
                  :alt="item.title"
                />
                <span
                  v-else-if="item.kind === 'colour' && item.colour"
                  class="enquiry__colour"
                  :style="{ background: item.colour }"
                />
                <span v-else-if="item.kind === 'text'" class="enquiry__text serif-italic">
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

            <p v-if="error" class="enquiry__error" role="alert">{{ error }}</p>

            <button type="submit" class="btn btn--filled enquiry__send" :disabled="isSubmitting">
              {{ isSubmitting ? 'Sending…' : 'Send enquiry' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const {
  isOpen,
  source,
  previewItems,
  compositionImage,
  form,
  isSubmitting,
  isSuccess,
  error,
  close,
  submit,
} = useEnquiryForm()

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isOpen.value) close()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.enquiry {
  position: fixed;
  inset: 0;
  z-index: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--gutter);
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
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--bucket-thumb-width), 1fr));
  gap: 0.5rem;
}

.enquiry__grid-item {
  aspect-ratio: 1;
  overflow: hidden;
  border: 1px solid var(--grid-line);
  background: var(--warm-white);
}

.enquiry__grid-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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

.enquiry__error {
  margin: 0;
  font-size: var(--text-sm);
  color: #a33;
}

.enquiry__send {
  width: 100%;
  margin-top: 0.25rem;
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
