export type BucketItem = {
  id: string
  title: string
  imageUrl: string
  itemType: string
  link?: string | null
  /** Full project gallery when the item comes from a Form / Surface / etc. */
  imageUrls?: string[]
  /** Index into imageUrls for the currently shown image. */
  imageIndex?: number
}

/** Stable cart id — product + image index so multiple gallery frames can be saved. */
export const bucketItemId = (productId: string, imageIndex?: number) => {
  const base = productId.includes('::') ? productId.split('::')[0] : productId
  return typeof imageIndex === 'number' && imageIndex >= 0
    ? `${base}::${imageIndex}`
    : base
}

export const productIdFromBucketId = (itemId: string) => itemId.split('::')[0]

export type MoodboardBucket = {
  id: string
  name: string
  items: BucketItem[]
}

export type SelectionEntry =
  | { kind: 'item'; item: BucketItem }
  | { kind: 'undo'; key: string; item: BucketItem }

export type PendingRemoval = {
  key: string
  moodboardId: string
  item: BucketItem
  index: number
  seq: number
}

const STORAGE_KEY = 'sba-moodboards'
const LEGACY_STORAGE_KEY = 'sba-bucket'
const UNDO_REMOVE_MS = 5000

const removalTimers = new Map<string, ReturnType<typeof setTimeout>>()
let removalSeq = 0

const createId = () => `moodboard-${Date.now()}-${Math.round(Math.random() * 1000)}`

const selectionName = (index = 1) =>
  index === 1 ? 'My Selection' : `Selection ${index}`

const migrateMoodboardName = (name: string) => {
  if (name === 'Collection' || name === 'My Collection' || name === 'Selection') {
    return selectionName(1)
  }

  const collectionMatch = name.match(/^(?:My )?Collection (\d+)$/)
  if (collectionMatch) return selectionName(Number(collectionMatch[1]))

  const moodboardMatch = name.match(/^Moodboard (\d+)$/)
  if (moodboardMatch) return selectionName(Number(moodboardMatch[1]))

  const compositionMatch = name.match(/^Composition( (\d+))?$/)
  if (compositionMatch) {
    const n = compositionMatch[2] ? Number(compositionMatch[2]) : 1
    return selectionName(n)
  }

  return name
}

const defaultMoodboard = (index = 1): MoodboardBucket => ({
  id: createId(),
  name: selectionName(index),
  items: [],
})

