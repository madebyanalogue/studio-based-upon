export type MoodboardItem = {
  id: string
  kind: 'image' | 'colour' | 'text'
  title: string
  imageUrl?: string
  colour?: string
  text?: string
  x: number
  y: number
  z: number
  scale: number
}

export type MoodboardStroke = {
  id: string
  color: string
  width: number
  points: { x: number; y: number }[]
}

export const useMoodboard = () => {
  const placements = useState<MoodboardItem[]>('moodboard-placements', () => [])
  const strokes = useState<MoodboardStroke[]>('moodboard-strokes', () => [])
  const activeId = useState<string | null>('moodboard-active', () => null)
  const zCounter = useState<number>('moodboard-z', () => 1)

  const initFromBucket = (items: { id: string; title: string; imageUrl: string }[]) => {
    placements.value = items.map((item, index) => ({
      id: item.id,
      kind: 'image' as const,
      title: item.title,
      imageUrl: item.imageUrl,
      x: 80 + (index % 4) * 220,
      y: 80 + Math.floor(index / 4) * 260,
      z: ++zCounter.value,
      scale: 1.5,
    }))
    activeId.value = null
  }

  const bringToFront = (id: string) => {
    zCounter.value += 1
    const z = zCounter.value
    placements.value = placements.value.map((item) =>
      item.id === id ? { ...item, z } : item,
    )
    activeId.value = id
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

  const addImage = (imageUrl: string, title = 'Upload') => {
    const id = `image-${Date.now()}-${Math.round(Math.random() * 1000)}`
    zCounter.value += 1
    placements.value = [
      ...placements.value,
      {
        id,
        kind: 'image',
        title,
        imageUrl,
        x: 140 + (placements.value.length % 5) * 40,
        y: 140 + (placements.value.length % 5) * 40,
        z: zCounter.value,
        scale: 1,
      },
    ]
    activeId.value = id
    return id
  }

  const addStroke = (stroke: MoodboardStroke) => {
    strokes.value = [...strokes.value, stroke]
  }

  const clearStrokes = () => {
    strokes.value = []
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

  const reset = () => {
    placements.value = []
    strokes.value = []
    activeId.value = null
    zCounter.value = 1
  }

  return {
    placements,
    strokes,
    activeId,
    initFromBucket,
    bringToFront,
    updatePosition,
    updateScale,
    clearActive,
    addColour,
    addImage,
    addStroke,
    clearStrokes,
    addText,
    updateText,
    removeItem,
    reset,
  }
}
