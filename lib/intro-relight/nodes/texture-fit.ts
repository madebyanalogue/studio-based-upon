import { Fn, screenSize, screenUV, uniform, vec2 } from 'three/tsl'
import { mapNode } from '../textures'

/** 1 = cover. Lower zooms in (0.5 ≈ 2×). */
export const uCoverZoom = uniform(0.5)

export const coverScaleNode = Fn(() => {
  const viewAspect = screenSize.x.div(screenSize.y).toVar()
  const mapSize = vec2(mapNode.size()).toVar()
  const imageAspect = mapSize.x.div(mapSize.y).toVar()

  return imageAspect
    .greaterThan(viewAspect)
    .select(
      vec2(viewAspect.div(imageAspect), 1),
      vec2(1, imageAspect.div(viewAspect)),
    )
    .mul(uCoverZoom)
})

export const coverUv = Fn(() =>
  screenUV.flipY().sub(0.5).mul(coverScaleNode()).add(0.5),
)
