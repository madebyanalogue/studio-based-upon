<template>
  <div
    ref="rootEl"
    class="homepage-intro"
    :class="{ 'is-motion': motionOn }"
    :data-frame="frameIndex"
    role="dialog"
    aria-label="Introduction"
  >
    <svg class="homepage-intro__goo" viewBox="0 0 0 0" aria-hidden="true" focusable="false">
      <defs>
        <filter
          :id="titleFilterId"
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
          color-interpolation-filters="sRGB"
        >
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140"
          />
        </filter>
      </defs>
    </svg>

    <div class="homepage-intro__bar">
      <div ref="logoEl" class="homepage-intro__logo">
        <BasedUponLogoSansSerif />
      </div>
      <button type="button" class="homepage-intro__skip interface" @click="onSkip">
        <span class="homepage-intro__skip-chev" aria-hidden="true" />
        Skip intro
      </button>
    </div>

    <div class="homepage-intro__stage" :class="{ 'is-guide': guideVisible }">
      <div class="homepage-intro__board">
        <div
          v-for="piece in pieces"
          :key="piece.key"
          class="homepage-intro__piece"
          :class="[
            piece.kind === 'image' ? 'homepage-intro__piece--image' : 'homepage-intro__piece--type',
            piece.align ? `is-${piece.align}` : '',
          ]"
          :data-key="piece.key"
          :data-kind="piece.kind"
          :style="place(piece)"
        >
          <img
            v-if="piece.kind === 'image'"
            :src="piece.src"
            alt=""
            draggable="false"
          />
          <template v-else>
            <p
              v-for="(line, lineIndex) in piece.lines"
              :key="line"
              class="homepage-intro__type"
              :class="`is-${piece.role}`"
              :data-line="lineIndex"
              :style="titleFilterStyle"
            >{{ line }}</p>
            <p
              v-if="piece.cta"
              class="homepage-intro__type is-meta"
              :style="titleFilterStyle"
            >{{ piece.cta }}</p>
          </template>
        </div>
      </div>

      <div class="homepage-intro__guide" aria-hidden="true">
        <span
          v-for="cell in cells"
          :key="cell.label"
          class="homepage-intro__cell"
          :style="{ gridColumn: cell.col, gridRow: cell.row }"
        >{{ cell.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import {
  clearHomepageIntroLock,
  useHomepageIntro,
} from '~/composables/useHomepagePreloader'

const COLS = 16
const ROWS = 8
const COL_NAMES = 'abcdefghijklmnop'
const TITLE_BLUR_MAX = 60

type Role = 'display' | 'copy' | 'meta'
type Align = 'start' | 'center' | 'end'

type Slot = {
  kind: 'image' | 'type'
  col: number
  row: number
  cols: number
  rows: number
  role?: Role
  align?: Align
}

type Piece = Slot & {
  key: string
  frame: number
  src?: string
  lines?: string[]
  cta?: string
  /** Stays in place while the following frame's images enter. */
  carry?: boolean
}

type Frame = {
  lines: string[]
  cta?: string
  layout: Slot[]
  /** Where this frame starts in the homepage image pool. */
  imageAt: number
  /** Leave this frame's type in place while the next frame enters. */
  holdType?: boolean
}

const FALLBACK_IMAGES = Array.from({ length: 8 }, (_, index) =>
  `https://picsum.photos/seed/sba-intro-${index + 1}/1400/1800`,
)

/** Slide 01 stays sparse: one statement, one image. */
const CLEAN: Slot[] = [
  { kind: 'type', col: 2, row: 2, cols: 7, rows: 5, role: 'display', align: 'start' },
  { kind: 'image', col: 10, row: 2, cols: 5, rows: 5 },
]

/** Later frames. One large image (7×5 or 4×8) and two small images (2×3 or 2×4). */
const LAYOUTS: Slot[][] = [
  [
    { kind: 'type', col: 1, row: 1, cols: 8, rows: 6, role: 'display', align: 'start' },
    { kind: 'image', col: 10, row: 1, cols: 7, rows: 5 },
    { kind: 'image', col: 10, row: 6, cols: 2, rows: 3 },
    { kind: 'image', col: 13, row: 6, cols: 2, rows: 3 },
  ],
  [
    { kind: 'image', col: 1, row: 1, cols: 4, rows: 8 },
    { kind: 'type', col: 6, row: 1, cols: 10, rows: 5, role: 'display', align: 'start' },
    { kind: 'image', col: 13, row: 6, cols: 2, rows: 3 },
    { kind: 'image', col: 15, row: 6, cols: 2, rows: 3 },
  ],
  [
    { kind: 'image', col: 1, row: 1, cols: 7, rows: 5 },
    { kind: 'type', col: 9, row: 1, cols: 8, rows: 6, role: 'display', align: 'start' },
    { kind: 'image', col: 1, row: 6, cols: 2, rows: 3 },
    { kind: 'image', col: 4, row: 6, cols: 2, rows: 3 },
  ],
  [
    { kind: 'image', col: 1, row: 1, cols: 2, rows: 4 },
    { kind: 'type', col: 4, row: 1, cols: 8, rows: 8, role: 'display', align: 'start' },
    { kind: 'image', col: 1, row: 5, cols: 2, rows: 4 },
    { kind: 'image', col: 13, row: 1, cols: 4, rows: 8 },
  ],
]

const cells = Array.from({ length: ROWS * COLS }, (_, index) => {
  const col = index % COLS
  const row = Math.floor(index / COLS)
  return {
    label: `${COL_NAMES[col]}${row + 1}`,
    col: col + 1,
    row: row + 1,
  }
})

/** Finished work, installed work, origin, starting points, experiment. */
const FRAMES: Frame[] = [
  {
    lines: ['Studio Based Upon', 'creates with you.'],
    layout: CLEAN,
    imageAt: 0,
  },
  {
    lines: ['Two decades of making', 'for extraordinary spaces', 'around the world.'],
    layout: LAYOUTS[0]!,
    imageAt: 2,
  },
  {
    lines: ['Everything starts', 'somewhere.'],
    layout: LAYOUTS[1]!,
    imageAt: 4,
    holdType: true,
  },
  {
    lines: ['An idea.', 'A material.', 'A place.', 'A story.'],
    layout: LAYOUTS[2]!,
    imageAt: 6,
  },
  {
    lines: ['Explore what', 'it could become.'],
    cta: 'Enter the studio →',
    layout: LAYOUTS[3]!,
    imageAt: 3,
  },
]

const composeFrame = (frameIndex: number, pool: string[]): Piece[] => {
  const frame = FRAMES[frameIndex]
  if (!frame) return []
  const previousHolds = !!FRAMES[frameIndex - 1]?.holdType
  let imageIndex = frame.imageAt
  const framePieces: Piece[] = []
  frame.layout.forEach((slot, slotIndex) => {
    if (slot.kind === 'type' && previousHolds) return
    const key = `f${frameIndex}-${slotIndex}`
    if (slot.kind === 'image') {
      const src = pool[imageIndex % pool.length]!
      imageIndex += 1
      framePieces.push({ ...slot, key, frame: frameIndex, src })
      return
    }
    framePieces.push({
      ...slot,
      key,
      frame: frameIndex,
      role: slot.role || 'display',
      lines: frame.lines,
      cta: frame.cta,
      align: slot.align || 'start',
      carry: !!frame.holdType,
    })
  })
  return framePieces
}

const place = (piece: Piece) => ({
  gridColumn: `${piece.col} / span ${piece.cols}`,
  gridRow: `${piece.row} / span ${piece.rows}`,
})

const titleFilterId = `intro-title-goo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
const titleFilterStyle = {
  filter: `url(#${titleFilterId})`,
  WebkitFilter: `url(#${titleFilterId})`,
}

const { phase, slides } = useHomepageIntro()
const homeScrollHint = useHomeScrollHint()
const route = useRoute()

watch(
  () => route.path,
  (path) => {
    if (path !== '/' && path !== '/home') finishSite(true)
  },
)

const rootEl = ref<HTMLElement | null>(null)
const logoEl = ref<HTMLElement | null>(null)
let logoShown = false
const guideVisible = ref(true)
const motionOn = ref(false)
const frameIndex = ref(0)
const pieces = ref<Piece[]>([])

const imagePool = computed(() => {
  const urls = (slides.value || []).flatMap((slide) => [slide.leftImage, slide.rightImage])
  return [...new Set(urls.filter(Boolean))]
})

let built = false
let started = false
let finished = false
let pluginsReady = false
let failTimer = 0
let fallbackTimer = 0
let releaseTimer = 0
let veilTimer = 0
let fadeVeil: (() => void) | null = null
let stopPieces: (() => void) | null = null
let splits: InstanceType<typeof SplitText>[] = []
let wordsByKey = new Map<string, HTMLElement[]>()
let imageByKey = new Map<string, HTMLElement>()
let stopPath: (() => void) | null = null
let pathRaf = 0
let pathTarget = 0
let pathCurrent = 0
/** Scroll distance that plays the whole path out and enters the studio. */
const PATH_END = FRAMES.length + 0.05
const WHEEL_PER_STAGE = 720

const ensureComposition = (images: string[]) => {
  if (built || !images.length) return
  built = true
  frameIndex.value = 0
  pieces.value = FRAMES.flatMap((_, index) =>
    composeFrame(index, images.length ? images : FALLBACK_IMAGES),
  )
}

watch(imagePool, (images) => ensureComposition(images), { immediate: true })

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const preloadImage = (src: string) =>
  new Promise<void>((resolve) => {
    const img = new Image()
    const done = () => resolve()
    img.onload = done
    img.onerror = done
    img.src = src
    if (img.complete) done()
  })

const finishSite = (immediate = false) => {
  if (finished) return
  finished = true
  homeScrollHint.value = false
  stopPath?.()
  window.clearTimeout(failTimer)
  window.clearTimeout(fallbackTimer)
  window.clearTimeout(releaseTimer)
  // Reveal chrome with the homepage wipe, then drop the intro lock.
  document.documentElement.classList.add('homepage-intro-reveal', 'homepage-intro-type')
  if (immediate) {
    clearHomepageIntroLock()
    if (phase.value !== 'done' && phase.value !== 'skipped') phase.value = 'done'
    document.dispatchEvent(new CustomEvent('homepage-intro-complete'))
    return
  }

  // Leave cover so the column wipe can start under this veil.
  if (phase.value === 'cover') phase.value = 'chrome'
  document.dispatchEvent(new CustomEvent('homepage-intro-complete'))

  const dropVeil = () => {
    if (phase.value !== 'done' && phase.value !== 'skipped') phase.value = 'done'
  }
  const veil = rootEl.value
  let veiled = false
  fadeVeil = () => {
    if (veiled) return
    veiled = true
    if (fadeVeil) document.removeEventListener('homepage-columns-opening', fadeVeil)
    window.clearTimeout(veilTimer)
    if (!veil) {
      dropVeil()
      return
    }
    veil.style.pointerEvents = 'none'
    gsap.to(veil, {
      opacity: 0,
      duration: 0.7,
      ease: 'power2.inOut',
      onComplete: dropVeil,
    })
  }
  document.addEventListener('homepage-columns-opening', fadeVeil)
  veilTimer = window.setTimeout(fadeVeil, 1400)

  // Hold the stack-rise rule until that motion has landed.
  releaseTimer = window.setTimeout(() => {
    clearHomepageIntroLock()
  }, 4600)
}

const ensurePlugins = () => {
  if (pluginsReady || !import.meta.client) return
  gsap.registerPlugin(SplitText)
  pluginsReady = true
}

const typingTarget = (event: KeyboardEvent) => {
  const target = event.target
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || !!target.closest('input, textarea, select'))
  )
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const smoothstep = (value: number) => {
  const t = clamp01(value)
  return t * t * (3 - 2 * t)
}

const along = (t: number, start: number, end: number) => smoothstep((t - start) / (end - start))

/** 0 while a piece is off the path, 1 while its stage is fully present. */
const pieceAmount = (piece: Piece, t: number) => {
  const i = piece.frame
  const enter = along(t, i === 0 ? 0.04 : i - 0.22, i === 0 ? 0.52 : i + 0.28)
  const exitStart = piece.carry ? i + 1.55 : i + 0.62
  const exitEnd = piece.carry ? i + 2.05 : i + 1.02
  return enter * (1 - along(t, exitStart, exitEnd))
}

const bindPieces = () => {
  const root = rootEl.value
  if (!root) return
  ensurePlugins()
  imageByKey = new Map()
  wordsByKey = new Map()
  for (const split of splits) {
    try {
      split.revert()
    } catch {
      /* already reverted */
    }
  }
  splits = []
  root.querySelectorAll<HTMLElement>('[data-kind="image"]').forEach((el) => {
    const key = el.dataset.key
    if (key) imageByKey.set(key, el)
  })
  root.querySelectorAll<HTMLElement>('.homepage-intro__type').forEach((el) => {
    const split = new SplitText(el, { type: 'words', wordsClass: 'homepage-intro__word' })
    splits.push(split)
    const key = el.closest<HTMLElement>('[data-key]')?.dataset.key
    if (!key) return
    const words = wordsByKey.get(key) ?? []
    words.push(...(split.words as HTMLElement[]))
    wordsByKey.set(key, words)
  })
  motionOn.value = true
}

const paint = (t: number) => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const stage = Math.min(FRAMES.length - 1, Math.max(0, Math.floor(t + 0.08)))
  frameIndex.value = stage
  for (const piece of pieces.value) {
    let amount = pieceAmount(piece, t)
    if (reduced) {
      amount = piece.carry
        ? stage === piece.frame || stage === piece.frame + 1
          ? 1
          : 0
        : stage === piece.frame
          ? 1
          : 0
    }
    if (piece.kind === 'image') {
      const el = imageByKey.get(piece.key)
      if (!el) continue
      el.style.opacity = amount > 0.01 ? '1' : '0'
      el.style.clipPath = `inset(${(1 - amount) * 100}% 0% 0% 0%)`
      continue
    }
    const words = wordsByKey.get(piece.key)
    if (!words) continue
    const blur = reduced ? 0 : (1 - amount) * TITLE_BLUR_MAX
    for (const word of words) {
      word.style.opacity = String(amount)
      word.style.filter = `blur(${blur}px)`
    }
  }
}

