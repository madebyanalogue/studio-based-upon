export const DEMO_GRID_ITEMS = [
  {
    _id: 'demo-1',
    title: 'Camona Gold Panel',
    slug: { current: 'camona-gold-panel' },
    itemType: 'product',
    categories: ['surfaces', 'finishes'],
    image: { asset: { url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&h=800&fit=crop' } },
    linkType: 'product',
  },
  {
    _id: 'demo-2',
    title: 'Liquid Bronze',
    itemType: 'material',
    categories: ['materials', 'finishes'],
    image: { asset: { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=800&fit=crop' } },
    linkType: 'none',
  },
  {
    _id: 'demo-3',
    title: 'Twist Dining Table',
    slug: { current: 'twist-dining-table' },
    itemType: 'product',
    categories: ['furniture'],
    image: { asset: { url: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&h=800&fit=crop' } },
    linkType: 'project',
    project: { slug: { current: 'twist-dining-table' } },
  },
  {
    _id: 'demo-4',
    title: 'Tramazite',
    itemType: 'material',
    categories: ['materials'],
    image: { asset: { url: 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=800&h=800&fit=crop' } },
    linkType: 'none',
  },
  {
    _id: 'demo-5',
    title: 'Camona Silver',
    itemType: 'finish',
    categories: ['finishes'],
    image: { asset: { url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=800&fit=crop' } },
    linkType: 'none',
  },
  {
    _id: 'demo-6',
    title: 'Organic Curve',
    itemType: 'shape',
    categories: ['shapes'],
    image: { asset: { url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&h=800&fit=crop' } },
    linkType: 'none',
  },
  {
    _id: 'demo-7',
    title: 'Patina Wall',
    slug: { current: 'patina-wall' },
    itemType: 'product',
    categories: ['surfaces'],
    image: { asset: { url: 'https://images.unsplash.com/photo-1615873968403-89e068629265?w=800&h=800&fit=crop' } },
    linkType: 'product',
  },
  {
    _id: 'demo-8',
    title: 'Warm Grey',
    itemType: 'colour',
    categories: ['finishes', 'materials'],
    image: { asset: { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=800&fit=crop' } },
    linkType: 'none',
  },
  {
    _id: 'demo-9',
    title: 'Sculptural Console',
    slug: { current: 'sculptural-console' },
    itemType: 'product',
    categories: ['furniture'],
    image: { asset: { url: 'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=800&h=800&fit=crop' } },
    linkType: 'product',
  },
  {
    _id: 'demo-10',
    title: 'Glass Inlay',
    itemType: 'material',
    categories: ['materials'],
    image: { asset: { url: 'https://images.unsplash.com/photo-1615529328331-f8917597711f?w=800&h=800&fit=crop' } },
    linkType: 'none',
  },
  {
    _id: 'demo-11',
    title: 'Camona Pink Nickel',
    itemType: 'finish',
    categories: ['finishes'],
    image: { asset: { url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&h=800&fit=crop' } },
    linkType: 'none',
  },
  {
    _id: 'demo-12',
    title: 'Linear Relief',
    itemType: 'shape',
    categories: ['shapes', 'surfaces'],
    image: { asset: { url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&h=800&fit=crop' } },
    linkType: 'none',
  },
]

export const DEFAULT_FILTERS = ['All', 'Surfaces', 'Furniture', 'Materials', 'Finishes', 'Shapes']

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

const TYPE_POOL = ['products', 'precrafted'] as const
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

const pickProductType = (index: number) => TYPE_POOL[index % TYPE_POOL.length]

const buildProducts = (): FormalItem[] => {
  const products: FormalItem[] = PRODUCT_NAMES.map((title, i) => ({
    _id: `product-${i + 1}`,
    title,
    slug: { current: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') },
    itemType: 'product',
    type: pickProductType(i),
    materials: pickFrom(MATERIAL_POOL, i),
    colours: pickFrom(COLOUR_POOL, i, 1),
    image: seededImage(`p${i + 1}`),
    linkType: 'product',
  }))

  const textures: FormalItem[] = TEXTURE_NAMES.map((title, i) => ({
    _id: `texture-${i + 1}`,
    title,
    itemType: 'texture',
    type: 'materials',
    materials: pickFrom(MATERIAL_POOL, i + 1),
    colours: pickFrom(COLOUR_POOL, i + 2),
    image: seededImage(`t${i + 1}`),
    linkType: 'none',
  }))

  const shapes: FormalItem[] = SHAPE_NAMES.map((title, i) => ({
    _id: `shape-${i + 1}`,
    title,
    itemType: 'shape',
    type: 'forms',
    materials: pickFrom(MATERIAL_POOL, i + 4),
    colours: pickFrom(COLOUR_POOL, i + 3),
    image: seededImage(`s${i + 1}`),
    linkType: 'none',
  }))

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
  { label: 'Forms', value: 'products' },
  { label: '(Pre)Crafted', value: 'precrafted' },
  { label: 'Surfaces', value: 'materials' },
  { label: 'Spirit', value: 'forms' },
]

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
