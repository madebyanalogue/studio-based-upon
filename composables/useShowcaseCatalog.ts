import { IMAGE_WIDTH } from '~/composables/useSanityImage'

export type ShowcaseBucketImage = {
  id: string
  src: string
  title?: string
  productId?: string
  slug?: string
}

export type ShowcaseBucket = {
  id: string
  title: string
  productId?: string
  slug?: string
  images: ShowcaseBucketImage[]
  /** @deprecated No longer assigned in CMS — kept for demo ordering only. */
  column?: number
}

export const SHOWCASE_SLOT_COUNT = 6
/** Soft cap for user-added columns. */
export const SHOWCASE_MAX_COLUMNS = 8
/** Columns shown on first load. */
export const SHOWCASE_DEFAULT_COLUMNS = 4
/** @deprecated Prefer SHOWCASE_DEFAULT_COLUMNS — kept for older imports. */
export const SHOWCASE_DEFAULT_VISIBLE_COLUMNS = [1, 2, 3, 4] as const

export const SHOWCASE_PAGE_QUERY = `*[_type == "showcasePage"][0] {
  seoTitle,
  seoDescription,
  buckets[]->{
    _id,
    title,
    entries[] {
      title,
      image { asset->{ _id, url } },
      "product": product->{
        _id,
        title,
        "slug": slug.current
      }
    }
  }
}`

const ASPECT_MIX = [
  { width: 900, height: 1125 },
  { width: 900, height: 1200 },
  { width: 1000, height: 1000 },
  { width: 800, height: 1100 },
] as const

const demoBucket = (column: number): ShowcaseBucket => {
  const columnIndex = column - 1
  const images: ShowcaseBucketImage[] = Array.from({ length: 8 }, (_, i) => {
    const aspect = ASPECT_MIX[(columnIndex + i) % ASPECT_MIX.length]!
    const seed = `sba-showcase-c${column}-i${i}`
    return {
      id: seed,
      src: `https://picsum.photos/seed/${seed}/${aspect.width}/${aspect.height}`,
      title: `Column ${column} · ${i + 1}`,
    }
  })

  return {
    id: `demo-showcase-${column}`,
    column,
    title: `Column ${column}`,
    productId: `demo-showcase-${column}`,
    images,
  }
}

let demoCache: ShowcaseBucket[] | null = null

/** Demo buckets for columns 1…n (cached for slot count). */
export const demoShowcaseBuckets = (
  count = SHOWCASE_SLOT_COUNT,
): ShowcaseBucket[] => {
  if (!demoCache || demoCache.length < count) {
    demoCache = Array.from({ length: Math.max(count, SHOWCASE_SLOT_COUNT) }, (_, i) =>
      demoBucket(i + 1),
    )
  }
  return demoCache.slice(0, count)
}

export const useShowcaseCatalog = async () => {
  const { imageUrl, getImageSrc } = useSanityImage()

  const { data, pending, error, refresh } = await useAsyncData('showcasePage', () =>
    $fetch('/api/sanity/query', { method: 'POST', body: { query: SHOWCASE_PAGE_QUERY } })
      .then((r: { result?: unknown }) => r?.result ?? null)
      .catch(() => null),
  )

  const resolveSrc = (asset?: { _id?: string; url?: string } | null) => {
    if (!asset) return ''
    return imageUrl({ asset }, IMAGE_WIDTH.thumb) || getImageSrc(asset) || ''
  }

  const buckets = computed<ShowcaseBucket[]>(() => {
    const raw = data.value as {
      buckets?: {
        _id?: string
        title?: string
        entries?: {
          title?: string
          image?: { asset?: { _id?: string; url?: string } }
          product?: { _id?: string; title?: string; slug?: string } | null
        }[]
      }[]
    } | null

    const fromCms = (raw?.buckets || [])
      .map((bucket, bucketIndex) => {
        if (!bucket) return null

        const images: ShowcaseBucketImage[] = (bucket.entries || [])
          .map((entry, entryIndex) => {
            const src = resolveSrc(entry.image?.asset)
            if (!src) return null
            return {
              id: entry.image?.asset?._id || `${bucket._id || 'bucket'}-${entryIndex}`,
              src,
              title: entry.title || entry.product?.title,
              productId: entry.product?._id,
              slug: entry.product?.slug || undefined,
            } satisfies ShowcaseBucketImage
          })
          .filter(Boolean) as ShowcaseBucketImage[]

        if (!images.length) return null

        const first = images[0]
        return {
          id: bucket._id || `bucket-${bucketIndex}`,
          title: bucket.title || first?.title || `Bucket ${bucketIndex + 1}`,
          productId: first?.productId,
          slug: first?.slug,
          images,
        } satisfies ShowcaseBucket
      })
      .filter(Boolean) as ShowcaseBucket[]

    if (!fromCms.length) return demoShowcaseBuckets()
    return fromCms
  })

  const page = computed(() => data.value as { seoTitle?: string; seoDescription?: string } | null)

  return {
    buckets,
    /** @deprecated use buckets */
    columns: buckets,
    page,
    pending,
    error,
    refresh,
  }
}
