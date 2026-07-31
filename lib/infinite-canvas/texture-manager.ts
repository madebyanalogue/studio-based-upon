import * as THREE from 'three'
import type { DiscoveryMediaItem } from './types'

const textureCache = new Map<string, THREE.Texture>()
const loadCallbacks = new Map<string, Set<(tex: THREE.Texture) => void>>()
const loader = new THREE.TextureLoader()
loader.setCrossOrigin('anonymous')

let loadedCount = 0
let requestedCount = 0
let progressCallback: ((progress: number) => void) | null = null

const isTextureLoaded = (tex: THREE.Texture): boolean => {
  const img = tex.image as HTMLImageElement | undefined
  return img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0
}

const bumpProgress = () => {
  if (!progressCallback || requestedCount === 0) return
  progressCallback(Math.min(100, Math.round((loadedCount / requestedCount) * 100)))
}

export const setTextureProgressCallback = (cb: ((progress: number) => void) | null) => {
  progressCallback = cb
}

export const getTexture = (
  item: DiscoveryMediaItem,
  onLoad?: (texture: THREE.Texture) => void,
): THREE.Texture => {
  const key = item.url
  const existing = textureCache.get(key)

  if (existing) {
    if (onLoad) {
      if (isTextureLoaded(existing)) onLoad(existing)
      else loadCallbacks.get(key)?.add(onLoad)
    }
    return existing
  }

  requestedCount += 1
  bumpProgress()

  const callbacks = new Set<(tex: THREE.Texture) => void>()
  if (onLoad) callbacks.add(onLoad)
  loadCallbacks.set(key, callbacks)

  const texture = loader.load(
    key,
    (tex) => {
      tex.minFilter = THREE.LinearMipmapLinearFilter
      tex.magFilter = THREE.LinearFilter
      tex.generateMipmaps = true
      tex.anisotropy = 4
      tex.colorSpace = THREE.SRGBColorSpace
      tex.needsUpdate = true

      loadedCount += 1
      bumpProgress()

      loadCallbacks.get(key)?.forEach((cb) => {
        try {
          cb(tex)
        } catch {
          /* ignore callback errors */
        }
      })
      loadCallbacks.delete(key)
    },
    undefined,
    () => {
      loadedCount += 1
      bumpProgress()
      loadCallbacks.delete(key)
    },
  )

  textureCache.set(key, texture)
  return texture
}
