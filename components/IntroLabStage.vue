<template>
  <div
    ref="stageEl"
    class="intro-lab-stage"
    :class="{ 'is-in': visible }"
    aria-hidden="true"
  >
    <canvas v-show="!overlay" ref="baseEl" class="intro-lab-stage__base" />
    <canvas v-show="overlay" ref="revealEl" class="intro-lab-stage__reveal" />
    <canvas
      v-show="bloom"
      ref="bloomEl"
      class="intro-lab-stage__bloom"
      :style="{ mixBlendMode: bloomBlend }"
    />
    <canvas
      v-show="darken"
      ref="darkenEl"
      class="intro-lab-stage__darken"
      :style="{ mixBlendMode: darkenBlend }"
    />
  </div>
</template>

<script setup lang="ts">
const BACKDROP = '/intro/intro-backdrop-2.jpg'
/** Upscaled high-pass map (5480²) — not the small preview. */
const MAP = '/intro/intro-dark-map.jpg'

export type BloomBlend =
  | 'screen'
  | 'lighten'
  | 'plus-lighter'
  | 'soft-light'
  | 'overlay'
  | 'color-dodge'
  | 'luminosity'
  | 'normal'

export type DarkenBlend =
  | 'multiply'
  | 'darken'
  | 'color-burn'
  | 'soft-light'
  | 'overlay'
  | 'luminosity'
  | 'normal'

const props = withDefaults(
  defineProps<{
    /** Mouse-through reveal overlay. Off → full base plate. */
    overlay?: boolean
    /** Timed auto wand on the overlay. */
    overlayAnim?: boolean
    /** Mouse-through brush radius multiplier. */
    overlaySize?: number
    /** Mouse-through stamp opacity / strength. */
    overlayStrength?: number
    /** Auto-wand strength for overlay animation. */
    overlayAnimStrength?: number
    /** How long mouse trails linger (0 = short, 1 = long). Does not dim the plate. */
    overlaySustain?: number
    /** Map high-pass light layer. */
    bloom?: boolean
    /** Auto wand reveals bloom hotspots. */
    bloomAnim?: boolean
    /** Bloom light intensity. */
    bloomStrength?: number
    /** Cover zoom multiplier (1 = fit-cover). */
    zoom?: number
    /** CSS mix-blend-mode for the bloom canvas. */
    bloomBlend?: BloomBlend
    /** Map low-pass darken / ink layer. */
    darken?: boolean
    /** Auto wand reveals darken voids. */
    darkenAnim?: boolean
    /** Darken ink intensity. */
    darkenStrength?: number
    /** CSS mix-blend-mode for the darken canvas. */
    darkenBlend?: DarkenBlend
    /** When false, stage sleeps (homepage ground handoff). */
    active?: boolean
  }>(),
  {
    overlay: true,
    overlayAnim: true,
    overlaySize: 0.9,
    overlayStrength: 1.95,
    overlayAnimStrength: 3.65,
    overlaySustain: 0.82,
    bloom: true,
    bloomAnim: true,
    bloomStrength: 1,
    zoom: 1.2,
    bloomBlend: 'plus-lighter',
    darken: false,
    darkenAnim: true,
    darkenStrength: 2,
    darkenBlend: 'soft-light',
    active: true,
  },
)

const REVEAL_BRUSH = 0.112
const REVEAL_IDLE_AFTER = 500
const REVEAL_IDLE_STRENGTH = 0.72

/** Sustain = trail length only — plate through holes stays full opacity. */
const revealDecay = () => 0.955 + props.overlaySustain * 0.042
const revealHeal = () => 0.032 * (1 - props.overlaySustain * 0.92)
const revealBrush = () => REVEAL_BRUSH * props.overlaySize
const revealStrength = () => Math.min(1.45, 0.55 * props.overlayStrength)
/** Anim strength drives stamp weight — was capped so high values barely changed anything. */
const overlayIdleAmt = () =>
  REVEAL_IDLE_STRENGTH * Math.max(0.35, props.overlayAnimStrength)
