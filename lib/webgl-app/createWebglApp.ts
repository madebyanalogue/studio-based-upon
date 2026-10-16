import * as THREE from 'three'

/**
 * Screen-space WebGL layer.
 *
 * Layout stays in the DOM. Any element with [data-webgl] is drawn on the
 * shared canvas and hidden once its texture is ready.
 *
 * data-webgl-src    image url (otherwise an <img>/<video> src, or a <canvas>)
 * data-webgl-depth  optional grayscale map — brighter areas distort more
 */

const VELOCITY_DISSIPATION = 0.985
const PRESSURE_ITERATIONS = 16
const CURL_STRENGTH = 0.55
const MOUSE_RADIUS = 0.0024
const MOUSE_FORCE = 9
const SCROLL_RADIUS = 0.06
const SCROLL_FORCE = 1.6
const DISTORT = 0.85
const SIM_SCALE = 0.28

const FULLSCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const SPLAT_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tTarget;
uniform vec2 uPoint;
uniform vec2 uForce;
uniform float uRadius;
uniform float uAspect;
void main() {
  vec2 p = vUv - uPoint;
  p.x *= uAspect;
  float splat = exp(-dot(p, p) / uRadius);
  vec2 base = texture2D(tTarget, vUv).xy;
  gl_FragColor = vec4(base + uForce * splat, 0.0, 1.0);
}
`

const ADVECT_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tVelocity;
uniform float uDt;
uniform float uDissipation;
void main() {
  vec2 vel = texture2D(tVelocity, vUv).xy;
  vec2 coord = clamp(vUv - uDt * vel, 0.0, 1.0);
  vec2 next = texture2D(tVelocity, coord).xy * uDissipation;
  next = clamp(next, -2.0, 2.0);
  gl_FragColor = vec4(next, 0.0, 1.0);
}
`

const CURL_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tVelocity;
uniform vec2 uTexel;
void main() {
  float left = texture2D(tVelocity, vUv - vec2(uTexel.x, 0.0)).y;
  float right = texture2D(tVelocity, vUv + vec2(uTexel.x, 0.0)).y;
  float bottom = texture2D(tVelocity, vUv - vec2(0.0, uTexel.y)).x;
  float top = texture2D(tVelocity, vUv + vec2(0.0, uTexel.y)).x;
  float curl = (right - left) - (top - bottom);
  gl_FragColor = vec4(curl, 0.0, 0.0, 1.0);
}
`

const VORTICITY_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tVelocity;
uniform sampler2D tCurl;
uniform vec2 uTexel;
uniform float uCurl;
uniform float uDt;
void main() {
  float left = texture2D(tCurl, vUv - vec2(uTexel.x, 0.0)).x;
  float right = texture2D(tCurl, vUv + vec2(uTexel.x, 0.0)).x;
  float bottom = texture2D(tCurl, vUv - vec2(0.0, uTexel.y)).x;
  float top = texture2D(tCurl, vUv + vec2(0.0, uTexel.y)).x;
  vec2 grad = vec2(right - left, top - bottom) * 0.5;
  float len = max(length(grad), 1e-5);
  grad /= len;
  float curl = texture2D(tCurl, vUv).x;
  vec2 force = vec2(grad.y, -grad.x) * curl * uCurl;
  vec2 vel = texture2D(tVelocity, vUv).xy + force * uDt;
  gl_FragColor = vec4(vel, 0.0, 1.0);
}
`

const DIVERGENCE_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tVelocity;
uniform vec2 uTexel;
void main() {
  float left = texture2D(tVelocity, vUv - vec2(uTexel.x, 0.0)).x;
  float right = texture2D(tVelocity, vUv + vec2(uTexel.x, 0.0)).x;
  float bottom = texture2D(tVelocity, vUv - vec2(0.0, uTexel.y)).y;
  float top = texture2D(tVelocity, vUv + vec2(0.0, uTexel.y)).y;
  float div = 0.5 * (right - left + top - bottom);
  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}
`

const PRESSURE_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tPressure;
uniform sampler2D tDivergence;
uniform vec2 uTexel;
void main() {
  float left = texture2D(tPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float right = texture2D(tPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float bottom = texture2D(tPressure, vUv - vec2(0.0, uTexel.y)).x;
  float top = texture2D(tPressure, vUv + vec2(0.0, uTexel.y)).x;
  float div = texture2D(tDivergence, vUv).x;
  float pressure = (left + right + bottom + top - div) * 0.25;
  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}
`