const tick = () => {
  if (finished) return
  pathCurrent += (pathTarget - pathCurrent) * 0.14
  if (Math.abs(pathTarget - pathCurrent) < 0.0008) pathCurrent = pathTarget
  paint(pathCurrent)
  if (pathCurrent >= PATH_END - 0.08) {
    finishSite()
    return
  }
  pathRaf = requestAnimationFrame(tick)
}

const nudge = (delta: number) => {
  if (!started || finished) return
  pathTarget = Math.min(PATH_END, Math.max(0, pathTarget + delta))
}

const onWheel = (event: WheelEvent) => {
  if (!started || finished) return
  event.preventDefault()
  event.stopPropagation()
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
  nudge(delta / WHEEL_PER_STAGE)
}

let touchY = 0

const onTouchStart = (event: TouchEvent) => {
  touchY = event.touches[0]?.clientY ?? touchY
}

const onTouchMove = (event: TouchEvent) => {
  if (!started || finished) return
  const y = event.touches[0]?.clientY
  if (y == null) return
  event.preventDefault()
  nudge((touchY - y) / WHEEL_PER_STAGE)
  touchY = y
}

const onSkip = () => {
  if (finished) return
  finishSite()
}

const onGuideKey = (event: KeyboardEvent) => {
  if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return
  if (typingTarget(event)) return

  if (event.key === 'g' || event.key === 'G') {
    guideVisible.value = !guideVisible.value
    return
  }

  if (finished || !started) return

  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
    event.preventDefault()
    nudge(0.34)
    return
  }

  if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
    event.preventDefault()
    nudge(-0.34)
    return
  }

  if (event.key === 'Enter' || event.key === 'Escape') {
    event.preventDefault()
    onSkip()
  }
}

