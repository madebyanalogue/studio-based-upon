<template>
  <div
    ref="rootEl"
    class="homepage-intro"
    :class="{ 'is-motion': motionOn, 'is-dark': isDark, 'is-flat': toPage }"
    :data-frame="frameIndex"
    :data-cursor-label="cursorLabel"
    role="dialog"
    aria-label="Introduction"
    @click="onFieldClick"
  >
    <IntroMaterialSpotlight
      v-for="slot in 3"
      :key="slot"
      :dark="isDark"
      :revealed="activeModel === slot - 1"
      :flatten="modelFlatten[slot - 1]"
      :to-page="toPage"
      :placement="slot - 1"
    />

    <div class="homepage-intro__logo">
      <div ref="logoEl" class="homepage-intro__logo-mark">
        <BasedUponLogoSansSerif />
      </div>
    </div>

    <div class="homepage-intro__stage">
      <div
        v-for="piece in pieces"
        :key="piece.key"
        class="homepage-intro__piece"
        :data-key="piece.key"
      >
        <p
          v-for="(line, lineIndex) in piece.lines"
          :key="line"
          class="homepage-intro__type is-display"
          :data-line="lineIndex"
        >{{ line }}</p>
        <div v-if="piece.follow?.length" class="homepage-intro__follow">
          <p
            v-for="(line, lineIndex) in piece.follow"
            :key="line"
            class="homepage-intro__type is-display"
            :data-line="lineIndex"
            :data-follow-index="lineIndex"
          >{{ line }}</p>
        </div>
      </div>
    </div>

    <div
      class="homepage-intro__theme"
      :class="{ 'is-in': backdropIn }"
      role="group"
      aria-label="Colour mode"
      data-cursor="default"
      @click.stop
    >
      <button
        type="button"
        class="homepage-intro__theme-label"
        :aria-pressed="!isDark"
        @click.stop="setTheme('light')"
      >Light</button>
      <button
        type="button"
        class="homepage-intro__theme-switch"
        :aria-pressed="isDark"
        aria-label="Switch colour mode"
        @click.stop="toggleTheme"
      >
        <span class="homepage-intro__theme-thumb" :class="{ 'is-dark': isDark }" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="homepage-intro__theme-label"
        :aria-pressed="isDark"
        @click.stop="setTheme('dark')"
      >Dark</button>
    </div>

    <a
      v-if="activeCard"
      ref="productEl"
      class="homepage-intro__product"
      :class="{ 'is-in': productVisible }"
      :href="activeCard.href"
      data-cursor="default"
      @click.prevent.stop="onProduct"
    >
      <img
        class="homepage-intro__product-thumb"
        :src="activeCard.image"
        :alt="activeCard.title"
        draggable="false"
      />
      <span class="homepage-intro__product-meta">
        <span class="homepage-intro__product-title">{{ activeCard.title }}</span>
        <span v-if="activeCard.meta" class="homepage-intro__product-line">{{ activeCard.meta }}</span>
      </span>
    </a>

    <div
      class="homepage-intro__progress"
      :class="{ 'is-in': showProgress }"
      aria-hidden="true"
    >
      <span>{{ frameIndex }}</span>
      <span class="homepage-intro__progress-line" />
      <span>{{ FRAMES.length - 1 }}</span>
    </div>

    <div
      v-if="frameIndex === FRAMES.length - 1"
      class="homepage-intro__finale"
    >
      <span
        class="homepage-intro__rule"
        :class="{ 'is-drawn': ruleDrawn }"
        @transitionend="onRuleEnd"
      />
      <button
        ref="enterEl"
        type="button"
        class="homepage-intro__enter interface"
        :class="{ 'is-in': enterReady }"
        data-cursor="default"
        @click.stop="onEnter"
      >
        Enter the studio
      </button>
    </div>

    <button
      type="button"
      class="homepage-intro__skip"
      data-cursor="default"
      @click.stop="onSkip"
    >
      Skip
    </button>
  </div>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import {
  clearHomepageIntroLock,
  useHomepageIntro,
  type HomepageIntroProduct,
} from '~/composables/useHomepagePreloader'
import { suppressOverlayRouteLeave } from '~/composables/useProductOverlay'

