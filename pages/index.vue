<template>
  <div class="home-page">
    <ShowcaseCarousel :slides="slides" :interval-ms="carouselIntervalMs" />
  </div>
</template>

<script setup lang="ts">
const { page, slides, carouselIntervalMs } = await useShowcaseCatalog()

useHead(() => ({
  title: page.value?.seoTitle || 'Showcase — Studio Based Upon',
  meta: page.value?.seoDescription
    ? [{ name: 'description', content: page.value.seoDescription }]
    : [],
}))
</script>

<style scoped>
.home-page {
  background: var(--cream);
}
</style>
