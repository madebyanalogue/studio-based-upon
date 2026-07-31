export const DEFAULT_FILTERS = ['All', 'Forms', 'Surface', 'Spirit', 'Origin']

export const filterKey = (label: string) => label.toLowerCase().replace(/[^a-z]/g, '')

// ---------------------------------------------------------------------------
// Formal products grid demo data (40 items: mostly products, plus textures & shapes)
// ---------------------------------------------------------------------------

export type FormalItem = {
  _id: string
  title: string
  slug?: { current?: string }
  itemType: 'product' | 'texture' | 'shape'
  type: string
  categories?: string[]
  tags?: string[]
  materials: string[]
  colours: string[]
  image: { asset: { url: string } }
  linkType?: string
}

const PRODUCT_NAMES = [
  'Camona Gold Panel', 'Twist Dining Table', 'Patina Wall', 'Sculptural Console',
  'Ripple Screen', 'Ingot Bench', 'Fold Coffee Table', 'Monolith Plinth',
  'Cascade Panel', 'Ember Sideboard', 'Strata Shelf', 'Halo Mirror',
  'Drift Wall Panel', 'Anvil Stool', 'Vein Tabletop', 'Lumen Panel',
  'Corten Divider', 'Basin Vessel', 'Seam Panel', 'Relief Facade',
  'Quench Table', 'Forge Console', 'Tide Panel', 'Cast Bench',
  'Weald Screen', 'Molten Panel', 'Crag Plinth', 'Fathom Wall',
]

const TEXTURE_NAMES = [
  'Liquid Bronze', 'Tramazite', 'Glass Inlay', 'Hammered Steel',
  'Oxide Copper', 'Brushed Nickel', 'Raw Concrete', 'Verdigris',
]

const SHAPE_NAMES = ['Organic Curve', 'Linear Relief', 'Fractured Plane', 'Undulating Form']

const TYPE_POOL = ['forms', 'surface', 'spirit', 'origin'] as const
const FORM_TAG_POOL = ['furniture', 'interior', 'tramazite', 'liquidmetal', 'landscapes'] as const
const MATERIAL_POOL = ['gold', 'bronze', 'silver', 'steel', 'glass', 'stone']
const COLOUR_POOL = ['gold', 'bronze', 'silver', 'pink', 'charcoal', 'ivory']

const seededImage = (seed: string) => ({
  asset: { url: `https://picsum.photos/seed/sba-${seed}/900/900` },
})

const pickFrom = (pool: string[], index: number, offset = 0) => {
  const a = pool[(index + offset) % pool.length]
  const b = pool[(index + offset + 2) % pool.length]
  return index % 3 === 0 ? [a] : [a, b]
}

const pickType = (index: number) => TYPE_POOL[index % TYPE_POOL.length]

const pickFormTags = (index: number, type: string) => {
  if (type !== 'forms') return []
  const primary = FORM_TAG_POOL[index % FORM_TAG_POOL.length]
  const secondary = FORM_TAG_POOL[(index + 2) % FORM_TAG_POOL.length]
  return index % 2 === 0 ? [primary] : [primary, secondary]
}

