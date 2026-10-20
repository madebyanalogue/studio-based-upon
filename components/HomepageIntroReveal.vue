<template>
  <div
    ref="stageEl"
    class="intro-reveal"
    :class="{ 'is-in': visible }"
    aria-hidden="true"
  >
    <canvas ref="viewEl" class="intro-reveal__canvas" />
  </div>
</template>

<script setup lang="ts">
import { useHomepageIntro } from '~/composables/useHomepagePreloader'

const GROUND =
  'https://cdn.sanity.io/images/k8gpyc57/production/1e9cc54fa247edcffae1d0808da32d7429c30d14-3000x2055.jpg?auto=format&q=80&w=2400'

/** Softer grow — more decay so pockets breathe rather than linger. */
const DECAY = 0.988
const HEAL_OUT = 0.012
const BRUSH = 0.112
const IDLE_AFTER_MS = 280
const IDLE_STRENGTH = 0.22
/** Soft opening grows before the split slider arrives. */
const OPENING_GROWS = 3

/** Edge-biased UV spots — keep auto grows off the dead centre. */
const EDGE_ZONES = [
  [0.12, 0.18],
  [0.88, 0.16],
  [0.08, 0.48],
  [0.92, 0.52],
  [0.16, 0.82],
  [0.84, 0.78],
  [0.3, 0.1],
  [0.7, 0.12],
  [0.24, 0.9],
  [0.76, 0.88],
  [0.06, 0.34],
  [0.94, 0.66],
] as const

const pickEdgeUv = (jitter = 0.1) => {
  const pick = EDGE_ZONES[Math.floor(Math.random() * EDGE_ZONES.length)]!
  return {
    x: Math.min(0.96, Math.max(0.04, pick[0] + (Math.random() - 0.5) * jitter)),
    y: Math.min(0.96, Math.max(0.04, pick[1] + (Math.random() - 0.5) * jitter)),
  }
}

const { ground } = useHomepageIntro()
const stageEl = ref<HTMLElement | null>(null)
const viewEl = ref<HTMLCanvasElement | null>(null)
const visible = ref(false)

let mask: HTMLCanvasElement | null = null
let mctx: CanvasRenderingContext2D | null = null
let vctx: CanvasRenderingContext2D | null = null
let image: HTMLImageElement | null = null
let imageReady = false
let pointerBound = false
let running = false
let raf = 0
let width = 1
let height = 1
let dpr = 1
let mouseX = -1
let mouseY = -1
let lastX = -1
let lastY = -1
let lagX = -1
let lagY = -1
let lastStamp = 0
let lastUserMove = 0
let driftX = -1
let driftY = -1
let driftTargetX = 0.12
let driftTargetY = 0.18
let driftRetargetAt = 0
let idlePainting = false
let idleFrame = 0
let coverRect = { x: 0, y: 0, w: 1, h: 1 }

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })

const updateCoverRect = () => {
  if (!image || !imageReady) return
  /** Cover scale — 1.85× zoomed in. */
  const scale = 1.9
  const iw = image.naturalWidth || image.width
  const ih = image.naturalHeight || image.height
  if (!iw || !ih) return
  const cover = Math.max(width / iw, height / ih) * scale
  const dw = iw * cover
  const dh = ih * cover
  coverRect = {
    x: (width - dw) / 2,
    y: (height - dh) / 2,
    w: dw,
    h: dh,
  }
}

const resize = () => {
  const view = viewEl.value
  if (!view) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = Math.max(1, Math.round(window.innerWidth * dpr))
  height = Math.max(1, Math.round(window.innerHeight * dpr))
  view.width = width
  view.height = height
  if (!mask) mask = document.createElement('canvas')
  mask.width = width
  mask.height = height
  mctx = mask.getContext('2d', { alpha: true })
  vctx = view.getContext('2d', { alpha: true })
  updateCoverRect()
}

