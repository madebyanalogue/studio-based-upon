<template>
  <div
    v-if="!dismissed"
    class="piece"
    :class="{ 'piece--selected': selected, 'piece--square': SQUARE_PIECES, 'piece--likes': likesOpen }"
    :data-piece-id="piece.id"
    :data-live="live ? 'true' : 'false'"
    :style="frameStyle"
  >
    <img
      v-for="(like, index) in likes"
      :key="like.id"
      class="piece__like"
      :class="{ 'is-open': likesOpen, 'is-dragging': draggingLikeId === like.id }"
      :src="like.url"
      alt=""
      :style="likeStyle(like, index)"
      draggable="false"
      role="button"
      :aria-label="`Drag ${like.title} onto the board`"
      @pointerdown.stop="onLikeDown($event, like, index)"
      @pointermove="onLikeMove"
      @pointerup.stop="onLikeUp($event, like)"
      @pointercancel.stop="onLikeUp($event, like)"
    />
    <button
      v-if="piece.slug"
      type="button"
      class="piece__open"
      :tabindex="live ? 0 : -1"
      :aria-hidden="live ? undefined : 'true'"
      :aria-label="gridAdd ? `Add ${piece.title} to the grid` : `View ${piece.title}`"
      @click="onOpen"
    >
      <img
        ref="imgEl"
        :src="shown.url"
        :alt="piece.title"
        :width="piece.w"
        :height="piece.h"
        draggable="false"
        decoding="async"
        :loading="loading"
      />
    </button>
    <img
      v-else
      ref="imgEl"
      :src="shown.url"
      alt=""
      :width="piece.w"
      :height="piece.h"
      draggable="false"
      decoding="async"
      :loading="loading"
    />

    <AddButton
      v-if="showChrome"
      class="piece__ctrl piece__minus"
      variant="remove"
      :label="`Remove ${piece.title}`"
      @pointerdown.stop
      @click.stop="onRemove"
    />

    <AddButton
      v-if="showChrome"
      class="piece__ctrl piece__clone"
      variant="clone"
      :label="`Clone ${piece.title}`"
      @pointerdown.stop
      @click.stop="onClone"
    />

    <AddButton
      v-if="showChrome"
      class="piece__ctrl piece__heart"
      :class="{ 'piece__heart--saved': saved }"
      :active="saved"
      :label="saved ? `Remove ${piece.title} from Stack` : `Add ${piece.title} to selection`"
      @pointerdown.stop
      @click.stop="onGather"
    />

    <ImageCycleArrows
      v-if="showChrome && gallery.length > 1"
      class="piece__ctrl piece__cycle"
      :index="frameIndex"
      :count="gallery.length"
      hide-count
      boxed
      @pointerdown.stop
      @prev="cycle(-1)"
      @next="cycle(1)"
    />

    <AddButton
      v-if="showChrome"
      class="piece__ctrl piece__plus"
      :class="{ 'piece__plus--open': likesOpen }"
      variant="plus"
      :aria-pressed="likesOpen"
      :label="likesOpen ? `Hide works like ${piece.title}` : `More like ${piece.title}`"
      @pointerdown.stop
      @click.stop="onMore"
    />

    <template v-if="showChrome">
      <span
        v-for="corner in corners"
        :key="corner"
        class="piece__handle"
        :class="`piece__handle--${corner}`"
        data-cursor="native"
        :data-resize="corner === 'tl' || corner === 'br' ? 'nwse' : 'nesw'"
        @pointerdown.stop="onResizeStart($event, corner)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { StyleValue } from 'vue'
import { DISCOVER_GRID, SQUARE_PIECES, type DiscoverSource, type FieldPiece } from '~/lib/discover/composeField'

const props = withDefaults(
  defineProps<{
    piece: FieldPiece
    frameStyle?: StyleValue
    live?: boolean
    /** Hover chrome. Pieces still inside a stack keep this off. */
    controls?: boolean
    /** Click places the piece on an open grid square instead of opening it. */
    gridAdd?: boolean
    loading?: 'eager' | 'lazy'
  }>(),
  { live: true, controls: true, gridAdd: false, loading: 'lazy' },
)

