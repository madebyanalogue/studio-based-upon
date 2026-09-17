const STORAGE_KEY = 'sba-stack-chrome'
const DOM_CLASS = 'stack-chrome-hidden'

/**
 * Show/hide the bottom BucketStack chrome (`.stack` + `.stack__boards-rail`).
 */
export const useStackChrome = () => {
  const visible = useState<boolean>('stack-chrome-visible', () => true)

  const applyDom = (next: boolean) => {
    if (!import.meta.client) return
    document.documentElement.classList.toggle(DOM_CLASS, !next)
  }

  const readStored = (): boolean | null => {
    if (!import.meta.client) return null
    try {
      const value = window.localStorage.getItem(STORAGE_KEY)
      if (value === '0') return false
      if (value === '1') return true
      return null
    } catch {
      return null
    }
  }

  const setVisible = (next: boolean) => {
    visible.value = next
    applyDom(next)
    if (!import.meta.client) return
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    } catch {
      /* private mode */
    }
  }

  const toggleVisible = () => {
    setVisible(!visible.value)
  }

  const initStackChrome = () => {
    if (!import.meta.client) return
    const stored = readStored()
    if (stored === null) applyDom(visible.value)
    else setVisible(stored)
  }

  return {
    stackChromeVisible: visible,
    setStackChromeVisible: setVisible,
    toggleStackChrome: toggleVisible,
    initStackChrome,
  }
}
