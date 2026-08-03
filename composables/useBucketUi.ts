export type BucketUiVersion = 'v1' | 'v2'

const STORAGE_KEY = 'sba-bucket-ui'

/**
 * Presentational bucket shell: v1 strip drawer, v2 stacked pile + fullscreen grid.
 * Locked to v2 for now — v1 remains in the codebase but is not user-selectable.
 */
export const useBucketUi = () => {
  const version = useState<BucketUiVersion>('bucket-ui-version', () => 'v2')

  const setVersion = (_next: BucketUiVersion) => {
    version.value = 'v2'
    if (!import.meta.client) return
    try {
      window.localStorage.setItem(STORAGE_KEY, 'v2')
    } catch {
      /* private mode */
    }
  }

  const toggleVersion = () => {
    setVersion('v2')
  }

  const initBucketUi = () => {
    if (!import.meta.client) return
    version.value = 'v2'
    try {
      window.localStorage.setItem(STORAGE_KEY, 'v2')
    } catch {
      /* private mode */
    }
  }

  return {
    version,
    setVersion,
    toggleVersion,
    initBucketUi,
    isV1: computed(() => false),
    isV2: computed(() => true),
  }
}
