<template>
  <article class="about">
    <svg class="about-plan__goo" viewBox="0 0 0 0" aria-hidden="true" focusable="false">
      <defs>
        <filter
          :id="titleFilterId"
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
          color-interpolation-filters="sRGB"
        >
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140"
          />
        </filter>
      </defs>
    </svg>
    <div
      ref="planEl"
      class="about-plan"
      :class="{
        'about-plan--guide': guideVisible,
        'about-plan--enter': planEntering,
        'about-plan--motion': planMotion,
      }"
    >
      <section
        v-for="section in 6"
        :key="section"
        class="about-plan__section"
        :class="{ 'about-plan__section--tall': section === 1 }"
        :aria-label="`Plan ${section}`"
      >
        <span class="about-plan__index interface">{{ String(section).padStart(2, '0') }}</span>
        <span
          v-for="area in section === 1 ? planAreasTall : planAreas"
          :key="area"
          class="about-plan__cell"
          :data-area="area"
          :style="{ gridArea: area }"
          aria-hidden="true"
        >{{ area }}</span>
        <h2
          v-if="section === 1"
          class="about-plan__title h3"
          :class="{ 'about-plan__title--pending': !titlesReady }"
          :style="titleFilterStyle"
        >
          Welcome to <br/><span>Studio Based Upon</span>
        </h2>
        <div v-if="section === 1" class="about-plan__copy flex flex-col gap-2">
          <div class="h6 muted">Who we are</div>
          <p class="mono-copy">
            We are a team of designers, surface specialists and master fabricators,
            bringing together more than two decades of knowledge gained through
            envisioning, designing, crafting and making within Based Upon’s pioneering
            workshop. We collaborate with visionary designers and architects to realise
            extraordinary bodies of work for the world’s largest yachts, finest private
            residences, prestigious hotels, restaurants and fashion houses.
          </p>
        </div>
        <h2
          v-if="section === 1"
          class="about-plan__title about-plan__title--next h3"
          :class="{ 'about-plan__title--pending': !titlesReady }"
          :style="titleFilterStyle"
        >
          Beautiful Contradictions
        </h2>
        <div v-if="section === 1" class="about-plan__lead">
          <p class="mono-copy">
            Our work moves freely between the intricate and the monumental. We create
            unfathomable surfaces and singular objects as well as large-scale integrated
            artworks, architectural interventions and monolithic forms, bringing the same
            intensity of attention to every scale.</p>
          <p class="mono-copy">Our practice is rooted in curiosity,
            experimentation and a deep knowledge of materials. Part atelier, part laboratory,
            the studio is a place where ideas are explored through making, where the hand
            meets the algorithm, and where traditional craft sits alongside advanced processes
            and emerging technologies.
          </p>
        </div>
        <div v-if="section === 1" class="about-plan__materials">
          <p class="mono-copy">
            We have developed proprietary material innovations such as Tramazite™, inspired
            by studying the ocean from the air, and have pioneered the artistic interpretation
            of liquid metals.
          </p>
        </div>
        <h2
          v-if="section === 1"
          class="about-plan__title about-plan__title--clients h3"
          :class="{ 'about-plan__title--pending': !titlesReady }"
          :style="titleFilterStyle"
        >
          Clients
        </h2>
        <div v-if="section === 1" class="about-plan__clients">
          <p class="mono-copy">
            The client is a critical element of our process. His or her involvement is vital
            to the pursuit of this beauty. The client’s absolute satisfaction and emotional
            fulfillment is the singular point of the pursuit.
          </p>
        </div>
        <div v-if="section === 1" class="about-plan__clients-names">
          <ul class="mono-copy">
            <li>Armani</li>
            <li>Dior</li>
            <li>Donna Karan</li>
            <li>Comme des Garçons</li>
            <li>Chanel</li>
            <li>Hermès</li>
            <li>Louis Vuitton</li>
            <li>Prada</li>
            <li>Saint Laurent</li>
            <li>Bottega Veneta</li>
          </ul>
        </div>
        <NuxtLink
          v-for="thumb in section === 1 ? planThumbs : []"
          :key="thumb.slug"
          class="about-plan__figure"
          :class="[thumb.place, { 'about-plan__figure--lit': litFigures[thumb.slug] }]"
          :style="thumb.column ? { gridColumn: thumb.column, gridRow: thumb.row } : undefined"
          :to="thumb.href"
          :data-slug="thumb.slug"
          @click.capture="onPlanThumbOpen($event, thumb)"
        >
          <span class="about-plan__figure-veil" aria-hidden="true" />
          <img
            :src="thumb.src"
            :alt="thumb.title"
            class="about-plan__figure-img"
            width="1600"
            height="1900"
          />
          <span class="about-plan__figure-meta">
            <span class="about-plan__figure-copy">
              <span class="h6">{{ thumb.title }}</span>
              <span v-if="thumb.detail" class="h6 muted">{{ thumb.detail }}</span>
            </span>
          </span>
        </NuxtLink>
      </section>
    </div>

    <!-- 01 — Opening / Who We Are -->
    <section class="about-open" aria-labelledby="about-open-title">
      <p class="about-meta interface" aria-hidden="true">
        <span>Studio Based Upon</span>
        <span aria-hidden="true">/</span>
        <span>London</span>
        <span aria-hidden="true">/</span>
        <span>Est. 2004</span>
      </p>

      <div class="about-open__copy">
        <h1 id="about-open-title" class="about-open__title serif">
          Welcome to Studio Based Upon.
        </h1>
      </div>

      <figure class="about-open__hero">
        <img
          :src="heroSrc"
          :alt="heroAlt"
          class="about-open__hero-img"
          width="2400"
          height="1600"
          fetchpriority="high"
        />
        <figcaption class="about-open__hero-cap interface">
          {{ heroCaption }}
        </figcaption>
      </figure>
    </section>

    <!-- 02 — What We Make -->
    <section class="about-make" aria-labelledby="about-make-title">
      <header class="about-make__header">
        <p class="about-kicker interface">What we make</p>
        <ul class="about-axes interface" aria-label="Practice tensions">
          <li v-for="axis in axes" :key="axis">{{ axis }}</li>
        </ul>
      </header>

      <div class="about-make__copy">
        <p id="about-make-title">
          Our work moves freely between the intricate and the monumental.
          We create unfathomable surfaces and singular objects as well as large-scale
          integrated artworks, architectural interventions and monolithic forms, bringing
          the same intensity of attention to every scale.
        </p>
        <p>
          Our practice is rooted in curiosity, experimentation and a deep knowledge of materials.
          Part atelier, part laboratory, the studio is a place where ideas are explored
          through making, where the hand meets the algorithm, and where traditional craft
          sits alongside advanced processes and emerging technologies.
        </p>
      </div>

      <div class="about-sheet" role="list" aria-label="Work and process evidence">
        <div
          v-for="(cell, i) in sheetCells"
          :key="cell.item._id"
          class="about-sheet__cell"
          :class="`about-sheet__cell--${cell.size}`"
          role="listitem"
        >
          <ProductCard
            :item="cell.item"
            :image-url="cardImage(cell.item)"
            :order-label="orderLabel(i)"
            :style="sheetThumbStyle(cell.item)"
          />
        </div>
      </div>
    </section>

    <!-- 03 — Threshold -->
    <section class="about-threshold" aria-labelledby="about-threshold-title">
      <p class="about-threshold__mark interface">03</p>
      <h2 id="about-threshold-title" class="about-threshold__title serif">Go deeper.</h2>
      <p class="about-threshold__body">
        Notes, experiments, processes and evidence from more than twenty years of making.
      </p>
    </section>

    <!-- 04 — The Workshop -->
    <section class="about-chapter" aria-labelledby="about-workshop-title">
      <header class="about-chapter__head">
        <p class="about-kicker interface">The workshop</p>
        <h2 id="about-workshop-title" class="about-chapter__title serif">
          Part atelier. Part laboratory.
        </h2>
      </header>
      <div class="about-evidence" role="list">
        <figure
          v-for="item in workshopEvidence"
          :key="item.id"
          class="about-evidence__item"
          role="listitem"
        >
          <img :src="item.src" :alt="item.alt" loading="lazy" decoding="async" />
          <figcaption class="about-evidence__cap interface">
            <span>{{ item.ref }}</span>
            <span>{{ item.caption }}</span>
          </figcaption>
        </figure>
      </div>
    </section>

    <!-- 05 — Accumulated knowledge -->
    <section class="about-chapter about-chapter--dense" aria-labelledby="about-knowledge-title">
      <header class="about-chapter__head">
        <p class="about-kicker interface">Accumulated knowledge</p>
        <h2 id="about-knowledge-title" class="about-chapter__title serif">
          Nothing starts from zero.
        </h2>
        <p class="about-chapter__lede">
          Every commission draws on more than two decades of accumulated material knowledge,
          experiments, processes, successes, failures and discoveries.
        </p>
      </header>
      <ol class="about-chain interface" aria-label="From experiment to finished work">
        <li>Experiment</li>
        <li>Development</li>
        <li>Application</li>
        <li>Finished work</li>
      </ol>
     
    </section>

    <!-- 06 — People -->
    <section class="about-chapter" aria-labelledby="about-people-title">
      <header class="about-chapter__head">
        <p class="about-kicker interface">People</p>
        <h2 id="about-people-title" class="about-chapter__title serif">
          Designers. Surface specialists. Engineers. Makers.
        </h2>
      </header>
      <ul class="about-people">
        <li v-for="person in people" :key="person.name" class="about-people__item">
          <figure class="about-people__fig">
            <img :src="person.src" :alt="person.name" loading="lazy" decoding="async" />
          </figure>
          <p class="about-people__name interface">{{ person.name }}</p>
          <p class="about-people__role interface">{{ person.role }}</p>
        </li>
      </ul>
    </section>

    <!-- 07 — How we work -->
    <section class="about-chapter about-start" aria-labelledby="about-start-title">
      <header class="about-chapter__head">
        <p class="about-kicker interface">How we work</p>
        <h2 id="about-start-title" class="about-chapter__title serif">Start anywhere.</h2>
        <p class="about-chapter__lede">
          Bring as much or as little as you like. Our role changes with yours.
        </p>
      </header>
      <ul class="about-starts">
        <li v-for="point in startPoints" :key="point">{{ point }}</li>
      </ul>
    </section>

    <!-- 08 — Twenty-year evidence -->
    <section class="about-years" aria-labelledby="about-years-title">
      <header class="about-chapter__head">
        <p class="about-kicker interface">20 years</p>
        <h2 id="about-years-title" class="about-chapter__title serif">
          20 years / 20 pieces of evidence
        </h2>
      </header>
      <div class="about-timeline" role="list">
        <article
          v-for="entry in timeline"
          :key="entry.year + entry.title"
          class="about-timeline__entry"
          role="listitem"
        >
          <p class="about-timeline__year interface">{{ entry.year }}</p>
          <div class="about-timeline__text">
            <h3 class="about-timeline__title">{{ entry.title }}</h3>
            <p v-if="entry.note" class="about-timeline__note">{{ entry.note }}</p>
          </div>
        </article>
      </div>
    </section>

    <!-- Resolve -->
    <section class="about-resolve" aria-label="Continue">
      <p class="about-resolve__mark interface">Studio Based Upon — London</p>
      <nav class="about-resolve__nav">
        <NuxtLink class="about-resolve__link serif" to="/materials-and-forms">
          Explore work
        </NuxtLink>
        <NuxtLink class="about-resolve__link serif" to="/curate">
          Compose
        </NuxtLink>
        <NuxtLink class="about-resolve__link serif" to="/enquire">
          Enquire
        </NuxtLink>
      </nav>
    </section>
  </article>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { productCoverFrame } from '~/composables/productImages'
