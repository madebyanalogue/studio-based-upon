<template>
  <div class="webgl-scenes">
    <div ref="hostEl" class="webgl-scenes__stage" />
    <p v-if="status" class="webgl-scenes__status">{{ status }}</p>
    <div class="webgl-scenes__scroll" aria-hidden="true">
      <section v-for="file in files" :key="file" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnimationClip, AnimationMixer, PerspectiveCamera, Scene, WebGLRenderer } from 'three'

const files = ref<string[]>([])

const hostEl = ref<HTMLElement | null>(null)
const status = ref('Loading')
let stopScene: (() => void) | null = null
let cancelled = false

onBeforeUnmount(() => {
  cancelled = true
  stopScene?.()
  stopScene = null
})

type Shot = {
  scene: Scene
  camera: PerspectiveCamera
  mixer: AnimationMixer | null
}

onMounted(async () => {
  const host = hostEl.value
  if (!host) return

  const FALLBACK = [
    '/webgl/webgl-01-fish.glb',
    '/webgl/webgl-02-butterfly.glb',
    '/webgl/webgl-03-bird.glb',
    '/webgl/webgl-04-woodpecker.glb',
    '/webgl/webgl-05-toad.glb',
    '/webgl/webgl-06-turle.glb',
    '/webgl/webgl-07-dragonfly.glb',
  ]
  let listed: string[] = []
  try {
    listed = await $fetch<string[]>('/api/webgl-scenes')
  } catch {
    listed = FALLBACK
  }
  if (!listed.length) listed = FALLBACK
  // Lab brief: feature model 2 only (second GLB in the sorted list).
  files.value = listed.length > 1 ? [listed[1]!] : listed.slice(0, 1)
  if (cancelled || !files.value.length) {
    status.value = 'No scenes in public/webgl.'
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
    status.value = 'WebGL is not available in this browser.'
    return
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping
  renderer.setClearColor(0x000000, 1)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  host.appendChild(renderer.domElement)

  const draco = new DRACOLoader()
  draco.setDecoderPath('/draco/')
  const loader = new GLTFLoader()
  loader.setDRACOLoader(draco)

  const shots: Shot[] = []
  const authoredFov = 0.6509917361266738

  const hideHelpers = (root: Scene) => {
    root.traverse((obj) => {
      const label = `${obj.name} ${obj.userData?.name || ''}`
      if (/number|proxy|curve/i.test(label)) {
        obj.visible = false
        return
      }
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      if (materials.some((material) => /nmbr|number/i.test(material?.name || ''))) mesh.visible = false
    })
  }

  const frameCamera = (root: Scene) => {
    root.updateMatrixWorld(true)
    const box = new THREE.Box3()
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      if (/^(fog|number|proxy)/i.test(mesh.name)) return
      box.expandByObject(mesh)
    })
    const camera = new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(authoredFov), 1, 0.1, 100)
    if (box.isEmpty()) {
      camera.position.set(2, 0.2, 0)
      camera.lookAt(0, 0, 0)
    } else {
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const radius = Math.max(size.y, size.z, 0.05) * 0.55
      const dist = radius / Math.tan(authoredFov / 2)
      camera.position.set(center.x + dist * 1.2, center.y, center.z)
      camera.near = Math.max(0.01, dist / 100)
      camera.far = dist * 40
      camera.lookAt(center)
    }
    root.add(camera)
    return camera
  }

  const clipRank = (name: string) => {
    if (name === 'COMBINED') return 0
    if (name.startsWith('BAKED')) return 1
    if (name.startsWith('KEYFRAMES') || name.startsWith('ANIMATION')) return 2
    if (name.startsWith('ArmatureAction')) return 3
    if (name.startsWith('Armature')) return 4
    if (name.startsWith('Action')) return 5
    return 6
  }

  const clipsToPlay = (animations: AnimationClip[]) => {
    const ranked = [...animations].sort((a, b) => clipRank(a.name) - clipRank(b.name) || a.name.localeCompare(b.name))
    const claimed = new Set<string>()
    const play: string[] = []
    for (const clip of ranked) {
      const tracks = clip.tracks.map((track) => track.name)
      if (tracks.some((name) => claimed.has(name))) continue
      play.push(clip.name)
      for (const name of tracks) claimed.add(name)
    }
    return play
  }

  try {
    for (const url of files.value) {
      const gltf = await loader.loadAsync(url)
      const scene = gltf.scene
      hideHelpers(scene)
      scene.add(new THREE.AmbientLight(0xffffff, Math.PI))

      let camera = gltf.cameras.find((cam): cam is PerspectiveCamera => cam instanceof THREE.PerspectiveCamera)
      if (!camera) camera = frameCamera(scene)

      let mixer: AnimationMixer | null = null
      const play = clipsToPlay(gltf.animations)
      if (play.length) {
        mixer = new THREE.AnimationMixer(scene)
        for (const clip of gltf.animations) {
          if (!play.includes(clip.name)) continue
          mixer.clipAction(clip).play()
        }
      }

      shots.push({ scene, camera, mixer })
      if (cancelled) break
    }
  } catch (error) {
    if (cancelled) return
    status.value = error instanceof Error ? error.message : 'Could not load the scenes.'
    renderer.dispose()
    draco.dispose()
    return
  }

  if (cancelled) {
    renderer.dispose()
    draco.dispose()
    renderer.domElement.remove()
    return
  }

  status.value = ''
  host.classList.add('is-live')

  const resize = () => {
    const width = host.clientWidth || window.innerWidth
    const height = host.clientHeight || window.innerHeight
    renderer.setSize(width, height, false)
    for (const shot of shots) {
      shot.camera.aspect = width / Math.max(1, height)
      shot.camera.updateProjectionMatrix()
    }
  }
  resize()

  const activeIndex = () => {
    const height = Math.max(1, window.innerHeight)
    const index = Math.floor(window.scrollY / height)
    return Math.min(shots.length - 1, Math.max(0, index))
  }

  let frame = 0
  let last = performance.now()
  const loop = (now: number) => {
    frame = requestAnimationFrame(loop)
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const shot = shots[activeIndex()]
    if (!shot) return
    for (const item of shots) item.mixer?.update(dt)
    shot.scene.updateMatrixWorld()
    renderer.render(shot.scene, shot.camera)
  }
  frame = requestAnimationFrame(loop)

  const onResize = () => resize()
  window.addEventListener('resize', onResize)

  stopScene = () => {
    cancelAnimationFrame(frame)
    window.removeEventListener('resize', onResize)
    renderer.dispose()
    draco.dispose()
    renderer.domElement.remove()
  }
})
</script>

<style scoped>
.webgl-scenes__stage {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0;
}

.webgl-scenes__stage.is-live {
  opacity: 1;
}

.webgl-scenes__stage :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.webgl-scenes__status {
  position: fixed;
  left: 24px;
  bottom: 24px;
  z-index: 2;
  margin: 0;
  color: rgba(241, 237, 228, 0.72);
  font-size: 13px;
  letter-spacing: 0.04em;
}

.webgl-scenes__scroll section {
  height: 100dvh;
}
</style>
