<template>
  <header
    class="header"
    :class="{
      'header--product-page': isProductPage,
      'header--scroll-hidden': headerScrollHidden,
      'header--menu-open': menuOpen,
    }"
  >
    <div class="header__inner">
      <NuxtLink
        v-if="logoStyle === 'text'"
        to="/"
        class="interface header__wordmark"
        :aria-label="`${title} home`"
      >
        {{ title }}
      </NuxtLink>
      <NuxtLink
        v-else
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
      </nav>

      <div
        class="header__actions"
        :aria-hidden="isProductPage ? 'true' : undefined"
      >
        <button
          type="button"
          class="header__menu-btn interface"
          :aria-expanded="menuOpen"
          :aria-label="menuOpen ? 'Close menu' : 'Open menu'"
          @click="toggleMenu"
        >
          <span class="header__menu-bars" :class="{ 'is-open': menuOpen }" aria-hidden="true" />
        </button>
        <div class="header__tools" role="group" aria-label="Site tools">
          <button
            type="button"
            class="header__icon-btn"
            :class="{ 'header__icon-btn--tooltip-hidden': hiddenTooltip === 'theme' }"
            :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            :aria-pressed="isDark"
            @click="onThemeClick"
            @mouseleave="clearTooltipHide('theme')"
          >
            <svg
              class="header__icon header__icon--theme"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1"
              aria-hidden="true"
            >
              <path d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" />
              <path d="M5 20L19 5" stroke-linejoin="round" />
              <path d="M16 9L22 13.8528M12.4128 12.4059L19.3601 18.3634M8 15.6672L15 21.5" stroke-linejoin="round" />
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

          <div class="header__selection-group">
          <div
            ref="selectionMenuRef"
            class="header__version header__selection interface"
            :class="{
              'header__version--active': isOpen && panelTab === 'selections',
              'header__selection--open': selectionMenuOpen,
            }"
          >
            <button
              type="button"
              class="header__selection-name"
              :aria-label="selectionNavLabel"
              @click="onSelectionsClick"
              @mouseenter="onSelectionsHover(true)"
              @mouseleave="onSelectionsHover(false)"
            >
              {{ selectionNavLabel }}
            </button>
            <button
              type="button"
              class="header__selection-chevron"
              aria-label="Switch selection"
              :aria-expanded="selectionMenuOpen"
              @click="toggleSelectionMenu"
            >
              <span class="header__selection-chevron-icon" aria-hidden="true" />
            </button>
            <div
              v-if="selectionMenuOpen"
              class="header__selection-menu"
              role="listbox"
              aria-label="Selections"
            >
              <button
                v-for="board in moodboards"
                :key="board.id"
                type="button"
                class="header__selection-option"
                role="option"
                :aria-selected="board.id === activeMoodboardId"
                :class="{ 'header__selection-option--active': board.id === activeMoodboardId }"
                @click="onPickSelection(board.id)"
              >
                {{ board.name?.trim() || 'My Selection' }}
              </button>
            </div>
          </div>
          <div class="header__plus-slot">
            <button
              type="button"
              class="header__version header__new-selection interface"
              aria-label="New Selection"
              @click="onNewSelection"
            >
              <span class="header__pixel-plus" aria-hidden="true" />
              <span class="header__tooltip interface" aria-hidden="true">New Selection</span>
            </button>
          </div>
          </div>
        </div>

        <div class="header__cta" role="group" aria-label="Contact">
          <a
            class="header__phone interface"
            :href="`tel:${phoneTel}`"
          >
            {{ phone }}
          </a>
          <NuxtLink to="/enquire" class="header__enquire interface">
            Enquire
          </NuxtLink>
        </div>
      </div>
    </div>

    <div
      v-show="menuOpen"
      class="header__sheet"
      :aria-hidden="menuOpen ? undefined : 'true'"
    >
      <div class="header__sheet-columns">
        <section class="header__sheet-group">
          <p class="header__sheet-label">Explore</p>
          <nav class="header__sheet-nav" aria-label="Explore">
            <NuxtLink
              v-for="item in headerMenu.items"
              :key="`sheet-${item._key}`"
              :to="item.path"
              class="header__sheet-link interface"
              :class="{ 'header__sheet-link--active': isActive(item.path) }"
              @click="menuOpen = false"
            >
              {{ item.text }}
            </NuxtLink>
          </nav>
        </section>

        <div class="header__sheet-side">
          <section class="header__sheet-group">
            <p class="header__sheet-label">Selections</p>
            <div class="header__sheet-nav">
              <button
                v-for="board in moodboards"
                :key="`sheet-board-${board.id}`"
                type="button"
                class="header__sheet-link interface"
                :class="{ 'header__sheet-link--active': board.id === activeMoodboardId }"
                @click="onSheetPickSelection(board.id)"
              >
                {{ board.name?.trim() || 'My Selection' }}
              </button>
              <button type="button" class="header__sheet-link interface" @click="onSheetNewSelection">
                New Selection +
              </button>
            </div>
          </section>

          <section class="header__sheet-group">
            <p class="header__sheet-label">Contact</p>
            <div class="header__sheet-nav">
              <a class="header__sheet-link interface" :href="`tel:${phoneTel}`" @click="menuOpen = false">
                {{ phone }}
              </a>
              <a class="header__sheet-link interface" :href="`mailto:${enquiryEmail}`" @click="menuOpen = false">
                Email
              </a>
              <a
                class="header__sheet-link interface"
                :href="mapsHref"
                target="_blank"
                rel="noopener noreferrer"
                @click="menuOpen = false"
              >
                Find us
              </a>
            </div>
          </section>
        </div>
      </div>

      <div class="header__sheet-theme">
        <ThemeModeSwitch />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import type Lenis from 'lenis'

