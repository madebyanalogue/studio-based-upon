export type BucketUiVersion = 'v1' | 'v2' | 'v3'

const STORAGE_KEY = 'sba-bucket-ui'
const VERSIONS: BucketUiVersion[] = ['v1', 'v2', 'v3']

const isVersion = (value: unknown): value is BucketUiVersion =>
  value === 'v1' || value === 'v2' || value === 'v3'

/**
 * Presentational bucket shell:
 * - v1 strip drawer (BucketDrawer)
 * - v2 stacked pile + fullscreen grid (BucketStack)
 * - v3 left selections side panel (SelectionsPanel)
 */
export const useBucketUi = () => {
  const version = useState<BucketUiVersion>('bucket-ui-version', () => 'v2')

  const applyDom = (next: BucketUiVersion) => {
    if (!import.meta.client) return
    const root = document.documentElement
    root.classList.toggle('bucket-ui-v1', next === 'v1')
    root.classList.toggle('bucket-ui-v2', next === 'v2')
    root.classList.toggle('bucket-ui-v3', next === 'v3')
    // Layout inset only for the left panel (v3).
    root.classList.toggle('selections-panel-hidden', next !== 'v3')
  }

  const setVersion = (next: BucketUiVersion) => {
    version.value = next
    applyDom(next)
    if (!import.meta.client) return
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* private mode */
    }
  }

  const toggleVersion = () => {
    const index = VERSIONS.indexOf(version.value)
    const next = VERSIONS[(index + 1) % VERSIONS.length] ?? 'v2'
    setVersion(next)
  }

  const initBucketUi = () => {
    if (!import.meta.client) return
    let stored: BucketUiVersion = 'v2'
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (isVersion(raw)) stored = raw
    } catch {
      /* private mode */
    }
    setVersion(stored)
  }

  return {
    version,
    setVersion,
    toggleVersion,
    initBucketUi,
    isV1: computed(() => version.value === 'v1'),
    isV2: computed(() => version.value === 'v2'),
    isV3: computed(() => version.value === 'v3'),
  }
}
