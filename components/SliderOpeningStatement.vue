<template>
  <div class="slider-statement">
    <DissolveText
      ref="dissolveRef"
      class="slider-statement__dissolve"
      :lines="LINES"
      @clear="onClear"
    />
  </div>
</template>

<script setup lang="ts">
const LINES = ['Two decades of making', 'for extraordinary spaces', 'around the world.']

const emit = defineEmits<{ clear: [] }>()

const dissolveRef = ref<{
  wash: (x: number, y: number) => void
  lift: () => void
} | null>(null)

const wash = (clientX: number, clientY: number) => {
  dissolveRef.value?.wash(clientX, clientY)
}

const lift = () => {
  dissolveRef.value?.lift()
}

const onClear = () => emit('clear')

defineExpose({ wash, lift })
</script>

<style scoped>
.slider-statement {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
}

.slider-statement__dissolve {
  font-family: var(--mono);
  font-size: clamp(1.48rem, 2.5vw, 1.6rem);
  font-weight: 400;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: #f4f1ea;
}

.slider-statement__dissolve :deep(.dissolve-text__measure) {
  font-family: var(--mono);
  font-size: clamp(1.48rem, 2.5vw, 1.6rem);
  font-weight: 400;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: #f4f1ea;
}
</style>
