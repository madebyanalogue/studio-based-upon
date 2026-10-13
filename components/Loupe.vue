<template>
  <div
    ref="rootRef"
    class="loupe"
    :class="{ 'loupe--closing': closing }"
    data-cursor="default"
    data-lenis-prevent
    :style="rootStyle"
    @pointerdown.stop
    @click.stop
  >
    <canvas ref="canvasRef" class="loupe__lens" />
    <div
      ref="grabRef"
      class="loupe__grab"
      role="region"
      tabindex="0"
      aria-label="Loupe"
      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Escape"
      aria-describedby="loupe-description"
      @pointerdown.stop="onGrabDown"
    />
    <input
      class="loupe__scale"
      type="range"
      :min="MIN_SCALE"
      :max="MAX_SCALE"
      step="0.01"
      :value="scale"
      aria-label="Loupe magnification"
      @input="onScaleInput"
    />
    <p id="loupe-description" class="loupe__sr">
      Drag the glass to inspect the image. Scroll to change magnification.
      Arrow keys move the loupe. Escape closes it.
    </p>
  </div>
</template>

<script lang="ts">
let loupeSerial = 0

const loupeBitmaps = new Map<string, HTMLImageElement>()

const loupeTextureSrc = (url: string) =>
  url.includes('cdn.sanity.io/') ? `/api/image-proxy?url=${encodeURIComponent(url)}` : url

export const preloadLoupeBitmaps = (urls: string[]) => {
  if (!import.meta.client) return
  for (const url of urls) {
    if (!url || loupeBitmaps.has(url)) continue
    const image = new Image()
    image.decoding = 'async'
    loupeBitmaps.set(url, image)
    image.onerror = () => {
      if (loupeBitmaps.get(url) === image) loupeBitmaps.delete(url)
    }
    image.src = loupeTextureSrc(url)
  }
}
</script>

<script setup lang="ts">
const props = defineProps<{ src: string; closing?: boolean }>()
const emit = defineEmits<{ close: [] }>()

const MIN_SCALE = 1
const MAX_SCALE = 3
const IOR = 1.4
const ABERRATION = 0.01
const THICKNESS = 0.9
const BEVEL = 0.9
const OBLATENESS = 0.65
const REFRACTION = 0.6
const inscription = 'STUDIO BASED UPON  ⎟  10× MEASURING LOUPE'

const uid = `loupe-${++loupeSerial}`

const rootRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const grabRef = ref<HTMLElement | null>(null)
const dialRotorRef = ref<SVGGElement | null>(null)
const dialSize = ref(320)
const scale = ref(1.75)

const lensSize = computed(() => Math.round(dialSize.value * 0.75 * 1.5))

const rootStyle = computed(() => ({
  '--lens-size': `${lensSize.value}px`,
  '--dial-size': `${dialSize.value}px`,
}))

