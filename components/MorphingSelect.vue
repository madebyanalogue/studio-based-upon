<template>
  <div
    ref="rootEl"
    class="msel"
    :class="{ 'msel--up': direction === 'up', 'msel--open': open }"
    :style="{
      '--msel-gap': `${gap}px`,
      '--msel-panel-width': panelWidth ? `${panelWidth}px` : undefined,
    }"
    data-cursor="default"
  >
    <span :id="labelId" class="msel__label">{{ label }}</span>

    <div
      class="msel__stack"
      :style="chipWidth ? { width: `${chipWidth}px` } : undefined"
    >
      <div
        ref="gooEl"
        class="msel__goo"
        :style="{ filter: gooActive ? `url(#${filterId})` : 'none' }"
      >
        <svg class="msel__filter" width="0" height="0" aria-hidden="true" focusable="false">
          <defs>
            <filter
              :id="filterId"
              x="-250%"
              y="-700%"
              width="600%"
              height="1500%"
              color-interpolation-filters="sRGB"
            >
              <feGaussianBlur
                in="SourceGraphic"
                :stdDeviation="blurStd"
                result="blur"
              />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
                result="goo"
              />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
        </svg>
        <div ref="triggerBgEl" class="msel__trigger-bg" />
        <div ref="panelBgEl" class="msel__panel-bg" />
      </div>

      <div class="msel__trigger-bg-crisp" aria-hidden="true" />

      <div class="msel__content">
        <button
          ref="triggerEl"
          type="button"
          class="msel__trigger interface"
          :aria-haspopup="'listbox'"
          :aria-expanded="open"
          :aria-labelledby="labelId"
          :aria-activedescendant="open ? optionId(activeIndex) : undefined"
          @click="toggle"
          @keydown="onTriggerKeydown"
        >
          <div ref="rollerEl" class="msel__value-roller">
            <!-- Text is JS-driven so Vue model updates don't snap mid-roll. -->
            <span ref="valueEl" class="msel__value-face" />
            <span ref="valueNextEl" class="msel__value-face msel__value-face--next" aria-hidden="true" />
          </div>
          <svg
            ref="caretEl"
            class="msel__caret"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <div
          ref="panelEl"
          class="msel__panel"
          :style="panelWidth ? { width: `${panelWidth}px` } : undefined"
          :aria-hidden="!open"
          :inert="!open || undefined"
        >
          <div class="msel__menu">
            <div ref="highlightEl" class="msel__highlight" aria-hidden="true" />
            <ul
              ref="listEl"
              class="msel__list"
              role="listbox"
              tabindex="-1"
              :aria-labelledby="labelId"
              @mouseleave="onListLeave"
            >
              <li
                v-for="(option, index) in options"
                :id="optionId(index)"
                :key="option.value"
                class="msel__option"
                role="option"
                :aria-selected="selectedIndex === index"
                @pointerenter="onOptionEnter(index)"
                @click="selectIndex(index)"
              >
                <span class="msel__option-mask">
                  <span class="msel__option-inner">{{ option.label }}</span>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'

