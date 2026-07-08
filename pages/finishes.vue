<template>
  <article class="section">
    <h1 class="page-title">{{ page?.heroTitle || 'Finishes' }}</h1>
    <p v-if="page?.heroSubtitle" class="prose">{{ page.heroSubtitle }}</p>

    <div class="finishes-grid">
      <div
        v-for="(finish, index) in finishes"
        :key="index"
        class="finish-card"
      >
        <img v-if="finish.imageUrl" :src="finish.imageUrl" :alt="finish.name" />
        <div v-else class="finish-card__placeholder" />
        <h2 class="serif-italic">{{ finish.name }}</h2>
        <p v-if="finish.description">{{ finish.description }}</p>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
const DEFAULT_FINISHES = [
  { name: 'Camona Gold' },
  { name: 'Camona Bronze' },
  { name: 'Camona Pink Nickel' },
  { name: 'Camona Silver' },
]

const query = `*[_type == "finishesPage"][0] {
  seoTitle,
  heroTitle,
  heroSubtitle,
  finishes[] {
    name,
    description,
    image { asset-> { url } }
  }
}`

const { data: page } = await useAsyncData('finishesPage', () =>
  $fetch('/api/sanity/query', { method: 'POST', body: { query } })
    .then((r: { result?: unknown }) => r?.result ?? null)
    .catch(() => null),
)

const { imageUrl } = useSanityImage()

const finishes = computed(() => {
  const fromCms = page.value?.finishes
  if (Array.isArray(fromCms) && fromCms.length) {
    return fromCms.map((f: { name: string; description?: string; image?: unknown }) => ({
      name: f.name,
      description: f.description,
      imageUrl: imageUrl(f.image as { asset?: { url?: string } }),
    }))
  }
  return DEFAULT_FINISHES
})

useHead(() => ({
  title: page.value?.seoTitle || 'Finishes — Studio Based Upon',
}))
</script>

<style scoped>
.finishes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.finish-card img,
.finish-card__placeholder {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  background: var(--sand);
  border: 1px solid var(--grid-line);
}

.finish-card h2 {
  font-size: var(--text-lg);
  margin: 0.75rem 0 0.35rem;
}

.finish-card p {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--muted);
}
</style>
