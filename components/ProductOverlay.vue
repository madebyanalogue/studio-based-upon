<template>
  <Teleport to="body">
    <Transition
      :name="pendingFlip || closingFlip ? undefined : 'product-overlay'"
      :css="!(pendingFlip || closingFlip)"
    >
      <div
        v-if="isOpen"
        class="product-overlay"
        :class="{ 'product-overlay--flipping': pendingFlip || closingFlip }"
        role="dialog"
        aria-modal="true"
        aria-label="Product detail"
        data-lenis-prevent
      >
        <div class="product-overlay__backdrop" @click="close" />
        <div class="product-overlay__panel">
          <ProductDetail
            v-if="openSlug"
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
const { openSlug, isOpen, open, close, syncFromHistory, pendingFlip, closingFlip } =
  useProductOverlay()
const { isOpen: bucketOpen, pickerItem, closeDrawer, closePicker } = useBucket()

const onNavigate = (slug: string) => {
  open(slug)
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !isOpen.value) return
  // Dismiss selection UI first when it sits over the product page
  if (pickerItem.value) {
    closePicker()
    return
  }
  if (bucketOpen.value) {
    closeDrawer()
    return
  }
  close()
}

const onPopState = () => {
  // Browser Back already restored the previous URL — just dismiss the overlay.
  if (isOpen.value) syncFromHistory()
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
  height: 100dvh;
  z-index: 320; /* above cart / BucketStack (280–300) */
}

.product-overlay__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(26, 26, 26, 0);
  transition: background var(--theme-ms) var(--theme-ease);
}

.product-overlay:not(.product-overlay--flipping) .product-overlay__backdrop {
  background: rgba(26, 26, 26, 0.12);
}

.product-overlay__panel {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
  transition: background var(--theme-ms) var(--theme-ease);
}

.product-overlay:not(.product-overlay--flipping) .product-overlay__panel {
  background: var(--cream);
}

/* Soft fade only — Flip owns the image motion */
.product-overlay-enter-active,
.product-overlay-leave-active {
  transition: opacity 0.25s ease;
}

.product-overlay-enter-from,
.product-overlay-leave-to {
  opacity: 0;
}
</style>
