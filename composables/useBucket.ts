import { uniqueImageUrls } from '~/composables/productImages'
import { imageAssetKey } from '~/composables/useSanityImage'
import { lockPageScroll, unlockPageScroll } from '~/composables/usePageScrollLock'

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
  if (typeof imageIndex === 'number' && imageIndex >= 0) {
    return `${base}::${imageIndex}`
  }
  // Keep an already-qualified id (e.g. `foo::2`) — don't strip the index
  return productId.includes('::') ? productId : base
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

/** Selection items lent to the board canvas — restored to the cart on board close. */
export type ParkedSelectionItem = {
  selectionId: string
  item: BucketItem
  index: number
}

const STORAGE_KEY = 'sba-moodboards'
const LEGACY_STORAGE_KEY = 'sba-bucket'
/** Survives refresh while the board composer is open. */
const MOODBOARD_SESSION_KEY = 'sba-moodboard-session'
const UNDO_REMOVE_MS = 5000

export type MoodboardSessionDraft = {
  open: true
  activeBoardId: string | null
  placements: unknown[]
  strokes: unknown[]
  parked: ParkedSelectionItem[]
}

const removalTimers = new Map<string, ReturnType<typeof setTimeout>>()
let removalSeq = 0
/** Optional animated close (bucket UI v2). */
let animatedCloseHandler: (() => void) | null = null
/** Optional animated open (bucket UI v2) — same path as clicking the selection stack. */
let animatedOpenHandler: (() => void) | null = null
/** Nav heart hover — fan the active selection stack like hovering the pile. */
let selectionStackHoverHandlers: {
  enter: () => void
  leave: () => void
} | null = null
/** Shared across useBucket() callers — must be module-scoped like animatedCloseHandler. */
let moodboardRestackHandler: (() => Promise<void>) | null = null
let moodboardReturnHandler:
  | ((opts: {
      selectionId: string
      itemId: string
      from: { left: number; top: number; width: number; height: number }
      imageUrl: string
      objectFit?: 'contain' | 'cover'
      item?: BucketItem
    }) => Promise<void>)
  | null = null
/** After closing the board composer — reopen boards cart (awaited so cream can cover it). */
let moodboardCloseReturnHandler: (() => void | Promise<void>) | null = null
/** Full close choreography: boards grid intro → Flip board in → fade peers → controls. */
let moodboardCloseToBoardsHandler:
  | ((opts: {
      boardId: string | null
      preview: string | null
      from: { left: number; top: number; width: number; height: number } | null
      /** Fade composer cream once boards cart is mounted underneath. */
      beforeFlip?: () => void | Promise<void>
      /** After flyer hands off to the grid cell — tear down composer here. */
      afterLand?: () => void | Promise<void>
    }) => Promise<void>)
  | null = null