/** Brush scale for idle — 33% smaller than the previous idle wand. */
const overlayIdlePower = () =>
  Math.min(2.4, 0.95 + props.overlayAnimStrength * 0.38) * 0.67

const BLOOM_BRUSH = 0.14
/** Soft fade only — no destination-out punch (that flickered). */
const BLOOM_DECAY = 0.991

/** Darker voids / rim — darken wand prefers these. */
const DARKEN_ZONES = [
  [0.12, 0.18],
  [0.88, 0.14],
  [0.08, 0.55],
  [0.92, 0.62],
  [0.18, 0.88],
  [0.82, 0.86],
  [0.42, 0.12],
  [0.58, 0.9],
  [0.28, 0.32],
  [0.7, 0.78],
] as const

const EDGE_ZONES = [
  [0.06, 0.1],
  [0.94, 0.1],
  [0.05, 0.5],
  [0.95, 0.5],
  [0.07, 0.9],
  [0.93, 0.88],
  [0.22, 0.06],
  [0.78, 0.06],
  [0.2, 0.94],
  [0.8, 0.94],
  [0.5, 0.05],
  [0.5, 0.95],
] as const

const pickFromZones = (
  zones: readonly (readonly [number, number])[],
  jitter = 0.1,
) => {
  const pick = zones[Math.floor(Math.random() * zones.length)]!
  return {
    x: Math.min(0.96, Math.max(0.04, pick[0] + (Math.random() - 0.5) * jitter)),
    y: Math.min(0.96, Math.max(0.04, pick[1] + (Math.random() - 0.5) * jitter)),
  }
}

const pickEdgeUv = (jitter = 0.1) => pickFromZones(EDGE_ZONES, jitter)
/** Full-frame roam for bloom — not locked to map hotspots. */
const pickBloomUv = () => ({
  x: 0.06 + Math.random() * 0.88,
  y: 0.06 + Math.random() * 0.88,
})
const pickDarkenUv = (jitter = 0.1) => pickFromZones(DARKEN_ZONES, jitter)

const stageEl = ref<HTMLElement | null>(null)
const baseEl = ref<HTMLCanvasElement | null>(null)
const revealEl = ref<HTMLCanvasElement | null>(null)
const bloomEl = ref<HTMLCanvasElement | null>(null)
const darkenEl = ref<HTMLCanvasElement | null>(null)
const visible = ref(false)

let colorImg: HTMLImageElement | null = null
let mapImg: HTMLImageElement | null = null
let imagesReady = false

let width = 1
let height = 1
let dpr = 1
let coverRect = { x: 0, y: 0, w: 1, h: 1 }

let revealMask: HTMLCanvasElement | null = null
let revealMctx: CanvasRenderingContext2D | null = null
let revealVctx: CanvasRenderingContext2D | null = null

let bloomMask: HTMLCanvasElement | null = null
let bloomMctx: CanvasRenderingContext2D | null = null
let bloomVctx: CanvasRenderingContext2D | null = null
let bloomPlate: HTMLCanvasElement | null = null

let darkenMask: HTMLCanvasElement | null = null
let darkenMctx: CanvasRenderingContext2D | null = null
let darkenVctx: CanvasRenderingContext2D | null = null
let darkenPlate: HTMLCanvasElement | null = null

let raf = 0
let running = false
let pointerBound = false

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

let bloomX = -1
let bloomY = -1
let bloomLastX = -1
let bloomLastY = -1
let bloomTargetX = 0.38
let bloomTargetY = 0.48
let bloomRetargetAt = 0
let bloomFrame = 0

let darkenX = -1
let darkenY = -1
let darkenLastX = -1
let darkenLastY = -1
let darkenTargetX = 0.12
let darkenTargetY = 0.18
let darkenRetargetAt = 0
let darkenFrame = 0

const DARKEN_BRUSH = 0.32
/** Gentle fade only — no destination-out punch (that flickered). */
const DARKEN_DECAY = 0.992

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })

