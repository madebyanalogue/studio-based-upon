import * as THREE from 'three'
import {
  clearPlaneCache,
  generateChunkPlanesCached,
  getChunkUpdateThrottleMs,
  shouldThrottleUpdate,
} from './chunk'
import {
  CHUNK_FADE_MARGIN,
  CHUNK_OFFSETS,
  CHUNK_SIZE,
  CLICK_DRAG_THRESHOLD,
  DEPTH_FADE_END,
  DEPTH_FADE_START,
  INITIAL_CAMERA_Z,
  INVIS_THRESHOLD,
  KEYBOARD_SPEED,
  MAX_VELOCITY,
  RENDER_DISTANCE,
  VELOCITY_DECAY,
  VELOCITY_LERP,
} from './constants'
import { clamp, lerp } from './math'
import { getTexture, setTextureProgressCallback } from './texture-manager'
import type {
  CameraGridState,
  DiscoveryMediaItem,
  InfiniteCanvasSelectPayload,
  PlaneData,
} from './types'

type KeyboardKeys = {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  up: boolean
  down: boolean
}

type ControllerState = {
  velocity: { x: number; y: number; z: number }
  targetVel: { x: number; y: number; z: number }
  basePos: { x: number; y: number; z: number }
  drift: { x: number; y: number }
  mouse: { x: number; y: number }
  lastMouse: { x: number; y: number }
  scrollAccum: number
  isDragging: boolean
  pointerDown: { x: number; y: number } | null
  dragDistance: number
  lastTouches: Touch[]
  lastTouchDist: number
  lastChunkKey: string
  lastChunkUpdate: number
  pendingChunk: { cx: number; cy: number; cz: number } | null
}

type PlaneRuntime = {
  mesh: THREE.Mesh
  material: THREE.MeshBasicMaterial
  plane: PlaneData
  media: DiscoveryMediaItem
  chunkCx: number
  chunkCy: number
  chunkCz: number
  opacity: number
  frame: number
  ready: boolean
}

export type CreateInfiniteCanvasOptions = {
  container: HTMLElement
  media: DiscoveryMediaItem[]
  backgroundColor?: string
  fogColor?: string
  cameraFov?: number
  cameraNear?: number
  cameraFar?: number
  fogNear?: number
  fogFar?: number
  layoutSeed?: number
  onSelect?: (payload: InfiniteCanvasSelectPayload) => void
  onTextureProgress?: (progress: number) => void
}

export type InfiniteCanvasHandle = {
  dispose: () => void
  setMedia: (media: DiscoveryMediaItem[]) => void
  setColors: (background: string, fog: string) => void
  reshuffle: () => void
  resetView: () => void
  /** Show planes that were hidden for Flip open. */
  restoreHiddenPlanes: () => void
  getDebugStats: () => {
    media: number
    planes: number
    ready: number
    visible: number
    camera: { x: number; y: number; z: number }
    sample: Array<{ opacity: number; ready: boolean; visible: boolean; z: number }>
  }
}

const PLANE_GEOMETRY = new THREE.PlaneGeometry(1, 1)

const getTouchDistance = (touches: Touch[]) => {
  if (touches.length < 2) return 0
  const [t1, t2] = touches
  const dx = t1.clientX - t2.clientX
  const dy = t1.clientY - t2.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

const createInitialState = (camZ: number): ControllerState => ({
  velocity: { x: 0, y: 0, z: 0 },
  targetVel: { x: 0, y: 0, z: 0 },
  // Start centered in the origin chunk so the first view isn’t an empty corner.
  basePos: { x: CHUNK_SIZE * 0.5, y: CHUNK_SIZE * 0.5, z: camZ },
  drift: { x: 0, y: 0 },
  mouse: { x: 0, y: 0 },
  lastMouse: { x: 0, y: 0 },
  scrollAccum: 0,
  isDragging: false,
  pointerDown: null,
  dragDistance: 0,
  lastTouches: [],
  lastTouchDist: 0,
  lastChunkKey: '',
  lastChunkUpdate: 0,
  pendingChunk: null,
})

const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0)

