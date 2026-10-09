<template>
  <section class="d3-field" aria-label="Discovery field">
    <div ref="containerEl" class="d3-field__stage" />

    <div
      v-if="showLoader"
      class="d3-field__loader"
      :class="{ 'd3-field__loader--done': loaderDone }"
      aria-hidden="true"
    >
      <div class="d3-field__loader-bar" :style="{ width: `${textureProgress}%` }" />
    </div>

    <div v-show="!showLoader" class="d3-field__toggles">
      <div
        class="d3-field__mode"
        role="tablist"
        aria-label="Field mode"
        data-cursor="default"
      >
        <button
          type="button"
          role="tab"
          class="interface"
          :aria-selected="mode === 'control'"
          :class="{ 'is-active': mode === 'control' }"
          @click="setMode('control')"
        >
          Control
        </button>
        <button
          type="button"
          role="tab"
          class="interface"
          :aria-selected="mode === 'surrender'"
          :class="{ 'is-active': mode === 'surrender' }"
          @click="setMode('surrender')"
        >
          Surrender
        </button>
      </div>
      <label class="d3-field__presence interface" data-cursor="default">
        <span>Visibility</span>
        <input
          v-model.number="presence"
          type="range"
          min="0"
          max="100"
          step="1"
          aria-label="Image visibility"
        />
        <span class="d3-field__presence-value">{{ presence }}</span>
      </label>
    </div>
  </section>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import Lenis from 'lenis'
import {
  createD3Canvas,
  D3_REVEAL_EASE,
  D3_REVEAL_S,
  type D3CanvasHandle,
  type D3SelectPayload,
} from '~/lib/d3-canvas/createD3Canvas'
import type { DiscoveryMediaItem } from '~/lib/infinite-canvas/types'
import { productPath, productSlug } from '~/composables/useProductCatalog'
import { productGalleryFrames } from '~/composables/productImages'

type DiscoveryItem = {
  _id: string
  title: string
  slug?: { current?: string }
  category?: string
  categories?: string[]
  type?: string
  tags?: string[]
  materials?: string[]
  colours?: string[]
  related?: { _id?: string }[]
  image?: { asset?: { url?: string; _id?: string } }
  gallery?: { asset?: { url?: string; _id?: string } }[]
  spiritGallery?: Array<
    | { _type?: 'image'; asset?: { url?: string; _id?: string } }
    | { _type: 'spiritVideo'; poster?: { asset?: { url?: string; _id?: string } } }
  >
  linkType?: string
  externalUrl?: string
}

type GatheredItem = {
  id: string
  productId: string
  slug: string
  url: string
  aspect: number
  y: number
}

const props = defineProps<{
  items?: DiscoveryItem[]
}>()

const { imageUrl, getImageSrc } = useSanityImage()
const { requestSave, items: pileItems, registerPileFly } = useBucket()
const mode = ref<'control' | 'surrender'>('surrender')
const presence = useCookie<number>('sba-discovery-presence', {
  default: () => 60,
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
})
const {
  open: openProduct,
  isOpen: productOverlayOpen,
  closingFlip: productClosingFlip,
} = useProductOverlay()
const { relatedRailVisible, frozenRelatedIdList, syncRelatedRailDom } = usePdpRelatedRail()

const containerEl = ref<HTMLElement | null>(null)
const stackEl = ref<HTMLElement | null>(null)
const trackEl = ref<HTMLElement | null>(null)
const textureProgress = ref(0)
const showLoader = ref(true)
const loaderDone = ref(false)
const gathered = ref<GatheredItem[]>([])
const lined = ref(false)
/** Lenis only after the open morph lands — keeps the track from collapsing mid-tween. */
const kebabScroll = ref(false)
/** Pile index under the pointer — cards to the right shift clear. */
const pileHover = ref<number | null>(null)

const kebabCache = useCookie<GatheredItem[]>('sba-discovery-kebab', {
  default: () => [],
  maxAge: 60 * 60 * 24 * 30,
  sameSite: 'lax',
})

/** Frosted panel behind the closed gather pile — toggle with `g`. */
const gatherGlass = useCookie<boolean>('sba-discovery-kebab-glass', {
  default: () => false,
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
})

type ScatteredTile = {
  card: HTMLElement
  clone: HTMLImageElement
  left: number
  top: number
}

let scattered: ScatteredTile[] = []
const SCATTER_Z = 325
/** Soft push — siblings drift aside; Flip owns the drama. */
const SCATTER_PUSH = 0.28
const SCATTER_OPEN = { duration: 0.55, ease: 'power2.out' }

