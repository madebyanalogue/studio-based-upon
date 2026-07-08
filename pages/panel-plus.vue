<template>
  <article class="section">
    <h1 class="page-title">{{ page?.heroTitle || 'Panel+' }}</h1>
    <p v-if="page?.heroSubtitle" class="prose">{{ page.heroSubtitle }}</p>
    <div class="prose fallback">
      <p>
        Panel+ reflects our commitment beyond the edge of a panel. With Panel+, Studio Based Upon
        offers a design and fabrication solution, creating additional bespoke elements to resolve the
        unique challenges of each space.
      </p>
      <p class="tagline serif-italic">The meeting of efficiency and artistry.</p>
    </div>
  </article>
</template>

<script setup lang="ts">
const query = `*[_type == "panelPlusPage"][0] {
  seoTitle,
  heroTitle,
  heroSubtitle,
  tagline,
  body
}`

const { data: page } = await useAsyncData('panelPlusPage', () =>
  $fetch('/api/sanity/query', { method: 'POST', body: { query } })
    .then((r: { result?: unknown }) => r?.result ?? null)
    .catch(() => null),
)

useHead(() => ({
  title: page.value?.seoTitle || 'Panel+ — Studio Based Upon',
}))
</script>

<style scoped>
.fallback p {
  margin-bottom: 1.25rem;
  color: var(--muted);
}

.tagline {
  font-size: var(--text-xl);
  margin-top: 2rem;
}
</style>
