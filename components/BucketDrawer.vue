<template>
  <Teleport to="body">
    <div
      v-if="!isMoodboard"
      class="bucket"
      :class="{
        'bucket--open': isOpen,
        'bucket--over-product': productOpen,
        'bucket--push': isOpen,
      }"
      :aria-hidden="isOpen ? 'false' : 'true'"
    >
      <div class="bucket__backdrop" @click="closeDrawer" />

      <div class="bucket__dock">
        <aside class="bucket__rail" aria-hidden="true" hidden>
          <div class="bucket__rail-list" role="list">
            <button
              v-for="board in moodboards"
              :key="board.id"
              type="button"
              class="bucket__rail-tab"
              :class="{ 'bucket__rail-tab--active': board.id === activeMoodboardId }"
              role="listitem"
              :aria-current="board.id === activeMoodboardId ? 'true' : undefined"
              :aria-label="`${board.name}, ${board.items.length} items`"
              @click="openBoard(board.id)"
            >
              <span class="bucket__rail-name">{{ board.name }}</span>
              <span class="bucket__rail-count">{{ board.items.length }}</span>
            </button>
          </div>

          <button
            type="button"
            class="bucket__rail-add"
            aria-label="New Selection"
            @click="onNew"
          >
            <span class="bucket__rail-add-mark" aria-hidden="true">+</span>
            <span class="bucket__rail-tooltip" aria-hidden="true">New Selection</span>
          </button>
        </aside>

        <aside
          class="bucket__panel"
          role="dialog"
          aria-modal="true"
          aria-label="Saved products"
        >
          <header class="bucket__header">
            <div class="bucket__toolbar">
              <div class="bucket__tabs" role="tablist" aria-label="Selections">
                <button
                  v-for="board in moodboards"
                  :key="board.id"
                  type="button"
                  class="bucket__tab interface"
                  :class="{
                    'bucket__tab--active':
                      panelTab === 'selections' && board.id === activeMoodboard?.id,
                  }"
                  role="tab"
                  :aria-selected="panelTab === 'selections' && board.id === activeMoodboard?.id"
                  @click="selectTab(board.id)"
                >
                  {{ board.name }}
                </button>
                <button
                  type="button"
                  class="bucket__tab-add"
                  aria-label="New Selection"
                  @click="onNewTab"
                >
                  <span aria-hidden="true">+</span>
                </button>
              </div>

              <div class="bucket__toolbar-end">
                <button
                  type="button"
                  class="bucket__tab interface"
                  :class="{ 'bucket__tab--active': panelTab === 'boards' }"
                  role="tab"
                  :aria-selected="panelTab === 'boards'"
                  @click="panelTab = 'boards'"
                >
                  Boards
                </button>
                <button type="button" class="bucket__close interface" @click="closeDrawer">
                  Close
                </button>
              </div>
            </div>
          </header>

          <template v-if="panelTab === 'selections'">
            <div class="bucket__body">
              <div v-if="!selectionEntries.length" class="bucket__empty">
                <p class="bucket__empty-title interface">Nothing saved yet</p>
                <p>Heart items from the grid to collect surfaces, materials and finishes here.</p>
              </div>

              <ul v-else class="bucket__list">
                <li
                  v-for="entry in selectionEntries"
                  :key="entry.kind === 'undo' ? `undo-${entry.key}` : entry.item.id"
                  class="bucket__item"
                  :class="{ 'bucket__item--undo': entry.kind === 'undo' }"
                >
                  <div v-if="entry.kind === 'undo'" class="bucket__item-main">
                    <div class="bucket__thumb bucket__thumb--undo">
                      <img
                        v-if="entry.item.imageUrl"
                        :src="entry.item.imageUrl"
                        alt=""
                        class="bucket__thumb-image bucket__thumb-image--sizer"
                        aria-hidden="true"
                      />
                      <span
                        v-else
                        class="bucket__thumb-label bucket__thumb-label--sizer"
                        aria-hidden="true"
                      />
                      <button
                        type="button"
                        class="bucket__undo interface"
                        @click="undoRemove(entry.key)"
                      >
                        Undo
                      </button>
                      <span class="bucket__undo-progress" aria-hidden="true" />
                    </div>
                  </div>

                  <div v-else class="bucket__item-main">
                    <div class="bucket__thumb">
                      <button
                        v-if="productSlug(entry.item)"
                        type="button"
                        class="bucket__thumb-hit"
                        :aria-label="`Open ${entry.item.title}`"
                        @click="openProduct(entry.item, $event)"
                      >
                        <img
                          v-if="entry.item.imageUrl"
                          :src="entry.item.imageUrl"
                          :alt="entry.item.title"
                          class="bucket__thumb-image"
                        />
                        <span v-else class="bucket__thumb-label">{{ entry.item.itemType }}</span>
                      </button>
                      <template v-else>
                        <img
                          v-if="entry.item.imageUrl"
                          :src="entry.item.imageUrl"
                          :alt="entry.item.title"
                          class="bucket__thumb-image"
                        />
                        <span v-else class="bucket__thumb-label">{{ entry.item.itemType }}</span>
                      </template>

                      <AddButton
                        v-if="galleryCount(entry.item) > 1"
                        class="bucket__thumb-ctrl bucket__thumb-ctrl--clone"
                        variant="clone"
                        :label="`Clone ${entry.item.title}`"
                        @click.stop="cloneItem(entry.item.id)"
                      />
                      <AddButton
                        class="bucket__thumb-ctrl bucket__thumb-ctrl--remove"
                        variant="remove"
                        :label="`Remove ${entry.item.title}`"
                        @click.stop="removeItem(entry.item.id)"
                      />
                      <ImageCycleArrows
                        v-if="galleryCount(entry.item) > 1"
                        class="bucket__thumb-ctrl bucket__thumb-ctrl--cycle"
                        :index="galleryIndex(entry.item)"
                        :count="galleryCount(entry.item)"
                        hide-count
                        boxed
                        @prev="cycleItemImage(entry.item.id, -1)"
                        @next="cycleItemImage(entry.item.id, 1)"
                      />
                    </div>
                  </div>
                </li>
              </ul>

              <aside class="bucket__actions" aria-label="Selection actions">
                <div class="bucket__action-links">
                  <input
                    v-if="isEditing"
                    ref="titleInput"
                    v-model="editName"
                    type="text"
                    class="bucket__title-input interface"
                    aria-label="Selection name"
                    @keydown.enter.prevent="saveName"
                    @keydown.esc.prevent="cancelEdit"
                    @blur="saveName"
                  />
                  <button
                    v-else
                    type="button"
                    class="bucket__action-link interface"
                    @click="startEdit"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    class="bucket__action-link interface"
                    @click="confirmingDelete = true"
                  >
                    Delete
                  </button>
                </div>
                <button
                  type="button"
                  class="btn"
                  :disabled="!items.length"
                  @click="sendEnquiry"
                >
                  Send as enquiry
                </button>
                <button
                  type="button"
                  class="btn btn--filled"
                  :disabled="!items.length"
                  @click="onBuildMoodboard"
                >
                  Create Board
                </button>
              </aside>
            </div>

            <div
              v-if="confirmingDelete"
              class="bucket__confirm"
              role="dialog"
              aria-modal="true"
              aria-label="Delete selection"
            >
              <div class="bucket__confirm-box">
                <p class="bucket__confirm-title interface">Delete this selection?</p>
                <p class="bucket__confirm-text">
                  “{{ activeMoodboard?.name || 'My Selection' }}” and its {{ items.length }}
                  {{ items.length === 1 ? 'item' : 'items' }} will be permanently removed.
                </p>
                <div class="bucket__confirm-actions">
                  <button type="button" class="btn" @click="confirmingDelete = false">Cancel</button>
                  <button type="button" class="btn btn--filled" @click="onDeleteMoodboard">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </template>

          <template v-else>
            <div v-if="!selectionBoards.length" class="bucket__empty">
              <p class="bucket__empty-title interface">No boards yet</p>
              <p>Create a board from a selection to arrange pieces on the canvas.</p>
            </div>
            <ul v-else class="bucket__list bucket__list--boards">
              <li v-for="board in selectionBoards" :key="board.id" class="bucket__item">
                <button
                  type="button"
                  class="bucket__board-row"
                  :class="{ 'bucket__board-row--active': board.id === activeBoardId }"
                  @click="openSavedBoard(board.id)"
                >
                  <span class="bucket__board-meta">
                    <span class="bucket__board-name interface">{{ board.name }}</span>
                    <span class="bucket__board-count">{{ board.placements.length }}</span>
                  </span>
                  <span v-if="board.preview" class="bucket__board-thumb">
                    <img
                      :src="board.preview"
                      :alt="`${board.name} preview`"
                      class="bucket__board-preview"
                    />
                  </span>
                </button>
              </li>
            </ul>
          </template>
        </aside>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { BucketItem } from '~/composables/useBucket'
