<template>
  <div class="webgl-home" :class="{ 'webgl-home--backdrop': backdrop }">
    <div ref="hostEl" class="webgl-home__stage" />
    <template v-if="!backdrop">
      <aside class="webgl-home__debug">
        <p class="webgl-home__load">{{ loadLabel }}</p>
        <label><input v-model="centerOnly" type="checkbox"> Centre column only</label>
        <label><input v-model="plasterOn" type="checkbox"> Plaster grain</label>
        <label><input v-model="wakeOn" type="checkbox"> Cursor colour</label>
        <label><input v-model="backdropOn" type="checkbox"> Backdrop</label>
      </aside>
      <p v-if="status" class="webgl-home__status">{{ status }}</p>
      <div class="webgl-home__scroll" aria-hidden="true" />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Scene, WebGLRenderer } from 'three'

const hostEl = ref<HTMLElement | null>(null)
const status = ref('Loading')
const loadLabel = ref('Loading 0.0s')
const { isDark } = useTheme()
const centerOnly = ref(true)
const plasterOn = ref(true)
const wakeOn = ref(true)
const backdropOn = ref(true)

withDefaults(defineProps<{
  /** Homepage layer: scene only, under the intro and then the slider. */
  backdrop?: boolean
}>(), {
  backdrop: false,
})
let stopScene: (() => void) | null = null
let cancelled = false

onBeforeUnmount(() => {
  cancelled = true
  stopScene?.()
  stopScene = null
})

