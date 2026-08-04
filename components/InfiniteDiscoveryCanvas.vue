<template>
  <section class="infinite-discover" aria-label="Explore canvas">
    <div ref="containerEl" class="infinite-discover__stage" />

    <div
      v-if="showLoader"
      class="infinite-discover__loader"
      :class="{ 'infinite-discover__loader--done': loaderDone }"
      aria-hidden="true"
    >
      <div class="infinite-discover__loader-bar" :style="{ width: `${textureProgress}%` }" />
    </div>

    <div class="infinite-discover__controls infinite-discover__controls--left">
      <button type="button" class="infinite-discover__pill" @click="onSurrender">
        Surrender
      </button>
    </div>

    <div class="infinite-discover__controls infinite-discover__controls--right">
      <p class="infinite-discover__hint interface">
        <template v-if="isTouch">Drag to pan · Pinch to zoom · Tap to open</template>
        <template v-else>Drag to pan · Scroll to zoom · Click to open</template>
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  createInfiniteCanvas,
  type InfiniteCanvasHandle,
} from '~/lib/infinite-canvas/createInfiniteCanvas'
import type {
  DiscoveryMediaItem,
  InfiniteCanvasSelectPayload,
} from '~/lib/infinite-canvas/types'
import { productSlug } from '~/composables/useProductCatalog'

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

const props = defineProps<{
  items?: DiscoveryItem[]
}>()

const { imageUrl, getImageSrc } = useSanityImage()
const { open, isOpen } = useProductOverlay()

const containerEl = ref<HTMLElement | null>(null)
const textureProgress = ref(0)
const showLoader = ref(true)
const loaderDone = ref(false)
const isTouch = ref(false)

let handle: InfiniteCanvasHandle | null = null
let loaderHideTimer = 0
let themeObserver: MutationObserver | null = null
let flipGhost: HTMLImageElement | null = null

const clearFlipGhost = () => {
  if (!flipGhost) return
  flipGhost.remove()
  flipGhost = null
}

const createFlipGhost = (payload: InfiniteCanvasSelectPayload) => {
  clearFlipGhost()
  const { screenRect, url } = payload
  if (!url || screenRect.width < 2 || screenRect.height < 2) return null

  const ghost = document.createElement('img')
  ghost.src = url
  ghost.alt = ''
  ghost.setAttribute('aria-hidden', 'true')
  ghost.dataset.infiniteFlipGhost = 'true'
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${screenRect.left}px`,
    top: `${screenRect.top}px`,
    width: `${screenRect.width}px`,
    height: `${screenRect.height}px`,
    margin: '0',
    objectFit: 'cover',
    // Invisible stand-in for Flip metrics only — ProductDetail's flyer is what you see.
    opacity: '0',
    visibility: 'hidden',
    zIndex: '40',
    pointerEvents: 'none',
    borderRadius: '0px',
  } as Partial<CSSStyleDeclaration>)
  document.body.appendChild(ghost)
  flipGhost = ghost
  return ghost
}

const parseDimensions = (asset?: { url?: string; _id?: string }) => {
  const id = asset?._id || ''
  const match = String(id).match(/image-[^-]+-(\d+)x(\d+)-/)
  if (match) {
    return { width: Number(match[1]), height: Number(match[2]) }
  }
  return { width: 1200, height: 1200 }
}

/**
 * Sanity CDN rejects CORS for WebGL textures.
 * Use the same-origin image proxy (query param) — never put `https://…` in a
 * path segment: browsers collapse `//`, and fully encoding the URL 404s as a
 * literal path like `/https%3A%2F%2Fcdn.sanity.io/…`.
 */
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

    const remote =
      imageUrl(item.image, 900) ||
      getImageSrc(item.image?.asset) ||
      (item.gallery?.[0] ? imageUrl(item.gallery[0], 900) : '')
    const url = toCanvasTextureUrl(remote)
    if (!url) continue

    const dims = parseDimensions(item.image?.asset || item.gallery?.[0]?.asset)
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
  if (!import.meta.client) {
    return { background: '#F1EDE4', fog: '#F1EDE4' }
  }
  const styles = getComputedStyle(document.documentElement)
  const cream = styles.getPropertyValue('--cream').trim() || '#F1EDE4'
  return { background: cream, fog: cream }
}

const openProduct = async (payload: InfiniteCanvasSelectPayload) => {
  const source = createFlipGhost(payload)
  if (source && !source.complete) {
    await new Promise<void>((resolve) => {
      source.addEventListener('load', () => resolve(), { once: true })
      source.addEventListener('error', () => resolve(), { once: true })
    })
  }
  open(payload.slug, { source: source || undefined, imageIndex: 0 })
}