export const createInfiniteCanvas = (
  options: CreateInfiniteCanvasOptions,
): InfiniteCanvasHandle => {
  const {
    container,
    cameraFov = 60,
    cameraNear = 1,
    cameraFar = 500,
    fogNear = 120,
    fogFar = 320,
    onSelect,
    onTextureProgress,
  } = options

  let media = options.media.slice()
  let layoutSeed = options.layoutSeed ?? Math.floor(Math.random() * 1_000_000_000)
  let backgroundColor = options.backgroundColor ?? '#f2ecdf'
  let fogColor = options.fogColor ?? '#f2ecdf'

  clearPlaneCache()

  const isTouch = isTouchDevice()
  const dpr = Math.min(window.devicePixelRatio || 1, isTouch ? 1.25 : 1.5)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(backgroundColor)
  scene.fog = new THREE.Fog(fogColor, fogNear, fogFar)

  const camera = new THREE.PerspectiveCamera(cameraFov, 1, cameraNear, cameraFar)
  camera.position.set(CHUNK_SIZE * 0.5, CHUNK_SIZE * 0.5, INITIAL_CAMERA_Z)

  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: 'high-performance',
    alpha: false,
  })
  renderer.setPixelRatio(dpr)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.touchAction = 'none'
  renderer.domElement.style.cursor = 'grab'
  container.appendChild(renderer.domElement)

  const state = createInitialState(INITIAL_CAMERA_Z)
  const cameraGrid: CameraGridState = { cx: 0, cy: 0, cz: 0, camZ: INITIAL_CAMERA_Z }
  const keys: KeyboardKeys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
  }

  const chunkGroups = new Map<string, THREE.Group>()
  const planesByMesh = new Map<THREE.Mesh, PlaneRuntime>()
  /** Meshes hidden while Flip runs so the canvas thumb doesn’t sit under the flyer. */
  const hiddenMeshes = new Set<THREE.Mesh>()
  const raycaster = new THREE.Raycaster()
  const pointerNdc = new THREE.Vector2()
  const planeCorners = [
    new THREE.Vector3(-0.5, -0.5, 0),
    new THREE.Vector3(0.5, -0.5, 0),
    new THREE.Vector3(0.5, 0.5, 0),
    new THREE.Vector3(-0.5, 0.5, 0),
  ]
  const projectedCorner = new THREE.Vector3()

  const getMeshScreenRect = (mesh: THREE.Mesh) => {
    const rect = renderer.domElement.getBoundingClientRect()
    mesh.updateWorldMatrix(true, false)

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const corner of planeCorners) {
      projectedCorner.copy(corner).applyMatrix4(mesh.matrixWorld).project(camera)
      const sx = (projectedCorner.x * 0.5 + 0.5) * rect.width + rect.left
      const sy = (-projectedCorner.y * 0.5 + 0.5) * rect.height + rect.top
      minX = Math.min(minX, sx)
      maxX = Math.max(maxX, sx)
      minY = Math.min(minY, sy)
      maxY = Math.max(maxY, sy)
    }

    return {
      left: minX,
      top: minY,
      width: Math.max(maxX - minX, 1),
      height: Math.max(maxY - minY, 1),
    }
  }

  setTextureProgressCallback(onTextureProgress ?? null)

  const setCursor = (cursor: string) => {
    renderer.domElement.style.cursor = cursor
  }

  const resize = () => {
    const width = container.clientWidth || window.innerWidth
    const height = container.clientHeight || window.innerHeight
    camera.aspect = width / Math.max(height, 1)
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }

  const disposePlane = (runtime: PlaneRuntime) => {
    hiddenMeshes.delete(runtime.mesh)
    planesByMesh.delete(runtime.mesh)
    runtime.material.map = null
    runtime.material.dispose()
    if (runtime.mesh.parent) runtime.mesh.removeFromParent()
  }

  const disposeChunk = (key: string) => {
    const group = chunkGroups.get(key)
    if (!group) return

    // Snapshot children first — disposePlane removes meshes and breaks traverse().
    const meshes: THREE.Mesh[] = []
    for (const child of group.children) {
      if (child instanceof THREE.Mesh) meshes.push(child)
    }
    for (const mesh of meshes) {
      const runtime = planesByMesh.get(mesh)
      if (runtime) disposePlane(runtime)
      else if (mesh.parent) mesh.removeFromParent()
    }

    group.clear()
    if (group.parent) group.removeFromParent()
    chunkGroups.delete(key)
  }

  const createPlaneMesh = (
    plane: PlaneData,
    mediaItem: DiscoveryMediaItem,
    chunkCx: number,
    chunkCy: number,
    chunkCz: number,
  ): PlaneRuntime => {
    const aspect =
      mediaItem.width && mediaItem.height ? mediaItem.width / mediaItem.height : 1
    const displayScale = new THREE.Vector3(plane.scale.y * aspect, plane.scale.y, 1)

    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })

    const mesh = new THREE.Mesh(PLANE_GEOMETRY, material)
    mesh.position.copy(plane.position)
    mesh.scale.copy(displayScale)
    mesh.visible = false
    mesh.userData.slug = mediaItem.slug
    mesh.userData.title = mediaItem.title
    mesh.userData.productId = mediaItem.productId
    mesh.userData.url = mediaItem.url

    const runtime: PlaneRuntime = {
      mesh,
      material,
      plane,
      media: mediaItem,
      chunkCx,
      chunkCy,
      chunkCz,
      opacity: 0,
      frame: 0,
      ready: false,
    }

    getTexture(mediaItem, (tex) => {
      runtime.ready = true
      material.map = tex
      material.needsUpdate = true
    })

    planesByMesh.set(mesh, runtime)
    return runtime
  }

  const ensureChunk = (key: string, cx: number, cy: number, cz: number) => {
    if (chunkGroups.has(key) || !media.length) return

    const group = new THREE.Group()
    group.name = key
    const planes = generateChunkPlanesCached(cx, cy, cz, layoutSeed)

    for (const plane of planes) {
      const mediaItem = media[plane.mediaIndex % media.length]
      if (!mediaItem) continue
      const runtime = createPlaneMesh(plane, mediaItem, cx, cy, cz)
      group.add(runtime.mesh)
    }

    scene.add(group)
    chunkGroups.set(key, group)
  }

  const syncChunks = (cx: number, cy: number, cz: number) => {
    const nextKeys = new Set<string>()
    for (const o of CHUNK_OFFSETS) {
      const key = `${layoutSeed}:${cx + o.dx},${cy + o.dy},${cz + o.dz}`
      nextKeys.add(key)
      ensureChunk(key, cx + o.dx, cy + o.dy, cz + o.dz)
    }
    for (const key of chunkGroups.keys()) {
      if (!nextKeys.has(key)) disposeChunk(key)
    }
  }

  const updatePlaneFades = () => {
    for (const runtime of planesByMesh.values()) {
      const { mesh, material } = runtime

      if (hiddenMeshes.has(mesh)) {
        runtime.opacity = 0
        material.opacity = 0
        material.depthWrite = false
        mesh.visible = false
        continue
      }

      runtime.frame = (runtime.frame + 1) & 1

      if (runtime.opacity < INVIS_THRESHOLD && !mesh.visible && runtime.frame === 0) {
        continue
      }

      const dist = Math.max(
        Math.abs(runtime.chunkCx - cameraGrid.cx),
        Math.abs(runtime.chunkCy - cameraGrid.cy),
        Math.abs(runtime.chunkCz - cameraGrid.cz),
      )
      const absDepth = Math.abs(runtime.plane.position.z - cameraGrid.camZ)

      if (absDepth > DEPTH_FADE_END + 50) {
        runtime.opacity = 0
        material.opacity = 0
        material.depthWrite = false
        mesh.visible = false
        continue
      }

      const gridFade =
        dist <= RENDER_DISTANCE
          ? 1
          : Math.max(0, 1 - (dist - RENDER_DISTANCE) / Math.max(CHUNK_FADE_MARGIN, 0.0001))

      const depthFade =
        absDepth <= DEPTH_FADE_START
          ? 1
          : Math.max(
              0,
              1 -
                (absDepth - DEPTH_FADE_START) /
                  Math.max(DEPTH_FADE_END - DEPTH_FADE_START, 0.0001),
            )

      const target = Math.min(gridFade, depthFade * depthFade)
      runtime.opacity =
        target < INVIS_THRESHOLD && runtime.opacity < INVIS_THRESHOLD
          ? 0
          : lerp(runtime.opacity, target, 0.18)

      if (!runtime.ready) {
        mesh.visible = false
        continue
      }

      const isFullyOpaque = runtime.opacity > 0.99
      material.opacity = isFullyOpaque ? 1 : runtime.opacity
      material.depthWrite = isFullyOpaque
      mesh.visible = runtime.opacity > INVIS_THRESHOLD
    }
  }

  const trySelect = (clientX: number, clientY: number) => {
    if (!onSelect || !media.length) return
    const rect = renderer.domElement.getBoundingClientRect()
    pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1
    pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointerNdc, camera)

    const meshes = Array.from(planesByMesh.keys()).filter((m) => m.visible)
    const hits = raycaster.intersectObjects(meshes, false)
    const hit = hits[0]
    if (!hit?.object || !(hit.object instanceof THREE.Mesh)) return

    const { slug, title, productId, url } = hit.object.userData
    if (!slug) return

    // Hide the clicked plane immediately so Flip doesn’t leave a twin on the canvas.
    hiddenMeshes.add(hit.object)
    hit.object.visible = false
    const runtime = planesByMesh.get(hit.object)
    if (runtime) {
      runtime.opacity = 0
      runtime.material.opacity = 0
      runtime.material.depthWrite = false
    }

    onSelect({
      slug: String(slug),
      title: String(title || ''),
      productId: String(productId || ''),
      url: String(url || ''),
      clientX,
      clientY,
      screenRect: getMeshScreenRect(hit.object),
    })
  }

  const onMouseDown = (e: MouseEvent) => {
    state.isDragging = true
    state.pointerDown = { x: e.clientX, y: e.clientY }
    state.dragDistance = 0
    state.lastMouse = { x: e.clientX, y: e.clientY }
    setCursor('grabbing')
  }

  const onMouseUp = (e: MouseEvent) => {
    const wasClick =
      state.pointerDown && state.dragDistance < CLICK_DRAG_THRESHOLD
    state.isDragging = false
    state.pointerDown = null
    setCursor('grab')
    if (wasClick) trySelect(e.clientX, e.clientY)
  }

  const onMouseLeave = () => {
    state.mouse = { x: 0, y: 0 }
    state.isDragging = false
    state.pointerDown = null
    setCursor('grab')
  }

  const onMouseMove = (e: MouseEvent) => {
    state.mouse = {
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: -(e.clientY / window.innerHeight) * 2 + 1,
    }

    if (state.isDragging) {
      const dx = e.clientX - state.lastMouse.x
      const dy = e.clientY - state.lastMouse.y
      state.dragDistance += Math.abs(dx) + Math.abs(dy)
      state.targetVel.x -= dx * 0.025
      state.targetVel.y += dy * 0.025
      state.lastMouse = { x: e.clientX, y: e.clientY }
    }
  }

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    state.scrollAccum += e.deltaY * 0.006
  }

  const onTouchStart = (e: TouchEvent) => {
    e.preventDefault()
    state.lastTouches = Array.from(e.touches)
    state.lastTouchDist = getTouchDistance(state.lastTouches)
    if (e.touches[0]) {
      state.pointerDown = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      state.dragDistance = 0
    }
    setCursor('grabbing')
  }

  const onTouchMove = (e: TouchEvent) => {
    e.preventDefault()
    const touches = Array.from(e.touches)

    if (touches.length === 1 && state.lastTouches.length >= 1) {
      const [touch] = touches
      const [last] = state.lastTouches
      if (touch && last) {
        const dx = touch.clientX - last.clientX
        const dy = touch.clientY - last.clientY
        state.dragDistance += Math.abs(dx) + Math.abs(dy)
        state.targetVel.x -= dx * 0.02
        state.targetVel.y += dy * 0.02
      }
    } else if (touches.length === 2 && state.lastTouchDist > 0) {
      const dist = getTouchDistance(touches)
      state.scrollAccum += (state.lastTouchDist - dist) * 0.006
      state.lastTouchDist = dist
    }

    state.lastTouches = touches
  }

  const onTouchEnd = (e: TouchEvent) => {
    const wasClick =
      e.touches.length === 0 &&
      state.pointerDown &&
      state.dragDistance < CLICK_DRAG_THRESHOLD
    const point = state.pointerDown

    state.lastTouches = Array.from(e.touches)
    state.lastTouchDist = getTouchDistance(state.lastTouches)
    if (e.touches.length === 0) {
      state.pointerDown = null
      setCursor('grab')
    }

    if (wasClick && point) trySelect(point.x, point.y)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (k === 'w' || k === 'arrowup') keys.forward = true
    if (k === 's' || k === 'arrowdown') keys.backward = true
    if (k === 'a' || k === 'arrowleft') keys.left = true
    if (k === 'd' || k === 'arrowright') keys.right = true
    if (k === 'e') keys.up = true
    if (k === 'q') keys.down = true
  }

  const onKeyUp = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (k === 'w' || k === 'arrowup') keys.forward = false
    if (k === 's' || k === 'arrowdown') keys.backward = false
    if (k === 'a' || k === 'arrowleft') keys.left = false
    if (k === 'd' || k === 'arrowright') keys.right = false
    if (k === 'e') keys.up = false
    if (k === 'q') keys.down = false
  }

  const canvas = renderer.domElement
  canvas.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('mousemove', onMouseMove)
  canvas.addEventListener('mouseleave', onMouseLeave)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('touchstart', onTouchStart, { passive: false })
  canvas.addEventListener('touchmove', onTouchMove, { passive: false })
  canvas.addEventListener('touchend', onTouchEnd, { passive: false })
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('resize', resize)

  const frameNearestPlane = () => {
    const planes = generateChunkPlanesCached(0, 0, 0, layoutSeed)
    if (!planes.length) return
    const preferred =
      planes.find((p) => p.position.z < state.basePos.z - 10) || planes[0]
    state.basePos.x = preferred.position.x
    state.basePos.y = preferred.position.y
    state.basePos.z = preferred.position.z + 36
    camera.position.set(state.basePos.x, state.basePos.y, state.basePos.z)
  }

  resize()
  frameNearestPlane()
  syncChunks(
    Math.floor(state.basePos.x / CHUNK_SIZE),
    Math.floor(state.basePos.y / CHUNK_SIZE),
    Math.floor(state.basePos.z / CHUNK_SIZE),
  )

  let rafId = 0
  let disposed = false

  const tick = () => {
    if (disposed) return
    rafId = requestAnimationFrame(tick)

    if (keys.forward) state.targetVel.z -= KEYBOARD_SPEED
    if (keys.backward) state.targetVel.z += KEYBOARD_SPEED
    if (keys.left) state.targetVel.x -= KEYBOARD_SPEED
    if (keys.right) state.targetVel.x += KEYBOARD_SPEED
    if (keys.down) state.targetVel.y -= KEYBOARD_SPEED
    if (keys.up) state.targetVel.y += KEYBOARD_SPEED

    const isZooming = Math.abs(state.velocity.z) > 0.05
    const zoomFactor = clamp(state.basePos.z / 50, 0.3, 2.0)
    const driftAmount = 8.0 * zoomFactor
    const driftLerp = isZooming ? 0.2 : 0.12

    if (!state.isDragging) {
      if (isTouch) {
        state.drift.x = lerp(state.drift.x, 0, driftLerp)
        state.drift.y = lerp(state.drift.y, 0, driftLerp)
      } else {
        state.drift.x = lerp(state.drift.x, state.mouse.x * driftAmount, driftLerp)
        state.drift.y = lerp(state.drift.y, state.mouse.y * driftAmount, driftLerp)
      }
    }

    state.targetVel.z += state.scrollAccum
    state.scrollAccum *= 0.8

    state.targetVel.x = clamp(state.targetVel.x, -MAX_VELOCITY, MAX_VELOCITY)
    state.targetVel.y = clamp(state.targetVel.y, -MAX_VELOCITY, MAX_VELOCITY)
    state.targetVel.z = clamp(state.targetVel.z, -MAX_VELOCITY, MAX_VELOCITY)

    state.velocity.x = lerp(state.velocity.x, state.targetVel.x, VELOCITY_LERP)
    state.velocity.y = lerp(state.velocity.y, state.targetVel.y, VELOCITY_LERP)
    state.velocity.z = lerp(state.velocity.z, state.targetVel.z, VELOCITY_LERP)

    state.basePos.x += state.velocity.x
    state.basePos.y += state.velocity.y
    state.basePos.z += state.velocity.z

    camera.position.set(
      state.basePos.x + state.drift.x,
      state.basePos.y + state.drift.y,
      state.basePos.z,
    )

    state.targetVel.x *= VELOCITY_DECAY
    state.targetVel.y *= VELOCITY_DECAY
    state.targetVel.z *= VELOCITY_DECAY

    const cx = Math.floor(state.basePos.x / CHUNK_SIZE)
    const cy = Math.floor(state.basePos.y / CHUNK_SIZE)
    const cz = Math.floor(state.basePos.z / CHUNK_SIZE)
    cameraGrid.cx = cx
    cameraGrid.cy = cy
    cameraGrid.cz = cz
    cameraGrid.camZ = state.basePos.z

    const key = `${cx},${cy},${cz}`
    if (key !== state.lastChunkKey) {
      state.pendingChunk = { cx, cy, cz }
      state.lastChunkKey = key
    }

    const now = performance.now()
    const throttleMs = getChunkUpdateThrottleMs(isZooming, Math.abs(state.velocity.z))
    if (state.pendingChunk && shouldThrottleUpdate(state.lastChunkUpdate, throttleMs, now)) {
      const pending = state.pendingChunk
      state.pendingChunk = null
      state.lastChunkUpdate = now
      syncChunks(pending.cx, pending.cy, pending.cz)
    }

    updatePlaneFades()
    renderer.render(scene, camera)
  }

  rafId = requestAnimationFrame(tick)

  const clearChunks = () => {
    for (const key of [...chunkGroups.keys()]) disposeChunk(key)
  }

  const rebuildAroundCamera = () => {
    clearChunks()
    clearPlaneCache()
    const cx = Math.floor(state.basePos.x / CHUNK_SIZE)
    const cy = Math.floor(state.basePos.y / CHUNK_SIZE)
    const cz = Math.floor(state.basePos.z / CHUNK_SIZE)
    state.lastChunkKey = `${cx},${cy},${cz}`
    state.pendingChunk = null
    syncChunks(cx, cy, cz)
  }

  return {
    dispose: () => {
      disposed = true
      cancelAnimationFrame(rafId)
      setTextureProgressCallback(null)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseleave', onMouseLeave)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('resize', resize)
      clearChunks()
      renderer.dispose()
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement)
      }
    },
    setMedia: (next) => {
      media = next.slice()
      rebuildAroundCamera()
    },
    setColors: (background, fog) => {
      backgroundColor = background
      fogColor = fog
      scene.background = new THREE.Color(backgroundColor)
      if (scene.fog instanceof THREE.Fog) {
        scene.fog.color.set(fogColor)
      }
    },
    reshuffle: () => {
      layoutSeed += 1
      rebuildAroundCamera()
    },
    resetView: () => {
      state.velocity = { x: 0, y: 0, z: 0 }
      state.targetVel = { x: 0, y: 0, z: 0 }
      state.drift = { x: 0, y: 0 }
      state.scrollAccum = 0
      hiddenMeshes.clear()
      frameNearestPlane()
      rebuildAroundCamera()
    },
    restoreHiddenPlanes: () => {
      hiddenMeshes.clear()
    },
    getDebugStats: () => {
      const runtimes = [...planesByMesh.values()]
      const visible = runtimes.filter((r) => r.mesh.visible)
      return {
        media: media.length,
        planes: runtimes.length,
        ready: runtimes.filter((r) => r.ready).length,
        visible: visible.length,
        camera: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        },
        sample: visible.slice(0, 8).map((r) => {
          const img = r.material.map?.image as HTMLImageElement | undefined
          return {
            opacity: r.opacity,
            matOpacity: r.material.opacity,
            ready: r.ready,
            visible: r.mesh.visible,
            pos: {
              x: +r.plane.position.x.toFixed(1),
              y: +r.plane.position.y.toFixed(1),
              z: +r.plane.position.z.toFixed(1),
            },
            scale: {
              x: +r.mesh.scale.x.toFixed(1),
              y: +r.mesh.scale.y.toFixed(1),
            },
            map: img
              ? { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height, src: String(img.src || '').slice(0, 80) }
              : null,
          }
        }),
      }
    },
  }
}
