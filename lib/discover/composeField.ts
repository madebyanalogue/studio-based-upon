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
  /** Sleeve bursts open. Orb piles like a stack, then opens into a sphere. */
  mode: 'sleeve' | 'orb' | 'colour'
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

const sizeFor = (source: DiscoverSource, scale = 1) => {
  const jitter = (hashString(source.id) % 5) * 6 - 12
  const w = Math.round((BASE_WIDTH[source.kind] + jitter) * scale)
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
  slot: { x: number; y: number; rotate: number; z: number; scale?: number },
): FieldPiece => {
  const { w, h } = sizeFor(source, slot.scale ?? 1)
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
): FieldPiece[] =>
  sources.map((source, index) => {
    const offset = offsets[index % offsets.length]!
    const nudge = (hashString(`${salt}-${source.id}`) % 11) - 5
    return placePiece(source, {
      x: offset.x + nudge,
      y: offset.y + nudge,
      rotate: offset.r,
      z: index + 1,
      scale: index === 0 ? 1 : 0.92,
    })
  })

const nodeOrder = (clusters: number, stacks: number, folders: number) => {
  const ids: string[] = []
  for (let i = 0; i < clusters; i += 1) ids.push(`cluster-${i}`)
  for (let i = 0; i < stacks; i += 1) ids.push(`stack-${i}`)
  for (let i = 0; i < folders; i += 1) ids.push(`folder-${i}`)
  return ids
}

const KEEP_W = 96 * 18
const KEEP_H = 96 * 11

/** Closed stack plate width. Grid cells match it, so a stack fills one square. */
export const DISCOVER_GRID = 220
const STACK_PLATE_H = 256

const unit = (seed: number) => {
  let hash = 2166136261 ^ seed
  hash = Math.imul(hash, 16777619)
  return (hash >>> 0) / 4294967296
}

/**
 * 20×11 cells: two extra columns on each side, one extra row above and below.
 * Pieces sit in the margin around the centred safe zone, with a loose scatter.
 */
const layoutWorld = (count: number) => {
  const cell = DISCOVER_GRID
  const cols = 20
  const rows = 11
  const w = cols * cell
  const h = rows * cell
  const boxW = cell
  const boxH = STACK_PLATE_H

  const slotsFor = (variant: number) => {
    const keepL = (w - KEEP_W) / 2
    const keepT = (h - KEEP_H) / 2
    const keepR = keepL + KEEP_W
    const keepB = keepT + KEEP_H
    const band = 480
    const maxX = w - boxW
    const maxY = Math.floor((h - boxH) / cell) * cell
    const candidates: { x: number; y: number }[] = []
    for (let y = 0; y <= maxY; y += cell) {
      for (let x = 0; x <= maxX; x += cell) {
        const clearOfKeep = x + boxW <= keepL || x >= keepR || y + boxH <= keepT || y >= keepB
        const near =
          x + boxW > keepL - band &&
          x < keepR + band &&
          y + boxH > keepT - band &&
          y < keepB + band
        if (clearOfKeep && near) candidates.push({ x, y })
      }
    }
    const ranked = candidates
      .map((spot, index) => ({ spot, rank: unit((index + 1) * 89 + variant * 257) }))
      .sort((a, b) => a.rank - b.rank || a.spot.x - b.spot.x)
    const slots: { x: number; y: number; delay: number }[] = []
    for (const { spot } of ranked) {
      if (slots.length >= count) break
      const crowded = slots.some(
        (slot) => spot.x < slot.x + boxW && spot.x + boxW > slot.x && spot.y < slot.y + boxH && spot.y + boxH > slot.y,
      )
      if (crowded) continue
      slots.push({ x: spot.x, y: spot.y, delay: (slots.length % 5) * 0.05 })
    }
    return slots
  }

  return { w, h, cols, rows, slotsA: slotsFor(0), slotsB: slotsFor(1) }
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
      w: node.id === 'colour' ? cell * 2 : cell,
      h: node.id === 'colour' ? cell : STACK_PLATE_H,
    })
  }
  const hits = (x: number, y: number) =>
    blocks.some((block) => x < block.x + block.w && x + cell > block.x && y < block.y + block.h && y + cell > block.y)
  const candidates: { x: number; y: number }[] = []
  for (let y = 0; y <= world.h - cell; y += cell) {
    for (let x = 0; x <= world.w - cell; x += cell) {
      if (!hits(x, y)) candidates.push({ x, y })
    }
  }
  const focusX = world.w / 2
  const focusY = world.h / 2
  const spin = ((hashString(sources.map((source) => source.id).join('|')) % 360) * Math.PI) / 180
  const placed: { x: number; y: number }[] = []
  const apart = (spot: { x: number; y: number }, gap: number) =>
    placed.every((other) => Math.hypot(spot.x - other.x, spot.y - other.y) >= gap)

  return sources.map((source, index) => {
    const angle = spin + (index / Math.max(sources.length, 1)) * Math.PI * 2
    const pick = (gap: number) => {
      let best: { x: number; y: number } | null = null
      let bestRank = Infinity
      for (const spot of candidates) {
        if (gap && !apart(spot, gap)) continue
        const sx = spot.x + cell / 2
        const sy = spot.y + cell / 2
        const turn = Math.PI * 2
        let delta = Math.abs(Math.atan2(sy - focusY, sx - focusX) - angle) % turn
        if (delta > Math.PI) delta = turn - delta
        const radius = Math.hypot(sx - focusX, sy - focusY)
        const rank = delta * 1600 + Math.abs(radius - 1100)
        if (rank < bestRank) {
          bestRank = rank
          best = spot
        }
      }
      return best
    }
    const spot = pick(cell * 4) || pick(cell * 2) || pick(0) || { x: cell, y: cell * (3 + index) }
    const taken = candidates.findIndex((entry) => entry.x === spot.x && entry.y === spot.y)
    if (taken >= 0) candidates.splice(taken, 1)
    placed.push(spot)
    blocks.push({ x: spot.x, y: spot.y, w: cell, h: cell })
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
  if (colourPieces.length === 12) {
    folders.push({
      id: 'colour',
      mode: 'colour',
      name: 'Colour',
      kicker: '',
      label: '',
      pieces: layoutContainer(colourPieces, COLOUR_SPLAY, 'colour').map((piece) => ({
        ...piece,
        x: piece.x + DISCOVER_GRID,
        y: piece.y + DISCOVER_GRID / 2,
      })),
    })
  }
  const world = layoutWorld(ids.length)
  const arrangements = [
    arrange('table', { x: 0, y: 0 }, world.slotsA, ids),
    arrange('reading', { x: 0, y: 0 }, world.slotsB, ids),
  ]

  const cell = DISCOVER_GRID
  for (const arrangement of arrangements) {
    arrangement.nodes.push({ id: 'colour', x: cell, y: cell, delay: 0 })
  }
  const loose = scatterLoose(world, arrangements[0]?.nodes || [], looseSources)
  const marks: FieldMark[] = [
    { x: cell, y: cell, cross: true, text: 'A03' },
    { x: world.w - cell * 2, y: cell, cross: true, text: 'B07' },
    { x: world.w / 2, y: world.h - cell * 2, cross: true },
    { x: cell, y: world.h - cell * 2, text: 'Surface / 04' },
    { x: world.w - cell * 3, y: world.h / 2, text: 'Form / 02' },
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
