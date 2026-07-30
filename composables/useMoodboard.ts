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
  x: number
  y: number
  z: number
  scale: number
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
  const activeStrokeId = useState<string | null>('moodboard-active-stroke', () => null)
  const zCounter = useState<number>('moodboard-z', () => 1)

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
    activeId.value = null
  }

  const bringToFront = (id: string) => {
    zCounter.value += 1
    const z = zCounter.value
    placements.value = placements.value.map((item) =>
      item.id === id ? { ...item, z } : item,
    )
    activeId.value = id
    activeStrokeId.value = null
  }

  const updatePosition = (id: string, x: number, y: number) => {
    placements.value = placements.value.map((item) =>
      item.id === id ? { ...item, x, y } : item,
    )
  }

  const updateScale = (id: string, scale: number) => {
    placements.value = placements.value.map((item) =>
      item.id === id ? { ...item, scale } : item,
    )
  }

  const clearActive = () => {
    activeId.value = null
    activeStrokeId.value = null
  }

  const addColour = (colour: string) => {
    const hex = colour.toUpperCase()
    const id = `colour-${Date.now()}-${Math.round(Math.random() * 1000)}`
    zCounter.value += 1
    placements.value = [
      ...placements.value,
      {
        id,
        kind: 'colour',
        title: hex,
        colour: hex,
        x: 120 + (placements.value.length % 5) * 40,
        y: 120 + (placements.value.length % 5) * 40,
        z: zCounter.value,
        scale: 1,
      },
    ]
    activeId.value = id
    return id
  }

  const addImage = (
    imageUrl: string,
    title = 'Upload',
    options?: { imageUrls?: string[]; imageIndex?: number },
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
        x: 140 + (placements.value.length % 5) * 40,
        y: 140 + (placements.value.length % 5) * 40,
        z: zCounter.value,
        scale: 1,
      },
    ]
    activeId.value = id
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
    if (id) activeId.value = null
  }

  const addText = (text = 'Double-click to edit') => {
    const id = `text-${Date.now()}-${Math.round(Math.random() * 1000)}`
    zCounter.value += 1
    placements.value = [
      ...placements.value,
      {
        id,
        kind: 'text',
        title: text,
        text,
        x: 160 + (placements.value.length % 5) * 40,
        y: 160 + (placements.value.length % 5) * 40,
        z: zCounter.value,
        scale: 1,
      },
    ]
    activeId.value = id
    return id
  }

  const updateText = (id: string, text: string) => {
    placements.value = placements.value.map((item) =>
      item.id === id ? { ...item, text, title: text } : item,
    )
  }

  const removeItem = (id: string) => {
    placements.value = placements.value.filter((item) => item.id !== id)
    if (activeId.value === id) activeId.value = null
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
    placements.value = [...placements.value, copy]
    activeId.value = copy.id
    return copy.id
  }

  const reset = () => {
    placements.value = []
    strokes.value = []
    activeId.value = null
    activeStrokeId.value = null
    zCounter.value = 1
  }

  const loadBoard = (
    nextPlacements: MoodboardItem[],
    nextStrokes: MoodboardStroke[] = [],
  ) => {
    placements.value = JSON.parse(JSON.stringify(nextPlacements)) as MoodboardItem[]
    strokes.value = JSON.parse(JSON.stringify(nextStrokes)) as MoodboardStroke[]
    activeId.value = null
    activeStrokeId.value = null
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
    activeStrokeId,
    initFromBucket,
    loadBoard,
    snapshot,
    bringToFront,
    updatePosition,
    updateScale,
    clearActive,
    addColour,
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
    reset,
  }
}
