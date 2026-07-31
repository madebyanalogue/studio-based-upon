<template>
  <article class="precrafted">
    <!-- Desktop: pinned horizontal scroll -->
    <section
      ref="sectionRef"
      class="precrafted-h"
      :class="{ 'precrafted-h--single': !scrollEnabled }"
    >
      <div ref="pinRef" class="precrafted-h__pin">
        <div
          ref="titleRef"
          class="precrafted-h__title-panel"
        >
          <div class="precrafted-h__title-inner">
            <h1 class="page-title">{{ page?.heroTitle || '(Pre)Crafted' }}</h1>
            <p class="precrafted-h__lede">
              (Pre)Crafted transforms architectural spaces at scale, creating one flowing
              installation every time. Vast proportions and unique, unrepeated panels enable
              entire spaces to be crafted with bespoke architectural purity.
            </p>
          </div>
        </div>

        <div ref="trackRef" class="precrafted-h__track">
          <div class="precrafted-h__spacer" aria-hidden="true" />

          <div ref="itemsRef" class="precrafted-h__items">
            <figure
              v-if="galleryEntries.length"
              class="precrafted-h__item precrafted-h__item--gallery"
            >
              <PrecraftedScrubGallery
                :entries="galleryEntries"
                :progress="scrubProgress"
              />
            </figure>

            <section class="precrafted-h__item precrafted-h__item--text">
              <p class="precrafted__eyebrow interface">Origin</p>
              <h2 class="precrafted__heading">Story. Origin. Meaning.</h2>
              <div class="prose">
                <p>
                  Over two decades, Based Upon has combined material experimentation with an
                  archive of textures, patterns and details gathered on journeys in landscape.
                </p>
                <p>
                  Now, this material alchemy is available through Studio Based Upon in
                  (Pre)Crafted form.
                </p>
              </div>
            </section>

            <section class="precrafted-h__item precrafted-h__item--text">
              <h2 class="precrafted__heading">Materiality in dialogue with light</h2>
              <div class="prose">
                <p>
                  Tones, depths and textures subtly transform as light engages with the surface.
                  From the natural transitions of daylight to the precision of artificial
                  illumination, each (Pre)Crafted panel holds not one expression, but many.
                </p>
              </div>
            </section>

            <section class="precrafted-h__item precrafted-h__item--text">
              <p class="precrafted__eyebrow interface">Panel+</p>
              <h2 class="precrafted__heading">Beyond the edge of a panel</h2>
              <div class="prose">
                <p>
                  Panel+ reflects our commitment beyond the edge of a panel. With Panel+, Studio
                  Based Upon offers a design and fabrication solution, creating additional
                  bespoke elements to resolve the unique challenges of each space.
                </p>
                <p class="precrafted__tagline interface">
                  The meeting of efficiency and artistry.
                </p>
              </div>
            </section>

            <section class="precrafted-h__item precrafted-h__item--text">
              <h2 class="precrafted__heading">Finishes</h2>
              <ul class="precrafted__finishes">
                <li v-for="finish in finishes" :key="finish">{{ finish }}</li>
              </ul>
            </section>

            <section class="precrafted-h__item precrafted-h__item--info">
              <h2 class="precrafted__heading">Info</h2>

              <div class="precrafted__info-block">
                <h3 class="precrafted__subheading interface">
                  Panel Sizes &amp; Trade Launch Pricing
                </h3>
                <p>
                  (Pre)Crafted panels are finished on the front face only and are available in
                  the following dimensions:
                </p>
                <ul class="precrafted__pricing">
                  <li v-for="(panel, i) in panelSizes" :key="i">
                    <span class="precrafted__dimensions">{{ panel.dimensions }}</span>
                    <span class="precrafted__price">{{ panel.price }}</span>
                  </li>
                </ul>
                <p class="precrafted__note">
                  All prices are exc. VAT, delivery &amp; installation.
                </p>
                <p class="precrafted__note">
                  Prices stated are for approx. 30no panel orders. We will honour this volume
                  pricing of £995m² for any volume ordered during our trade launch. Pricing valid
                  until May 2026.
                </p>
              </div>

              <div class="precrafted__info-block">
                <h3 class="precrafted__subheading interface">Lead Times</h3>
                <p>
                  Typical lead times are approx. 6–8 weeks (subject to production schedule at the
                  time) with larger orders requiring longer to prepare. Please contact us about
                  your project for more specific timings.
                </p>
              </div>

              <div class="precrafted__info-block">
                <h3 class="precrafted__subheading interface">Install</h3>
                <p>
                  The edges are black to create a shadow gap detail between panels. We recommend
                  a mechanical fixing system such as split battens to allow for adjustment during
                  fitting.
                </p>
                <p>
                  Speak to your appointed contractor to check specific requirements for your
                  project or please
                  <NuxtLink to="/enquire" class="precrafted__link">contact us</NuxtLink>
                  for further advice.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>

    <!-- Mobile: vertical stack -->
    <div class="precrafted-m">
      <header class="precrafted-m__hero">
        <h1 class="page-title">{{ page?.heroTitle || '(Pre)Crafted' }}</h1>
        <p class="precrafted-h__lede">
          (Pre)Crafted transforms architectural spaces at scale, creating one flowing
          installation every time. Vast proportions and unique, unrepeated panels enable entire
          spaces to be crafted with bespoke architectural purity.
        </p>
      </header>

      <div v-if="galleryEntries.length" class="precrafted-m__gallery">
        <PrecraftedScrubGallery
          :entries="galleryEntries"
          :progress="mobileScrubProgress"
        />
      </div>

      <section class="precrafted__block">
        <p class="precrafted__eyebrow interface">Origin</p>
        <h2 class="precrafted__heading">Story. Origin. Meaning.</h2>
        <div class="prose">
          <p>
            Over two decades, Based Upon has combined material experimentation with an archive of
            textures, patterns and details gathered on journeys in landscape.
          </p>
          <p>
            Now, this material alchemy is available through Studio Based Upon in (Pre)Crafted
            form.
          </p>
        </div>
      </section>

      <section class="precrafted__block">
        <h2 class="precrafted__heading">Materiality in dialogue with light</h2>
        <div class="prose">
          <p>
            Tones, depths and textures subtly transform as light engages with the surface. From
            the natural transitions of daylight to the precision of artificial illumination, each
            (Pre)Crafted panel holds not one expression, but many.
          </p>
        </div>
      </section>

      <section class="precrafted__block">
        <p class="precrafted__eyebrow interface">Panel+</p>
        <h2 class="precrafted__heading">Beyond the edge of a panel</h2>
        <div class="prose">
          <p>
            Panel+ reflects our commitment beyond the edge of a panel. With Panel+, Studio Based
            Upon offers a design and fabrication solution, creating additional bespoke elements
            to resolve the unique challenges of each space.
          </p>
          <p class="precrafted__tagline interface">The meeting of efficiency and artistry.</p>
        </div>
      </section>

      <section class="precrafted__block">
        <h2 class="precrafted__heading">Finishes</h2>
        <ul class="precrafted__finishes">
          <li v-for="finish in finishes" :key="finish">{{ finish }}</li>
        </ul>
      </section>

      <section class="precrafted__info">
        <h2 class="precrafted__heading">Info</h2>

        <div class="precrafted__info-block">
          <h3 class="precrafted__subheading interface">Panel Sizes &amp; Trade Launch Pricing</h3>
          <p>
            (Pre)Crafted panels are finished on the front face only and are available in the
            following dimensions:
          </p>
          <ul class="precrafted__pricing">
            <li v-for="(panel, i) in panelSizes" :key="i">
              <span class="precrafted__dimensions">{{ panel.dimensions }}</span>
              <span class="precrafted__price">{{ panel.price }}</span>
            </li>
          </ul>
          <p class="precrafted__note">All prices are exc. VAT, delivery &amp; installation.</p>
          <p class="precrafted__note">
            Prices stated are for approx. 30no panel orders. We will honour this volume pricing of
            £995m² for any volume ordered during our trade launch. Pricing valid until May 2026.
          </p>
        </div>

        <div class="precrafted__info-block">
          <h3 class="precrafted__subheading interface">Lead Times</h3>
          <p>
            Typical lead times are approx. 6–8 weeks (subject to production schedule at the time)
            with larger orders requiring longer to prepare. Please contact us about your project
            for more specific timings.
          </p>
        </div>

        <div class="precrafted__info-block">
          <h3 class="precrafted__subheading interface">Install</h3>
          <p>
            The edges are black to create a shadow gap detail between panels. We recommend a
            mechanical fixing system such as split battens to allow for adjustment during fitting.
          </p>
          <p>
            Speak to your appointed contractor to check specific requirements for your project or
            please
            <NuxtLink to="/enquire" class="precrafted__link">contact us</NuxtLink>
            for further advice.
          </p>
        </div>
      </section>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ScrubGalleryEntry } from '~/components/PrecraftedScrubGallery.vue'

