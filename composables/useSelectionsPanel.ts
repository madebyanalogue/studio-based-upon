/**
 * Left selections side panel — reserves stack-cell width from body layout.
 * Hide toggle can flip `html.selections-panel-hidden` later.
 */
export const useSelectionsPanel = () => {
  const visible = useState<boolean>('selections-panel-visible', () => true)

  const applyDom = (next: boolean) => {
    if (!import.meta.client) return
    document.documentElement.classList.toggle('selections-panel-hidden', !next)
  }

  const setVisible = (next: boolean) => {
    visible.value = next
    applyDom(next)
  }

  const toggleVisible = () => {
    setVisible(!visible.value)
  }

  const initSelectionsPanel = () => {
    if (!import.meta.client) return
    applyDom(visible.value)
  }

  return {
    selectionsPanelVisible: visible,
    setSelectionsPanelVisible: setVisible,
    toggleSelectionsPanel: toggleVisible,
    initSelectionsPanel,
  }
}
