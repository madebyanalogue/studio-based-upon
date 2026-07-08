<template>
  <article class="section">
    <h1 class="page-title">{{ page?.heroTitle || 'About' }}</h1>
    <p v-if="page?.heroSubtitle" class="prose">{{ page.heroSubtitle }}</p>
    <p v-if="page?.tagline" class="tagline serif-italic">{{ page.tagline }}</p>
    <SanityContent v-if="page?.body?.length" :blocks="page.body" class="prose" />
    <div v-else class="prose fallback">
      <p>
        Studio Based Upon creates and constructs bespoke architectural surfaces, furniture and
        sculptural objects, grounded by meticulous workmanship and rich materiality.
      </p>
      <p>
        Our London-based studio designs and manufactures masterful pieces, from intricate wall
        panelling to radical furniture to epic elemental features, each offering meaningful moments
        of reflection.
      </p>
      <p>
        Having pioneered the artistic interpretation of liquid metals, we went on to create
        award-winning material innovations which include Tramazite™.
      </p>
    </div>
  </article>
</template>

<script setup lang="ts">
const query = `*[_type == "aboutPage"][0] {
  seoTitle,
  seoDescription,
  heroTitle,
  heroSubtitle,
  tagline,
  body
}`

const { data: page } = await useAsyncData('aboutPage', () =>
  $fetch('/api/sanity/query', { method: 'POST', body: { query } })
    .then((r: { result?: unknown }) => r?.result ?? null)
    .catch(() => null),
)

useHead(() => ({
  title: page.value?.seoTitle || 'About — Studio Based Upon',
}))
</script>

<style scoped>
.tagline {
  font-size: var(--text-xl);
  margin: 2rem 0;
}

.fallback p {
  margin-bottom: 1.25rem;
}
</style>
