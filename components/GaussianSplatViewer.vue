<template>
  <div class="gs-viewer">
    <div ref="rootEl" class="gs-viewer__canvas" />
    <p v-if="error" class="gs-viewer__error interface">{{ error }}</p>
    <p v-else-if="!src" class="gs-viewer__empty interface">No splat source URL</p>
  </div>
</template>

<script setup lang="ts">
/**
 * Client-only Gaussian splat viewer (@mkkellogg/gaussian-splats-3d).
 * SharedArrayBuffer / GPU sort stay off so we don’t need COOP/COEP headers.
 */
const props = withDefaults(
  defineProps<{
    src: string
    cameraUp?: number[] | null
    cameraPosition?: number[] | null
    cameraLookAt?: number[] | null
  }>(),
  {
    cameraUp: null,
    cameraPosition: null,
    cameraLookAt: null,
  },
)

const rootEl = ref<HTMLElement | null>(null)
const error = ref<string | null>(null)

const asVec3 = (value: number[] | null | undefined, fallback: number[]) => {
  if (!value || value.length < 3) return fallback
  return [Number(value[0]), Number(value[1]), Number(value[2])]
}

let viewer: { dispose?: () => void; stop?: () => void } | null = null

const disposeViewer = () => {
  if (!viewer) return
  try {
    viewer.stop?.()
    viewer.dispose?.()
  } catch {
    /* ignore teardown races */
  }
  viewer = null
  if (rootEl.value) rootEl.value.replaceChildren()
}

onMounted(async () => {
  if (!import.meta.client || !rootEl.value || !props.src) return

  try {
    const GaussianSplats3D = await import('@mkkellogg/gaussian-splats-3d')
    const next = new GaussianSplats3D.Viewer({
      rootElement: rootEl.value,
      cameraUp: asVec3(props.cameraUp, [0, -1, -0.6]),
      initialCameraPosition: asVec3(props.cameraPosition, [-1, -4, 6]),
      initialCameraLookAt: asVec3(props.cameraLookAt, [0, 4, 0]),
      sharedMemoryForWorkers: false,
      gpuAcceleratedSort: false,
      showLoadingUI: true,
    })
    viewer = next
    await next.addSplatScene(props.src, {
      showLoadingUI: true,
      splatAlphaRemovalThreshold: 5,
    })
    next.start()
  } catch (err) {
    console.error('[GS viewer]', err)
    error.value =
      err instanceof Error ? err.message : 'Failed to load gaussian splat'
    disposeViewer()
  }
})

onBeforeUnmount(() => {
  disposeViewer()
})

watch(
  () => props.src,
  async (src, prev) => {
    if (!import.meta.client || src === prev) return
    disposeViewer()
    error.value = null
    if (!src || !rootEl.value) return
    try {
      const GaussianSplats3D = await import('@mkkellogg/gaussian-splats-3d')
      const next = new GaussianSplats3D.Viewer({
        rootElement: rootEl.value,
        cameraUp: asVec3(props.cameraUp, [0, -1, -0.6]),
        initialCameraPosition: asVec3(props.cameraPosition, [-1, -4, 6]),
        initialCameraLookAt: asVec3(props.cameraLookAt, [0, 4, 0]),
        sharedMemoryForWorkers: false,
        gpuAcceleratedSort: false,
        showLoadingUI: true,
      })
      viewer = next
      await next.addSplatScene(src, {
        showLoadingUI: true,
        splatAlphaRemovalThreshold: 5,
      })
      next.start()
    } catch (err) {
      console.error('[GS viewer]', err)
      error.value =
        err instanceof Error ? err.message : 'Failed to load gaussian splat'
      disposeViewer()
    }
  },
)
</script>

<style scoped>
.gs-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 60dvh;
  background: #0c0b0a;
  overflow: hidden;
}

.gs-viewer__canvas {
  position: absolute;
  inset: 0;
}

.gs-viewer__canvas :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.gs-viewer__error,
.gs-viewer__empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  padding: 1.5rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.72);
  pointer-events: none;
}
</style>