const play = async () => {
  if (started || !rootEl.value || !pieces.value.length) return
  started = true
  window.clearTimeout(failTimer)
  window.clearTimeout(fallbackTimer)
  document.dispatchEvent(new CustomEvent('homepage-intro-hold'))

  const pool = imagePool.value.length ? imagePool.value : FALLBACK_IMAGES
  await Promise.race([Promise.all(pool.map(preloadImage)), delay(4000)])
  if (finished || !rootEl.value) return

  if (document.fonts?.ready) await document.fonts.ready
  await nextTick()
  if (finished || !rootEl.value) return

  await fadeLogo()
  if (finished || !rootEl.value) return
  guideVisible.value = false
  await nextTick()
  bindPieces()
  paint(0)
  homeScrollHint.value = true

  const arm = () => {
    window.addEventListener('wheel', onWheel, { passive: false, capture: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    pathRaf = requestAnimationFrame(tick)
  }
  stopPath = () => {
    window.cancelAnimationFrame(pathRaf)
    window.removeEventListener('wheel', onWheel, true)
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchmove', onTouchMove)
    stopPath = null
  }
  arm()
}

const fadeLogo = async () => {
  const logo = logoEl.value
  if (!logo || logoShown) return
  logoShown = true
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    gsap.set(logo, { opacity: 1 })
    return
  }
  await gsap.fromTo(logo, { opacity: 0 }, { opacity: 1, duration: 0.85, ease: 'power2.out' })
  await delay(420)
}

onMounted(() => {
  window.addEventListener('keydown', onGuideKey)
  failTimer = window.setTimeout(() => {
    if (!started) finishSite(true)
  }, 12000)
  fallbackTimer = window.setTimeout(() => {
    ensureComposition(FALLBACK_IMAGES)
  }, 700)

  stopPieces = watch(
    pieces,
    (list) => {
      if (list.length) void play()
    },
    { immediate: true },
  )
})

onUnmounted(() => {
  stopPath?.()
  window.removeEventListener('keydown', onGuideKey)
  if (fadeVeil) document.removeEventListener('homepage-columns-opening', fadeVeil)
  window.clearTimeout(veilTimer)
  window.clearTimeout(failTimer)
  window.clearTimeout(fallbackTimer)
  stopPieces?.()
  for (const split of splits) {
    try {
      split.revert()
    } catch {
      /* already reverted */
    }
  }
  splits = []
  if (!finished) finishSite(true)
})
</script>

<style scoped>
.homepage-intro {
  position: fixed;
  inset: 0;
  z-index: 800;
  width: 100%;
  height: 100svh;
  overflow: hidden;
  background: #000;
  color: #f1ede4;
  --intro-inset: clamp(20px, 5vw, 130px);
  --intro-logo-h: calc(min(168px, 28vw) * 1142 / 2972.52);
  pointer-events: auto;
}

.homepage-intro__goo {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}

.homepage-intro__bar {
  position: absolute;
  top: var(--intro-inset);
  left: 5vw;
  right: 5vw;
  z-index: 6;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  pointer-events: none;
}

.homepage-intro__logo {
  grid-column: 2;
  justify-self: center;
  width: min(168px, 28vw);
  color: #f1ede4;
  opacity: 0;
  pointer-events: none;
}

.homepage-intro__skip {
  grid-column: 3;
  justify-self: end;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  pointer-events: auto;
  cursor: pointer;
}

.homepage-intro__skip-chev {
  width: 9px;
  height: 9px;
  box-sizing: border-box;
  border-right: 1.75px solid currentColor;
  border-bottom: 1.75px solid currentColor;
  transform: rotate(-45deg);
}

.homepage-intro__stage {
  --intro-line: color-mix(in srgb, currentColor 38%, transparent);
  --intro-label: color-mix(in srgb, currentColor 72%, transparent);
  position: absolute;
  inset: var(--intro-inset);
  top: calc(var(--intro-inset) + var(--intro-logo-h) + 1rem);
}

.homepage-intro__board,
.homepage-intro__guide {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(16, minmax(0, 1fr));
  grid-template-rows: repeat(8, minmax(0, 1fr));
  gap: 0;
  pointer-events: none;
}

.homepage-intro__guide {
  z-index: 4;
  pointer-events: none;
  border: 1px solid var(--intro-line);
}

.homepage-intro__stage:not(.is-guide) .homepage-intro__guide {
  visibility: hidden;
}

.homepage-intro__cell {
  display: flex;
  align-items: flex-end;
  min-width: 0;
  min-height: 0;
  padding: 3px;
  border-right: 1px solid var(--intro-line);
  border-bottom: 1px solid var(--intro-line);
  font-family: var(--mono);
  font-size: 11px;
  line-height: 1;
  letter-spacing: 0.04em;
  color: var(--intro-label);
  pointer-events: none;
}

.homepage-intro__cell:nth-child(16n) {
  border-right: none;
}

.homepage-intro__cell:nth-child(n + 113) {
  border-bottom: none;
}

.homepage-intro__piece {
  position: relative;
  z-index: 1;
  min-width: 0;
  min-height: 0;
}

.homepage-intro__piece--image {
  overflow: hidden;
  opacity: 0;
  clip-path: inset(100% 0% 0% 0%);
}

.homepage-intro__piece--image img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  user-select: none;
  pointer-events: none;
}

.homepage-intro__piece--type {
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 0.35em;
  padding: 0.55rem 0.7rem;
}

.homepage-intro__piece--type.is-start {
  justify-content: flex-start;
}

.homepage-intro__piece--type.is-center {
  align-items: center;
  justify-content: center;
}

.homepage-intro__piece--type.is-end {
  justify-content: flex-end;
}

.homepage-intro__type {
  margin: 0;
  max-width: 100%;
  opacity: 0;
  color: #f1ede4;
}

.homepage-intro.is-motion .homepage-intro__type {
  opacity: 1;
}

.homepage-intro__type.is-display {
  font-family: var(--mono);
  font-size: clamp(1.48rem, 2.5vw, 1.6rem);
  font-weight: 400;
  line-height: 0.92;
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.homepage-intro__type.is-copy {
  font-family: var(--mono);
  font-size: 13.5px;
  line-height: 1.65;
  text-wrap: pretty;
}

.homepage-intro__type.is-meta {
  margin-top: 1.35rem;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  line-height: 1.35;
  text-transform: uppercase;
  pointer-events: none;
}

.homepage-intro :deep(.homepage-intro__word) {
  display: inline-block;
  will-change: filter, opacity;
}
</style>