type Piece = {
  key: string
  frame: number
  lines: string[]
  /** Lines that arrive under this piece, one after another. */
  follow?: string[]
  /** Stays in place while the following frame enters. */
  carry?: boolean
}

type Frame = {
  lines: string[]
  /** Shown under `lines`, staggered in while that copy stays put. */
  follow?: string[]
}

const FRAMES: Frame[] = [
  {
    lines: ['Studio Based Upon', 'creates with you.'],
  },
  {
    lines: ['Two decades of making', 'for extraordinary spaces', 'around the world.'],
  },
  {
    lines: ['Everything starts', 'somewhere.'],
    follow: ['An idea.', 'A material.', 'A place.', 'A story.'],
  },
  {
    lines: ['Explore what', 'it could become.'],
  },
]

const STAGE_NAMES = ['Studio Based Upon', 'Two decades', 'Everything starts', 'Explore what']
/** Hold after the title is fully in, before the click sends it out. */
const DEFAULT_BEATS = [0.7, 1.4, 2.6, 1.4]

const pieces: Piece[] = FRAMES.map((frame, frameIndex) => ({
  key: `f${frameIndex}`,
  frame: frameIndex,
  lines: frame.lines,
  follow: frame.follow,
}))

const { phase } = useHomepageIntro()

const PRODUCT_AFTER_MS = 2000
const thumb = (url: string) => `${url}?w=640&auto=format&q=80`
/** Cards for the three model slides: Two decades, Everything starts, Explore what. */
const SLIDE_PRODUCTS: Record<number, HomepageIntroProduct> = {
  1: {
    title: 'Diamond Coffee Table (Blush)',
    meta: 'Diamond',
    image: thumb('https://cdn.sanity.io/images/k8gpyc57/production/fbcd128f554f3e317ee629acb7459adb1cd6f33b-3000x2000.jpg'),
    href: '/materials-and-forms/diamond-coffee-table-blush',
  },
  2: {
    title: 'Untitled 06',
    meta: '',
    image: thumb('https://cdn.sanity.io/images/k8gpyc57/production/2d612776950658cd0acd084b4ebb9361a273f195-1993x3000.jpg'),
    href: '/materials-and-forms/untitled-06',
  },
  3: {
    title: 'Double Twist Table',
    meta: 'Twist',
    image: thumb('https://cdn.sanity.io/images/k8gpyc57/production/c21436a67fe96cf2afda2fbca9789b4dbd4e5d51-3000x1924.jpg'),
    href: '/materials-and-forms/double-twist-table',
  },
}
const activeCard = ref<HomepageIntroProduct | null>(null)
const productVisible = ref(false)
let productTimer = 0
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
const motionOn = ref(false)
const frameIndex = ref(0)
const { isDark, setTheme, toggleTheme } = useTheme()
const { preset: cursorPreset } = useCursor()
const { open: openProduct } = useProductOverlay()
const router = useRouter()
const backdropIn = ref(false)
const toPage = ref(false)
/** One spotlight per group. -1 until the first group begins. */
const activeModel = ref(-1)
const modelFlatten = ref([true, true, true])
/** How long each title holds after it is in. */
const beats = ref<number[]>([...DEFAULT_BEATS])
/** Hold after the logo has landed, before the first line. */
const logoHoldMs = ref(520)
const enterReady = ref(false)
const enterEl = ref<HTMLElement | null>(null)
const productEl = ref<HTMLElement | null>(null)
const ruleDrawn = ref(false)
/** From Two decades until the last slide. */
const showProgress = computed(
  () => frameIndex.value >= 1 && frameIndex.value < FRAMES.length - 1,
)
const leaving = ref(false)

