<template>
  <section
    v-if="collection?.artworks?.length"
    ref="railEl"
    class="collection-rail"
    :class="[
      `collection-rail--${displayMode}`,
      {
        'collection-rail--hot': isPreview || isActive || isClosing,
        'collection-rail--active': isActive,
      },
    ]"
    :aria-label="collection.title"
    :data-typology-rail="myId"
    :data-cursor="isActive || isClosing ? 'default' : undefined"
    :data-cursor-label="otherRailLabel || undefined"
    @pointerleave="onRailPointerLeave"
  >
    <header class="collection-rail__header" aria-hidden="true">
      <div class="collection-rail__heading">
        <h2 class="collection-rail__title serif">{{ collection.title }}</h2>
      </div>
    </header>

    <div
      ref="scrollerEl"
      class="collection-rail__scroller"
      data-lenis-prevent-horizontal
    >
      <div
        ref="trackEl"
        class="collection-rail__track"
        :data-cursor="isActive ? 'close' : undefined"
      >
        <div
          class="collection-rail__lead"
          data-cursor="close"
          aria-hidden="true"
          @pointerenter="onLeadPointerEnter"
        />
        <DiscoverArtworkCard
          v-for="(artwork, index) in collection.artworks"
          :key="artwork.id"
          class="collection-rail__card"
          :class="{
            'collection-rail__card--anchor': index === 0,
            'collection-rail__card--trigger': index === 0,
          }"
          :artwork="artwork"
          :style="{ '--card-aspect': cardAspect(artwork.cardRatio) }"
          :trigger="!controlsReady"
          :controls="controlsReady"
          :sequence="railSequence"
          :hit-label="index === 0 && !controlsReady ? `Show ${collection.title}` : ''"
          :cursor-label="cardCursorLabel(index, artwork.title)"
          @pointerenter="index === 0 && !controlsReady && onTriggerPointerEnter()"
          @activate="onActivate(index)"
        />
        <div class="collection-rail__tail" data-cursor="close" aria-hidden="true" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import Lenis from 'lenis'
import type {
  DiscoverCollection,
  DiscoverDisplayMode,
} from '~/composables/useCuratedDiscover'
import {
  typologyActiveRailId,
  typologyHandoffRailId,
  typologyPointerPaused,
  typologyRowHoverKey,
  typologyRowsLocked,
} from '~/composables/useTypologyRowHover'

const props = withDefaults(
  defineProps<{
    collection: DiscoverCollection | null
    displayMode?: DiscoverDisplayMode
  }>(),
  { displayMode: 'gallery' },
)

/** Width ÷ height, so an open card can be sized from a shared height. */
const cardAspect = (ratio?: string) => {
  if (ratio === 'wide') return '1.75'
  if (ratio === '2/3') return '0.666667'
  if (ratio === '1/1') return '1'
  return '1.5'
}

/** Order the PDP Next control follows when a card in this row is opened. */
const railSequence = computed(() =>
  (props.collection?.artworks ?? [])
    .filter((artwork) => artwork.slug)
    .map((artwork) => ({
      slug: artwork.slug as string,
      title: artwork.title,
      imageUrl: artwork.imageUrl,
    })),
)

const rowHover = inject(typologyRowHoverKey, null)
const myId = useId()

const scrollerEl = ref<HTMLElement | null>(null)
const trackEl = ref<HTMLElement | null>(null)
const railEl = ref<HTMLElement | null>(null)
/** Hovering the first item reveals the rest of the row. */
const isPreview = ref(false)
/** Row is open: taller in document flow, first item at the left edge. */
const isActive = ref(false)
/** Hearts and image controls, after the open animation. */
const controlsReady = ref(false)
/** Close animation is running. Other rows stay inert until it finishes. */
const isClosing = ref(false)
/** Name shown on the cursor when another row is open. */
const otherRailLabel = computed(() =>
  typologyRowsLocked.value && !isActive.value && !isClosing.value
    ? props.collection?.title?.trim() || ''
    : '',
)

/** True after the user scrolls an open row. Thumbnails then use product titles. */
const railScrolled = ref(false)

/** Trigger cell asks to view the collection; scrolled thumbnails use the product title. */
const cardCursorLabel = (index: number, title: string) => {
  if (otherRailLabel.value) return otherRailLabel.value
  if (index === 0 && !controlsReady.value) return 'Explore'
  if (controlsReady.value && railScrolled.value) return title.trim()
  return ''
}