import { productPath, productSlug } from '~/composables/useProductCatalog'
import type { LibraryItem } from '~/composables/useLibraryCatalog'
import { GRID_RATIO_AR } from '~/composables/useLibraryCatalog'
import { IMAGE_WIDTH } from '~/composables/useSanityImage'

definePageMeta({
  pageTransition: false,
})

let runPlanLeave = () => Promise.resolve()
const { open: openProduct } = useProductOverlay()
onBeforeRouteLeave((to, from) => {
  // Closing a product calls history.back() onto this same page. That popstate
  // must not play the about outro.
  if (isOverlayHistoryRestore() || to.path === from.path) return
  return runPlanLeave()
})

type SheetCell = {
  item: LibraryItem
  size: 'a' | 'b' | 'c' | 'd'
}

const seed = (key: string, w: number, h: number) =>
  `https://picsum.photos/seed/sba-about-${key}/${w}/${h}`

/** Guide names match each section's grid-template-areas. Columns a–f. */
const planColumns = ['a', 'b', 'c', 'd', 'e', 'f'] as const
const planAreasFor = (rows: number) =>
  Array.from({ length: rows }, (_, row) =>
    planColumns.map((column) => `${column}${row + 1}`),
  ).flat()

const planAreas = planAreasFor(3)
const planAreasTall = planAreasFor(17)