const corners = ['tl', 'tr', 'bl', 'br'] as const

/** Same card size as an open stack. Eight pieces sit in the cells around this one. */
const LIKE_CARD = 160
const LIKE_TILT = [-1, 0.5, -0.4, 1, -0.7, 0.6, -0.8, 0.3]

const likeSlots = (width: number, height: number) => {
  const inset = (DISCOVER_GRID - LIKE_CARD) / 2
  const xs = [-DISCOVER_GRID + inset, (width - LIKE_CARD) / 2, width + inset]
  const ys = [-DISCOVER_GRID + inset, (height - LIKE_CARD) / 2, height + inset]
  const midX = xs[1]
  const midY = ys[1]
  const slots: { x: number; y: number }[] = []
  for (const y of ys) {
    for (const x of xs) {
      if (x === midX && y === midY) continue
      slots.push({ x, y })
    }
  }
  return slots
}

const { requestSave, isSaved } = useBucket()
const { open } = useProductOverlay()
const blockClick = inject<Ref<boolean>>('discover-block-click', ref(false))
const selectedId = inject<Ref<string | null>>('discover-selected-id', ref(null))
const sources = inject<ComputedRef<DiscoverSource[]>>(
  'discover-sources',
  computed(() => []),
)
const startResize = inject<
  (event: PointerEvent, id: string, corner: (typeof corners)[number]) => void
>('discover-start-resize', () => {})
const fieldZoom = inject<Ref<number>>('discover-zoom', ref(1))
const likeDragActive = inject<Ref<boolean>>('discover-like-drag', ref(false))
const placeLike = inject<(source: DiscoverSource, rect: DOMRect) => void>('discover-place-like', () => {})
const cloneOnGrid = inject<(id: string, rect: DOMRect) => void>('discover-clone-on-grid', () => {})
const placeOnGrid = inject<(id: string) => void>('discover-place-on-grid', () => {})

const returnPiece = inject<(id: string) => boolean>('discover-return-piece', () => false)

const showChrome = computed(() => props.live && props.controls)
const imgEl = ref<HTMLImageElement | null>(null)
const likes = ref<DiscoverSource[]>([])
const likesOpen = ref(false)
const dismissed = ref(false)
const frameIndex = ref(0)
const draggingLikeId = ref<string | null>(null)
const likeNudge = ref<Record<string, { x: number; y: number }>>({})
let likeDrag: {
  id: string
  pointerId: number
  startX: number
  startY: number
  baseX: number
  baseY: number
  scale: number
} | null = null

const gallery = computed(() => {
  const seen = new Set<string>()
  const frames = sources.value
    .filter((source) => source.productId === props.piece.productId && source.url)
    .sort((a, b) => a.imageIndex - b.imageIndex)
  const unique: DiscoverSource[] = []
  for (const source of frames) {
    if (seen.has(source.url)) continue
    seen.add(source.url)
    unique.push(source)
  }
  if (!unique.some((source) => source.url === props.piece.url)) unique.unshift(props.piece)
  return unique.length ? unique : [props.piece]
})

let syncedFrame = false
watch(
  gallery,
  (frames) => {
    if (!syncedFrame) {
      syncedFrame = true
      const index = frames.findIndex((source) => source.url === props.piece.url)
      frameIndex.value = index >= 0 ? index : 0
      return
    }
    if (frameIndex.value >= frames.length) frameIndex.value = 0
  },
  { immediate: true },
)

const shown = computed(() => gallery.value[frameIndex.value] || props.piece)

const cycle = (direction: 1 | -1) => {
  const count = gallery.value.length
  if (count < 2) return
  frameIndex.value = (frameIndex.value + direction + count) % count
}

const selected = computed(() => selectedId.value === props.piece.id)

watch(selected, (on) => {
  if (!on) likesOpen.value = false
})

watch(likesOpen, (open) => {
  if (open) return
  window.setTimeout(() => {
    if (!likesOpen.value) likes.value = []
  }, 640)
})

const saveIndex = computed(() => {
  const index = shown.value.imageIndex
  return index > 0 ? index : undefined
})

const saved = computed(() => isSaved(props.piece.productId, saveIndex.value))

