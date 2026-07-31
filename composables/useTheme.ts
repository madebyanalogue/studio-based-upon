export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'basedupon:theme'

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

/** Light / dark theme with localStorage persistence. */
export const useTheme = () => {
  const theme = useState<ThemeMode>('theme-mode', () => {
    if (import.meta.client) {
      const stored = readStored()
      if (stored) return stored
      if (document.documentElement.classList.contains('dark')) return 'dark'
    }
    return 'light'
  })

  const isDark = computed(() => theme.value === 'dark')

  const setTheme = (mode: ThemeMode) => {
    theme.value = mode
    applyDom(mode)
    writeStored(mode)
  }

  const toggleTheme = () => {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  /** Sync Vue state from storage / early head script (call once on client mount). */
  const initTheme = () => {
    if (!import.meta.client) return
    const stored = readStored()
    if (stored) {
      setTheme(stored)
      return
    }
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  }

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme,
    initTheme,
  }
}
