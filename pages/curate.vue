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

onBeforeRouteLeave(async (to, from) => {
  if (isOverlayHistoryRestore() || to.path === from.path) return
  await reelsEl.value?.playLeave()
})

useHead(() => ({
  title: page.value?.seoTitle && !/^curate\b/i.test(page.value.seoTitle)
    ? page.value.seoTitle
    : 'Pairings — Studio Based Upon',
  meta: page.value?.seoDescription
    ? [{ name: 'description', content: page.value.seoDescription }]
    : [],
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