const query = `*[_type == "aboutPage"][0] {
  seoTitle,
  seoDescription,
  heroTitle,
  heroSubtitle,
  tagline,
  heroImage { asset->{ url, _id } }
}`

const { data: page } = await useAsyncData('aboutPage-v2', () =>
  $fetch('/api/sanity/query', { method: 'POST', body: { query } })
    .then((r: { result?: Record<string, unknown> | null }) => r?.result ?? null)
    .catch(() => null),
)

const { items: libraryItems } = await useLibraryCatalog()
const { imageUrl, getImageSrc, prefetchImage } = useSanityImage()

const guideVisible = ref(true)
const planEl = ref<HTMLElement | null>(null)
const planEntering = ref(true)
const planMotion = ref(false)
const titlesReady = ref(false)
const titleFilterId = `about-title-goo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
const titleFilterStyle = { filter: `url(#${titleFilterId})`, WebkitFilter: `url(#${titleFilterId})` }

const TITLE_BLUR_MAX = 60
const TITLE_IN_S = 3
const TITLE_OUT_S = 0.65
const CLIP_IN_S = 3
const CLIP_OUT_S = 1.6
const COPY_LINE_S = 0.8
const COPY_STAGGER_S = 0.07
/** Start the copy once the heading is visible, not after the full melt. */
const COPY_AFTER_S = 1.4

type TitleBlock = { el: HTMLElement; words: HTMLElement[] }
type CopyBlock = {
  root: HTMLElement
  split: InstanceType<typeof SplitText>
  lines: HTMLElement[]
}

let titleSplits: InstanceType<typeof SplitText>[] = []
let copySplits: InstanceType<typeof SplitText>[] = []
let scrollTriggers: ScrollTrigger[] = []
let activeTweens: gsap.core.Tween[] = []
const titlePromises = new Map<HTMLElement, Promise<void>>()
let titleBurst = 0
let titleBurstAt = 0
let imageBurst = 0
let imageBurstAt = 0
let leavePromise: Promise<void> | null = null
let pluginsReady = false

const prefersReducedMotion = () =>
  import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const ensureMotionPlugins = () => {
  if (pluginsReady || !import.meta.client) return
  gsap.registerPlugin(SplitText, ScrollTrigger)
  pluginsReady = true
}

const killReveals = () => {
  scrollTriggers.forEach((trigger) => trigger.kill())
  scrollTriggers = []
  activeTweens.forEach((tween) => tween.kill())
  activeTweens = []
  titlePromises.clear()
}

const trackTween = (tween: gsap.core.Tween) => {
  activeTweens.push(tween)
  return tween
}

const revertSplits = (splits: InstanceType<typeof SplitText>[]) => {
  for (const split of splits) {
    try {
      split.revert()
    } catch {
      /* already reverted */
    }
  }
  splits.length = 0
}

const titleWords = () =>
  Array.from(planEl.value?.querySelectorAll<HTMLElement>('.about-plan__title-word') || [])

const planImages = () =>
  Array.from(planEl.value?.querySelectorAll<HTMLElement>('.about-plan__figure-img') || [])

const figureVeil = (img: HTMLElement) =>
  img.parentElement?.querySelector<HTMLElement>('.about-plan__figure-veil') ?? null

/** Bottom inset reveals downward from the top. Top inset hides downward off the bottom. */
const setImageClip = (el: HTMLElement, amount: number, edge: 'bottom' | 'top' = 'bottom') => {
  const clip =
    edge === 'top'
      ? `inset(${amount}% 0% 0% 0%)`
      : `inset(0% 0% ${amount}% 0%)`
  el.style.clipPath = clip
  const veil = figureVeil(el)
  if (veil) veil.style.clipPath = clip
}

const clearImageClip = (el: HTMLElement) => {
  el.style.removeProperty('clip-path')
  figureVeil(el)?.style.removeProperty('clip-path')
}

const clipTop = (el: HTMLElement) => {
  const match = (el.style.clipPath || '').match(
    /inset\(\s*[0-9.]+%\s+[0-9.]+%\s+([0-9.]+)%/,
  )
  return match ? Number(match[1]) : 0
}

const tweenImageClip = (
  els: HTMLElement[],
  to: number,
  duration: number,
  edge: 'bottom' | 'top' = 'bottom',
) =>
  new Promise<void>((resolve) => {
    if (!els.length) {
      resolve()
      return
    }
    const tl = gsap.timeline({ onComplete: resolve })
    els.forEach((el, index) => {
      const state = { amount: edge === 'top' ? 0 : clipTop(el) }
      setImageClip(el, state.amount, edge)
      tl.to(
        state,
        {
          amount: to,
          duration,
          ease: 'power3.inOut',
          onUpdate: () => setImageClip(el, state.amount, edge),
        },
        index * 0.08,
      )
    })
  })

const splitTitles = () => {
  revertSplits(titleSplits)
  const blocks: TitleBlock[] = []
  planEl.value?.querySelectorAll<HTMLElement>('.about-plan__title').forEach((el) => {
    const split = new SplitText(el, { type: 'words', wordsClass: 'about-plan__title-word' })
    titleSplits.push(split)
    blocks.push({ el, words: split.words as HTMLElement[] })
  })
  return blocks
}

const precedingTitle = (blocks: TitleBlock[], el: HTMLElement) => {
  let match: TitleBlock | null = null
  for (const block of blocks) {
    if (block.el.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) match = block
  }
  return match
}

const maskCopyLines = () => {
  revertSplits(copySplits)
  const blocks: CopyBlock[] = []
  planEl.value
    ?.querySelectorAll<HTMLElement>('.about-plan__copy .mono-copy, .about-plan__lead .mono-copy, .about-plan__materials .mono-copy, .about-plan__clients .mono-copy, .about-plan__clients-names .mono-copy')
    .forEach((el) => {
      if (!el.textContent?.trim()) return
      const split = new SplitText(el, {
        type: 'lines',
        linesClass: 'about-plan__clip-line',
      })
      copySplits.push(split)
      const lines: HTMLElement[] = []
      split.lines.forEach((line) => {
        const lineEl = line as HTMLElement
        const mask = document.createElement('div')
        mask.className = 'about-plan__line-mask'
        lineEl.parentNode?.insertBefore(mask, lineEl)
        mask.appendChild(lineEl)
        lines.push(lineEl)
      })
      const root = el.closest<HTMLElement>('.about-plan__copy, .about-plan__lead, .about-plan__materials, .about-plan__clients, .about-plan__clients-names') || el
      blocks.push({ root, split, lines })
    })
  return blocks
}

const playTitle = (block: TitleBlock) => {
  const existing = titlePromises.get(block.el)
  if (existing) return existing
  const now = performance.now()
  if (now - titleBurstAt > 80) titleBurst = 0
  titleBurstAt = now
  const delay = titleBurst * 0.12
  titleBurst += 1
  const promise = new Promise<void>((resolve) => {
    if (!block.words.length) {
      resolve()
      return
    }
    trackTween(
      gsap.to(block.words, {
        filter: 'blur(0px)',
        opacity: 1,
        duration: TITLE_IN_S,
        delay,
        ease: 'power3.out',
        onComplete: resolve,
        onInterrupt: resolve,
      }),
    )
  })
  titlePromises.set(block.el, promise)
  return promise
}

const playCopy = (titles: TitleBlock[], block: CopyBlock) => {
  const title = precedingTitle(titles, block.root)
  if (title && title.el.getBoundingClientRect().top < window.innerHeight * 0.92) {
    void playTitle(title)
  }
  const titleIn = title ? titlePromises.get(title.el) : null
  const gate = titleIn
    ? Promise.race([
        titleIn,
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, COPY_AFTER_S * 1000)
        }),
      ])
    : Promise.resolve()
  void gate.then(() => {
    if (leavePromise || !block.lines.length || block.root.dataset.copyPlayed === '1') return
    block.root.dataset.copyPlayed = '1'
    const label = block.root.querySelector<HTMLElement>('.h6')
    if (label) {
      trackTween(gsap.to(label, { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out' }))
    }
    trackTween(
      gsap.fromTo(
        block.lines,
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: COPY_LINE_S,
          ease: 'power3.out',
          stagger: COPY_STAGGER_S,
          onComplete: () => {
            try {
              block.split.revert()
            } catch {
              /* already reverted */
            }
            const index = copySplits.indexOf(block.split)
            if (index >= 0) copySplits.splice(index, 1)
          },
        },
      ),
    )
  })
}

const playImage = (img: HTMLElement) => {
  if (clipTop(img) < 99) return
  const now = performance.now()
  if (now - imageBurstAt > 80) imageBurst = 0
  imageBurstAt = now
  const delay = imageBurst * 0.08
  imageBurst += 1
  const state = { top: 100 }
  const meta = img.parentElement?.querySelector<HTMLElement>('.about-plan__figure-meta')
  trackTween(
    gsap.to(state, {
      top: 0,
      duration: CLIP_IN_S,
      delay,
      ease: 'power3.inOut',
      onUpdate: () => setImageClip(img, state.top),
      onComplete: () => {
        if (leavePromise || planEntering.value) return
        clearImageClip(img)
        if (meta) {
          trackTween(gsap.to(meta, { opacity: 1, duration: 0.45, ease: 'power2.out' }))
        }
        const slug = img.parentElement?.getAttribute('data-slug')
        if (!slug || litFigures.value[slug]) return
        litFigures.value = { ...litFigures.value, [slug]: true }
      },
    }),
  )
}

const bindReveal = (
  trigger: HTMLElement,
  onEnter: () => void,
  start = 'top 90%',
) => {
  scrollTriggers.push(
    ScrollTrigger.create({
      trigger,
      start,
      once: true,
      onEnter,
    }),
  )
}

const playPlanEnter = async () => {
  if (!import.meta.client || !planEl.value) return
  if (prefersReducedMotion()) {
    planEntering.value = false
    titlesReady.value = true
    const ready: Record<string, true> = {}
    planEl.value.querySelectorAll<HTMLElement>('.about-plan__figure[data-slug]').forEach((el) => {
      const slug = el.dataset.slug
      if (slug) ready[slug] = true
    })
    litFigures.value = ready
    return
  }

  ensureMotionPlugins()
  if (document.fonts?.ready) await document.fonts.ready
  await nextTick()
  if (!planEl.value || leavePromise) return

  const titles = splitTitles()
  const copies = maskCopyLines()
  const images = planImages()

  gsap.set(titleWords(), { filter: `blur(${TITLE_BLUR_MAX}px)`, opacity: 0 })
  copies.forEach((block) => {
    gsap.set(block.lines, { yPercent: 110 })
    const label = block.root.querySelector<HTMLElement>('.h6')
    if (label) gsap.set(label, { opacity: 0, y: 12 })
  })
  images.forEach((el) => {
    setImageClip(el, 100)
    const meta = el.parentElement?.querySelector<HTMLElement>('.about-plan__figure-meta')
    if (meta) gsap.set(meta, { opacity: 0 })
  })
  titlesReady.value = true
  planMotion.value = true
  await nextTick()
  if (!planEl.value || leavePromise) return

  titles.forEach((block) => bindReveal(block.el, () => playTitle(block)))
  copies.forEach((block) => bindReveal(block.root, () => playCopy(titles, block)))
  images.forEach((el) => {
    bindReveal(el, () => playImage(el), 'top bottom')
  })
  ScrollTrigger.refresh()
  planEntering.value = false
}

const visibleCopyOut = () => {
  const lines: HTMLElement[] = []
  const labels: HTMLElement[] = []
  if (!planEl.value) return { lines, labels }

  planEl.value
    .querySelectorAll<HTMLElement>('.about-plan__copy .mono-copy, .about-plan__lead .mono-copy, .about-plan__materials .mono-copy, .about-plan__clients .mono-copy, .about-plan__clients-names .mono-copy')
    .forEach((el) => {
      if (!el.textContent?.trim()) return
      let lineEls = [...el.querySelectorAll<HTMLElement>('.about-plan__clip-line')]
      if (!lineEls.length) {
        const split = new SplitText(el, {
          type: 'lines',
          linesClass: 'about-plan__clip-line',
        })
        copySplits.push(split)
        lineEls = split.lines.map((line) => {
          const lineEl = line as HTMLElement
          const mask = document.createElement('div')
          mask.className = 'about-plan__line-mask'
          lineEl.parentNode?.insertBefore(mask, lineEl)
          mask.appendChild(lineEl)
          gsap.set(lineEl, { yPercent: 0 })
          return lineEl
        })
      }
      const shown = lineEls.filter((line) => Number(gsap.getProperty(line, 'yPercent')) < 80)
      if (!shown.length) return
      lines.push(...shown)
      const label = el
        .closest('.about-plan__copy, .about-plan__lead, .about-plan__materials, .about-plan__clients, .about-plan__clients-names')
        ?.querySelector<HTMLElement>('.h6')
      if (label && Number(gsap.getProperty(label, 'opacity')) > 0.05) labels.push(label)
    })

  return { lines, labels }
}

const playCopyOut = () =>
  new Promise<void>((resolve) => {
    const { lines, labels } = visibleCopyOut()
    if (!lines.length && !labels.length) {
      resolve()
      return
    }
    const tl = gsap.timeline({ onComplete: resolve })
    if (labels.length) {
      tl.to(labels, { opacity: 0, y: 12, duration: 0.4, ease: 'power2.in' }, 0)
    }
    if (lines.length) {
      tl.to(
        lines,
        {
          yPercent: 110,
          duration: 0.55,
          ease: 'power2.in',
          stagger: 0.04,
        },
        0,
      )
    }
  })

const playPlanLeave = () => {
  if (leavePromise) return leavePromise
  leavePromise = (async () => {
    killReveals()
    if (!import.meta.client || prefersReducedMotion() || !planEl.value) return

    ensureMotionPlugins()
    if (!planEl.value) return

    if (!titleWords().length) splitTitles()
    const words = titleWords().filter((word) => Number(gsap.getProperty(word, 'opacity')) > 0.04)
    titlesReady.value = true

    const images = planImages().filter((el) => clipTop(el) < 99)
    images.forEach((el) => {
      const meta = el.parentElement?.querySelector<HTMLElement>('.about-plan__figure-meta')
      if (meta && Number(gsap.getProperty(meta, 'opacity')) > 0.04) {
        trackTween(gsap.to(meta, { opacity: 0, duration: 0.3, ease: 'power2.in' }))
      }
    })

    await Promise.all([
      playCopyOut(),
      words.length
        ? new Promise<void>((resolve) => {
            gsap.to(words, {
              filter: `blur(${TITLE_BLUR_MAX}px)`,
              opacity: 0,
              duration: TITLE_OUT_S,
              ease: 'power2.in',
              onComplete: resolve,
            })
          })
        : Promise.resolve(),
      tweenImageClip(images, 100, CLIP_OUT_S, 'top'),
    ])
  })()
  return leavePromise
}

runPlanLeave = playPlanLeave

const onGuideKey = (event: KeyboardEvent) => {
  if (event.key !== 'g' && event.key !== 'G') return
  if (event.metaKey || event.ctrlKey || event.altKey) return
  const target = event.target
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.closest('input, textarea, select'))
  ) {
    return
  }
  guideVisible.value = !guideVisible.value
}

