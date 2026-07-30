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
        <div
          v-if="boardCount"
          ref="boardsRef"
          class="header__boards"
        >
          <button
            type="button"
            class="header__moodboard  interface"
            :aria-expanded="boardsOpen"
            aria-haspopup="listbox"
            aria-label="Open my boards"
            @click="onToggleBoards"
          >
            <span>My Boards</span>
            <span class="header__moodboard-count">{{ boardCount }}</span>
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
              class="header__boards-option"
              :class="{ 'header__boards-option--active': board.id === activeBoardId }"
              role="option"
              :aria-selected="board.id === activeBoardId"
              @click="openBoard(board.id)"
            >
              <span class="header__boards-option-name">{{ board.name }}</span>
              <span class="header__boards-option-count">
                {{ board.placements.length }}
              </span>
            </button>
          </div>
        </div>

        <div
          v-if="false"
          ref="selectionsRef"
          class="header__boards header__selections"
        >
          <button
            type="button"
            class="header__moodboard  interface"
            :class="{ 'header__moodboard--empty': selectionsEmpty }"
            :aria-expanded="selectionsOpen"
            aria-haspopup="listbox"
            aria-label="Open my selections"
            @click="toggleSelections"
          >
            <span>My Selections</span>
            <span class="header__moodboard-count">{{ selectionCount }}</span>
            <span class="header__boards-caret" aria-hidden="true" />
          </button>

          <div
            v-if="selectionsOpen"
            class="header__boards-menu"
            role="listbox"
            aria-label="Saved selections"
          >
            <button
              v-for="board in moodboards"
              :key="board.id"
              type="button"
              class="header__boards-option"
              :class="{ 'header__boards-option--active': board.id === activeMoodboard?.id }"
              role="option"
              :aria-selected="board.id === activeMoodboard?.id"
              @click="openSelection(board.id)"
            >
              <span class="header__boards-option-name">{{ board.name }}</span>
              <span class="header__boards-option-count">
                {{ board.items.length }}
              </span>
            </button>
            <button
              type="button"
              class="header__boards-new"
              @click="onNewSelection"
            >
              New Selection +
            </button>
          </div>
        </div>

      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const { logo, headerMenu } = useSiteSettings()
const {
  isOpen,
  activeMoodboard,
  createMoodboard,
  moodboards,
  setActiveMoodboard,
  openMoodboard,
} = useBucket()
const {
  boards,
  boardCount,
  boardsOpen,
  activeBoardId,
  setActiveBoard,
  toggleDropdown,
  closeDropdown,
} = useBoards()
const { loadBoard } = useMoodboard()
const route = useRoute()

const boardsRef = ref<HTMLElement | null>(null)
const selectionsRef = ref<HTMLElement | null>(null)
const selectionsOpen = ref(false)
const selectionCount = computed(() => moodboards.value.length)
const selectionsEmpty = computed(() =>
  moodboards.value.every((board) => board.items.length === 0),
)

const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(`${path}/`)
}

const openBoard = (id: string) => {
  const board = boards.value.find((b) => b.id === id)
  if (!board) return
  setActiveBoard(id)
  loadBoard(board.placements, board.strokes)
  closeDropdown()
  openMoodboard()
}

const onToggleBoards = () => {
  toggleDropdown()
  if (boardsOpen.value) closeSelections()
}

const toggleSelections = () => {
  selectionsOpen.value = !selectionsOpen.value
  if (selectionsOpen.value) closeDropdown()
}

const closeSelections = () => {
  selectionsOpen.value = false
}

const openSelection = (id: string) => {
  setActiveMoodboard(id)
  closeSelections()
  isOpen.value = true
}

const onNewSelection = () => {
  closeSelections()
  createMoodboard()
}

const onDocumentClick = (event: MouseEvent) => {
  const target = event.target as Node
  if (boardsOpen.value && !boardsRef.value?.contains(target)) {
    closeDropdown()
  }
  if (selectionsOpen.value && !selectionsRef.value?.contains(target)) {
    closeSelections()
  }
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return
  if (boardsOpen.value) closeDropdown()
  if (selectionsOpen.value) closeSelections()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
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
  gap: 0.75rem;
}

.header__boards {
  position: relative;
}

.header__boards-caret {
  width: 0;
  height: 0;
  margin-left: 0.15rem;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid currentColor;
  opacity: 0.55;
}

.header__boards-menu {
  position: absolute;
  top: calc(100% + 0.65rem);
  right: 0;
  z-index: 120;
  min-width: 12rem;
  display: flex;
  flex-direction: column;
  padding: 0.4rem;
  background: var(--warm-white);
  border: 1px solid var(--grid-line);
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
}

.header__boards-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding: 0.55rem 0.65rem;
  border-radius: 8px;
  font-size: var(--text-sm);
  color: var(--muted);
  text-align: left;
  transition: color 0.2s ease, background 0.2s ease;
}

.header__boards-option:hover,
.header__boards-option--active {
  color: var(--charcoal);
  background: var(--cream);
}

.header__boards-option-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header__boards-option-count {
  flex: none;
  font-size: var(--text-xs);
  color: var(--muted);
}

.header__boards-new {
  margin-top: 0.25rem;
  padding: 0.65rem 0.65rem 0.55rem;
  border-top: 1px solid var(--grid-line);
  border-radius: 0 0 8px 8px;
  font-size: var(--text-sm);
  color: var(--charcoal);
  text-align: left;
  transition: color 0.2s ease, background 0.2s ease;
}

.header__boards-new:hover {
  background: var(--cream);
}

.header__moodboard {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: var(--text-sm);
  color: var(--charcoal);
  transition: color 0.2s ease;
}

.header__moodboard:hover {
  color: var(--accent);
}

.header__moodboard-count {
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0.1em 0.25rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  border: 1px solid transparent;
  background: var(--charcoal);
  color: var(--warm-white);
  font-family: var(--font-sans);
  font-style: normal;
  font-size: 0.7rem;
}

.header__moodboard--empty .header__moodboard-count {
  background: transparent;
  border-color: var(--muted);
  color: var(--muted);
}

.header__enquire {
  padding: 0.45rem 0.9rem;
  font-size: var(--text-sm);
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

  .header__enquire {
    padding: 0.4rem 0.65rem;
    font-size: var(--text-xs);
  }
}
</style>