let railLenis: Lenis | null = null
let railLenisRaf = 0
let railResizeObserver: ResizeObserver | null = null
let activateGen = 0
let scrollGen = 0
let engaged = false
let outsideBound = false
let wheelBound = false
let clickBound = false
let escapeBound = false
/** Horizontal scroll position before this row was opened. */
let restScroll = 0
/** Card to park on the center column when the row opens. */
let alignIndex = 0
const MOTION_MS = 700
/** Glide a later item into the first cell's column. Slower than the row grow. */
const ALIGN_SCROLL_MS = 1400
let alignFrom = 0
let alignStartedAt = 0
const homeScrollHint = useHomeScrollHint()
let scrollHintActive = false
let unbindScrollHint: (() => void) | null = null

const dismissRailScrollHint = () => {
  if (!scrollHintActive) return
  scrollHintActive = false
  unbindScrollHint?.()
  unbindScrollHint = null
  homeScrollHint.value = false
}

const showRailScrollHint = () => {
  scrollHintActive = true
  homeScrollHint.value = true
}

/** Ignore the open-align scroll. Clear the hint once the user moves the row. */
const armRailScrollHint = () => {
  const scroller = scrollerEl.value
  if (!scroller) return
  unbindScrollHint?.()
  const origin = scroller.scrollLeft
  const onScroll = () => {
    if (Math.abs(scroller.scrollLeft - origin) < 2) return
    railScrolled.value = true
    dismissRailScrollHint()
  }
  scroller.addEventListener('scroll', onScroll, { passive: true })
  unbindScrollHint = () => scroller.removeEventListener('scroll', onScroll)
}

const destroyRailLenis = () => {
  railResizeObserver?.disconnect()
  railResizeObserver = null
  if (railLenisRaf) {
    cancelAnimationFrame(railLenisRaf)
    railLenisRaf = 0
  }
  railLenis?.destroy()
  railLenis = null
}

const tickRailLenis = (time: number) => {
  railLenis?.raf(time)
  railLenisRaf = requestAnimationFrame(tickRailLenis)
}

const getCards = () =>
  [
    ...(trackEl.value?.querySelectorAll<HTMLElement>('.collection-rail__card') ||
      []),
  ]

const pageLenis = () =>
  useNuxtApp().$lenis as
    | {
        scroll: number
        scrollTo: (
          target: number,
          options?: { immediate?: boolean; duration?: number; onComplete?: () => void },
        ) => void
      }
    | undefined

const applyRailScroll = (value: number) => {
  const wrapper = scrollerEl.value
  if (!wrapper) return
  const max = Math.max(0, wrapper.scrollWidth - wrapper.clientWidth)
  const target = Math.min(max, Math.max(0, value))
  if (railLenis) railLenis.scrollTo(target, { immediate: true, force: true })
  if (Math.abs(wrapper.scrollLeft - target) > 1) wrapper.scrollLeft = target
}

const scrollRailTo = (left: number, immediate = false) =>
  new Promise<void>((resolve) => {
    const wrapper = scrollerEl.value
    if (!wrapper) {
      resolve()
      return
    }
    const gen = ++scrollGen
    railLenis?.resize()
    const max = Math.max(0, wrapper.scrollWidth - wrapper.clientWidth)
    const target = Math.min(max, Math.max(0, left))
    const from = wrapper.scrollLeft
    if (immediate || Math.abs(from - target) < 1) {
      applyRailScroll(target)
      resolve()
      return
    }
    const start = performance.now()
    const step = (now: number) => {
      if (gen !== scrollGen) {
        resolve()
        return
      }
      const t = Math.min(1, (now - start) / MOTION_MS)
      const eased = 1 - Math.pow(1 - t, 3)
      applyRailScroll(from + (target - from) * eased)
      if (t < 1) requestAnimationFrame(step)
      else resolve()
    }
    requestAnimationFrame(step)
  })

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Bring this row's vertical center to the middle of the viewport. */
const centerRowVertically = () =>
  new Promise<void>((resolve) => {
    const rail = railEl.value
    const lenis = pageLenis()
    if (!rail) {
      resolve()
      return
    }
    const rect = rail.getBoundingClientRect()
    const delta = rect.top + rect.height / 2 - window.innerHeight / 2
    if (Math.abs(delta) < 2) {
      resolve()
      return
    }
    const immediate = prefersReducedMotion()
    if (!lenis) {
      window.scrollTo({ top: window.scrollY + delta, behavior: immediate ? 'auto' : 'smooth' })
      window.setTimeout(resolve, immediate ? 0 : 700)
      return
    }
    if (immediate) {
      lenis.scrollTo(lenis.scroll + delta, { immediate: true })
      resolve()
      return
    }
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }
    window.setTimeout(finish, 1100)
    lenis.scrollTo(lenis.scroll + delta, { duration: 0.85, onComplete: finish })
  })

