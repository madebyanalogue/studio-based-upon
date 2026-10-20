<template>
  <div class="webgl-page">
    <LabSubnav />
    <h1 class="webgl-page__title">Animated WebGL</h1>
    <LabFeatured
      :slugs="['fish-shoal-platinum', 'blossom-cabinet']"
      light
    />
    <WebglScenes />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  pageTransition: false,
})

useHead({
  title: 'Animated WebGL — Studio Based Upon',
  bodyAttrs: {
    class: 'webgl-layer-active',
  },
})
</script>

<style>
body.webgl-layer-active,
body.webgl-layer-active #app,
body.webgl-layer-active .page-wrapper {
  background: #dddcd7;
}

body.webgl-layer-active #app {
  padding-left: 0;
  padding-bottom: 0;
}
</style>

<style scoped>
.webgl-page__title {
  position: fixed;
  top: 76px;
  left: 16px;
  z-index: 28;
  margin: 0;
  max-width: min(16rem, calc(100vw - 14rem));
  color: #222;
  font-size: clamp(1.35rem, 2.4vw, 1.85rem);
  font-weight: 500;
  letter-spacing: 0.02em;
  line-height: 1.15;
  pointer-events: none;
}
</style>