const GRADIENT_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tPressure;
uniform sampler2D tVelocity;
uniform vec2 uTexel;
void main() {
  float left = texture2D(tPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float right = texture2D(tPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float bottom = texture2D(tPressure, vUv - vec2(0.0, uTexel.y)).x;
  float top = texture2D(tPressure, vUv + vec2(0.0, uTexel.y)).x;
  vec2 vel = texture2D(tVelocity, vUv).xy;
  vel -= vec2(right - left, top - bottom) * 0.5;
  gl_FragColor = vec4(vel, 0.0, 1.0);
}
`

const PLANE_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const PLANE_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tMap;
uniform sampler2D tFlow;
uniform sampler2D tDepth;
uniform float uHasDepth;
uniform float uProcedural;
uniform float uScroll;
uniform float uTime;
uniform vec2 uResolution;
uniform float uStrength;
uniform vec4 uCover;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p *= 2.03;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 screenUv = gl_FragCoord.xy / uResolution;
  vec2 flow = texture2D(tFlow, screenUv).xy;
  if (uProcedural > 0.5) {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 uv = vec2(vUv.x * aspect, vUv.y);
    uv.y += uScroll * 0.42;
    uv += vec2(uTime * 0.008, 0.0);
    uv -= flow * uStrength;
    float broad = fbm(uv * 1.6);
    float grain = fbm(uv * 6.5 + broad);
    vec3 hi = vec3(0.910, 0.902, 0.882);
    vec3 mid = vec3(0.769, 0.749, 0.714);
    vec3 lo = vec3(0.612, 0.576, 0.534);
    vec3 color = mix(hi, mid, smoothstep(0.22, 0.72, broad));
    color = mix(color, lo, smoothstep(0.48, 0.9, grain) * 0.55);
    gl_FragColor = vec4(color, 1.0);
    return;
  }
  float depth = uHasDepth > 0.5 ? texture2D(tDepth, vUv).r : 1.0;
  vec2 uv = vUv * uCover.xy + uCover.zw;
  uv -= flow * uStrength * mix(0.35, 1.0, depth);
  gl_FragColor = texture2D(tMap, clamp(uv, 0.001, 0.999));
}
`

type Pass = {
  material: THREE.ShaderMaterial
  scene: THREE.Scene
  camera: THREE.Camera
}

type PlaneRecord = {
  el: HTMLElement
  mesh: THREE.Mesh
  texture: THREE.Texture | null
  depth: THREE.Texture | null
  hover: number
  live: boolean
  fullscreen: boolean
}

type Cover = {
  sx: number
  sy: number
  ox: number
  oy: number
}

function renderTarget(width: number, height: number) {
  return new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
  })
}

function fullscreenPass(fragment: string, uniforms: Record<string, THREE.IUniform>) {
  const material = new THREE.ShaderMaterial({
    vertexShader: FULLSCREEN_VERT,
    fragmentShader: fragment,
    uniforms,
    depthTest: false,
    depthWrite: false,
  })
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material))
  return { material, scene, camera } satisfies Pass
}

function sourceUrl(el: HTMLElement) {
  const explicit = el.dataset.webglSrc
  if (explicit) return explicit
  if (el instanceof HTMLImageElement) return el.currentSrc || el.src
  if (el instanceof HTMLVideoElement) return el.currentSrc || el.src
  return ''
}

function coverFor(el: HTMLElement, image: { width: number; height: number }): Cover {
  const fit = getComputedStyle(el).objectFit
  if (fit !== 'cover' && fit !== 'contain') {
    return { sx: 1, sy: 1, ox: 0, oy: 0 }
  }
  const rect = el.getBoundingClientRect()
  const elAspect = rect.width / Math.max(rect.height, 1)
  const imageAspect = image.width / Math.max(image.height, 1)
  if (!elAspect || !imageAspect) return { sx: 1, sy: 1, ox: 0, oy: 0 }

  const imageWider = imageAspect > elAspect
  const crop = fit === 'cover'
  if (crop ? imageWider : !imageWider) {
    const sx = elAspect / imageAspect
    return { sx, sy: 1, ox: (1 - sx) / 2, oy: 0 }
  }
  const sy = imageAspect / elAspect
  return { sx: 1, sy, ox: 0, oy: (1 - sy) / 2 }
}

function prepareTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.NoColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

function loadImageTexture(url: string) {
  const loader = new THREE.TextureLoader()
  loader.setCrossOrigin('anonymous')
  return new Promise<THREE.Texture>((resolve, reject) => {
    loader.load(url, (texture) => resolve(prepareTexture(texture)), undefined, reject)
  })
}

