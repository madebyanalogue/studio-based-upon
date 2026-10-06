/**
 * Custom cursor presets — onboarding tips, icons, and hover states.
 *
 * Usage: put `data-cursor="<id>"` on the hover target.
 * `native` is reserved to restore the OS cursor (inputs, drag handles).
 */

export type CursorIconId = 'arrow-next' | 'arrow-prev' | 'plus' | 'close' | 'heart'

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
    tooltip: 'View',
  },
  close: {
    id: 'close',
    icon: 'close',
  },
  /** Wordmark used outside an open typology row — no X glyph. */
  'close-label': {
    id: 'close-label',
    tooltip: 'Close',
  },
  /** Heart replaces the disc on a thumbnail save control. */
  'add-selection': {
    id: 'add-selection',
    tooltip: 'Gather',
    icon: 'heart',
  },
  'remove-selection': {
    id: 'remove-selection',
    tooltip: 'Remove from Stack',
    icon: 'heart',
  },
  'view-selection': {
    id: 'view-selection',
    tooltip: 'View My Selection',
  },
  'drag-composition': {
    id: 'drag-composition',
    tooltip: 'Drag into composition',
  },
  gathered: {
    id: 'gathered',
    tooltip: 'Gathered',
  },
}

export const CURSOR_NATIVE_ID = 'native'

export const resolveCursorPreset = (id: string | null | undefined): CursorPreset | null => {
  if (!id || id === CURSOR_NATIVE_ID || id === 'default') return null
  return CURSOR_LIBRARY[id] ?? null
}
