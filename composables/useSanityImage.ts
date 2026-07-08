const PROJECT_ID = 'k8gpyc57'
const DATASET = 'production'

export const useSanityImage = () => {
  const getImageSrc = (asset: { url?: string; _id?: string } | string | null | undefined) => {
    if (!asset) return ''
    if (typeof asset === 'string') return asset

    if (asset?.url && typeof asset.url === 'string') {
      return asset.url
    }

    const id = asset?._id
    if (id && typeof id === 'string') {
      const match = id.match(/image-([^-]+)-(\d+)x(\d+)-(\w+)/)
      if (match) {
        const [, assetId, width, height, ext] = match
        return `https://cdn.sanity.io/images/${PROJECT_ID}/${DATASET}/${assetId}-${width}x${height}.${ext}`
      }
    }

    return ''
  }

  const imageUrl = (
    source: { asset?: { _ref?: string; _id?: string; url?: string } } | null | undefined,
    width = 1200,
  ) => {
    if (!source?.asset) return ''
    if (source.asset.url) return source.asset.url

    const ref = source.asset._ref || source.asset._id
    if (!ref) return ''

    const match = String(ref).match(/image-([^-]+)-(\d+)x(\d+)-(\w+)/)
    if (match) {
      const [, assetId, , , ext] = match
      return `https://cdn.sanity.io/images/${PROJECT_ID}/${DATASET}/${assetId}-${width}x${width}.${ext}`
    }

    return getImageSrc(source.asset)
  }

  return { getImageSrc, imageUrl }
}
