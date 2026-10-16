<template>
  <section
    class="webgl-frame"
    :class="{ 'webgl-frame--light': light }"
    :style="{ background: `rgb(${colors[0].join(',')})` }"
  >
    <canvas ref="canvasEl" data-webgl />
    <div class="webgl-frame__copy">
      <p>{{ kicker }}</p>
      <h2>{{ title }}</h2>
    </div>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  seed: number
  kicker: string
  title: string
  light?: boolean
  colors: [number, number, number][]
}>()

const canvasEl = ref<HTMLCanvasElement | null>(null)

function paint(canvas: HTMLCanvasElement) {
  const width = 1600
  const height = 1000
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const [a, b, c] = props.colors
  const wash = ctx.createLinearGradient(0, 0, width, height)
  wash.addColorStop(0, `rgb(${a.join(',')})`)
  wash.addColorStop(0.55, `rgb(${b.join(',')})`)
  wash.addColorStop(1, `rgb(${c.join(',')})`)
  ctx.fillStyle = wash
  ctx.fillRect(0, 0, width, height)

  ctx.globalAlpha = 0.28
  for (let i = 0; i < 5; i++) {
    const x = ((props.seed * 97 + i * 311) % 1000) / 1000
    const y = ((props.seed * 53 + i * 179) % 1000) / 1000
    const radius = width * (0.18 + (i % 3) * 0.08)
    const tone = i % 2 === 0 ? a : c
    const blob = ctx.createRadialGradient(
      x * width,
      y * height,
      radius * 0.1,
      x * width,
      y * height,
      radius,
    )
    blob.addColorStop(0, `rgb(${tone.join(',')})`)
    blob.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = blob
    ctx.fillRect(0, 0, width, height)
  }
  ctx.globalAlpha = 1

  const image = ctx.getImageData(0, 0, width, height)
  const data = image.data
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const n = ((x * 13 + y * 7 + props.seed * 17) % 21) - 10
      const offset = (y * width + x) * 4
      data[offset] = Math.max(0, Math.min(255, (data[offset] ?? 0) + n))
      data[offset + 1] = Math.max(0, Math.min(255, (data[offset + 1] ?? 0) + n))
      data[offset + 2] = Math.max(0, Math.min(255, (data[offset + 2] ?? 0) + n))
    }
  }
  ctx.putImageData(image, 0, 0)
}

onMounted(() => {
  if (canvasEl.value) paint(canvasEl.value)
})
</script>

<style scoped>
.webgl-frame {
  position: relative;
  height: 100dvh;
  color: #f4f1ea;
}

.webgl-frame--light {
  color: #1a1917;
}

.webgl-frame canvas {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: block;
}

.webgl-frame__copy {
  position: relative;
  z-index: 5;
  max-width: 18rem;
  padding: calc(var(--header-height) + 8vh) var(--gutter) 0;
  pointer-events: none;
}

.webgl-frame__copy p {
  margin: 0 0 0.75rem;
  font-family: var(--mono);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  opacity: 0.7;
}

.webgl-frame__copy h2 {
  margin: 0;
  font-family: var(--serif);
  font-size: clamp(2.4rem, 5vw, 4.2rem);
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 0.95;
}
</style>
