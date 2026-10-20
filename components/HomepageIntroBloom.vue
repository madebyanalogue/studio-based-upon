<template>
  <div
    class="intro-bloom"
    :class="{ 'is-in': visible }"
    aria-hidden="true"
  >
    <canvas ref="canvasEl" class="intro-bloom__canvas" />
  </div>
</template>

<script setup lang="ts">
/**
 * Bloom — bright + saturated colour-map pocket (screen blend), own auto wands, strong decay.
 * Mount beside HomepageIntroReveal when ready to layer it back on.
 */
import { useHomepageIntro } from '~/composables/useHomepagePreloader'

const COLOR_MAP =
  'https://cdn.sanity.io/images/k8gpyc57/production/1e9cc54fa247edcffae1d0808da32d7429c30d14-3000x2055.jpg?auto=format&q=80&w=2400'

/** Soft decay — still clears between bursts, without strobing. */
const SCREEN_DECAY = 0.9
const SCREEN_HEAL = 0.07
const SCREEN_BRUSH = 0.13
const SCREEN_STRENGTH = 0.82
const BURST_MS = 520
const REST_MS_MIN = 2800
const REST_MS_MAX = 4800

const EDGE_ZONES = [
  [0.12, 0.18],
  [0.88, 0.16],
  [0.08, 0.5],
  [0.92, 0.48],
  [0.14, 0.82],
  [0.86, 0.78],
  [0.28, 0.1],
  [0.72, 0.12],
  [0.22, 0.9],
  [0.78, 0.88],
  [0.06, 0.32],
  [0.94, 0.68],
  [0.38, 0.08],
  [0.62, 0.92],
] as const

const randBetween = (a: number, b: number) => a + Math.random() * (b - a)

const pickEdgeUv = (jitter = 0.1) => {
  const pick = EDGE_ZONES[Math.floor(Math.random() * EDGE_ZONES.length)]!
  const midBias = Math.random() < 0.12
  const x = midBias
    ? randBetween(0.18, 0.82)
    : pick[0] + (Math.random() - 0.5) * jitter
  const y = midBias
    ? Math.random() < 0.5
      ? randBetween(0.06, 0.22)
      : randBetween(0.78, 0.94)
    : pick[1] + (Math.random() - 0.5) * jitter
  return {
    x: Math.min(0.96, Math.max(0.04, x)),
    y: Math.min(0.96, Math.max(0.04, y)),
  }
}

const { ground } = useHomepageIntro()
const canvasEl = ref<HTMLCanvasElement | null>(null)
const visible = ref(false)

let mask: HTMLCanvasElement | null = null
let mctx: CanvasRenderingContext2D | null = null
let gctx: CanvasRenderingContext2D | null = null
/** Prebaked bright plate — avoids refiltering every frame (flicker/jank). */
let plate: HTMLCanvasElement | null = null
let pctx: CanvasRenderingContext2D | null = null
let glowImage: HTMLImageElement | null = null
let glowReady = false
let running = false
let raf = 0
let width = 1
let height = 1
let dpr = 1
let coverRect = { x: 0, y: 0, w: 1, h: 1 }

let screenX = -1
let screenY = -1
let screenLastX = -1
let screenLastY = -1
let screenTargetX = 0.12
let screenTargetY = 0.18
let screenRetargetAt = 0
let screen2X = -1
let screen2Y = -1
let screen2LastX = -1
let screen2LastY = -1
let screen2TargetX = 0.88
let screen2TargetY = 0.78
let screen2RetargetAt = 0
let screenFrame = 0
let burstUntil = 0
let restUntil = 0
let dancing = false

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })

const updateCoverRect = () => {
  if (!glowImage || !glowReady) return
  /** Match reveal: 1.85× cover. */
  const scale = 1.9
  const iw = glowImage.naturalWidth || glowImage.width
  const ih = glowImage.naturalHeight || glowImage.height
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

/** Cool, bright plate — less yellow, more luminance. */
const bakePlate = () => {
  if (!glowImage || !glowReady) return
  updateCoverRect()
  if (!plate) plate = document.createElement('canvas')
  plate.width = width
  plate.height = height
  pctx = plate.getContext('2d', { alpha: true })
  if (!pctx) return
  pctx.clearRect(0, 0, width, height)
  pctx.filter =
    'brightness(2.15) saturate(1.05) contrast(1.06) hue-rotate(-12deg)'
  pctx.drawImage(glowImage, coverRect.x, coverRect.y, coverRect.w, coverRect.h)
  pctx.filter = 'none'
}

const resize = () => {
  const view = canvasEl.value
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
  gctx = view.getContext('2d', { alpha: true })
  bakePlate()
}

const stampScreen = (x: number, y: number, vx: number, vy: number, strength = 1) => {
  if (!mctx) return
  const speed = Math.hypot(vx, vy)
  const radius =
    Math.max(width, height) * SCREEN_BRUSH * (0.9 + Math.min(0.2, speed * 0.0006))
  const amount = Math.min(0.9, strength)

  // Soft round pocket — little stretch so travel doesn't smear it thin.
  const core = mctx.createRadialGradient(x, y, 0, x, y, radius)
  core.addColorStop(0, `rgba(255,255,255,${0.88 * amount})`)
  core.addColorStop(0.35, `rgba(255,255,255,${0.32 * amount})`)
  core.addColorStop(0.7, `rgba(255,255,255,${0.08 * amount})`)
  core.addColorStop(1, 'rgba(255,255,255,0)')
  mctx.fillStyle = core
  mctx.beginPath()
  mctx.arc(x, y, radius, 0, Math.PI * 2)
  mctx.fill()
}

const paintScreenStroke = (
  fromX: number,
  fromY: number,
  x: number,
  y: number,
  strength = 1,
) => {
  if (fromX < 0) {
    stampScreen(x, y, 0, 0, 0.9 * strength)
    return { x, y }
  }
  const dx = x - fromX
  const dy = y - fromY
  const dist = Math.hypot(dx, dy)
  const step = Math.max(10 * dpr, Math.max(width, height) * SCREEN_BRUSH * 0.2)
  const steps = Math.max(1, Math.ceil(dist / step))
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps
    stampScreen(
      fromX + dx * t,
      fromY + dy * t,
      dx,
      dy,
      (0.55 + 0.3 * (1 - t)) * strength,
    )
  }
  return { x, y }
}

