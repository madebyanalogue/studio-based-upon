<template>
  <div ref="rootEl" class="slider-statement">
    <canvas ref="viewEl" class="slider-statement__canvas" aria-hidden="true" />
    <span ref="measureEl" class="slider-statement__measure" aria-hidden="true">Ag</span>
    <p class="slider-statement__sr">
      Two decades of making for extraordinary spaces around the world.
    </p>
  </div>
</template>

<script setup lang="ts">
const LINES = ['Two decades of making', 'for extraordinary spaces', 'around the world.']

type Mote = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  age: number
  size: number
  seed: number
  r: number
  g: number
  b: number
}

const emit = defineEmits<{ clear: [] }>()

const rootEl = ref<HTMLElement | null>(null)
const viewEl = ref<HTMLCanvasElement | null>(null)
const measureEl = ref<HTMLElement | null>(null)

const reduce =
  import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches

let glyph: HTMLCanvasElement | null = null
let gctx: CanvasRenderingContext2D | null = null
let vctx: CanvasRenderingContext2D | null = null
let ink = 0
let touched = false
let cleared = false
let raf = 0
let lastStampX = Number.NaN
let lastStampY = Number.NaN
let lastFrame = 0
const motes: Mote[] = []
const MOTE_CAP = 720
let brushR = 76

const finish = () => {
  if (cleared) return
  cleared = true
  cancelAnimationFrame(raf)
  raf = 0
  emit('clear')
}

const countInk = () => {
  if (!gctx || !glyph) return 0
  const data = gctx.getImageData(0, 0, glyph.width, glyph.height).data
  let n = 0
  for (let i = 3; i < data.length; i += 4) {
    if (data[i]! > 24) n += 1
  }
  return n
}

const paintGlyphs = () => {
  const view = viewEl.value
  const measure = measureEl.value
  const root = rootEl.value
  if (!view || !measure || !root || touched || cleared) return
  const cssW = root.clientWidth
  const cssH = root.clientHeight
  if (cssW < 2 || cssH < 2) return

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = Math.round(cssW * dpr)
  const h = Math.round(cssH * dpr)
  brushR = 76 * dpr

  view.width = w
  view.height = h
  if (!glyph) glyph = document.createElement('canvas')
  glyph.width = w
  glyph.height = h
  gctx = glyph.getContext('2d', { willReadFrequently: true })
  vctx = view.getContext('2d')
  if (!gctx || !vctx) return

  const cs = getComputedStyle(measure)
  const size = parseFloat(cs.fontSize) || 24
  const leading = Number.isFinite(parseFloat(cs.lineHeight))
    ? parseFloat(cs.lineHeight)
    : size * 1.15
  gctx.clearRect(0, 0, w, h)
  gctx.font = `${cs.fontStyle} ${cs.fontWeight} ${size * dpr}px ${cs.fontFamily}`
  gctx.fillStyle = cs.color || '#f4f1ea'
  gctx.textAlign = 'center'
  gctx.textBaseline = 'middle'
  if ('letterSpacing' in gctx) {
    gctx.letterSpacing = `${(parseFloat(cs.letterSpacing) || 0) * dpr}px`
  }
  const block = (LINES.length - 1) * leading * dpr
  const startY = h / 2 - block / 2
  for (let i = 0; i < LINES.length; i += 1) {
    gctx.fillText(LINES[i]!, w / 2, startY + i * leading * dpr)
  }
  ink = countInk()
  draw()
}

const spawn = (x: number, y: number, r: number, g: number, b: number, awayX: number, awayY: number) => {
  if (motes.length >= MOTE_CAP) motes.shift()
  const ang = Math.atan2(awayY, awayX) + (Math.random() - 0.5) * 1.1
  const speed = 0.35 + Math.random() * 2.4
  motes.push({
    x,
    y,
    vx: Math.cos(ang) * speed + (Math.random() - 0.5) * 0.8,
    vy: Math.sin(ang) * speed - Math.random() * 1.1,
    life: 1.15 + Math.random() * 1.35,
    age: 0,
    size: (Math.random() < 0.16 ? 2.4 + Math.random() * 2.2 : 0.7 + Math.random() * 1.5) * (brushR / 38),
    seed: Math.random() * Math.PI * 2,
    r,
    g,
    b,
  })
}