let handle: D3CanvasHandle | null = null
let loaderHideTimer = 0
let themeObserver: MutationObserver | null = null
let kebabLenis: Lenis | null = null
let kebabRaf = 0
let pageLenisPaused = false
let openUnlock: (() => void) | null = null

const pageLenis = () =>
  useNuxtApp().$lenis as { stop?: () => void; start?: () => void } | undefined

const pausePageLenis = () => {
  if (pageLenisPaused) return
  pageLenis()?.stop?.()
  pageLenisPaused = true
}

const resumePageLenis = () => {
  if (!pageLenisPaused) return
  pageLenis()?.start?.()
  pageLenisPaused = false
}

const destroyKebabLenis = () => {
  if (kebabRaf) {
    cancelAnimationFrame(kebabRaf)
    kebabRaf = 0
  }
  kebabLenis?.destroy()
  kebabLenis = null
}

const clearKebabEdgePadding = () => {
  const track = trackEl.value
  if (!track) return
  track.style.paddingLeft = ''
  track.style.paddingRight = ''
}

/** Pad so scroll ends park the first / last card on the viewport centre. */
const syncKebabEdgePadding = () => {
  const stack = stackEl.value
  const track = trackEl.value
  if (!stack || !track) return
  const cards = [...track.querySelectorAll<HTMLElement>('.d3-gather__card')]
  const first = cards[0]
  const last = cards[cards.length - 1] || first
  const view = stack.clientWidth
  const padLeft = Math.max(0, view * 0.5 - (first?.offsetWidth || 0) * 0.5)
  const padRight = Math.max(0, view * 0.5 - (last?.offsetWidth || 0) * 0.5)
  track.style.paddingLeft = `${padLeft}px`
  track.style.paddingRight = `${padRight}px`
}

const kebabContentCenterScroll = () => {
  const stack = stackEl.value
  const track = trackEl.value
  if (!stack || !track) return 0
  const padLeft = Number.parseFloat(track.style.paddingLeft) || 0
  const padRight = Number.parseFloat(track.style.paddingRight) || 0
  const content = Math.max(0, track.scrollWidth - padLeft - padRight)
  const max = Math.max(0, track.scrollWidth - stack.clientWidth)
  return Math.min(max, Math.max(0, padLeft + content * 0.5 - stack.clientWidth * 0.5))
}

const centerKebabScroll = (immediate = true) => {
  const wrapper = stackEl.value
  const track = trackEl.value
  if (!kebabLenis || !wrapper || !track) return
  syncKebabEdgePadding()
  kebabLenis.resize()
  kebabLenis.scrollTo(kebabContentCenterScroll(), { immediate })
}

const stopKebabScroll = () => {
  destroyKebabLenis()
  clearKebabEdgePadding()
  stackEl.value?.classList.remove('is-scrolling')
  kebabScroll.value = false
  resumePageLenis()
}

const tickKebabLenis = (time: number) => {
  kebabLenis?.raf(time)
  kebabRaf = requestAnimationFrame(tickKebabLenis)
}

const initKebabLenis = () => {
  destroyKebabLenis()
  const wrapper = stackEl.value
  const content = trackEl.value
  if (!wrapper || !content || !lined.value) return
  pausePageLenis()
  syncKebabEdgePadding()
  kebabLenis = new Lenis({
    wrapper,
    content,
    eventsTarget: window,
    orientation: 'horizontal',
    gestureOrientation: 'both',
    smoothWheel: true,
    syncTouch: true,
    syncTouchLerp: 0.045,
    touchInertiaExponent: 1.85,
    touchMultiplier: 1.15,
    wheelMultiplier: 0.75,
    lerp: 0.055,
    duration: 1.45,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    overscroll: false,
    // Manual resize only — autoResize was shifting scroll while cards reflow.
    autoResize: false,
    prevent: () => !lined.value,
  })
  kebabLenis.resize()
  centerKebabScroll(true)
  kebabRaf = requestAnimationFrame(tickKebabLenis)
}

const resizeKebabLenis = () => {
  if (!kebabLenis || !lined.value) return
  const stack = stackEl.value
  const track = trackEl.value
  syncKebabEdgePadding()
  kebabLenis.resize()
  if (!stack || !track) return
  const max = Math.max(0, track.scrollWidth - stack.clientWidth)
  if (stack.scrollLeft > max) kebabLenis.scrollTo(max, { immediate: true })
}

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

