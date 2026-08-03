<template>
  <header class="header">
    <div class="header__inner">
      <NuxtLink
        v-if="false"
        to="/"
        class="header__logo  interface"
        aria-label="Studio Based Upon home"
      >
        <span v-if="logo" class="header__logo-svg" v-html="logo" />
        <span v-else>Studio Based Upon</span>
      </NuxtLink>
      <div class="header__start" aria-hidden="true" />

      <nav class="header__nav" aria-label="Main navigation">
        <NuxtLink
          v-for="item in headerMenu.items"
          :key="item._key"
          :to="item.path"
          class="header__nav-link  interface"
          :class="{ 'header__nav-link--active': isActive(item.path) }"
        >
          {{ item.text }}
        </NuxtLink>
      </nav>

      <div class="header__actions">
        <button
          type="button"
          class="header__version interface"
          :aria-label="`Display face ${serifFace}. Switch to ${serifFace === 'serif' ? 'sans' : 'serif'}`"
          @click="toggleSerifFace"
        >
          {{ serifFace }}
        </button>

        <button
          type="button"
          class="header__icon-btn"
          :class="{ 'header__icon-btn--tooltip-hidden': hiddenTooltip === 'theme' }"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          :aria-pressed="isDark"
          @click="onThemeClick"
          @mouseleave="clearTooltipHide('theme')"
        >
          <!-- Both icons in DOM; visibility follows html.dark so SSR/hydration match -->
          <svg
            class="header__icon header__icon--sun"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21M5.64 5.64l1.06 1.06M17.3 17.3l1.06 1.06M5.64 18.36l1.06-1.06M17.3 6.7l1.06-1.06" />
          </svg>
          <svg
            class="header__icon header__icon--moon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M21 13.5A8.5 8.5 0 1 1 10.5 3 6.5 6.5 0 0 0 21 13.5Z" />
          </svg>
          <span
            v-if="frozenThemeTooltip"
            class="header__tooltip interface"
            aria-hidden="true"
          >
            {{ frozenThemeTooltip }}
          </span>
          <template v-else>
            <span class="header__tooltip header__tooltip--to-light interface" aria-hidden="true">
              Light
            </span>
            <span class="header__tooltip header__tooltip--to-dark interface" aria-hidden="true">
              Dark
            </span>
          </template>
        </button>

        <div ref="selectionsMenuRef" class="header__boards">
          <button
            type="button"
            class="header__version header__boards-toggle interface"
            :class="{ 'header__boards-toggle--open': selectionsOpen }"
            :aria-expanded="selectionsOpen"
            aria-haspopup="listbox"
            aria-label="Selections"
            @click="onSelectionsToggle"
          >
            <span>Selections</span>
            <span class="header__boards-caret" aria-hidden="true" />
          </button>
          <div
            v-if="selectionsOpen"
            class="header__boards-menu"
            role="listbox"
            aria-label="Selections"
          >
            <button
              v-for="selection in moodboards"
              :key="selection.id"
              type="button"
              class="header__boards-option interface"
              role="option"
              :aria-selected="selection.id === activeMoodboardId"
              :class="{
                'header__boards-option--active': selection.id === activeMoodboardId,
              }"
              @click="onSelectSelection(selection.id)"
            >
              {{ selection.name }}
            </button>
            <button
              type="button"
              class="header__boards-option header__boards-option--new interface"
              @click="onNewSelection"
            >
              New selection +
            </button>
          </div>
        </div>

        <div ref="boardsMenuRef" class="header__boards">
          <button
            type="button"
            class="header__version header__boards-toggle interface"
            :class="{ 'header__boards-toggle--open': boardsOpen }"
            :aria-expanded="boardsOpen"
            aria-haspopup="listbox"
            aria-label="Boards"
            @click="onBoardsToggle"
          >
            <span>Boards</span>
            <span class="header__boards-caret" aria-hidden="true" />
          </button>
          <div
            v-if="boardsOpen"
            class="header__boards-menu"
            role="listbox"
            aria-label="Saved boards"
          >
            <button
              v-for="board in boards"
              :key="board.id"
              type="button"
              class="header__boards-option interface"
              role="option"
              :aria-selected="board.id === activeBoardId"
              :class="{ 'header__boards-option--active': board.id === activeBoardId && isMoodboard }"
              @click="onSelectBoard(board.id)"
            >
              {{ board.name }}
            </button>
            <button
              type="button"
              class="header__boards-option header__boards-option--new interface"
              @click="onNewBoard"
            >
              New board +
            </button>
          </div>
        </div>

        <button
          type="button"
          class="header__icon-btn"
          :class="{
            'header__icon-btn--active': isOpen && panelTab === 'selections',
            'header__icon-btn--tooltip-hidden': hiddenTooltip === 'selections',
          }"
          :aria-label="`Open ${activeMoodboard?.name || 'selection'}`"
          @click="onSelectionsClick"
          @mouseleave="clearTooltipHide('selections')"
        >
          <svg
            class="header__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
            />
          </svg>
          <span class="header__tooltip interface" aria-hidden="true">{{
            activeMoodboard?.name || 'Selection'
          }}</span>
        </button>

        <NuxtLink to="/enquire" class="header__enquire interface">
          Enquire
        </NuxtLink>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const { logo, headerMenu } = useSiteSettings()
