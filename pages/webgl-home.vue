<template>
  <div class="webgl-home-page">
    <LabSubnav />
    <LabFeatured :slugs="['bauhinia-artwork']" />
    <WebglHome />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  pageTransition: false,
})

useHead({
  title: 'WebGL home — Studio Based Upon',
  bodyAttrs: {
    class: 'webgl-home-lab-active',
  },
})
</script>

<style>
body.webgl-home-lab-active #app {
  padding-left: 0;
  padding-bottom: 0;
}
</style>

<style scoped>
.webgl-home-page {
  min-height: 100dvh;
  background: transparent;
}
</style>