/** Keep the growing or shrinking row centered so neighbours move apart evenly. */
const holdRowCentered = (ms: number) =>
  new Promise<void>((resolve) => {
    if (ms <= 0) {
      resolve()
      return
    }
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }
    const start = performance.now()
    const step = (now: number) => {
      if (settled) return
      const rail = railEl.value
      const lenis = pageLenis()
      if (rail && lenis) {
        const rect = rail.getBoundingClientRect()
        const delta = rect.top + rect.height / 2 - window.innerHeight / 2
        if (Math.abs(delta) > 0.5) {
          lenis.scrollTo(lenis.scroll + delta, { immediate: true })
        }
      }
      alignClickedCard()
      if (now - start < ms) requestAnimationFrame(step)
      else finish()
    }
    requestAnimationFrame(step)
    window.setTimeout(finish, ms + 80)
  })

const syncPageChrome = () => {
  const parent = railEl.value?.parentElement
  if (!parent) return
  parent.classList.toggle(
    'discover-page__content--row-hot',
    !!parent.querySelector('.collection-rail--hot'),
  )
  parent.classList.toggle(
    'discover-page__content--row-locked',
    typologyRowsLocked.value,
  )
  const labeled =
    parent.querySelector('.collection-rail--active') ||
    parent.querySelector('.collection-rail--hot')
  const title = labeled?.querySelector('.collection-rail__title')?.textContent?.trim() || null
  if (title) {
    rowHover?.setHoveredTitle(title)
    return
  }
  // Crossing from one trigger to the next still sits inside the column.
  // Keep the previous title until the next trigger sets its own.
  if (parent.matches(':hover')) return
  rowHover?.setHoveredTitle(null)
}

const unbindActiveInput = () => {
  if (wheelBound) {
    wheelBound = false
    document.removeEventListener('wheel', onActiveWheel, true)
  }
  if (outsideBound) {
    outsideBound = false
    window.removeEventListener('pointerdown', onDocPointerDown, true)
  }
  if (clickBound) {
    clickBound = false
    window.removeEventListener('click', onOutsideClick, true)
  }
  if (escapeBound) {
    escapeBound = false
    window.removeEventListener('keydown', onEscape)
  }
}

const waitForGrow = () =>
  new Promise<void>((resolve) => {
    const rail = railEl.value
    if (!rail || prefersReducedMotion()) {
      resolve()
      return
    }
    let done = false
    const finish = () => {
      if (done) return
      done = true
      rail.removeEventListener('transitionend', onEnd)
      resolve()
    }
    const onEnd = (event: TransitionEvent) => {
      if (event.target === rail && event.propertyName === '--rail-open') finish()
    }
    rail.addEventListener('transitionend', onEnd)
    window.setTimeout(finish, MOTION_MS + 500)
  })

const finishClose = async (gen: number) => {
  const ms = prefersReducedMotion() ? 0 : MOTION_MS
  await Promise.all([
    scrollRailTo(restScroll, ms === 0),
    holdRowCentered(ms),
    waitForGrow(),
  ])
  if (gen !== activateGen) return
  isClosing.value = false
  controlsReady.value = false
  unbindActiveInput()
  const nextId = typologyHandoffRailId.value
  typologyHandoffRailId.value = null
  if (nextId && nextId !== myId) {
    typologyActiveRailId.value = nextId
  } else {
    if (typologyActiveRailId.value === myId) typologyActiveRailId.value = null
    typologyRowsLocked.value = false
    typologyPointerPaused.value = false
  }
  await nextTick()
  syncPageChrome()
}

