<template>
  <Teleport to="body">
    <div
      class="stack"
      :class="{
        'stack--open': isOpen || stagePresent,
        'stack--flipping': isFlipping,
        'stack--soft-enter': softEnter,
        'stack--cells-ready': cellsReady,
        'stack--moodboard': isMoodboard && !boardsCartRevealing,
        'stack--boards-revealing': boardsCartRevealing,
        'stack--boards-intro': boardsGridIntro,
        'stack--boards-landed': boardsLanded,
        'stack--boards-handoff': boardsGridHandoff,
        'stack--boards-cart': stagePresent && panelTab === 'boards',
        'stack--above-pdp': productOverlayOpen && !isOpen && !stagePresent,
      }"
      :style="stackCssVars"
      :aria-hidden="isOpen || stagePresent || isMoodboard || showRail ? 'false' : 'true'"
    >
      <!-- Selection piles + create slot (bottom-left) -->
      <div
        v-if="showRail"
        class="stack__rail"
        :class="{
          'stack__rail--hot': railHot,
          'stack__rail--multi': railBoards.length > 1,
          'stack__rail--expanded': railExpanded,
          'stack__rail--exiting': railExiting,
        }"
        @mouseenter="onRailEnter"
        @mouseleave="onRailLeave"
      >
        <div
          v-for="board in railBoards"
          :key="board.id"
          :ref="(el) => setPileWrapRef(board.id, el)"
          class="stack__pile-wrap"
          :class="{
            'stack__pile-wrap--empty': board.items.length === 0,
            'stack__pile-wrap--receiving':
              railBoards.length > 1 && board.id === activeMoodboardId,
            'stack__pile-wrap--parked':
              railBoards.length > 1 &&
              !railExpanded &&
              board.id !== activeMoodboardId,
          }"
          @mouseenter="onPileMouseEnter(board.id)"
          @mouseleave="onPileMouseLeave(board.id)"
        >
          <!-- Empty additional stack — frosted slot with remove (cart only) -->
          <div
            v-if="board.items.length === 0"
            :ref="(el) => setPileRef(board.id, el)"
            class="stack__pile-empty"
            role="button"
            tabindex="0"
            :aria-label="`${board.name}, empty selection`"
            :aria-pressed="board.id === activeMoodboardId"
            @click="onSelectEmptyStack(board.id)"
            @keydown.enter.prevent="onSelectEmptyStack(board.id)"
            @keydown.space.prevent="onSelectEmptyStack(board.id)"
          >
            <button
              v-if="canRemoveEmptyStack"
              type="button"
              class="stack__pile-empty-remove"
              :aria-label="`Remove ${board.name}`"
              @click.stop="onRemoveEmptyStack(board.id)"
            >
              <span class="stack__pile-empty-x" aria-hidden="true">
                <span class="stack__pile-empty-bar" />
                <span class="stack__pile-empty-bar" />
              </span>
            </button>
          </div>

          <button
            v-else
            :ref="(el) => setPileRef(board.id, el)"
            type="button"
            class="stack__pile"
            :class="{
              'stack__pile--fanned': pileFannedId === board.id,
              'stack__pile--active': board.id === activeMoodboardId,
              'stack__pile--expanded': expandedBoardIds.includes(board.id),
              // Vue-owned — imperative classList was wiped on re-render
              'stack__pile--dispersing':
                expandedBoardIds.includes(board.id) &&
                preparingBoardId !== board.id,
            }"
            :aria-label="board.name"
            @click="onPileClick(board.id)"
          >
            <span
              v-for="(card, index) in stackPileCards(board)"
              :key="card.id"
              class="stack__pile-card stack__pile-card--fan"
              :class="{ 'stack__pile-card--arriving': arrivingIds.includes(card.id) }"
              :data-item-id="card.id"
              :data-flip-id="
                flipSurface === 'pile' && board.id === activeMoodboardId
                  ? card.id
                  : undefined
              "
              :style="pileCardStyle(card.id, stackPileCards(board))"
            >
              <img
                v-if="card.imageUrl"
                :src="card.imageUrl"
                :alt="card.title"
                class="stack__pile-image"
                draggable="false"
              />
            </span>
          </button>

          <p
            v-if="showSelectionTips"
            class="stack__pile-tip"
            :class="{ 'stack__pile-tip--visible': showPileTip(board.id) }"
            aria-hidden="true"
          >
            {{ board.name }}
          </p>

          <!-- Dispersed column (board builder) -->
          <div
            v-if="expandedBoardIds.includes(board.id)"
            class="stack__column"
            :class="{ 'stack__column--preparing': preparingBoardId === board.id }"
            :ref="(el) => setColumnRef(board.id, el)"
            :style="columnFixedStyle(board.id)"
          >
            <div
              class="stack__column-scroll"
              @wheel.prevent.stop="onColumnWheel"
            >
              <!-- Grows when few items so the column stays pinned to the footprint -->
              <div class="stack__column-pin" aria-hidden="true" />
              <div
                v-for="item in boardColumnItems(board)"
                :key="item.id"
                class="stack__column-thumb"
                :class="{ 'stack__column-thumb--returning': columnReturningId === item.id }"
                :data-column-id="item.id"
                @pointerdown="onColumnThumbPointerDown($event, item, board.id)"
              >
                <img
                  v-if="item.imageUrl"
                  :src="item.imageUrl"
                  :alt="item.title"
                  draggable="false"
                />
              </div>
              <!-- Reserve the pile footprint so the last thumb sits on its top edge -->
              <div class="stack__column-foot" aria-hidden="true" />
            </div>
          </div>

          <!-- Outside column v-if so leave fade can finish after restack -->
          <Transition name="stack-column-close">
            <button
              v-if="showColumnClose(board.id)"
              type="button"
              class="stack__column-close"
              aria-label="Restack selection"
              :style="columnCloseStyle(board.id)"
              @click.stop="restackBoard(board.id)"
            >
              <div class="stack__column-close-icon" aria-hidden="true">
                <div class="stack__column-close-bar" />
                <div class="stack__column-close-bar" />
              </div>
            </button>
          </Transition>
        </div>

        <button
          v-if="showCreateSlot"
          ref="createSlotRef"
          type="button"
          class="stack__create"
          :class="{
            'stack__create--visible': createPlusVisible,
            'stack__create--ready': createPlusReady,
          }"
          aria-label="Create new selection"
          @click="onCreateSelection"
        >
          <span class="stack__create-plus" aria-hidden="true">
            <span class="stack__create-plus-icon">
              <span class="stack__create-plus-bar" />
              <span class="stack__create-plus-bar" />
            </span>
          </span>
        </button>
      </div>

      <!-- Cart stage — stays mounted under the composer so cream is already waiting -->
      <div
        v-if="stagePresent"
        class="stack__stage"
        :class="{
          'stack__stage--visible': stageVisible,
          'stack__stage--under-composer':
            isMoodboard && stageVisible && !boardsCartRevealing,
        }"
        role="dialog"
        aria-modal="true"
        :aria-hidden="isMoodboard ? 'true' : undefined"
        :aria-label="panelTab === 'boards' ? 'Boards' : 'My selection'"
      >
        <div class="stack__backdrop" @click="requestClose" />

        <!-- Cell shells always stay in flow (squares). Only .stack__cell-media Flips. -->
        <div
          v-if="showSelectionGrid"
          ref="gridRef"
          class="stack__grid"
          :class="{
            'stack__grid--lines': gridLinesVisible,
            'stack__grid--pdp-focus': !!pdpFocusItemId,
          }"
          :style="gridStyle"
          data-lenis-prevent
        >
          <div
            v-for="(entry, index) in selectionEntries"
            :key="entry.kind === 'undo' ? `undo-${entry.key}` : entry.item.id"
            class="stack__cell"
            :class="cellClass(entry)"
            :style="softEnter ? softEnterStyle(index) : undefined"
          >
            <div
              v-if="entry.kind === 'undo'"
              class="stack__cell-media stack__cell-media--undo"
            >
              <div class="stack__cell-frame">
                <button
                  type="button"
                  class="stack__undo interface"
                  @click="onUndoClick(entry.key, entry.item)"
                >
                  Undo
                </button>
              </div>
            </div>
            <div
              v-else
              class="stack__cell-media"
              :data-stack-id="entry.item.id"
              :data-flip-id="flipSurface === 'cells' ? entry.item.id : undefined"
            >
              <div class="stack__cell-frame">
                <div class="stack__cell-figure">
                  <button
                    type="button"
                    class="stack__cell-hit"
                    :aria-label="`Open ${entry.item.title}`"
                    @click="openProduct(entry.item, $event)"
                  >
                    <img
                      v-if="entry.item.imageUrl"
                      :src="entry.item.imageUrl"
                      :alt="entry.item.title"
                      class="stack__cell-image"
                    />
                  </button>
                  <AddButton
                    v-if="galleryCount(entry.item) > 1"
                    class="stack__cell-ctrl stack__cell-ctrl--clone"
                    variant="clone"
                    :label="`Clone ${entry.item.title}`"
                    @click.stop="cloneItem(entry.item.id)"
                  />
                  <AddButton
                    class="stack__cell-ctrl stack__cell-ctrl--remove"
                    variant="remove"
                    :label="`Remove ${entry.item.title}`"
                    @click.stop="onRemoveClick(entry.item)"
                  />
                  <ImageCycleArrows
                    v-if="galleryCount(entry.item) > 1"
                    class="stack__cell-ctrl stack__cell-ctrl--cycle"
                    :index="galleryIndex(entry.item)"
                    :count="galleryCount(entry.item)"
                    hide-count
                    boxed
                    @prev="cycleItemImage(entry.item.id, -1)"
                    @next="cycleItemImage(entry.item.id, 1)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Boards cart — same square grid; boards span 1×1 (<1000) or 3×2 (≥1000 / 6-col) -->
        <div
          v-if="showBoardsGrid"
          ref="gridRef"
          class="stack__grid stack__grid--boards"
          :class="{ 'stack__grid--lines': gridLinesVisible }"
          :style="gridStyle"
          data-lenis-prevent
        >
          <div
            v-for="(entry, index) in boardsGridEntries"
            :key="entry.kind === 'undo' ? `undo-${entry.key}` : entry.board.id"
            class="stack__cell stack__cell--board"
            :class="[
              boardCellClass(entry),
              {
                'stack__cell--board-landing':
                  entry.kind === 'board' &&
                  entry.board.id === landingBoardId,
              },
            ]"
            :style="[
              boardCellStyle,
              softEnter ? softEnterStyle(index) : undefined,
            ]"
          >
            <div
              v-if="entry.kind === 'undo'"
              class="stack__cell-media stack__cell-media--undo"
            >
              <div class="stack__cell-frame stack__cell-frame--board">
                <button
                  type="button"
                  class="stack__undo interface"
                  @click="onUndoBoardClick(entry.key, entry.board)"
                >
                  Undo
                </button>
              </div>
            </div>
            <div
              v-else
              class="stack__cell-media"
              :data-stack-id="boardFlipId(entry.board.id)"
              :data-flip-id="
                flipSurface === 'cells'
                  ? boardFlipId(entry.board.id)
                  : undefined
              "
            >
              <div class="stack__cell-frame stack__cell-frame--board">
                <div
                  class="stack__cell-figure stack__cell-figure--board"
                  :class="{
                    'stack__cell-figure--board-empty':
                      !entry.board.placements.length &&
                      !entry.board.strokes.length,
                  }"
                  :style="{
                    '--board-aspect': entry.board.previewAspect || 16 / 9,
                  }"
                >
                  <button
                    type="button"
                    class="stack__board-hit"
                    :aria-label="`Open ${entry.board.name}`"
                    @click="openSavedBoard(entry.board.id)"
                  >
                    <img
                      v-if="entry.board.preview"
                      :src="entry.board.preview"
                      :alt="`${entry.board.name} preview`"
                      class="stack__board-preview"
                    />
                    <span v-else class="stack__board-placeholder interface"
                      >Empty board</span
                    >
                  </button>
                  <div class="stack__board-actions" aria-label="Board actions">
                    <button
                      type="button"
                      class="stack__board-action"
                      :aria-label="`Edit ${entry.board.name}`"
                      @click.stop="openSavedBoard(entry.board.id)"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.6"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M12 20h9" />
                        <path
                          d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="stack__board-action"
                      :aria-label="`Delete ${entry.board.name}`"
                      @click.stop="onRemoveBoardClick(entry.board)"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.6"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path
                          d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
                        />
                        <path d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="stack__board-action"
                      :aria-label="`Send ${entry.board.name} as enquiry`"
                      @click.stop="sendBoardEnquiry(entry.board)"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.6"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M22 2 11 13" />
                        <path d="M22 2 15 22l-4-9-9-4Z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!--
        Teleport to body so toolbox isn’t trapped under the boards rail sibling
        (.stack stacking context can’t outrank Flip flyers at z-index 290).
      -->
      <Teleport to="body">
      <aside
        class="stack__controls"
        :class="{ 'stack__controls--visible': controlsVisible }"
        :aria-label="panelTab === 'boards' ? 'Board actions' : 'Selection actions'"
      >
        <template v-if="panelTab === 'boards'">
          <div class="stack__controls-head">
            <p class="stack__title">Boards</p>
            <button
              type="button"
              class="stack__close"
              aria-label="Close boards"
              @click="requestClose"
            >
              <span class="stack__close-icon" aria-hidden="true" />
            </button>
          </div>
          <p class="stack__count interface">{{ boardsCountLabel }}</p>
          <button type="button" class="btn btn--filled" @click="onCreateBoardInCart">
            Create Board
          </button>
        </template>
        <template v-else>
          <div class="stack__controls-head">
            <p
              ref="titleInput"
              class="stack__title"
              :contenteditable="isEditing"
              :role="isEditing ? 'textbox' : undefined"
              :aria-label="isEditing ? 'Selection name' : undefined"
              @keydown.enter.prevent="saveName"
              @keydown.esc.prevent="cancelEdit"
              @blur="saveName"
            >
              {{ activeMoodboard?.name || 'My Selection' }}
            </p>
            <button
              type="button"
              class="stack__close"
              aria-label="Close selection"
              @click="requestClose"
            >
              <span class="stack__close-icon" aria-hidden="true" />
            </button>
          </div>

          <p class="stack__count interface">
            {{ countLabel }}
          </p>

          <div class="stack__control-links">
            <button type="button" class="stack__link interface" @click="startEdit">
              Rename
            </button>
            <button
              v-if="activePendingRemovals.length && !items.length"
              type="button"
              class="stack__link interface"
              :disabled="bulkBusy"
              @click="onUndoAll"
            >
              Undo
            </button>
            <button
              type="button"
              class="stack__link interface"
              :disabled="bulkBusy"
              @click="confirmingDelete = true"
            >
              Delete selection
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
        </template>
      </aside>

      <div
        v-if="confirmingDelete"
        class="stack__confirm"
        role="dialog"
        aria-modal="true"
        aria-label="Delete selection"
      >
        <div class="stack__confirm-box">
          <p class="stack__confirm-title interface">Delete this selection?</p>
          <p class="stack__confirm-text">
            “{{ activeMoodboard?.name || 'My Selection' }}” and its
            {{ items.length }}
            {{ items.length === 1 ? 'item' : 'items' }}
            will be permanently removed.
          </p>
          <div class="stack__confirm-actions">
            <button type="button" class="btn" @click="confirmingDelete = false">
              Cancel
            </button>
            <button type="button" class="btn btn--filled" @click="onDeleteSelection">
              Delete
            </button>
          </div>
        </div>
      </div>
      </Teleport>
    </div>

    <!--
      Sibling of .stack (not inside it) so PDP (320) can cover boards while the
      selection rail still rises above the overlay for fly-to-stack.
    -->
    <div
      v-if="showBoardsRail && boardsPileCards.length"
      class="stack__boards-rail"
      :class="{
        'stack__boards-rail--cart': stagePresent && panelTab === 'boards',
        'stack__boards-rail--flipping':
          isFlipping && stagePresent && panelTab === 'boards',
        'stack__boards-rail--cells-ready':
          cellsReady && stagePresent && panelTab === 'boards',
      }"
      :style="stackCssVars"
    >
      <div class="stack__pile-wrap stack__pile-wrap--board">
        <button
          ref="boardsPileRef"
          type="button"
          class="stack__pile stack__pile--board"
          :class="{ 'stack__pile--fanned': boardsPileFanned }"
          :aria-label="`Open boards, ${boardsPileCards.length}`"
          @click="onBoardsPileClick"
          @mouseenter="onBoardsPileEnter"
          @mouseleave="onBoardsPileLeave"
        >
          <span
            v-for="board in boardsPileCards"
            :key="board.id"
            class="stack__pile-card stack__pile-card--fan stack__pile-card--board"
            :data-flip-id="
              flipSurface === 'pile' ? boardFlipId(board.id) : undefined
            "
            :style="boardStackCardStyle(board.id)"
          >
            <span
              class="stack__pile-board-face"
              :class="{ 'stack__pile-board-face--empty': !board.preview }"
              :style="{
                '--board-aspect':
                  board.previewAspect && board.previewAspect > 0
                    ? board.previewAspect
                    : 16 / 9,
              }"
            >
              <img
                v-if="board.preview"
                :src="board.preview"
                :alt="`${board.name} preview`"
                class="stack__pile-image stack__pile-image--board"
                draggable="false"
              />
            </span>
          </span>
        </button>
        <p
          class="stack__boards-label "
          :class="{ 'stack__boards-label--visible': showBoardsLabel }"
          aria-hidden="true"
        >
          My Boards
        </p>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import type { BucketItem, SelectionEntry } from '~/composables/useBucket'
import { productIdFromBucketId } from '~/composables/useBucket'
import type { SavedBoard, SelectionBoardEntry } from '~/composables/useBoards'
import { uniqueImageUrls } from '~/composables/productImages'
import { imageAssetKey, prefetchImage } from '~/composables/useSanityImage'

type CellPhase = 'scale-out' | 'scale-in' | 'scaled-in' | 'undo-ready' | 'undo-leaving'

const {
  items,
  moodboards,
  selectionEntries,
  activePendingRemovals,
  count,
  isOpen,
  panelTab,
  isMoodboard,
  activeMoodboard,
  activeMoodboardId,
  dismissDrawer,
  registerAnimatedClose,
  registerAnimatedOpen,
  registerSelectionStackHover,
  openDrawer,
  openMoodboard,
  createMoodboard,
  deleteMoodboard,
  setActiveMoodboard,
  renameMoodboard,
  removeItem,
  undoRemove,
  undoAllRemovals,
  clearPendingRemovals,
  cloneItem,
  cycleItemImage,
  setItemImageIndex,
  pendingFly,
  consumePendingFly,
  parkSelectionItem,
  restoreParkedSelectionItem,
  parkedSelectionItems,
  addItemToMoodboard,
  moodboardSurfaceReady,
  registerMoodboardRestack,
  registerMoodboardReturnToColumn,
  registerMoodboardCloseReturn,
  registerMoodboardCloseToBoards,
  registerMoodboardStackExit,
  requestMoodboardStagedReveal,
  requestMoodboardChromeEnter,
  consumeMoodboardEnterSelection,
} = useBucket()
const { reset: resetMoodboard, addImage, loadBoard } = useMoodboard()
const {
  createBoard,
  boards,
  boardsCartEntries,
  clearPendingBoardRemovals,
  deleteBoardsForSelection,
  softRemoveBoard,
  undoBoardRemove,
  setActiveBoard,
  activeBoardId,
} = useBoards()
const { openFromBucket, openFromMoodboard } = useEnquiryForm()
const {
  open,
  returnImage,
  isOpen: productOverlayOpen,
  beginFlipOpenGate,
  releaseFlipOpenGate,
} = useProductOverlay()
const { fetchProduct } = useProductCatalog()

const gridRef = ref<HTMLElement | null>(null)
/** Active board pile — used for Flip / fly-to landing */
const pileRef = ref<HTMLElement | null>(null)
const pileEls = ref<Record<string, HTMLElement | null>>({})
const pileWrapEls = ref<Record<string, HTMLElement | null>>({})
const columnEls = ref<Record<string, HTMLElement | null>>({})
const createSlotRef = ref<HTMLElement | null>(null)
const railHot = ref(false)
/** Fixed column geometry keyed by board id (viewport coords). */
const columnLayouts = ref<
  Record<string, { left: number; width: number; top: number; height: number }>
>({})
/** Column mounted but thumbs hidden until flyers are placed. */
const preparingBoardId = ref<string | null>(null)
const pileFannedId = ref<string | null>(null)
const expandedBoardIds = ref<string[]>([])
/** Column thumb id reserved (hidden) while a board item Flips back in. */
const columnReturningId = ref<string | null>(null)
const titleInput = ref<HTMLElement | null>(null)
const isEditing = ref(false)
const pileAnchor = ref<DOMRect | null>(null)
/** Item ids mid fly-in — hidden from the pile until the flyer lands. */
const arrivingIds = ref<string[]>([])
const isFlipping = ref(false)
/** Stage DOM mounted (grid stays until fade-out finishes). */
const stagePresent = ref(false)
/** CSS fade class — toggled after mount / before unmount so opacity can transition. */
const stageVisible = ref(false)
/** Boards cart painted under composer cream — stack sits below moodboard z-index. */
const boardsCartRevealing = ref(false)
/** Board cells start hidden; active board lands via Flip, then peers fade in. */
const boardsGridIntro = ref(false)
const boardsLanded = ref(false)
/** Instant opacity (close mount / flyer handoff) vs animated fade (open outro). */
const boardsGridHandoff = ref(false)
const landingBoardId = ref<string | null>(null)
/** Selection rail fading / sliding out before boards cart reveal. */
const railExiting = ref(false)
/** Boards → Board: keep selection as a pile (no auto column open). */
const skipMoodboardAutoDisperse = ref(false)
/** Grid borders — shown only after items land (open), hidden before they leave (close). */
const gridLinesVisible = ref(false)
/** Controls fade independently — out earlier than the backdrop on close. */
const controlsVisible = ref(false)
/** Which surface currently owns data-flip-id (never both). */
const flipSurface = ref<'pile' | 'cells'>('pile')
/** Keep pile mounted during open Flip so cards can fly free (not clipped by cells). */
const keepPileForFlip = ref(false)
/** Hover fan — locked through open so Flip.fit starts from fanned positions. */
const pileFanned = ref(false)
/** Tip / count visibility — hides on open click, returns with close backdrop. */
const pileCountVisible = ref(true)
/** Square track size from grid width / cols — keeps cells square without overlap. */
const cellSizePx = ref(0)
/** Cell images ready (after Flip or soft-enter). Hidden during backdrop-only phase. */
const cellsReady = ref(false)
/** CSS cell fade — only for non-Flip opens (e.g. header). Avoids post-Flip flash. */
const softEnter = ref(false)
/** Per-cell remove/undo animation phase (keyed by item id or undo key). */
const cellPhase = ref<Record<string, CellPhase>>({})
const confirmingDelete = ref(false)

