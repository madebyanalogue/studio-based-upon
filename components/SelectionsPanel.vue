<template>
  <aside
    class="selections-panel"
    aria-label="Selections"
    data-lenis-prevent
  >
    <div class="selections-panel__column">
      <div
        ref="scrollEl"
        class="selections-panel__scroll"
        data-lenis-prevent
        @wheel="onColumnWheel"
      >
        <!-- Pushes thumbs down when there aren't enough to fill the panel -->
        <div class="selections-panel__pin" aria-hidden="true" />

        <button
          v-for="item in columnItems"
          :key="item.id"
          type="button"
          class="selections-panel__thumb"
          :aria-label="item.title"
          @click="onItemClick(item)"
        >
          <img
            v-if="item.imageUrl"
            :src="item.imageUrl"
            :alt="item.title"
            loading="lazy"
            decoding="async"
            draggable="false"
          />
        </button>

        <!-- Reserve bottom footprint like the moodboard pile column -->
        <div class="selections-panel__foot" aria-hidden="true">
          <p class="selections-panel__label interface">
            {{ activeMoodboard?.name || 'Selection' }}
          </p>
          <p v-if="columnItems.length" class="selections-panel__count interface">
            {{ columnItems.length }}
          </p>
          <p v-else class="selections-panel__empty interface">Empty</p>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { BucketItem } from '~/composables/useBucket'

const { items, activeMoodboard, openSelectionStack } = useBucket()
const { open } = useProductOverlay()

const scrollEl = ref<HTMLElement | null>(null)

/** Same order as moodboard column — newest at the top of the pile. */
const columnItems = computed(() => items.value.slice())

const onColumnWheel = (event: WheelEvent) => {
  const scroll = event.currentTarget as HTMLElement | null
  if (!scroll) return
  event.preventDefault()
  event.stopPropagation()
  scroll.scrollTop += event.deltaY
}

const onItemClick = (item: BucketItem) => {
  const slug = item.link?.replace(/^\/products\//, '') || item.link
  if (slug && !slug.startsWith('http')) {
    open(slug.replace(/^\//, ''))
    return
  }
  openSelectionStack()
}

watch(
  () => columnItems.value.length,
  async () => {
    await nextTick()
    const el = scrollEl.value
    if (!el) return
    // Keep the pile foot grounded (same as the moodboard column resting state).
    el.scrollTop = el.scrollHeight
  },
)
</script>

<style scoped>
.selections-panel {
  --selections-cell-pad: 17%;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 200;
  width: var(--selections-panel-width);
  background: var(--cream);
  color: var(--charcoal);
  transition:
    width 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    background var(--theme-ms) var(--theme-ease),
    color var(--theme-ms) var(--theme-ease);
}

.selections-panel__column {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: auto;
}

.selections-panel__scroll {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  overflow-x: hidden;
  overflow-y: scroll;
  overscroll-behavior: contain;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  pointer-events: auto;
}

.selections-panel__scroll::-webkit-scrollbar {
  display: none;
}

.selections-panel__pin {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  pointer-events: none;
}

.selections-panel__thumb {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  flex: 0 0 auto;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  background: transparent;
  cursor: pointer;
  line-height: 0;
  color: inherit;
  touch-action: pan-y;
  user-select: none;
}

.selections-panel__thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: var(--selections-cell-pad);
  box-sizing: border-box;
  pointer-events: none;
  background: transparent;
}

.selections-panel__thumb:hover img,
.selections-panel__thumb:focus-visible img {
  outline: 1px solid color-mix(in srgb, var(--charcoal) 35%, transparent);
  outline-offset: calc(var(--selections-cell-pad) * -0.15);
}

.selections-panel__foot {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  width: 100%;
  min-height: calc(var(--selections-panel-width, 5rem) * 0.55);
  padding: 0.65rem 0.4rem 1rem;
  box-sizing: border-box;
  pointer-events: none;
}

.selections-panel__label,
.selections-panel__count,
.selections-panel__empty {
  margin: 0;
  max-width: 100%;
  font-size: var(--text-xs);
  text-align: center;
  color: var(--muted);
}

.selections-panel__label {
  color: var(--charcoal);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