const deactivate = () => {
  if (isClosing.value) return
  if (!engaged && !isActive.value) return
  const gen = ++activateGen
  scrollGen += 1
  typologyPointerPaused.value = true
  isClosing.value = true
  engaged = false
  controlsReady.value = false
  isActive.value = false
  isPreview.value = false
  railScrolled.value = false
  dismissRailScrollHint()
  typologyRowsLocked.value = true
  if (wheelBound) {
    wheelBound = false
    document.removeEventListener('wheel', onActiveWheel, true)
  }
  syncPageChrome()
  void finishClose(gen)
}

/** True when the pointer is on a thumbnail, not the empty space around it. */
const isOverRailCard = (event: { clientX: number; clientY: number; target: EventTarget | null }) => {
  const target = event.target
  if (!(target instanceof Element) || !railEl.value?.contains(target)) return false
  if (target.closest('.collection-rail__lead, .collection-rail__tail')) return false
  return getCards().some((card) => {
    const rect = card.getBoundingClientRect()
    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    )
  })
}

const handoffRailId = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return null
  const card = target.closest('.collection-rail__card--trigger')
  const rail = card?.closest('.collection-rail')
  if (!(rail instanceof HTMLElement) || rail === railEl.value) return null
  return rail.dataset.typologyRail || null
}

/** Empty end caps inside the open row. Clicking them also closes it. */
const isDeadZone = (target: EventTarget | null) =>
  target instanceof Element &&
  !!target.closest('.collection-rail__lead, .collection-rail__tail') &&
  target.closest('.collection-rail') === railEl.value

const onDocPointerDown = (event: PointerEvent) => {
  const target = event.target
  if (!(target instanceof Node)) return
  if (target instanceof Element && target.closest('.product-overlay')) return
  const nextId = handoffRailId(target)
  if (nextId) {
    typologyHandoffRailId.value = nextId
    event.preventDefault()
    event.stopPropagation()
    deactivate()
    return
  }
  if (isDeadZone(target)) {
    event.preventDefault()
    event.stopPropagation()
    deactivate()
    return
  }
  if (target instanceof Element && railEl.value?.contains(target)) return
  event.preventDefault()
  event.stopPropagation()
  deactivate()
}

const onEscape = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || event.repeat) return
  if (!isActive.value && !engaged) return
  if (document.querySelector('.product-overlay')) return
  event.preventDefault()
  deactivate()
}

/** Swallow the click that closed the row so it cannot open another one. */
const onOutsideClick = (event: MouseEvent) => {
  if (!typologyRowsLocked.value || typologyActiveRailId.value !== myId) return
  const target = event.target
  if (target instanceof Element && target.closest('.product-overlay')) return
  if (isActive.value && !isClosing.value && isOverRailCard(event)) {
    return
  }
  event.preventDefault()
  event.stopPropagation()
}

/** Both wheel axes drive the active row horizontally. The page does not move. */
const onActiveWheel = (event: WheelEvent) => {
  if (!isActive.value || !railLenis) return
  const target = event.target
  if (target instanceof Element && target.closest('.product-overlay')) return
  event.preventDefault()
  event.stopPropagation()
  let dx = event.deltaX
  let dy = event.deltaY
  if (event.deltaMode === 1) {
    dx *= 16
    dy *= 16
  } else if (event.deltaMode === 2) {
    dx *= window.innerWidth
    dy *= window.innerHeight
  }
  const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy
  if (!delta) return
  railScrolled.value = true
  dismissRailScrollHint()
  const next = railLenis.targetScroll + delta
  if (prefersReducedMotion()) {
    applyRailScroll(next)
    return
  }
  railLenis.scrollTo(next, {
    lerp: 0.085,
    programmatic: false,
    force: true,
  })
}

const onTriggerPointerEnter = () => {
  if (typologyRowsLocked.value && typologyActiveRailId.value !== myId) return
  isPreview.value = true
  rowHover?.setHoveredTitle(props.collection?.title || null)
}

const onLeadPointerEnter = () => {
  if (isClosing.value || isActive.value || engaged) return
  if (!isPreview.value) return
  isPreview.value = false
  rowHover?.setHoveredTitle(null)
}

const onRailPointerLeave = () => {
  if (isActive.value || engaged) return
  isPreview.value = false
}

