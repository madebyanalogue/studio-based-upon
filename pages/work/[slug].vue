<template>
  <article v-if="project" class="section project">
    <header class="project__header">
      <h1 class="page-title">{{ project.title }}</h1>
      <dl class="project__meta">
        <div v-if="project.year">
          <dt>Year</dt>
          <dd>{{ project.year }}</dd>
        </div>
        <div v-if="project.materiality">
          <dt>Materiality</dt>
          <dd>{{ project.materiality }}</dd>
        </div>
        <div v-if="project.commissionedBy">
          <dt>Commissioned by</dt>
          <dd>{{ project.commissionedBy }}</dd>
        </div>
        <div v-if="project.dimensions">
          <dt>Dimensions</dt>
          <dd>{{ project.dimensions }}</dd>
        </div>
        <div v-if="project.weight">
          <dt>Weight</dt>
          <dd>{{ project.weight }}</dd>
        </div>
      </dl>
    </header>

    <img
      v-if="heroImage"
      :src="heroImage"
      :alt="project.title"
      class="project__hero"
    />

    <p v-if="project.description" class="prose">{{ project.description }}</p>

    <div v-if="gallery.length" class="project__gallery">
      <img v-for="(src, i) in gallery" :key="i" :src="src" :alt="`${project.title} ${i + 1}`" />
    </div>
  </article>
</template>

<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug as string
const { imageUrl } = useSanityImage()

const query = `*[_type == "project" && slug.current == $slug][0] {
  title,
  year,
  materiality,
  commissionedBy,
  dimensions,
  weight,
  description,
  featuredImage { asset-> { url } },
  gallery[] { asset-> { url } },
  downloads[] { label, file { asset-> { url } } }
}`

const { data: project } = await useAsyncData(`project-${slug}`, () =>
  $fetch('/api/sanity/query', {
    method: 'POST',
    body: { query, params: { slug } },
  })
    .then((r: { result?: unknown }) => r?.result ?? null)
    .catch(() => null),
)

const heroImage = computed(() => imageUrl(project.value?.featuredImage, 1600))
const gallery = computed(() =>
  (project.value?.gallery || [])
    .map((img: unknown) => imageUrl(img as { asset?: { url?: string } }, 1200))
    .filter(Boolean),
)

useHead(() => ({
  title: project.value?.title ? `${project.value.title} — Studio Based Upon` : 'Selected Work',
}))
</script>

<style scoped>
.project__meta {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem 2rem;
  margin: 0 0 2rem;
}

.project__meta div {
  display: grid;
  gap: 0.15rem;
}

.project__meta dt {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
}

.project__meta dd {
  margin: 0;
}

.project__hero {
  width: 100%;
  max-height: 70vh;
  object-fit: cover;
  margin-bottom: 2rem;
  border: 1px solid var(--grid-line);
}

.project__gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-top: 2rem;
}

.project__gallery img {
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: cover;
  border: 1px solid var(--grid-line);
}
</style>
