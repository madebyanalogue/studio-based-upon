import {
  CURSOR_NATIVE_ID,
  resolveCursorPreset,
  type CursorPreset,
} from '~/composables/cursorLibrary'

const NATIVE_SELECTOR =
  'input, textarea, select, [contenteditable="true"], [data-cursor="native"], [data-cursor="pointer"]'

export const useCursor = () => {
  const preset = useState<CursorPreset | null>('site-cursor-preset', () => null)
  const native = useState<boolean>('site-cursor-native', () => false)
  /** Header and nav items: no cursor text at all. */
  const suppressLabel = useState<boolean>('site-cursor-suppress-label', () => false)
  /** Explicit `data-cursor="default"`: circle only, no page prompt. */
  const bare = useState<boolean>('site-cursor-bare', () => false)
  /** Pointer is inside the typology trigger column, including the gaps between cells. */
  const overColumn = useState<boolean>('site-cursor-over-column', () => false)
  /** Programmatic overlay for onboarding — wins over hover until cleared. */
  const overrideId = useState<string | null>('site-cursor-override', () => null)

  const setCursor = (id: string | null) => {
    overrideId.value = id
  }

  /** The stacked trigger cells, plus the space between them. */
  const pointerOverTypologyColumn = (x: number, y: number) => {
    const page = document.querySelector('.discover-page')
    if (!page) return false
    const triggers = page.querySelectorAll<HTMLElement>('.collection-rail__card--trigger')
    let top = Infinity
    let bottom = -Infinity
    let left = Infinity
    let right = -Infinity
    triggers.forEach((card) => {
      const rect = card.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1) return
      top = Math.min(top, rect.top)
      bottom = Math.max(bottom, rect.bottom)
      left = Math.min(left, rect.left)
      right = Math.max(right, rect.right)
    })
    if (top === Infinity) return false
    return x >= left && x <= right && y >= top && y <= bottom
  }

  const resolveFromPoint = (x: number, y: number) => {
    if (overrideId.value) {
      overColumn.value = false
      suppressLabel.value = false
      bare.value = false
      native.value = overrideId.value === CURSOR_NATIVE_ID
      preset.value =
        overrideId.value === CURSOR_NATIVE_ID
          ? null
          : resolveCursorPreset(overrideId.value)
      return
    }

    if (typeof document === 'undefined') return

    if (document.documentElement.dataset.resizeCursor) {
      native.value = true
      suppressLabel.value = false
      bare.value = false
      preset.value = null
      return
    }

    overColumn.value = pointerOverTypologyColumn(x, y)

    const stack = document.elementsFromPoint(x, y)
    for (const node of stack) {
      if (!(node instanceof Element)) continue
      if (node.closest('.site-cursor')) continue
      if (getComputedStyle(node).pointerEvents === 'none') continue
      if (node.closest('.header')) {
        native.value = false
        suppressLabel.value = true
        bare.value = false
        if (preset.value) preset.value = null
        return
      }
      if (node.closest(NATIVE_SELECTOR)) {
        native.value = true
        suppressLabel.value = false
        bare.value = false
        preset.value = null
        return
      }
      const host = node.closest('[data-cursor], [data-cursor-label]')
      if (host instanceof HTMLElement) {
        const id = host.getAttribute('data-cursor')
        if (id === CURSOR_NATIVE_ID || id === 'pointer') {
          native.value = true
          suppressLabel.value = false
          bare.value = false
          preset.value = null
          return
        }
        if (id) {
          native.value = false
          suppressLabel.value = false
          bare.value = id === 'default'
          const next = resolveCursorPreset(id)
          if (preset.value !== next) preset.value = next
          return
        }
        const label = host.getAttribute('data-cursor-label')?.trim() || ''
        if (label) {
          native.value = false
          suppressLabel.value = false
          bare.value = false
          if (preset.value?.id === 'cursor-label' && preset.value.tooltip === label) return
          preset.value = { id: 'cursor-label', tooltip: label }
          return
        }
      }
    }

    native.value = false
    suppressLabel.value = false
    bare.value = false
    preset.value = null
  }

  return {
    preset,
    native,
    suppressLabel,
    bare,
    overColumn,
    overrideId,
    setCursor,
    resolveFromPoint,
  }
}
