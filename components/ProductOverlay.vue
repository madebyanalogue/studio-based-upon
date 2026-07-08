<template>
  <Teleport to="body">
    <Transition name="product-overlay">
      <div v-if="isOpen" class="product-overlay" role="dialog" aria-modal="true" aria-label="Product detail">
        <div class="product-overlay__backdrop" @click="close" />
        <div class="product-overlay__panel">
          <ProductDetail
            v-if="openSlug"
            :key="openSlug"
            :slug="openSlug"
            @close="close"
            @navigate="onNavigate"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const { openSlug, isOpen, open, close } = useProductOverlay()

const onNavigate = (slug: string) => {
  open(slug)
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isOpen.value) close()
}

const onPopState = () => {
  if (isOpen.value) close()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('popstate', onPopState)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('popstate', onPopState)
})
</script>

<style scoped>
.product-overlay {
  position: fixed;
  inset: 0;
  z-index: 250;
}

.product-overlay__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(26, 26, 26, 0.35);
  backdrop-filter: blur(2px);
}

.product-overlay__panel {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: var(--cream);
}

/* Slide/fade in over the top */
.product-overlay-enter-active,
.product-overlay-leave-active {
  transition: opacity 0.35s ease;
}

.product-overlay-enter-active .product-overlay__panel,
.product-overlay-leave-active .product-overlay__panel {
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.product-overlay-enter-from,
.product-overlay-leave-to {
  opacity: 0;
}

.product-overlay-enter-from .product-overlay__panel,
.product-overlay-leave-to .product-overlay__panel {
  transform: translateY(3%);
}
</style>
