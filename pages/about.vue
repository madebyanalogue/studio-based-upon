<template>
  <article class="about">
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
        <div class="about-open__body">
          <p>
            We are a team of designers, surface specialists and master fabricators,
            bringing together more than two decades of knowledge gained through
            envisioning, designing, crafting and making within Based Upon’s pioneering
            workshop.
          </p>
          <p>
            We collaborate with visionary designers and architects to realise
            extraordinary bodies of work for the world’s largest yachts, finest private
            residences, prestigious hotels, restaurants and fashion houses.
          </p>
        </div>
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
          <strong>Our work moves freely between the intricate and the monumental.</strong>
          We create unfathomable surfaces and singular objects as well as large-scale
          integrated artworks, architectural interventions and monolithic forms, bringing
          the same intensity of attention to every scale.
        </p>
        <p>
          <strong>Our practice is rooted in curiosity, experimentation and a deep knowledge of materials.</strong>
          Part atelier, part laboratory, the studio is a place where ideas are explored
          through making, where the hand meets the algorithm, and where traditional craft
          sits alongside advanced processes and emerging technologies.
        </p>
      </div>

      <div class="about-sheet" role="list" aria-label="Work and process evidence">
        <figure
          v-for="(cell, i) in sheetCells"
          :key="cell.id"
          class="about-sheet__cell"
          :class="`about-sheet__cell--${cell.size}`"
          role="listitem"
        >
          <img
            :src="cell.src"
            :alt="cell.alt"
            loading="lazy"
            decoding="async"
            :width="cell.w"
            :height="cell.h"
          />
          <figcaption class="about-sheet__cap interface">
            <span>{{ String(i + 1).padStart(2, '0') }}</span>
            <span>{{ cell.label }}</span>
          </figcaption>
        </figure>
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
      <div class="about-archive" role="list" aria-label="Archive fragments">
        <figure
          v-for="frag in archiveFrags"
          :key="frag.id"
          class="about-archive__frag"
          :style="{ '--ar': frag.ar }"
          role="listitem"
        >
          <img :src="frag.src" :alt="frag.alt" loading="lazy" decoding="async" />
        </figure>
      </div>
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
          :class="`about-timeline__entry--${entry.weight}`"
          role="listitem"
        >
          <p class="about-timeline__year interface">{{ entry.year }}</p>
          <figure v-if="entry.src" class="about-timeline__media">
            <img :src="entry.src" :alt="entry.title" loading="lazy" decoding="async" />
          </figure>
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
type SheetCell = {
  id: string
  src: string
  alt: string
  label: string
  size: 'a' | 'b' | 'c' | 'd'
  w: number
  h: number
}

const seed = (key: string, w: number, h: number) =>
  `https://picsum.photos/seed/sba-about-${key}/${w}/${h}`

const query = `*[_type == "aboutPage"][0] {
  seoTitle,
  seoDescription,
  heroTitle,
  heroSubtitle,
  tagline,
  heroImage { asset->{ url, _id } }
}`

const workQuery = `*[_type == "gridItem" && defined(gallery[0].asset)] | order(orderRank) [0...14] {
  _id,
  title,
  "src": gallery[0].asset->url
}`

const { data: page } = await useAsyncData('aboutPage-v2', () =>
  $fetch('/api/sanity/query', { method: 'POST', body: { query } })
    .then((r: { result?: Record<string, unknown> | null }) => r?.result ?? null)
    .catch(() => null),
)

const { data: workImages } = await useAsyncData('aboutWorkSheet', () =>
  $fetch('/api/sanity/query', { method: 'POST', body: { query: workQuery } })
    .then((r: { result?: Array<{ _id: string; title?: string; src?: string }> }) =>
      Array.isArray(r?.result) ? r.result : [],
    )
    .catch(() => [] as Array<{ _id: string; title?: string; src?: string }>),
)

const { imageUrl, getImageSrc } = useSanityImage()

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
const labels = [
  'Surface detail',
  'Object',
  'Installation',
  'Material',
  'Hand process',
  'CNC',
  'Drawing',
  'Prototype',
  'Experiment',
  'Architecture',
  'Finish',
  'Form',
]

