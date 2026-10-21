import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import Lenis from 'lenis'

/** Matches the particle-gallery export: still cloud, soft fog, varied planes. */
const PARTICLE_COUNT = 113
const SIZE_MIN = 201
const SIZE_MAX = 243
const SPREAD = 50
const DEPTH_SPREAD = 30
const CAMERA_DISTANCE = 72
const FOG_NEAR = 20
const FOG_FAR = 150
const GROW_SECONDS = 2
const MORPH_SECONDS = 0.9
/** Rest on the full grid before the fixed zoom, so the whole layout reads. */
const CONTROL_HOLD_SECONDS = 0.4
const CONTROL_ZOOM_SECONDS = 0.85
/** Rows in view once control has zoomed in. Same distance every time. */
const CONTROL_ZOOM_ROWS = 2.7
/** Same glide as the page scroller, so a wheel eases in and settles into the edges. */
const CONTROL_LENIS_DURATION = 1.2
const controlLenisEase = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
const GRID_CELL = 4.8
const GRID_GAP = 0.65
/** Pan travels further than the pointer, then a fast release keeps sliding. */
const PAN_SPEED = 1.2
const PAN_DAMPING = 0.2
const ROTATE_DAMPING = 0.08
const FLICK_SECONDS = 0.055
const FLICK_DECAY = 6.5
const FLICK_MIN_SPEED = 0.4
const FLICK_MAX_SPEED = 2.4

export type D2ScreenRect = {
  left: number
  top: number
  width: number
  height: number
}

export type D2MediaItem = {
  /** Same-origin texture URL. */
  url: string
  width: number
  height: number
  slug: string
  title: string
  productId: string
  /** CDN url used by the selection pile. */
  displayUrl: string
  itemType: string
  link: string | null
  imageUrls?: string[]
}

export type D2SelectPayload = {
  productId: string
  title: string
  slug: string
  displayUrl: string
  /** Already-decoded texture URL, so the pile fly can start on the same frame. */
  textureUrl: string
  itemType: string
  link: string | null
  imageUrls?: string[]
  screenRect: D2ScreenRect
}

type Particle = {
  mesh: THREE.Mesh
  productId: string
  age: number
  concealed: boolean
  homePos: THREE.Vector3
  homeRot: THREE.Euler
  fromPos: THREE.Vector3
  fromRot: THREE.Euler
  fromScale: THREE.Vector3
  fromOpacity: number
  goalPos: THREE.Vector3
  goalRot: THREE.Euler
  goalScale: THREE.Vector3
  goalOpacity: number
  /** Applied when a control morph finishes, so surrender depth order holds during the flight. */
  goalOrder: number
}

export type D2Mode = 'surrender' | 'control'
export type D2Drag = 'pan' | 'rotate'

export type D2CanvasHandle = {
  dispose: () => void
  setMedia: (media: D2MediaItem[]) => void
  setColors: (background: string, fog: string) => void
  /** Hide or show every copy of products currently in the pile. */
  syncGathered: (productIds: Set<string>) => void
  /** Surrender is the cloud. Control eases every product into a flat grid. */
  setMode: (mode: D2Mode) => void
  /** Click-drag either orbits the view or slides it. */
  setDrag: (drag: D2Drag) => void
  /** Freeze orbit, pan, and zoom — used while a gather flies into the pile. */
  setNavigation: (enabled: boolean) => void
  pick: (clientX: number, clientY: number) => D2SelectPayload | null
}

const easeOut = (t: number) => {
  const t1 = 1 - t
  return 1 - t1 * t1 * t1
}

const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const planeSize = (aspect: number, sizePx: number) => {
  const sizeWorld = sizePx * 0.02
  if (aspect >= 1) return { w: sizeWorld, h: sizeWorld / aspect }
  return { w: sizeWorld * aspect, h: sizeWorld }
}

