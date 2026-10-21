<template>
  <div class="d3-page">
    <ClientOnly>
      <D3Tunnel :items="discoveryItems" :start-scroll="1700" ratio="7:9" />
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
  background: var(--cream);
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