const mountCanvas = () => {
  if (!containerEl.value || !import.meta.client) return
  handle?.dispose()
  handle = null

  const media = mediaItems.value
  if (!media.length) return

  const colors = readThemeColors()
  textureProgress.value = 0
  showLoader.value = true
  loaderDone.value = false

  handle = createInfiniteCanvas({
    container: containerEl.value,
    media: shuffleMedia(media),
    layoutSeed: Math.floor(Math.random() * 1_000_000_000),
    backgroundColor: colors.background,
    fogColor: colors.fog,
    onSelect: openProduct,
    onTextureProgress: (progress) => {
      textureProgress.value = Math.max(textureProgress.value, progress)
      if (progress >= 40) scheduleLoaderHide()
    },
  })

  if (import.meta.dev) {
    ;(window as Window & { __infiniteCanvas?: InfiniteCanvasHandle }).__infiniteCanvas =
      handle
  }

  // Textures stream in as you explore — don't wait for 100%.
  window.clearTimeout(loaderHideTimer)
  loaderHideTimer = window.setTimeout(scheduleLoaderHide, 1600)
}

const scheduleLoaderHide = () => {
  if (loaderDone.value) return
  loaderDone.value = true
  window.clearTimeout(loaderHideTimer)
  loaderHideTimer = window.setTimeout(() => {
    showLoader.value = false
  }, 400)
}

const onSurrender = () => {
  // Full reshuffle: new item order + new spatial seed + camera reset.
  if (!handle || !containerEl.value) return
  handle.dispose()
  handle = null
  mountCanvas()
}

const onThemeChange = () => {
  const colors = readThemeColors()
  handle?.setColors(colors.background, colors.fog)
}

onMounted(() => {
  isTouch.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  mountCanvas()

  themeObserver = new MutationObserver(onThemeChange)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
})

watch(mediaItems, (media, prev) => {
  if (!handle) {
    if (media.length) mountCanvas()
    return
  }
  if (!media.length) {
    handle.dispose()
    handle = null
    return
  }
  if (media.length !== prev?.length || media[0]?.productId !== prev?.[0]?.productId) {
    handle.setMedia(media)
  }
})

// Keep the ghost until close Flip finishes (finishClose clears isOpen).
watch(isOpen, (openNow) => {
  if (!openNow) {
    clearFlipGhost()
    handle?.restoreHiddenPlanes()
  }
})

onBeforeUnmount(() => {
  window.clearTimeout(loaderHideTimer)
  clearFlipGhost()
  themeObserver?.disconnect()
  themeObserver = null
  handle?.dispose()
  handle = null
})
</script>

<style scoped>
.infinite-discover {
  position: relative;
  height: 100dvh;
  overflow: hidden;
  background: var(--cream);
}

.infinite-discover__stage {
  position: absolute;
  inset: 0;
  touch-action: none;
}

.infinite-discover__loader {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: flex-end;
  pointer-events: none;
  background: var(--cream);
  transition: opacity 0.45s ease;
}

.infinite-discover__loader--done {
  opacity: 0;
}

.infinite-discover__loader-bar {
  height: 2px;
  background: var(--charcoal);
  transition: width 0.2s ease;
}

.infinite-discover__controls {
  position: fixed;
  bottom: calc(30px + var(--bucket-push));
  z-index: 90;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: bottom var(--bucket-close-ms) cubic-bezier(0.22, 1, 0.36, 1);
}

.infinite-discover__controls--left {
  left: var(--gutter);
}

.infinite-discover__controls--right {
  right: var(--gutter);
}

.infinite-discover__hint {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--muted);
  background: rgba(250, 247, 242, 0.88);
  backdrop-filter: blur(8px);
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
}

:global(html.dark) .infinite-discover__hint {
  background: rgba(31, 28, 24, 0.88);
}

.infinite-discover__pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: var(--text-sm);
  color: var(--charcoal);
  padding: 0.4rem 1rem 0.5em;
  border-radius: 8px;
  background: rgba(250, 247, 242, 0.92);
  backdrop-filter: blur(8px);
  transition: background 0.2s ease, color 0.2s ease;
  border-bottom: 1px solid #ddd;
}

:global(html.dark) .infinite-discover__pill {
  background: rgba(31, 28, 24, 0.92);
  border-bottom-color: rgba(255, 255, 255, 0.12);
}

.infinite-discover__pill:hover {
  background: var(--charcoal);
  color: var(--sand, #faf7f2);
}
</style>
