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

export type ShowcaseSlide = {
  id: string
  title: string
  location: string
  image: string
  /** Materials & Forms product title when linked. */
  productTitle?: string
  /** Materials & Forms slug — links to the product page when set. */
  slug?: string
  productId?: string
}

export const SHOWCASE_SLOT_COUNT = 6
/** Soft cap for user-added columns. */
export const SHOWCASE_MAX_COLUMNS = 8
/** Columns shown on first load. */
export const SHOWCASE_DEFAULT_COLUMNS = 4
/** @deprecated Prefer SHOWCASE_DEFAULT_COLUMNS — kept for older imports. */
export const SHOWCASE_DEFAULT_VISIBLE_COLUMNS = [1, 2, 3, 4] as const

export const SHOWCASE_DEFAULT_INTERVAL_MS = 5600

export const SHOWCASE_PAGE_QUERY = `*[_type == "showcasePage"][0] {
  seoTitle,
  seoDescription,
  carouselIntervalMs,
  slides[] {
    _key,
    title,
    "location": coalesce(location, description),
    image { asset->{ _id, url } },
    "product": product->{
      _id,
      title,
      "slug": coalesce(slug.current, _id)
    }
  },
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

const DEMO_SLIDES: ShowcaseSlide[] = [
  {
    id: 'liquid-metal',
    title: 'Liquid metal surfaces',
    location: 'London',
    image: 'https://picsum.photos/seed/sba-showcase-hero-1/2400/1600',
    productTitle: 'Liquid Metal Panel',
    slug: 'liquid-metal-panel',
  },
  {
    id: 'tramazite',
    title: 'Tramazite™ materiality',
    location: 'Milan',
    image: 'https://picsum.photos/seed/sba-showcase-hero-2/2400/1600',
    productTitle: 'Tramazite',
    slug: 'tramazite',
  },
  {
    id: 'bespoke',
    title: 'Bespoke architectural works',
    location: 'New York',
    image: 'https://picsum.photos/seed/sba-showcase-hero-3/2400/1600',
  },
  {
    id: 'furniture',
    title: 'Sculptural furniture',
    location: 'Paris',
    image: 'https://picsum.photos/seed/sba-showcase-hero-4/2400/1600',
  },
]

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

export const demoShowcaseSlides = (): ShowcaseSlide[] => DEMO_SLIDES

export const useShowcaseCatalog = async () => {
  const { imageUrl, getImageSrc } = useSanityImage()

  const { data, pending, error, refresh } = await useAsyncData('showcasePage', () =>
    $fetch('/api/sanity/query', { method: 'POST', body: { query: SHOWCASE_PAGE_QUERY } })
      .then((r: { result?: unknown }) => r?.result ?? null)
      .catch(() => null),
  )

  const resolveSrc = (
    asset?: { _id?: string; url?: string } | null,
    width = IMAGE_WIDTH.thumb,
  ) => {
    if (!asset) return ''
    return imageUrl({ asset }, width) || getImageSrc(asset) || ''
  }

  /** Full-bleed carousel — native Sanity resolution, high-quality auto format. */
  const resolveCarouselSrc = (asset?: { _id?: string; url?: string } | null) => {
    if (!asset) return ''
    const base = getImageSrc(asset)
    if (!base) return imageUrl({ asset }, IMAGE_WIDTH.zoom) || ''
    if (!base.includes('cdn.sanity.io/images/')) return base
    try {
      const parsed = new URL(base)
      parsed.searchParams.delete('w')
      parsed.searchParams.delete('h')
      parsed.searchParams.delete('fit')
      parsed.searchParams.set('auto', 'format')
      parsed.searchParams.set('q', '90')
      return parsed.href
    } catch {
      return base
    }
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

  const slides = computed<ShowcaseSlide[]>(() => {
    const raw = data.value as {
      slides?: {
        _key?: string
        title?: string
        location?: string
        image?: { asset?: { _id?: string; url?: string } }
        product?: { _id?: string; title?: string; slug?: string } | null
      }[]
    } | null

    const fromCms = (raw?.slides || [])
      .map((slide, index) => {
        const src = resolveCarouselSrc(slide.image?.asset)
        if (!src) return null
        const slug = slide.product?.slug?.trim() || undefined
        const productTitle = slide.product?.title?.trim() || undefined
        return {
          id: slide._key || slide.image?.asset?._id || `slide-${index}`,
          title: slide.title?.trim() || 'Untitled',
          location: slide.location?.trim() || '',
          image: src,
          productTitle,
          slug,
          productId: slide.product?._id,
        } satisfies ShowcaseSlide
      })
      .filter(Boolean) as ShowcaseSlide[]

    return fromCms.length ? fromCms : demoShowcaseSlides()
  })

  const carouselIntervalMs = computed(() => {
    const raw = data.value as { carouselIntervalMs?: number } | null
    const value = Number(raw?.carouselIntervalMs)
    if (!Number.isFinite(value) || value < 2000) return SHOWCASE_DEFAULT_INTERVAL_MS
    return Math.min(30000, Math.round(value))
  })

  const page = computed(
    () =>
      data.value as {
        seoTitle?: string
        seoDescription?: string
      } | null,
  )

  return {
    buckets,
    slides,
    carouselIntervalMs,
    /** @deprecated use buckets */
    columns: buckets,
    page,
    pending,
    error,
    refresh,
  }
}