import { productIdFromBucketId } from '~/composables/useBucket'
import { uniqueImageUrls } from '~/composables/productImages'
import { imageAssetKey, prefetchImage } from '~/composables/useSanityImage'

const {
  moodboards,
  activeMoodboard,
  activeMoodboardId,
  items,
  selectionEntries,
  isOpen,
  panelTab,
  isMoodboard,
  closeDrawer,
  removeItem,
  undoRemove,
  cloneItem,
  cycleItemImage,
  setItemGallery,
  setItemImageIndex,
  openMoodboard,
  setActiveMoodboard,
  createMoodboard,
  renameMoodboard,
  deleteMoodboard,
} = useBucket()
const { isOpen: productOpen, open, returnImage } = useProductOverlay()
const { loadBoard, reset } = useMoodboard()
const {
  createBoard,
  boards,
  activeBoardId,
  setActiveBoard,
  boardsForSelection,
  deleteBoardsForSelection,
} = useBoards()
const selectionBoards = computed(() =>
  boardsForSelection(activeMoodboardId.value).filter(
    (board) => board.placements.length > 0 || !!board.preview,
  ),
)
const { openFromBucket } = useEnquiryForm()
const { fetchProduct } = useProductCatalog()
const { imageUrl: buildUrl } = useSanityImage()