const updateCoverRect = (img: HTMLImageElement | null) => {
  if (!img) return
  const iw = img.naturalWidth || img.width
  const ih = img.naturalHeight || img.height
  if (!iw || !ih) return
  const cover = Math.max(width / iw, height / ih) * props.zoom
  const dw = iw * cover
  const dh = ih * cover
  coverRect = {
    x: (width - dw) / 2,
    y: (height - dh) / 2,
    w: dw,
    h: dh,
  }
}

/** High-pass light plate — keep map grain; never flatten to a solid white fill. */
const bakeBloomPlate = () => {
  if (!mapImg) return
  updateCoverRect(mapImg)
  if (!bloomPlate) bloomPlate = document.createElement('canvas')
  bloomPlate.width = width
  bloomPlate.height = height
  const ctx = bloomPlate.getContext('2d', { alpha: true })
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)
  // Crush midtones so only the lightest flecks survive; preserve stipple.
  ctx.filter = 'brightness(1.55) contrast(2.1)'
  ctx.drawImage(mapImg, coverRect.x, coverRect.y, coverRect.w, coverRect.h)
  ctx.filter = 'none'
  // Soft cool wash on top of grain — not a solid replacement.
  ctx.globalCompositeOperation = 'source-atop'
  ctx.globalAlpha = 0.28
  ctx.fillStyle = '#dce8ff'
  ctx.fillRect(0, 0, width, height)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

/**
 * Darken plate from the artwork — keep the darker half as deepened ink;
 * lights stay transparent so we never wash the frame in a black blob.
 */
const bakeDarkenPlate = () => {
  if (!colorImg) return
  updateCoverRect(colorImg)
  if (!darkenPlate) darkenPlate = document.createElement('canvas')
  darkenPlate.width = width
  darkenPlate.height = height
  const ctx = darkenPlate.getContext('2d', {
    alpha: true,
    willReadFrequently: true,
  })
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(colorImg, coverRect.x, coverRect.y, coverRect.w, coverRect.h)

  const image = ctx.getImageData(0, 0, width, height)
  const data = image.data
  /** Soft ceiling — includes deep midtones, not only near-black. */
  const ceiling = 128
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!
    const g = data[i + 1]!
    const b = data[i + 2]!
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    if (lum >= ceiling) {
      data[i + 3] = 0
      continue
    }
    const t = 1 - lum / ceiling
    const ink = Math.pow(t, 1.15)
    // Push existing darks further down (keep hue) — reads under mix-blend darken.
    data[i] = Math.round(r * (0.28 + 0.22 * (1 - ink)))
    data[i + 1] = Math.round(g * (0.28 + 0.22 * (1 - ink)))
    data[i + 2] = Math.round(b * (0.28 + 0.22 * (1 - ink)))
    data[i + 3] = Math.round(255 * Math.min(1, 0.35 + ink * 0.65))
  }
  ctx.putImageData(image, 0, 0)
}

const resize = () => {
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = Math.max(1, Math.round(window.innerWidth * dpr))
  height = Math.max(1, Math.round(window.innerHeight * dpr))

  for (const view of [baseEl.value, revealEl.value, bloomEl.value, darkenEl.value]) {
    if (!view) continue
    view.width = width
    view.height = height
  }

  if (!revealMask) revealMask = document.createElement('canvas')
  revealMask.width = width
  revealMask.height = height
  revealMctx = revealMask.getContext('2d', { alpha: true })
  revealVctx = revealEl.value?.getContext('2d', { alpha: true }) ?? null

  if (!bloomMask) bloomMask = document.createElement('canvas')
  bloomMask.width = width
  bloomMask.height = height
  bloomMctx = bloomMask.getContext('2d', { alpha: true })
  bloomVctx = bloomEl.value?.getContext('2d', { alpha: true }) ?? null

  if (!darkenMask) darkenMask = document.createElement('canvas')
  darkenMask.width = width
  darkenMask.height = height
  darkenMctx = darkenMask.getContext('2d', { alpha: true })
  darkenVctx = darkenEl.value?.getContext('2d', { alpha: true }) ?? null

  bakeBloomPlate()
  bakeDarkenPlate()
  paintBase()
}

