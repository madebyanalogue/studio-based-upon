import type { MoodboardItem, MoodboardStroke } from './useMoodboard'

export type SavedBoard = {
  id: string
  name: string
  placements: MoodboardItem[]
  strokes: MoodboardStroke[]
  /** JPEG data URL thumbnail of the canvas (captured on save/close). */
  preview?: string
  /** width/height of the preview screenshot (for cart tile aspect). */
  previewAspect?: number
  /** Selection (cart pile) this board belongs to. */
  selectionId?: string
  updatedAt: string
}

const STORAGE_KEY = 'sba-boards'
const LEGACY_COMPOSITION_KEY = 'sba-moodboard-composition'

export type PendingBoardRemoval = {
  key: string
  selectionId: string
  board: SavedBoard
  index: number
  seq: number
}

export type SelectionBoardEntry =
  | { kind: 'board'; board: SavedBoard }
  | { kind: 'undo'; key: string; board: SavedBoard }

const createId = () => `board-${Date.now()}-${Math.round(Math.random() * 1000)}`
const boardRemovalTimers = new Map<string, ReturnType<typeof setTimeout>>()
let boardRemovalSeq = 0

const boardHasContent = (board: SavedBoard) =>
  board.placements.length > 0 || !!board.preview

const boardName = (index = 1) => `My Board ${index}`

