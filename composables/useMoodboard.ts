export type MoodboardItem = {
  id: string
  kind: 'image' | 'colour' | 'text'
  title: string
  imageUrl?: string
  /** Project gallery for Forms / Surfaces — cycle with arrows when length > 1. */
  imageUrls?: string[]
  imageIndex?: number
  colour?: string
  text?: string
  /** Board text face — mono (default) or handwritten script. */
  textStyle?: 'mono' | 'handwritten'
  x: number
  y: number
  z: number
  scale: number
  /** Base width in px (default 210). Used to match selection thumb size on drop. */
  width?: number
  /** Natural height in px — when set, item keeps its intrinsic ratio. */
  height?: number
  objectFit?: 'contain' | 'cover'
  /** CSS clip-path for a torn fragment (polygon percentages). */
  clipPath?: string
  /** White paper backing — same fragment with a jagged randomized tear edge. */
  tearBackClipPath?: string
  /**
   * After a tear, the item box is shrunk to the clip AABB.
   * Image stays at full pre-tear size and is offset by crop so pixels still align.
   */
  cropX?: number
  cropY?: number
  sourceWidth?: number
  sourceHeight?: number
  /** Restore the pre-tear piece from either half of a tear. */
  tearRestore?: {
    original: MoodboardItem
    siblingId: string
  }
  /** Cart item this placement was dragged from — restored to selection on board close. */
  sourceBucketItemId?: string
  /** Selection pile the cart item came from. */
  sourceSelectionId?: string
}

type TearPoint = { x: number; y: number }

const tearSegIntersect = (
  a1: TearPoint,
  a2: TearPoint,
  b1: TearPoint,
  b2: TearPoint,
): TearPoint | null => {
  const d = (a2.x - a1.x) * (b2.y - b1.y) - (a2.y - a1.y) * (b2.x - b1.x)
  if (Math.abs(d) < 1e-9) return null
  const t = ((b1.x - a1.x) * (b2.y - b1.y) - (b1.y - a1.y) * (b2.x - b1.x)) / d
  const u = ((b1.x - a1.x) * (a2.y - a1.y) - (b1.y - a1.y) * (a2.x - a1.x)) / d
  if (t < -1e-6 || t > 1 + 1e-6 || u < -1e-6 || u > 1 + 1e-6) return null
  return { x: a1.x + t * (a2.x - a1.x), y: a1.y + t * (a2.y - a1.y) }
}

const tearNear = (a: TearPoint, b: TearPoint, eps = 0.75) =>
  Math.hypot(a.x - b.x, a.y - b.y) < eps

const tearPathLength = (pts: TearPoint[]) => {
  let len = 0
  for (let i = 1; i < pts.length; i += 1) {
    len += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y)
  }
  return len
}

const tearSimplifyPath = (pts: TearPoint[], minDist = 1.5): TearPoint[] => {
  if (pts.length < 2) return pts.slice()
  const out: TearPoint[] = [pts[0]!]
  for (let i = 1; i < pts.length; i += 1) {
    const prev = out[out.length - 1]!
    const p = pts[i]!
    if (Math.hypot(p.x - prev.x, p.y - prev.y) >= minDist) out.push(p)
  }
  const last = pts[pts.length - 1]!
  if (!tearNear(out[out.length - 1]!, last)) out.push(last)
  return out
}

const tearClamp = (p: TearPoint, w: number, h: number): TearPoint => ({
  x: Math.min(w, Math.max(0, p.x)),
  y: Math.min(h, Math.max(0, p.y)),
})

const tearNearestBoundary = (p: TearPoint, w: number, h: number): TearPoint => {
  const x = Math.min(w, Math.max(0, p.x))
  const y = Math.min(h, Math.max(0, p.y))
  const dist = [y, w - x, h - y, x]
  const min = Math.min(...dist)
  if (min === dist[0]) return { x, y: 0 }
  if (min === dist[1]) return { x: w, y }
  if (min === dist[2]) return { x, y: h }
  return { x: 0, y }
}

/** Perimeter param: 0 at TL, clockwise along top → right → bottom → left. */
const tearBoundaryParam = (p: TearPoint, w: number, h: number) => {
  const b = tearNearestBoundary(p, w, h)
  const eps = 0.75
  if (Math.abs(b.y) <= eps) return b.x
  if (Math.abs(b.x - w) <= eps) return w + b.y
  if (Math.abs(b.y - h) <= eps) return w + h + (w - b.x)
  return w + h + w + (h - b.y)
}

const tearFromBoundaryParam = (t: number, w: number, h: number): TearPoint => {
  const peri = 2 * (w + h)
  let u = ((t % peri) + peri) % peri
  if (u <= w) return { x: u, y: 0 }
  u -= w
  if (u <= h) return { x: w, y: u }
  u -= h
  if (u <= w) return { x: w - u, y: h }
  u -= w
  return { x: 0, y: h - u }
}

/** First boundary hit along a ray from origin in direction dir. */
const tearRayBoundaryHit = (
  origin: TearPoint,
  dir: TearPoint,
  w: number,
  h: number,
): TearPoint => {
  const len = Math.hypot(dir.x, dir.y) || 1
  const reach = Math.max(w, h) * 4
  const end = {
    x: origin.x + (dir.x / len) * reach,
    y: origin.y + (dir.y / len) * reach,
  }
  const edges: [TearPoint, TearPoint][] = [
    [
      { x: 0, y: 0 },
      { x: w, y: 0 },
    ],
    [
      { x: w, y: 0 },
      { x: w, y: h },
    ],
    [
      { x: w, y: h },
      { x: 0, y: h },
    ],
    [
      { x: 0, y: h },
      { x: 0, y: 0 },
    ],
  ]
  let best: TearPoint | null = null
  let bestT = Infinity
  for (const [e1, e2] of edges) {
    const hit = tearSegIntersect(origin, end, e1, e2)
    if (!hit) continue
    const t =
      ((hit.x - origin.x) * dir.x + (hit.y - origin.y) * dir.y) / (len * len)
    if (t > 1e-4 && t < bestT) {
      bestT = t
      best = hit
    }
  }
  return best || tearNearestBoundary(origin, w, h)
}

