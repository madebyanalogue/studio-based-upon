/**
 * Custom cursor presets — onboarding tips, icons, and hover states.
 *
 * Usage: put `data-cursor="<id>"` on the hover target.
 * `native` is reserved to restore the OS cursor (inputs, drag handles).
 */

export type CursorIconId = 'arrow-next' | 'arrow-prev' | 'plus' | 'close'

export type CursorPreset = {
  id: string
  /** Label attached to the cursor. */
  tooltip?: string
  /** When set, the 12px disc becomes an outline around this glyph. */
  icon?: CursorIconId
}

export const CURSOR_LIBRARY: Record<string, CursorPreset> = {
  next: {
    id: 'next',
    icon: 'arrow-next',
  },
  prev: {
    id: 'prev',
    icon: 'arrow-prev',
  },
  plus: {
    id: 'plus',
    icon: 'plus',
  },
  close: {
    id: 'close',
    icon: 'close',
  },
  'view-selection': {
    id: 'view-selection',
    tooltip: 'View My Selection',
  },
}

export const CURSOR_NATIVE_ID = 'native'

export const resolveCursorPreset = (id: string | null | undefined): CursorPreset | null => {
  if (!id || id === CURSOR_NATIVE_ID || id === 'default') return null
  return CURSOR_LIBRARY[id] ?? null
}
