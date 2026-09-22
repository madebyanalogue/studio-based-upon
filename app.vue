<template>
  <ClientOnly>
    <Preloader
      @preloader-ready="onPreloaderReady"
      @preloader-complete="onPreloaderComplete"
    />
  </ClientOnly>

  <div v-if="preloaderReady || disablePreloader" id="app">
    <AppHeader />
    <main class="page-wrapper">
      <NuxtPage />
    </main>
    <BucketDrawer v-if="isV1" />
    <BucketStack v-if="isV2" />
    <BoardsPushPanel />
    <MoodboardCanvas />
    <MoodboardPicker />
    <ProductOverlay />
    <EnquiryForm />
  </div>
</template>

<script setup lang="ts">
import { isHomepagePath } from '~/composables/useHomepagePreloader'

const {
  seoTitle,
  seoDescription,
  disablePreloader,
  title,
  phone,
  phoneTel,
  streetAddress,
  addressLocality,
  postalCode,
  addressCountry,
  enquiryEmail,
} = useSiteSettings()
const { initBucketUi, isV1, isV2 } = useBucketUi()
const { initTextCase } = useTextCase()
const { initStackChrome } = useStackChrome()
const route = useRoute()

onMounted(() => {
  initBucketUi()
  initTextCase()
  initStackChrome()
})

const preloaderReady = ref(
  !import.meta.client || !isHomepagePath(route.path),
)

const onPreloaderReady = () => {
  preloaderReady.value = true
  if (import.meta.client) {
    document.body.classList.add('preloader-ready')
  }
}

const onPreloaderComplete = () => {
  if (import.meta.client) {
    document.body.classList.add('preloader-complete')
  }
}

watch(
  disablePreloader,
  (disabled) => {
    if (disabled) {
      preloaderReady.value = true
      if (import.meta.client) {
        document.body.classList.add('preloader-ready')
        document.body.classList.add('preloader-complete')
      }
    }
  },
  { immediate: true },
)

const localBusinessJsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: title.value || 'Studio Based Upon',
  telephone: phoneTel.value || phone.value,
  email: enquiryEmail.value || undefined,
  address: {
    '@type': 'PostalAddress',
    streetAddress: streetAddress.value,
    addressLocality: addressLocality.value,
    postalCode: postalCode.value,
    addressCountry: addressCountry.value,
  },
}))

useHead(() => ({
  title: seoTitle.value,
  meta: [
    ...(seoDescription.value
      ? [{ name: 'description', content: seoDescription.value }]
      : []),
    ...(phone.value
      ? [{ name: 'telephone', content: phone.value }]
      : []),
    ...(streetAddress.value
      ? [
          {
            name: 'geo.placename',
            content: [streetAddress.value, addressLocality.value, postalCode.value]
              .filter(Boolean)
              .join(', '),
          },
        ]
      : []),
  ],
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify(localBusinessJsonLd.value),
      key: 'local-business-jsonld',
    },
  ],
  style: [
    {
      children: `
        html:not(.css-loaded) body {
          visibility: hidden !important;
          opacity: 0 !important;
        }
        html.css-loaded body {
          visibility: visible !important;
          opacity: 1 !important;
        }
        body:not(.preloader-ready) #app {
          visibility: hidden;
          opacity: 0;
        }
        body.preloader-ready #app {
          visibility: visible;
          opacity: 1;
          transition: opacity 0.6s ease;
        }
        body.homepage-intro-pending .header {
          transform: translateY(-100%);
        }
        body.homepage-intro-pending .product-grid {
          opacity: 0;
        }
        body.preloader-ready:not(.homepage-intro-pending) .header,
        body.preloader-ready .product-grid {
          transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.9s ease;
        }
        body.preloader-ready:not(.homepage-intro-pending) .header {
          transform: translateY(0);
        }
        body.preloader-ready:not(.homepage-intro-pending) .product-grid {
          opacity: 1;
        }
      `,
      key: 'preloader-styles',
    },
  ],
}))
</script>
