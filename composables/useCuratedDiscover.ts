import { IMAGE_WIDTH } from '~/composables/useSanityImage'

export type DiscoverDisplayMode = 'gallery' | 'editorial' | 'feature'
export type DiscoverBreakerType = 'statement' | 'image' | 'imageText'

export type DiscoverArtwork = {
  id: string
  title: string
  artist?: string
  year?: number | null
  imageUrl: string
  slug?: string
}

export type DiscoverCollection = {
  id: string
  title: string
  description?: string
  artworks: DiscoverArtwork[]
}

export type DiscoverCollectionBlock = {
  _key: string
  _type: 'collectionBlock'
  displayMode: DiscoverDisplayMode
  collection: DiscoverCollection | null
}

export type DiscoverBreakerBlock = {
  _key: string
  _type: 'breakerBlock'
  breakerType: DiscoverBreakerType
  eyebrow?: string
  heading?: string
  body?: string
  imageUrl?: string
  linkLabel?: string
  link?: string
}

export type DiscoverContentBlock = DiscoverCollectionBlock | DiscoverBreakerBlock

export type DiscoverPageData = {
  seoTitle?: string
  seoDescription?: string
  heroEyebrow?: string
  heroTitle?: string
  heroBody?: string
  content: DiscoverContentBlock[]
}

export const DISCOVER_PAGE_QUERY = `*[_type == "discoverPage"][0] {
  seoTitle,
  seoDescription,
  heroEyebrow,
  heroTitle,
  heroBody,
  content[] {
    _key,
    _type,
    _type == "collectionBlock" => {
      displayMode,
      collection->{
        _id,
        title,
        description,
        products[]->{
          _id,
          title,
          year,
          commissionedBy,
          "series": series->title,
          "slug": slug.current,
          linkType,
          image { asset->{ _id, url } }
        }
      }
    },
    _type == "breakerBlock" => {
      breakerType,
      eyebrow,
      heading,
      body,
      linkLabel,
      link,
      image { asset->{ _id, url } }
    }
  }
}`

const demoArt = (n: number, seed: string): DiscoverArtwork => ({
  id: `demo-art-${seed}-${n}`,
  title: `Work ${n}`,
  artist: 'Studio Based Upon',
  year: 2020 + (n % 6),
  imageUrl: `https://picsum.photos/seed/sba-discover-${seed}-${n}/1200/1500`,
  slug: undefined,
})

const demoCollection = (
  id: string,
  title: string,
  count: number,
): DiscoverCollection => ({
  id,
  title,
  description: 'A considered grouping of material studies and forms.',
  artworks: Array.from({ length: count }, (_, i) => demoArt(i + 1, id)),
})

/** Editorial demo page when CMS content is empty. */
export const demoDiscoverPage = (): DiscoverPageData => ({
  heroEyebrow: 'Curated Discovery',
  heroTitle: 'A digital exhibition',
  heroBody:
    'Explore artworks through curated collections — considered, spacious, and art-led.',
  content: [
    {
      _key: 'demo-c1',
      _type: 'collectionBlock',
      displayMode: 'gallery',
      collection: demoCollection('new-works', 'New Works', 8),
    },
    {
      _key: 'demo-c2',
      _type: 'collectionBlock',
      displayMode: 'gallery',
      collection: demoCollection('material-studies', 'Material Studies', 6),
    },
    {
      _key: 'demo-b1',
      _type: 'breakerBlock',
      breakerType: 'statement',
      eyebrow: 'Studio note',
      heading: 'Objects shaped by landscape, light and liquid metal.',
      body: 'Each collection is assembled by hand — a digital exhibition that changes as the studio’s work evolves.',
      linkLabel: 'Materials & Forms',
      link: '/materials-and-forms',
    },
    {
      _key: 'demo-c3',
      _type: 'collectionBlock',
      displayMode: 'editorial',
      collection: demoCollection('bronze', 'Bronze', 5),
    },
    {
      _key: 'demo-c4',
      _type: 'collectionBlock',
      displayMode: 'feature',
      collection: demoCollection('featured', 'In Focus', 4),
    },
    {
      _key: 'demo-b2',
      _type: 'breakerBlock',
      breakerType: 'imageText',
      eyebrow: 'Process',
      heading: 'From pour to patina',
      body: 'Studio photography and installation stills set a slower pace between rails.',
      imageUrl: 'https://picsum.photos/seed/sba-discover-breaker/1800/1000',
      linkLabel: 'About the studio',
      link: '/about',
    },
    {
      _key: 'demo-c5',
      _type: 'collectionBlock',
      displayMode: 'gallery',
      collection: demoCollection('surfaces', 'Surfaces', 7),
    },
  ],
})

