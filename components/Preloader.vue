<template>
  <div v-if="debugLabel" class="preloader__debug" aria-live="polite">
    <span class="preloader__debug-label">{{ debugLabel }}</span>
    <span v-if="debugHint" class="preloader__debug-hint">Click to continue</span>
  </div>
  <div
    v-if="active"
    class="preloader"
    :class="{ 'preloader--exit': phase === 'exit' }"
    aria-hidden="true"
  >
    <div class="preloader__panel">
      <!-- Screen 1: logo, fades in then out -->
      <div
        v-if="phase === 'logo-in' || phase === 'logo-out'"
        class="preloader__logo  interface"
        :class="{ 'preloader__logo--visible': phase === 'logo-in' }"
      >
        <span v-if="logo" class="preloader__logo-svg" v-html="logo" />
        <span v-else>{{ title }}</span>
      </div>

      <!-- Screen 2: intro statement, word by word -->
      <p
        v-else-if="phase === 'statement' || phase === 'hold' || phase === 'exit'"
        class="preloader__statement  interface"
      >
        <template v-for="(word, index) in words" :key="index">
          <span
            class="preloader__word"
            :class="{ 'preloader__word--visible': index < visibleWords }"
          >{{ word }}</span
          ><span
            class="preloader__space"
            :class="{ 'preloader__word--visible': index < visibleWords }"
          >&nbsp;</span>
        </template>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  clearHomepageIntroLock,
  markHomepagePreloaderDone,
  shouldShowHomepagePreloader,
  useHomepageIntro,
} from '~/composables/useHomepagePreloader'

const emit = defineEmits<{
  'preloader-ready': []
  'preloader-complete': []
}>()

const { title, logo } = useSiteSettings()

const DEFAULT_STATEMENT =
  'Award-winning surfaces, collectible design and architectural features. From concept to completion.'

const statementQuery = `*[_type == "infiniteSliderPage"][0].preloaderStatement`

const { data: preloaderStatement } = useAsyncData('preloaderStatement-v2', () =>
  $fetch('/api/sanity/query', { method: 'POST', body: { query: statementQuery } })
    .then((r: { result?: string }) => r?.result || null)
    .catch(() => null),
  { server: true },
)

const statement = computed(
  () => preloaderStatement.value?.trim() || DEFAULT_STATEMENT,
)

const words = computed(() => statement.value.split(/\s+/).filter(Boolean))

const active = ref(false)
const phase = ref<'idle' | 'logo-in' | 'logo-out' | 'statement' | 'hold' | 'exit'>('idle')
const visibleWords = ref(0)
const debugLabel = ref<string | null>(null)
const debugHint = ref(false)

const WORD_INTERVAL = 140

let started = false
let introSettled = false
let stepped = false
let introFailTimer: ReturnType<typeof setTimeout> | null = null
let timers: ReturnType<typeof setTimeout>[] = []
let wordTimer: ReturnType<typeof setInterval> | null = null
let clickWaiter: ((event: PointerEvent) => void) | null = null

function lockScroll() {
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
}

function unlockScroll() {
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
}

function clearTimers() {
  timers.forEach(clearTimeout)
  timers = []
  if (wordTimer) {
    clearInterval(wordTimer)
    wordTimer = null
  }
  if (clickWaiter) {
    window.removeEventListener('pointerdown', clickWaiter, true)
    clickWaiter = null
  }
  debugHint.value = false
}

function schedule(fn: () => void, ms: number) {
  timers.push(setTimeout(fn, ms))
}

function finishPreloader() {
  markHomepagePreloaderDone()
  active.value = false
  unlockScroll()
  document.body.classList.add('preloader-complete')
  document.dispatchEvent(new CustomEvent('preloader-complete'))
  emit('preloader-complete')
}

function skipPreloader() {
  if (started) return
  started = true
  active.value = false
  unlockScroll()
  clearHomepageIntroLock()
  useHomepageIntro().phase.value = 'skipped'
  document.body.classList.add('preloader-ready')
  document.body.classList.add('preloader-complete')
  emit('preloader-ready')
  emit('preloader-complete')
  document.dispatchEvent(new CustomEvent('preloader-complete'))
}

function settleFromIntro() {
  if (introSettled) return
  introSettled = true
  debugLabel.value = null
  debugHint.value = false
  if (introFailTimer) {
    clearTimeout(introFailTimer)
    introFailTimer = null
  }
  clearHomepageIntroLock()
  useHomepageIntro().phase.value = 'done'
  markHomepagePreloaderDone()
  unlockScroll()
  document.body.classList.add('preloader-complete')
  emit('preloader-complete')
  document.dispatchEvent(new CustomEvent('preloader-complete'))
}

function beginHomepageIntro() {
  started = true
  active.value = false
  useHomepageIntro().phase.value = 'cover'
  document.body.classList.add('homepage-intro-pending')
  document.documentElement.classList.add('homepage-intro')
  revealSite()
  document.addEventListener('homepage-intro-complete', settleFromIntro, { once: true })
  introFailTimer = setTimeout(settleFromIntro, 20000)
}

function revealSite() {
  document.body.classList.add('preloader-ready')
  emit('preloader-ready')
}