onMounted(() => {
  window.addEventListener('keydown', onGuideKey)
  void playPlanEnter()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGuideKey)
  killReveals()
  revertSplits(titleSplits)
  revertSplits(copySplits)
})

const planThumbSlots: {
  slug: string
  column?: string
  row?: string
  place?: string
}[] = [
  { slug: 'nilou-pearl', column: '1 / 3', row: '3 / 6' },
  { slug: 'crack-dark-dark', place: 'about-plan__figure--second' },
  { slug: 'double-twist-table', place: 'about-plan__figure--after' },
  { slug: 'birth-of-tramazite-mother-rain', place: 'about-plan__figure--third about-plan__figure--front' },
  { slug: 'diamond-coffee-table-blush', place: 'about-plan__figure--fourth' },
  { slug: 'deco-pit', place: 'about-plan__figure--fifth' },
]

const planThumbs = computed(() =>
  planThumbSlots.flatMap((slot) => {
    const item = libraryItems.value.find((entry) => productSlug(entry) === slot.slug)
    if (!item) return []
    const cover = productCoverFrame(item)
    const src = cover ? imageUrl(cover, IMAGE_WIDTH.thumb) : ''
    if (!src) return []
    return [{
      slug: slot.slug,
      id: item._id,
      column: slot.column,
      row: slot.row,
      place: slot.place,
      href: productPath(item) || `/materials-and-forms/${slot.slug}`,
      title: item.title,
      detail: item.feature || '',
      src,
      flipSrc: imageUrl(cover, IMAGE_WIDTH.hero) || src,
    }]
  }),
)

