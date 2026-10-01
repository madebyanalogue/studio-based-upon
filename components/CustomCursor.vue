<template>
  <Teleport to="body">
    <div
      v-show="active"
      ref="rootRef"
      class="site-cursor"
      :class="{
        'site-cursor--mark': isMark,
        'site-cursor--tip': Boolean(preset?.tooltip),
        'site-cursor--tip-left': tipLeft,
      }"
      aria-hidden="true"
    >
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
      <div
        v-if="preset?.tooltip"
        ref="tipRef"
        class="site-cursor__tip interface"
      >
        {{ preset.tooltip }}
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const { preset, native, resolveFromPoint } = useCursor()

type MarkPose = { stem: number[]; chev: number[]; rotate: number }

const PLUS_STEM = [15, 24, 33, 24]
const PLUS_CHEV = [24, 15, 24, 24, 24, 33]

/** Same two strokes. Close is the plus, turned 45° into an X. */
const MARKS: Record<string, MarkPose> = {
  'arrow-next': {
    stem: [2, 24, 40, 24],
    chev: [31, 15, 40, 24, 31, 33],
    rotate: 0,
  },
  'arrow-prev': {
    stem: [46, 24, 8, 24],
    chev: [17, 15, 8, 24, 17, 33],
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
const tipRef = ref<HTMLElement | null>(null)

const fine = ref(false)
const inside = ref(false)
const tipLeft = ref(false)
let x = 0
let y = 0

const active = computed(() => fine.value && inside.value && !native.value)

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
  const tip = tipRef.value
  if (tip) {
    tip.style.transform = `translate3d(${x}px, ${y}px, 0)`
  }
}

const onPointerMove = (event: PointerEvent) => {
  if (!fine.value) return
  if (event.pointerType && event.pointerType !== 'mouse') return
  x = event.clientX
  y = event.clientY
  inside.value = true
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
  media = window.matchMedia('(hover: hover) and (pointer: fine)')
  media.addEventListener('change', onMedia)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  document.documentElement.addEventListener('mouseleave', onPointerLeave)
  window.addEventListener('blur', onBlur)
})

onUnmounted(() => {
  window.cancelAnimationFrame(markRaf)
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

watch([preset, active], () => {
  if (active.value) nextTick(place)
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

.site-cursor__tip {
  position: absolute;
  top: 0;
  left: 0;
  margin: 0;
  padding: 0.35rem 0.55rem;
  border-radius: 6px;
  background: var(--text-color);
  color: var(--background-color);
  font-size: var(--text-xs);
  line-height: 1.2;
  white-space: nowrap;
  pointer-events: none;
  translate: 14px -50%;
  transform: translate3d(-100px, -100px, 0);
  will-change: transform;
}

:global(html.dark) .site-cursor__tip {
  background: color-mix(in srgb, var(--background-color) 88%, transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: var(--text-color);
}

.site-cursor--tip-left .site-cursor__tip {
  translate: calc(-100% - 14px) -50%;
}

@media (prefers-reduced-motion: reduce) {
  .site-cursor__orb {
    transition: none;
  }
}
</style>
