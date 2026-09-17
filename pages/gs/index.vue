<template>
  <div class="gs-page">
    <header class="gs-page__header">
      <h1 class="gs-page__title">{{ page?.heroTitle || 'GS' }}</h1>
      <p v-if="page?.heroSubtitle" class="gs-page__intro">{{ page.heroSubtitle }}</p>
    </header>

    <div v-if="splats.length" class="gs-page__layout">
      <aside class="gs-page__rail" aria-label="Splat models">
        <ul class="gs-page__list">
          <li v-for="splat in splats" :key="splat._id">
            <button
              type="button"
              class="gs-page__thumb interface"
              :class="{ 'gs-page__thumb--active': splat._id === activeId }"
              @click="activeId = splat._id"
            >
              <span class="gs-page__thumb-media">
                <img
                  v-if="posterUrl(splat)"
                  :src="posterUrl(splat)"
                  :alt="splat.title"
                  loading="lazy"
                  draggable="false"
                />
                <span v-else class="gs-page__thumb-fallback" aria-hidden="true" />
              </span>
              <span class="gs-page__thumb-label">{{ splat.title }}</span>
            </button>
          </li>
        </ul>
      </aside>

      <section class="gs-page__stage" :aria-label="active?.title || 'Splat viewer'">
        <div class="gs-page__stage-bar">
          <h2 class="gs-page__stage-title interface">{{ active?.title || '—' }}</h2>
        </div>
        <ClientOnly>
          <GaussianSplatViewer
            v-if="activeSrc"
            :key="activeId || activeSrc"
            :src="activeSrc"
            :camera-up="active?.cameraUp"
            :camera-position="active?.cameraPosition"
            :camera-look-at="active?.cameraLookAt"
          />
          <template #fallback>
            <p class="gs-page__loading interface">Loading viewer…</p>
          </template>
        </ClientOnly>
        <p v-if="active?.description" class="gs-page__caption">{{ active.description }}</p>
      </section>
    </div>

    <div v-else class="gs-page__empty prose">
      <p>
        No splat models yet. In Sanity, create a
        <strong>Gaussian splat</strong>
        with a Cloudflare R2 URL to a
        <code>.ply</code>
        /
        <code>.ksplat</code>
        file. Models appear here automatically; use the
        <strong>Gaussian Splats</strong>
        page list only if you want a curated order.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
type GsSplat = {
  _id: string
  title: string
  slug?: { current?: string } | null
  sourceUrl?: string | null
  fileUrl?: string | null
  description?: string | null
  cameraUp?: number[] | null
  cameraPosition?: number[] | null
  cameraLookAt?: number[] | null
  poster?: { asset?: { url?: string; _id?: string } } | null
}

const pageQuery = `*[_type == "gsPage"][0] {
  seoTitle,
  seoDescription,
  heroTitle,
  heroSubtitle,
  splats[]->{
    _id,
    title,
    slug,
    sourceUrl,
    "fileUrl": file.asset->url,
    description,
    cameraUp,
    cameraPosition,
    cameraLookAt,
    poster { asset->{ _id, url } }
  }
}`

const allSplatsQuery = `*[_type == "gaussianSplat"] | order(title asc) {
  _id,
  title,
  slug,
  sourceUrl,
  "fileUrl": file.asset->url,
  description,
  cameraUp,
  cameraPosition,
  cameraLookAt,
  poster { asset->{ _id, url } }
}`

const [{ data: page }, { data: allSplats }] = await Promise.all([
  useAsyncData('gsPage', () =>
    $fetch('/api/sanity/query', { method: 'POST', body: { query: pageQuery } })
      .then((r: { result?: { splats?: GsSplat[] } | null }) => r?.result ?? null)
      .catch(() => null),
  ),
  useAsyncData('gsAllSplats', () =>
    $fetch('/api/sanity/query', { method: 'POST', body: { query: allSplatsQuery } })
      .then((r: { result?: GsSplat[] | null }) => r?.result ?? [])
      .catch(() => []),
  ),
])

const { imageUrl } = useSanityImage()

const splats = computed((): GsSplat[] => {
  const curated = (page.value?.splats || []).filter((s): s is GsSplat => !!s?._id)
  if (curated.length) return curated
  return (allSplats.value || []).filter((s): s is GsSplat => !!s?._id)
})

