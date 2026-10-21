import { productGalleryFrames } from './productImages'

export const DISCOVERY_QUERY = `*[_id == "discovery"][0]{
  title,
  frames[] {
    imageIndex,
    "frameAssetId": image.asset._ref,
    image { asset->{ _id, url } },
    product->{
      _id,
      title,
      slug,
      category,
      categories,
      type,
      linkType,
      image { asset->{ _id, url } },
      gallery[] { asset->{ _id, url } }
    }
  }
}`

export type DiscoveryFrameItem = {
  _id: string
  title: string
  slug?: { current?: string } | string
  category?: string
  categories?: string[]
  type?: string
  linkType?: string
  gallery: { asset?: { _id?: string; url?: string } }[]
  imageIndex: number
  frameAssetId?: string
}

type DiscoveryDoc = {
  frames?: Array<{
    imageIndex?: number
    frameAssetId?: string
    image?: { asset?: { _id?: string; url?: string } }
    product?: Record<string, unknown> | null
  }>
}

const shuffle = <T,>(list: readonly T[]) => {
  const next = list.slice()
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const hold = next[i]!
    next[i] = next[j]!
    next[j] = hold
  }
  return next
}

export const useDiscoveryCatalog = async () => {
  const { data, pending, error, refresh } = await useAsyncData('discovery-v2', () =>
    $fetch('/api/sanity/query', { method: 'POST', body: { query: DISCOVERY_QUERY } })
      .then((r: { result?: unknown }) => {
        const result = r?.result ?? null
        if (!result || typeof result !== 'object') return result
        const doc = result as DiscoveryDoc
        if (!Array.isArray(doc.frames)) return doc
        return { ...doc, frames: shuffle(doc.frames) }
      })
      .catch(() => null),
  )

  const items = computed<DiscoveryFrameItem[]>(() => {
    const doc = data.value as DiscoveryDoc | null
    const next: DiscoveryFrameItem[] = []
    for (const entry of doc?.frames || []) {
      const product = entry.product
      if (!product?._id) continue
      const gallery = productGalleryFrames({
        gallery: (product.gallery as DiscoveryFrameItem['gallery']) || [],
        image:
          (product.image as DiscoveryFrameItem['gallery'][number]) || entry.image,
      })
      const assetId = String(entry.frameAssetId || entry.image?.asset?._id || '')
      const matched = assetId
        ? gallery.findIndex((frame) => frame.asset?._id === assetId)
        : -1
      const imageIndex =
        matched >= 0
          ? matched
          : typeof entry.imageIndex === 'number'
            ? entry.imageIndex
            : 0
      next.push({
        _id: String(product._id),
        title: String(product.title || 'Untitled'),
        slug: product.slug as DiscoveryFrameItem['slug'],
        category: product.category as string | undefined,
        categories: product.categories as string[] | undefined,
        type: product.type as string | undefined,
        linkType: product.linkType as string | undefined,
        gallery,
        imageIndex,
        frameAssetId: assetId || undefined,
      })
    }
    return next
  })

  return { items, pending, error, refresh }
}
