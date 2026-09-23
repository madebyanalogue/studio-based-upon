import { isHomepagePath } from '~/composables/useHomepagePreloader'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'basedupon:theme'

const isPrecraftedPath = (path: string) =>
  path === '/pre-crafted' || path.startsWith('/pre-crafted/')

const isCuratePath = (path: string) =>
  path === '/curate' || path.startsWith('/curate/')

const readStored = (): ThemeMode | null => {
  if (!import.meta.client) return null
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'dark' || value === 'light' ? value : null
  } catch {
    return null
  }
}

const writeStored = (mode: ThemeMode) => {
  if (!import.meta.client) return
  try {
    window.localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    /* private mode, etc. */
  }
}

const applyDom = (mode: ThemeMode) => {
  if (!import.meta.client) return
  document.documentElement.classList.toggle('dark', mode === 'dark')
}

/** Light / dark theme with localStorage persistence. Homepage + Curate always dark; (Pre)Crafted always light. */
export const useTheme = () => {
  // Always the same on server + first client paint so hydration matches.
  // Client storage is applied after mount via initTheme().
  const theme = useState<ThemeMode>('theme-mode', () => 'light')
  const route = useRoute()

  const forcedDark = computed(
    () => isHomepagePath(route.path) || isCuratePath(route.path),
  )
  const forcedLight = computed(() => isPrecraftedPath(route.path))
  const isDark = computed(() => {
    if (forcedDark.value) return true
    if (forcedLight.value) return false
    return theme.value === 'dark'
  })

  const applyEffective = () => {
    applyDom(isDark.value ? 'dark' : 'light')
  }

  const setTheme = (mode: ThemeMode) => {
    theme.value = mode
    writeStored(mode)
    applyEffective()
  }

  const toggleTheme = () => {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  /** Sync Vue state from storage / early head script (call once after mount). */
  const initTheme = () => {
    if (!import.meta.client) return
    const stored = readStored()
    if (stored) {
      theme.value = stored
    } else {
      theme.value = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    }
    applyEffective()

    // Paint the settled theme with --theme-ms: 0, then enable toggle transitions.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.add('theme-ready')
      })
    })
  }

  if (import.meta.client) {
    watch(
      () => route.path,
      () => applyEffective(),
    )
  }

  return {
    theme,
    isDark,
    forcedDark,
    forcedLight,
    setTheme,
    toggleTheme,
    initTheme,
  }
}
