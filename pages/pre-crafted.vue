<template>
  <article class="precrafted">
    <!-- Desktop: pinned horizontal scroll -->
    <section
      ref="sectionRef"
      class="precrafted-h"
      :class="{ 'precrafted-h--single': !scrollEnabled }"
    >
      <div ref="pinRef" class="precrafted-h__pin">
        <div ref="trackRef" class="precrafted-h__track">
          <div ref="itemsRef" class="precrafted-h__items">
            <template v-for="section in trackSections" :key="section.id">
              <figure
                v-if="section.kind === 'video'"
                class="precrafted-h__item precrafted-h__item--media"
                :class="`precrafted-h__item--align-${section.align}`"
                :data-scrub-id="section.id"
                :style="mediaStyle(section)"
              >
                <PrecraftedScrubGallery
                  :entries="[section.entry]"
                  :progress="itemProgress(section.id)"
                />
              </figure>

              <section
                v-else-if="section.kind === 'text'"
                class="precrafted-h__item precrafted-h__item--text"
                :class="{ 'precrafted-h__item--intro': section.variant === 'intro' }"
              >
                <div class="precrafted-h__text-inner">
                  <p v-if="section.eyebrow" class="precrafted__eyebrow interface">
                    {{ section.eyebrow }}
                  </p>
                  <h1 v-if="section.variant === 'intro'" class="page-title">
                    {{ section.title }}
                  </h1>
                  <h2 v-else class="precrafted__heading">{{ section.title }}</h2>
                  <SanityContent
                    v-if="section.body?.length"
                    :blocks="section.body"
                    class="prose"
                    :class="{ 'precrafted-h__lede': section.variant === 'intro' }"
                  />
                </div>
              </section>

              <section
                v-else-if="section.kind === 'finishes'"
                class="precrafted-h__item precrafted-h__item--text"
              >
                <div class="precrafted-h__text-inner">
                  <h2 class="precrafted__heading">{{ section.title }}</h2>
                  <ul class="precrafted__finishes">
                    <li v-for="finish in section.items" :key="finish">{{ finish }}</li>
                  </ul>
                </div>
              </section>

              <section
                v-else-if="section.kind === 'info'"
                class="precrafted-h__item precrafted-h__item--text precrafted-h__item--info"
              >
                <div class="precrafted-h__text-inner">
                  <h2 class="precrafted__heading">{{ section.title }}</h2>

                  <div class="precrafted__info-block">
                    <h3 class="precrafted__subheading interface">
                      {{ section.pricingHeading }}
                    </h3>
                    <p v-if="section.pricingIntro">{{ section.pricingIntro }}</p>
                    <ul class="precrafted__pricing">
                      <li v-for="(panel, i) in panelSizes" :key="i">
                        <span class="precrafted__dimensions">{{ panel.dimensions }}</span>
                        <span class="precrafted__price">{{ panel.price }}</span>
                      </li>
                    </ul>
                    <p
                      v-for="(note, i) in section.pricingNotes"
                      :key="`note-${i}`"
                      class="precrafted__note"
                    >
                      {{ note }}
                    </p>
                  </div>

                  <div class="precrafted__info-block">
                    <h3 class="precrafted__subheading interface">
                      {{ section.leadTimesHeading }}
                    </h3>
                    <p>{{ section.leadTimes }}</p>
                  </div>

                  <div class="precrafted__info-block">
                    <h3 class="precrafted__subheading interface">
                      {{ section.installHeading }}
                    </h3>
                    <SanityContent
                      v-if="section.installNotes?.length"
                      :blocks="section.installNotes"
                    />
                  </div>
                </div>
              </section>
            </template>
          </div>
        </div>
      </div>
    </section>

    <!-- Mobile: vertical stack -->
    <div class="precrafted-m">
      <template v-for="section in trackSections" :key="`m-${section.id}`">
        <div
          v-if="section.kind === 'video'"
          class="precrafted-m__media"
          :data-scrub-id="section.id"
          :style="mobileMediaStyle(section)"
        >
          <PrecraftedScrubGallery
            :entries="[section.entry]"
            :progress="itemProgress(section.id)"
          />
        </div>

        <section
          v-else-if="section.kind === 'text'"
          class="precrafted-m__text"
          :class="{ 'precrafted-m__text--intro': section.variant === 'intro' }"
        >
          <div class="precrafted-m__text-inner">
            <p v-if="section.eyebrow" class="precrafted__eyebrow interface">
              {{ section.eyebrow }}
            </p>
            <h1 v-if="section.variant === 'intro'" class="page-title">
              {{ section.title }}
            </h1>
            <h2 v-else class="precrafted__heading">{{ section.title }}</h2>
            <SanityContent
              v-if="section.body?.length"
              :blocks="section.body"
              class="prose"
              :class="{ 'precrafted-h__lede': section.variant === 'intro' }"
            />
          </div>
        </section>

        <section
          v-else-if="section.kind === 'finishes'"
          class="precrafted-m__text"
        >
          <div class="precrafted-m__text-inner">
            <h2 class="precrafted__heading">{{ section.title }}</h2>
            <ul class="precrafted__finishes">
              <li v-for="finish in section.items" :key="finish">{{ finish }}</li>
            </ul>
          </div>
        </section>

        <section
          v-else-if="section.kind === 'info'"
          class="precrafted-m__text precrafted-m__text--info"
        >
          <div class="precrafted-m__text-inner">
            <h2 class="precrafted__heading">{{ section.title }}</h2>

            <div class="precrafted__info-block">
              <h3 class="precrafted__subheading interface">{{ section.pricingHeading }}</h3>
              <p v-if="section.pricingIntro">{{ section.pricingIntro }}</p>
              <ul class="precrafted__pricing">
                <li v-for="(panel, i) in panelSizes" :key="i">
                  <span class="precrafted__dimensions">{{ panel.dimensions }}</span>
                  <span class="precrafted__price">{{ panel.price }}</span>
                </li>
              </ul>
              <p
                v-for="(note, i) in section.pricingNotes"
                :key="`m-note-${i}`"
                class="precrafted__note"
              >
                {{ note }}
              </p>
            </div>

            <div class="precrafted__info-block">
              <h3 class="precrafted__subheading interface">{{ section.leadTimesHeading }}</h3>
              <p>{{ section.leadTimes }}</p>
            </div>

            <div class="precrafted__info-block">
              <h3 class="precrafted__subheading interface">{{ section.installHeading }}</h3>
              <SanityContent
                v-if="section.installNotes?.length"
                :blocks="section.installNotes"
              />
            </div>
          </div>
        </section>
      </template>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ScrubGalleryEntry } from '~/components/PrecraftedScrubGallery.vue'

