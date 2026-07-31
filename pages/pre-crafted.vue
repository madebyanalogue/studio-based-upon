<template>
  <article class="precrafted">
    <!-- Desktop: pinned horizontal scroll -->
    <section
      ref="sectionRef"
      class="precrafted-h"
      :class="{ 'precrafted-h--single': !scrollEnabled }"
    >
      <div ref="pinRef" class="precrafted-h__pin">
        <div ref="titleRef" class="precrafted-h__title-panel">
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
              v-if="sequencePrimary"
              class="precrafted-h__item precrafted-h__item--media precrafted-h__item--media-full"
            >
              <PrecraftedScrubGallery
                :entries="[sequencePrimary]"
                :progress="scrubProgress"
              />
            </figure>

            <section class="precrafted-h__item precrafted-h__item--text">
              <div class="precrafted-h__text-inner">
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
              </div>
            </section>

            <section class="precrafted-h__item precrafted-h__item--text">
              <div class="precrafted-h__text-inner">
                <h2 class="precrafted__heading">Materiality in dialogue with light</h2>
                <div class="prose">
                  <p>
                    Tones, depths and textures subtly transform as light engages with the surface.
                    From the natural transitions of daylight to the precision of artificial
                    illumination, each (Pre)Crafted panel holds not one expression, but many.
                  </p>
                </div>
              </div>
            </section>

            <figure
              v-if="sequenceSecondary"
              class="precrafted-h__item precrafted-h__item--media precrafted-h__item--media-secondary"
            >
              <PrecraftedScrubGallery
                :entries="[sequenceSecondary]"
                :progress="scrubProgress"
              />
            </figure>

            <section class="precrafted-h__item precrafted-h__item--text">
              <div class="precrafted-h__text-inner">
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
              </div>
            </section>

            <section class="precrafted-h__item precrafted-h__item--text">
              <div class="precrafted-h__text-inner">
                <h2 class="precrafted__heading">Finishes</h2>
                <ul class="precrafted__finishes">
                  <li v-for="finish in finishes" :key="finish">{{ finish }}</li>
                </ul>
              </div>
            </section>

            <section class="precrafted-h__item precrafted-h__item--text precrafted-h__item--info">
              <div class="precrafted-h__text-inner">
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

      <div v-if="sequencePrimary" class="precrafted-m__media precrafted-m__media--full">
        <PrecraftedScrubGallery
          :entries="[sequencePrimary]"
          :progress="mobileScrubProgress"
        />
      </div>

      <section class="precrafted-m__text">
        <div class="precrafted-m__text-inner">
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
        </div>
      </section>

      <section class="precrafted-m__text">
        <div class="precrafted-m__text-inner">
          <h2 class="precrafted__heading">Materiality in dialogue with light</h2>
          <div class="prose">
            <p>
              Tones, depths and textures subtly transform as light engages with the surface. From
              the natural transitions of daylight to the precision of artificial illumination, each
              (Pre)Crafted panel holds not one expression, but many.
            </p>
          </div>
        </div>
      </section>

      <div v-if="sequenceSecondary" class="precrafted-m__media precrafted-m__media--secondary">
        <PrecraftedScrubGallery
          :entries="[sequenceSecondary]"
          :progress="mobileScrubProgress"
        />
      </div>

      <section class="precrafted-m__text">
        <div class="precrafted-m__text-inner">
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
        </div>
      </section>

      <section class="precrafted-m__text">
        <div class="precrafted-m__text-inner">
          <h2 class="precrafted__heading">Finishes</h2>
          <ul class="precrafted__finishes">
            <li v-for="finish in finishes" :key="finish">{{ finish }}</li>
          </ul>
        </div>
      </section>

      <section class="precrafted-m__text precrafted-m__text--info">
        <div class="precrafted-m__text-inner">
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

const makeLocalSequence = (
  id: string,
  title: string,
  folder: string,
  frameCount: number,
): ScrubGalleryEntry => ({
  id,
  title,
  poster: `/precrafted/${folder}/frame-001.webp`,
  frames: Array.from({ length: frameCount }, (_, i) => {
    const n = String(i + 1).padStart(3, '0')
    return `/precrafted/${folder}/frame-${n}.webp`
  }),
})

