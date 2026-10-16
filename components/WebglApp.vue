<template>
  <canvas ref="canvasEl" class="webgl-app" aria-hidden="true" />
</template>

<script setup lang="ts">
import { createWebglApp } from '~/lib/webgl-app/createWebglApp'

const canvasEl = ref<HTMLCanvasElement | null>(null)
let app: ReturnType<typeof createWebglApp> | null = null

onMounted(() => {
  const canvas = canvasEl.value
  if (!canvas) return
  try {
    app = createWebglApp(canvas)
  } catch (error) {
    console.error(error)
  }
})

onBeforeUnmount(() => {
  app?.destroy()
  app = null
})
</script>

<style scoped>
.webgl-app {
  position: fixed;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0;
}

.webgl-app.is-live {
  opacity: 1;
}
</style>

<style>
.webgl-app-source {
  opacity: 0 !important;
}
</style>