const BACKDROP_OPEN_MS = 350
const BACKDROP_CLOSE_MS = 800
const GRID_LINES_MS = 320
const CONTROLS_FADE_IN_DELAY_MS = 400
const CONTROLS_FADE_OUT_DELAY_MS = 100
/** Cart → PDP: fade other items / grid / info before flyer moves */
const PDP_CART_FADE_MS = 300
const pdpFocusItemId = ref<string | null>(null)
const FLIP_DURATION = 0.95
const FLIP_STAGGER = 0.075
const CELL_SCALE_MS = 280
const UNDO_FADE_MS = 220
/** Pause after scale-out before Undo appears */
const UNDO_ENTER_DELAY_MS = 350
/** Fixed column count — cell = pile = 1/6 viewport width, square */
/** Cart grid columns by viewport (selections). */
const stackColsForWidth = (width: number) => {
  if (width >= 1600) return 6
  if (width >= 1440) return 5
  if (width >= 1200) return 4
  if (width >= 660) return 3
  return 2
}

/** Boards cart: 1-col mobile, 6-col from 1000px (boards span 3×2). */
const boardsGridColsForWidth = (width: number) => (width >= 1000 ? 6 : 1)

const stackCols = ref(6)

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const waitFrames = (n = 2) =>
  new Promise<void>((resolve) => {
    const step = (left: number) => {
      if (left <= 0) {
        resolve()
        return
      }
      requestAnimationFrame(() => step(left - 1))
    }
    step(n)
  })

const setCellPhase = (key: string, phase: CellPhase) => {
  cellPhase.value = { ...cellPhase.value, [key]: phase }
}

const clearCellPhase = (key: string) => {
  const { [key]: _, ...rest } = cellPhase.value
  cellPhase.value = rest
}

const clearAllCellPhases = () => {
  cellPhase.value = {}
}

const cellClass = (entry: SelectionEntry) => {
  if (entry.kind === 'undo') {
    const phase = cellPhase.value[entry.key]
    return {
      'stack__cell--undo': true,
      'stack__cell--undo-ready': phase === 'undo-ready',
      'stack__cell--undo-leaving': phase === 'undo-leaving',
    }
  }
  const phase = cellPhase.value[entry.item.id]
  return {
    'stack__cell--scale-out': phase === 'scale-out',
    'stack__cell--scale-in': phase === 'scale-in',
    'stack__cell--scaled-in': phase === 'scaled-in',
    'stack__cell--pdp-focus': pdpFocusItemId.value === entry.item.id,
  }
}

const bulkBusy = ref(false)

const countLabel = computed(() => {
  const n = count.value
  return `${n} ${n === 1 ? 'item' : 'items'} in this selection`
})

const onRemoveClick = async (item: BucketItem) => {
  const id = item.id
  if (cellPhase.value[id] || !activeMoodboardId.value || bulkBusy.value) return
  const undoKey = `${activeMoodboardId.value}::${id}`
  setCellPhase(id, 'scale-out')
  await wait(CELL_SCALE_MS)
  if (cellPhase.value[id] !== 'scale-out') return
  removeItem(id)
  clearCellPhase(id)
  await nextTick()
  await waitFrames(2)
  if (!selectionEntries.value.some((e) => e.kind === 'undo' && e.key === undoKey)) return
  await wait(UNDO_ENTER_DELAY_MS)
  if (!selectionEntries.value.some((e) => e.kind === 'undo' && e.key === undoKey)) return
  setCellPhase(undoKey, 'undo-ready')
}

const onUndoClick = async (key: string, item: BucketItem) => {
  const phase = cellPhase.value[key]
  if (
    bulkBusy.value ||
    phase === 'undo-leaving' ||
    phase === 'scale-in' ||
    phase === 'scaled-in'
  ) {
    return
  }
  setCellPhase(key, 'undo-leaving')
  await wait(UNDO_FADE_MS)
  if (cellPhase.value[key] !== 'undo-leaving') return
  undoRemove(key)
  clearCellPhase(key)
  const id = item.id
  setCellPhase(id, 'scale-in')
  await nextTick()
  await waitFrames(2)
  if (cellPhase.value[id] !== 'scale-in') return
  setCellPhase(id, 'scaled-in')
  await wait(CELL_SCALE_MS)
  if (cellPhase.value[id] === 'scaled-in') clearCellPhase(id)
}

const onDeleteSelection = async () => {
  const id = activeMoodboardId.value
  if (!id || bulkBusy.value) return
  confirmingDelete.value = false
  bulkBusy.value = true
  try {
    // Drop undo slots immediately — no undo after deleting the selection
    clearPendingRemovals(id)
    controlsVisible.value = false
    await nextTick()

    // Zoom every item out (same scale-out as remove, without undo)
    const itemIds = items.value.map((item) => item.id)
    for (const itemId of itemIds) setCellPhase(itemId, 'scale-out')
    if (itemIds.length) await wait(CELL_SCALE_MS)

    // Grid + cream backdrop out, then leave the page (don’t open the next selection)
    await fadeGridLinesOut()
    cellsReady.value = false
    await fadeOutStage()
    clearAllCellPhases()

    deleteBoardsForSelection(id)
    railOrderIds.value = railOrderIds.value.filter((entry) => entry !== id)
    expandedBoardIds.value = expandedBoardIds.value.filter((entry) => entry !== id)
    deleteMoodboard(id)
    dismissDrawer()
    await nextTick()
    pileRef.value = pileEls.value[activeMoodboardId.value || ''] || null
    syncRailOrder(true)
    parkInactiveRailBelow()
  } finally {
    bulkBusy.value = false
  }
}

const onUndoAll = async () => {
  if (bulkBusy.value || !activePendingRemovals.value.length) return
  bulkBusy.value = true
  const pendings = activePendingRemovals.value.slice()
  for (const pending of pendings) setCellPhase(pending.key, 'undo-leaving')
  await wait(UNDO_FADE_MS)
  const restoreIds = pendings.map((p) => p.item.id)
  for (const pending of pendings) clearCellPhase(pending.key)
  undoAllRemovals()
  await nextTick()
  for (const id of restoreIds) setCellPhase(id, 'scale-in')
  await waitFrames(2)
  for (const id of restoreIds) setCellPhase(id, 'scaled-in')
  await wait(CELL_SCALE_MS)
  for (const id of restoreIds) {
    if (cellPhase.value[id] === 'scaled-in') clearCellPhase(id)
  }
  bulkBusy.value = false
}

const settledItems = computed(() => {
  // Keep arriving cards in the salt/list so under-card poses don't reshuffle on land.
  // Visibility is handled by .stack__pile-card--arriving (opacity 0).
  const hide = new Set<string>()
  if (pendingFly.value?.itemId) hide.add(pendingFly.value.itemId)
  return items.value.filter((item) => !hide.has(item.id))
})

type StackPileCard = {
  id: string
  imageUrl: string
  title: string
  kind: 'item'
}

/** Pile cards for a selection — products only (boards live in the boards rail). */
const stackPileCards = (selection: { id: string; items: typeof items.value }) => {
  const hide = new Set<string>()
  if (pendingFly.value?.itemId && selection.id === activeMoodboardId.value) {
    hide.add(pendingFly.value.itemId)
  }
  return selection.items
    .filter((item) => !hide.has(item.id))
    .map((item) => ({
      id: item.id,
      imageUrl: item.imageUrl,
      title: item.title,
      kind: 'item' as const,
    }))
    .reverse()
}

/** Kept for restack pose math (items only). */
const boardPilePreview = (board: { id: string; items: typeof items.value }) => {
  const hide = new Set<string>()
  if (pendingFly.value?.itemId && board.id === activeMoodboardId.value) {
    hide.add(pendingFly.value.itemId)
  }
  return board.items.filter((item) => !hide.has(item.id)).slice().reverse()
}

/**
 * Top of pile → top of column (newest first). board.items is prepended on add.
 */
const boardColumnItems = (board: { id: string; items: typeof items.value }) => {
  const hide = new Set(arrivingIds.value)
  if (pendingFly.value?.itemId && board.id === activeMoodboardId.value) {
    hide.add(pendingFly.value.itemId)
  }
  return board.items.filter((item) => !hide.has(item.id))
}

const showRail = computed(
  () =>
    !boardsCartRevealing.value &&
    (keepPileForFlip.value ||
      isMoodboard.value ||
      (!isOpen.value &&
        !stagePresent.value &&
        (moodboards.value.some((b) => b.items.length > 0) ||
          arrivingIds.value.length > 0))),
)

/** New-selection “+” — cart only, never inside the board composer. */
const showCreateSlot = computed(() => showRail.value && !isMoodboard.value)

/** Tips when more than one visible selection is on the rail. */
const showSelectionTips = computed(() => railBoards.value.length > 1)

/**
 * Stable rail display order. Active is first at rest; only re-synced after
 * collapse so selecting another stack can animate into the corner first.
 */
const railOrderIds = ref<string[]>([])

const syncRailOrder = (preferActiveFirst = true) => {
  const source = isMoodboard.value
    ? moodboards.value.filter((board) => board.items.length > 0)
    : moodboards.value
  if (!source.length) {
    railOrderIds.value = []
    return
  }
  if (source.length === 1 || !preferActiveFirst) {
    railOrderIds.value = source.map((board) => board.id)
    return
  }
  const activeId = activeMoodboardId.value
  const active = source.find((board) => board.id === activeId) || source[0]!
  const rest = source.filter((board) => board.id !== active.id).map((board) => board.id)
  const prevRest = railOrderIds.value.filter((id) => id !== active.id && rest.includes(id))
  const missing = rest.filter((id) => !prevRest.includes(id))
  railOrderIds.value = [active.id, ...prevRest, ...missing]
}

/**
 * Rail list. In the board composer: non-empty selections only (no empties).
 * Otherwise: full selection list for the cart rail.
 */
const railBoards = computed(() => {
  const source = isMoodboard.value
    ? moodboards.value.filter((board) => board.items.length > 0)
    : moodboards.value
  const byId = new Map(source.map((board) => [board.id, board]))
  if (!railOrderIds.value.length) {
    const activeId = activeMoodboardId.value
    const active = source.find((board) => board.id === activeId) || source[0]
    if (!active) return []
    return [active, ...source.filter((board) => board.id !== active.id)]
  }
  const ordered = railOrderIds.value
    .map((id) => byId.get(id))
    .filter((board): board is (typeof moodboards.value)[number] => !!board)
  for (const board of source) {
    if (!ordered.some((entry) => entry.id === board.id)) ordered.push(board)
  }
  return ordered
})

/** Multi-selection hover reveal — other stacks rise from below. */
const railExpanded = ref(false)
const createPlusReady = ref(false)
let railAnimToken = 0

const createPlusVisible = computed(() => {
  if (moodboards.value.length <= 1) return railHot.value
  return createPlusReady.value
})

const railCellSize = () => {
  const active = pileWrapEls.value[activeMoodboardId.value || '']
  return active?.offsetWidth || 0
}

const parkInactiveRailBelow = () => {
  if (!import.meta.client || railBoards.value.length <= 1) return
  const activeId = activeMoodboardId.value
  for (const board of railBoards.value) {
    if (board.id === activeId) continue
    const el = pileWrapEls.value[board.id]
    if (!el) continue
    gsap.killTweensOf(el)
    gsap.set(el, {
      yPercent: 110,
      width: 0,
      minWidth: 0,
      paddingLeft: 0,
      paddingRight: 0,
      overflow: 'visible',
    })
  }
  const create = createSlotRef.value
  if (create) {
    gsap.killTweensOf(create)
    gsap.set(create, { xPercent: -100, opacity: 0, width: 0, paddingLeft: 0 })
  }
  createPlusReady.value = false
}

const expandRail = async () => {
  if (!import.meta.client) return
  if (railBoards.value.length <= 1 || railExpanded.value) return
  if (isOpen.value || stagePresent.value || isFlipping.value) return
  const token = ++railAnimToken
  railExpanded.value = true
  railHot.value = true
  createPlusReady.value = false

  const activeId = activeMoodboardId.value
  const rising = railBoards.value
    .filter((board) => board.id !== activeId)
    .map((board) => pileWrapEls.value[board.id])
    .filter((el): el is HTMLElement => !!el)

  const cell = railCellSize() || rising[0]?.scrollWidth || 120
  const riseStagger = 0.05
  const riseDuration = 0.4

  for (const el of rising) {
    gsap.killTweensOf(el)
    gsap.set(el, {
      width: cell,
      minWidth: cell,
      overflow: 'visible',
      pointerEvents: 'auto',
      yPercent: 110,
    })
  }

  if (rising.length) {
    await new Promise<void>((resolve) => {
      gsap.to(rising, {
        yPercent: 0,
        duration: riseDuration,
        ease: 'power3.out',
        stagger: riseStagger,
        overwrite: true,
        onComplete: () => resolve(),
      })
    })
  }

  if (token !== railAnimToken) return
  // No (+) inside the board composer
  if (isMoodboard.value) {
    createPlusReady.value = false
    return
  }
  const create = createSlotRef.value
  if (create) {
    gsap.killTweensOf(create)
    gsap.set(create, { width: '2.5rem', paddingLeft: 20, overflow: 'visible' })
    createPlusReady.value = true
    await new Promise<void>((resolve) => {
      gsap.fromTo(
        create,
        { xPercent: -100, opacity: 0 },
        {
          xPercent: 0,
          opacity: 1,
          duration: 0.22,
          ease: 'power3.out',
          overwrite: true,
          onComplete: () => resolve(),
        },
      )
    })
  } else {
    createPlusReady.value = true
  }
}

const railCollapsing = ref(false)
/** Shared so a second collapseRail (click vs mouseleave) awaits the same drop. */
let collapseRailPromise: Promise<void> | null = null

const collapseRail = async () => {
  if (!import.meta.client) return
  // Click + mouseleave were both starting a drop (second call reset y → 0 then fell again)
  if (collapseRailPromise) {
    await collapseRailPromise
    return
  }
  if (railBoards.value.length <= 1) {
    railExpanded.value = false
    createPlusReady.value = false
    return
  }
  if (!railExpanded.value && !createPlusReady.value) {
    parkInactiveRailBelow()
    return
  }

  railCollapsing.value = true
  clearRailLeaveTimer()
  railHoldOpen.value = true

  collapseRailPromise = (async () => {
  const token = ++railAnimToken
  const keepId = activeMoodboardId.value
  const create = createSlotRef.value
  const keepEl = keepId ? pileWrapEls.value[keepId] : null
  const fromLeft = keepEl?.getBoundingClientRect().left ?? 0

  const dropping = railBoards.value
    .filter((board) => board.id !== keepId)
    .map((board) => pileWrapEls.value[board.id])
    .filter((el): el is HTMLElement => !!el)

  const dropDuration = 0.34
  createPlusReady.value = false
  // Mark collapsed immediately so leave/click can’t re-enter the drop
  railExpanded.value = false

  try {
    // Fade (+) only — keep its width until after the drop so the row doesn’t hitch
    if (create) {
      gsap.killTweensOf(create)
      gsap.to(create, {
        xPercent: -100,
        opacity: 0,
        duration: 0.16,
        ease: 'power3.in',
        overwrite: true,
      })
    }

    // All non-active stacks ease down together (don’t reset y first — that caused a double drop)
    if (dropping.length) {
      for (const el of dropping) gsap.killTweensOf(el)
      await new Promise<void>((resolve) => {
        gsap.to(dropping, {
          yPercent: 110,
          duration: dropDuration,
          ease: 'power2.inOut',
          stagger: 0,
          overwrite: true,
          onComplete: () => resolve(),
        })
      })
    }

    if (token !== railAnimToken) return

    if (create) gsap.set(create, { width: 0, paddingLeft: 0 })
    for (const el of dropping) gsap.set(el, { width: 0, minWidth: 0 })

    syncRailOrder(true)
    await nextTick()
    await waitFrames(1)

    if (keepEl && document.contains(keepEl)) {
      const toLeft = keepEl.getBoundingClientRect().left
      const dx = fromLeft - toLeft
      if (Math.abs(dx) > 0.5) {
        await new Promise<void>((resolve) => {
          gsap.fromTo(
            keepEl,
            { x: dx },
            {
              x: 0,
              duration: 0.55,
              ease: 'power2.out',
              overwrite: true,
              onComplete: () => resolve(),
            },
          )
        })
      }
      // Drop leftover GSAP transforms so later layout syncs read the true box
      gsap.set(keepEl, { clearProps: 'transform,x,y,xPercent,yPercent' })
    }
    parkInactiveRailBelow()
  } finally {
    railCollapsing.value = false
    window.setTimeout(() => {
      railHoldOpen.value = false
    }, 180)
  }
  })()

  try {
    await collapseRailPromise
  } finally {
    collapseRailPromise = null
  }
}

const setPileRef = (id: string, el: unknown) => {
  const html = el instanceof HTMLElement ? el : null
  pileEls.value[id] = html
  if (id === activeMoodboardId.value) pileRef.value = html
}

const setPileWrapRef = (id: string, el: unknown) => {
  pileWrapEls.value[id] = el instanceof HTMLElement ? el : null
}

const setColumnRef = (id: string, el: unknown) => {
  columnEls.value[id] = el instanceof HTMLElement ? el : null
}

const inactiveRailEls = () => {
  const activeId = activeMoodboardId.value
  const els: HTMLElement[] = []
  for (const board of moodboards.value) {
    if (board.id === activeId) continue
    const el = pileWrapEls.value[board.id]
    if (el) els.push(el)
  }
  if (createSlotRef.value) els.push(createSlotRef.value)
  return els
}

/** Other piles drop out of view while the backdrop fades in. */
const shelveInactiveRail = () => {
  if (!import.meta.client) return
  railExpanded.value = false
  createPlusReady.value = false
  const duration = BACKDROP_OPEN_MS / 1000
  for (const el of inactiveRailEls()) {
    gsap.killTweensOf(el)
    gsap.to(el, {
      yPercent: 110,
      duration,
      ease: 'power3.in',
      overwrite: true,
      onComplete: () => {
        // Collapse width after the drop so they don’t sit in the rail
        if (el === createSlotRef.value) {
          gsap.set(el, { width: 0, paddingLeft: 0, opacity: 0, xPercent: -100 })
        } else {
          gsap.set(el, { width: 0, minWidth: 0 })
        }
      },
    })
  }
}

/** Park inactive piles off-screen instantly (rail remount mid-close). */
const parkInactiveRail = () => {
  railExpanded.value = false
  createPlusReady.value = false
  parkInactiveRailBelow()
}

/** After cart close, park inactive stacks below again (collapsed multi-rail). */
const unshelveInactiveRail = () => {
  if (!import.meta.client) return
  railExpanded.value = false
  createPlusReady.value = false
  resetShelvedRail()
  parkInactiveRailBelow()
}

const resetShelvedRail = () => {
  if (!import.meta.client) return
  for (const board of moodboards.value) {
    const el = pileWrapEls.value[board.id]
    if (!el) continue
    gsap.killTweensOf(el)
    gsap.set(el, { clearProps: 'transform,width,minWidth,padding,overflow,opacity' })
  }
  const create = createSlotRef.value
  if (!create) return
  gsap.killTweensOf(create)
  gsap.set(create, { clearProps: 'transform,width,padding,opacity' })
}

/** True while creating a slot so (+) animations don’t trip rail mouseleave → collapse. */
const railHoldOpen = ref(false)
let railLeaveTimer: ReturnType<typeof setTimeout> | null = null

const clearRailLeaveTimer = () => {
  if (railLeaveTimer) {
    clearTimeout(railLeaveTimer)
    railLeaveTimer = null
  }
}

const onRailEnter = () => {
  clearRailLeaveTimer()
  railHot.value = true
}

const onRailLeave = () => {
  railHot.value = false
  if (!isFlipping.value && !keepPileForFlip.value) {
    pileFannedId.value = null
    pileFanned.value = false
  }
  if (!isOpen.value && !stagePresent.value) {
    pileTipLocked.value = false
  }
  if (railHoldOpen.value) return
  if (moodboards.value.length > 1 && railExpanded.value) {
    // Delay so brief leave while clicking / animating (+) doesn’t collapse
    clearRailLeaveTimer()
    railLeaveTimer = setTimeout(() => {
      railLeaveTimer = null
      if (railHoldOpen.value || railHot.value) return
      if (moodboards.value.length > 1 && railExpanded.value) {
        void collapseRail()
      }
    }, 160)
  }
}

