<template>
  <div class="product-page">
    <ProductDetail :slug="slug" standalone @close="onClose" @navigate="onNavigate" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const slug = computed(() => route.params.slug as string)

const { fetchProduct } = useProductCatalog()

const { data: product } = await useAsyncData(
  () => `product-meta-${slug.value}`,
  () => fetchProduct(slug.value),
)

const onClose = () => {
  if (import.meta.client && window.history.length > 1) {
    router.back()
    return
  }
  router.push('/products')
}

const onNavigate = (nextSlug: string) => {
  router.push(`/products/${nextSlug}`)
}

useHead(() => ({
  title: product.value?.title
    ? `${product.value.title} — Studio Based Upon`
    : 'Product — Studio Based Upon',
}))
</script>

<style scoped>
.product-page {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  padding-top: var(--header-height);
}
</style>
