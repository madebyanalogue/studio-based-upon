import type { MoodboardItem, MoodboardStroke } from './useMoodboard'

export type SavedBoard = {
  id: string
  name: string
  placements: MoodboardItem[]
  strokes: MoodboardStroke[]
  updatedAt: string
}

const STORAGE_KEY = 'sba-boards'
const LEGACY_COMPOSITION_KEY = 'sba-moodboard-composition'

const createId = () => `board-${Date.now()}-${Math.round(Math.random() * 1000)}`

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
  ) => {
    const board: SavedBoard = {
      id: createId(),
      name: name?.trim() || boardName(boards.value.length + 1),
      placements: clone(placements),
      strokes: clone(strokes),
      updatedAt: new Date().toISOString(),
    }
    boards.value = [...boards.value, board]
    activeBoardId.value = board.id
    persist()
    return board
  }

  const updateBoard = (
    id: string,
    patch: Partial<Pick<SavedBoard, 'name' | 'placements' | 'strokes'>>,
  ) => {
    boards.value = boards.value.map((board) => {
      if (board.id !== id) return board
      return {
        ...board,
        ...patch,
        placements: patch.placements ? clone(patch.placements) : board.placements,
        strokes: patch.strokes ? clone(patch.strokes) : board.strokes,
        updatedAt: new Date().toISOString(),
      }
    })
    persist()
  }

  const saveActiveBoard = (
    placements: MoodboardItem[],
    strokes: MoodboardStroke[] = [],
  ) => {
    if (activeBoardId.value) {
      updateBoard(activeBoardId.value, { placements, strokes })
      return activeBoardId.value
    }
    return createBoard(placements, strokes).id
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
    setActiveBoard,
    openDropdown,
    closeDropdown,
    toggleDropdown,
  }
}
