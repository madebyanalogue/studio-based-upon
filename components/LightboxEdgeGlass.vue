<template>
  <canvas ref="canvasRef" class="lb-edge-glass" aria-hidden="true" />
</template>

<script setup lang="ts">
import { loupeBitmap, preloadLoupeBitmaps } from '~/components/Loupe.vue'

/** Outer band, the same fraction of every screen, never wider than 130px. */
const BAND_RATIO = 0.08
const BAND_MAX = 130
/** How far the middle of an item edge bows outward, as a fraction of the band. */
const FLARE = 1
const CA = 0.004
const MAX_ITEMS = 8

const bandPxFor = (stageWidth: number) => Math.min(stageWidth * BAND_RATIO, BAND_MAX)

const canvasRef = ref<HTMLCanvasElement | null>(null)

const VERT = `
  attribute vec2 aPosition;
  attribute vec2 aUv;
  varying vec2 vUv;
  void main() {
    vUv = aUv;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`

const FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform vec4 uLeft[8];
  uniform vec4 uRight[8];
  uniform float uLeftCount;
  uniform float uRightCount;
  uniform float uEdge;
  uniform float uFlare;
  uniform float uCA;

  float bowLeft(float y) {
    float bow = 0.0;
    ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `bow = max(bow, step(${i}.5, uLeftCount) * step(uLeft[${i}].y, y) * step(y, uLeft[${i}].y + uLeft[${i}].w) * sin(clamp((y - uLeft[${i}].y) / max(uLeft[${i}].w, 0.0001), 0.0, 1.0) * 3.14159265));`).join('\n    ')}
    return bow;
  }

  float bowRight(float y) {
    float bow = 0.0;
    ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `bow = max(bow, step(${i}.5, uRightCount) * step(uRight[${i}].y, y) * step(y, uRight[${i}].y + uRight[${i}].w) * sin(clamp((y - uRight[${i}].y) / max(uRight[${i}].w, 0.0001), 0.0, 1.0) * 3.14159265));`).join('\n    ')}
    return bow;
  }

  void main() {
    float fromOuter = min(vUv.x, 1.0 - vUv.x);
    if (fromOuter > uEdge) discard;
    bool left = vUv.x < 0.5;
    float bow = left ? bowLeft(vUv.y) : bowRight(vUv.y);
    float amp = bow * uEdge * uFlare;
    float denom = 1.0 + amp / max(uEdge, 0.0001);
    float srcX = left
      ? (vUv.x + amp) / denom
      : 1.0 - ((1.0 - vUv.x) + amp) / denom;
    float ca = bow * (1.0 - fromOuter / max(uEdge, 0.0001)) * uCA;
    vec2 uv = vec2(srcX, vUv.y);
    float r = texture2D(uTex, uv + vec2(ca, 0.0)).r;
    vec4 g = texture2D(uTex, uv);
    float b = texture2D(uTex, uv - vec2(ca, 0.0)).b;
    if (g.a < 0.02) discard;
    gl_FragColor = vec4(r, g.g, b, g.a);
  }