/** Keep (+) visible/interactive while a new empty slot rises into the rail. */
const keepCreatePlusOut = () => {
  createPlusReady.value = true
  const create = createSlotRef.value
  if (!create || !import.meta.client) return
  gsap.killTweensOf(create)
  gsap.set(create, {
    width: '2.5rem',
    paddingLeft: 20,
    xPercent: 0,
    opacity: 1,
    overflow: 'visible',
  })
}

/** Rise a newly created empty wrap; width opens so (+) slides right without tucking. */
const riseNewRailSlot = async (el: HTMLElement) => {
  const cell = railCellSize() || el.scrollWidth || 120
  gsap.killTweensOf(el)
  // Start collapsed + below so the first paint never flashes the full slot
  gsap.set(el, {
    width: 0,
    minWidth: 0,
    overflow: 'visible',
    pointerEvents: 'auto',
    yPercent: 110,
  })
  await new Promise<void>((resolve) => {
    gsap.to(el, {
      width: cell,
      minWidth: cell,
      yPercent: 0,
      duration: 0.4,
      ease: 'power3.out',
      overwrite: true,
      onComplete: () => resolve(),
    })
  })
  keepCreatePlusOut()
}

const onCreateSelection = async () => {
  // Keep the current active selection and leave the rail open
  railHoldOpen.value = true
  railHot.value = true
  clearRailLeaveTimer()
  const wasExpanded = railExpanded.value
  try {
    const board = createMoodboard({ open: false, activate: false })
    if (!railOrderIds.value.includes(board.id)) {
      railOrderIds.value = [...railOrderIds.value, board.id]
    }
    // Pin (+) out before await — 1→2 flips to multi-rail and would otherwise
    // drop pointer-events on (+), fire rail mouseleave, and park the new slot.
    railExpanded.value = true
    keepCreatePlusOut()
    await nextTick()

    const el = pileWrapEls.value[board.id]
    if (!el) {
      await waitFrames(2)
      const retry = pileWrapEls.value[board.id]
      if (!retry) {
        if (!wasExpanded && moodboards.value.length > 1) await expandRail()
        return
      }
      railAnimToken += 1
      await riseNewRailSlot(retry)
    } else {
      // Collapse before the browser paints the full-size wrap
      gsap.set(el, {
        width: 0,
        minWidth: 0,
        overflow: 'visible',
        pointerEvents: 'auto',
        yPercent: 110,
      })
      railAnimToken += 1
      await riseNewRailSlot(el)
    }

    // First expand from a single stack: reveal any other inactive peers
    if (!wasExpanded && moodboards.value.length > 2) {
      const cell = railCellSize() || 120
      const activeId = activeMoodboardId.value
      for (const entry of railBoards.value) {
        if (entry.id === activeId || entry.id === board.id) continue
        const wrap = pileWrapEls.value[entry.id]
        if (!wrap) continue
        gsap.killTweensOf(wrap)
        gsap.set(wrap, {
          width: cell,
          minWidth: cell,
          yPercent: 0,
          overflow: 'visible',
          pointerEvents: 'auto',
        })
      }
    }
  } finally {
    // Keep hold briefly so the pointer can settle back over the rail
    window.setTimeout(() => {
      railHoldOpen.value = false
    }, 200)
  }
}

const canRemoveEmptyStack = computed(() => moodboards.value.length > 1)

const onSelectEmptyStack = (boardId: string) => {
  const wasActive = boardId === activeMoodboardId.value
  setActiveMoodboard(boardId)
  pileRef.value = pileEls.value[boardId] || null
  if (!wasActive && moodboards.value.length > 1) {
    void collapseRail()
  }
}

const onRemoveEmptyStack = async (boardId: string) => {
  if (!canRemoveEmptyStack.value) return
  const board = moodboards.value.find((entry) => entry.id === boardId)
  if (!board || board.items.length > 0) return

  // Removing the node under the cursor fires rail mouseleave — hold open
  railHoldOpen.value = true
  clearRailLeaveTimer()
  const keepExpanded = railExpanded.value && moodboards.value.length > 2

  try {
    const el = pileWrapEls.value[boardId]
    if (el && railExpanded.value) {
      gsap.killTweensOf(el)
      // 1) Drop the empty slot down
      await new Promise<void>((resolve) => {
        gsap.to(el, {
          yPercent: 110,
          duration: 0.28,
          ease: 'power3.in',
          overwrite: true,
          onComplete: () => resolve(),
        })
      })
      // 2) Then close the gap so neighbours ease together
      await new Promise<void>((resolve) => {
        gsap.to(el, {
          width: 0,
          minWidth: 0,
          paddingLeft: 0,
          paddingRight: 0,
          duration: 0.32,
          ease: 'power2.inOut',
          overwrite: true,
          onComplete: () => resolve(),
        })
      })
    }

    expandedBoardIds.value = expandedBoardIds.value.filter((id) => id !== boardId)
    if (restackingBoardId.value === boardId) restackingBoardId.value = null
    railOrderIds.value = railOrderIds.value.filter((id) => id !== boardId)
    deleteBoardsForSelection(boardId)
    deleteMoodboard(boardId)
    await nextTick()

    // Back to a single selection — restore CSS-driven (+) hover
    if (moodboards.value.length <= 1) {
      railExpanded.value = false
      createPlusReady.value = false
      const create = createSlotRef.value
      if (create) {
        gsap.killTweensOf(create)
        gsap.set(create, { clearProps: 'transform,width,padding,opacity,xPercent' })
      }
      return
    }

    // Keep the selector open with remaining stacks still in view
    if (keepExpanded) {
      railExpanded.value = true
      const cell = railCellSize() || 120
      for (const entry of railBoards.value) {
        if (entry.id === activeMoodboardId.value) continue
        const wrap = pileWrapEls.value[entry.id]
        if (!wrap) continue
        gsap.killTweensOf(wrap)
        gsap.set(wrap, {
          width: cell,
          minWidth: cell,
          yPercent: 0,
          overflow: 'visible',
          pointerEvents: 'auto',
        })
      }
      keepCreatePlusOut()
    }
  } finally {
    window.setTimeout(() => {
      railHoldOpen.value = false
    }, 200)
  }
}

/** Same grid DOM for prelude, open, and close — stays mounted through fade-out. */
/** Flip order in the grid — product cells only. */
const gridFlipIds = computed(() =>
  selectionEntries.value
    .filter((entry): entry is Extract<SelectionEntry, { kind: 'item' }> =>
      entry.kind === 'item',
    )
    .map((entry) => entry.item.id),
)

const showSelectionGrid = computed(
  () =>
    stagePresent.value &&
    panelTab.value === 'selections' &&
    selectionEntries.value.length > 0,
)

const showBoardsGrid = computed(
  () =>
    stagePresent.value &&
    panelTab.value === 'boards' &&
    boardsGridEntries.value.length > 0,
)

/** All saved boards — global boards pile (not per-selection). */
const boardsRailList = computed(() =>
  boards.value
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
)

/** Boards cart cells — live boards + undo placeholders. */
const boardsGridEntries = computed(() => boardsCartEntries())

const boardsCountLabel = computed(() => {
  const n = boardsGridEntries.value.filter((entry) => entry.kind === 'board').length
  return `${n} ${n === 1 ? 'board' : 'boards'}`
})

/** Keep pile + grid on the same square cell size so Flip doesn’t rescale. */
const layoutLocked = ref(false)
const frozenCellSize = ref(0)
const frozenCols = ref(0)
const frozenBoardSpan = ref<{ cols: number; rows: number } | null>(null)

/** Board footprint in the square grid. */
const boardSpan = computed(() => {
  if (frozenBoardSpan.value) return frozenBoardSpan.value
  return stackCols.value >= 6 ? { cols: 3, rows: 2 } : { cols: 1, rows: 1 }
})

const boardCellStyle = computed(() => {
  const { cols, rows } = boardSpan.value
  return {
    gridColumn: `span ${cols}`,
    gridRow: `span ${rows}`,
    '--board-span-cols': String(cols),
    '--board-span-rows': String(rows),
  }
})

const boardCellClass = (entry: SelectionBoardEntry) => {
  if (entry.kind === 'undo') {
    const phase = cellPhase.value[entry.key]
    return {
      'stack__cell--undo': true,
      'stack__cell--undo-ready': phase === 'undo-ready',
      'stack__cell--undo-leaving': phase === 'undo-leaving',
    }
  }
  const phase = cellPhase.value[entry.board.id]
  return {
    'stack__cell--scale-out': phase === 'scale-out',
    'stack__cell--scale-in': phase === 'scale-in',
    'stack__cell--scaled-in': phase === 'scaled-in',
  }
}

const showBoardsRail = computed(
  () =>
    boardsRailList.value.length > 0 &&
    !isMoodboard.value &&
    // Stay mounted under selection + boards carts so close never remounts/pops
    (keepBoardsPileForFlip.value ||
      stagePresent.value ||
      !isOpen.value),
)

/** Oldest → newest so the newest board sits on top of the pile. */
const boardFlipId = (id: string) => `board:${id}`

const boardsPileCards = computed(() => boardsRailList.value.slice().reverse())

const boardsGridFlipIds = computed(() =>
  boardsGridEntries.value
    .filter((entry): entry is Extract<SelectionBoardEntry, { kind: 'board' }> =>
      entry.kind === 'board',
    )
    .map((entry) => boardFlipId(entry.board.id)),
)

const boardsPileRef = ref<HTMLElement | null>(null)
const keepBoardsPileForFlip = ref(false)
const boardsPileFanned = ref(false)

/** Props Flip.fit / Flip.from leave on pile cards (blocks CSS hover transitions). */
const BOARD_PILE_CLEAR_PROPS =
  'transform,x,y,z,rotation,scale,scaleX,scaleY,top,left,right,bottom,width,height,maxWidth,maxHeight,position,margin,zIndex,opacity,visibility,transformOrigin'

/**
 * Strip Flip leftovers without remounting (remount flashes).
 * transition:none while clearing so the snap isn’t animated, then restore CSS transitions.
 */
const sanitizeBoardsPileCards = () => {
  if (!import.meta.client) return
  const cards = boardsPileRef.value?.querySelectorAll<HTMLElement>(
    '.stack__pile-card--board',
  )
  if (!cards?.length) return
  gsap.killTweensOf(cards)
  cards.forEach((card) => {
    card.style.setProperty('transition', 'none')
  })
  gsap.set(cards, { clearProps: BOARD_PILE_CLEAR_PROPS })
  cards.forEach((card) => {
    ;[
      'transform',
      'translate',
      'rotate',
      'scale',
      'top',
      'left',
      'right',
      'bottom',
      'width',
      'height',
      'max-width',
      'max-height',
      'position',
      'margin',
      'z-index',
      'opacity',
      'visibility',
      'transform-origin',
    ].forEach((prop) => card.style.removeProperty(prop))
  })
  void boardsPileRef.value?.offsetHeight
  cards.forEach((card) => {
    card.style.removeProperty('transition')
  })
}

/** Salt so under-cards reshuffle tilt like the selection pile. */
const boardsPileSalt = computed(() =>
  boardsPileCards.value.map((entry) => entry.id).join('|'),
)

/**
 * Boards pile — same rest offset + hover fan/rotation as the selection stack.
 */
const boardStackCardStyle = (boardId: string) => {
  const cards = boardsPileCards.value
  const index = cards.findIndex((entry) => entry.id === boardId)
  const total = Math.max(cards.length, 1)
  const t = total <= 1 ? 0 : Math.max(index, 0) / (total - 1)
  const x = (t - 0.5) * 10
  const y = (0.5 - t) * 6
  const isTop = index === total - 1
  const rot = isTop
    ? hashAngle(boardId)
    : hashAngle(boardId, boardsPileSalt.value)
  const fan = pileFanOffset(boardId, Math.max(index, 0), total)
  const hoverX = fan ? x + fan.x : x
  const hoverY = fan ? y + fan.y : y
  const hoverExtra = rot === 0 ? -2 : Math.sign(rot) * 2
  const hoverRot = isTop ? rot + hoverExtra : fan ? rot + fan.r : rot
  const board = index >= 0 ? cards[index] : null
  const aspect =
    board?.previewAspect && board.previewAspect > 0 ? board.previewAspect : 16 / 9

  return {
    '--pile-x': `${x}px`,
    '--pile-y': `${y}px`,
    '--pile-r': `${rot}deg`,
    '--pile-scale': '1',
    '--pile-hover-x': `${hoverX}px`,
    '--pile-hover-y': `${hoverY}px`,
    '--pile-hover-r': `${hoverRot}deg`,
    '--pile-hover-scale': '1',
    '--board-aspect': String(aspect),
    zIndex: index + 1,
  }
}

/** Label over the boards pile — hidden while the cart is open / flipping. */
const showBoardsLabel = computed(
  () =>
    boardsPileCards.value.length > 0 &&
    !isFlipping.value &&
    !stagePresent.value &&
    !isOpen.value &&
    !isMoodboard.value &&
    !keepBoardsPileForFlip.value,
)

const onBoardsPileEnter = async () => {
  if (isFlipping.value || keepBoardsPileForFlip.value) return
  // Seed hover vars while still at rest, then fan so transform interpolates
  pileFanSeed.value += 1
  await nextTick()
  boardsPileFanned.value = true
}

const onBoardsPileLeave = () => {
  if (isFlipping.value || keepBoardsPileForFlip.value) return
  boardsPileFanned.value = false
}

const onRemoveBoardClick = async (board: SavedBoard) => {
  const id = board.id
  if (cellPhase.value[id] || bulkBusy.value) return
  const undoKey = `board::${id}`
  setCellPhase(id, 'scale-out')
  await wait(CELL_SCALE_MS)
  if (cellPhase.value[id] !== 'scale-out') return
  softRemoveBoard(id)
  clearCellPhase(id)
  await nextTick()
  await waitFrames(2)
  if (!boardsGridEntries.value.some((e) => e.kind === 'undo' && e.key === undoKey)) {
    return
  }
  await wait(UNDO_ENTER_DELAY_MS)
  if (!boardsGridEntries.value.some((e) => e.kind === 'undo' && e.key === undoKey)) {
    return
  }
  setCellPhase(undoKey, 'undo-ready')
}

const onUndoBoardClick = async (key: string, board: SavedBoard) => {
  const phase = cellPhase.value[key]
  if (
    bulkBusy.value ||
    phase === 'undo-leaving' ||
    phase === 'scale-in' ||
    phase === 'scaled-in'
  ) {
    return
  }
  setCellPhase(key, 'undo-leaving')
  await wait(UNDO_FADE_MS)
  if (cellPhase.value[key] !== 'undo-leaving') return
  undoBoardRemove(key)
  clearCellPhase(key)
  const id = board.id
  setCellPhase(id, 'scale-in')
  await nextTick()
  await waitFrames(2)
  if (cellPhase.value[id] !== 'scale-in') return
  setCellPhase(id, 'scaled-in')
  await wait(CELL_SCALE_MS)
  if (cellPhase.value[id] === 'scaled-in') clearCellPhase(id)
}

const sendBoardEnquiry = (board: SavedBoard) => {
  if (!board.placements.length && !board.preview) return
  openFromMoodboard(board.placements, board.preview || null)
}

const onBoardsPileClick = () => {
  const top = boardsPileCards.value[boardsPileCards.value.length - 1]
  if (top) setActiveBoard(top.id)
  void openFromBoardsPile()
}

/** All settled items in the active pile (reversed so newest sits on top) — Flip ids. */
const pilePreview = computed(() => settledItems.value.slice().reverse())

const gridDims = computed(() => {
  if (panelTab.value === 'boards') {
    const span = boardSpan.value
    const n = Math.max(boardsGridEntries.value.length, 1)
    const cols = stackCols.value
    const cellsPerBoard = span.cols * span.rows
    const rows = Math.ceil((n * cellsPerBoard) / cols) || span.rows
    return { cols, rows }
  }
  const n = Math.max(selectionEntries.value.length, 1)
  const cols = stackCols.value
  const rows = Math.ceil(n / cols)
  return { cols, rows }
})

const softEnterStyle = (index: number) => {
  const delay =
    panelTab.value === 'boards'
      ? staggerDelayForBoardIndex(index, 'open')
      : staggerDelayForIndex(index, 'open')
  return { animationDelay: `${delay}s` }
}

const lockStackLayout = () => {
  syncCellSize()
  frozenCellSize.value = cellSizePx.value
  frozenCols.value = stackCols.value
  frozenBoardSpan.value =
    stackCols.value >= 6 ? { cols: 3, rows: 2 } : { cols: 1, rows: 1 }
  layoutLocked.value = true
}

const unlockStackLayout = () => {
  layoutLocked.value = false
  frozenCellSize.value = 0
  frozenCols.value = 0
  frozenBoardSpan.value = null
}

const stackCssVars = computed(() => {
  const size =
    layoutLocked.value && frozenCellSize.value > 0
      ? frozenCellSize.value
      : cellSizePx.value
  const cols =
    layoutLocked.value && frozenCols.value > 0
      ? frozenCols.value
      : stackCols.value
  return {
    '--stack-cols': String(cols),
    '--stack-cell-size': size > 0 ? `${size}px` : `calc(100vw / ${cols})`,
    '--stack-cell-pad': '17%',
  }
})

const gridStyle = computed(() => {
  const size =
    layoutLocked.value && frozenCellSize.value > 0
      ? frozenCellSize.value
      : cellSizePx.value
  const cols =
    layoutLocked.value && frozenCols.value > 0
      ? frozenCols.value
      : stackCols.value
  const track = size > 0 ? `${size}px` : 'var(--stack-cell-size)'
  return {
    gridTemplateColumns: `repeat(${cols}, ${track})`,
    gridAutoRows: track,
  }
})

const syncCellSize = () => {
  if (!import.meta.client || layoutLocked.value) return
  // Keep boards column count through close Flip (isOpen drops before stage fades)
  const boardsMode =
    panelTab.value === 'boards' &&
    (isOpen.value || stagePresent.value || keepBoardsPileForFlip.value || isFlipping.value)
  stackCols.value = boardsMode
    ? boardsGridColsForWidth(window.innerWidth)
    : stackColsForWidth(window.innerWidth)
  const cols = stackCols.value
  const grid = gridRef.value
  if (grid) {
    cellSizePx.value = grid.clientWidth / cols
    return
  }
  cellSizePx.value = window.innerWidth / cols
}

/** Stable-ish tilt from id (+ optional salt so underneath cards reshuffle when top changes). */
const hashAngle = (id: string, salt = '') => {
  const key = salt ? `${id}::${salt}` : id
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  return ((h % 11) - 5) * 0.9 // about -4.5° … 4.5°
}

/** Rest pose for a pile card (matches pileCardStyle without fan / landing overrides). */
const pileRestPose = (id: string, index: number, total: number, salt: string) => {
  const t = total <= 1 ? 0 : index / (total - 1)
  const x = (t - 0.5) * 10
  const y = (0.5 - t) * 6
  const isTop = index === total - 1
  const rot = isTop ? hashAngle(id) : hashAngle(id, salt)
  return { x, y, rot }
}

/** Pad for pile landings — reads the rail’s 12% stack pad. */
const readStackCellPad = (cellSize?: number) => {
  const size = cellSize || cellSizePx.value || 100
  if (!import.meta.client) return size * 0.12
  const padEl =
    document.querySelector('.stack__rail') || document.querySelector('.stack')
  if (!padEl) return size * 0.12
  const raw = getComputedStyle(padEl).getPropertyValue('--stack-cell-pad').trim()
  if (raw.endsWith('%')) {
    const pct = Number.parseFloat(raw)
    return (size * (Number.isFinite(pct) ? pct : 12)) / 100
  }
  const px = Number.parseFloat(raw)
  return Number.isFinite(px) ? px : size * 0.12
}

/** Visual image size inside a padded square stack cell (natural aspect ratio). */
const fitStackContentSize = (natW: number, natH: number, cellSize: number) => {
  const pad = readStackCellPad(cellSize)
  const max = Math.max(1, cellSize - pad * 2)
  const w = Math.max(1, natW)
  const h = Math.max(1, natH)
  const scale = Math.min(max / w, max / h)
  return { width: w * scale, height: h * scale }
}

const readImageNaturalSize = async (
  img: HTMLImageElement | null,
  url: string,
): Promise<{ w: number; h: number }> => {
  if (img?.naturalWidth && img.naturalHeight) {
    return { w: img.naturalWidth, h: img.naturalHeight }
  }
  if (!import.meta.client || !url) return { w: 1, h: 1 }
  const probe = new Image()
  probe.src = url
  try {
    if (typeof probe.decode === 'function') await probe.decode()
    else {
      await new Promise<void>((resolve, reject) => {
        probe.onload = () => resolve()
        probe.onerror = () => reject()
      })
    }
  } catch {
    /* keep defaults */
  }
  return {
    w: probe.naturalWidth || img?.naturalWidth || 1,
    h: probe.naturalHeight || img?.naturalHeight || 1,
  }
}

/**
 * Fan directions (max travel). Spread across the whole stack via per-id hash;
 * scale ≤ 1 so nothing moves further than these templates.
 */
const FAN_DIRS: Array<{ x: number; y: number; r: number }> = [
  { x: -34, y: -40, r: -9 }, // up-left
  { x: 36, y: -32, r: 8 }, // up-right
  { x: -48, y: 4, r: -6 }, // left
  { x: -26, y: 48, r: -4 }, // below-left
  { x: 8, y: 58, r: 2 }, // below
  { x: 34, y: 50, r: 6 }, // below-right
  { x: 46, y: -8, r: 7 }, // right
]