const LOCAL_PRIMARY = makeLocalSequence('local-model-01', 'Model 01', 'model-01', 145)
const LOCAL_SECONDARY = makeLocalSequence('local-model-02', 'Wider Scene', 'model-02', 193)

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

const sanitySequences = computed((): ScrubGalleryEntry[] => {
  const items = (page.value?.gallery || []) as GalleryItem[]
  return items
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
})

const sequencePrimary = computed(
  () => sanitySequences.value[0] || LOCAL_PRIMARY,
)

const sequenceSecondary = computed(
  () => sanitySequences.value[1] || LOCAL_SECONDARY,
)

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

  const mediaEls = Array.from(
    document.querySelectorAll('.precrafted-m__media'),
  ) as HTMLElement[]
  if (!mediaEls.length) {
    mobileScrubProgress.value = null
    return
  }

  const { default: gsap } = await import('gsap')
  const { ScrollTrigger } = await import('gsap/ScrollTrigger')
  gsap.registerPlugin(ScrollTrigger)

  mobileScrollTrigger?.kill()
  const first = mediaEls[0]
  const last = mediaEls[mediaEls.length - 1]
  mobileScrollTrigger = ScrollTrigger.create({
    trigger: first,
    endTrigger: last,
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
  margin: 0;
  min-height: 0;
}

.precrafted-h__item--media {
  display: flex;
  flex-direction: column;
  padding: 0;
  background: transparent;
}

.precrafted-h__item--media-full {
  height: 100%;
  width: auto;
  aspect-ratio: 3 / 4;
}

.precrafted-h__item--media-secondary {
  height: 90%;
  width: auto;
  aspect-ratio: 4 / 3;
  align-self: flex-end;
}

.precrafted-h__item--media :deep(.scrub-gallery) {
  width: 100%;
  height: 100%;
  padding: 0;
}

.precrafted-h__item--media :deep(.scrub-gallery__frame) {
  max-height: none;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: transparent;
}

.precrafted-h__item--text {
  height: 100%;
  aspect-ratio: 1;
  width: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1.5rem, 4vh, 3rem);
  box-sizing: border-box;
}

.precrafted-h__text-inner {
  width: 100%;
  max-width: 22rem;
  text-align: center;
}

.precrafted-h__item--info {
  overflow-y: auto;
}

.precrafted-h__item--info .precrafted-h__text-inner {
  max-width: 24rem;
}

.precrafted-h__item--text :deep(.prose),
.precrafted-h__item--text .precrafted__finishes,
.precrafted-h__item--text .precrafted__info-block {
  margin-inline: auto;
}

.precrafted-h__item--text .precrafted__heading {
  text-align: center;
}

.precrafted-h__item--text .precrafted__eyebrow {
  text-align: center;
}

.precrafted-h__item--text .precrafted__finishes {
  grid-template-columns: 1fr;
  max-width: 16rem;
}

.precrafted-h__item--text .precrafted__pricing li {
  justify-content: center;
  flex-direction: column;
  text-align: center;
}

/* —— Mobile vertical —— */
.precrafted-m {
  display: none;
  padding: calc(var(--header-height) + 2rem) var(--gutter) 5rem;
}

.precrafted-m__hero {
  padding-bottom: 1rem;
}

.precrafted-m__media {
  margin: 1.5rem 0;
}

.precrafted-m__media--full {
  height: min(70dvh, 560px);
}

.precrafted-m__media--secondary {
  height: min(52.5dvh, 420px);
}

.precrafted-m__text {
  aspect-ratio: 1;
  width: min(100%, 28rem);
  margin: 1.5rem auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  box-sizing: border-box;
}

.precrafted-m__text-inner {
  width: 100%;
  text-align: center;
}

.precrafted-m__text--info {
  aspect-ratio: auto;
  min-height: min(100vw, 28rem);
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

.precrafted__info-block:last-child {
  margin-bottom: 0;
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
