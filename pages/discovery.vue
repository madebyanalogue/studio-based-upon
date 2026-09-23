<template>
  <div class="home-discover">
    <ClientOnly>
      <InfiniteDiscoveryCanvas :items="discoveryItems" />
      <template #fallback>
        <div class="home-discover__fallback" aria-hidden="true" />
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
const EXCLUDED_TYPES = new Set(['spirit'])

const homeQuery = `*[_type == "infiniteSliderPage"][0] {
  seoTitle,
  seoDescription
}`

const { discoveryItems: catalogItems } = await useLibraryCatalog()

const discoveryItems = computed(() =>
  catalogItems.value.filter((item) => {
    const keys = [item.category, ...(item.categories || [])]
      .map((value) => String(value || '').trim().toLowerCase().replace(/[^a-z]/g, ''))
      .filter(Boolean)
    return !keys.some((key) => EXCLUDED_TYPES.has(key))
  }),
)

const { data: homeData } = await useAsyncData('discoveryPageSeo', () =>
  $fetch('/api/sanity/query', { method: 'POST', body: { query: homeQuery } })
    .then((r: { result?: unknown }) => r?.result ?? null)
    .catch(() => null),
)

const page = computed(() => homeData.value)

useHead(() => ({
  title: page.value?.seoTitle || 'Discovery — Studio Based Upon',
  meta: page.value?.seoDescription
    ? [{ name: 'description', content: page.value.seoDescription }]
    : [],
}))
</script>

<style scoped>
.home-discover__fallback {
  height: 100dvh;
  background: var(--cream);
}
</style>
