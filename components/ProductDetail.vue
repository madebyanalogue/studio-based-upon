<template>
  <article v-if="product" class="pdp" :class="{ 'pdp--standalone': standalone }">
    <div class="pdp__gallery">
      <div class="pdp__gallery-scroll">
        <figure
          v-for="(src, i) in activeGallery"
          :key="`${galleryMode}-${i}`"
          class="pdp__figure"
        >
          <img
            :src="src"
            :alt="`${product.title} — ${galleryMode === 'spirit' ? 'spirit' : 'product'} image ${i + 1}`"
            class="pdp__image"
            loading="lazy"
          />
        </figure>
        <p v-if="!activeGallery.length" class="pdp__gallery-empty serif-italic">
          No {{ galleryMode === 'spirit' ? 'spirit' : 'product' }} images available.
        </p>
      </div>

      <div class="pdp__gallery-float">
        <div class="pdp__toggle" role="group" aria-label="Gallery type">
          <button
            type="button"
            class="pdp__toggle-btn serif-italic"
            :class="{ 'pdp__toggle-btn--active': galleryMode === 'product' }"
            :aria-pressed="galleryMode === 'product'"
            @click="galleryMode = 'product'"
          >
            Product
          </button>
          <button
            type="button"
            class="pdp__toggle-btn serif-italic"
            :class="{ 'pdp__toggle-btn--active': galleryMode === 'spirit' }"
            :aria-pressed="galleryMode === 'spirit'"
            @click="galleryMode = 'spirit'"
          >
            Spirit
          </button>
        </div>
      </div>
    </div>

    <div class="pdp__details">
      <div class="pdp__toolbar">
        <button type="button" class="pdp__close serif-italic" @click="$emit('close')">Close</button>

        <div class="pdp__meta serif-italic">
          <span class="pdp__meta-label">Style</span>
          <span class="pdp__meta-value">{{ product.series || 'Objects' }}</span>
        </div>
      </div>

      <div class="pdp__body">
      <h1 class="pdp__title serif-italic">{{ product.title }}</h1>

      <dl class="pdp__specs">
        <div v-if="product.style" class="pdp__spec">
          <dt class="serif-italic">Style</dt>
          <dd>{{ product.style }}</dd>
        </div>
        <div v-if="product.dimensions" class="pdp__spec">
          <dt class="serif-italic">Dimensions</dt>
          <dd>{{ product.dimensions }}</dd>
        </div>
        <div v-if="product.comCol" class="pdp__spec">
          <dt class="serif-italic">COM / COL</dt>
          <dd>{{ product.comCol }}</dd>
        </div>
        <div v-if="materials.length" class="pdp__spec pdp__spec--toggle">
          <dt class="serif-italic">Materials</dt>
          <dd>
            <button type="button" class="pdp__disclosure" @click="showMaterials = !showMaterials">
              Options <span class="pdp__disclosure-mark">{{ showMaterials ? '−' : '+' }}</span>
            </button>
          </dd>
          <ul v-if="showMaterials" class="pdp__options">
            <li v-for="material in materials" :key="material">{{ material }}</li>
          </ul>
        </div>
      </dl>

      <button type="button" class="pdp__inquire" @click="sendEnquiry">Inquire About Product</button>

      <button
        type="button"
        class="pdp__save"
        :class="{ 'pdp__save--active': saved }"
        @click="onToggleHeart"
      >
        {{ saved ? 'Saved to Moodboard' : 'Save to Moodboard' }}
      </button>

      <div class="pdp__links">
        <button type="button" class="pdp__link serif-italic" @click="downloadSpec">
          Download Spec Sheet
        </button>
        <button
          v-if="product.finishes?.length"
          type="button"
          class="pdp__link serif-italic"
          @click="showFinishes = !showFinishes"
        >
          Finishes
        </button>
      </div>

      <ul v-if="showFinishes && product.finishes?.length" class="pdp__finishes">
        <li v-for="finish in product.finishes" :key="finish">{{ finish }}</li>
      </ul>

      <section v-if="product.description || product.edition" class="pdp__info">
        <h2 class="pdp__info-heading serif-italic">info</h2>
        <p v-if="product.description" class="pdp__info-text">{{ product.description }}</p>
        <p v-if="product.edition" class="pdp__info-text">{{ product.edition }}</p>
      </section>

      <div v-if="nextProduct" class="pdp__next">
        <button type="button" class="pdp__next-label serif-italic" @click="goToNext">
          Next Product
        </button>
        <button type="button" class="pdp__next-media" @click="goToNext">
          <img :src="nextImageUrl" :alt="nextProduct.title" />
        </button>
      </div>
      </div>
    </div>
  </article>

  <div v-else class="pdp pdp--missing">
    <h1 class="page-title">Product not found</h1>
    <button type="button" class="pdp__link serif-italic" @click="$emit('close')">Close</button>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    slug: string
    standalone?: boolean
  }>(),
  { standalone: false },
)

