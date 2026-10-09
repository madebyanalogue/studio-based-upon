<template>
  <section class="d2-field" aria-label="D2 field">
    <div
      ref="stageEl"
      class="d2-field__stage"
      :data-cursor="hovering ? 'add-selection' : 'default'"
    />

    <div
      v-if="showLoader"
      class="d2-field__loader"
      :class="{ 'd2-field__loader--done': loaderDone }"
      aria-hidden="true"
    >
      <div class="d2-field__loader-bar" :style="{ width: `${textureProgress}%` }" />
    </div>

    <div v-show="!showLoader" class="d2-field__toggles">
      <div
        class="d2-field__mode"
        role="tablist"
        aria-label="Drag"
        data-cursor="default"
      >
        <button
          type="button"
          role="tab"
          class="interface"
          :aria-selected="drag === 'pan'"
          :class="{ 'is-active': drag === 'pan' }"
          @click="setDrag('pan')"
        >
          Pan
        </button>
        <button
          type="button"
          role="tab"
          class="interface"
          :aria-selected="drag === 'rotate'"
          :class="{ 'is-active': drag === 'rotate' }"
          @click="setDrag('rotate')"
        >
          Rotate
        </button>
      </div>

      <div
        class="d2-field__mode"
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
    </div>

    <p class="d2-field__hint interface">{{ hint }}</p>
  </section>
</template>

<script setup lang="ts">
import {
  createD2Canvas,
  type D2CanvasHandle,
  type D2Drag,
  type D2MediaItem,
  type D2Mode,
  type D2SelectPayload,
} from '~/lib/d2-canvas/createD2Canvas'
import { productPath, productSlug } from '~/composables/useProductCatalog'
import { productCoverFrame, productGalleryFrames, galleryFromAssets } from '~/composables/productImages'
import { productIdFromBucketId } from '~/composables/useBucket'

type LibraryItem = {
  _id: string
  title: string
  slug?: { current?: string }
  category?: string
  categories?: string[]
  type?: string
  linkType?: string
  image?: { asset?: { url?: string; _id?: string } }
  gallery?: { asset?: { url?: string; _id?: string } }[]
}

const props = defineProps<{
  items?: LibraryItem[]
}>()

const CLICK_DRAG = 6

const { imageUrl, getImageSrc } = useSanityImage()
const { requestSave, items: pileItems, registerPileFly } = useBucket()

const stageEl = ref<HTMLElement | null>(null)
const textureProgress = ref(0)
const showLoader = ref(true)
const loaderDone = ref(false)
const hovering = ref(false)
const mode = ref<D2Mode>('surrender')
const drag = ref<D2Drag>('pan')

const hint = computed(() => {
  const gesture = drag.value === 'pan' ? 'Drag or flick to move' : 'Drag to look'
  const zoom = mode.value === 'control' ? ' · Scroll to zoom' : ''
  return `${gesture}${zoom} · Click to gather`
})

let handle: D2CanvasHandle | null = null
let loaderHideTimer = 0
let themeObserver: MutationObserver | null = null
let pageLenisPaused = false
let pointerDown: { x: number; y: number } | null = null
let pointerDragged = false
const heldIds = new Set<string>()
const heldGhosts = new Map<string, HTMLImageElement>()
let flights = 0

const visibleGathered = () => {
  const ids = new Set(gatheredIds.value)
  for (const id of heldIds) ids.delete(id)
  return ids
}

const syncVisibleGathered = () => {
  handle?.syncGathered(visibleGathered())
}

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

const toCanvasTextureUrl = (remoteUrl: string) => {
  if (!remoteUrl) return ''
  if (remoteUrl.startsWith('/') || remoteUrl.startsWith('blob:')) return remoteUrl
  return `/api/image-proxy?url=${encodeURIComponent(remoteUrl)}`
}

const parseDimensions = (asset?: { url?: string; _id?: string }) => {
  const id = asset?._id || ''
  const match = String(id).match(/image-[^-]+-(\d+)x(\d+)-/)
  if (match) return { width: Number(match[1]), height: Number(match[2]) }
  return { width: 1200, height: 1200 }
}

const toMedia = (items: LibraryItem[]): D2MediaItem[] => {
  const media: D2MediaItem[] = []
  for (const item of items) {
    const slug = productSlug(item)
    if (!slug) continue
    const cover = productCoverFrame(item)
    const remote =
      (cover ? imageUrl(cover, 900) : '') ||
      (cover?.asset ? getImageSrc(cover.asset) : '') ||
      ''
    const url = toCanvasTextureUrl(remote)
    if (!url || !remote) continue
    const dims = parseDimensions(cover?.asset)
    const frames = productGalleryFrames(item)
    const imageUrls = galleryFromAssets(frames, (source) => imageUrl(source, 1600) || '')
    media.push({
      url,
      displayUrl: remote,
      width: dims.width,
      height: dims.height,
      slug,
      title: item.title,
      productId: item._id,
      itemType: item.category || item.type || 'Work',
      link: productPath(item),
      imageUrls: imageUrls.length > 1 ? imageUrls : undefined,
    })
  }
  return media
}

const mediaItems = computed(() => toMedia(props.items || []))

