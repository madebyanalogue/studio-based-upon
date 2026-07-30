<template>
  <Teleport to="body">
    <div
      v-if="!isMoodboard"
      class="bucket"
      :class="{
        'bucket--open': isOpen,
        'bucket--over-product': productOpen,
        'bucket--push': isOpen && !productOpen,
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
            <div class="bucket__header-text">
              <div class="bucket__title-row">
                <input
                  v-if="isEditing"
                  ref="titleInput"
                  v-model="editName"
                  type="text"
                  class="bucket__title-input  interface"
                  aria-label="Selection name"
                  @keydown.enter.prevent="saveName"
                  @keydown.esc.prevent="cancelEdit"
                  @blur="saveName"
                />
                <h2 v-else class="bucket__title serif">{{ activeMoodboard?.name || 'My Selection' }}</h2>

                <div class="bucket__title-actions">
                  <button
                    type="button"
                    class="bucket__icon-btn"
                    :aria-label="isEditing ? 'Save name' : 'Edit selection name'"
                    @click="isEditing ? saveName() : startEdit()"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="bucket__icon-btn"
                    aria-label="Delete selection"
                    @click="confirmingDelete = true"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M3 6h18" />
                      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              </div>
              <p v-if="items.length" class="bucket__subtitle">
                {{ items.length }} {{ items.length === 1 ? 'item' : 'items' }} in this selection
              </p>
            </div>
            <button type="button" class="bucket__close" aria-label="Close" @click="closeDrawer">×</button>
          </header>

          <div v-if="!selectionEntries.length" class="bucket__empty">
            <p class="bucket__empty-title  interface">Nothing saved yet</p>
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
                  <button
                    type="button"
                    class="bucket__undo interface"
                    @click="undoRemove(entry.key)"
                  >
                    Undo remove
                  </button>
                  <span class="bucket__undo-progress" aria-hidden="true" />
                </div>
                <p class="bucket__name interface">{{ entry.item.title }}</p>
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
                    class="bucket__thumb-ctrl bucket__thumb-ctrl--clone"
                    variant="clone"
                    label="Clone item"
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

                <button
                  v-if="productSlug(entry.item)"
                  type="button"
                  class="bucket__info bucket__info--link"
                  @click="openProduct(entry.item, $event)"
                >
                  <p class="bucket__name interface">{{ entry.item.title }}</p>
                </button>
                <div v-else class="bucket__info">
                  <p class="bucket__name interface">{{ entry.item.title }}</p>
                </div>
              </div>
            </li>
          </ul>

          <footer class="bucket__footer">
            <button type="button" class="btn" @click="sendEnquiry">Send as enquiry</button>
            <button type="button" class="btn btn--filled" @click="onBuildMoodboard">
              Create Board
            </button>
          </footer>

          <div v-if="confirmingDelete" class="bucket__confirm" role="dialog" aria-modal="true" aria-label="Delete selection">
            <div class="bucket__confirm-box">
              <p class="bucket__confirm-title  interface">Delete this selection?</p>
              <p class="bucket__confirm-text">
                “{{ activeMoodboard?.name || 'My Selection' }}” and its {{ items.length }}
                {{ items.length === 1 ? 'item' : 'items' }} will be permanently removed.
              </p>
              <div class="bucket__confirm-actions">
                <button type="button" class="btn" @click="confirmingDelete = false">Cancel</button>
                <button type="button" class="btn btn--filled" @click="onDeleteMoodboard">Delete</button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { BucketItem } from '~/composables/useBucket'
import { uniqueImageUrls } from '~/composables/productImages'

const {
  moodboards,
  activeMoodboard,
  activeMoodboardId,
  items,
  selectionEntries,
  isOpen,
  isMoodboard,
  closeDrawer,
  removeItem,
  undoRemove,
  cloneItem,
  cycleItemImage,
  setItemGallery,
  openMoodboard,
  setActiveMoodboard,
  createMoodboard,
  renameMoodboard,
  deleteMoodboard,
} = useBucket()
const { isOpen: productOpen } = useProductOverlay()
const { initFromBucket, snapshot } = useMoodboard()
const { createBoard } = useBoards()
const { openFromBucket } = useEnquiryForm()
const { open } = useProductOverlay()
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

const galleryCount = (item: BucketItem) => item.imageUrls?.length || 0