const migrateBoardName = (name: string) => {
  if (name === 'Board' || name === 'My Board') return boardName(1)

  const plain = name.match(/^Board (\d+)$/)
  if (plain) return boardName(Number(plain[1]))

  return name
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export const useBoards = () => {
  const boards = useState<SavedBoard[]>('saved-boards', () => [])
  const activeBoardId = useState<string | null>('active-board-id', () => null)
  const boardsOpen = useState('boards-dropdown-open', () => false)
  const pendingBoardRemovals = useState<PendingBoardRemoval[]>(
    'pending-board-removals',
    () => [],
  )

  const activeBoard = computed(
    () => boards.value.find((b) => b.id === activeBoardId.value) || null,
  )

  const boardCount = computed(() => boards.value.length)

  const persist = () => {
    if (!import.meta.client) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boards.value))
  }

  const hydrate = () => {
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as SavedBoard[]
        if (Array.isArray(parsed)) {
          boards.value = parsed.map((board) => ({
            ...board,
            name: migrateBoardName(board.name),
          }))
          if (
            activeBoardId.value &&
            !boards.value.some((b) => b.id === activeBoardId.value)
          ) {
            activeBoardId.value = boards.value[0]?.id || null
          }
          persist()
          return
        }
      }

      // Migrate the old single-composition localStorage blob into a board.
      const legacy = localStorage.getItem(LEGACY_COMPOSITION_KEY)
      if (legacy) {
        const parsed = JSON.parse(legacy) as {
          placements?: MoodboardItem[]
          strokes?: MoodboardStroke[]
        }
        if (parsed?.placements?.length) {
          const board: SavedBoard = {
            id: createId(),
            name: boardName(1),
            placements: parsed.placements,
            strokes: parsed.strokes || [],
            updatedAt: new Date().toISOString(),
          }
          boards.value = [board]
          activeBoardId.value = board.id
          persist()
          localStorage.removeItem(LEGACY_COMPOSITION_KEY)
        }
      }
    } catch {
      boards.value = []
    }
  }

  const createBoard = (
    placements: MoodboardItem[],
    strokes: MoodboardStroke[] = [],
    name?: string,
    preview?: string,
    selectionId?: string,
  ) => {
    const board: SavedBoard = {
      id: createId(),
      name: name?.trim() || boardName(boards.value.length + 1),
      placements: clone(placements),
      strokes: clone(strokes),
      preview: preview || undefined,
      selectionId: selectionId || undefined,
      updatedAt: new Date().toISOString(),
    }
    boards.value = [...boards.value, board]
    activeBoardId.value = board.id
    persist()
    return board
  }

  const updateBoard = (
    id: string,
    patch: Partial<
      Pick<
        SavedBoard,
        'name' | 'placements' | 'strokes' | 'preview' | 'previewAspect' | 'selectionId'
      >
    >,
  ) => {
    boards.value = boards.value.map((board) => {
      if (board.id !== id) return board
      return {
        ...board,
        ...patch,
        placements: patch.placements ? clone(patch.placements) : board.placements,
        strokes: patch.strokes ? clone(patch.strokes) : board.strokes,
        preview: patch.preview !== undefined ? patch.preview : board.preview,
        previewAspect:
          patch.previewAspect !== undefined ? patch.previewAspect : board.previewAspect,
        updatedAt: new Date().toISOString(),
      }
    })
    persist()
  }

  const saveActiveBoard = (
    placements: MoodboardItem[],
    strokes: MoodboardStroke[] = [],
    preview?: string,
    previewAspect?: number,
  ) => {
    if (activeBoardId.value) {
      updateBoard(activeBoardId.value, {
        placements,
        strokes,
        ...(preview !== undefined ? { preview } : {}),
        ...(previewAspect !== undefined ? { previewAspect } : {}),
      })
      return activeBoardId.value
    }
    return createBoard(placements, strokes, undefined, preview).id
  }

  const renameBoard = (id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    updateBoard(id, { name: trimmed })
  }

  const deleteBoard = (id: string) => {
    boards.value = boards.value.filter((board) => board.id !== id)
    if (activeBoardId.value === id) {
      activeBoardId.value = boards.value[0]?.id || null
    }
    persist()
  }

  /** Boards saved from a given selection (cart), newest first. */
  const boardsForSelection = (selectionId: string | null | undefined) => {
    if (!selectionId) return [] as SavedBoard[]
    return boards.value
      .filter(
        (board) => board.selectionId === selectionId && boardHasContent(board),
      )
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  /** Live boards + undo placeholders for a selection (stable visual slots). */
  const selectionBoardEntries = (
    selectionId: string | null | undefined,
  ): SelectionBoardEntry[] => {
    if (!selectionId) return []
    const live = boardsForSelection(selectionId).map((board) => ({
      kind: 'board' as const,
      board,
    }))
    const pendings = pendingBoardRemovals.value
      .filter((entry) => entry.selectionId === selectionId)
      .slice()
      .sort((a, b) => a.index - b.index || a.seq - b.seq)
    if (!pendings.length) return live

    const total = live.length + pendings.length
    const pendingBySlot = new Map(pendings.map((entry) => [entry.index, entry]))
    const entries: SelectionBoardEntry[] = []
    let liveIdx = 0
    for (let slot = 0; slot < total; slot++) {
      const pending = pendingBySlot.get(slot)
      if (pending) {
        entries.push({ kind: 'undo', key: pending.key, board: pending.board })
        continue
      }
      const next = live[liveIdx]
      if (!next) break
      entries.push(next)
      liveIdx += 1
    }
    while (liveIdx < live.length) {
      entries.push(live[liveIdx]!)
      liveIdx += 1
    }
    return entries
  }

  /** Live boards + undo placeholders for the global boards cart. */
  const boardsCartEntries = (): SelectionBoardEntry[] => {
    const live = boards.value
      .filter((board) => boardHasContent(board))
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((board) => ({
        kind: 'board' as const,
        board,
      }))
    const pendings = pendingBoardRemovals.value
      .slice()
      .sort((a, b) => a.index - b.index || a.seq - b.seq)
    if (!pendings.length) return live

    const total = live.length + pendings.length
    const pendingBySlot = new Map(pendings.map((entry) => [entry.index, entry]))
    const entries: SelectionBoardEntry[] = []
    let liveIdx = 0
    for (let slot = 0; slot < total; slot++) {
      const pending = pendingBySlot.get(slot)
      if (pending) {
        entries.push({ kind: 'undo', key: pending.key, board: pending.board })
        continue
      }
      const next = live[liveIdx]
      if (!next) break
      entries.push(next)
      liveIdx += 1
    }
    while (liveIdx < live.length) {
      entries.push(live[liveIdx]!)
      liveIdx += 1
    }
    return entries
  }

  const clearBoardRemovalTimer = (key: string) => {
    const timer = boardRemovalTimers.get(key)
    if (timer) clearTimeout(timer)
    boardRemovalTimers.delete(key)
  }

  const dismissBoardRemoval = (key: string) => {
    clearBoardRemovalTimer(key)
    pendingBoardRemovals.value = pendingBoardRemovals.value.filter(
      (entry) => entry.key !== key,
    )
  }

  /** Soft-remove a board from the cart (undo slot until cart closes). */
  const softRemoveBoard = (id: string) => {
    const board = boards.value.find((entry) => entry.id === id)
    if (!board) return
    const selectionId = board.selectionId || '__global__'
    const visualIndex = boardsCartEntries().findIndex(
      (entry) => entry.kind === 'board' && entry.board.id === id,
    )
    const index = visualIndex >= 0 ? visualIndex : 0
    const key = `board::${id}`
    dismissBoardRemoval(key)

    boards.value = boards.value.filter((entry) => entry.id !== id)
    if (activeBoardId.value === id) {
      activeBoardId.value =
        boards.value.find((entry) => boardHasContent(entry))?.id ||
        boards.value[0]?.id ||
        null
    }
    persist()

    pendingBoardRemovals.value = [
      ...pendingBoardRemovals.value.filter((entry) => entry.key !== key),
      {
        key,
        selectionId,
        board: clone(board),
        index,
        seq: ++boardRemovalSeq,
      },
    ]
  }

  const undoBoardRemove = (key: string) => {
    const pending = pendingBoardRemovals.value.find((entry) => entry.key === key)
    if (!pending) return
    if (boards.value.some((entry) => entry.id === pending.board.id)) {
      dismissBoardRemoval(key)
      return
    }
    boards.value = [...boards.value, clone(pending.board)]
    if (!activeBoardId.value) activeBoardId.value = pending.board.id
    persist()
    dismissBoardRemoval(key)
  }

  const clearPendingBoardRemovals = (selectionId?: string | null) => {
    const keys = pendingBoardRemovals.value
      .filter((entry) => !selectionId || entry.selectionId === selectionId)
      .map((entry) => entry.key)
    for (const key of keys) clearBoardRemovalTimer(key)
    pendingBoardRemovals.value = selectionId
      ? pendingBoardRemovals.value.filter((entry) => entry.selectionId !== selectionId)
      : []
  }

  const deleteBoardsForSelection = (selectionId: string) => {
    clearPendingBoardRemovals(selectionId)
    const removedActive = boards.value.some(
      (board) => board.selectionId === selectionId && board.id === activeBoardId.value,
    )
    boards.value = boards.value.filter((board) => board.selectionId !== selectionId)
    if (removedActive) {
      activeBoardId.value = boards.value[0]?.id || null
    }
    persist()
  }

  const setActiveBoard = (id: string) => {
    if (boards.value.some((b) => b.id === id)) {
      activeBoardId.value = id
    }
  }

  const openDropdown = () => {
    boardsOpen.value = true
  }

  const closeDropdown = () => {
    boardsOpen.value = false
  }

  const toggleDropdown = () => {
    boardsOpen.value = !boardsOpen.value
  }

  onMounted(hydrate)

  return {
    boards,
    activeBoard,
    activeBoardId,
    boardCount,
    boardsOpen,
    createBoard,
    updateBoard,
    saveActiveBoard,
    renameBoard,
    deleteBoard,
    boardsForSelection,
    selectionBoardEntries,
    boardsCartEntries,
    softRemoveBoard,
    undoBoardRemove,
    dismissBoardRemoval,
    clearPendingBoardRemovals,
    pendingBoardRemovals,
    deleteBoardsForSelection,
    setActiveBoard,
    openDropdown,
    closeDropdown,
    toggleDropdown,
  }
}