type PortableBlock = {
  _key?: string
  _type: string
  children?: Array<{ text?: string; marks?: string[] }>
}

type VideoHeight = number | 'below-header'

type VideoTrackSection = {
  id: string
  kind: 'video'
  heightPercent: VideoHeight
  align: 'top' | 'middle' | 'bottom'
  entry: ScrubGalleryEntry
}

type TextTrackSection = {
  id: string
  kind: 'text'
  eyebrow?: string
  title: string
  body: PortableBlock[]
  variant?: 'default' | 'intro'
}

type FinishesTrackSection = {
  id: string
  kind: 'finishes'
  title: string
  items: string[]
}

type InfoTrackSection = {
  id: string
  kind: 'info'
  title: string
  pricingHeading: string
  pricingIntro: string
  pricingNotes: string[]
  leadTimesHeading: string
  leadTimes: string
  installHeading: string
  installNotes: PortableBlock[]
}

type TrackSection =
  | VideoTrackSection
  | TextTrackSection
  | FinishesTrackSection
  | InfoTrackSection

const block = (key: string, text: string): PortableBlock => ({
  _key: key,
  _type: 'block',
  children: [{ text, marks: [] }],
})

const DEFAULT_SECTIONS: TrackSection[] = [
  {
    id: 'text-intro',
    kind: 'text',
    variant: 'intro',
    title: '(Pre)Crafted',
    body: [
      block(
        'intro1',
        '(Pre)Crafted transforms architectural spaces at scale, creating one flowing installation every time. Vast proportions and unique, unrepeated panels enable entire spaces to be crafted with bespoke architectural purity.',
      ),
    ],
  },
  {
    id: 'text-origin',
    kind: 'text',
    eyebrow: 'Origin',
    title: 'Story. Origin. Meaning.',
    body: [
      block(
        'o1',
        'Over two decades, Based Upon has combined material experimentation with an archive of textures, patterns and details gathered on journeys in landscape.',
      ),
      block(
        'o2',
        'Now, this material alchemy is available through Studio Based Upon in (Pre)Crafted form.',
      ),
    ],
  },
  {
    id: 'text-light',
    kind: 'text',
    title: 'Materiality in dialogue with light',
    body: [
      block(
        'l1',
        'Tones, depths and textures subtly transform as light engages with the surface. From the natural transitions of daylight to the precision of artificial illumination, each (Pre)Crafted panel holds not one expression, but many.',
      ),
    ],
  },
  {
    id: 'text-panel-plus',
    kind: 'text',
    eyebrow: 'Panel+',
    title: 'Beyond the edge of a panel',
    body: [
      block(
        'p1',
        'Panel+ reflects our commitment beyond the edge of a panel. With Panel+, Studio Based Upon offers a design and fabrication solution, creating additional bespoke elements to resolve the unique challenges of each space.',
      ),
      block('p2', 'The meeting of efficiency and artistry.'),
    ],
  },
  {
    id: 'finishes',
    kind: 'finishes',
    title: 'Finishes',
    items: ['Camona Gold', 'Camona Bronze', 'Camona Pink Nickel', 'Camona Silver'],
  },
  {
    id: 'info',
    kind: 'info',
    title: 'Info',
    pricingHeading: 'Panel Sizes & Trade Launch Pricing',
    pricingIntro:
      '(Pre)Crafted panels are finished on the front face only and are available in the following dimensions:',
    pricingNotes: [
      'All prices are exc. VAT, delivery & installation.',
      'Prices stated are for approx. 30no panel orders. We will honour this volume pricing of £995m² for any volume ordered during our trade launch. Pricing valid until May 2026.',
    ],
    leadTimesHeading: 'Lead Times',
    leadTimes:
      'Typical lead times are approx. 6–8 weeks (subject to production schedule at the time) with larger orders requiring longer to prepare. Please contact us about your project for more specific timings.',
    installHeading: 'Install',
    installNotes: [
      block(
        'i1',
        'The edges are black to create a shadow gap detail between panels. We recommend a mechanical fixing system such as split battens to allow for adjustment during fitting.',
      ),
      block(
        'i2',
        'Speak to your appointed contractor to check specific requirements for your project or please contact us for further advice.',
      ),
    ],
  },
]

