<template>
  <div>
    <section v-if="page?.introText" class="home-intro section">
      <p class="home-intro__text  interface">{{ page.introText }}</p>
    </section>
    <ProductGrid :items="discoveryItems" :filter-labels="filterLabels" />
  </div>
</template>

<script setup lang="ts">
import { discoveryFilterLabels } from '~/composables/useLibraryCatalog'

const homeQuery = `*[_type == "homePage"][0] {
  seoTitle,
  seoDescription,
  introText,
  filterLabels
}`

const { discoveryItems } = await useLibraryCatalog()

const { data: homeData } = await useAsyncData('homePage', () =>
  $fetch('/api/sanity/query', { method: 'POST', body: { query: homeQuery } })
    .then((r: { result?: unknown }) => r?.result ?? null)
    .catch(() => null),
)

const page = computed(() => homeData.value)
const filterLabels = computed(() =>
  Array.isArray(page.value?.filterLabels) && page.value.filterLabels.length
    ? page.value.filterLabels
    : discoveryFilterLabels,
)

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
