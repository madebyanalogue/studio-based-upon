import { texture } from 'three/tsl'
import { SRGBColorSpace, Texture, TextureLoader } from 'three/webgpu'
import { setDepthImage } from './depth-map'

export const mapNode = texture(new Texture())
export const depthNode = texture(new Texture())

const loader = new TextureLoader()

async function setMap(url: string) {
  const map = await loader.loadAsync(url)
  map.colorSpace = SRGBColorSpace
  mapNode.value.dispose()
  mapNode.value = map
}

async function setDepth(url: string) {
  const map = await loader.loadAsync(url)
  depthNode.value.dispose()
  depthNode.value = map
  setDepthImage(map.image as CanvasImageSource)
}

export function setupTextures({ map, depth }: { map: string; depth: string }) {
  return Promise.all([setMap(map), setDepth(depth)])
}
