<template>
  <div class="showcase-page">
    <ClientOnly>
      <ShowcaseReels :buckets="buckets" />
      <template #fallback>
        <div class="showcase-page__fallback" aria-hidden="true" />
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
const { buckets, page } = await useShowcaseCatalog()

useHead(() => ({
  title: page.value?.seoTitle || 'Showcase — Studio Based Upon',
  meta: page.value?.seoDescription
    ? [{ name: 'description', content: page.value.seoDescription }]
    : [],
}))
</script>

<style scoped>
.showcase-page {
  min-height: 100dvh;
  background: var(--cream);
}

.showcase-page__fallback {
  height: 100dvh;
  background: var(--cream);
}
</style>
