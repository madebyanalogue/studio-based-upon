<template>
  <div class="webgl-metallic" :class="{ 'is-dark': isDark }">
    <div ref="hostEl" class="webgl-metallic__stage" />
    <aside class="webgl-metallic__debug">
      <p class="webgl-metallic__load">{{ loadLabel }}</p>
      <button
        type="button"
        class="webgl-metallic__theme"
        :aria-pressed="isDark"
        :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="toggleTheme"
      >
        {{ isDark ? 'Dark' : 'Light' }}
        <span aria-hidden="true">→ {{ isDark ? 'Light' : 'Dark' }}</span>
      </button>
      <label>
        <input v-model="useHomeRelief" type="checkbox" />
        Home relief (experimental)
      </label>
      <label>
        Radius
        <input v-model.number="radius" type="range" min="0.05" max="0.5" step="0.01" />
        <span>{{ radius.toFixed(2) }}</span>
      </label>
      <label>
        Softness
        <input v-model.number="softness" type="range" min="0.05" max="0.6" step="0.01" />
        <span>{{ softness.toFixed(2) }}</span>
      </label>
    </aside>
    <p v-if="status" class="webgl-metallic__status">{{ status }}</p>
  </div>
</template>

<script setup lang="ts">
import type { Mesh, MeshStandardMaterial, Object3D, Scene, Shader, WebGLRenderer } from 'three'

/**
 * Cursor-driven turn-to-metal — matches the codegrid / old-intro spotlight demo.
 * Default model is material-spotlight.glb (same asset as the demo).
 * Home relief is optional: wrong scale/maps for this effect, kept for comparison.
 */

const SPOTLIGHT_MODEL = '/models/material-spotlight.glb'
/** Prefer the high-res home relief (API may still list low). */
const HOME_RELIEF_MODEL = '/webgl/reliefs_high_compressed.glb'
/** Page / stage ground — model rests as this same flat fill. */
const GROUND_LIGHT = 0xdddcd7
const GROUND_DARK = 0x111111

const { isDark, toggleTheme } = useTheme()
const groundHex = () => (isDark.value ? GROUND_DARK : GROUND_LIGHT)

const vertexPars = `varying vec3 vWPos;`
const vertexMain = `vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
const fragmentPars = `
  uniform vec3 uHitPoint;
  uniform float uActive, uRadius, uSoftness;
  varying vec3 vWPos;
`
/** Exact mix from the codegrid demo — matte stone at rest, metal under cursor. */
const fragmentMain = `
  float d = distance(vWPos, uHitPoint);
  float reveal = 1.0 - smoothstep(uRadius, uRadius + uSoftness, d);
  float mask = reveal * uActive;
  roughnessFactor = mix(0.95, 0.45, mask);
  diffuseColor.rgb *= mix(1.0, 0.5, mask);