const emit = defineEmits<{
  close: []
  navigate: [slug: string]
}>()

const { fetchProduct, getNextProduct } = useProductCatalog()
const { imageUrl } = useSanityImage()
const { requestSave, isSaved } = useBucket()
const { enquiryEmail } = useSiteSettings()

const { data: product, refresh } = await useAsyncData(
  () => `product-detail-${props.slug}`,
  () => fetchProduct(props.slug),
)

const galleryMode = ref<'product' | 'spirit'>('product')
const showMaterials = ref(false)
const showFinishes = ref(false)

const productImages = computed(() => {
  if (!product.value) return [] as string[]

  const urls: string[] = []
  const hero = imageUrl(product.value.image, 1800)
  if (hero) urls.push(hero)

  if (product.value.gallery?.length) {
    product.value.gallery.forEach((img) => {
      const url = imageUrl(img, 1800)
      if (url && !urls.includes(url)) urls.push(url)
    })
  }

  if (urls.length === 1 && hero) {
    return [hero, hero, hero, hero]
  }

  return urls
})

const spiritImages = computed(() => {
  if (!product.value) return [] as string[]

  const urls: string[] = []
  if (product.value.spiritGallery?.length) {
    product.value.spiritGallery.forEach((img) => {
      const url = imageUrl(img, 1800)
      if (url && !urls.includes(url)) urls.push(url)
    })
  }

  if (urls.length) return urls

  // Fallback so the toggle is always meaningful until spirit imagery is set in the CMS
  const seed = product.value.slug || product.value._id
  return [1, 2, 3].map((n) => `https://picsum.photos/seed/sba-spirit-${seed}-${n}/1200/1500?grayscale`)
})

const activeGallery = computed(() =>
  galleryMode.value === 'spirit' ? spiritImages.value : productImages.value,
)

const materials = computed(() =>
  [...(product.value?.materials || product.value?.categories || [])]
    .filter(Boolean)
    .map((m) => m.charAt(0).toUpperCase() + m.slice(1)),
)

const nextProduct = computed(() => (product.value ? getNextProduct(product.value.slug) : null))
const nextImageUrl = computed(() =>
  nextProduct.value ? imageUrl(nextProduct.value.image, 900) : '',
)
const saved = computed(() => (product.value ? isSaved(product.value._id) : false))

const goToNext = () => {
  if (nextProduct.value) emit('navigate', nextProduct.value.slug)
}

const onToggleHeart = () => {
  const heartImage = productImages.value[0]
  if (!product.value || !heartImage) return
  requestSave({
    id: product.value._id,
    title: product.value.title,
    imageUrl: heartImage,
    itemType: product.value.itemType || 'product',
    link: `/products/${product.value.slug}`,
  })
}

const sendEnquiry = () => {
  if (!product.value) return
  const body = encodeURIComponent(
    `Enquiry from Studio Based Upon\n\nProduct: ${product.value.title}\nURL: ${window.location.href}`,
  )
  window.location.href = `mailto:${enquiryEmail.value}?subject=${encodeURIComponent(`Enquiry — ${product.value.title}`)}&body=${body}`
}

