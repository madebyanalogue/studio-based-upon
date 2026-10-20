<template>
  <div
    ref="rootEl"
    class="image-intro"
    role="dialog"
    aria-label="Introduction"
  >
    <div ref="firstEl" class="image-intro__statement">
      <DissolveText
        class="image-intro__dissolve"
        :interactive="live === 'first'"
        fit="lines"
        :lines="FIRST_LINES"
      />
    </div>
    <div ref="secondEl" class="image-intro__statement">
      <DissolveText
        class="image-intro__dissolve"
        :interactive="live === 'second'"
        fit="lines"
        :lines="SECOND_LINES"
      />
    </div>
    <div ref="logoEl" class="image-intro__logo">
      <DissolveText
        class="image-intro__dissolve image-intro__dissolve--logo"
        :interactive="live === 'logo'"
        fit="fill"
        graphic
      >
        <BasedUponLogoSansSerif />
      </DissolveText>
    </div>
  </div>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import { useHomepageIntro } from '~/composables/useHomepagePreloader'

const GROUND =
  'https://cdn.sanity.io/images/k8gpyc57/production/1e9cc54fa247edcffae1d0808da32d7429c30d14-3000x2055.jpg?auto=format&q=80&w=2400'

const FIRST_LINES = [
  'Two decades of making',
  'for extraordinary spaces',
  'around the world.',
]

const SECOND_LINES = [
  'Everything starts from somewhere.',
  'Explore what it can become.',
]

const rootEl = ref<HTMLElement | null>(null)
const firstEl = ref<HTMLElement | null>(null)
const secondEl = ref<HTMLElement | null>(null)
const logoEl = ref<HTMLElement | null>(null)
const live = ref<'logo' | 'first' | 'second' | null>(null)
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
  live.value = null

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

const beat = (
  target: gsap.TweenTarget,
  hold: number,
  key: 'logo' | 'first' | 'second',
) => {
  const line = gsap.timeline()
  line.call(() => {
    live.value = key
  })
  line.to(target, { opacity: 1, duration: 0.9, ease: 'power2.out' })
  line.to(target, { opacity: 0, duration: 0.8, ease: 'power2.inOut' }, `+=${hold}`)
  line.call(() => {
    if (live.value === key) live.value = null
  })
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

  // Mount the field stage during the logo; go live 0.5s into the intro.
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
  gsap.delayedCall(0.5, () => {
    if (!finished) ground.value = { active: true, live: true }
  })
  await run((line) => {
    line.add(beat(logo, 0.95, 'logo'))
  })
  if (finished) return

  void imageReady
  if (!ground.value.live) ground.value = { active: true, live: true }

  await run((line) => {
    // Brief beat after the logo, then “Two decades” comes in.
    line.to({}, { duration: 0.55 })
    line.add(beat(first, 1.55, 'first'))
    line.add(beat(second, 1.7, 'second'), '+=0.2')
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
  margin: 0;
  color: #f1ede4;
  opacity: 0;
  transform: translate(-50%, -50%);
}

.image-intro__dissolve {
  font-family: var(--mono);
  font-size: clamp(1.48rem, 2.5vw, 1.6rem);
  font-weight: 400;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: #f1ede4;
  text-align: center;
  filter: drop-shadow(0 1px 18px rgba(0, 0, 0, 0.45));
}

.image-intro__dissolve :deep(.dissolve-text__measure) {
  font-family: var(--mono);
  font-size: clamp(1.48rem, 2.5vw, 1.6rem);
  font-weight: 400;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: #f1ede4;
}

.image-intro__logo {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 3;
  width: min(220px, 40vw);
  aspect-ratio: 2972.52 / 1142;
  color: #f1ede4;
  opacity: 0;
  transform: translate(-50%, -50%);
}

.image-intro__dissolve--logo {
  width: 100%;
  height: 100%;
  color: #f1ede4;
  filter: drop-shadow(0 1px 18px rgba(0, 0, 0, 0.45));
}

.image-intro__dissolve--logo :deep(.dissolve-text__measure) {
  color: #f1ede4;
}
</style>