export const createD2Canvas = (
  container: HTMLElement,
  onProgress?: (progress: number) => void,
): D2CanvasHandle => {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 500)
  camera.position.set(0, 0, CAMERA_DISTANCE)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth <= 768 ? 1.5 : 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.sortObjects = true
  container.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.enablePan = false
  controls.zoomToCursor = true
  controls.minDistance = 2
  controls.maxDistance = 120
  controls.target.set(0, 0, 0)

  let mode: D2Mode = 'surrender'
  let drag: D2Drag = 'pan'
  let morphT = 1
  /** Grid flight, hold on the full layout, zoom to the fixed distance, then live. */
  let phase: 'morph' | 'hold' | 'zoom' | 'live' = 'live'
  let phaseT = 0
  let introZoom = false
  let navigationHeld = false
  const zoomFrom = new THREE.Vector3()
  const zoomTo = new THREE.Vector3()
  const zoomOffset = new THREE.Vector3()
  let panLimitX = 8
  let panLimitY = 8
  let gridW = GRID_CELL
  let gridH = GRID_CELL
  let layoutCols = 1
  let layoutRows = 1
  /** Product order from the first Control layout. Gathered tiles keep their cell. */
  let controlOrder: string[] | null = null
  let framingCamera = false
  let panPointer = false
  let panScrollKey = ''
  const surrenderCam = camera.position.clone()
  const surrenderTgt = controls.target.clone()
  const camFrom = new THREE.Vector3()
  const camTo = new THREE.Vector3()
  const tgtFrom = new THREE.Vector3()
  const tgtTo = new THREE.Vector3()

  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const clock = new THREE.Clock()
  const loader = new THREE.TextureLoader()
  loader.setCrossOrigin('anonymous')
  renderer.domElement.setAttribute('data-lenis-prevent', '')

  const makePanLenis = (orientation: 'vertical' | 'horizontal') => {
    const wrapper = document.createElement('div')
    const content = document.createElement('div')
    wrapper.appendChild(content)
    wrapper.setAttribute('aria-hidden', 'true')
    wrapper.setAttribute('data-lenis-prevent', '')
    Object.assign(wrapper.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      width: '8px',
      height: '8px',
      overflow: 'scroll',
      scrollbarWidth: 'none',
      pointerEvents: 'none',
      opacity: '0',
    })
    container.appendChild(wrapper)
    const lenis = new Lenis({
      wrapper,
      content,
      eventsTarget: wrapper,
      orientation,
      gestureOrientation: orientation,
      smoothWheel: true,
      duration: CONTROL_LENIS_DURATION,
      easing: controlLenisEase,
      overscroll: false,
      autoRaf: false,
      naiveDimensions: true,
    })
    return { wrapper, content, lenis }
  }

  const panY = makePanLenis('vertical')
  const panX = makePanLenis('horizontal')

  const textureCache = new Map<string, THREE.Texture>()
  const mediaById = new Map<string, D2MediaItem>()
  let particles: Particle[] = []
  let gathered = new Set<string>()
  let spawnGen = 0
  let background = '#eeeeee'
  let fogColor = '#eeeeee'
  let disposed = false
  let raf = 0

  const applyAtmosphere = () => {
    const color = new THREE.Color(fogColor)
    scene.fog = mode === 'control' ? null : new THREE.Fog(color, FOG_NEAR, FOG_FAR)
    scene.background = new THREE.Color(background)
    renderer.setClearColor(background, 1)
  }

  const materialOf = (mesh: THREE.Mesh) =>
    mesh.material instanceof THREE.MeshBasicMaterial ? mesh.material : null

  const resize = () => {
    const width = Math.max(1, container.clientWidth)
    const height = Math.max(1, container.clientHeight)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    if (mode !== 'control' || !particles.length) return
    const next = gridShape(controlRoster().length, camera.aspect)
    if (next.cols !== layoutCols || next.rows !== layoutRows) {
      const intro = phase !== 'live'
      beginMorph('control', intro, intro)
    } else if (phase === 'live') {
      frameControl(gridW, gridH, false)
    }
  }

  const clearParticles = () => {
    for (const particle of particles) {
      scene.remove(particle.mesh)
      particle.mesh.geometry.dispose()
      const material = particle.mesh.material
      if (material instanceof THREE.Material) material.dispose()
    }
    particles = []
  }

  const loadTexture = (url: string) =>
    new Promise<THREE.Texture | null>((resolve) => {
      const cached = textureCache.get(url)
      if (cached) {
        resolve(cached)
        return
      }
      loader.load(
        url,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace
          tex.minFilter = THREE.LinearMipmapLinearFilter
          tex.magFilter = THREE.LinearFilter
          tex.generateMipmaps = true
          const image = tex.image as { width?: number; height?: number } | undefined
          const aspect =
            image?.width && image?.height ? image.width / image.height : 1
          tex.userData = { aspect }
          textureCache.set(url, tex)
          resolve(tex)
        },
        undefined,
        () => resolve(null),
      )
    })

  const spawn = async (media: D2MediaItem[]) => {
    const gen = ++spawnGen
    clearParticles()
    mediaById.clear()
    for (const item of media) mediaById.set(item.productId, item)
    if (!media.length) {
      onProgress?.(100)
      return
    }

    const unique = new Map<string, D2MediaItem>()
    for (const item of media) unique.set(item.url, item)
    let loaded = 0
    const total = unique.size
    onProgress?.(0)
    const textures = new Map<string, THREE.Texture>()
    await Promise.all(
      [...unique.values()].map(async (item) => {
        const tex = await loadTexture(item.url)
        loaded += 1
        onProgress?.(Math.round((loaded / total) * 100))
        if (tex) textures.set(item.url, tex)
      }),
    )
    if (disposed || gen !== spawnGen) return

    const pool = media.filter((item) => textures.has(item.url))
    if (!pool.length) return

    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const item = pool[i % pool.length]!
      const tex = textures.get(item.url)
      if (!tex) continue
      const aspect =
        (tex.userData.aspect as number) ||
        item.width / Math.max(item.height, 1) ||
        1
      const sizePx = SIZE_MIN + Math.random() * (SIZE_MAX - SIZE_MIN)
      const { w, h } = planeSize(aspect, sizePx)
      const geo = new THREE.PlaneGeometry(w, h)
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        opacity: 0,
        toneMapped: false,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(
        (Math.random() - 0.5) * SPREAD,
        (Math.random() - 0.5) * SPREAD,
        (Math.random() - 0.5) * DEPTH_SPREAD,
      )
      mesh.rotation.set(
        (Math.random() - 0.5) * 10 * (Math.PI / 180),
        (Math.random() - 0.5) * 10 * (Math.PI / 180),
        (Math.random() - 0.5) * 10 * (Math.PI / 180),
      )
      mesh.scale.set(0.001, 0.001, 0.001)
      mesh.userData = { productId: item.productId }
      scene.add(mesh)
      const concealed = gathered.has(item.productId)
      mesh.visible = !concealed
      const homePos = mesh.position.clone()
      const homeRot = mesh.rotation.clone()
      particles.push({
        mesh,
        productId: item.productId,
        age: 0,
        concealed,
        homePos,
        homeRot,
        fromPos: homePos.clone(),
        fromRot: homeRot.clone(),
        fromScale: mesh.scale.clone(),
        fromOpacity: 0,
        goalPos: homePos.clone(),
        goalRot: homeRot.clone(),
        goalScale: new THREE.Vector3(1, 1, 1),
        goalOpacity: concealed ? 0 : 1,
        goalOrder: 0,
      })
    }
    if (mode === 'control') beginMorph('control')
  }

  const screenRectFor = (mesh: THREE.Mesh): D2ScreenRect | null => {
    const geo = mesh.geometry
    if (!(geo instanceof THREE.PlaneGeometry)) return null
    const hw = geo.parameters.width / 2
    const hh = geo.parameters.height / 2
    const corners = [
      new THREE.Vector3(-hw, -hh, 0),
      new THREE.Vector3(hw, -hh, 0),
      new THREE.Vector3(hw, hh, 0),
      new THREE.Vector3(-hw, hh, 0),
    ]
    mesh.updateWorldMatrix(true, false)
    const bounds = renderer.domElement.getBoundingClientRect()
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const corner of corners) {
      const projected = corner.clone().applyMatrix4(mesh.matrixWorld).project(camera)
      if (projected.z > 1) return null
      const x = (projected.x * 0.5 + 0.5) * bounds.width + bounds.left
      const y = (-projected.y * 0.5 + 0.5) * bounds.height + bounds.top
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
    const width = maxX - minX
    const height = maxY - minY
    if (width < 8 || height < 8) return null
    return { left: minX, top: minY, width, height }
  }

  const containedScale = (mesh: THREE.Mesh) => {
    const geo = mesh.geometry
    const width = geo instanceof THREE.PlaneGeometry ? geo.parameters.width : GRID_CELL
    const height = geo instanceof THREE.PlaneGeometry ? geo.parameters.height : GRID_CELL
    const fit = GRID_CELL / Math.max(width, height, 0.001)
    return new THREE.Vector3(fit, fit, fit)
  }

  const frameControl = (width: number, height: number, retarget: boolean) => {
    const vFov = THREE.MathUtils.degToRad(camera.fov)
    const tan = Math.tan(vFov / 2)
    const aspect = Math.max(camera.aspect || 1, 0.01)
    const distH = height / 2 / tan
    const distW = width / 2 / (tan * aspect)
    const fit = Math.max(distH, distW, 12) * 1.28
    if (retarget) {
      camTo.set(0, 0, fit)
      tgtTo.set(0, 0, 0)
    }
    controls.minDistance = Math.max(4, GRID_CELL * 0.85)
    controls.maxDistance = fit * 1.35
    updatePanLimits()
  }

  /** Camera distance that frames the same number of rows on every grid. */
  const controlZoomDistance = () => {
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)
    const visible = CONTROL_ZOOM_ROWS * (GRID_CELL + GRID_GAP)
    return visible / (2 * Math.max(tan, 0.001))
  }

  const setCanvasInput = (locked: boolean) => {
    container.style.pointerEvents = locked ? 'none' : ''
  }

  const goLive = () => {
    phase = 'live'
    introZoom = false
    settleControls()
    if (mode === 'control') syncPanScrollRange(true)
    controls.enabled = !navigationHeld
    setCanvasInput(false)
  }

  const beginZoomIn = () => {
    const offset = zoomOffset.copy(camera.position).sub(controls.target)
    const current = offset.length() || 1
    const dest = Math.min(current, Math.max(controls.minDistance, controlZoomDistance()))
    zoomFrom.copy(camera.position)
    if (current - dest < 0.2) {
      goLive()
      return
    }
    zoomTo.copy(controls.target).addScaledVector(offset.normalize(), dest)
    phase = 'zoom'
    phaseT = 0
    controls.enabled = false
  }

  const updatePanLimits = () => {
    const distance = Math.max(0.001, camera.position.distanceTo(controls.target))
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)
    const halfH = distance * tan
    const halfW = halfH * Math.max(camera.aspect || 1, 0.01)
    const slack = (GRID_CELL + GRID_GAP) * 0.45
    panLimitX = Math.max(slack, gridW / 2 - halfW + slack)
    panLimitY = Math.max(slack, gridH / 2 - halfH + slack)
  }

  const worldUnitsPerPixel = () => {
    const height = Math.max(1, renderer.domElement.clientHeight)
    const distance = Math.max(0.001, camera.position.distanceTo(controls.target))
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)
    return (2 * distance * tan) / height
  }

  const writeLenisFromCamera = () => {
    const worldPerPx = worldUnitsPerPixel()
    panY.lenis.scrollTo((panLimitY - controls.target.y) / worldPerPx, { immediate: true, force: true })
    panX.lenis.scrollTo((controls.target.x + panLimitX) / worldPerPx, { immediate: true, force: true })
  }

  /** Keep the hidden Lenis range matched to how far the grid can pan. */
  const syncPanScrollRange = (fromCamera = false) => {
    updatePanLimits()
    const worldPerPx = worldUnitsPerPixel()
    const key = `${panLimitX.toFixed(2)}|${panLimitY.toFixed(2)}|${worldPerPx.toFixed(5)}`
    if (key !== panScrollKey) {
      const wrapY = Math.max(1, panY.wrapper.clientHeight)
      const wrapX = Math.max(1, panX.wrapper.clientWidth)
      panY.content.style.height = `${(panLimitY * 2) / worldPerPx + wrapY}px`
      panX.content.style.width = `${(panLimitX * 2) / worldPerPx + wrapX}px`
      panY.lenis.resize()
      panX.lenis.resize()
      if (panY.lenis.limit < 1 && panX.lenis.limit < 1) return
      fromCamera = true
    }
    panScrollKey = key
    if (fromCamera) writeLenisFromCamera()
  }

  const applyLenisToCamera = () => {
    const worldPerPx = worldUnitsPerPixel()
    const x = panX.lenis.limit > 1
      ? -panLimitX + panX.lenis.animatedScroll * worldPerPx
      : controls.target.x
    const y = panY.lenis.limit > 1
      ? panLimitY - panY.lenis.animatedScroll * worldPerPx
      : controls.target.y
    const dx = x - controls.target.x
    const dy = y - controls.target.y
    if (!dx && !dy) return
    controls.target.x = x
    controls.target.y = y
    camera.position.x += dx
    camera.position.y += dy
  }

  /** Columns and rows whose footprint matches the viewport, with a reasonably full last row. */
  const gridShape = (count: number, aspect: number) => {
    const safe = Math.max(1, count)
    const target = Math.max(aspect, 0.01)
    const step = GRID_CELL + GRID_GAP
    let bestCols = 1
    let bestScore = Infinity
    for (let cols = 1; cols <= safe; cols++) {
      const rows = Math.ceil(safe / cols)
      const width = cols * step - GRID_GAP
      const height = rows * step - GRID_GAP
      const shape = width / Math.max(height, 0.001)
      const last = safe - (rows - 1) * cols
      const score =
        Math.abs(Math.log(shape / target)) + (rows > 1 && last / cols < 0.45 ? 0.12 : 0)
      if (score < bestScore) {
        bestScore = score
        bestCols = cols
      }
    }
    return { cols: bestCols, rows: Math.ceil(safe / bestCols) }
  }

  /**
   * Control cells stay put after a gather. The first visit records who is on
   * the grid; later visits keep those cells, including ones that are now empty.
   */
  const controlRoster = () => {
    const first = new Map<string, Particle>()
    for (const particle of particles) {
      if (!first.has(particle.productId)) first.set(particle.productId, particle)
    }
    if (!controlOrder) {
      const seen = new Set<string>()
      controlOrder = []
      for (const particle of particles) {
        if (particle.concealed || seen.has(particle.productId)) continue
        seen.add(particle.productId)
        controlOrder.push(particle.productId)
      }
    } else {
      const seen = new Set<string>()
      const next: string[] = []
      for (const id of controlOrder) {
        if (!first.has(id) || seen.has(id)) continue
        seen.add(id)
        next.push(id)
      }
      for (const particle of particles) {
        if (particle.concealed || seen.has(particle.productId)) continue
        seen.add(particle.productId)
        next.push(particle.productId)
      }
      controlOrder = next
    }
    return controlOrder
      .map((id) => first.get(id))
      .filter((particle): particle is Particle => !!particle)
  }

  const assignGoals = (next: D2Mode) => {
    if (next === 'surrender') {
      for (const particle of particles) {
        particle.goalPos.copy(particle.homePos)
        particle.goalRot.copy(particle.homeRot)
        particle.goalScale.set(1, 1, 1)
        particle.goalOpacity = particle.concealed ? 0 : 1
        particle.goalOrder = 0
        particle.mesh.renderOrder = 0
      }
      camTo.copy(surrenderCam)
      tgtTo.copy(surrenderTgt)
      controls.minDistance = 2
      controls.maxDistance = 120
      return
    }

    const primaries = controlRoster()

    const count = primaries.length
    const shape = gridShape(count, Math.max(camera.aspect || 1, 0.01))
    const cols = shape.cols
    const rows = shape.rows
    layoutCols = cols
    layoutRows = rows
    const step = GRID_CELL + GRID_GAP
    gridW = Math.max(GRID_CELL, cols * step - GRID_GAP)
    gridH = Math.max(GRID_CELL, rows * step - GRID_GAP)
    frameControl(gridW, gridH, framingCamera)

    const slot = new Map<string, { pos: THREE.Vector3; scale: THREE.Vector3 }>()
    primaries.forEach((particle, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      const x = (col - (cols - 1) / 2) * step
      const y = ((rows - 1) / 2 - row) * step
      particle.goalPos.set(x, y, 0)
      particle.goalRot.set(0, 0, 0)
      particle.goalScale.copy(containedScale(particle.mesh))
      particle.goalOpacity = particle.concealed ? 0 : 1
      particle.goalOrder = index
      slot.set(particle.productId, { pos: particle.goalPos, scale: particle.goalScale })
    })

    for (const particle of particles) {
      if (primaries.includes(particle)) continue
      const home = slot.get(particle.productId)
      particle.goalRot.set(0, 0, 0)
      particle.goalOpacity = 0
      particle.goalOrder = -1
      if (home) {
        particle.goalPos.copy(home.pos)
        particle.goalScale.copy(home.scale)
      } else {
        particle.goalPos.copy(particle.mesh.position)
        particle.goalScale.copy(particle.mesh.scale)
      }
    }
  }

  const panSamples: { t: number; x: number; y: number }[] = []
  const panFlick = new THREE.Vector3()
  const panStep = new THREE.Vector3()
  const panAxisX = new THREE.Vector3()
  const panAxisY = new THREE.Vector3()

  const clearPanFlick = () => {
    panSamples.length = 0
    panFlick.set(0, 0, 0)
  }

  const rememberPanSample = (event: PointerEvent) => {
    if (drag !== 'pan' || !controls.enabled || event.buttons === 0) return
    const now = performance.now()
    panSamples.push({ t: now, x: event.clientX, y: event.clientY })
    const cutoff = now - 100
    while (panSamples.length > 1 && panSamples[0]!.t < cutoff) panSamples.shift()
  }

  const releasePanFlick = () => {
    if (drag !== 'pan' || !controls.enabled || panSamples.length < 2) {
      panSamples.length = 0
      return
    }
    const first = panSamples[0]!
    const last = panSamples[panSamples.length - 1]!
    panSamples.length = 0
    const dt = Math.max(16, last.t - first.t)
    let vx = (last.x - first.x) / dt
    let vy = (last.y - first.y) / dt
    const speed = Math.hypot(vx, vy)
    if (speed < FLICK_MIN_SPEED) return
    const capped = Math.min(speed, FLICK_MAX_SPEED) / speed
    vx *= capped
    vy *= capped
    const height = Math.max(1, renderer.domElement.clientHeight)
    const distance = camera.position.distanceTo(controls.target)
      * Math.tan((camera.fov * 0.5 * Math.PI) / 180)
    const unit = (2 * distance / height) * controls.panSpeed
    const px = vx * 1000 * FLICK_SECONDS
    const py = vy * 1000 * FLICK_SECONDS
    panAxisX.setFromMatrixColumn(camera.matrix, 0)
    panAxisY.setFromMatrixColumn(camera.matrix, 1)
    panFlick.copy(panAxisX).multiplyScalar(-unit * px)
    panFlick.addScaledVector(panAxisY, unit * py)
  }

  const applyPanFlick = (delta: number) => {
    if (panFlick.lengthSq() < 1e-8 || !controls.enabled) return
    const keep = Math.exp(-FLICK_DECAY * delta)
    panStep.copy(panFlick).multiplyScalar(1 - keep)
    controls.target.add(panStep)
    camera.position.add(panStep)
    panFlick.multiplyScalar(keep)
  }

  const onPanPointerDown = () => {
    panSamples.length = 0
    panPointer = true
  }

  const onPanPointerUp = () => {
    panPointer = false
    releasePanFlick()
  }

  const applyDrag = () => {
    const pan = drag === 'pan'
    controls.panSpeed = pan ? PAN_SPEED : 1
    controls.dampingFactor = pan ? PAN_DAMPING : ROTATE_DAMPING
    controls.enableRotate = !pan
    controls.enablePan = pan
    controls.mouseButtons.LEFT = pan ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE
    controls.touches.ONE = pan ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE
    if (!pan) clearPanFlick()
  }

  const applyModeControls = () => {
    applyDrag()
    applyAtmosphere()
    controls.enableZoom = mode !== 'control'
  }

  const wheelScale = (event: WheelEvent) => {
    const line = 16
    const page = Math.max(1, renderer.domElement.clientHeight)
    const unit = event.deltaMode === 1 ? line : event.deltaMode === 2 ? page : 1
    return unit
  }

  const onControlWheel = (event: WheelEvent) => {
    if (mode !== 'control') return
    event.preventDefault()
    if (phase !== 'live' || !controls.enabled) return
    const unit = wheelScale(event)
    const dx = event.deltaX * unit
    const dy = event.deltaY * unit
    if (!dx && !dy) return
    syncPanScrollRange()
    const glide = { programmatic: false, duration: CONTROL_LENIS_DURATION, easing: controlLenisEase }
    if (dy) panY.lenis.scrollTo(panY.lenis.targetScroll + dy, glide)
    if (dx) panX.lenis.scrollTo(panX.lenis.targetScroll + dx, glide)
  }

  const beginMorph = (next: D2Mode, frameCamera = true, intro = false) => {
    mode = next
    clearPanFlick()
    introZoom = intro && next === 'control'
    phase = 'morph'
    phaseT = 0
    framingCamera = frameCamera && next === 'control'
    for (const particle of particles) {
      if (next === 'control') particle.age = GROW_SECONDS
      particle.fromPos.copy(particle.mesh.position)
      particle.fromRot.copy(particle.mesh.rotation)
      particle.fromScale.copy(particle.mesh.scale)
      particle.fromOpacity = materialOf(particle.mesh)?.opacity ?? 1
      if (!particle.concealed) particle.mesh.visible = true
    }
    camFrom.copy(camera.position)
    tgtFrom.copy(controls.target)
    assignGoals(next)
    if (next === 'control' && !frameCamera) {
      const nextX = clamp(tgtFrom.x, -panLimitX, panLimitX)
      const nextY = clamp(tgtFrom.y, -panLimitY, panLimitY)
      camTo.copy(camFrom)
      tgtTo.copy(tgtFrom)
      camTo.x += nextX - tgtTo.x
      camTo.y += nextY - tgtTo.y
      tgtTo.x = nextX
      tgtTo.y = nextY
    }
    applyModeControls()
    morphT = 0
    controls.enabled = false
    setCanvasInput(true)
    panY.lenis.scrollTo(panY.lenis.scroll, { immediate: true, force: true })
    panX.lenis.scrollTo(panX.lenis.scroll, { immediate: true, force: true })
  }

  const applyMorph = (t: number) => {
    for (const particle of particles) {
      particle.mesh.position.lerpVectors(particle.fromPos, particle.goalPos, t)
      particle.mesh.rotation.set(
        lerp(particle.fromRot.x, particle.goalRot.x, t),
        lerp(particle.fromRot.y, particle.goalRot.y, t),
        lerp(particle.fromRot.z, particle.goalRot.z, t),
      )
      particle.mesh.scale.lerpVectors(particle.fromScale, particle.goalScale, t)
      const material = materialOf(particle.mesh)
      if (material) material.opacity = lerp(particle.fromOpacity, particle.goalOpacity, t)
      if (t >= 1 && (particle.concealed || particle.goalOpacity < 0.02)) particle.mesh.visible = false
    }
    camera.position.lerpVectors(camFrom, camTo, t)
    controls.target.lerpVectors(tgtFrom, tgtTo, t)
    camera.lookAt(controls.target)
  }

  const settleControls = () => {
    const internal = controls as unknown as {
      _sphericalDelta: { set: (x: number, y: number, z: number) => void }
      _panOffset: { set: (x: number, y: number, z: number) => void }
      _scale: number
    }
    internal._sphericalDelta.set(0, 0, 0)
    internal._panOffset.set(0, 0, 0)
    internal._scale = 1
  }

  /** Front-on means the camera sits on the +Z axis, looking back at its target. */
  const viewIsRotated = (position: THREE.Vector3, target: THREE.Vector3) => {
    const offsetX = position.x - target.x
    const offsetY = position.y - target.y
    const offsetZ = position.z - target.z
    const length = Math.hypot(offsetX, offsetY, offsetZ) || 1
    return offsetZ <= 0 || Math.abs(offsetX) / length > 0.07 || Math.abs(offsetY) / length > 0.07
  }

  const clampPan = () => {
    if (mode === 'control') updatePanLimits()
    else {
      const slack = SPREAD * 0.42
      panLimitX = slack
      panLimitY = slack
    }
    const nextX = clamp(controls.target.x, -panLimitX, panLimitX)
    const nextY = clamp(controls.target.y, -panLimitY, panLimitY)
    const dx = nextX - controls.target.x
    const dy = nextY - controls.target.y
    if (!dx && !dy) return
    controls.target.x = nextX
    controls.target.y = nextY
    camera.position.x += dx
    camera.position.y += dy
  }

  const animate = () => {
    if (disposed) return
    raf = requestAnimationFrame(animate)
    const delta = Math.min(clock.getDelta(), 0.05)
    if (phase === 'morph') {
      morphT = Math.min(1, morphT + delta / MORPH_SECONDS)
      applyMorph(easeInOut(morphT))
      if (morphT >= 1) {
        if (mode === 'control') {
          for (const particle of particles) particle.mesh.renderOrder = particle.goalOrder
        }
        if (introZoom && mode === 'control') {
          phase = 'hold'
          phaseT = 0
          controls.enabled = false
        } else {
          goLive()
        }
      }
    } else if (phase === 'hold') {
      phaseT += delta
      if (phaseT >= CONTROL_HOLD_SECONDS) beginZoomIn()
    } else if (phase === 'zoom') {
      phaseT = Math.min(1, phaseT + delta / CONTROL_ZOOM_SECONDS)
      camera.position.lerpVectors(zoomFrom, zoomTo, easeInOut(phaseT))
      camera.lookAt(controls.target)
      if (phaseT >= 1) goLive()
    } else if (mode === 'surrender') {
      for (const particle of particles) {
        if (particle.concealed) continue
        particle.age += delta
        const grow = particle.age < GROW_SECONDS ? easeOut(particle.age / GROW_SECONDS) : 1
        particle.mesh.scale.set(grow, grow, grow)
        const material = materialOf(particle.mesh)
        if (material) material.opacity = grow
      }
    }
    if (controls.enabled) controls.update()
    if (drag === 'pan' && phase === 'live') {
      applyPanFlick(delta)
      clampPan()
      if (Math.abs(controls.target.x) >= panLimitX - 0.001 && Math.sign(panFlick.x) === Math.sign(controls.target.x)) {
        panFlick.x = 0
      }
      if (Math.abs(controls.target.y) >= panLimitY - 0.001 && Math.sign(panFlick.y) === Math.sign(controls.target.y)) {
        panFlick.y = 0
      }
    }
    if (mode === 'control' && phase === 'live') {
      const now = performance.now()
      panY.lenis.raf(now)
      panX.lenis.raf(now)
      const gliding = panY.lenis.isScrolling === 'smooth' || panX.lenis.isScrolling === 'smooth'
      if (gliding && !panPointer) applyLenisToCamera()
      else writeLenisFromCamera()
    }
    renderer.render(scene, camera)
  }

  const observer = new ResizeObserver(() => resize())
  observer.observe(container)
  renderer.domElement.addEventListener('pointerdown', onPanPointerDown)
  renderer.domElement.addEventListener('pointermove', rememberPanSample)
  renderer.domElement.addEventListener('pointerup', onPanPointerUp)
  renderer.domElement.addEventListener('pointercancel', onPanPointerUp)
  renderer.domElement.addEventListener('wheel', onControlWheel, { passive: false })
  resize()
  applyDrag()
  applyAtmosphere()
  animate()

  return {
    setMedia: (media) => {
      void spawn(media)
    },
    setColors: (nextBackground, nextFog) => {
      background = nextBackground || background
      fogColor = nextFog || fogColor
      applyAtmosphere()
    },
    syncGathered: (productIds) => {
      gathered = productIds
      for (const particle of particles) {
        const hide = gathered.has(particle.productId)
        particle.concealed = hide
        if (hide) particle.mesh.visible = false
        else if (mode !== 'control' || morphT >= 1) particle.mesh.visible = true
      }
    },
    setMode: (next) => {
      if (next === mode) return
      if (next === 'control') {
        surrenderCam.copy(camera.position)
        surrenderTgt.copy(controls.target)
      } else if (viewIsRotated(camera.position, controls.target) || viewIsRotated(surrenderCam, surrenderTgt)) {
        surrenderCam.set(0, 0, CAMERA_DISTANCE)
        surrenderTgt.set(0, 0, 0)
      }
      beginMorph(next, true, next === 'control')
    },
    setDrag: (next) => {
      if (next === drag) return
      drag = next
      settleControls()
      applyDrag()
    },
    setNavigation: (enabled) => {
      navigationHeld = !enabled
      controls.enabled = enabled && phase === 'live'
      if (!enabled) clearPanFlick()
    },
    pick: (clientX, clientY) => {
      if (phase !== 'live') return null
      const bounds = renderer.domElement.getBoundingClientRect()
      if (!bounds.width || !bounds.height) return null
      pointer.x = ((clientX - bounds.left) / bounds.width) * 2 - 1
      pointer.y = -((clientY - bounds.top) / bounds.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(
        particles
          .filter((particle) => {
            if (particle.concealed || !particle.mesh.visible) return false
            const opacity = materialOf(particle.mesh)?.opacity ?? 1
            return opacity > 0.2
          })
          .map((particle) => particle.mesh),
        false,
      )
      const hit = hits[0]?.object
      if (!(hit instanceof THREE.Mesh)) return null
      const productId = String(hit.userData.productId || '')
      const item = mediaById.get(productId)
      if (!item) return null
      const screenRect = screenRectFor(hit)
      if (!screenRect) return null
      return {
        productId: item.productId,
        title: item.title,
        slug: item.slug,
        displayUrl: item.displayUrl,
        textureUrl: item.url,
        itemType: item.itemType,
        link: item.link,
        imageUrls: item.imageUrls,
        screenRect,
      }
    },
    dispose: () => {
      disposed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPanPointerDown)
      renderer.domElement.removeEventListener('pointermove', rememberPanSample)
      renderer.domElement.removeEventListener('pointerup', onPanPointerUp)
      renderer.domElement.removeEventListener('pointercancel', onPanPointerUp)
      renderer.domElement.removeEventListener('wheel', onControlWheel)
      panY.lenis.destroy()
      panX.lenis.destroy()
      panY.wrapper.remove()
      panX.wrapper.remove()
      controls.dispose()
      clearParticles()
      for (const tex of textureCache.values()) tex.dispose()
      textureCache.clear()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
