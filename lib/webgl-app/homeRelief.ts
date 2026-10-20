import * as THREE from 'three'

const VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vPos;
varying vec3 vEye;
varying float vExtrude;
uniform sampler2D tFlow;
uniform vec2 uMouse;
uniform float uAspect;

float blob(vec2 mouse, vec2 screen) {
  vec2 delta = screen - mouse;
  delta.x *= uAspect;
  return smoothstep(0.19, 0.0, length(delta));
}

void main() {
  vUv = uv;
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vec2 screen = clip.xy / clip.w * 0.5 + 0.5;
  vec4 flow = texture2D(tFlow, screen);
  float extrude = max(blob(uMouse, screen), clamp(mix(flow.b, flow.a, 0.5) * 2.0, 0.0, 1.0));
  vec3 displaced = position;
  displaced.z *= mix(0.05, 1.35, extrude);
  vec4 world = modelMatrix * vec4(displaced, 1.0);
  vPos = displaced;
  vEye = world.xyz - cameraPosition;
  vExtrude = extrude;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying vec3 vPos;
varying vec3 vEye;
varying float vExtrude;
uniform sampler2D tFlow;
uniform sampler2D tBake1;
uniform sampler2D tBake2;
uniform sampler2D tPlaster;
uniform vec2 uResolution;
uniform vec3 uGround;
uniform float uDark;
uniform float uPlaster;
uniform float uWake;

vec3 hsv2rgb(vec3 c) {
  vec4 k = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + k.xyz) * 6.0 - k.www);
  return c.z * mix(k.xxx, clamp(p - k.xxx, 0.0, 1.0), c.y);
}

vec3 rgb2hsv(vec3 c) {
  vec4 k = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, k.wz), vec4(c.gb, k.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

float toSrgb(float c) {
  return c <= 0.0031308 ? c * 12.92 : pow(c, 0.41666) * 1.055 - 0.055;
}

void main() {
  vec2 screen = gl_FragCoord.xy / uResolution;
  vec4 flow = texture2D(tFlow, screen);
  float extrude = max(vExtrude, clamp(mix(flow.b, flow.a, 0.5) * 2.0, 0.0, 1.0));

  vec3 bake1 = vec3(toSrgb(texture2D(tBake1, vUv).r), toSrgb(texture2D(tBake1, vUv).g), toSrgb(texture2D(tBake1, vUv).b));
  vec3 bake2 = vec3(toSrgb(texture2D(tBake2, vUv).r), toSrgb(texture2D(tBake2, vUv).g), toSrgb(texture2D(tBake2, vUv).b));
  float level = 0.545;
  level = mix(level, bake2.g, smoothstep(0.0, 0.2, extrude));
  level = mix(level, bake2.r, smoothstep(0.2, 0.4, extrude));
  level = mix(level, bake1.b, smoothstep(0.4, 0.6, extrude));
  level = mix(level, bake1.g, smoothstep(0.6, 0.8, extrude));
  level = mix(level, bake1.r, smoothstep(0.8, 1.0, extrude));

  vec3 plasterColor = vec3(level);
  float grain = texture2D(tPlaster, vPos.xy / 10.0).g;
  plasterColor = mix(plasterColor, plasterColor * grain, uPlaster);
  float gradient = mix(1.0, 0.5, length(screen - vec2(0.0, 0.8)));
  plasterColor += gradient * 0.12;
  plasterColor = plasterColor * 0.6 + 0.4;
  float luma = dot(plasterColor, vec3(0.299, 0.587, 0.114));
  float shade = clamp((luma - 0.73) * 0.28, -0.045, 0.08);
  vec3 relief = uGround + vec3(shade);

  vec3 n = normalize(cross(dFdx(vEye), dFdy(vEye)));
  vec3 tilted = normalize(vec3(n.xy, n.z * 2.0));
  vec3 hue = rgb2hsv(clamp(tilted * 0.5 + 0.5, 0.0, 1.0));
  hue.x = fract(hue.x - 0.52);
  hue.y *= 0.28;
  vec3 effect = hsv2rgb(hue);

  float facing = abs(dot(normalize(n), vec3(0.0, 0.0, 1.0)));
  float fluidEdges = smoothstep(0.0, 1.0, flow.b * 0.15);
  float fres = 1.0 - pow(clamp(1.0 - facing, 0.0, 1.0), 35.0);
  float ridge = smoothstep(1.0, 0.1, mix(fres, 1.0, 0.02));
  float carved = smoothstep(0.42, 0.2, bake1.r) * 0.25;
  float mask = max(ridge, carved) * fluidEdges;
  relief = mix(relief, effect, mask * 0.22 * uWake);

  float reveal = smoothstep(0.02, 0.35, extrude);
  gl_FragColor = vec4(mix(uGround, relief, reveal), 1.0);
}
`

const BACK_FRAG = /* glsl */ `
precision highp float;
varying vec3 vWorld;
uniform vec3 uGround;

void main() {
  gl_FragColor = vec4(uGround, 1.0);
}
`

const BACK_VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const FLOW_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tMap;
uniform sampler2D tNoise;
uniform float uFalloff;
uniform float uAlpha;
uniform float uDissipation;
uniform float uAspect;
uniform float uTime;
uniform float uOffset;
uniform vec2 uMouse;
uniform vec2 uVelocity;
uniform vec2 uMouse2;
uniform vec2 uVelocity2;
varying vec2 vUv;

vec4 stamp(vec2 velocity, vec2 mouse) {
  vec2 cursor = vUv - mouse;
  cursor.x *= uAspect;
  velocity *= 12.0;
  float magnitude = 1.0 - pow(1.0 - min(1.0, length(velocity)), 2.0);
  float falloff = smoothstep(uFalloff, 0.0, length(cursor)) * uAlpha;
  return vec4(velocity, magnitude, 1.0) * falloff;
}

void main() {
  vec2 uv = vUv;
  vec4 data = texture2D(tMap, uv);
  float friction = (1.0 / uDissipation) - 1.0;
  data *= 1.0 / (1.0 + friction);
  data += stamp(uVelocity, uMouse);
  vec4 trail = stamp(uVelocity2, uMouse2);
  trail.a = trail.b;
  trail.rg *= 0.25;
  data += trail * 0.65;
  data = clamp(data, vec4(-1.0), vec4(1.0));
  gl_FragColor = data;
}
`

const FLOW_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

function noiseTexture() {
  const size = 128
  const pixels = new Uint8Array(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4] = Math.random() * 255
    pixels[i * 4 + 1] = Math.random() * 255
    pixels[i * 4 + 2] = Math.random() * 255
    pixels[i * 4 + 3] = 255
  }
  const texture = new THREE.DataTexture(pixels, size, size)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.NoColorSpace
  texture.needsUpdate = true
  return texture
}