type GalleryItem = {
  title?: string
  poster?: { asset?: { url?: string; _ref?: string; _id?: string } }
  frames?: Array<{ asset?: { url?: string; _ref?: string; _id?: string } }>
}

const LOCAL_MODEL_01: ScrubGalleryEntry = {
  id: 'local-model-01',
  title: 'Model 01',
  poster: '/precrafted/model-01/frame-001.webp',
  frames: Array.from({ length: 145 }, (_, i) => {
    const n = String(i + 1).padStart(3, '0')
    return `/precrafted/model-01/frame-${n}.webp`
  }),
}

const query = `*[_type == "preCraftedPage"][0] {
  seoTitle,
  heroTitle,
  heroSubtitle,
  panelSizes[] { dimensions, price },
  gallery[] {
    title,
    poster { asset->{ url } },
    frames[] { asset->{ url } }
  }
}`

const { data: page } = await useAsyncData('preCraftedPage', () =>
  $fetch('/api/sanity/query', { method: 'POST', body: { query } })
    .then((r: { result?: unknown }) => r?.result ?? null)
    .catch(() => null),
)

const { imageUrl } = useSanityImage()

const DEFAULT_PANEL_SIZES = [
  { dimensions: '3200mm x 1200mm x 20mm', price: '£3,830/panel (approx. £995m²)' },
  { dimensions: '2400mm x 1200mm x 20mm', price: '£2,870/panel (approx. £995m²)' },
]