/** Corners strictly between tStart → tEnd along the perimeter (clockwise if forward). */
const tearWalkPerimeter = (
  tStart: number,
  tEnd: number,
  w: number,
  h: number,
  forward: boolean,
): TearPoint[] => {
  const peri = 2 * (w + h)
  const corners = [0, w, w + h, 2 * w + h]
  // Must emit corners in walk order (by distance along the arc) — array order
  // is wrong for vertical cuts and twists one half.
  if (forward) {
    const span = (tEnd - tStart + peri) % peri
    if (span < 1e-4) return []
    return corners
      .map((c) => ({ d: (c - tStart + peri) % peri, c }))
      .filter(({ d }) => d > 1e-4 && d < span - 1e-4)
      .sort((a, b) => a.d - b.d)
      .map(({ c }) => tearFromBoundaryParam(c, w, h))
  }
  const span = (tStart - tEnd + peri) % peri
  if (span < 1e-4) return []
  return corners
    .map((c) => ({ d: (tStart - c + peri) % peri, c }))
    .filter(({ d }) => d > 1e-4 && d < span - 1e-4)
    .sort((a, b) => a.d - b.d)
    .map(({ c }) => tearFromBoundaryParam(c, w, h))
}

const tearToClipPath = (pts: TearPoint[], w: number, h: number) => {
  const safeW = Math.max(w, 1)
  const safeH = Math.max(h, 1)
  return `polygon(${pts
    .map(
      (p) =>
        `${((p.x / safeW) * 100).toFixed(3)}% ${((p.y / safeH) * 100).toFixed(3)}%`,
    )
    .join(', ')})`
}

const tearParseClipPath = (
  clip: string | undefined,
  w: number,
  h: number,
): TearPoint[] | null => {
  if (!clip) return null
  const match = clip.match(/polygon\(\s*(.+)\s*\)/i)
  if (!match?.[1]) return null
  const pts: TearPoint[] = []
  for (const part of match[1].split(',')) {
    const bits = part.trim().split(/\s+/)
    if (bits.length < 2) continue
    const xs = bits[0]!
    const ys = bits[1]!
    const x = xs.endsWith('%')
      ? (parseFloat(xs) / 100) * w
      : parseFloat(xs)
    const y = ys.endsWith('%')
      ? (parseFloat(ys) / 100) * h
      : parseFloat(ys)
    if (Number.isFinite(x) && Number.isFinite(y)) pts.push({ x, y })
  }
  return pts.length >= 3 ? pts : null
}

/** Keep p if it is to the left of directed edge a→b (or on it). */
const tearLeftOf = (p: TearPoint, a: TearPoint, b: TearPoint) =>
  (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -1e-6

const tearIntersectPolygons = (
  subject: TearPoint[],
  clip: TearPoint[],
): TearPoint[] => {
  let output = subject.slice()
  for (let i = 0; i < clip.length; i += 1) {
    const a = clip[i]!
    const b = clip[(i + 1) % clip.length]!
    const input = output
    output = []
    if (!input.length) break
    let prev = input[input.length - 1]!
    for (const cur of input) {
      const curIn = tearLeftOf(cur, a, b)
      const prevIn = tearLeftOf(prev, a, b)
      if (curIn) {
        if (!prevIn) {
          const hit = tearSegIntersect(prev, cur, a, b)
          if (hit) output.push(hit)
        }
        output.push(cur)
      } else if (prevIn) {
        const hit = tearSegIntersect(prev, cur, a, b)
        if (hit) output.push(hit)
      }
      prev = cur
    }
  }
  return output
}

const tearDedupePath = (pts: TearPoint[], eps = 0.4): TearPoint[] => {
  if (!pts.length) return []
  const out: TearPoint[] = [pts[0]!]
  for (let i = 1; i < pts.length; i += 1) {
    if (!tearNear(out[out.length - 1]!, pts[i]!, eps)) out.push(pts[i]!)
  }
  return out
}

const tearRectEdges = (w: number, h: number): [TearPoint, TearPoint][] => [
  [
    { x: 0, y: 0 },
    { x: w, y: 0 },
  ],
  [
    { x: w, y: 0 },
    { x: w, y: h },
  ],
  [
    { x: w, y: h },
    { x: 0, y: h },
  ],
  [
    { x: 0, y: h },
    { x: 0, y: 0 },
  ],
]

const tearPointInRect = (p: TearPoint, w: number, h: number, pad = 0.5) =>
  p.x >= -pad && p.x <= w + pad && p.y >= -pad && p.y <= h + pad

const tearSignedArea = (pts: TearPoint[]) => {
  let area = 0
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i]!
    const q = pts[(i + 1) % pts.length]!
    area += p.x * q.y - q.x * p.y
  }
  return area / 2
}

/** Force counter-clockwise winding so CSS clip-path fills the intended side. */
const tearEnsureCcw = (pts: TearPoint[]) =>
  tearSignedArea(pts) < 0 ? pts.slice().reverse() : pts