/** Keep the clicked product on the same column the first cell rests on. */
const alignClickedCard = (immediate = false) => {
  if (!isActive.value || isClosing.value || alignIndex <= 0) return
  const cards = getCards()
  const anchor = cards[0]
  const card = cards[alignIndex]
  if (!anchor || !card) return
  railLenis?.resize()
  const target = card.offsetLeft - anchor.offsetLeft
  if (immediate) {
    applyRailScroll(target)
    return
  }
  const t = Math.min(1, (performance.now() - alignStartedAt) / ALIGN_SCROLL_MS)
  const eased = 1 - (1 - t) ** 3
  applyRailScroll(alignFrom + (target - alignFrom) * eased)
}

const finishAlignScroll = () =>
  new Promise<void>((resolve) => {
    if (alignIndex <= 0) {
      resolve()
      return
    }
    if (prefersReducedMotion()) {
      alignClickedCard(true)
      resolve()
      return
    }
    const step = () => {
      if (!isActive.value || isClosing.value) {
        resolve()
        return
      }
      alignClickedCard()
      if (performance.now() - alignStartedAt < ALIGN_SCROLL_MS) {
        requestAnimationFrame(step)
        return
      }
      alignClickedCard(true)
      resolve()
    }
    requestAnimationFrame(step)
  })

const onActivate = async (cardIndex = 0) => {
  if (engaged || isActive.value || isClosing.value) return
  if (typologyRowsLocked.value && typologyActiveRailId.value !== myId) return
  engaged = true
  alignIndex = cardIndex
  showRailScrollHint()
  typologyPointerPaused.value = true
  const gen = ++activateGen
  restScroll = scrollerEl.value?.scrollLeft ?? 0
  typologyActiveRailId.value = myId
  typologyRowsLocked.value = true
  isPreview.value = true
  controlsReady.value = false
  if (!outsideBound) {
    outsideBound = true
    window.addEventListener('pointerdown', onDocPointerDown, true)
  }
  if (!clickBound) {
    clickBound = true
    window.addEventListener('click', onOutsideClick, true)
  }
  syncPageChrome()
  await nextTick()
  await new Promise<void>((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      resolve()
    }
    requestAnimationFrame(() => requestAnimationFrame(finish))
    window.setTimeout(finish, 48)
  })
  if (gen !== activateGen) return
  railLenis?.resize()
  await centerRowVertically()
  if (gen !== activateGen) return
  const motion = prefersReducedMotion() ? 0 : MOTION_MS
  isActive.value = true
  alignFrom = scrollerEl.value?.scrollLeft ?? 0
  alignStartedAt = performance.now()
  await Promise.all([holdRowCentered(motion), finishAlignScroll()])
  if (gen !== activateGen) return
  controlsReady.value = true
  typologyPointerPaused.value = false
  if (!wheelBound) {
    wheelBound = true
    document.addEventListener('wheel', onActiveWheel, { capture: true, passive: false })
  }
  if (scrollHintActive) armRailScrollHint()
  syncPageChrome()
}

const initRailLenis = () => {
  if (!import.meta.client) return
  const wrapper = scrollerEl.value
  const content = trackEl.value
  if (!wrapper || !content) return

  destroyRailLenis()
  railLenis = new Lenis({
    wrapper,
    content,
    orientation: 'horizontal',
    gestureOrientation: 'horizontal',
    smoothWheel: true,
    syncTouch: true,
    syncTouchLerp: 0.055,
    touchInertiaExponent: 2.05,
    touchMultiplier: 1.4,
    wheelMultiplier: 1.15,
    lerp: 0.08,
    overscroll: false,
    // Inactive rows keep their scroll position and let the page take the wheel.
    prevent: () => !isActive.value,
  })
  railLenis.resize()
  if (typeof ResizeObserver !== 'undefined') {
    railResizeObserver = new ResizeObserver(() => {
      railLenis?.resize()
    })
    railResizeObserver.observe(content)
    railResizeObserver.observe(wrapper)
  }
  railLenisRaf = requestAnimationFrame(tickRailLenis)
}

const onWindowResize = () => {
  railLenis?.resize()
}

