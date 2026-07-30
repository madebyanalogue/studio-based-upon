export type DiscoveryLayoutEntry = {
  key: string
  item: {
    _id: string
    title: string
    slug?: { current?: string }
    itemType?: string
    category?: string
    categories?: string[]
    materials?: string[]
    colours?: string[]
    image?: { asset?: { url?: string } }
    linkType?: string
    externalUrl?: string
  }
  x: number
  y: number
  size: number
  z: number
  visible: boolean
}

/** Persists Discovery canvas layout across in-app navigation. */
export const useDiscoveryCanvas = () => {
  const layout = useState<DiscoveryLayoutEntry[]>('discovery-layout', () => [])
  const pan = useState('discovery-pan', () => ({ x: 0, y: 0 }))
  const seed = useState('discovery-seed', () => 1)
  const zCounter = useState('discovery-z', () => 1)
  const activeFilter = useState('discovery-filter', () => 'All')

  return {
    layout,
    pan,
    seed,
    zCounter,
    activeFilter,
  }
}
