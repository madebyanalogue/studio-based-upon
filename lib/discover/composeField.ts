export type PieceKind =
  | 'work'
  | 'material'
  | 'raw-material'
  | 'process'
  | 'evidence'
  | 'origin'
  | 'form'
  | 'detail'

export type DiscoverSource = {
  id: string
  productId: string
  title: string
  slug: string | null
  kind: PieceKind
  url: string
  aspect: number
  imageIndex: number
  series?: string
  materials: string[]
}

export type FieldPiece = DiscoverSource & {
  x: number
  y: number
  w: number
  h: number
  rotate: number
  z: number
}

export type FieldCluster = {
  id: string
  pieces: FieldPiece[]
}

export type FieldStack = {
  id: string
  pieces: FieldPiece[]
  name: string
}

export type FieldFolder = {
  id: string
  pieces: FieldPiece[]
  label: string
  kicker: string
  /** Sleeve bursts open. Orb piles like a stack, then opens into a sphere. Word is a title with a ring of images. */
  mode: 'sleeve' | 'orb' | 'word'
  name: string
}

export type FieldPlacement = {
  id: string
  x: number
  y: number
  delay: number
  splayed?: boolean
}

export type FieldArrangement = {
  id: string
  camera: { x: number; y: number }
  nodes: FieldPlacement[]
}

export type FieldMark = {
  x: number
  y: number
  text?: string
  cross?: boolean
}

export type DiscoverFieldModel = {
  world: { w: number; h: number }
  clusters: FieldCluster[]
  stacks: FieldStack[]
  folders: FieldFolder[]
  loose: FieldPiece[]
  arrangements: FieldArrangement[]
  marks: FieldMark[]
}

type Slot = {
  kind: PieceKind
  x: number
  y: number
  rotate: number
  z: number
  scale?: number
}

/** Crop every Discover image to a square. Set false to restore each source aspect. */
export const SQUARE_PIECES = true

/** Loose pieces on the field. Set true to place clusters again. */
export const LOOSE_ITEMS = false

const BASE_WIDTH: Record<PieceKind, number> = {
  work: 328,
  material: 214,
  'raw-material': 146,
  process: 198,
  evidence: 138,
  origin: 190,
  form: 172,
  detail: 126,
}

const FALLBACK: Record<PieceKind, PieceKind[]> = {
  work: ['work', 'material', 'origin', 'detail'],
  material: ['material', 'raw-material', 'detail', 'work'],
  'raw-material': ['raw-material', 'material', 'evidence'],
  process: ['process', 'evidence', 'detail', 'material'],
  evidence: ['evidence', 'process', 'detail', 'form'],
  origin: ['origin', 'form', 'detail', 'work'],
  form: ['form', 'detail', 'work', 'evidence'],
  detail: ['detail', 'evidence', 'process', 'material'],
}

const MATERIAL_STUDY: Slot[] = [
  { kind: 'detail', x: 248, y: 0, rotate: -1.1, z: 3, scale: 1.05 },
  { kind: 'raw-material', x: 0, y: 138, rotate: 1.3, z: 4, scale: 0.92 },
  { kind: 'material', x: 196, y: 208, rotate: -0.4, z: 2, scale: 1.08 },
  { kind: 'process', x: 430, y: 168, rotate: 0.7, z: 2, scale: 0.96 },
  { kind: 'work', x: 64, y: 448, rotate: -0.25, z: 5, scale: 1.08 },
]

const PROJECT_EVIDENCE: Slot[] = [
  { kind: 'origin', x: 0, y: 8, rotate: 0.5, z: 2, scale: 1 },
  { kind: 'form', x: 262, y: 64, rotate: -1.4, z: 3, scale: 0.94 },
  { kind: 'evidence', x: 28, y: 268, rotate: 1, z: 2, scale: 1.04 },
  { kind: 'detail', x: 312, y: 312, rotate: -0.7, z: 4, scale: 1.1 },
  { kind: 'work', x: 96, y: 492, rotate: 0.2, z: 5, scale: 1.12 },
]

const FORM_STUDY: Slot[] = [
  { kind: 'form', x: 156, y: 0, rotate: -0.9, z: 3, scale: 1.06 },
  { kind: 'detail', x: 0, y: 196, rotate: 0.8, z: 2, scale: 0.95 },
  { kind: 'evidence', x: 268, y: 176, rotate: -0.4, z: 2, scale: 1.08 },
  { kind: 'work', x: 72, y: 412, rotate: 0.35, z: 5, scale: 1.05 },
]

