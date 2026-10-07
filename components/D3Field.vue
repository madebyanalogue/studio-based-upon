<template>
  <section class="d3-field" aria-label="D3 field">
    <div ref="containerEl" class="d3-field__stage" />

    <div
      v-if="showLoader"
      class="d3-field__loader"
      :class="{ 'd3-field__loader--done': loaderDone }"
      aria-hidden="true"
    >
      <div class="d3-field__loader-bar" :style="{ width: `${textureProgress}%` }" />
    </div>

    <div
      v-if="gathered.length"
      ref="stackEl"
      class="d3-gather"
      :class="{ 'is-row': lined }"
      data-d3-gather
      data-cursor="default"
      :style="{ '--shift': `${shift}px` }"
      @click="lineUp"
    >
      <div
        v-for="item in gathered"
        :key="item.id"
        class="d3-gather__card"
        :data-gather-id="item.id"
        :style="{
          '--x': `${item.x}px`,
          '--y': `${item.y}px`,
          '--rot': `${item.rot}deg`,
          '--ar': item.aspect,
        }"
      >
        <img :src="item.url" alt="" draggable="false" />
      </div>
    </div>

    <p class="d3-field__hint interface">
      <template v-if="lined">Scroll to move the selection</template>
      <template v-else>Scroll to explore · Move to the edge to pan · Click to gather</template>
    </p>
  </section>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import {
  createD3Canvas,
  D3_REVEAL_EASE,
  D3_REVEAL_S,
  type D3CanvasHandle,
  type D3SelectPayload,
} from '~/lib/d3-canvas/createD3Canvas'
import type { DiscoveryMediaItem } from '~/lib/infinite-canvas/types'
import { productSlug } from '~/composables/useProductCatalog'
import { productCoverFrame } from '~/composables/productImages'

type DiscoveryItem = {
  _id: string
  title: string
  slug?: { current?: string }
  category?: string
  categories?: string[]
  image?: { asset?: { url?: string; _id?: string } }
  gallery?: { asset?: { url?: string; _id?: string } }[]
  linkType?: string
  externalUrl?: string
}

type GatheredItem = {
  id: string
  productId: string
  url: string
  aspect: number
  x: number
  y: number
  rot: number
}

const props = defineProps<{
  items?: DiscoveryItem[]
}>()

const { imageUrl, getImageSrc } = useSanityImage()

const containerEl = ref<HTMLElement | null>(null)
const stackEl = ref<HTMLElement | null>(null)
const textureProgress = ref(0)
const showLoader = ref(true)
const loaderDone = ref(false)
const gathered = ref<GatheredItem[]>([])
const lined = ref(false)
const shift = ref(0)

let handle: D3CanvasHandle | null = null
let loaderHideTimer = 0
let themeObserver: MutationObserver | null = null

const parseDimensions = (asset?: { url?: string; _id?: string }) => {
  const id = asset?._id || ''
  const match = String(id).match(/image-[^-]+-(\d+)x(\d+)-/)
  if (match) return { width: Number(match[1]), height: Number(match[2]) }
  return { width: 1200, height: 1200 }
}

const toCanvasTextureUrl = (remoteUrl: string) => {
  if (!remoteUrl) return ''
  if (remoteUrl.startsWith('/') || remoteUrl.startsWith('blob:')) return remoteUrl
  return `/api/image-proxy?url=${encodeURIComponent(remoteUrl)}`
}

const toMedia = (items: DiscoveryItem[]): DiscoveryMediaItem[] => {
  const media: DiscoveryMediaItem[] = []
  for (const item of items) {
    const slug = productSlug(item)
    if (!slug) continue
    const cover = productCoverFrame(item)
    const remote =
      (cover ? imageUrl(cover, 900) : '') ||
      (cover?.asset ? getImageSrc(cover.asset) : '') ||
      ''
    const url = toCanvasTextureUrl(remote)
    if (!url) continue
    const dims = parseDimensions(cover?.asset)
    media.push({
      url,
      width: dims.width,
      height: dims.height,
      slug,
      title: item.title,
      productId: item._id,
    })
  }
  return media
}

const mediaItems = computed(() => toMedia(props.items || []))

const shuffleMedia = (items: DiscoveryMediaItem[]) => {
  const next = items.slice()
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = next[i]!
    next[i] = next[j]!
    next[j] = tmp
  }
  return next
}

const readThemeColors = () => {
  if (!import.meta.client) return { background: '#F1EDE4', fog: '#F1EDE4' }
  const cream = getComputedStyle(document.documentElement).getPropertyValue('--cream').trim() || '#F1EDE4'
  return { background: cream, fog: cream }
}

const scheduleLoaderHide = () => {
  if (loaderDone.value) return
  loaderDone.value = true
  window.clearTimeout(loaderHideTimer)
  loaderHideTimer = window.setTimeout(() => {
    showLoader.value = false
  }, 400)
}

const liveRotation = (card: HTMLElement) => {
  if (card.style.position === 'fixed') return Number(gsap.getProperty(card, 'rotation')) || 0
  return lined.value ? 0 : pileRotation(card)
}