export function createHomeRelief(renderer: THREE.WebGLRenderer) {
  const noise = noiseTexture()
  const blank = new THREE.DataTexture(new Uint8Array([180, 180, 180, 255]), 1, 1)
  blank.needsUpdate = true
  blank.colorSpace = THREE.NoColorSpace

  const makeTarget = () => new THREE.WebGLRenderTarget(768, 768, {
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
  })

  let read = makeTarget()
  let write = makeTarget()
  const flowScene = new THREE.Scene()
  const flowCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const flowUniforms = {
    tMap: { value: read.texture },
    tNoise: { value: noise },
    uFalloff: { value: 0.19 },
    uAlpha: { value: 1 },
    uDissipation: { value: 0.968 },
    uAspect: { value: 1 },
    uTime: { value: 0 },
    uOffset: { value: 0 },
    uMouse: { value: new THREE.Vector2(-1, -1) },
    uVelocity: { value: new THREE.Vector2() },
    uMouse2: { value: new THREE.Vector2(-1, -1) },
    uVelocity2: { value: new THREE.Vector2() },
  }
  const flowMaterial = new THREE.ShaderMaterial({
    uniforms: flowUniforms,
    vertexShader: FLOW_VERT,
    fragmentShader: FLOW_FRAG,
    depthTest: false,
    depthWrite: false,
  })
  flowScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), flowMaterial))

  const clear = new THREE.Color(0, 0, 0)
  const previous = renderer.getClearColor(new THREE.Color())
  const previousAlpha = renderer.getClearAlpha()
  renderer.setClearColor(clear, 0)
  renderer.setRenderTarget(read)
  renderer.clear()
  renderer.setRenderTarget(write)
  renderer.clear()
  renderer.setRenderTarget(null)
  renderer.setClearColor(previous, previousAlpha)

  const materials: THREE.ShaderMaterial[] = []
  const pointer = new THREE.Vector2(-1, -1)
  const velocity = new THREE.Vector2()
  /** Optional second brush (e.g. ghost cursor) — when active, replaces the lagged trail stamp. */
  const ghost = new THREE.Vector2(-1, -1)
  const ghostVelocity = new THREE.Vector2()
  const eased = new THREE.Vector2(-1, -1)
  const lagged = new THREE.Vector2(-1, -1)
  const easedGhost = new THREE.Vector2(-1, -1)
  const layers = { plaster: 1, wake: 1 }
  let fastScroll = 0
  let screenScroll = 0
  let aspect = 1

  const background = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 70),
    new THREE.ShaderMaterial({
      uniforms: {
        tPlaster: { value: blank },
        uGround: { value: new THREE.Color(0x1b1b1b) },
      },
      vertexShader: BACK_VERT,
      fragmentShader: BACK_FRAG,
      depthWrite: false,
    }),
  )
  background.renderOrder = -1
  background.frustumCulled = false

  const assign = (mesh: THREE.Mesh, plaster: THREE.Texture | null) => {
    const source = mesh.material as THREE.MeshStandardMaterial
    const bake1 = source.map
    const bake2 = source.emissiveMap
    if (bake1) bake1.colorSpace = THREE.NoColorSpace
    if (bake2) bake2.colorSpace = THREE.NoColorSpace
    if (!materials.length && plaster) {
      plaster.colorSpace = THREE.NoColorSpace
      plaster.wrapS = THREE.RepeatWrapping
      plaster.wrapT = THREE.RepeatWrapping
      ;(background.material as THREE.ShaderMaterial).uniforms.tPlaster.value = plaster
    }
    const material = new THREE.ShaderMaterial({
      uniforms: {
        tFlow: { value: read.texture },
        tBake1: { value: bake1 },
        tBake2: { value: bake2 },
        tPlaster: { value: plaster ?? blank },
        tNoise: { value: noise },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uFastScroll: { value: 0 },
        uScreenScroll: { value: 0 },
        uPlaster: { value: 1 },
        uWake: { value: 1 },
        uGround: { value: new THREE.Color(0x1b1b1b) },
        uDark: { value: 1 },
        uMouse: { value: new THREE.Vector2(-1, -1) },
        uMouse2: { value: new THREE.Vector2(-1, -1) },
        uAspect: { value: 1 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.DoubleSide,
      extensions: { derivatives: true },
    })
    materials.push(material)
    mesh.material = material
    mesh.frustumCulled = false
  }

  const resize = (width: number, height: number) => {
    aspect = width / Math.max(1, height)
    const resolution = new THREE.Vector2(
      Math.floor(width * renderer.getPixelRatio()),
      Math.floor(height * renderer.getPixelRatio()),
    )
    for (const material of materials) material.uniforms.uResolution.value.copy(resolution)
  }

  const update = (time: number, scrollDelta: number) => {
    if (eased.x < -0.5) {
      eased.copy(pointer)
      lagged.copy(pointer)
    } else {
      eased.lerp(pointer, 0.4)
      lagged.lerp(eased, 0.12)
    }
    const ghostOn = ghost.x > -0.5
    if (ghostOn) {
      if (easedGhost.x < -0.5) easedGhost.copy(ghost)
      else easedGhost.lerp(ghost, 0.45)
    } else {
      easedGhost.set(-1, -1)
    }
    flowUniforms.uMouse.value.copy(eased)
    flowUniforms.uVelocity.value.copy(velocity)
    velocity.multiplyScalar(0.8)
    if (ghostOn) {
      flowUniforms.uMouse2.value.copy(easedGhost)
      flowUniforms.uVelocity2.value.copy(ghostVelocity)
      ghostVelocity.multiplyScalar(0.8)
    } else {
      flowUniforms.uMouse2.value.copy(lagged)
      flowUniforms.uVelocity2.value.copy(eased).sub(lagged).multiplyScalar(0.35)
    }
    flowUniforms.uAspect.value = aspect
    flowUniforms.uTime.value = time
    screenScroll += scrollDelta
    flowUniforms.uOffset.value = scrollDelta
    const rushing = Math.min(1, Math.abs(scrollDelta) * 18)
    fastScroll += (rushing - fastScroll) * 0.08

    const current = renderer.getRenderTarget()
    renderer.setRenderTarget(write)
    renderer.render(flowScene, flowCamera)
    renderer.setRenderTarget(current)
    const swap = read
    read = write
    write = swap
    flowUniforms.tMap.value = read.texture

    for (const material of materials) {
      material.uniforms.tFlow.value = read.texture
      material.uniforms.uTime.value = time
      material.uniforms.uFastScroll.value = fastScroll
      material.uniforms.uScreenScroll.value = screenScroll
      material.uniforms.uPlaster.value = layers.plaster
      material.uniforms.uWake.value = layers.wake
      material.uniforms.uMouse.value.copy(eased)
      material.uniforms.uMouse2.value.copy(ghostOn ? easedGhost : lagged)
      material.uniforms.uAspect.value = aspect
    }
  }

  const placeBackground = (x: number, y: number) => {
    background.position.set(x, y, -0.6)
  }

  const setTheme = (color: THREE.Color, dark: number) => {
    const back = background.material as THREE.ShaderMaterial
    ;(back.uniforms.uGround.value as THREE.Color).copy(color)
    for (const material of materials) {
      ;(material.uniforms.uGround.value as THREE.Color).copy(color)
      material.uniforms.uDark.value = dark
    }
  }

  const dispose = () => {
    read.dispose()
    write.dispose()
    noise.dispose()
    blank.dispose()
    flowMaterial.dispose()
    ;(background.material as THREE.ShaderMaterial).dispose()
    background.geometry.dispose()
    for (const material of materials) material.dispose()
  }

  return {
    background,
    assign,
    resize,
    update,
    placeBackground,
    setTheme,
    pointer,
    velocity,
    ghost,
    ghostVelocity,
    layers,
    dispose,
  }
}