const dial = computed(() => {
  const size = dialSize.value
  const compact = size < 280
  const padding = compact ? 14 : 20
  const center = size / 2
  const radius = (size - padding * 2) / 2
  const requested = compact ? 120 : 180
  const tickCount = Math.floor(requested / 5) * 5 - 1
  const snap = 360 / tickCount
  const tickLength = compact ? 4 : 8
  const ring = radius + (compact ? 8 : 12)
  const ticks = Array.from({ length: tickCount }, (_, index) => {
    const angle = (index / tickCount) * 360 - snap
    const rad = (angle * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const long = index % 5 === 0
    const outer = long ? ring + tickLength * 0.5 : ring
    return {
      x1: center + (ring - tickLength) * cos,
      y1: center + (ring - tickLength) * sin,
      x2: center + outer * cos,
      y2: center + outer * sin,
      skip: index === 0,
    }
  })
  const textRadius = compact ? radius - 2 : radius - 8
  return {
    size,
    center,
    radius,
    padding,
    ticks,
    textRadius,
    highlightRadius: compact ? radius - 10 : radius - 22,
    baseRadius: compact ? radius - 4 : radius - 10,
    fontSize: compact ? 6 : 9,
    textOffset: compact ? 220 : 480,
    handleCy: padding - (compact ? 8 : 10),
    textPath: `M ${center - textRadius},${center} a ${textRadius},${textRadius} 0 1,0 ${textRadius * 2},0 a ${textRadius},${textRadius} 0 1,0 ${textRadius * -2},0`,
  }
})

const VERT = `
attribute vec2 aPosition;
varying vec2 vQuadUV;
void main() {
  vQuadUV = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`

const FRAG = `
precision highp float;
varying vec2 vQuadUV;
uniform sampler2D uSourceTex;
uniform vec2 uSourceSizePx;
uniform vec2 uLensCenterPx;
uniform float uLensMagnification;
uniform float uLensIOR;
uniform float uAberrationAmount;
uniform float uLensThickness;
uniform float uBevelStartR;
uniform float uLensRadiusPx;
uniform float uLensOblateness;
uniform float uRefractionDisplacementScale;
const float IOR_AIR = 1.0;
const float EPS = 1e-6;
vec2 calcPixelOffsetUV(vec2 unitDiskCoords, vec2 invSourceSizePx) {
  vec2 pixelOffset = unitDiskCoords * uLensRadiusPx;
  return pixelOffset * invSourceSizePx;
}
vec2 calcMagnificationUVOffset(vec2 unitDiskCoords, vec2 invSourceSizePx) {
  return calcPixelOffsetUV(unitDiskCoords, invSourceSizePx) / max(EPS, uLensMagnification);
}
void calcFrontSurfacePointAndNormal(vec2 unitDiskCoords, float zScale, out vec3 frontPoint, out vec3 frontNormal) {
  float radiusSq = dot(unitDiskCoords, unitDiskCoords);
  float zAxisDepth = zScale * sqrt(max(0.0, 1.0 - radiusSq));
  frontPoint = vec3(unitDiskCoords, zAxisDepth);
  frontNormal = normalize(vec3(unitDiskCoords, zAxisDepth / (zScale * zScale)));
}
bool intersectBackEllipsoid(vec3 rayOrigin, vec3 rayDir, float thickness, float zScale, out vec3 hitPoint) {
  vec3 backCenter = vec3(0.0, 0.0, -thickness);
  vec3 originToCenter = rayOrigin - backCenter;
  float zScaleSq = zScale * zScale;
  float quadA = dot(rayDir.xy, rayDir.xy) + (rayDir.z * rayDir.z) / zScaleSq;
  float quadB = 2.0 * (dot(originToCenter.xy, rayDir.xy) + (originToCenter.z * rayDir.z) / zScaleSq);
  float quadC = dot(originToCenter.xy, originToCenter.xy) + (originToCenter.z * originToCenter.z) / zScaleSq - 1.0;
  float discriminant = quadB * quadB - 4.0 * quadA * quadC;
  if (discriminant < 0.0) return false;
  float sqrtDiscriminant = sqrt(max(0.0, discriminant));
  float tNear = (-quadB - sqrtDiscriminant) / (2.0 * quadA);
  float tFar = (-quadB + sqrtDiscriminant) / (2.0 * quadA);
  float hitTime = tNear > EPS ? tNear : tFar;
  if (hitTime <= 0.0) return false;
  hitPoint = rayOrigin + rayDir * hitTime;
  return true;
}
vec3 calcBackEllipsoidNormal(vec3 backPoint, float thickness, float zScale) {
  vec3 backCenter = vec3(0.0, 0.0, -thickness);
  vec3 local = backPoint - backCenter;
  float zScaleSq = zScale * zScale;
  return normalize(vec3(local.xy, local.z / zScaleSq));
}
vec2 traceRefractionDisplInRadii(vec2 unitDiskCoords, float ior, float zScale, float thickness) {
  vec3 frontPoint;
  vec3 frontNormal;
  calcFrontSurfacePointAndNormal(unitDiskCoords, zScale, frontPoint, frontNormal);
  vec3 incomingAirDir = vec3(0.0, 0.0, -1.0);
  vec3 dirInsideGlass = refract(incomingAirDir, frontNormal, IOR_AIR / ior);
  if (length(dirInsideGlass) < EPS) return vec2(0.0);
  vec3 backSurfacePoint;
  if (!intersectBackEllipsoid(frontPoint, dirInsideGlass, thickness, zScale, backSurfacePoint)) return vec2(0.0);
  vec3 backSurfaceNormal = calcBackEllipsoidNormal(backSurfacePoint, thickness, zScale);
  vec3 outgoingAirDir = refract(dirInsideGlass, -backSurfaceNormal, ior / IOR_AIR);
  if (length(outgoingAirDir) < EPS) return vec2(0.0);
  float timeToImagePlane = -backSurfacePoint.z / outgoingAirDir.z;
  vec2 projectedXY = backSurfacePoint.xy + outgoingAirDir.xy * timeToImagePlane;
  return (projectedXY - unitDiskCoords) * uRefractionDisplacementScale;
}
vec3 calcShadingNormal(vec2 unitDiskCoords, float zAxisDepth) {
  return normalize(vec3(-unitDiskCoords, zAxisDepth));
}
void main() {
  vec2 invSourceSizePx = 1.0 / uSourceSizePx;
  vec2 sourceCenterUV = uLensCenterPx * invSourceSizePx;
  sourceCenterUV.y = 1.0 - sourceCenterUV.y;
  vec2 unitDiskCoords = vQuadUV * 2.0 - 1.0;
  float radiusSq = dot(unitDiskCoords, unitDiskCoords);
  float radius = sqrt(radiusSq);
  if (radius > 1.0) discard;
  float zScale = clamp(uLensOblateness, 0.2, 1.0);
  vec2 magnificationUVOffset = calcMagnificationUVOffset(unitDiskCoords, invSourceSizePx);
  float iorRed = uLensIOR - uAberrationAmount;
  float iorGreen = uLensIOR;
  float iorBlue = uLensIOR + uAberrationAmount;
  vec2 displRadiiRed = traceRefractionDisplInRadii(unitDiskCoords, iorRed, zScale, uLensThickness);
  vec2 displRadiiGreen = traceRefractionDisplInRadii(unitDiskCoords, iorGreen, zScale, uLensThickness);
  vec2 displRadiiBlue = traceRefractionDisplInRadii(unitDiskCoords, iorBlue, zScale, uLensThickness);
  vec2 displUVRed = calcPixelOffsetUV(displRadiiRed, invSourceSizePx);
  vec2 displUVGreen = calcPixelOffsetUV(displRadiiGreen, invSourceSizePx);
  vec2 displUVBlue = calcPixelOffsetUV(displRadiiBlue, invSourceSizePx);
  float rimFeatherAmount = smoothstep(uBevelStartR, 1.0, radius);
  float edgeDisplAttenuation = 1.0 - rimFeatherAmount * 0.12;
  vec2 uvRed = sourceCenterUV + magnificationUVOffset + displUVRed * edgeDisplAttenuation;
  vec2 uvGreen = sourceCenterUV + magnificationUVOffset + displUVGreen * edgeDisplAttenuation;
  vec2 uvBlue = sourceCenterUV + magnificationUVOffset + displUVBlue * edgeDisplAttenuation;
  vec3 refractedCol = vec3(
    texture2D(uSourceTex, uvRed).r,
    texture2D(uSourceTex, uvGreen).g,
    texture2D(uSourceTex, uvBlue).b
  );
  float zAxisDepth = sqrt(max(0.0, 1.0 - radiusSq));
  vec3 shadingNormal = calcShadingNormal(unitDiskCoords, zAxisDepth);
  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  vec3 lightDir = normalize(vec3(0.35, 0.55, 1.0));
  float fresnelReflectanceAtNormal = pow((uLensIOR - 1.0) / (uLensIOR + 1.0), 2.0);
  float viewDotNormal = clamp(dot(viewDir, shadingNormal), 0.0, 1.0);
  float fresnel = fresnelReflectanceAtNormal + (1.0 - fresnelReflectanceAtNormal) * pow(1.0 - viewDotNormal, 5.0);
  vec3 halfVec = normalize(viewDir + lightDir);
  float specular = pow(max(dot(shadingNormal, halfVec), 0.0), 80.0) * 0.35;
  float rimBoostAmount = smoothstep(0.78, 0.98, radius) * 0.5;
  float innerDimAmount = smoothstep(0.55, 1.0, radius) * 0.18;
  vec3 highlightCol = vec3(specular * fresnel) + vec3(rimBoostAmount * fresnel);
  vec3 shadedCol = refractedCol * (1.0 - innerDimAmount) + highlightCol;
  gl_FragColor = vec4(shadedCol, 1.0);
}`

type Uniforms = {
  uSourceSizePx: WebGLUniformLocation | null
  uLensCenterPx: WebGLUniformLocation | null
  uLensMagnification: WebGLUniformLocation | null
  uLensIOR: WebGLUniformLocation | null
  uAberrationAmount: WebGLUniformLocation | null
  uLensThickness: WebGLUniformLocation | null
  uBevelStartR: WebGLUniformLocation | null
  uLensRadiusPx: WebGLUniformLocation | null
  uLensOblateness: WebGLUniformLocation | null
  uRefractionDisplacementScale: WebGLUniformLocation | null
}

let gl: WebGLRenderingContext | null = null
let texture: WebGLTexture | null = null
let uniforms: Uniforms | null = null
let sourceImage: HTMLImageElement | null = null
let sourceUrl = ''
let wantedUrl = ''
let raf = 0
let centerX = 0
let centerY = 0
let shownScale = 1.75
let shownAngle = ((1.75 - 1) / 2) * 360
let lastFrame = 0
let placed = false
let dragging = false
let dragOffsetX = 0
let dragOffsetY = 0
let dialing = false
let dialPointer = -1
let dialLastAngle = 0
const pressedKeys = new Set<string>()

const clamp = (min: number, max: number, value: number) => Math.min(max, Math.max(min, value))

const travelRect = () => new DOMRect(0, 0, window.innerWidth, window.innerHeight)

const activeImage = () => {
  const image = document.querySelector('.pdp .pdp__strip-item--active .pdp__hero-image')
  return image instanceof HTMLImageElement ? image : null
}

const compile = (context: WebGLRenderingContext, type: number, source: string) => {
  const shader = context.createShader(type)
  if (!shader) return null
  context.shaderSource(shader, source)
  context.compileShader(shader)
  if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
    context.deleteShader(shader)
    return null
  }
  return shader
}

