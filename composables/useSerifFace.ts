export type SerifFace = 'serif' | 'sans'

const STORAGE_KEY = 'sba-serif-face'

/** Toggle --serif between Maison Medium (sans, default) and Ashcroft (serif). */
export const useSerifFace = () => {
  // Sans is the default; CSS uses Maison Medium until html.face-serif is set.
  const face = useState<SerifFace>('serif-face', () => 'sans')

  const applyDom = (next: SerifFace) => {
    if (!import.meta.client) return
    document.documentElement.classList.toggle('face-serif', next === 'serif')
    // Drop legacy class from earlier sans-default flip
    document.documentElement.classList.remove('serif-sans')
  }

  const readStored = (): SerifFace | null => {
    if (!import.meta.client) return null
    try {
      const value = window.localStorage.getItem(STORAGE_KEY)
      return value === 'serif' || value === 'sans' ? value : null
    } catch {
      return null
    }
  }

  const setFace = (next: SerifFace) => {
    face.value = next
    applyDom(next)
    if (!import.meta.client) return
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* private mode */
    }
  }

  const toggleFace = () => {
    setFace(face.value === 'serif' ? 'sans' : 'serif')
  }

  const initSerifFace = () => {
    if (!import.meta.client) return
    const stored = readStored()
    if (stored) setFace(stored)
    else applyDom(face.value)
  }

  return {
    face,
    setFace,
    toggleFace,
    initSerifFace,
    isSans: computed(() => face.value === 'sans'),
  }
}