`

let gl: WebGLRenderingContext | null = null
let program: WebGLProgram | null = null
let texture: WebGLTexture | null = null
let plate: HTMLCanvasElement | null = null
let uEdge: WebGLUniformLocation | null = null
let uFlare: WebGLUniformLocation | null = null
let uCA: WebGLUniformLocation | null = null
let uLeft: WebGLUniformLocation | null = null
let uRight: WebGLUniformLocation | null = null
let uLeftCount: WebGLUniformLocation | null = null
let uRightCount: WebGLUniformLocation | null = null
const leftItems = new Float32Array(MAX_ITEMS * 4)
const rightItems = new Float32Array(MAX_ITEMS * 4)
const clipped = new Set<HTMLElement>()

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

const init = () => {
  const canvas = canvasRef.value
  if (!canvas || gl) return
  const context = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: false,
    antialias: false,
  })
  if (!context) return
  const vert = compile(context, context.VERTEX_SHADER, VERT)
  const frag = compile(context, context.FRAGMENT_SHADER, FRAG)
  if (!vert || !frag) return
  const next = context.createProgram()
  if (!next) return
  context.attachShader(next, vert)
  context.attachShader(next, frag)
  context.bindAttribLocation(next, 0, 'aPosition')
  context.bindAttribLocation(next, 1, 'aUv')
  context.linkProgram(next)
  if (!context.getProgramParameter(next, context.LINK_STATUS)) return
  const buffer = context.createBuffer()
  context.bindBuffer(context.ARRAY_BUFFER, buffer)
  context.bufferData(
    context.ARRAY_BUFFER,
    new Float32Array([
      -1, -1, 0, 0,
      1, -1, 1, 0,
      -1, 1, 0, 1,
      1, 1, 1, 1,
    ]),
    context.STATIC_DRAW,
  )
  context.useProgram(next)
  context.enableVertexAttribArray(0)
  context.enableVertexAttribArray(1)
  context.vertexAttribPointer(0, 2, context.FLOAT, false, 16, 0)
  context.vertexAttribPointer(1, 2, context.FLOAT, false, 16, 8)
  uEdge = context.getUniformLocation(next, 'uEdge')
  uFlare = context.getUniformLocation(next, 'uFlare')
  uCA = context.getUniformLocation(next, 'uCA')
  uLeft = context.getUniformLocation(next, 'uLeft[0]')
  uRight = context.getUniformLocation(next, 'uRight[0]')
  uLeftCount = context.getUniformLocation(next, 'uLeftCount')
  uRightCount = context.getUniformLocation(next, 'uRightCount')
  const sampler = context.getUniformLocation(next, 'uTex')
  context.uniform1i(sampler, 0)
  texture = context.createTexture()
  context.bindTexture(context.TEXTURE_2D, texture)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE)
  context.enable(context.BLEND)
  context.blendFunc(context.SRC_ALPHA, context.ONE_MINUS_SRC_ALPHA)
  gl = context
  program = next
}

const clearClips = () => {
  for (const node of clipped) node.style.clipPath = ''
  clipped.clear()
}

const hiddenByTransition = (stage: HTMLElement) => {
  const stack = stage.closest('.stack')
  if (!stack) return false
  return (
    stack.classList.contains('stack--view-flip') ||
    stack.classList.contains('stack--lb-handoff') ||
    stack.classList.contains('stack--flipping')
  )
}

const paint = () => {
  const canvas = canvasRef.value
  const stage = canvas?.parentElement
  if (!canvas || !stage || stage.clientWidth < 2 || stage.clientHeight < 2) return
  init()
  if (!gl || !program || !texture) return
  if (hiddenByTransition(stage)) {
    clearClips()
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    return
  }

  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const width = Math.max(2, Math.round(stage.clientWidth * dpr))
  const height = Math.max(2, Math.round(stage.clientHeight * dpr))
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
  if (!plate) plate = document.createElement('canvas')
  if (plate.width !== width || plate.height !== height) {
    plate.width = width
    plate.height = height
  }
  const ctx = plate.getContext('2d', { alpha: true })
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, stage.clientWidth, stage.clientHeight)

  const stageBox = stage.getBoundingClientRect()
  const edge = bandPxFor(stage.clientWidth)
  const urls: string[] = []
  const drawn: HTMLElement[] = []
  leftItems.fill(0)
  rightItems.fill(0)
  let leftCount = 0
  let rightCount = 0

  const pushItem = (
    list: Float32Array,
    count: number,
    localLeft: number,
    localTop: number,
    itemW: number,
    itemH: number,
  ) => {
    if (count >= MAX_ITEMS) return count
    const i = count * 4
    list[i] = localLeft / stage.clientWidth
    list[i + 1] = 1 - (localTop + itemH) / stage.clientHeight
    list[i + 2] = itemW / stage.clientWidth
    list[i + 3] = itemH / stage.clientHeight
    return count + 1
  }

  for (const node of stage.querySelectorAll<HTMLElement>('.stack__lightbox-item')) {
    if (node.style.visibility === 'hidden') continue
    const img = node.querySelector('img')
    if (!img) continue
    const url = img.currentSrc || img.src
    if (!url) continue
    urls.push(url)
    const bitmap = loupeBitmap(url)
    if (!bitmap?.complete || bitmap.naturalWidth < 1) continue
    const rect = node.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) continue
    const localLeft = rect.left - stageBox.left
    const localTop = rect.top - stageBox.top
    const localRight = rect.right - stageBox.left
    const hitsLeft = localRight > 0 && localLeft < edge
    const hitsRight = localLeft < stage.clientWidth && localRight > stage.clientWidth - edge
    if (!hitsLeft && !hitsRight) continue
    ctx.drawImage(bitmap, localLeft, localTop, rect.width, rect.height)
    drawn.push(node)
    if (hitsLeft) leftCount = pushItem(leftItems, leftCount, localLeft, localTop, rect.width, rect.height)
    if (hitsRight) rightCount = pushItem(rightItems, rightCount, localLeft, localTop, rect.width, rect.height)
  }
  if (urls.length) preloadLoupeBitmaps(urls)

  gl.viewport(0, 0, width, height)
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.useProgram(program)
  gl.uniform1f(uEdge, edge / stage.clientWidth)
  gl.uniform1f(uFlare, FLARE)
  gl.uniform1f(uCA, CA)
  gl.uniform1f(uLeftCount, leftCount)
  gl.uniform1f(uRightCount, rightCount)
  gl.uniform4fv(uLeft, leftItems)
  gl.uniform4fv(uRight, rightItems)
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, plate)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

  const seen = new Set<HTMLElement>()
  for (const node of drawn) {
    const rect = node.getBoundingClientRect()
    const scaleX = rect.width / Math.max(node.offsetWidth, 1)
    const localLeft = Math.max(0, (edge - (rect.left - stageBox.left)) / scaleX)
    const localRight = Math.max(0, (rect.right - stageBox.left - (stage.clientWidth - edge)) / scaleX)
    if (localLeft > 0.5 || localRight > 0.5) {
      node.style.clipPath = `inset(0px ${localRight}px 0px ${localLeft}px)`
      clipped.add(node)
      seen.add(node)
    }
  }
  for (const node of clipped) {
    if (seen.has(node)) continue
    node.style.clipPath = ''
    clipped.delete(node)
  }
}

onMounted(init)
onUnmounted(() => {
  clearClips()
  gl?.getExtension('WEBGL_lose_context')?.loseContext()
  gl = null
  program = null
  texture = null
})

defineExpose({ paint })
</script>

<style scoped>
.lb-edge-glass {
  position: absolute;
  inset: 0;
  z-index: 25;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