const initGL = () => {
  const canvas = canvasRef.value
  if (!canvas || gl) return
  const context = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
  })
  if (!context) return
  const vert = compile(context, context.VERTEX_SHADER, VERT)
  const frag = compile(context, context.FRAGMENT_SHADER, FRAG)
  if (!vert || !frag) return
  const program = context.createProgram()
  if (!program) return
  context.attachShader(program, vert)
  context.attachShader(program, frag)
  context.bindAttribLocation(program, 0, 'aPosition')
  context.linkProgram(program)
  if (!context.getProgramParameter(program, context.LINK_STATUS)) return
  const buffer = context.createBuffer()
  context.bindBuffer(context.ARRAY_BUFFER, buffer)
  context.bufferData(
    context.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    context.STATIC_DRAW,
  )
  context.useProgram(program)
  context.enableVertexAttribArray(0)
  context.vertexAttribPointer(0, 2, context.FLOAT, false, 0, 0)
  const nextTexture = context.createTexture()
  context.bindTexture(context.TEXTURE_2D, nextTexture)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR)
  context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, 1)
  const loc = (name: keyof Uniforms) => context.getUniformLocation(program, name)
  gl = context
  texture = nextTexture
  uniforms = {
    uSourceSizePx: loc('uSourceSizePx'),
    uLensCenterPx: loc('uLensCenterPx'),
    uLensMagnification: loc('uLensMagnification'),
    uLensIOR: loc('uLensIOR'),
    uAberrationAmount: loc('uAberrationAmount'),
    uLensThickness: loc('uLensThickness'),
    uBevelStartR: loc('uBevelStartR'),
    uLensRadiusPx: loc('uLensRadiusPx'),
    uLensOblateness: loc('uLensOblateness'),
    uRefractionDisplacementScale: loc('uRefractionDisplacementScale'),
  }
  context.uniform1f(uniforms.uLensIOR, IOR)
  context.uniform1f(uniforms.uAberrationAmount, ABERRATION)
  context.uniform1f(uniforms.uLensThickness, THICKNESS)
  context.uniform1f(uniforms.uBevelStartR, BEVEL)
  context.uniform1f(uniforms.uLensOblateness, OBLATENESS)
  context.uniform1f(uniforms.uRefractionDisplacementScale, REFRACTION)
  if (sourceImage) uploadTexture()
}