const {
  isOpen,
  panelTab,
  openDrawer,
  isMoodboard,
  openMoodboard,
  moodboards,
  activeMoodboard,
  activeMoodboardId,
  setActiveMoodboard,
  createMoodboard,
  openSelectionStack,
} = useBucket()
const { face: serifFace, toggleFace: toggleSerifFace } = useSerifFace()
const {
  boards,
  activeBoardId,
  boardsOpen,
  setActiveBoard,
  saveActiveBoard,
  createBoard,
  toggleDropdown,
  closeDropdown,
} = useBoards()
const {
  loadBoard,
  placements,
  strokes,
  clearActive,
  reset: resetMoodboard,
} = useMoodboard()
const { isDark, toggleTheme } = useTheme()
const route = useRoute()

const boardsMenuRef = ref<HTMLElement | null>(null)
const selectionsMenuRef = ref<HTMLElement | null>(null)
const selectionsOpen = ref(false)

const closeSelectionsDropdown = () => {
  selectionsOpen.value = false
}

type TooltipId = 'theme' | 'selections'
const hiddenTooltip = ref<TooltipId | null>(null)
/** Keep pre-click label so theme toggle doesn't flash the opposite word while fading out. */
const frozenThemeTooltip = ref<'Light' | 'Dark' | null>(null)

const hideTooltip = (id: TooltipId) => {
  hiddenTooltip.value = id
}

const clearTooltipHide = (id: TooltipId) => {
  if (hiddenTooltip.value === id) hiddenTooltip.value = null
  if (id === 'theme') frozenThemeTooltip.value = null
}

const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(`${path}/`)
}

const onThemeClick = () => {
  frozenThemeTooltip.value = isDark.value ? 'Light' : 'Dark'
  hideTooltip('theme')
  toggleTheme()
}

const onBoardsToggle = () => {
  closeSelectionsDropdown()
  toggleDropdown()
}

const onSelectionsToggle = () => {
  closeDropdown()
  selectionsOpen.value = !selectionsOpen.value
}

const onSelectBoard = async (id: string) => {
  closeDropdown()
  closeSelectionsDropdown()
  if (isMoodboard.value) {
    if (id === activeBoardId.value) return
    if (activeBoardId.value) {
      saveActiveBoard(placements.value, strokes.value)
    }
    setActiveBoard(id)
    const board = boards.value.find((entry) => entry.id === id)
    if (board) loadBoard(board.placements, board.strokes)
    clearActive()
    return
  }
  const board = boards.value.find((entry) => entry.id === id)
  if (!board) return
  setActiveBoard(id)
  loadBoard(board.placements, board.strokes)
  openMoodboard({ reopenCart: false })
}

const onSelectSelection = (id: string) => {
  closeSelectionsDropdown()
  closeDropdown()
  setActiveMoodboard(id)
  openDrawer('selections')
}

const onNewSelection = () => {
  closeSelectionsDropdown()
  closeDropdown()
  createMoodboard({ open: true, activate: true })
  openDrawer('selections')
}

const onNewBoard = () => {
  closeDropdown()
  closeSelectionsDropdown()
  if (isMoodboard.value && activeBoardId.value) {
    saveActiveBoard(placements.value, strokes.value)
  }
  resetMoodboard()
  createBoard([], [], undefined, undefined, activeMoodboardId.value || undefined)
  loadBoard([], [])
  clearActive()
  openMoodboard({ reopenCart: false })
}

const onSelectionsClick = () => {
  hideTooltip('selections')
  closeSelectionsDropdown()
  closeDropdown()
  openSelectionStack()
}

const onDocumentPointerDown = (event: PointerEvent) => {
  const target = event.target as Node | null
  if (!target) return
  if (
    boardsOpen.value &&
    boardsMenuRef.value &&
    !boardsMenuRef.value.contains(target)
  ) {
    closeDropdown()
  }
  if (
    selectionsOpen.value &&
    selectionsMenuRef.value &&
    !selectionsMenuRef.value.contains(target)
  ) {
    closeSelectionsDropdown()
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
})
</script>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: transparent;
  transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
}

.header__inner {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  min-height: var(--header-height);
  padding: 0 var(--gutter);
  gap: 1rem;
}

.header__logo {
  justify-self: start;
  font-size: var(--text-md);
  letter-spacing: 0.01em;
}

.header__logo-svg :deep(svg) {
  height: 28px;
  width: auto;
}

.header__start {
  justify-self: start;
  min-width: 0;
}

.header__nav {
  display: flex;
  align-items: center;
  justify-content: center;
  justify-self: center;
  flex-wrap: wrap;
  gap: 0.75rem 1.75rem;
}