const paintBase = () => {
  const view = baseEl.value
  const ctx = view?.getContext('2d', { alpha: true })
  if (!view || !ctx) return
  ctx.clearRect(0, 0, width, height)
  if (!colorImg || props.overlay) return
  updateCoverRect(colorImg)
  ctx.globalAlpha = 1
  ctx.drawImage(colorImg, coverRect.x, coverRect.y, coverRect.w, coverRect.h)
}

const stampReveal = (x: number, y: number, strength = 1, powerScale = 1) => {
  if (!revealMctx) return
  const brush = revealBrush() * powerScale
  const radius = Math.max(width, height) * brush * 0.98
  const amount = Math.min(0.88, strength * revealStrength() * Math.min(powerScale, 2.2) * 0.55)
  const core = revealMctx.createRadialGradient(x, y, 0, x, y, radius)
  core.addColorStop(0, `rgba(255,255,255,${0.62 * amount})`)
  core.addColorStop(0.4, `rgba(255,255,255,${0.28 * amount})`)
  core.addColorStop(0.75, `rgba(255,255,255,${0.08 * amount})`)
  core.addColorStop(1, 'rgba(255,255,255,0)')
  revealMctx.fillStyle = core
  revealMctx.beginPath()
  revealMctx.arc(x, y, radius, 0, Math.PI * 2)
  revealMctx.fill()
}

const paintRevealStroke = (
  x: number,
  y: number,
  strength = 1,
  powerScale = 1,
) => {
  const brush = revealBrush() * powerScale
  if (lastX < 0) {
    stampReveal(x, y, 0.75 * strength, powerScale)
    lastX = x
    lastY = y
    lastStamp = performance.now()
    return
  }
  const dx = x - lastX
  const dy = y - lastY
  const dist = Math.hypot(dx, dy)
  const step = Math.max(22 * dpr, Math.max(width, height) * brush * 0.55)
  const steps = Math.max(1, Math.ceil(dist / step))
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps
    stampReveal(
      lastX + dx * t,
      lastY + dy * t,
      (0.35 + 0.2 * (1 - t)) * strength,
      powerScale,
    )
  }
  lastX = x
  lastY = y
  lastStamp = performance.now()
}

const paintGrow = (cx: number, cy: number, strength = 0.35) => {
  stampReveal(cx, cy, strength, overlayIdlePower())
}

const pickDriftTarget = () => {
  // Mix rim + mid-field so anim covers more of the plate.
  const edge = Math.random() > 0.35
    ? pickEdgeUv(0.1)
    : {
        x: 0.15 + Math.random() * 0.7,
        y: 0.15 + Math.random() * 0.7,
      }
  driftTargetX = edge.x
  driftTargetY = edge.y
  driftRetargetAt = performance.now() + 1100 + Math.random() * 1000
}

const healReveal = () => {
  if (!revealMctx) return
  const decay = revealDecay()
  const heal = revealHeal()
  revealMctx.globalCompositeOperation = 'destination-in'
  revealMctx.fillStyle = `rgba(0,0,0,${decay})`
  revealMctx.fillRect(0, 0, width, height)
  revealMctx.globalCompositeOperation = 'destination-out'
  revealMctx.fillStyle = `rgba(0,0,0,${heal})`
  revealMctx.fillRect(0, 0, width, height)
  revealMctx.globalCompositeOperation = 'source-over'
}

const paintRevealLayer = () => {
  if (!revealVctx || !revealMask || !colorImg || !props.overlay) return
  updateCoverRect(colorImg)
  revealVctx.clearRect(0, 0, width, height)
  // Always full plate through the mask — sustain never dims this.
  revealVctx.globalAlpha = 1
  revealVctx.drawImage(colorImg, coverRect.x, coverRect.y, coverRect.w, coverRect.h)
  revealVctx.globalCompositeOperation = 'destination-in'
  revealVctx.drawImage(revealMask, 0, 0)
  revealVctx.globalCompositeOperation = 'source-over'
}