const isEditing = ref(false)
const editName = ref('')
const confirmingDelete = ref(false)
const titleInput = ref<HTMLInputElement | null>(null)
let galleryHydrateToken = 0

const productSlug = (item: BucketItem) => {
  if (!item.link) return null
  const match = item.link.match(/\/(?:products|materials-and-forms)\/([^/?#]+)/)
  return match?.[1] || null
}

const galleryUrls = (item: BucketItem) => uniqueImageUrls(...(item.imageUrls || []))

const galleryCount = (item: BucketItem) => galleryUrls(item).length

const galleryIndex = (item: BucketItem) => {
  const urls = galleryUrls(item)
  if (!urls.length) return 0
  if (typeof item.imageIndex === 'number') {
    return Math.min(item.imageIndex, urls.length - 1)
  }
  const idx = urls.findIndex(
    (url) => imageAssetKey(url) === imageAssetKey(item.imageUrl),
  )
  return idx >= 0 ? idx : 0
}

/** Backfill galleries for older saved items that only stored one image. */
const hydrateGalleries = async () => {
  const token = ++galleryHydrateToken
  const pending = items.value.filter(
    (item) => (item.imageUrls?.length || 0) < 2 && productSlug(item),
  )
  for (const item of pending) {
    if (token !== galleryHydrateToken) return
    const slug = productSlug(item)
    if (!slug) continue
    const product = await fetchProduct(slug)
    if (!product || token !== galleryHydrateToken) continue
    const urls = uniqueImageUrls(
      item.imageUrl,
      buildUrl(product.image, 1200),
      ...(product.gallery || []).map((img) => buildUrl(img, 1200)),
      ...(product.spiritGallery || []).map((img) => buildUrl(img, 1200)),
    )
    if (urls.length > 1) setItemGallery(item.id, urls)
  }
}

watch(isOpen, (open) => {
  if (open) void hydrateGalleries()
})

const syncBucketPush = () => {
  if (!import.meta.client) return
  // Keep the page inset while the cart is open — including over the PDP —
  // so opening/closing a product doesn't reflow content.
  document.documentElement.classList.toggle('bucket-push', Boolean(isOpen.value))
}

watch(isOpen, syncBucketPush, { immediate: true })

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.documentElement.classList.remove('bucket-push')
  }
})

