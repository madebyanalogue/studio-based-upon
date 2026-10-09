import gsap from 'gsap'
import * as THREE from 'three'
import {
  generateChunkPlanesCached,
  getChunkUpdateThrottleMs,
  shouldThrottleUpdate,
} from '~/lib/infinite-canvas/chunk'
import {
  CHUNK_FADE_MARGIN,
  CHUNK_OFFSETS,
  CHUNK_SIZE,
  DEPTH_FADE_END,
  DEPTH_FADE_START,
  INITIAL_CAMERA_Z,
  INVIS_THRESHOLD,
  MAX_VELOCITY,
  RENDER_DISTANCE,
  VELOCITY_DECAY,
  VELOCITY_LERP,
} from '~/lib/infinite-canvas/constants'
import { clamp, lerp, seededRandom } from '~/lib/infinite-canvas/math'
import { getTexture, setTextureProgressCallback } from '~/lib/infinite-canvas/texture-manager'
import type { DiscoveryMediaItem } from '~/lib/infinite-canvas/types'

const FOV = 60
const CLICK_DRAG = 6
/** Shared with the kebab open so the field leaves as the row grows. */
export const D3_REVEAL_S = 0.95
export const D3_REVEAL_EASE = 'power3.inOut'
const PLANE_GEOMETRY = new THREE.PlaneGeometry(1, 1)

export type D3ScreenRect = {
  left: number
  top: number
  width: number
  height: number
}

export type D3Mode = 'surrender' | 'control'

export type D3SelectPayload = {
  id: string
  slug: string
  title: string
  productId: string
  url: string
  displayUrl?: string
  frameId?: string
  imageIndex?: number
  itemType?: string
  width: number
  height: number
  screenRect: D3ScreenRect
}

type PlaneRuntime = {
  id: string
  mesh: THREE.Mesh
  material: THREE.MeshBasicMaterial
  opacity: number
  ready: boolean
  hidden: boolean
  homeX: number
  homeY: number
  homeZ: number
  homeScaleX: number
  homeScaleY: number
  chunkCx: number
  chunkCy: number
  chunkCz: number
  /** Spawned for the control grid when the frame is not already in a chunk. */
  ephemeral?: boolean
}

export type D3CanvasHandle = {
  dispose: () => void
  setMedia: (media: DiscoveryMediaItem[]) => void
  setColors: (background: string, fog: string) => void
  /** Hide every copy of a gathered frame, including chunks that load later. */
  conceal: (frameId: string) => void
  /** Let a removed frame back into the field. */
  reveal: (frameId: string) => void
  /** Replace the concealed set from the selection pile. */
  syncConcealed: (frameIds: string[]) => void
  setMode: (mode: D3Mode) => void
  /** 0 fades images out quickly. 1 keeps them visible much further into the field. */
  setImagePresence: (value: number) => void
  /** Live screen box for a plane, used so a gather starts on the thumbnail. */
  screenRectFor: (id: string) => D3ScreenRect | null
  /** Push remaining planes away from the screen centre and stop depth travel. */
  disperse: (duration?: number) => void
  /** Bring dispersed planes home and resume depth travel. */
  recall: (duration?: number) => void
  getDebugStats: () => {
    planes: number
    visible: number
    camera: { x: number; y: number; z: number }
    field: { halfW: number; halfH: number }
    rowMode: boolean
    spread: number
    /** 1 at rest. Shrinks while the field disperses. */
    scale: number
  }
  /** A point on a visible plane, for interaction checks. */
  visiblePoint: () => { x: number; y: number; id: string } | null
}

export type CreateD3CanvasOptions = {
  container: HTMLElement
  media: DiscoveryMediaItem[]
  backgroundColor?: string
  fogColor?: string
  onSelect?: (payload: D3SelectPayload) => void
  onClose?: () => void
  onHover?: (payload: D3SelectPayload | null) => void
  onTextureProgress?: (progress: number) => void
}

const planeCorners = [
  new THREE.Vector3(-0.5, -0.5, 0),
  new THREE.Vector3(0.5, -0.5, 0),
  new THREE.Vector3(0.5, 0.5, 0),
  new THREE.Vector3(-0.5, 0.5, 0),
]