const settleCards = () => {
  const stack = stackEl.value
  if (!stack) return []
  const cards = [...stack.querySelectorAll<HTMLElement>('.d3-gather__card')]
  cards.forEach((card) => {
    gsap.killTweensOf(card)
    releaseCard(card)
    card.style.visibility = ''
  })
  return cards
}

const gather = async (payload: D3SelectPayload) => {
  if (gathered.value.some((item) => item.productId === payload.productId)) {
    handle?.conceal(payload.productId)
    return
  }
  if (!payload.url || payload.screenRect.width < 2) return

  handle?.conceal(payload.productId)

  const held = stackEl.value ? [...stackEl.value.querySelectorAll<HTMLElement>('.d3-gather__card')] : []
  const fromById = new Map(
    held.map((card) => [card.dataset.gatherId || '', cardBox(card, liveRotation(card))]),
  )
  if (stackEl.value) settleCards()

  const index = gathered.value.length
  const item: GatheredItem = {
    id: payload.id,
    productId: payload.productId,
    url: payload.url,
    aspect: Math.max(0.45, Math.min(payload.width / Math.max(payload.height, 1), 2.4)),
    x: 0,
    y: index % 2 === 0 ? -6 : 7,
    rot: index % 2 === 0 ? -3.5 : 2.5,
  }
  gathered.value.push(item)
  await nextTick()
  if (!stackEl.value) return

  const cards = [...stackEl.value.querySelectorAll<HTMLElement>('.d3-gather__card')]
  const incoming = cards.find((card) => card.dataset.gatherId === item.id)
  if (!incoming) return
  const duration = reducedMotion() ? 0 : D3_REVEAL_S
  const from = cards.map((card) => {
    const previous = fromById.get(card.dataset.gatherId || '')
    if (previous) return previous
    return {
      left: payload.screenRect.left,
      top: payload.screenRect.top,
      width: payload.screenRect.width,
      height: payload.screenRect.height,
      rotation: 0,
    }
  })
  playIntoLayout(cards, from, duration)
}

