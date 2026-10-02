<template>
  <ClientOnly>
    <Preloader
      @preloader-ready="onPreloaderReady"
      @preloader-complete="onPreloaderComplete"
    />
  </ClientOnly>

  <div v-if="preloaderReady" id="app">
    <HomepageIntro v-if="introActive" />
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
    <ClientOnly>
      <CustomCursor />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { isHomepagePath, useHomepageIntro } from '~/composables/useHomepagePreloader'

const {
  seoTitle,
  seoDescription,
  googleTagId,
  facebookShareImage,
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
const { phase: introPhase } = useHomepageIntro()
const introActive = computed(
  () =>
    introPhase.value === 'cover' ||
    introPhase.value === 'type' ||
    introPhase.value === 'chrome',
)

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

const googleTagHead = computed(() => {
  const id = googleTagId.value
  if (!id) return { script: [], noscript: [] }

  if (/^GTM-/i.test(id)) {
    return {
      script: [
        {
          key: 'google-tag-manager',
          tagPosition: 'head' as const,
          children: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`,
        },
      ],
      noscript: [
        {
          key: 'google-tag-manager-noscript',
          tagPosition: 'bodyOpen' as const,
          children: `<iframe src="https://www.googletagmanager.com/ns.html?id=${id}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
        },
      ],
    }
  }

  return {
    script: [
      {
        key: 'google-tag',
        src: `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`,
        async: true,
        tagPosition: 'head' as const,
      },
      {
        key: 'google-tag-config',
        tagPosition: 'head' as const,
        children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${id}');`,
      },
    ],
    noscript: [],
  }
})

watch(
  () => route.fullPath,
  (path) => {
    if (!import.meta.client) return
    const id = googleTagId.value
    if (!id) return

    const w = window as Window & {
      gtag?: (...args: unknown[]) => void
      dataLayer?: Record<string, unknown>[]
    }

    if (/^GTM-/i.test(id)) {
      w.dataLayer = w.dataLayer || []
      w.dataLayer.push({
        event: 'page_view',
        page_path: path,
        page_location: window.location.href,
      })
      return
    }

    w.gtag?.('event', 'page_view', {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
    })
  },
)

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
    ...(facebookShareImage.value
      ? [
          { property: 'og:type', content: 'website' },
          { property: 'og:title', content: seoTitle.value },
          ...(seoDescription.value
            ? [{ property: 'og:description', content: seoDescription.value }]
            : []),
          { property: 'og:image', content: facebookShareImage.value.url },
          { property: 'og:image:secure_url', content: facebookShareImage.value.url },
          ...(facebookShareImage.value.width
            ? [{ property: 'og:image:width', content: String(facebookShareImage.value.width) }]
            : []),
          ...(facebookShareImage.value.height
            ? [{ property: 'og:image:height', content: String(facebookShareImage.value.height) }]
            : []),
        ]
      : []),
  ],
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify(localBusinessJsonLd.value),
      key: 'local-business-jsonld',
    },
    ...googleTagHead.value.script,
  ],
  noscript: googleTagHead.value.noscript,
  style: [
    {
      children: `
        /* Logo sizing before scoped/component CSS — prevents hard-load SVG resize */
        .based-upon-logo {
          display: block;
          width: 100%;
          height: auto;
        }
        .header__logo-mark {
          position: absolute;
          top: 20px;
          width: 180px;
          height: auto;
        }
        .preloader__logo-svg svg {
          display: block;
          height: clamp(2rem, 5vw, 3.25rem);
          width: auto;
          margin: 0 auto;
        }
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
        body.preloader-ready .product-grid {
          opacity: 1;
          transition: opacity 0.9s ease;
        }
      `,
      key: 'preloader-styles',
    },
  ],
}))
</script>
