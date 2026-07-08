<template>
  <div>
    <section v-if="page?.introText" class="home-intro section">
      <p class="home-intro__text serif-italic">{{ page.introText }}</p>
    </section>
    <ProductGrid :items="gridItems" :filter-labels="page?.filterLabels" />
  </div>
</template>

<script setup lang="ts">
import { DEMO_GRID_ITEMS } from '~/composables/demoData'

const gridQuery = `*[_type == "gridItem"] | order(orderRank) {
  _id,
  title,
  slug,
  itemType,
  categories,
  image { asset-> { _id, url } },
  linkType,
  externalUrl,
  project->{ slug }
}`

const homeQuery = `*[_type == "homePage"][0] {
  seoTitle,
  seoDescription,
  introText,
  filterLabels
}`

const [{ data: homeData }, { data: gridData }] = await Promise.all([
  useAsyncData('homePage', () =>
    $fetch('/api/sanity/query', { method: 'POST', body: { query: homeQuery } })
      .then((r: { result?: unknown }) => r?.result ?? null)
      .catch(() => null),
  ),
  useAsyncData('gridItems', () =>
    $fetch('/api/sanity/query', { method: 'POST', body: { query: gridQuery } })
      .then((r: { result?: unknown }) => r?.result ?? null)
      .catch(() => null),
  ),
])

const page = computed(() => homeData.value)
const gridItems = computed(() => (Array.isArray(gridData.value) && gridData.value.length ? gridData.value : DEMO_GRID_ITEMS))

useHead(() => ({
  title: page.value?.seoTitle || 'Studio Based Upon',
  meta: page.value?.seoDescription
    ? [{ name: 'description', content: page.value.seoDescription }]
    : [],
}))
</script>

<style scoped>
.home-intro {
  text-align: center;
  padding-bottom: 0;
}

.home-intro__text {
  max-width: 40rem;
  margin: 0 auto;
  font-size: var(--text-lg);
  color: var(--muted);
}
</style>
