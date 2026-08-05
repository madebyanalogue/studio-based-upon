import {
  DEMO_PRODUCTS,
  PRODUCT_TYPE_FILTERS,
  isPrecraftedItem,
  type FormalItem,
} from './demoData'

export const LIBRARY_QUERY = `*[_type == "gridItem"] | order(orderRank) {
  _id,
  title,
  slug,
  category,
  categories,
  tags,
  "series": series->title,
  "feature": feature->title,
  "materials": materiality[]->title,
  "colours": colours[]->title,
  image { asset-> { _id, url } },
  gallery[] { asset-> { _id, url } },
  spiritGallery[] { asset-> { _id, url } },
  linkType,
  externalUrl
}`

export type LibraryItem = FormalItem & {
  category?: string
  tags?: string[]
  externalUrl?: string
  gallery?: { asset?: { url?: string; _id?: string } }[]
  spiritGallery?: { asset?: { url?: string; _id?: string } }[]
}

const asSlug = (slug: FormalItem['slug'] | string | undefined) => {
  if (!slug) return undefined
  if (typeof slug === 'string') return { current: slug }
  return slug
}

const LEGACY_FORM_TAGS = new Set([
  'furniture',
  'interior',
  'tramazite',
  'liquidmetal',
  'liquid metal',
])

const PRIMARY_TYPES = new Set(['forms', 'surface', 'decorative', 'spirit', 'origin'])

/** Normalize Sanity or demo library documents into a shared shape. */
export const normalizeLibraryItem = (item: Record<string, unknown>): LibraryItem => {
  const rawCategory =
    (item.category as string) ||
    (item.type as string) ||
    ((item.categories as string[] | undefined)?.[0] ?? '')

  const rawKey = String(rawCategory).toLowerCase().replace(/[^a-z]/g, '')
  const isLegacyTag = LEGACY_FORM_TAGS.has(rawKey) || LEGACY_FORM_TAGS.has(String(rawCategory).toLowerCase())
  const category = PRIMARY_TYPES.has(rawKey) ? rawKey : isLegacyTag ? 'forms' : rawKey

  const categories = Array.from(
    new Set(
      [
        category,
        ...((item.categories as string[] | undefined) || []),
      ].filter(Boolean),
    ),
  )

  const tags = Array.from(
    new Set(
      [
        ...((item.tags as string[] | undefined) || []),
        ...(isLegacyTag ? [rawKey === 'liquidmetal' ? 'liquidmetal' : rawKey] : []),
      ].filter(Boolean),
    ),
  )

  const image = item.image as FormalItem['image']
  const linkType = (item.linkType as string) || 'none'
  const series = String((item.series as string) || '').trim()
  const feature = String((item.feature as string) || '').trim()

  return {
    _id: String(item._id || ''),
    title: String(item.title || 'Untitled'),
    slug: asSlug(item.slug as FormalItem['slug']),
    itemType: 'product',
    type: category,
    category,
    categories,
    tags,
    series: series || undefined,
    feature: feature || undefined,
    materials: (item.materials as string[]) || [],
    colours: (item.colours as string[]) || [],
    image: image || { asset: { url: '' } },
    gallery: (item.gallery as LibraryItem['gallery']) || [],
    spiritGallery: (item.spiritGallery as LibraryItem['spiritGallery']) || [],
    linkType,
    externalUrl: item.externalUrl as string | undefined,
  }
}

export const demoLibraryItems = (): LibraryItem[] =>
  DEMO_PRODUCTS.filter((item) => !isPrecraftedItem(item)).map((item) =>
    normalizeLibraryItem({
      ...item,
      category: item.type,
      categories: [item.type],
      tags: item.tags || [],
      linkType: item.itemType === 'product' ? 'product' : 'none',
    }),
  )

/** Discovery canvas item shape (categories drive filters). */
export const toDiscoveryItem = (item: LibraryItem) => ({
  _id: item._id,
  title: item.title,
  slug: item.slug,
  categories: item.categories?.length ? item.categories : item.type ? [item.type] : [],
  category: item.category || item.type,
  tags: item.tags || [],
  image: item.image,
  gallery: item.gallery || [],
  spiritGallery: item.spiritGallery || [],
  linkType: item.linkType || 'none',
  externalUrl: item.externalUrl,
  series: item.series,
  feature: item.feature,
  materials: item.materials,
  colours: item.colours,
})

export const discoveryFilterLabels = [
  'All',
  ...PRODUCT_TYPE_FILTERS.map((filter) => filter.label),
]

export const useLibraryCatalog = async () => {
  const { data, pending, error, refresh } = await useAsyncData('libraryItems', () =>
    $fetch('/api/sanity/query', { method: 'POST', body: { query: LIBRARY_QUERY } })
      .then((r: { result?: unknown }) => r?.result ?? null)
      .catch(() => null),
  )

  const items = computed<LibraryItem[]>(() => {
    if (Array.isArray(data.value) && data.value.length) {
      return (data.value as Record<string, unknown>[])
        .map(normalizeLibraryItem)
        .filter((item) => item._id && !isPrecraftedItem(item))
    }
    return demoLibraryItems()
  })

  const discoveryItems = computed(() => items.value.map(toDiscoveryItem))

  return {
    items,
    discoveryItems,
    pending,
    error,
    refresh,
  }
}
