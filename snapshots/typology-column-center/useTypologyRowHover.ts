import type { InjectionKey } from 'vue'

export const typologyRowHoverKey: InjectionKey<{
  setHoveredTitle: (title: string | null) => void
}> = Symbol('typologyRowHover')
