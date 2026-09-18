<template>
  <section
    v-if="slides.length"
    id="showcase"
    ref="rootEl"
    class="showcase-carousel"
    aria-roledescription="carousel"
    aria-label="Showcase"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
  >
    <svg
      class="showcase-carousel__filter"
      viewBox="0 0 0 0"
      aria-hidden="true"
    >
      <defs>
        <filter :id="blurFilterId">
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 255 -140"
          />
        </filter>
      </defs>
    </svg>

    <div ref="imagesEl" class="showcase-carousel__images" aria-hidden="true" />
    <div class="showcase-carousel__overlay" aria-hidden="true" />

    <div
      v-for="(slide, index) in slides"
      :key="slide.id"
      class="showcase-carousel__title-wrap"
      :data-slide-id="slide.id"
      :aria-hidden="index === activeIndex ? undefined : 'true'"
    >
      <h1
        class="showcase-carousel__title serif"
        :class="{ 'showcase-carousel__title--pending': !titlesReady }"
        :style="{ filter: titleFilter, WebkitFilter: titleFilter }"
      >
        {{ slide.title }}
      </h1>
    </div>

    <div class="showcase-carousel__controls">
      <button
        type="button"
        class="showcase-carousel__control"
        aria-label="Previous slide"
        @click="prev"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 -960 960 960"
          aria-hidden="true"
        >
          <path
            d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z"
          />
        </svg>
      </button>
      <button
        type="button"
        class="showcase-carousel__control"
        aria-label="Next slide"
        @click="next"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 -960 960 960"
          aria-hidden="true"
        >
          <path
            d="M647-440H160v-80h487L423-744l57-56 320 320-320 320-57-56 224-224Z"
          />
        </svg>
      </button>
    </div>

    <footer class="showcase-carousel__footer">
      <p v-if="activeLocation" class="showcase-carousel__location">
        <svg
          class="showcase-carousel__pin"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"
          />
        </svg>
        <span>{{ activeLocation }}</span>
      </p>
      <div v-else class="showcase-carousel__location" aria-hidden="true" />

      <div
        class="showcase-carousel__thumbs"
        role="tablist"
        aria-label="Showcase slides"
      >
        <button
          v-for="(slide, index) in slides"
          :key="`thumb-${slide.id}`"
          type="button"
          class="showcase-carousel__thumb"
          :class="{ 'showcase-carousel__thumb--active': index === activeIndex }"
          role="tab"
          :aria-selected="index === activeIndex"
          :aria-label="`Show ${slide.title}`"
          @click="goTo(index)"
        >
          <img :src="slide.image" alt="" draggable="false" />
        </button>
      </div>

      <NuxtLink
        v-if="activeProductHref"
        :to="activeProductHref"
        class="showcase-carousel__product"
      >
        <span>{{ activeProductTitle }}</span>
        <span class="showcase-carousel__product-plus" aria-hidden="true">+</span>
      </NuxtLink>
      <p
        v-else-if="activeProductTitle"
        class="showcase-carousel__product showcase-carousel__product--static"
      >
        <span>{{ activeProductTitle }}</span>
        <span class="showcase-carousel__product-plus" aria-hidden="true">+</span>
      </p>
      <div v-else class="showcase-carousel__product" aria-hidden="true" />
    </footer>
  </section>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { SplitText } from 'gsap/SplitText'
import type { ShowcaseSlide } from '~/composables/useShowcaseCatalog'

const HOP =
  'M0,0 C0.071,0.505 0.192,0.726 0.318,0.852 0.45,0.984 0.504,1 1,1'

const props = withDefaults(
  defineProps<{
    slides?: ShowcaseSlide[]
    intervalMs?: number
  }>(),
  {
    intervalMs: 5600,
  },
)

/** Stable id so the SVG matrix filter always resolves. */
const blurFilterId = 'showcase-blur-matrix'
const titleFilter = `url(#${blurFilterId}) blur(0.25px)`

const ensurePlugins = () => {
  if (!import.meta.client) return
  gsap.registerPlugin(SplitText, CustomEase)
  if (!CustomEase.get('hop')) {
    CustomEase.create('hop', HOP)
  }
}

