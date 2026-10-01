<template>
  <div
    ref="rootEl"
    class="homepage-intro"
    :class="{ 'is-clear': overlayClear }"
    aria-hidden="true"
  >
    <div
      v-for="tile in tiles"
      :key="tile.key"
      class="homepage-intro__tile"
      :data-key="tile.key"
    >
      <img :src="tile.src" alt="" draggable="false" />
      <span class="homepage-intro__shade" />
    </div>
  </div>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import {
  clearHomepageIntroLock,
  useHomepageIntro,
} from '~/composables/useHomepagePreloader'

const COUNT = 4
/** Fully cropped from the bottom edge, then opened upward. */
const CLIP_HIDDEN = 'inset(100% 0% 0% 0%)'
const CLIP_VISIBLE = 'inset(0% 0% 0% 0%)'

type Tile = {
  key: string
  index: number
  src: string
}

type Box = { left: number; top: number; width: number; height: number }

const { phase, slides } = useHomepageIntro()
const route = useRoute()

watch(
  () => route.path,
  (path) => {
    if (path !== '/' && path !== '/home') finishSite()
  },
)

const rootEl = ref<HTMLElement | null>(null)
const overlayClear = ref(false)

let started = false
let finished = false
let failTimer = 0

const collectNodes = () => {
  const root = rootEl.value
  if (!root) return []
  return tiles.value.flatMap((tile) => {
    const el = root.querySelector<HTMLElement>(`[data-key="${tile.key}"]`)
    return el ? [{ tile, el }] : []
  })
}

const tiles = computed<Tile[]>(() =>
  (slides.value || [])
    .map((slide) => slide.leftImage)
    .filter(Boolean)
    .slice(0, COUNT)
    .map((src, index) => ({
      key: String(index),
      index,
      src,
    })),
)

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

const finishSite = () => {
  if (finished) return
  finished = true
  window.clearTimeout(failTimer)
  clearHomepageIntroLock()
  if (phase.value !== 'done' && phase.value !== 'skipped') phase.value = 'done'
  document.dispatchEvent(new CustomEvent('homepage-intro-complete'))
}

const measure = () => {
  const rect = rootEl.value?.getBoundingClientRect()
  const W = rect?.width || window.innerWidth
  const H = rect?.height || window.innerHeight
  // Same crop as a half-screen carousel frame, sized to 15vw.
  const aspect = (W / 2) / H
  const width = W * 0.15
  const height = width / aspect
  const originX = (W - width * COUNT) / 2
  const top = (H - height) / 2
  return { width, height, originX, top }
}

const rowBox = (tile: Tile, m: ReturnType<typeof measure>): Box => ({
  width: m.width,
  height: m.height,
  left: m.originX + tile.index * m.width,
  top: m.top,
})

const start = async () => {
  if (started || !rootEl.value || tiles.value.length !== COUNT) return
  started = true
  window.clearTimeout(failTimer)

  const urls = [...new Set(tiles.value.map((tile) => tile.src))]
  await Promise.race([
    Promise.all(urls.map(preloadImage)),
    delay(4000),
  ])
  if (finished || !rootEl.value) return

  await nextTick()
  let nodes = collectNodes()
  for (let i = 0; i < 8 && nodes.length !== COUNT; i += 1) {
    await delay(32)
    nodes = collectNodes()
  }
  if (nodes.length !== COUNT || !rootEl.value) {
    finishSite()
    return
  }

  const m = measure()
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const els = nodes.map((node) => node.el)
  gsap.set(els, { opacity: 1, clipPath: reduced ? CLIP_VISIBLE : CLIP_HIDDEN })
  for (const node of nodes) {
    gsap.set(node.el, rowBox(node.tile, m))
  }
  if (reduced || finished) return

  await gsap.to(els, {
    clipPath: CLIP_VISIBLE,
    duration: 1.2,
    ease: 'power3.inOut',
    stagger: 0.12,
  })
}

onMounted(() => {
  failTimer = window.setTimeout(() => {
    if (!started) finishSite()
  }, 12000)

  watch(
    tiles,
    (list) => {
      if (list.length === COUNT) void start()
    },
    { immediate: true },
  )
})

onUnmounted(() => {
  window.clearTimeout(failTimer)
  if (!finished) finishSite()
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
  pointer-events: auto;
  transition: opacity 0.45s ease;
}

.homepage-intro.is-clear {
  opacity: 0;
  pointer-events: none;
}

.homepage-intro__tile {
  position: absolute;
  overflow: hidden;
  opacity: 0;
  z-index: 1;
}

.homepage-intro__tile img {
  position: absolute;
  left: 0;
  top: -6%;
  width: 100%;
  height: 112%;
  object-fit: cover;
  display: block;
  user-select: none;
  pointer-events: none;
}

.homepage-intro__shade {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.1);
  pointer-events: none;
}
</style>