const query = `*[_type == "preCraftedPage"][0] {
  seoTitle,
  heroTitle,
  heroSubtitle,
  panelSizes[] { dimensions, price },
  sections[] {
    _key,
    _type,
    eyebrow,
    title,
    body,
    variant,
    items,
    pricingHeading,
    pricingIntro,
    pricingNotes,
    leadTimesHeading,
    leadTimes,
    installHeading,
    installNotes,
    heightPercent,
    align,
    scrubVideo { asset->{ url, originalFilename } },
    poster {
      asset->{
        url,
        metadata { dimensions { width, height } }
      }
    }
  }
}`

const { data: page } = await useAsyncData(
  'preCraftedPage-v2',
  () =>
    $fetch('/api/sanity/query', {
      method: 'POST',
      body: { query, useCdn: false },
    })
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

function clampHeight(value: unknown, fallback: VideoHeight = 100): VideoHeight {
  if (value === 'below-header') return 'below-header'
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(100, Math.max(1, Math.round(n)))
}

function mediaHeightCss(height: VideoHeight) {
  if (height === 'below-header') return 'calc(100% - var(--header-height))'
  return `${height}%`
}

function mobileMediaStyle(section: VideoTrackSection) {
  if (section.heightPercent === 'below-header') {
    return { height: 'calc(100dvh - var(--header-height))' }
  }
  const h = section.heightPercent
  return { height: `min(${h * 0.7}dvh, ${h * 5.6}px)` }
}

function mapSanitySections(raw: unknown[]): TrackSection[] {
  return raw
    .map((item: any, index: number): TrackSection | null => {
      const id = item?._key || `section-${index}`
      if (item?._type === 'precraftedVideoSection') {
        const title = item.title || 'Video'
        const video = item.scrubVideo?.asset?.url || ''
        if (!video) return null
        return {
          id,
          kind: 'video',
          heightPercent: clampHeight(item.heightPercent, 100),
          align: item.align === 'top' || item.align === 'middle' ? item.align : 'bottom',
          entry: {
            id,
            title,
            video,
            poster: imageUrl(item.poster, 1200) || '',
          },
        }
      }
      if (item?._type === 'precraftedTextSection') {
        if (!item.title) return null
        return {
          id,
          kind: 'text',
          eyebrow: item.eyebrow || undefined,
          title: item.title,
          body: Array.isArray(item.body) ? item.body : [],
          variant: item.variant === 'intro' ? 'intro' : 'default',
        }
      }
      if (item?._type === 'precraftedFinishesSection') {
        const items = (item.items || []).filter(Boolean)
        if (!items.length) return null
        return {
          id,
          kind: 'finishes',
          title: item.title || 'Finishes',
          items,
        }
      }
      if (item?._type === 'precraftedInfoSection') {
        return {
          id,
          kind: 'info',
          title: item.title || 'Info',
          pricingHeading: item.pricingHeading || 'Panel Sizes & Trade Launch Pricing',
          pricingIntro: item.pricingIntro || '',
          pricingNotes: Array.isArray(item.pricingNotes) ? item.pricingNotes.filter(Boolean) : [],
          leadTimesHeading: item.leadTimesHeading || 'Lead Times',
          leadTimes: item.leadTimes || '',
          installHeading: item.installHeading || 'Install',
          installNotes: Array.isArray(item.installNotes) ? item.installNotes : [],
        }
      }
      return null
    })
    .filter((section): section is TrackSection => Boolean(section))
}

const trackSections = computed((): TrackSection[] => {
  const fromSanity = Array.isArray(page.value?.sections)
    ? mapSanitySections(page.value.sections)
    : []
  return fromSanity.length ? fromSanity : DEFAULT_SECTIONS
})

function mediaStyle(section: VideoTrackSection) {
  return {
    height: mediaHeightCss(section.heightPercent),
  }
}

const sectionRef = ref<HTMLElement | null>(null)
const pinRef = ref<HTMLElement | null>(null)
const trackRef = ref<HTMLElement | null>(null)
const itemsRef = ref<HTMLElement | null>(null)

const scrubProgressById = ref<Record<string, number>>({})

function itemProgress(id: string) {
  return scrubProgressById.value[id] ?? 0
}

/** Map an element's travel across the viewport to 0–1 scrub progress. */
function progressForElement(el: Element) {
  const rect = el.getBoundingClientRect()
  const vw = window.innerWidth || 1
  const start = vw
  const end = -rect.width
  const span = start - end || 1
  return Math.min(1, Math.max(0, (start - rect.left) / span))
}

function syncScrubProgresses() {
  if (!import.meta.client) return
  const root = isDesktop.value ? itemsRef.value : document.querySelector('.precrafted-m')
  if (!root) return
  const next: Record<string, number> = { ...scrubProgressById.value }
  root.querySelectorAll<HTMLElement>('[data-scrub-id]').forEach((el) => {
    const id = el.dataset.scrubId
    if (!id) return
    next[id] = progressForElement(el)
  })
  scrubProgressById.value = next
}

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
  itemsRef,
  hasTitle: computed(() => false),
  enabled: scrollEnabled,
  onProgress: () => {
    syncScrubProgresses()
  },
})