const frameAsset = (
  entry:
    | { _type?: string; asset?: { url?: string; _id?: string }; poster?: { asset?: { url?: string; _id?: string } } }
    | undefined,
) => {
  if (!entry) return undefined
  if (entry._type === 'spiritVideo') return entry.poster?.asset
  return entry.asset
}

const toMedia = (items: DiscoveryItem[]): DiscoveryMediaItem[] => {
  const media: DiscoveryMediaItem[] = []
  let order = 0
  for (const item of items) {
    const slug = productSlug(item) || item.slug?.current || item._id
    if (!slug) continue
    const frames: { asset?: { url?: string; _id?: string } }[] = []
    const seen = new Set<string>()
    const push = (asset?: { url?: string; _id?: string }) => {
      if (!asset) return
      const key = String(asset._id || asset.url || '')
      if (!key || seen.has(key)) return
      seen.add(key)
      frames.push({ asset })
    }
    for (const frame of productGalleryFrames(item)) push(frame.asset)
    for (const entry of item.spiritGallery || []) push(frameAsset(entry))
    frames.forEach((frame, imageIndex) => {
      const remote =
        imageUrl(frame, 1400) ||
        (frame.asset ? getImageSrc(frame.asset) : '') ||
        ''
      const url = toCanvasTextureUrl(remote)
      if (!url || !remote) return
      const dims = parseDimensions(frame.asset)
      media.push({
        url,
        displayUrl: remote,
        width: dims.width,
        height: dims.height,
        slug,
        title: item.title,
        productId: item._id,
        frameId: `${item._id}::${imageIndex}`,
        imageIndex,
        order: order++,
        itemType: item.category || item.type || '',
      })
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

const unlockStack = () => {
  const stack = stackEl.value
  if (!stack) return
  stack.style.width = ''
  stack.style.height = ''
  if (trackEl.value) trackEl.value.style.minWidth = ''
  openUnlock?.()
  openUnlock = null
}

const settleCards = () => {
  const stack = stackEl.value
  if (!stack) return []
  unlockStack()
  const cards = [...stack.querySelectorAll<HTMLElement>('.d3-gather__card')]
  cards.forEach((card) => {
    gsap.killTweensOf(card)
    releaseCard(card)
    card.style.visibility = ''
  })
  return cards
}

const heldFrameIds = new Set<string>()
const heldGhosts = new Map<string, HTMLImageElement>()

const syncPile = () => {
  handle?.syncConcealed(pileItems.value.map((item) => item.id).filter((id) => !heldFrameIds.has(id)))
}

const releaseHold = (frameId: string) => {
  heldFrameIds.delete(frameId)
  heldGhosts.get(frameId)?.remove()
  heldGhosts.delete(frameId)
  syncPile()
}

const onPileFly = (_phase: 'shown' | 'done', itemId?: string) => {
  if (itemId && heldFrameIds.has(itemId)) releaseHold(itemId)
}

watch(presence, (value) => {
  handle?.setImagePresence(Math.min(100, Math.max(0, Number(value) || 0)) / 100)
})

const setMode = (next: 'control' | 'surrender') => {
  if (mode.value === next) return
  mode.value = next
  handle?.setMode(next)
}

const gather = (payload: D3SelectPayload) => {
  const frameId =
    payload.frameId ||
    `${payload.productId}::${payload.imageIndex ?? 0}`
  if (!frameId || pileItems.value.some((item) => item.id === frameId) || heldFrameIds.has(frameId)) return
  if (!payload.url || payload.screenRect.width < 2) return
  const productFrames = mediaItems.value
    .filter((item) => item.productId === payload.productId)
    .sort((a, b) => (a.imageIndex ?? 0) - (b.imageIndex ?? 0))
  const imageUrls = productFrames.map((item) => item.displayUrl || '').filter(Boolean)
  const displayUrl =
    payload.displayUrl ||
    productFrames.find((item) => item.frameId === frameId)?.displayUrl ||
    payload.url
  const ghost = document.createElement('img')
  ghost.src = payload.url || displayUrl
  ghost.alt = ''
  ghost.setAttribute('aria-hidden', 'true')
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${payload.screenRect.left}px`,
    top: `${payload.screenRect.top}px`,
    width: `${payload.screenRect.width}px`,
    height: `${payload.screenRect.height}px`,
    objectFit: 'cover',
    margin: '0',
    padding: '0',
    pointerEvents: 'none',
    visibility: 'hidden',
    zIndex: '400',
  })
  document.body.appendChild(ghost)
  heldFrameIds.add(frameId)
  heldGhosts.set(frameId, ghost)
  const source = (props.items || []).find((item) => item._id === payload.productId)
  const flying = requestSave(
    {
      id: payload.productId,
      title: payload.title,
      imageUrl: displayUrl,
      itemType: payload.itemType || source?.category || source?.type || 'product',
      link: source ? productPath(source) : null,
      imageUrls: imageUrls.length ? imageUrls : [displayUrl],
      imageIndex: payload.imageIndex ?? 0,
    },
    { source: ghost },
  )
  if (!flying) releaseHold(frameId)
}

type CardBox = {
  left: number
  top: number
  width: number
  height: number
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Visual box. Width and height stay the layout size so the crop can morph. */
const cardBox = (card: HTMLElement): CardBox => {
  const rect = card.getBoundingClientRect()
  const width = card.offsetWidth
  const height = card.offsetHeight
  return {
    left: rect.left + rect.width / 2 - width / 2,
    top: rect.top + rect.height / 2 - height / 2,
    width,
    height,
  }
}

const releaseCard = (card: HTMLElement) => {
  gsap.set(card, {
    clearProps:
      'x,y,scale,scaleX,scaleY,rotation,transform,transformOrigin,left,top,width,height,position,margin,visibility,zIndex,opacity,pointerEvents',
  })
}

/**
 * Cards are already in their final layout. Width and height tween so a square
 * pile can open into each image's own ratio without squashing the photo.
 * Absolute + stack-local coords — `position:fixed` is wrong here because the
 * gather root's translate makes fixed children resolve against that box.
 */
const playIntoLayout = (
  cards: HTMLElement[],
  from: CardBox[],
  duration: number,
  onDone?: () => void,
) => {
  const stack = stackEl.value
  const track = trackEl.value
  if (!stack || !cards.length) {
    onDone?.()
    return
  }
  stack.style.width = `${stack.offsetWidth}px`
  stack.style.height = `${stack.offsetHeight}px`
  // Keep scroll/track size while cards are absolute out of flow.
  if (track) track.style.minWidth = `${track.scrollWidth}px`
  const parent = stack.getBoundingClientRect()
  const ends = cards.map((card) => cardBox(card))
  let pending = 0
  let armed = false
  const finish = (card: HTMLElement) => {
    releaseCard(card)
    pending -= 1
    if (armed && pending <= 0) {
      unlockStack()
      onDone?.()
    }
  }
  cards.forEach((card, index) => {
    const start = from[index]
    const end = ends[index]
    if (!start || !end) return
    pending += 1
    gsap.killTweensOf(card)
    card.style.position = 'absolute'
    card.style.margin = '0'
    card.style.transform = 'none'
    card.style.zIndex = '60'
    gsap.fromTo(
      card,
      {
        left: start.left - parent.left,
        top: start.top - parent.top,
        width: start.width,
        height: start.height,
      },
      {
        left: end.left - parent.left,
        top: end.top - parent.top,
        width: end.width,
        height: end.height,
        duration,
        ease: D3_REVEAL_EASE,
        overwrite: 'auto',
        onComplete: () => finish(card),
      },
    )
  })
  armed = true
  if (pending <= 0) {
    unlockStack()
    onDone?.()
  }
}

const onStackClick = (event: MouseEvent) => {
  if ((event.target as Element | null)?.closest('button')) return
  if (lined.value) return
  void lineUp()
}

const onCardEnter = (index: number) => {
  if (lined.value) return
  pileHover.value = index
}

const onCardLeave = (index: number) => {
  if (pileHover.value === index) pileHover.value = null
}

const onCardClick = (item: GatheredItem, event: MouseEvent) => {
  if (!lined.value) return
  if ((event.target as Element | null)?.closest('button')) return
  event.stopPropagation()
  viewWork(item)
}

const clearScatteredTiles = () => {
  scattered.forEach(({ card, clone }) => {
    gsap.killTweensOf(clone)
    clone.remove()
    card.style.removeProperty('visibility')
  })
  scattered = []
}

/** Sibling kebab cards drift aside while the selected card Flips open. */
const scatterKebabSiblings = (sourceId: string) => {
  clearScatteredTiles()
  const stack = stackEl.value
  if (!stack || !lined.value) return
  const cards = [...stack.querySelectorAll<HTMLElement>('.d3-gather__card')]
  const source = cards.find((card) => card.dataset.gatherId === sourceId)
  if (!source) return
  const origin = source.getBoundingClientRect()
  if (!origin.width || !origin.height) return
  const originX = origin.left + origin.width / 2
  const originY = origin.top + origin.height / 2
  const push = Math.hypot(window.innerWidth, window.innerHeight) * SCATTER_PUSH
  const duration = reducedMotion() ? 0 : SCATTER_OPEN.duration

  cards.forEach((card) => {
    if (card.dataset.gatherId === sourceId) return
    const rect = card.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const img = card.querySelector('img')
    if (!(img instanceof HTMLImageElement)) return

    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let vx = cx - originX
    let vy = cy - originY
    const len = Math.hypot(vx, vy) || 1
    vx /= len
    vy /= len

    const clone = document.createElement('img')
    clone.src = img.currentSrc || img.src
    clone.alt = ''
    clone.setAttribute('aria-hidden', 'true')
    Object.assign(clone.style, {
      position: 'fixed',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      margin: '0',
      objectFit: 'cover',
      borderRadius: '10px',
      zIndex: String(SCATTER_Z),
      pointerEvents: 'none',
      transition: 'none',
    })
    document.body.appendChild(clone)
    card.style.visibility = 'hidden'
    scattered.push({ card, clone, left: rect.left, top: rect.top })
    gsap.to(clone, {
      x: vx * push,
      y: vy * push,
      opacity: 0.35,
      duration,
      ease: SCATTER_OPEN.ease,
      overwrite: true,
    })
  })
}

const armKebabScroll = () => {
  if (!lined.value || kebabScroll.value) return
  const stack = stackEl.value
  const track = trackEl.value
  if (!stack || !track) return
  // Apply scroll layout + centre before paint (avoid a frame at scrollLeft 0).
  stack.classList.add('is-scrolling')
  syncKebabEdgePadding()
  stack.scrollLeft = kebabContentCenterScroll()
  kebabScroll.value = true
  initKebabLenis()
}

const lineUp = async () => {
  if (lined.value || !gathered.value.length || !stackEl.value) return
  document.querySelectorAll('img[data-d3-ghost]').forEach((ghost) => ghost.remove())
  const stack = stackEl.value
  const cards = settleCards()
  if (!cards.length) return
  const pile = cards.map((card) => cardBox(card))
  stack.style.visibility = 'hidden'
  pileHover.value = null
  stopKebabScroll()
  lined.value = true
  await nextTick()
  const duration = reducedMotion() ? 0 : D3_REVEAL_S
  handle?.disperse(duration)
  // Lenis only after the fixed morph lands — avoids scroll clamping mid-tween.
  openUnlock = () => {
    armKebabScroll()
  }
  playIntoLayout(cards, pile, duration)
  stack.style.visibility = ''
}

const closeKebab = async () => {
  if (!lined.value || !stackEl.value) return
  clearScatteredTiles()
  const stack = stackEl.value
  const cards = [...stack.querySelectorAll<HTMLElement>('.d3-gather__card')]
  const from = cards.map((card) => cardBox(card))
  stack.style.visibility = 'hidden'
  cards.forEach((card) => {
    gsap.killTweensOf(card)
    releaseCard(card)
  })
  openUnlock = null
  pileHover.value = null
  // Freeze visual boxes, then leave scroll mode before the reverse morph.
  stopKebabScroll()
  unlockStack()
  lined.value = false
  const duration = reducedMotion() ? 0 : D3_REVEAL_S
  handle?.recall(duration)
  await nextTick()
  playIntoLayout(cards, from, duration)
  stack.style.visibility = ''
}

const REMOVE_S = 0.38
const REMOVE_EASE = 'power2.inOut'

let removingId: string | null = null

const pinCard = (card: HTMLElement, box: CardBox, z = 60) => {
  const stack = stackEl.value
  const parent = stack?.getBoundingClientRect()
  gsap.killTweensOf(card)
  card.style.position = 'absolute'
  card.style.margin = '0'
  card.style.transform = 'none'
  card.style.zIndex = String(z)
  gsap.set(card, {
    left: box.left - (parent?.left ?? 0),
    top: box.top - (parent?.top ?? 0),
    width: box.width,
    height: box.height,
    opacity: 1,
    scale: 1,
  })
}

const removeGathered = async (id: string) => {
  if (removingId) return
  const stack = stackEl.value
  if (!stack) return
  const cards = [...stack.querySelectorAll<HTMLElement>('.d3-gather__card')]
  const leaving = cards.find((card) => card.dataset.gatherId === id)
  const staying = cards.filter((card) => card.dataset.gatherId !== id)
  const from = staying.map((card) => cardBox(card))
  const productId = gathered.value.find((item) => item.id === id)?.productId
  const leaveDuration = reducedMotion() ? 0 : REMOVE_S
  const settleDuration = reducedMotion() ? 0 : D3_REVEAL_S

  removingId = id

  // Hold neighbors in place while the leaving card exits the flow.
  staying.forEach((card, index) => {
    const box = from[index]
    if (box) pinCard(card, box, 60)
  })

  if (leaving && lined.value) {
    const leaveBox = cardBox(leaving)
    pinCard(leaving, leaveBox, 70)
    leaving.style.pointerEvents = 'none'
    await new Promise<void>((resolve) => {
      gsap.to(leaving, {
        opacity: 0,
        scale: 0.84,
        duration: leaveDuration,
        ease: REMOVE_EASE,
        overwrite: 'auto',
        onComplete: resolve,
      })
    })
  }

  gathered.value = gathered.value.filter((item) => item.id !== id)
  if (productId) handle?.reveal(productId)

  if (!gathered.value.length) {
    removingId = null
    stopKebabScroll()
    lined.value = false
    unlockStack()
    handle?.recall(settleDuration)
    return
  }

  await nextTick()
  // Release pins so we can measure the closed gap, then morph into it.
  const nextCards = [...stack.querySelectorAll<HTMLElement>('.d3-gather__card')]
  nextCards.forEach((card) => releaseCard(card))
  resizeKebabLenis()
  playIntoLayout(nextCards, from, settleDuration, () => {
    removingId = null
  })
}

const cardOf = (id: string) =>
  stackEl.value?.querySelector<HTMLElement>(`[data-gather-id="${CSS.escape(id)}"]`) ?? null

const overlapCount = (left?: string[], right?: string[]) => {
  if (!left?.length || !right?.length) return 0
  const set = new Set(left)
  return right.filter((value) => set.has(value)).length
}

const relatedIds = (productId: string) => {
  const items = props.items || []
  const source = items.find((item) => item._id === productId)
  if (!source) return []
  const manual = (source.related || []).map((item) => item._id).filter((id): id is string => Boolean(id))
  if (manual.length) return manual.slice(0, 24)
  const type = source.category || source.type || ''
  return items
    .filter((item) => item._id !== productId)
    .map((item) => {
      const itemType = item.category || item.type || ''
      let score = 0
      if (type && itemType && type === itemType) score += 2
      score += overlapCount(source.colours, item.colours) * 3
      score += overlapCount(source.materials, item.materials) * 3
      score += overlapCount(source.tags, item.tags) * 2
      return { id: item._id, score }
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)
    .map((row) => row.id)
}

const viewWork = (item: GatheredItem) => {
  if (!item.slug) return
  if (lined.value) scatterKebabSiblings(item.id)
  const source = cardOf(item.id)?.querySelector('img')
  openProduct(item.slug, {
    source: source instanceof HTMLElement ? source : undefined,
    productId: item.productId,
    imageIndex: 0,
    flipSrc: item.url,
  })
}

const moreLikeThis = (item: GatheredItem) => {
  viewWork(item)
  const ids = [item.productId, ...relatedIds(item.productId).filter((id) => id !== item.productId)]
  nextTick(() => {
    frozenRelatedIdList.value = ids
    relatedRailVisible.value = true
    syncRelatedRailDom()
  })
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
  syncPile()
  handle.setImagePresence(Math.min(100, Math.max(0, Number(presence.value) || 0)) / 100)
  if (mode.value === 'control') handle.setMode('control')
  window.clearTimeout(loaderHideTimer)
  loaderHideTimer = window.setTimeout(scheduleLoaderHide, 1600)
}

const restoreKebabCache = () => {
  const cached = (kebabCache.value || []).filter(
    (item) => item?.productId && item?.url && item?.slug && item?.id,
  )
  if (!cached.length || !handle) return
  gathered.value = cached.map((item, index) => ({
    id: item.id,
    productId: item.productId,
    slug: item.slug,
    url: item.url,
    aspect: item.aspect > 0 ? item.aspect : 1,
    y: 0,
  }))
  for (const item of gathered.value) handle.conceal(item.productId)
}

const onGatherGlassKey = (event: KeyboardEvent) => {
  if (event.key !== 'g' && event.key !== 'G') return
  if (event.metaKey || event.ctrlKey || event.altKey) return
  const target = event.target
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.closest('input, textarea, select, [contenteditable="true"]'))
  ) {
    return
  }
  gatherGlass.value = !gatherGlass.value
}

onMounted(() => {
  registerPileFly(onPileFly)
  mountCanvas()
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
    media.every((item, index) => item.frameId === prev[index]?.frameId)
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
  handle.setMedia(shuffleMedia(media))
  syncPile()
  handle.setImagePresence(Math.min(100, Math.max(0, Number(presence.value) || 0)) / 100)
  if (mode.value === 'control') handle.setMode('control')
})

watch(
  gathered,
  (items) => {
    kebabCache.value = items.map((item) => ({
      id: item.id,
      productId: item.productId,
      slug: item.slug,
      url: item.url,
      aspect: item.aspect,
      y: item.y,
    }))
  },
  { deep: true },
)

watch(
  () => gathered.value.length,
  async () => {
    if (!lined.value) return
    await nextTick()
    resizeKebabLenis()
  },
)

watch(productClosingFlip, (closing) => {
  if (!closing) return
  // Drop clones as soon as close starts — don’t wait on a return tween.
  clearScatteredTiles()
})

watch(productOverlayOpen, (open) => {
  if (open) return
  clearScatteredTiles()
})

watch(lined, (open) => {
  if (!open) pileHover.value = null
})

watch(
  () => pileItems.value.map((item) => item.id).join('|'),
  () => syncPile(),
)

onBeforeUnmount(() => {
  registerPileFly(null)
  for (const id of [...heldFrameIds]) releaseHold(id)
  window.clearTimeout(loaderHideTimer)
  clearScatteredTiles()
  stopKebabScroll()
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

.d3-field__toggles {
  position: fixed;
  left: 50%;
  bottom: calc(60px + var(--bucket-push, 0px));
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  transform: translateX(-50%);
}

.d3-field__presence {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 6px 12px;
  border: 1px solid var(--grid-line);
  border-radius: 999px;
  background: color-mix(in srgb, var(--background-color, var(--cream)) 88%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  color: var(--charcoal);
  font-size: var(--text-sm);
}

.d3-field__presence input {
  width: 120px;
  margin: 0;
  accent-color: var(--charcoal);
  cursor: pointer;
}

.d3-field__presence-value {
  min-width: 1.6rem;
  text-align: right;
}

.d3-field__mode {
  display: flex;
  gap: 2px;
  margin: 0;
  padding: 4px;
  border: 1px solid var(--grid-line);
  border-radius: 999px;
  background: color-mix(in srgb, var(--background-color, var(--cream)) 88%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.d3-field__mode button {
  margin: 0;
  padding: 0.45rem 1.05rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--charcoal);
  cursor: pointer;
}

.d3-field__mode button.is-active {
  background: var(--charcoal);
  color: var(--cream);
}

.d3-gather {
  --pile-max: min(15vh, 21vw);
  --pile-peek: calc(var(--pile-max) * 0.55);
  --glass-pad: 40px;
  --glass-ease: 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  position: fixed;
  left: 50%;
  top: 50%;
  z-index: 40;
  width: max-content;
  transform: translate(-50%, -50%);
  pointer-events: none;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 40px;
  backdrop-filter: blur(0);
  transition:
    padding var(--glass-ease),
    border-radius var(--glass-ease),
    background var(--glass-ease),
    border-color var(--glass-ease),
    backdrop-filter var(--glass-ease);
}

/* Closed-pile glass panel — toggled with `g`. */
.d3-gather.is-glass:not(.is-row):not(.is-scrolling) {
  background: rgb(0 0 0 / 0.2);
  padding: var(--glass-pad);
  border-color: rgb(255 255 255 / 0.3);
  backdrop-filter: blur(30px);
}

/* Grow with the peek so the glass reshapes around the shifted cards. */
.d3-gather.is-glass:not(.is-row):not(.is-scrolling).is-peeking {
  padding-right: calc(var(--glass-pad) + var(--pile-peek));
  border-radius: 40px 28px 28px 40px;
}

/* Fade glass chrome as the kebab opens. */
.d3-gather.is-glass.is-row {
  background: transparent;
  border-color: transparent;
  backdrop-filter: blur(0);
  padding: 0;
}

.d3-gather__track {
  display: flex;
  align-items: center;
  width: max-content;
}

.d3-gather.is-row {
  --kebab-max: min(52vh, 590px);
}

/* Open morph uses a centred row — Lenis only after cards land. */
.d3-gather.is-row .d3-gather__track {
  gap: 30px;
}

.d3-gather.is-row.is-scrolling {
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  transform: none;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x;
}

.d3-gather.is-row.is-scrolling::-webkit-scrollbar {
  display: none;
}

.d3-gather.is-row.is-scrolling .d3-gather__track {
  height: 100%;
  box-sizing: content-box;
  /* Edge padding is set in JS from the first/last card widths. */
}

.d3-gather__card {
  position: relative;
  pointer-events: auto;
  flex: none;
  width: var(--pile-max);
  height: var(--pile-max);
  margin-left: -8vh;
  transform: none;
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.d3-gather__card:first-child {
  margin-left: 0;
}

.d3-gather:not(.is-row) .d3-gather__card:not(:first-child) {
  box-shadow: -10px 0 20px rgb(0 0 0 / 0.2);
}

.d3-gather:not(.is-row) .d3-gather__card.is-peek-shift {
  transform: translateX(var(--pile-peek));
}

.d3-gather.is-row .d3-gather__card {
  width: min(var(--kebab-max), calc(var(--kebab-max) * var(--ar)));
  height: min(var(--kebab-max), calc(var(--kebab-max) / var(--ar)));
  margin-left: 0;
  transform: none;
  transition: none;
}

.d3-gather__media {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 10px;
}

.d3-gather__card img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  background: var(--cream);
}

/* Invisible hit bridge from the card down to More like this. */
.d3-gather.is-row .d3-gather__card::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 100%;
  z-index: 2;
  width: 10.5rem;
  height: calc(0.75rem + 2.25rem);
  transform: translateX(-50%);
  pointer-events: auto;
}

.d3-gather__remove {
  position: absolute;
  top: 0.55rem;
  left: 0.55rem;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgb(0 0 0 / 0.85);
  color: #fff;
  font-size: 1.05rem;
  line-height: 1;
  opacity: 0;
  transform: scale(0.85);
  pointer-events: none;
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.d3-gather__remove span {
  display: block;
  margin-top: -0.08em;
}

.d3-gather.is-row .d3-gather__card:hover .d3-gather__remove,
.d3-gather.is-row .d3-gather__card:focus-within .d3-gather__remove {
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
}

.d3-gather__more {
  position: absolute;
  top: calc(100% + 0.75rem);
  left: 50%;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 2rem;
  height: 2rem;
  padding: 0;
  overflow: hidden;
  border: 0;
  border-radius: 999px;
  background: rgb(0 0 0 / 0.88);
  color: #fff;
  font: inherit;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  opacity: 0;
  transform: translate(-50%, -0.75rem) scale(0.4);
  pointer-events: none;
}

.d3-gather__more-label {
  opacity: 0;
  padding: 0 0.15rem;
}

.d3-gather.is-row .d3-gather__card:hover .d3-gather__more,
.d3-gather.is-row .d3-gather__card:focus-within .d3-gather__more {
  pointer-events: auto;
  animation: d3-more-pill 0.62s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.d3-gather.is-row .d3-gather__card:hover .d3-gather__more-label,
.d3-gather.is-row .d3-gather__card:focus-within .d3-gather__more-label {
  animation: d3-more-label 0.62s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes d3-more-pill {
  0% {
    opacity: 0;
    width: 2rem;
    padding: 0;
    transform: translate(-50%, -0.85rem) scale(0.35);
  }
  38% {
    opacity: 1;
    width: 2rem;
    padding: 0;
    transform: translate(-50%, 0.18rem) scale(1.06);
  }
  55% {
    opacity: 1;
    width: 2rem;
    padding: 0;
    transform: translate(-50%, 0) scale(1);
  }
  100% {
    opacity: 1;
    width: 9.75rem;
    padding: 0 0.9rem;
    transform: translate(-50%, 0) scale(1);
  }
}

@keyframes d3-more-label {
  0%,
  58% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .d3-gather__card,
  .d3-gather__remove,
  .d3-gather__more,
  .d3-gather__more-label {
    transition: none;
    animation: none;
  }

  .d3-gather.is-row .d3-gather__card:hover .d3-gather__more,
  .d3-gather.is-row .d3-gather__card:focus-within .d3-gather__more {
    opacity: 1;
    width: 9.75rem;
    padding: 0 0.9rem;
    transform: translate(-50%, 0);
  }

  .d3-gather.is-row .d3-gather__card:hover .d3-gather__more-label,
  .d3-gather.is-row .d3-gather__card:focus-within .d3-gather__more-label {
    opacity: 1;
  }
}
</style>
