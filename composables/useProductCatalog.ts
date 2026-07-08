import { DEMO_GRID_ITEMS, DEMO_PRODUCTS, type FormalItem } from './demoData'

export type ProductRecord = {
  _id: string
  title: string
  slug: string
  itemType?: string
  style?: string
  series?: string
  dimensions?: string
  comCol?: string
  finishes?: string[]
  edition?: string
  description?: string
  categories?: string[]
  materials?: string[]
  colours?: string[]
  image?: { asset?: { url?: string } }
  gallery?: { asset?: { url?: string } }[]
  spiritGallery?: { asset?: { url?: string } }[]
}

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const TYPE_LABELS: Record<string, string> = {
  products: 'Forms',
  precrafted: '(Pre)Crafted',
  materials: 'Surfaces',
  forms: 'Spirit',
}

const DIMENSION_POOL = [
  '3200mm W x 1200mm H x 20mm D',
  '2400mm W x 1200mm H x 20mm D',
  '1800mm W x 900mm H x 40mm D',
  '600mm W x 600mm H x 20mm D',
  '2000mm W x 750mm H x 450mm D',
]

const COM_COL_POOL = ['1 panel / 3.84 m²', '1 panel / 2.88 m²', '2 panels / 4.20 m²', '1 unit / 1.35 m²']

const FINISH_LABELS: Record<string, string> = {
  gold: 'Camona Gold',
  bronze: 'Camona Bronze',
  pink: 'Camona Pink Nickel',
  silver: 'Camona Silver',
  charcoal: 'Charcoal Patina',
  ivory: 'Ivory Wash',
}

const hashIndex = (str: string, mod: number) => {
  let h = 0
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h % mod
}

const cap = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

const finishesFrom = (colours: string[] = []) => {
  const mapped = colours.map((c) => FINISH_LABELS[c]).filter(Boolean)
  return mapped.length ? [...new Set(mapped)] : ['Camona Gold', 'Camona Bronze', 'Camona Silver']
}

function normalizeDemoItem(item: FormalItem): ProductRecord {
  const typeLabel = TYPE_LABELS[item.type] || cap(item.type || 'Products')
  const styleCode = `${(item.title[0] || 'S').toUpperCase()}.${String(hashIndex(item._id, 9) + 1).padStart(2, '0')}`

  return {
    _id: item._id,
    title: item.title,
    slug: item.slug?.current || slugify(item.title),
    itemType: item.itemType,
    series: typeLabel,
    style: styleCode,
    dimensions: DIMENSION_POOL[hashIndex(item._id, DIMENSION_POOL.length)],
    comCol: COM_COL_POOL[hashIndex(item._id + 'c', COM_COL_POOL.length)],
    materials: item.materials,
    colours: item.colours,
    categories: item.materials,
    finishes: finishesFrom(item.colours),
    edition: `Unique work. Limited Edition ${100 + hashIndex(item._id, 150)}. Serial Number and Certificate of Authenticity. Year 2026. Hand crafted in London.`,
    image: item.image,
    description: `Part of the ${typeLabel} collection. A Studio Based Upon ${item.itemType} exploring materiality, surface and the shifting dialogue between texture and light.`,
  }
}

function normalizeGridItem(item: (typeof DEMO_GRID_ITEMS)[number]): ProductRecord | null {
  if (item.itemType !== 'product') return null
  const slug = item.slug?.current
  if (!slug) return null

  return {
    _id: item._id,
    title: item.title,
    slug,
    itemType: item.itemType,
    series: '(Pre)Crafted',
    style: `S.${String(hashIndex(item._id, 9) + 1).padStart(2, '0')}`,
    dimensions: DIMENSION_POOL[hashIndex(item._id, DIMENSION_POOL.length)],
    comCol: COM_COL_POOL[hashIndex(item._id + 'c', COM_COL_POOL.length)],
    categories: item.categories,
    finishes: ['Camona Gold', 'Camona Bronze', 'Camona Silver'],
    edition: `Unique work. Limited Edition ${100 + hashIndex(item._id, 150)}. Serial Number and Certificate of Authenticity. Year 2026. Hand crafted in London.`,
    image: item.image,
    description: `A Studio Based Upon surface exploring ${(item.categories || []).join(', ') || 'materiality and craft'}.`,
  }
}

export function getDemoCatalog(): ProductRecord[] {
  const fromProducts = DEMO_PRODUCTS.filter((i) => i.itemType === 'product').map(normalizeDemoItem)
  const fromGrid = DEMO_GRID_ITEMS.map(normalizeGridItem).filter(Boolean) as ProductRecord[]

  const bySlug = new Map<string, ProductRecord>()
  ;[...fromProducts, ...fromGrid].forEach((item) => {
    bySlug.set(item.slug, item)
  })

  return Array.from(bySlug.values())
}

export function findProductBySlug(slug: string): ProductRecord | null {
  return getDemoCatalog().find((p) => p.slug === slug) ?? null
}

export function getNextProduct(slug: string): ProductRecord | null {
  const catalog = getDemoCatalog()
  const index = catalog.findIndex((p) => p.slug === slug)
  if (index === -1 || catalog.length < 2) return null
  return catalog[(index + 1) % catalog.length]
}

export function productPath(item: {
  itemType?: string
  slug?: { current?: string } | string
}) {
  if (item.itemType && item.itemType !== 'product') return null
  const slug = typeof item.slug === 'string' ? item.slug : item.slug?.current
  return slug ? `/products/${slug}` : null
}

export const useProductCatalog = () => {
  const productQuery = `*[_type == "gridItem" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    itemType,
    series,
    style,
    dimensions,
    comCol,
    finishes,
    edition,
    description,
    categories,
    materials,
    image { asset-> { url } },
    gallery[] { asset-> { url } },
    spiritGallery[] { asset-> { url } }
  }`

  const allProductsQuery = `*[_type == "gridItem" && itemType == "product" && defined(slug.current)] | order(orderRank) {
    _id,
    title,
    "slug": slug.current,
    itemType,
    description,
    categories,
    image { asset-> { url } }
  }`

  const fetchProduct = async (slug: string) => {
    try {
      const result = await $fetch('/api/sanity/query', {
        method: 'POST',
        body: { query: productQuery, params: { slug } },
      }) as { result?: ProductRecord | null }

      if (result?.result?.slug) return result.result
    } catch {
      // fall through to demo data
    }

    return findProductBySlug(slug)
  }

  const fetchAllProducts = async () => {
    try {
      const result = await $fetch('/api/sanity/query', {
        method: 'POST',
        body: { query: allProductsQuery },
      }) as { result?: ProductRecord[] }

      if (Array.isArray(result?.result) && result.result.length) {
        return result.result
      }
    } catch {
      // fall through
    }

    return getDemoCatalog()
  }

  return {
    fetchProduct,
    fetchAllProducts,
    findProductBySlug,
    getNextProduct,
    productPath,
    getDemoCatalog,
  }
}
