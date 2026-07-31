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
const homeQuery = `*[_type == "homePage"][0] {
  seoTitle,
  seoDescription,
  introText
}`

const { discoveryItems } = await useLibraryCatalog()

const { data: homeData } = await useAsyncData('homePage', () =>
  $fetch('/api/sanity/query', { method: 'POST', body: { query: homeQuery } })
    .then((r: { result?: unknown }) => r?.result ?? null)
    .catch(() => null),
)

const page = computed(() => homeData.value)

useHead(() => ({
  title: page.value?.seoTitle || 'Studio Based Upon',
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