const hashInt = (id: string, salt = '') => {
  const key = salt ? `${id}::${salt}` : id
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Bumped on each hover — reshuffles fan directions. */
const pileFanSeed = ref(0)

/** Randomised fan for every non-top card — depth softens travel, never exceeds FAN_DIRS. */
const pileFanOffset = (id: string, index: number, total: number) => {
  const fromTop = total - 1 - index
  if (fromTop <= 0) return null

  const h = hashInt(id, `fan:${pileFanSeed.value}`)
  const dir = FAN_DIRS[h % FAN_DIRS.length]!
  const depthT = fromTop / Math.max(total - 1, 1)
  // Near-top: closer to full template; deeper: smaller nudge (still participates)
  const depthScale = 1 - depthT * 0.55
  const jitter = 0.65 + ((h >> 9) % 36) / 100 // 0.65–1.00
  const s = Math.min(1, depthScale * jitter)

  return { x: dir.x * s, y: dir.y * s, r: dir.r * s }
}

/** After open, tip stays off until close finishes and the pointer leaves then re-enters. */
const pileTipLocked = ref(false)

const showPileTip = (boardId: string) =>
  !pileTipLocked.value &&
  !isOpen.value &&
  !stagePresent.value &&
  !isFlipping.value &&
  (moodboards.value.length <= 1 || railExpanded.value) &&
  pileFannedId.value === boardId

const onPileMouseEnter = (boardId: string) => {
  if (isFlipping.value) return
  railHot.value = true
  // Board editor: only raise other selections when this stack is closed
  if (expandedBoardIds.value.includes(boardId)) return
  pileFanSeed.value += 1
  pileFannedId.value = boardId
  pileFanned.value = true
  // Multi-rail: hover the active corner stack to raise the others
  // (cart + board composer — composer has no empties / no +)
  if (
    railBoards.value.length > 1 &&
    boardId === activeMoodboardId.value &&
    !railExpanded.value &&
    !isOpen.value &&
    !stagePresent.value
  ) {
    void expandRail()
  }
}

const onPileMouseLeave = (boardId: string) => {
  // Keep fanned pose while opening so Flip reads the spread positions
  if (isFlipping.value || keepPileForFlip.value) return
  if (pileFannedId.value === boardId) {
    pileFannedId.value = null
    pileFanned.value = false
  }
  // Re-arm tip only after a real mouse-out while the cart is closed
  if (!isOpen.value && !stagePresent.value) {
    pileTipLocked.value = false
  }
}

/** True while the nav heart is hovered — fans the stack like pile hover. */
const navHeartHot = ref(false)

/** If the pointer is still over the pile / nav heart after Flip, ease into the fan. */
const syncPileFanFromHover = async () => {
  await nextTick()
  if (!import.meta.client || isFlipping.value) return
  const id = activeMoodboardId.value
  const el = id ? pileEls.value[id] : null
  const hot = navHeartHot.value || !!el?.matches(':hover')
  pileFanned.value = hot
  pileFannedId.value = hot && id ? id : null
}

const syncColumnLayout = (boardId: string) => {
  if (!import.meta.client) return
  const wrap = pileWrapEls.value[boardId]
  if (!wrap) return
  const rect = wrap.getBoundingClientRect()
  columnLayouts.value = {
    ...columnLayouts.value,
    [boardId]: {
      left: rect.left,
      width: rect.width,
      top: 0,
      height: window.innerHeight,
    },
  }
}

const syncAllColumnLayouts = () => {
  for (const id of expandedBoardIds.value) syncColumnLayout(id)
}

const columnFixedStyle = (boardId: string) => {
  const layout = columnLayouts.value[boardId]
  if (!layout) return undefined
  return {
    left: `${layout.left}px`,
    width: `${layout.width}px`,
    top: `${layout.top}px`,
    height: `${layout.height}px`,
  }
}

/** Hide close as soon as restack starts so the leave fade isn’t delayed. */
const restackingBoardId = ref<string | null>(null)

const showColumnClose = (boardId: string) =>
  expandedBoardIds.value.includes(boardId) && restackingBoardId.value !== boardId

const columnCloseStyle = (boardId: string) => {
  const layout = columnLayouts.value[boardId]
  if (layout) {
    return { left: `${layout.left + layout.width / 2}px` }
  }
  const wrap = pileWrapEls.value[boardId]
  if (!wrap) return undefined
  const rect = wrap.getBoundingClientRect()
  return { left: `${rect.left + rect.width / 2}px` }
}

const onColumnWheel = (event: WheelEvent) => {
  const scroll = event.currentTarget as HTMLElement | null
  if (!scroll) return
  event.preventDefault()
  event.stopPropagation()
  scroll.scrollTop += event.deltaY
}

type ColumnPending = {
  item: BucketItem
  boardId: string
  thumb: HTMLElement
  startX: number
  startY: number
}

type ColumnDrag = {
  item: BucketItem
  boardId: string
  thumb: HTMLElement
  ghost: HTMLElement
  offsetX: number
  offsetY: number
  width: number
  height: number
}

let columnPending: ColumnPending | null = null
let columnDrag: ColumnDrag | null = null

const clearColumnPointerListeners = () => {
  window.removeEventListener('pointermove', onColumnPointerMove)
  window.removeEventListener('pointerup', onColumnPointerUp)
  window.removeEventListener('pointercancel', onColumnPointerUp)
}

const destroyColumnGhost = () => {
  columnDrag?.ghost.remove()
  columnDrag = null
  document.documentElement.classList.remove('stack-column-dragging')
}

const startColumnDrag = (pending: ColumnPending, event: PointerEvent) => {
  const rect = pending.thumb.getBoundingClientRect()
  const img = pending.thumb.querySelector('img')
  const natW = img?.naturalWidth || 1
  const natH = img?.naturalHeight || 1
  const fitted = fitStackContentSize(natW, natH, rect.width)
  // Center the natural-ratio ghost on the square thumb’s content
  const left = rect.left + (rect.width - fitted.width) / 2
  const top = rect.top + (rect.height - fitted.height) / 2

  const ghost = document.createElement('div')
  ghost.className = 'stack__column-ghost'
  const ghostImg = document.createElement('img')
  ghostImg.src = pending.item.imageUrl || img?.src || ''
  ghostImg.alt = pending.item.title
  ghostImg.draggable = false
  ghost.appendChild(ghostImg)
  ghost.style.cssText = [
    'position:fixed',
    `left:${left}px`,
    `top:${top}px`,
    `width:${fitted.width}px`,
    `height:${fitted.height}px`,
    'margin:0',
    'z-index:500',
    'pointer-events:none',
    'opacity:1',
    'cursor:grabbing',
    'box-sizing:border-box',
    'overflow:hidden',
    'background:transparent',
  ].join(';')
  document.body.appendChild(ghost)
  columnDrag = {
    item: pending.item,
    boardId: pending.boardId,
    thumb: pending.thumb,
    ghost,
    offsetX: event.clientX - left,
    offsetY: event.clientY - top,
    width: fitted.width,
    height: fitted.height,
  }
  columnPending = null
  document.documentElement.classList.add('stack-column-dragging')
  // Source leaves with the ghost — feels like dragging the real item
  pending.thumb.classList.add('stack__column-thumb--lifted')
}

const onColumnThumbPointerDown = (
  event: PointerEvent,
  item: BucketItem,
  boardId: string,
) => {
  if (!import.meta.client || event.button !== 0) return
  // Don't start a board-drag from the close control
  if ((event.target as HTMLElement | null)?.closest?.('.stack__column-close')) return
  const thumb = event.currentTarget as HTMLElement
  columnPending = {
    item,
    boardId,
    thumb,
    startX: event.clientX,
    startY: event.clientY,
  }
  window.addEventListener('pointermove', onColumnPointerMove)
  window.addEventListener('pointerup', onColumnPointerUp)
  window.addEventListener('pointercancel', onColumnPointerUp)
}

const onColumnPointerMove = (event: PointerEvent) => {
  if (columnDrag) {
    event.preventDefault()
    columnDrag.ghost.style.left = `${event.clientX - columnDrag.offsetX}px`
    columnDrag.ghost.style.top = `${event.clientY - columnDrag.offsetY}px`
    return
  }
  if (!columnPending) return
  const dx = event.clientX - columnPending.startX
  const dy = event.clientY - columnPending.startY
  if (Math.hypot(dx, dy) < 8) return
  // Mostly vertical → let the column scroll; don't steal the gesture
  if (Math.abs(dy) > Math.abs(dx) * 1.15) {
    columnPending = null
    clearColumnPointerListeners()
    return
  }
  startColumnDrag(columnPending, event)
  event.preventDefault()
}

/** Build a fixed flyer for board → stack / column returns. */
const makeReturnFlyer = (opts: {
  from: { left: number; top: number; width: number; height: number }
  imageUrl: string
  objectFit?: 'contain' | 'cover'
}) => {
  const flyer = document.createElement('div')
  const img = document.createElement('img')
  img.src = opts.imageUrl
  img.alt = ''
  img.draggable = false
  flyer.appendChild(img)
  document.body.appendChild(flyer)
  gsap.set(flyer, {
    position: 'fixed',
    left: opts.from.left,
    top: opts.from.top,
    width: Math.max(opts.from.width, 1),
    height: Math.max(opts.from.height, 1),
    margin: 0,
    zIndex: 600,
    pointerEvents: 'none',
    boxSizing: 'border-box',
    overflow: 'hidden',
    background: 'transparent',
  })
  gsap.set(img, {
    display: 'block',
    width: '100%',
    height: '100%',
    objectFit: opts.objectFit || 'contain',
    padding: 0,
  })
  return { flyer, img }
}

/** Closed stack: fly the board item straight back onto the pile. */
const returnItemToPile = async (opts: {
  selectionId: string
  itemId: string
  from: { left: number; top: number; width: number; height: number }
  imageUrl: string
  objectFit?: 'contain' | 'cover'
  item?: BucketItem
}) => {
  const { selectionId, itemId, from, imageUrl } = opts
  const boardBefore = moodboards.value.find((entry) => entry.id === selectionId)
  const alreadyInSelection = !!boardBefore?.items.some((entry) => entry.id === itemId)
  const isParked = parkedSelectionItems.value.some((entry) => entry.item.id === itemId)

  const { flyer, img } = makeReturnFlyer(opts)
  // Hide pile card until the flyer lands
  if (!arrivingIds.value.includes(itemId)) {
    arrivingIds.value = [...arrivingIds.value, itemId]
  }

  try {
    if (isParked) restoreParkedSelectionItem(itemId)
    else if (!alreadyInSelection && opts.item) addItemToMoodboard(selectionId, opts.item)

    await nextTick()
    await waitFrames(2)
    const pile = pileEls.value[selectionId]
    if (!pile) return

    if (!img.complete) {
      await new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true })
        img.addEventListener('error', () => resolve(), { once: true })
      })
    }

    const dest = pile.getBoundingClientRect()
    const cell = Math.max(dest.width, 1)
    const fitted = fitStackContentSize(
      img.naturalWidth || from.width || 1,
      img.naturalHeight || from.height || 1,
      cell,
    )
    const board = moodboards.value.find((entry) => entry.id === selectionId)
    // Preview is newest-last (matches pileCardStyle index / z-index)
    const preview = board ? board.items.slice().reverse() : []
    const index = Math.max(
      0,
      preview.findIndex((entry) => entry.id === itemId),
    )
    const total = Math.max(preview.length, 1)
    const t = total <= 1 ? 0 : index / (total - 1)
    const isTop = index === total - 1
    const landRot = isTop
      ? hashAngle(itemId)
      : hashAngle(itemId, committedPileSalt.value)
    const landLeft = dest.left + (t - 0.5) * 10 + (cell - fitted.width) / 2
    const landTop = dest.top + (0.5 - t) * 6 + (cell - fitted.height) / 2

    await new Promise<void>((resolve) => {
      gsap.fromTo(
        flyer,
        {
          left: from.left,
          top: from.top,
          width: Math.max(from.width, 1),
          height: Math.max(from.height, 1),
          rotation: 0,
        },
        {
          left: landLeft,
          top: landTop,
          width: fitted.width,
          height: fitted.height,
          rotation: landRot,
          duration: 0.55,
          ease: 'power3.inOut',
          onComplete: () => resolve(),
        },
      )
    })
  } finally {
    arrivingIds.value = arrivingIds.value.filter((id) => id !== itemId)
    flyer.remove()
  }
}

/** Open column (if needed), animate a gap, then Flip the board item into the slot. */
const returnItemToColumn = async (opts: {
  selectionId: string
  itemId: string
  from: { left: number; top: number; width: number; height: number }
  imageUrl: string
  objectFit?: 'contain' | 'cover'
  item?: BucketItem
}) => {
  if (!import.meta.client) {
    restoreParkedSelectionItem(opts.itemId)
    return
  }

  const { selectionId, itemId, from, imageUrl } = opts
  setActiveMoodboard(selectionId)
  pileRef.value = pileEls.value[selectionId] || pileRef.value

  const wasExpanded = expandedBoardIds.value.includes(selectionId)
  // Closed stack — skip column open; fly straight into the pile
  if (!wasExpanded) {
    await returnItemToPile(opts)
    return
  }

  const { flyer, img } = makeReturnFlyer(opts)

  // Hide the destination thumb from the first painted frame (avoids pop)
  columnReturningId.value = itemId

  try {
    const boardBefore = moodboards.value.find((entry) => entry.id === selectionId)
    const alreadyInSelection = !!boardBefore?.items.some((entry) => entry.id === itemId)
    const isParked = parkedSelectionItems.value.some((entry) => entry.item.id === itemId)

    let column = columnEls.value[selectionId]
    if (!column) {
      expandedBoardIds.value = [...new Set([...expandedBoardIds.value, selectionId])]
      pileEls.value[selectionId]?.classList.add('stack__pile--dispersing')
      await nextTick()
      syncColumnLayout(selectionId)
      await waitFrames(2)
      column = columnEls.value[selectionId]
    }
    if (!column) {
      if (isParked) restoreParkedSelectionItem(itemId)
      else if (opts.item && !alreadyInSelection) addItemToMoodboard(selectionId, opts.item)
      return
    }

    // 2) Capture sibling layout, then insert the reserved (hidden) slot
    const beforeRect = new Map<string, DOMRect>()
    column.querySelectorAll<HTMLElement>('.stack__column-thumb').forEach((thumb) => {
      const id = thumb.dataset.columnId
      if (id && id !== itemId) {
        gsap.set(thumb, { x: 0, y: 0, clearProps: 'transform' })
        beforeRect.set(id, thumb.getBoundingClientRect())
      }
    })

    const hadThumb = alreadyInSelection
    if (isParked) restoreParkedSelectionItem(itemId)
    else if (!alreadyInSelection && opts.item) addItemToMoodboard(selectionId, opts.item)

    await nextTick()
    await waitFrames(2)

    let destThumb = column.querySelector(
      `[data-column-id="${itemId}"]`,
    ) as HTMLElement | null
    if (!destThumb) return

    // FLIP siblings: hold old positions, then ease into the opened gap
    if (!hadThumb) {
      const movers: HTMLElement[] = []
      column.querySelectorAll<HTMLElement>('.stack__column-thumb').forEach((thumb) => {
        const id = thumb.dataset.columnId
        if (!id || id === itemId) return
        const from = beforeRect.get(id)
        if (!from) return
        const to = thumb.getBoundingClientRect()
        const dx = from.left - to.left
        const dy = from.top - to.top
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          gsap.set(thumb, { x: dx, y: dy })
          movers.push(thumb)
        }
      })

      destThumb.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      await waitFrames(1)

      if (movers.length) {
        await new Promise<void>((resolve) => {
          gsap.to(movers, {
            x: 0,
            y: 0,
            duration: 0.45,
            ease: 'power3.out',
            overwrite: true,
            onComplete: () => resolve(),
          })
        })
      } else {
        await wait(180)
      }
    } else {
      destThumb.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      await wait(180)
    }

    destThumb =
      (column.querySelector(`[data-column-id="${itemId}"]`) as HTMLElement | null) ||
      destThumb
    const dest = destThumb.getBoundingClientRect()

    if (!img.complete) {
      await new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true })
        img.addEventListener('error', () => resolve(), { once: true })
      })
    }

    const cell = Math.max(dest.width, 1)
    const fitted = fitStackContentSize(
      img.naturalWidth || from.width || 1,
      img.naturalHeight || from.height || 1,
      cell,
    )
    const landLeft = dest.left + (cell - fitted.width) / 2
    const landTop = dest.top + (cell - fitted.height) / 2

    // 3) Flip / scale into the empty slot
    await new Promise<void>((resolve) => {
      gsap.fromTo(
        flyer,
        {
          left: from.left,
          top: from.top,
          width: Math.max(from.width, 1),
          height: Math.max(from.height, 1),
        },
        {
          left: landLeft,
          top: landTop,
          width: fitted.width,
          height: fitted.height,
          duration: 0.55,
          ease: 'power3.inOut',
          onComplete: () => resolve(),
        },
      )
    })

    // Reveal the real thumb under the flyer, then drop the flyer
    columnReturningId.value = null
    await nextTick()
  } finally {
    columnReturningId.value = null
    flyer.remove()
  }
}

const compactColumnAfterPark = async (boardId: string, removedId: string) => {
  const column = columnEls.value[boardId]
  if (!column) {
    parkSelectionItem(boardId, removedId)
    return
  }
  const before = new Map<string, DOMRect>()
  column.querySelectorAll<HTMLElement>('.stack__column-thumb').forEach((thumb) => {
    const id = thumb.dataset.columnId
    if (id) before.set(id, thumb.getBoundingClientRect())
  })
  // Park (not permanently remove) — returns to cart when the board closes
  parkSelectionItem(boardId, removedId)
  await nextTick()
  await waitFrames(2)
  const thumbs = column.querySelectorAll<HTMLElement>('.stack__column-thumb')
  thumbs.forEach((thumb) => {
    const id = thumb.dataset.columnId
    if (!id) return
    const from = before.get(id)
    if (!from) return
    const to = thumb.getBoundingClientRect()
    const dx = from.left - to.left
    const dy = from.top - to.top
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return
    gsap.fromTo(
      thumb,
      { x: dx, y: dy },
      { x: 0, y: 0, duration: 0.4, ease: 'power3.out', overwrite: true },
    )
  })
  // Empty column → restack automatically
  const board = moodboards.value.find((entry) => entry.id === boardId)
  if (board && board.items.length === 0) {
    expandedBoardIds.value = expandedBoardIds.value.filter((id) => id !== boardId)
    pileEls.value[boardId]?.classList.remove('stack__pile--dispersing')
  }
}

const onColumnPointerUp = async (event: PointerEvent) => {
  clearColumnPointerListeners()
  const pending = columnPending
  columnPending = null
  const drag = columnDrag
  if (!drag) return

  const canvas = document.querySelector('.moodboard__canvas') as HTMLElement | null
  const canvasRect = canvas?.getBoundingClientRect()
  const overCanvas =
    !!canvasRect &&
    event.clientX >= canvasRect.left &&
    event.clientX <= canvasRect.right &&
    event.clientY >= canvasRect.top &&
    event.clientY <= canvasRect.bottom

  if (overCanvas && canvasRect && drag.item.imageUrl) {
    const img = drag.thumb.querySelector('img')
    const natural = await readImageNaturalSize(img, drag.item.imageUrl)
    const cellSize =
      pileEls.value[drag.boardId]?.getBoundingClientRect().width ||
      drag.thumb.getBoundingClientRect().width ||
      Math.max(drag.width, drag.height)
    const fitted = fitStackContentSize(natural.w, natural.h, cellSize)
    // Prefer live ghost rect (already natural-ratio); fall back to fitted
    const ghostRect = drag.ghost.getBoundingClientRect()
    const width = ghostRect.width || fitted.width
    const height = ghostRect.height || fitted.height
    const x = event.clientX - canvasRect.left - drag.offsetX
    const y = event.clientY - canvasRect.top - drag.offsetY
    addImage(drag.item.imageUrl, drag.item.title, {
      imageUrls: drag.item.imageUrls,
      imageIndex: drag.item.imageIndex,
      x,
      y,
      width,
      height,
      scale: 1,
      objectFit: 'contain',
      sourceBucketItemId: drag.item.id,
      sourceSelectionId: drag.boardId,
    })
    destroyColumnGhost()
    await compactColumnAfterPark(drag.boardId, drag.item.id)
    return
  }

  // Return ghost to the thumb, then restore the source
  const thumbRect = drag.thumb.getBoundingClientRect()
  await new Promise<void>((resolve) => {
    gsap.to(drag.ghost, {
      left: thumbRect.left,
      top: thumbRect.top,
      duration: 0.28,
      ease: 'power3.out',
      onComplete: () => resolve(),
    })
  })
  drag.thumb.classList.remove('stack__column-thumb--lifted')
  destroyColumnGhost()
  void pending
}

/** Rotation in degrees from a computed CSS transform matrix. */
const getRotationDeg = (el: HTMLElement) => {
  const t = getComputedStyle(el).transform
  if (!t || t === 'none') return 0
  try {
    const m = new DOMMatrixReadOnly(t)
    return (Math.atan2(m.b, m.a) * 180) / Math.PI
  } catch {
    return 0
  }
}

