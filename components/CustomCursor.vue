<template>
  <Teleport to="body">
    <div
      v-show="active"
      ref="rootRef"
      class="site-cursor"
      :class="{
        'site-cursor--mark': isMark,
        'site-cursor--tip-left': tipLeft,
      }"
      aria-hidden="true"
    >
      <canvas v-show="trailOn" ref="trailCanvas" class="site-cursor__line" />
      <div ref="orbRef" class="site-cursor__orb" />
      <div v-show="isMark" ref="markRef" class="site-cursor__mark">
        <svg
          class="site-cursor__mark-svg"
          viewBox="0 0 48 48"
          fill="none"
          stroke="currentColor"
          stroke-width="1.15"
          stroke-linecap="butt"
          stroke-linejoin="miter"
          aria-hidden="true"
          :style="{ transform: `rotate(${pose.rotate}deg)` }"
        >
          <path :d="stemD" />
          <path :d="chevD" />
        </svg>
      </div>
      <p
        v-show="labelMounted"
        ref="labelRef"
        class="site-cursor__hint interface"
        :class="{ 'is-removing': labelRemoving }"
      >
        <span
          v-for="(char, index) in labelChars"
          :key="`${shownLabel}-${index}`"
          class="site-cursor__hint-char"
          :class="{ 'is-in': index < labelCount }"
        >{{ char === ' ' ? '\u00a0' : char }}</span>
      </p>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const { preset, native, resolveFromPoint } = useCursor()
const route = useRoute()

const TRAIL_LIFE = 520
const trailPoints: { x: number; y: number; t: number }[] = []
const trailCanvas = ref<HTMLCanvasElement | null>(null)
let trailRaf = 0
const reduceMotion = ref(false)

type MarkPose = { stem: number[]; chev: number[]; rotate: number }

const PLUS_STEM = [15, 24, 33, 24]
const PLUS_CHEV = [24, 15, 24, 24, 24, 33]
/** Matches half the vertical stroke, so the corner at the tip is 90°. */
const ARROW_TIP = 9
/** Shaft behind the cursor. Stem length is this plus the run out to the tip. */
const ARROW_TAIL = 13.5

/** Same two strokes. Close is the plus, turned 45° into an X. */
const MARKS: Record<string, MarkPose> = {
  'arrow-next': {
    stem: [24 - ARROW_TAIL, 24, 24 + ARROW_TIP, 24],
    // (a) and (c) stay on the cursor axis; the tip meets the end of the stem.
    chev: [24, 15, 24 + ARROW_TIP, 24, 24, 33],
    rotate: 0,
  },
  'arrow-prev': {
    stem: [24 - ARROW_TIP, 24, 24 + ARROW_TAIL, 24],
    chev: [24, 15, 24 - ARROW_TIP, 24, 24, 33],
    rotate: 0,
  },
  plus: {
    stem: [...PLUS_STEM],
    chev: [...PLUS_CHEV],
    rotate: 0,
  },
  close: {
    stem: [...PLUS_STEM],
    chev: [...PLUS_CHEV],
    rotate: 45,
  },
}

const isMark = computed(() => {
  const icon = preset.value?.icon
  return icon === 'arrow-next' || icon === 'arrow-prev' || icon === 'plus' || icon === 'close'
})

const pose = ref<MarkPose>({
  stem: [...PLUS_STEM],
  chev: [...PLUS_CHEV],
  rotate: 0,
})

const stemD = computed(() => {
  const [x1, y1, x2, y2] = pose.value.stem
  return `M ${x1} ${y1} L ${x2} ${y2}`
})

const chevD = computed(() => {
  const [x1, y1, x2, y2, x3, y3] = pose.value.chev
  return `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3}`
})

let markRaf = 0
let hasPose = false

const applyPose = (next: MarkPose) => {
  window.cancelAnimationFrame(markRaf)
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!hasPose || reduce) {
    pose.value = { stem: [...next.stem], chev: [...next.chev], rotate: next.rotate }
    hasPose = true
    return
  }
  const fromStem = [...pose.value.stem]
  const fromChev = [...pose.value.chev]
  const fromRotate = pose.value.rotate
  const start = performance.now()
  const duration = 340
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration)
    const e = 1 - (1 - t) ** 3
    pose.value = {
      stem: fromStem.map((value, index) => value + (next.stem[index]! - value) * e),
      chev: fromChev.map((value, index) => value + (next.chev[index]! - value) * e),
      rotate: fromRotate + (next.rotate - fromRotate) * e,
    }
    if (t < 1) markRaf = requestAnimationFrame(step)
  }
  markRaf = requestAnimationFrame(step)
}

