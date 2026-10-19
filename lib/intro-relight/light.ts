import { uniform } from 'three/tsl'
import { AmbientLight, PointLight, type OrthographicCamera, type Scene } from 'three/webgpu'

const MAX_DECAY = 4

export const pointLight = new PointLight('#ffd4a8', 4.2, 0, 2.2)
pointLight.position.set(0.4, 0.2, 1.1)

export const ambientLight = new AmbientLight('#ffffff', 0.06)

export const uLightPosition = uniform(pointLight.position)

export function setupLight(scene: Scene, _camera: OrthographicCamera) {
  scene.add(pointLight, ambientLight)
}

export function setLightFromNdc(
  camera: OrthographicCamera,
  ndcX: number,
  ndcY: number,
) {
  pointLight.position.x = ndcX * camera.right
  pointLight.position.y = ndcY * camera.top
}

export function setLightDecayFromRadius(radius: number) {
  pointLight.decay = MAX_DECAY - radius
}
