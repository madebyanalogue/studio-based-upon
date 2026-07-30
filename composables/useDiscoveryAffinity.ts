/** Shared affinity for “More Like This” → Discovery canvas. */
export const useDiscoveryAffinity = () => {
  const affinity = useState<{
    categories: string[]
    excludeId?: string
  } | null>('discovery-affinity', () => null)

  const setAffinity = (categories: string[], excludeId?: string) => {
    affinity.value = {
      categories: categories.filter(Boolean),
      excludeId,
    }
  }

  const clearAffinity = () => {
    affinity.value = null
  }

  return { affinity, setAffinity, clearAffinity }
}