const tearCentroid = (pts: TearPoint[]): TearPoint => {
  let x = 0
  let y = 0
  for (const p of pts) {
    x += p.x
    y += p.y
  }
  const n = Math.max(pts.length, 1)
  return { x: x / n, y: y / n }
}

/** Insert points along the seam so jagged offsets read as a paper edge. */
const tearDensifySeam = (seam: TearPoint[], spacing: number): TearPoint[] => {
  if (seam.length < 2) return seam.slice()
  const out: TearPoint[] = [seam[0]!]
  for (let i = 1; i < seam.length; i += 1) {
    const a = seam[i - 1]!
    const b = seam[i]!
    const dist = Math.hypot(b.x - a.x, b.y - a.y)
    const steps = Math.max(1, Math.round(dist / Math.max(spacing, 1)))
    for (let k = 1; k <= steps; k += 1) {
      const t = k / steps
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
    }
  }
  return tearDedupePath(out, 0.2)
}

/**
 * Soft paper tear: smooth anchor waves plus a light high-frequency tick so the
 * edge reads torn — not a dense sawtooth, but a touch more jagged than a curve.
 */
const tearJaggedSeam = (
  seam: TearPoint[],
  piecePoly: TearPoint[],
  amp: number,
): TearPoint[] => {
  // ~1 sample every 11–14px
  const dense = tearDensifySeam(seam, Math.max(11, amp * 2.2))
  if (dense.length < 3) return dense
  const c = tearCentroid(piecePoly)

  // Anchor bumps along the seam; ends stay on the clean cut
  const anchors = new Array(dense.length).fill(0) as number[]
  const stride = Math.max(2, Math.round(dense.length / 7))
  for (let i = stride; i < dense.length - 1; i += stride) {
    anchors[i] = amp * (0.55 + Math.random() * 0.65)
  }
  if (dense.length >= 4) {
    const mid = Math.floor(dense.length / 2)
    if (anchors[mid] === 0) anchors[mid] = amp * (0.5 + Math.random() * 0.55)
  }

  const amounts = new Array(dense.length).fill(0) as number[]
  let prevIdx = 0
  for (let i = 1; i < dense.length; i += 1) {
    const isAnchor = i === dense.length - 1 || (anchors[i] ?? 0) > 0
    if (!isAnchor) continue
    const a0 = anchors[prevIdx] ?? 0
    const a1 = i === dense.length - 1 ? 0 : (anchors[i] ?? 0)
    const span = i - prevIdx || 1
    for (let k = prevIdx; k <= i; k += 1) {
      const t = (k - prevIdx) / span
      amounts[k] = a0 + (a1 - a0) * t
    }
    prevIdx = i
  }

  const out: TearPoint[] = [dense[0]!]
  for (let i = 1; i < dense.length - 1; i += 1) {
    const prev = dense[i - 1]!
    const p = dense[i]!
    const next = dense[i + 1]!
    const tx = next.x - prev.x
    const ty = next.y - prev.y
    const len = Math.hypot(tx, ty) || 1
    let nx = -ty / len
    let ny = tx / len
    const awayX = p.x - c.x
    const awayY = p.y - c.y
    if (nx * awayX + ny * awayY < 0) {
      nx = -nx
      ny = -ny
    }
    // Base outward wave + light tick for a touch more jagged
    const tick = (Math.random() - 0.35) * amp * 0.35
    const amount = Math.max(0.4, (amounts[i] ?? 0) + tick)
    out.push({ x: p.x + nx * amount, y: p.y + ny * amount })
  }
  out.push(dense[dense.length - 1]!)
  return out
}

/**
 * If the open seam crosses itself, drop the loop so clip polygons stay simple.
 */
const tearUncrossSeam = (seam: TearPoint[]): TearPoint[] => {
  let pts = seam.slice()
  let guard = 0
  while (guard < 24) {
    guard += 1
    let hitAt: { i: number; j: number; point: TearPoint } | null = null
    for (let i = 0; i < pts.length - 1 && !hitAt; i += 1) {
      for (let j = i + 2; j < pts.length - 1; j += 1) {
        if (i === 0 && j === pts.length - 2) continue
        const hit = tearSegIntersect(pts[i]!, pts[i + 1]!, pts[j]!, pts[j + 1]!)
        if (!hit) continue
        if (
          tearNear(hit, pts[i]!, 0.5) ||
          tearNear(hit, pts[i + 1]!, 0.5) ||
          tearNear(hit, pts[j]!, 0.5) ||
          tearNear(hit, pts[j + 1]!, 0.5)
        ) {
          continue
        }
        hitAt = { i, j, point: hit }
        break
      }
    }
    if (!hitAt) break
    pts = [...pts.slice(0, hitAt.i + 1), hitAt.point, ...pts.slice(hitAt.j + 1)]
  }
  return tearDedupePath(pts, 0.5)
}

/** True when a closed polygon has non-adjacent intersecting edges (bow-tie / twist). */
const tearPolygonSelfIntersects = (pts: TearPoint[]): boolean => {
  const n = pts.length
  if (n < 4) return false
  for (let i = 0; i < n; i += 1) {
    const a = pts[i]!
    const b = pts[(i + 1) % n]!
    for (let j = i + 1; j < n; j += 1) {
      const c = pts[j]!
      const d = pts[(j + 1) % n]!
      // Skip shared / adjacent edges
      if ((i + 1) % n === j || (j + 1) % n === i) continue
      const hit = tearSegIntersect(a, b, c, d)
      if (!hit) continue
      if (
        tearNear(hit, a, 0.6) ||
        tearNear(hit, b, 0.6) ||
        tearNear(hit, c, 0.6) ||
        tearNear(hit, d, 0.6)
      ) {
        continue
      }
      return true
    }
  }
  return false
}

