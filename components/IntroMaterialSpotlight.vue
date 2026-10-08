<template>
  <div
    ref="hostEl"
    class="intro-spotlight"
    :class="{ 'is-in': revealed, 'is-dark': dark, 'is-flat': toPage }"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    revealed?: boolean
    dark?: boolean
    /** Collapse depth so the figure reads as a flat image. */
    flatten?: boolean
    /** Blend the field into the page colour. Used on the way out. */
    toPage?: boolean
    /** Which restaged pose to rise into. Same model, new place. */
    placement?: number
  }>(),
  { revealed: false, dark: false, flatten: false, toPage: false, placement: 0 },
)

const vertexPars = `uniform float uFlat;\nvarying vec3 vWPos;`
const vertexMain = `vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
const normalFlat = `transformedNormal = normalize(mix(transformedNormal, vec3(0.0, 0.0, 1.0), uFlat));`
const fragmentPars = `
  uniform vec3 uHitPoint;
  uniform vec3 uStone;
  uniform vec3 uStoneDark;
  uniform float uActive, uRadius, uSoftness, uDark, uFlat;
  varying vec3 vWPos;
`
const fragmentMain = `
  float d = distance(vWPos, uHitPoint);
  float reveal = 1.0 - smoothstep(uRadius, uRadius + uSoftness, d);
  float mask = reveal * uActive * (1.0 - uFlat);
  float lightMix = mix(1.0, 0.5, mask);
  float darkMix = mix(0.16, 1.0, mask);
  roughnessFactor = mix(mix(0.95, 0.45, mask), 1.0, uFlat);
  metalnessFactor = 1.0 - uFlat;
  vec3 stone = mix(uStone, uStoneDark, uDark);
  diffuseColor.rgb = stone * mix(lightMix, darkMix, uDark);
