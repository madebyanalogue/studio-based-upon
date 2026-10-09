<template>
  <div class="d2-page">
    <ClientOnly>
      <D2Field :items="fieldItems" />
      <template #fallback>
        <div class="d2-page__fallback" aria-hidden="true" />
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
const EXCLUDED_TYPES = new Set(['spirit'])

const { discoveryItems: catalogItems } = await useLibraryCatalog()

const fieldItems = computed(() =>
  catalogItems.value.filter((item) => {
    const keys = [item.category, ...(item.categories || [])]
      .map((value) => String(value || '').trim().toLowerCase().replace(/[^a-z]/g, ''))
      .filter(Boolean)
    return !keys.some((key) => EXCLUDED_TYPES.has(key))
  }),
)

useHead(() => ({
  title: 'D2 — Studio Based Upon',
  bodyAttrs: {
    class: 'd2-active',
  },
}))
</script>

<style scoped>
.d2-page,
.d2-page__fallback {
  height: 100dvh;
  background: var(--cream);
}
</style>

<style>
html:has(body.d2-active),
body.d2-active {
  overflow: hidden;
  overscroll-behavior: none;
}
</style>
