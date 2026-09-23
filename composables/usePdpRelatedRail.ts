/** Matches ProductIndexRail `--index-motion` / BucketStack `right` transition. */
export const PDP_RELATED_RAIL_MS = 350

/**
 * "More like this" rail — session-only (unlike the Index cookie).
 * Opening a fresh PDP always starts closed; closing clears the push on the stack.
 */
export const usePdpRelatedRail = () => {
  const relatedRailVisible = useState('pdp-related-rail-visible', () => false)
  const frozenRelatedIdList = useState<string[] | null>(
    'pdp-index-frozen-ids',
    () => null,
  )

  const syncRelatedRailDom = () => {
    if (!import.meta.client) return
    document.documentElement.classList.toggle(
      'pdp-related-rail-open',
      Boolean(relatedRailVisible.value),
    )
  }

  const closeRelatedRail = () => {
    relatedRailVisible.value = false
    frozenRelatedIdList.value = null
    syncRelatedRailDom()
  }

  /** Fresh PDP session — never inherit a prior "More like this" open state. */
  const resetRelatedRail = () => {
    closeRelatedRail()
  }

  return {
    relatedRailVisible,
    frozenRelatedIdList,
    syncRelatedRailDom,
    closeRelatedRail,
    resetRelatedRail,
  }
}