const openBoard = (id: string) => {
  setActiveMoodboard(id)
  isOpen.value = true
}

const selectTab = (id: string) => {
  setActiveMoodboard(id)
  panelTab.value = 'selections'
}

const onNewTab = () => {
  createMoodboard({ open: true })
  panelTab.value = 'selections'
}

const openSavedBoard = (id: string) => {
  const board = boards.value.find((b) => b.id === id)
  if (!board) return
  setActiveBoard(id)
  loadBoard(board.placements, board.strokes)
  openMoodboard({ reopenCart: true })
}

const onNew = () => {
  onNewTab()
}

const openProduct = (item: BucketItem, event?: MouseEvent) => {
  const slug = productSlug(item)
  if (!slug) return
  const source =
    ((event?.currentTarget as HTMLElement | null)?.querySelector('img') as HTMLElement | null) ||
    null
  const index = galleryIndex(item)
  const urls = galleryUrls(item)
  const flipSrc = urls[index] || item.imageUrl || null
  if (flipSrc) void prefetchImage(flipSrc)
  open(slug, {
    source,
    imageIndex: index,
    flipSrc,
    bucketItemId: item.id,
  })
}

watch(returnImage, (value) => {
  if (!value) return
  const targetId =
    value.bucketItemId ||
    items.value.find((item) => productIdFromBucketId(item.id) === value.productId)?.id
  if (!targetId) return
  setItemImageIndex(targetId, value.index)
})

const startEdit = () => {
  editName.value = activeMoodboard.value?.name || ''
  isEditing.value = true
  nextTick(() => {
    titleInput.value?.focus()
    titleInput.value?.select()
  })
}

const saveName = () => {
  if (!isEditing.value) return
  if (activeMoodboardId.value && editName.value.trim()) {
    renameMoodboard(activeMoodboardId.value, editName.value)
  }
  isEditing.value = false
}

const cancelEdit = () => {
  isEditing.value = false
}

const onDeleteMoodboard = () => {
  if (activeMoodboardId.value) {
    deleteBoardsForSelection(activeMoodboardId.value)
    deleteMoodboard(activeMoodboardId.value)
  }
  confirmingDelete.value = false
}

const onBuildMoodboard = () => {
  // Empty canvas — selections stay in the rail; drag them on when ready
  reset()
  createBoard([], [], undefined, undefined, activeMoodboardId.value || undefined)
  openMoodboard({ reopenCart: true })
}

const sendEnquiry = () => {
  if (!items.value.length) return
  openFromBucket(items.value)
}

watch(activeMoodboardId, () => {
  isEditing.value = false
  confirmingDelete.value = false
})
</script>

<style scoped>
.bucket {
  --rail-width: var(--bucket-rail-width);
  --bucket-close-ms: 0.4s;
  position: fixed;
  inset: 0;
  /* Below product overlay (250) when closed so the rail doesn't sit on the PDP */
  z-index: 200;
  /* Keep elevated stacking until the dock has finished sliding closed */
  transition: z-index 0s linear var(--bucket-close-ms);
  pointer-events: none;
  overflow: hidden;
}