onMounted(() => {
  nextTick(() => {
    initRailLenis()
  })
  window.addEventListener('resize', onWindowResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  activateGen += 1
  scrollGen += 1
  if (typologyActiveRailId.value === myId) typologyActiveRailId.value = null
  if (engaged || isActive.value || isClosing.value) {
    typologyRowsLocked.value = false
    typologyPointerPaused.value = false
    if (typologyHandoffRailId.value) typologyHandoffRailId.value = null
  }
  unbindActiveInput()
  dismissRailScrollHint()
  void nextTick(syncPageChrome)
  destroyRailLenis()
})

watch([isPreview, isActive], () => {
  void nextTick(syncPageChrome)
})

watch(typologyActiveRailId, (id) => {
  if (id === myId && !engaged && !isActive.value && !isClosing.value) {
    void onActivate()
    return
  }
  if (!id || id === myId || !engaged) return
  deactivate()
})

watch(
  () => props.collection?.artworks.map((a) => a.id).join('|'),
  async () => {
    await nextTick()
    if (!scrollerEl.value || !trackEl.value) {
      destroyRailLenis()
      return
    }
    if (!railLenis) initRailLenis()
    else railLenis.resize()
  },
)
</script>

<style scoped>
.collection-rail {
  --discover-rail-gap: 5px;
  --rail-cols: 5;
  --rail-gaps: 4;
  --rail-card-size: calc(
    (100vw - (var(--discover-rail-gap) * var(--rail-gaps))) / var(--rail-cols)
  );
  --rail-open: 0;
  /* Portrait card at 3× its resting width. Every open card aims at this height. */
  --rail-open-height: calc(var(--rail-card-size) * 2);
  padding: 0;
  margin-bottom: 0;
  transition: --rail-open 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}

.collection-rail--active {
  --rail-open: 1;
  position: relative;
  z-index: 4;
}

.collection-rail--editorial {
  --rail-cols: 5;
  --rail-gaps: 4;
}

/* Per-row titles hidden — fixed page title handles labeling */
.collection-rail__header {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.collection-rail__scroller {
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  width: 100%;
}

/* Mouse cannot drag the row sideways until it is open. Touch stays vertical so the page can scroll. */
.collection-rail:not(.collection-rail--active) .collection-rail__scroller {
  overflow-x: hidden;
  touch-action: pan-y;
}

.collection-rail--active .collection-rail__scroller {
  touch-action: pan-x;
}

.collection-rail__scroller::-webkit-scrollbar {
  display: none;
}

.collection-rail__track {
  display: flex;
  align-items: flex-end;
  gap: var(--discover-rail-gap);
  width: max-content;
  padding-block: calc(var(--discover-rail-gap) / 2);
  box-sizing: content-box;
}

/* Fixed end caps, sized to the resting card. Clicking them closes an open row. */
.collection-rail__lead,
.collection-rail__tail {
  flex: 0 0 auto;
  align-self: stretch;
  width: calc(50vw - (var(--rail-card-size) / 2));
  pointer-events: none;
}

.collection-rail--hot .collection-rail__lead,
.collection-rail--active .collection-rail__lead,
.collection-rail--active .collection-rail__tail {
  pointer-events: auto;
}

.collection-rail__lead {
  margin-right: calc(var(--discover-rail-gap) * -1);
}

.collection-rail__tail {
  margin-left: calc(var(--discover-rail-gap) * -1);
}

.collection-rail__card {
  --card-aspect: 1.5;
  --rail-card-open: calc(var(--rail-open-height) * var(--card-aspect));
  flex: 0 0 auto;
  box-sizing: border-box;
  width: calc(
    var(--rail-card-size) + (var(--rail-card-open) - var(--rail-card-size)) * var(--rail-open)
  );
  min-width: 0;
  max-width: none;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.35s ease;
}

/* Resting: only the first item is visible. It is the row trigger. */
.collection-rail__card--trigger {
  opacity: 1;
  pointer-events: auto;
}

/* Hovering the trigger reveals the row. Any product can then open it. */
.collection-rail--hot .collection-rail__card {
  opacity: 1;
  pointer-events: auto;
}

.collection-rail--active .collection-rail__card {
  pointer-events: auto;
}

.collection-rail__card :deep(.discover-card__meta) {
  display: none;
}

@media (max-width: 899px) {
  .collection-rail {
    --rail-cols: 3.5;
    --rail-gaps: 3;
  }
}

@media (max-width: 599px) {
  .collection-rail {
    --rail-cols: 2.25;
    --rail-gaps: 2;
  }
}

@media (prefers-reduced-motion: reduce) {
  .collection-rail,
  .collection-rail__card {
    transition: none;
  }
}
</style>