export function createWebglApp(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: 'high-performance',
    premultipliedAlpha: false,
  })
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace
  renderer.setClearColor(0x000000, 0)
  renderer.autoClear = false
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(0, 1, 0, 1, -10, 10)
  const planes = new Map<HTMLElement, PlaneRecord>()
  const geometry = new THREE.PlaneGeometry(1, 1)

  const flowUniform = { value: null as THREE.Texture | null }
  const resolution = { value: new THREE.Vector2(1, 1) }
  const stretch = { value: 1 }
  const deform = { value: 0 }
  const scrollShift = { value: 0 }
  const elapsed = { value: 0 }

  let velocity = pair(32, 32)
  let pressure = pair(32, 32)
  let divergence = renderTarget(32, 32)
  let curl = renderTarget(32, 32)
  let simWidth = 32
  let simHeight = 32
  const texel = new THREE.Vector2(1 / 32, 1 / 32)

  const splat = fullscreenPass(SPLAT_FRAG, {
    tTarget: { value: null },
    uPoint: { value: new THREE.Vector2() },
    uForce: { value: new THREE.Vector2() },
    uRadius: { value: MOUSE_RADIUS },
    uAspect: { value: 1 },
  })
  const advect = fullscreenPass(ADVECT_FRAG, {
    tVelocity: { value: null },
    uDt: { value: 0.016 },
    uDissipation: { value: VELOCITY_DISSIPATION },
  })
  const curlPass = fullscreenPass(CURL_FRAG, {
    tVelocity: { value: null },
    uTexel: { value: texel },
  })
  const vorticity = fullscreenPass(VORTICITY_FRAG, {
    tVelocity: { value: null },
    tCurl: { value: null },
    uTexel: { value: texel },
    uCurl: { value: CURL_STRENGTH },
    uDt: { value: 0.016 },
  })
  const divergencePass = fullscreenPass(DIVERGENCE_FRAG, {
    tVelocity: { value: null },
    uTexel: { value: texel },
  })
  const pressurePass = fullscreenPass(PRESSURE_FRAG, {
    tPressure: { value: null },
    tDivergence: { value: null },
    uTexel: { value: texel },
  })
  const gradient = fullscreenPass(GRADIENT_FRAG, {
    tPressure: { value: null },
    tVelocity: { value: null },
    uTexel: { value: texel },
  })

  const pointer = {
    x: 0.5,
    y: 0.5,
    dx: 0,
    dy: 0,
    clientX: 0,
    clientY: 0,
    inside: false,
  }
  let scrollY = window.scrollY
  let scrollDelta = 0
  let stretchTargetSpeed = 0
  let lastTime = 0
  let running = true
  let frame = 0
  let width = 1
  let height = 1

  function pair(w: number, h: number) {
    return { read: renderTarget(w, h), write: renderTarget(w, h) }
  }

  function swap(buffer: { read: THREE.WebGLRenderTarget; write: THREE.WebGLRenderTarget }) {
    const next = buffer.read
    buffer.read = buffer.write
    buffer.write = next
  }

  function draw(pass: Pass, target: THREE.WebGLRenderTarget | null) {
    renderer.setRenderTarget(target)
    renderer.render(pass.scene, pass.camera)
  }

  function resizeSim(w: number, h: number) {
    const nextW = Math.max(48, Math.round(w * SIM_SCALE))
    const nextH = Math.max(48, Math.round(h * SIM_SCALE))
    if (nextW === simWidth && nextH === simHeight) return
    velocity.read.dispose()
    velocity.write.dispose()
    pressure.read.dispose()
    pressure.write.dispose()
    divergence.dispose()
    curl.dispose()
    simWidth = nextW
    simHeight = nextH
    velocity = pair(nextW, nextH)
    pressure = pair(nextW, nextH)
    divergence = renderTarget(nextW, nextH)
    curl = renderTarget(nextW, nextH)
    texel.set(1 / nextW, 1 / nextH)
    flowUniform.value = velocity.read.texture
  }

  function resize() {
    width = Math.max(1, canvas.clientWidth)
    height = Math.max(1, canvas.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    renderer.setSize(width, height, false)
    camera.left = -width / 2
    camera.right = width / 2
    camera.top = height / 2
    camera.bottom = -height / 2
    camera.position.set(0, 0, 10)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    renderer.getDrawingBufferSize(resolution.value)
    splat.material.uniforms.uAspect!.value = width / height
    resizeSim(width, height)
  }

  function splatAt(x: number, y: number, fx: number, fy: number, radius: number) {
    const uniforms = splat.material.uniforms
    uniforms.tTarget!.value = velocity.read.texture
    ;(uniforms.uPoint!.value as THREE.Vector2).set(x, y)
    ;(uniforms.uForce!.value as THREE.Vector2).set(fx, fy)
    uniforms.uRadius!.value = radius
    draw(splat, velocity.write)
    swap(velocity)
  }

  function stepFluid(dt: number) {
    if (pointer.inside && (pointer.dx !== 0 || pointer.dy !== 0)) {
      splatAt(pointer.x, pointer.y, pointer.dx * MOUSE_FORCE, pointer.dy * MOUSE_FORCE, MOUSE_RADIUS)
      pointer.dx = 0
      pointer.dy = 0
    }
    if (scrollDelta !== 0) {
      const force = (scrollDelta / height) * SCROLL_FORCE
      splatAt(0.5, 0.5, 0, force, SCROLL_RADIUS)
      scrollDelta = 0
    }

    const speed = Math.min(Math.abs(stretchTargetSpeed), 1)
    stretch.value += (1 + speed * 0.16 - stretch.value) * 0.12
    deform.value += (stretchTargetSpeed * 0.2 - deform.value) * 0.08
    stretchTargetSpeed *= 0.86

    curlPass.material.uniforms.tVelocity!.value = velocity.read.texture
    draw(curlPass, curl)

    vorticity.material.uniforms.tVelocity!.value = velocity.read.texture
    vorticity.material.uniforms.tCurl!.value = curl.texture
    vorticity.material.uniforms.uDt!.value = dt
    draw(vorticity, velocity.write)
    swap(velocity)

    divergencePass.material.uniforms.tVelocity!.value = velocity.read.texture
    draw(divergencePass, divergence)

    renderer.setRenderTarget(pressure.read)
    renderer.clear()
    renderer.setRenderTarget(pressure.write)
    renderer.clear()
    for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
      pressurePass.material.uniforms.tPressure!.value = pressure.read.texture
      pressurePass.material.uniforms.tDivergence!.value = divergence.texture
      draw(pressurePass, pressure.write)
      swap(pressure)
    }

    gradient.material.uniforms.tPressure!.value = pressure.read.texture
    gradient.material.uniforms.tVelocity!.value = velocity.read.texture
    draw(gradient, velocity.write)
    swap(velocity)

    advect.material.uniforms.tVelocity!.value = velocity.read.texture
    advect.material.uniforms.uDt!.value = dt
    draw(advect, velocity.write)
    swap(velocity)

    flowUniform.value = velocity.read.texture
  }

  function syncPlanes() {
    for (const plane of planes.values()) {
      if (!plane.live) continue
      const rect = plane.fullscreen
        ? { left: 0, top: 0, width, height, right: width, bottom: height }
        : plane.el.getBoundingClientRect()
      const visible = rect.bottom > -2 && rect.top < height + 2 && rect.width > 1 && rect.height > 1
      plane.mesh.visible = visible
      if (!visible) continue
      const x = rect.left + rect.width / 2 - width / 2
      const y = height / 2 - (rect.top + rect.height / 2)
      plane.mesh.position.set(x, y, 0)
      plane.mesh.scale.set(rect.width, rect.height, 1)
      if (plane.texture instanceof THREE.CanvasTexture || plane.texture instanceof THREE.VideoTexture) {
        plane.texture.needsUpdate = true
      }
      const image = plane.texture?.image as { width?: number; height?: number } | undefined
      if (image?.width && image.height) {
        const cover = coverFor(plane.el, { width: image.width, height: image.height })
        const uniform = (plane.mesh.material as THREE.ShaderMaterial).uniforms.uCover!
        ;(uniform.value as THREE.Vector4).set(cover.sx, cover.sy, cover.ox, cover.oy)
      }
    }
  }

  function frameLoop(stamp: number) {
    if (!running) return
    frame = requestAnimationFrame(frameLoop)
    if (planes.size === 0) return

    const now = stamp * 0.001
    const dt = Math.min(0.033, Math.max(0.001, lastTime ? now - lastTime : 0.016))
    lastTime = now

    const nextScroll = window.scrollY
    const delta = nextScroll - scrollY
    scrollY = nextScroll
    if (delta !== 0) {
      scrollDelta += delta
      stretchTargetSpeed += THREE.MathUtils.clamp(delta / 28, -1, 1)
    }

    elapsed.value = now
    scrollShift.value = scrollY / Math.max(height, 1)
    stepFluid(dt)
    syncPlanes()

    renderer.setRenderTarget(null)
    renderer.clear()
    renderer.render(scene, camera)
  }

  function onPointerMove(event: PointerEvent) {
    const x = event.clientX / width
    const y = 1 - event.clientY / height
    if (pointer.inside) {
      pointer.dx += x - pointer.x
      pointer.dy += y - pointer.y
    }
    pointer.x = x
    pointer.y = y
    pointer.clientX = event.clientX
    pointer.clientY = event.clientY
    pointer.inside = true
  }

  function onPointerLeave() {
    pointer.inside = false
  }

  function adopt(el: HTMLElement) {
    if (planes.has(el) || el === canvas) return
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({
        vertexShader: PLANE_VERT,
        fragmentShader: PLANE_FRAG,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          tMap: { value: null },
          tFlow: flowUniform,
          tDepth: { value: null },
          uHasDepth: { value: 0 },
          uProcedural: { value: 0 },
          uScroll: scrollShift,
          uTime: elapsed,
          uResolution: resolution,
          uStrength: { value: el.hasAttribute('data-webgl-fullscreen') ? 1.35 : DISTORT },
          uCover: { value: new THREE.Vector4(1, 1, 0, 0) },
        },
      }),
    )
    mesh.frustumCulled = false
    mesh.visible = false
    const record: PlaneRecord = {
      el,
      mesh,
      texture: null,
      depth: null,
      hover: 1,
      live: false,
      fullscreen: el.hasAttribute('data-webgl-fullscreen'),
    }
    planes.set(el, record)
    scene.add(mesh)
    void mountTexture(record)
  }

  async function mountTexture(record: PlaneRecord) {
    const { el, mesh } = record
    const material = mesh.material as THREE.ShaderMaterial
    if (record.fullscreen && !sourceUrl(el)) {
      material.uniforms.uProcedural!.value = 1
      record.live = true
      canvas.classList.add('is-live')
      return
    }
    try {
      let texture: THREE.Texture
      if (el instanceof HTMLCanvasElement && !el.dataset.webglSrc) {
        texture = prepareTexture(new THREE.CanvasTexture(el))
      } else if (el instanceof HTMLVideoElement && !el.dataset.webglSrc) {
        texture = prepareTexture(new THREE.VideoTexture(el))
      } else {
        const url = sourceUrl(el)
        if (!url) return
        texture = await loadImageTexture(url)
      }
      if (!planes.has(el)) {
        texture.dispose()
        return
      }
      record.texture = texture
      material.uniforms.tMap!.value = texture

      const depthUrl = el.dataset.webglDepth
      if (depthUrl) {
        const depth = await loadImageTexture(depthUrl)
        if (!planes.has(el)) {
          depth.dispose()
          return
        }
        record.depth = depth
        material.uniforms.tDepth!.value = depth
        material.uniforms.uHasDepth!.value = 1
      }

      record.live = true
      canvas.classList.add('is-live')
    } catch {
      planes.delete(el)
      scene.remove(mesh)
    }
  }

  function release(el: HTMLElement) {
    const record = planes.get(el)
    if (!record) return
    el.classList.remove('webgl-app-source')
    scene.remove(record.mesh)
    record.texture?.dispose()
    record.depth?.dispose()
    ;(record.mesh.material as THREE.Material).dispose()
    planes.delete(el)
    if (planes.size === 0) canvas.classList.remove('is-live')
  }

  function scan() {
    const nodes = document.querySelectorAll<HTMLElement>('[data-webgl]')
    const live = new Set<HTMLElement>()
    nodes.forEach((el) => {
      live.add(el)
      adopt(el)
    })
    for (const el of planes.keys()) {
      if (!live.has(el) || !el.isConnected) release(el)
    }
  }

  const observer = new MutationObserver(() => scan())
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-webgl', 'data-webgl-src', 'data-webgl-depth'],
  })

  const resizeObserver = new ResizeObserver(() => resize())
  resizeObserver.observe(canvas)
  resize()
  scan()
  window.addEventListener('resize', resize)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerleave', onPointerLeave)
  frame = requestAnimationFrame(frameLoop)

  return {
    destroy() {
      running = false
      cancelAnimationFrame(frame)
      observer.disconnect()
      resizeObserver.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
      for (const el of [...planes.keys()]) release(el)
      geometry.dispose()
      velocity.read.dispose()
      velocity.write.dispose()
      pressure.read.dispose()
      pressure.write.dispose()
      divergence.dispose()
      curl.dispose()
      for (const pass of [splat, advect, curlPass, vorticity, divergencePass, pressurePass, gradient]) {
        pass.material.dispose()
        const mesh = pass.scene.children[0] as THREE.Mesh
        mesh.geometry.dispose()
      }
      renderer.dispose()
    },
  }
}