const rootEl = ref<HTMLElement | null>(null)
const imagesEl = ref<HTMLElement | null>(null)

const activeIndex = ref(0)
const paused = ref(false)
const animating = ref(false)
const titlesReady = ref(false)
let slideOffset = 500
let timer: number | null = null
let splitInstances: InstanceType<typeof SplitText>[] = []
let loadGen = 0
let didClientShuffle = false

const shuffleSlides = (items: ShowcaseSlide[]) => {
  const next = items.slice()
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const a = next[i]!
    next[i] = next[j]!
    next[j] = a
  }
  return next
}

const slideSignature = (list: ShowcaseSlide[] = []) =>
  list.map((slide) => `${slide.id}:${slide.image}:${slide.title}`).join('|')

/** CMS order on SSR; reshuffled once per visit on the client. */
const slides = ref<ShowcaseSlide[]>([...(props.slides || [])])

const activeSlide = computed(
  () => slides.value[activeIndex.value] ?? slides.value[0] ?? null,
)

const activeLocation = computed(
  () => activeSlide.value?.location?.trim() || '',
)

const activeProductTitle = computed(
  () => activeSlide.value?.productTitle?.trim() || '',
)

const activeProductHref = computed(() => {
  const slug = activeSlide.value?.slug?.trim()
  return slug ? `/materials-and-forms/${slug}` : ''
})

const setSlideOffset = () => {
  slideOffset = window.innerWidth < 1000 ? 100 : 500
}

const scopeAttr = () => {
  const root = rootEl.value
  if (!root) return null
  return root.getAttributeNames().find((name) => name.startsWith('data-v-')) || null
}

const imageCache = new Map<string, HTMLImageElement>()

const preloadImage = (src: string) => {
  if (!import.meta.client || !src) return null
  const existing = imageCache.get(src)
  if (existing) return existing
  const img = new Image()
  img.decoding = 'async'
  img.src = src
  imageCache.set(src, img)
  return img
}

const preloadAllSlides = () => {
  slides.value.forEach((slide) => preloadImage(slide.image))
}

const waitForImage = async (src: string) => {
  const cached = preloadImage(src)
  if (!cached) return
  if (cached.complete && cached.naturalWidth > 0) return
  try {
    await cached.decode()
  } catch {
    await new Promise<void>((resolve) => {
      cached.addEventListener('load', () => resolve(), { once: true })
      cached.addEventListener('error', () => resolve(), { once: true })
    })
  }
}

const createImageLayer = (slide: ShowcaseSlide, opts?: { fetchPriority?: boolean }) => {
  const layer = document.createElement('div')
  layer.className = 'showcase-carousel__img'
  layer.dataset.slideId = slide.id
  const scope = scopeAttr()
  if (scope) layer.setAttribute(scope, '')

  const img = document.createElement('img')
  img.src = slide.image
  img.alt = slide.title
  img.decoding = 'sync'
  img.draggable = false
  if (opts?.fetchPriority) img.fetchPriority = 'high'
  if (scope) img.setAttribute(scope, '')

  layer.appendChild(img)
  return { layer, img }
}

const cleanupLayers = () => {
  const host = imagesEl.value
  if (!host) return
  const layers = host.querySelectorAll('.showcase-carousel__img')
  if (layers.length <= 1) return
  for (let i = 0; i < layers.length - 1; i += 1) {
    layers[i]?.remove()
  }
}

const resetImageStack = () => {
  const host = imagesEl.value
  const first = slides.value[0]
  if (!host || !first) return
  host.innerHTML = ''
  const { layer } = createImageLayer(first, { fetchPriority: true })
  host.appendChild(layer)
  animating.value = false
}

const titleWrapFor = (slideId: string) =>
  rootEl.value?.querySelector(
    `.showcase-carousel__title-wrap[data-slide-id="${CSS.escape(slideId)}"]`,
  ) as HTMLElement | null

const wordsForSlide = (slideId: string) => {
  const wrap = titleWrapFor(slideId)
  if (!wrap) return [] as NodeListOf<Element> | never[]
  return wrap.querySelectorAll('.showcase-carousel__word')
}