const gatheredIds = computed(() => {
  const ids = new Set<string>()
  for (const item of pileItems.value) ids.add(productIdFromBucketId(item.id))
  return ids
})

const readThemeColors = () => {
  if (!import.meta.client) return { background: '#eeeeee', fog: '#eeeeee' }
  const cream = getComputedStyle(document.documentElement).getPropertyValue('--cream').trim() || '#eeeeee'
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

const mountCanvas = () => {
  const stage = stageEl.value
  if (!stage || handle) return
  const colors = readThemeColors()
  handle = createD2Canvas(stage, (progress) => {
    textureProgress.value = progress
    if (progress >= 100) scheduleLoaderHide()
  })
  handle.setColors(colors.background, colors.fog)
  handle.setMedia(mediaItems.value)
  handle.syncGathered(gatheredIds.value)
  stage.addEventListener('pointerdown', onPointerDown)
  stage.addEventListener('pointermove', onPointerMove)
  stage.addEventListener('pointerleave', onPointerLeave)
  stage.addEventListener('click', onClick)
}

const onPointerDown = (event: PointerEvent) => {
  if (event.button !== 0) return
  pointerDown = { x: event.clientX, y: event.clientY }
  pointerDragged = false
}

const onPointerMove = (event: PointerEvent) => {
  hovering.value = !!handle?.pick(event.clientX, event.clientY)
  if (!pointerDown) return
  if (Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > CLICK_DRAG) {
    pointerDragged = true
  }
}

const onPointerLeave = () => {
  hovering.value = false
  pointerDown = null
}

const releaseHold = (id: string) => {
  heldIds.delete(id)
  heldGhosts.get(id)?.remove()
  heldGhosts.delete(id)
  syncVisibleGathered()
}

const onPileFly = (phase: 'shown' | 'done', itemId?: string) => {
  if (phase === 'shown') {
    const id = itemId ? productIdFromBucketId(itemId) : heldIds.values().next().value
    if (id) releaseHold(id)
    return
  }
  flights = Math.max(0, flights - 1)
  if (flights > 0) return
  for (const id of [...heldIds]) releaseHold(id)
  handle?.setNavigation(true)
}

const gather = (payload: D2SelectPayload) => {
  if (gatheredIds.value.has(payload.productId) || heldIds.has(payload.productId)) return
  handle?.setNavigation(false)
  heldIds.add(payload.productId)
  flights += 1
  const ghost = document.createElement('img')
  ghost.src = payload.textureUrl || payload.displayUrl
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
  heldGhosts.set(payload.productId, ghost)
  const flying = requestSave(
    {
      id: payload.productId,
      title: payload.title,
      imageUrl: payload.displayUrl,
      itemType: payload.itemType,
      link: payload.link,
      imageUrls: payload.imageUrls,
    },
    { source: ghost },
  )
  if (flying) return
  flights = Math.max(0, flights - 1)
  releaseHold(payload.productId)
  if (flights === 0) handle?.setNavigation(true)
}

const setMode = (next: D2Mode) => {
  if (mode.value === next) return
  mode.value = next
  handle?.setMode(next)
}

const setDrag = (next: D2Drag) => {
  if (drag.value === next) return
  drag.value = next
  handle?.setDrag(next)
}

const onClick = (event: MouseEvent) => {
  pointerDown = null
  if (pointerDragged || event.button !== 0) return
  const payload = handle?.pick(event.clientX, event.clientY)
  if (!payload) return
  gather(payload)
}

watch(mediaItems, (media) => {
  handle?.setMedia(media)
  handle?.syncGathered(gatheredIds.value)
})

watch(gatheredIds, () => {
  syncVisibleGathered()
})

onMounted(() => {
  pausePageLenis()
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

onBeforeUnmount(() => {
  window.clearTimeout(loaderHideTimer)
  registerPileFly(null)
  for (const ghost of heldGhosts.values()) ghost.remove()
  heldGhosts.clear()
  themeObserver?.disconnect()
  const stage = stageEl.value
  stage?.removeEventListener('pointerdown', onPointerDown)
  stage?.removeEventListener('pointermove', onPointerMove)
  stage?.removeEventListener('pointerleave', onPointerLeave)
  stage?.removeEventListener('click', onClick)
  handle?.dispose()
  handle = null
  resumePageLenis()
})
</script>

<style scoped>
.d2-field {
  position: relative;
  height: 100dvh;
  overflow: hidden;
  background: var(--cream);
}

.d2-field__stage {
  position: absolute;
  inset: 0;
  touch-action: none;
}

.d2-field__stage :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.d2-field__loader {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: flex-end;
  pointer-events: none;
  background: var(--cream);
  transition: opacity 0.45s ease;
}

.d2-field__loader--done {
  opacity: 0;
}

.d2-field__loader-bar {
  height: 2px;
  background: var(--charcoal);
  transition: width 0.2s ease;
}

.d2-field__toggles {
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

.d2-field__mode {
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

.d2-field__mode button {
  margin: 0;
  padding: 0.45rem 1.05rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--charcoal);
  cursor: pointer;
}

.d2-field__mode button.is-active {
  background: var(--charcoal);
  color: var(--cream);
}

.d2-field__hint {
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

:global(html.dark) .d2-field__hint {
  background: rgba(31, 28, 24, 0.88);
}
</style>
