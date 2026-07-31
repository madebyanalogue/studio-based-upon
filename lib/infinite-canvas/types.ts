import type * as THREE from 'three'

export type DiscoveryMediaItem = {
  url: string
  width: number
  height: number
  slug: string
  title: string
  productId: string
}

export type PlaneData = {
  id: string
  position: THREE.Vector3
  scale: THREE.Vector3
  mediaIndex: number
}

export type CameraGridState = {
  cx: number
  cy: number
  cz: number
  camZ: number
}

export type InfiniteCanvasSelectPayload = {
  slug: string
  title: string
  productId: string
  url: string
  clientX: number
  clientY: number
  /** Projected screen rect of the clicked plane — used as GSAP Flip source. */
  screenRect: {
    left: number
    top: number
    width: number
    height: number
  }
}