export type MorphingSelectOption = {
  value: string
  label: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: readonly MorphingSelectOption[]
    label?: string
    direction?: 'up' | 'down'
    duration?: number
    gap?: number
    stagger?: number
  }>(),
  {
    label: 'Filter',
    direction: 'up',
    duration: 0.8,
    gap: 12,
    stagger: 0.02,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

gsap.registerPlugin(CustomEase)
if (!CustomEase.get('mselOpen')) {
  CustomEase.create('mselOpen', 'M0,0 C0.3,0.9 0.1,1 1,1')
}
if (!CustomEase.get('mselInOut')) {
  CustomEase.create('mselInOut', 'M0,0 C0.7,0 0.16,1 1,1')
}

const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
const filterId = `msel-goo-${uid}`
const labelId = `msel-label-${uid}`
const optionId = (index: number) => `msel-opt-${uid}-${index}`

const rootEl = ref<HTMLElement | null>(null)
const gooEl = ref<HTMLElement | null>(null)
const triggerEl = ref<HTMLButtonElement | null>(null)
const triggerBgEl = ref<HTMLElement | null>(null)
const panelBgEl = ref<HTMLElement | null>(null)
const panelEl = ref<HTMLElement | null>(null)
const listEl = ref<HTMLElement | null>(null)
const highlightEl = ref<HTMLElement | null>(null)
const caretEl = ref<SVGElement | null>(null)
const valueEl = ref<HTMLElement | null>(null)
const valueNextEl = ref<HTMLElement | null>(null)
const open = ref(false)
const gooActive = ref(false)
const blurStd = ref(0)
const hoverIndex = ref(-1)
const optionReady = ref<boolean[]>([])
/** Closed pill width — tracks the selected label. */
const chipWidth = ref(0)
/** Open list width — fixed from the longest option, right-aligned to the chip. */
const panelWidth = ref(0)

let timeline: gsap.core.Timeline | null = null
let chipTween: gsap.core.Tween | null = null
let valueTween: gsap.core.Timeline | null = null
let resizeTimer = 0
/** Skip the external model watch while a local select is driving the chip. */
let selecting = false

/* 1rem left + 1rem right @ 16px root */
const TRIGGER_PAD_X = 32
const TRIGGER_GAP = 10
const CARET_W = 14
const OPTION_PAD_X = 34
const LIST_PAD_X = 10
const selectedIndex = computed(() => {
  const index = props.options.findIndex((option) => option.value === props.modelValue)
  return index >= 0 ? index : 0
})

const selectedLabel = computed(
  () => props.options[selectedIndex.value]?.label || props.label,
)

const activeIndex = computed(() =>
  hoverIndex.value >= 0 ? hoverIndex.value : selectedIndex.value,
)

const openEase = 'elastic.out(1, 0.82)'
const closeEase = 'mselOpen'

const prefersReducedMotion = () =>
  import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const setExpanded = (value: boolean) => {
  open.value = value
  const panel = panelEl.value
  if (!panel) return
  if (value) panel.removeAttribute('inert')
  else panel.setAttribute('inert', '')
}

const panelSize = () => {
  const panel = panelEl.value
  return {
    w: panel?.offsetWidth || 0,
    h: panel?.offsetHeight || 0,
  }
}

const measureTextWidth = (label: string) => {
  const root = rootEl.value
  const face = valueEl.value
  if (!root || !face) return 0
  const probe = face.cloneNode(false) as HTMLElement
  probe.textContent = label
  probe.removeAttribute('style')
  probe.style.cssText =
    'position:absolute;left:0;top:0;visibility:hidden;pointer-events:none;white-space:nowrap;'
  root.appendChild(probe)
  const textW = probe.offsetWidth
  probe.remove()
  return textW
}

const measureLabelWidth = (label: string) =>
  Math.ceil(measureTextWidth(label) + TRIGGER_PAD_X + TRIGGER_GAP + CARET_W)

const measurePanelWidth = () => {
  let maxText = 0
  for (const option of props.options) {
    maxText = Math.max(maxText, measureTextWidth(option.label))
  }
  return Math.max(120, Math.ceil(maxText + OPTION_PAD_X + LIST_PAD_X))
}

const syncPanelWidth = () => {
  panelWidth.value = measurePanelWidth()
}

const currentChipWidth = () => chipWidth.value || triggerEl.value?.offsetWidth || 0

/** List width only — never follow the active chip. */
const lockedPanelWidth = () => {
  if (panelWidth.value > 0) return panelWidth.value
  syncPanelWidth()
  return panelWidth.value || 160
}

/** Black layers extend this far past the chip / list on every side. */
const INK_PAD = 5

const resetPanelBg = () => {
  const trigger = triggerEl.value
  const panelBg = panelBgEl.value
  if (!trigger || !panelBg) return
  const w = (currentChipWidth() || trigger.offsetWidth) + INK_PAD * 2
  const h = trigger.offsetHeight + INK_PAD * 2
  gsap.set(panelBg, {
    width: w,
    height: h,
    y: 0,
    right: 0,
    top: props.direction === 'up' ? 'auto' : 0,
    bottom: props.direction === 'up' ? 0 : 'auto',
    borderRadius: h / 2,
    force3D: true,
  })
}

const setHotOption = (index: number) => {
  rootEl.value?.querySelectorAll<HTMLElement>('.msel__option').forEach((el, i) => {
    el.classList.toggle('msel__option--hot', i === index)
  })
}

const fitChip = (label = selectedLabel.value, animate = false) => {
  const next = measureLabelWidth(label)
  if (!next) return next
  chipTween?.kill()
  if (!animate || prefersReducedMotion() || !chipWidth.value) {
    chipWidth.value = next
    if (!open.value) resetPanelBg()
    return next
  }
  const from = currentChipWidth() || next
  chipWidth.value = from
  chipTween = gsap.to(chipWidth, {
    value: next,
    duration: 0.45,
    ease: 'mselInOut',
    onUpdate: () => {
      if (!open.value) resetPanelBg()
    },
    onComplete: () => {
      chipTween = null
      if (!open.value) resetPanelBg()
    },
  })
  return next
}

const faceTravel = () => {
  const roller = valueEl.value?.parentElement
  return Math.round(roller?.offsetHeight || valueEl.value?.offsetHeight || 16)
}

const syncFaceLabel = (label: string) => {
  const current = valueEl.value
  const next = valueNextEl.value
  if (current) {
    current.textContent = label
    gsap.set(current, { y: 0, force3D: false })
  }
  if (next) {
    next.textContent = label
    gsap.set(next, { y: faceTravel(), force3D: false })
  }
}

/** Old title out → chip width → new title in (only after width ends). */
const rollValue = (label: string, widthTo?: number) => {
  const current = valueEl.value
  const next = valueNextEl.value
  if (!current || !next) return
  valueTween?.kill()
  chipTween?.kill()
  gsap.killTweensOf([current, next])

  const travel = faceTravel()
  gsap.set(current, { y: 0, force3D: false })
  next.textContent = label
  gsap.set(next, { y: travel, force3D: false })

  if (prefersReducedMotion()) {
    syncFaceLabel(label)
    if (widthTo) {
      chipWidth.value = widthTo
      if (!open.value) resetPanelBg()
    }
    selecting = false
    return
  }

  const targetW = Math.round(widthTo || measureLabelWidth(label))
  valueTween = gsap.timeline({
    onComplete: () => {
      // Handoff while next is already at rest — avoid transform snap.
      current.textContent = label
      gsap.set(current, { y: 0, force3D: false })
      gsap.set(next, { y: travel, force3D: false })
      valueTween = null
      selecting = false
    },
  })
  // 1) current title leaves
  valueTween.to(current, { y: -travel, duration: 0.28, ease: 'mselInOut', force3D: false })
  // 2) then chip warps to the new label width
  valueTween.to(chipWidth, {
    value: targetW,
    duration: 0.4,
    ease: 'mselInOut',
    onUpdate: () => {
      if (!open.value) resetPanelBg()
    },
    onComplete: () => {
      chipWidth.value = targetW
      if (!open.value) resetPanelBg()
    },
  })
  // 3) new title arrives only after width has finished (pixel y, no 3D layer jiggle)
  valueTween.to(next, { y: 0, duration: 0.32, ease: 'mselInOut', force3D: false })
}

const hideOptions = () => {
  optionReady.value = props.options.map(() => false)
  const inners = rootEl.value?.querySelectorAll<HTMLElement>('.msel__option-inner')
  inners?.forEach((el) => {
    gsap.killTweensOf(el)
    gsap.set(el, { opacity: 0 })
  })
}

const moveHighlight = (index: number, instant = false) => {
  const highlight = highlightEl.value
  const option = rootEl.value?.querySelectorAll<HTMLElement>('.msel__option')[index]
  const menu = highlight?.offsetParent as HTMLElement | null
  if (!highlight || !option || !menu) return
  if (index < 0 || index === hoverIndex.value) return
  const first = hoverIndex.value < 0
  hoverIndex.value = index
  setHotOption(index)
  const optionBox = option.getBoundingClientRect()
  const menuBox = menu.getBoundingClientRect()
  const y = optionBox.top - menuBox.top
  const h = optionBox.height
  if (first) {
    gsap.set(highlight, { y, height: h, autoAlpha: 0, force3D: true })
    gsap.to(highlight, { autoAlpha: 1, duration: 0.18, ease: 'power2.out' })
    return
  }
  gsap.to(highlight, {
    y,
    height: h,
    autoAlpha: 1,
    duration: instant ? 0 : 0.22,
    ease: 'mselInOut',
    force3D: true,
    overwrite: 'auto',
  })
}

const panelRadiusPx = () => {
  const panel = panelEl.value
  if (!panel) return 22
  const raw = getComputedStyle(panel).borderTopLeftRadius
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : 22
}

const clearHighlight = () => {
  const highlight = highlightEl.value
  if (!highlight || hoverIndex.value < 0) return
  hoverIndex.value = -1
  setHotOption(-1)
  gsap.to(highlight, {
    autoAlpha: 0,
    duration: 0.2,
    ease: 'power2.in',
    overwrite: 'auto',
  })
}

const spinCaret = (toOpen: boolean) => {
  if (!caretEl.value) return
  gsap.to(caretEl.value, {
    rotation: toOpen ? 180 : 0,
    duration: 0.4,
    ease: 'mselInOut',
    force3D: true,
    overwrite: 'auto',
  })
}

const openMenu = async () => {
  if (open.value) return
  const trigger = triggerEl.value
  const panel = panelEl.value
  const panelBg = panelBgEl.value
  if (!trigger || !panel || !panelBg) return

  syncPanelWidth()
  setExpanded(true)
  await nextTick()
  const size = panelSize()
  const wasActive = timeline?.isActive()
  timeline?.kill()
  hideOptions()
  clearHighlight()
  if (!wasActive) resetPanelBg()

  blurStd.value = 9
  gooActive.value = true

  const reduced = prefersReducedMotion()
  const duration = reduced ? 0.01 : props.duration
  const ease = reduced ? 'none' : openEase
  const travel =
    (trigger.offsetHeight + props.gap + INK_PAD) *
    (props.direction === 'up' ? -1 : 1)
  const fromW = (currentChipWidth() || trigger.offsetWidth) + INK_PAD * 2
  const toW = lockedPanelWidth() + INK_PAD * 2
  const toH = (size.h || panelEl.value?.offsetHeight || 0) + INK_PAD * 2

  timeline = gsap.timeline({ defaults: { force3D: true } })
  spinCaret(true)
  // Ink blob expands into the list — chip stays on the crisp layer.
  gsap.set(panelBg, {
    width: fromW,
    right: 0,
    top: props.direction === 'up' ? 'auto' : 0,
    bottom: props.direction === 'up' ? 0 : 'auto',
  })
  timeline
    .to(panelBg, { y: travel, duration, ease }, 0)
    .to(
      panelBg,
      {
        width: toW,
        height: toH,
        right: 0,
        borderRadius: panelRadiusPx() + INK_PAD,
        duration,
        ease,
      },
      0.07,
    )

  const blurProxy = { std: 9 }
  timeline.to(
    blurProxy,
    {
      std: 0,
      duration: 0.25 * duration,
      ease: 'power1.in',
      onUpdate: () => {
        blurStd.value = blurProxy.std
      },
      onComplete: () => {
        gooActive.value = false
      },
    },
    0.4 * duration,
  )
  timeline.to(panel, { autoAlpha: 1, duration: 0.2, ease: 'power2.out' }, 0.3 * duration)

  const optionStart = 0.32 * duration
  const inners = rootEl.value?.querySelectorAll<HTMLElement>('.msel__option-inner')
  inners?.forEach((el, index) => {
    timeline?.to(
      el,
      {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
        onComplete: () => {
          optionReady.value[index] = true
          const option = rootEl.value?.querySelectorAll('.msel__option')[index]
          if (option?.matches(':hover')) moveHighlight(index)
        },
      },
      optionStart + index * props.stagger,
    )
  })
  timeline.call(
    () => moveHighlight(selectedIndex.value, true),
    undefined,
    optionStart + props.options.length * props.stagger,
  )
}

const closeMenu = (
  restoreFocus = true,
  nextLabel = selectedLabel.value,
  { animateChip = true }: { animateChip?: boolean } = {},
) => {
  if (!open.value) return
  const trigger = triggerEl.value
  const panel = panelEl.value
  const panelBg = panelBgEl.value
  if (!trigger || !panel || !panelBg) return

  const targetW = measureLabelWidth(nextLabel)
  setExpanded(false)
  timeline?.kill()
  clearHighlight()
  blurStd.value = 0
  gooActive.value = true

  const reduced = prefersReducedMotion()
  const duration = reduced ? 0.01 : props.duration * 0.65
  const ease = reduced ? 'none' : closeEase

  timeline = gsap.timeline({
    defaults: { force3D: true },
    onComplete: () => {
      gooActive.value = false
      if (animateChip) chipWidth.value = targetW
      resetPanelBg()
    },
  })

  const blurProxy = { std: 0 }
  timeline.to(
    blurProxy,
    {
      std: 9,
      duration: 0.15,
      ease: 'power2.out',
      onUpdate: () => {
        blurStd.value = blurProxy.std
      },
    },
    0,
  )
  spinCaret(false)
  timeline.to(panel, { autoAlpha: 0, duration: 0.2, ease: 'power2.in' }, 0)
  if (animateChip) {
    chipTween?.kill()
    timeline.to(
      chipWidth,
      {
        value: targetW,
        duration,
        ease,
      },
      0.12,
    )
  }
  // Collapse the list ink back under the chip.
  const closeH = trigger.offsetHeight + INK_PAD * 2
  timeline.to(
    panelBg,
    {
      width: targetW + INK_PAD * 2,
      height: closeH,
      right: 0,
      borderRadius: closeH / 2,
      duration,
      ease,
    },
    0,
  )
  timeline.to(panelBg, { y: 0, duration, ease }, 0.07)

  const clearProxy = { std: 9 }
  timeline.to(
    clearProxy,
    {
      std: 0,
      duration: 0.3 * duration,
      ease: 'power1.in',
      onUpdate: () => {
        blurStd.value = clearProxy.std
      },
    },
    0.55 * duration,
  )
  timeline.call(hideOptions, undefined, 0.22)
  if (restoreFocus) trigger.focus()
}

const toggle = () => {
  if (open.value) closeMenu()
  else openMenu()
}

const selectIndex = (index: number) => {
  const option = props.options[index]
  if (!option) return
  const nextW = measureLabelWidth(option.label)
  if (option.value !== props.modelValue) {
    selecting = true
    rollValue(option.label, nextW)
    emit('update:modelValue', option.value)
    closeMenu(true, option.label, { animateChip: false })
    return
  }
  closeMenu(true, option.label)
}

const onOptionEnter = (index: number) => {
  if (optionReady.value[index]) moveHighlight(index)
}

const onListLeave = () => {
  if (open.value) moveHighlight(selectedIndex.value)
}

const stepHighlight = (delta: number) => {
  const count = props.options.length
  if (!count) return
  const from = hoverIndex.value >= 0 ? hoverIndex.value : selectedIndex.value
  const next = (from + delta + count) % count
  moveHighlight(next)
}

const onTriggerKeydown = (event: KeyboardEvent) => {
  if (!open.value) {
    if (
      event.key === 'Enter' ||
      event.key === ' ' ||
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp'
    ) {
      event.preventDefault()
      openMenu()
    }
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    stepHighlight(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    stepHighlight(-1)
  } else if (event.key === 'Home') {
    event.preventDefault()
    moveHighlight(0)
  } else if (event.key === 'End') {
    event.preventDefault()
    moveHighlight(props.options.length - 1)
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    selectIndex(activeIndex.value)
  }
}

const onDocumentKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && open.value) closeMenu()
}