function revealWords() {
  wordTimer = setInterval(() => {
    if (visibleWords.value >= words.value.length) {
      if (wordTimer) clearInterval(wordTimer)
      wordTimer = null
      return
    }
    visibleWords.value += 1
  }, WORD_INTERVAL)
}

function waitForWords() {
  return new Promise<void>((resolve) => {
    const tick = () => {
      if (!stepped) return
      if (visibleWords.value >= words.value.length && !wordTimer) {
        resolve()
        return
      }
      timers.push(setTimeout(tick, WORD_INTERVAL))
    }
    tick()
  })
}

function waitForClick() {
  debugHint.value = true
  return new Promise<void>((resolve) => {
    const onDown = (event: PointerEvent) => {
      event.preventDefault()
      event.stopPropagation()
      window.removeEventListener('pointerdown', onDown, true)
      if (clickWaiter === onDown) clickWaiter = null
      debugHint.value = false
      resolve()
    }
    clickWaiter = onDown
    window.addEventListener('pointerdown', onDown, true)
  })
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    timers.push(setTimeout(resolve, ms))
  })
}

async function runSteppedIntro() {
  if (!import.meta.client || started) return
  started = true
  stepped = true
  active.value = true
  lockScroll()
  document.body.classList.add('homepage-intro-pending')

  debugLabel.value = 'Text in'
  phase.value = 'statement'
  revealWords()
  await waitForWords()
  if (!stepped) return

  debugLabel.value = 'Text out'
  await waitForClick()
  if (!stepped) return
  phase.value = 'exit'
  await delay(700)
  if (!stepped) return

  debugLabel.value = 'Images in'
  await waitForClick()
  if (!stepped) return
  active.value = false
  beginHomepageIntro()

  debugLabel.value = 'Next'
  await waitForClick()
  if (!stepped) return
  debugLabel.value = null
  settleFromIntro()
}

function runSequence() {
  if (!import.meta.client || started) return
  started = true
  active.value = true
  lockScroll()
  document.body.classList.add('homepage-intro-pending')

  const wordsRevealDuration = words.value.length * WORD_INTERVAL

  // Screen 1 — logo fades in
  schedule(() => {
    phase.value = 'logo-in'
  }, 80)

  // Logo fades out
  schedule(() => {
    phase.value = 'logo-out'
  }, 1600)

  // Screen 2 — statement appears word by word
  schedule(() => {
    phase.value = 'statement'
    revealWords()
  }, 2400)

  const statementDone = 2400 + wordsRevealDuration

  schedule(() => {
    phase.value = 'hold'
  }, statementDone + 200)

  // Intro text + panel fade out
  schedule(() => {
    phase.value = 'exit'
  }, statementDone + 1400)

  // Once the text has faded, reveal the site so the flow-state
  // items begin their sequential fade-in behind the fading panel.
  schedule(() => {
    revealSite()
    document.body.classList.remove('homepage-intro-pending')
  }, statementDone + 1900)

  schedule(() => {
    finishPreloader()
  }, statementDone + 3000)
}

function bootstrap() {
  if (!import.meta.client || started) return

  if (!shouldShowHomepagePreloader()) {
    skipPreloader()
    return
  }

  runSteppedIntro()
}

onMounted(() => {
  bootstrap()
})

onUnmounted(() => {
  stepped = false
  debugLabel.value = null
  clearTimers()
  if (introFailTimer) clearTimeout(introFailTimer)
  document.removeEventListener('homepage-intro-complete', settleFromIntro)
  unlockScroll()
})
</script>

<style scoped>
.preloader {
  position: fixed;
  inset: 0;
  z-index: 99999;
  pointer-events: auto;
}

.preloader__panel {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--gutter);
  background: var(--cream);
  overflow: hidden;
  opacity: 1;
  transition: opacity 1s ease;
}

.preloader--exit .preloader__panel {
  opacity: 0;
}

/* Screen 1 — logo */
.preloader__logo {
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  letter-spacing: 0.01em;
  opacity: 0;
  transform: translateY(10px);
  transition:
    opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}

.preloader__logo--visible {
  opacity: 1;
  transform: translateY(0);
}

.preloader__logo-svg :deep(svg) {
  height: clamp(2rem, 5vw, 3.25rem);
  width: auto;
  margin: 0 auto;
}

/* Screen 2 — statement, word by word */
.preloader__statement {
  margin: 0;
  max-width: 60rem;
  font-size: clamp(1.25rem, 3vw, 2rem);
  line-height: 1.4;
  color: var(--charcoal);
  transition: opacity 0.6s ease;
}

.preloader--exit .preloader__statement {
  opacity: 0;
}

.preloader__word {
  display: inline-block;
  opacity: 0;
  transform: translateY(0.4em);
  transition:
    opacity 0.5s ease,
    transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.preloader__word--visible {
  opacity: 1;
  transform: translateY(0);
}

.preloader__space {
  display: inline-block;
  opacity: 0;
  transition: opacity 0.5s ease;
}

.preloader__debug {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 100000;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 8.5rem;
  padding: 8px 10px;
  background: var(--text-color, #111);
  color: var(--background-color, #fff);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.3;
  pointer-events: none;
}

.preloader__debug-label {
  font-weight: 600;
}

.preloader__debug-hint {
  opacity: 0.7;
}
</style>