const litFigures = ref<Record<string, true>>({})

const onPlanThumbOpen = (
  event: MouseEvent,
  thumb: { slug: string; id: string; flipSrc: string },
) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
  event.preventDefault()
  const link = event.currentTarget
  if (!(link instanceof HTMLElement)) return
  const source = link.querySelector('.about-plan__figure-img')
  if (thumb.flipSrc) void prefetchImage(thumb.flipSrc)
  openProduct(thumb.slug, {
    source: source instanceof HTMLElement ? source : null,
    flipSrc: thumb.flipSrc || null,
    productId: thumb.id,
  })
}

const heroSrc = computed(() => {
  const img = page.value?.heroImage as { asset?: { url?: string; _id?: string } } | undefined
  return (
    imageUrl(img || null, 2400) ||
    getImageSrc(img?.asset) ||
    seed('hero-install', 2400, 1600)
  )
})

const heroAlt = computed(
  () =>
    (page.value?.heroTitle as string) ||
    'Installed Studio Based Upon work',
)

const heroCaption = computed(
  () => 'Evidence — installed work / Studio Based Upon',
)

const axes = [
  'Intricate / Monumental',
  'Hand / Algorithm',
  'Atelier / Laboratory',
  'Tradition / Emerging',
  'Object / Architecture',
]

const sizes: SheetCell['size'][] = ['a', 'b', 'c', 'b', 'd', 'a', 'c', 'b', 'a', 'd', 'b', 'c']

const sheetCells = computed((): SheetCell[] => {
  const list = libraryItems.value.filter((item) => Boolean(productCoverFrame(item)))
  return list.slice(0, 12).map((item, i) => ({
    item,
    size: sizes[i] || 'b',
  }))
})

const cardImage = (item: LibraryItem) => {
  const cover = productCoverFrame(item)
  return cover ? imageUrl(cover, IMAGE_WIDTH.thumb) : ''
}

const sheetThumbStyle = (item: LibraryItem) => {
  const ratioKey = item.gridRatio || 'square'
  const ar = GRID_RATIO_AR[ratioKey] ?? GRID_RATIO_AR.square
  return { '--thumb-ar': String(ar) }
}

const orderLabel = (index: number) => {
  const digits = Math.max(2, String(sheetCells.value.length).length)
  return String(index + 1).padStart(digits, '0')
}

const workshopEvidence = computed(() =>
  [41, 87, 112, 156, 203, 244].map((n, i) => ({
    id: `ev-${n}`,
    ref: `Evidence ${String(n).padStart(3, '0')}`,
    caption:
      [
        'Material experiment / London / 2017',
        'Surface development / Uncommissioned',
        'Casting / Workshop',
        'CNC path / Prototype',
        'Hand finish / Patina',
        'Archive shelf / Samples',
      ][i]!,
    alt: 'Workshop evidence',
    src: seed(`workshop-${n}`, 1400, 1000 + (i % 3) * 120),
  })),
)

