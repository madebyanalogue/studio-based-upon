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
          'product-overlay--archive': flipSourceIsArchiveGrid(),
          'product-overlay--closing': closingFlip,
        }"
        :style="{
          '--backdrop-open-ms': `${PRODUCT_OVERLAY_BACKDROP_OPEN_MS}ms`,
          '--backdrop-close-ms': `${PRODUCT_OVERLAY_BACKDROP_CLOSE_MS}ms`,
          '--backdrop-close-ease': PRODUCT_OVERLAY_BACKDROP_CLOSE_EASE,
        }"
        role="dialog"
        aria-modal="true"
        aria-label="Product detail"
        data-cursor="default"
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
        <!-- Outside the PDP instance so soft product swaps never remount it -->
        <ProductIndexRail
          v-if="isOpen && openSlug"
          :slug="openSlug"
          @navigate="onNavigate"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import {
  PRODUCT_OVERLAY_BACKDROP_CLOSE_MS,
  PRODUCT_OVERLAY_BACKDROP_CLOSE_EASE,
  PRODUCT_OVERLAY_BACKDROP_OPEN_MS,
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
  flipSourceIsArchiveGrid,
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
  top: 0;
  bottom: 0;
  left: calc(var(--selections-panel-width) + var(--boards-panel-width));
  right: 0;
  height: 100dvh;
  z-index: 350; /* under the selection pile (355); phones put the pile back under this */
  transition: left 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Related sheet covers the page, including the stack (340) and the materials title (450). */
html.pdp-related-rail-open .product-overlay {
  z-index: 480;
}

.product-overlay__backdrop {
  position: absolute;
  inset: 0;
  background: var(--background-color);
  opacity: 0;
  /* Fixed duration — don’t rely on --theme-ms (0 until theme-ready) */
  transition: opacity var(--backdrop-open-ms, 0.18s) ease;
}

/* Fade-out after the close flyer lands — timing from PRODUCT_OVERLAY_BACKDROP_CLOSE_MS */
.product-overlay--closing .product-overlay__backdrop {
  transition: opacity var(--backdrop-close-ms) var(--backdrop-close-ease);
}

/* Fades in behind the flyer (body-level z-index 360, above this overlay). */
.product-overlay--backdrop .product-overlay__backdrop {
  opacity: 1;
}

/* Materials grid: the cream arrives with the PDP, after the thumbnails have left. */
.product-overlay--archive:not(.product-overlay--closing) .product-overlay__backdrop,
.product-overlay--archive:not(.product-overlay--closing) .product-overlay__panel {
  transition: none;
}

.product-overlay__panel {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
  /* Match backdrop fade — don’t use --theme-ms (can be 0) */
  transition: background var(--backdrop-open-ms, 0.18s) ease;
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

<style>
/* Pile is a fixed layer that the desktop PDP leaves visible. On a phone it drops off the bottom. */
@media (max-width: 1000px) {
  body:has(.product-overlay) .product-overlay {
    left: 0 !important;
    right: 0 !important;
    width: 100% !important;
  }

  body:has(.product-overlay) .stack.stack--above-pdp .stack__rail {
    transform: translate3d(0, calc(100% + 24px), 0);
    pointer-events: none;
    transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
  }

  body:has(.product-overlay) .stack.stack--above-pdp .stack__rail .stack__pile {
    pointer-events: none;
  }
}
</style>
