<template>
  <div
    ref="rootEl"
    class="sliding-pill"
    role="tablist"
    :aria-label="label"
    data-cursor="default"
  >
    <span
      class="sliding-pill__blob"
      :class="{ 'is-ready': ready }"
      :style="blobStyle"
      aria-hidden="true"
    />
    <button
      v-for="option in options"
      :key="option.id"
      type="button"
      role="tab"
      class="interface"
      :aria-selected="modelValue === option.id"
      :class="{ 'is-active': modelValue === option.id }"
      @click="emit('update:modelValue', option.id)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
export type SlidingPillOption = {
  id: string
  label: string
}

const props = defineProps<{
  modelValue: string
  options: readonly SlidingPillOption[]
  label: string
}>()

const emit = defineEmits<{
  'update:modelValue': [id: string]
}>()

const rootEl = ref<HTMLElement | null>(null)
const blob = ref({ x: 4, w: 0 })
const ready = ref(false)
const blobStyle = computed(() => ({
  width: `${blob.value.w}px`,
  transform: `translateX(${blob.value.x}px)`,
}))

const measure = () => {
  const root = rootEl.value
  if (!root) return
  const active = root.querySelector<HTMLElement>('[aria-selected="true"]')
  if (!active) return
  const box = active.getBoundingClientRect()
  const rootBox = root.getBoundingClientRect()
  if (box.width < 2) return
  blob.value = { x: box.left - rootBox.left, w: box.width }
  ready.value = true
}

let observer: ResizeObserver | null = null

watch(
  () => props.modelValue,
  async () => {
    await nextTick()
    measure()
  },
  { flush: 'post' },
)

onMounted(() => {
  nextTick(() => {
    measure()
    if (typeof ResizeObserver === 'undefined' || !rootEl.value) return
    observer = new ResizeObserver(() => measure())
    observer.observe(rootEl.value)
  })
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<style scoped>
.sliding-pill {
  position: relative;
  display: flex;
  gap: 2px;
  margin: 0;
  padding: 4px;
  border: 1px solid var(--grid-line);
  border-radius: 999px;
  background: color-mix(in srgb, var(--background-color, var(--cream)) 88%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.sliding-pill__blob {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 0;
  border-radius: 999px;
  background: var(--charcoal);
  pointer-events: none;
}

.sliding-pill__blob.is-ready {
  transition:
    transform 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    width 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.sliding-pill button {
  position: relative;
  z-index: 1;
  margin: 0;
  padding: 0.45rem 1.05rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--charcoal);
  cursor: pointer;
  white-space: nowrap;
}

.sliding-pill button.is-active {
  background: transparent;
  color: var(--cream);
}
</style>