/** Selection rail slides down after restack (close exit). */
let moodboardStackExitHandler: (() => Promise<void>) | null = null
/** Staged open: cream/items/grid reveal after Flip lands. */
let moodboardStagedRevealHandler: (() => Promise<void>) | null = null
/** Staged open: tools + toolbox enter (after grid). */
let moodboardChromeEnterHandler: (() => Promise<void>) | null = null

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
  const { version: bucketUiVersion } = useBucketUi()
  const moodboards = useState<MoodboardBucket[]>('moodboards', () => [defaultMoodboard()])
  const activeMoodboardId = useState<string | null>('active-moodboard-id', () => null)
  const parkedSelectionItems = useState<ParkedSelectionItem[]>(
    'bucket-parked-selection',
    () => [],
  )
  const isOpen = useState('bucket-open', () => false)
  const panelTab = useState<'selections' | 'boards'>('bucket-panel-tab', () => 'selections')
  const isMoodboard = useState('bucket-moodboard', () => false)
  const reopenCartAfterMoodboard = useState('bucket-reopen-after-moodboard', () => false)
  const pickerItem = useState<BucketItem | null>('moodboard-picker-item', () => null)
  const pendingRemovals = useState<PendingRemoval[]>('bucket-pending-removals', () => [])
  /** One-shot fly-to-stack payload for bucket UI v2. */
  const pendingFly = useState<{
    itemId: string
    imageUrl: string
    from: { left: number; top: number; width: number; height: number }
  } | null>('bucket-pending-fly', () => null)
  // DOM source kept off useState (not serializable)
  let pendingFlySource: HTMLElement | null = null

  const activeMoodboard = computed(() => {
    const boards = moodboards.value
    if (!boards.length) return null
    return boards.find((b) => b.id === activeMoodboardId.value) || boards[0]
  })

  const items = computed(() => activeMoodboard.value?.items ?? [])

  const count = computed(() => items.value.length)

  /** Soft-removed entries waiting for undo on the active board. */
  const activePendingRemovals = computed(() => {
    const boardId = activeMoodboardId.value
    if (!boardId) return [] as PendingRemoval[]
    return pendingRemovals.value.filter((p) => p.moodboardId === boardId)
  })

  /** Active selection rows: live items + undo placeholders in original visual slots. */
  const selectionEntries = computed((): SelectionEntry[] => {
    const boardId = activeMoodboardId.value
    const live = items.value.map((item) => ({ kind: 'item' as const, item }))
    if (!boardId) return live

    const pendings = pendingRemovals.value
      .filter((p) => p.moodboardId === boardId)
      .slice()
      .sort((a, b) => a.index - b.index || a.seq - b.seq)

    if (!pendings.length) return live

    // Walk stable visual slots — pending.index is the grid position at remove time,
    // not an index into the compacted live list (which shifts after each remove).
    const total = live.length + pendings.length
    const pendingBySlot = new Map(pendings.map((p) => [p.index, p]))
    const entries: SelectionEntry[] = []
    let liveIdx = 0

    for (let slot = 0; slot < total; slot++) {
      const pending = pendingBySlot.get(slot)
      if (pending) {
        entries.push({ kind: 'undo', key: pending.key, item: pending.item })
        continue
      }
      const item = live[liveIdx]
      if (!item) break
      entries.push(item)
      liveIdx += 1
    }
    while (liveIdx < live.length) {
      entries.push(live[liveIdx])
      liveIdx += 1
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

  /** Drop undo placeholders (item already removed from the board). */
  const clearPendingRemovals = (moodboardId?: string | null) => {
    const boardId = moodboardId === undefined ? activeMoodboardId.value : moodboardId
    for (const pending of pendingRemovals.value) {
      if (!boardId || pending.moodboardId === boardId) clearRemovalTimer(pending.key)
    }
    pendingRemovals.value = boardId
      ? pendingRemovals.value.filter((p) => p.moodboardId !== boardId)
      : []
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

  const createMoodboard = (opts?: { open?: boolean; activate?: boolean }) => {
    const nextIndex = moodboards.value.length + 1
    const board = defaultMoodboard(nextIndex)
    moodboards.value = [...moodboards.value, board]
    if (opts?.activate !== false) {
      activeMoodboardId.value = board.id
    }
    persist()
    if (opts?.open) isOpen.value = true
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

  const clearActiveItems = () => {
    ensureActive()
    const boardId = activeMoodboardId.value!
    for (const pending of pendingRemovals.value) {
      if (pending.moodboardId === boardId) clearRemovalTimer(pending.key)
    }
    pendingRemovals.value = pendingRemovals.value.filter((p) => p.moodboardId !== boardId)
    moodboards.value = moodboards.value.map((board) =>
      board.id === boardId ? { ...board, items: [] } : board,
    )
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

  /** Lift a selection item onto the board — gone from the column until restored. */
  const parkSelectionItem = (selectionId: string, itemId: string) => {
    const board = moodboards.value.find((entry) => entry.id === selectionId)
    if (!board) return false
    const index = board.items.findIndex((entry) => entry.id === itemId)
    if (index < 0) return false
    const source = board.items[index]!
    const item: BucketItem = {
      ...source,
      imageUrls: source.imageUrls ? [...source.imageUrls] : undefined,
    }
    if (!parkedSelectionItems.value.some((entry) => entry.item.id === itemId)) {
      parkedSelectionItems.value = [
        ...parkedSelectionItems.value,
        { selectionId, item, index },
      ]
    }
    removeItemFromMoodboard(selectionId, itemId)
    return true
  }

  const restoreParkedSelectionItem = (itemId: string) => {
    const parked = parkedSelectionItems.value.find((entry) => entry.item.id === itemId)
    if (!parked) return
    moodboards.value = moodboards.value.map((board) => {
      if (board.id !== parked.selectionId) return board
      if (board.items.some((entry) => entry.id === parked.item.id)) return board
      const items = [...board.items]
      items.splice(Math.min(parked.index, items.length), 0, parked.item)
      return { ...board, items }
    })
    parkedSelectionItems.value = parkedSelectionItems.value.filter(
      (entry) => entry.item.id !== itemId,
    )
    persist()
  }

  const restoreAllParkedSelectionItems = () => {
    const parked = [...parkedSelectionItems.value].sort((a, b) => a.index - b.index)
    if (!parked.length) return
    for (const entry of parked) {
      moodboards.value = moodboards.value.map((board) => {
        if (board.id !== entry.selectionId) return board
        if (board.items.some((item) => item.id === entry.item.id)) return board
        const items = [...board.items]
        items.splice(Math.min(entry.index, items.length), 0, entry.item)
        return { ...board, items }
      })
    }
    parkedSelectionItems.value = []
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
    const boardIndex = board.items.findIndex((i) => i.id === id)
    if (boardIndex < 0) return
    const source = board.items[boardIndex]
    const item: BucketItem = {
      ...source,
      imageUrls: source.imageUrls ? [...source.imageUrls] : undefined,
    }

    // Visual grid/list slot (includes existing undo placeholders) — stays stable
    const visualIndex = selectionEntries.value.findIndex(
      (entry) => entry.kind === 'item' && entry.item.id === id,
    )
    const index = visualIndex >= 0 ? visualIndex : boardIndex

    const key = `${boardId}::${id}`
    dismissPendingRemoval(key)

    // Soft-remove: drop from selection immediately, keep undo slot until dismiss
    moodboards.value = moodboards.value.map((b) =>
      b.id === boardId ? { ...b, items: b.items.filter((i) => i.id !== id) } : b,
    )
    persist()

    pendingRemovals.value = [
      ...pendingRemovals.value.filter((p) => p.key !== key),
      { key, moodboardId: boardId, item, index, seq: ++removalSeq },
    ]

    // v1: timed undo strip. v2: keep until the cart closes.
    if (import.meta.client && bucketUiVersion.value === 'v1') {
      removalTimers.set(
        key,
        setTimeout(() => dismissPendingRemoval(key), UNDO_REMOVE_MS),
      )
    }
  }

  const undoRemove = (key: string) => {
    const pending = pendingRemovals.value.find((p) => p.key === key)
    if (!pending) return

    // Convert visual slot → index among live items (skip other undo slots before it)
    const undosBefore = pendingRemovals.value.filter(
      (p) =>
        p.moodboardId === pending.moodboardId &&
        p.key !== key &&
        p.index < pending.index,
    ).length
    const liveInsertAt = Math.max(0, pending.index - undosBefore)

    moodboards.value = moodboards.value.map((board) => {
      if (board.id !== pending.moodboardId) return board
      if (board.items.some((i) => i.id === pending.item.id)) return board
      const next = [...board.items]
      next.splice(Math.min(liveInsertAt, next.length), 0, pending.item)
      return { ...board, items: next }
    })
    persist()
    dismissPendingRemoval(key)
  }

  /** Soft-remove many items at once, keeping each visual slot for undo. */
  const removeItems = (ids: string[]) => {
    ensureActive()
    const boardId = activeMoodboardId.value!
    const idSet = new Set(ids)
    if (!idSet.size) return

    const captured = selectionEntries.value.flatMap((entry, index) => {
      if (entry.kind !== 'item' || !idSet.has(entry.item.id)) return []
      const item: BucketItem = {
        ...entry.item,
        imageUrls: entry.item.imageUrls ? [...entry.item.imageUrls] : undefined,
      }
      return [
        {
          key: `${boardId}::${item.id}`,
          moodboardId: boardId,
          item,
          index,
          seq: ++removalSeq,
        } satisfies PendingRemoval,
      ]
    })
    if (!captured.length) return

    const capturedKeys = new Set(captured.map((p) => p.key))
    for (const key of capturedKeys) clearRemovalTimer(key)

    moodboards.value = moodboards.value.map((b) =>
      b.id === boardId
        ? { ...b, items: b.items.filter((i) => !idSet.has(i.id)) }
        : b,
    )
    persist()

    pendingRemovals.value = [
      ...pendingRemovals.value.filter((p) => !capturedKeys.has(p.key)),
      ...captured,
    ]

    if (import.meta.client && bucketUiVersion.value === 'v1') {
      for (const pending of captured) {
        removalTimers.set(
          pending.key,
          setTimeout(() => dismissPendingRemoval(pending.key), UNDO_REMOVE_MS),
        )
      }
    }
  }

  /** Restore every pending removal on the active board (keeps visual order). */
  const undoAllRemovals = () => {
    ensureActive()
    const boardId = activeMoodboardId.value!
    const pendings = pendingRemovals.value.filter((p) => p.moodboardId === boardId)
    if (!pendings.length) return

    // selectionEntries is already live + undo slots in order — materialise as items
    const nextItems = selectionEntries.value.map((entry) => {
      const source = entry.item
      return {
        ...source,
        imageUrls: source.imageUrls ? [...source.imageUrls] : undefined,
      }
    })

    moodboards.value = moodboards.value.map((board) =>
      board.id === boardId ? { ...board, items: nextItems } : board,
    )
    persist()

    for (const pending of pendings) clearRemovalTimer(pending.key)
    pendingRemovals.value = pendingRemovals.value.filter((p) => p.moodboardId !== boardId)
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
        const urls = uniqueImageUrls(...(item.imageUrls || []))
        if (urls.length < 2) return item
        const current =
          typeof item.imageIndex === 'number'
            ? Math.min(item.imageIndex, urls.length - 1)
            : Math.max(
                0,
                urls.findIndex(
                  (url) => imageAssetKey(url) === imageAssetKey(item.imageUrl),
                ),
              )
        const next = (current + direction + urls.length) % urls.length
        return {
          ...item,
          imageUrls: urls,
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
    const urls = uniqueImageUrls(...imageUrls)
    if (urls.length < 2) return
    moodboards.value = moodboards.value.map((board) => ({
      ...board,
      items: board.items.map((item) => {
        if (item.id !== itemId) return item
        const idx =
          typeof imageIndex === 'number'
            ? Math.min(imageIndex, urls.length - 1)
            : Math.max(
                0,
                urls.findIndex(
                  (url) => imageAssetKey(url) === imageAssetKey(item.imageUrl),
                ),
              )
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

  /** Point a selection entry at a gallery frame (e.g. PDP Flip-close handoff). */
  const setItemImageIndex = (itemId: string, imageIndex: number) => {
    moodboards.value = moodboards.value.map((board) => ({
      ...board,
      items: board.items.map((item) => {
        if (item.id !== itemId) return item
        const urls = uniqueImageUrls(...(item.imageUrls || []))
        if (urls.length < 2) return item
        const idx = Math.min(Math.max(0, imageIndex), urls.length - 1)
        if (
          item.imageIndex === idx &&
          imageAssetKey(item.imageUrl) === imageAssetKey(urls[idx])
        ) {
          return item
        }
        return {
          ...item,
          imageUrls: urls,
          imageIndex: idx,
          imageUrl: urls[idx],
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
    const boardId = activeMoodboardId.value || moodboards.value[0]?.id
    if (!boardId) return false
    return isSavedIn(boardId, id, imageIndex)
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

  const requestSave = (item: BucketItem, opts?: { source?: HTMLElement | null }) => {
    ensureActive()
    const normalized = normalizeBucketItem(item)
    const openOnAdd = bucketUiVersion.value === 'v1'

    // Multi-board without a fly source → picker. With a source, add to active + fly.
    if (moodboards.value.length > 1 && !opts?.source) {
      openPicker(normalized)
      isOpen.value = true
      return
    }

    const boardId = activeMoodboardId.value || moodboards.value[0].id
    const alreadySaved =
      moodboards.value
        .find((b) => b.id === boardId)
        ?.items.some((i) => i.id === normalized.id) ?? false
    // Fly only when adding — never when unhearting / removing
    if (
      !alreadySaved &&
      bucketUiVersion.value === 'v2' &&
      opts?.source &&
      import.meta.client
    ) {
      const rect = opts.source.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        pendingFlySource = opts.source
        // Instant hide — no CSS opacity transition on the way out
        opts.source.setAttribute('data-bucket-fly', normalized.id)
        opts.source.style.setProperty('transition', 'none')
        opts.source.style.setProperty('opacity', '0')
        pendingFly.value = {
          itemId: normalized.id,
          imageUrl: normalized.imageUrl,
          from: {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          },
        }
      }
    } else if (alreadySaved && opts?.source && import.meta.client) {
      // Fade original back in on unheart
      const el = opts.source
      el.style.transition = 'opacity 0.35s ease'
      // Force current opacity so the transition always runs from saved → full
      const current = getComputedStyle(el).opacity
      el.style.opacity = current
      void el.offsetWidth
      el.style.opacity = '1'
      const clearInline = () => {
        el.style.transition = ''
        el.style.opacity = ''
      }
      const onEnd = (e: TransitionEvent) => {
        if (e.propertyName !== 'opacity') return
        el.removeEventListener('transitionend', onEnd)
        clearInline()
      }
      el.addEventListener('transitionend', onEnd)
      window.setTimeout(() => {
        el.removeEventListener('transitionend', onEnd)
        clearInline()
      }, 400)
    }

    toggleInMoodboard(boardId, normalized, openOnAdd)
  }

  const consumePendingFly = () => {
    const payload = pendingFly.value
    const source = pendingFlySource
    pendingFly.value = null
    pendingFlySource = null
    if (!payload) return null
    return { ...payload, source }
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

  /** True after the board surface has finished fading in (BucketStack may auto-disperse). */
  const moodboardSurfaceReady = useState('moodboard-surface-ready', () => false)
  /** Cart→board: reuse cream backdrop — skip moodboard bg fade-in. */
  const moodboardSkipBgFade = useState('moodboard-skip-bg-fade', () => false)
  /** Open: hold chrome/grid until Flip + staged reveal finish. */
  const moodboardStagedOpen = useState('moodboard-staged-open', () => false)
  /** Open from boards cart: selection rail translates Y in with tools. */
  const moodboardEnterSelection = useState('moodboard-enter-selection', () => false)

  const registerMoodboardRestack = (handler: (() => Promise<void>) | null) => {
    moodboardRestackHandler = handler
  }

  const requestMoodboardRestack = async () => {
    if (moodboardRestackHandler) await moodboardRestackHandler()
  }

  const registerMoodboardReturnToColumn = (
    handler: typeof moodboardReturnHandler,
  ) => {
    moodboardReturnHandler = handler
  }

  const registerMoodboardCloseReturn = (
    handler: (() => void | Promise<void>) | null,
  ) => {
    moodboardCloseReturnHandler = handler
  }

  const registerMoodboardCloseToBoards = (
    handler: typeof moodboardCloseToBoardsHandler,
  ) => {
    moodboardCloseToBoardsHandler = handler
  }

  const registerMoodboardStackExit = (
    handler: (() => Promise<void>) | null,
  ) => {
    moodboardStackExitHandler = handler
  }

  /** Slide selection rail away after restack. */
  const requestMoodboardStackExit = async () => {
    if (moodboardStackExitHandler) await moodboardStackExitHandler()
  }

  const registerMoodboardStagedReveal = (
    handler: (() => Promise<void>) | null,
  ) => {
    moodboardStagedRevealHandler = handler
  }

  /** After Flip lands — show board items + fade canvas grid in. */
  const requestMoodboardStagedReveal = async () => {
    if (moodboardStagedRevealHandler) await moodboardStagedRevealHandler()
  }

  const registerMoodboardChromeEnter = (
    handler: (() => Promise<void>) | null,
  ) => {
    moodboardChromeEnterHandler = handler
  }

  /** Tools + toolbox slide in (after grid). */
  const requestMoodboardChromeEnter = async () => {
    if (moodboardChromeEnterHandler) await moodboardChromeEnterHandler()
  }

  /** Boards cart under cream → Flip active board in → fade peers → toolbox up. */
  const closeMoodboardToBoards = async (opts: {
    boardId: string | null
    preview: string | null
    from: { left: number; top: number; width: number; height: number } | null
    beforeFlip?: () => void | Promise<void>
    /** After flyer hands off to the grid cell — tear down composer here. */
    afterLand?: () => void | Promise<void>
  }) => {
    if (moodboardCloseToBoardsHandler) {
      await moodboardCloseToBoardsHandler(opts)
    }
  }

  const requestMoodboardReturnToColumn = async (opts: {
    selectionId: string
    itemId: string
    from: { left: number; top: number; width: number; height: number }
    imageUrl: string
    objectFit?: 'contain' | 'cover'
    /** Used to re-insert into the selection if the park list was cleared. */
    item?: BucketItem
  }) => {
    if (moodboardReturnHandler) {
      await moodboardReturnHandler(opts)
      return
    }
    // Fallback if BucketStack isn’t mounted yet
    restoreParkedSelectionItem(opts.itemId)
    if (opts.item) {
      const board = moodboards.value.find((entry) => entry.id === opts.selectionId)
      if (board && !board.items.some((entry) => entry.id === opts.itemId)) {
        addItemToMoodboard(opts.selectionId, opts.item)
      }
    }
  }

  const clearMoodboardSession = () => {
    if (!import.meta.client) return
    try {
      localStorage.removeItem(MOODBOARD_SESSION_KEY)
    } catch {
      /* ignore */
    }
  }

  const persistMoodboardSession = (draft: {
    activeBoardId: string | null
    placements: unknown[]
    strokes: unknown[]
  }) => {
    if (!import.meta.client || !isMoodboard.value) return
    try {
      const payload: MoodboardSessionDraft = {
        open: true,
        activeBoardId: draft.activeBoardId,
        placements: draft.placements,
        strokes: draft.strokes,
        parked: parkedSelectionItems.value.map((entry) => ({
          selectionId: entry.selectionId,
          item: { ...entry.item, imageUrls: entry.item.imageUrls ? [...entry.item.imageUrls] : undefined },
          index: entry.index,
        })),
      }
      localStorage.setItem(MOODBOARD_SESSION_KEY, JSON.stringify(payload))
    } catch {
      /* ignore quota / private mode */
    }
  }

  const readMoodboardSession = (): MoodboardSessionDraft | null => {
    if (!import.meta.client) return null
    try {
      const raw = localStorage.getItem(MOODBOARD_SESSION_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as MoodboardSessionDraft
      if (!parsed?.open) return null
      return parsed
    } catch {
      return null
    }
  }

  const openMoodboard = (opts?: {
    skipBgFade?: boolean
    resume?: boolean
    /** Force cart reopen on close (e.g. cart was closed for handoff before open). */
    reopenCart?: boolean
    /** Hold grid/chrome until Flip + staged reveal (reverse of close). */
    stagedOpen?: boolean
    /** With stagedOpen: selection rail translates Y in with tools (Boards → Board). */
    enterSelection?: boolean
  }) => {
    // Remember cart state so closing the board can restore it.
    reopenCartAfterMoodboard.value = opts?.resume
      ? false
      : opts?.reopenCart !== undefined
        ? opts.reopenCart
        : isOpen.value
    moodboardSurfaceReady.value = false
    moodboardSkipBgFade.value = !!opts?.skipBgFade
    moodboardStagedOpen.value = !!opts?.stagedOpen
    moodboardEnterSelection.value = !!opts?.enterSelection
    // Fresh open clears parks; resume keeps the parked list from the session draft
    if (!opts?.resume) {
      parkedSelectionItems.value = []
    }
    const wasOpen = isMoodboard.value
    isMoodboard.value = true
    isOpen.value = false
    // Own the page scroll lock here (not only via BucketStack watchers) so
    // dropping the cart stage under the board can’t re-enable scroll.
    if (!wasOpen) lockPageScroll()
  }

  const consumeMoodboardSkipBgFade = () => {
    const skip = moodboardSkipBgFade.value
    moodboardSkipBgFade.value = false
    return skip
  }

  const consumeMoodboardStagedOpen = () => {
    const staged = moodboardStagedOpen.value
    moodboardStagedOpen.value = false
    return staged
  }

  const consumeMoodboardEnterSelection = () => {
    const enter = moodboardEnterSelection.value
    moodboardEnterSelection.value = false
    return enter
  }

  const closeMoodboard = async (opts?: { skipCartReturn?: boolean }) => {
    const wasOpen = isMoodboard.value
    // Items dragged onto the board return to their selection piles
    restoreAllParkedSelectionItems()
    clearMoodboardSession()
    moodboardSurfaceReady.value = false
    moodboardSkipBgFade.value = false
    moodboardStagedOpen.value = false
    moodboardEnterSelection.value = false
    isMoodboard.value = false
    reopenCartAfterMoodboard.value = false
    // Always release the composer lock; cart stage keeps its own if still up
    if (wasOpen) unlockPageScroll()
    if (opts?.skipCartReturn) {
      panelTab.value = 'boards'
      isOpen.value = true
      return
    }
    // Always restore the boards cart (not the underlying page)
    panelTab.value = 'boards'
    if (moodboardCloseReturnHandler) {
      await moodboardCloseReturnHandler()
    } else {
      isOpen.value = true
    }
  }

  const setParkedSelectionItems = (items: ParkedSelectionItem[]) => {
    parkedSelectionItems.value = items.map((entry) => ({
      selectionId: entry.selectionId,
      index: entry.index,
      item: {
        ...entry.item,
        imageUrls: entry.item.imageUrls ? [...entry.item.imageUrls] : undefined,
      },
    }))
  }

  const markMoodboardSurfaceReady = () => {
    moodboardSurfaceReady.value = true
  }

  const dismissDrawer = () => {
    isOpen.value = false
  }

  const closeDrawer = () => {
    if (animatedCloseHandler) {
      animatedCloseHandler()
      return
    }
    dismissDrawer()
  }

  const registerAnimatedClose = (handler: (() => void) | null) => {
    animatedCloseHandler = handler
  }

  const registerAnimatedOpen = (handler: (() => void) | null) => {
    animatedOpenHandler = handler
  }

  const registerSelectionStackHover = (
    handlers: { enter: () => void; leave: () => void } | null,
  ) => {
    selectionStackHoverHandlers = handlers
  }

  const hoverSelectionStack = (hot: boolean) => {
    if (hot) selectionStackHoverHandlers?.enter()
    else selectionStackHoverHandlers?.leave()
  }

  const openDrawer = (tab: 'selections' | 'boards' = 'selections') => {
    panelTab.value = tab
    isOpen.value = true
  }

  /** Open selections cart — Flip from pile when v2 is registered. */
  const openSelectionStack = () => {
    if (animatedOpenHandler) {
      animatedOpenHandler()
      return
    }
    openDrawer('selections')
  }

  onMounted(hydrate)

  return {
    moodboards,
    activeMoodboard,
    activeMoodboardId,
    items,
    selectionEntries,
    activePendingRemovals,
    isOpen,
    panelTab,
    isMoodboard,
    pickerItem,
    count,
    createMoodboard,
    renameMoodboard,
    deleteMoodboard,
    clearActiveItems,
    setActiveMoodboard,
    addItem,
    removeItem,
    removeItems,
    undoRemove,
    undoAllRemovals,
    clearPendingRemovals,
    cloneItem,
    cycleItemImage,
    setItemGallery,
    setItemImageIndex,
    addItemToMoodboard,
    removeItemFromMoodboard,
    parkedSelectionItems,
    parkSelectionItem,
    restoreParkedSelectionItem,
    restoreAllParkedSelectionItems,
    requestSave,
    selectMoodboardForItem,
    openPicker,
    closePicker,
    isSaved,
    isSavedIn,
    openMoodboard,
    closeMoodboard,
    closeMoodboardToBoards,
    requestMoodboardStackExit,
    persistMoodboardSession,
    clearMoodboardSession,
    readMoodboardSession,
    setParkedSelectionItems,
    moodboardSurfaceReady,
    markMoodboardSurfaceReady,
    consumeMoodboardSkipBgFade,
    consumeMoodboardStagedOpen,
    consumeMoodboardEnterSelection,
    registerMoodboardRestack,
    requestMoodboardRestack,
    registerMoodboardReturnToColumn,
    requestMoodboardReturnToColumn,
    registerMoodboardCloseReturn,
    registerMoodboardCloseToBoards,
    registerMoodboardStackExit,
    registerMoodboardStagedReveal,
    requestMoodboardStagedReveal,
    registerMoodboardChromeEnter,
    requestMoodboardChromeEnter,
    closeDrawer,
    dismissDrawer,
    registerAnimatedClose,
    registerAnimatedOpen,
    registerSelectionStackHover,
    hoverSelectionStack,
    openSelectionStack,
    openDrawer,
    pendingFly,
    consumePendingFly,
  }
}