const tickRevealIdle = (now: number) => {
  if (!props.overlay || !props.overlayAnim) return
  if (now - lastUserMove <= REVEAL_IDLE_AFTER) {
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
  driftX += (driftTargetX * width - driftX) * 0.018
  driftY += (driftTargetY * height - driftY) * 0.018
  const x = driftX + Math.sin(now * 0.00055) * 4 * dpr
  const y = driftY + Math.cos(now * 0.00042) * 3.5 * dpr
  if (!idlePainting) {
    idlePainting = true
    lastX = x
    lastY = y
  }
  idleFrame += 1
  // Paint most frames — sparse stamps were under-reading vs mouse.
  if (idleFrame % 2 === 0) {
    paintRevealStroke(x, y, overlayIdleAmt(), overlayIdlePower())
  } else {
    lastX = x
    lastY = y
  }
  mouseX = x
  mouseY = y
}

const stampBloom = (x: number, y: number, strength = 1) => {
  if (!bloomMctx) return
  const radius = Math.max(width, height) * BLOOM_BRUSH
  // Soft veil — plate carries flecks; keep stamps gentle to avoid flicker.
  const amount = Math.min(0.5, strength * 0.4 * Math.max(0.2, props.bloomStrength))
  const core = bloomMctx.createRadialGradient(x, y, 0, x, y, radius)
  core.addColorStop(0, `rgba(255,255,255,${0.5 * amount})`)
  core.addColorStop(0.45, `rgba(255,255,255,${0.16 * amount})`)
  core.addColorStop(0.8, `rgba(255,255,255,${0.04 * amount})`)
  core.addColorStop(1, 'rgba(255,255,255,0)')
  bloomMctx.fillStyle = core
  bloomMctx.beginPath()
  bloomMctx.arc(x, y, radius, 0, Math.PI * 2)
  bloomMctx.fill()
}

const paintBloomStroke = (
  fromX: number,
  fromY: number,
  x: number,
  y: number,
  strength = 1,
) => {
  if (fromX < 0) {
    stampBloom(x, y, 0.75 * strength)
    return { x, y }
  }
  const dx = x - fromX
  const dy = y - fromY
  const dist = Math.hypot(dx, dy)
  // Wide steps → fewer overlaps → less pulse while covering distance.
  const step = Math.max(26 * dpr, Math.max(width, height) * BLOOM_BRUSH * 0.42)
  const steps = Math.max(1, Math.ceil(dist / step))
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps
    stampBloom(fromX + dx * t, fromY + dy * t, (0.4 + 0.2 * (1 - t)) * strength)
  }
  return { x, y }
}

const healBloom = () => {
  if (!bloomMctx) return
  bloomMctx.globalCompositeOperation = 'destination-in'
  bloomMctx.fillStyle = `rgba(0,0,0,${BLOOM_DECAY})`
  bloomMctx.fillRect(0, 0, width, height)
  bloomMctx.globalCompositeOperation = 'source-over'
}