const sheetCells = computed((): SheetCell[] => {
  const fromCms = (workImages.value || []).filter((item) => item.src)
  const cells: SheetCell[] = []
  for (let i = 0; i < 12; i += 1) {
    const size = sizes[i]!
    const dims =
      size === 'a'
        ? { w: 1200, h: 1600 }
        : size === 'b'
          ? { w: 1600, h: 1200 }
          : size === 'c'
            ? { w: 900, h: 900 }
            : { w: 1800, h: 1100 }
    const cms = fromCms[i]
    cells.push({
      id: cms?._id || `sheet-${i}`,
      src: cms?.src
        ? `${cms.src}?w=${dims.w}&auto=format&q=80`
        : seed(`sheet-${i}`, dims.w, dims.h),
      alt: cms?.title || labels[i]!,
      label: labels[i]!,
      size,
      ...dims,
    })
  }
  return cells
})

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
  { year: '2004', title: 'Studio begins', note: 'London workshop founded.', weight: 'lg', src: seed('y-2004', 1600, 1000) },
  { year: '2007', title: 'Early liquid metal', note: 'Surface experiments enter the archive.', weight: 'sm', src: seed('y-2007', 900, 1100) },
  { year: '2011', title: 'Monumental commission', note: 'Scale jumps; process deepens.', weight: 'md', src: seed('y-2011', 1400, 900) },
  { year: '2014', title: 'Material breakthrough', note: 'Tramazite and allied innovations.', weight: 'md', src: seed('y-2014', 1200, 1200) },
  { year: '2017', title: 'Failed / kept', note: 'Unresolved experiments retained as knowledge.', weight: 'sm', src: seed('y-2017', 800, 1000) },
  { year: '2019', title: 'Atelier × algorithm', note: 'CNC and craft in the same room.', weight: 'md', src: seed('y-2019', 1500, 1000) },
  { year: '2022', title: 'Global residences & yachts', note: 'Work across private and maritime contexts.', weight: 'lg', src: seed('y-2022', 1800, 1100) },
  { year: '2026', title: 'Studio Based Upon', note: 'Twenty years of accumulated making.', weight: 'lg', src: seed('y-2026', 1600, 1200) },
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

/* —— 01 Opening —— */
.about-open {
  padding: calc(var(--header-height) + clamp(2rem, 5vw, 3.5rem)) var(--about-gutter) 0;
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

.about-open__body {
  max-width: var(--about-measure);
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.about-open__body p {
  margin: 0;
  font-size: clamp(1.05rem, 1.6vw, 1.25rem);
  line-height: 1.45;
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

.about-make__copy strong {
  font-weight: 400;
  font-family: var(--serif);
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

.about-sheet__cell img {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: auto;
  object-fit: cover;
  background: var(--sand);
}

.about-sheet__cell--a img {
  aspect-ratio: 3 / 4;
}

.about-sheet__cell--b img {
  aspect-ratio: 4 / 3;
}

.about-sheet__cell--c img {
  aspect-ratio: 1;
}

.about-sheet__cell--d img {
  aspect-ratio: 16 / 10;
}

.about-sheet__cap {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.4rem;
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
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
  gap: clamp(2rem, 5vw, 3.5rem);
}

.about-timeline__entry {
  display: grid;
  gap: 0.75rem 1.5rem;
  align-items: start;
}

.about-timeline__year {
  margin: 0;
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.about-timeline__media {
  margin: 0;
}

.about-timeline__media img {
  display: block;
  width: 100%;
  max-width: 42rem;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  background: var(--sand);
}

.about-timeline__entry--sm .about-timeline__media img {
  max-width: 18rem;
  aspect-ratio: 4 / 5;
}

.about-timeline__entry--md .about-timeline__media img {
  max-width: 28rem;
}

.about-timeline__title {
  margin: 0;
  font-family: var(--serif);
  font-size: clamp(1.35rem, 2.5vw, 1.85rem);
  font-weight: 400;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.about-timeline__note {
  margin: 0.4rem 0 0;
  max-width: 28rem;
  color: color-mix(in srgb, var(--charcoal) 72%, transparent);
}

@media (min-width: 900px) {
  .about-timeline__entry--lg {
    grid-template-columns: 5rem 1.2fr 0.8fr;
  }

  .about-timeline__entry--md {
    grid-template-columns: 5rem minmax(0, 28rem) 1fr;
  }

  .about-timeline__entry--sm {
    grid-template-columns: 5rem minmax(0, 18rem) 1fr;
    padding-left: 8vw;
  }
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
  .about-open__body,
  .about-open__hero {
    animation: about-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .about-open__body {
    animation-delay: 0.08s;
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