/** Soft round grow — little stretch so it reads as bloom, not a streak. */
const stampAt = (x: number, y: number, _vx: number, _vy: number, strength = 1) => {
  if (!mctx) return
  const radius = Math.max(width, height) * BRUSH * (0.95 + Math.random() * 0.12)
  const amount = Math.min(0.42, strength)

  const core = mctx.createRadialGradient(x, y, 0, x, y, radius)
  core.addColorStop(0, `rgba(255,255,255,${0.48 * amount})`)
  core.addColorStop(0.4, `rgba(255,255,255,${0.2 * amount})`)
  core.addColorStop(0.75, `rgba(255,255,255,${0.06 * amount})`)
  core.addColorStop(1, 'rgba(255,255,255,0)')
  mctx.fillStyle = core
  mctx.beginPath()
  mctx.arc(x, y, radius, 0, Math.PI * 2)
  mctx.fill()

  const halo = radius * 1.45
  const side = mctx.createRadialGradient(x, y, radius * 0.2, x, y, halo)
  side.addColorStop(0, `rgba(255,255,255,${0.08 * amount})`)
  side.addColorStop(0.6, `rgba(255,255,255,${0.025 * amount})`)
  side.addColorStop(1, 'rgba(255,255,255,0)')
  mctx.fillStyle = side
  mctx.beginPath()
  mctx.arc(x, y, halo, 0, Math.PI * 2)
  mctx.fill()
}

const pickDriftTarget = () => {
  const edge = pickEdgeUv(0.12)
  driftTargetX = edge.x
  driftTargetY = edge.y
  driftRetargetAt = performance.now() + 2200 + Math.random() * 2400
}

const paintStroke = (x: number, y: number, strength = 1) => {
  if (lastX < 0) {
    stampAt(x, y, 0, 0, 0.75 * strength)
    lastX = x
    lastY = y
    lastStamp = performance.now()
    return
  }
  const dx = x - lastX
  const dy = y - lastY
  const dist = Math.hypot(dx, dy)
  // Wide steps = soft grow along a slow path, not a dense streak.
  const step = Math.max(18 * dpr, Math.max(width, height) * BRUSH * 0.45)
  const steps = Math.max(1, Math.ceil(dist / step))
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps
    stampAt(lastX + dx * t, lastY + dy * t, 0, 0, (0.4 + 0.2 * (1 - t)) * strength)
  }
  lastX = x
  lastY = y
  lastStamp = performance.now()
}

/** Soft expanding pocket at an edge point. */
const paintGrow = (cx: number, cy: number, strength = 0.65) => {
  const layers = 4
  for (let i = 0; i < layers; i += 1) {
    const t = i / (layers - 1)
    const ox = (Math.random() - 0.5) * 10 * dpr
    const oy = (Math.random() - 0.5) * 10 * dpr
    stampAt(cx + ox, cy + oy, 0, 0, strength * (0.55 + 0.45 * (1 - t)))
  }
}

const tickIdleDrift = (now: number) => {
  const idle = now - lastUserMove > IDLE_AFTER_MS
  if (!idle) {
    idlePainting = false
    idleFrame = 0
    return
  }

  if (driftX < 0) {
    const edge = pickEdgeUv(0.08)
    driftX = edge.x * width
    driftY = edge.y * height
    pickDriftTarget()
  }
  if (now >= driftRetargetAt) pickDriftTarget()

  // Slow crawl between edge pockets.
  const tx = driftTargetX * width
  const ty = driftTargetY * height
  driftX += (tx - driftX) * 0.008
  driftY += (ty - driftY) * 0.008
  const x = driftX + Math.sin(now * 0.00055) * 4 * dpr
  const y = driftY + Math.cos(now * 0.00045) * 3 * dpr

  if (!idlePainting) {
    idlePainting = true
    lastX = x
    lastY = y
  }
  idleFrame += 1
  // Paint sparingly so each touch can grow before the next.
  if (idleFrame % 5 === 0) {
    paintStroke(x, y, IDLE_STRENGTH)
  } else {
    lastX = x
    lastY = y
  }
  mouseX = x
  mouseY = y

  if (idleFrame % 90 === 0) {
    const edge = pickEdgeUv(0.1)
    paintGrow(edge.x * width, edge.y * height, 0.4)
  }
}

const drawImageCover = (ctx: CanvasRenderingContext2D) => {
  if (!image || !imageReady) return
  updateCoverRect()
  ctx.drawImage(image, coverRect.x, coverRect.y, coverRect.w, coverRect.h)
}

