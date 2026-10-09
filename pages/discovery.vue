<template>
  <div class="home-discover">
    <ClientOnly>
      <D3Field :items="discoveryItems" />
      <template #fallback>
        <div class="home-discover__fallback" aria-hidden="true" />
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
const INCLUDED_TYPES = new Set(['forms', 'surface', 'decorative', 'spirit', 'origin'])

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
    return keys.some((key) => INCLUDED_TYPES.has(key))
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
  bodyAttrs: {
    class: 'discovery-active',
  },
}))
</script>

<style scoped>
.home-discover,
.home-discover__fallback {
  height: 100dvh;
  background: var(--cream);
}
</style>

<style>
html:has(body.discovery-active),
body.discovery-active {
  overflow: hidden;
  overscroll-behavior: none;
}
</style>
