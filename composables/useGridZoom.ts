const MIN_ZOOM = 50
const MAX_ZOOM = 150
const STEP = 10

export const useGridZoom = () => {
  const zoom = useState('grid-zoom', () => 100)

  const zoomIn = () => {
    zoom.value = Math.min(MAX_ZOOM, zoom.value + STEP)
  }

  const zoomOut = () => {
    zoom.value = Math.max(MIN_ZOOM, zoom.value - STEP)
  }

  const tileSize = computed(() => {
    const base = 280
    return Math.round(base * (zoom.value / 100))
  })

  const zoomLabel = computed(() => `${String(zoom.value).padStart(2, '0')}%`)

  return { zoom, zoomIn, zoomOut, tileSize, zoomLabel, MIN_ZOOM, MAX_ZOOM }
}
