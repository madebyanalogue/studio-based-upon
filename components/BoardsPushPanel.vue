<template>
  <Teleport to="body">
    <MoodboardBoardsPanel
      v-if="!isMoodboard"
      fixed
      :open="boardsPanelOpen"
      @select="onSelect"
      @delete="onDelete"
      @send="onSend"
    />
  </Teleport>
</template>

<script setup lang="ts">
const { isMoodboard, openMoodboard, activeMoodboardId } = useBucket()
const {
  boards,
  boardsPanelOpen,
  activeBoardId,
  setActiveBoard,
  saveActiveBoard,
  createBoard,
  deleteBoard,
} = useBoards()
const {
  loadBoard,
  placements,
  strokes,
  clearActive,
  reset: resetMoodboard,
} = useMoodboard()
const { openFromMoodboard } = useEnquiryForm()

const onSelect = async (id: string) => {
  if (isMoodboard.value) {
    if (id === activeBoardId.value) return
    if (activeBoardId.value) {
      saveActiveBoard(placements.value, strokes.value)
    }
    setActiveBoard(id)
    const board = boards.value.find((entry) => entry.id === id)
    if (board) loadBoard(board.placements, board.strokes)
    clearActive()
    return
  }
  const board = boards.value.find((entry) => entry.id === id)
  if (!board) return
  setActiveBoard(id)
  loadBoard(board.placements, board.strokes)
  openMoodboard({ reopenCart: true })
}

const onDelete = (id: string) => {
  if (!import.meta.client) return
  const board = boards.value.find((entry) => entry.id === id)
  const label = board?.name || 'this board'
  if (!window.confirm(`Delete “${label}”?`)) return
  deleteBoard(id)
  if (!boards.value.length) {
    resetMoodboard()
    createBoard([], [], undefined, undefined, activeMoodboardId.value || undefined)
  }
}

const onSend = (id: string) => {
  const board = boards.value.find((entry) => entry.id === id)
  if (!board) return
  if (!board.placements.length && !board.preview) return
  openFromMoodboard(board.placements, board.preview || null)
}
</script>