const disperseBoard = async (boardId: string) => {
  if (!import.meta.client) return
  if (expandedBoardIds.value.includes(boardId)) return
  const pile = pileEls.value[boardId]
  if (!pile) return

  const pileRect = pile.getBoundingClientRect()
  // Keep the cell size constant through the flight (ignore rotated AABB growth)
  const size = pileRect.width

  // Capture while still fanned/tilted — rotation eases out during disperse
  const fromById = new Map<string, { left: number; top: number; rot: number }>()
  pile.querySelectorAll<HTMLElement>('[data-item-id]').forEach((card) => {
    const id = card.dataset.itemId
    if (!id) return
    const rect = card.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    fromById.set(id, {
      left: cx - size / 2,
      top: cy - size / 2,
      rot: getRotationDeg(card),
    })
  })

  preparingBoardId.value = boardId
  expandedBoardIds.value = [...expandedBoardIds.value, boardId]
  await nextTick()
  syncColumnLayout(boardId)
  await nextTick()
  await waitFrames(2)

  const column = columnEls.value[boardId]
  if (!column) {
    preparingBoardId.value = null
    return
  }
  const scroll = column.querySelector<HTMLElement>('.stack__column-scroll')
  const thumbs = [...column.querySelectorAll<HTMLElement>('.stack__column-thumb')]
  if (!thumbs.length) {
    preparingBoardId.value = null
    return
  }

  // Measure column slots before we pull thumbs into fixed flyers
  const dests = thumbs.map((thumb) => {
    const rect = thumb.getBoundingClientRect()
    return { left: rect.left, top: rect.top }
  })

  // Hold scroll layout while thumbs are position:fixed (out of flow)
  const flightSpacer = document.createElement('div')
  flightSpacer.setAttribute('aria-hidden', 'true')
  flightSpacer.style.cssText = `flex:0 0 ${size * thumbs.length}px;width:100%;pointer-events:none;`
  const foot = scroll?.querySelector('.stack__column-foot')
  if (scroll && foot) scroll.insertBefore(flightSpacer, foot)
  else scroll?.appendChild(flightSpacer)
  if (scroll) scroll.scrollTop = 0

  gsap.killTweensOf(thumbs)
  thumbs.forEach((thumb, i) => {
    const id = thumb.dataset.columnId || ''
    const from = fromById.get(id) || {
      left: pileRect.left,
      top: pileRect.top,
      rot: 0,
    }
    // Top-of-pile (first in column) stays above during flight
    gsap.set(thumb, {
      position: 'fixed',
      left: from.left,
      top: from.top,
      width: size,
      height: size,
      rotation: from.rot,
      transformOrigin: '50% 50%',
      zIndex: 450 + (thumbs.length - 1 - i),
      margin: 0,
      boxSizing: 'border-box',
      opacity: 1,
      visibility: 'visible',
    })
  })

  // Hide source pile only once flyers own the pixels; clear fan off-screen
  pile.classList.add('stack__pile--dispersing')
  pileFannedId.value = null
  pileFanned.value = false
  preparingBoardId.value = null

  await new Promise<void>((resolve) => {
    gsap.to(thumbs, {
      left: (i: number) => dests[i]!.left,
      top: (i: number) => dests[i]!.top,
      width: size,
      height: size,
      rotation: 0,
      duration: 0.6,
      ease: 'power3.inOut',
      stagger: 0,
      onComplete: () => {
        gsap.set(thumbs, {
          clearProps:
            'position,left,top,width,height,zIndex,margin,boxSizing,opacity,visibility,transform,rotation',
        })
        flightSpacer.remove()
        // Stay at the top of the column (where the top-of-pile items land)
        if (scroll) scroll.scrollTop = 0
        // Re-pin after flight — pile may have settled during the animation
        syncColumnLayout(boardId)
        requestAnimationFrame(() => {
          if (scroll) scroll.scrollTop = 0
          syncColumnLayout(boardId)
          resolve()
        })
      },
    })
  })
}

const restackBoard = async (boardId: string) => {
  if (!import.meta.client) return
  if (restackingBoardId.value === boardId) return
  restackingBoardId.value = boardId
  const pile = pileEls.value[boardId]
  const column = columnEls.value[boardId]
  const board = moodboards.value.find((entry) => entry.id === boardId)
  if (pile && column && board) {
    const thumbs = [...column.querySelectorAll<HTMLElement>('.stack__column-thumb')]
    const pileRect = pile.getBoundingClientRect()
    const size = pileRect.width
    const froms = thumbs.map((thumb) => thumb.getBoundingClientRect())
    const preview = boardPilePreview(board)
    const total = preview.length
    // Same salt string as committedPileSalt / pileCardStyle (unreversed item ids)
    const salt = boardColumnItems(board)
      .map((item) => item.id)
      .join('|')
    const poses = thumbs.map((thumb, i) => {
      const id = thumb.dataset.columnId || ''
      const pileIndex = preview.findIndex((item) => item.id === id)
      const index = pileIndex >= 0 ? pileIndex : Math.max(0, total - 1 - i)
      return pileRestPose(id, index, total, salt)
    })

    // Suppress pile transform transition so handoff doesn’t re-tween
    pile.classList.add('stack__pile--restacking')

    // Column order: top-of-pile first — keep that item highest z through the flight
    thumbs.forEach((thumb, i) => {
      gsap.set(thumb, {
        position: 'fixed',
        left: froms[i]!.left,
        top: froms[i]!.top,
        width: size,
        height: size,
        rotation: 0,
        transformOrigin: '50% 50%',
        zIndex: 450 + (thumbs.length - 1 - i),
        margin: 0,
      })
    })
    await new Promise<void>((resolve) => {
      gsap.to(thumbs, {
        left: (i: number) => pileRect.left + poses[i]!.x,
        top: (i: number) => pileRect.top + poses[i]!.y,
        width: size,
        height: size,
        rotation: (i: number) => poses[i]!.rot,
        duration: 0.45,
        ease: 'power3.inOut',
        stagger: 0,
        onComplete: () => resolve(),
      })
    })

    // Drop column first, then reveal pile under the landed poses (avoids double stack)
    expandedBoardIds.value = expandedBoardIds.value.filter((id) => id !== boardId)
    await nextTick()
    pile.classList.remove('stack__pile--dispersing')
    gsap.set(thumbs, {
      clearProps: 'position,left,top,width,height,zIndex,margin,transform,rotation',
    })
    pile.classList.remove('stack__pile--restacking')
  } else {
    pileEls.value[boardId]?.classList.remove('stack__pile--dispersing')
    expandedBoardIds.value = expandedBoardIds.value.filter((id) => id !== boardId)
  }
  const { [boardId]: _removed, ...restLayouts } = columnLayouts.value
  columnLayouts.value = restLayouts
  if (restackingBoardId.value === boardId) restackingBoardId.value = null
}

const onPileClick = async (boardId: string) => {
  const board = moodboards.value.find((entry) => entry.id === boardId)
  const wasActive = boardId === activeMoodboardId.value
  // Switching selection inside the board composer: restack → collapse → disperse
  if (!wasActive && isMoodboard.value) {
    await switchSelectionInMoodboard(boardId)
    return
  }
  setActiveMoodboard(boardId)
  pileRef.value = pileEls.value[boardId] || null
  if (!wasActive) {
    if (railBoards.value.length > 1) void collapseRail()
    return
  }
  if (!board?.items.length) return
  if (isMoodboard.value) {
    if (expandedBoardIds.value.includes(boardId)) {
      void restackBoard(boardId)
    } else {
      void disperseBoard(boardId)
    }
    return
  }
  void openFromPile()
}

const railSwitchBusy = ref(false)

/** Clear parked / rail GSAP so the active wrap can size from CSS again. */
const resetActivePileWrap = (boardId: string) => {
  const el = pileWrapEls.value[boardId]
  if (!el || !import.meta.client) return
  gsap.killTweensOf(el)
  gsap.set(el, {
    clearProps:
      'transform,x,y,xPercent,yPercent,width,minWidth,padding,paddingLeft,paddingRight,opacity,overflow',
  })
}

/** Pick another selection while editing a board. */
const switchSelectionInMoodboard = async (boardId: string) => {
  if (!import.meta.client || railSwitchBusy.value) return
  const next = moodboards.value.find((entry) => entry.id === boardId)
  if (!next?.items.length) return

  railSwitchBusy.value = true
  railHoldOpen.value = true
  clearRailLeaveTimer()
  try {
    // Restack every open column — not only the previous active — so nothing
    // is left fixed over the board canvas after the switch.
    const openIds = [...expandedBoardIds.value]
    for (const id of openIds) {
      await restackBoard(id)
    }

    setActiveMoodboard(boardId)
    pileRef.value = pileEls.value[boardId] || null
    resetActivePileWrap(boardId)

    // Always wait out an in-flight collapse (mouseleave may have started one)
    if (collapseRailPromise) {
      await collapseRailPromise
    }
    if (railExpanded.value || createPlusReady.value || railCollapsing.value) {
      await collapseRail()
    } else {
      syncRailOrder(true)
      await nextTick()
      parkInactiveRailBelow()
    }

    resetActivePileWrap(boardId)
    await nextTick()
    await waitFrames(2)

    if (!expandedBoardIds.value.includes(boardId)) {
      await disperseBoard(boardId)
    } else {
      // Already open from a partial switch — re-pin to the settled pile
      syncColumnLayout(boardId)
    }
  } finally {
    railSwitchBusy.value = false
    window.setTimeout(() => {
      railHoldOpen.value = false
    }, 200)
  }
}

/**
 * Landing id is set at flyer impact so under-cards reshuffle once on the thud.
 * Cleared on handoff after poses are already final.
 */
const pileLandingId = ref<string | null>(null)

/**
 * Frozen under-card salt — only advances on thud (or when the pile is idle).
 * Prevents heart → mid-flight → post-land salt thrash.
 */
const committedPileSalt = ref('')

const fullItemSalt = () => items.value.map((item) => item.id).join('|')

watch(
  pileLandingId,
  (landingId) => {
    if (landingId) {
      // Thud: commit the final stack salt (new item is already in items)
      committedPileSalt.value = fullItemSalt()
    }
  },
)

watch(
  [items, arrivingIds],
  () => {
    // Idle only — never reshuffle while a flyer is in the air
    if (!arrivingIds.value.length && !pileLandingId.value) {
      committedPileSalt.value = fullItemSalt()
    }
  },
  { deep: true, immediate: true },
)

const pileCardStyle = (id: string, cards: StackPileCard[]) => {
  const landing = pileLandingId.value
  const flying = arrivingIds.value
  // Until the thud, pose as if the flyer isn't in the stack yet
  const poseCards =
    !landing && flying.length
      ? cards.filter((card) => !flying.includes(card.id))
      : cards
  const poseIndex = poseCards.findIndex((card) => card.id === id)
  const total = Math.max(poseCards.length, 1)
  // In-flight card (hidden): park at top pose without shifting siblings
  const index = poseIndex >= 0 ? poseIndex : Math.max(total - 1, 0)
  const t = total <= 1 ? 0 : index / (total - 1)
  const x = (t - 0.5) * 10
  const y = (0.5 - t) * 6
  // Real stack top (and the card currently landing) — match flyer landRot
  const stackTopId = cards[cards.length - 1]?.id
  const isTop =
    id === stackTopId || id === landing || (poseIndex < 0 && flying.includes(id))
  const rot = isTop ? hashAngle(id) : hashAngle(id, committedPileSalt.value)
  const fan = pileFanOffset(id, index, total)
  const hoverX = fan ? x + fan.x : x
  const hoverY = fan ? y + fan.y : y
  const hoverExtra = rot === 0 ? -2 : Math.sign(rot) * 2
  const hoverRot = isTop ? rot + hoverExtra : fan ? rot + fan.r : rot
  const zIndex = cards.findIndex((card) => card.id === id) + 1

  return {
    '--pile-x': `${x}px`,
    '--pile-y': `${y}px`,
    '--pile-r': `${rot}deg`,
    '--pile-hover-x': `${hoverX}px`,
    '--pile-hover-y': `${hoverY}px`,
    '--pile-hover-r': `${hoverRot}deg`,
    zIndex: zIndex > 0 ? zIndex : cards.length,
  }
}

/** Whole-pile thump when a flyer hits */
const bumpPileImpact = () => {
  const pile = pileRef.value
  if (!import.meta.client || !pile) return
  gsap.killTweensOf(pile)
  gsap
    .timeline()
    .to(pile, { y: 11, duration: 0.09, ease: 'power3.in' })
    .to(pile, { y: 0, duration: 0.38, ease: 'power3.out' })
}

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

const openProduct = async (item: BucketItem, event?: MouseEvent) => {
  const slug = productSlug(item)
  if (!slug) return
  const source =
    ((event?.currentTarget as HTMLElement | null)?.querySelector('img') as HTMLElement | null) ||
    null
  const index = galleryIndex(item)
  const urls = galleryUrls(item)
  const flipSrc = urls[index] || item.imageUrl || null
  if (flipSrc) void prefetchImage(flipSrc)

  // Hold flyer until cart UI has faded; product fetch runs in parallel
  beginFlipOpenGate()
  pdpFocusItemId.value = item.id
  controlsVisible.value = false
  gridLinesVisible.value = false

  // Warm ProductDetail's useAsyncData cache so mount isn't cold
  const cacheKey = `product-detail-${slug}`
  const nuxtApp = useNuxtApp()
  if (nuxtApp.payload.data[cacheKey] == null) {
    void fetchProduct(slug).then((data) => {
      if (data) nuxtApp.payload.data[cacheKey] = data
    })
  }

  open(slug, {
    source,
    imageIndex: index,
    flipSrc,
    bucketItemId: item.id,
  })

  await wait(PDP_CART_FADE_MS)
  releaseFlipOpenGate()
}

watch(returnImage, (value) => {
  if (!value) return
  const targetId =
    value.bucketItemId ||
    items.value.find((item) => productIdFromBucketId(item.id) === value.productId)?.id
  if (!targetId) return
  setItemImageIndex(targetId, value.index)
})

watch(productOverlayOpen, (on) => {
  if (on) return
  pdpFocusItemId.value = null
  // Restore cart chrome if the selection stage is still up underneath
  if (stagePresent.value && stageVisible.value) {
    gridLinesVisible.value = true
    controlsVisible.value = true
  }
})

const selectionTitleLabel = () => activeMoodboard.value?.name || 'My Selection'

const startEdit = () => {
  isEditing.value = true
  nextTick(() => {
    const el = titleInput.value
    if (!el) return
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  })
}

const saveName = () => {
  if (!isEditing.value) return
  const next = (titleInput.value?.innerText || '').replace(/\n/g, ' ').trim()
  if (activeMoodboardId.value && next) {
    renameMoodboard(activeMoodboardId.value, next)
  } else if (titleInput.value) {
    titleInput.value.textContent = selectionTitleLabel()
  }
  isEditing.value = false
}

const cancelEdit = () => {
  if (titleInput.value) titleInput.value.textContent = selectionTitleLabel()
  isEditing.value = false
}

const sendEnquiry = () => {
  if (!items.value.length) return
  openFromBucket(items.value)
}

/** Drop cart stage instantly (moodboard cream already covering). */
const dropStageInstant = async () => {
  controlsVisible.value = false
  gridLinesVisible.value = false
  pileCountVisible.value = true
  stageVisible.value = false
  cellsReady.value = false
  softEnter.value = false
  flipSurface.value = 'pile'
  keepPileForFlip.value = false
  stagePresent.value = false
  unshelveInactiveRail()
  await nextTick()
  resetShelvedRail()
  parkInactiveRailBelow()
}

/** Keep boards cart state while the composer covers it (stage unmounts via v-if). */
const parkBoardsCartForComposer = async () => {
  controlsVisible.value = false
  gridLinesVisible.value = false
  pileCountVisible.value = true
  // Leave stagePresent / stageVisible / cellsReady — remount under cream on close
  unshelveInactiveRail()
  await nextTick()
  resetShelvedRail()
  parkInactiveRailBelow()
}

/** Boards panel — add an empty board to the cart without opening the composer. */
const onCreateBoardInCart = () => {
  createBoard([], [], undefined, undefined, activeMoodboardId.value || undefined)
}

const onBuildMoodboard = async () => {
  // Empty canvas — selections stay in the rail; drag them on when ready
  resetMoodboard()
  createBoard([], [], undefined, undefined, activeMoodboardId.value || undefined)

  if (isOpen.value || stagePresent.value) {
    const fromBoards = panelTab.value === 'boards'
    // Gather Flip while keeping the cream cart backdrop, then hand off to board
    await closeToPile({ handoffBackdrop: true })
    // Reverse open: grid fades in → tools (selection already on rail from selection cart)
    openMoodboard({
      skipBgFade: true,
      reopenCart: true,
      stagedOpen: true,
      enterSelection: fromBoards,
    })
    // Wait until board cream is painted before adjusting the cart stage
    await nextTick()
    await waitFrames(2)
    if (fromBoards) {
      railExiting.value = true
      await parkBoardsCartForComposer()
      await nextTick()
    } else {
      await dropStageInstant()
    }
    await requestMoodboardStagedReveal()
    await finishStagedMoodboardChrome(fromBoards)
    return
  }

  openMoodboard({ reopenCart: true })
}

const openSavedBoard = async (id: string) => {
  const board = boards.value.find((entry) => entry.id === id)
  if (!board) return
  setActiveBoard(id)
  loadBoard(board.placements, board.strokes)

  if (isOpen.value || stagePresent.value) {
    const fromBoards = panelTab.value === 'boards'
    if (fromBoards) {
      await openBoardFromBoardsCart(board)
      return
    }
    await closeToPile({ handoffBackdrop: true })
    openMoodboard({
      skipBgFade: true,
      reopenCart: true,
      stagedOpen: true,
      enterSelection: false,
    })
    await nextTick()
    await waitFrames(2)
    await dropStageInstant()
    await requestMoodboardStagedReveal()
    await finishStagedMoodboardChrome(false)
    return
  }

  openMoodboard({ reopenCart: true })
}

/** Tools + toolbox enter; from boards cart also slides selection pile up (no disperse). */
const finishStagedMoodboardChrome = async (enterSelection: boolean) => {
  consumeMoodboardEnterSelection()
  if (enterSelection) {
    // Stay piled — only translate Y in with the toolbox
    skipMoodboardAutoDisperse.value = true
    railExiting.value = true
    await nextTick()
    await waitFrames(1)
  }
  const chrome = requestMoodboardChromeEnter()
  if (enterSelection) {
    railExiting.value = false
  }
  await chrome
}

const markArriving = (id: string) => {
  if (arrivingIds.value.includes(id)) return
  arrivingIds.value = [...arrivingIds.value, id]
}

const clearArriving = (id: string) => {
  arrivingIds.value = arrivingIds.value.filter((entry) => entry !== id)
}

const measurePileAnchor = () => {
  if (!import.meta.client) return
  const el =
    pileEls.value[activeMoodboardId.value || ''] ||
    pileRef.value
  if (el) {
    pileRef.value = el
    pileAnchor.value = el.getBoundingClientRect()
    return
  }
  // Default bottom-left footprint before the pile mounts (matches one grid cell)
  syncCellSize()
  const size = cellSizePx.value || window.innerWidth / stackCols.value
  pileAnchor.value = new DOMRect(0, window.innerHeight - size, size, size)
}

/** Delay from animation start for a grid index — open: top-right, close: bottom-left. */
const staggerDelayForIndex = (index: number, mode: 'open' | 'close') => {
  const { cols, rows } = gridDims.value
  const row = Math.floor(index / cols)
  const col = index % cols
  const dist =
    mode === 'open'
      ? row + (cols - 1 - col) // distance from top-right
      : rows - 1 - row + col // distance from bottom-left
  return dist * FLIP_STAGGER
}

/** Boards cart — fill from top-left; close toward bottom-right (pile corner). */
const staggerDelayForBoardIndex = (index: number, mode: 'open' | 'close') => {
  const span = boardSpan.value
  const cols = stackCols.value
  const boardsPerRow = Math.max(1, Math.floor(cols / span.cols))
  const row = Math.floor(index / boardsPerRow)
  const col = index % boardsPerRow
  const rows = Math.max(1, Math.ceil(boardsGridEntries.value.length / boardsPerRow))
  const dist =
    mode === 'open'
      ? row + col
      : rows - 1 - row + (boardsPerRow - 1 - col)
  return dist * FLIP_STAGGER
}

const staggerDelayForEl = (
  el: Element,
  mode: 'open' | 'close',
  opts?: { boardStagger?: boolean; ids?: string[] },
) => {
  const id = el.getAttribute('data-flip-id') || ''
  const ids = opts?.ids ?? gridFlipIds.value
  const index = ids.indexOf(id)
  const i = index >= 0 ? index : 0
  if (opts?.boardStagger) return staggerDelayForBoardIndex(i, mode)
  return staggerDelayForIndex(i, mode)
}

const runFlip = (
  state: ReturnType<typeof Flip.getState>,
  targets: ArrayLike<Element>,
  opts?: {
    mode?: 'open' | 'close'
    boardStagger?: boolean
    ids?: string[]
    scale?: boolean
  },
) =>
  new Promise<void>((resolve) => {
    const mode = opts?.mode || 'open'
    const list = Array.from(targets)

    Flip.from(state, {
      targets: list,
      absolute: true,
      absoluteOnLeave: false,
      duration: FLIP_DURATION,
      stagger: (_i: number, target: Element) =>
        staggerDelayForEl(target, mode, {
          boardStagger: opts?.boardStagger,
          ids: opts?.ids,
        }),
      ease: 'power3.inOut',
      fade: false,
      // Selection open/close may use scale; boards keep scale:false for crisp 1px borders
      scale: opts?.scale ?? false,
      // Above cream stage while gathering / dispersing
      zIndex: 260,
      clearProps:
        'transform,top,left,right,bottom,width,height,position,margin,maxWidth,maxHeight',
      onComplete: () => resolve(),
    })
  })