const downloadSpec = () => {
  if (!product.value) return
  const lines = [
    `Studio Based Upon — ${product.value.title}`,
    '',
    product.value.series ? `Series: ${product.value.series}` : '',
    product.value.style ? `Style: ${product.value.style}` : '',
    product.value.dimensions ? `Dimensions: ${product.value.dimensions}` : '',
    product.value.comCol ? `COM / COL: ${product.value.comCol}` : '',
    materials.value.length ? `Materials: ${materials.value.join(', ')}` : '',
    product.value.finishes?.length ? `Finishes: ${product.value.finishes.join(', ')}` : '',
    '',
    product.value.description || '',
    product.value.edition || '',
  ].filter(Boolean)

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${product.value.slug}-spec.txt`
  a.click()
  URL.revokeObjectURL(url)
}

watch(
  () => props.slug,
  () => {
    galleryMode.value = 'product'
    showMaterials.value = false
    showFinishes.value = false
    refresh()
  },
)
</script>

<style scoped>
.pdp {
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 100dvh;
  background: var(--cream);
}

.pdp--standalone {
  height: calc(100dvh - var(--header-height));
}

.pdp--missing {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 4rem var(--gutter);
}

.pdp__gallery {
  position: relative;
  height: 100%;
  overflow-y: auto;
  border-right: 1px solid var(--grid-line);
}

.pdp__gallery-scroll {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--grid-line);
}

.pdp__gallery-float {
  position: sticky;
  bottom: 1.5rem;
  z-index: 6;
  display: flex;
  justify-content: center;
  margin-top: -4.5rem;
  padding: 0 var(--gutter);
  pointer-events: none;
}

.pdp__toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.3rem;
  background: var(--warm-white);
  border: 1px solid var(--grid-line);
  border-radius: 999px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.16);
  pointer-events: auto;
}

.pdp__toggle-btn {
  padding: 0.5rem 1.15rem;
  font-size: var(--text-sm);
  color: var(--muted);
  border-radius: 999px;
  transition: color 0.2s ease, background 0.2s ease;
}

.pdp__toggle-btn:hover {
  color: var(--charcoal);
}

.pdp__toggle-btn--active {
  color: var(--warm-white);
  background: var(--charcoal);
}

.pdp__gallery-empty {
  padding: 2rem var(--gutter);
  color: var(--muted);
  background: var(--cream);
}

.pdp__details {
  height: 100%;
  overflow-y: auto;
}

.pdp__toolbar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem var(--gutter);
  background: var(--cream);
  border-bottom: 1px solid var(--grid-line);
}

.pdp__close {
  justify-self: start;
  font-size: var(--text-sm);
  text-decoration: underline;
  text-underline-offset: 4px;
  color: var(--charcoal);
}

.pdp__meta {
  display: inline-flex;
  gap: 1rem;
  font-size: var(--text-sm);
  color: var(--charcoal);
}

.pdp__meta-label {
  color: var(--muted);
}

.pdp__figure {
  margin: 0;
  width: 100%;
  background: var(--warm-white);
}

.pdp__image {
  display: block;
  width: 100%;
  height: auto;
}

.pdp__body {
  width: 100%;
  padding: 2.5rem var(--gutter) 5rem;
}

.pdp__title {
  margin: 0 0 2rem;
  font-size: clamp(2.5rem, 7vw, 5rem);
  line-height: 1.02;
}

.pdp__specs {
  margin: 0 0 2.5rem;
}

.pdp__spec {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  gap: 1rem;
  padding: 1rem 0;
  border-top: 1px solid var(--grid-line);
}

.pdp__spec:last-child {
  border-bottom: 1px solid var(--grid-line);
}

.pdp__spec dt {
  font-size: var(--text-lg);
  color: var(--charcoal);
}

.pdp__spec dd {
  margin: 0;
  font-size: var(--text-lg);
  color: var(--charcoal);
  text-align: right;
}

.pdp__disclosure {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  font-size: var(--text-lg);
  color: var(--charcoal);
}

.pdp__disclosure-mark {
  color: var(--muted);
}

.pdp__options {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
  margin: 0.75rem 0 0;
  padding: 0;
  list-style: none;
  color: var(--muted);
}

.pdp__inquire {
  display: block;
  width: 100%;
  padding: 1.15rem 1rem;
  margin-bottom: 1rem;
  background: var(--charcoal);
  color: var(--cream);
  font-size: var(--text-lg);
  transition: opacity 0.2s ease;
}

.pdp__inquire:hover {
  opacity: 0.9;
}

.pdp__save {
  display: block;
  width: 100%;
  padding: 1.15rem 1rem;
  margin-bottom: 2rem;
  border: 1px solid var(--charcoal);
  color: var(--charcoal);
  font-size: var(--text-lg);
  transition: background 0.2s ease, color 0.2s ease;
}

.pdp__save:hover,
.pdp__save--active {
  background: var(--charcoal);
  color: var(--cream);
}

.pdp__links {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.5rem;
}

.pdp__link {
  font-size: var(--text-lg);
  color: var(--charcoal);
  text-decoration: underline;
  text-underline-offset: 5px;
  transition: color 0.2s ease;
}

.pdp__link:hover {
  color: var(--accent);
}

.pdp__finishes {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem 1.5rem;
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
  color: var(--muted);
}

.pdp__info {
  margin-top: 3.5rem;
  padding-top: 2rem;
  border-top: 1px solid var(--grid-line);
}

.pdp__info-heading {
  margin: 0 0 1.5rem;
  font-size: var(--text-lg);
  color: var(--muted);
}

.pdp__info-text {
  margin: 0 0 1.25rem;
  max-width: 44rem;
  font-size: var(--text-lg);
  line-height: 1.55;
  color: var(--charcoal);
}

.pdp__next {
  margin-top: 4rem;
  text-align: center;
}

.pdp__next-label {
  display: inline-block;
  margin-bottom: 1.5rem;
  font-size: var(--text-lg);
  color: var(--charcoal);
}

.pdp__next-media {
  display: block;
  width: min(320px, 60%);
  margin: 0 auto;
  aspect-ratio: 1;
  background: var(--warm-white);
}

.pdp__next-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 900px) {
  .pdp,
  .pdp--standalone {
    display: block;
    height: auto;
  }

  .pdp__gallery,
  .pdp__details {
    height: auto;
    overflow-y: visible;
  }

  .pdp__gallery {
    border-right: none;
    border-bottom: 1px solid var(--grid-line);
  }
}
</style>
