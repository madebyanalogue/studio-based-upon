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
      <template v-else>
        <span class="add-btn__h" />
        <span v-if="variant !== 'remove'" class="add-btn__v" />
      </template>
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
    /** Visual glyph: plus, minus, or duplicate squares. */
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

.add-btn__h,
.add-btn__v {
  position: absolute;
  background: currentColor;
}

.add-btn__h {
  top: 50%;
  left: 50%;
  width: calc(var(--_face) * 11 / 21);
  height: 1px;
  transform: translate(-50%, -50%);
}

.add-btn__v {
  top: 50%;
  left: 50%;
  width: 1px;
  height: calc(var(--_face) * 11 / 21);
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
