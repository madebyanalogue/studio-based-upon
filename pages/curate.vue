<template>
  <div class="curate-page">
    <ClientOnly>
      <CurateReels ref="reelsEl" :buckets="buckets" />
      <template #fallback>
        <div class="curate-page__fallback" aria-hidden="true" />
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  pageTransition: false,
})

const { buckets, page } = await useShowcaseCatalog()
const reelsEl = ref<{ playLeave: () => Promise<void> } | null>(null)

onBeforeRouteLeave(async () => {
  await reelsEl.value?.playLeave()
})

useHead(() => ({
  title: page.value?.seoTitle || 'Curate — Studio Based Upon',
  meta: page.value?.seoDescription
    ? [{ name: 'description', content: page.value.seoDescription }]
    : [],
  htmlAttrs: {
    class: 'dark',
  },
}))
</script>

<style scoped>
.curate-page {
  min-height: 100dvh;
  background: var(--cream);
}

.curate-page__fallback {
  height: 100dvh;
  background: var(--cream);
}
</style>