const archiveFrags = computed(() =>
  Array.from({ length: 18 }, (_, i) => ({
    id: `frag-${i}`,
    ar: [0.75, 1, 1.35, 0.9, 1.6][i % 5],
    alt: 'Archive fragment',
    src: seed(`archive-${i}`, 800, Math.round(800 / ([0.75, 1, 1.35, 0.9, 1.6][i % 5]!))),
  })),
)

const people = [
  { name: 'Designer', role: 'Design / Form', src: seed('people-1', 900, 1100) },
  { name: 'Surface specialist', role: 'Material / Finish', src: seed('people-2', 900, 1100) },
  { name: 'Engineer', role: 'Engineering / Structure', src: seed('people-3', 900, 1100) },
  { name: 'Maker', role: 'Fabrication / Craft', src: seed('people-4', 900, 1100) },
]

const startPoints = [
  'A drawing.',
  'A material.',
  'A finished design.',
  'An existing work.',
  'An image.',
  'An idea.',
]

const timeline = [
  { year: '2004', title: 'Studio begins', note: 'London workshop founded.' },
  { year: '2007', title: 'Early liquid metal', note: 'Surface experiments enter the archive.' },
  { year: '2011', title: 'Monumental commission', note: 'Scale jumps; process deepens.' },
  { year: '2014', title: 'Material breakthrough', note: 'Tramazite and allied innovations.' },
  { year: '2017', title: 'Failed / kept', note: 'Unresolved experiments retained as knowledge.' },
  { year: '2019', title: 'Atelier × algorithm', note: 'CNC and craft in the same room.' },
  { year: '2022', title: 'Global residences & yachts', note: 'Work across private and maritime contexts.' },
  { year: '2026', title: 'Studio Based Upon', note: 'Twenty years of accumulated making.' },
]

useHead(() => ({
  title: (page.value?.seoTitle as string) || 'About — Studio Based Upon',
  meta: page.value?.seoDescription
    ? [{ name: 'description', content: page.value.seoDescription as string }]
    : [
        {
          name: 'description',
          content:
            'Studio Based Upon — designers, surface specialists and master fabricators in London since 2004.',
        },
      ],
}))
</script>

<style scoped>
.about {
  --about-gutter: var(--gutter);
  --about-measure: min(38rem, 100%);
  padding-bottom: clamp(4rem, 12vw, 9rem);
  overflow-x: clip;
}

