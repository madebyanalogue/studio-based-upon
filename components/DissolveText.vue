<template>
  <div
    ref="rootEl"
    class="dissolve-text"
    :class="{
      'dissolve-text--interactive': interactive,
      'dissolve-text--graphic': graphic,
    }"
    @pointermove="onMove"
    @pointerleave="onLeave"
  >
    <canvas ref="viewEl" class="dissolve-text__canvas" aria-hidden="true" />
    <span ref="measureEl" class="dissolve-text__measure" aria-hidden="true">Ag</span>
    <div v-if="graphic" ref="graphicEl" class="dissolve-text__graphic" aria-hidden="true">
      <slot />
    </div>
    <p v-if="!graphic" class="dissolve-text__sr">{{ lines.join(' ') }}</p>
  </div>
</template>

<script setup lang="ts">
/**
 * Canvas glyphs (text or SVG mark) that dissolve under a sand brush.
 * Same wash for homepage intro logo + statements.
 */
const props = withDefaults(
  defineProps<{
    lines?: string[]
    /** When true, washes on its own pointer events. Otherwise call wash/lift. */
    interactive?: boolean
    /**
     * `fill` — use the parent's box (slider statement / logo).
     * `lines` — size the canvas to the text block.
     */
    fit?: 'fill' | 'lines'
    /** Paint a slotted SVG/mark instead of `lines`. */
    graphic?: boolean
    /** After paint, wait this many ms then self-wash away (0 = off). */
    autoDissolveMs?: number
    /** Extra canvas below glyphs for falling sand (line-fit only). */
    fallRoom?: boolean
  }>(),
  {
    lines: () => [],
    interactive: false,
    fit: 'fill',
    graphic: false,
    autoDissolveMs: 0,
    fallRoom: true,
  },
)

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
const graphicEl = ref<HTMLElement | null>(null)

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
let paintToken = 0
let autoTimer = 0
let autoRaf = 0
const motes: Mote[] = []
const MOTE_CAP = 1100
/** CSS-px brush radius before devicePixelRatio. */
const BRUSH_CSS = 54
let brushR = BRUSH_CSS
let sandRgb = { r: 90, g: 84, b: 74 }

const clearAuto = () => {
  if (autoTimer) {
    window.clearTimeout(autoTimer)
    autoTimer = 0
  }
  if (autoRaf) {
    cancelAnimationFrame(autoRaf)
    autoRaf = 0
  }
}

const finish = () => {
  if (cleared) return
  cleared = true
  clearAuto()
  cancelAnimationFrame(raf)
  raf = 0
  emit('clear')
}

/** Full restore — used on mount, page refresh/bfcache, and each interactive beat. */
const reset = () => {
  clearAuto()
  touched = false
  cleared = false
  ink = 0
  motes.length = 0
  cancelAnimationFrame(raf)
  raf = 0
  lastStampX = Number.NaN
  lastStampY = Number.NaN
  lastFrame = 0
  nextTick(() => paintGlyphs())
}

/** Programmed sand wash — used for timed onboarding statements. */
const runAutoDissolve = () => {
  if (cleared || !glyph || ink <= 0) {
    finish()
    return
  }
  if (reduce) {
    finish()
    return
  }

  let x = -brushR
  const sweep = () => {
    if (cleared || !glyph) return
    if (ink <= 60) {
      ensureLoop()
      return
    }
    const h = glyph.height
    for (let c = 0; c < 3; c += 1) {
      const px = x + c * brushR * 0.32
      for (let y = brushR * 0.35; y < h; y += brushR * 0.52) {
        const wobble = Math.sin(y * 0.018 + x * 0.012) * brushR * 0.4
        stamp(px + wobble, y)
      }
    }
    x += brushR * 0.48
    ensureLoop()
    if (x < glyph.width + brushR * 2 && ink > 60) {
      autoRaf = requestAnimationFrame(sweep)
      return
    }
    const scatter = () => {
      if (cleared || !glyph || ink <= 60) {
        ensureLoop()
        return
      }
      for (let n = 0; n < 12; n += 1) {
        stamp(Math.random() * glyph.width, Math.random() * glyph.height)
      }
      ensureLoop()
      autoRaf = requestAnimationFrame(scatter)
    }
    autoRaf = requestAnimationFrame(scatter)
  }
  autoRaf = requestAnimationFrame(sweep)
}

const scheduleAutoDissolve = () => {
  if (touched || cleared || autoTimer || autoRaf) return
  const delay = props.autoDissolveMs
  if (!delay || delay <= 0) return
  autoTimer = window.setTimeout(runAutoDissolve, delay)
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

const parseCssColor = (raw: string) => {
  const m = raw.match(/rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)/i)
  if (!m) return { r: 241, g: 237, b: 228 }
  return {
    r: Math.round(Number(m[1])),
    g: Math.round(Number(m[2])),
    b: Math.round(Number(m[3])),
  }
}