/** Overlay mouse-through also windows bloom/darken — same holes only. */
const clipLayerToOverlay = (ctx: CanvasRenderingContext2D) => {
  if (!props.overlay || !revealMask) return
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'destination-in'
  ctx.drawImage(revealMask, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
}

const paintBloomLayer = () => {
  if (!bloomVctx || !bloomPlate || !props.bloom) return
  bloomVctx.clearRect(0, 0, width, height)
  // Cap opacity — screen + grain should read as sparkle, not a white wash.
  const alpha = Math.min(0.95, Math.max(0, props.bloomStrength * 0.72))
  bloomVctx.globalAlpha = alpha
  if (!props.bloomAnim) {
    bloomVctx.drawImage(bloomPlate, 0, 0)
  } else if (bloomMask) {
    bloomVctx.drawImage(bloomPlate, 0, 0)
    bloomVctx.globalCompositeOperation = 'destination-in'
    bloomVctx.drawImage(bloomMask, 0, 0)
    bloomVctx.globalCompositeOperation = 'source-over'
  }
  bloomVctx.globalAlpha = 1
  clipLayerToOverlay(bloomVctx)
}

const pickBloomTarget = () => {
  const spot = pickBloomUv()
  bloomTargetX = spot.x
  bloomTargetY = spot.y
  // Frequent targets across the whole frame — constant travel.
  bloomRetargetAt = performance.now() + 900 + Math.random() * 800
}

const seedBloomAuto = () => {
  if (!bloomMctx || !props.bloom) return
  bloomMctx.clearRect(0, 0, width, height)
  bloomLastX = -1
  bloomLastY = -1
  bloomFrame = 0
  bloomX = -1
  bloomY = -1
  if (!props.bloomAnim) return
  const spot = pickBloomUv()
  stampBloom(spot.x * width, spot.y * height, 0.65)
  bloomX = spot.x * width
  bloomY = spot.y * height
  bloomLastX = bloomX
  bloomLastY = bloomY
  pickBloomTarget()
}

const tickBloom = (now: number) => {
  if (!props.bloom || !props.bloomAnim) return
  healBloom()
  if (bloomX < 0) {
    const spot = pickBloomUv()
    bloomX = spot.x * width
    bloomY = spot.y * height
    bloomLastX = bloomX
    bloomLastY = bloomY
    pickBloomTarget()
  }
  if (now >= bloomRetargetAt) pickBloomTarget()
  // Faster full-screen crawl.
  bloomX += (bloomTargetX * width - bloomX) * 0.02
  bloomY += (bloomTargetY * height - bloomY) * 0.02
  const x1 = bloomX + Math.sin(now * 0.0005) * 3 * dpr
  const y1 = bloomY + Math.cos(now * 0.0004) * 2.5 * dpr
  bloomFrame += 1
  // Sparse stamps + soft fade = more travel, no flicker.
  if (bloomFrame % 3 === 0) {
    const s1 = paintBloomStroke(bloomLastX, bloomLastY, x1, y1, 0.55)
    bloomLastX = s1.x
    bloomLastY = s1.y
  } else {
    bloomLastX = x1
    bloomLastY = y1
  }
}

const stampDarken = (x: number, y: number, strength = 1) => {
  if (!darkenMctx) return
  const radius = Math.max(width, height) * DARKEN_BRUSH
  const amount = Math.min(0.9, strength * 0.75 * Math.max(0.35, props.darkenStrength * 0.55))
  const core = darkenMctx.createRadialGradient(x, y, 0, x, y, radius)
  core.addColorStop(0, `rgba(255,255,255,${0.78 * amount})`)
  core.addColorStop(0.4, `rgba(255,255,255,${0.32 * amount})`)
  core.addColorStop(0.75, `rgba(255,255,255,${0.08 * amount})`)
  core.addColorStop(1, 'rgba(255,255,255,0)')
  darkenMctx.fillStyle = core
  darkenMctx.beginPath()
  darkenMctx.arc(x, y, radius, 0, Math.PI * 2)
  darkenMctx.fill()
}

const paintDarkenStroke = (
  fromX: number,
  fromY: number,
  x: number,
  y: number,
  strength = 1,
) => {
  if (fromX < 0) {
    stampDarken(x, y, 0.75 * strength)
    return { x, y }
  }
  const dx = x - fromX
  const dy = y - fromY
  const dist = Math.hypot(dx, dy)
  // Wide steps → fewer overlapping stamps → less pulse flicker.
  const step = Math.max(28 * dpr, Math.max(width, height) * DARKEN_BRUSH * 0.45)
  const steps = Math.max(1, Math.ceil(dist / step))
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps
    stampDarken(fromX + dx * t, fromY + dy * t, (0.4 + 0.2 * (1 - t)) * strength)
  }
  return { x, y }
}

const healDarken = () => {
  if (!darkenMctx) return
  // Single soft multiply fade — skip destination-out punch (that flickered).
  darkenMctx.globalCompositeOperation = 'destination-in'
  darkenMctx.fillStyle = `rgba(0,0,0,${DARKEN_DECAY})`
  darkenMctx.fillRect(0, 0, width, height)
  darkenMctx.globalCompositeOperation = 'source-over'
}