/**
 * Midpoints must stay strictly inside. Points clamped onto the border run along
 * the perimeter and double the boundary walk — that’s the twisted half.
 */
const tearStrictInteriorMids = (
  seam: TearPoint[],
  w: number,
  h: number,
  pad = 2,
): TearPoint[] => {
  if (seam.length < 2) return seam.slice()
  const out: TearPoint[] = [tearNearestBoundary(seam[0]!, w, h)]
  for (let i = 1; i < seam.length - 1; i += 1) {
    const p = seam[i]!
    if (p.x < pad || p.x > w - pad || p.y < pad || p.y > h - pad) continue
    out.push(p)
  }
  out.push(tearNearestBoundary(seam[seam.length - 1]!, w, h))
  return tearDedupePath(out, 0.4)
}

/**
 * Build the seam from a freehand path that may start/end outside the image.
 * Uses the longest enter→exit span; mid samples stay strictly interior so the
 * cut can curve without gluing to the border (which twists a clip half).
 */
const tearSeamFromOpenPath = (
  path: TearPoint[],
  w: number,
  h: number,
): TearPoint[] | null => {
  if (path.length < 2 || tearPathLength(path) < 12) return null

  type Crossing = { order: number; point: TearPoint }
  const crossings: Crossing[] = []
  const edges = tearRectEdges(w, h)

  for (let i = 0; i < path.length - 1; i += 1) {
    const a = path[i]!
    const b = path[i + 1]!
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len2 = dx * dx + dy * dy || 1
    for (const [e1, e2] of edges) {
      const hit = tearSegIntersect(a, b, e1, e2)
      if (!hit) continue
      const t = ((hit.x - a.x) * dx + (hit.y - a.y) * dy) / len2
      crossings.push({
        order: i + Math.min(1, Math.max(0, t)),
        point: tearClamp(hit, w, h),
      })
    }
  }

  crossings.sort((a, b) => a.order - b.order)
  const unique: Crossing[] = []
  for (const crossing of crossings) {
    const prev = unique[unique.length - 1]
    if (
      prev &&
      (tearNear(prev.point, crossing.point, 1.25) ||
        crossing.order - prev.order < 0.04)
    ) {
      continue
    }
    unique.push(crossing)
  }

  if (unique.length < 2) return null

  let expectEnter = !tearPointInRect(path[0]!, w, h)
  type Span = { start: Crossing; end: Crossing; len: number }
  const spans: Span[] = []
  let open: Crossing | null = null
  for (const crossing of unique) {
    if (expectEnter) {
      open = crossing
      expectEnter = false
    } else if (open) {
      spans.push({
        start: open,
        end: crossing,
        len: crossing.order - open.order,
      })
      open = null
      expectEnter = true
    }
  }
  if (!spans.length) {
    spans.push({
      start: unique[0]!,
      end: unique[unique.length - 1]!,
      len: unique[unique.length - 1]!.order - unique[0]!.order,
    })
  }
  spans.sort((a, b) => b.len - a.len)
  const { start: bestStart, end: bestEnd } = spans[0]!
  if (bestEnd.order - bestStart.order < 0.05) return null

  const pad = Math.min(3, Math.min(w, h) * 0.02)
  const seam: TearPoint[] = [bestStart.point]
  for (let i = 0; i < path.length; i += 1) {
    if (i <= bestStart.order || i >= bestEnd.order) continue
    const p = path[i]!
    // Skip outside / border samples — never clamp them onto the perimeter
    if (p.x < pad || p.x > w - pad || p.y < pad || p.y > h - pad) continue
    seam.push(p)
  }
  seam.push(bestEnd.point)

  let cleaned = tearStrictInteriorMids(tearDedupePath(seam, 0.4), w, h, pad)
  cleaned = tearSimplifyPath(cleaned, 0.75)
  cleaned = tearUncrossSeam(cleaned)
  cleaned = tearStrictInteriorMids(cleaned, w, h, pad)

  if (cleaned.length < 2 || tearPathLength(cleaned) < 12) return null
  return cleaned
}

/** Build both halves; progressively simplify the seam until neither poly twists. */
const tearBuildHalves = (
  seamIn: TearPoint[],
  w: number,
  h: number,
): { seam: TearPoint[]; polyA: TearPoint[]; polyB: TearPoint[] } | null => {
  const t0 = tearBoundaryParam(seamIn[0]!, w, h)
  const t1 = tearBoundaryParam(seamIn[seamIn.length - 1]!, w, h)
  const peri = 2 * (w + h)
  if (Math.min((t1 - t0 + peri) % peri, (t0 - t1 + peri) % peri) < 1) {
    return null
  }
  const walkA = tearWalkPerimeter(t1, t0, w, h, true)
  const walkB = tearWalkPerimeter(t0, t1, w, h, true)

  let seam = seamIn
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const seamRev = seam.slice().reverse()
    // Keep construction order — only normalize winding after we know it’s simple
    let polyA = tearDedupePath([...seam, ...walkA], 0.35)
    let polyB = tearDedupePath([...seamRev, ...walkB], 0.35)
    const twistA = tearPolygonSelfIntersects(polyA)
    const twistB = tearPolygonSelfIntersects(polyB)
    if (!twistA && !twistB) {
      polyA = tearEnsureCcw(polyA)
      polyB = tearEnsureCcw(polyB)
      if (Math.abs(tearSignedArea(polyA)) < 1 || Math.abs(tearSignedArea(polyB)) < 1) {
        return null
      }
      return { seam, polyA, polyB }
    }
    // Soften the curve a bit more and drop any loop — keep freehand character
    seam = tearSimplifyPath(seam, 0.75 + attempt * 1.1)
    seam = tearUncrossSeam(seam)
    seam = tearStrictInteriorMids(seam, w, h, Math.min(3, Math.min(w, h) * 0.02))
    if (seam.length < 2) break
  }
  return null
}