const uploadTexture = () => {
  if (!gl || !texture || !sourceImage) return
  try {
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceImage)
  } catch {
    sourceImage = null
  }
}

const bindSource = (url: string, image: HTMLImageElement) => {
  if (wantedUrl !== url) return
  sourceUrl = url
  sourceImage = image
}

const ensureSource = (url: string) => {
  wantedUrl = url
  if (!url) return
  preloadLoupeBitmaps([url])
  const cached = loupeBitmaps.get(url)
  if (cached?.complete && cached.naturalWidth > 0) bindSource(url, cached)
}

const applyPlacement = () => {
  const root = rootRef.value
  if (!root) return
  const size = lensSize.value
  root.style.width = `${size}px`
  root.style.height = `${size}px`
  root.style.transform = `translate3d(${centerX - size / 2}px, ${centerY - size / 2}px, 0)`
}

const clampCenter = (nextX: number, nextY: number) => {
  const bounds = travelRect()
  const radius = lensSize.value / 2
  const hang = radius * 0.85
  const minX = bounds.left - hang
  const maxX = bounds.right + hang
  const minY = bounds.top - hang
  const maxY = bounds.bottom + hang
  centerX = minX <= maxX ? clamp(minX, maxX, nextX) : bounds.left + bounds.width / 2
  centerY = minY <= maxY ? clamp(minY, maxY, nextY) : bounds.top + bounds.height / 2
  applyPlacement()
}

