<template>
  <div class="d3-page">
    <ClientOnly>
      <D3Tunnel :items="discoveryItems" preset="columns" auto-play backdrop="webgl" />
      <template #fallback>
        <div class="d3-page__fallback" aria-hidden="true" />
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import D3Tunnel from '~/components/D3Tunnel.vue'

definePageMeta({
  pageTransition: false,
})

const { items: discoveryItems } = await useDiscoveryCatalog()

useHead(() => ({
  title: 'Discover — Studio Based Upon',
  bodyAttrs: {
    class: 'd3-active',
  },
}))
</script>

<style scoped>
.d3-page,
.d3-page__fallback {
  height: 100dvh;
  background: rgba(0, 0, 0, 0.65);
}

.d3-page :deep(.d3-tunnel),
.d3-page :deep(.d3-tunnel--clear) {
  background: rgba(0, 0, 0, 0.65);
}
</style>

<style>
html:has(body.d3-active),
body.d3-active {
  overflow: hidden;
  overscroll-behavior: none;
}

html:has(body.d3-clear),
body.d3-clear,
body.d3-clear #app,
body.d3-clear .page-wrapper,
body.d3-clear .d3-page,
body.d3-clear .d3-page__fallback {
  background: transparent;
}
</style>