const revertSplits = () => {
  splitInstances.forEach((instance) => {
    try {
      instance.revert()
    } catch {
      /* ignore */
    }
  })
  splitInstances = []
  titlesReady.value = false
}

const splitTitles = () => {
  revertSplits()
  slides.value.forEach((slide) => {
    const wrap = titleWrapFor(slide.id)
    const title = wrap?.querySelector('.showcase-carousel__title')
    if (!title) return
    const split = new SplitText(title, {
      type: 'words',
      wordsClass: 'showcase-carousel__word',
    })
    splitInstances.push(split)
  })
  titlesReady.value = true
}

const initFirstTitle = () => {
  const first = slides.value[0]
  if (!first) return
  const words = wordsForSlide(first.id)
  if (!words.length) return
  gsap.to(words, {
    filter: 'blur(0px)',
    opacity: 1,
    duration: 2,
    ease: 'power3.out',
  })
}

const updateActiveTitle = (targetId: string) => {
  if (!titlesReady.value) return
  gsap.killTweensOf('.showcase-carousel__word')

  slides.value.forEach((slide) => {
    const words = wordsForSlide(slide.id)
    if (!words.length) return
    if (slide.id === targetId) return
    gsap.to(words, {
      filter: 'blur(75px)',
      opacity: 0,
      duration: 2.5,
      ease: 'power1.out',
      overwrite: true,
    })
  })

  const currentWords = wordsForSlide(targetId)
  if (!currentWords.length) return
  gsap.to(currentWords, {
    filter: 'blur(0px)',
    opacity: 1,
    duration: 2,
    ease: 'power3.out',
    overwrite: true,
    onComplete: () => {
      gsap.set(currentWords, {
        filter: 'blur(0px)',
        opacity: 1,
      })
    },
  })
}

const animateSlide = async (direction: 'left' | 'right', slide: ShowcaseSlide) => {
  ensurePlugins()
  const host = imagesEl.value
  if (!host || animating.value) return

  animating.value = true
  setSlideOffset()
  updateActiveTitle(slide.id)

  await waitForImage(slide.image)
  if (!imagesEl.value) {
    animating.value = false
    return
  }

  const layers = host.querySelectorAll('.showcase-carousel__img')
  const current = layers[layers.length - 1] as HTMLElement | undefined
  // Already showing this slide (e.g. after a cancelled jump) — skip wipe.
  if (current?.dataset.slideId === slide.id) {
    animating.value = false
    return
  }

  const currentImg = current?.querySelector('img')
  const { layer, img } = createImageLayer(slide)
  gsap.set(layer, {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  })
  gsap.set(img, {
    x: direction === 'left' ? -slideOffset : slideOffset,
  })
  host.appendChild(layer)

  if (currentImg) {
    gsap.to(currentImg, {
      x: direction === 'left' ? slideOffset : -slideOffset,
      duration: 1.5,
      ease: 'hop',
    })
  }

  gsap.fromTo(
    layer,
    {
      clipPath:
        direction === 'left'
          ? 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)'
          : 'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)',
    },
    {
      clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
      duration: 1.5,
      ease: 'hop',
      onComplete: () => {
        cleanupLayers()
        animating.value = false
      },
    },
  )

  gsap.to(img, {
    x: 0,
    duration: 1.5,
    ease: 'hop',
  })
}

/** Jump straight to an index — one wipe, direction from thumbnail position. */
const goTo = (index: number) => {
  if (!slides.value.length || animating.value) return
  const len = slides.value.length
  const nextIndex = ((index % len) + len) % len
  if (nextIndex === activeIndex.value) return

  const slide = slides.value[nextIndex]
  if (!slide) return

  const direction: 'left' | 'right' =
    nextIndex > activeIndex.value ? 'right' : 'left'

  activeIndex.value = nextIndex
  void animateSlide(direction, slide)
}

const next = () => {
  if (!slides.value.length || animating.value) return
  const nextIndex = (activeIndex.value + 1) % slides.value.length
  const slide = slides.value[nextIndex]
  if (!slide) return
  activeIndex.value = nextIndex
  void animateSlide('right', slide)
}