const fitToFrame = () => {
  const image = activeImage()
  const rect = image?.getBoundingClientRect()
  const short = rect && rect.width > 8 && rect.height > 8
    ? Math.min(rect.width, rect.height)
    : Math.min(window.innerWidth, window.innerHeight) * 0.5
  const next = Math.round(clamp(168, 400, short * 0.72))
  if (next !== dialSize.value) dialSize.value = next
  if (!placed) {
    if (rect && rect.width > 8) {
      centerX = rect.left + rect.width / 2
      centerY = rect.top + rect.height / 2
    } else {
      const bounds = travelRect()
      centerX = bounds.left + bounds.width / 2
      centerY = bounds.top + bounds.height / 2
    }
    placed = true
  }
  clampCenter(centerX, centerY)
}

const preload = (url: string) => preloadLoupeBitmaps([url])

let plate: HTMLCanvasElement | null = null

const opaqueBackground = (start: Element) => {
  let node: Element | null = start
  while (node) {
    const color = getComputedStyle(node).backgroundColor
    const match = color.match(/rgba?\(([^)]+)\)/)
    if (match) {
      const parts = match[1].split(',').map((part) => Number.parseFloat(part))
      if (parts.length < 4 || (parts[3] ?? 1) > 0.04) return color
    }
    node = node.parentElement
  }
  return '#161311'
}

const containedBox = (box: DOMRect, width: number, height: number) => {
  const scale = Math.min(box.width / width, box.height / height)
  const paintedWidth = width * scale
  const paintedHeight = height * scale
  return {
    left: box.left + (box.width - paintedWidth) / 2,
    top: box.top + (box.height - paintedHeight) / 2,
    width: paintedWidth,
    height: paintedHeight,
  }
}

const paintGallery = () => {
  const stage = rootRef.value?.closest('.pdp')?.querySelector('.pdp__stage')
  if (!stage || !gl || !texture) return null
  const stageRect = stage.getBoundingClientRect()
  const css = Math.max(2, lensSize.value * 2)
  const pixelScale = Math.min(3, Math.max(2, window.devicePixelRatio || 1))
  const pixels = Math.max(2, Math.round(css * pixelScale))
  if (!plate) plate = document.createElement('canvas')
  if (plate.width !== pixels || plate.height !== pixels) {
    plate.width = pixels
    plate.height = pixels
  }
  const ctx = plate.getContext('2d', { alpha: true })
  if (!ctx) return null
  const originX = centerX - css / 2
  const originY = centerY - css / 2
  ctx.setTransform(pixelScale, 0, 0, pixelScale, 0, 0)
  ctx.clearRect(0, 0, css, css)
  ctx.fillStyle = opaqueBackground(stage)
  ctx.fillRect(0, 0, css, css)
  ctx.save()
  ctx.beginPath()
  ctx.rect(stageRect.left - originX, stageRect.top - originY, stageRect.width, stageRect.height)
  ctx.clip()
  let drew = false
  for (const node of stage.querySelectorAll('.pdp__hero-image')) {
    if (!(node instanceof HTMLImageElement)) continue
    if (getComputedStyle(node).opacity === '0') continue
    const url = node.currentSrc || node.src
    if (!url) continue
    preload(url)
    const bitmap = loupeBitmaps.get(url)
    if (!bitmap?.complete || bitmap.naturalWidth < 1) continue
    const frame = node.closest('.pdp__hero-frame')?.getBoundingClientRect() ?? node.getBoundingClientRect()
    const painted = containedBox(frame, bitmap.naturalWidth, bitmap.naturalHeight)
    if (painted.width < 2 || painted.height < 2) continue
    ctx.save()
    ctx.beginPath()
    ctx.rect(frame.left - originX, frame.top - originY, frame.width, frame.height)
    ctx.clip()
    ctx.drawImage(bitmap, painted.left - originX, painted.top - originY, painted.width, painted.height)
    ctx.restore()
    drew = true
  }
  ctx.restore()
  if (!drew) return null
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
  try {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, plate)
  } catch {
    return null
  }
  return { width: css, height: css, x: css / 2, y: css / 2 }
}

