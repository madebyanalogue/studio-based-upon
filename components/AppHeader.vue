<template>
  <header
    class="header"
    :class="{
      'header--product-page': isProductPage,
      'header--scroll-hidden': headerScrollHidden,
    }"
  >
    <div class="header__inner">
      <NuxtLink
        to="/"
        class="header__logo"
        aria-label="Studio Based Upon home"
      >
        <BasedUponLogo class="header__logo-mark" />
      </NuxtLink>

      <nav
        class="header__nav"
        aria-label="Main navigation"
        :aria-hidden="isProductPage || headerScrollHidden ? 'true' : undefined"
      >
        <NuxtLink
          v-for="item in headerMenu.items"
          :key="item._key"
          :to="item.path"
          class="header__nav-link  interface"
          :class="{ 'header__nav-link--active': isActive(item.path) }"
        >
          {{ item.text }}
        </NuxtLink>

        <div class="header__tools" role="group" aria-label="Site tools">
          <button
            type="button"
            class="header__version interface"
            :aria-label="
              textCase === 'uppercase'
                ? 'Titles are uppercase. Switch to sentence case'
                : 'Titles are sentence case. Switch to uppercase'
            "
            @click="toggleTextCase"
          >
            {{ textCase === 'uppercase' ? 'AA' : 'Aa' }}
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

          <button
            type="button"
            class="header__version interface"
            :class="{ 'header__version--active': isOpen && panelTab === 'selections' }"
            :aria-label="selectionNavLabel"
            @click="onSelectionsClick"
            @mouseenter="onSelectionsHover(true)"
            @mouseleave="onSelectionsHover(false)"
          >
            {{ selectionNavLabel }}
          </button>

          <button
            type="button"
            class="header__version interface"
            :class="{ 'header__version--active': boardsPanelOpen }"
            :aria-pressed="boardsPanelOpen"
            aria-label="My Boards"
            @click="onMyBoardsClick"
          >
            My Boards
          </button>
        </div>
      </nav>

      <div
        class="header__actions"
        :aria-hidden="isProductPage ? 'true' : undefined"
      >
        <div class="header__cta" role="group" aria-label="Contact">
          <NuxtLink to="/enquire" class="header__enquire interface">
            Enquire
          </NuxtLink>
          <a
            class="header__phone interface"
            :href="`tel:${phoneTel}`"
          >
            {{ phone }}
          </a>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import type Lenis from 'lenis'

const { headerMenu, phone, phoneTel } = useSiteSettings()
const {
  isOpen,
  panelTab,
  activeMoodboard,
  openSelectionStack,
  hoverSelectionStack,
  closeDrawer,
} = useBucket()
const { textCase, toggleTextCase } = useTextCase()
const { boardsPanelOpen, openBoardsPanel, closeBoardsPanel } = useBoards()
const { isDark, toggleTheme } = useTheme()
const route = useRoute()
const { $lenis } = useNuxtApp()

/** Hard-loaded PDP: keep the logo in place; hide the rest of the chrome. */
const isProductPage = computed(() =>
  /^\/materials-and-forms\/[^/]+\/?$/.test(route.path),
)

/** Archive index only — fade nav out on scroll down, back in on scroll up. */
const isMaterialsIndex = computed(
  () =>
    route.path === '/materials-and-forms' || route.path === '/materials-and-forms/',
)

const headerScrollHidden = ref(false)
const SCROLL_DELTA = 8
const SHOW_AT_TOP = 48
let lastScrollY = 0
let lenisScrollUnsub: (() => void) | null = null
let windowScrollUnsub: (() => void) | null = null

const readScrollY = () => {
  const lenis = $lenis as Lenis | undefined
  if (lenis && typeof lenis.scroll === 'number') return lenis.scroll
  if (!import.meta.client) return 0
  return window.scrollY || document.documentElement.scrollTop || 0
}

const syncHeaderScrollHidden = (scrollY = readScrollY()) => {
  if (!isMaterialsIndex.value) {
    headerScrollHidden.value = false
    lastScrollY = scrollY
    return
  }

  if (scrollY <= SHOW_AT_TOP) {
    headerScrollHidden.value = false
    lastScrollY = scrollY
    return
  }

  const delta = scrollY - lastScrollY
  if (Math.abs(delta) < SCROLL_DELTA) return

  headerScrollHidden.value = delta > 0
  lastScrollY = scrollY
}

const bindLenisScroll = () => {
  lenisScrollUnsub?.()
  lenisScrollUnsub = null
  const lenis = $lenis as Lenis | undefined
  if (!lenis) return

  const onScroll = () => syncHeaderScrollHidden(lenis.scroll)
  lenis.on('scroll', onScroll)
  lenisScrollUnsub = () => lenis.off('scroll', onScroll)
  syncHeaderScrollHidden(lenis.scroll)
}