export type TearClipResult = {
  /** Photo fragment clips (clean cut). */
  image: [string, string]
  /** White paper backs — jagged randomized tear edge only. */
  backing: [string, string]
}

/** Axis-aligned bounds of a polygon (optional pad). */
const tearPolygonBounds = (pts: TearPoint[], pad = 0) => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of pts) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return {
    minX: minX - pad,
    minY: minY - pad,
    maxX: maxX + pad,
    maxY: maxY + pad,
  }
}

/**
 * Shrink a torn piece’s layout box to its clip silhouette and offset the
 * source image so the visible fragment stays pixel-aligned.
 */
export const fitTornPieceToClip = (piece: MoodboardItem): MoodboardItem => {
  const w = piece.width || 210
  const h = piece.height || w
  const imagePoly = tearParseClipPath(piece.clipPath, w, h)
  if (!imagePoly || imagePoly.length < 3) return piece

  const polys = [imagePoly]
  const backPoly = tearParseClipPath(piece.tearBackClipPath, w, h)
  if (backPoly && backPoly.length >= 3) polys.push(backPoly)

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const poly of polys) {
    const b = tearPolygonBounds(poly, 1)
    minX = Math.min(minX, b.minX)
    minY = Math.min(minY, b.minY)
    maxX = Math.max(maxX, b.maxX)
    maxY = Math.max(maxY, b.maxY)
  }
  minX = Math.max(0, minX)
  minY = Math.max(0, minY)
  maxX = Math.min(w, maxX)
  maxY = Math.min(h, maxY)
  const newW = Math.max(8, maxX - minX)
  const newH = Math.max(8, maxY - minY)
  // Already tight enough — avoid churn from float noise
  if (newW >= w - 1.5 && newH >= h - 1.5 && minX < 1.5 && minY < 1.5) {
    return piece
  }

  const s = piece.scale || 1
  const remap = (clip?: string) => {
    const pts = tearParseClipPath(clip, w, h)
    if (!pts) return clip
    return tearToClipPath(
      pts.map((p) => ({ x: p.x - minX, y: p.y - minY })),
      newW,
      newH,
    )
  }

  return {
    ...piece,
    x: piece.x + minX * s,
    y: piece.y + minY * s,
    width: newW,
    height: newH,
    sourceWidth: piece.sourceWidth ?? w,
    sourceHeight: piece.sourceHeight ?? h,
    cropX: (piece.cropX ?? 0) + minX,
    cropY: (piece.cropY ?? 0) + minY,
    clipPath: remap(piece.clipPath),
    tearBackClipPath: remap(piece.tearBackClipPath),
  }
}

/** Parse a CSS polygon() clip-path into layout points (for canvas export). */
export const parseMoodboardClipPath = (
  clip: string | undefined,
  w: number,
  h: number,
) => tearParseClipPath(clip, w, h)

/**
 * Split a layout rect along a freehand cursor path into two CSS clip-path polygons.
 * Path points are in the item’s unscaled layout box and may lie outside it.
 * When `existingClip` is set, each half is intersected with that fragment.
 * Also builds white backing polygons with a randomized tear edge.
 */
export const tearClipPathsForPath = (
  w: number,
  h: number,
  rawPath: TearPoint[],
  existingClip?: string,
): TearClipResult | null => {
  const simplified = tearSimplifyPath(rawPath, 0.6)
  const cleanSeam = tearSeamFromOpenPath(simplified, w, h)
  if (!cleanSeam || cleanSeam.length < 2) return null

  let halves = tearBuildHalves(cleanSeam, w, h)
  if (!halves && cleanSeam.length >= 3) {
    // Last resort: keep a single mid bend so the cut isn’t forced straight
    const mid = cleanSeam[Math.floor(cleanSeam.length / 2)]!
    halves = tearBuildHalves(
      [cleanSeam[0]!, mid, cleanSeam[cleanSeam.length - 1]!],
      w,
      h,
    )
  }
  if (!halves) return null

  let { polyA, polyB } = halves
  const seamA = halves.seam
  const seamB = seamA.slice().reverse()
  const t0 = tearBoundaryParam(seamA[0]!, w, h)
  const t1 = tearBoundaryParam(seamA[seamA.length - 1]!, w, h)
  const walkA = tearWalkPerimeter(t1, t0, w, h, true)
  const walkB = tearWalkPerimeter(t0, t1, w, h, true)

  const amp = Math.min(7.5, Math.max(2.8, Math.min(w, h) * 0.018))
  let backA = tearEnsureCcw(
    tearDedupePath([...tearJaggedSeam(seamA, polyA, amp), ...walkA], 0.35),
  )
  let backB = tearEnsureCcw(
    tearDedupePath([...tearJaggedSeam(seamB, polyB, amp), ...walkB], 0.35),
  )
  // If jagged backs somehow self-intersect, fall back to the clean photo edge
  if (tearPolygonSelfIntersects(backA)) backA = polyA
  if (tearPolygonSelfIntersects(backB)) backB = polyB

  const mask = tearParseClipPath(existingClip, w, h)
  if (mask) {
    const maskCcw = tearEnsureCcw(mask)
    polyA = tearEnsureCcw(tearIntersectPolygons(polyA, maskCcw))
    polyB = tearEnsureCcw(tearIntersectPolygons(polyB, maskCcw))
    backA = tearEnsureCcw(tearIntersectPolygons(backA, maskCcw))
    backB = tearEnsureCcw(tearIntersectPolygons(backB, maskCcw))
  }

  if (polyA.length < 3 || polyB.length < 3) return null
  if (Math.abs(tearSignedArea(polyA)) < 1 || Math.abs(tearSignedArea(polyB)) < 1) {
    return null
  }
  if (backA.length < 3 || backB.length < 3) {
    backA = polyA
    backB = polyB
  }
  return {
    image: [tearToClipPath(polyA, w, h), tearToClipPath(polyB, w, h)],
    backing: [tearToClipPath(backA, w, h), tearToClipPath(backB, w, h)],
  }
}