const prev = () => {
  if (!slides.value.length || animating.value) return
  const len = slides.value.length
  const nextIndex = (activeIndex.value - 1 + len) % len
  const slide = slides.value[nextIndex]
  if (!slide) return
  activeIndex.value = nextIndex
  void animateSlide('left', slide)
}

const clearTimer = () => {
  if (timer != null) {
    window.clearInterval(timer)
    timer = null
  }
}

const startTimer = () => {
  clearTimer()
  if (!import.meta.client || slides.value.length < 2) return
  timer = window.setInterval(() => {
    if (!paused.value && !animating.value) next()
  }, props.intervalMs)
}

const prepareTitles = async () => {
  if (!import.meta.client) return
  await document.fonts.ready.catch(() => undefined)
  await nextTick()
  splitTitles()
  await nextTick()
  initFirstTitle()
}

const reloadSlides = async (source: ShowcaseSlide[], opts?: { shuffle?: boolean }) => {
  const gen = ++loadGen
  const shouldShuffle = Boolean(opts?.shuffle && import.meta.client)
  slides.value = shouldShuffle ? shuffleSlides(source) : source.slice()
  activeIndex.value = 0
  await nextTick()
  if (gen !== loadGen) return

  resetImageStack()
  preloadAllSlides()
  if (slides.value[0]?.image) await waitForImage(slides.value[0].image)
  if (gen !== loadGen) return

  await prepareTitles()
  if (gen !== loadGen) return
  startTimer()
}

watch(
  () => slideSignature(props.slides || []),
  async (nextSig, prevSig) => {
    if (nextSig === prevSig) return
    const source = props.slides || []
    // First client hydration: shuffle once. Later CMS updates keep order stable.
    if (import.meta.client && !didClientShuffle) {
      didClientShuffle = true
      await reloadSlides(source, { shuffle: true })
      return
    }
    await reloadSlides(source, { shuffle: false })
  },
)

watch(
  () => [props.intervalMs, slides.value.length] as const,
  () => startTimer(),
)

onMounted(() => {
  ensurePlugins()
  setSlideOffset()
  window.addEventListener('resize', setSlideOffset)

  if (!didClientShuffle) {
    didClientShuffle = true
    void reloadSlides(props.slides || [], { shuffle: true })
  }

  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight') next()
    if (event.key === 'ArrowLeft') prev()
  }
  window.addEventListener('keydown', onKey)
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('resize', setSlideOffset)
  })
})

onBeforeUnmount(() => {
  clearTimer()
  revertSplits()
  gsap.killTweensOf('.showcase-carousel__word')
})
</script>

<style scoped>
.showcase-carousel {
  --showcase-ink: #1a1a1a;
  --showcase-paper: #f1ede4;
  --preview-h: 48px;
  --chrome-bottom: 2rem;
  position: relative;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  background: var(--showcase-ink);
  color: var(--showcase-paper);
  isolation: isolate;
  user-select: none;
  --text-sm:13px;
}

.showcase-carousel__filter {
  position: absolute;
  z-index: -1;
  opacity: 0;
  pointer-events: none;
}

.showcase-carousel__images {
  position: absolute;
  inset: 0;
}

.showcase-carousel__images :deep(.showcase-carousel__img) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  will-change: clip-path, transform;
}

.showcase-carousel__images :deep(.showcase-carousel__img img) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  will-change: transform;
}

.showcase-carousel__overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.28) 0%,
      rgba(0, 0, 0, 0.18) 42%,
      rgba(0, 0, 0, 0.42) 100%
    );
}

.showcase-carousel__title-wrap {
  position: absolute;
  top: 0;
  left: 50%;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40%;
  height: 100%;
  transform: translateX(-50%);
  pointer-events: none;
}

