import {
  cameraFar,
  cameraNear,
  positionView,
  viewZToOrthographicDepth,
} from 'three/tsl'
import { Mesh, MeshPhongNodeMaterial, PlaneGeometry } from 'three/webgpu'
import { diffuseNode } from './nodes/diffuse'
import { normalNode, uDisplacementScale } from './nodes/normal'
import { shadowNode } from './nodes/shadow'
import { coverUv } from './nodes/texture-fit'
import { depthNode } from './textures'

export function createPlane() {
  const vUv = coverUv()
  const depth = depthNode.sample(vUv).r

  const material = new MeshPhongNodeMaterial({ specular: 0x000000 })
  material.colorNode = diffuseNode(vUv, depth)
  material.normalNode = normalNode(vUv)
  material.aoNode = shadowNode(vUv, depth)
  material.depthNode = viewZToOrthographicDepth(
    positionView.z.add(depth.sub(1).mul(uDisplacementScale)),
    cameraNear,
    cameraFar,
  )

  return new Mesh(new PlaneGeometry(1, 1), material)
}
