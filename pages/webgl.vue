<template>
  <WebglScenes />
</template>

<script setup lang="ts">
definePageMeta({
  pageTransition: false,
})

useHead({
  title: 'WebGL layer — Studio Based Upon',
  bodyAttrs: {
    class: 'webgl-layer-active',
  },
})
</script>

<style>
body.webgl-layer-active,
body.webgl-layer-active #app,
body.webgl-layer-active .page-wrapper {
  background: #10100e;
}

body.webgl-layer-active #app {
  padding-left: 0;
  padding-bottom: 0;
}
</style>