const { headerMenu, phone, phoneTel, enquiryEmail, addressDisplay, title, logoStyle } = useSiteSettings()
const { isOpen: productOverlayOpen } = useProductOverlay()
const {
  isOpen,
  panelTab,
  activeMoodboard,
  activeMoodboardId,
  moodboards,
  openSelectionStack,
  hoverSelectionStack,
  closeDrawer,
  createMoodboard,
  switchActiveMoodboard,
} = useBucket()
const { closeBoardsPanel } = useBoards()
const { isDark, toggleTheme } = useTheme()
const route = useRoute()
const { $lenis } = useNuxtApp()

/** Product page or overlay: hide the header, including the logo. */
const isProductPage = computed(
  () =>
    productOverlayOpen.value ||
    /^\/materials-and-forms\/[^/]+\/?$/.test(route.path) ||
    /^\/pre-crafted\/[^/]+\/?$/.test(route.path),
)

/** Archive index only — fade nav out on scroll down, back in on scroll up. */
const isMaterialsIndex = computed(
  () =>
    route.path === '/materials-and-forms' || route.path === '/materials-and-forms/',
)

const headerScrollHidden = ref(false)
const menuOpen = ref(false)

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
  if (menuOpen.value) headerScrollHidden.value = false
}

const mapsHref = computed(
  () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressDisplay.value)}`,
)

const onSheetPickSelection = (id: string) => {
  menuOpen.value = false
  if (id !== activeMoodboardId.value) void switchActiveMoodboard(id)
  onSelectionsClick()
}

const onSheetNewSelection = () => {
  menuOpen.value = false
  onNewSelection()
}

watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  },
)

watch(isProductPage, (hidden) => {
  if (hidden) menuOpen.value = false
})

watch(menuOpen, (open) => {
  if (!import.meta.client) return
  document.documentElement.classList.toggle('header-menu-open', open)
})
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
  document.addEventListener('pointerdown', onSelectionMenuPointerDown)
  syncHeaderScrollHidden()
})

onBeforeUnmount(() => {
  lenisScrollUnsub?.()
  lenisScrollUnsub = null
  windowScrollUnsub?.()
  windowScrollUnsub = null
  if (import.meta.client) {
    document.removeEventListener('basedupon:scroll-system-ready', bindLenisScroll)
    document.removeEventListener('pointerdown', onSelectionMenuPointerDown)
    document.documentElement.classList.remove('header-scroll-hidden')
    document.documentElement.classList.remove('header-menu-open')
  }
})

const selectionNavLabel = computed(
  () => activeMoodboard.value?.name?.trim() || 'My Selection',
)
const selectionMenuOpen = ref(false)
const selectionMenuRef = ref<HTMLElement | null>(null)

const toggleSelectionMenu = () => {
  selectionMenuOpen.value = !selectionMenuOpen.value
}

const onPickSelection = (id: string) => {
  selectionMenuOpen.value = false
  if (id === activeMoodboardId.value) return
  void switchActiveMoodboard(id)
}

const onSelectionMenuPointerDown = (event: PointerEvent) => {
  if (!selectionMenuOpen.value) return
  const root = selectionMenuRef.value
  if (root && !root.contains(event.target as Node)) selectionMenuOpen.value = false
}

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
  selectionMenuOpen.value = false
  closeBoardsPanel()
  openSelectionStack()
}

const onNewSelection = () => {
  closeBoardsPanel()
  createMoodboard({ activate: true })
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
  gap: 0.65rem 2rem;
  opacity: 1;
  transition: opacity 0.55s ease;
}

.header__tools {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.header--scroll-hidden .header__nav {
  opacity: 0;
  pointer-events: none;
}

.header--product-page .header__nav,
.header--product-page .header__actions,
.header--product-page .header__logo,
.header--product-page .header__wordmark {
  visibility: hidden;
  pointer-events: none;
}

/* Archive open slides the whole bar up — don’t snap it out from under the tween. */
html.archive-header-shift .header--product-page .header__nav,
html.archive-header-shift .header--product-page .header__actions,
html.archive-header-shift .header--product-page .header__logo,
html.archive-header-shift .header--product-page .header__wordmark {
  visibility: visible;
}

.header__wordmark {
  justify-self: start;
  align-self: center;
  color: var(--charcoal);
  text-decoration: none;
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

.header__nav:has(:is(.header__nav-link, .header__version, .header__icon-btn):hover)
  :is(.header__nav-link, .header__version, .header__icon-btn) {
  opacity: 0.35;
}

.header__nav:has(:is(.header__nav-link, .header__version, .header__icon-btn):hover)
  :is(.header__nav-link, .header__version, .header__icon-btn):hover {
  opacity: 1;
}

.header__actions {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 20px;
}

.header__cta {
  display: flex;
  align-items: center;
  gap: 20px;
  white-space: nowrap;
}

.header__enquire {
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

.header__enquire:hover {
  opacity: 0.88;
}

.header__version {
  margin-right: 0.15rem;
  padding: 0.35rem 0.7rem;
  font-size: var(--text-xs);
  color: var(--charcoal);
  border: 1px solid var(--grid-line);
  border-radius: 4px;
  background: transparent;
  opacity: 1;
  white-space: nowrap;
  transition: color 0.2s ease, border-color 0.2s ease, opacity 0.45s ease;
}

.header__selection-group {
  display: flex;
  align-items: stretch;
  gap: 10px;
}

.header__selection {
  position: relative;
  display: inline-flex;
  align-items: stretch;
  gap: 0;
  margin-right: 0;
  padding-right: 0;
}

.header__selection-name,
.header__selection-chevron {
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  cursor: pointer;
}

.header__selection-name {
  align-self: center;
}

.header__selection-chevron {
  position: relative;
  display: flex;
  align-items: center;
  align-self: stretch;
  flex: none;
  width: auto;
  height: auto;
  margin: -0.35rem 0;
  padding: 0 calc(0.6rem + 2px) 0 11px;
  border-left: 0;
}

.header__selection-chevron::before {
  content: '';
  position: absolute;
  left: 11px;
  top: 50%;
  width: 1px;
  height: 0.7rem;
  background: var(--grid-line);
  transform: translateY(-50%);
}

.header__selection-chevron-icon {
  display: block;
  width: 0.38rem;
  height: 0.38rem;
  margin-left: 11px;
  border-right: 1px solid currentColor;
  border-bottom: 1px solid currentColor;
  transform: translateY(-20%) rotate(45deg);
  transition: transform 0.2s ease;
}

.header__selection--open .header__selection-chevron-icon {
  transform: translateY(15%) rotate(225deg);
}

.header__selection-menu {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  z-index: 5;
  min-width: 100%;
  max-width: 16rem;
  max-height: min(60vh, 16rem);
  overflow: auto;
  margin: 0;
  padding: 0;
  background: var(--background-color, var(--cream));
  border: 1px solid var(--grid-line);
  border-radius: 4px;
}

.header__selection-option {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0.4rem 0.55rem;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: var(--muted);
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}

.header__selection-option:hover,
.header__selection-option--active {
  color: var(--charcoal);
}

.header__version:hover {
  color: var(--charcoal);
  border-color: var(--charcoal);
}

.header__version--active {
  color: var(--charcoal);
  border-color: var(--charcoal);
}

.header__plus-slot {
  display: flex;
  align-self: stretch;
  width: 24px;
}

.header__new-selection {
  position: relative;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: 100%;
  width: auto;
  aspect-ratio: 1;
  margin-right: 0;
  padding: 0;
}

.header__pixel-plus {
  position: relative;
  width: 7px;
  height: 7px;
}

.header__pixel-plus::before,
.header__pixel-plus::after {
  content: '';
  position: absolute;
  background: currentColor;
}

.header__pixel-plus::before {
  top: 50%;
  left: 0;
  width: 100%;
  height: 1px;
  transform: translateY(-50%);
}

.header__pixel-plus::after {
  left: 50%;
  top: 0;
  width: 1px;
  height: 100%;
  transform: translateX(-50%);
}

.header__new-selection:hover .header__tooltip,
.header__new-selection:focus-visible .header__tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
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
  color: var(--charcoal);
  opacity: 1;
  transition: color 0.2s ease, opacity 0.45s ease;
}

.header__icon {
  width: 18px;
  height: 18px;
  display: block;
  grid-area: 1 / 1;
}

.header__icon--theme {
  width: 15px;
  height: 15px;
  transform: rotate(-45deg);
  stroke-width: 1 !important;
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

.header__menu-btn {
  display: none;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  margin: 0;
  padding: 0;
  color: var(--charcoal);
}

.header__menu-bars,
.header__menu-bars::before,
.header__menu-bars::after {
  display: block;
  width: 16px;
  height: 1px;
  background: currentColor;
}

.header__menu-bars {
  position: relative;
}

.header__menu-bars::before,
.header__menu-bars::after {
  content: '';
  position: absolute;
  left: 0;
}

.header__menu-bars::before {
  top: -5px;
}

.header__menu-bars::after {
  top: 5px;
}

.header__menu-bars.is-open {
  background: transparent;
}

.header__menu-bars.is-open::before {
  top: 0;
  transform: rotate(45deg);
}

.header__menu-bars.is-open::after {
  top: 0;
  transform: rotate(-45deg);
}

.header__sheet {
  display: none;
}

@media (max-width: 1100px) {
  .header--menu-open {
    background: color-mix(in srgb, var(--background-color) 50%, transparent);
    backdrop-filter: blur(11px);
    -webkit-backdrop-filter: blur(11px);
  }

  .header__menu-btn {
    display: grid;
  }

  .header__nav,
  .header__tools,
  .header__phone {
    display: none;
  }

  .header__inner {
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0;
  }

  .header__actions {
    gap: 0.75rem;
  }

  .header__logo {
    width: 72px;
  }

  .header__logo-mark {
    top: 16px;
    width: 128px;
  }

  .header__sheet {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: fixed;
    top: var(--header-height);
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
    padding: 1.75rem var(--gutter) calc(1.25rem + env(safe-area-inset-bottom, 0px));
    background: color-mix(in srgb, var(--background-color) 50%, transparent);
    backdrop-filter: blur(11px);
    -webkit-backdrop-filter: blur(11px);
    overflow: hidden;
  }

  .header__sheet-columns {
    flex: 1 1 auto;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
    align-content: start;
    gap: 2rem 1.25rem;
    overflow: auto;
  }

  .header__sheet-side {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 70px;
  }

  .header__sheet-group {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
  }

  .header__sheet-label {
    margin: 0 0 18px;
    font-family: var(--mono);
    font-size: 9px;
    letter-spacing: 0.16em;
    line-height: 1;
    text-transform: uppercase;
    color: var(--charcoal);
    opacity: 0.45;
  }

  .header__sheet-nav {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
  }

  .header__sheet-theme {
    display: flex;
    justify-content: center;
    flex: 0 0 auto;
    padding-top: 1.25rem;
  }

  .header__sheet-link {
    position: relative;
    padding: 0.45rem 0;
    font-size: var(--text-sm);
    color: var(--charcoal);
    text-align: left;
  }

  .header__sheet-link--active {
    opacity: 0.45;
  }

  .header__sheet-side .header__sheet-link--active::before {
    content: '';
    position: absolute;
    top: 50%;
    left: -14px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
    transform: translateY(-50%);
    pointer-events: none;
  }
}

@media (max-width: 767px) {
  .header__logo-mark {
    width: 108px;
  }

  .header__enquire {
    padding: 0.4rem 0.65rem;
  }
}
</style>