const healMask = () => {
  if (!mctx) return
  mctx.globalCompositeOperation = 'destination-in'
  mctx.fillStyle = `rgba(0,0,0,${DECAY})`
  mctx.fillRect(0, 0, width, height)
  mctx.globalCompositeOperation = 'destination-out'
  mctx.fillStyle = `rgba(0,0,0,${HEAL_OUT})`
  mctx.fillRect(0, 0, width, height)
  mctx.globalCompositeOperation = 'source-over'
}

const frame = () => {
  if (!running || !mctx || !vctx || !mask) {
    raf = 0
    return
  }

  healMask()

  const now = performance.now()
  tickIdleDrift(now)

  if (mouseX >= 0 && !idlePainting) {
    if (lagX < 0) {
      lagX = mouseX
      lagY = mouseY
    } else {
      lagX += (mouseX - lagX) * 0.22
      lagY += (mouseY - lagY) * 0.22
    }
    if (now - lastStamp < 55) {
      stampAt(lagX, lagY, 0, 0, 0.12)
    }
  }

  vctx.clearRect(0, 0, width, height)
  drawImageCover(vctx)
  vctx.globalCompositeOperation = 'destination-in'
  vctx.drawImage(mask, 0, 0)
  vctx.globalCompositeOperation = 'source-over'

  raf = requestAnimationFrame(frame)
}

const ensureLoop = () => {
  if (raf || !running) return
  raf = requestAnimationFrame(frame)
}

const onPointer = (event: PointerEvent) => {
  mouseX = event.clientX * dpr
  mouseY = event.clientY * dpr
  lastUserMove = performance.now()
  idlePainting = false
  idleFrame = 0
  driftX = mouseX
  driftY = mouseY
  paintStroke(mouseX, mouseY)
  ensureLoop()
}

const onPointerLeave = () => {
  lastX = -1
  lastY = -1
}

const bindPointer = () => {
  if (pointerBound) return
  pointerBound = true
  window.addEventListener('pointermove', onPointer, { passive: true })
  window.addEventListener('pointerleave', onPointerLeave)
}

const unbindPointer = () => {
  if (!pointerBound) return
  pointerBound = false
  window.removeEventListener('pointermove', onPointer)
  window.removeEventListener('pointerleave', onPointerLeave)
}

const stop = () => {
  running = false
  unbindPointer()
  cancelAnimationFrame(raf)
  raf = 0
  visible.value = false
}

/** 2–3 soft edge grows ready before the slider wipes in. */
const seedOpeningGrows = () => {
  if (!mctx || !imageReady) return
  mctx.globalCompositeOperation = 'source-over'
  let endX = width * 0.2
  let endY = height * 0.2

  for (let i = 0; i < OPENING_GROWS; i += 1) {
    const edge = pickEdgeUv(0.1)
    const cx = edge.x * width
    const cy = edge.y * height
    paintGrow(cx, cy, 0.55 + Math.random() * 0.2)
    endX = cx
    endY = cy
  }

  lagX = endX
  lagY = endY
  mouseX = endX
  mouseY = endY
  driftX = endX
  driftY = endY
  lastX = -1
  lastY = -1
  pickDriftTarget()
  lastUserMove = performance.now() - IDLE_AFTER_MS
  idlePainting = true
}

const start = async () => {
  if (running) return
  resize()
  if (!imageReady) {
    const photo = await loadImage(GROUND)
    if (!photo) return
    image = photo
    imageReady = true
  }
  if (!ground.value.live || !ground.value.active) return
  resize()
  visible.value = true
  running = true
  seedOpeningGrows()
  bindPointer()
  ensureLoop()
}

watch(
  () => ground.value.live,
  (live) => {
    if (live) void start()
    else stop()
  },
  { immediate: true },
)

watch(
  () => ground.value.active,
  (active) => {
    if (!active) stop()
  },
)

onMounted(() => {
  window.addEventListener('resize', resize)
  void loadImage(GROUND).then((photo) => {
    if (!photo) return
    image = photo
    imageReady = true
    if (ground.value.live && !running) void start()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
  stop()
})
</script>

<style scoped>
.intro-reveal {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
  transition: opacity 1.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.intro-reveal.is-in {
  opacity: 1;
}

.intro-reveal__canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>

<style>
body.infinite-slider-active .page-wrapper {
  position: relative;
  z-index: 2;
}

body.infinite-slider-active .header {
  z-index: 3;
}
</style>
