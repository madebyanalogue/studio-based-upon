<template>
  <div class="d4-page">
    <ClientOnly>
      <D4Tunnel :items="discoveryItems" />
      <template #fallback>
        <div class="d4-page__fallback" aria-hidden="true" />
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import D4Tunnel from '~/components/D4Tunnel.vue'

const { items: discoveryItems } = await useDiscoveryCatalog()

useHead(() => ({
  title: 'D4 — Studio Based Upon',
  bodyAttrs: {
    class: 'd4-active',
  },
}))
</script>

<style scoped>
.d4-page,
.d4-page__fallback {
  height: 100dvh;
  background: var(--cream);
}
</style>

<style>
html:has(body.d4-active),
body.d4-active {
  overflow: hidden;
  overscroll-behavior: none;
}

html:has(body.d4-clear),
body.d4-clear,
body.d4-clear #app,
body.d4-clear .page-wrapper,
body.d4-clear .d4-page,
body.d4-clear .d4-page__fallback {
  background: transparent;
}
</style>