async function setupMobileScrub() {
  if (!import.meta.client || isDesktop.value) {
    mobileScrollTrigger?.kill()
    mobileScrollTrigger = null
    return
  }

  const mediaEls = Array.from(
    document.querySelectorAll('.precrafted-m__media'),
  ) as HTMLElement[]
  if (!mediaEls.length) return

  const { default: gsap } = await import('gsap')
  const { ScrollTrigger } = await import('gsap/ScrollTrigger')
  gsap.registerPlugin(ScrollTrigger)

  mobileScrollTrigger?.kill()
  const first = mediaEls[0]
  const last = mediaEls[mediaEls.length - 1]
  mobileScrollTrigger = ScrollTrigger.create({
    trigger: first,
    endTrigger: last,
    start: 'top bottom',
    end: 'bottom top',
    scrub: true,
    onUpdate: () => {
      syncScrubProgresses()
    },
  })
  syncScrubProgresses()
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

watch(trackSections, () => {
  nextTick(() => setupMobileScrub())
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
  --precrafted-track-height: 100dvh;
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
  padding-left: var(--gutter);
}

.precrafted-h__lede {
  margin: 0.75rem 0 0;
  font-size: var(--text-xl);
  line-height: 1.4;
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
  width: auto;
  padding: 0;
  background: transparent;
}

.precrafted-h__item--align-top {
  align-self: flex-start;
}

.precrafted-h__item--align-middle {
  align-self: center;
}

.precrafted-h__item--align-bottom {
  align-self: flex-end;
}

.precrafted-h__item--media :deep(.scrub-gallery),
.precrafted-h__item--media :deep(.scrub-gallery__stage) {
  width: auto;
  height: 100%;
  padding: 0;
}

.precrafted-h__item--media :deep(.scrub-gallery__frame) {
  width: auto;
  height: 100%;
  max-width: none;
  max-height: none;
  object-fit: contain;
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

.precrafted-m__media {
  margin: 1.5rem auto;
  width: fit-content;
  max-width: 100%;
}

.precrafted-m__media :deep(.scrub-gallery),
.precrafted-m__media :deep(.scrub-gallery__stage) {
  width: auto;
  height: 100%;
}

.precrafted-m__media :deep(.scrub-gallery__frame) {
  width: auto;
  height: 100%;
  object-fit: contain;
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