const paintGraphic = async (token: number) => {
  const view = viewEl.value
  const measure = measureEl.value
  const root = rootEl.value
  const host = graphicEl.value
  if (!view || !measure || !root || !host || touched || cleared) return

  const svg = host.querySelector('svg')
  if (!svg) return

  const cs = getComputedStyle(measure)
  const color = cs.color || '#f1ede4'
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  brushR = BRUSH_CSS * dpr

  const cssW = root.clientWidth
  const cssH = root.clientHeight
  if (cssW < 2 || cssH < 2) return

  const w = Math.round(cssW * dpr)
  const h = Math.round(cssH * dpr)

  view.width = w
  view.height = h
  if (!glyph) glyph = document.createElement('canvas')
  glyph.width = w
  glyph.height = h
  gctx = glyph.getContext('2d', { willReadFrequently: true })
  vctx = view.getContext('2d')
  if (!gctx || !vctx) return

  const clone = svg.cloneNode(true) as SVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('fill', color)
  const vb = clone.getAttribute('viewBox')?.split(/[\s,]+/).map(Number)
  const vbW = vb && vb.length === 4 ? vb[2]! : Number(clone.getAttribute('width')) || cssW
  const vbH = vb && vb.length === 4 ? vb[3]! : Number(clone.getAttribute('height')) || cssH
  clone.setAttribute('width', String(vbW))
  clone.setAttribute('height', String(vbH))

  const xml = new XMLSerializer().serializeToString(clone)
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`
  const img = new Image()
  await new Promise<void>((resolve) => {
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = url
  })
  if (token !== paintToken || touched || cleared || !gctx || !glyph) return

  const pad = 0.08
  const maxW = w * (1 - pad * 2)
  const maxH = h * (1 - pad * 2)
  const scale = Math.min(maxW / img.width, maxH / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  gctx.clearRect(0, 0, w, h)
  gctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)

  // Flatten to solid fill colour so sand motes match text dissolve.
  const rgb = parseCssColor(color)
  const image = gctx.getImageData(0, 0, w, h)
  const data = image.data
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 24) continue
    data[i] = rgb.r
    data[i + 1] = rgb.g
    data[i + 2] = rgb.b
  }
  gctx.putImageData(image, 0, 0)
  ink = countInk()
  sandRgb = rgb
  draw()
  scheduleAutoDissolve()
}

const paintGlyphs = () => {
  const token = ++paintToken
  if (props.graphic) {
    void paintGraphic(token)
    return
  }

  const view = viewEl.value
  const measure = measureEl.value
  const root = rootEl.value
  if (!view || !measure || !root || touched || cleared) return
  if (!props.lines.length) return

  const cs = getComputedStyle(measure)
  const size = parseFloat(cs.fontSize) || 24
  const leading = Number.isFinite(parseFloat(cs.lineHeight))
    ? parseFloat(cs.lineHeight)
    : size * 1.15
  const letter = parseFloat(cs.letterSpacing) || 0
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  brushR = BRUSH_CSS * dpr

  if (props.fit === 'lines') {
    const probe = document.createElement('canvas').getContext('2d')
    let textW = 0
    if (probe) {
      probe.font = `${cs.fontStyle} ${cs.fontWeight} ${size}px ${cs.fontFamily}`
      if ('letterSpacing' in probe) probe.letterSpacing = `${letter}px`
      for (const line of props.lines) {
        textW = Math.max(textW, probe.measureText(line).width)
      }
    }
    // Lacquer / display faces measure short — keep first/last glyphs inside the canvas.
    const padX = size * 1.35
    const padY = size * 0.35
    /** Extra room under the glyphs so falling sand stays on-canvas. */
    const fallPad = props.fallRoom ? size * 4.5 : 0
    root.style.width = `${Math.ceil(textW + padX * 2)}px`
    root.style.height = `${Math.ceil(props.lines.length * leading + padY * 2 + fallPad)}px`
  }

  const cssW = root.clientWidth
  const cssH = root.clientHeight
  if (cssW < 2 || cssH < 2) return

  const w = Math.round(cssW * dpr)
  const h = Math.round(cssH * dpr)

  view.width = w
  view.height = h
  if (!glyph) glyph = document.createElement('canvas')
  glyph.width = w
  glyph.height = h
  gctx = glyph.getContext('2d', { willReadFrequently: true })
  vctx = view.getContext('2d')
  if (!gctx || !vctx) return

  gctx.clearRect(0, 0, w, h)
  gctx.font = `${cs.fontStyle} ${cs.fontWeight} ${size * dpr}px ${cs.fontFamily}`
  gctx.fillStyle = cs.color || '#f4f1ea'
  gctx.textAlign = 'center'
  gctx.textBaseline = 'middle'
  if ('letterSpacing' in gctx) {
    gctx.letterSpacing = `${letter * dpr}px`
  }
  const block = (props.lines.length - 1) * leading * dpr
  // For line-fit with fall room, keep glyphs high so sand can drop through.
  const startY =
    props.fit === 'lines' && props.fallRoom
      ? size * 0.9 * dpr
      : h / 2 - block / 2
  for (let i = 0; i < props.lines.length; i += 1) {
    gctx.fillText(props.lines[i]!, w / 2, startY + i * leading * dpr)
  }
  ink = countInk()
  sandRgb = parseCssColor(cs.color || '#5a544a')
  draw()
  scheduleAutoDissolve()
}

const spawn = (
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  awayX: number,
  awayY: number,
) => {
  if (motes.length >= MOTE_CAP) motes.shift()
  const ang = Math.atan2(awayY, awayX) + (Math.random() - 0.5) * 1.1
  const speed = 0.45 + Math.random() * 2.8
  motes.push({
    x,
    y,
    vx: Math.cos(ang) * speed * 0.5 + (Math.random() - 0.5) * 0.55,
    vy: 1.15 + Math.random() * 2.8,
    life: 0.95 + Math.random() * 1.15,
    age: 0,
    size: (0.7 + Math.random() * 1.35) * (brushR / 54),
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
      if (!reduce && spawned < 28 && Math.random() < 0.55) {
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
    for (let n = 0; n < 14; n += 1) {
      const ox = (Math.random() - 0.5) * r * 0.55
      const oy = (Math.random() - 0.5) * r * 0.35
      spawn(
        px + ox,
        py + oy,
        sandRgb.r,
        sandRgb.g,
        sandRgb.b,
        ox || 0.2,
        oy || -0.4,
      )
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
    vctx.globalAlpha = 0.82 * (1 - t) * (1 - t * 0.65)
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
    mote.vx += Math.sin(mote.age * 16 + mote.seed) * 0.03
    mote.vy += 0.18
    mote.vx *= 0.97
    mote.vy *= 0.994
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

/** Random bites — for scroll wash. Not a left-to-right sweep. */
const scatter = (force = 1) => {
  if (!glyph || cleared || ink <= 0) return
  const amount = Math.min(3, Math.max(0.35, Math.abs(force)))
  const band = glyph.height * (props.fit === 'lines' && props.fallRoom ? 0.36 : 0.72)
  const clusters = Math.max(1, Math.round(amount * 1.6))
  const stamps = Math.max(3, Math.round(7 * amount))
  for (let c = 0; c < clusters; c += 1) {
    const cx = Math.random() * glyph.width
    const cy = Math.random() * Math.max(brushR, band)
    for (let i = 0; i < stamps; i += 1) {
      stamp(
        cx + (Math.random() - 0.5) * brushR * 2.6,
        cy + (Math.random() - 0.5) * brushR * 1.5,
      )
    }
  }
  lastStampX = Number.NaN
  lastStampY = Number.NaN
  if (touched) ensureLoop()
}

const onMove = (event: PointerEvent) => {
  if (!props.interactive) return
  wash(event.clientX, event.clientY)
}

const onLeave = () => {
  if (!props.interactive) return
  lift()
}

const repaint = () => {
  if (touched || cleared) return
  paintGlyphs()
}

watch(
  () => [props.lines.join('\n'), props.graphic] as const,
  () => {
    reset()
  },
)

/** Fresh glyphs whenever a beat enables the brush (and after hard refresh / remount). */
watch(
  () => props.interactive,
  (on) => {
    if (on) reset()
  },
)

watch(
  () => props.autoDissolveMs,
  () => {
    if (!touched && !cleared) scheduleAutoDissolve()
  },
)

defineExpose({ wash, lift, scatter, repaint, reset })

let resizeObserver: ResizeObserver | null = null
const onPageShow = (event: PageTransitionEvent) => {
  if (event.persisted) reset()
}

onMounted(() => {
  reset()
  void document.fonts?.ready.then(() => {
    if (!touched && !cleared) paintGlyphs()
  })
  window.addEventListener('pageshow', onPageShow)
  const root = rootEl.value
  if (root && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      if (!touched && !cleared) paintGlyphs()
    })
    resizeObserver.observe(root)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('pageshow', onPageShow)
  resizeObserver?.disconnect()
  clearAuto()
  cancelAnimationFrame(raf)
})
</script>

<style scoped>
.dissolve-text {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.dissolve-text--interactive {
  pointer-events: auto;
}

.dissolve-text__canvas {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.dissolve-text__measure {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
  font: inherit;
  letter-spacing: inherit;
  color: inherit;
}

.dissolve-text__graphic {
  position: absolute;
  inset: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

.dissolve-text__sr {
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