.bucket--open {
  /* Above product overlay so the panel appears over the PDP while adding */
  z-index: 280;
  transition: z-index 0s;
}

.bucket__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  opacity: 0;
  transition: opacity 0.35s ease;
  pointer-events: none;
}

.bucket--open .bucket__backdrop {
  opacity: 1;
  pointer-events: auto;
}

/* On the PDP the cart sits along the bottom — no dimming overlay */
.bucket--over-product .bucket__backdrop {
  opacity: 0;
  pointer-events: none;
}

/* Grid pages: cart pushes content instead of overlaying — no dim */
.bucket--push .bucket__backdrop {
  opacity: 0;
  pointer-events: none;
}

.bucket__dock {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  max-height: min(var(--bucket-height), 100dvh);
  /* Closed: fully off-screen below the viewport */
  transform: translateY(100%);
  transition: transform var(--bucket-close-ms) cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
  box-shadow: none;
  filter: none;
}

.bucket--open .bucket__dock {
  transform: translateY(0);
}

.bucket__rail {
  display: none;
}

.bucket__rail-list {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  overflow-y: auto;
  overflow-x: visible;
  max-height: calc(100% - 2.75rem);
  scrollbar-width: none;
}

.bucket__rail-list::-webkit-scrollbar {
  display: none;
}

.bucket__rail-tab {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  padding: 1rem 0.35rem;
  color: var(--muted);
  background: var(--sand);
  border: 1px solid var(--ui-border-color);
  border-right: 0;
  border-radius: 0;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
  transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}

.bucket__rail-tab + .bucket__rail-tab {
  margin-top: -1px;
}

.bucket__rail-tab:hover {
  color: var(--charcoal);
  background: var(--cream);
  z-index: 1;
}

.bucket__rail-tab--active {
  color: var(--charcoal);
  background: var(--warm-white);
  border-color: var(--ui-border-color);
  z-index: 2;
}