/** Open: fly pile cards (free, unclipped) into each cell — mirrors close. */
const fitPileCardsToCells = (opts?: {
  pile?: HTMLElement | null
  ids?: string[]
  boardStagger?: boolean
}) =>
  new Promise<void>((resolve) => {
    const pile = opts?.pile ?? pileRef.value
    const ids = opts?.ids ?? gridFlipIds.value
    const cards = pile?.querySelectorAll<HTMLElement>('[data-flip-id]')
    if (!cards?.length || !gridRef.value) {
      resolve()
      return
    }

    const cardById = new Map(
      Array.from(cards).map((el) => [el.getAttribute('data-flip-id') || '', el]),
    )

    let pending = 0
    const done = () => {
      pending -= 1
      if (pending <= 0) resolve()
    }

    ids.forEach((id, index) => {
      const card = cardById.get(id)
      const media = gridRef.value?.querySelector<HTMLElement>(
        `[data-stack-id="${CSS.escape(id)}"]`,
      )
      if (!card || !media) return
      pending += 1
      const delay = opts?.boardStagger
        ? staggerDelayForBoardIndex(index, 'open')
        : staggerDelayForIndex(index, 'open')

      // Selection: grow pad 12% → 17% so the image scales down into the grid
      const img = opts?.boardStagger
        ? null
        : card.querySelector<HTMLElement>('.stack__pile-image')
      if (img) {
        gsap.fromTo(
          img,
          { padding: '12%' },
          {
            padding: '17%',
            duration: FLIP_DURATION,
            delay,
            ease: 'power3.inOut',
          },
        )
      }
      Flip.fit(card, media, {
        absolute: true,
        // Boards keep scale:false for crisp 1px borders (same as close)
        scale: !opts?.boardStagger,
        duration: FLIP_DURATION,
        delay,
        ease: 'power3.inOut',
        onComplete: () => {
          if (img) gsap.set(img, { padding: '17%' })
          done()
        },
      })
    })

    if (pending === 0) resolve()
  })

const fadeOutStage = async () => {
  // Backdrop only — grid lines already off; keep stagePresent until fade ends
  controlsVisible.value = false
  gridLinesVisible.value = false
  // Count fades in with the backdrop fade-out
  pileCountVisible.value = true
  stageVisible.value = false
  cellsReady.value = false
  softEnter.value = false
  flipSurface.value = 'pile'
  // Keep rail mounted through the fade; inactive stacks stay parked below
  railExpanded.value = false
  createPlusReady.value = false
  parkInactiveRailBelow()
  await wait(BACKDROP_CLOSE_MS)
  keepPileForFlip.value = false
  stagePresent.value = false
  await nextTick()
  // Clear cart-shelve leftovers, then re-park so multi-rail stays collapsed
  resetShelvedRail()
  parkInactiveRailBelow()
  keepBoardsPileForFlip.value = false
  unlockStackLayout()
  syncCellSize()
}

const revealStage = async () => {
  gridLinesVisible.value = false
  stagePresent.value = true
  await nextTick()
  syncCellSize()
  // Paint backdrop at opacity 0, then fade it in (grid lines stay off)
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      stageVisible.value = true
      resolve()
    })
  })
  await wait(BACKDROP_OPEN_MS)
}

const fadeGridLinesIn = async () => {
  gridLinesVisible.value = true
  await wait(GRID_LINES_MS)
}

const fadeGridLinesOut = async () => {
  gridLinesVisible.value = false
  await wait(GRID_LINES_MS)
}

/** Fade controls in after open has started (later than the backdrop). */
const scheduleControlsFadeIn = () => {
  void wait(CONTROLS_FADE_IN_DELAY_MS).then(() => {
    if (stagePresent.value && stageVisible.value) controlsVisible.value = true
  })
}

const openFromPile = async () => {
  if (!import.meta.client || isOpen.value || isFlipping.value) return
  // Hide name tip for the whole open → close cycle (re-arms on mouse-out after close)
  pileTipLocked.value = true
  railAnimToken += 1
  railExpanded.value = false
  createPlusReady.value = false
  // Lock hover fan so Flip.fit starts from spread positions (no snap-back)
  pileRef.value = pileEls.value[activeMoodboardId.value || ''] || pileRef.value
  pileFanned.value = true
  pileFannedId.value = activeMoodboardId.value
  pileCountVisible.value = false
  isFlipping.value = true
  cellsReady.value = false
  softEnter.value = false
  flipSurface.value = 'pile'
  keepPileForFlip.value = true
  controlsVisible.value = false
  gridLinesVisible.value = false
  scheduleControlsFadeIn()
  // 1) Backdrop fade in — other stacks drop away on the same beat
  shelveInactiveRail()
  await revealStage()
  // 2) Items disperse into cells over plain backdrop
  openDrawer('selections')
  await nextTick()
  syncCellSize()
  await fitPileCardsToCells()
  // 3) Reveal cell media, hide Flip faces in the same beat, then unmount the
  // pile before rebinding flip ids. Ending isFlipping while cards are still
  // visible lets rail CSS (--stack-cell-pad: 12%) flash before the 17% grid.
  cellsReady.value = true
  await nextTick()
  const landed = pileRef.value?.querySelectorAll<HTMLElement>('[data-flip-id]')
  if (landed?.length) gsap.set(landed, { autoAlpha: 0 })
  keepPileForFlip.value = false
  pileFanned.value = false
  await nextTick()
  flipSurface.value = 'cells'
  isFlipping.value = false
  await fadeGridLinesIn()
}

/** Open the boards cart from the bottom-right pile (Flip stack → grid). */
const openFromBoardsPile = async () => {
  if (!import.meta.client || isOpen.value || isFlipping.value) return
  if (!boardsGridEntries.value.some((entry) => entry.kind === 'board')) return

  railAnimToken += 1
  railExpanded.value = false
  createPlusReady.value = false
  // Lock hover fan so Flip.fit starts from spread positions (no snap-back)
  keepBoardsPileForFlip.value = true
  boardsPileFanned.value = true
  pileCountVisible.value = false
  isFlipping.value = true
  cellsReady.value = false
  softEnter.value = false
  flipSurface.value = 'pile'
  controlsVisible.value = false
  gridLinesVisible.value = false
  scheduleControlsFadeIn()
  // 1) Backdrop fade in — other stacks drop away on the same beat
  shelveInactiveRail()
  panelTab.value = 'boards'
  await revealStage()
  // 2) Boards disperse into cells over plain backdrop
  openDrawer('boards')
  await nextTick()
  lockStackLayout()
  syncCellSize()
  await fitPileCardsToCells({
    pile: boardsPileRef.value,
    ids: boardsGridFlipIds.value,
    boardStagger: true,
  })
  // 3) Open handoff: hide Flip cards → show cells in the same paint.
  //    Rail CSS (--cells-ready) drops the whole Flip layer even while --flipping.
  const landed = boardsPileRef.value?.querySelectorAll<HTMLElement>('[data-flip-id]')
  if (landed?.length) gsap.set(landed, { autoAlpha: 0 })
  cellsReady.value = true
  await nextTick()
  keepBoardsPileForFlip.value = false
  boardsPileFanned.value = false
  await nextTick()
  flipSurface.value = 'cells'
  isFlipping.value = false
  // Rail is opacity 0 — safe to strip Flip leftovers for close later
  sanitizeBoardsPileCards()
  const hidden = boardsPileRef.value?.querySelectorAll<HTMLElement>(
    '.stack__pile-card--board',
  )
  if (hidden?.length) gsap.set(hidden, { autoAlpha: 0 })
  // Keep layout locked while cart is open — unlocking here reflows landed thumbs
  await fadeGridLinesIn()
}

const BOARD_FLIP_MS = 700
const BOARDS_FADE_MS = 400
const STACK_EXIT_MS = 450

/** After restack — slide selection rail off the bottom. */
const exitSelectionStack = async () => {
  if (!showRail.value) return
  railExiting.value = true
  await wait(STACK_EXIT_MS)
}

/**
 * Boards → Board open (reverse of close):
 * fade peers + grid → Flip screenshot up → moodboard grid → tools + selection pile.
 */
const openBoardFromBoardsCart = async (board: {
  id: string
  preview?: string | null
}) => {
  if (!import.meta.client) return

  controlsVisible.value = false
  boardsGridHandoff.value = false
  landingBoardId.value = board.id
  boardsLanded.value = true
  // Fade out other boards + grid lines before the selected thumb lifts
  boardsGridIntro.value = true
  await Promise.all([fadeGridLinesOut(), wait(BOARDS_FADE_MS)])

  const face = document.querySelector(
    `[data-stack-id="${CSS.escape(boardFlipId(board.id))}"] .stack__cell-figure--board`,
  ) as HTMLElement | null
  const from = face?.getBoundingClientRect()

  let flyer: HTMLElement | null = null
  if (from && from.width > 2) {
    flyer = document.createElement(board.preview ? 'img' : 'div')
    flyer.className = 'stack__board-close-flyer'
    if (board.preview && flyer instanceof HTMLImageElement) {
      flyer.src = board.preview
      flyer.alt = ''
    }
    Object.assign(flyer.style, {
      position: 'fixed',
      left: `${from.left}px`,
      top: `${from.top}px`,
      width: `${from.width}px`,
      height: `${from.height}px`,
      zIndex: '360',
      margin: '0',
      padding: '0',
      objectFit: 'contain',
      boxSizing: 'border-box',
      pointerEvents: 'none',
      border: '1px solid currentColor',
      background: 'var(--cream, #F1EDE4)',
      color: 'var(--charcoal, #1a1a1a)',
    })
    document.body.appendChild(flyer)
    // Hide selected cell under the flyer
    boardsLanded.value = false
  }

  // Selection starts parked below; slides up with tools after grid
  railExiting.value = true
  openMoodboard({
    skipBgFade: true,
    reopenCart: true,
    stagedOpen: true,
    enterSelection: true,
  })
  await nextTick()
  await waitFrames(2)

  const canvas = document.querySelector('.moodboard__canvas') as HTMLElement | null
  const to = canvas?.getBoundingClientRect()

  if (flyer && to && to.width > 2) {
    await new Promise<void>((resolve) => {
      gsap.to(flyer!, {
        left: to.left,
        top: to.top,
        width: to.width,
        height: to.height,
        duration: BOARD_FLIP_MS / 1000,
        ease: 'power3.inOut',
        onComplete: () => resolve(),
      })
    })
  }

  // Composer cream ready under flyer — drop boards cart chrome, then grid fade
  await parkBoardsCartForComposer()
  boardsGridIntro.value = false
  boardsLanded.value = false
  landingBoardId.value = null

  // Reveal items + grid under flyer, then remove flyer
  await requestMoodboardStagedReveal()
  flyer?.remove()

  await finishStagedMoodboardChrome(true)
}

/** Ensure boards cart stage is up under the composer, peers hidden. */
const mountBoardsCartIntro = async (boardId: string | null) => {
  panelTab.value = 'boards'
  boardsCartRevealing.value = true
  boardsGridHandoff.value = true
  boardsGridIntro.value = true
  boardsLanded.value = false
  landingBoardId.value = boardId
  controlsVisible.value = false
  gridLinesVisible.value = false
  softEnter.value = false
  keepBoardsPileForFlip.value = false
  flipSurface.value = 'cells'
  stagePresent.value = true
  stageVisible.value = true
  cellsReady.value = true
  openDrawer('boards')
  await nextTick()
  await waitFrames(2)
  syncCellSize()
  await nextTick()
}

/**
 * Close choreography (after chrome has exited):
 * boards grid ready (peers hidden) → park flyer → clear cream → Flip in → fade peers → toolbox.
 */
const closeMoodboardToBoardsCart = async (opts: {
  boardId: string | null
  preview: string | null
  from: { left: number; top: number; width: number; height: number } | null
  beforeFlip?: () => void | Promise<void>
  afterLand?: () => void | Promise<void>
}) => {
  if (!import.meta.client) return
  await mountBoardsCartIntro(opts.boardId)

  // Park flyer above cream so the board stays visible as cream lifts
  let flyer: HTMLElement | null = null
  if (opts.from && opts.boardId) {
    flyer = document.createElement(opts.preview ? 'img' : 'div')
    flyer.className = 'stack__board-close-flyer'
    if (opts.preview && flyer instanceof HTMLImageElement) {
      flyer.src = opts.preview
      flyer.alt = ''
    }
    Object.assign(flyer.style, {
      position: 'fixed',
      left: `${opts.from.left}px`,
      top: `${opts.from.top}px`,
      width: `${opts.from.width}px`,
      height: `${opts.from.height}px`,
      zIndex: '360',
      margin: '0',
      padding: '0',
      objectFit: 'contain',
      boxSizing: 'border-box',
      pointerEvents: 'none',
      border: '1px solid currentColor',
      background: 'var(--cream, #F1EDE4)',
      color: 'var(--charcoal, #1a1a1a)',
    })
    document.body.appendChild(flyer)
  }

  if (opts.beforeFlip) await opts.beforeFlip()

  const target = opts.boardId
    ? (document.querySelector(
        `[data-stack-id="${CSS.escape(boardFlipId(opts.boardId))}"] .stack__cell-figure--board`,
      ) as HTMLElement | null)
    : null
  const to = target?.getBoundingClientRect()

  if (flyer && to && to.width > 2) {
    await new Promise<void>((resolve) => {
      gsap.to(flyer!, {
        left: to.left,
        top: to.top,
        width: to.width,
        height: to.height,
        duration: BOARD_FLIP_MS / 1000,
        ease: 'power3.inOut',
        onComplete: () => resolve(),
      })
    })
  }

  // Paint landing thumb at full opacity under the flyer before removing it
  boardsLanded.value = true
  await nextTick()
  await waitFrames(2)

  // Peer + grid fade in while flyer still covers the landing cell
  boardsGridHandoff.value = false
  boardsGridIntro.value = false
  await nextTick()
  await waitFrames(1)

  if (flyer) {
    await new Promise<void>((resolve) => {
      gsap.to(flyer!, {
        autoAlpha: 0,
        duration: 0.12,
        ease: 'power1.out',
        onComplete: () => {
          flyer?.remove()
          resolve()
        },
      })
    })
  }

  boardsLanded.value = false
  landingBoardId.value = null

  // Composer off now that the grid cell owns the thumb (keep boardsCartRevealing
  // so the selection rail can’t flash over the cart).
  if (opts.afterLand) await opts.afterLand()

  // Wait for peers to finish fading, then toolbox slides up — no extra delay
  await Promise.all([fadeGridLinesIn(), wait(BOARDS_FADE_MS)])
  controlsVisible.value = true
  await wait(450)
  boardsCartRevealing.value = false
  railExiting.value = false
}

/** Fallback when close sequence wasn’t used — restore boards cart. */
const returnToBoardsCart = async () => {
  if (!import.meta.client || isFlipping.value) return

  panelTab.value = 'boards'
  boardsCartRevealing.value = false
  boardsGridIntro.value = false
  boardsLanded.value = false
  boardsGridHandoff.value = false
  landingBoardId.value = null
  railExiting.value = false

  if (stagePresent.value && stageVisible.value) {
    openDrawer('boards')
    flipSurface.value = 'cells'
    cellsReady.value = true
    softEnter.value = false
    keepBoardsPileForFlip.value = false
    await nextTick()
    scheduleControlsFadeIn()
    await fadeGridLinesIn()
    return
  }

  if (isOpen.value && panelTab.value === 'boards' && stagePresent.value) return

  await nextTick()
  await waitFrames(2)

  if (boardsGridEntries.value.some((entry) => entry.kind === 'board')) {
    await openFromBoardsPile()
    return
  }

  railAnimToken += 1
  railExpanded.value = false
  createPlusReady.value = false
  controlsVisible.value = false
  gridLinesVisible.value = false
  cellsReady.value = false
  softEnter.value = false
  scheduleControlsFadeIn()
  shelveInactiveRail()
  panelTab.value = 'boards'
  await revealStage()
  openDrawer('boards')
  cellsReady.value = true
  await fadeGridLinesIn()
}

const settlePendingRemovals = () => {
  clearPendingRemovals()
  clearPendingBoardRemovals()
}

const finishClose = async () => {
  await fadeOutStage()
  clearAllCellPhases()
  settlePendingRemovals()
  dismissDrawer()
}

const closeToPile = async (opts?: { handoffBackdrop?: boolean }) => {
  const handoff = !!opts?.handoffBackdrop
  const hasFlipContent = items.value.length > 0

  if (!import.meta.client || isFlipping.value) {
    clearAllCellPhases()
    settlePendingRemovals()
    dismissDrawer()
    controlsVisible.value = false
    gridLinesVisible.value = false
    if (!handoff) {
      stageVisible.value = false
      stagePresent.value = false
    }
    cellsReady.value = false
    flipSurface.value = 'pile'
    keepPileForFlip.value = handoff
    keepBoardsPileForFlip.value = false
    unlockStackLayout()
    pileCountVisible.value = true
    return
  }
  if (!isOpen.value) {
    if (handoff && stagePresent.value) {
      clearAllCellPhases()
      settlePendingRemovals()
      return
    }
    await finishClose()
    return
  }
  if (panelTab.value === 'boards') {
    void wait(CONTROLS_FADE_OUT_DELAY_MS).then(() => {
      controlsVisible.value = false
    })
    await fadeGridLinesOut()
    if (handoff) {
      clearAllCellPhases()
      settlePendingRemovals()
      dismissDrawer()
      return
    }
    if (!boardsGridEntries.value.some((entry) => entry.kind === 'board')) {
      keepPileForFlip.value = true
      dismissDrawer()
      await nextTick()
      parkInactiveRailBelow()
      await finishClose()
      return
    }

    syncCellSize()
    const medias = gridRef.value?.querySelectorAll(
      '.stack__cell-media[data-flip-id]',
    )
    const state = medias?.length ? Flip.getState(medias) : null
    lockStackLayout()
    // Flip on first so "Empty board" labels fade out with the grid (cells still up)
    isFlipping.value = true
    const hasEmptyBoardLabel = boardsGridEntries.value.some(
      (entry) => entry.kind === 'board' && !entry.board.preview,
    )
    if (hasEmptyBoardLabel) await wait(350)
    cellsReady.value = false
    flipSurface.value = 'pile'
    keepBoardsPileForFlip.value = true
    boardsPileFanned.value = false
    dismissDrawer()
    await nextTick()
    await nextTick()

    const cards = boardsPileRef.value?.querySelectorAll('[data-flip-id]')
    if (state && cards?.length) {
      // Undo open-handoff hide so Flip.from can drive the cards
      gsap.set(cards, { clearProps: 'opacity,visibility' })
      await runFlip(state, cards, {
        mode: 'close',
        boardStagger: true,
        ids: boardsGridFlipIds.value,
        scale: false,
      })
      // Don’t sanitize here — clearing transforms while visible flashes the restack
    }

    // Selection rail under cream only after Flip has landed
    keepPileForFlip.value = true
    await nextTick()
    parkInactiveRailBelow()

    // Keep --flipping through backdrop fade (pile stays above cream, no z-index pop)
    await fadeOutStage()
    isFlipping.value = false
    // Stage gone — strip Flip leftovers for CSS hover transitions
    sanitizeBoardsPileCards()
    clearAllCellPhases()
    settlePendingRemovals()
    return
  }

  if (panelTab.value !== 'selections' || !selectionEntries.value.length) {
    if (handoff) {
      clearAllCellPhases()
      settlePendingRemovals()
      dismissDrawer()
      return
    }
    await finishClose()
    return
  }

  // Controls fade out shortly after click — before the backdrop
  void wait(CONTROLS_FADE_OUT_DELAY_MS).then(() => {
    controlsVisible.value = false
  })

  // 1) Grid lines out first so items don’t travel over them
  await fadeGridLinesOut()

  // Only undo placeholders left — already faded with grid lines
  if (!hasFlipContent) {
    if (handoff) {
      clearAllCellPhases()
      settlePendingRemovals()
      dismissDrawer()
      return
    }
    await finishClose()
    return
  }

  syncCellSize()
  const medias = gridRef.value?.querySelectorAll('.stack__cell-media[data-flip-id]')
  const state = medias?.length ? Flip.getState(medias) : null
  isFlipping.value = true
  cellsReady.value = false
  // Hand flip ids to pile and remount the rail (hidden while cart is open)
  flipSurface.value = 'pile'
  keepPileForFlip.value = true
  dismissDrawer()
  await nextTick()
  await nextTick()
  parkInactiveRail()
  pileRef.value = pileEls.value[activeMoodboardId.value || ''] || pileRef.value
  const cards = pileRef.value?.querySelectorAll('[data-flip-id]')
  if (state && cards?.length) {
    // Shrink pad 17% → 12% while gathering so images grow back into the stack
    cards.forEach((card) => {
      const img = (card as HTMLElement).querySelector<HTMLElement>(
        '.stack__pile-image',
      )
      if (!img) return
      const id = (card as HTMLElement).getAttribute('data-flip-id') || ''
      const index = Math.max(0, gridFlipIds.value.indexOf(id))
      gsap.fromTo(
        img,
        { padding: '17%' },
        {
          padding: '12%',
          duration: FLIP_DURATION,
          delay: staggerDelayForIndex(index, 'close'),
          ease: 'power3.inOut',
        },
      )
    })
    // 2) Items gather back to the pile
    await runFlip(state, cards, { mode: 'close' })
    // Drop Flip inline transforms so CSS pile vars own the pose again
    gsap.set(cards, {
      clearProps: 'transform,top,left,right,bottom,width,height,position,margin',
    })
    gsap.set(
      Array.from(cards).flatMap((card) =>
        Array.from(
          (card as HTMLElement).querySelectorAll<HTMLElement>('.stack__pile-image'),
        ),
      ),
      { clearProps: 'padding' },
    )
    void pileRef.value?.offsetHeight
  }
  // Re-enable CSS transitions before backdrop fade — otherwise a hover during
  // fade applies the fan with transition:none and it “pops” on next hover too
  isFlipping.value = false
  await syncPileFanFromHover()

  if (handoff) {
    // Keep cream stage up — moodboard mounts on top with the same bg
    clearAllCellPhases()
    settlePendingRemovals()
    return
  }

  // 3) Backdrop fade out (undos already left with the grid lines)
  await fadeOutStage()
  clearAllCellPhases()
  settlePendingRemovals()
}