const onDocumentPointer = (event: PointerEvent) => {
  if (!open.value) return
  const root = rootEl.value
  if (root && event.target instanceof Node && root.contains(event.target)) return
  closeMenu(false)
}

const onResize = () => {
  window.clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(() => {
    syncPanelWidth()
    if (open.value) {
      const size = panelSize()
      const trigger = triggerEl.value
      const panelBg = panelBgEl.value
      if (!trigger || !panelBg) return
      gsap.set(panelBg, {
        width: lockedPanelWidth() + INK_PAD * 2,
        height: size.h + INK_PAD * 2,
        right: 0,
        y:
          (trigger.offsetHeight + props.gap + INK_PAD) *
          (props.direction === 'up' ? -1 : 1),
      })
      moveHighlight(activeIndex.value, true)
      return
    }
    fitChip(selectedLabel.value, false)
  }, 150)
}

watch(
  () => props.modelValue,
  () => {
    if (selecting) return
    const label = selectedLabel.value
    if (valueEl.value && valueEl.value.textContent !== label) {
      syncFaceLabel(label)
    }
    if (!open.value) fitChip(label, true)
  },
)

watch(
  () => props.options.map((option) => `${option.value}:${option.label}`).join('|'),
  async () => {
    await nextTick()
    hideOptions()
    syncPanelWidth()
    fitChip(selectedLabel.value, false)
  },
)

