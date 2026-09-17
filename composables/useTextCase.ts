export type TextCase = 'sentence' | 'uppercase'

const STORAGE_KEY = 'sba-text-case'

/** Toggle display titles between sentence case (default) and uppercase. */
export const useTextCase = () => {
  const textCase = useState<TextCase>('text-case', () => 'sentence')

  const applyDom = (next: TextCase) => {
    if (!import.meta.client) return
    document.documentElement.classList.toggle('text-uppercase', next === 'uppercase')
    // Drop legacy face toggle class — display face is always sans now.
    document.documentElement.classList.remove('face-serif', 'serif-sans')
  }

  const readStored = (): TextCase | null => {
    if (!import.meta.client) return null
    try {
      const value = window.localStorage.getItem(STORAGE_KEY)
      return value === 'sentence' || value === 'uppercase' ? value : null
    } catch {
      return null
    }
  }

  const setTextCase = (next: TextCase) => {
    textCase.value = next
    applyDom(next)
    if (!import.meta.client) return
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* private mode */
    }
  }

  const toggleTextCase = () => {
    setTextCase(textCase.value === 'uppercase' ? 'sentence' : 'uppercase')
  }

  const initTextCase = () => {
    if (!import.meta.client) return
    const stored = readStored()
    if (stored) setTextCase(stored)
    else applyDom(textCase.value)
  }

  return {
    textCase,
    setTextCase,
    toggleTextCase,
    initTextCase,
    isUppercase: computed(() => textCase.value === 'uppercase'),
  }
}