if (import.meta.client) {
  watch(
    () => preset.value?.icon ?? null,
    (icon) => {
      if (!icon || !(icon in MARKS)) return
      applyPose(MARKS[icon]!)
    },
    { immediate: true },
  )
}

const rootRef = ref<HTMLElement | null>(null)
const orbRef = ref<HTMLElement | null>(null)
const markRef = ref<HTMLElement | null>(null)
const labelRef = ref<HTMLElement | null>(null)

const SCROLL_HINT = 'Scroll to explore'
const homeScrollHint = useHomeScrollHint()
const cursorLabel = computed(() =>
  homeScrollHint.value ? SCROLL_HINT : preset.value?.tooltip || '',
)

const labelChars = ref<string[]>([])
const labelMounted = ref(false)
const labelRemoving = ref(false)
const labelCount = ref(0)
const shownLabel = ref('')
let labelTimer = 0
let labelGeneration = 0

const clearLabelTimer = () => {
  window.clearInterval(labelTimer)
  labelTimer = 0
}

const typeLabelOn = (text: string, generation: number) => {
  clearLabelTimer()
  shownLabel.value = text
  labelChars.value = [...text]
  labelMounted.value = true
  labelRemoving.value = false
  if (reduceMotion.value) {
    labelCount.value = text.length
    return
  }
  labelCount.value = 0
  labelTimer = window.setInterval(() => {
    if (generation !== labelGeneration) return
    labelCount.value += 1
    if (labelCount.value >= text.length) clearLabelTimer()
  }, 46)
}

const typeLabelOff = (generation: number, done: () => void) => {
  clearLabelTimer()
  if (!labelMounted.value || reduceMotion.value || labelCount.value <= 0) {
    labelMounted.value = false
    labelRemoving.value = false
    labelCount.value = 0
    shownLabel.value = ''
    labelChars.value = []
    done()
    return
  }
  labelRemoving.value = true
  labelTimer = window.setInterval(() => {
    if (generation !== labelGeneration) return
    labelCount.value -= 1
    if (labelCount.value <= 0) {
      clearLabelTimer()
      labelMounted.value = false
      labelRemoving.value = false
      labelCount.value = 0
      shownLabel.value = ''
      labelChars.value = []
      done()
    }
  }, 46)
}

const resumeLabel = (text: string) => {
  labelGeneration += 1
  const generation = labelGeneration
  labelRemoving.value = false
  clearLabelTimer()
  if (reduceMotion.value) {
    labelCount.value = text.length
    return
  }
  labelTimer = window.setInterval(() => {
    if (generation !== labelGeneration) return
    labelCount.value += 1
    if (labelCount.value >= text.length) clearLabelTimer()
  }, 46)
}

const syncLabel = (text: string) => {
  if (text === shownLabel.value && labelMounted.value) {
    if (labelRemoving.value) resumeLabel(text)
    return
  }
  labelGeneration += 1
  const generation = labelGeneration
  const start = () => {
    if (generation !== labelGeneration || !text) return
    typeLabelOn(text, generation)
  }
  if (labelMounted.value && shownLabel.value && shownLabel.value !== text) {
    typeLabelOff(generation, start)
    return
  }
  if (!text) {
    typeLabelOff(generation, () => {})
    return
  }
  typeLabelOn(text, generation)
}

if (import.meta.client) {
  watch(cursorLabel, (text) => {
    syncLabel(text)
  })
}

const fine = ref(false)
const inside = ref(false)
const tipLeft = ref(false)
let x = 0
let y = 0

const active = computed(() => fine.value && inside.value && !native.value)
const trailOn = computed(
  () => active.value && !reduceMotion.value && route.path === '/about',
)

const drawTrail = () => {
  const canvas = trailCanvas.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const width = window.innerWidth
  const height = window.innerHeight
  const pixelWidth = Math.round(width * dpr)
  const pixelHeight = Math.round(height * dpr)
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.lineWidth = 1 / dpr
  ctx.lineCap = 'butt'
  ctx.lineJoin = 'miter'
  const now = performance.now()
  for (let i = 1; i < trailPoints.length; i++) {
    const from = trailPoints[i - 1]!
    const to = trailPoints[i]!
    const alpha = 1 - (now - to.t) / TRAIL_LIFE
    if (alpha <= 0) continue
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
  }
}

const stepTrail = () => {
  trailRaf = 0
  if (!trailOn.value) return
  const now = performance.now()
  while (trailPoints.length && now - trailPoints[0]!.t > TRAIL_LIFE) trailPoints.shift()
  drawTrail()
  trailRaf = requestAnimationFrame(stepTrail)
}

const readFine = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

