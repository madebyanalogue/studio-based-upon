<template>
  <div
    ref="rootEl"
    class="image-intro"
    role="dialog"
    aria-label="Introduction"
  >
    <p ref="firstEl" class="image-intro__statement">
      <span>Two decades of making</span>
      <span>for extraordinary spaces</span>
      <span>around the world.</span>
    </p>
    <p ref="secondEl" class="image-intro__statement">
      <span>Everything starts from somewhere.</span>
      <span>Lets explore what it can become.</span>
    </p>
    <div ref="logoEl" class="image-intro__logo">
      <BasedUponLogoSansSerif />
    </div>
  </div>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import { useHomepageIntro } from '~/composables/useHomepagePreloader'

const GROUND =
  'https://cdn.sanity.io/images/k8gpyc57/production/1e9cc54fa247edcffae1d0808da32d7429c30d14-3000x2055.jpg?auto=format&q=80&w=2400'

const rootEl = ref<HTMLElement | null>(null)
const firstEl = ref<HTMLElement | null>(null)
const secondEl = ref<HTMLElement | null>(null)
const logoEl = ref<HTMLElement | null>(null)
const { phase, ground } = useHomepageIntro()

let finished = false
let timeline: gsap.core.Timeline | null = null

const preload = (url: string) =>
  new Promise<void>((resolve) => {
    const img = new Image()
    const done = () => resolve()
    img.onload = () => {
      if (typeof img.decode === 'function') img.decode().then(done).catch(done)
      else done()
    }
    img.onerror = done
    img.src = url
  })

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const releaseSite = () => {
  document.documentElement.classList.add('homepage-intro-type')
  if (phase.value !== 'done' && phase.value !== 'skipped') phase.value = 'done'
  document.dispatchEvent(new CustomEvent('homepage-intro-complete'))
}

/** Texts leave. The ground stays under the slider. */
const handoff = () => {
  if (finished) return
  finished = true
  timeline?.kill()
  timeline = null

  for (const el of [logoEl.value, firstEl.value, secondEl.value]) {
    if (!el) continue
    gsap.to(el, { opacity: 0, duration: 0.45, ease: 'power2.inOut', overwrite: 'auto' })
  }

  const root = rootEl.value
  if (!root || reducedMotion()) {
    releaseSite()
    return
  }
  root.style.pointerEvents = 'none'
  gsap.to(root, {
    opacity: 0,
    duration: 0.7,
    ease: 'power2.inOut',
    onComplete: releaseSite,
  })
}

const beat = (target: gsap.TweenTarget, hold: number) => {
  const line = gsap.timeline()
  line.to(target, { opacity: 1, duration: 0.9, ease: 'power2.out' })
  line.to(target, { opacity: 0, duration: 0.8, ease: 'power2.inOut' }, `+=${hold}`)
  return line
}

const run = (build: (line: gsap.core.Timeline) => void) =>
  new Promise<void>((resolve) => {
    const line = gsap.timeline({
      onComplete: resolve,
      onInterrupt: resolve,
    })
    timeline = line
    build(line)
  })

const play = async () => {
  const logo = logoEl.value
  const first = firstEl.value
  const second = secondEl.value
  if (!logo || !first || !second || finished) return

  // Mount the reveal during the logo so the image is warm when we go live.
  ground.value = { active: true, live: false }
  const imageReady = preload(GROUND)
  if (reducedMotion()) {
    gsap.set([logo, first, second], { opacity: 0 })
    await imageReady
    ground.value = { active: true, live: true }
    handoff()
    return
  }

  gsap.set([logo, first, second], { opacity: 0 })
  await run((line) => {
    line.add(beat(logo, 0.95))
  })
  if (finished) return

  // Reveal streaks come in the moment the logo is gone.
  void imageReady
  ground.value = { active: true, live: true }

  await run((line) => {
    // Brief beat after the logo, then “Two decades” comes in.
    line.to({}, { duration: 0.55 })
    line.add(beat(first, 1.55))
    line.add(beat(second, 1.7), '+=0.2')
  })
  if (!finished) handoff()
}

const onKey = (event: KeyboardEvent) => {
  if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return
  if (event.key !== 'Escape' && event.key !== 'Enter') return
  event.preventDefault()
  if (!ground.value.active) ground.value = { active: true, live: true }
  handoff()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  document.dispatchEvent(new CustomEvent('homepage-intro-hold'))
  void play()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  timeline?.kill()
  if (rootEl.value) gsap.killTweensOf(rootEl.value)
  if (!finished) {
    finished = true
    releaseSite()
  }
})
</script>

<style scoped>
.image-intro {
  position: fixed;
  inset: 0;
  z-index: 800;
  overflow: hidden;
  background: transparent;
  pointer-events: none;
}

.image-intro__statement {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2em;
  margin: 0;
  color: #f1ede4;
  font-family: var(--mono);
  font-size: clamp(1.48rem, 2.5vw, 1.6rem);
  font-weight: 400;
  line-height: 1.15;
  letter-spacing: -0.02em;
  text-align: center;
  opacity: 0;
  transform: translate(-50%, -50%);
  text-shadow: 0 1px 18px rgba(0, 0, 0, 0.45);
}

.image-intro__logo {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 3;
  width: min(220px, 40vw);
  color: var(--charcoal);
  opacity: 0;
  transform: translate(-50%, -50%);
}
</style>
