<template>
  <div class="d3-page">
    <ClientOnly>
      <D3Tunnel :items="discoveryItems" />
      <template #fallback>
        <div class="d3-page__fallback" aria-hidden="true" />
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import D3Tunnel from '~/components/D3Tunnel.vue'

const INCLUDED_TYPES = new Set(['forms', 'surface', 'decorative', 'spirit', 'origin'])

const { discoveryItems: catalogItems } = await useLibraryCatalog()

const discoveryItems = computed(() =>
  catalogItems.value.filter((item) => {
    if (item.precrafted) return false
    const keys = [item.category, ...(item.categories || [])]
      .map((value) => String(value || '').trim().toLowerCase().replace(/[^a-z]/g, ''))
      .filter(Boolean)
    return keys.some((key) => INCLUDED_TYPES.has(key))
  }),
)

useHead(() => ({
  title: 'D3 — Studio Based Upon',
  bodyAttrs: {
    class: 'd3-active',
  },
}))
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