const PROCESS_STUDY: Slot[] = [
  { kind: 'process', x: 16, y: 12, rotate: -0.5, z: 3, scale: 1.16 },
  { kind: 'evidence', x: 292, y: 0, rotate: 1.2, z: 2, scale: 0.9 },
  { kind: 'detail', x: 308, y: 208, rotate: -0.8, z: 3, scale: 1.05 },
  { kind: 'material', x: 0, y: 292, rotate: 0.45, z: 4, scale: 1.02 },
]

const TEMPLATES = [
  MATERIAL_STUDY,
  PROJECT_EVIDENCE,
  FORM_STUDY,
  PROCESS_STUDY,
  MATERIAL_STUDY,
  PROJECT_EVIDENCE,
]

const SPLAY = [
  { x: -168, y: -36, r: -1.5 },
  { x: 28, y: -124, r: 0.7 },
  { x: 186, y: 8, r: -0.35 },
  { x: -24, y: 142, r: 1.3 },
  { x: 142, y: 164, r: -1.1 },
]

const FOLDER_SPLAY = [
  { x: -214, y: -16, r: -0.9 },
  { x: 210, y: -28, r: 0.6 },
  { x: 36, y: -186, r: -0.4 },
  { x: -168, y: 158, r: 1 },
  { x: 188, y: 168, r: -0.7 },
  { x: 12, y: 204, r: 0.35 },
]

const COLOUR_SPLAY = [
  { x: -230, y: -8, r: -0.8 },
  { x: 210, y: -24, r: 0.5 },
  { x: 28, y: -210, r: -0.3 },
  { x: -190, y: 170, r: 0.9 },
  { x: 220, y: 156, r: -0.6 },
  { x: 8, y: 220, r: 0.3 },
  { x: -340, y: 70, r: -0.4 },
  { x: 360, y: 36, r: 0.7 },
  { x: -70, y: -320, r: -0.2 },
  { x: 150, y: -300, r: 0.4 },
  { x: -260, y: 310, r: 0.8 },
  { x: 290, y: 286, r: -0.5 },
]

const WORD_THUMB = 1.4

const wordStack = (id: string, name: string, pieces: DiscoverSource[]): FieldFolder => ({
  id,
  mode: 'word',
  name,
  kicker: '',
  label: '',
  pieces: layoutContainer(pieces, COLOUR_SPLAY, id, WORD_THUMB, BASE_WIDTH.detail).map((piece) => ({
    ...piece,
    x: piece.x + DISCOVER_GRID,
    y: piece.y + DISCOVER_GRID / 2,
  })),
})