onMounted(async () => {
  await nextTick()
  syncFaceLabel(selectedLabel.value)
  hideOptions()
  gsap.set(panelEl.value, { autoAlpha: 0 })
  syncPanelWidth()
  fitChip(selectedLabel.value, false)
  setExpanded(false)
  document.addEventListener('keydown', onDocumentKeydown)
  document.addEventListener('pointerdown', onDocumentPointer)
  window.addEventListener('resize', onResize)
  void document.fonts?.ready.then(() => {
    syncPanelWidth()
    fitChip(selectedLabel.value, false)
  })
})

onBeforeUnmount(() => {
  window.clearTimeout(resizeTimer)
  timeline?.kill()
  chipTween?.kill()
  valueTween?.kill()
  document.removeEventListener('keydown', onDocumentKeydown)
  document.removeEventListener('pointerdown', onDocumentPointer)
  window.removeEventListener('resize', onResize)
})

defineExpose({ open: openMenu, close: closeMenu, toggle })
</script>

<style scoped>
.msel {
  /* Dark UI — hard-black ink, white chip (not --charcoal). */
  --msel-ink: #111;
  --msel-chip: #fff;
  --msel-fg: #111;
  --msel-fg-soft: rgba(241, 237, 228, 0.72);
  --msel-highlight: #fff;
  --msel-hot: #111;
  --msel-shell-pad: 4px;
  /* Option pill ~half-height; panel radius = pad + that. */
  --msel-pill-radius: 1.1rem;
  --msel-panel-radius: calc(var(--msel-shell-pad) + var(--msel-pill-radius));
  position: relative;
  display: block;
  width: max-content;
  max-width: min(280px, 70vw);
  margin: 0;
  padding: var(--msel-shell-pad);
  border: 1px solid var(--grid-line);
  border-radius: 999px;
  background: color-mix(in srgb, var(--background-color, var(--cream)) 88%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-sizing: border-box;
  font-family: var(--mono);
  font-size: var(--text-sm, 13px);
  /* Match .interface / .sliding-pill button tracking. */
  letter-spacing: 0.065em;
  -webkit-font-smoothing: antialiased;
}

.msel__label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.msel__stack {
  position: relative;
  overflow: visible;
}

.msel__goo {
  /* Room for the ink layers that extend 5px past the chip. */
  position: absolute;
  inset: -5px;
  z-index: 0;
  overflow: visible;
  pointer-events: none;
}

.msel__filter {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}

.msel__trigger-bg,
.msel__panel-bg {
  position: absolute;
  top: 0;
  will-change: transform, width, height, background-color;
}

.msel__trigger-bg {
  /* Fills the expanded goo — 5px wider than the chip on every side. */
  inset: 0;
  width: auto;
  height: auto;
  border-radius: 999px;
  background: var(--msel-ink);
  transform-origin: 50% 0%;
}

.msel__trigger-bg-crisp {
  /* Chip stays on the stack footprint; blacks live in the expanded goo. */
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: var(--msel-chip);
  pointer-events: none;
}

.msel__panel-bg {
  right: 0;
  left: auto;
  border-radius: 999px;
  background: var(--msel-ink);
  transform-origin: 100% 0%;
}

.msel--up .msel__panel-bg {
  top: auto;
  bottom: 0;
  transform-origin: 100% 100%;
}

.msel__content {
  position: relative;
  z-index: 1;
}

.msel__trigger {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  min-height: 0;
  margin: 0;
  padding: 0.45rem 1rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--msel-fg);
  cursor: pointer;
  outline: none;
  box-sizing: border-box;
  white-space: nowrap;
  padding-right: .7rem;
}