`

const hostEl = ref<HTMLElement | null>(null)
const status = ref('Loading')
const loadLabel = ref('Loading 0.0s')
const useHomeRelief = ref(false)
const radius = ref(0.15)
const softness = ref(0.35)

let stopScene: (() => void) | null = null
let cancelled = false
let reloadToken = 0

onBeforeUnmount(() => {
  cancelled = true
  stopScene?.()
  stopScene = null
})

watch(useHomeRelief, () => {
  void boot()
})

/** Live scene paint targets (set in boot). */
let applyGround: ((hex: number) => void) | null = null

watch(isDark, () => {
  applyGround?.(groundHex())
})

onMounted(() => {
  void boot()
})

const boot = async () => {
  const host = hostEl.value
  if (!host) return
  const token = ++reloadToken
  cancelled = false
  stopScene?.()
  stopScene = null
  status.value = 'Loading'
  loadLabel.value = 'Loading 0.0s'

  const startedAt = performance.now()
  const clock = window.setInterval(() => {
    if (token !== reloadToken) return
    loadLabel.value = `Loading ${((performance.now() - startedAt) / 1000).toFixed(1)}s`
  }, 100)
  const finishClock = (label: string) => {
    window.clearInterval(clock)
    if (token === reloadToken) loadLabel.value = label
  }

  const modelUrl = useHomeRelief.value ? HOME_RELIEF_MODEL : SPOTLIGHT_MODEL

  const THREE = await import('three')
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
  const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js')
  const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js')
  const { mergeVertices } = await import(
    'three/examples/jsm/utils/BufferGeometryUtils.js'
  )
  if (token !== reloadToken || cancelled) return

  let renderer: WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  } catch {
    finishClock('WebGL unavailable')
    status.value = 'WebGL is not available in this browser.'
    return
  }

  // Match demo renderer setup.
  renderer.setClearColor(groundHex())
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.65
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  host.appendChild(renderer.domElement)

  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = pmrem.fromScene(new RoomEnvironment()).texture
  pmrem.dispose()

  const draco = new DRACOLoader()
  draco.setDecoderPath('/draco/')
  const loader = new GLTFLoader()
  loader.setDRACOLoader(draco)

  let model: Object3D
  try {
    const gltf = await loader.loadAsync(modelUrl)
    if (token !== reloadToken || cancelled) {
      environment.dispose()
      renderer.dispose()
      draco.dispose()
      renderer.domElement.remove()
      return
    }
    model = gltf.scene
  } catch (error) {
    finishClock('Failed')
    status.value = error instanceof Error ? error.message : 'Could not load the model.'
    environment.dispose()
    renderer.dispose()
    draco.dispose()
    return
  }

  const ground = groundHex()
  const scene: Scene = new THREE.Scene()
  scene.background = new THREE.Color(ground)
  scene.environment = environment
  scene.add(model)
  renderer.setClearColor(ground, 1)

  const stoneMaterials: MeshStandardMaterial[] = []
  applyGround = (hex: number) => {
    scene.background = new THREE.Color(hex)
    renderer.setClearColor(hex, 1)
    for (const mat of stoneMaterials) {
      mat.color.set(hex)
      mat.needsUpdate = true
    }
  }

  // Home relief: keep the centre column only, then frame that.
  if (useHomeRelief.value) {
    const world = new THREE.Vector3()
    model.updateMatrixWorld(true)
    model.traverse((node) => {
      const mesh = node as Mesh
      if (!mesh.isMesh) return
      mesh.getWorldPosition(world)
      if (Math.abs(world.x) > 7) mesh.visible = false
    })
  }

  const box = new THREE.Box3()
  model.updateMatrixWorld(true)
  model.traverse((node) => {
    const mesh = node as Mesh
    if (mesh.isMesh && mesh.visible) box.expandByObject(mesh)
  })
  if (box.isEmpty()) box.setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  model.position.sub(center)

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200)
  const span = Math.max(size.x, size.y, size.z) || 1

  /** Cover-style frame: fill the viewport (crop edges) rather than letterbox. */
  const frameCover = () => {
    const width = host.clientWidth || window.innerWidth
    const height = Math.max(1, host.clientHeight || window.innerHeight)
    camera.aspect = width / height
    const vFov = THREE.MathUtils.degToRad(camera.fov)
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect)
    const distH = size.y / 2 / Math.tan(vFov / 2)
    const distW = size.x / 2 / Math.tan(hFov / 2)
    // min = cover fill; pad < 1 zooms in further.
    const coverDist = Math.min(distH, distW)
    // Home relief: 0.9 ≈ previous fill × 0.8 (20% smaller on screen).
    const pad = useHomeRelief.value ? 0.9 : 1.75
    // Spotlight demo uses contain-style fit × 1.75, not cover.
    const dist = useHomeRelief.value
      ? Math.max(0.5, coverDist * pad)
      : span / (2 * Math.tan(vFov / 2)) * pad
    camera.near = Math.max(0.05, dist / 100)
    camera.far = dist * 20
    camera.position.set(0, 0, dist)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }

  // Spotlight radius is in world units — scale up for the huge relief.
  const radiusScale = useHomeRelief.value ? Math.max(1, span * 0.045) : 1
  if (useHomeRelief.value) {
    radius.value = Math.min(12, 0.15 * radiusScale)
    softness.value = Math.min(8, 0.35 * radiusScale)
  } else {
    radius.value = 0.15
    softness.value = 0.35
  }

  const shaders: Shader[] = []
  const config = { lerp: 0.05 }

  model.traverse((node) => {
    const mesh = node as Mesh
    if (!mesh.isMesh) return

    // Drop baked maps from the source material — home relief stores dark
    // height/AO bakes in map + emissiveMap for the plaster shader; keeping
    // any of them (even as bump) pulls the resting tone off the ground.
    const source = mesh.material as MeshStandardMaterial | MeshStandardMaterial[]
    const sources = Array.isArray(source) ? source : source ? [source] : []
    for (const mat of sources) {
      mat.map = null
      mat.emissiveMap = null
      mat.normalMap = null
      mat.bumpMap = null
      mat.roughnessMap = null
      mat.metalnessMap = null
      mat.aoMap = null
      mat.emissive?.set(0x000000)
      mat.color?.set(ground)
    }

    // Home relief GLBs ship without normals — weld + smooth like the demo.
    if (useHomeRelief.value && mesh.geometry) {
      mesh.geometry = mergeVertices(mesh.geometry, 1e-4)
      mesh.geometry.computeVertexNormals()
    }

    // Same uniform ground stone as the spotlight demo (no texture inherit).
    const material = new THREE.MeshStandardMaterial({
      color: ground,
      roughness: 0.95,
      metalness: 1,
      envMapIntensity: 1,
      flatShading: false,
    })
    stoneMaterials.push(material)
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uHitPoint = { value: new THREE.Vector3(0, 100, 0) }
      shader.uniforms.uActive = { value: 0 }
      shader.uniforms.uRadius = { value: radius.value }
      shader.uniforms.uSoftness = { value: softness.value }
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${vertexPars}`)
        .replace(
          '#include <worldpos_vertex>',
          `#include <worldpos_vertex>\n${vertexMain}`,
        )
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${fragmentPars}`)
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>\n${fragmentMain}`,
        )
      shaders.push(shader)
    }
    material.needsUpdate = true
    mesh.material = material
  })

  const resize = () => frameCover()
  resize()

  const uHit = new THREE.Vector3(0, 100, 0)
  const target = new THREE.Vector3(0, 100, 0)
  const mouse = new THREE.Vector2()
  const raycaster = new THREE.Raycaster()
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  const planeHit = new THREE.Vector3()
  let uActive = 0
  let active = false
  let frame = 0
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  status.value = ''
  host.classList.add('is-live')
  finishClock(`Ready · ${useHomeRelief.value ? 'home relief' : 'spotlight model'}`)

  const loop = () => {
    if (token !== reloadToken) return
    frame = requestAnimationFrame(loop)

    raycaster.setFromCamera(mouse, camera)
    // Demo uses a Z-plane hit; mesh hit is more accurate on deep relief.
    if (useHomeRelief.value) {
      const hit = raycaster.intersectObject(model, true)[0]
      if (hit) target.copy(hit.point)
    } else if (raycaster.ray.intersectPlane(plane, planeHit)) {
      target.copy(planeHit)
    }

    uHit.lerp(target, config.lerp)
    uActive += ((active && !reduced ? 1 : 0) - uActive) * config.lerp

    for (const shader of shaders) {
      ;(shader.uniforms.uHitPoint!.value as THREE.Vector3).copy(uHit)
      shader.uniforms.uActive!.value = uActive
      shader.uniforms.uRadius!.value = radius.value
      shader.uniforms.uSoftness!.value = softness.value
    }

    renderer.render(scene, camera)
  }
  frame = requestAnimationFrame(loop)

  const onResize = () => resize()
  const onPointer = (event: PointerEvent) => {
    const rect = host.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    active = true
  }
  const onLeave = () => {
    active = false
  }

  window.addEventListener('resize', onResize)
  window.addEventListener('pointermove', onPointer)
  window.addEventListener('pointerleave', onLeave)

  stopScene = () => {
    applyGround = null
    window.clearInterval(clock)
    cancelAnimationFrame(frame)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('pointermove', onPointer)
    window.removeEventListener('pointerleave', onLeave)
    host.classList.remove('is-live')
    environment.dispose()
    renderer.dispose()
    draco.dispose()
    renderer.domElement.remove()
  }
}
</script>