const requestClose = () => {
  void closeToPile()
}

type FlyPayload = NonNullable<ReturnType<typeof consumePendingFly>>

const flyIntoPile = (payload: FlyPayload) => {
  if (!import.meta.client) {
    clearArriving(payload.itemId)
    pileLandingId.value = null
    return
  }
  measurePileAnchor()
  const dest = pileAnchor.value
  if (!dest) {
    clearArriving(payload.itemId)
    pileLandingId.value = null
    if (payload.source) {
      payload.source.style.removeProperty('opacity')
      payload.source.style.removeProperty('transition')
      payload.source.removeAttribute('data-bucket-fly')
    }
    return
  }

  const source = payload.source
  // Keep original hidden instantly (no fade-out) while the flyer travels
  if (source) {
    source.setAttribute('data-bucket-fly', payload.itemId)
    source.style.setProperty('transition', 'none')
    source.style.setProperty('opacity', '0')
  }

  // Match pile card structure (full cell + padded image) so handoff doesn’t pop size
  const wrap = document.createElement('div')
  Object.assign(wrap.style, {
    position: 'fixed',
    left: `${payload.from.left}px`,
    top: `${payload.from.top}px`,
    width: `${payload.from.width}px`,
    height: `${payload.from.height}px`,
    zIndex: '400',
    pointerEvents: 'none',
    margin: '0',
    overflow: 'hidden',
    transformOrigin: 'center center',
    boxSizing: 'border-box',
  })
  const flyerImg = document.createElement('img')
  flyerImg.src = payload.imageUrl
  flyerImg.alt = ''
  flyerImg.setAttribute('aria-hidden', 'true')
  Object.assign(flyerImg.style, {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    objectPosition: 'center',
    padding: '0px',
    boxSizing: 'border-box',
    display: 'block',
    margin: '0',
    border: '0',
  })
  wrap.appendChild(flyerImg)
  document.body.appendChild(wrap)

  const destSize = Math.min(dest.width, dest.height)
  const CELL_PAD = readStackCellPad(destSize)
  const destLeft = dest.left
  const destTop = dest.top

  // Playful arch: rise, overshoot into the pile, then settle with inertia
  const midX = payload.from.left + (destLeft - payload.from.left) * 0.45
  const midY = Math.min(payload.from.top, destTop) - Math.min(140, window.innerHeight * 0.18)
  const landRot = hashAngle(payload.itemId)
  const overshootRot = landRot + (landRot === 0 ? -5 : Math.sign(landRot) * 5)

  const resolveFlySource = () => {
    if (source && document.contains(source)) return source
    return document.querySelector(
      `img[data-bucket-fly="${CSS.escape(payload.itemId)}"]`,
    ) as HTMLElement | null
  }

  /** Native CSS fade — GSAP opacity tweens fight `transition: opacity` on the thumb. */
  const fadeSourceBack = () => {
    // PDP: restore full opacity. Grid thumbs: settle at 0.1 (hover brings them back).
    const targetOpacity = productOverlayOpen.value ? '1' : '0.1'
    window.setTimeout(() => {
      const el = resolveFlySource()
      if (!el) return
      gsap.killTweensOf(el)
      el.style.setProperty('transition', 'opacity 2s ease')
      el.style.setProperty('opacity', '0')
      void el.offsetWidth
      el.style.setProperty('opacity', targetOpacity)
      const handoff = () => {
        el.style.removeProperty('transition')
        el.style.removeProperty('opacity')
        el.removeAttribute('data-bucket-fly')
      }
      const onEnd = (e: TransitionEvent) => {
        if (e.propertyName !== 'opacity') return
        el.removeEventListener('transitionend', onEnd)
        handoff()
      }
      el.addEventListener('transitionend', onEnd)
      window.setTimeout(() => {
        el.removeEventListener('transitionend', onEnd)
        handoff()
      }, 2200)
    }, 550)
  }

  // Top card rest offset (matches pileCardStyle) so the swap lines up.
  // settledItems already includes the arriving card (hidden via CSS).
  const nextTotal = Math.max(settledItems.value.length, 1)
  const topT = nextTotal <= 1 ? 0 : 1
  const landLeft = destLeft + (topT - 0.5) * 10
  const landTop = destTop + (0.5 - topT) * 6

  gsap
    .timeline({
      onComplete: async () => {
        // Reveal pile card at its final pose (landing id still set → top tilt stable)
        clearArriving(payload.itemId)
        await nextTick()
        // Salt already committed at thud — clearing landing must not reshuffle
        pileLandingId.value = null
        wrap.remove()
        fadeSourceBack()
      },
    })
    .to(wrap, {
      // Rise — keep source size
      left: midX,
      top: midY,
      rotate: landRot * 0.45,
      duration: 0.32,
      ease: 'power2.out',
    })
    .to(
      wrap,
      {
        // Mid-flight: cell footprint + dive
        left: landLeft,
        top: landTop + 4,
        width: destSize,
        height: destSize,
        rotate: overshootRot,
        duration: 0.4,
        ease: 'power2.inOut',
      },
      'dive',
    )
    .to(
      flyerImg,
      {
        // Match .stack__pile-image padding so the bitmap matches the landed card
        padding: CELL_PAD,
        duration: 0.4,
        ease: 'power2.inOut',
      },
      'dive',
    )
    // Hit a touch early so the pile thump leads the flyer settle
    .call(
      () => {
        pileLandingId.value = payload.itemId
        bumpPileImpact()
      },
      undefined,
      'dive+=0.3',
    )
    .to(wrap, {
      // Settle — position + rotation only (size/padding already final)
      left: landLeft,
      top: landTop,
      rotate: landRot,
      duration: 0.48,
      ease: 'power3.out',
    })
}

watch(
  pendingFly,
  (payload) => {
    if (!payload) return
    const next = consumePendingFly()
    if (!next) return
    markArriving(next.itemId)
    nextTick(() => flyIntoPile(next))
  },
)

watch(isOpen, async (open) => {
  if (!import.meta.client) return
  document.documentElement.classList.toggle(
    'bucket-stack-open',
    open || stagePresent.value,
  )
  if (!open) {
    isEditing.value = false
    softEnter.value = false
    return
  }
  // Flip opens own the sequence — skip soft-enter path
  if (isFlipping.value) return
  // Stage already up (parked under board composer / remount) — don’t reset
  if (stagePresent.value && stageVisible.value) return

  // Header / non-Flip open: backdrop → items → grid lines
  pileCountVisible.value = false
  cellsReady.value = false
  softEnter.value = false
  controlsVisible.value = false
  gridLinesVisible.value = false
  flipSurface.value = 'cells'
  scheduleControlsFadeIn()
  await revealStage()
  if (!isOpen.value || isFlipping.value) return
  cellsReady.value = true
  softEnter.value = true
  await fadeGridLinesIn()
})

watch(stagePresent, (present) => {
  if (!import.meta.client) return
  document.documentElement.classList.toggle(
    'bucket-stack-open',
    present || isOpen.value,
  )
  // Nested with PDP / board scroll locks — closing cart won’t unlock
  // while openMoodboard still holds a lock.
  if (present) lockPageScroll()
  else unlockPageScroll()
})

watch(activeMoodboardId, () => {
  isEditing.value = false
})

watch(isMoodboard, (on) => {
  // Page scroll lock is owned by openMoodboard / closeMoodboard
  if (!on) {
    expandedBoardIds.value = []
    preparingBoardId.value = null
    columnReturningId.value = null
    restackingBoardId.value = null
  } else {
    syncRailOrder(true)
    nextTick(() => parkInactiveRailBelow())
  }
})

watch(showBoardsRail, (show) => {
  if (!import.meta.client) return
  document.documentElement.style.setProperty(
    '--boards-rail-push',
    show ? 'var(--stack-cell-size, 0px)' : '0px',
  )
})

/** After board bg + info panel fade in, open this selection’s column. */
watch(moodboardSurfaceReady, async (ready) => {
  if (!ready || !import.meta.client) return
  if (skipMoodboardAutoDisperse.value) {
    skipMoodboardAutoDisperse.value = false
    return
  }
  const id = activeMoodboardId.value
  if (!id) return
  const board = moodboards.value.find((entry) => entry.id === id)
  if (!board?.items.length) return
  if (expandedBoardIds.value.includes(id)) return
  await nextTick()
  await waitFrames(2)
  await disperseBoard(id)
})

watch(showSelectionGrid, async (show) => {
  if (!show || !import.meta.client) return
  await nextTick()
  syncCellSize()
})

watch(showBoardsGrid, async (show) => {
  if (!show || !import.meta.client) return
  await nextTick()
  syncCellSize()
})

let cellRo: ResizeObserver | null = null

watch(
  gridRef,
  (el, prev) => {
    if (!import.meta.client || typeof ResizeObserver === 'undefined') return
    if (!cellRo) {
      cellRo = new ResizeObserver(() => syncCellSize())
    }
    if (prev) cellRo.unobserve(prev)
    if (el) {
      cellRo.observe(el)
      syncCellSize()
    }
  },
  { flush: 'post' },
)

const onWinResize = () => {
  syncCellSize()
  syncAllColumnLayouts()
}

watch(
  moodboards,
  () => {
    const source = isMoodboard.value
      ? moodboards.value.filter((board) => board.items.length > 0)
      : moodboards.value
    if (railExpanded.value) {
      // Append any brand-new boards without reshuffling mid-expand
      const known = new Set(railOrderIds.value)
      for (const board of source) {
        if (!known.has(board.id)) railOrderIds.value = [...railOrderIds.value, board.id]
      }
      railOrderIds.value = railOrderIds.value.filter((id) =>
        source.some((board) => board.id === id),
      )
      return
    }
    syncRailOrder(true)
  },
  { deep: true, immediate: true },
)

watch(
  [railBoards, showRail],
  async () => {
    if (!import.meta.client || !showRail.value) return
    if (
      railExpanded.value ||
      railHoldOpen.value ||
      isOpen.value ||
      stagePresent.value
    ) {
      return
    }
    await nextTick()
    parkInactiveRailBelow()
  },
  { flush: 'post' },
)

/** Nav heart — same open path as clicking the active selection stack. */
const openSelectionStackFromNav = () => {
  if (isMoodboard.value || isFlipping.value) return
  if (isOpen.value && panelTab.value === 'selections') {
    void closeToPile()
    return
  }
  if (isOpen.value || stagePresent.value) return
  const id = activeMoodboardId.value
  if (!id) return
  const board = moodboards.value.find((entry) => entry.id === id)
  // Match pile click: only Flip-open when the active selection has items
  if (!board?.items.length) return
  setActiveMoodboard(id)
  pileRef.value = pileEls.value[id] || pileRef.value
  void openFromPile()
}

/** Nav heart hover — fan the active pile (same pose Flip open starts from). */
const onNavHeartEnter = () => {
  navHeartHot.value = true
  if (
    isFlipping.value ||
    isOpen.value ||
    stagePresent.value ||
    isMoodboard.value
  ) {
    return
  }
  const id = activeMoodboardId.value
  if (!id) return
  const board = moodboards.value.find((entry) => entry.id === id)
  if (!board?.items.length) return
  pileFanSeed.value += 1
  pileFannedId.value = id
  pileFanned.value = true
}

const onNavHeartLeave = () => {
  navHeartHot.value = false
  // Keep fanned while opening so Flip reads the spread positions
  if (isFlipping.value || keepPileForFlip.value) return
  if (pileFannedId.value && pileFannedId.value === activeMoodboardId.value) {
    pileFannedId.value = null
    pileFanned.value = false
  }
}

onMounted(() => {
  registerAnimatedClose(() => {
    void closeToPile()
  })
  registerAnimatedOpen(() => {
    openSelectionStackFromNav()
  })
  registerSelectionStackHover({
    enter: onNavHeartEnter,
    leave: onNavHeartLeave,
  })
  registerMoodboardRestack(async () => {
    const ids = [...expandedBoardIds.value]
    await Promise.all(ids.map((id) => restackBoard(id)))
  })
  registerMoodboardReturnToColumn((opts) => returnItemToColumn(opts))
  registerMoodboardStackExit(() => exitSelectionStack())
  registerMoodboardCloseToBoards((opts) => closeMoodboardToBoardsCart(opts))
  registerMoodboardCloseReturn(() => returnToBoardsCart())
  if (import.meta.client) {
    syncCellSize()
    window.addEventListener('resize', onWinResize)
    nextTick(() => {
      parkInactiveRailBelow()
    })
  }
})

onBeforeUnmount(() => {
  registerAnimatedClose(null)
  registerAnimatedOpen(null)
  registerSelectionStackHover(null)
  registerMoodboardRestack(null)
  registerMoodboardReturnToColumn(null)
  registerMoodboardStackExit(null)
  registerMoodboardCloseToBoards(null)
  registerMoodboardCloseReturn(null)
  cellRo?.disconnect()
  cellRo = null
  clearColumnPointerListeners()
  destroyColumnGhost()
  if (import.meta.client) {
    window.removeEventListener('resize', onWinResize)
    document.documentElement.classList.remove('bucket-stack-open')
    document.documentElement.classList.remove('stack-column-dragging')
    if (stagePresent.value) unlockPageScroll()
    // Board lock is owned by closeMoodboard — only unlock here if the
    // composer was left open while this component tears down.
    if (isMoodboard.value) unlockPageScroll()
  }
})
</script>

<style scoped>
.stack {
  /* Cart grid default — selection cells use 17% inset */
  --stack-cell-pad: 17%;
  position: fixed;
  inset: 0;
  z-index: 200;
  pointer-events: none;
  overflow: visible;
}

/* Pile / boards stack — looser pad; Flip animates padding up to 17% into the grid */
.stack__rail,
.stack__boards-rail {
  --stack-cell-pad: 12%;
}

.stack--open {
  z-index: 280;
}

/* Selection rail above ProductOverlay (320); boards rail is a sibling under it */
.stack--above-pdp {
  z-index: 340;
}

.stack--moodboard {
  z-index: 310; /* above MoodboardCanvas (300) — selection rail over the board */
}

/* Boards cart cream sitting under the fading composer cream */
.stack--boards-revealing {
  z-index: 280;
}

.stack--boards-revealing .stack__backdrop {
  opacity: 1 !important;
  transition: none !important;
}

.stack__cell--board .stack__cell-media {
  transition: opacity 0.4s ease;
}

/* Open handoff: cells must appear instantly under Flip cards (no 0.4s fade gap) */
.stack--flipping.stack--boards-cart .stack__cell--board .stack__cell-media {
  transition: none !important;
}

/* Peers hidden during open outro / close intro — animate unless handoff */
.stack--boards-intro .stack__cell--board .stack__cell-media {
  opacity: 0;
}

.stack--boards-intro.stack--boards-landed
  .stack__cell--board-landing
  .stack__cell-media {
  opacity: 1;
}

/* Close mount + flyer handoff: no opacity tween (avoids empty-cell flash) */
.stack--boards-handoff.stack--boards-intro .stack__cell--board .stack__cell-media,
.stack--boards-handoff.stack--boards-intro.stack--boards-landed
  .stack__cell--board-landing
  .stack__cell-media {
  transition: none;
}

.stack__rail--exiting {
  transform: translateY(calc(100% + 2rem));
  opacity: 0;
  pointer-events: none;
  transition:
    transform 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.35s ease;
}

.stack__rail {
  position: fixed;
  left: 0;
  bottom: 0;
  z-index: 210;
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 0;
  pointer-events: none;
  overflow: visible;
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease;
}

/* Boards pile — sibling of .stack so PDP (320) can cover it */
.stack__boards-rail {
  position: fixed;
  right: 0;
  bottom: 0;
  z-index: 210;
  display: flex;
  flex-direction: row-reverse;
  align-items: flex-end;
  gap: 0;
  pointer-events: none;
  overflow: visible;
}

/*
 * Boards cart: stage (inside .stack--open at 280) covers the pile while viewing;
 * pile rises above for Flip landings.
 */
.stack--boards-cart .stack__rail {
  z-index: 200;
}

.stack--boards-cart .stack__stage {
  z-index: 220;
}

.stack__boards-rail--cart:not(.stack__boards-rail--flipping) {
  z-index: 270;
}

/*
 * Open handoff: hide the Flip pile the moment cells are ready — even while
 * --flipping is still on. Otherwise Flip cards sit over the new grid for a beat.
 */
.stack__boards-rail--cart.stack__boards-rail--cells-ready {
  opacity: 0;
  pointer-events: none;
}

.stack__boards-rail--flipping:not(.stack__boards-rail--cells-ready) {
  z-index: 290;
  opacity: 1;
  pointer-events: none;
}

.stack__boards-rail .stack__pile-wrap {
  pointer-events: auto;
}

.stack__pile-wrap--board {
  position: relative;
}

/* Centered over the boards pile — fades with cart open / close */
.stack__boards-label {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 30;
  margin: 0;
  padding: 0.35rem 0.65rem;
  border: 0;
  border-radius: 6px;
  background: var(--text-color);
  color: var(--background-color);
  font-family: var(--serif);
  font-size: 16px;
  line-height: 1.2;
  letter-spacing: 0.01em;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transform: translate(-50%, -50%);
  transition: opacity 0.32s ease;
}