const hashString = (value: string) => {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const clip = (value: string, max: number) => {
  const text = value.trim()
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const space = cut.lastIndexOf(' ')
  return `${(space > 8 ? cut.slice(0, space) : cut).trim()}…`
}

const sizeFor = (source: DiscoverSource, scale = 1, base = BASE_WIDTH[source.kind]) => {
  const jitter = (hashString(source.id) % 5) * 6 - 12
  const w = Math.round((base + jitter) * scale)
  const aspect = SQUARE_PIECES || !(source.aspect > 0.4 && source.aspect < 2.8) ? 1 : source.aspect
  return { w, h: Math.round(w / aspect) }
}

const take = (pool: DiscoverSource[], kinds: PieceKind[]) => {
  for (const kind of kinds) {
    const index = pool.findIndex((piece) => piece.kind === kind)
    if (index >= 0) return pool.splice(index, 1)[0]!
  }
  return pool.shift()
}

const placePiece = (
  source: DiscoverSource,
  slot: { x: number; y: number; rotate: number; z: number; scale?: number; base?: number },
): FieldPiece => {
  const { w, h } = sizeFor(source, slot.scale ?? 1, slot.base)
  return { ...source, x: slot.x, y: slot.y, w, h, rotate: 0, z: slot.z }
}

const fillTemplate = (pool: DiscoverSource[], slots: Slot[]): FieldPiece[] => {
  const placed: FieldPiece[] = []
  for (const slot of slots) {
    if (pool.length < 2 && placed.length >= 3) break
    const source = take(pool, FALLBACK[slot.kind])
    if (!source) break
    placed.push(placePiece(source, slot))
  }
  return placed
}

const stackName = (pieces: FieldPiece[]) => {
  const counts = new Map<PieceKind, number>()
  for (const piece of pieces) counts.set(piece.kind, (counts.get(piece.kind) || 0) + 1)
  let kind: PieceKind = pieces[0]?.kind || 'detail'
  let best = 0
  for (const [key, count] of counts) {
    if (count > best) {
      best = count
      kind = key
    }
  }
  if (kind === 'raw-material' || kind === 'material') return 'material studies'
  if (kind === 'process') return 'process studies'
  if (kind === 'form') return 'form studies'
  if (kind === 'origin') return 'origin studies'
  if (kind === 'work') return 'works'
  if (kind === 'evidence') return 'evidence'
  return 'studies'
}

const folderCopy = (pieces: FieldPiece[]) => {
  const series = pieces.map((piece) => piece.series).filter(Boolean) as string[]
  const shared = series.length > 0 && series.every((name) => name === series[0])
  const kicker = shared ? series[0]! : pieces[0]?.title || 'Archive'
  const kinds = new Set(pieces.map((piece) => piece.kind))
  const label = kinds.has('origin')
    ? 'Origin'
    : kinds.has('process')
      ? 'Process'
      : kinds.has('material') || kinds.has('raw-material')
        ? 'Studies'
        : kinds.has('form')
          ? 'Form'
          : 'Development'
  return { kicker: clip(kicker, 22), label }
}

const layoutContainer = (
  sources: DiscoverSource[],
  offsets: { x: number; y: number; r: number }[],
  salt: string,
  scale = 1,
  base?: number,
): FieldPiece[] =>
  sources.map((source, index) => {
    const offset = offsets[index % offsets.length]!
    const nudge = (hashString(`${salt}-${source.id}`) % 11) - 5
    return placePiece(source, {
      x: offset.x * scale + nudge,
      y: offset.y * scale + nudge,
      rotate: offset.r,
      z: index + 1,
      scale: (index === 0 ? 1 : 0.92) * scale,
      base,
    })
  })

const nodeOrder = (clusters: number, stacks: number, folders: number) => {
  const ids: string[] = []
  for (let i = 0; i < clusters; i += 1) ids.push(`cluster-${i}`)
  for (let i = 0; i < stacks; i += 1) ids.push(`stack-${i}`)
  for (let i = 0; i < folders; i += 1) ids.push(`folder-${i}`)
  return ids
}

/** Closed stack plate width. Grid cells match it, so a stack fills one square. */
export const DISCOVER_GRID = 220
const STACK_PLATE_H = 256
const KEEP_W = DISCOVER_GRID * 6
const KEEP_H = DISCOVER_GRID * 3

/**
 * 12×7 cells. Stacks sit on D1, E1, B4 and C4. Colour spans D7–E7 and
 * Material spans G7–H7. Sleeve folders stay on B2 and B3; the orb sits on B6
 * so the B4 stack plate can hang into the cell below.
 */
const layoutWorld = (
  ids: string[],
  kinds: { stacks: string[]; sleeves: string[]; orbs: string[]; words: string[] },
) => {
  const cell = DISCOVER_GRID
  const cols = 12
  const rows = 7
  const w = cols * cell
  const h = rows * cell

  const slotsFor = (flip: boolean) => {
    const at = new Map<string, { x: number; y: number; delay: number }>()
    const sleeves = flip ? [...kinds.sleeves].reverse() : kinds.sleeves
    sleeves.forEach((id, index) => {
      at.set(id, { x: cell, y: (1 + index) * cell, delay: index * 0.05 })
    })
    kinds.orbs.forEach((id, index) => {
      at.set(id, { x: cell, y: (5 + index) * cell, delay: 0.1 })
    })
    const wordSpots = [
      { x: 3 * cell, y: 6 * cell },
      { x: 6 * cell, y: 6 * cell },
    ]
    const wordOrder = flip ? [...wordSpots].reverse() : wordSpots
    kinds.words.forEach((id, index) => {
      const spot = wordOrder[index] || wordSpots[0]!
      at.set(id, { x: spot.x, y: spot.y, delay: index * 0.05 })
    })

    const stackSpots = [
      { x: 3 * cell, y: 0 },
      { x: 4 * cell, y: 0 },
      { x: cell, y: 3 * cell },
      { x: 2 * cell, y: 3 * cell },
    ]
    const stackOrder = flip ? [...stackSpots].reverse() : stackSpots
    kinds.stacks.forEach((id, index) => {
      const spot = stackOrder[index] || stackSpots[0]!
      at.set(id, { x: spot.x, y: spot.y, delay: (index % 4) * 0.05 })
    })
    ids
      .filter((id) => id.startsWith('cluster-'))
      .forEach((id, index) => {
        at.set(id, { x: 0, y: index * 2 * cell, delay: 0 })
      })

    const slots = ids.map((id, index) => at.get(id) || { x: (index % cols) * cell, y: 0, delay: 0 })
    for (const id of kinds.words) {
      slots.push(at.get(id) || { x: 2 * cell, y: 5 * cell, delay: 0 })
    }
    return slots
  }

  return { w, h, cols, rows, slotsA: slotsFor(false), slotsB: slotsFor(true) }
}

const arrange = (
  id: string,
  camera: { x: number; y: number },
  slots: Omit<FieldPlacement, 'id'>[],
  ids: string[],
): FieldArrangement => ({
  id,
  camera,
  nodes: ids.map((nodeId, index) => ({
    id: nodeId,
    ...(slots[index] || { x: 400 + index * 80, y: 400, delay: 0 }),
  })),
})

export const primaryKindFor = (item: {
  itemType?: string
  category?: string
  type?: string
}): PieceKind | null => {
  const category = String(item.category || item.type || '').toLowerCase()
  if (category === 'spirit') return null
  if (item.itemType === 'texture') return 'raw-material'
  if (item.itemType === 'shape') return 'form'
  if (category === 'forms') return 'work'
  if (category === 'surface') return 'material'
  if (category === 'origin') return 'origin'
  if (category === 'decorative') return 'detail'
  return 'work'
}

const EMPTY: DiscoverFieldModel = {
  world: { w: 2400, h: 1600 },
  clusters: [],
  stacks: [],
  folders: [],
  loose: [],
  arrangements: [
    {
      id: 'a',
      camera: { x: 0, y: 0 },
      nodes: [],
    },
  ],
  marks: [],
}

const scatterLoose = (
  world: { w: number; h: number },
  nodes: { id: string; x: number; y: number }[],
  sources: DiscoverSource[],
) => {
  const cell = DISCOVER_GRID
  const blocks: { x: number; y: number; w: number; h: number }[] = [
    { x: (world.w - KEEP_W) / 2, y: (world.h - KEEP_H) / 2, w: KEEP_W, h: KEEP_H },
  ]
  for (const node of nodes) {
    blocks.push({
      x: node.x,
      y: node.y,
      w: node.id === 'colour' || node.id === 'material' ? cell * 2 : cell,
      h: node.id === 'colour' || node.id === 'material' ? cell : STACK_PLATE_H,
    })
  }
  const hits = (x: number, y: number) =>
    blocks.some((block) => x < block.x + block.w && x + cell > block.x && y < block.y + block.h && y + cell > block.y)
  // Columns J and K, staggered so the two columns use different rows.
  const spots = [
    { x: 9 * cell, y: 0 },
    { x: 10 * cell, y: 2 * cell },
    { x: 9 * cell, y: 3 * cell },
    { x: 10 * cell, y: 5 * cell },
    { x: 9 * cell, y: 6 * cell },
    { x: 10 * cell, y: 4 * cell },
  ].filter((spot) => spot.x >= 0 && spot.y >= 0 && spot.x + cell <= world.w && spot.y + cell <= world.h && !hits(spot.x, spot.y))

  return sources.map((source, index) => {
    const spot = spots[index] || { x: 9 * cell, y: index * cell }
    return { ...placePiece(source, { x: spot.x, y: spot.y, rotate: 0, z: 6 }), w: cell, h: cell }
  })
}

export const composeDiscoverField = (sources: DiscoverSource[]): DiscoverFieldModel => {
  const pool = sources.filter((source) => source.url).slice(0, 96)
  if (pool.length < 4) return EMPTY

  const clusters: FieldCluster[] = []
  if (LOOSE_ITEMS) {
    for (let i = 0; i < TEMPLATES.length; i += 1) {
      if (pool.length < 10 && clusters.length >= 3) break
      const pieces = fillTemplate(pool, TEMPLATES[i]!)
      if (pieces.length < 3) {
        pool.push(...pieces)
        break
      }
      clusters.push({ id: `cluster-${clusters.length}`, pieces })
    }
  }

  const byKind = new Map<PieceKind, DiscoverSource[]>()
  for (const source of pool) {
    const list = byKind.get(source.kind) || []
    list.push(source)
    byKind.set(source.kind, list)
  }

  const stacks: FieldStack[] = []
  const stackKinds: PieceKind[] = ['process', 'material', 'evidence', 'detail', 'form', 'raw-material']
  for (const kind of stackKinds) {
    if (stacks.length >= 4) break
    const list = byKind.get(kind) || []
    if (list.length < 3) continue
    const cap = stacks.length < 2 ? 8 : 5
    const taken = list.splice(0, Math.min(cap, list.length))
    stacks.push({
      id: `stack-${stacks.length}`,
      name: stackName(taken as FieldPiece[]),
      pieces: layoutContainer(taken, SPLAY, `stack-${stacks.length}`),
    })
  }

  const rest: DiscoverSource[] = []
  for (const list of byKind.values()) rest.push(...list)

  for (const stack of stacks.slice(0, 2)) {
    while (stack.pieces.length < 8 && rest.length) {
      const source = rest.shift()!
      stack.pieces.push(
        placePiece(source, { x: 0, y: 0, rotate: 0, z: stack.pieces.length + 1 }),
      )
    }
  }

  while (stacks.length < 3 && rest.length >= 3) {
    const taken = rest.splice(0, Math.min(4, rest.length))
    stacks.push({
      id: `stack-${stacks.length}`,
      name: stackName(taken as FieldPiece[]),
      pieces: layoutContainer(taken, SPLAY, `stack-${stacks.length}`),
    })
  }

  const folders: FieldFolder[] = []
  const looseSources: DiscoverSource[] = []
  for (const source of rest) {
    if (looseSources.length >= 6) break
    if (source.imageIndex !== 0) continue
    if (looseSources.some((entry) => entry.productId === source.productId)) continue
    looseSources.push(source)
  }
  for (const source of [...looseSources]) {
    const index = rest.indexOf(source)
    if (index >= 0) rest.splice(index, 1)
  }
  const colourPieces = rest.length >= 12 ? rest.splice(0, 12) : []
  const materialPieces = rest.length >= 12 ? rest.splice(0, 12) : []
  const orbBudget = rest.length - 6
  if (orbBudget >= 5) {
    const taken = rest.splice(0, Math.min(11, orbBudget))
    const pieces = taken.map((source, index) =>
      placePiece(source, { x: 0, y: 0, rotate: 0, z: index + 1 }),
    )
    folders.push({
      id: `folder-${folders.length}`,
      mode: 'orb',
      name: stackName(pieces),
      kicker: '',
      label: '',
      pieces,
    })
  }
  while (folders.length < 3 && rest.length >= 3) {
    const taken = rest.splice(0, Math.min(5, rest.length))
    const copy = folderCopy(taken as FieldPiece[])
    folders.push({
      id: `folder-${folders.length}`,
      mode: 'sleeve',
      name: '',
      kicker: copy.kicker,
      label: copy.label,
      pieces: layoutContainer(taken, FOLDER_SPLAY, `folder-${folders.length}`),
    })
  }

  const ids = nodeOrder(clusters.length, stacks.length, folders.length)
  const wordIds = [
    ...(colourPieces.length === 12 ? ['colour'] : []),
    ...(materialPieces.length === 12 ? ['material'] : []),
  ]
  if (colourPieces.length === 12) folders.push(wordStack('colour', 'Colour', colourPieces))
  if (materialPieces.length === 12) folders.push(wordStack('material', 'Material', materialPieces))
  const world = layoutWorld(ids, {
    stacks: stacks.map((stack) => stack.id),
    sleeves: folders.filter((folder) => folder.mode === 'sleeve').map((folder) => folder.id),
    orbs: folders.filter((folder) => folder.mode === 'orb').map((folder) => folder.id),
    words: wordIds,
  })
  const arrangements = [
    arrange('table', { x: 0, y: 0 }, world.slotsA, ids),
    arrange('reading', { x: 0, y: 0 }, world.slotsB, ids),
  ]

  wordIds.forEach((id, index) => {
    const spotA = world.slotsA[ids.length + index] || { x: 0, y: 0, delay: 0 }
    const spotB = world.slotsB[ids.length + index] || spotA
    arrangements[0]?.nodes.push({ id, x: spotA.x, y: spotA.y, delay: spotA.delay })
    arrangements[1]?.nodes.push({ id, x: spotB.x, y: spotB.y, delay: spotB.delay })
  })
  const loose = scatterLoose(world, arrangements[0]?.nodes || [], looseSources)
  const cell = DISCOVER_GRID
  const marks: FieldMark[] = [
    { x: cell, y: cell, cross: true, text: 'A03' },
    { x: world.w - cell * 2, y: cell, cross: true, text: 'B07' },
    { x: 8 * cell, y: world.h - cell, cross: true },
    { x: cell, y: world.h - cell, text: 'Surface / 04' },
    { x: world.w - cell * 3, y: 4 * cell, text: 'Form / 02' },
  ]

  return {
    world: { w: world.w, h: world.h },
    clusters,
    stacks,
    folders,
    loose,
    arrangements,
    marks,
  }
}