const panelSizes = computed(() =>
  page.value?.panelSizes?.length ? page.value.panelSizes : DEFAULT_PANEL_SIZES,
)

const finishes = ['Camona Gold', 'Camona Bronze', 'Camona Pink Nickel', 'Camona Silver']

const galleryEntries = computed((): ScrubGalleryEntry[] => {
  const items = (page.value?.gallery || []) as GalleryItem[]
  const fromSanity = items
    .map((item, i) => {
      const frames = (item.frames || [])
        .map((frame) => imageUrl(frame, 1200))
        .filter(Boolean)
      if (frames.length < 2) return null
      return {
        id: `precrafted-sequence-${i}`,
        frames,
        poster: imageUrl(item.poster, 400) || frames[0],
        title: item.title,
      }
    })
    .filter((entry): entry is ScrubGalleryEntry => Boolean(entry))

  return fromSanity.length ? fromSanity : [LOCAL_MODEL_01]
})

const sectionRef = ref<HTMLElement | null>(null)
const pinRef = ref<HTMLElement | null>(null)
const trackRef = ref<HTMLElement | null>(null)
const titleRef = ref<HTMLElement | null>(null)
const itemsRef = ref<HTMLElement | null>(null)

const scrubProgress = ref(0)
const mobileScrubProgress = ref<number | null>(null)

const isDesktop = ref(false)
let desktopMediaQuery: MediaQueryList | null = null
let mobileScrollTrigger: import('gsap/ScrollTrigger').ScrollTrigger | null = null

function syncDesktop() {
  isDesktop.value = desktopMediaQuery?.matches ?? false
}

const scrollEnabled = computed(() => isDesktop.value)

useHorizontalGalleryScroll({
  sectionRef,
  pinRef,
  trackRef,
  titleRef,
  itemsRef,
  hasTitle: computed(() => true),
  enabled: scrollEnabled,
  onProgress: (progress) => {
    scrubProgress.value = progress
  },
})

async function setupMobileScrub() {
  if (!import.meta.client || isDesktop.value) {
    mobileScrollTrigger?.kill()
    mobileScrollTrigger = null
    mobileScrubProgress.value = null
    return
  }

  const galleryEl = document.querySelector('.precrafted-m__gallery') as HTMLElement | null
  if (!galleryEl) {
    mobileScrubProgress.value = null
    return
  }

  const { default: gsap } = await import('gsap')
  const { ScrollTrigger } = await import('gsap/ScrollTrigger')
  gsap.registerPlugin(ScrollTrigger)

  mobileScrollTrigger?.kill()
  mobileScrollTrigger = ScrollTrigger.create({
    trigger: galleryEl,
    start: 'top 80%',
    end: 'bottom 20%',
    scrub: true,
    onUpdate: (self) => {
      mobileScrubProgress.value = self.progress
    },
  })
}

onMounted(() => {
  if (!import.meta.client) return

  desktopMediaQuery = window.matchMedia('(min-width: 1000px)')
  syncDesktop()
  desktopMediaQuery.addEventListener('change', syncDesktop)
  setupMobileScrub()
})

