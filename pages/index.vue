<template>
  <div class="home-page">
    <ClientOnly>
      <InfiniteSplitSlider :slides="page.slides" />
      <template #fallback>
        <div class="home-page__fallback" aria-hidden="true" />
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
const { page } = await useInfiniteSlider()

useHead(() => ({
  title: page.value.seoTitle || 'Studio Based Upon',
  meta: page.value.seoDescription
    ? [{ name: 'description', content: page.value.seoDescription }]
    : [],
  bodyAttrs: {
    class: 'infinite-slider-active',
  },
}))
</script>

<style scoped>
.home-page {
  min-height: 100dvh;
  background: #000;
}

.home-page__fallback {
  min-height: 100dvh;
  background: #000;
}
</style>

<style>
html.infinite-slider-active,
body.infinite-slider-active {
  background: #000;
}

body.infinite-slider-active .page-wrapper {
  min-height: 100dvh;
  padding: 0;
}
</style>