const onOpen = () => {
  if (blockClick.value) {
    blockClick.value = false
    return
  }
  if (props.gridAdd) {
    placeOnGrid(props.piece.id)
    return
  }
  onView()
}

const onView = () => {
  if (!props.live || !props.piece.slug) return
  open(props.piece.slug, {
    source: imgEl.value,
    imageIndex: shown.value.imageIndex,
    productId: props.piece.productId,
    flipSrc: shown.value.url,
  })
}

const onRemove = () => {
  if (returnPiece(props.piece.id)) return
  dismissed.value = true
}

const onClone = () => {
  const host = imgEl.value?.closest('.piece')
  if (!(host instanceof HTMLElement)) return
  cloneOnGrid(props.piece.id, host.getBoundingClientRect())
}

const onGather = () => {
  requestSave(
    {
      id: props.piece.productId,
      title: props.piece.title,
      imageUrl: shown.value.url,
      itemType: 'product',
      link: props.piece.slug ? `/materials-and-forms/${props.piece.slug}` : null,
      imageIndex: saveIndex.value,
    },
    { source: imgEl.value },
  )
}

const pickLikes = () => {
  const piece = props.piece
  const ranked = sources.value
    .filter((source) => source.id !== piece.id && source.url !== piece.url)
    .map((source) => {
      const shared = source.materials.filter((material) => piece.materials.includes(material))
      const score =
        (source.series && source.series === piece.series ? 4 : 0) +
        shared.length * 2 +
        (source.kind === piece.kind ? 2 : 0) +
        (source.productId === piece.productId ? 3 : 0)
      return { source, score }
    })
    .sort((a, b) => b.score - a.score || a.source.title.localeCompare(b.source.title))
  return ranked.slice(0, likeSlots(piece.w, piece.h).length).map((entry) => entry.source)
}

const onMore = async () => {
  if (likesOpen.value) {
    likesOpen.value = false
    return
  }
  selectedId.value = props.piece.id
  if (!likes.value.length) likes.value = pickLikes()
  likesOpen.value = false
  await nextTick()
  requestAnimationFrame(() => {
    likesOpen.value = true
  })
}

const likeStyle = (like: DiscoverSource, index: number) => {
  const slots = likeSlots(props.piece.w, props.piece.h)
  const spot = slots[index] || slots[0]!
  const nudge = likeNudge.value[like.id]
  const open = likesOpen.value
  const restX = (props.piece.w - LIKE_CARD) / 2
  const restY = (props.piece.h - LIKE_CARD) / 2
  const x = nudge?.x ?? (open ? spot.x : restX)
  const y = nudge?.y ?? (open ? spot.y : restY)
  const tilt = open ? LIKE_TILT[index % LIKE_TILT.length]! : 0
  return {
    zIndex: draggingLikeId.value === like.id ? 40 : open ? 6 : 1,
    width: `${LIKE_CARD}px`,
    height: `${LIKE_CARD}px`,
    transform: `translate(${x}px, ${y}px) rotate(${tilt}deg)`,
  }
}

const onLikeDown = (event: PointerEvent, like: DiscoverSource, index: number) => {
  if (!likesOpen.value || event.button !== 0) return
  const slots = likeSlots(props.piece.w, props.piece.h)
  const spot = slots[index] || slots[0]!
  const el = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
  const rect = el?.getBoundingClientRect()
  const scale = rect && el && el.offsetWidth > 0 ? rect.width / el.offsetWidth : Math.max(fieldZoom.value, 0.4)
  likeDrag = {
    id: like.id,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    baseX: spot.x,
    baseY: spot.y,
    scale: scale || 1,
  }
  draggingLikeId.value = like.id
  likeDragActive.value = true
  try {
    el?.setPointerCapture(event.pointerId)
  } catch {
    // Pointer capture is only available for an active pointer.
  }
}

const onLikeMove = (event: PointerEvent) => {
  if (!likeDrag || event.pointerId !== likeDrag.pointerId) return
  const scale = likeDrag.scale || 1
  likeNudge.value = {
    ...likeNudge.value,
    [likeDrag.id]: {
      x: likeDrag.baseX + (event.clientX - likeDrag.startX) / scale,
      y: likeDrag.baseY + (event.clientY - likeDrag.startY) / scale,
    },
  }
}