export const useCuratedDiscover = async () => {
  const { imageUrl, getImageSrc } = useSanityImage()

  const resolveSrc = (asset?: { _id?: string; url?: string } | null) => {
    if (!asset) return ''
    return imageUrl({ asset }, IMAGE_WIDTH.thumb) || getImageSrc(asset) || ''
  }

  const { data, pending, error, refresh } = await useAsyncData('discoverPage', () =>
    $fetch('/api/sanity/query', { method: 'POST', body: { query: DISCOVER_PAGE_QUERY } })
      .then((r: { result?: unknown }) => r?.result ?? null)
      .catch(() => null),
  )

  const page = computed<DiscoverPageData>(() => {
    const raw = data.value as Record<string, unknown> | null
    if (!raw) return demoDiscoverPage()

    const contentRaw = Array.isArray(raw.content) ? raw.content : []
    const content: DiscoverContentBlock[] = contentRaw
      .map((block: Record<string, unknown>, index: number) => {
        const key = String(block._key || `block-${index}`)
        if (block._type === 'breakerBlock') {
          const image = block.image as { asset?: { _id?: string; url?: string } } | undefined
          return {
            _key: key,
            _type: 'breakerBlock' as const,
            breakerType: (block.breakerType as DiscoverBreakerType) || 'statement',
            eyebrow: (block.eyebrow as string) || undefined,
            heading: (block.heading as string) || undefined,
            body: (block.body as string) || undefined,
            linkLabel: (block.linkLabel as string) || undefined,
            link: (block.link as string) || undefined,
            imageUrl: resolveSrc(image?.asset) || undefined,
          }
        }

        if (block._type === 'collectionBlock') {
          const col = block.collection as Record<string, unknown> | null
          if (!col) return null
          const products = Array.isArray(col.products) ? col.products : []
          const artworks: DiscoverArtwork[] = products
            .map((product: Record<string, unknown>) => {
              if (!product?._id) return null
              const image = product.image as { asset?: { _id?: string; url?: string } } | undefined
              const src = resolveSrc(image?.asset)
              if (!src) return null
              const artist =
                String(product.series || '').trim() ||
                String(product.commissionedBy || '').trim() ||
                'Studio Based Upon'
              return {
                id: String(product._id),
                title: String(product.title || 'Untitled'),
                artist,
                year: typeof product.year === 'number' ? product.year : null,
                imageUrl: src,
                slug:
                  product.linkType === 'product' && product.slug
                    ? String(product.slug)
                    : undefined,
              } satisfies DiscoverArtwork
            })
            .filter(Boolean) as DiscoverArtwork[]

          if (!artworks.length) return null

          return {
            _key: key,
            _type: 'collectionBlock' as const,
            displayMode: (block.displayMode as DiscoverDisplayMode) || 'gallery',
            collection: {
              id: String(col._id || key),
              title: String(col.title || 'Collection'),
              description: (col.description as string) || undefined,
              artworks,
            },
          }
        }

        return null
      })
      .filter(Boolean) as DiscoverContentBlock[]

    if (!content.length) return demoDiscoverPage()

    return {
      seoTitle: (raw.seoTitle as string) || undefined,
      seoDescription: (raw.seoDescription as string) || undefined,
      heroEyebrow: (raw.heroEyebrow as string) || 'Curated Discovery',
      heroTitle: (raw.heroTitle as string) || 'A digital exhibition',
      heroBody: (raw.heroBody as string) || undefined,
      content,
    }
  })

  return { page, pending, error, refresh }
}