onMounted(async () => {
  const host = hostEl.value
  if (!host) return
  const startedAt = performance.now()
  const clock = window.setInterval(() => {
    loadLabel.value = `Loading ${((performance.now() - startedAt) / 1000).toFixed(1)}s`
  }, 100)
  const finishClock = (label: string) => {
    window.clearInterval(clock)
    loadLabel.value = label
  }

  const listed = await $fetch<{ model: string | null, plaster: string | null }>('/api/webgl-home')
  if (cancelled) return
  if (!listed.model) {
    finishClock('No model')
    status.value = 'Add the homepage relief to public/webgl/home.'
    return
  }

  const THREE = await import('three')
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
  const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js')

  let renderer: WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
  } catch {
    finishClock('WebGL unavailable')
    status.value = 'WebGL is not available in this browser.'
    return
  }

  renderer.outputColorSpace = THREE.LinearSRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  host.appendChild(renderer.domElement)

  const draco = new DRACOLoader()
  draco.setDecoderPath('/draco/')
  const loader = new GLTFLoader()
  loader.setDRACOLoader(draco)

  let scene: Scene
  let plaster: THREE.Texture | null = null
  try {
    const gltf = await loader.loadAsync(listed.model)
    scene = gltf.scene
    if (listed.plaster) {
      plaster = await new THREE.TextureLoader().loadAsync(listed.plaster)
      plaster.colorSpace = THREE.SRGBColorSpace
      plaster.wrapS = THREE.RepeatWrapping
      plaster.wrapT = THREE.RepeatWrapping
    }
  } catch (error) {
    finishClock('Failed')
    if (!cancelled) status.value = error instanceof Error ? error.message : 'Could not load the relief.'
    renderer.dispose()
    draco.dispose()
    return
  }
  const modelSeconds = (performance.now() - startedAt) / 1000

  if (cancelled) {
    finishClock('Cancelled')
    renderer.dispose()
    draco.dispose()
    renderer.domElement.remove()
    return
  }

  const { createHomeRelief } = await import('~/lib/webgl-app/homeRelief')
  const relief = createHomeRelief(renderer)
  scene.updateMatrixWorld(true)
  const sideMeshes: THREE.Object3D[] = []
  const bounds = new THREE.Box3()
  const world = new THREE.Vector3()
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    const material = mesh.material as THREE.MeshStandardMaterial
    if (!material?.map || !material.emissiveMap) return
    mesh.getWorldPosition(world)
    const centreColumn = Math.abs(world.x) < 7
    if (!centreColumn) {
      mesh.visible = false
      sideMeshes.push(mesh)
    } else {
      bounds.expandByObject(mesh)
    }
    relief.assign(mesh, plaster)
  })
  if (bounds.isEmpty()) bounds.setFromObject(scene)
  scene.add(relief.background)
  const center = bounds.getCenter(new THREE.Vector3())
  const camera = new THREE.PerspectiveCamera(30, 1, 5, 40)

  const resize = () => {
    const width = host.clientWidth || window.innerWidth
    const height = host.clientHeight || window.innerHeight
    renderer.setSize(width, height, false)
    camera.aspect = width / Math.max(1, height)
    camera.updateProjectionMatrix()
  }
  resize()

  relief.resize(host.clientWidth || window.innerWidth, host.clientHeight || window.innerHeight)
  let scrollY = window.scrollY
  let elapsed = 0

  const placeCamera = (scrollDelta: number) => {
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    const progress = Math.min(1, Math.max(0, window.scrollY / scrollable))
    const y = THREE.MathUtils.lerp(bounds.max.y - 4, bounds.min.y + 4, progress)
    camera.position.set(center.x, y, 15)
    camera.lookAt(center.x, y, 0)
    relief.placeBackground(camera.position.x, camera.position.y)
    relief.update(elapsed, scrollDelta)
  }

  status.value = ''
  host.classList.add('is-live')

  const ground = new THREE.Color()
  const groundTarget = new THREE.Color()
  const readGround = () => {
    const raw = getComputedStyle(document.body).backgroundColor
    const parts = raw.match(/[\d.]+/g)
    if (!parts || parts.length < 3) return
    // Keep the CSS sRGB bytes. setStyle() misses space-separated rgb() and would leave the dark fallback.
    groundTarget.r = Number(parts[0]) / 255
    groundTarget.g = Number(parts[1]) / 255
    groundTarget.b = Number(parts[2]) / 255
  }
  readGround()
  ground.copy(groundTarget)
  let themeMix = isDark.value ? 1 : 0
  relief.setTheme(ground, themeMix)
  renderer.setClearColor(ground, 1)

  let frame = 0
  let last = performance.now()
  const loop = (now: number) => {
    frame = requestAnimationFrame(loop)
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    elapsed += dt
    const delta = (window.scrollY - scrollY) / Math.max(1, window.innerHeight)
    scrollY = window.scrollY
    placeCamera(delta)
    for (const mesh of sideMeshes) mesh.visible = !centerOnly.value
    relief.background.visible = backdropOn.value
    relief.layers.plaster = plasterOn.value ? 1 : 0
    relief.layers.wake = wakeOn.value ? 1 : 0
    readGround()
    themeMix += ((isDark.value ? 1 : 0) - themeMix) * 0.08
    ground.lerp(groundTarget, 0.08)
    relief.setTheme(ground, themeMix)
    renderer.setClearColor(ground, 1)
    renderer.render(scene, camera)
    if (loadLabel.value.startsWith('Loading')) {
      const ready = (performance.now() - startedAt) / 1000
      finishClock(`Ready in ${ready.toFixed(1)}s · model ${modelSeconds.toFixed(1)}s`)
    }
  }
  frame = requestAnimationFrame(loop)

  const onResize = () => {
    resize()
    relief.resize(host.clientWidth || window.innerWidth, host.clientHeight || window.innerHeight)
  }
  let lastPointer = 0
  const onPointer = (event: PointerEvent) => {
    const x = event.clientX / window.innerWidth
    const y = 1 - event.clientY / window.innerHeight
    const now = performance.now()
    const dt = Math.max(8, now - lastPointer)
    lastPointer = now
    const parked = relief.pointer.x < -0.5
    relief.velocity.set(
      parked ? 0 : (x - relief.pointer.x) / dt * 8,
      parked ? 0 : (y - relief.pointer.y) / dt * 8,
    )
    const speed = relief.velocity.length()
    if (speed > 0.35) relief.velocity.multiplyScalar(0.35 / speed)
    relief.pointer.set(x, y)
  }
  window.addEventListener('resize', onResize)
  window.addEventListener('pointermove', onPointer)

  stopScene = () => {
    window.clearInterval(clock)
    cancelAnimationFrame(frame)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('pointermove', onPointer)
    relief.dispose()
    renderer.dispose()
    draco.dispose()
    plaster?.dispose()
    renderer.domElement.remove()
  }
})
</script>

<style scoped>
.webgl-home--backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.webgl-home--backdrop .webgl-home__stage {
  position: absolute;
  transform: translateY(0%) scale(1.2);
  transform-origin: center center;
}

.webgl-home__stage {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0;
}

.webgl-home__stage.is-live {
  opacity: 1;
}

.webgl-home__stage :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.webgl-home__debug {
  position: fixed;
  top: 76px;
  left: 16px;
  z-index: 5;
  display: grid;
  gap: 8px;
  width: 220px;
  padding: 14px 14px 12px;
  color: var(--charcoal);
  background: var(--panel-bg);
  font-size: 12px;
  letter-spacing: 0.03em;
}

.webgl-home__load {
  margin: 0 0 4px;
  font-variant-numeric: tabular-nums;
}

.webgl-home__debug label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.webgl-home__status {
  position: fixed;
  left: 24px;
  bottom: 24px;
  z-index: 2;
  max-width: 36rem;
  margin: 0;
  color: var(--charcoal);
  font-size: 13px;
  letter-spacing: 0.04em;
}

.webgl-home__scroll {
  height: 600dvh;
}
</style>
