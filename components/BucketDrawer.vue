<template>
  <Teleport to="body">
    <div
      class="bucket"
      :class="{ 'bucket--open': isOpen }"
      aria-hidden="true"
    >
      <div class="bucket__backdrop" @click="closeDrawer" />
      <aside class="bucket__panel" role="dialog" aria-modal="true" aria-label="Saved products">
        <header class="bucket__header">
          <div class="bucket__header-text">
            <div v-if="moodboards.length > 1" class="bucket__tabs">
              <button
                v-for="board in moodboards"
                :key="board.id"
                type="button"
                class="bucket__tab"
                :class="{ 'bucket__tab--active': board.id === activeMoodboardId }"
                @click="setActiveMoodboard(board.id)"
              >
                {{ board.name }}
              </button>
            </div>
            <div class="bucket__title-row">
              <input
                v-if="isEditing"
                ref="titleInput"
                v-model="editName"
                type="text"
                class="bucket__title-input serif-italic"
                aria-label="Moodboard name"
                @keydown.enter.prevent="saveName"
                @keydown.esc.prevent="cancelEdit"
                @blur="saveName"
              />
              <h2 v-else class="bucket__title serif-italic">{{ activeMoodboard?.name || 'Composition' }}</h2>

              <div class="bucket__title-actions">
                <button
                  type="button"
                  class="bucket__icon-btn"
                  :aria-label="isEditing ? 'Save name' : 'Edit moodboard name'"
                  @click="isEditing ? saveName() : startEdit()"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="bucket__icon-btn"
                  aria-label="Delete moodboard"
                  @click="confirmingDelete = true"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M3 6h18" />
                    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>
            </div>
            <p v-if="items.length" class="bucket__subtitle">
              {{ items.length }} {{ items.length === 1 ? 'item' : 'items' }} in your selection
            </p>
          </div>
          <button type="button" class="bucket__close" aria-label="Close" @click="closeDrawer">×</button>
        </header>

        <div v-if="!items.length" class="bucket__empty">
          <p class="bucket__empty-title serif-italic">Nothing saved yet</p>
          <p>Heart items from the grid to collect surfaces, materials and finishes here.</p>
        </div>

        <ul v-else class="bucket__list">
          <li v-for="item in items" :key="item.id" class="bucket__item">
            <img :src="item.imageUrl" :alt="item.title" class="bucket__thumb" />
            <div class="bucket__info">
              <p class="bucket__name">{{ item.title }}</p>
              <p class="bucket__type">{{ item.itemType }}</p>
            </div>
            <button
              type="button"
              class="bucket__remove"
              aria-label="Remove item"
              @click="removeItem(item.id)"
            >
              ×
            </button>
          </li>
        </ul>

        <footer class="bucket__footer">
          <button type="button" class="btn" @click="sendEnquiry">Send as enquiry</button>
          <button type="button" class="btn btn--filled" @click="onBuildMoodboard">
            Build moodboard
          </button>
        </footer>

        <div v-if="confirmingDelete" class="bucket__confirm" role="dialog" aria-modal="true" aria-label="Delete moodboard">
          <div class="bucket__confirm-box">
            <p class="bucket__confirm-title serif-italic">Delete this moodboard?</p>
            <p class="bucket__confirm-text">
              “{{ activeMoodboard?.name || 'Composition' }}” and its {{ items.length }}
              {{ items.length === 1 ? 'item' : 'items' }} will be permanently removed.
            </p>
            <div class="bucket__confirm-actions">
              <button type="button" class="btn" @click="confirmingDelete = false">Cancel</button>
              <button type="button" class="btn btn--filled" @click="onDeleteMoodboard">Delete</button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const {
  moodboards,
  activeMoodboard,
  activeMoodboardId,
  items,
  isOpen,
  closeDrawer,
  removeItem,
  openMoodboard,
  setActiveMoodboard,
  renameMoodboard,
  deleteMoodboard,
} = useBucket()
const { initFromBucket } = useMoodboard()
const { openFromBucket } = useEnquiryForm()

const isEditing = ref(false)
const editName = ref('')
const confirmingDelete = ref(false)
const titleInput = ref<HTMLInputElement | null>(null)

const startEdit = () => {
  editName.value = activeMoodboard.value?.name || ''
  isEditing.value = true
  nextTick(() => {
    titleInput.value?.focus()
    titleInput.value?.select()
  })
}

const saveName = () => {
  if (!isEditing.value) return
  if (activeMoodboardId.value && editName.value.trim()) {
    renameMoodboard(activeMoodboardId.value, editName.value)
  }
  isEditing.value = false
}

const cancelEdit = () => {
  isEditing.value = false
}

const onDeleteMoodboard = () => {
  if (activeMoodboardId.value) deleteMoodboard(activeMoodboardId.value)
  confirmingDelete.value = false
}

