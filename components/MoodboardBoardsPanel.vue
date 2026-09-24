<template>
  <aside
    class="boards-panel"
    :class="{
      'boards-panel--open': open,
      'boards-panel--fixed': fixed,
    }"
    aria-label="My Boards"
    data-lenis-prevent
  >
    <div class="boards-panel__rail">
      <header class="boards-panel__header">
        <h2 class="boards-panel__title interface">My Boards</h2>
        <button
          type="button"
          class="boards-panel__close"
          aria-label="Close boards"
          @click="closeBoardsPanel"
        >
          <span class="boards-panel__close-icon" aria-hidden="true" />
        </button>
      </header>

      <div
        ref="scrollEl"
        class="boards-panel__scroll"
        data-moodboard-scroll
        data-lenis-prevent
      >
        <button
          type="button"
          class="boards-panel__create"
          aria-label="Create a Board"
          @click="emit('create')"
        >
          <span class="boards-panel__create-frame" aria-hidden="true">
            <span class="boards-panel__create-plus">
              <span class="boards-panel__create-plus-h" />
              <span class="boards-panel__create-plus-v" />
            </span>
          </span>
          <span class="boards-panel__name boards-panel__create-label">
            Create a Board
          </span>
        </button>

        <div
          v-for="board in boardList"
          :key="board.id"
          class="boards-panel__item"
          :class="{ 'boards-panel__item--active': board.id === activeBoardId }"
        >
          <div
            class="boards-panel__thumb"
            :class="{ 'boards-panel__thumb--empty': !board.preview }"
            :style="{
              '--board-aspect':
                board.previewAspect && board.previewAspect > 0
                  ? board.previewAspect
                  : 16 / 9,
            }"
          >
            <button
              type="button"
              class="boards-panel__hit"
              :aria-pressed="board.id === activeBoardId"
              :aria-label="`Open ${board.name}`"
              @click="emit('select', board.id)"
            >
              <img
                v-if="board.preview"
                :src="board.preview"
                :alt="`${board.name} preview`"
                loading="lazy"
                decoding="async"
                draggable="false"
              />
              <span v-else class="boards-panel__placeholder interface">Empty</span>
            </button>

            <div class="boards-panel__actions" aria-label="Board actions">
              <button
                type="button"
                class="boards-panel__action"
                :aria-label="`Edit ${board.name}`"
                @click="emit('select', board.id)"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
              <button
                type="button"
                class="boards-panel__action"
                :aria-label="`Delete ${board.name}`"
                @click="emit('delete', board.id)"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path
                    d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
                  />
                  <path d="M10 11v6M14 11v6" />
                </svg>
              </button>
              <button
                type="button"
                class="boards-panel__action"
                :aria-label="`Send ${board.name} as enquiry`"
                @click="emit('send', board.id)"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M22 2 11 13" />
                  <path d="M22 2 15 22l-4-9-9-4Z" />
                </svg>
              </button>
            </div>
          </div>
          <p class="boards-panel__name">{{ board.name }}</p>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    open: boolean
    /** Fixed right rail for site-wide push (outside moodboard shell). */
    fixed?: boolean
  }>(),
  { fixed: false },
)

const emit = defineEmits<{
  select: [id: string]
  delete: [id: string]
  send: [id: string]
  create: []
}>()

const { boards, activeBoardId, closeBoardsPanel } = useBoards()

const boardList = computed(() =>
  boards.value
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
)

const scrollEl = ref<HTMLElement | null>(null)
</script>

<style scoped>
.boards-panel {
  --boards-motion: 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  --rail-padding: 25px;
  /* Always-dark hover chrome (matches boards cart actions) */
  --boards-thumb-ui-bg: #1f1c18;
  --boards-thumb-ui-bg-hover: #161412;
  --boards-thumb-ui-fg: #faf7f2;
  --boards-thumb-ui-line: rgba(26, 26, 26, 0.45);

  position: relative;
  z-index: 1;
  flex: 0 0 var(--boards-panel-width);
  width: var(--boards-panel-width);
  height: 100%;
  overflow: hidden;
  pointer-events: none;
  transition:
    flex-basis var(--boards-motion),
    width var(--boards-motion);
}

.boards-panel--open {
  pointer-events: auto;
}

.boards-panel--fixed {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 220;
  flex: none;
}

.boards-panel__rail {
  display: flex;
  flex-direction: column;
  /* Keep full rail width while the flex slot animates open/closed */
  width: var(--boards-panel-open-width);
  height: 100%;
  overflow: hidden;
  background: var(--cream);
  border-left: 1px solid var(--grid-line);
  box-sizing: border-box;
}