:global(html.dark) .stack__boards-label {
  background: color-mix(in srgb, var(--background-color) 88%, transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: var(--text-color);
}

.stack__boards-label--visible {
  opacity: 1;
}

.stack__pile-card--board {
  /* Full pile cell footprint — Flip.fit / Flip.from drive this card like selection */
  left: 0;
  top: 0;
  right: auto;
  bottom: auto;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  aspect-ratio: auto;
  background: transparent;
  box-shadow: none;
  /* Explicit — don’t rely on later .stack__pile-card rule winning after Flip */
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Same aspect as grid board face — letterboxed inside the Flip card */
.stack__pile-board-face {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(100% - 2 * var(--stack-cell-pad, 17%));
  max-height: calc(100% - 2 * var(--stack-cell-pad, 17%));
  aspect-ratio: var(--board-aspect, 16 / 9);
  transform: translate(-50%, -50%);
  overflow: hidden;
  /* Never show through the stack — cream behind letterboxed previews */
  background: var(--cream, var(--background-color, #f1ede4));
  box-sizing: border-box;
  border: 1px solid currentColor;
}

.stack__pile-board-face--empty {
  background: color-mix(in srgb, var(--background-color) 55%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

:global(html.dark) .stack__pile-board-face--empty {
  background: color-mix(in srgb, var(--background-color) 72%, transparent);
}

.stack__pile-board-face .stack__pile-image--board {
  width: 100%;
  height: 100%;
  padding: 0;
  object-fit: contain;
  background: transparent;
}

.stack__pile-board-face .stack__board-pile-label {
  width: 100%;
  height: 100%;
}

.stack__board-pile-label {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 0.5rem;
  box-sizing: border-box;
  text-align: center;
  font-size: var(--text-xs);
  color: var(--charcoal);
}

.stack__pile-wrap {
  position: relative;
  width: var(--stack-cell-size);
  height: var(--stack-cell-size);
  flex: 0 0 auto;
  pointer-events: auto;
  overflow: visible;
}

/* Collapsed multi-rail: inactive wraps take no space (GSAP parks them below) */
.stack__pile-wrap--parked {
  pointer-events: none !important;
}

.stack__pile-empty {
  /* 67% of the image content box (33% smaller), centered in the cell */
  --stack-empty-size: calc((100% - 2 * var(--stack-cell-pad, 17%)) * 0.67);
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  width: var(--stack-empty-size);
  height: var(--stack-empty-size);
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  border-radius: 18px;
  border: 1px dashed color-mix(in srgb, var(--charcoal) 45%, transparent);
  background: color-mix(in srgb, var(--background-color) 20%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  pointer-events: auto;
  cursor: pointer;
}

.stack__pile-empty-remove {
  position: absolute;
  top: 5px;
  right: 5px;
  left: auto;
  z-index: 2;
  width: 1.35rem;
  height: 1.35rem;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: color-mix(in srgb, var(--background-color) 72%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.18s ease;
}

/* Inactive empty slots: show × on hover only. Active empty: never (can’t delete the receiving stack). */
.stack__pile-wrap:not(.stack__pile-wrap--receiving)
  .stack__pile-empty:hover
  .stack__pile-empty-remove {
  opacity: 1;
}

.stack__pile-empty-x {
  position: relative;
  width: 12px;
  height: 12px;
}

.stack__pile-empty-bar {
  position: absolute;
  left: 0;
  top: 50%;
  width: 12px;
  height: 1px;
  margin-top: -0.5px;
  background: var(--charcoal);
  transform-origin: center center;
}

.stack__pile-empty-bar:first-child {
  transform: rotate(45deg);
}

.stack__pile-empty-bar:last-child {
  transform: rotate(-45deg);
}

.stack__pile {
  position: absolute;
  inset: 0;
  z-index: 2;
  /* Same footprint as one open-grid cell so Flip keeps image size */
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: auto;
  border: 0;
  background: transparent;
  cursor: pointer;
  will-change: transform;
  padding: 0;
}

/* Expand hit area for fanned cards — leave the right edge clear for the (+) */
.stack__pile::after {
  content: '';
  position: absolute;
  inset: -48px 0 -80px -56px;
}

/* Above stage backdrop/grid, below controls (selection Flip).
 * Boards cart keeps the left rail under the stage via .stack--boards-cart. */
.stack--flipping:not(.stack--boards-cart) .stack__rail {
  z-index: 2;
}

.stack--flipping .stack__pile,
.stack__boards-rail--flipping .stack__pile {
  overflow: visible;
}

.stack__create {
  position: relative;
  z-index: 4;
  flex: 0 0 auto;
  width: 2.5rem;
  height: var(--stack-cell-size);
  margin: 0;
  padding: 0 0 0 20px;
  box-sizing: content-box;
  border: 0;
  background: transparent;
  cursor: pointer;
  pointer-events: none;
  display: grid;
  place-items: center;
  overflow: visible;
}

.stack__create--visible,
.stack__create--ready {
  pointer-events: auto;
}

.stack__create-plus {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  border: 0;
  /* Match selection name tooltip colouring */
  background: var(--text-color);
  color: var(--background-color);
  display: grid;
  place-items: center;
}

:global(html.dark) .stack__create-plus {
  background: color-mix(in srgb, var(--background-color) 88%, transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: var(--text-color);
}

/* Single-selection: CSS slide on rail hover */
.stack__rail:not(.stack__rail--multi) .stack__create-plus {
  opacity: 0;
  transform: translateX(-100%);
  transition:
    opacity 0.28s ease,
    transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.stack__rail:not(.stack__rail--multi) .stack__create--visible .stack__create-plus {
  opacity: 1;
  transform: translateX(0);
}

.stack__create-plus-icon {
  position: relative;
  width: 12px;
  height: 12px;
}

.stack__create-plus-bar {
  position: absolute;
  left: 0;
  top: 50%;
  width: 12px;
  height: 1px;
  margin-top: -0.5px;
  background: currentColor;
  transform-origin: center center;
}

.stack__create-plus-bar:first-child {
  transform: rotate(0deg);
}

.stack__create-plus-bar:last-child {
  transform: rotate(90deg);
}

.stack__column {
  /* Full viewport height — top edge to bottom edge */
  position: fixed;
  z-index: 312;
  overflow: hidden;
  pointer-events: auto;
}

.stack__column-scroll {
  position: absolute;
  inset: 0;
  overflow-x: hidden;
  overflow-y: scroll;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  scrollbar-width: none;
  pointer-events: auto;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}

.stack__column-scroll::-webkit-scrollbar {
  display: none;
}

/* Pushes thumbs down when there aren't enough to fill the viewport */
.stack__column-pin {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  pointer-events: none;
}

/* Pile footprint reserved at the bottom — last thumb sits on its top edge */
.stack__column-foot {
  flex: 0 0 70px;
  width: 100%;
  pointer-events: none;
}

/* Hide laid-out thumbs until flyers are parked on the pile */
.stack__column--preparing .stack__column-thumb {
  opacity: 0;
  visibility: hidden;
}

.stack__column-thumb {
  width: 100%;
  aspect-ratio: 1;
  flex: 0 0 auto;
  overflow: hidden;
  background: transparent;
  cursor: grab;
  cursor: -webkit-grab;
  touch-action: pan-y;
  user-select: none;
}

.stack__column-thumb:hover {
  cursor: grab;
  cursor: -webkit-grab;
}

.stack__column-thumb:active {
  cursor: grabbing;
  cursor: -webkit-grabbing;
}

/* Ghost is the item — source disappears while dragging */
.stack__column-thumb--lifted {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none;
}

/* Reserved slot while a board item Flips back — keeps layout, no image pop */
.stack__column-thumb--returning {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

.stack__column-ghost {
  opacity: 1 !important;
  visibility: visible !important;
  cursor: grabbing;
  cursor: -webkit-grabbing;
  box-shadow: none;
  background: transparent;
}

.stack__column-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: var(--stack-cell-pad, 17%);
  box-sizing: border-box;
  pointer-events: none;
}

/* Ghost is already sized to the visual content box — no square padding */
.stack__column-ghost img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 0;
  box-sizing: border-box;
  pointer-events: none;
}

:global(html.stack-column-dragging),
:global(html.stack-column-dragging *) {
  cursor: grabbing !important;
}

.stack__column-close {
  position: fixed;
  bottom: 30px;
  z-index: 320;
  width: 3.25rem;
  height: 3.25rem;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--charcoal);
  display: grid;
  place-items: center;
  cursor: pointer;
  transform: translateX(-50%);
  pointer-events: auto;
}

.stack-column-close-enter-active {
  transition:
    opacity 0.3s ease 0.15s,
    transform 0.35s cubic-bezier(0.22, 1, 0.36, 1) 0.15s;
}

.stack-column-close-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.stack-column-close-enter-from,
.stack-column-close-leave-to {
  opacity: 0;
  transform: translateX(-50%) scale(0.88);
}

.stack-column-close-enter-to,
.stack-column-close-leave-from {
  opacity: 1;
  transform: translateX(-50%) scale(1);
}

.stack__column-close-icon {
  position: relative;
  display: block;
  width: 1rem;
  height: 1rem;
}

.stack__column-close-bar {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 100%;
  height: 1px;
  background: var(--warm-white);
  transform-origin: center center;
}

.stack__column-close-bar:first-child {
  transform: translate(-50%, -50%) rotate(45deg);
}

.stack__column-close-bar:last-child {
  transform: translate(-50%, -50%) rotate(-45deg);
}

.stack__pile--expanded,
.stack__pile--dispersing {
  pointer-events: none;
}

/*
 * Hide pile cards once the column owns them (.stack__pile--dispersing).
 * Kept visible while --preparing (flyers still taking off from the pile).
 */
.stack__pile--dispersing .stack__pile-card {
  visibility: hidden;
  pointer-events: none;
}

.stack--flipping .stack__pile-card,
.stack__boards-rail--flipping .stack__pile-card {
  overflow: visible;
}

.stack__pile-card {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: block;
  overflow: hidden;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  transform-origin: center center;
  transform: translate(var(--pile-x, 0px), var(--pile-y, 0px))
    rotate(var(--pile-r, 0deg)) scale(var(--pile-scale, 1));
  will-change: transform;
  box-sizing: border-box;
}

.stack__pile-card {
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Invisible placeholder keeps z-index / spread while the flyer travels */
.stack__pile-card--arriving {
  opacity: 0;
  pointer-events: none;
  /* No transform tween when this card is revealed — pose is already final */
  transition: none;
}

/* Only suppress transitions while GSAP is driving the cards */
.stack--flipping .stack__pile-card,
.stack--flipping .stack__pile-board-face,
.stack__boards-rail--flipping .stack__pile-card,
.stack__boards-rail--flipping .stack__pile-board-face,
.stack__pile--restacking .stack__pile-card {
  transition: none;
}

.stack__pile--fanned .stack__pile-card--fan {
  transform: translate(var(--pile-hover-x), var(--pile-hover-y))
    rotate(var(--pile-hover-r)) scale(var(--pile-hover-scale, 1));
}

@media (prefers-reduced-motion: reduce) {
  .stack__pile-card {
    transition: none;
  }
}

.stack__pile-image {
  display: block;
  width: 100%;
  height: 100%;
  padding: var(--stack-cell-pad, 17%);
  box-sizing: border-box;
  object-fit: contain;
  object-position: center;
  pointer-events: none;
}

.stack__pile-tip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 0.35rem + 10px);
  z-index: 30;
  margin: 0;
  padding: 0.35rem 0.65rem;
  border: 0;
  border-radius: 6px;
  /* Light mode: inverted — text colour fills, page background for type */
  background: var(--text-color);
  color: var(--background-color);
  font-family: var(--serif);
  font-size: var(--text-sm, 14px);
  line-height: 1.2;
  letter-spacing: 0.01em;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transform: translate(-50%, 0.55rem);
  transition:
    opacity 0.28s ease,
    transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

:global(html.dark) .stack__pile-tip {
  background: color-mix(in srgb, var(--background-color) 88%, transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: var(--text-color);
}

.stack__pile-tip--visible {
  opacity: 1;
  transform: translate(-50%, 0);
}

.stack__stage {
  position: absolute;
  inset: 0;
  z-index: 1;
  visibility: hidden;
  pointer-events: none;
  /* Delay visibility:hidden until backdrop opacity fade finishes */
  transition: visibility 0s linear 0.55s;
}

.stack__stage--visible {
  visibility: visible;
  pointer-events: auto;
  transition: visibility 0s linear 0s;
}

/* Parked under the board composer — keep cream painted, don’t remount/fade */
.stack__stage--under-composer {
  visibility: hidden !important;
  pointer-events: none !important;
  transition: none !important;
}

.stack__stage--under-composer .stack__backdrop {
  opacity: 1 !important;
  transition: none !important;
}

.stack__backdrop {
  position: absolute;
  inset: 0;
  background: var(--background-color, var(--cream));
  opacity: 0;
  /* Close fade out */
  transition: opacity 0.8s ease;
}

.stack__stage--visible .stack__backdrop {
  opacity: 1;
  /* Open fade in */
  transition: opacity 0.35s ease;
}


/*
  Keep cell media invisible until cellsReady.
  Undo placeholders stay visible so they can fade with the stage on close.
  (Previously :not(.stack--flipping) allowed a flash at rest grid positions on open
  before Flip rewound them to the pile.)
*/
.stack:not(.stack--cells-ready) .stack__cell-media:not(.stack__cell-media--undo) {
  opacity: 0;
}

.stack__grid {
  --stack-cell-pad: 17%;
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  align-content: start;
  align-items: stretch;
  justify-content: start;
  gap: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 0;
  box-sizing: border-box;
  overflow-x: hidden;
  overflow-y: auto;
  border-top: 1px solid transparent;
  border-left: 1px solid transparent;
  transition: border-color 0.32s ease;
}

.stack__grid--lines {
  border-top-color: var(--grid-line);
  border-left-color: var(--grid-line);
}

/* Let product cells fill around pinned board tiles */
.stack__grid--with-boards {
  grid-auto-flow: dense;
}

/* Shell stays in document flow — square tracks from gridAutoRows = column width */
.stack__cell {
  --stack-cell-pad: 17%;
  position: relative;
  width: 100%;
  height: auto;
  aspect-ratio: 1 / 1;
  align-self: start;
  min-width: 0;
  overflow: hidden;
  background: transparent;
  border-right: 1px solid transparent;
  border-bottom: 1px solid transparent;
  box-sizing: border-box;
  transition:
    border-color 0.32s ease,
    opacity 0.3s ease;
}

/* Saved board — spans 1×1 (mobile) or 3×2 (≥1000px / 6-col); height from span ratio */
.stack__cell--board {
  /* Same stability model as selection squares: size from track width, not stretch */
  aspect-ratio: var(--board-span-cols, 1) / var(--board-span-rows, 1);
  width: 100%;
  height: auto;
  min-height: 0;
  align-self: start;
  z-index: 1;
}

.stack__grid--boards {
  grid-auto-flow: dense;
}

.stack__cell--board .stack__cell-media {
  position: absolute;
  inset: 0;
}

/* Same aspect box as pile face — continuous Flip proportion */
.stack__cell-figure--board {
  overflow: hidden;
  box-sizing: border-box;
  border: 1px solid currentColor;
}

.stack__cell-figure--board-empty {
  width: 100%;
  border: 1px dashed color-mix(in srgb, var(--charcoal) 40%, transparent);
  background: var(--background-color, var(--cream));
}

.stack__board-hit {
  display: block;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  overflow: hidden;
  line-height: 0;
}

.stack__board-actions {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  opacity: 0;
  /* Keep overlay non-blocking so clicks on the thumb open the board */
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.stack__cell-figure--board:hover .stack__board-actions,
.stack__cell-figure--board:focus-within .stack__board-actions {
  opacity: 1;
}

.stack__board-action {
  width: 2.5rem;
  height: 2.5rem;
  display: grid;
  place-items: center;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #1f1c18;
  color: #faf7f2;
  cursor: pointer;
  pointer-events: none;
  transition: transform 0.18s ease, background 0.18s ease;
}

.stack__cell-figure--board:hover .stack__board-action,
.stack__cell-figure--board:focus-within .stack__board-action {
  pointer-events: auto;
}

.stack__board-action:hover {
  transform: scale(1.06);
  background: #161412;
}

.stack__board-action svg {
  display: block;
}

.stack__board-preview {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  background: transparent;
}

.stack__board-placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 0.75rem;
  box-sizing: border-box;
  text-align: center;
  color: var(--muted);
  font-size: var(--text-sm);
  opacity: 0;
  transition: opacity 0.35s ease;
}

/* Fade in after Flip land; fade out while flipping / peers intro (with the grid) */
.stack--cells-ready:not(.stack--flipping):not(.stack--boards-intro)
  .stack__board-placeholder {
  opacity: 1;
}

.stack__cell--board.stack__cell--scale-out .stack__cell-figure--board {
  transform: scale(0);
  transform-origin: center center;
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}

.stack__cell--board.stack__cell--scale-in .stack__cell-figure--board {
  transform: scale(0);
  transform-origin: center center;
  pointer-events: none;
}

.stack__cell--board.stack__cell--scaled-in .stack__cell-figure--board {
  transform: scale(1);
  transform-origin: center center;
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.stack__pile-image--board {
  object-fit: contain;
}

.stack__grid--lines .stack__cell {
  border-right-color: var(--grid-line);
  border-bottom-color: var(--grid-line);
}

/* Opening PDP from cart — other items fade before the flyer moves */
.stack__grid--pdp-focus .stack__cell:not(.stack__cell--pdp-focus) {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.stack__grid--pdp-focus .stack__cell--pdp-focus .stack__cell-ctrl {
  opacity: 0 !important;
  pointer-events: none !important;
  transition: opacity 0.3s ease;
}

/* Only this layer Flips — leaving the shell keeps the grid shape stable */
.stack__cell-media {
  position: absolute;
  inset: 0;
  min-width: 0;
  min-height: 0;
}

/* Undo fades with grid lines (same 0.32s window on close) */
.stack__cell-media--undo {
  opacity: 1;
  transition: opacity 0.32s ease;
}

.stack__grid:not(.stack__grid--lines) .stack__cell-media--undo {
  opacity: 0;
  pointer-events: none;
}

.stack__cell-media--undo .stack__cell-frame {
  pointer-events: none;
}

.stack__undo {
  width: auto;
  height: auto;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  font-size: var(--text-sm);
  color: var(--muted);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  pointer-events: auto;
  opacity: 0;
  transition:
    opacity 0.7s ease,
    color 0.2s ease;
}

.stack__cell--undo-ready:not(.stack__cell--undo-leaving) .stack__undo {
  opacity: 1;
}

.stack__cell--undo-leaving .stack__undo {
  opacity: 0;
  transition:
    opacity 0.22s ease,
    color 0.2s ease;
}

.stack__undo:hover {
  color: var(--charcoal);
}

/* Remove: hide controls, scale image out — then undo fades in */
.stack__cell--scale-out .stack__cell-ctrl,
.stack__cell--scale-in .stack__cell-ctrl,
.stack__cell--scaled-in .stack__cell-ctrl,
.stack__cell--scale-out .stack__board-actions,
.stack__cell--scale-in .stack__board-actions,
.stack__cell--scaled-in .stack__board-actions {
  opacity: 0 !important;
  pointer-events: none !important;
  transition: none;
}

.stack__cell--scale-out .stack__cell-figure {
  transform: scale(0);
  transform-origin: center center;
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}

/* Undo restore: mount at 0, then scale up; controls return after */
.stack__cell--scale-in .stack__cell-figure {
  transform: scale(0);
  transform-origin: center center;
  pointer-events: none;
}

.stack__cell--scaled-in .stack__cell-figure {
  transform: scale(1);
  transform-origin: center center;
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}

/* Content box = cell minus padding on every side */
.stack__cell-frame {
  position: absolute;
  inset: var(--stack-cell-pad);
  display: grid;
  place-items: center;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  box-sizing: border-box;
  container-type: size;
}

/*
 * Board pad — 8.5% of the board cell on every side.
 * Must follow .stack__cell-frame so the generic 17% inset doesn’t win.
 */
.stack__cell-frame.stack__cell-frame--board {
  /* inset: 8.5%; */
  width: auto;
  height: auto;
}

/* Shrink-wraps to the contained image so controls sit on the image, not the square */
.stack__cell-figure:not(.stack__cell-figure--board) {
  position: relative;
  max-width: 100%;
  max-height: 100%;
  width: fit-content;
  height: fit-content;
  line-height: 0;
  transform-origin: center center;
}

.stack__cell-figure.stack__cell-figure--board {
  position: relative;
  /* Fill the board frame — Flip / gsap land on the full cell, image letterboxes */
  width: 100%;
  height: auto;
  max-width: none;
  max-height: none;
  aspect-ratio: var(--board-aspect, 16/9);
  margin: 0;
  line-height: 0;
  transform-origin: center center;
}

.stack__cell-hit {
  display: block;
  max-width: 100%;
  max-height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  line-height: 0;
}

.stack__cell-image {
  display: block;
  width: auto;
  height: auto;
  max-width: 100cqi;
  max-height: 100cqb;
  object-fit: contain;
  pointer-events: none;
}

.stack__cell-ctrl {
  position: absolute;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.stack__cell:hover .stack__cell-ctrl {
  opacity: 1;
  pointer-events: auto;
}

.stack__cell-ctrl--clone {
  top: var(--thumb-ctrl-inset, 4px);
  left: var(--thumb-ctrl-inset, 4px);
}

.stack__cell-ctrl--remove {
  top: var(--thumb-ctrl-inset, 4px);
  right: var(--thumb-ctrl-inset, 4px);
}

.stack__cell-ctrl--cycle {
  right: var(--thumb-ctrl-inset, 4px);
  bottom: var(--thumb-ctrl-inset, 4px);
}

/* Header / non-Flip opens only — never re-run after Flip settles */
.stack--soft-enter .stack__cell-media {
  animation: stack-cell-in 0.7s ease both;
}

.stack--flipping .stack__cell-media {
  animation: none;
}

@keyframes stack-cell-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.stack__boards {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 0.75rem;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: var(--gutter);
  box-sizing: border-box;
  overflow: auto;
}

.stack__boards-empty {
  margin: auto;
  color: var(--muted);
}

.stack__board {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 10rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--charcoal);
  text-align: left;
  cursor: pointer;
}

.stack__board-thumb {
  display: block;
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--sand);
}

.stack__board-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.stack__board-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: var(--text-sm);
}

.stack__board-count {
  color: var(--muted);
}

.stack__controls {
  position: fixed;
  right: var(--gutter);
  bottom: var(--gutter);
  /* Above stage, pile, and GSAP Flip absolute layers */
  z-index: 420;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: var(--side-column-width);
  max-width: calc(100vw - (var(--gutter) * 2));
  padding: var(--gutter);
  box-sizing: border-box;
  background: var(--panel-bg);
  border: 1px solid var(--grid-line);
  backdrop-filter: blur(50px);
  -webkit-backdrop-filter: blur(50px);
  opacity: 1;
  pointer-events: none;
  /* Park below the viewport; slide up on open */
  transform: translateY(calc(100% + var(--gutter) + 1rem));
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.stack__controls--visible {
  pointer-events: auto;
  transform: translateY(0);
  /* Slight enter delay; leave has no delay so close feels earlier than backdrop */
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1) 0.2s;
}

.stack__controls-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.stack__close {
  flex-shrink: 0;
  width: 25px;
  height: 25px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid currentColor;
  background: var(--elevated-bg, #fff);
  color: var(--charcoal);
  box-sizing: border-box;
  cursor: pointer;
}

.stack__close:hover {
  color: var(--accent, var(--charcoal));
  border-color: currentColor;
}

.stack__close-icon {
  position: relative;
  display: block;
  width: 11px;
  height: 11px;
}

.stack__close-icon::before,
.stack__close-icon::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 1px;
  background: currentColor;
}

.stack__close-icon::before {
  transform: translate(-50%, -50%) rotate(45deg);
}

.stack__close-icon::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}

.stack__title {
  margin: 0;
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--serif);
  font-size: var(--text-md);
  font-weight: 400;
  font-style: normal;
  letter-spacing: normal;
  line-height: 1.5;
  color: var(--charcoal);
  caret-color: var(--charcoal);
  outline: none;
}

.stack__title[contenteditable='true'] {
  cursor: text;
  overflow: visible;
  text-overflow: clip;
}

.stack__count {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--muted);
}

.stack__confirm {
  position: fixed;
  inset: 0;
  z-index: 430;
  display: grid;
  place-items: center;
  padding: var(--gutter);
  box-sizing: border-box;
  background: color-mix(in srgb, var(--charcoal) 28%, transparent);
  pointer-events: auto;
}

.stack__confirm-box {
  width: 100%;
  max-width: 22rem;
  padding: 1.5rem;
  background: var(--panel-bg, var(--warm-white));
  border: 1px solid var(--grid-line);
  box-sizing: border-box;
}

.stack__confirm-title {
  margin: 0 0 0.5rem;
  font-size: var(--text-lg);
  color: var(--charcoal);
}

.stack__confirm-text {
  margin: 0 0 1.5rem;
  font-size: var(--text-sm);
  color: var(--muted);
}

.stack__confirm-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.stack__confirm-actions .btn {
  width: 100%;
  border-radius: 0;
  border: 1px solid var(--grid-line);
}

.stack__control-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
}

.stack__link {
  padding: 0;
  border: 0;
  background: transparent;
  font-size: var(--text-xs);
  color: var(--muted);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.stack__link:hover:not(:disabled) {
  color: var(--charcoal);
}

.stack__link:disabled {
  opacity: 0.4;
  cursor: default;
}

.stack__controls .btn {
  width: 100%;
  border-radius: 0;
  border: 1px solid var(--grid-line);
}

.stack__controls .btn:disabled {
  opacity: 0.4;
  pointer-events: none;
}

@media (max-width: 767px) {
  .stack__controls {
    width: auto;
    left: var(--gutter);
    right: var(--gutter);
  }
}
</style>
