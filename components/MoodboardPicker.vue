<template>
  <Teleport to="body">
    <div
      v-if="pickerItem"
      class="moodboard-picker"
      role="dialog"
      aria-modal="true"
      aria-label="Choose moodboard"
    >
      <div class="moodboard-picker__backdrop" @click="closePicker" />
      <div class="moodboard-picker__panel">
        <p class="moodboard-picker__title serif-italic">Add to moodboard</p>
        <ul class="moodboard-picker__list">
          <li v-for="board in moodboards" :key="board.id">
            <button
              type="button"
              class="moodboard-picker__option"
              :class="{ 'moodboard-picker__option--active': isSavedIn(board.id, pickerItem.id) }"
              @click="selectMoodboardForItem(board.id)"
            >
              <span>{{ board.name }}</span>
              <span
                class="moodboard-picker__check"
                :class="{ 'moodboard-picker__check--active': isSavedIn(board.id, pickerItem.id) }"
                aria-hidden="true"
              >✓</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const {
  moodboards,
  pickerItem,
  isSavedIn,
  selectMoodboardForItem,
  closePicker,
} = useBucket()

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && pickerItem.value) closePicker()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.moodboard-picker {
  position: fixed;
  inset: 0;
  z-index: 350;
  display: grid;
  place-items: center;
  padding: var(--gutter);
}

.moodboard-picker__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(26, 26, 26, 0.35);
}

.moodboard-picker__panel {
  position: relative;
  width: min(22rem, 100%);
  padding: 1.25rem;
  background: var(--warm-white);
  border: 1px solid var(--grid-line);
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
}

.moodboard-picker__title {
  margin: 0 0 1rem;
  font-size: var(--text-lg);
}

.moodboard-picker__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}

.moodboard-picker__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--grid-line);
  border-radius: 10px;
  font-size: var(--text-sm);
  transition: background 0.2s ease, border-color 0.2s ease;
}

.moodboard-picker__option:hover,
.moodboard-picker__option--active {
  background: var(--cream);
  border-color: var(--charcoal);
}

.moodboard-picker__check {
  flex-shrink: 0;
  width: 1.4rem;
  height: 1.4rem;
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  line-height: 1;
  border: 1px solid var(--stone, #c9c3b6);
  border-radius: 999px;
  color: var(--stone, #c9c3b6);
  background: transparent;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.moodboard-picker__check--active {
  background: var(--charcoal);
  border-color: var(--charcoal);
  color: var(--warm-white);
}
</style>
