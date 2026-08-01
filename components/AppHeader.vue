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
          :aria-label="`Bucket UI ${bucketUiVersion}. Switch to ${bucketUiVersion === 'v1' ? 'v2' : 'v1'}`"
          @click="toggleBucketUi"
        >
          {{ bucketUiVersion }}
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
          <!-- Sun when dark (switch to light); moon when light (switch to dark) -->
          <svg
            v-if="isDark"
            class="header__icon"
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
            v-else
            class="header__icon"
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
          <span class="header__tooltip interface" aria-hidden="true">
            {{ themeTooltipLabel }}
          </span>
        </button>

        <button
          type="button"
          class="header__icon-btn"
          :class="{
            'header__icon-btn--active': isOpen && panelTab === 'boards',
            'header__icon-btn--tooltip-hidden': hiddenTooltip === 'boards',
          }"
          aria-label="Open boards"
          @click="onBoardsClick"
          @mouseleave="clearTooltipHide('boards')"
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
            <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
            <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
            <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
            <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
          </svg>
          <span class="header__tooltip interface" aria-hidden="true">Boards</span>
        </button>

        <button
          type="button"
          class="header__icon-btn"
          :class="{
            'header__icon-btn--active': isOpen && panelTab === 'selections',
            'header__icon-btn--tooltip-hidden': hiddenTooltip === 'selections',
          }"
          aria-label="Open selections"
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
          <span class="header__tooltip interface" aria-hidden="true">Selections</span>
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
const { isOpen, panelTab, openDrawer, closeDrawer } = useBucket()
const { version: bucketUiVersion, toggleVersion } = useBucketUi()
const { isDark, toggleTheme } = useTheme()
const route = useRoute()

const toggleBucketUi = () => {
  closeDrawer()
  toggleVersion()
}

type TooltipId = 'theme' | 'boards' | 'selections'
const hiddenTooltip = ref<TooltipId | null>(null)
/** Keep pre-click label so theme toggle doesn't flash the opposite word while fading out. */
const frozenThemeTooltip = ref<'Light' | 'Dark' | null>(null)

const themeTooltipLabel = computed(
  () => frozenThemeTooltip.value ?? (isDark.value ? 'Light' : 'Dark'),
)

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

const onBoardsClick = () => {
  hideTooltip('boards')
  if (isOpen.value && panelTab.value === 'boards') {
    closeDrawer()
    return
  }
  openDrawer('boards')
}

const onSelectionsClick = () => {
  hideTooltip('selections')
  if (isOpen.value && panelTab.value === 'selections') {
    closeDrawer()
    return
  }
  openDrawer('selections')
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
  transition: color 0.2s ease, border-color 0.2s ease;
}

.header__version:hover {
  color: var(--charcoal);
  border-color: var(--charcoal);
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
