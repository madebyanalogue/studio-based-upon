<template>
  <div class="d1-page">
    <LabSubnav />
    <ClientOnly>
      <D3Field :items="discoveryItems" />
      <template #fallback>
        <div class="d1-page__fallback" aria-hidden="true" />
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
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
  title: 'D1 — Studio Based Upon',
  bodyAttrs: {
    class: 'd1-active',
  },
}))
</script>

<style scoped>
.d1-page,
.d1-page__fallback {
  height: 100dvh;
  background: var(--cream);
}
</style>

<style>
html:has(body.d1-active),
body.d1-active {
  overflow: hidden;
  overscroll-behavior: none;
}
</style>