export const useBucket = () => {
  const moodboards = useState<MoodboardBucket[]>('moodboards', () => [defaultMoodboard()])
  const activeMoodboardId = useState<string | null>('active-moodboard-id', () => null)
  const isOpen = useState('bucket-open', () => false)
  const isMoodboard = useState('bucket-moodboard', () => false)
  const pickerItem = useState<BucketItem | null>('moodboard-picker-item', () => null)
  const pendingRemovals = useState<PendingRemoval[]>('bucket-pending-removals', () => [])

  const activeMoodboard = computed(() => {
    const boards = moodboards.value
    if (!boards.length) return null
    return boards.find((b) => b.id === activeMoodboardId.value) || boards[0]
  })

  const items = computed(() => activeMoodboard.value?.items ?? [])

  const count = computed(() => items.value.length)

  /** Active selection rows: live items + undo placeholders in original slots. */
  const selectionEntries = computed((): SelectionEntry[] => {
    const boardId = activeMoodboardId.value
    const entries: SelectionEntry[] = items.value.map((item) => ({ kind: 'item', item }))
    if (!boardId) return entries

    const pendings = pendingRemovals.value
      .filter((p) => p.moodboardId === boardId)
      .slice()
      .sort((a, b) => b.index - a.index || b.seq - a.seq)

    for (const pending of pendings) {
      entries.splice(Math.min(pending.index, entries.length), 0, {
        kind: 'undo',
        key: pending.key,
        item: pending.item,
      })
    }
    return entries
  })

  const clearRemovalTimer = (key: string) => {
    const timer = removalTimers.get(key)
    if (timer) clearTimeout(timer)
    removalTimers.delete(key)
  }

  const dismissPendingRemoval = (key: string) => {
    clearRemovalTimer(key)
    pendingRemovals.value = pendingRemovals.value.filter((p) => p.key !== key)
  }

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
      return { ...board, items: [item, ...board.items] }
    })
    persist()
  }

  const removeItemFromMoodboard = (moodboardId: string, itemId: string) => {
    moodboards.value = moodboards.value.map((board) =>
      board.id === moodboardId
        ? { ...board, items: board.items.filter((i) => i.id !== itemId) }
        : board,
    )
    for (const pending of pendingRemovals.value) {
      if (pending.moodboardId === moodboardId && pending.item.id === itemId) {
        clearRemovalTimer(pending.key)
      }
    }
    pendingRemovals.value = pendingRemovals.value.filter(
      (p) => !(p.moodboardId === moodboardId && p.item.id === itemId),
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
    const boardId = activeMoodboardId.value!
    const board = moodboards.value.find((b) => b.id === boardId)
    if (!board) return
    const index = board.items.findIndex((i) => i.id === id)
    if (index < 0) return
    const source = board.items[index]
    const item: BucketItem = {
      ...source,
      imageUrls: source.imageUrls ? [...source.imageUrls] : undefined,
    }

    const key = `${boardId}::${id}`
    dismissPendingRemoval(key)

    // Soft-remove: drop from selection immediately, keep undo slot for 2 minutes
    moodboards.value = moodboards.value.map((b) =>
      b.id === boardId ? { ...b, items: b.items.filter((i) => i.id !== id) } : b,
    )
    persist()

    pendingRemovals.value = [
      ...pendingRemovals.value.filter((p) => p.key !== key),
      { key, moodboardId: boardId, item, index, seq: ++removalSeq },
    ]

    if (import.meta.client) {
      removalTimers.set(
        key,
        setTimeout(() => dismissPendingRemoval(key), UNDO_REMOVE_MS),
      )
    }
  }

  const undoRemove = (key: string) => {
    const pending = pendingRemovals.value.find((p) => p.key === key)
    if (!pending) return

    moodboards.value = moodboards.value.map((board) => {
      if (board.id !== pending.moodboardId) return board
      if (board.items.some((i) => i.id === pending.item.id)) return board
      const next = [...board.items]
      next.splice(Math.min(pending.index, next.length), 0, pending.item)
      return { ...board, items: next }
    })
    persist()
    dismissPendingRemoval(key)
  }

  const cloneItem = (itemId: string) => {
    ensureActive()
    const boardId = activeMoodboardId.value
    if (!boardId) return
    moodboards.value = moodboards.value.map((board) => {
      if (board.id !== boardId) return board
      const index = board.items.findIndex((i) => i.id === itemId)
      if (index < 0) return board
      const source = board.items[index]
      const clone: BucketItem = {
        ...source,
        id: `${source.id}-copy-${Date.now()}`,
        imageUrls: source.imageUrls ? [...source.imageUrls] : undefined,
      }
      const items = [...board.items]
      items.splice(index + 1, 0, clone)
      return { ...board, items }
    })
    persist()
  }

  const cycleItemImage = (itemId: string, direction: 1 | -1) => {
    moodboards.value = moodboards.value.map((board) => ({
      ...board,
      items: board.items.map((item) => {
        if (item.id !== itemId) return item
        const urls = item.imageUrls?.filter(Boolean) || []
        if (urls.length < 2) return item
        const current =
          item.imageIndex ?? Math.max(0, urls.indexOf(item.imageUrl))
        const next = (current + direction + urls.length) % urls.length
        return {
          ...item,
          imageIndex: next,
          imageUrl: urls[next],
        }
      }),
    }))
    persist()
  }

  /** Attach a project gallery to an existing selection item (e.g. after fetch). */
  const setItemGallery = (
    itemId: string,
    imageUrls: string[],
    imageIndex?: number,
  ) => {
    const urls = imageUrls.filter(Boolean)
    if (urls.length < 2) return
    moodboards.value = moodboards.value.map((board) => ({
      ...board,
      items: board.items.map((item) => {
        if (item.id !== itemId) return item
        const idx =
          typeof imageIndex === 'number'
            ? imageIndex
            : Math.max(0, urls.indexOf(item.imageUrl))
        return {
          ...item,
          imageUrls: urls,
          imageIndex: idx,
          imageUrl: urls[idx] || item.imageUrl,
        }
      }),
    }))
    persist()
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

  const isSavedIn = (moodboardId: string, itemId: string, imageIndex?: number) => {
    const entryId = bucketItemId(itemId, imageIndex)
    return (
      moodboards.value
        .find((b) => b.id === moodboardId)
        ?.items.some((i) => i.id === entryId) ?? false
    )
  }

  const isSaved = (id: string, imageIndex?: number) => {
    const entryId = bucketItemId(id, imageIndex)
    return moodboards.value.some((b) => b.items.some((i) => i.id === entryId))
  }

  const openPicker = (item: BucketItem) => {
    pickerItem.value = item
  }

  const closePicker = () => {
    pickerItem.value = null
  }

  const normalizeBucketItem = (item: BucketItem): BucketItem => {
    const baseId = productIdFromBucketId(item.id)
    const index =
      typeof item.imageIndex === 'number'
        ? item.imageIndex
        : item.imageUrls && item.imageUrls.length > 1
          ? Math.max(0, item.imageUrls.indexOf(item.imageUrl))
          : undefined
    return {
      ...item,
      id: bucketItemId(baseId, index),
      imageIndex: index,
    }
  }

  const requestSave = (item: BucketItem) => {
    ensureActive()
    const normalized = normalizeBucketItem(item)
    if (moodboards.value.length > 1) {
      openPicker(normalized)
      isOpen.value = true
      return
    }
    toggleInMoodboard(moodboards.value[0].id, normalized, true)
  }

  const selectMoodboardForItem = (moodboardId: string) => {
    if (!pickerItem.value) return
    const item = normalizeBucketItem(pickerItem.value)
    const wasSaved = isSavedIn(moodboardId, item.id)
    toggleInMoodboard(moodboardId, item)
    if (!wasSaved) {
      activeMoodboardId.value = moodboardId
      isOpen.value = true
    }
    closePicker()
  }

  const openMoodboard = () => {
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
    selectionEntries,
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
    undoRemove,
    cloneItem,
    cycleItemImage,
    setItemGallery,
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