const activeId = ref<string | null>(null)

watch(
  splats,
  (list) => {
    if (!list.length) {
      activeId.value = null
      return
    }
    if (!activeId.value || !list.some((s) => s._id === activeId.value)) {
      activeId.value = list[0]._id
    }
  },
  { immediate: true },
)

const active = computed(() => splats.value.find((s) => s._id === activeId.value) || null)

const resolveSrc = (splat: GsSplat | null) =>
  splat?.sourceUrl || splat?.fileUrl || ''

const activeSrc = computed(() => resolveSrc(active.value))

const posterUrl = (splat: GsSplat) => {
  if (!splat.poster?.asset) return ''
  return imageUrl(splat.poster, 480) || splat.poster.asset.url || ''
}

useHead(() => ({
  title: page.value?.seoTitle || 'GS — Studio Based Upon',
  meta: page.value?.seoDescription
    ? [{ name: 'description', content: page.value.seoDescription }]
    : [],
}))
</script>

<style scoped>
.gs-page {
  min-height: calc(100dvh - var(--header-height));
  padding: calc(var(--header-height) + 1.25rem) 0 0;
  display: flex;
  flex-direction: column;
}

.gs-page__header {
  padding: 0 var(--gutter) 1rem;
}

.gs-page__title {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: inherit;
}

.gs-page__intro {
  margin: 0.5rem 0 0;
  max-width: 40rem;
  color: var(--muted);
}

.gs-page__layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(10rem, 14rem) 1fr;
  border-top: 1px solid var(--grid-line);
}

.gs-page__rail {
  border-right: 1px solid var(--grid-line);
  overflow-y: auto;
  scrollbar-width: none;
  max-height: calc(100dvh - var(--header-height) - 5rem);
}

.gs-page__rail::-webkit-scrollbar {
  display: none;
}

.gs-page__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.gs-page__thumb {
  display: grid;
  gap: 0.45rem;
  width: 100%;
  padding: 0.85rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--grid-line);
  border-left: 2px solid transparent;
  color: var(--muted);
  background: transparent;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease;
}

.gs-page__thumb:hover {
  color: var(--charcoal);
}

.gs-page__thumb--active {
  color: var(--charcoal);
  background: color-mix(in srgb, var(--charcoal) 6%, transparent);
  border-left-color: var(--charcoal);
}

.gs-page__thumb-media {
  display: block;
  aspect-ratio: 1;
  overflow: hidden;
  background: color-mix(in srgb, var(--charcoal) 6%, transparent);
  outline: 1px solid transparent;
  outline-offset: -1px;
  transition: outline-color 0.2s ease;
}

.gs-page__thumb--active .gs-page__thumb-media {
  outline-color: var(--charcoal);
}

.gs-page__thumb-media img,
.gs-page__thumb-fallback {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gs-page__thumb-label {
  font-size: var(--text-sm);
}

.gs-page__thumb--active .gs-page__thumb-label {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.gs-page__stage {
  position: relative;
  min-height: 70dvh;
  display: flex;
  flex-direction: column;
}

.gs-page__stage-bar {
  flex-shrink: 0;
  padding: 0.75rem var(--gutter);
  border-bottom: 1px solid var(--grid-line);
}

.gs-page__stage-title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: inherit;
  color: var(--charcoal);
}

.gs-page__stage :deep(.gs-viewer) {
  flex: 1;
  min-height: 70dvh;
}

.gs-page__caption {
  margin: 0;
  padding: 0.85rem var(--gutter);
  border-top: 1px solid var(--grid-line);
  color: var(--muted);
  font-size: var(--text-sm);
}

.gs-page__loading,
.gs-page__empty {
  margin: 0;
  padding: 2rem var(--gutter);
  color: var(--muted);
}

@media (max-width: 800px) {
  .gs-page__layout {
    grid-template-columns: 1fr;
  }

  .gs-page__rail {
    max-height: none;
    border-right: 0;
    border-bottom: 1px solid var(--grid-line);
  }

  .gs-page__list {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(7rem, 9rem);
    overflow-x: auto;
    scrollbar-width: none;
  }

  .gs-page__thumb {
    border-bottom: 0;
    border-right: 1px solid var(--grid-line);
  }
}
</style>