const stamp = (px: number, py: number) => {
  if (!gctx || !glyph || cleared || ink <= 0) return
  const r = brushR
  const x0 = Math.max(0, Math.floor(px - r))
  const y0 = Math.max(0, Math.floor(py - r))
  const x1 = Math.min(glyph.width, Math.ceil(px + r))
  const y1 = Math.min(glyph.height, Math.ceil(py + r))
  const sw = x1 - x0
  const sh = y1 - y0
  if (sw <= 0 || sh <= 0) return

  const image = gctx.getImageData(x0, y0, sw, sh)
  const data = image.data
  const r2 = r * r
  let ate = 0
  let spawned = 0
  for (let y = 0; y < sh; y += 1) {
    for (let x = 0; x < sw; x += 1) {
      const dx = x0 + x - px
      const dy = y0 + y - py
      const d2 = dx * dx + dy * dy
      if (d2 > r2) continue
      const i = (y * sw + x) * 4
      const alpha = data[i + 3]!
      if (alpha < 24) continue
      const edge = Math.sqrt(d2) / r
      if (edge > 0.62 && Math.random() > (1 - edge) * 2.4) continue
      if (!reduce && spawned < 12 && Math.random() < 0.35) {
        spawn(x0 + x, y0 + y, data[i]!, data[i + 1]!, data[i + 2]!, dx || 0.01, dy || 0.01)
        spawned += 1
      }
      data[i + 3] = 0
      ate += 1
    }
  }
  if (!ate) return
  touched = true
  gctx.putImageData(image, x0, y0)
  ink = Math.max(0, ink - ate)
  if (!reduce) {
    for (let n = 0; n < 6; n += 1) {
      const ox = (Math.random() - 0.5) * r * 0.45
      const oy = (Math.random() - 0.5) * r * 0.45
      spawn(px + ox, py + oy, 244, 241, 234, ox || 0.2, oy || -0.4)
    }
  }
  if (reduce) finish()
}

const draw = () => {
  if (!vctx || !glyph) return
  vctx.clearRect(0, 0, glyph.width, glyph.height)
  vctx.drawImage(glyph, 0, 0)
  for (const mote of motes) {
    const t = mote.age / mote.life
    vctx.globalAlpha = (1 - t) * (1 - t)
    vctx.fillStyle = `rgb(${mote.r} ${mote.g} ${mote.b})`
    vctx.fillRect(mote.x, mote.y, mote.size, mote.size)
  }
  vctx.globalAlpha = 1
}

const frame = (now: number) => {
  const dt = Math.min(0.032, lastFrame ? (now - lastFrame) / 1000 : 0.016)
  lastFrame = now
  for (let i = motes.length - 1; i >= 0; i -= 1) {
    const mote = motes[i]!
    mote.age += dt
    if (mote.age >= mote.life) {
      motes.splice(i, 1)
      continue
    }
    mote.vx += Math.sin(mote.age * 16 + mote.seed) * 0.04
    mote.vy += 0.01
    mote.vx *= 0.985
    mote.vy *= 0.985
    mote.x += mote.vx
    mote.y += mote.vy
  }
  draw()
  if (touched && ink <= 60 && motes.length === 0) {
    finish()
    return
  }
  if (!motes.length) {
    raf = 0
    return
  }
  raf = requestAnimationFrame(frame)
}

const ensureLoop = () => {
  if (raf || cleared) return
  lastFrame = 0
  raf = requestAnimationFrame(frame)
}

const wash = (clientX: number, clientY: number) => {
  const root = rootEl.value
  const view = viewEl.value
  if (!root || !view || cleared || !glyph) return
  const rect = root.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  const x = ((clientX - rect.left) / rect.width) * glyph.width
  const y = ((clientY - rect.top) / rect.height) * glyph.height
  if (Number.isNaN(lastStampX)) {
    stamp(x, y)
  } else {
    const dx = x - lastStampX
    const dy = y - lastStampY
    const dist = Math.hypot(dx, dy)
    const step = Math.max(8, brushR * 0.42)
    const n = Math.max(1, Math.ceil(dist / step))
    for (let i = 1; i <= n; i += 1) {
      stamp(lastStampX + (dx * i) / n, lastStampY + (dy * i) / n)
    }
  }
  lastStampX = x
  lastStampY = y
  if (touched) ensureLoop()
}

const lift = () => {
  lastStampX = Number.NaN
  lastStampY = Number.NaN
}

defineExpose({ wash, lift })

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  const paint = () => paintGlyphs()
  paint()
  void document.fonts?.ready.then(() => {
    if (!touched) paint()
  })
  const root = rootEl.value
  if (root && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      if (!touched) paint()
    })
    resizeObserver.observe(root)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  cancelAnimationFrame(raf)
})
</script>

<style scoped>
.slider-statement {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
}

.slider-statement__canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.slider-statement__measure {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
  font-family: var(--mono);
  font-size: clamp(1.48rem, 2.5vw, 1.6rem);
  font-weight: 400;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: #f4f1ea;
}

.slider-statement__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