const buildProducts = (): FormalItem[] => {
  const products: FormalItem[] = PRODUCT_NAMES.map((title, i) => {
    const type = pickType(i)
    return {
      _id: `product-${i + 1}`,
      title,
      slug: { current: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') },
      itemType: 'product',
      type,
      tags: pickFormTags(i, type),
      materials: pickFrom(MATERIAL_POOL, i),
      colours: pickFrom(COLOUR_POOL, i, 1),
      image: seededImage(`p${i + 1}`),
      linkType: 'product',
    }
  })

  const textures: FormalItem[] = TEXTURE_NAMES.map((title, i) => {
    const type = pickType(i + 2)
    return {
      _id: `texture-${i + 1}`,
      title,
      itemType: 'texture',
      type,
      tags: pickFormTags(i + 2, type),
      materials: pickFrom(MATERIAL_POOL, i + 1),
      colours: pickFrom(COLOUR_POOL, i + 2),
      image: seededImage(`t${i + 1}`),
      linkType: 'none',
    }
  })

  const shapes: FormalItem[] = SHAPE_NAMES.map((title, i) => {
    const type = pickType(i + 1)
    return {
      _id: `shape-${i + 1}`,
      title,
      itemType: 'shape',
      type,
      tags: pickFormTags(i + 1, type),
      materials: pickFrom(MATERIAL_POOL, i + 4),
      colours: pickFrom(COLOUR_POOL, i + 3),
      image: seededImage(`s${i + 1}`),
      linkType: 'none',
    }
  })

  // Interleave so textures/shapes are mixed into the product-heavy bucket
  const mixed: FormalItem[] = []
  const extras = [...textures, ...shapes]
  let extraIndex = 0
  products.forEach((product, i) => {
    mixed.push(product)
    if ((i + 1) % 3 === 0 && extraIndex < extras.length) {
      mixed.push(extras[extraIndex])
      extraIndex += 1
    }
  })
  while (extraIndex < extras.length) {
    mixed.push(extras[extraIndex])
    extraIndex += 1
  }

  return mixed.slice(0, 40)
}

export const DEMO_PRODUCTS: FormalItem[] = buildProducts()

export const PRODUCT_TYPE_FILTERS = [
  { label: 'Forms', value: 'forms' },
  { label: 'Surface', value: 'surface' },
  { label: 'Spirit', value: 'spirit' },
  { label: 'Origin', value: 'origin' },
]

export const PRODUCT_FORM_TAG_FILTERS = [
  { label: 'Furniture', value: 'furniture' },
  { label: 'Interior', value: 'interior' },
  { label: 'Tramazite', value: 'tramazite' },
  { label: 'Liquid Metal', value: 'liquidmetal' },
  { label: 'Landscapes', value: 'landscapes' },
]

/** Default Materials & Forms chip row (mix of tags + types, no Forms). */
export const DEFAULT_LIBRARY_PAGE_FILTERS = [
  { kind: 'tag' as const, value: 'furniture', label: 'Furniture' },
  { kind: 'tag' as const, value: 'tramazite', label: 'Tramazite' },
  { kind: 'tag' as const, value: 'interior', label: 'Interior' },
  { kind: 'type' as const, value: 'origin', label: 'Origin' },
  { kind: 'tag' as const, value: 'liquidmetal', label: 'Liquid Metal' },
  { kind: 'type' as const, value: 'spirit', label: 'Spirit' },
]

export type LibraryPageFilter = {
  kind: 'type' | 'tag'
  value: string
  label: string
}

export const parseLibraryFilterKey = (key: string): { kind: 'type' | 'tag'; value: string } | null => {
  const [kind, value] = String(key || '').split(':')
  if ((kind !== 'type' && kind !== 'tag') || !value) return null
  return { kind, value }
}

export const libraryFilterKey = (filter: Pick<LibraryPageFilter, 'kind' | 'value'>) =>
  `${filter.kind}:${filter.value}`

export const resolveLibraryPageFilters = (
  entries?: { filter?: string; label?: string }[] | null,
): LibraryPageFilter[] => {
  if (!Array.isArray(entries) || !entries.length) return DEFAULT_LIBRARY_PAGE_FILTERS

  const resolved = entries
    .map((entry) => {
      const parsed = parseLibraryFilterKey(entry.filter || '')
      if (!parsed) return null
      const defaults = [
        ...PRODUCT_TYPE_FILTERS.map((f) => ({ ...f, kind: 'type' as const })),
        ...PRODUCT_FORM_TAG_FILTERS.map((f) => ({ ...f, kind: 'tag' as const })),
      ]
      const match = defaults.find((f) => f.kind === parsed.kind && f.value === parsed.value)
      return {
        kind: parsed.kind,
        value: parsed.value,
        label: entry.label?.trim() || match?.label || parsed.value,
      }
    })
    .filter(Boolean) as LibraryPageFilter[]

  return resolved.length ? resolved : DEFAULT_LIBRARY_PAGE_FILTERS
}

export const isPrecraftedItem = (item: {
  type?: string
  series?: string
  categories?: string[]
}) => {
  if (item.type === 'precrafted') return true
  if (item.series === '(Pre)Crafted' || item.series === 'precrafted') return true
  return (item.categories || []).some((c) => {
    const key = c.toLowerCase().replace(/[^a-z]/g, '')
    return key === 'precrafted'
  })
}

export const PRODUCT_MATERIAL_FILTERS = [
  { label: 'Gold', value: 'gold' },
  { label: 'Bronze', value: 'bronze' },
  { label: 'Silver', value: 'silver' },
  { label: 'Steel', value: 'steel' },
  { label: 'Glass', value: 'glass' },
  { label: 'Stone', value: 'stone' },
]

export const PRODUCT_COLOUR_FILTERS = [
  { label: 'Gold', value: 'gold' },
  { label: 'Bronze', value: 'bronze' },
  { label: 'Silver', value: 'silver' },
  { label: 'Pink', value: 'pink' },
  { label: 'Charcoal', value: 'charcoal' },
  { label: 'Ivory', value: 'ivory' },
]
