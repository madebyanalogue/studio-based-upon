<template>
  <div class="curate-page">
    <ClientOnly>
      <CurateReels :buckets="buckets" />
      <template #fallback>
        <div class="curate-page__fallback" aria-hidden="true" />
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
const { buckets, page } = await useShowcaseCatalog()

useHead(() => ({
  title: page.value?.seoTitle || 'Curate — Studio Based Upon',
  meta: page.value?.seoDescription
    ? [{ name: 'description', content: page.value.seoDescription }]
    : [],
}))
</script>

<style scoped>
.curate-page {
  min-height: 100dvh;
  background: var(--cream);
}

.curate-page__fallback {
  height: 100dvh;
  background: var(--cream);
}
</style>
