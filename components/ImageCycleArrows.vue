<template>
  <div
    v-if="count > 1"
    class="image-cycle"
    :class="{ 'image-cycle--boxed': boxed }"
    @pointerdown.stop
    @click.stop
  >
    <div class="image-cycle__frame">
      <button
        type="button"
        class="image-cycle__btn"
        aria-label="Previous image"
        @click="$emit('prev')"
      >
        <span class="image-cycle__arrow image-cycle__arrow--prev" aria-hidden="true" />
      </button>
      <span v-if="!hideCount" class="image-cycle__count">{{ index + 1 }}/{{ count }}</span>
      <button
        type="button"
        class="image-cycle__btn"
        aria-label="Next image"
        @click="$emit('next')"
      >
        <span class="image-cycle__arrow image-cycle__arrow--next" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    index: number
    count: number
    /** Hide the n/n counter. */
    hideCount?: boolean
    /** Match AddButton chrome: bordered box, 2× add width. */
    boxed?: boolean
  }>(),
  {
    hideCount: false,
    boxed: false,
  },
)

defineEmits<{
  prev: []
  next: []
}>()
</script>

<style scoped>
.image-cycle {
  display: inline-flex;
  align-items: center;
  color: var(--charcoal);
  line-height: 1;
  user-select: none;
}

.image-cycle__frame {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  background: rgba(250, 247, 242, 0.92);
  border: 1px solid var(--ui-border-color, rgba(0, 0, 0, 0.12));
}

.image-cycle--boxed {
  --_size: var(--thumb-ctrl-size, 23px);
  --_face: var(--_size);
  width: calc(var(--_size) * 2);
  height: var(--_size);
  display: grid;
  place-items: center;
  padding: 0;
  background: transparent;
  color: var(--thumb-ctrl-color, var(--charcoal));
  mix-blend-mode: var(--thumb-ctrl-blend, normal);
}

.image-cycle--boxed .image-cycle__frame {
  width: calc(var(--_face) * 2);
  height: var(--_face);
  padding: 0;
  gap: 0;
  background: var(--thumb-ctrl-bg, var(--cream));
  border: 0;
  border-radius: var(--thumb-ctrl-radius, 4px);
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.image-cycle__btn {
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.image-cycle--boxed .image-cycle__btn {
  width: 100%;
  height: 100%;
}

.image-cycle__btn:hover {
  color: var(--accent, #000);
}

.image-cycle__arrow {
  display: block;
  width: 5px;
  height: 5px;
  border-left: 1px solid currentColor;
  border-bottom: 1px solid currentColor;
  box-sizing: border-box;
}

.image-cycle__arrow--prev {
  transform: translateX(1px) rotate(45deg);
}

.image-cycle__arrow--next {
  transform: translateX(-1px) rotate(-135deg);
}

.image-cycle__count {
  min-width: 28px;
  text-align: center;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}
</style>
