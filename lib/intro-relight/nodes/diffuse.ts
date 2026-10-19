import { Fn, step, uniform } from 'three/tsl'
import { mapNode } from '../textures'

/** Keep at 0 so a sparse height map does not punch holes in the colour plate. */
const uDepthThreshold = uniform(0)

export const diffuseNode = Fn(([vUv, depth]: [any, any]) =>
  mapNode.sample(vUv).rgb.mul(step(uDepthThreshold, depth)),
)