const paintDarkenLayer = () => {
  if (!darkenVctx || !darkenPlate || !props.darken) return
  darkenVctx.clearRect(0, 0, width, height)
  const alpha = Math.min(1.6, Math.max(0, props.darkenStrength * 0.85))
  darkenVctx.globalAlpha = alpha
  if (!props.darkenAnim) {
    darkenVctx.drawImage(darkenPlate, 0, 0)
  } else if (darkenMask) {
    darkenVctx.drawImage(darkenPlate, 0, 0)
    darkenVctx.globalCompositeOperation = 'destination-in'
    darkenVctx.drawImage(darkenMask, 0, 0)
    darkenVctx.globalCompositeOperation = 'source-over'
  }
  darkenVctx.globalAlpha = 1
  clipLayerToOverlay(darkenVctx)
}

const pickDarkenTarget = () => {
  const spot = pickDarkenUv(0.14)
  darkenTargetX = spot.x
  darkenTargetY = spot.y
  // Steady retarget cadence — constant motion without jump-flicker.
  darkenRetargetAt = performance.now() + 1600 + Math.random() * 1200
}

const seedDarkenAuto = () => {
  if (!darkenMctx || !props.darken) return
  darkenMctx.clearRect(0, 0, width, height)
  darkenLastX = -1
  darkenLastY = -1
  darkenFrame = 0
  darkenX = -1
  darkenY = -1
  if (!props.darkenAnim) return
  const spot = pickDarkenUv(0.1)
  stampDarken(spot.x * width, spot.y * height, 0.7)
  darkenX = spot.x * width
  darkenY = spot.y * height
  darkenLastX = darkenX
  darkenLastY = darkenY
  pickDarkenTarget()
}

const tickDarken = (now: number) => {
  if (!props.darken || !props.darkenAnim) return
  healDarken()
  if (darkenX < 0) {
    const spot = pickDarkenUv(0.1)
    darkenX = spot.x * width
    darkenY = spot.y * height
    darkenLastX = darkenX
    darkenLastY = darkenY
    pickDarkenTarget()
  }
  if (now >= darkenRetargetAt) pickDarkenTarget()
  // Smooth continuous crawl.
  darkenX += (darkenTargetX * width - darkenX) * 0.014
  darkenY += (darkenTargetY * height - darkenY) * 0.014
  const x1 = darkenX + Math.sin(now * 0.00045) * 3 * dpr
  const y1 = darkenY + Math.cos(now * 0.00038) * 2.5 * dpr
  darkenFrame += 1
  // Sparse stamps + soft fade = steady ink, no flash.
  if (darkenFrame % 3 === 0) {
    const s1 = paintDarkenStroke(darkenLastX, darkenLastY, x1, y1, 0.55)
    darkenLastX = s1.x
    darkenLastY = s1.y
  } else {
    darkenLastX = x1
    darkenLastY = y1
  }
}

const frame = () => {
  if (!running) {
    raf = 0
    return
  }
  const now = performance.now()

  if (props.overlay) {
    healReveal()
    tickRevealIdle(now)
    if (mouseX >= 0 && !idlePainting && now - lastStamp < 55) {
      stampReveal(lagX >= 0 ? lagX : mouseX, lagY >= 0 ? lagY : mouseY, 0.12)
    }
    paintRevealLayer()
  } else {
    if (revealVctx) revealVctx.clearRect(0, 0, width, height)
    paintBase()
  }

  if (props.darken) {
    tickDarken(now)
    paintDarkenLayer()
  } else if (darkenVctx) {
    darkenVctx.clearRect(0, 0, width, height)
  }

  if (props.bloom) {
    tickBloom(now)
    paintBloomLayer()
  } else if (bloomVctx) {
    bloomVctx.clearRect(0, 0, width, height)
  }

  raf = requestAnimationFrame(frame)
}