.msel__trigger:focus-visible {
  outline: 2px solid var(--accent, var(--charcoal));
  outline-offset: 2px;
}

.msel__value-roller {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  height: 1.3em;
  line-height: 1.3em;
}

.msel__value-face {
  /* Both faces absolute so in/out never shifts layout. */
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  font-size: inherit;
  font-weight: 400;
  letter-spacing: inherit;
  line-height: inherit;
  white-space: nowrap;
  will-change: transform;
}

.msel__value-face--next {
  transform: translateY(100%);
}

.msel__caret {
  flex: none;
  display: block;
  width: 14px;
  height: 14px;
  transform-origin: 50% 50%;
}

.msel__panel {
  /* List shell; clear the 5px ink halo on the chip. */
  position: absolute;
  top: calc(100% + var(--msel-gap) + 5px);
  right: 0;
  left: auto;
  width: var(--msel-panel-width, max-content);
  min-width: var(--msel-panel-width, 0);
  max-width: var(--msel-panel-width, none);
  padding: var(--msel-shell-pad);
  border: 1px solid var(--msel-ink);
  border-radius: var(--msel-panel-radius);
  background: var(--msel-ink);
  box-sizing: border-box;
  z-index: 2;
  visibility: hidden;
  opacity: 0;
}

.msel--up .msel__panel {
  top: auto;
  bottom: calc(100% + var(--msel-gap) + 5px);
}

