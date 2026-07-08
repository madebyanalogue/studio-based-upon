<template>
  <div class="zoom-controls" role="toolbar" aria-label="Grid zoom">
    <span class="zoom-controls__bracket">[</span>
    <button type="button" class="zoom-controls__btn" aria-label="Zoom in" @click="$emit('zoom-in')">
      +
    </button>
    <span class="zoom-controls__sep">|</span>
    <button type="button" class="zoom-controls__btn" aria-label="Zoom out" @click="$emit('zoom-out')">
      -
    </button>
    <span class="zoom-controls__bracket">]</span>
    <span class="zoom-controls__label serif-italic">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string }>()
defineEmits<{ 'zoom-in': []; 'zoom-out': [] }>()
</script>

<style scoped>
.zoom-controls {
  position: fixed;
  left: 50%;
  bottom: var(--gutter);
  transform: translateX(-50%);
  z-index: 90;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: var(--text-sm);
  /* background: rgba(250, 247, 242, 0.92);
  backdrop-filter: blur(8px);
  border: 1px solid var(--grid-line); */
  padding: 0.45rem 0.75rem;
}

.zoom-controls__btn {
  width: 1.5rem;
  text-align: center;
}

.zoom-controls__sep,
.zoom-controls__bracket {
  color: var(--stone);
}

.zoom-controls__label {
  margin-left: 0.5rem;
  min-width: 3ch;
}
</style>