.boards-panel__header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: var(--header-height);
  padding: 0 var(--rail-padding);
  border-bottom: 1px solid var(--grid-line);
  box-sizing: border-box;
}

.boards-panel__title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 400;
  color: var(--charcoal);
}

.boards-panel__close {
  flex-shrink: 0;
  width: 25px;
  height: 25px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid currentColor;
  background: var(--elevated-bg, #fff);
  color: var(--charcoal);
  box-sizing: border-box;
  cursor: pointer;
}

.boards-panel__close:hover {
  color: var(--accent, var(--charcoal));
  border-color: currentColor;
}

.boards-panel__close-icon {
  position: relative;
  display: block;
  width: 11px;
  height: 11px;
}

.boards-panel__close-icon::before,
.boards-panel__close-icon::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 1px;
  background: currentColor;
}

.boards-panel__close-icon::before {
  transform: translate(-50%, -50%) rotate(45deg);
}

.boards-panel__close-icon::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}

.boards-panel__scroll {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  padding: var(--rail-padding);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.boards-panel__scroll::-webkit-scrollbar {
  display: none;
}

.boards-panel__item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  width: 100%;
}

.boards-panel__hit {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  place-items: center;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.boards-panel__thumb {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: var(--board-aspect, 16 / 9);
  overflow: hidden;
  background: color-mix(in srgb, var(--charcoal) 6%, var(--cream));
  border: 1px solid var(--grid-line);
  box-sizing: border-box;
}

.boards-panel__thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.boards-panel__placeholder {
  font-size: var(--text-xs);
  color: var(--muted);
}

.boards-panel__actions {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.boards-panel__item:hover .boards-panel__actions,
.boards-panel__item:focus-within .boards-panel__actions {
  opacity: 1;
}

.boards-panel__action {
  width: 2.5rem;
  height: 2.5rem;
  display: grid;
  place-items: center;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--boards-thumb-ui-bg);
  color: var(--boards-thumb-ui-fg);
  cursor: pointer;
  pointer-events: none;
  transition: transform 0.18s ease, background 0.18s ease;
}

.boards-panel__item:hover .boards-panel__action,
.boards-panel__item:focus-within .boards-panel__action {
  pointer-events: auto;
}

.boards-panel__action:hover {
  transform: scale(1.06);
  background: var(--boards-thumb-ui-bg-hover);
}

.boards-panel__action svg {
  display: block;
}

.boards-panel__name {
  margin: 0;
  font-family: var(--serif);
  font-size: var(--text-sm);
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: 0.01em;
  text-transform: capitalize;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--muted);
  min-width: 0;
}

.boards-panel__item--active .boards-panel__name {
  color: var(--charcoal);
}

.boards-panel__create {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.45rem;
  width: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--charcoal);
  text-align: left;
  cursor: pointer;
}

.boards-panel__create-frame {
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 16 / 9;
  box-sizing: border-box;
  border: 1px dashed color-mix(in srgb, var(--text-color) 35%, transparent);
  background: transparent;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.boards-panel__create:hover .boards-panel__create-frame,
.boards-panel__create:focus-visible .boards-panel__create-frame {
  border-color: var(--text-color);
}

.boards-panel__create-plus {
  position: relative;
  display: block;
  width: 28px;
  height: 28px;
  box-sizing: border-box;
  border: 1px solid currentColor;
}

.boards-panel__create-plus-h,
.boards-panel__create-plus-v {
  position: absolute;
  left: 50%;
  top: 50%;
  background: currentColor;
  transform: translate(-50%, -50%);
}

.boards-panel__create-plus-h {
  width: 12px;
  height: 1px;
}

.boards-panel__create-plus-v {
  width: 1px;
  height: 12px;
}

.boards-panel__create-label {
  color: var(--muted);
  text-transform: none;
}

.boards-panel__create:hover .boards-panel__create-label,
.boards-panel__create:focus-visible .boards-panel__create-label {
  color: var(--charcoal);
}

.boards-panel__item:hover .boards-panel__thumb,
.boards-panel__item:focus-within .boards-panel__thumb,
.boards-panel__item--active .boards-panel__thumb {
  outline: 1px solid var(--boards-thumb-ui-line);
  outline-offset: 2px;
}

@media (max-width: 999px) {
  .boards-panel {
    display: none;
  }
}
</style>