let started = false
let finished = false
/** Two decades onward waits for a click. The follow lines stay inside their slide. */
const CLICK_FROM = 1
const awaitingClick = ref(false)
/** Continue types on only after the arrived slide has had a moment to settle. */
const CURSOR_AFTER_MS = 1200
const cursorLabel = ref<string | undefined>(undefined)
let cursorTimer = 0

const clearNextCursor = () => {
  window.clearTimeout(cursorTimer)
  cursorTimer = 0
  cursorLabel.value = undefined
  const tip = cursorPreset.value?.tooltip
  if (tip === 'Continue' || tip === 'Enter') cursorPreset.value = null
}

const armNextCursor = () => {
  window.clearTimeout(cursorTimer)
  cursorTimer = 0
  cursorLabel.value = undefined
  if (finished || leaving.value || frameIndex.value < CLICK_FROM) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  cursorTimer = window.setTimeout(() => {
    cursorTimer = 0
    if (finished || leaving.value || !awaitingClick.value) return
    if (frameIndex.value < CLICK_FROM) return
    const label = frameIndex.value >= FRAMES.length - 1 ? 'Enter' : 'Continue'
    cursorLabel.value = label
    cursorPreset.value = { id: 'cursor-label', tooltip: label }
  }, reduced ? 160 : CURSOR_AFTER_MS)
}
let pluginsReady = false
let failTimer = 0
let releaseTimer = 0
let veilTimer = 0
let fadeVeil: (() => void) | null = null
let splits: InstanceType<typeof SplitText>[] = []
type LineGroup = { words: HTMLElement[]; follow: number | null }
let linesByKey = new Map<string, LineGroup[]>()
let stopPath: (() => void) | null = null
/** Logo fades out fully before the first line fades in. */
const LOGO_EXIT_START = 0
const LOGO_EXIT_END = 0.28
const TEXT_START = LOGO_EXIT_END
/** Path units per second while the slides play themselves. */
const SLIDE_RATE = 0.48

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const finishSite = (immediate = false) => {
  if (finished) return
  finished = true
  homeScrollHint.value = false
  stopPath?.()
  clearNextCursor()
  dismissProduct()
  window.clearTimeout(failTimer)
  window.clearTimeout(releaseTimer)
  if (immediate) {
    clearHomepageIntroLock()
    if (phase.value !== 'done' && phase.value !== 'skipped') phase.value = 'done'
    document.dispatchEvent(new CustomEvent('homepage-intro-complete'))
    return
  }

  meltVisibleType()
  modelFlatten.value = [true, true, true]
  toPage.value = true
  const flattenAt = performance.now()
  const FLATTEN_MS = 1200

  const dropVeil = () => {
    if (phase.value !== 'done' && phase.value !== 'skipped') phase.value = 'done'
  }
  const veil = rootEl.value
  let veiled = false
  const revealSite = () => {
    // Slider type can come in with the columns. Nav and stack wait for
    // homepage-intro-reveal, which the slider adds once its wipe has finished.
    document.documentElement.classList.add('homepage-intro-type')
    dropVeil()
    document.dispatchEvent(new CustomEvent('homepage-intro-complete'))
  }
  fadeVeil = () => {
    if (veiled) return
    const remain = FLATTEN_MS - (performance.now() - flattenAt)
    if (remain > 40) {
      window.clearTimeout(veilTimer)
      veilTimer = window.setTimeout(fadeVeil, remain)
      return
    }
    veiled = true
    window.clearTimeout(veilTimer)
    if (!veil) {
      revealSite()
      return
    }
    veil.style.pointerEvents = 'none'
    gsap.to(veil, {
      opacity: 0,
      duration: 0.7,
      ease: 'power2.inOut',
      onComplete: revealSite,
    })
  }
  veilTimer = window.setTimeout(fadeVeil, 1400)

  // Safety net if the slider never finishes its wipe. The slider clears this
  // sooner, once the nav fade and stack rise have landed.
  releaseTimer = window.setTimeout(() => {
    clearHomepageIntroLock()
  }, 9000)
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

/** 1 at rest, 0 once the opening logo has melted away. */
const textOrigin = () => TEXT_START
const logoAmount = (t: number) => 1 - along(t, LOGO_EXIT_START, LOGO_EXIT_END)

/** Outgoing fade. The span is the fade speed, shared by every slide. */
const EXIT_LEAD = 0.22
const EXIT_TAIL = 0.1
const EXIT_SPAN = EXIT_LEAD + EXIT_TAIL
/** Opening line leaves a little quicker than the later slides. */
const OPENING_EXIT_SPAN = 0.18
const exitSpanFor = (index: number) => (index === 0 ? OPENING_EXIT_SPAN : EXIT_SPAN)
/** Incoming fade. One slide is fully out before the next begins. */
const ENTER_SPAN = 0.42
/** Pause after a slide has gone, before the next title fades in. */
const GROUP_TEXT_DELAY = 0.28
const FOLLOW_AFTER = 0.08
const FOLLOW_STAGGER = 0.32
const FOLLOW_SPAN = 0.28
/** Last slide: each word fades in on its own. */
const WORD_STAGGER = 0.07
const WORD_SPAN = 0.18

const minHold = (index: number) => {
  const followCount = FRAMES[index]?.follow?.length ?? 0
  if (!followCount) return 0.45
  return FOLLOW_AFTER + (followCount - 1) * FOLLOW_STAGGER + FOLLOW_SPAN + 0.2
}
const holdFor = (index: number) => Math.max(minHold(index), beats.value[index] ?? 1.4)
/** Time from a slide's start until its title has finished melting in. */
const leadIn = (index: number) => ENTER_SPAN + (index === 0 ? 0 : GROUP_TEXT_DELAY)
const slideSpan = (index: number) => leadIn(index) + holdFor(index) + exitSpanFor(index)

const frameStart = (index: number) => {
  let cursor = 0
  for (let i = 0; i < index; i += 1) cursor += slideSpan(i)
  return cursor
}
const frameEnd = (index: number) => frameStart(index) + slideSpan(index)

/** Opening line starts with its slide. Group titles wait, then melt in. */
const enterStartFor = (frame: number) => frameStart(frame) + (frame === 0 ? 0 : GROUP_TEXT_DELAY)
/** Click starts the title and the model leaving together. */
const exitStartFor = (frame: number) => frameStart(frame) + leadIn(frame) + holdFor(frame)

/** 0 while a piece is off the path, 1 while its stage is fully present. */
const pieceAmount = (piece: Piece, t: number) => {
  const textT = t - textOrigin()
  const enterStart = enterStartFor(piece.frame)
  const enter = along(textT, enterStart, enterStart + ENTER_SPAN)
  const exitStart = exitStartFor(piece.frame)
  return enter * (1 - along(textT, exitStart, exitStart + exitSpanFor(piece.frame)))
}

/** Follow lines arrive under the headline, each a step after the last. */
const followAmount = (piece: Piece, index: number, t: number) => {
  const textT = t - textOrigin()
  const lineStart = enterStartFor(piece.frame) + ENTER_SPAN + FOLLOW_AFTER + index * FOLLOW_STAGGER
  const enter = along(textT, lineStart, lineStart + FOLLOW_SPAN)
  const exitStart = exitStartFor(piece.frame)
  return enter * (1 - along(textT, exitStart, exitStart + exitSpanFor(piece.frame)))
}

const stageAt = (t: number) => {
  const textT = t - textOrigin() + 0.08
  for (let i = FRAMES.length - 1; i >= 0; i -= 1) {
    if (textT >= frameStart(i)) return i
  }
  return 0
}

/** Time when a slide, including its follow lines, is fully in and waiting for a click. */
const arrivedTextT = (index: number) => {
  const frame = FRAMES[index]
  const enterStart = enterStartFor(index)
  if (index === FRAMES.length - 1) {
    const wordCount = frame?.lines.join(' ').split(/\s+/).filter(Boolean).length ?? 1
    return enterStart + Math.max(0, wordCount - 1) * WORD_STAGGER + WORD_SPAN
  }
  const followCount = frame?.follow?.length ?? 0
  if (!followCount) return enterStart + ENTER_SPAN
  return enterStart + ENTER_SPAN + FOLLOW_AFTER + (followCount - 1) * FOLLOW_STAGGER + FOLLOW_SPAN
}

const arrivedT = (index: number) => textOrigin() + arrivedTextT(index)

const bindPieces = () => {
  const root = rootEl.value
  if (!root) return
  ensurePlugins()
  linesByKey = new Map()
  for (const split of splits) {
    try {
      split.revert()
    } catch {
      /* already reverted */
    }
  }
  splits = []
  root.querySelectorAll<HTMLElement>('.homepage-intro__type').forEach((el) => {
    const split = new SplitText(el, { type: 'words', wordsClass: 'homepage-intro__word' })
    splits.push(split)
    const key = el.closest<HTMLElement>('[data-key]')?.dataset.key
    if (!key) return
    const followRaw = el.dataset.followIndex
    const parsed = followRaw == null || followRaw === '' ? null : Number(followRaw)
    const follow = parsed == null || Number.isNaN(parsed) ? null : parsed
    const groups = linesByKey.get(key) ?? []
    groups.push({ words: split.words as HTMLElement[], follow })
    linesByKey.set(key, groups)
  })
  motionOn.value = true
}

const paintLogo = (t: number, reduced: boolean) => {
  const logo = logoEl.value
  if (!logo) return
  const amount = reduced ? (t < LOGO_EXIT_END * 0.5 ? 1 : 0) : logoAmount(t)
  logo.style.opacity = String(amount)
  logo.style.filter = 'none'
}

/** Fade whatever slide type is on screen. */
const meltVisibleType = () => {
  const words: HTMLElement[] = []
  for (const groups of linesByKey.values()) {
    for (const group of groups) {
      for (const word of group.words) {
        if (parseFloat(word.style.opacity || '0') > 0.02) words.push(word)
      }
    }
  }
  const product = productEl.value
  if (product) {
    product.style.animation = 'none'
    words.push(product)
  }
  const enter = enterEl.value
  if (enter) {
    enter.style.animation = 'none'
    words.push(enter)
  }
  if (!words.length) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    gsap.set(words, { opacity: 0, filter: 'none' })
    return
  }
  gsap.to(words, {
    opacity: 0,
    duration: 0.42,
    ease: 'power2.in',
    overwrite: 'auto',
  })
}

