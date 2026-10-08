<template>
  <div class="home-page">
    <ClientOnly>
      <InfiniteSplitSlider
        ref="sliderEl"
        :slides="page.slides"
        :hold-entrance="holdEntrance"
      />
      <template #fallback>
        <div class="home-page__fallback" aria-hidden="true" />
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  pageTransition: false,
})

const { page } = await useInfiniteSlider()
const { phase: introPhase, product: introProduct } = useHomepageIntro()
const holdEntrance = computed(() => introPhase.value === 'cover')
const sliderEl = ref<{ playLeave: () => Promise<void> } | null>(null)

onBeforeRouteLeave(async (to, from) => {
  if (isOverlayHistoryRestore() || to.path === from.path) return
  await sliderEl.value?.playLeave()
})

watch(
  () => page.value.connectedProduct,
  (product) => {
    introProduct.value = product
  },
  { immediate: true },
)

useHead(() => ({
  title: page.value.seoTitle || 'Studio Based Upon',
  meta: page.value.seoDescription
    ? [{ name: 'description', content: page.value.seoDescription }]
    : [],
  bodyAttrs: {
    class: 'infinite-slider-active',
  },
}))
</script>

<style scoped>
.home-page {
  min-height: 100dvh;
  background: var(--cream);
}

.home-page__fallback {
  min-height: 100dvh;
  background: var(--cream);
}
</style>

<style>
html.infinite-slider-active,
body.infinite-slider-active {
  background: var(--cream);
}

body.infinite-slider-active .page-wrapper {
  min-height: 100dvh;
  padding: 0;
}
</style>
