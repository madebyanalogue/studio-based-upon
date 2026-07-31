import * as THREE from 'three'
import { CHUNK_SIZE, ITEMS_PER_CHUNK } from './constants'
import { hashString, seededRandom } from './math'
import type { PlaneData } from './types'

const MAX_PLANE_CACHE = 256
const planeCache = new Map<string, PlaneData[]>()

const touchPlaneCache = (key: string) => {
  const v = planeCache.get(key)
  if (!v) return
  planeCache.delete(key)
  planeCache.set(key, v)
}

const evictPlaneCache = () => {
  while (planeCache.size > MAX_PLANE_CACHE) {
    const firstKey = planeCache.keys().next().value as string | undefined
    if (!firstKey) break
    planeCache.delete(firstKey)
  }
}

export const clearPlaneCache = () => {
  planeCache.clear()
}

export const generateChunkPlanes = (
  cx: number,
  cy: number,
  cz: number,
  layoutSeed = 0,
): PlaneData[] => {
  const planes: PlaneData[] = []
  const seed = hashString(`${layoutSeed}:${cx},${cy},${cz}`)

  for (let i = 0; i < ITEMS_PER_CHUNK; i++) {
    const s = seed + i * 1000
    const r = (n: number) => seededRandom(s + n)
    const size = 12 + r(4) * 8

    planes.push({
      id: `${layoutSeed}-${cx}-${cy}-${cz}-${i}`,
      position: new THREE.Vector3(
        cx * CHUNK_SIZE + r(0) * CHUNK_SIZE,
        cy * CHUNK_SIZE + r(1) * CHUNK_SIZE,
        cz * CHUNK_SIZE + r(2) * CHUNK_SIZE,
      ),
      scale: new THREE.Vector3(size, size, 1),
      mediaIndex: Math.floor(r(5) * 1_000_000),
    })
  }

  return planes
}

export const generateChunkPlanesCached = (
  cx: number,
  cy: number,
  cz: number,
  layoutSeed = 0,
): PlaneData[] => {
  const key = `${layoutSeed}:${ITEMS_PER_CHUNK}:${cx},${cy},${cz}`
  const cached = planeCache.get(key)
  if (cached) {
    touchPlaneCache(key)
    return cached
  }

  const planes = generateChunkPlanes(cx, cy, cz, layoutSeed)
  planeCache.set(key, planes)
  evictPlaneCache()
  return planes
}

export const getChunkUpdateThrottleMs = (isZooming: boolean, zoomSpeed: number): number => {
  if (zoomSpeed > 1.0) return 500
  if (isZooming) return 400
  return 100
}

export const shouldThrottleUpdate = (
  lastUpdateTime: number,
  throttleMs: number,
  currentTime: number,
): boolean => currentTime - lastUpdateTime >= throttleMs