export const createD3Canvas = (options: CreateD3CanvasOptions): D3CanvasHandle => {
  const { container, onSelect, onClose, onHover, onTextureProgress } = options
  let media = options.media.slice()
  let layoutSeed = Math.floor(Math.random() * 1_000_000)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(options.backgroundColor ?? '#F1EDE4')
  scene.fog = new THREE.Fog(options.fogColor ?? '#F1EDE4', 120, 320)

  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 500)
  camera.position.set(CHUNK_SIZE * 0.5, CHUNK_SIZE * 0.5, INITIAL_CAMERA_Z)

  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: 'high-performance',
    alpha: false,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.touchAction = 'none'
  container.appendChild(renderer.domElement)

  const state = {
    x: CHUNK_SIZE * 0.5,
    y: CHUNK_SIZE * 0.5,
    z: INITIAL_CAMERA_Z,
    vx: 0,
    vy: 0,
    vz: 0,
    tx: 0,
    ty: 0,
    tz: 0,
    scroll: 0,
    dragging: false,
    down: null as { x: number; y: number } | null,
    dragged: 0,
    last: { x: 0, y: 0 },
    lastTouches: [] as Touch[],
    lastPinch: 0,
  }

  let rowMode = false
  const planes: PlaneRuntime[] = []
  const chunkGroups = new Map<string, THREE.Group>()
  const concealedFrames = new Set<string>()
  let controlMode = false
  let imagePresence = 0.6
  let settling = false
  let controlDist = 52
  let controlBaseDist = 52
  let controlPlaneZ = 0
  let controlCell = 8
  let controlAnchor = { x: 0, y: 0, z: 0 }
  let controlBounds = { cx: 0, cy: 0, hw: 1, hh: 1 }
  let controlSlots: Array<PlaneRuntime | null> = []
  let controlGlideX = 0
  let controlGlideY = 0
  const flickSamples: Array<{ t: number; x: number; y: number }> = []
  let savedFog: THREE.Fog | null = null
  let lastChunkKey = ''
  let lastChunkUpdate = 0
  let pendingChunk: { cx: number; cy: number; cz: number } | null = null
  const raycaster = new THREE.Raycaster()
  const pointerNdc = new THREE.Vector2()
  const projected = new THREE.Vector3()

  const halfView = (z: number) => {
    const halfH = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * z
    return { halfH, halfW: halfH * camera.aspect }
  }

  const resize = () => {
    const width = container.clientWidth || window.innerWidth
    const height = container.clientHeight || window.innerHeight
    camera.aspect = width / Math.max(height, 1)
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    if (controlMode) placeGrid(false)
  }

  const screenRectOf = (mesh: THREE.Mesh): D3ScreenRect => {
    const rect = renderer.domElement.getBoundingClientRect()
    mesh.updateWorldMatrix(true, false)
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const corner of planeCorners) {
      projected.copy(corner).applyMatrix4(mesh.matrixWorld).project(camera)
      const sx = (projected.x * 0.5 + 0.5) * rect.width + rect.left
      const sy = (-projected.y * 0.5 + 0.5) * rect.height + rect.top
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

  const payloadOf = (runtime: PlaneRuntime): D3SelectPayload => ({
    id: runtime.id,
    slug: String(runtime.mesh.userData.slug || ''),
    title: String(runtime.mesh.userData.title || ''),
    productId: String(runtime.mesh.userData.productId || ''),
    url: String(runtime.mesh.userData.url || ''),
    displayUrl: String(runtime.mesh.userData.displayUrl || runtime.mesh.userData.url || ''),
    frameId: String(runtime.mesh.userData.frameId || ''),
    imageIndex: Number(runtime.mesh.userData.imageIndex) || 0,
    itemType: String(runtime.mesh.userData.itemType || ''),
    width: Number(runtime.mesh.userData.width) || 1,
    height: Number(runtime.mesh.userData.height) || 1,
    screenRect: screenRectOf(runtime.mesh),
  })

  const removeRuntime = (runtime: PlaneRuntime) => {
    gsap.killTweensOf(runtime.mesh.position)
    gsap.killTweensOf(runtime.mesh.scale)
    runtime.material.map = null
    runtime.material.dispose()
    runtime.mesh.removeFromParent()
    const index = planes.indexOf(runtime)
    if (index >= 0) planes.splice(index, 1)
  }

  const clearChunks = () => {
    for (const key of [...chunkGroups.keys()]) disposeChunk(key)
  }

  const disposeChunk = (key: string) => {
    const group = chunkGroups.get(key)
    if (!group) return
    const meshes = group.children.filter((child) => child instanceof THREE.Mesh)
    for (const mesh of meshes) {
      const runtime = planes.find((plane) => plane.mesh === mesh)
      if (runtime) removeRuntime(runtime)
      else mesh.removeFromParent()
    }
    group.clear()
    group.removeFromParent()
    chunkGroups.delete(key)
  }

  const ensureChunk = (key: string, cx: number, cy: number, cz: number) => {
    if (chunkGroups.has(key) || !media.length) return
    const group = new THREE.Group()
    group.name = key
    const layouts = generateChunkPlanesCached(cx, cy, cz, layoutSeed)
    const pool = media.filter((item) => !concealedFrames.has(item.frameId || ''))
    for (const layout of layouts) {
      if (!pool.length) continue
      const item = pool[layout.mediaIndex % pool.length]
      if (!item) continue
      const aspect = item.width && item.height ? item.width / item.height : 1
      const planeH = layout.scale.y
      const planeW = planeH * aspect
      const material = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
      const mesh = new THREE.Mesh(PLANE_GEOMETRY, material)
      mesh.position.copy(layout.position)
      mesh.scale.set(planeW, planeH, 1)
      mesh.visible = false
      mesh.userData.slug = item.slug
      mesh.userData.title = item.title
      mesh.userData.productId = item.productId
      mesh.userData.url = item.url
      mesh.userData.displayUrl = item.displayUrl || item.url
      mesh.userData.frameId = item.frameId || ''
      mesh.userData.imageIndex = item.imageIndex ?? 0
      mesh.userData.itemType = item.itemType || ''
      mesh.userData.width = item.width
      mesh.userData.height = item.height
      const hidden = concealedFrames.has(item.frameId || '')
      const runtime: PlaneRuntime = {
        id: layout.id,
        mesh,
        material,
        opacity: 0,
        ready: false,
        hidden,
        homeX: layout.position.x,
        homeY: layout.position.y,
        homeZ: layout.position.z,
        homeScaleX: planeW,
        homeScaleY: planeH,
        chunkCx: cx,
        chunkCy: cy,
        chunkCz: cz,
      }
      getTexture(item, (tex) => {
        runtime.ready = true
        material.map = tex
        material.needsUpdate = true
      })
      group.add(mesh)
      planes.push(runtime)
    }
    scene.add(group)
    chunkGroups.set(key, group)
  }

  const syncChunks = (cx: number, cy: number, cz: number) => {
    const nextKeys = new Set<string>()
    for (const offset of CHUNK_OFFSETS) {
      const key = `${layoutSeed}:${cx + offset.dx},${cy + offset.dy},${cz + offset.dz}`
      nextKeys.add(key)
      ensureChunk(key, cx + offset.dx, cy + offset.dy, cz + offset.dz)
    }
    for (const key of chunkGroups.keys()) {
      if (!nextKeys.has(key)) disposeChunk(key)
    }
  }

  const frameCamera = () => {
    const layouts = generateChunkPlanesCached(0, 0, 0, layoutSeed)
    const preferred = layouts.find((layout) => layout.position.z < state.z - 10) || layouts[0]
    if (!preferred) return
    const z = preferred.position.z + 36
    const nearby = CHUNK_OFFSETS.flatMap((offset) =>
      generateChunkPlanesCached(offset.dx, offset.dy, offset.dz, layoutSeed),
    )
    const scoreSpot = (x: number, y: number) => {
      camera.position.set(x, y, z)
      camera.updateMatrixWorld()
      let nearest = Infinity
      let hitsCentre = false
      for (const layout of nearby) {
        const depth = z - layout.position.z
        if (depth < 0.5 || depth > DEPTH_FADE_END) continue
        projected.set(layout.position.x, layout.position.y, layout.position.z).project(camera)
        if (projected.z < -1 || projected.z > 1) continue
        const pcx = projected.x
        const pcy = projected.y
        nearest = Math.min(nearest, Math.hypot(pcx, pcy))
        projected.set(layout.position.x + layout.scale.y * 1.7, layout.position.y, layout.position.z).project(camera)
        const halfX = Math.abs(projected.x - pcx)
        projected.set(layout.position.x, layout.position.y + layout.scale.y * 0.6, layout.position.z).project(camera)
        const halfY = Math.abs(projected.y - pcy)
        if (Math.abs(pcx) <= halfX && Math.abs(pcy) <= halfY) hitsCentre = true
      }
      return { nearest, hitsCentre }
    }
    let x = preferred.position.x
    let y = preferred.position.y
    let bestScore = -1
    for (let ring = 24; ring <= 150; ring += 14) {
      for (let step = 0; step < 28; step += 1) {
        const angle = (step / 28) * Math.PI * 2 + ring * 0.01
        const nextX = preferred.position.x + Math.cos(angle) * ring
        const nextY = preferred.position.y + Math.sin(angle) * ring
        const spot = scoreSpot(nextX, nextY)
        const score = spot.hitsCentre ? -1 : spot.nearest
        if (score > bestScore) {
          bestScore = score
          x = nextX
          y = nextY
        }
      }
    }
    state.x = x
    state.y = y
    state.z = z
    camera.position.set(state.x, state.y, state.z)
  }

  const hitAt = (clientX: number, clientY: number) => {
    const rect = renderer.domElement.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1
    pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointerNdc, camera)
    const meshes = planes.filter((plane) => plane.mesh.visible && !plane.hidden).map((plane) => plane.mesh)
    const hit = raycaster.intersectObjects(meshes, false)[0]
    if (!hit || !(hit.object instanceof THREE.Mesh)) return null
    return planes.find((plane) => plane.mesh === hit.object) ?? null
  }

  let hoverId = ''
  let hoverAt = 0

  const setCanvasLabel = (label: 'Gather' | 'Close' | null) => {
    const canvas = renderer.domElement
    if (label) canvas.setAttribute('data-cursor-label', label)
    else canvas.removeAttribute('data-cursor-label')
  }

  const publishHover = (runtime: PlaneRuntime | null) => {
    const next = runtime?.id ?? ''
    if (next === hoverId && !rowMode) return
    hoverId = next
    if (!runtime) {
      setCanvasLabel(rowMode ? 'Close' : null)
      onHover?.(null)
      return
    }
    setCanvasLabel('Gather')
    onHover?.(payloadOf(runtime))
  }

  const sampleHover = (clientX: number, clientY: number) => {
    const now = performance.now()
    if (now - hoverAt < 32) return
    hoverAt = now
    if (rowMode) {
      setCanvasLabel('Close')
      onHover?.(null)
      return
    }
    publishHover(hitAt(clientX, clientY))
  }

  const trySelect = (clientX: number, clientY: number) => {
    // Kebab open: any field click closes, including over a faded plane.
    if (rowMode) {
      onClose?.()
      return
    }
    const runtime = hitAt(clientX, clientY)
    if (runtime && onSelect) {
      publishHover(null)
      onSelect(payloadOf(runtime))
    }
  }

  const onMouseDown = (event: MouseEvent) => {
    clearControlGlide()
    state.dragging = true
    state.down = { x: event.clientX, y: event.clientY }
    state.dragged = 0
    state.last = { x: event.clientX, y: event.clientY }
    trackFlick(event.clientX, event.clientY)
  }

  const onMouseUp = (event: MouseEvent) => {
    const click = state.down && state.dragged < CLICK_DRAG
    state.dragging = false
    state.down = null
    if (controlMode) releaseControlGlide()
    if (click) trySelect(event.clientX, event.clientY)
  }

  const overUi = (event: MouseEvent) =>
    event.target instanceof Element &&
    Boolean(event.target.closest('[data-d3-gather], .header'))

  const onMouseMove = (event: MouseEvent) => {
    if (overUi(event)) {
      publishHover(null)
      if (!state.dragging) return
    }
    if (!state.dragging) sampleHover(event.clientX, event.clientY)
    if (!state.dragging) return
    const dx = event.clientX - state.last.x
    const dy = event.clientY - state.last.y
    state.dragged += Math.abs(dx) + Math.abs(dy)
    state.last = { x: event.clientX, y: event.clientY }
    if (rowMode) return
    if (controlMode) {
      panControl(dx, dy)
      trackFlick(event.clientX, event.clientY)
      return
    }
    state.tx -= dx * 0.06
    state.ty += dy * 0.06
  }

  const onWheel = (event: WheelEvent) => {
    event.preventDefault()
    if (rowMode) return
    if (controlMode) {
      // Trackpad pinch arrives as a ctrl-wheel. Zoom stays at the control distance.
      if (event.ctrlKey) return
      clearControlGlide()
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? renderer.domElement.clientHeight
            : 1
      panControl(-event.deltaX * unit, -event.deltaY * unit)
      return
    }
    state.scroll += event.deltaY * 0.006
  }

  const onTouchStart = (event: TouchEvent) => {
    event.preventDefault()
    state.lastTouches = Array.from(event.touches)
    state.lastPinch = pinchDistance(state.lastTouches)
    clearControlGlide()
    const touch = event.touches[0]
    if (touch) {
      state.down = { x: touch.clientX, y: touch.clientY }
      state.dragged = 0
      trackFlick(touch.clientX, touch.clientY)
    }
  }

  const onTouchMove = (event: TouchEvent) => {
    event.preventDefault()
    if (rowMode) return
    const touches = Array.from(event.touches)
    if (touches.length === 1 && state.lastTouches[0] && touches[0]) {
      const dx = touches[0].clientX - state.lastTouches[0].clientX
      const dy = touches[0].clientY - state.lastTouches[0].clientY
      state.dragged += Math.abs(dx) + Math.abs(dy)
      if (controlMode) {
        panControl(dx, dy)
        trackFlick(touches[0].clientX, touches[0].clientY)
      } else {
        state.tx -= dx * 0.05
        state.ty += dy * 0.05
      }
    } else if (touches.length === 2 && state.lastPinch > 0 && !controlMode) {
      const dist = pinchDistance(touches)
      state.scroll += (state.lastPinch - dist) * 0.006
      flickSamples.length = 0
      state.lastPinch = dist
    }
    state.lastTouches = touches
  }

  const onTouchEnd = (event: TouchEvent) => {
    const click =
      event.touches.length === 0 && state.down && state.dragged < CLICK_DRAG
    const point = state.down
    state.lastTouches = Array.from(event.touches)
    state.lastPinch = pinchDistance(state.lastTouches)
    if (event.touches.length === 0) {
      if (controlMode) releaseControlGlide()
      state.down = null
    }
    if (click && point) trySelect(point.x, point.y)
  }

  const fadeSpan = () => {
    const presence = clamp(imagePresence, 0, 1)
    return {
      start: DEPTH_FADE_START + presence * 90,
      end: DEPTH_FADE_END + presence * 280,
      power: 2 - presence * 1.4,
    }
  }

  const applyPresenceFog = () => {
    const fog = scene.fog instanceof THREE.Fog ? scene.fog : savedFog
    if (!fog) return
    const presence = clamp(imagePresence, 0, 1)
    fog.near = 120 + presence * 200
    fog.far = 320 + presence * 380
  }

  applyPresenceFog()

  const updateFades = () => {
    const gridX = Math.floor(state.x / CHUNK_SIZE)
    const gridY = Math.floor(state.y / CHUNK_SIZE)
    const gridZ = Math.floor(state.z / CHUNK_SIZE)
    const fade = fadeSpan()
    for (const runtime of planes) {
      if (runtime.hidden) {
        runtime.mesh.visible = false
        runtime.material.opacity = 0
        continue
      }
      // Kebab open: gsap owns the fade — don't fight it with depth targets.
      if (rowMode) {
        runtime.mesh.visible =
          runtime.ready && runtime.material.opacity > INVIS_THRESHOLD
        runtime.material.depthWrite = false
        continue
      }
      const dist = Math.max(
        Math.abs(runtime.chunkCx - gridX),
        Math.abs(runtime.chunkCy - gridY),
        Math.abs(runtime.chunkCz - gridZ),
      )
      const depth = Math.abs(runtime.mesh.position.z - state.z)
      if (depth > fade.end + 80) {
        runtime.opacity = 0
        runtime.material.opacity = 0
        runtime.mesh.visible = false
        continue
      }
      const gridFade =
        dist <= RENDER_DISTANCE
          ? 1
          : Math.max(0, 1 - (dist - RENDER_DISTANCE) / Math.max(CHUNK_FADE_MARGIN, 0.0001))
      const linear =
        depth <= fade.start
          ? 1
          : Math.max(0, 1 - (depth - fade.start) / Math.max(fade.end - fade.start, 0.0001))
      const depthFade = Math.pow(linear, fade.power)
      const target = Math.min(gridFade, depthFade)
      runtime.opacity = lerp(runtime.opacity, target, 0.18)
      runtime.mesh.visible = runtime.ready && runtime.opacity > INVIS_THRESHOLD
      runtime.material.opacity = runtime.mesh.visible ? runtime.opacity : 0
      runtime.material.depthWrite = runtime.opacity > 0.98
    }
  }

  const syncAroundCamera = () => {
    syncChunks(
      Math.floor(state.x / CHUNK_SIZE),
      Math.floor(state.y / CHUNK_SIZE),
      Math.floor(state.z / CHUNK_SIZE),
    )
    lastChunkKey = `${Math.floor(state.x / CHUNK_SIZE)},${Math.floor(state.y / CHUNK_SIZE)},${Math.floor(state.z / CHUNK_SIZE)}`
    lastChunkUpdate = performance.now()
    pendingChunk = null
  }

  const CONTROL_S = 0.9
  const CONTROL_EASE = 'power3.inOut'

  const chooseColumns = (count: number, pxW: number, pxH: number) => {
    const safe = Math.max(1, count)
    const target = Math.max(pxW / Math.max(pxH, 1), 0.01)
    let bestCols = 1
    let bestScore = Infinity
    for (let cols = 1; cols <= safe; cols++) {
      const rows = Math.ceil(safe / cols)
      const shape = cols / Math.max(rows, 0.001)
      const last = safe - (rows - 1) * cols
      const score =
        Math.abs(Math.log(shape / target)) + (rows > 1 && last / cols < 0.45 ? 0.12 : 0)
      if (score < bestScore) {
        bestScore = score
        bestCols = cols
      }
    }
    return Math.min(safe, bestCols + 3)
  }

  const uniqueControlMedia = () => {
    const sorted = media.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    const seen = new Set<string>()
    const items: Array<DiscoveryMediaItem | null> = []
    for (const item of sorted) {
      const key = item.frameId || ''
      if (!key || seen.has(key)) continue
      seen.add(key)
      items.push(concealedFrames.has(key) ? null : item)
    }
    return items
  }

  const stampMedia = (mesh: THREE.Mesh, item: DiscoveryMediaItem) => {
    mesh.userData.slug = item.slug
    mesh.userData.title = item.title
    mesh.userData.productId = item.productId
    mesh.userData.url = item.url
    mesh.userData.displayUrl = item.displayUrl || item.url
    mesh.userData.frameId = item.frameId || ''
    mesh.userData.imageIndex = item.imageIndex ?? 0
    mesh.userData.itemType = item.itemType || ''
    mesh.userData.width = item.width
    mesh.userData.height = item.height
  }

  const spawnControlPlane = (item: DiscoveryMediaItem): PlaneRuntime => {
    const aspect = item.width && item.height ? item.width / item.height : 1
    const planeH = 8
    const planeW = planeH * aspect
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const mesh = new THREE.Mesh(PLANE_GEOMETRY, material)
    mesh.position.set(state.x, state.y, state.z - 24)
    mesh.scale.set(planeW, planeH, 1)
    mesh.visible = false
    stampMedia(mesh, item)
    const runtime: PlaneRuntime = {
      id: `control:${item.frameId || item.url}`,
      mesh,
      material,
      opacity: 0,
      ready: false,
      hidden: false,
      ephemeral: true,
      homeX: mesh.position.x,
      homeY: mesh.position.y,
      homeZ: mesh.position.z,
      homeScaleX: planeW,
      homeScaleY: planeH,
      chunkCx: 0,
      chunkCy: 0,
      chunkCz: 0,
    }
    getTexture(item, (tex) => {
      runtime.ready = true
      material.map = tex
      material.needsUpdate = true
      if (controlMode && controlSlots.includes(runtime)) mesh.visible = true
    })
    scene.add(mesh)
    planes.push(runtime)
    return runtime
  }

  const placeGrid = (animate: boolean) => {
    const count = controlSlots.length
    if (!count) return
    const pxW = Math.max(renderer.domElement.clientWidth, 1)
    const pxH = Math.max(renderer.domElement.clientHeight, 1)
    const cols = chooseColumns(count, pxW, pxH)
    const rows = Math.ceil(count / cols)
    const gap = 0.08
    const stepUnits = 1 + gap
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV) / 2)
    const aspect = Math.max(pxW / pxH, 0.01)
    const viewH = 2 * tan * controlBaseDist
    const viewW = viewH * aspect
    const widthFit = (viewW * 0.9) / (cols * stepUnits)
    const heightFit = (viewH * 0.86) / (rows * stepUnits)
    const fit = Math.min(widthFit, heightFit)
    const step = stepUnits * fit
    const cell = fit
    const gridW = cols * step - gap * fit
    const gridH = rows * step - gap * fit
    const visibleH = viewH * 0.86
    const originX = controlAnchor.x
    const originY =
      gridH <= visibleH
        ? controlAnchor.y
        : controlAnchor.y + visibleH / 2 - cell / 2
    const planeZ = controlAnchor.z - controlBaseDist
    controlPlaneZ = planeZ
    controlCell = cell
    controlBounds = {
      cx: originX,
      cy: gridH <= visibleH ? originY : originY - ((rows - 1) * step) / 2,
      hw: gridW / 2,
      hh: gridH / 2,
    }
    controlDist = controlBaseDist
    state.z = controlPlaneZ + controlDist
    clampControlCamera()
    controlSlots.forEach((runtime, index) => {
      if (!runtime) return
      const col = index % cols
      const row = Math.floor(index / cols)
      const x = originX + (col - (cols - 1) / 2) * step
      const y =
        gridH <= visibleH
          ? originY + ((rows - 1) / 2 - row) * step
          : originY - row * step
      const imgW = Number(runtime.mesh.userData.width) || 1
      const imgH = Number(runtime.mesh.userData.height) || 1
      const ar = imgW / Math.max(imgH, 0.001)
      let w = cell * 0.9
      let h = w / ar
      if (h > cell * 0.9) {
        h = cell * 0.9
        w = h * ar
      }
      runtime.hidden = false
      gsap.killTweensOf(runtime.mesh.position)
      gsap.killTweensOf(runtime.mesh.scale)
      gsap.killTweensOf(runtime.material)
      const applyOrder = () => {
        if (controlMode) runtime.mesh.renderOrder = index
      }
      if (!animate) {
        runtime.mesh.position.set(x, y, planeZ)
        runtime.mesh.scale.set(w, h, 1)
        runtime.opacity = 1
        runtime.material.opacity = 1
        runtime.material.depthWrite = false
        runtime.mesh.visible = true
        applyOrder()
        return
      }
      runtime.mesh.visible = true
      gsap.to(runtime.mesh.position, {
        x,
        y,
        z: planeZ,
        duration: CONTROL_S,
        ease: CONTROL_EASE,
        onComplete: applyOrder,
      })
      gsap.to(runtime.mesh.scale, {
        x: w,
        y: h,
        duration: CONTROL_S,
        ease: CONTROL_EASE,
      })
      gsap.to(runtime.material, {
        opacity: 1,
        duration: 0.45,
        onUpdate: () => {
          runtime.opacity = runtime.material.opacity
          runtime.material.depthWrite = false
          runtime.mesh.visible = runtime.opacity > 0.02
        },
      })
    })
  }

  const buildControl = (animate: boolean) => {
    const items = uniqueControlMedia()
    const used = new Set<PlaneRuntime>()
    const next: Array<PlaneRuntime | null> = []
    for (const item of items) {
      if (!item) {
        next.push(null)
        continue
      }
      const key = item.frameId || ''
      const matches = planes.filter(
        (plane) => String(plane.mesh.userData.frameId || '') === key && !concealedFrames.has(key),
      )
      matches.sort(
        (a, b) =>
          Math.abs(a.mesh.position.z - state.z) - Math.abs(b.mesh.position.z - state.z),
      )
      const runtime = matches[0] || spawnControlPlane(item)
      used.add(runtime)
      next.push(runtime)
    }
    for (const runtime of planes) {
      if (used.has(runtime)) {
        runtime.hidden = false
        continue
      }
      gsap.killTweensOf(runtime.material)
      runtime.hidden = true
      runtime.opacity = 0
      runtime.material.opacity = 0
      runtime.mesh.visible = false
    }
    for (const runtime of planes.slice()) {
      if (runtime.ephemeral && !used.has(runtime)) removeRuntime(runtime)
    }
    controlSlots = next.map((runtime) => (runtime && planes.includes(runtime) ? runtime : null))
    placeGrid(animate)
  }

  const clampControlCamera = () => {
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV) / 2)
    const aspect = Math.max(camera.aspect || 1, 0.01)
    const halfH = controlDist * tan
    const halfW = halfH * aspect
    const slack = controlCell * 0.45
    const limitX = Math.max(slack, controlBounds.hw - halfW + slack)
    const limitY = Math.max(slack, controlBounds.hh - halfH + slack)
    state.x = clamp(state.x, controlBounds.cx - limitX, controlBounds.cx + limitX)
    state.y = clamp(state.y, controlBounds.cy - limitY, controlBounds.cy + limitY)
    state.z = controlPlaneZ + controlDist
    camera.position.set(state.x, state.y, state.z)
  }

  const clearControlGlide = () => {
    controlGlideX = 0
    controlGlideY = 0
    flickSamples.length = 0
  }

  const trackFlick = (x: number, y: number) => {
    const now = performance.now()
    flickSamples.push({ t: now, x, y })
    const cutoff = now - 90
    while (flickSamples.length > 1 && flickSamples[0].t < cutoff) flickSamples.shift()
  }

  const releaseControlGlide = () => {
    if (state.dragged < CLICK_DRAG || flickSamples.length < 2) {
      clearControlGlide()
      return
    }
    const first = flickSamples[0]
    const last = flickSamples[flickSamples.length - 1]
    const dt = Math.max(last.t - first.t, 16)
    const frames = dt / (1000 / 60)
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV) / 2)
    const viewH = 2 * tan * controlDist
    const worldPerPixel = viewH / Math.max(renderer.domElement.clientHeight, 1)
    controlGlideX = (-(last.x - first.x) / frames) * worldPerPixel
    controlGlideY = ((last.y - first.y) / frames) * worldPerPixel
    flickSamples.length = 0
  }

  const stepControlGlide = (dt: number) => {
    const speed = Math.hypot(controlGlideX, controlGlideY)
    if (speed < 0.0004) {
      controlGlideX = 0
      controlGlideY = 0
      return
    }
    const frame = dt / (1000 / 60)
    state.x += controlGlideX * frame
    state.y += controlGlideY * frame
    const unclampedX = state.x
    const unclampedY = state.y
    clampControlCamera()
    if (Math.abs(state.x - unclampedX) > 1e-4) controlGlideX = 0
    if (Math.abs(state.y - unclampedY) > 1e-4) controlGlideY = 0
    const decay = Math.pow(0.94, frame)
    controlGlideX *= decay
    controlGlideY *= decay
  }

  const panControl = (dx: number, dy: number) => {
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV) / 2)
    const viewH = 2 * tan * controlDist
    const worldPerPixel = viewH / Math.max(renderer.domElement.clientHeight, 1)
    state.x -= dx * worldPerPixel
    state.y += dy * worldPerPixel
    clampControlCamera()
  }

  const leaveControl = () => {
    controlMode = false
    settling = true
    clearControlGlide()
    controlSlots = []
    state.x = controlAnchor.x
    state.y = controlAnchor.y
    state.z = controlAnchor.z
    state.vx = state.vy = state.vz = 0
    state.tx = state.ty = state.tz = 0
    camera.position.set(state.x, state.y, state.z)
    if (savedFog) scene.fog = savedFog
    savedFog = null
    for (const runtime of planes.slice()) {
      gsap.killTweensOf(runtime.mesh.position)
      gsap.killTweensOf(runtime.mesh.scale)
      gsap.killTweensOf(runtime.material)
      runtime.mesh.renderOrder = 0
      if (runtime.ephemeral) {
        removeRuntime(runtime)
        continue
      }
      const key = String(runtime.mesh.userData.frameId || '')
      runtime.hidden = Boolean(key && concealedFrames.has(key))
      if (runtime.hidden) {
        runtime.mesh.visible = false
        runtime.material.opacity = 0
        runtime.opacity = 0
        continue
      }
      gsap.to(runtime.mesh.position, {
        x: runtime.homeX,
        y: runtime.homeY,
        z: runtime.homeZ,
        duration: CONTROL_S,
        ease: CONTROL_EASE,
      })
      gsap.to(runtime.mesh.scale, {
        x: runtime.homeScaleX,
        y: runtime.homeScaleY,
        duration: CONTROL_S,
        ease: CONTROL_EASE,
      })
    }
    gsap.delayedCall(CONTROL_S + 0.02, () => {
      settling = false
    })
  }

  const enterControl = (animate: boolean) => {
    if (!controlMode) {
      controlAnchor = { x: state.x, y: state.y, z: state.z }
      controlBaseDist = 52
      controlDist = controlBaseDist
      savedFog = scene.fog instanceof THREE.Fog ? scene.fog : null
      scene.fog = null
      state.vx = state.vy = state.vz = 0
      state.tx = state.ty = state.tz = 0
      state.scroll = 0
      clearControlGlide()
    }
    controlMode = true
    settling = false
    buildControl(animate)
  }

  const hideRuntime = (runtime: PlaneRuntime) => {
    gsap.killTweensOf(runtime.mesh.position)
    gsap.killTweensOf(runtime.mesh.scale)
    gsap.killTweensOf(runtime.material)
    runtime.hidden = true
    runtime.opacity = 0
    runtime.material.opacity = 0
    runtime.mesh.visible = false
  }

  const applyConcealed = () => {
    for (const runtime of planes) {
      const key = String(runtime.mesh.userData.frameId || '')
      if (!key || !concealedFrames.has(key)) continue
      hideRuntime(runtime)
    }
    if (controlMode) {
      let filled = false
      const items = uniqueControlMedia()
      if (items.length !== controlSlots.length) {
        buildControl(false)
        return
      }
      for (let index = 0; index < controlSlots.length; index += 1) {
        const item = items[index]
        const runtime = controlSlots[index]
        if (runtime) {
          const key = String(runtime.mesh.userData.frameId || '')
          if (key && concealedFrames.has(key)) controlSlots[index] = null
          continue
        }
        if (!item) continue
        const key = item.frameId || ''
        const matches = planes.filter((plane) => String(plane.mesh.userData.frameId || '') === key)
        matches.sort(
          (a, b) =>
            Math.abs(a.mesh.position.z - state.z) - Math.abs(b.mesh.position.z - state.z),
        )
        const next = matches[0] || spawnControlPlane(item)
        next.hidden = false
        controlSlots[index] = next
        filled = true
      }
      if (filled) placeGrid(false)
      return
    }
    for (const runtime of planes) {
      if (runtime.ephemeral) continue
      const key = String(runtime.mesh.userData.frameId || '')
      if (key && concealedFrames.has(key)) continue
      runtime.hidden = false
    }
  }

  setTextureProgressCallback(onTextureProgress ?? null)
  resize()
  frameCamera()
  syncAroundCamera()

  let raf = 0
  let disposed = false
  let lastTick = performance.now()

  const tick = () => {
    if (disposed) return
    raf = requestAnimationFrame(tick)
    const now = performance.now()
    const dt = Math.min(Math.max(now - lastTick, 0), 48)
    lastTick = now

    if (controlMode && !state.dragging && !state.down) stepControlGlide(dt)

    if (!rowMode && !controlMode && !settling) {
      state.tz += state.scroll
      state.scroll *= 0.8
      state.tx = clamp(state.tx, -MAX_VELOCITY, MAX_VELOCITY)
      state.ty = clamp(state.ty, -MAX_VELOCITY, MAX_VELOCITY)
      state.tz = clamp(state.tz, -MAX_VELOCITY, MAX_VELOCITY)
      state.vx = lerp(state.vx, state.tx, VELOCITY_LERP)
      state.vy = lerp(state.vy, state.ty, VELOCITY_LERP)
      state.vz = lerp(state.vz, state.tz, VELOCITY_LERP)
      state.x += state.vx
      state.y += state.vy
      state.z += state.vz
      state.tx *= VELOCITY_DECAY
      state.ty *= VELOCITY_DECAY
      state.tz *= VELOCITY_DECAY
    }

    camera.position.set(state.x, state.y, state.z)
    if (!rowMode && !controlMode && !settling) {
      const cx = Math.floor(state.x / CHUNK_SIZE)
      const cy = Math.floor(state.y / CHUNK_SIZE)
      const cz = Math.floor(state.z / CHUNK_SIZE)
      const key = `${cx},${cy},${cz}`
      if (key !== lastChunkKey) {
        pendingChunk = { cx, cy, cz }
        lastChunkKey = key
      }
      const now = performance.now()
      const throttleMs = getChunkUpdateThrottleMs(Math.abs(state.vz) > 0.05, Math.abs(state.vz))
      if (pendingChunk && shouldThrottleUpdate(lastChunkUpdate, throttleMs, now)) {
        const pending = pendingChunk
        pendingChunk = null
        lastChunkUpdate = now
        syncChunks(pending.cx, pending.cy, pending.cz)
      }
    }
    if (!controlMode && !settling) updateFades()
    renderer.render(scene, camera)
  }

  raf = requestAnimationFrame(tick)

  const canvas = renderer.domElement
  canvas.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('mousemove', onMouseMove)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('touchstart', onTouchStart, { passive: false })
  canvas.addEventListener('touchmove', onTouchMove, { passive: false })
  canvas.addEventListener('touchend', onTouchEnd, { passive: false })
  window.addEventListener('resize', resize)

  const conceal = (frameId: string) => {
    if (!frameId) return
    concealedFrames.add(frameId)
    applyConcealed()
  }

  const reveal = (frameId: string) => {
    if (!frameId) return
    concealedFrames.delete(frameId)
    applyConcealed()
  }

  const syncConcealed = (frameIds: string[]) => {
    concealedFrames.clear()
    for (const id of frameIds) {
      if (id) concealedFrames.add(id)
    }
    applyConcealed()
  }

  const setImagePresence = (value: number) => {
    imagePresence = clamp(value, 0, 1)
    applyPresenceFog()
  }

  const setMode = (next: D3Mode) => {
    if (next === 'control') {
      enterControl(true)
      return
    }
    if (controlMode) leaveControl()
  }

  return {
    conceal,
    reveal,
    syncConcealed,
    setMode,
    setImagePresence,
    screenRectFor: (id: string) => {
      const runtime = planes.find((plane) => plane.id === id && !plane.hidden)
      return runtime ? screenRectOf(runtime.mesh) : null
    },
    disperse: (duration = D3_REVEAL_S) => {
      rowMode = true
      state.vx = state.vy = state.vz = 0
      state.tx = state.ty = state.tz = 0
      state.scroll = 0
      hoverId = ''
      setCanvasLabel('Close')
      onHover?.(null)
      const originX = state.x
      const originY = state.y
      for (const runtime of planes) {
        if (runtime.hidden || runtime.opacity < 0.08) continue
        gsap.killTweensOf(runtime.mesh.position)
        gsap.killTweensOf(runtime.mesh.scale)
        gsap.killTweensOf(runtime.material)
        const dx = runtime.homeX - originX
        const dy = runtime.homeY - originY
        const len = Math.hypot(dx, dy)
        let ux = dx / (len || 1)
        let uy = dy / (len || 1)
        if (len < 8) {
          const angle = seededRandom(runtime.mesh.position.x * 10 + runtime.mesh.position.y) * Math.PI * 2
          ux = Math.cos(angle)
          uy = Math.sin(angle)
        }
        const view = halfView(camera.position.z)
        const clear = Math.hypot(view.halfW, view.halfH)
        const bulk = Math.hypot(runtime.homeScaleX, runtime.homeScaleY) * 0.5
        const travel = Math.max(len + 36, clear + bulk + 28)
        gsap.to(runtime.mesh.position, {
          x: originX + ux * travel,
          y: originY + uy * travel,
          duration,
          ease: D3_REVEAL_EASE,
        })
        gsap.to(runtime.mesh.scale, {
          x: runtime.homeScaleX * 0.4,
          y: runtime.homeScaleY * 0.4,
          duration,
          ease: D3_REVEAL_EASE,
        })
        gsap.to(runtime.material, {
          opacity: 0,
          duration,
          ease: D3_REVEAL_EASE,
          onUpdate: () => {
            runtime.opacity = runtime.material.opacity
          },
        })
      }
    },
    recall: (duration = D3_REVEAL_S) => {
      rowMode = false
      hoverId = ''
      setCanvasLabel(null)
      for (const runtime of planes) {
        if (runtime.hidden) continue
        gsap.killTweensOf(runtime.mesh.position)
        gsap.killTweensOf(runtime.mesh.scale)
        gsap.killTweensOf(runtime.material)
        gsap.to(runtime.mesh.position, {
          x: runtime.homeX,
          y: runtime.homeY,
          z: runtime.homeZ,
          duration,
          ease: D3_REVEAL_EASE,
        })
        gsap.to(runtime.mesh.scale, {
          x: runtime.homeScaleX,
          y: runtime.homeScaleY,
          duration,
          ease: D3_REVEAL_EASE,
        })
        // Depth fade resumes on the next ticks; nudge opacity up so it can.
        gsap.to(runtime, {
          opacity: 1,
          duration,
          ease: D3_REVEAL_EASE,
          onUpdate: () => {
            runtime.material.opacity = runtime.opacity
          },
        })
      }
    },
    setMedia: (next) => {
      media = next.slice()
      layoutSeed += 1
      clearChunks()
      if (controlMode) {
        buildControl(false)
        return
      }
      frameCamera()
      syncAroundCamera()
    },
    setColors: (background, fog) => {
      scene.background = new THREE.Color(background)
      if (scene.fog instanceof THREE.Fog) scene.fog.color.set(fog)
      else if (savedFog) savedFog.color.set(fog)
    },
    getDebugStats: () => ({
      planes: planes.length,
      visible: planes.filter((plane) => plane.mesh.visible).length,
      camera: { x: state.x, y: state.y, z: state.z },
      field: halfView(Math.max(state.z, 1)),
      rowMode,
      scale: (() => {
        const sample = planes.find((plane) => !plane.hidden && plane.homeScaleX > 0)
        return sample ? sample.mesh.scale.x / sample.homeScaleX : 1
      })(),
      spread: planes.reduce((max, plane) => {
        if (plane.hidden) return max
        return Math.max(max, Math.hypot(plane.mesh.position.x - state.x, plane.mesh.position.y - state.y))
      }, 0),
    }),
    visiblePoint: () => {
      const rect = renderer.domElement.getBoundingClientRect()
      let best: { x: number; y: number; id: string; score: number } | null = null
      for (const runtime of planes) {
        if (!runtime.mesh.visible || runtime.hidden) continue
        const box = screenRectOf(runtime.mesh)
        if (box.width < 24 || box.height < 24) continue
        const x = box.left + box.width * 0.5
        const y = box.top + box.height * 0.5
        if (x < rect.left + 8 || x > rect.right - 8 || y < rect.top + 70 || y > rect.bottom - 8) continue
        const score = Math.hypot(x - (rect.left + rect.width / 2), y - (rect.top + rect.height / 2))
        if (!best || score < best.score) best = { x, y, id: runtime.id, score }
      }
      return best ? { x: best.x, y: best.y, id: best.id } : null
    },
    dispose: () => {
      disposed = true
      cancelAnimationFrame(raf)
      setTextureProgressCallback(null)
      setCanvasLabel(null)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('resize', resize)
      clearChunks()
      renderer.dispose()
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement)
      }
    },
  }
}

const pinchDistance = (touches: Touch[]) => {
  if (touches.length < 2) return 0
  const [a, b] = touches
  if (!a || !b) return 0
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}