<style scoped>
.webgl-metallic {
  min-height: 100dvh;
  background: #dddcd7; /* GROUND_LIGHT */
}

.webgl-metallic.is-dark {
  background: #111111; /* GROUND_DARK */
}

.webgl-metallic__stage {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0;
}

.webgl-metallic__stage.is-live {
  opacity: 1;
}

.webgl-metallic__stage :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.webgl-metallic__debug {
  position: fixed;
  top: 76px;
  left: 16px;
  z-index: 5;
  display: grid;
  gap: 8px;
  width: 240px;
  padding: 14px 14px 12px;
  color: #222;
  background: rgba(255, 255, 255, 0.82);
  font-size: 12px;
  letter-spacing: 0.03em;
}

.webgl-metallic.is-dark .webgl-metallic__debug {
  color: #f1ede4;
  background: rgba(31, 28, 24, 0.88);
}

.webgl-metallic__theme {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin: 0;
  padding: 0.4rem 0.45rem;
  border: 1px solid rgba(0, 0, 0, 0.14);
  background: rgba(0, 0, 0, 0.04);
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  cursor: pointer;
  text-align: left;
}

.webgl-metallic__theme span {
  opacity: 0.55;
}

.webgl-metallic.is-dark .webgl-metallic__theme {
  border-color: rgba(241, 237, 228, 0.28);
  background: rgba(241, 237, 228, 0.08);
}

.webgl-metallic__load {
  margin: 0 0 4px;
  font-variant-numeric: tabular-nums;
}

.webgl-metallic__debug label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.webgl-metallic__debug input[type='range'] {
  flex: 1;
  min-width: 0;
}

.webgl-metallic__status {
  position: fixed;
  left: 24px;
  bottom: 24px;
  z-index: 2;
  max-width: 36rem;
  margin: 0;
  color: #222;
  font-size: 13px;
  letter-spacing: 0.04em;
}

.webgl-metallic.is-dark .webgl-metallic__status {
  color: #f1ede4;
}
</style>
