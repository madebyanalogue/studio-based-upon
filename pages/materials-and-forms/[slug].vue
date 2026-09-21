<template>
  <div class="product-page">
    <ProductDetail :slug="slug" standalone @close="onClose" @navigate="onNavigate" />
    <ProductIndexRail :slug="slug" @navigate="onNavigate" />
  </div>
</template>

<script setup lang="ts">
// Soft product swaps — don't fade/remount the page (index rail must stay put).
definePageMeta({
  pageTransition: false,
})

const route = useRoute()
const router = useRouter()
const slug = computed(() => route.params.slug as string)

const { fetchProduct } = useProductCatalog()

const { data: product } = await useAsyncData(
  () => `product-meta-${slug.value}`,
  () => fetchProduct(slug.value),
)

const onClose = () => {
  router.push('/materials-and-forms')
}

const onNavigate = (nextSlug: string) => {
  if (nextSlug === slug.value) return
  router.push(`/materials-and-forms/${nextSlug}`)
}

useHead(() => ({
  title: product.value?.title
    ? `${product.value.title} — Studio Based Upon`
    : 'Product — Studio Based Upon',
}))
</script>

<style scoped>
.product-page {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  /* Header is hidden on hard-loaded PDPs — fill the viewport like the overlay */
  padding-top: 0;
}
</style>
