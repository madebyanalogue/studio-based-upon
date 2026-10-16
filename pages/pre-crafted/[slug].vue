<template>
  <div class="product-page">
    <ProductDetail :slug="slug" standalone @close="onClose" @navigate="onNavigate" />
    <ProductIndexRail :slug="slug" @navigate="onNavigate" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  pageTransition: false,
  key: 'precrafted-product',
})

const route = useRoute()
const router = useRouter()
const slug = computed(() => route.params.slug as string)

const { fetchProduct } = useProductCatalog()

const { data: product } = await useAsyncData(
  () => `precrafted-product-meta-${slug.value}`,
  () => fetchProduct(slug.value),
)

const onClose = () => {
  const { relatedRailVisible, closeRelatedRail } = usePdpRelatedRail()
  const hadRelated = relatedRailVisible.value
  closeRelatedRail()
  if (hadRelated) {
    window.setTimeout(() => {
      router.push('/pre-crafted')
    }, PDP_RELATED_RAIL_MS)
    return
  }
  router.push('/pre-crafted')
}

const onNavigate = (nextSlug: string) => {
  if (nextSlug === slug.value) return
  router.push(`/pre-crafted/${nextSlug}`)
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
  padding-top: 0;
}
</style>