.header__nav-link {
  font-size: var(--text-sm);
  color: var(--muted);
  transition: color 0.2s ease;
  white-space: nowrap;
}

.header__nav-link:hover,
.header__nav-link--active {
  color: var(--charcoal);
}

.header__actions {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.header__version {
  margin-right: 0.15rem;
  padding: 0.2rem 0.4rem;
  font-size: var(--text-xs);
  color: var(--muted);
  border: 1px solid var(--grid-line);
  border-radius: 4px;
  background: transparent;
  transition: color 0.2s ease, border-color 0.2s ease;
}

.header__version:hover {
  color: var(--charcoal);
  border-color: var(--charcoal);
}

.header__boards {
  position: relative;
  margin-right: 0.15rem;
}

.header__boards-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-right: 0;
}

.header__boards-toggle--open {
  color: var(--charcoal);
  border-color: var(--charcoal);
}

.header__boards-caret {
  width: 0;
  height: 0;
  border-left: 3.5px solid transparent;
  border-right: 3.5px solid transparent;
  border-top: 4px solid currentColor;
  opacity: 0.75;
  transition: transform 0.2s ease;
}

.header__boards-toggle--open .header__boards-caret {
  transform: rotate(180deg);
}

.header__boards-menu {
  position: absolute;
  top: calc(100% + 0.35rem);
  right: 0;
  z-index: 20;
  min-width: 10.5rem;
  max-width: 16rem;
  max-height: min(60vh, 20rem);
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0.25rem;
  background: var(--elevated-bg, var(--cream));
  border: 1px solid var(--grid-line);
  border-radius: 4px;
  box-shadow: none;
}

.header__boards-option {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0.4rem 0.55rem;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: var(--muted);
  font-size: var(--text-xs);
  text-align: left;
  text-transform: capitalize;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}

.header__boards-option:hover,
.header__boards-option--active {
  color: var(--charcoal);
  background: transparent;
}

.header__boards-option--active {
  font-weight: 500;
}

.header__boards-option--new {
  margin-top: 0.15rem;
  border-top: 1px solid var(--grid-line);
  border-radius: 0 0 3px 3px;
  color: var(--charcoal);
}

.header__boards-empty {
  margin: 0;
  padding: 0.45rem 0.55rem;
  color: var(--muted);
  font-size: var(--text-xs);
}

.header__icon-btn {
  position: relative;
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  color: var(--muted);
  transition: color 0.2s ease;
}

.header__icon {
  width: 18px;
  height: 18px;
  display: block;
  grid-area: 1 / 1;
}

.header__icon--sun {
  display: none;
}

.header__icon--moon {
  display: block;
}

/* Full :global(...) — `:global(html.dark) .x` compiles to `html.dark { … }` and blanks the page */
:global(html.dark .header__icon--sun) {
  display: block;
}

:global(html.dark .header__icon--moon) {
  display: none;
}

.header__tooltip--to-light {
  display: none;
}

.header__tooltip--to-dark {
  display: block;
}

:global(html.dark .header__tooltip--to-light) {
  display: block;
}

:global(html.dark .header__tooltip--to-dark) {
  display: none;
}

.header__icon-btn:hover,
.header__icon-btn--active {
  color: var(--charcoal);
}

.header__tooltip {
  position: absolute;
  top: calc(100% + 0.4rem + 5px);
  left: 50%;
  z-index: 2;
  padding: 0.35rem 0.55rem;
  font-size: var(--text-xs);
  color: var(--charcoal);
  white-space: nowrap;
  background: var(--elevated-bg);
  border-radius: 6px;
  opacity: 0;
  pointer-events: none;
  transform: translateX(-50%) translateY(-2px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.header__icon-btn:hover .header__tooltip,
.header__icon-btn:focus-visible .header__tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.header__icon-btn--active .header__tooltip,
.header__icon-btn--tooltip-hidden .header__tooltip,
.header__icon-btn--active:hover .header__tooltip,
.header__icon-btn--tooltip-hidden:hover .header__tooltip,
.header__icon-btn--active:focus-visible .header__tooltip,
.header__icon-btn--tooltip-hidden:focus-visible .header__tooltip {
  opacity: 0;
  transform: translateX(-50%) translateY(-2px);
  transition: none;
}

.header__enquire {
  margin-left: 0.35rem;
  padding: 8px 13px;
  border-radius: 6px;
  font-size: var(--text-sm);
  color: var(--warm-white);
  background: var(--charcoal);
  transition: background 0.2s ease, color 0.2s ease;
}

.header__enquire:hover {
  background: var(--accent);
}

@media (max-width: 767px) {
  .header__inner {
    grid-template-columns: 1fr auto 1fr;
    gap: 0.5rem;
  }

  .header__logo {
    font-size: var(--text-sm);
  }

  .header__nav {
    gap: 0.5rem 0.75rem;
  }

  .header__nav-link {
    font-size: var(--text-xs);
  }
}
</style>
