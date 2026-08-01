<template>
  <button
    type="button"
    class="add-btn"
    :class="{
      'add-btn--active': active,
      [`add-btn--${variant}`]: true,
    }"
    :aria-label="label"
  >
    <span class="add-btn__icon" aria-hidden="true">
      <template v-if="variant === 'clone'">
        <span class="add-btn__clone add-btn__clone--back" />
        <span class="add-btn__clone add-btn__clone--front" />
      </template>
      <template v-else-if="variant === 'remove'">
        <span class="add-btn__h" />
      </template>
      <svg
        v-else
        class="add-btn__heart"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
        />
      </svg>
    </span>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Accessible name for the control. */
    label: string
    /** Saved / selected visual state. */
    active?: boolean
    /** Visual glyph: heart (add), minus, or duplicate squares. */
    variant?: 'add' | 'remove' | 'clone'
  }>(),
  { variant: 'add' },
)
</script>

<style scoped>
.add-btn {
  --_size: var(--thumb-ctrl-size, 23px);
  --_face: calc(var(--_size) - 2px);
  width: var(--_size);
  height: var(--_size);
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 0;
  color: var(--thumb-ctrl-color, var(--charcoal));
  mix-blend-mode: var(--thumb-ctrl-blend, normal);
  background: transparent;
  cursor: pointer;
  transition: color 0.2s ease;
}

.add-btn--active {
  color: var(--thumb-ctrl-color, var(--charcoal));
}

.add-btn__icon {
  position: relative;
  display: block;
  width: var(--_face);
  height: var(--_face);
  border: 1px solid currentColor;
  box-sizing: content-box;
  background: var(--thumb-ctrl-bg, #fff);
}

.add-btn__heart {
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(var(--_face) * 13 / 21);
  height: calc(var(--_face) * 13 / 21);
  transform: translate(-50%, -50%);
  display: block;
}

.add-btn--active .add-btn__heart {
  fill: currentColor;
}

.add-btn__h {
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(var(--_face) * 11 / 21);
  height: 1px;
  background: currentColor;
  transform: translate(-50%, -50%);
}

.add-btn__clone {
  position: absolute;
  width: calc(var(--_face) * 9 / 21);
  height: calc(var(--_face) * 9 / 21);
  border: 1px solid currentColor;
  box-sizing: border-box;
  background: transparent;
}

.add-btn__clone--back {
  top: calc(var(--_face) * 3 / 21);
  left: calc(var(--_face) * 3 / 21);
}

.add-btn__clone--front {
  top: calc(var(--_face) * 7 / 21);
  left: calc(var(--_face) * 7 / 21);
  background: var(--thumb-ctrl-bg, #fff);
}
</style>