const onLikeUp = (event: PointerEvent, like: DiscoverSource) => {
  if (!likeDrag || likeDrag.id !== like.id || event.pointerId !== likeDrag.pointerId) return
  const drag = likeDrag
  const travel = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY)
  const el = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
  likeDrag = null
  draggingLikeId.value = null
  likeDragActive.value = false
  if (travel < 6 || !el) {
    const next = { ...likeNudge.value }
    delete next[like.id]
    likeNudge.value = next
    return
  }
  const scale = drag.scale || 1
  el.style.transform = `translate(${drag.baseX + (event.clientX - drag.startX) / scale}px, ${drag.baseY + (event.clientY - drag.startY) / scale}px)`
  blockClick.value = true
  window.setTimeout(() => {
    blockClick.value = false
  }, 0)
  placeLike(like, el.getBoundingClientRect())
  likes.value = likes.value.filter((entry) => entry.id !== like.id)
  const next = { ...likeNudge.value }
  delete next[like.id]
  likeNudge.value = next
}

const onResizeStart = (event: PointerEvent, corner: (typeof corners)[number]) => {
  startResize(event, props.piece.id, corner)
}
</script>

<style scoped>
.piece {
  position: absolute;
  left: 0;
  top: 0;
  container-type: inline-size;
}

.piece--selected {
  z-index: 30;
}

.piece--likes {
  z-index: 40 !important;
}

.piece__open {
  position: relative;
  z-index: 4;
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
}

.piece__open:focus-visible {
  outline: 1px solid var(--charcoal);
  outline-offset: 4px;
}

.piece__ctrl {
  --thumb-ctrl-size: calc(23px / max(var(--field-zoom, 1), 1));
  --piece-inset: calc(6px / max(var(--field-zoom, 1), 1));
  position: absolute;
  z-index: 9;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.piece__minus {
  top: var(--piece-inset);
  left: var(--piece-inset);
}

.piece__clone {
  top: var(--piece-inset);
  left: calc(var(--piece-inset) + var(--thumb-ctrl-size) + var(--piece-inset));
}

.piece__heart {
  top: var(--piece-inset);
  right: var(--piece-inset);
}

.piece__cycle {
  right: var(--piece-inset);
  bottom: var(--piece-inset);
}

.piece__plus {
  right: var(--piece-inset);
  bottom: var(--piece-inset);
}

.piece:has(.piece__cycle) .piece__plus {
  right: calc(var(--piece-inset) + (var(--thumb-ctrl-size) * 2) + var(--piece-inset));
}

.piece:hover .piece__ctrl,
.piece--selected .piece__ctrl,
.piece__heart--saved,
.piece__plus--open {
  opacity: 1;
  pointer-events: auto;
}

.piece img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: var(--sand);
  pointer-events: none;
  user-select: none;
}

.piece > img:not(.piece__like) {
  position: relative;
  z-index: 4;
}

.piece--square img.piece__like {
  aspect-ratio: 1;
  object-fit: cover;
}

.piece img.piece__like {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 1;
  width: 160px;
  height: 160px;
  pointer-events: none;
  touch-action: none;
  transition:
    transform 0.62s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.35s ease;
}

.piece img.piece__like.is-open {
  z-index: 6;
  pointer-events: auto;
}

.piece img.piece__like.is-dragging {
  z-index: 40;
  transition: none;
}

.piece__handle {
  position: absolute;
  z-index: 8;
  width: 36px;
  height: 36px;
  background: transparent;
  transform: translate(-50%, -50%) scale(calc(1 / var(--field-zoom, 1)));
}

.piece__handle--tl {
  top: 0;
  left: 0;
  cursor: nwse-resize;
}

.piece__handle--tr {
  top: 0;
  left: 100%;
  cursor: nesw-resize;
}

.piece__handle--bl {
  top: 100%;
  left: 0;
  cursor: nesw-resize;
}

.piece__handle--br {
  top: 100%;
  left: 100%;
  cursor: nwse-resize;
}

</style>