`

/** Offsets as a fraction of the figure's longest side. */
const PLACEMENTS = [
  { x: 0, y: 0 },
  { x: -0.46, y: 0.2 },
  { x: 0.4, y: -0.18 },
]

const hostEl = ref<HTMLElement | null>(null)
let stopSpotlight: (() => void) | null = null
let cancelled = false

onUnmounted(() => {
  cancelled = true
  stopSpotlight?.()
  stopSpotlight = null
})

onMounted(async () => {
  const host = hostEl.value
  if (!host) return

  const THREE = await import('three')
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
  const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js')
  if (cancelled || !hostEl.value) return

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const config = { radius: 0.15, softness: 0.35, lerp: 0.05 }
  const shaders: { uniforms: Record<string, { value: unknown }> }[] = []
  const uHit = new THREE.Vector3(0, 100, 0)
  const target = new THREE.Vector3(0, 100, 0)
  const mouse = new THREE.Vector2()
  const raycaster = new THREE.Raycaster()
  let model: THREE.Object3D | null = null
  let uActive = 0
  let active = false
  let raf = 0
  let disposed = false

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setClearColor(0xeeeeee)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.65
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  host.appendChild(renderer.domElement)

  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment()).texture
  pmrem.dispose()

  const fit = () => {
    const width = host.clientWidth || 1
    const height = host.clientHeight || 1
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }
  fit()

  const loader = new GLTFLoader()
  loader.load('/models/material-spotlight.glb', (gltf) => {
    if (disposed || cancelled) return
    const modelRoot = gltf.scene
    const box = new THREE.Box3().setFromObject(modelRoot)
    modelRoot.position.sub(box.getCenter(new THREE.Vector3()))
    const size = box.getSize(new THREE.Vector3())
    homeX = modelRoot.position.x
    homeY = modelRoot.position.y
    modelSpan = Math.max(size.x, size.y, size.z) || 1
    const fitFov = 45
    const dist =
      Math.max(size.x, size.y, size.z) /
      (2 * Math.tan((fitFov * Math.PI) / 180 / 2))
    camera.fov = fitFov
    camera.position.set(0, 0, dist * 1.75)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    baseDist = camera.position.z
    if (flat > 0.001) {
      camera.fov = THREE.MathUtils.lerp(fitFov, 8, flat)
      camera.position.z =
        baseDist *
        Math.tan(THREE.MathUtils.degToRad(fitFov) / 2) /
        Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)
      camera.updateProjectionMatrix()
    }

    modelRoot.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (!mesh.isMesh) return
      const material = mesh.material as THREE.MeshStandardMaterial
      material.roughness = 0.95
      material.metalness = 1
      material.onBeforeCompile = (shader) => {
        shader.uniforms.uHitPoint = { value: uHit }
        shader.uniforms.uActive = { value: 0 }
        shader.uniforms.uRadius = { value: config.radius }
        shader.uniforms.uSoftness = { value: config.softness }
        shader.uniforms.uDark = { value: 0 }
        shader.uniforms.uFlat = { value: 0 }
        shader.uniforms.uStone = { value: stone }
        shader.uniforms.uStoneDark = { value: stoneDark }
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', `#include <common>\n${vertexPars}`)
          .replace('#include <defaultnormal_vertex>', `#include <defaultnormal_vertex>\n${normalFlat}`)
          .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\n${vertexMain}`)
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>\n${fragmentPars}`)
          .replace(
            '#include <metalnessmap_fragment>',
            `#include <metalnessmap_fragment>\n${fragmentMain}`,
          )
        shaders.push(shader)
      }
      material.needsUpdate = true
    })
    scene.add(modelRoot)
    model = modelRoot
  })

  const onMove = (event: PointerEvent) => {
    const rect = host.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    active = true
  }
  const onLeave = () => {
    active = false
  }

  if (!reduced) {
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerleave', onLeave)
  }

  const resizeObserver = new ResizeObserver(fit)
  resizeObserver.observe(host)

  const lightClear = new THREE.Color(0xeeeeee)
  const darkClear = new THREE.Color(0x111111)
  const pageClear = new THREE.Color(0xeeeeee)
  const stone = new THREE.Color(0xb9b7ae)
  const stoneDark = new THREE.Color(0xb9b7ae)
  const fieldClear = new THREE.Color()
  const clear = new THREE.Color()
  const cssColor = (name: string, fallback: THREE.Color) => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    if (!raw) return
    try {
      fallback.setStyle(raw)
    } catch {
      /* keep the previous colour if the variable is not a colour yet */
    }
  }
  let theme = props.dark ? 1 : 0
  let flat = props.flatten ? 1 : 0
  let pageBlend = props.toPage ? 1 : 0
  let baseDist = camera.position.z
  let homeX = 0
  let homeY = 0
  let modelSpan = 1
  const baseFov = 45

  const readPageBackground = () => {
    const page = document.querySelector('.home-page')
    const raw = page
      ? getComputedStyle(page).backgroundColor
      : getComputedStyle(document.body).backgroundColor
    if (raw && raw !== 'transparent' && raw !== 'rgba(0, 0, 0, 0)') pageClear.setStyle(raw)
  }

  const animate = () => {
    if (disposed) return
    raf = requestAnimationFrame(animate)
    theme += ((props.dark ? 1 : 0) - theme) * (reduced ? 1 : 0.08)
    const flatTarget = props.flatten ? 1 : 0
    const rising = flatTarget < flat
    flat += (flatTarget - flat) * (reduced ? 1 : rising ? 0.028 : 0.04)
    pageBlend += ((props.toPage ? 1 : 0) - pageBlend) * (reduced ? 1 : 0.04)
    readPageBackground()
    cssColor('--intro-ground-light', lightClear)
    cssColor('--intro-ground-dark', darkClear)
    cssColor('--intro-stone', stone)
    cssColor('--intro-stone-dark', stoneDark)
    fieldClear.copy(lightClear).lerp(darkClear, theme)
    clear.copy(fieldClear).lerp(pageClear, pageBlend)
    renderer.setClearColor(clear, 1)
    if (model) model.scale.z = THREE.MathUtils.lerp(1, 0.012, flat)
    if (model) {
      const pose = PLACEMENTS[Math.min(Math.max(props.placement, 0), PLACEMENTS.length - 1)]!
      const goalX = homeX + pose.x * modelSpan
      const goalY = homeY + pose.y * modelSpan
      const travel = reduced ? 1 : props.toPage ? 0 : flat > 0.82 ? 0.18 : 0
      model.position.x = THREE.MathUtils.lerp(model.position.x, goalX, travel)
      model.position.y = THREE.MathUtils.lerp(model.position.y, goalY, travel)
    }
    const fov = THREE.MathUtils.lerp(baseFov, 8, flat)
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov
      const framed =
        baseDist *
        Math.tan(THREE.MathUtils.degToRad(baseFov) / 2) /
        Math.tan(THREE.MathUtils.degToRad(fov) / 2)
      camera.position.z = framed
      camera.updateProjectionMatrix()
    }
    if (!reduced && flat < 0.98) {
      raycaster.setFromCamera(mouse, camera)
      const hit = model ? raycaster.intersectObject(model, true)[0] : undefined
      if (hit) target.copy(hit.point)
      uHit.lerp(target, config.lerp)
      const hovering = Boolean(hit) && active
      uActive += ((hovering ? 1 : 0) - uActive) * config.lerp
    } else {
      uActive += (0 - uActive) * (reduced ? 1 : 0.08)
    }
    for (const shader of shaders) {
      ;(shader.uniforms.uHitPoint!.value as THREE.Vector3).copy(uHit)
      shader.uniforms.uActive!.value = uActive
      shader.uniforms.uDark!.value = theme
      shader.uniforms.uFlat!.value = flat
    }
    renderer.render(scene, camera)
  }
  animate()

  if (cancelled) {
    disposed = true
    cancelAnimationFrame(raf)
    resizeObserver.disconnect()
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerleave', onLeave)
    scene.environment?.dispose()
    renderer.dispose()
    renderer.domElement.remove()
    return
  }

  stopSpotlight = () => {
    disposed = true
    cancelAnimationFrame(raf)
    resizeObserver.disconnect()
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerleave', onLeave)
    scene.environment?.dispose()
    renderer.dispose()
    renderer.domElement.remove()
    stopSpotlight = null
  }
})
</script>

<style scoped>
.intro-spotlight {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: var(--intro-ground-light, #eee);
  opacity: 0;
  transition:
    opacity 0.55s cubic-bezier(0.25, 0.8, 0.25, 1),
    background 0.45s ease;
}

.intro-spotlight.is-in {
  opacity: 1;
}

.intro-spotlight.is-dark {
  background: var(--intro-ground-dark, #111111);
}

.intro-spotlight.is-flat,
.intro-spotlight.is-dark.is-flat {
  background: var(--cream);
}
</style>