const pickScreenTarget = () => {
  const edge = pickEdgeUv(0.14)
  screenTargetX = edge.x
  screenTargetY = edge.y
  screenRetargetAt = performance.now() + 180 + Math.random() * 280
}

const pickScreen2Target = () => {
  const edge = pickEdgeUv(0.14)
  screen2TargetX = edge.x
  screen2TargetY = edge.y
  screen2RetargetAt = performance.now() + 160 + Math.random() * 260
}

const startBurst = (now: number) => {
  dancing = true
  burstUntil = now + BURST_MS * (0.7 + Math.random() * 0.4)
  const a = pickEdgeUv(0.08)
  // Tiny travel — sit and pulse more than streak across the frame.
  const near = {
    x: Math.min(0.96, Math.max(0.04, a.x + (Math.random() - 0.5) * 0.06)),
    y: Math.min(0.96, Math.max(0.04, a.y + (Math.random() - 0.5) * 0.06)),
  }
  screenX = a.x * width
  screenY = a.y * height
  screenTargetX = near.x
  screenTargetY = near.y
  screenRetargetAt = now + BURST_MS
  screenLastX = -1
  screenLastY = -1
  screen2LastX = -1
  screen2LastY = -1
}

const endBurst = (now: number) => {
  dancing = false
  restUntil = now + randBetween(REST_MS_MIN, REST_MS_MAX)
  screenLastX = -1
  screenLastY = -1
  screen2LastX = -1
  screen2LastY = -1
}

/** Short dancy bursts, then long rests — high decay clears between hits. */
const tickScreenWand = (now: number) => {
  if (!dancing) {
    if (now < restUntil) return
    startBurst(now)
  }
  if (now >= burstUntil) {
    endBurst(now)
    return
  }

  if (now >= screenRetargetAt) pickScreenTarget()
  if (now >= screen2RetargetAt) pickScreen2Target()

  screenFrame += 1

  // Slow linger — soft drift, steady strength (no per-frame random = no flicker).
  const speedA = 0.012
  screenX += (screenTargetX * width - screenX) * speedA
  screenY += (screenTargetY * height - screenY) * speedA
  const x1 = screenX + Math.sin(now * 0.0011) * 2.5 * dpr
  const y1 = screenY + Math.cos(now * 0.00095) * 2 * dpr
  const s1 = paintScreenStroke(screenLastX, screenLastY, x1, y1, SCREEN_STRENGTH)
  screenLastX = s1.x
  screenLastY = s1.y
}

const healScreenMask = () => {
  if (!mctx) return
  mctx.globalCompositeOperation = 'destination-in'
  mctx.fillStyle = `rgba(0,0,0,${SCREEN_DECAY})`
  mctx.fillRect(0, 0, width, height)
  mctx.globalCompositeOperation = 'destination-out'
  mctx.fillStyle = `rgba(0,0,0,${SCREEN_HEAL})`
  mctx.fillRect(0, 0, width, height)
  mctx.globalCompositeOperation = 'source-over'
}

const paintScreenLayer = () => {
  if (!gctx || !mask || !plate) return
  gctx.clearRect(0, 0, width, height)
  gctx.drawImage(plate, 0, 0)
  gctx.globalCompositeOperation = 'destination-in'
  gctx.drawImage(mask, 0, 0)
  gctx.globalCompositeOperation = 'source-over'
}

const seedScreenLayer = () => {
  if (!mctx || !glowReady) return
  // Kick the first dance burst almost immediately so it reads during the intro.
  restUntil = 0
  dancing = false
  screenX = -1
  screenY = -1
  screen2X = -1
  screen2Y = -1
  screenLastX = -1
  screenLastY = -1
  screen2LastX = -1
  screen2LastY = -1
  startBurst(performance.now())
  paintScreenLayer()
}

const frame = () => {
  if (!running) {
    raf = 0
    return
  }
  const now = performance.now()
  healScreenMask()
  tickScreenWand(now)
  paintScreenLayer()
  raf = requestAnimationFrame(frame)
}

const stop = () => {
  running = false
  cancelAnimationFrame(raf)
  raf = 0
  visible.value = false
}

const start = async () => {
  if (running) return
  resize()
  if (!glowReady) {
    const photo = await loadImage(COLOR_MAP)
    if (photo) {
      glowImage = photo
      glowReady = true
      updateCoverRect()
    }
  }
  if (!ground.value.live || !ground.value.active) return
  if (!glowReady) return

  resize()
  visible.value = true
  running = true
  seedScreenLayer()
  raf = requestAnimationFrame(frame)
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
  void loadImage(COLOR_MAP).then((photo) => {
    if (!photo) return
    glowImage = photo
    glowReady = true
    if (ground.value.live && !running) void start()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
  stop()
})
</script>

<style scoped>
.intro-bloom {
  position: fixed;
  inset: 0;
  z-index: 1;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.intro-bloom.is-in {
  opacity: 1;
}

.intro-bloom__canvas {
  display: block;
  width: 100%;
  height: 100%;
  mix-blend-mode: screen;
}
</style>