const place = () => {
  const shift = `translate3d(${x}px, ${y}px, 0)`
  if (orbRef.value) orbRef.value.style.transform = shift
  if (markRef.value) markRef.value.style.transform = shift
  const flip = x > window.innerWidth - 220
  if (tipLeft.value !== flip) tipLeft.value = flip
  const label = labelRef.value
  if (label) {
    label.style.transform = `translate3d(${x}px, ${y}px, 0)`
  }
}

const onPointerMove = (event: PointerEvent) => {
  if (!fine.value) return
  if (event.pointerType && event.pointerType !== 'mouse') return
  x = event.clientX
  y = event.clientY
  inside.value = true
  if (route.path === '/about' && !reduceMotion.value) {
    const last = trailPoints[trailPoints.length - 1]
    if (!last || Math.hypot(x - last.x, y - last.y) >= 1) {
      trailPoints.push({ x, y, t: performance.now() })
    }
  }
  place()
  resolveFromPoint(x, y)
}

const onPointerLeave = (event: PointerEvent) => {
  if (event.relatedTarget) return
  inside.value = false
}

const onBlur = () => {
  inside.value = false
}

let media: MediaQueryList | null = null
const onMedia = () => {
  fine.value = readFine()
}

onMounted(() => {
  fine.value = readFine()
  reduceMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  media = window.matchMedia('(hover: hover) and (pointer: fine)')
  media.addEventListener('change', onMedia)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  document.documentElement.addEventListener('mouseleave', onPointerLeave)
  window.addEventListener('blur', onBlur)
})

onUnmounted(() => {
  window.cancelAnimationFrame(markRaf)
  window.cancelAnimationFrame(trailRaf)
  clearLabelTimer()
  media?.removeEventListener('change', onMedia)
  window.removeEventListener('pointermove', onPointerMove)
  document.documentElement.removeEventListener('mouseleave', onPointerLeave)
  window.removeEventListener('blur', onBlur)
  document.documentElement.classList.remove('custom-cursor-on')
})

watch(
  active,
  (on) => {
    document.documentElement.classList.toggle('custom-cursor-on', on)
  },
  { immediate: true },
)

watch([preset, active, labelMounted], () => {
  if (active.value) nextTick(place)
})

watch(trailOn, (on) => {
  if (!on) {
    window.cancelAnimationFrame(trailRaf)
    trailRaf = 0
    return
  }
  trailPoints.length = 0
  if (!trailRaf) trailRaf = requestAnimationFrame(stepTrail)
})
</script>

<style scoped>
.site-cursor {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 10000;
  pointer-events: none;
  width: 0;
  height: 0;
  overflow: visible;
}

.site-cursor__line {
  position: fixed;
  inset: 0;
  z-index: 9999;
  width: 100%;
  height: 100%;
  pointer-events: none;
  mix-blend-mode: difference;
}

.site-cursor__orb {
  position: absolute;
  top: 0;
  left: 0;
  width: 12px;
  height: 12px;
  margin: 0;
  border-radius: 50%;
  background: #fff;
  mix-blend-mode: difference;
  translate: -50% -50%;
  transform: translate3d(-100px, -100px, 0);
  will-change: transform, width, height, background, border;
  transition:
    width 0.18s cubic-bezier(0.22, 1, 0.36, 1),
    height 0.18s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.18s ease,
    background 0.18s ease,
    border-color 0.18s ease;
}

.site-cursor--mark .site-cursor__orb {
  opacity: 0;
  background: transparent;
  border: 0;
}

.site-cursor__mark {
  position: absolute;
  top: 0;
  left: 0;
  width: 48px;
  height: 48px;
  overflow: visible;
  color: #fff;
  mix-blend-mode: difference;
  translate: -50% -50%;
  transform: translate3d(-100px, -100px, 0);
  pointer-events: none;
}

.site-cursor__mark-svg {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: center;
}

.site-cursor__hint {
  position: absolute;
  top: 0;
  left: 0;
  margin: 0;
  color: #fff;
  mix-blend-mode: difference;
  white-space: nowrap;
  pointer-events: none;
  translate: 18px -50%;
  transform: translate3d(-100px, -100px, 0);
}

.site-cursor--mark .site-cursor__hint {
  translate: 30px -50%;
}

.site-cursor--tip-left .site-cursor__hint {
  translate: calc(-100% - 18px) -50%;
}

.site-cursor--mark.site-cursor--tip-left .site-cursor__hint {
  translate: calc(-100% - 30px) -50%;
}

.site-cursor__hint.is-removing .site-cursor__hint-char {
  transition: none;
}

.site-cursor__hint-char {
  opacity: 0;
}

.site-cursor__hint-char.is-in {
  opacity: 1;
  transition: opacity 0.22s ease;
}

@media (prefers-reduced-motion: reduce) {
  .site-cursor__orb,
  .site-cursor__hint,
  .site-cursor__hint-char.is-in {
    transition: none;
  }
}
</style>
