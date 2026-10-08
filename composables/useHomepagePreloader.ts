const ENTRY_PATH_KEY = 'sba-entry-path'
const PRELOADER_DONE_KEY = 'sba-home-preloader-done'

export function isHomepagePath(path: string) {
  return path === '/' || path === '/home'
}

export function shouldShowHomepagePreloader() {
  if (!import.meta.client) return false

  const path = window.location.pathname
  if (!isHomepagePath(path)) return false

  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  if (nav?.type === 'reload') return true

  const entryPath = sessionStorage.getItem(ENTRY_PATH_KEY)
  if (!entryPath) {
    sessionStorage.setItem(ENTRY_PATH_KEY, path)
    return true
  }

  if (!isHomepagePath(entryPath)) return false

  return !sessionStorage.getItem(PRELOADER_DONE_KEY)
}

export function markHomepagePreloaderDone() {
  if (!import.meta.client) return
  sessionStorage.setItem(PRELOADER_DONE_KEY, '1')
}

export type HomepageIntroPhase = 'skipped' | 'cover' | 'type' | 'chrome' | 'done'

export type HomepageIntroProduct = {
  title: string
  meta: string
  image: string
  href: string
}

export function useHomepageIntro() {
  const phase = useState<HomepageIntroPhase>('homepage-intro-phase', () => 'skipped')
  const product = useState<HomepageIntroProduct | null>('homepage-intro-product', () => null)
  return { phase, product }
}

export function clearHomepageIntroLock() {
  if (!import.meta.client) return
  document.documentElement.classList.remove(
    'homepage-intro',
    'homepage-intro-reveal',
    'homepage-intro-type',
  )
  document.body.classList.remove('homepage-intro-pending')
}

export function useHomepagePreloader() {
  return {
    isHomepagePath,
    shouldShowHomepagePreloader,
    markHomepagePreloaderDone,
  }
}
