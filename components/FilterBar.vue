<template>
  <div class="filter-bar" role="toolbar" aria-label="Grid filters">
    <ul class="filter-bar__list">
      <li v-for="filter in filters" :key="filter">
        <button
          type="button"
          class="filter-bar__btn"
          :class="{ 'filter-bar__btn--active': activeFilter === filter }"
          :aria-pressed="activeFilter === filter"
          @click="$emit('update:activeFilter', filter)"
        >
          {{ filter }}
        </button>
      </li>
    </ul>

    <button
      v-if="showSurprise"
      type="button"
      class="filter-bar__surprise"
      @click="$emit('surprise')"
    >
      Surprise me
    </button>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    filters: string[]
    activeFilter: string
    showSurprise?: boolean
  }>(),
  { showSurprise: false },
)

defineEmits<{
  'update:activeFilter': [value: string]
  surprise: []
}>()
</script>

<style scoped>
.filter-bar {
  position: fixed;
  left: 50%;
  bottom: calc(var(--gutter) + 2.5rem);
  transform: translateX(-50%);
  z-index: 90;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.filter-bar__list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.35rem 1rem;
  list-style: none;
  margin: 0;
  padding: 0.5rem 1rem;
  background: rgba(250, 247, 242, 0.92);
  backdrop-filter: blur(8px);
  border: 1px solid var(--grid-line);
}

.filter-bar__btn {
  font-size: var(--text-sm);
  color: var(--muted);
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 4px;
  transition: color 0.2s ease, text-decoration-color 0.2s ease;
}

.filter-bar__btn:hover {
  color: var(--charcoal);
}

.filter-bar__btn--active {
  color: var(--charcoal);
  text-decoration-color: currentColor;
}

.filter-bar__surprise {
  font-size: var(--text-sm);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--charcoal);
  padding: 0.55rem 1.5rem;
  border: 1px solid var(--charcoal);
  border-radius: 999px;
  background: rgba(250, 247, 242, 0.92);
  backdrop-filter: blur(8px);
  transition: background 0.2s ease, color 0.2s ease;
}

.filter-bar__surprise:hover {
  background: var(--charcoal);
  color: var(--sand, #faf7f2);
}
</style>