const onPointer = (event: PointerEvent) => {
  if (!props.overlay) return
  mouseX = event.clientX * dpr
  mouseY = event.clientY * dpr
  lastUserMove = performance.now()
  idlePainting = false
  idleFrame = 0
  driftX = mouseX
  driftY = mouseY
  if (lagX < 0) {
    lagX = mouseX
    lagY = mouseY
  } else {
    lagX += (mouseX - lagX) * 0.22
    lagY += (mouseY - lagY) * 0.22
  }
  paintRevealStroke(mouseX, mouseY)
}

const bindPointer = () => {
  if (pointerBound) return
  pointerBound = true
  window.addEventListener('pointermove', onPointer, { passive: true })
}

const unbindPointer = () => {
  if (!pointerBound) return
  pointerBound = false
  window.removeEventListener('pointermove', onPointer)
}

const seedOverlayAuto = () => {
  if (!revealMctx || !props.overlay) return
  revealMctx.clearRect(0, 0, width, height)
  if (revealVctx) revealVctx.clearRect(0, 0, width, height)

  lastX = -1
  lastY = -1
  lagX = -1
  lagY = -1
  idlePainting = false
  idleFrame = 0

  if (!props.overlayAnim) {
    mouseX = -1
    mouseY = -1
    driftX = -1
    driftY = -1
    lastUserMove = performance.now()
    return
  }

  const edge = pickEdgeUv(0.08)
  paintGrow(edge.x * width, edge.y * height, 0.85 * Math.max(0.35, props.overlayAnimStrength * 0.45))
  driftX = edge.x * width
  driftY = edge.y * height
  mouseX = driftX
  mouseY = driftY
  pickDriftTarget()
  lastUserMove = performance.now() - REVEAL_IDLE_AFTER
  idlePainting = true
}

const seedOpening = () => {
  seedOverlayAuto()
  seedDarkenAuto()
  seedBloomAuto()
}

const start = async () => {
  if (running) return
  if (!props.active) return
  if (!imagesReady) {
    const [color, map] = await Promise.all([loadImage(BACKDROP), loadImage(MAP)])
    if (!color) return
    colorImg = color
    mapImg = map
    imagesReady = true
  }
  if (!props.active) return
  await nextTick()
  resize()
  seedOpening()
  paintBase()
  visible.value = true
  running = true
  bindPointer()
  raf = requestAnimationFrame(frame)
}

const stop = () => {
  running = false
  visible.value = false
  unbindPointer()
  cancelAnimationFrame(raf)
  raf = 0
}

watch(
  () => [props.overlay, props.overlayAnim] as const,
  ([overlayOn]) => {
    if (overlayOn) seedOverlayAuto()
    else if (revealVctx) revealVctx.clearRect(0, 0, width, height)
    paintBase()
  },
)

watch(
  () => [props.bloom, props.bloomAnim] as const,
  () => {
    bakeBloomPlate()
    if (props.bloom) seedBloomAuto()
    else if (bloomVctx) bloomVctx.clearRect(0, 0, width, height)
  },
)

watch(
  () => [props.darken, props.darkenAnim] as const,
  () => {
    bakeDarkenPlate()
    if (props.darken) seedDarkenAuto()
    else if (darkenVctx) darkenVctx.clearRect(0, 0, width, height)
  },
)

watch(
  () => props.zoom,
  () => {
    bakeBloomPlate()
    bakeDarkenPlate()
    paintBase()
    if (props.overlay) paintRevealLayer()
  },
)

watch(
  () => props.active,
  (on) => {
    if (on) void start()
    else stop()
  },
)

onMounted(() => {
  window.addEventListener('resize', resize)
  if (props.active) void start()
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
  stop()
})
</script>

<style scoped>
.intro-lab-stage {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background: #000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 1.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.intro-lab-stage.is-in {
  opacity: 1;
}

.intro-lab-stage__base,
.intro-lab-stage__reveal,
.intro-lab-stage__bloom,
.intro-lab-stage__darken {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.intro-lab-stage__reveal {
  z-index: 1;
}

.intro-lab-stage__darken {
  z-index: 2;
}

.intro-lab-stage__bloom {
  z-index: 3;
}
</style>
