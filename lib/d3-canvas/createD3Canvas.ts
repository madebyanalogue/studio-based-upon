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
const EDGE = 200
const EDGE_PUSH = 0.16
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

export type D3SelectPayload = {
  id: string
  slug: string
  title: string
  productId: string
  url: string
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
}

export type D3CanvasHandle = {
  dispose: () => void
  setMedia: (media: DiscoveryMediaItem[]) => void
  setColors: (background: string, fog: string) => void
  /** Hide every copy of a gathered product, including chunks that load later. */
  conceal: (productId: string) => void
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
    pointer: null as { x: number; y: number } | null,
  }

  const isTouch =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0)

  let rowMode = false
  const planes: PlaneRuntime[] = []
  const chunkGroups = new Map<string, THREE.Group>()
  const concealedProducts = new Set<string>()
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
    const pool = media.filter((item) => !concealedProducts.has(item.productId))
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
      mesh.userData.width = item.width
      mesh.userData.height = item.height
      const hidden = concealedProducts.has(item.productId)
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
    state.x = preferred.position.x
    state.y = preferred.position.y
    state.z = preferred.position.z + 36
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
    const runtime = hitAt(clientX, clientY)
    if (rowMode) {
      setCanvasLabel(runtime ? 'Gather' : 'Close')
      return
    }
    publishHover(runtime)
  }

  const trySelect = (clientX: number, clientY: number) => {
    const runtime = hitAt(clientX, clientY)
    if (runtime && onSelect) {
      publishHover(null)
      onSelect(payloadOf(runtime))
      return
    }
    if (rowMode) onClose?.()
  }

  const onMouseDown = (event: MouseEvent) => {
    state.dragging = true
    state.down = { x: event.clientX, y: event.clientY }
    state.dragged = 0
    state.last = { x: event.clientX, y: event.clientY }
  }

  const onMouseUp = (event: MouseEvent) => {
    const click = state.down && state.dragged < CLICK_DRAG
    state.dragging = false
    state.down = null
    if (click) trySelect(event.clientX, event.clientY)
  }

  const overUi = (event: MouseEvent) =>
    event.target instanceof Element &&
    Boolean(event.target.closest('[data-d3-gather], .header'))

  const onMouseOut = (event: MouseEvent) => {
    if (!event.relatedTarget) state.pointer = null
  }

  const onMouseMove = (event: MouseEvent) => {
    state.pointer = { x: event.clientX, y: event.clientY }
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
    state.tx -= dx * 0.06
    state.ty += dy * 0.06
  }

  const onWheel = (event: WheelEvent) => {
    event.preventDefault()
    if (rowMode) return
    state.scroll += event.deltaY * 0.006
  }

  const onTouchStart = (event: TouchEvent) => {
    event.preventDefault()
    state.lastTouches = Array.from(event.touches)
    state.lastPinch = pinchDistance(state.lastTouches)
    const touch = event.touches[0]
    if (touch) {
      state.down = { x: touch.clientX, y: touch.clientY }
      state.dragged = 0
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
      state.tx -= dx * 0.05
      state.ty += dy * 0.05
    } else if (touches.length === 2 && state.lastPinch > 0) {
      const dist = pinchDistance(touches)
      state.scroll += (state.lastPinch - dist) * 0.006
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
    if (event.touches.length === 0) state.down = null
    if (click && point) trySelect(point.x, point.y)
  }

  const updateFades = () => {
    const gridX = Math.floor(state.x / CHUNK_SIZE)
    const gridY = Math.floor(state.y / CHUNK_SIZE)
    const gridZ = Math.floor(state.z / CHUNK_SIZE)
    for (const runtime of planes) {
      if (runtime.hidden) {
        runtime.mesh.visible = false
        runtime.material.opacity = 0
        continue
      }
      const dist = Math.max(
        Math.abs(runtime.chunkCx - gridX),
        Math.abs(runtime.chunkCy - gridY),
        Math.abs(runtime.chunkCz - gridZ),
      )
      const depth = Math.abs(runtime.mesh.position.z - state.z)
      if (depth > DEPTH_FADE_END + 50) {
        runtime.opacity = 0
        runtime.material.opacity = 0
        runtime.mesh.visible = false
        continue
      }
      const gridFade =
        dist <= RENDER_DISTANCE
          ? 1
          : Math.max(0, 1 - (dist - RENDER_DISTANCE) / Math.max(CHUNK_FADE_MARGIN, 0.0001))
      const depthFade =
        depth <= DEPTH_FADE_START
          ? 1
          : Math.max(0, 1 - (depth - DEPTH_FADE_START) / Math.max(DEPTH_FADE_END - DEPTH_FADE_START, 0.0001))
      const target = Math.min(gridFade, depthFade * depthFade)
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

  setTextureProgressCallback(onTextureProgress ?? null)
  resize()
  frameCamera()
  syncAroundCamera()

  let raf = 0
  let disposed = false

  const tick = () => {
    if (disposed) return
    raf = requestAnimationFrame(tick)

    if (!rowMode) {
      const point = state.pointer
      if (!state.dragging && !isTouch && point) {
        const rect = renderer.domElement.getBoundingClientRect()
        const x = point.x - rect.left
        const y = point.y - rect.top
        const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height
        if (inside) {
          if (x > rect.width - EDGE) state.tx += EDGE_PUSH * ((x - (rect.width - EDGE)) / EDGE)
          else if (x < EDGE) state.tx -= EDGE_PUSH * ((EDGE - x) / EDGE)
          if (y < EDGE) state.ty += EDGE_PUSH * ((EDGE - y) / EDGE)
          else if (y > rect.height - EDGE) state.ty -= EDGE_PUSH * ((y - (rect.height - EDGE)) / EDGE)
        }
      }

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
    if (!rowMode) {
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
    updateFades()
    renderer.render(scene, camera)
  }

  raf = requestAnimationFrame(tick)

  const canvas = renderer.domElement
  canvas.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseout', onMouseOut)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('touchstart', onTouchStart, { passive: false })
  canvas.addEventListener('touchmove', onTouchMove, { passive: false })
  canvas.addEventListener('touchend', onTouchEnd, { passive: false })
  window.addEventListener('resize', resize)

  const conceal = (productId: string) => {
    if (!productId) return
    concealedProducts.add(productId)
    for (const runtime of planes) {
      if (String(runtime.mesh.userData.productId) !== productId) continue
      runtime.hidden = true
      runtime.opacity = 0
      runtime.mesh.visible = false
      runtime.material.opacity = 0
    }
  }

  return {
    conceal,
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
      }
    },
    setMedia: (next) => {
      media = next.slice()
      layoutSeed += 1
      concealedProducts.clear()
      clearChunks()
      frameCamera()
      syncAroundCamera()
    },
    setColors: (background, fog) => {
      scene.background = new THREE.Color(background)
      if (scene.fog instanceof THREE.Fog) scene.fog.color.set(fog)
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
      window.removeEventListener('mouseout', onMouseOut)
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