const bindWindowScroll = () => {
  windowScrollUnsub?.()
  windowScrollUnsub = null
  if (!import.meta.client) return

  const onScroll = () => syncHeaderScrollHidden()
  window.addEventListener('scroll', onScroll, { passive: true })
  windowScrollUnsub = () => window.removeEventListener('scroll', onScroll)
}

watch(isMaterialsIndex, (active) => {
  if (!active) {
    headerScrollHidden.value = false
    return
  }
  bindLenisScroll()
  lastScrollY = readScrollY()
  syncHeaderScrollHidden()
})

watch(headerScrollHidden, (hidden) => {
  if (!import.meta.client) return
  document.documentElement.classList.toggle('header-scroll-hidden', hidden)
})

onMounted(() => {
  bindLenisScroll()
  bindWindowScroll()
  document.addEventListener('basedupon:scroll-system-ready', bindLenisScroll)
  syncHeaderScrollHidden()
})

onBeforeUnmount(() => {
  lenisScrollUnsub?.()
  lenisScrollUnsub = null
  windowScrollUnsub?.()
  windowScrollUnsub = null
  if (import.meta.client) {
    document.removeEventListener('basedupon:scroll-system-ready', bindLenisScroll)
    document.documentElement.classList.remove('header-scroll-hidden')
  }
})

const selectionNavLabel = computed(
  () => activeMoodboard.value?.name?.trim() || 'My Selection',
)

type TooltipId = 'theme'
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
  const [pathname] = path.split('#')
  const base = pathname || '/'
  if (base === '/') return route.path === '/'
  return route.path === base || route.path.startsWith(`${base}/`)
}

const onThemeClick = () => {
  frozenThemeTooltip.value = isDark.value ? 'Light' : 'Dark'
  hideTooltip('theme')
  toggleTheme()
}

const onSelectionsHover = (hot: boolean) => {
  hoverSelectionStack(hot)
}

const onSelectionsClick = () => {
  closeBoardsPanel()
  openSelectionStack()
}

const onMyBoardsClick = () => {
  if (boardsPanelOpen.value) {
    closeBoardsPanel()
    return
  }
  if (isOpen.value) closeDrawer()
  openBoardsPanel()
}
</script>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: transparent;
  transition:
    left 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    right 0.35s cubic-bezier(0.22, 1, 0.36, 1),
    background var(--theme-ms) var(--theme-ease),
    color var(--theme-ms) var(--theme-ease);
}

.header__nav {
  display: flex;
  align-items: center;
  justify-content: center;
  justify-self: center;
  flex-wrap: wrap;
  gap: 0.75rem 1.75rem;
  opacity: 1;
  transition: opacity 0.55s ease;
}

.header__tools {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-left: 0.5rem;
}

.header--scroll-hidden .header__nav {
  opacity: 0;
  pointer-events: none;
}

.header--product-page .header__nav,
.header--product-page .header__actions {
  visibility: hidden;
  pointer-events: none;
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
  display: block;
  width: 100px;
  color: var(--charcoal);
  line-height: 0;
  /* transform: translate(0, 19px) scale(1.25); */
  transform-origin: top left;
  position: relative;
  height: var(--header-height);
}

.header__logo-mark {
  position: absolute;
  top: 20px;
  width: 180px;
  height: auto;
}

.header__nav-link {
  font-size: var(--text-sm);
  color: var(--charcoal);
  opacity: 1;
  transition: opacity 0.45s ease;
  white-space: nowrap;
}

.header__nav:hover .header__nav-link {
  opacity: 0.35;
}

.header__nav:hover .header__nav-link:hover {
  opacity: 1;
}

.header__actions {
  justify-self: end;
  display: flex;
  align-items: center;
}

.header__cta {
  display: flex;
  align-items: stretch;
  gap: 3px;
}

.header__enquire,
.header__phone {
  display: inline-flex;
  align-items: center;
  margin: 0;
  padding: 0.45rem 0.85rem;
  border-radius: var(--ui-border-radius);
  font-size: var(--text-sm);
  color: var(--white);
  background: var(--red);
  text-decoration: none;
  white-space: nowrap;
  transition: opacity 0.2s ease, filter 0.2s ease;
}

.header__enquire:hover,
.header__phone:hover {
  opacity: 0.88;
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

.header__version--active {
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

@media (max-width: 767px) {
  .header__inner {
    grid-template-columns: 1fr auto 1fr;
    gap: 0.5rem;
  }

  .header__logo {
    width: min(7.5rem, 34vw);
  }

  .header__nav {
    gap: 0.5rem 0.75rem;
  }

  .header__nav-link {
    font-size: var(--text-xs);
  }
}
</style>
