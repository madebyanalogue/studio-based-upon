export type BucketItem = {
  id: string
  title: string
  imageUrl: string
  itemType: string
  link?: string | null
}

export type MoodboardBucket = {
  id: string
  name: string
  items: BucketItem[]
}

const STORAGE_KEY = 'sba-moodboards'
const LEGACY_STORAGE_KEY = 'sba-bucket'

const createId = () => `moodboard-${Date.now()}-${Math.round(Math.random() * 1000)}`

const collectionName = (index = 1) =>
  index === 1 ? 'Collection' : `Collection ${index}`

const migrateMoodboardName = (name: string) => {
  const moodboardMatch = name.match(/^Moodboard (\d+)$/)
  if (moodboardMatch) return collectionName(Number(moodboardMatch[1]))

  const compositionMatch = name.match(/^Composition( (\d+))?$/)
  if (compositionMatch) {
    const n = compositionMatch[2] ? Number(compositionMatch[2]) : 1
    return collectionName(n)
  }

  return name
}

const defaultMoodboard = (index = 1): MoodboardBucket => ({
  id: createId(),
  name: collectionName(index),
  items: [],
})

export const useBucket = () => {
  const moodboards = useState<MoodboardBucket[]>('moodboards', () => [defaultMoodboard()])
  const activeMoodboardId = useState<string | null>('active-moodboard-id', () => null)
  const isOpen = useState('bucket-open', () => false)
  const isMoodboard = useState('bucket-moodboard', () => false)
  const pickerItem = useState<BucketItem | null>('moodboard-picker-item', () => null)

  const activeMoodboard = computed(() => {
    const boards = moodboards.value
    if (!boards.length) return null
    return boards.find((b) => b.id === activeMoodboardId.value) || boards[0]
  })

  const items = computed(() => activeMoodboard.value?.items ?? [])

  const count = computed(() => items.value.length)

  const ensureActive = () => {
    if (!moodboards.value.length) {
      moodboards.value = [defaultMoodboard()]
    }
    if (!activeMoodboardId.value || !moodboards.value.some((b) => b.id === activeMoodboardId.value)) {
      activeMoodboardId.value = moodboards.value[0].id
    }
  }

  const hydrate = () => {
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as MoodboardBucket[]
        if (Array.isArray(parsed) && parsed.length) {
          moodboards.value = parsed.map((board) => ({
            ...board,
            name: migrateMoodboardName(board.name),
          }))
          ensureActive()
          persist()
          return
        }
      }

      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
      if (legacy) {
        const legacyItems = JSON.parse(legacy) as BucketItem[]
        moodboards.value = [{ ...defaultMoodboard(), items: legacyItems }]
        localStorage.removeItem(LEGACY_STORAGE_KEY)
        persist()
      }
    } catch {
      moodboards.value = [defaultMoodboard()]
    }
    ensureActive()
  }

  const persist = () => {
    if (!import.meta.client) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(moodboards.value))
  }

  const setActiveMoodboard = (id: string) => {
    if (moodboards.value.some((b) => b.id === id)) {
      activeMoodboardId.value = id
    }
  }

  const createMoodboard = () => {
    const nextIndex = moodboards.value.length + 1
    const board = defaultMoodboard(nextIndex)
    moodboards.value = [...moodboards.value, board]
    activeMoodboardId.value = board.id
    persist()
    isOpen.value = true
    return board
  }

  const renameMoodboard = (id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    moodboards.value = moodboards.value.map((board) =>
      board.id === id ? { ...board, name: trimmed } : board,
    )
    persist()
  }

  const deleteMoodboard = (id: string) => {
    moodboards.value = moodboards.value.filter((board) => board.id !== id)
    if (!moodboards.value.length) {
      moodboards.value = [defaultMoodboard()]
    }
    if (activeMoodboardId.value === id || !moodboards.value.some((b) => b.id === activeMoodboardId.value)) {
      activeMoodboardId.value = moodboards.value[0].id
    }
    persist()
  }

  const addItemToMoodboard = (moodboardId: string, item: BucketItem) => {
    moodboards.value = moodboards.value.map((board) => {
      if (board.id !== moodboardId) return board
      if (board.items.some((i) => i.id === item.id)) return board
      return { ...board, items: [...board.items, item] }
    })
    persist()
  }

  const removeItemFromMoodboard = (moodboardId: string, itemId: string) => {
    moodboards.value = moodboards.value.map((board) =>
      board.id === moodboardId
        ? { ...board, items: board.items.filter((i) => i.id !== itemId) }
        : board,
    )
    persist()
  }

  const addItem = (item: BucketItem) => {
    ensureActive()
    const id = activeMoodboardId.value!
    addItemToMoodboard(id, item)
    isOpen.value = true
  }

  const removeItem = (id: string) => {
    ensureActive()
    removeItemFromMoodboard(activeMoodboardId.value!, id)
  }

  const toggleInMoodboard = (moodboardId: string, item: BucketItem, openDrawer = false) => {
    const board = moodboards.value.find((b) => b.id === moodboardId)
    if (!board) return
    if (board.items.some((i) => i.id === item.id)) {
      removeItemFromMoodboard(moodboardId, item.id)
    } else {
      addItemToMoodboard(moodboardId, item)
      if (openDrawer) isOpen.value = true
    }
  }

  const isSavedIn = (moodboardId: string, itemId: string) =>
    moodboards.value
      .find((b) => b.id === moodboardId)
      ?.items.some((i) => i.id === itemId) ?? false

  const isSaved = (id: string) => moodboards.value.some((b) => b.items.some((i) => i.id === id))

  const openPicker = (item: BucketItem) => {
    pickerItem.value = item
  }

  const closePicker = () => {
    pickerItem.value = null
  }

  const requestSave = (item: BucketItem) => {
    ensureActive()
    if (moodboards.value.length > 1) {
      openPicker(item)
      return
    }
    toggleInMoodboard(moodboards.value[0].id, item, true)
  }

  const selectMoodboardForItem = (moodboardId: string) => {
    if (!pickerItem.value) return
    const wasSaved = isSavedIn(moodboardId, pickerItem.value.id)
    toggleInMoodboard(moodboardId, pickerItem.value)
    if (!wasSaved) {
      activeMoodboardId.value = moodboardId
      isOpen.value = true
    }
    closePicker()
  }

  const openMoodboard = () => {
    if (!items.value.length) return
    isMoodboard.value = true
    isOpen.value = false
  }

  const closeMoodboard = () => {
    isMoodboard.value = false
  }

  const closeDrawer = () => {
    isOpen.value = false
  }

  onMounted(hydrate)

  return {
    moodboards,
    activeMoodboard,
    activeMoodboardId,
    items,
    isOpen,
    isMoodboard,
    pickerItem,
    count,
    createMoodboard,
    renameMoodboard,
    deleteMoodboard,
    setActiveMoodboard,
    addItem,
    removeItem,
    addItemToMoodboard,
    removeItemFromMoodboard,
    requestSave,
    selectMoodboardForItem,
    openPicker,
    closePicker,
    isSaved,
    isSavedIn,
    openMoodboard,
    closeMoodboard,
    closeDrawer,
  }
}
