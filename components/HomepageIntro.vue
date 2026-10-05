<template>
  <div
    ref="rootEl"
    class="homepage-intro"
    :class="{ 'is-motion': motionOn }"
    aria-hidden="true"
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
          <p
            v-else
            class="homepage-intro__type"
            :class="`is-${piece.role}`"
            :style="titleFilterStyle"
          >{{ piece.text }}</p>
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

const COLS = 12
const ROWS = 12
const COL_NAMES = 'abcdefghijkl'
const TITLE_BLUR_MAX = 60
const STAGGER = 0.2
const CLIP_HIDDEN = 'inset(100% 0% 0% 0%)'
const CLIP_VISIBLE = 'inset(0% 0% 0% 0%)'

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
  src?: string
  text?: string
}

const DISPLAY = [
  'Studio Based Upon',
  'Beautiful contradictions',
  'Materials and forms',
  'Collectible design',
  'Architectural features',
]

const COPY = [
  'Award-winning surfaces, collectible design and architectural features.',
  'Part atelier, part laboratory, where the hand meets the algorithm.',
  'From concept to completion.',
  'Surfaces, objects and architectural interventions at every scale.',
]

const META = [
  'London  /  Est. 2004',
  'Studio Based Upon',
  '01  —  Opening',
  'Surfaces',
]

const FALLBACK_IMAGES = Array.from({ length: 8 }, (_, index) =>
  `https://picsum.photos/seed/sba-intro-${index + 1}/1400/1800`,
)

/** Authored frames. Each load picks one and fills it with shuffled images and lines. */
const LAYOUTS: Slot[][] = [
  [
    { kind: 'image', col: 8, row: 1, cols: 5, rows: 5 },
    { kind: 'type', col: 1, row: 2, cols: 6, rows: 3, role: 'display', align: 'end' },
    { kind: 'image', col: 1, row: 6, cols: 4, rows: 5 },
    { kind: 'type', col: 5, row: 7, cols: 3, rows: 2, role: 'meta', align: 'end' },
    { kind: 'image', col: 9, row: 7, cols: 4, rows: 6 },
    { kind: 'type', col: 5, row: 9, cols: 4, rows: 3, role: 'copy', align: 'start' },
  ],
  [
    { kind: 'type', col: 7, row: 2, cols: 6, rows: 3, role: 'display', align: 'end' },
    { kind: 'image', col: 1, row: 1, cols: 5, rows: 8 },
    { kind: 'type', col: 7, row: 5, cols: 4, rows: 2, role: 'meta', align: 'start' },
    { kind: 'image', col: 7, row: 7, cols: 6, rows: 4 },
    { kind: 'type', col: 1, row: 10, cols: 6, rows: 3, role: 'copy', align: 'start' },
    { kind: 'image', col: 8, row: 11, cols: 5, rows: 2 },
  ],
  [
    { kind: 'image', col: 9, row: 1, cols: 4, rows: 6 },
    { kind: 'type', col: 1, row: 1, cols: 7, rows: 3, role: 'display', align: 'end' },
    { kind: 'type', col: 6, row: 5, cols: 3, rows: 4, role: 'copy', align: 'start' },
    { kind: 'image', col: 1, row: 5, cols: 5, rows: 5 },
    { kind: 'type', col: 1, row: 11, cols: 4, rows: 2, role: 'meta', align: 'end' },
    { kind: 'image', col: 6, row: 9, cols: 7, rows: 4 },
  ],
  [
    { kind: 'type', col: 5, row: 2, cols: 8, rows: 3, role: 'display', align: 'center' },
    { kind: 'image', col: 1, row: 1, cols: 4, rows: 6 },
    { kind: 'image', col: 6, row: 5, cols: 5, rows: 5 },
    { kind: 'type', col: 11, row: 6, cols: 2, rows: 3, role: 'meta', align: 'center' },
    { kind: 'image', col: 1, row: 8, cols: 5, rows: 5 },
    { kind: 'type', col: 7, row: 10, cols: 6, rows: 3, role: 'copy', align: 'start' },
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

const shuffle = <T,>(list: T[]) => {
  const next = [...list]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const swap = next[i]!
    next[i] = next[j]!
    next[j] = swap
  }
  return next
}

const compose = (images: string[]): Piece[] => {
  const layout = LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)]!
  const pics = shuffle(images)
  const lines: Record<Role, string[]> = {
    display: shuffle(DISPLAY),
    copy: shuffle(COPY),
    meta: shuffle(META),
  }
  const used: Record<Role, number> = { display: 0, copy: 0, meta: 0 }
  let imageIndex = 0

  return layout.map((slot, index) => {
    if (slot.kind === 'image') {
      const src = pics[imageIndex % pics.length]
      imageIndex += 1
      return { ...slot, key: String(index), src }
    }
    const role = slot.role || 'copy'
    const text = lines[role][used[role] % lines[role].length]
    used[role] += 1
    return { ...slot, key: String(index), role, text, align: slot.align || 'start' }
  })
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
const route = useRoute()

watch(
  () => route.path,
  (path) => {
    if (path !== '/' && path !== '/home') finishSite(true)
  },
)

const rootEl = ref<HTMLElement | null>(null)
const guideVisible = ref(true)
const motionOn = ref(false)
const pieces = ref<Piece[]>([])

const imagePool = computed(() => {
  const urls = (slides.value || []).flatMap((slide) => [slide.leftImage, slide.rightImage])
  return [...new Set(urls.filter(Boolean))]
})

const HOLD_AFTER_IN = 0.85
const OUT_STAGGER = 0.09

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
let timeline: gsap.core.Timeline | null = null
let splits: InstanceType<typeof SplitText>[] = []
let wordsByKey = new Map<string, HTMLElement[]>()

