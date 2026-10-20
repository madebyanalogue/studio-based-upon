<template>
  <div>
    <LabSubnav />
    <LabFeatured
      :slugs="['magnolia-artwork', 'leaf-cabinet']"
      light
    />
    <WebglMetallic />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  pageTransition: false,
})

useHead({
  title: 'WebGL metallic — Studio Based Upon',
  bodyAttrs: {
    class: 'webgl-metallic-active',
  },
})
</script>

<style>
body.webgl-metallic-active,
body.webgl-metallic-active #app,
body.webgl-metallic-active .page-wrapper {
  background: #dddcd7;
}

html.dark body.webgl-metallic-active,
html.dark body.webgl-metallic-active #app,
html.dark body.webgl-metallic-active .page-wrapper {
  background: #111111;
}

body.webgl-metallic-active #app {
  padding-left: 0;
  padding-bottom: 0;
}
</style>
