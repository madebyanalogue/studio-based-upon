<template>
  <div class="d2-page">
    <ClientOnly>
      <DiscoverySphere />
      <template #fallback>
        <div class="d2-page__fallback" aria-hidden="true" />
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
const phase = useD2Cursor()

onMounted(() => {
  phase.value = 'scroll'
})

onBeforeUnmount(() => {
  phase.value = 'scroll'
})

useHead({
  title: 'D2 — Studio Based Upon',
  bodyAttrs: {
    class: 'd2-active',
  },
})
</script>

<style scoped>
.d2-page,
.d2-page__fallback {
  height: 100dvh;
  background: var(--cream);
}
</style>

<style>
html:has(body.d2-active),
body.d2-active {
  overflow: hidden;
  overscroll-behavior: none;
}
</style>