export type MoodboardStroke = {
  id: string
  kind?: 'freehand' | 'arrow'
  color: string
  width: number
  points: { x: number; y: number }[]
}

export const useMoodboard = () => {
  const placements = useState<MoodboardItem[]>('moodboard-placements', () => [])
  const strokes = useState<MoodboardStroke[]>('moodboard-strokes', () => [])
  const activeId = useState<string | null>('moodboard-active', () => null)
  /** Multi-select set — activeId is the primary (last focused) member. */
  const selectedIds = useState<string[]>('moodboard-selected', () => [])
  const activeStrokeId = useState<string | null>('moodboard-active-stroke', () => null)
  const zCounter = useState<number>('moodboard-z', () => 1)
  const tearUndo = useState<{
    original: MoodboardItem
    pieceIds: [string, string]
  } | null>('moodboard-tear-undo', () => null)

  const selectOnly = (id: string | null) => {
    selectedIds.value = id ? [id] : []
    activeId.value = id
  }

  const initFromBucket = (
    items: {
      id: string
      title: string
      imageUrl: string
      imageUrls?: string[]
      imageIndex?: number
    }[],
  ) => {
    placements.value = items.map((item, index) => {
      const urls = item.imageUrls?.filter(Boolean) || []
      const imageIndex =
        item.imageIndex ??
        (urls.length ? Math.max(0, urls.indexOf(item.imageUrl)) : 0)
      return {
        id: item.id,
        kind: 'image' as const,
        title: item.title,
        imageUrl: urls[imageIndex] || item.imageUrl,
        imageUrls: urls.length ? urls : undefined,
        imageIndex: urls.length ? imageIndex : undefined,
        x: 80 + (index % 4) * 220,
        y: 80 + Math.floor(index / 4) * 260,
        z: ++zCounter.value,
        scale: 1.5,
      }
    })
    selectOnly(null)
  }

  const bringToFront = (
    id: string,
    opts?: { additive?: boolean; preserveSelection?: boolean },
  ) => {
    activeStrokeId.value = null

    // Shift multi-select — only change membership, leave stacking alone
    if (opts?.additive) {
      const set = new Set(selectedIds.value)
      if (set.has(id)) {
        set.delete(id)
        selectedIds.value = [...set]
        activeId.value = selectedIds.value[selectedIds.value.length - 1] ?? null
      } else {
        selectedIds.value = [...selectedIds.value, id]
        activeId.value = id
      }
      return
    }

    // Clicking within an existing multi-selection — keep z as-is
    if (opts?.preserveSelection && selectedIds.value.includes(id)) {
      activeId.value = id
      return
    }

    zCounter.value += 1
    const z = zCounter.value
    placements.value = placements.value.map((item) =>
      item.id === id ? { ...item, z } : item,
    )
    selectOnly(id)
  }

  const updatePosition = (id: string, x: number, y: number) => {
    placements.value = placements.value.map((item) =>
      item.id === id ? { ...item, x, y } : item,
    )
  }

  const updatePositions = (updates: { id: string; x: number; y: number }[]) => {
    if (!updates.length) return
    const byId = new Map(updates.map((entry) => [entry.id, entry]))
    placements.value = placements.value.map((item) => {
      const next = byId.get(item.id)
      return next ? { ...item, x: next.x, y: next.y } : item
    })
  }

  const updateScale = (id: string, scale: number) => {
    placements.value = placements.value.map((item) =>
      item.id === id ? { ...item, scale } : item,
    )
  }

  const clearActive = () => {
    selectOnly(null)
    activeStrokeId.value = null
  }

  const addColour = (
    colour: string,
    options?: {
      x?: number
      y?: number
    },
  ) => {
    const hex = colour.toUpperCase()
    const id = `colour-${Date.now()}-${Math.round(Math.random() * 1000)}`
    zCounter.value += 1
    const colourCount = placements.value.filter((item) => item.kind === 'colour').length
    const cascade = colourCount % 6
    placements.value = [
      ...placements.value,
      {
        id,
        kind: 'colour',
        title: hex,
        colour: hex,
        x: options?.x ?? 120 + cascade * 36,
        y: options?.y ?? 120 + cascade * 36,
        z: zCounter.value,
        scale: 1,
      },
    ]
    selectOnly(id)
    return id
  }

  const updateColour = (id: string, colour: string) => {
    const hex = colour.toUpperCase()
    placements.value = placements.value.map((item) =>
      item.id === id && item.kind === 'colour'
        ? { ...item, colour: hex, title: hex }
        : item,
    )
  }

  const addImage = (
    imageUrl: string,
    title = 'Upload',
    options?: {
      imageUrls?: string[]
      imageIndex?: number
      x?: number
      y?: number
      scale?: number
      width?: number
      height?: number
      objectFit?: 'contain' | 'cover'
      sourceBucketItemId?: string
      sourceSelectionId?: string
    },
  ) => {
    const id = `image-${Date.now()}-${Math.round(Math.random() * 1000)}`
    const urls = options?.imageUrls?.filter(Boolean) || []
    const imageIndex =
      options?.imageIndex ??
      (urls.length ? Math.max(0, urls.indexOf(imageUrl)) : 0)
    zCounter.value += 1
    placements.value = [
      ...placements.value,
      {
        id,
        kind: 'image',
        title,
        imageUrl: urls[imageIndex] || imageUrl,
        imageUrls: urls.length > 1 ? urls : undefined,
        imageIndex: urls.length > 1 ? imageIndex : undefined,
        x: options?.x ?? 140 + (placements.value.length % 5) * 40,
        y: options?.y ?? 140 + (placements.value.length % 5) * 40,
        z: zCounter.value,
        scale: options?.scale ?? 1,
        width: options?.width,
        height: options?.height,
        objectFit: options?.objectFit,
        sourceBucketItemId: options?.sourceBucketItemId,
        sourceSelectionId: options?.sourceSelectionId,
      },
    ]
    selectOnly(id)
    return id
  }

  const cycleItemImage = (id: string, direction: 1 | -1) => {
    placements.value = placements.value.map((item) => {
      if (item.id !== id || item.kind !== 'image') return item
      const urls = item.imageUrls?.filter(Boolean) || []
      if (urls.length < 2) return item
      const current =
        item.imageIndex ?? Math.max(0, urls.indexOf(item.imageUrl || ''))
      const next = (current + direction + urls.length) % urls.length
      return {
        ...item,
        imageIndex: next,
        imageUrl: urls[next],
      }
    })
  }

  const addStroke = (stroke: MoodboardStroke) => {
    strokes.value = [...strokes.value, stroke]
  }

  const updateStrokePoints = (id: string, points: { x: number; y: number }[]) => {
    strokes.value = strokes.value.map((stroke) =>
      stroke.id === id ? { ...stroke, points: points.map((p) => ({ ...p })) } : stroke,
    )
  }

  const removeStroke = (id: string) => {
    strokes.value = strokes.value.filter((stroke) => stroke.id !== id)
    if (activeStrokeId.value === id) activeStrokeId.value = null
  }

  const clearStrokes = () => {
    strokes.value = []
    activeStrokeId.value = null
  }

  const selectStroke = (id: string | null) => {
    activeStrokeId.value = id
    if (id) selectOnly(null)
  }

  const addText = (
    text = 'Double-click to edit',
    textStyle: 'mono' | 'handwritten' = 'mono',
    position?: { x: number; y: number },
  ) => {
    const id = `text-${Date.now()}-${Math.round(Math.random() * 1000)}`
    zCounter.value += 1
    placements.value = [
      ...placements.value,
      {
        id,
        kind: 'text',
        title: text,
        text,
        textStyle,
        x: position?.x ?? 160 + (placements.value.length % 5) * 40,
        y: position?.y ?? 160 + (placements.value.length % 5) * 40,
        z: zCounter.value,
        scale: 1,
        // Size is content-driven in the canvas — never a fixed thumb width
        width: undefined,
        height: undefined,
      },
    ]
    selectOnly(id)
    return id
  }

  const updateText = (id: string, text: string) => {
    placements.value = placements.value.map((item) =>
      item.id === id ? { ...item, text, title: text } : item,
    )
  }

  const removeItem = (id: string) => {
    placements.value = placements.value.filter((item) => item.id !== id)
    selectedIds.value = selectedIds.value.filter((entry) => entry !== id)
    if (activeId.value === id) {
      activeId.value = selectedIds.value[selectedIds.value.length - 1] ?? null
    }
    if (
      tearUndo.value &&
      (tearUndo.value.pieceIds[0] === id || tearUndo.value.pieceIds[1] === id)
    ) {
      tearUndo.value = null
    }
  }

  const cloneItem = (id: string) => {
    const source = placements.value.find((item) => item.id === id)
    if (!source) return null
    const copy = JSON.parse(JSON.stringify(source)) as MoodboardItem
    copy.id = `${source.id}-copy-${Date.now()}`
    copy.x = source.x + 28
    copy.y = source.y + 28
    zCounter.value += 1
    copy.z = zCounter.value
    // Clone is board-only — don't reclaim the parked cart item twice
    delete copy.sourceBucketItemId
    delete copy.sourceSelectionId
    delete copy.tearRestore
    placements.value = [...placements.value, copy]
    selectOnly(copy.id)
    return copy.id
  }

  /**
   * Split an image along a freehand cursor path (local unscaled layout coords).
   */
  const tearItem = (
    id: string,
    path: { x: number; y: number }[],
    size: { width: number; height: number },
  ) => {
    const source = placements.value.find((item) => item.id === id)
    if (!source || source.kind !== 'image' || !source.imageUrl) return null

    const clips = tearClipPathsForPath(
      size.width,
      size.height,
      path,
      source.clipPath,
    )
    if (!clips) return null

    const stamp = Date.now()
    const original = JSON.parse(JSON.stringify(source)) as MoodboardItem
    const base = JSON.parse(JSON.stringify(source)) as MoodboardItem
    // Only one fragment keeps the cart link so close doesn’t restore twice
    // Nudge halves apart so white backing reads on both torn edges
    const polyA = tearParseClipPath(clips.image[0], size.width, size.height)
    const polyB = tearParseClipPath(clips.image[1], size.width, size.height)
    let sepX = 6
    let sepY = 0
    if (polyA && polyB) {
      const cA = tearCentroid(polyA)
      const cB = tearCentroid(polyB)
      const dx = cB.x - cA.x
      const dy = cB.y - cA.y
      const len = Math.hypot(dx, dy) || 1
      const sep = Math.min(14, Math.max(8, Math.min(size.width, size.height) * 0.04))
      sepX = (dx / len) * sep
      sepY = (dy / len) * sep
    }

    const idA = `${source.id}-tear-a-${stamp}`
    const idB = `${source.id}-tear-b-${stamp}`
    // Fresh restore target = piece before this tear (drop nested restore)
    delete base.tearRestore
    const pieceA: MoodboardItem = fitTornPieceToClip({
      ...base,
      id: idA,
      clipPath: clips.image[0],
      tearBackClipPath: clips.backing[0],
      width: size.width,
      height: size.height,
      x: base.x - sepX / 2,
      y: base.y - sepY / 2,
      z: ++zCounter.value,
      tearRestore: { original, siblingId: idB },
    })
    const pieceB: MoodboardItem = fitTornPieceToClip({
      ...base,
      id: idB,
      clipPath: clips.image[1],
      tearBackClipPath: clips.backing[1],
      width: size.width,
      height: size.height,
      x: base.x + sepX / 2,
      y: base.y + sepY / 2,
      z: ++zCounter.value,
      tearRestore: { original, siblingId: idA },
    })
    delete pieceB.sourceBucketItemId
    delete pieceB.sourceSelectionId

    placements.value = placements.value.flatMap((item) =>
      item.id === id ? [pieceA, pieceB] : [item],
    )
    // Clear selection so the next click grabs one side (not both as a group)
    selectedIds.value = []
    activeId.value = null
    activeStrokeId.value = null
    tearUndo.value = { original, pieceIds: [pieceA.id, pieceB.id] }
    return { a: pieceA.id, b: pieceB.id }
  }

  /**
   * Turn this torn half into a full board clone of the pre-tear image.
   * The sibling half stays put (and can restore to its own clone).
   */
  const restoreTearPiece = (id: string) => {
    const piece = placements.value.find((item) => item.id === id)
    const restore = piece?.tearRestore
    if (!piece || !restore) return false

    const restored = JSON.parse(JSON.stringify(restore.original)) as MoodboardItem
    restored.id = `${id}-full-${Date.now()}`
    restored.x = piece.x
    restored.y = piece.y
    restored.scale = piece.scale
    zCounter.value += 1
    restored.z = zCounter.value
    delete restored.tearRestore
    delete restored.clipPath
    delete restored.tearBackClipPath
    delete restored.cropX
    delete restored.cropY
    delete restored.sourceWidth
    delete restored.sourceHeight
    // Independent board copy — don't reclaim the cart item twice
    delete restored.sourceBucketItemId
    delete restored.sourceSelectionId

    placements.value = placements.value.map((item) =>
      item.id === id ? restored : item,
    )
    selectOnly(restored.id)

    if (
      tearUndo.value &&
      (tearUndo.value.pieceIds[0] === id || tearUndo.value.pieceIds[1] === id)
    ) {
      tearUndo.value = null
    }
    return true
  }

  /** Revert the last tear: put the original back and drop both halves. */
  const undoTear = () => {
    const undo = tearUndo.value
    if (!undo) return false
    const [idA, idB] = undo.pieceIds
    const hasA = placements.value.some((item) => item.id === idA)
    const hasB = placements.value.some((item) => item.id === idB)
    // Only when both halves are untouched — Restore turns a half into a clone
    if (!hasA || !hasB) {
      tearUndo.value = null
      return false
    }

    const original = JSON.parse(JSON.stringify(undo.original)) as MoodboardItem
    delete original.tearRestore

    placements.value = placements.value.flatMap((item) => {
      if (item.id === idA) return [original]
      if (item.id === idB) return []
      return [item]
    })
    selectOnly(original.id)
    tearUndo.value = null
    return true
  }

  const clearTearUndo = () => {
    tearUndo.value = null
  }

  const reset = () => {
    placements.value = []
    strokes.value = []
    selectOnly(null)
    activeStrokeId.value = null
    tearUndo.value = null
    zCounter.value = 1
  }

  const loadBoard = (
    nextPlacements: MoodboardItem[],
    nextStrokes: MoodboardStroke[] = [],
  ) => {
    placements.value = JSON.parse(JSON.stringify(nextPlacements)) as MoodboardItem[]
    strokes.value = JSON.parse(JSON.stringify(nextStrokes)) as MoodboardStroke[]
    selectOnly(null)
    activeStrokeId.value = null
    tearUndo.value = null
    zCounter.value = placements.value.reduce((max, item) => Math.max(max, item.z), 1)
  }

  const snapshot = () => ({
    placements: JSON.parse(JSON.stringify(placements.value)) as MoodboardItem[],
    strokes: JSON.parse(JSON.stringify(strokes.value)) as MoodboardStroke[],
  })

  return {
    placements,
    strokes,
    activeId,
    selectedIds,
    activeStrokeId,
    tearUndo,
    initFromBucket,
    loadBoard,
    snapshot,
    bringToFront,
    updatePosition,
    updatePositions,
    updateScale,
    clearActive,
    addColour,
    updateColour,
    addImage,
    cycleItemImage,
    addStroke,
    updateStrokePoints,
    removeStroke,
    clearStrokes,
    selectStroke,
    addText,
    updateText,
    removeItem,
    cloneItem,
    tearItem,
    restoreTearPiece,
    undoTear,
    clearTearUndo,
    reset,
  }
}
