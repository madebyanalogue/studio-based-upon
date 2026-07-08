<template>
  <article class="precrafted">
    <header class="precrafted__hero section">
      <h1 class="page-title">{{ page?.heroTitle || '(Pre)Crafted' }}</h1>
      <p class="precrafted__lede">
        (Pre)Crafted transforms architectural spaces at scale, creating one flowing installation
        every time. Vast proportions and unique, unrepeated panels enable entire spaces to be
        crafted with bespoke architectural purity.
      </p>
    </header>

    <section class="precrafted__block section">
      <p class="precrafted__eyebrow serif-italic">Origin</p>
      <h2 class="precrafted__heading">Story. Origin. Meaning.</h2>
      <div class="prose">
        <p>
          Over two decades, Based Upon has combined material experimentation with an archive of
          textures, patterns and details gathered on journeys in landscape.
        </p>
        <p>
          Now, this material alchemy is available through Studio Based Upon in (Pre)Crafted form.
        </p>
      </div>
    </section>

    <section class="precrafted__block section">
      <h2 class="precrafted__heading">Materiality in dialogue with light</h2>
      <div class="prose">
        <p>
          Tones, depths and textures subtly transform as light engages with the surface. From the
          natural transitions of daylight to the precision of artificial illumination, each
          (Pre)Crafted panel holds not one expression, but many.
        </p>
      </div>
    </section>

    <section class="precrafted__block section">
      <p class="precrafted__eyebrow serif-italic">Panel+</p>
      <h2 class="precrafted__heading">Beyond the edge of a panel</h2>
      <div class="prose">
        <p>
          Panel+ reflects our commitment beyond the edge of a panel. With Panel+, Studio Based
          Upon offers a design and fabrication solution, creating additional bespoke elements to
          resolve the unique challenges of each space.
        </p>
        <p class="precrafted__tagline serif-italic">The meeting of efficiency and artistry.</p>
      </div>
    </section>

    <section class="precrafted__block section">
      <h2 class="precrafted__heading">Finishes</h2>
      <ul class="precrafted__finishes">
        <li v-for="finish in finishes" :key="finish">{{ finish }}</li>
      </ul>
    </section>

    <section class="precrafted__info section">
      <h2 class="precrafted__heading">Info</h2>

      <div class="precrafted__info-block">
        <h3 class="precrafted__subheading serif-italic">Panel Sizes &amp; Trade Launch Pricing</h3>
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
        <h3 class="precrafted__subheading serif-italic">Lead Times</h3>
        <p>
          Typical lead times are approx. 6–8 weeks (subject to production schedule at the time)
          with larger orders requiring longer to prepare. Please contact us about your project for
          more specific timings.
        </p>
      </div>

      <div class="precrafted__info-block">
        <h3 class="precrafted__subheading serif-italic">Install</h3>
        <p>
          The edges are black to create a shadow gap detail between panels. We recommend a
          mechanical fixing system such as split battens to allow for adjustment during fitting.
        </p>
        <p>
          Speak to your appointed contractor to check specific requirements for your project or
          please
          <NuxtLink to="/contact" class="precrafted__link">contact us</NuxtLink>
          for further advice.
        </p>
      </div>
    </section>
  </article>
</template>

<script setup lang="ts">
const query = `*[_type == "preCraftedPage"][0] {
  seoTitle,
  heroTitle,
  heroSubtitle,
  panelSizes[] { dimensions, price }
}`

const { data: page } = await useAsyncData('preCraftedPage', () =>
  $fetch('/api/sanity/query', { method: 'POST', body: { query } })
    .then((r: { result?: unknown }) => r?.result ?? null)
    .catch(() => null),
)

const DEFAULT_PANEL_SIZES = [
  { dimensions: '3200mm x 1200mm x 20mm', price: '£3,830/panel (approx. £995m²)' },
  { dimensions: '2400mm x 1200mm x 20mm', price: '£2,870/panel (approx. £995m²)' },
]

const panelSizes = computed(() =>
  page.value?.panelSizes?.length ? page.value.panelSizes : DEFAULT_PANEL_SIZES,
)

const finishes = ['Camona Gold', 'Camona Bronze', 'Camona Pink Nickel', 'Camona Silver']

useHead(() => ({
  title: page.value?.seoTitle || '(Pre)Crafted — Studio Based Upon',
}))
</script>

<style scoped>
.precrafted {
  padding-bottom: 5rem;
}

.precrafted__hero {
  padding-bottom: 1rem;
}

.precrafted__lede {
  max-width: 44rem;
  font-size: var(--text-xl);
  line-height: 1.4;
}

.precrafted__block,
.precrafted__info {
  padding-top: 2.5rem;
  padding-bottom: 0;
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
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
</style>
