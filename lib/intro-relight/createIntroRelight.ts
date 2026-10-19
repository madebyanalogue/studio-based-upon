import {
  AgXToneMapping,
  Color,
  OrthographicCamera,
  Scene,
  WebGPURenderer,
} from 'three/webgpu'
import { setLightFromNdc, setupLight } from './light'
import { createPlane } from './plane'
import { setupTextures } from './textures'
import { uCoverZoom } from './nodes/texture-fit'

const MAX_PIXEL_RATIO = 2
const VIEW_HEIGHT = 4

export type IntroRelight = {
  canvas: HTMLCanvasElement
  setPointer: (clientX: number, clientY: number) => void
  setPointerNdc: (ndcX: number, ndcY: number) => void
  resize: () => void
  dispose: () => void
}

export async function createIntroRelight(
  host: HTMLElement,
  options: {
    map: string
    depth: string
    /** Cover zoom. 0.5 ≈ 2×. */
    zoom?: number
    background?: string
  },
): Promise<IntroRelight | null> {
  if (!navigator.gpu) return null

  let renderer: WebGPURenderer
  try {
    renderer = new WebGPURenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO))
    renderer.setSize(host.clientWidth || window.innerWidth, host.clientHeight || window.innerHeight)
    renderer.toneMapping = AgXToneMapping
    await renderer.init()
  } catch {
    return null
  }

  uCoverZoom.value = options.zoom ?? 0.5

  try {
    await setupTextures({ map: options.map, depth: options.depth })
  } catch {
    renderer.dispose()
    return null
  }

  const scene = new Scene()
  scene.background = new Color(options.background ?? '#000000')

  const camera = new OrthographicCamera()
  camera.position.set(0, 0, 5)
  setupLight(scene, camera)

  const plane = createPlane()
  scene.add(plane)

  const canvas = renderer.domElement
  canvas.style.display = 'block'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  host.appendChild(canvas)

  const layout = () => {
    const width = host.clientWidth || window.innerWidth
    const height = host.clientHeight || window.innerHeight
    const aspect = width / Math.max(1, height)
    camera.top = VIEW_HEIGHT * 0.5
    camera.bottom = -camera.top
    camera.right = camera.top * aspect
    camera.left = -camera.right
    camera.updateProjectionMatrix()
    plane.scale.set(VIEW_HEIGHT * aspect, VIEW_HEIGHT, 1)
    renderer.setSize(width, height, false)
  }

  layout()

  let frame = 0
  const loop = () => {
    frame = requestAnimationFrame(loop)
    renderer.render(scene, camera)
  }
  frame = requestAnimationFrame(loop)

  const setPointerNdc = (ndcX: number, ndcY: number) => {
    setLightFromNdc(camera, ndcX, ndcY)
  }

  const setPointer = (clientX: number, clientY: number) => {
    const width = host.clientWidth || window.innerWidth
    const height = host.clientHeight || window.innerHeight
    setPointerNdc((clientX / width) * 2 - 1, -((clientY / height) * 2 - 1))
  }

  const onResize = () => layout()
  window.addEventListener('resize', onResize)

  return {
    canvas,
    setPointer,
    setPointerNdc,
    resize: layout,
    dispose: () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
      renderer.setAnimationLoop(null)
      plane.geometry.dispose()
      ;(plane.material as { dispose?: () => void }).dispose?.()
      renderer.dispose()
      canvas.remove()
    },
  }
}
