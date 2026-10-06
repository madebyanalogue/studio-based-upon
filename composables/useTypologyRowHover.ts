import { ref, type InjectionKey } from 'vue'

export const typologyRowHoverKey: InjectionKey<{
  setHoveredTitle: (title: string | null) => void
}> = Symbol('typologyRowHover')

/** Which typology row currently owns the activated state. */
export const typologyActiveRailId = ref<string | null>(null)

/** True from activation until the close animation has finished. */
export const typologyRowsLocked = ref(false)

/** Blocks every pointer event while a row is closing and the next one is opening. */
export const typologyPointerPaused = ref(false)

/** After Close is clicked, keep that cursor word from coming back while it types out. */
export const typologyCloseLabelHeld = ref(false)

/** Row to open once the current one has finished closing. */
export const typologyHandoffRailId = ref<string | null>(null)