.msel__menu {
  position: relative;
  z-index: 1;
}

.msel__list {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
  outline: none;
}

.msel__highlight {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 0;
  border-radius: 999px;
  background: var(--msel-highlight);
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
}

.msel__option {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  margin: 0;
  padding: 0.45rem 1.05rem;
  border-radius: 999px;
  cursor: pointer;
}

.msel__option-mask {
  position: relative;
  display: block;
}

.msel__option-inner {
  display: block;
  font-size: inherit;
  font-weight: 400;
  letter-spacing: inherit;
  color: var(--msel-fg-soft);
  white-space: nowrap;
  opacity: 0;
  transition: color 0.18s ease;
}

/* Highlighted option — ink-on-chip contrast. */
.msel__option--hot .msel__option-inner,
.msel__option:hover .msel__option-inner {
  color: var(--msel-hot);
}

@media (prefers-reduced-motion: reduce) {
  .msel__trigger-bg,
  .msel__panel-bg,
  .msel__caret,
  .msel__value-face,
  .msel__option-inner,
  .msel__highlight {
    transition: none;
  }
}
</style>

<style>
/* Unscoped: follow early <html> theme script on hard load (Vue state lags). */
html:not(.dark) .msel {
  /* Ink / list = same frosted shell as SlidingPill; chip = toggle blob. */
  --msel-ink: color-mix(in srgb, var(--background-color, var(--cream)) 88%, transparent);
  --msel-chip: var(--charcoal);
  --msel-fg: var(--cream);
  --msel-fg-soft: color-mix(in srgb, var(--charcoal) 55%, transparent);
  --msel-highlight: var(--charcoal);
  --msel-hot: var(--cream);
}

html:not(.dark) .msel__trigger-bg,
html:not(.dark) .msel__panel-bg,
html:not(.dark) .msel__panel {
  background: var(--msel-ink);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

html:not(.dark) .msel__panel {
  border-color: var(--grid-line);
}
</style>