const draw = (time: number) => {
  const dt = Math.min(0.05, lastFrame ? (time - lastFrame) / 1000 : 0.016)
  lastFrame = time
  const targetAngle = ((scale.value - MIN_SCALE) / (MAX_SCALE - MIN_SCALE)) * 360
  const glide = (current: number, target: number, lambda: number) =>
    current + (target - current) * (1 - Math.exp(-lambda * dt))
  shownAngle = glide(shownAngle, targetAngle, 18)
  shownScale = glide(shownScale, scale.value, 35)
  const rotor = dial.value
  dialRotorRef.value?.setAttribute(
    'transform',
    `rotate(${shownAngle} ${rotor.center} ${rotor.center})`,
  )

  if (pressedKeys.size) {
    const speed = 220 * (pressedKeys.has('Shift') ? 2 : 1)
    let vx = 0
    let vy = 0
    if (pressedKeys.has('ArrowLeft')) vx -= 1
    if (pressedKeys.has('ArrowRight')) vx += 1
    if (pressedKeys.has('ArrowUp')) vy -= 1
    if (pressedKeys.has('ArrowDown')) vy += 1
    const length = Math.hypot(vx, vy)
    if (length) clampCenter(centerX + (vx / length) * speed * dt, centerY + (vy / length) * speed * dt)
  }

  const canvas = canvasRef.value
  const sample = paintGallery()
  if (gl && uniforms && canvas && sample) {
    canvas.classList.add('loupe__lens--ready')
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const drawSize = Math.max(2, Math.round(lensSize.value * dpr))
    if (canvas.width !== drawSize || canvas.height !== drawSize) {
      canvas.width = drawSize
      canvas.height = drawSize
    }
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniform2f(uniforms.uSourceSizePx, sample.width, sample.height)
    gl.uniform2f(uniforms.uLensCenterPx, sample.x, sample.y)
    gl.uniform1f(uniforms.uLensMagnification, shownScale)
    gl.uniform1f(uniforms.uLensRadiusPx, lensSize.value / 2)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  } else if (gl && canvas) {
    canvas.classList.remove('loupe__lens--ready')
    if (canvas.width && canvas.height) {
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
    }
  }
  raf = requestAnimationFrame(draw)
}

const onGrabDown = (event: PointerEvent) => {
  dragging = true
  dragOffsetX = event.clientX - centerX
  dragOffsetY = event.clientY - centerY
  grabRef.value?.setAttribute('data-dragging', 'true')
  grabRef.value?.focus()
  window.addEventListener('pointermove', onGrabMove)
  window.addEventListener('pointerup', onGrabUp)
}

const onGrabMove = (event: PointerEvent) => {
  if (!dragging) return
  clampCenter(event.clientX - dragOffsetX, event.clientY - dragOffsetY)
}

const onGrabUp = () => {
  dragging = false
  grabRef.value?.removeAttribute('data-dragging')
  window.removeEventListener('pointermove', onGrabMove)
  window.removeEventListener('pointerup', onGrabUp)
}

