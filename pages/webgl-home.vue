<template>
  <WebglHome />
</template>

<script setup lang="ts">
definePageMeta({
  pageTransition: false,
})

useHead({
  title: 'WebGL home — Studio Based Upon',
  bodyAttrs: {
    class: 'webgl-layer-active',
  },
})
</script>

<style>
body.webgl-layer-active,
body.webgl-layer-active #app,
body.webgl-layer-active .page-wrapper {
  background: var(--cream);
}

body.webgl-layer-active #app {
  padding-left: 0;
  padding-bottom: 0;
}
</style>