.showcase-carousel__title {
  margin: 0;
  font-size: clamp(2.4rem, 6vw, 5rem);
  font-weight: 500;
  line-height: 0.9;
  letter-spacing: -0.02em;
  text-align: center;
  text-transform: uppercase;
  color: var(--showcase-paper);
  /* SVG feColorMatrix + tiny blur = sharp warp (not soft fog) */
  filter: url(#showcase-blur-matrix) blur(0.25px);
  -webkit-filter: url(#showcase-blur-matrix) blur(0.25px);
}

.showcase-carousel__title--pending {
  visibility: hidden;
}

.showcase-carousel__title :deep(.showcase-carousel__word) {
  display: inline-block;
  filter: blur(75px);
  opacity: 0;
  will-change: filter, opacity;
}

.showcase-carousel__controls {
  position: absolute;
  top: 50%;
  left: 0;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 0 var(--gutter);
  transform: translateY(-50%);
}

.showcase-carousel__control {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  border: 0.075rem dashed color-mix(in srgb, var(--showcase-paper) 75%, transparent);
  border-radius: 0.25rem;
  background: transparent;
  color: var(--showcase-paper);
  cursor: pointer;
  transition:
    background 200ms ease,
    color 200ms ease,
    border-color 200ms ease;
}

.showcase-carousel__control svg {
  width: 1.5rem;
  height: 1.5rem;
  fill: currentColor;
  transition: fill 200ms ease;
}

.showcase-carousel__control:hover,
.showcase-carousel__control:focus-visible {
  background: var(--showcase-paper);
  color: var(--showcase-ink);
  border-color: var(--showcase-paper);
  outline: none;
}

.showcase-carousel__footer {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 3;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: end;
  gap: 1rem;
  padding: var(--chrome-bottom) var(--gutter);
  pointer-events: none;
}

.showcase-carousel__location,
.showcase-carousel__product {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 550;
  line-height: 1;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--showcase-paper);
}

.showcase-carousel__location {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  max-width: 18rem;
  justify-self: start;
}

.showcase-carousel__pin {
  flex-shrink: 0;
  width: 1.05em;
  height: 1.05em;
  display: block;
}

.showcase-carousel__thumbs {
  display: flex;
  gap: 0.55rem;
  width: min(36rem, 52vw);
  height: var(--preview-h);
  justify-self: center;
  pointer-events: auto;
}

.showcase-carousel__product {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.4rem;
  max-width: 18rem;
  justify-self: end;
  text-align: right;
  text-decoration: none;
  pointer-events: auto;
  transition: opacity 0.2s ease;
}

.showcase-carousel__product-plus {
  flex-shrink: 0;
  font-size: 1.15em;
  font-weight: 400;
  line-height: 1;
}

.showcase-carousel__product:hover,
.showcase-carousel__product:focus-visible {
  opacity: 0.7;
  outline: none;
}

.showcase-carousel__product--static {
  pointer-events: none;
}

.showcase-carousel__thumb {
  position: relative;
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  overflow: hidden;
}

.showcase-carousel__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.showcase-carousel__thumb::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  transition: background 0.25s ease;
}

.showcase-carousel__thumb--active::after,
.showcase-carousel__thumb:hover::after,
.showcase-carousel__thumb:focus-visible::after {
  background: rgba(0, 0, 0, 0);
}

.showcase-carousel__thumb:focus-visible {
  outline: 1px solid var(--showcase-paper);
  outline-offset: 2px;
}

@media (max-width: 900px) {
  .showcase-carousel {
    --preview-h: 40px;
    --chrome-bottom: 1.35rem;
  }

  .showcase-carousel__title-wrap {
    width: 100%;
    padding: 0 var(--gutter);
  }

  .showcase-carousel__title {
    font-size: clamp(1.8rem, 9vw, 3rem);
  }

  .showcase-carousel__controls {
    top: 62%;
    left: 50%;
    width: auto;
    justify-content: center;
    gap: 1rem;
    padding: 0;
    transform: translate(-50%, -50%);
  }

  .showcase-carousel__control {
    padding: 1rem;
  }

  .showcase-carousel__control svg {
    width: 1rem;
    height: 1rem;
  }

  .showcase-carousel__footer {
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      'thumbs thumbs'
      'loc product';
    align-items: center;
  }

  .showcase-carousel__thumbs {
    grid-area: thumbs;
    width: 100%;
    justify-self: stretch;
  }

  .showcase-carousel__location {
    grid-area: loc;
    max-width: none;
  }

  .showcase-carousel__product {
    grid-area: product;
    max-width: none;
  }
}
</style>
