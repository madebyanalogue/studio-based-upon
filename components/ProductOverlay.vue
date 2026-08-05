<template>
  <Teleport to="body">
    <Transition
      :name="pendingFlip || closingFlip ? undefined : 'product-overlay'"
      :css="!(pendingFlip || closingFlip)"
    >
      <div
        v-if="isOpen"
        class="product-overlay"
        :class="{
          /* pendingFlip only — keep cream while closingFlip fades PDP UI first */
          'product-overlay--flipping': pendingFlip,
          'product-overlay--backdrop': backdropReady,
          'product-overlay--closing': closingFlip,
        }"
        :style="{
          '--backdrop-close-ms': `${PRODUCT_OVERLAY_BACKDROP_CLOSE_MS}ms`,
          '--backdrop-close-ease': PRODUCT_OVERLAY_BACKDROP_CLOSE_EASE,
        }"
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
import {
  PRODUCT_OVERLAY_BACKDROP_CLOSE_MS,
  PRODUCT_OVERLAY_BACKDROP_CLOSE_EASE,
} from '~/composables/useProductOverlay'

const {
  openSlug,
  isOpen,
  open,
  close,
  syncFromHistory,
  pendingFlip,
  closingFlip,
  backdropReady,
} = useProductOverlay()
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
  z-index: 320; /* above cart stage; selection rail rises to 340 while PDP is open */
}

.product-overlay__backdrop {
  position: absolute;
  inset: 0;
  background: var(--background-color);
  opacity: 0;
  /* Fixed duration — don’t rely on --theme-ms (0 until theme-ready) */
  transition: opacity 0.35s ease;
}

/* Fade-out after the close flyer lands — timing from PRODUCT_OVERLAY_BACKDROP_CLOSE_MS */
.product-overlay--closing .product-overlay__backdrop {
  transition: opacity var(--backdrop-close-ms) var(--backdrop-close-ease);
}

/* Fades in before the flyer moves; flyer is body-level z-index 500 above this */
.product-overlay--backdrop .product-overlay__backdrop {
  opacity: 1;
}

.product-overlay__panel {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
  /* Match backdrop fade — don’t use --theme-ms (can be 0) */
  transition: background 0.35s ease;
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