.bucket__rail-name {
  font-family: var(--font-serif);
  font-size: var(--text-sm);
  letter-spacing: 0.02em;
  max-height: 8.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bucket__rail-count {
  font-family: var(--mono);
  font-size: 0.65rem;
  opacity: 0.7;
}

.bucket__rail-add {
  position: relative;
  width: 100%;
  height: 2.15rem;
  display: grid;
  place-items: center;
  margin-top: -1px;
  color: var(--charcoal);
  background: var(--sand);
  border: 1px solid var(--ui-border-color);
  border-right: 0;
  border-radius: 0;
  transition: background 0.2s ease;
}

.bucket__rail-add:hover {
  background: var(--cream);
}

.bucket__rail-add-mark {
  font-size: 1.2rem;
  line-height: 1;
}

.bucket__rail-tooltip {
  position: absolute;
  top: 50%;
  right: calc(100% + 0.55rem);
  transform: translateY(-50%) translateX(4px);
  padding: 0.4rem 0.65rem;
  font-family: var(--font-serif);
  font-size: var(--text-sm);
  color: var(--charcoal);
  white-space: nowrap;
  background: var(--warm-white);
  border: 1px solid var(--ui-border-color);
  border-radius: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.bucket__rail-add:hover .bucket__rail-tooltip,
.bucket__rail-add:focus-visible .bucket__rail-tooltip {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

.bucket__panel {
  position: relative;
  width: 100%;
  height: var(--bucket-height);
  max-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--panel-bg);
  border-radius: 0;
  border-top: 1px solid var(--grid-line);
  overflow: hidden;
  pointer-events: none;
  backdrop-filter: blur(50px);
  -webkit-border-shape: squircle;
  box-shadow: none;
}

.bucket--open .bucket__panel {
  pointer-events: auto;
}

.bucket__header {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: var(--bucket-header-height);
  box-sizing: border-box;
}

.bucket__toolbar {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 0;
  height: 100%;
  padding: 0;
  background: transparent;
  border-bottom: 1px solid var(--grid-line);
}

.bucket__tabs {
  display: flex;
  align-items: stretch;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.bucket__tabs::-webkit-scrollbar {
  display: none;
}

.bucket__toolbar-end {
  display: flex;
  align-items: stretch;
  flex-shrink: 0;
  margin-left: auto;
}

.bucket__tab {
  display: inline-flex;
  align-items: center;
  padding: 0 var(--gutter);
  font-size: var(--text-sm);
  color: var(--slate);
  white-space: nowrap;
  transition: color var(--theme-ms) var(--theme-ease);
}

.bucket__tab:hover {
  color: var(--charcoal);
}

.bucket__tab--active {
  color: var(--charcoal);
}

.bucket__tab-add {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  min-width: 2.5rem;
  padding: 0 0.75rem;
  font-size: 1.15rem;
  line-height: 1;
  color: var(--slate);
  transition: color var(--theme-ms) var(--theme-ease);
}

.bucket__tab-add:hover {
  color: var(--charcoal);
}

.bucket__close {
  display: inline-flex;
  align-items: center;
  padding: 0 var(--gutter);
  font-size: var(--text-sm);
  text-decoration: underline;
  text-underline-offset: 4px;
  color: var(--charcoal);
  white-space: nowrap;
  transition: color var(--theme-ms) var(--theme-ease);
}

.bucket__body {
  display: flex;
  flex: 1;
  min-height: 0;
  align-items: stretch;
}

.bucket__actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.5rem;
  flex-shrink: 0;
  width: 12.5rem;
  padding: var(--bucket-list-pad) var(--gutter);
  border-left: 1px solid var(--grid-line);
  box-sizing: border-box;
  background: transparent;
}

.bucket__actions .btn {
  width: 100%;
  border-radius: 0;
  transition:
    background var(--theme-ms) var(--theme-ease),
    color var(--theme-ms) var(--theme-ease);
}

.bucket__actions .btn:disabled {
  opacity: 0.4;
  pointer-events: none;
}

.bucket__action-links {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.75rem 1rem;
  margin-bottom: 0.25rem;
}

.bucket__action-link {
  padding: 0;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: var(--text-xs);
  color: var(--muted);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  transition: color var(--theme-ms) var(--theme-ease);
}

.bucket__action-link:hover {
  color: var(--charcoal);
}

.bucket__title-input {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0.35rem 0.5rem;
  font: inherit;
  font-size: var(--text-xs);
  color: var(--charcoal);
  background: var(--cream);
  border: 1px solid var(--grid-line);
  border-radius: 0;
  box-sizing: border-box;
}

.bucket__title-input:focus {
  outline: none;
  border-color: var(--charcoal);
}

.bucket__empty {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: var(--gutter);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.bucket__empty p {
  color: var(--muted);
  margin: 0;
}

.bucket__empty-title {
  margin: 0 0 0.5rem;
  font-size: var(--text-lg);
  color: var(--charcoal);
}

.bucket__list {
  list-style: none;
  margin: 0;
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0.75rem;
  padding: var(--bucket-list-pad) var(--gutter);
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}

.bucket__list--boards {
  flex-direction: row;
  align-items: stretch;
  gap: 0.75rem;
}

.bucket__board-row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.5rem;
  width: 10rem;
  height: 100%;
  padding: 0;
  color: var(--charcoal);
  text-align: left;
  transition: color var(--theme-ms) var(--theme-ease);
}

.bucket__board-row:hover,
.bucket__board-row--active {
  color: var(--accent);
}

.bucket__board-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.bucket__board-name {
  margin: 0;
  min-width: 0;
  font-size: var(--text-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bucket__board-count {
  flex-shrink: 0;
  font-size: var(--text-sm);
  color: var(--muted);
}

.bucket__board-thumb {
  display: block;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: var(--sand);
}

.bucket__board-preview {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bucket__item {
  display: block;
  flex: 0 0 auto;
  height: var(--bucket-item-height);
}

.bucket__item-main {
  position: relative;
  display: block;
  height: 100%;
}

.bucket__thumb {
  position: relative;
  height: var(--bucket-item-height);
  width: auto;
  display: block;
  text-align: center;
  overflow: hidden;
  border-radius: var(--thumb-radius);
}

.bucket__thumb-hit {
  display: block;
  height: var(--bucket-item-height);
  width: auto;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.bucket__thumb-image {
  box-sizing: border-box;
  height: var(--bucket-item-height);
  width: auto;
  max-width: none;
  margin: 0;
  object-fit: contain;
  object-position: center;
  display: block;
  pointer-events: none;
}

.bucket__thumb-ctrl {
  position: absolute;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.bucket__item:hover .bucket__thumb-ctrl {
  opacity: 1;
  pointer-events: auto;
}

.bucket__thumb-ctrl--clone {
  top: var(--thumb-ctrl-inset);
  left: var(--thumb-ctrl-inset);
}

.bucket__thumb-ctrl--remove {
  top: var(--thumb-ctrl-inset);
  right: var(--thumb-ctrl-inset);
}

.bucket__thumb-ctrl--cycle {
  right: var(--thumb-ctrl-inset);
  bottom: var(--thumb-ctrl-inset);
}

.bucket__thumb--undo {
  width: auto;
  display: block;
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--ui-border-color);
}

.bucket__thumb-image--sizer,
.bucket__thumb-label--sizer {
  visibility: hidden;
  pointer-events: none;
}

.bucket__thumb-label--sizer {
  width: var(--bucket-item-height);
}

.bucket__undo {
  position: absolute;
  inset: 0 0 1rem;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 100%;
  padding: 1rem;
  border: 0;
  background: transparent;
  color: var(--charcoal);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.bucket__undo:hover {
  color: var(--accent);
}

.bucket__undo-progress {
  position: absolute;
  left: 16.666%;
  bottom: 0.65rem;
  z-index: 1;
  width: 66.666%;
  height: 1px;
  background: var(--charcoal);
  transform: scaleX(0);
  transform-origin: left center;
  animation: bucket-undo-progress var(--undo-remove-ms, 5s) linear forwards;
  pointer-events: none;
}

@keyframes bucket-undo-progress {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

.bucket__thumb-label {
  display: grid;
  place-items: center;
  width: var(--bucket-item-height);
  height: var(--bucket-item-height);
  padding: 8%;
  font-size: var(--text-sm);
  line-height: 0.95;
  letter-spacing: -0.02em;
  color: var(--charcoal);
  text-transform: lowercase;
  opacity: 0.4;
}

.bucket__info {
  min-width: 0;
  text-align: left;
}

.bucket__info--link {
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.bucket__info--link:hover .bucket__name {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.bucket__name {
  margin: 0;
}

.bucket__confirm {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: grid;
  place-items: center;
  padding: var(--gutter);
  background: rgba(26, 26, 26, 0.35);
  backdrop-filter: blur(2px);
}

.bucket__confirm-box {
  width: 100%;
  max-width: 22rem;
  padding: 1.5rem;
  background: var(--warm-white);
  border-radius: 0;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
}

.bucket__confirm-title {
  margin: 0 0 0.5rem;
  font-size: var(--text-lg);
  color: var(--charcoal);
}

.bucket__confirm-text {
  margin: 0 0 1.5rem;
  font-size: var(--text-sm);
  color: var(--muted);
}

.bucket__confirm-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.bucket__confirm-actions .btn {
  width: 100%;
}
</style>