watch(isDesktop, () => {
  setupMobileScrub()
})

onUnmounted(() => {
  desktopMediaQuery?.removeEventListener('change', syncDesktop)
  mobileScrollTrigger?.kill()
  mobileScrollTrigger = null
})

useHead(() => ({
  title: page.value?.seoTitle || '(Pre)Crafted — Studio Based Upon',
}))
</script>

<style scoped>
.precrafted {
  --precrafted-gap: calc(var(--gutter) * 2.5);
  --precrafted-track-height: calc(100dvh - var(--header-height));
  --precrafted-intro-width: calc(42vw - var(--precrafted-gap));
}

/* —— Desktop horizontal —— */
.precrafted-h {
  overflow: visible;
}

.precrafted-h__pin {
  position: relative;
  overflow: hidden;
  height: var(--precrafted-track-height);
}

.precrafted-h__track {
  display: flex;
  align-items: stretch;
  gap: var(--precrafted-gap);
  width: max-content;
  height: 100%;
  box-sizing: border-box;
  will-change: transform;
}

.precrafted-h__title-panel {
  position: absolute;
  left: 0;
  bottom: 0;
  z-index: 0;
  width: 42vw;
  max-height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: var(--gutter);
  pointer-events: none;
}

.precrafted-h__title-inner {
  max-width: 28rem;
  width: 100%;
}

.precrafted-h__lede {
  margin: 0.75rem 0 0;
  font-size: var(--text-xl);
  line-height: 1.4;
}

.precrafted-h__spacer {
  flex: 0 0 var(--precrafted-intro-width);
  width: var(--precrafted-intro-width);
  height: 100%;
  pointer-events: none;
}

.precrafted-h__items {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: stretch;
  gap: var(--precrafted-gap);
  height: 100%;
  padding-right: var(--gutter);
}

.precrafted-h__item {
  flex: 0 0 auto;
  height: 100%;
  margin: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.precrafted-h__item--gallery {
  width: min(72vw, 920px);
  padding: 1.5rem 0 4rem;
  background: var(--cream);
}

.precrafted-h__item--text {
  width: min(36vw, 420px);
  padding: 2rem 0;
  background: var(--cream);
}

.precrafted-h__item--info {
  width: min(48vw, 560px);
  padding: 2rem 0;
  overflow-y: auto;
  background: var(--cream);
}

/* —— Mobile vertical —— */
.precrafted-m {
  display: none;
  padding: calc(var(--header-height) + 2rem) var(--gutter) 5rem;
}

.precrafted-m__hero {
  padding-bottom: 1rem;
}

.precrafted-m__gallery {
  height: min(70dvh, 560px);
  margin: 1.5rem 0 2rem;
  border-top: 1px solid var(--grid-line);
  border-bottom: 1px solid var(--grid-line);
}

.precrafted__block,
.precrafted__info {
  padding-top: 2.5rem;
}

.precrafted__eyebrow {
  margin: 0 0 0.5rem;
  font-size: var(--text-sm);
  color: var(--accent);
  letter-spacing: 0.04em;
}

.precrafted__heading {
  font-size: var(--text-2xl);
  margin: 0 0 1.25rem;
}

.precrafted__subheading {
  font-size: var(--text-lg);
  margin: 0 0 0.75rem;
}

.precrafted__tagline {
  font-size: var(--text-lg);
  color: var(--charcoal);
}

.precrafted__finishes {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  max-width: 42rem;
}

.precrafted__finishes li {
  padding: 1rem 1.25rem;
  border: 1px solid var(--grid-line);
  font-family: var(--font-serif);
  font-style: italic;
}

.precrafted__info-block {
  max-width: 44rem;
  margin-bottom: 2.5rem;
  color: var(--muted);
}

.precrafted__info-block p {
  margin: 0 0 1rem;
}

.precrafted__pricing {
  list-style: none;
  margin: 0 0 1.25rem;
  padding: 0;
}

.precrafted__pricing li {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--grid-line);
  color: var(--charcoal);
}

.precrafted__dimensions {
  font-family: var(--font-serif);
  font-style: italic;
}

.precrafted__note {
  font-size: var(--text-sm);
}

.precrafted__link {
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (min-width: 1000px) {
  .precrafted-h:not(.precrafted-h--single):not(.is--horizontal-gallery-ready) .precrafted-h__pin {
    visibility: hidden;
  }

  .precrafted-m {
    display: none;
  }
}

@media (max-width: 999px) {
  .precrafted-h {
    display: none;
  }

  .precrafted-m {
    display: block;
  }
}
</style>
