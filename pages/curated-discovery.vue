<template>
  <div class="discover-page">
    <DiscoverHero
      :eyebrow="page.heroEyebrow"
      :title="page.heroTitle"
      :body="page.heroBody"
    />

    <div class="discover-page__content">
      <template v-for="block in page.content" :key="block._key">
        <DiscoverCollectionRail
          v-if="block._type === 'collectionBlock' && block.collection"
          :collection="block.collection"
          :display-mode="block.displayMode"
        />
        <DiscoverStoryBreak
          v-else-if="block._type === 'breakerBlock'"
          :breaker="block"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'curated-discover',
})

const { page } = await useCuratedDiscover()

useHead(() => ({
  title: page.value.seoTitle || 'Curated Discovery — Studio Based Upon',
  meta: page.value.seoDescription
    ? [{ name: 'description', content: page.value.seoDescription }]
    : [],
}))
</script>

<style scoped>
.discover-page {
  padding-bottom: clamp(4rem, 10vw, 8rem);
}

.discover-page__content {
  display: flex;
  flex-direction: column;
}
</style>
