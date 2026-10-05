import {
  CURSOR_NATIVE_ID,
  resolveCursorPreset,
  type CursorPreset,
} from '~/composables/cursorLibrary'

const NATIVE_SELECTOR =
  'input, textarea, select, [contenteditable="true"], [data-cursor="native"]'

export const useCursor = () => {
  const preset = useState<CursorPreset | null>('site-cursor-preset', () => null)
  const native = useState<boolean>('site-cursor-native', () => false)
  /** Programmatic overlay for onboarding — wins over hover until cleared. */
  const overrideId = useState<string | null>('site-cursor-override', () => null)

  const setCursor = (id: string | null) => {
    overrideId.value = id
  }

  const resolveFromPoint = (x: number, y: number) => {
    if (overrideId.value) {
      native.value = overrideId.value === CURSOR_NATIVE_ID
      preset.value =
        overrideId.value === CURSOR_NATIVE_ID
          ? null
          : resolveCursorPreset(overrideId.value)
      return
    }

    if (typeof document === 'undefined') return

    const stack = document.elementsFromPoint(x, y)
    for (const node of stack) {
      if (!(node instanceof Element)) continue
      if (node.closest('.site-cursor')) continue
      if (node.closest(NATIVE_SELECTOR)) {
        native.value = true
        preset.value = null
        return
      }
      const host = node.closest('[data-cursor], [data-cursor-label]')
      if (host instanceof HTMLElement) {
        const id = host.getAttribute('data-cursor')
        if (id === CURSOR_NATIVE_ID) {
          native.value = true
          preset.value = null
          return
        }
        if (id) {
          native.value = false
          const next = resolveCursorPreset(id)
          if (preset.value !== next) preset.value = next
          return
        }
        const label = host.getAttribute('data-cursor-label')?.trim() || ''
        if (label) {
          native.value = false
          if (preset.value?.id === 'cursor-label' && preset.value.tooltip === label) return
          preset.value = { id: 'cursor-label', tooltip: label }
          return
        }
      }
    }

    native.value = false
    preset.value = null
  }

  return {
    preset,
    native,
    overrideId,
    setCursor,
    resolveFromPoint,
  }
}
