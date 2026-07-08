<template>
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
        class="preloader__logo serif-italic"
        :class="{ 'preloader__logo--visible': phase === 'logo-in' }"
      >
        <span v-if="logo" class="preloader__logo-svg" v-html="logo" />
        <span v-else>{{ title }}</span>
      </div>

      <!-- Screen 2: intro statement, word by word -->
      <p
        v-else-if="phase === 'statement' || phase === 'hold' || phase === 'exit'"
        class="preloader__statement serif-italic"
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
  markHomepagePreloaderDone,
  shouldShowHomepagePreloader,
} from '~/composables/useHomepagePreloader'

const emit = defineEmits<{
  'preloader-ready': []
  'preloader-complete': []
}>()

const { title, logo, disablePreloader } = useSiteSettings()

const DEFAULT_STATEMENT =
  'Award-winning surfaces, collectible design and architectural features. From concept to completion.'

const statementQuery = `*[_type == "homePage"][0].preloaderStatement`

const { data: preloaderStatement } = useAsyncData('preloaderStatement', () =>
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

const WORD_INTERVAL = 140

let started = false
let timers: ReturnType<typeof setTimeout>[] = []
let wordTimer: ReturnType<typeof setInterval> | null = null

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
  document.body.classList.remove('homepage-intro-pending')
  document.body.classList.add('preloader-ready')
  document.body.classList.add('preloader-complete')
  emit('preloader-ready')
  emit('preloader-complete')
  document.dispatchEvent(new CustomEvent('preloader-complete'))
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

  // Reveal the site behind the panel
  schedule(() => {
    revealSite()
    document.body.classList.remove('homepage-intro-pending')
    phase.value = 'exit'
  }, statementDone + 1400)

  schedule(() => {
    finishPreloader()
  }, statementDone + 2800)
}

function bootstrap() {
  if (!import.meta.client) return

  if (disablePreloader.value || !shouldShowHomepagePreloader()) {
    skipPreloader()
    return
  }

  runSequence()
}

watch(
  disablePreloader,
  (disabled) => {
    if (disabled) skipPreloader()
  },
  { immediate: true },
)

onMounted(() => {
  if (!disablePreloader.value) {
    bootstrap()
  }
})

onUnmounted(() => {
  clearTimers()
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
  clip-path: inset(0% 0% 0% 0%);
  transition: clip-path 1.1s cubic-bezier(0.65, 0, 0.35, 1);
}

.preloader--exit .preloader__panel {
  clip-path: inset(0% 0% 100% 0%);
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
</style>