const pointerAngle = (clientX: number, clientY: number) => {
  const svg = dialRotorRef.value?.ownerSVGElement
  if (!svg) return 0
  const rect = svg.getBoundingClientRect()
  const x = clientX - (rect.left + rect.width / 2)
  const y = clientY - (rect.top + rect.height / 2)
  const snap = 360 / Math.max(1, dial.value.ticks.length)
  const angle = (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360
  return Math.round(angle / snap) * snap
}

const onDialDown = (event: PointerEvent) => {
  dialing = true
  dialPointer = event.pointerId
  dialLastAngle = pointerAngle(event.clientX, event.clientY)
  window.addEventListener('pointermove', onDialMove)
  window.addEventListener('pointerup', onDialUp)
  window.addEventListener('pointercancel', onDialUp)
}

const onDialMove = (event: PointerEvent) => {
  if (!dialing || event.pointerId !== dialPointer) return
  const current = pointerAngle(event.clientX, event.clientY)
  let delta = current - dialLastAngle
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360
  const nextAngle = shownAngle + delta
  if (nextAngle < 0 || nextAngle > 360) return
  shownAngle = nextAngle
  scale.value = MIN_SCALE + (nextAngle / 360) * (MAX_SCALE - MIN_SCALE)
  dialLastAngle = current
}

const onDialUp = (event: PointerEvent) => {
  if (event.pointerId !== dialPointer) return
  dialing = false
  dialPointer = -1
  window.removeEventListener('pointermove', onDialMove)
  window.removeEventListener('pointerup', onDialUp)
  window.removeEventListener('pointercancel', onDialUp)
}

const onScaleInput = (event: Event) => {
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) return
  scale.value = clamp(MIN_SCALE, MAX_SCALE, value)
}

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }
  const target = event.target as HTMLElement | null
  if (target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Shift'].includes(event.key)) return
  pressedKeys.add(event.key)
  event.preventDefault()
}

const onKeyUp = (event: KeyboardEvent) => {
  pressedKeys.delete(event.key)
}

const onWheel = (event: WheelEvent) => {
  event.preventDefault()
  event.stopPropagation()
  const step = event.deltaY > 0 ? -0.08 : 0.08
  scale.value = clamp(MIN_SCALE, MAX_SCALE, scale.value + step)
}

watch(
  () => props.src,
  (url) => {
    if (url) ensureSource(url)
  },
  { immediate: true },
)

onMounted(() => {
  initGL()
  fitToFrame()
  window.addEventListener('resize', fitToFrame)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  rootRef.value?.addEventListener('wheel', onWheel, { passive: false })
  raf = requestAnimationFrame(draw)
  nextTick(() => grabRef.value?.focus())
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', fitToFrame)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('pointermove', onGrabMove)
  window.removeEventListener('pointerup', onGrabUp)
  window.removeEventListener('pointermove', onDialMove)
  window.removeEventListener('pointerup', onDialUp)
  window.removeEventListener('pointercancel', onDialUp)
  rootRef.value?.removeEventListener('wheel', onWheel)
  pressedKeys.clear()
  gl?.getExtension('WEBGL_lose_context')?.loseContext()
  gl = null
})
</script>

<style scoped>
.loupe {
  position: fixed;
  top: 0;
  left: 0;
  /* Above the gallery (105), below the related rail (110), aside (120), and pile. */
  z-index: 106;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  border-radius: 50%;
  background: transparent;
  pointer-events: none;
  touch-action: none;
  user-select: none;
  opacity: 1;
  transition: opacity 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.loupe--closing {
  opacity: 0;
}

.loupe__lens {
  position: relative;
  z-index: 1;
  width: var(--lens-size);
  height: var(--lens-size);
  border-radius: 50%;
  pointer-events: none;
}

.loupe__lens--ready {
  opacity: 1;
}

.loupe__dial {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: visible;
  pointer-events: none;
  font-family: var(--mono);
  letter-spacing: 0.12em;
}

.loupe__handle-hit {
  pointer-events: auto;
  cursor: grab;
}

.loupe__handle-hit:active {
  cursor: grabbing;
}

.loupe__grab {
  position: absolute;
  z-index: 3;
  width: var(--lens-size);
  height: var(--lens-size);
  border-radius: 50%;
  cursor: grab;
  pointer-events: auto;
  touch-action: none;
}

.loupe__grab[data-dragging='true'] {
  cursor: grabbing;
}

.loupe__grab:focus-visible {
  outline: none;
}

.loupe__scale,
.loupe__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
