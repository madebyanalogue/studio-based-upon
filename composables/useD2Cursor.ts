/**
 * Arrival copy on /d2.
 * scroll → click to delve after the first gesture.
 * ready after the first thumbnail click: the delve prompt stays off.
 */
export type D2CursorPhase = 'scroll' | 'delve' | 'ready'

export const useD2Cursor = () =>
  useState<D2CursorPhase>('d2-cursor-phase', () => 'scroll')