const galleryIndex = (item: BucketItem) => {
  const urls = item.imageUrls || []
  if (!urls.length) return 0
  if (typeof item.imageIndex === 'number') return item.imageIndex
  const idx = urls.indexOf(item.imageUrl)
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
  document.documentElement.classList.toggle(
    'bucket-push',
    Boolean(isOpen.value && !productOpen.value),
  )
}

watch([isOpen, productOpen], syncBucketPush, { immediate: true })

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.documentElement.classList.remove('bucket-push')
  }
})

const openBoard = (id: string) => {
  setActiveMoodboard(id)
  isOpen.value = true
}

const onNew = () => {
  createMoodboard()
}

const openProduct = (item: BucketItem, event?: MouseEvent) => {
  const slug = productSlug(item)
  if (!slug) return
  const source =
    ((event?.currentTarget as HTMLElement | null)?.querySelector('img') as HTMLElement | null) ||
    null
  open(slug, { source })
  closeDrawer()
}

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
  if (activeMoodboardId.value) deleteMoodboard(activeMoodboardId.value)
  confirmingDelete.value = false
}

const onBuildMoodboard = () => {
  if (!items.value.length) return
  initFromBucket(items.value)
  const { placements, strokes } = snapshot()
  createBoard(placements, strokes)
  openMoodboard()
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

/* On the PDP the cart fills the reserved right column — no dimming overlay */
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
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  max-width: 100%;
  /* Closed: fully off-screen (rail is hidden; open via My Selections in the header) */
  transform: translateX(100%);
  transition: transform var(--bucket-close-ms) cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
  box-shadow: none;
  filter: none;
}

.bucket--open .bucket__dock {
  transform: translateX(0);
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
  width: var(--side-column-width);
  max-width: 100vw;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 0;
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
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem var(--gutter);
  border-bottom: 1px solid var(--grid-line);
}

.bucket__header-text {
  flex: 1;
  min-width: 0;
}

.bucket__title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bucket__title {
  margin: 0;
  font-size: var(--text-xl);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bucket__title-input {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0.1rem 0.35rem;
  font: inherit;
  font-size: var(--text-xl);
  color: var(--charcoal);
  background: var(--cream);
  border: 1px solid var(--grid-line);
  border-radius: 0;
}

.bucket__title-input:focus {
  outline: none;
  border-color: var(--charcoal);
}

.bucket__title-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  margin-left: auto;
}

.bucket__icon-btn {
  display: grid;
  place-items: center;
  width: 1.9rem;
  height: 1.9rem;
  color: var(--muted);
  border-radius: 0;
  transition: color 0.2s ease, background 0.2s ease;
}

.bucket__icon-btn:hover {
  color: var(--charcoal);
  background: var(--cream);
}

.bucket__subtitle {
  margin: 0.35rem 0 0;
  font-size: var(--text-sm);
  color: var(--muted);
}

.bucket__close {
  font-size: 1.75rem;
  line-height: 1;
}

.bucket__empty,
.bucket__list {
  flex: 1;
  overflow: auto;
  padding: var(--gutter);
  gap: 10px;
  display: flex;
  flex-direction: column;
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
  display: grid;
  align-content: start;
  gap: 1rem;
}

.bucket__item {
  display: block;
}

.bucket__item-main {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.bucket__thumb {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  container-type: inline-size;
  padding: 8%;
  text-align: center;
  overflow: hidden;
  border-radius: var(--thumb-radius);
}

.bucket__thumb-hit {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
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

.bucket__thumb-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  pointer-events: none;
}

.bucket__thumb:has(.bucket__thumb-image) {
  padding: 0;
  background: var(--sand);
}

.bucket__thumb--undo {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 0 0 1rem;
  background: transparent;
  border: 1px solid var(--ui-border-color);
}

.bucket__undo {
  display: grid;
  place-items: center;
  flex: 1;
  width: 100%;
  min-height: 0;
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
  flex-shrink: 0;
  align-self: center;
  width: calc(100% * 2 / 3);
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
  font-size: 15cqi;
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

.bucket__footer {
  display: grid;
  gap: 0.75rem;
  padding: var(--gutter);
  border-top: 1px solid var(--grid-line);
}

.bucket__footer .btn {
  width: 100%;
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
