export type BucketUiVersion = 'v1' | 'v2'

const STORAGE_KEY = 'sba-bucket-ui'

/** Presentational bucket shell: v1 strip drawer, v2 stacked pile + fullscreen grid. */
export const useBucketUi = () => {
  const version = useState<BucketUiVersion>('bucket-ui-version', () => 'v2')

  const readStored = (): BucketUiVersion | null => {
    if (!import.meta.client) return null
    try {
      const value = window.localStorage.getItem(STORAGE_KEY)
      return value === 'v1' || value === 'v2' ? value : null
    } catch {
      return null
    }
  }

  const setVersion = (next: BucketUiVersion) => {
    version.value = next
    if (!import.meta.client) return
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* private mode */
    }
  }

  const toggleVersion = () => {
    setVersion(version.value === 'v1' ? 'v2' : 'v1')
  }

  const initBucketUi = () => {
    if (!import.meta.client) return
    const stored = readStored()
    if (stored) version.value = stored
  }

  return {
    version,
    setVersion,
    toggleVersion,
    initBucketUi,
    isV1: computed(() => version.value === 'v1'),
    isV2: computed(() => version.value === 'v2'),
  }
}
