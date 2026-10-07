<template>
  <div class="d3-page">
    <ClientOnly>
      <D3Field :items="discoveryItems" />
      <template #fallback>
        <div class="d3-page__fallback" aria-hidden="true" />
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
const EXCLUDED_TYPES = new Set(['spirit'])

const { discoveryItems: catalogItems } = await useLibraryCatalog()

const discoveryItems = computed(() =>
  catalogItems.value.filter((item) => {
    const keys = [item.category, ...(item.categories || [])]
      .map((value) => String(value || '').trim().toLowerCase().replace(/[^a-z]/g, ''))
      .filter(Boolean)
    return !keys.some((key) => EXCLUDED_TYPES.has(key))
  }),
)

useHead({
  title: 'D3 — Studio Based Upon',
  bodyAttrs: {
    class: 'd3-active',
  },
})
</script>

<style scoped>
.d3-page,
.d3-page__fallback {
  height: 100dvh;
  background: var(--cream);
}
</style>

<style>
html:has(body.d3-active),
body.d3-active {
  overflow: hidden;
  overscroll-behavior: none;
}
</style>
