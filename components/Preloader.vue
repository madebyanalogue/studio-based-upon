<template></template>

<script setup lang="ts">
import { lockPageScroll, unlockPageScroll } from '~/composables/usePageScrollLock'
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

let started = false
let settled = false
let heldScroll = false
let failTimer = 0

const releaseScroll = () => {
  if (!heldScroll) return
  heldScroll = false
  unlockPageScroll()
}

const settle = (fromFail = false) => {
  if (settled) return
  settled = true
  window.clearTimeout(failTimer)
  document.removeEventListener('homepage-intro-complete', onIntroComplete)
  document.removeEventListener('homepage-intro-hold', onIntroHold)

  const intro = useHomepageIntro()
  const phase = intro.phase.value
  const alreadyDone = phase === 'done' || phase === 'skipped'
  // Chrome is the handoff: HomepageIntro fades its veil, then marks done.
  if (fromFail || (!alreadyDone && phase !== 'chrome')) intro.phase.value = 'done'
  if (fromFail) clearHomepageIntroLock()

  markHomepagePreloaderDone()
  releaseScroll()
  document.body.classList.add('preloader-complete')
  emit('preloader-complete')
  document.dispatchEvent(new CustomEvent('preloader-complete'))
}

const onIntroComplete = () => settle(false)

const onIntroHold = () => {
  window.clearTimeout(failTimer)
}

const skip = () => {
  if (started) return
  started = true
  clearHomepageIntroLock()
  useHomepageIntro().phase.value = 'skipped'
  document.body.classList.add('preloader-ready')
  document.body.classList.add('preloader-complete')
  emit('preloader-ready')
  emit('preloader-complete')
  document.dispatchEvent(new CustomEvent('preloader-complete'))
}

const begin = () => {
  if (started) return
  started = true
  useHomepageIntro().phase.value = 'cover'
  document.documentElement.classList.add('homepage-intro')
  document.body.classList.add('homepage-intro-pending')
  lockPageScroll()
  heldScroll = true
  document.body.classList.add('preloader-ready')
  emit('preloader-ready')
  document.addEventListener('homepage-intro-complete', onIntroComplete, { once: true })
  document.addEventListener('homepage-intro-hold', onIntroHold)
  failTimer = window.setTimeout(() => settle(true), 20000)
}

onMounted(() => {
  if (!shouldShowHomepagePreloader()) skip()
  else begin()
})

onUnmounted(() => {
  window.clearTimeout(failTimer)
  document.removeEventListener('homepage-intro-complete', onIntroComplete)
  document.removeEventListener('homepage-intro-hold', onIntroHold)
  releaseScroll()
})
</script>
