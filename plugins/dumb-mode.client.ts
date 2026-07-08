import { DUMB_MODE_DEFAULT } from '~/config/dumbMode'

/**
 * Dumb mode toggle.
 *
 * Enables a "dumbed down", clunky version of the site by adding a
 * `dumb-mode` class to <html> (styling lives in assets/styles/dumb-mode.css).
 *
 * Precedence (highest to lowest):
 *   1. `?dumb=1` / `?dumb=0` in the URL (also persisted to localStorage).
 *   2. A previously persisted choice in localStorage.
 *   3. The file default in config/dumbMode.ts (also rendered server-side
 *      via nuxt.config so it permeates with no URL string and no flash).
 */
export default defineNuxtPlugin(() => {
  const STORAGE_KEY = 'basedupon:dumb-mode'
  const root = document.documentElement

  const DISABLE_VALUES = ['0', 'false', 'off', 'no']

  const apply = (enabled: boolean) => {
    root.classList.toggle('dumb-mode', enabled)
  }

  const store = (enabled: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(enabled))
    } catch {
      /* ignore storage failures (private mode, etc.) */
    }
  }

  const readStored = (): boolean | null => {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY)
      return value === null ? null : value === 'true'
    } catch {
      return null
    }
  }

  const coerce = (raw: string): boolean => !DISABLE_VALUES.includes(raw.toLowerCase())

  const stored = readStored()
  let enabled = stored === null ? DUMB_MODE_DEFAULT : stored

  const initialParams = new URLSearchParams(window.location.search)
  if (initialParams.has('dumb')) {
    enabled = coerce(initialParams.get('dumb') || '')
    store(enabled)
  }
  apply(enabled)

  ;(window as unknown as { setDumbMode: (value?: boolean) => void }).setDumbMode = (
    value = true,
  ) => {
    store(value)
    apply(value)
  }

  // Keep honouring `?dumb=` on client-side navigations.
  const router = useRouter()
  router.afterEach((to) => {
    const query = to.query.dumb
    if (query === undefined) return
    const next = coerce(String(Array.isArray(query) ? query[0] : query))
    store(next)
    apply(next)
  })
})
