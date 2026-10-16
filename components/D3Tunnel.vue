<template>
  <section ref="rootEl" class="d3-tunnel" data-cursor="default" aria-label="D3 tunnel">
    <div class="d3-tunnel__rig">
      <div
        v-for="layer in layers"
        :key="layer.index"
        class="d3-tunnel__layer"
        :ref="(el) => setLayerEl(layer.index, el)"
      >
        <button
          v-for="card in layer.cards"
          :key="card.key"
          type="button"
          class="d3-tunnel__item"
          :style="{ left: card.left, top: card.top }"
          @pointerdown="onPointerDown"
          @click="onOpen(card, $event)"
        >
          <img :src="card.src" :alt="card.title" draggable="false" />
          <span class="d3-tunnel__veil" aria-hidden="true" />
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import { productCoverFrame } from '~/composables/productImages'
import { productSlug } from '~/composables/useProductCatalog'

type TunnelItem = {
  _id: string
  title: string
  slug?: { current?: string } | string
  category?: string
  categories?: string[]
  type?: string
  linkType?: string
  image?: { asset?: { url?: string; _id?: string } }
  gallery?: { asset?: { url?: string; _id?: string } }[]
}

type TunnelCard = {
  key: string
  src: string
  title: string
  slug: string
  productId: string
  left: string
  top: string
}

const CONFIG = {
  scrollSpeed: 2,
  layerGap: 2500,
  lerp: 0.07,
  itemWidth: 240,
  itemHeight: 240,
}

const contentLayerCountFor = (total: number) => Math.ceil(total / 4)
const totalLayerCountFor = (total: number) => Math.max(contentLayerCountFor(total), 6)

const props = defineProps<{
  items?: TunnelItem[]
}>()

const { imageUrl, getImageSrc } = useSanityImage()
const { open, isOpen } = useProductOverlay()

const rootEl = ref<HTMLElement | null>(null)
const layerEls: HTMLElement[] = []

const cards = computed(() => {
  const next: Omit<TunnelCard, 'key' | 'left' | 'top'>[] = []
  for (const item of props.items || []) {
    const slug = productSlug(item) || (typeof item.slug === 'string' ? item.slug : item.slug?.current) || item._id
    if (!slug) continue
    const cover = productCoverFrame(item)
    const src = (cover ? imageUrl(cover, 900) : '') || (cover?.asset ? getImageSrc(cover.asset) : '')
    if (!src) continue
    next.push({
      src,
      title: item.title || 'Untitled',
      slug,
      productId: item._id,
    })
  }
  return next
})

const layers = computed(() => {
  const images = cards.value
  const total = images.length
  if (!total) return []
  const contentLayers = contentLayerCountFor(total)
  const count = totalLayerCountFor(total)
  return Array.from({ length: count }, (_, index) => {
    const start = (index % contentLayers) * 4
    const placed: TunnelCard[] = []
    for (let slot = 0; slot < 4; slot += 1) {
      const image = images[start + slot]
      if (!image) break
      const angle = (slot / 4) * Math.PI * 2 - Math.PI / 2
      const itemX = Math.cos(angle) * 400 - CONFIG.itemWidth / 2
      const itemY = Math.sin(angle) * 280 - CONFIG.itemHeight / 2
      placed.push({
        ...image,
        key: `${index}-${image.productId}-${slot}`,
        left: `${itemX}px`,
        top: `${itemY}px`,
      })
    }
    return { index, baseZ: -index * CONFIG.layerGap, cards: placed }
  })
})

const setLayerEl = (index: number, el: unknown) => {
  if (el instanceof HTMLElement) layerEls[index] = el
  else if (!el) delete layerEls[index]
}

const tunnelDepth = () => {
  const total = cards.value.length
  if (!total) return CONFIG.layerGap
  return totalLayerCountFor(total) * CONFIG.layerGap
}

const visibleDepth = 3 * CONFIG.layerGap
const exitPoint = 1500
const initialScroll = 750

let targetScroll = initialScroll
let currentScroll = initialScroll
let pointerY = 0
let pointerMoved = false
let pressing = false
let tickerOn = false

const overlayFor = (z: number) => {
  if (z > exitPoint) return 1
  if (z > 0) return z / exitPoint
  if (z > -visibleDepth) {
    const progress = Math.abs(z) / visibleDepth
    return progress * progress
  }
  return 1
}

const step = () => {
  const list = layers.value
  const depth = tunnelDepth()
  currentScroll += (targetScroll - currentScroll) * CONFIG.lerp
  list.forEach((layer, index) => {
    const el = layerEls[index]
    if (!el) return
    let z = layer.baseZ + currentScroll
    z = ((z % depth) + depth) % depth
    z = z - depth + exitPoint
    const overlay = Math.min(1, Math.max(0, overlayFor(z)))
    gsap.set(el, {
      z,
      '--overlay': overlay,
      visibility: overlay >= 1 ? 'hidden' : 'visible',
    })
  })
}

const fromUi = (target: EventTarget | null) =>
  target instanceof Element &&
  !!target.closest('.header, .bucket, .product-overlay')

const onWheel = (event: WheelEvent) => {
  if (isOpen.value || fromUi(event.target)) return
  event.preventDefault()
  targetScroll += event.deltaY * CONFIG.scrollSpeed
}

const onTouchStart = (event: TouchEvent) => {
  if (isOpen.value || fromUi(event.target)) return
  const touch = event.touches[0]
  if (!touch) return
  pointerY = touch.clientY
}

const onTouchMove = (event: TouchEvent) => {
  if (isOpen.value || fromUi(event.target)) return
  const touch = event.touches[0]
  if (!touch) return
  targetScroll += (pointerY - touch.clientY) * CONFIG.scrollSpeed
  pointerY = touch.clientY
  event.preventDefault()
}

const onPointerDown = (event: PointerEvent) => {
  pointerY = event.clientY
  pointerMoved = false
  pressing = true
}

const onPointerUp = () => {
  pressing = false
}

const onOpen = (card: TunnelCard, event: MouseEvent) => {
  if (pointerMoved || Math.abs(event.clientY - pointerY) > 6) return
  open(card.slug, {
    productId: card.productId,
    flipSrc: card.src,
    sequence: cards.value.map((item) => ({
      slug: item.slug,
      title: item.title,
      imageUrl: item.src,
    })),
  })
}

const onPointerMove = (event: PointerEvent) => {
  if (!pressing) return
  if (Math.abs(event.clientY - pointerY) > 6) pointerMoved = true
}

onMounted(() => {
  if (!tickerOn) {
    gsap.ticker.add(step)
    tickerOn = true
  }
  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerup', onPointerUp)
})

onUnmounted(() => {
  if (tickerOn) gsap.ticker.remove(step)
  tickerOn = false
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})
</script>

<style scoped>
.d3-tunnel {
  position: fixed;
  inset: 0;
  background: var(--cream);
  perspective: 1000px;
  overflow: hidden;
}

.d3-tunnel__rig {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transform-style: preserve-3d;
}

.d3-tunnel__layer {
  position: absolute;
  transform-style: preserve-3d;
  visibility: hidden;
}

.d3-tunnel__item {
  position: absolute;
  width: 240px;
  height: 240px;
  aspect-ratio: 1;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  overflow: hidden;
  display: grid;
  place-items: center;
}

.d3-tunnel__item img {
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  object-fit: contain;
  pointer-events: none;
}

.d3-tunnel__veil {
  position: absolute;
  inset: 0;
  background: var(--cream);
  opacity: var(--overlay, 1);
  pointer-events: none;
}
</style>