type CardBox = {
  left: number
  top: number
  width: number
  height: number
  rotation: number
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const pileRotation = (card: HTMLElement) => {
  const value = Number.parseFloat(card.style.getPropertyValue('--rot'))
  return Number.isFinite(value) ? value : 0
}

/** Unrotated box, centred on the element's visual centre. */
const cardBox = (card: HTMLElement, rotation: number): CardBox => {
  const rect = card.getBoundingClientRect()
  const width = card.offsetWidth
  const height = card.offsetHeight
  return {
    left: rect.left + rect.width / 2 - width / 2,
    top: rect.top + rect.height / 2 - height / 2,
    width,
    height,
    rotation,
  }
}

const releaseCard = (card: HTMLElement) => {
  gsap.set(card, {
    clearProps: 'x,y,scale,rotation,transform,transformOrigin',
  })
}

const restShift = (card: HTMLElement) => {
  if (lined.value) return { y: 0, rotation: 0 }
  return {
    y: Number.parseFloat(card.style.getPropertyValue('--y')) || 0,
    rotation: pileRotation(card),
  }
}

/**
 * The cards are already in their final layout. Slide and scale them in from
 * `from` without taking them out of the row, so size and stacking stay put
 * when the tween ends.
 */
const playIntoLayout = (cards: HTMLElement[], from: CardBox[], duration: number) => {
  cards.forEach((card, index) => {
    const start = from[index]
    if (!start) return
    const end = cardBox(card, 0)
    const rest = restShift(card)
    const endCx = end.left + end.width / 2
    const endCy = end.top + end.height / 2
    const startCx = start.left + start.width / 2
    const startCy = start.top + start.height / 2
    const scale = end.height ? start.height / end.height : 1
    gsap.killTweensOf(card)
    gsap.fromTo(
      card,
      {
        x: startCx - endCx,
        y: rest.y + (startCy - endCy),
        scale,
        rotation: start.rotation,
        transformOrigin: '50% 50%',
      },
      {
        x: 0,
        y: rest.y,
        scale: 1,
        rotation: rest.rotation,
        duration,
        ease: D3_REVEAL_EASE,
        overwrite: 'auto',
        onComplete: () => releaseCard(card),
      },
    )
  })
}

const lineUp = async () => {
  if (lined.value || !gathered.value.length || !stackEl.value) return
  document.querySelectorAll('img[data-d3-ghost]').forEach((ghost) => ghost.remove())
  const stack = stackEl.value
  const cards = settleCards()
  if (!cards.length) return
  const pile = cards.map((card) => cardBox(card, pileRotation(card)))
  stack.style.visibility = 'hidden'
  lined.value = true
  shift.value = 0
  await nextTick()
  const duration = reducedMotion() ? 0 : D3_REVEAL_S
  handle?.disperse(duration)
  playIntoLayout(cards, pile, duration)
  stack.style.visibility = ''
}

const closeKebab = async () => {
  if (!lined.value || !stackEl.value) return
  const stack = stackEl.value
  const cards = [...document.querySelectorAll<HTMLElement>('.d3-gather__card')]
  const from = cards.map((card) => cardBox(card, Number(gsap.getProperty(card, 'rotation')) || 0))
  stack.style.visibility = 'hidden'
  cards.forEach((card) => {
    gsap.killTweensOf(card)
    releaseCard(card)
  })
  lined.value = false
  shift.value = 0
  const duration = reducedMotion() ? 0 : D3_REVEAL_S
  handle?.recall(duration)
  await nextTick()
  playIntoLayout(cards, from, duration)
  stack.style.visibility = ''
}

const onFieldWheel = (event: WheelEvent) => {
  if (!lined.value) return
  event.preventDefault()
  const row = stackEl.value
  if (!row) return
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
  const max = Math.max(0, (row.scrollWidth - window.innerWidth) / 2)
  const next = shift.value - delta
  shift.value = Math.min(max, Math.max(-max, next))
}

const mountCanvas = () => {
  if (!containerEl.value || !import.meta.client) return
  handle?.dispose()
  handle = null
  const media = shuffleMedia(mediaItems.value)
  if (!media.length) return
  const colors = readThemeColors()
  textureProgress.value = 0
  showLoader.value = true
  loaderDone.value = false
  handle = createD3Canvas({
    container: containerEl.value,
    media,
    backgroundColor: colors.background,
    fogColor: colors.fog,
    onSelect: (payload) => {
      void gather(payload)
    },
    onClose: () => {
      void closeKebab()
    },
    onTextureProgress: (progress) => {
      textureProgress.value = Math.max(textureProgress.value, progress)
      if (progress >= 40) scheduleLoaderHide()
    },
  })
  if (import.meta.dev) {
    ;(window as Window & { __d3?: D3CanvasHandle }).__d3 = handle
  }
  window.clearTimeout(loaderHideTimer)
  loaderHideTimer = window.setTimeout(scheduleLoaderHide, 1600)
}

const onWindowWheel = (event: WheelEvent) => {
  if (!lined.value) return
  onFieldWheel(event)
}

onMounted(() => {
  mountCanvas()
  window.addEventListener('wheel', onWindowWheel, { passive: false })
  themeObserver = new MutationObserver(() => {
    const colors = readThemeColors()
    handle?.setColors(colors.background, colors.fog)
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
})

watch(mediaItems, (media, prev) => {
  const same =
    prev &&
    media.length === prev.length &&
    media.every((item, index) => item.productId === prev[index]?.productId)
  if (same) return
  if (!handle) {
    if (media.length) mountCanvas()
    return
  }
  if (!media.length) {
    handle.dispose()
    handle = null
    return
  }
  if (gathered.value.length) return
  handle.setMedia(shuffleMedia(media))
})

onBeforeUnmount(() => {
  window.clearTimeout(loaderHideTimer)
  window.removeEventListener('wheel', onWindowWheel)
  themeObserver?.disconnect()
  themeObserver = null
  handle?.dispose()
  handle = null
})
</script>

<style scoped>
.d3-field {
  position: relative;
  height: 100dvh;
  overflow: hidden;
  background: var(--cream);
}

.d3-field__stage {
  position: absolute;
  inset: 0;
  touch-action: none;
}

.d3-field__loader {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: flex-end;
  pointer-events: none;
  background: var(--cream);
  transition: opacity 0.45s ease;
}

.d3-field__loader--done {
  opacity: 0;
}

.d3-field__loader-bar {
  height: 2px;
  background: var(--charcoal);
  transition: width 0.2s ease;
}

.d3-gather {
  --pile-max: min(15vh, 21vw);
  position: fixed;
  left: 50%;
  top: 50%;
  z-index: 40;
  display: flex;
  align-items: center;
  width: max-content;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.d3-gather.is-row {
  --kebab-max: min(52vh, 540px);
  display: flex;
  align-items: center;
  gap: 0;
  transform: translate(calc(-50% + var(--shift, 0px)), -50%);
}

.d3-gather__card {
  position: relative;
  pointer-events: auto;
  flex: none;
  width: min(var(--pile-max), calc(var(--pile-max) * var(--ar)));
  height: min(var(--pile-max), calc(var(--pile-max) / var(--ar)));
  margin-left: -8vh;
  transform: translateY(var(--y)) rotate(var(--rot));
}

.d3-gather__card:first-child {
  margin-left: 0;
}

.d3-gather.is-row .d3-gather__card {
  width: min(var(--kebab-max), calc(var(--kebab-max) * var(--ar)));
  height: min(var(--kebab-max), calc(var(--kebab-max) / var(--ar)));
  margin-left: 0;
  transform: none;
}

.d3-gather__card img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  background: var(--cream);
}

.d3-field__hint {
  position: fixed;
  right: var(--gutter);
  bottom: calc(30px + var(--bucket-push, 0px));
  z-index: 30;
  margin: 0;
  font-size: var(--text-sm);
  color: var(--muted);
  pointer-events: none;
  background: rgba(250, 247, 242, 0.88);
  backdrop-filter: blur(8px);
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
}

:global(html.dark) .d3-field__hint {
  background: rgba(31, 28, 24, 0.88);
}
</style>