const onBuildMoodboard = () => {
  initFromBucket(items.value)
  openMoodboard()
}

const sendEnquiry = () => {
  if (!items.value.length) return
  openFromBucket(items.value)
}

watch(activeMoodboardId, () => {
  isEditing.value = false
  confirmingDelete.value = false
})
</script>

<style scoped>
.bucket {
  position: fixed;
  inset: 0;
  z-index: 200;
  pointer-events: none;
}

.bucket--open {
  pointer-events: auto;
}

.bucket__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  opacity: 0;
  transition: opacity 0.35s ease;
}

.bucket--open .bucket__backdrop {
  opacity: 1;
}

.bucket__panel {
  position: absolute;
  top: 20px;
  bottom: 20px;
  right: 20px;
  width: var(--bucket-width);
  max-width: calc(100% - 40px);
  background: var(--warm-white);
  /* border: 1px solid var(--grid-line); */
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transform: translateX(calc(100% + 20px));
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.bucket--open .bucket__panel {
  transform: translateX(0);
}

.bucket__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem var(--gutter);
  border-bottom: 1px solid var(--grid-line);
}

.bucket__header-text {
  flex: 1;
  min-width: 0;
}

.bucket__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.5rem;
  margin-bottom: 0.75rem;
}

.bucket__tab {
  padding: 0.25rem 0.55rem;
  font-size: var(--text-xs);
  color: var(--muted);
  border: 1px solid var(--grid-line);
  border-radius: 999px;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.bucket__tab:hover,
.bucket__tab--active {
  color: var(--charcoal);
  border-color: var(--charcoal);
  background: var(--cream);
}

.bucket__title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bucket__title {
  margin: 0;
  font-size: var(--text-xl);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bucket__title-input {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0.1rem 0.35rem;
  font: inherit;
  font-size: var(--text-xl);
  color: var(--charcoal);
  background: var(--cream);
  border: 1px solid var(--grid-line);
  border-radius: 6px;
}

.bucket__title-input:focus {
  outline: none;
  border-color: var(--charcoal);
}

.bucket__title-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  margin-left: auto;
}

.bucket__icon-btn {
  display: grid;
  place-items: center;
  width: 1.9rem;
  height: 1.9rem;
  color: var(--muted);
  border-radius: 8px;
  transition: color 0.2s ease, background 0.2s ease;
}

.bucket__icon-btn:hover {
  color: var(--charcoal);
  background: var(--cream);
}

.bucket__subtitle {
  margin: 0.35rem 0 0;
  font-size: var(--text-sm);
  color: var(--muted);
}

.bucket__close {
  font-size: 1.75rem;
  line-height: 1;
}

.bucket__empty,
.bucket__list {
  flex: 1;
  overflow: auto;
  padding: var(--gutter);
}

.bucket__empty p {
  color: var(--muted);
  margin: 0;
}

.bucket__empty-title {
  margin: 0 0 0.5rem;
  font-size: var(--text-lg);
  color: var(--charcoal);
}

.bucket__list {
  list-style: none;
  margin: 0;
  display: grid;
  align-content: start;
  gap: 1rem;
}

.bucket__item {
  display: grid;
  grid-template-columns: var(--bucket-thumb-width) 1fr auto;
  gap: 0.75rem;
  align-items: center;
}

.bucket__thumb {
  width: var(--bucket-thumb-width);
  height: var(--bucket-thumb-height);
  object-fit: cover;
  /* border: 1px solid var(--grid-line); */
}

.bucket__name {
  margin: 0;
  font-size: var(--text-sm);
}

.bucket__type {
  margin: 0.15rem 0 0;
  font-size: var(--text-xs);
  color: var(--muted);
  text-transform: capitalize;
}

.bucket__remove {
  font-size: 1.25rem;
  color: var(--muted);
}

.bucket__footer {
  display: grid;
  gap: 0.75rem;
  padding: var(--gutter);
  border-top: 1px solid var(--grid-line);
}

.bucket__footer .btn {
  width: 100%;
}

.bucket__confirm {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: grid;
  place-items: center;
  padding: var(--gutter);
  background: rgba(26, 26, 26, 0.35);
  backdrop-filter: blur(2px);
}

.bucket__confirm-box {
  width: 100%;
  max-width: 22rem;
  padding: 1.5rem;
  background: var(--warm-white);
  border-radius: 14px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
}

.bucket__confirm-title {
  margin: 0 0 0.5rem;
  font-size: var(--text-lg);
  color: var(--charcoal);
}

.bucket__confirm-text {
  margin: 0 0 1.5rem;
  font-size: var(--text-sm);
  color: var(--muted);
}

.bucket__confirm-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.bucket__confirm-actions .btn {
  width: 100%;
}
</style>