const ensureComposition = (images: string[]) => {
  if (built || !images.length) return
  built = true
  pieces.value = compose(images)
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

const onGuideKey = (event: KeyboardEvent) => {
  if (event.key !== 'g' && event.key !== 'G') return
  if (event.metaKey || event.ctrlKey || event.altKey) return
  const target = event.target
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.closest('input, textarea, select'))
  ) {
    return
  }
  guideVisible.value = !guideVisible.value
}

const play = async () => {
  if (started || !rootEl.value || !pieces.value.length) return
  started = true
  window.clearTimeout(failTimer)
  window.clearTimeout(fallbackTimer)

  const urls = [...new Set(pieces.value.map((piece) => piece.src).filter(Boolean))] as string[]
  await Promise.race([
    Promise.all(urls.map(preloadImage)),
    delay(4000),
  ])
  if (finished || !rootEl.value) return

  if (document.fonts?.ready) await document.fonts.ready
  await nextTick()
  if (finished || !rootEl.value) return

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const root = rootEl.value
  const imageEls = [...root.querySelectorAll<HTMLElement>('[data-kind="image"]')]

  if (reduced) {
    gsap.set(imageEls, { opacity: 1, clipPath: CLIP_VISIBLE })
    motionOn.value = true
    finishSite(true)
    return
  }

  ensurePlugins()
  const typeEls = [...root.querySelectorAll<HTMLElement>('.homepage-intro__type')]
  wordsByKey = new Map()
  typeEls.forEach((el) => {
    const split = new SplitText(el, { type: 'words', wordsClass: 'homepage-intro__word' })
    splits.push(split)
    const key = el.closest<HTMLElement>('[data-key]')?.dataset.key
    if (key) wordsByKey.set(key, split.words as HTMLElement[])
  })

  const words = [...wordsByKey.values()].flat()
  gsap.set(words, { filter: `blur(${TITLE_BLUR_MAX}px)`, opacity: 0 })
  gsap.set(imageEls, { opacity: 1, clipPath: CLIP_HIDDEN })
  motionOn.value = true

  const tl = gsap.timeline({ delay: 0.15 })
  pieces.value.forEach((piece, index) => {
    const at = index * STAGGER
    if (piece.kind === 'image') {
      const el = root.querySelector<HTMLElement>(`[data-key="${piece.key}"]`)
      if (!el) return
      tl.to(el, { clipPath: CLIP_VISIBLE, duration: 1.45, ease: 'power3.inOut' }, at)
      return
    }
    const block = wordsByKey.get(piece.key)
    if (!block?.length) return
    tl.to(
      block,
      { filter: 'blur(0px)', opacity: 1, duration: 2.2, ease: 'power3.out' },
      at,
    )
  })
  timeline = tl
  await tl
  if (finished || !rootEl.value) return

  await delay(HOLD_AFTER_IN * 1000)
  if (finished || !rootEl.value) return
  await playOut()
  if (finished) return
  finishSite()
}

const playOut = () =>
  new Promise<void>((resolve) => {
    const root = rootEl.value
    if (!root) {
      resolve()
      return
    }
    guideVisible.value = false
    const count = pieces.value.length
    const tl = gsap.timeline({
      onComplete: resolve,
      onInterrupt: resolve,
    })
    pieces.value.forEach((piece, index) => {
      const at = (count - 1 - index) * OUT_STAGGER
      if (piece.kind === 'image') {
        const el = root.querySelector<HTMLElement>(`[data-key="${piece.key}"]`)
        if (!el) return
        tl.to(el, { clipPath: CLIP_HIDDEN, duration: 1.05, ease: 'power3.inOut' }, at)
        return
      }
      const block = wordsByKey.get(piece.key)
      if (!block?.length) return
      tl.to(
        block,
        {
          filter: `blur(${TITLE_BLUR_MAX}px)`,
          opacity: 0,
          duration: 0.7,
          ease: 'power2.in',
        },
        at,
      )
    })
    timeline = tl
    if (!tl.duration()) resolve()
  })

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
  window.removeEventListener('keydown', onGuideKey)
  if (fadeVeil) document.removeEventListener('homepage-columns-opening', fadeVeil)
  window.clearTimeout(veilTimer)
  window.clearTimeout(failTimer)
  window.clearTimeout(fallbackTimer)
  stopPieces?.()
  timeline?.kill()
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
  pointer-events: auto;
}

.homepage-intro__goo {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}

.homepage-intro__stage {
  --intro-inset: clamp(18px, 2.6vw, 42px);
  --intro-line: color-mix(in srgb, currentColor 38%, transparent);
  --intro-label: color-mix(in srgb, currentColor 72%, transparent);
  position: absolute;
  inset: var(--intro-inset);
}

.homepage-intro__board,
.homepage-intro__guide {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-template-rows: repeat(12, minmax(0, 1fr));
  gap: 0;
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

.homepage-intro__cell:nth-child(12n) {
  border-right: none;
}

.homepage-intro__cell:nth-child(n + 133) {
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
  display: flex;
  padding: 0.55rem 0.7rem;
}

.homepage-intro__piece--type.is-start {
  align-items: flex-start;
}

.homepage-intro__piece--type.is-center {
  align-items: center;
}

.homepage-intro__piece--type.is-end {
  align-items: flex-end;
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
  font-family: var(--serif);
  font-size: clamp(1.85rem, 3.5vw, 4.4rem);
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
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  line-height: 1.35;
  text-transform: uppercase;
}

.homepage-intro :deep(.homepage-intro__word) {
  display: inline-block;
  will-change: filter, opacity;
}
</style>
