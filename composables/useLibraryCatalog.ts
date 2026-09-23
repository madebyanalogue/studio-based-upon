import {
  DEMO_PRODUCTS,
  PRODUCT_TYPE_FILTERS,
  isPrecraftedItem,
  normalizeFormTag,
  type FormalItem,
} from './demoData'
import { productCoverFrame, productGalleryFrames } from './productImages'

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
  image { asset-> { _id, url, metadata { dimensions { width, height } } } },
  gallery[] { asset-> { _id, url, metadata { dimensions { width, height } } } },
  gridRatio,
  gridSize,
  spiritGallery[] {
    _type,
    _key,
    asset->{ _id, url, metadata { dimensions { width, height } } },
    file { asset->{ _id, url, mimeType, originalFilename } },
    poster { asset->{ _id, url, metadata { dimensions { width, height } } } }
  },
  linkType,
  externalUrl
}`

export type LibraryImageAsset = {
  url?: string
  _id?: string
  metadata?: { dimensions?: { width?: number; height?: number } }
}

export type LibrarySpiritMedia =
  | { _type?: 'image'; asset?: LibraryImageAsset }
  | {
      _type: 'spiritVideo'
      file?: { asset?: { _id?: string; url?: string; mimeType?: string } }
      poster?: { asset?: LibraryImageAsset }
    }

export type LibraryItem = FormalItem & {
  category?: string
  tags?: string[]
  externalUrl?: string
  /** width / height of the primary thumbnail image */
  aspectRatio: number
  gallery: { asset?: LibraryImageAsset }[]
  spiritGallery?: LibrarySpiritMedia[]
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
  'liquid-metal',
])

const PRIMARY_TYPES = new Set(['forms', 'surface', 'decorative', 'spirit', 'origin'])

const GRID_RATIO_PRESETS = [
  { key: 'portrait' as const, ar: 3 / 4 },
  { key: 'square' as const, ar: 1 },
  { key: 'landscape' as const, ar: 4 / 3 },
]

/** Closest of portrait (3:4), square (1:1), landscape (4:3). */
export const closestGridRatio = (
  aspectRatio: number,
): NonNullable<FormalItem['gridRatio']> => {
  const ar = Number(aspectRatio)
  if (!Number.isFinite(ar) || ar <= 0) return 'square'
  let best: (typeof GRID_RATIO_PRESETS)[number] = GRID_RATIO_PRESETS[1]!
  let bestDist = Infinity
  for (const preset of GRID_RATIO_PRESETS) {
    const dist = Math.abs(ar - preset.ar)
    if (dist < bestDist) {
      bestDist = dist
      best = preset
    }
  }
  return best.key
}

export const GRID_RATIO_AR: Record<
  NonNullable<FormalItem['gridRatio']>,
  number
> = {
  portrait: 3 / 4,
  square: 1,
  landscape: 4 / 3,
}

const assetAspect = (asset?: LibraryImageAsset | null) => {
  const w = asset?.metadata?.dimensions?.width
  const h = asset?.metadata?.dimensions?.height
  if (w && h && w > 0 && h > 0) return w / h
  return null
}

/** Stable fallback ratios for demo / missing metadata — keeps the grid varied. */
const fallbackAspect = (id: string) => {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  const pool = [0.68, 0.8, 0.92, 1, 1.15, 1.35, 1.6, 1.85]
  return pool[hash % pool.length]!
}

/** Normalize Sanity or demo library documents into a shared shape. */
export const normalizeLibraryItem = (item: Record<string, unknown>): LibraryItem => {
  const rawCategory =
    (item.category as string) ||
    (item.type as string) ||
    ((item.categories as string[] | undefined)?.[0] ?? '')

  const rawKey = String(rawCategory).toLowerCase().replace(/[^a-z]/g, '')
  const rawLower = String(rawCategory).toLowerCase()
  const isLegacyTag =
    LEGACY_FORM_TAGS.has(rawKey) ||
    LEGACY_FORM_TAGS.has(rawLower) ||
    LEGACY_FORM_TAGS.has(normalizeFormTag(rawCategory))
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
        ...((item.tags as string[] | undefined) || []).map(normalizeFormTag),
        ...(isLegacyTag ? [normalizeFormTag(rawCategory) || normalizeFormTag(rawKey)] : []),
      ].filter(Boolean),
    ),
  )

  const gallery = productGalleryFrames({
    gallery: item.gallery as LibraryItem['gallery'],
    image: item.image as { asset?: LibraryImageAsset } | undefined,
  })
  const cover = productCoverFrame({ gallery }) || gallery[0]
  const linkType = (item.linkType as string) || 'none'
  const series = String((item.series as string) || '').trim()
  const feature = String((item.feature as string) || '').trim()
  const id = String(item._id || '')

  const aspectRatio = assetAspect(cover?.asset) ?? fallbackAspect(id || 'item')
  const rawRatio = String(item.gridRatio || '').toLowerCase()
  const gridRatio =
    rawRatio === 'portrait' || rawRatio === 'square' || rawRatio === 'landscape'
      ? (rawRatio as FormalItem['gridRatio'])
      : closestGridRatio(aspectRatio)
  const rawSize = String(item.gridSize || '').toLowerCase()
  const gridSize =
    rawSize === 'small' ||
    rawSize === 'medium' ||
    rawSize === 'large' ||
    rawSize === 'full'
      ? (rawSize as FormalItem['gridSize'])
      : undefined

  return {
    _id: id,
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
    gallery: gallery.length ? gallery : [{ asset: { url: '' } }],
    gridRatio,
    gridSize,
    aspectRatio,
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
  const { data, pending, error, refresh } = await useAsyncData('libraryItems-v4', () =>
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