/** Each group has its own figure: in before the title, out with it. */
const syncModels = (t: number) => {
  if (toPage.value || leaving.value) return
  const textT = t - textOrigin()
  let slide = 0
  for (let index = 1; index < FRAMES.length; index += 1) {
    if (textT >= frameStart(index)) slide = index
  }
  if (slide < 1) {
    backdropIn.value = false
    activeModel.value = -1
    modelFlatten.value = [true, true, true]
    return
  }
  const slot = slide - 1
  // Hold the next figure until the previous one has faded out.
  const revealed = textT >= enterStartFor(slide)
  activeModel.value = revealed ? slot : -1
  if (revealed) backdropIn.value = true
  const flat = [true, true, true]
  if (revealed) flat[slot] = textT >= exitStartFor(slide)
  modelFlatten.value = flat
}

const paint = (t: number) => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const stage = stageAt(t)
  frameIndex.value = stage
  paintLogo(t, reduced)
  for (const piece of pieces) {
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
    const groups = linesByKey.get(piece.key)
    if (!groups) continue
    if (piece.frame === FRAMES.length - 1) {
      const words = groups.flatMap((group) => group.words)
      const textT = t - textOrigin()
      const enterStart = enterStartFor(piece.frame)
      const exitStart = exitStartFor(piece.frame)
      const exit = reduced ? 1 : 1 - along(textT, exitStart, exitStart + EXIT_SPAN)
      words.forEach((word, index) => {
        const start = enterStart + index * WORD_STAGGER
        const enter = reduced
          ? stage === piece.frame
            ? 1
            : 0
          : along(textT, start, start + WORD_SPAN)
        word.style.opacity = String(enter * exit)
        word.style.filter = 'none'
      })
      continue
    }
    for (const group of groups) {
      let lineAmount = group.follow == null ? amount : followAmount(piece, group.follow, t)
      if (reduced) lineAmount = amount
      for (const word of group.words) {
        word.style.opacity = String(lineAmount)
        word.style.filter = 'none'
      }
    }
  }
  syncModels(t)
}

