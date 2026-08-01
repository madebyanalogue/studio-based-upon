const PROJECT_ID = 'k8gpyc57'
const DATASET = 'production'

/** Display tiers for the grid → Flip → PDP → zoom path. */
export const IMAGE_WIDTH = {
  /** Materials grid / discovery cards (~2× typical cell) */
  thumb: 900,
  /** PDP hero + Flip flyer destination */
  hero: 1800,
  /** Expanded / zoom inspect */
  zoom: 2800,
  /** PDP gallery strip */
  strip: 160,
} as const

export type ImageTier = keyof typeof IMAGE_WIDTH

type SanityAsset = { url?: string; _id?: string; _ref?: string } | string | null | undefined
type SanityImageSource = { asset?: { _ref?: string; _id?: string; url?: string } } | null | undefined

const prefetched = new Set<string>()

const isSanityImageUrl = (url: string) => url.includes('cdn.sanity.io/images/')

/** Apply / replace Sanity image CDN transform params. */
export const withImageWidth = (url: string, width: number, quality = 80) => {
  if (!url || !isSanityImageUrl(url)) return url
  try {
    const parsed = new URL(url)
    parsed.searchParams.set('w', String(width))
    parsed.searchParams.set('auto', 'format')
    parsed.searchParams.set('q', String(quality))
    parsed.searchParams.set('fit', 'max')
    return parsed.href
  } catch {
    return url
  }
}

const baseFromRef = (ref: string) => {
  const match = String(ref).match(/image-([^-]+)-(\d+)x(\d+)-(\w+)/)
  if (!match) return ''
  const [, assetId, width, height, ext] = match
  return `https://cdn.sanity.io/images/${PROJECT_ID}/${DATASET}/${assetId}-${width}x${height}.${ext}`
}

/** Strip transform query so the same asset can be deduped across tiers. */
export const imageAssetKey = (url: string) => {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    parsed.search = ''
    return parsed.href
  } catch {
    return url
  }
}

/** Warm the browser cache for a Flip / zoom handoff. */
export const prefetchImage = (url: string) => {
  if (!import.meta.client || !url || prefetched.has(url)) {
    return Promise.resolve()
  }
  prefetched.add(url)
  return new Promise<void>((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = url
  })
}

export const useSanityImage = () => {
  const getImageSrc = (asset: SanityAsset) => {
    if (!asset) return ''
    if (typeof asset === 'string') return asset

    if (asset.url && typeof asset.url === 'string') {
      return asset.url
    }

    const id = asset._id || asset._ref
    if (id && typeof id === 'string') {
      return baseFromRef(id)
    }

    return ''
  }

  const imageUrl = (source: SanityImageSource, width = IMAGE_WIDTH.hero) => {
    if (!source?.asset) return ''

    const base =
      (source.asset.url && typeof source.asset.url === 'string' && source.asset.url) ||
      baseFromRef(String(source.asset._ref || source.asset._id || '')) ||
      getImageSrc(source.asset)

    if (!base) return ''
    return withImageWidth(base, width)
  }

  const imageTier = (source: SanityImageSource, tier: ImageTier) =>
    imageUrl(source, IMAGE_WIDTH[tier])

  /** Resolve a Sanity file asset (e.g. uploaded video) to a CDN URL. */
  const fileUrl = (source: SanityImageSource) => {
    if (!source?.asset) return ''
    if (source.asset.url) return source.asset.url

    const ref = source.asset._ref || source.asset._id
    if (!ref) return ''

    const match = String(ref).match(/^file-([a-zA-Z0-9]+)-([a-zA-Z0-9]+)$/)
    if (match) {
      const [, assetId, ext] = match
      return `https://cdn.sanity.io/files/${PROJECT_ID}/${DATASET}/${assetId}.${ext}`
    }

    return ''
  }

  return { getImageSrc, imageUrl, imageTier, fileUrl, withImageWidth, prefetchImage }
}
