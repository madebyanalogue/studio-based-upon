<template>
  <div class="infinite-slider-page">
    <ClientOnly>
      <InfiniteSplitSlider :slides="page.slides" />
      <template #fallback>
        <div class="infinite-slider-page__fallback" aria-hidden="true" />
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
const { page } = await useInfiniteSlider()

useHead(() => ({
  title: page.value.seoTitle || 'Infinite Slider — Studio Based Upon',
  meta: page.value.seoDescription
    ? [{ name: 'description', content: page.value.seoDescription }]
    : [],
  bodyAttrs: {
    class: 'infinite-slider-active',
  },
}))
</script>

<style scoped>
.infinite-slider-page {
  min-height: 100dvh;
  background: #000;
}

.infinite-slider-page__fallback {
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