const armClosingChoices = () => {
  if (enterReady.value || ruleDrawn.value || finished) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    ruleDrawn.value = true
    enterReady.value = true
    return
  }
  ruleDrawn.value = true
}

const onRuleEnd = (event: TransitionEvent) => {
  if (event.propertyName !== 'transform') return
  if (!ruleDrawn.value || finished) return
  enterReady.value = true
}

const onEnter = () => {
  if (finished) return
  leaving.value = true
  ruleDrawn.value = false
  finishSite()
}

const onSkip = () => {
  if (finished) return
  leaving.value = true
  finishSite()
}

const onProduct = async () => {
  const card = activeCard.value
  if (finished || !card || !productVisible.value) return
  const match = card.href.match(/\/materials-and-forms\/([^/?#]+)/)
  const slug = match?.[1]
  onEnter()
  if (!slug) return
  await suppressOverlayRouteLeave(() => router.replace('/materials-and-forms'))
  openProduct(slug)
}

const onFieldClick = (event: MouseEvent) => {
  const target = event.target
  if (target instanceof Element && target.closest('button, a, .homepage-intro__theme')) return
  if (finished || leaving.value) return
  if (frameIndex.value >= FRAMES.length - 1) onEnter()
  else advanceSlide()
}

const onKey = (event: KeyboardEvent) => {
  if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return
  if (typingTarget(event)) return
  if (finished) return

  if (event.key === 'Enter' || event.key === 'Escape') {
    event.preventDefault()
    onEnter()
  }
}

const pathState = { t: 0 }
let pathTween: gsap.core.Tween | null = null
let pathDest: number | null = null
/** Slide a click is already sending us to. Further clicks wait until it arrives. */
let userSkip: number | null = null
let pathArrive: (() => void) | undefined
let playGeneration = 0

const playTo = (target: number, onArrive?: () => void, dest?: number | null) => {
  pathDest = dest === undefined ? null : dest
  pathArrive = onArrive
  pathTween?.kill()
  if (target <= pathState.t + 0.01) {
    pathTween = null
    pathDest = null
    paint(pathState.t)
    return
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const distance = Math.max(0, target - pathState.t)
  pathTween = gsap.to(pathState, {
    t: target,
    duration: reduced ? 0 : distance / SLIDE_RATE,
    ease: 'none',
    overwrite: 'auto',
    onUpdate: () => {
      if (!finished) paint(pathState.t)
    },
    onComplete: () => {
      pathTween = null
      pathDest = null
      pathArrive = undefined
      if (finished) return
      paint(target)
      onArrive?.()
    },
  })
  stopPath = () => {
    pathTween?.kill()
    pathTween = null
    pathDest = null
    stopPath = null
  }
}

const dismissProduct = () => {
  window.clearTimeout(productTimer)
  productTimer = 0
  productVisible.value = false
}

const armProductCard = () => {
  dismissProduct()
  const frame = frameIndex.value
  const card = SLIDE_PRODUCTS[frame]
  if (!card || finished) return
  productTimer = window.setTimeout(() => {
    productTimer = 0
    if (finished || frameIndex.value !== frame) return
    activeCard.value = card
    productVisible.value = false
    void nextTick(() => {
      requestAnimationFrame(() => {
        if (finished || frameIndex.value !== frame) return
        productVisible.value = true
      })
    })
  }, PRODUCT_AFTER_MS)
}

const settleSlide = () => {
  awaitingClick.value = true
  if (frameIndex.value >= FRAMES.length - 1) armClosingChoices()
  armNextCursor()
  armProductCard()
}

const advanceSlide = () => {
  if (finished || leaving.value) return
  const next = frameIndex.value + 1
  if (next >= FRAMES.length) {
    onEnter()
    return
  }
  if (userSkip === next) return
  userSkip = next
  awaitingClick.value = false
  clearNextCursor()
  dismissProduct()
  const leaveAt = textOrigin() + exitStartFor(frameIndex.value)
  if (leaveAt > pathState.t) {
    pathState.t = leaveAt
    paint(pathState.t)
  }
  playTo(arrivedT(next), () => {
    userSkip = null
    settleSlide()
  }, next)
}

const play = async () => {
  if (started || !rootEl.value || !pieces.length) return
  started = true
  const generation = ++playGeneration
  window.clearTimeout(failTimer)
  document.dispatchEvent(new CustomEvent('homepage-intro-hold'))

  if (document.fonts?.ready) await document.fonts.ready
  await nextTick()
  if (finished || generation !== playGeneration || !rootEl.value) return

  await fadeLogo()
  if (finished || generation !== playGeneration || !rootEl.value) return
  await nextTick()
  bindPieces()
  if (finished || generation !== playGeneration || !rootEl.value) return
  paint(0)

  playTo(arrivedT(CLICK_FROM), settleSlide, CLICK_FROM)
}

const fadeLogo = async () => {
  const logo = logoEl.value
  if (logoShown) return
  logoShown = true
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    if (logo) gsap.set(logo, { opacity: 1, filter: 'none' })
    return
  }
  if (logo) gsap.set(logo, { opacity: 0 })
  const rise = logo
    ? gsap.to(logo, {
        opacity: 1,
        duration: 1.7,
        delay: 0.42,
        ease: 'power2.out',
      })
    : delay(2120)
  await delay(420)
  if (finished) return
  await rise
  await delay(logoHoldMs.value)
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  failTimer = window.setTimeout(() => {
    if (!started) finishSite(true)
  }, 12000)
  void play()
})

onUnmounted(() => {
  stopPath?.()
  if (rootEl.value) gsap.killTweensOf(rootEl.value)
  window.removeEventListener('keydown', onKey)
  if (fadeVeil) document.removeEventListener('homepage-columns-opening', fadeVeil)
  window.clearTimeout(veilTimer)
  window.clearTimeout(failTimer)
  window.clearTimeout(cursorTimer)
  window.clearTimeout(productTimer)
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
  background: var(--intro-ground-light, #eee);
  color: #111;
  --intro-inset: clamp(20px, 5vw, 130px);
  pointer-events: auto;
  transition:
    background 0.45s ease,
    color 0.45s ease;
}

.homepage-intro.is-dark {
  background: var(--intro-ground-dark, #111111);
  color: #f1ede4;
}

.homepage-intro.is-flat,
.homepage-intro.is-dark.is-flat {
  background: var(--cream);
}

.homepage-intro__theme {
  position: absolute;
  left: 50%;
  top: 30px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 0px;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  line-height: 1;
  text-transform: uppercase;
  transform: translateX(-50%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.55s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.homepage-intro__theme.is-in {
  opacity: 1;
  pointer-events: auto;
}

.homepage-intro__theme-switch {
  position: relative;
  flex: 0 0 auto;
  width: 40px;
  height: 12px;
  margin: 0;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  box-sizing: border-box;
  cursor: pointer;
}

.homepage-intro__theme-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  transform: translateX(0);
  transition: transform 0.35s ease;
  pointer-events: none;
}

.homepage-intro__theme-thumb.is-dark {
  transform: translateX(28px);
}

.homepage-intro__theme-label {
  width: 80px;
  margin: 0;
  padding: 10px 15px;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  text-align: left;
  line-height: 1;
  cursor: pointer;
  opacity: 0.4;
  transition: opacity 0.35s ease;
}

.homepage-intro__theme-label:first-child {
  text-align: right;
}

.homepage-intro__theme-label[aria-pressed='true'] {
  opacity: 1;
}

@media (hover: hover) and (pointer: fine) {
  .homepage-intro__theme:has(.homepage-intro__theme-label:hover) .homepage-intro__theme-label[aria-pressed='true']:not(:hover) {
    opacity: 0.4;
  }

  .homepage-intro__theme-label:hover {
    opacity: 1;
  }
}

.homepage-intro__product {
  position: absolute;
  left: 30px;
  bottom: 30px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 16px;
  max-width: min(420px, calc(100% - 60px));
  padding: 20px;
  border-radius: 18px;
  background: transparent;
  color: inherit;
  text-decoration: none;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.6s ease;
}

.homepage-intro__product.is-in {
  opacity: 1;
  pointer-events: auto;
}

.homepage-intro__product-thumb {
  width: 80px;
  height: 80px;
  flex: none;
  border-radius: 10px;
  object-fit: cover;
  display: block;
}

.homepage-intro__product-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.homepage-intro__product-title,
.homepage-intro__product-line {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.125em;
  line-height: 1.35;
  text-transform: uppercase;
}

.homepage-intro__product-line {
  color: var(--muted, color-mix(in srgb, currentColor 62%, transparent));
}

.homepage-intro__progress {
  position: absolute;
  left: 50%;
  bottom: 80px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  padding: 0;
  color: inherit;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  line-height: 1;
  transform: translateX(-50%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s ease;
}

.homepage-intro__progress-line {
  width: 40px;
  height: 1px;
  background: currentColor;
}

.homepage-intro__progress.is-in {
  opacity: 1;
}

.homepage-intro__finale {
  position: absolute;
  left: 50%;
  /* From the bottom of the centered title to the slide indicator. */
  top: calc(50% + 1.7rem);
  bottom: 80px;
  z-index: 6;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateX(-50%);
  pointer-events: none;
}

.homepage-intro__rule {
  position: absolute;
  top: 3rem;
  left: 50%;
  width: 1px;
  height: calc(50% - 7.5rem);
  margin-left: -0.5px;
  background: currentColor;
  transform-origin: top center;
  transform: scaleY(0);
  transition: transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}

.homepage-intro__rule.is-drawn {
  transform: scaleY(1);
}

.homepage-intro__enter {
  margin: 0;
  padding: 0.75rem 1.15rem;
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  line-height: 1.35;
  text-transform: uppercase;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.45s ease;
}

.homepage-intro__enter.is-in {
  opacity: 1;
  pointer-events: auto;
}

.homepage-intro__skip {
  position: absolute;
  right: 60px;
  bottom: 60px;
  z-index: 6;
  margin: 0;
  padding: 10px;
  border: 0;
  background: none;
  color: inherit;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  line-height: 1;
  text-transform: uppercase;
  opacity: 1;
  cursor: pointer;
}

.homepage-intro__logo {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 5;
  width: min(220px, 40vw);
  color: inherit;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.homepage-intro__logo-mark {
  opacity: 0;
  will-change: opacity;
}

.homepage-intro__stage {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.homepage-intro__piece {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35em;
  padding: 0 8vw;
  text-align: center;
}

.homepage-intro__follow {
  position: absolute;
  left: 8vw;
  right: 8vw;
  top: calc(64% + 2.75rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35em;
  text-align: center;
}

.homepage-intro__type {
  margin: 0;
  max-width: 100%;
  opacity: 0;
  color: inherit;
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
  text-align: center;
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
  will-change: opacity;
}

</style>