.about-kicker {
  margin: 0 0 0.75rem;
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.about-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin: 0 0 clamp(1.5rem, 4vw, 2.5rem);
  font-size: var(--text-xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

/* Each section is one grid. Place live items with grid-area: a1 … f3.
   The first section is seventeen rows: a1 … f17. */
.about-plan {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: var(--products-grid-gap);
    padding-top: calc(var(--header-height) + clamp(2rem, 8vw, 420px));
  padding-inline: var(--gutter);
}

.about-plan__section {
  position: relative;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  grid-template-rows: repeat(3, calc((100cqi - 5 * var(--products-grid-gap)) / 6));
  grid-template-areas:
    "a1 b1 c1 d1 e1 f1"
    "a2 b2 c2 d2 e2 f2"
    "a3 b3 c3 d3 e3 f3";
  gap: var(--products-grid-gap);
}

.about-plan__section--tall {
  grid-template-rows: repeat(17, calc((100cqi - 5 * var(--products-grid-gap)) / 6));
  grid-template-areas:
    "a1 b1 c1 d1 e1 f1"
    "a2 b2 c2 d2 e2 f2"
    "a3 b3 c3 d3 e3 f3"
    "a4 b4 c4 d4 e4 f4"
    "a5 b5 c5 d5 e5 f5"
    "a6 b6 c6 d6 e6 f6"
    "a7 b7 c7 d7 e7 f7"
    "a8 b8 c8 d8 e8 f8"
    "a9 b9 c9 d9 e9 f9"
    "a10 b10 c10 d10 e10 f10"
    "a11 b11 c11 d11 e11 f11"
    "a12 b12 c12 d12 e12 f12"
    "a13 b13 c13 d13 e13 f13"
    "a14 b14 c14 d14 e14 f14"
    "a15 b15 c15 d15 e15 f15"
    "a16 b16 c16 d16 e16 f16"
    "a17 b17 c17 d17 e17 f17";
}

@media (max-width: 1599px) {
  .about-plan__section {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-template-rows: repeat(3, calc((100cqi - 3 * var(--products-grid-gap)) / 4));
    grid-template-areas:
      "a1 b1 c1 d1"
      "a2 b2 c2 d2"
      "a3 b3 c3 d3";
  }

  .about-plan__section--tall {
    grid-template-rows: repeat(17, calc((100cqi - 3 * var(--products-grid-gap)) / 4));
    grid-template-areas:
      "a1 b1 c1 d1"
      "a2 b2 c2 d2"
      "a3 b3 c3 d3"
      "a4 b4 c4 d4"
      "a5 b5 c5 d5"
      "a6 b6 c6 d6"
      "a7 b7 c7 d7"
      "a8 b8 c8 d8"
      "a9 b9 c9 d9"
      "a10 b10 c10 d10"
      "a11 b11 c11 d11"
      "a12 b12 c12 d12"
      "a13 b13 c13 d13"
      "a14 b14 c14 d14"
      "a15 b15 c15 d15"
      "a16 b16 c16 d16"
      "a17 b17 c17 d17";
  }

  .about-plan__cell[data-area^="e"],
  .about-plan__cell[data-area^="f"] {
    display: none;
  }
}

.about-plan:not(.about-plan--guide) .about-plan__cell,
.about-plan:not(.about-plan--guide) .about-plan__index {
  visibility: hidden;
}

.about-plan__cell {
  display: flex;
  align-items: flex-end;
  min-height: 0;
  padding: 3px 3px;
  border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
  font-family: var(--mono);
  font-size: 11px;
  line-height: 1;
  letter-spacing: 0.04em;
  text-transform: none;
  color: color-mix(in srgb, currentColor 45%, transparent);
  pointer-events: none;
}

.about-plan__index {
  position: absolute;
  top: 12px;
  left: 0;
  z-index: 2;
  margin: 0;
  font-size: 11px;
  line-height: 1;
  pointer-events: none;
}

.about-plan__title {
  grid-column: 1 / 5;
  grid-row: 1;
  z-index: 2;
  align-self: center;
  min-height: 0;
  margin: 0;
  transform: none;
}

.about-plan__title--next {
  grid-row: 7;
}

.about-plan__title--clients {
  grid-row: 11;
}

.about-plan__goo {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}

.about-plan__title--pending {
  visibility: hidden;
}

.about-plan__title :deep(.about-plan__title-word) {
  display: inline-block;
  will-change: filter, opacity;
}

.about-plan--enter .about-plan__figure-img,
.about-plan--enter .about-plan__figure-veil {
  clip-path: inset(0% 0% 100% 0%);
}

.about-plan--enter .about-plan__figure-meta,
.about-plan--enter .about-plan__copy .h6 {
  opacity: 0;
}

.about-plan--enter:not(.about-plan--motion) .about-plan__copy .mono-copy,
.about-plan--enter:not(.about-plan--motion) .about-plan__lead .mono-copy,
.about-plan--enter:not(.about-plan--motion) .about-plan__materials .mono-copy,
.about-plan--enter:not(.about-plan--motion) .about-plan__clients .mono-copy,
.about-plan--enter:not(.about-plan--motion) .about-plan__clients-names .mono-copy {
  visibility: hidden;
}

.about-plan :deep(.about-plan__line-mask) {
  display: block;
  overflow: hidden;
}

.about-plan :deep(.about-plan__clip-line) {
  display: block;
}

@media (prefers-reduced-motion: reduce) {
  .about-plan--enter .about-plan__figure-img,
  .about-plan--enter .about-plan__figure-veil {
    clip-path: none;
  }

  .about-plan--enter .about-plan__copy .mono-copy,
  .about-plan--enter .about-plan__lead .mono-copy,
  .about-plan--enter .about-plan__materials .mono-copy,
  .about-plan--enter .about-plan__clients .mono-copy,
  .about-plan--enter .about-plan__clients-names .mono-copy,
  .about-plan__title--pending {
    visibility: visible;
  }

  .about-plan--enter .about-plan__figure-meta,
  .about-plan--enter .about-plan__copy .h6 {
    opacity: 1;
  }
}

.about-plan__lead {
  grid-column: 2;
  grid-row: 8 / 10;
  z-index: 1;
  min-height: 0;
  margin: 0;
  padding: 0;
}

.about-plan__materials {
  grid-column: 1;
  grid-row: 7;
  z-index: 1;
  min-height: 0;
  margin: 0;
  padding: 0;
}

.about-plan__clients {
  grid-column: 2;
  grid-row: 14 / 15;
  z-index: 1;
  min-height: 0;
  margin: 0;
  padding: 0;
}

.about-plan__clients-names {
  grid-column: 4 / -1;
  grid-row: 12 / 15;
  z-index: 1;
  min-height: 0;
  margin: 0;
  padding: 0;
}

.about-plan__clients-names ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.about-plan__clients-names .mono-copy {
  min-width: 0;
}

.about-plan__copy {
  grid-area: c2;
  position: relative;
  z-index: 1;
  min-height: 0;
  padding: 0;
}

.about-plan__copy .mono-copy {
  /* height: 100%;
  min-height: 0;
  overflow: auto; */
}

.about-plan__mark {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 2px;
  height: 2px;
  background: var(--muted);
  pointer-events: none;
}

.about-plan__figure {
  position: relative;
  z-index: 1;
  min-height: 0;
  margin: 0;
  color: inherit;
  text-decoration: none;
}

.about-plan__figure-veil {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--background-color);
  pointer-events: none;
}

.about-plan__figure--front {
  z-index: 2;
}

/* Landscape tile (4/3), same as the product grid, sitting on the bottom of its cell. */
.about-plan__figure--landscape {
  align-self: end;
  width: 100%;
}

.about-plan__figure--landscape .about-plan__figure-img {
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 3;
}

/* Four columns below 1600, so each span stops at the last column line. */
.about-plan__figure--second {
  grid-column: 3 / -1;
  grid-row: 3 / 6;
}

.about-plan__figure--after {
  grid-column: 3 / -1;
  grid-row: 6 / 8;
}

.about-plan__figure--third {
  grid-column: 4 / -1;
  grid-row: 8 / 10;
}

.about-plan__figure--fourth {
  grid-column: 4 / -1;
  grid-row: 10 / 12;
}

.about-plan__figure--fifth {
  grid-area: 10 / 1 / 13 / 4;
}

@media (min-width: 1600px) {
  .about-plan__figure--second {
    grid-column: 3 / 6;
    grid-row: 4 / 6;
  }

  .about-plan__figure--after {
    grid-column: 6 / 7;
    grid-row: 5 / 6;
  }

  .about-plan__figure--third {
    grid-area: 8 / 4 / 10 / 6;
  }

  .about-plan__figure--fourth {
    grid-area: 14 / 4 / 16 / 7;
  }

  .about-plan__figure--fifth {
    grid-area: 10 / 1 / 13 / 4;
  }

  .about-plan__clients-names {
    grid-column: 5;
    grid-row: 12 / 15;
  }
}

.about-plan__figure-img {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.about-plan__figure-meta {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 0;
  padding: 16px 0;
}

.about-plan__figure-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* —— 01 Opening —— */
.about-open {
  padding: clamp(4rem, 10vw, 7rem) var(--about-gutter) 0;
}

.about-open__copy {
  max-width: 52rem;
  margin-bottom: clamp(2rem, 5vw, 3.5rem);
}

.about-open__title {
  margin: 0 0 clamp(1.25rem, 3vw, 2rem);
  font-size: clamp(2.4rem, 7.5vw, 5.5rem);
  line-height: 1.02;
  font-weight: 400;
  letter-spacing: -0.03em;
  max-width: 14ch;
}

.about-open__hero {
  margin: 0 calc(var(--about-gutter) * -1);
  position: relative;
}

.about-open__hero-img {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  background: var(--sand);
}

.about-open__hero-cap {
  margin: 0.65rem var(--about-gutter) 0;
  font-size: var(--text-xs);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

/* —— 02 What we make —— */
.about-make {
  padding: clamp(4rem, 10vw, 8rem) var(--about-gutter) 0;
}

.about-make__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: clamp(1.5rem, 4vw, 2.5rem);
}

.about-axes {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1rem;
  max-width: 36rem;
  font-size: var(--text-xs);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}

.about-make__copy {
  max-width: 46rem;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  margin-bottom: clamp(2.5rem, 6vw, 4rem);
}

.about-make__copy p {
  margin: 0;
  font-size: clamp(1.05rem, 1.55vw, 1.2rem);
  line-height: 1.45;
}

.about-sheet {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 0.65rem;
  align-items: end;
}

.about-sheet__cell {
  margin: 0;
  grid-column: span 6;
  min-width: 0;
}

.about-sheet__cell--a {
  grid-column: span 4;
}

.about-sheet__cell--b {
  grid-column: span 5;
}

.about-sheet__cell--c {
  grid-column: span 3;
}

.about-sheet__cell--d {
  grid-column: span 7;
}

.about-sheet__cell :deep(.product-card) {
  width: 100%;
  max-width: none;
}

.about-sheet__cell :deep(.product-card__media) {
  width: 100%;
  height: auto;
  aspect-ratio: var(--thumb-ar, 1);
}

.about-sheet__cell :deep(.product-card__image) {
  object-fit: cover;
  object-position: center center;
}

@media (max-width: 799px) {
  .about-sheet {
    grid-template-columns: repeat(6, 1fr);
  }

  .about-sheet__cell,
  .about-sheet__cell--a,
  .about-sheet__cell--b,
  .about-sheet__cell--c,
  .about-sheet__cell--d {
    grid-column: span 3;
  }
}

@media (max-width: 519px) {
  .about-sheet__cell,
  .about-sheet__cell--a,
  .about-sheet__cell--b,
  .about-sheet__cell--c,
  .about-sheet__cell--d {
    grid-column: span 6;
  }
}

/* —— 03 Threshold —— */
.about-threshold {
  padding: clamp(6rem, 16vw, 12rem) var(--about-gutter);
  text-align: left;
  border-block: 1px solid color-mix(in srgb, var(--charcoal) 10%, transparent);
  margin-top: clamp(4rem, 10vw, 7rem);
}

.about-threshold__mark {
  margin: 0 0 1rem;
  font-size: var(--text-xs);
  letter-spacing: 0.12em;
  color: var(--muted);
}

.about-threshold__title {
  margin: 0 0 1rem;
  font-size: clamp(3rem, 10vw, 7rem);
  line-height: 0.95;
  font-weight: 400;
  letter-spacing: -0.035em;
}

.about-threshold__body {
  margin: 0;
  max-width: 28rem;
  font-size: clamp(1.05rem, 1.5vw, 1.2rem);
  line-height: 1.4;
}

/* —— Shared chapters —— */
.about-chapter {
  padding: clamp(4rem, 10vw, 7rem) var(--about-gutter) 0;
}

.about-chapter__head {
  max-width: 42rem;
  margin-bottom: clamp(2rem, 5vw, 3rem);
}

.about-chapter__title {
  margin: 0;
  font-size: clamp(2rem, 5.5vw, 4rem);
  line-height: 1.05;
  font-weight: 400;
  letter-spacing: -0.03em;
}

.about-chapter__lede {
  margin: 1.15rem 0 0;
  font-size: clamp(1.05rem, 1.5vw, 1.2rem);
  line-height: 1.45;
  max-width: 36rem;
}

.about-evidence {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem 1rem;
}

.about-evidence__item {
  margin: 0;
}

.about-evidence__item img {
  display: block;
  width: 100%;
  aspect-ratio: 5 / 4;
  object-fit: cover;
  background: var(--sand);
}

.about-evidence__cap {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin-top: 0.45rem;
  font-size: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

@media (max-width: 799px) {
  .about-evidence {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* —— 05 Archive —— */
.about-chain {
  list-style: none;
  margin: 0 0 2rem;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.25rem;
  font-size: var(--text-xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.about-chain li + li::before {
  content: '→';
  margin-right: 1.25rem;
  opacity: 0.45;
}

.about-archive {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.4rem;
  align-items: end;
}

.about-archive__frag {
  margin: 0;
  grid-column: span 1;
}

.about-archive__frag:nth-child(3n) {
  grid-column: span 2;
}

.about-archive__frag img {
  display: block;
  width: 100%;
  aspect-ratio: var(--ar, 1);
  object-fit: cover;
  background: var(--sand);
}

@media (max-width: 699px) {
  .about-archive {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* —— 06 People —— */
.about-people {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.about-people__fig {
  margin: 0 0 0.65rem;
}

.about-people__fig img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 5;
  object-fit: cover;
  background: var(--sand);
}

.about-people__name,
.about-people__role {
  margin: 0;
  font-size: var(--text-xs);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.about-people__role {
  color: var(--muted);
  margin-top: 0.2rem;
}

@media (max-width: 899px) {
  .about-people {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* —— 07 Start —— */
.about-starts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
}

.about-starts li {
  font-family: var(--serif);
  font-size: clamp(1.6rem, 4vw, 2.75rem);
  line-height: 1.15;
  letter-spacing: -0.025em;
}

/* —— 08 Timeline —— */
.about-years {
  padding: clamp(4rem, 10vw, 7rem) var(--about-gutter) 0;
}

.about-timeline {
  display: flex;
  flex-direction: column;
  gap: clamp(1.25rem, 3vw, 1.75rem);
}

.about-timeline__entry {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr);
  gap: 0.35rem 1.25rem;
  align-items: baseline;
}

.about-timeline__year {
  margin: 0;
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.about-timeline__title {
  margin: 0;
  font-family: var(--serif);
  font-size: clamp(1.2rem, 2vw, 1.5rem);
  font-weight: 400;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.about-timeline__note {
  margin: 0.25rem 0 0;
  max-width: 32rem;
  font-size: var(--text-sm);
  color: color-mix(in srgb, var(--charcoal) 72%, transparent);
}

/* —— Resolve —— */
.about-resolve {
  padding: clamp(5rem, 14vw, 10rem) var(--about-gutter) 0;
  border-top: 1px solid color-mix(in srgb, var(--charcoal) 10%, transparent);
  margin-top: clamp(4rem, 10vw, 7rem);
}

.about-resolve__mark {
  margin: 0 0 1.5rem;
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.about-resolve__nav {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.about-resolve__link {
  font-size: clamp(2rem, 6vw, 4rem);
  line-height: 1.05;
  letter-spacing: -0.03em;
  text-decoration: none;
  color: inherit;
  width: fit-content;
}

.about-resolve__link:hover {
  color: var(--red);
}

@media (prefers-reduced-motion: no-preference) {
  .about-open__title,
  .about-open__hero {
    animation: about-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .about-open__hero {
    animation-delay: 0.16s;
  }

  .about-threshold__title {
    animation: about-rise 1s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
}

@keyframes about-rise {
  from {
    opacity: 0;
    transform: translateY(1.1rem);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
