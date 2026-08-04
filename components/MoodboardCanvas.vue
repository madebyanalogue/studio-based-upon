<template>
  <Teleport to="body">
    <div
      v-if="surfacePresent"
      class="moodboard"
      :class="{
        'moodboard--ready': surfaceReady,
        'moodboard--panel-ready': panelReady,
        'moodboard--chrome-out': chromeOut,
        'moodboard--items-out': itemsOut,
        'moodboard--grid-out': gridOut,
        'moodboard--instant-hide': instantHide,
        'moodboard--capturing': isCapturingPreview,
      }"
      role="dialog"
      aria-modal="true"
      aria-label="Moodboard composer"
      @wheel.capture="onOverlayWheel"
    >
      <div class="moodboard__workspace">
        <!-- Body teleport: must sit above BucketStack (.stack--moodboard = 310) -->
        <Teleport to="body">
          <MoodboardLibraryPanel
            :open="libraryOpen"
            @close="libraryOpen = false"
            @select="onLibrarySelect"
          />
        </Teleport>

        <div
          ref="canvasEl"
          class="moodboard__canvas grid-bg"
          :class="{
            'moodboard__canvas--drawing': isDrawing,
            'moodboard__canvas--tearing': isTearing,
            'moodboard__canvas--tear-ready': tearStrokeReady,
            'moodboard__canvas--placing-text': !!placingTextStyle,
          }"
          @click.self="onCanvasClickSelf"
        >
        <svg
          class="moodboard__draw-layer"
          :class="{
            'moodboard__draw-layer--active': isDrawing || tearStrokeReady,
          }"
          @pointerdown="onDrawLayerPointerDown"
          @pointermove="onDrawMove"
          @pointerup="onDrawEnd"
          @pointerleave="onDrawEnd"
        >
          <template v-for="stroke in strokes" :key="stroke.id">
            <g
              v-if="stroke.kind === 'arrow' && stroke.points.length >= 2"
              class="moodboard__arrow"
              :class="{ 'moodboard__arrow--active': activeStrokeId === stroke.id }"
              :data-arrow-id="stroke.id"
            >
              <line
                class="moodboard__arrow-hit"
                :x1="stroke.points[0].x"
                :y1="stroke.points[0].y"
                :x2="stroke.points[1].x"
                :y2="stroke.points[1].y"
                stroke="transparent"
                stroke-width="18"
                stroke-linecap="round"
                @pointerdown.stop="onArrowSelect($event, stroke.id)"
              />
              <line
                class="moodboard__arrow-line"
                :x1="stroke.points[0].x"
                :y1="stroke.points[0].y"
                :x2="arrowLineEnd(stroke.points[0], stroke.points[1], stroke.width).x"
                :y2="arrowLineEnd(stroke.points[0], stroke.points[1], stroke.width).y"
                :stroke="stroke.color"
                :stroke-width="stroke.width"
                stroke-linecap="round"
                pointer-events="none"
              />
              <polygon
                :points="arrowHeadAttr(stroke.points[0], stroke.points[1], stroke.width)"
                :fill="stroke.color"
                pointer-events="none"
              />
              <template v-if="activeStrokeId === stroke.id">
                <circle
                  v-for="(point, endIndex) in stroke.points.slice(0, 2)"
                  :key="`${stroke.id}-h-${endIndex}`"
                  class="moodboard__arrow-handle"
                  :cx="point.x"
                  :cy="point.y"
                  r="7"
                  data-arrow-handle="true"
                  @pointerdown.stop="onArrowHandleStart($event, stroke.id, endIndex === 0 ? 0 : 1)"
                />
              </template>
            </g>
            <polyline
              v-else
              :points="pointsToAttr(stroke.points)"
              :stroke="stroke.color"
              :stroke-width="stroke.width"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
              pointer-events="none"
            />
          </template>
          <template v-if="currentStroke && currentStroke.points.length">
            <g v-if="currentStroke.kind === 'arrow' && currentStroke.points.length >= 2">
              <line
                :x1="currentStroke.points[0].x"
                :y1="currentStroke.points[0].y"
                :x2="arrowLineEnd(currentStroke.points[0], currentStroke.points[1], currentStroke.width).x"
                :y2="arrowLineEnd(currentStroke.points[0], currentStroke.points[1], currentStroke.width).y"
                :stroke="currentStroke.color"
                :stroke-width="currentStroke.width"
                stroke-linecap="round"
              />
              <polygon
                :points="arrowHeadAttr(currentStroke.points[0], currentStroke.points[1], currentStroke.width)"
                :fill="currentStroke.color"
              />
            </g>
            <polyline
              v-else-if="currentStroke.kind !== 'arrow'"
              :points="pointsToAttr(currentStroke.points)"
              :stroke="currentStroke.color"
              :stroke-width="currentStroke.width"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </template>
        </svg>

        <div
          v-for="item in placements"
          :key="item.id"
          class="moodboard__item"
          :data-placement-id="item.id"
          :class="[
            `moodboard__item--${item.kind}`,
            {
              'moodboard__item--active': selectedIds.includes(item.id),
              'moodboard__item--multi':
                selectedIds.includes(item.id) && selectedIds.length > 1,
              'moodboard__item--primary': activeId === item.id,
              'moodboard__item--resizing': resizeState?.id === item.id,
              'moodboard__item--contain': item.objectFit === 'contain',
              'moodboard__item--natural': !!item.height,
              'moodboard__item--returning': returningId === item.id,
              'moodboard__item--handwritten':
                item.kind === 'text' && item.textStyle === 'handwritten',
            },
          ]"
          :style="{
            width:
              item.kind === 'text'
                ? 'max-content'
                : `${item.width || 210}px`,
            height: item.height ? `${item.height}px` : undefined,
            transform: `translate(${item.x}px, ${item.y}px) scale(${item.scale})`,
            transformOrigin: 'top left',
            zIndex: item.z,
            '--inv-scale': 1 / item.scale,
          }"
          @pointerdown="onPointerDown($event, item.id)"
        >
          <template v-if="item.kind === 'image'">
            <div
              v-if="item.tearBackClipPath && !isLikelyTransparentImage(item.imageUrl)"
              class="moodboard__tear-back"
              aria-hidden="true"
              :style="{ clipPath: item.tearBackClipPath }"
            />
            <div
              v-if="item.clipPath && item.sourceWidth != null"
              class="moodboard__image-clip"
              :style="{ clipPath: item.clipPath }"
            >
              <img
                :src="item.imageUrl"
                :alt="item.title"
                class="moodboard__image moodboard__image--cropped"
                :style="{
                  width: `${item.sourceWidth}px`,
                  height: `${item.sourceHeight}px`,
                  left: `${-(item.cropX || 0)}px`,
                  top: `${-(item.cropY || 0)}px`,
                }"
                draggable="false"
              />
            </div>
            <img
              v-else
              :src="item.imageUrl"
              :alt="item.title"
              class="moodboard__image"
              :style="item.clipPath ? { clipPath: item.clipPath } : undefined"
              draggable="false"
            />
            <ImageCycleArrows
              v-if="!item.clipPath && (item.imageUrls?.length || 0) > 1"
              class="moodboard__cycle"
              :style="{ transform: `scale(${1 / item.scale})` }"
              :index="item.imageIndex ?? 0"
              :count="item.imageUrls?.length || 0"
              hide-count
              boxed
              @prev="cycleItemImage(item.id, -1)"
              @next="cycleItemImage(item.id, 1)"
            />
          </template>

          <template v-else-if="item.kind === 'colour'">
            <div class="moodboard__swatch">
              <span class="moodboard__swatch-fill" :style="{ background: item.colour }" />
              <span class="moodboard__swatch-hex">{{ item.colour }}</span>
            </div>
          </template>

          <template v-else-if="item.kind === 'text'">
            <div
              class="moodboard__text"
              :class="
                item.textStyle === 'handwritten'
                  ? 'moodboard__text--handwritten'
                  : 'interface'
              "
              :data-editing="item.id"
              :contenteditable="editingId === item.id"
              @dblclick.stop="onTextDblClick($event, item.id)"
              @blur="onTextBlur($event, item.id)"
              @keydown.enter.prevent="($event.target as HTMLElement).blur()"
              @pointerdown="onTextPointerDown($event, item.id)"
            >{{ item.text }}</div>
          </template>

          <button
            v-if="item.tearRestore"
            type="button"
            class="moodboard__restore"
            aria-label="Restore torn piece"
            title="Restore"
            :style="{ transform: `scale(${1 / item.scale})` }"
            @pointerdown.stop
            @click.stop="restoreTearPiece(item.id)"
          >
            Restore
          </button>

          <button
            v-if="item.kind === 'text'"
            v-show="editingId !== item.id"
            type="button"
            class="moodboard__chip moodboard__remove-chip"
            aria-label="Remove text"
            title="Remove"
            :style="{ transform: `translate(50%, -50%) scale(${1 / item.scale})` }"
            @pointerdown.stop
            @click.stop="onRemovePlacement(item.id)"
          >
            <span class="moodboard__remove-minus" aria-hidden="true" />
          </button>

          <div
            v-else
            class="moodboard__remove"
            :style="{ transform: `scale(${1 / item.scale})` }"
            @pointerdown.stop
            @click.stop="onRemovePlacement(item.id)"
          >
            <AddButton
              variant="remove"
              :label="`Remove ${item.title} from board`"
            />
          </div>

          <template
            v-if="
              activeId === item.id &&
              editingId !== item.id &&
              item.kind !== 'text'
            "
          >
            <span
              v-for="corner in corners"
              :key="corner"
              class="moodboard__handle"
              :class="`moodboard__handle--${corner}`"
              :style="{ transform: `translate(-50%, -50%) scale(${1 / item.scale})` }"
              @pointerdown.stop="onResizeStart($event, item.id, corner)"
            />
          </template>
        </div>

        <svg
          v-if="tearState"
          class="moodboard__tear-line"
          aria-hidden="true"
        >
          <polyline
            :points="tearCanvasPointsAttr"
            fill="none"
            stroke="var(--charcoal)"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>

        <div
          v-if="placingTextStyle"
          class="moodboard__place-layer"
          aria-hidden="true"
          @pointerdown.prevent="onPlaceText"
        />
      </div>
      </div>

      <!-- Vertical tool rail — top right -->
      <div class="moodboard__actions" aria-label="Board tools">
        <button
          type="button"
          class="moodboard__action"
          :class="{ 'moodboard__action--active': libraryOpen }"
          :aria-pressed="libraryOpen"
          aria-label="Open library"
          title="Library"
          @click="toggleLibrary"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H11l2 2h5.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" />
          </svg>
        </button>
        <div ref="colourToolRef" class="moodboard__colour-tool">
          <button
            type="button"
            class="moodboard__action"
            :class="{ 'moodboard__action--active': colourPickerOpen }"
            :aria-pressed="colourPickerOpen"
            aria-label="Add colour swatch"
            title="Add colour swatch"
            @click="toggleColourPicker"
          >
            <span class="moodboard__action-swatch" />
          </button>
          <div
            v-if="colourPickerOpen"
            class="moodboard__colour-popover"
            role="dialog"
            aria-label="Colour picker"
          >
            <input
              ref="hexInput"
              v-model="hexDraft"
              type="text"
              class="moodboard__colour-hex interface"
              spellcheck="false"
              autocomplete="off"
              maxlength="7"
              aria-label="Hex colour"
              @input="onHexDraftInput"
              @keydown.enter.prevent="commitColour"
              @keydown.escape.prevent="colourPickerOpen = false"
            />
            <label
              class="moodboard__colour-preview"
              :style="{ background: colourDraft }"
              title="Pick colour"
            >
              <input
                v-model="colourDraft"
                type="color"
                class="moodboard__colour-input"
                @input="onColourDraftInput"
              />
            </label>
            <button
              type="button"
              class="moodboard__colour-add interface"
              @click="commitColour"
            >
              Add
            </button>
          </div>
        </div>
        <button
          type="button"
          class="moodboard__action"
          :class="{ 'moodboard__action--active': placingTextStyle === 'mono' }"
          :aria-pressed="placingTextStyle === 'mono'"
          aria-label="Add text"
          title="Add text"
          @click="onAddText"
        >
          <span class="moodboard__action-text">T</span>
        </button>
        <button
          type="button"
          class="moodboard__action"
          :class="{ 'moodboard__action--active': placingTextStyle === 'handwritten' }"
          :aria-pressed="placingTextStyle === 'handwritten'"
          aria-label="Add handwritten text"
          title="Add handwritten text"
          @click="onAddHandwrittenText"
        >
          <span class="moodboard__action-text moodboard__action-text--script">A</span>
        </button>
        <button
          type="button"
          class="moodboard__action"
          aria-label="Upload image"
          title="Upload image"
          @click="openImagePicker"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="8.5" cy="9.5" r="1.5" />
            <path d="m21 16-5-5L5 20" />
          </svg>
        </button>
        <button
          type="button"
          class="moodboard__action"
          :class="{ 'moodboard__action--active': drawTool === 'pen' }"
          :aria-pressed="drawTool === 'pen'"
          aria-label="Draw"
          title="Draw"
          @click="toggleDrawTool('pen')"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
        <button
          type="button"
          class="moodboard__action"
          :class="{ 'moodboard__action--active': drawTool === 'arrow' }"
          :aria-pressed="drawTool === 'arrow'"
          aria-label="Draw arrow"
          title="Draw arrow"
          @click="toggleDrawTool('arrow')"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </button>
        <button
          type="button"
          class="moodboard__action"
          :class="{ 'moodboard__action--active': drawTool === 'tear' }"
          :aria-pressed="drawTool === 'tear'"
          aria-label="Tear image"
          title="Tear image"
          @click="toggleDrawTool('tear')"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 4c2 3 2 5 0 8s-2 5 0 8" />
            <path d="M12 4c2 3 2 5 0 8s-2 5 0 8" />
            <path d="M20 4c2 3 2 5 0 8s-2 5 0 8" />
          </svg>
        </button>
        <button
          type="button"
          class="moodboard__action moodboard__action--theme"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          :aria-pressed="isDark"
          :title="isDark ? 'Light mode' : 'Dark mode'"
          @click="toggleTheme"
        >
          <svg
            class="moodboard__theme-icon moodboard__theme-icon--sun"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21M5.64 5.64l1.06 1.06M17.3 17.3l1.06 1.06M5.64 18.36l1.06-1.06M17.3 6.7l1.06-1.06" />
          </svg>
          <svg
            class="moodboard__theme-icon moodboard__theme-icon--moon"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M21 13.5A8.5 8.5 0 1 1 10.5 3 6.5 6.5 0 0 0 21 13.5Z" />
          </svg>
        </button>
      </div>

      <p v-if="drawTool === 'tear'" class="moodboard__tear-hint interface">
        {{
          tearStrokeReady
            ? 'Draw a tear line — start and end outside the image'
            : 'Select an image to tear'
        }}
      </p>

      <button
        v-if="tearUndo && !drawTool"
        type="button"
        class="moodboard__tear-undo btn"
        @click="onUndoTear"
      >
        Undo tear
      </button>

      <div
        class="moodboard__history"
        role="group"
        aria-label="Undo and redo"
      >
        <button
          type="button"
          class="moodboard__history-btn"
          aria-label="Undo"
          title="Undo"
          :disabled="!canUndo"
          @click="undoBoard"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h11a5 5 0 0 1 0 10h-2" />
          </svg>
        </button>
        <span class="moodboard__history-divider" aria-hidden="true" />
        <button
          type="button"
          class="moodboard__history-btn"
          aria-label="Redo"
          title="Redo"
          :disabled="!canRedo"
          @click="redoBoard"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">
            <path d="m15 14 5-5-5-5" />
            <path d="M20 9H9a5 5 0 0 0 0 10h2" />
          </svg>
        </button>
      </div>

      <div v-if="drawTool === 'pen'" class="moodboard__pen-bar">
        <label class="moodboard__pen-swatch" :style="{ background: penColour }" title="Pen colour">
          <input type="color" v-model="penColour" class="moodboard__colour-input" />
        </label>
        <input
          v-model.number="penWidth"
          type="range"
          min="1"
          max="24"
          step="1"
          class="moodboard__pen-range"
          aria-label="Pen thickness"
        />
        <button type="button" class="btn moodboard__pen-clear" @click="clearStrokes">Clear drawing</button>
      </div>

      <!-- Cart-style panel — bottom right -->
      <aside class="moodboard__panel" aria-label="Board actions">
        <div class="moodboard__panel-head">
          <div ref="switcherRef" class="moodboard__switcher">
            <div class="moodboard__switcher-toggle">
              <span
                ref="titleEl"
                class="moodboard__panel-title"
                :contenteditable="titleEditing"
                :role="titleEditing ? 'textbox' : undefined"
                :aria-label="titleEditing ? 'Board name' : undefined"
                :aria-expanded="!titleEditing ? switchOpen : undefined"
                @click="onTitleClick"
                @blur="saveTitleEdit"
                @keydown.enter.prevent="saveTitleEdit"
                @keydown.escape.prevent="cancelTitleEdit"
              >{{ activeBoard?.name || activeMoodboard?.name || 'My Board 1' }}</span>
              <button
                v-if="selectionBoards.length > 1 && !titleEditing"
                type="button"
                class="moodboard__switcher-caret-btn"
                :aria-expanded="switchOpen"
                aria-label="Switch board"
                @click="switchOpen = !switchOpen"
              >
                <span class="moodboard__switcher-caret" aria-hidden="true" />
              </button>
            </div>
            <div
              v-if="switchOpen && selectionBoards.length > 1"
              class="moodboard__switcher-menu"
            >
              <button
                v-for="board in selectionBoards"
                :key="board.id"
                type="button"
                class="moodboard__switcher-option"
                :class="{ 'moodboard__switcher-option--active': board.id === activeBoardId }"
                @click="switchSavedBoard(board.id)"
              >
                {{ board.name }}
              </button>
            </div>
          </div>
          <button
            type="button"
            class="moodboard__panel-close"
            aria-label="Save and close board"
            @click="onSaveAndClose"
          >
            <span class="moodboard__panel-close-icon" aria-hidden="true" />
          </button>
        </div>

        <div class="moodboard__panel-meta">
          <p class="moodboard__panel-count interface">
            {{ placements.length }} {{ placements.length === 1 ? 'item' : 'items' }}
          </p>
          <div class="moodboard__panel-tools" aria-label="Board tools">
            <button
              type="button"
              class="moodboard__panel-tool"
              aria-label="Share as enquiry"
              @click="sendEnquiry"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">
                <path d="M21 3 10 14" />
                <path d="M21 3 14 21l-4-7-7-4Z" />
              </svg>
              <span class="moodboard__panel-tooltip interface" aria-hidden="true">Share</span>
            </button>
            <button
              type="button"
              class="moodboard__panel-tool"
              aria-label="Download screenshot"
              @click="downloadScreenshot"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">
                <path d="M12 3v12" />
                <path d="m8 11 4 4 4-4" />
                <path d="M5 20h14" />
              </svg>
              <span class="moodboard__panel-tooltip interface" aria-hidden="true">Download</span>
            </button>
            <button
              type="button"
              class="moodboard__panel-tool"
              aria-label="Rename board"
              @click="startTitleEdit"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">
                <path d="M14 6 18 10" />
                <path d="M4 20h4L18 10l-4-4L4 16v4Z" />
              </svg>
              <span class="moodboard__panel-tooltip interface" aria-hidden="true">Rename</span>
            </button>
            <button
              type="button"
              class="moodboard__panel-tool"
              aria-label="Delete board"
              @click="confirmingDelete = true"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">
                <path d="M4 7h16" />
                <path d="M9 4h6" />
                <path d="M7 7v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7" />
              </svg>
              <span class="moodboard__panel-tooltip interface" aria-hidden="true">Delete</span>
            </button>
          </div>
        </div>

        <button type="button" class="moodboard__panel-link interface" @click="onCancelEdits">
          Cancel edits
        </button>

        <button type="button" class="btn btn--filled" @click="sendEnquiry">
          Send as enquiry
        </button>
      </aside>

      <div
        v-if="confirmingDelete"
        class="moodboard__confirm"
        role="dialog"
        aria-modal="true"
        aria-label="Delete board"
      >
        <div class="moodboard__confirm-box">
          <p class="moodboard__confirm-title interface">Delete this board?</p>
          <p class="moodboard__confirm-text">
            “{{ activeBoard?.name || activeMoodboard?.name || 'My Board' }}” and its
            {{ placements.length }}
            {{ placements.length === 1 ? 'item' : 'items' }}
            will be permanently removed.
          </p>
          <div class="moodboard__confirm-actions">
            <button type="button" class="btn" @click="confirmingDelete = false">
              Cancel
            </button>
            <button type="button" class="btn btn--filled" @click="onDeleteBoard">
              Delete
            </button>
          </div>
        </div>
      </div>

      <input
        ref="imageInput"
        type="file"
        accept="image/*"
        class="moodboard__sr-input"
        @change="onImageSelected"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { uniqueImageUrls } from '~/composables/productImages'

const {
  isMoodboard,
  closeMoodboard,
  openMoodboard,
  activeMoodboard,
  activeMoodboardId,
  renameMoodboard,
  markMoodboardSurfaceReady,
  consumeMoodboardSkipBgFade,
  consumeMoodboardStagedOpen,
  requestMoodboardRestack,
  requestMoodboardStackExit,
  closeMoodboardToBoards,
  requestMoodboardReturnToColumn,
  persistMoodboardSession,
  clearMoodboardSession,
  readMoodboardSession,
  setParkedSelectionItems,
  parkedSelectionItems,
  registerMoodboardStagedReveal,
  registerMoodboardChromeEnter,
} = useBucket()

const MOODBOARD_FADE_MS = 420
const MOODBOARD_PANEL_FADE_MS = 320
const MOODBOARD_PAUSE_MS = 160
const MOODBOARD_CHROME_EXIT_MS = 450
const MOODBOARD_GRID_FADE_MS = 320

const surfacePresent = ref(false)
const surfaceReady = ref(false)
const panelReady = ref(false)
const chromeOut = ref(false)
const itemsOut = ref(false)
/** Canvas grid lines — faded for staged open/close. */
const gridOut = ref(false)
/** Instantly kill the whole composer (no translucent cream flash). */
const instantHide = ref(false)
const isExiting = ref(false)
/** Preview captured on save — used for Flip into boards cart. */
const exitPreview = ref<string | null>(null)
const {
  boards,
  activeBoard,
  activeBoardId,
  setActiveBoard,
  saveActiveBoard,
  updateBoard,
  renameBoard,
  deleteBoard,
  boardsForSelection,
} = useBoards()

/** Boards for the current selection — fall back to active board's selection. */
const selectionBoards = computed(() => {
  const sid = activeBoard.value?.selectionId || activeMoodboardId.value
  const scoped = boardsForSelection(sid)
  if (scoped.length) return scoped
  // Legacy boards without selectionId still appear while editing them
  if (activeBoard.value && !activeBoard.value.selectionId) {
    return boards.value.filter((board) => !board.selectionId)
  }
  return scoped
})
const {
  placements,
  strokes,
  activeId,
  selectedIds,
  activeStrokeId,
  bringToFront,
  updatePosition,
  updatePositions,
  updateScale,
  clearActive,
  addColour,
  addImage,
  cycleItemImage,
  addStroke,
  updateStrokePoints,
  removeStroke,
  clearStrokes,
  selectStroke,
  addText,
  updateText,
  removeItem,
  tearItem,
  tearUndo,
  restoreTearPiece,
  undoTear,
  loadBoard,
  reset,
  snapshot,
} = useMoodboard()
const { openFromMoodboard } = useEnquiryForm()
const { imageUrl: buildLibraryUrl } = useSanityImage()
const { isDark, toggleTheme } = useTheme()

type Corner = 'tl' | 'tr' | 'bl' | 'br'
const corners: Corner[] = ['tl', 'tr', 'bl', 'br']

const canvasEl = ref<HTMLElement | null>(null)
const switcherRef = ref<HTMLElement | null>(null)
const switchOpen = ref(false)
/** Hide selection chrome while capturing a board thumbnail. */
const isCapturingPreview = ref(false)
const imageInput = ref<HTMLInputElement | null>(null)
const pendingColour = ref('#c8a86b')
const colourPickerOpen = ref(false)
const colourToolRef = ref<HTMLElement | null>(null)
const hexInput = ref<HTMLInputElement | null>(null)
const colourDraft = ref('#c8a86b')
const hexDraft = ref('#C8A86B')
const editingId = ref<string | null>(null)
/** Click-to-place mode for mono / handwritten text. */
const placingTextStyle = ref<'mono' | 'handwritten' | null>(null)
const titleEditing = ref(false)
const titleEl = ref<HTMLElement | null>(null)
const confirmingDelete = ref(false)

/** Board edit history — snapshots of placements / strokes / tear undo. */
type BoardHistorySnap = {
  placements: typeof placements.value
  strokes: typeof strokes.value
  tearUndo: typeof tearUndo.value
  selectedIds: string[]
  activeId: string | null
  activeStrokeId: string | null
}
const historyPast = ref<string[]>([])
const historyFuture = ref<string[]>([])
const canUndo = computed(() => historyPast.value.length > 0)
const canRedo = computed(() => historyFuture.value.length > 0)
let historyBaseline = ''
let historyApplying = false
let historyTimer: ReturnType<typeof setTimeout> | null = null

const encodeHistory = () =>
  JSON.stringify({
    placements: placements.value,
    strokes: strokes.value,
    tearUndo: tearUndo.value,
    selectedIds: selectedIds.value,
    activeId: activeId.value,
    activeStrokeId: activeStrokeId.value,
  } satisfies BoardHistorySnap)

const resetHistory = () => {
  if (historyTimer) {
    clearTimeout(historyTimer)
    historyTimer = null
  }
  historyPast.value = []
  historyFuture.value = []
  historyBaseline = encodeHistory()
}

const commitHistory = () => {
  if (historyApplying || !isMoodboard.value || !surfacePresent.value) return
  const next = encodeHistory()
  if (next === historyBaseline) return
  historyPast.value = [...historyPast.value, historyBaseline].slice(-60)
  historyFuture.value = []
  historyBaseline = next
}

const queueHistoryCommit = () => {
  if (historyApplying || !isMoodboard.value || !surfacePresent.value) return
  if (historyTimer) clearTimeout(historyTimer)
  historyTimer = setTimeout(() => {
    historyTimer = null
    commitHistory()
  }, 280)
}

const flushHistoryCommit = () => {
  if (historyTimer) {
    clearTimeout(historyTimer)
    historyTimer = null
  }
  commitHistory()
}

const applyHistory = (raw: string) => {
  const snap = JSON.parse(raw) as BoardHistorySnap
  historyApplying = true
  placements.value = snap.placements
  strokes.value = snap.strokes
  tearUndo.value = snap.tearUndo
  selectedIds.value = snap.selectedIds || []
  activeId.value = snap.activeId ?? null
  activeStrokeId.value = snap.activeStrokeId ?? null
  historyBaseline = raw
  nextTick(() => {
    historyApplying = false
  })
}

const undoBoard = () => {
  flushHistoryCommit()
  if (!historyPast.value.length) return
  const current = historyBaseline
  const prev = historyPast.value[historyPast.value.length - 1]!
  historyPast.value = historyPast.value.slice(0, -1)
  historyFuture.value = [...historyFuture.value, current]
  applyHistory(prev)
}

const redoBoard = () => {
  if (!historyFuture.value.length) return
  const current = historyBaseline
  const next = historyFuture.value[historyFuture.value.length - 1]!
  historyFuture.value = historyFuture.value.slice(0, -1)
  historyPast.value = [...historyPast.value, current]
  applyHistory(next)
}

const boardTitleLabel = () =>
  activeBoard.value?.name || activeMoodboard.value?.name || 'My Board 1'

const startTitleEdit = () => {
  titleEditing.value = true
  switchOpen.value = false
  nextTick(() => {
    const el = titleEl.value
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

const saveTitleEdit = () => {
  if (!titleEditing.value) return
  const next = (titleEl.value?.innerText || '').replace(/\n/g, ' ').trim()
  if (next) {
    if (activeBoardId.value) renameBoard(activeBoardId.value, next)
    else if (activeMoodboardId.value) renameMoodboard(activeMoodboardId.value, next)
  } else if (titleEl.value) {
    titleEl.value.textContent = boardTitleLabel()
  }
  titleEditing.value = false
}

const cancelTitleEdit = () => {
  if (titleEl.value) titleEl.value.textContent = boardTitleLabel()
  titleEditing.value = false
}

const onTitleClick = () => {
  if (titleEditing.value) return
  if (selectionBoards.value.length > 1) {
    switchOpen.value = !switchOpen.value
  }
}

type DrawTool = 'pen' | 'arrow' | 'tear'
const ARROW_COLOR = '#1a1a1a'
const ARROW_WIDTH = 3

/** White paper tear-back looks wrong under alpha — skip for PNG sources. */
const isLikelyTransparentImage = (url?: string | null) =>
  !!url && /\.png(?:$|[?#])/i.test(url)

const drawTool = ref<DrawTool | null>(null)
/** Pen / arrow use the draw layer; tear keeps items interactive. */
const isDrawing = computed(
  () => drawTool.value === 'pen' || drawTool.value === 'arrow',
)
const isTearing = computed(() => drawTool.value === 'tear')
/** Image chosen in tear mode — stroke is drawn on the canvas overlay. */
const tearTargetId = computed(() => {
  if (drawTool.value !== 'tear' || !activeId.value) return null
  const item = placements.value.find((entry) => entry.id === activeId.value)
  return item?.kind === 'image' ? item.id : null
})
const tearStrokeReady = computed(() => !!tearTargetId.value)
const tearState = ref<{
  id: string
  layoutW: number
  layoutH: number
  originX: number
  originY: number
  scale: number
  localPath: { x: number; y: number }[]
  canvasPath: { x: number; y: number }[]
} | null>(null)
const tearCanvasPointsAttr = computed(() =>
  (tearState.value?.canvasPath || [])
    .map((p) => `${p.x},${p.y}`)
    .join(' '),
)
const libraryOpen = ref(false)
const penColour = ref('#1a1a1a')
const penWidth = ref(4)
const currentStroke = ref<{
  kind: 'freehand' | 'arrow'
  color: string
  width: number
  points: { x: number; y: number }[]
} | null>(null)
const arrowHandleDrag = ref<{ id: string; end: 0 | 1 } | null>(null)
const dragState = ref<{
  ids: string[]
  origins: Record<string, { x: number; y: number }>
  startPointerX: number
  startPointerY: number
} | null>(null)
/** Text: second click (no drag) enters edit; tracks the press for that. */
const textEditGesture = ref<{
  id: string
  x: number
  y: number
  wasSelected: boolean
} | null>(null)
const resizeState = ref<{
  id: string
  anchorX: number
  anchorY: number
  baseW: number
  baseH: number
  corner: Corner
} | null>(null)

type OpenSnapshot = {
  boardId: string | null
  name: string
  placements: ReturnType<typeof snapshot>['placements']
  strokes: ReturnType<typeof snapshot>['strokes']
}

const openSnapshot = ref<OpenSnapshot | null>(null)

// Module-level so revert can finish after this dialog unmounts.
let cancelRevertTimer: ReturnType<typeof setTimeout> | null = null

const waitMs = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Block wheel from scrolling the page under the overlay; allow nested panels. */
const onOverlayWheel = (event: WheelEvent) => {
  const target = event.target as HTMLElement | null
  const scroller = target?.closest?.(
    '[data-moodboard-scroll], [data-lenis-prevent]',
  ) as HTMLElement | null
  if (scroller) {
    const { scrollTop, scrollHeight, clientHeight } = scroller
    const canScroll = scrollHeight > clientHeight + 1
    if (canScroll) {
      const atTop = scrollTop <= 0 && event.deltaY < 0
      const atBottom =
        scrollTop + clientHeight >= scrollHeight - 1 && event.deltaY > 0
      if (!atTop && !atBottom) return
    }
  }
  event.preventDefault()
}

watch(
  isMoodboard,
  async (open) => {
    if (open) {
      if (cancelRevertTimer) {
        clearTimeout(cancelRevertTimer)
        cancelRevertTimer = null
      }
      const state = snapshot()
      openSnapshot.value = {
        boardId: activeBoardId.value,
        name: activeBoard.value?.name || activeMoodboard.value?.name || 'My Board 1',
        placements: state.placements,
        strokes: state.strokes,
      }
      instantHide.value = false
      isExiting.value = false
      const skipBgFade = consumeMoodboardSkipBgFade()
      const stagedOpen = consumeMoodboardStagedOpen()
      surfacePresent.value = true

      if (stagedOpen) {
        // Reverse open: Flip first, then grid, then tools — hold chrome/grid
        surfaceReady.value = true
        panelReady.value = false
        chromeOut.value = true
        itemsOut.value = true
        gridOut.value = true
        await nextTick()
        return
      }

      itemsOut.value = false
      chromeOut.value = false
      gridOut.value = false
      panelReady.value = false
      if (skipBgFade) {
        // Cart cream already covers the page — keep continuous, no bg fade
        surfaceReady.value = true
        await nextTick()
      } else {
        surfaceReady.value = false
        await nextTick()
        // 1) Board background fades in
        requestAnimationFrame(() => {
          surfaceReady.value = true
        })
        await waitMs(MOODBOARD_FADE_MS)
      }
      // 2) Board info panel fades in
      panelReady.value = true
      await waitMs(MOODBOARD_PANEL_FADE_MS)
      // 3) Let BucketStack open the active selection column
      markMoodboardSurfaceReady()
      return
    }
    // Closed from elsewhere — drop surface if still up
    if (!isExiting.value) {
      surfaceReady.value = false
      panelReady.value = false
      itemsOut.value = false
      gridOut.value = false
      instantHide.value = false
      chromeOut.value = false
      surfacePresent.value = false
    }
  },
  { immediate: true },
)

const returningId = ref<string | null>(null)

/** Remove from canvas; cart-sourced items Flip back into the column stack. */
const onRemovePlacement = async (id: string) => {
  if (returningId.value) return
  const item = placements.value.find((entry) => entry.id === id)
  if (!item) return

  if (
    item.kind === 'image' &&
    item.sourceBucketItemId &&
    item.sourceSelectionId &&
    item.imageUrl
  ) {
    const el = document.querySelector(
      `[data-placement-id="${id}"]`,
    ) as HTMLElement | null
    if (!el) {
      removeItem(id)
      return
    }
    const rect = el.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) {
      removeItem(id)
      return
    }
    // Hide the board item under the flyer for the whole Flip sequence
    returningId.value = id
    await nextTick()
    try {
      await requestMoodboardReturnToColumn({
        selectionId: item.sourceSelectionId,
        itemId: item.sourceBucketItemId,
        from: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
        imageUrl: item.imageUrl,
        objectFit: item.objectFit || 'contain',
        item: {
          id: item.sourceBucketItemId,
          title: item.title,
          imageUrl: item.imageUrl,
          itemType: 'item',
          imageUrls: item.imageUrls,
          imageIndex: item.imageIndex,
        },
      })
    } finally {
      removeItem(id)
      returningId.value = null
    }
    return
  }

  removeItem(id)
}

/**
 * Pause → restack → chrome/stack exit → Flip board into cart → peers fade → toolbox.
 */
const exitMoodboard = async () => {
  if (isExiting.value) return
  isExiting.value = true
  switchOpen.value = false
  libraryOpen.value = false
  drawTool.value = null
  placingTextStyle.value = null
  colourPickerOpen.value = false
  confirmingDelete.value = false

  // 1) Pause
  await waitMs(MOODBOARD_PAUSE_MS)

  // 2) Stack closes down
  await requestMoodboardRestack()
  await waitMs(40)

  // 3) Tools → X, toolbox → Y, selection stack → Y (together)
  chromeOut.value = true
  await Promise.all([
    requestMoodboardStackExit(),
    waitMs(MOODBOARD_CHROME_EXIT_MS),
  ])

  const canvasRect = canvasEl.value?.getBoundingClientRect()
  const from =
    canvasRect && canvasRect.width > 2
      ? {
          left: canvasRect.left,
          top: canvasRect.top,
          width: canvasRect.width,
          height: canvasRect.height,
        }
      : null

  if (!exitPreview.value) {
    const shot = await captureBoardPreview()
    exitPreview.value = shot?.preview || activeBoard.value?.preview || null
  }
  const preview = exitPreview.value

  // 4–6) Boards ready → park flyer → hide composer instantly → Flip → peers → toolbox
  await closeMoodboardToBoards({
    boardId: activeBoardId.value,
    preview,
    from,
    beforeFlip: async () => {
      // Flyer already covers the shot — kill edit UI instantly (no cream fade flash)
      itemsOut.value = true
      gridOut.value = true
      instantHide.value = true
      surfaceReady.value = false
      await nextTick()
    },
    afterLand: async () => {
      // Drop composer as soon as the thumb owns the cell — don’t leave an
      // invisible overlay that can flash when it finally unmounts.
      surfacePresent.value = false
      itemsOut.value = false
      gridOut.value = false
      chromeOut.value = false
      panelReady.value = false
      instantHide.value = false
      exitPreview.value = null
      await closeMoodboard({ skipCartReturn: true })
    },
  })

  isExiting.value = false
}

const onSaveAndClose = async () => {
  if (cancelRevertTimer) {
    clearTimeout(cancelRevertTimer)
    cancelRevertTimer = null
  }
  if (isExiting.value) return
  const shot = await captureBoardPreview()
  exitPreview.value = shot?.preview || null
  saveActiveBoard(
    placements.value,
    strokes.value,
    shot?.preview,
    shot?.aspect,
  )
  await exitMoodboard()
}

const onCancelEdits = async () => {
  if (isExiting.value) return
  const snap = openSnapshot.value
  const revert = updateBoard
  const restore = loadBoard
  await exitMoodboard()

  // Revert after the composer has left the page.
  if (cancelRevertTimer) clearTimeout(cancelRevertTimer)
  cancelRevertTimer = setTimeout(() => {
    cancelRevertTimer = null
    if (!snap) return
    if (snap.boardId) {
      revert(snap.boardId, {
        name: snap.name,
        placements: snap.placements,
        strokes: snap.strokes,
      })
    }
    restore(snap.placements, snap.strokes)
  }, 80)
}

const onDeleteBoard = async () => {
  if (isExiting.value) return
  const id = activeBoardId.value
  if (!id) return

  confirmingDelete.value = false

  if (cancelRevertTimer) {
    clearTimeout(cancelRevertTimer)
    cancelRevertTimer = null
  }

  const remaining = selectionBoards.value.filter((board) => board.id !== id)
  deleteBoard(id)
  switchOpen.value = false
  titleEditing.value = false

  if (!remaining.length) {
    // Last board for this selection — leave the composer
    reset()
    openSnapshot.value = null
    await exitMoodboard()
    return
  }

  // Switch to the next board and keep editing
  const next = remaining[0]!
  setActiveBoard(next.id)
  loadBoard(next.placements, next.strokes)
  clearActive()
  openSnapshot.value = {
    boardId: next.id,
    name: next.name,
    placements: JSON.parse(JSON.stringify(next.placements)),
    strokes: JSON.parse(JSON.stringify(next.strokes)),
  }
  nextTick(() => resetHistory())
}

const switchSavedBoard = async (id: string) => {
  if (id === activeBoardId.value) {
    switchOpen.value = false
    return
  }
  // Persist current canvas before switching.
  if (activeBoardId.value) {
    const shot = await captureBoardPreview()
    saveActiveBoard(
      placements.value,
      strokes.value,
      shot?.preview,
      shot?.aspect,
    )
  }
  setActiveBoard(id)
  const board = boards.value.find((b) => b.id === id)
  if (board) loadBoard(board.placements, board.strokes)
  switchOpen.value = false
  clearActive()
  nextTick(() => resetHistory())
}

const onDocumentClick = (event: MouseEvent) => {
  if (!switcherRef.value?.contains(event.target as Node)) {
    switchOpen.value = false
  }
  if (
    colourPickerOpen.value &&
    !colourToolRef.value?.contains(event.target as Node)
  ) {
    colourPickerOpen.value = false
  }
}

const normalizeHex = (value: string) => {
  let next = value.trim()
  if (!next.startsWith('#')) next = `#${next}`
  if (/^#[0-9a-fA-F]{3}$/.test(next)) {
    next = `#${next[1]}${next[1]}${next[2]}${next[2]}${next[3]}${next[3]}`
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(next)) return null
  return next.toUpperCase()
}

const toggleColourPicker = () => {
  colourPickerOpen.value = !colourPickerOpen.value
  if (!colourPickerOpen.value) return
  placingTextStyle.value = null
  drawTool.value = null
  currentStroke.value = null
  libraryOpen.value = false
  colourDraft.value = pendingColour.value.toLowerCase()
  hexDraft.value = pendingColour.value.toUpperCase()
  nextTick(() => {
    hexInput.value?.focus()
    hexInput.value?.select()
  })
}

const onColourDraftInput = () => {
  hexDraft.value = colourDraft.value.toUpperCase()
}

const onHexDraftInput = () => {
  const normalized = normalizeHex(hexDraft.value)
  if (normalized) colourDraft.value = normalized.toLowerCase()
}

const commitColour = () => {
  const hex =
    normalizeHex(hexDraft.value) || normalizeHex(colourDraft.value)
  if (!hex) return
  pendingColour.value = hex
  hexDraft.value = hex
  colourDraft.value = hex.toLowerCase()
  addColour(hex)
  colourPickerOpen.value = false
}

const openImagePicker = () => {
  imageInput.value?.click()
}

/** Center of the board canvas, with a light cascade so repeats don’t stack perfectly. */
const centerPlacementPosition = (width = 210, height = 210) => {
  const rect = canvasEl.value?.getBoundingClientRect()
  const cascade = (placements.value.length % 5) * 28
  if (!rect) {
    return { x: 140 + cascade, y: 140 + cascade }
  }
  return {
    x: Math.max(24, (rect.width - width) / 2 + cascade),
    y: Math.max(24, (rect.height - height) / 2 + cascade),
  }
}

const onImageSelected = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      const { x, y } = centerPlacementPosition()
      addImage(reader.result, file.name.replace(/\.[^.]+$/, ''), { x, y })
    }
  }
  reader.readAsDataURL(file)
  input.value = ''
}

const toggleLibrary = () => {
  libraryOpen.value = !libraryOpen.value
  if (libraryOpen.value) {
    drawTool.value = null
    currentStroke.value = null
    placingTextStyle.value = null
    colourPickerOpen.value = false
  }
}

const LIBRARY_PLACEHOLDER =
  `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" rx="112" fill="#ddd6c8"/></svg>',
  )}`

const onLibrarySelect = (item: {
  title: string
  image?: { asset?: { url?: string } }
  gallery?: { asset?: { url?: string } }[]
  spiritGallery?: { asset?: { url?: string } }[]
}) => {
  const assets = [item.image, ...(item.gallery || []), ...(item.spiritGallery || [])]
  const urls = uniqueImageUrls(
    ...assets.map((asset) => (asset ? buildLibraryUrl(asset, 1200) : '')),
  )
  const url = urls[0] || item.image?.asset?.url
  const isSample = !url || url.includes('picsum.photos')
  if (isSample) {
    addImage(LIBRARY_PLACEHOLDER, item.title)
    return
  }
  addImage(url, item.title, {
    imageUrls: urls.length > 1 ? urls : undefined,
    imageIndex: 0,
  })
}

const toggleDrawTool = (tool: DrawTool) => {
  placingTextStyle.value = null
  colourPickerOpen.value = false
  drawTool.value = drawTool.value === tool ? null : tool
  if (drawTool.value) {
    clearActive()
    libraryOpen.value = false
  }
  currentStroke.value = null
  arrowHandleDrag.value = null
  tearState.value = null
}

const onCanvasClickSelf = () => {
  // Keep the chosen tear target while drawing outside the image
  if (drawTool.value === 'tear') return
  if (placingTextStyle.value) return
  clearActive()
}

const canvasPointFromEvent = (event: PointerEvent) => {
  const canvasRect = canvasEl.value?.getBoundingClientRect()
  if (!canvasRect) return { x: 0, y: 0 }
  return {
    x: event.clientX - canvasRect.left,
    y: event.clientY - canvasRect.top,
  }
}

const measureTearTarget = (id: string) => {
  if (!canvasEl.value) return null
  const item = placements.value.find((entry) => entry.id === id)
  if (!item || item.kind !== 'image') return null
  const itemEl = canvasEl.value.querySelector(
    `[data-placement-id="${CSS.escape(id)}"]`,
  ) as HTMLElement | null
  if (!itemEl) return null
  const canvasRect = canvasEl.value.getBoundingClientRect()
  const rect = itemEl.getBoundingClientRect()
  const scale = item.scale || 1
  return {
    id,
    layoutW: rect.width / scale,
    layoutH: rect.height / scale,
    originX: rect.left - canvasRect.left,
    originY: rect.top - canvasRect.top,
    scale,
  }
}

const canvasToLocal = (
  canvasPt: { x: number; y: number },
  target: { originX: number; originY: number; scale: number },
) => ({
  x: (canvasPt.x - target.originX) / target.scale,
  y: (canvasPt.y - target.originY) / target.scale,
})

const beginTearStroke = (event: PointerEvent) => {
  const id = tearTargetId.value
  if (!id || !canvasEl.value) return
  const measured = measureTearTarget(id)
  if (!measured) return
  const canvasPt = canvasPointFromEvent(event)
  const local = canvasToLocal(canvasPt, measured)
  tearState.value = {
    ...measured,
    localPath: [local],
    canvasPath: [canvasPt],
  }
  ;(event.currentTarget as Element | null)?.setPointerCapture?.(event.pointerId)
}

const updateTear = (event: PointerEvent) => {
  if (!tearState.value || !canvasEl.value) return
  const canvasRect = canvasEl.value.getBoundingClientRect()
  const { originX, originY, scale } = tearState.value

  const samples =
    typeof event.getCoalescedEvents === 'function' && event.getCoalescedEvents().length
      ? event.getCoalescedEvents()
      : [event]

  let localPath = tearState.value.localPath.slice()
  let canvasPath = tearState.value.canvasPath.slice()
  for (const sample of samples) {
    const canvasPt = {
      x: sample.clientX - canvasRect.left,
      y: sample.clientY - canvasRect.top,
    }
    const local = {
      x: (canvasPt.x - originX) / scale,
      y: (canvasPt.y - originY) / scale,
    }
    const prev = localPath[localPath.length - 1]
    if (prev && Math.hypot(local.x - prev.x, local.y - prev.y) < 0.45) continue
    localPath.push(local)
    canvasPath.push(canvasPt)
  }

  tearState.value = {
    ...tearState.value,
    localPath,
    canvasPath,
  }
}

const commitTear = () => {
  const state = tearState.value
  tearState.value = null
  if (!state) return
  tearItem(state.id, state.localPath, {
    width: state.layoutW,
    height: state.layoutH,
  })
  // Leave tear mode after a completed gesture — back to grab
  drawTool.value = null
}

const onUndoTear = () => {
  undoTear()
}

type Point = { x: number; y: number }

const pointsToAttr = (points: Point[]) =>
  points.map((p) => `${p.x},${p.y}`).join(' ')

const arrowHeadSize = (width: number) => ({
  length: Math.max(12, width * 4),
  width: Math.max(8, width * 2.5),
})

const arrowLineEnd = (from: Point, to: Point, strokeWidth: number): Point => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const { length } = arrowHeadSize(strokeWidth)
  if (len <= length) return { ...from }
  return {
    x: to.x - (dx / len) * length,
    y: to.y - (dy / len) * length,
  }
}

const arrowHeadAttr = (from: Point, to: Point, strokeWidth: number) => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const { length, width } = arrowHeadSize(strokeWidth)
  const bx = to.x - ux * length
  const by = to.y - uy * length
  const px = -uy * width
  const py = ux * width
  return `${to.x},${to.y} ${bx + px},${by + py} ${bx - px},${by - py}`
}

const drawPoint = (event: PointerEvent) => {
  const rect = canvasEl.value?.getBoundingClientRect()
  if (!rect) return { x: 0, y: 0 }
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

const onArrowSelect = (_event: PointerEvent, id: string) => {
  selectStroke(id)
  currentStroke.value = null
}

const onArrowHandleStart = (event: PointerEvent, id: string, end: 0 | 1) => {
  event.preventDefault()
  selectStroke(id)
  arrowHandleDrag.value = { id, end }
  ;(event.target as Element).setPointerCapture?.(event.pointerId)
}

const onDrawLayerPointerDown = (event: PointerEvent) => {
  if (!drawTool.value) return
  if ((event.target as Element).closest?.('[data-arrow-id], [data-arrow-handle]')) {
    return
  }

  // Tear stage 2: draw freehand across the canvas (may start outside the image)
  if (drawTool.value === 'tear') {
    if (!tearStrokeReady.value) return
    event.preventDefault()
    beginTearStroke(event)
    return
  }

  event.preventDefault()
  selectStroke(null)
  ;(event.currentTarget as Element).setPointerCapture?.(event.pointerId)
  const point = drawPoint(event)
  const isArrow = drawTool.value === 'arrow'
  currentStroke.value = {
    kind: isArrow ? 'arrow' : 'freehand',
    color: isArrow ? ARROW_COLOR : penColour.value,
    width: isArrow ? ARROW_WIDTH : penWidth.value,
    points: isArrow ? [point, point] : [point],
  }
}

const onDrawMove = (event: PointerEvent) => {
  if (tearState.value) {
    updateTear(event)
    return
  }
  if (arrowHandleDrag.value) {
    const { id, end } = arrowHandleDrag.value
    const stroke = strokes.value.find((s) => s.id === id)
    if (!stroke || stroke.points.length < 2) return
    const point = drawPoint(event)
    const next = stroke.points.map((p) => ({ ...p }))
    next[end] = point
    updateStrokePoints(id, next)
    return
  }
  if (!drawTool.value || !currentStroke.value) return
  const point = drawPoint(event)
  if (currentStroke.value.kind === 'arrow') {
    currentStroke.value.points = [currentStroke.value.points[0], point]
    return
  }
  currentStroke.value.points.push(point)
}

const onDrawEnd = () => {
  if (tearState.value) {
    commitTear()
    return
  }
  if (arrowHandleDrag.value) {
    arrowHandleDrag.value = null
    return
  }
  if (!currentStroke.value) return
  const stroke = currentStroke.value
  const [start, end] = stroke.points
  const worthSaving =
    stroke.kind === 'arrow'
      ? Boolean(start && end && Math.hypot(end.x - start.x, end.y - start.y) > 4)
      : stroke.points.length > 1

  if (worthSaving) {
    const id = `stroke-${Date.now()}-${Math.round(Math.random() * 1000)}`
    addStroke({
      id,
      kind: stroke.kind,
      color: stroke.color,
      width: stroke.width,
      points: stroke.points,
    })
    if (stroke.kind === 'arrow') selectStroke(id)
  }
  currentStroke.value = null
}

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && confirmingDelete.value) {
    event.preventDefault()
    confirmingDelete.value = false
    return
  }
  if (event.key === 'Escape' && colourPickerOpen.value) {
    event.preventDefault()
    colourPickerOpen.value = false
    return
  }
  if (editingId.value || titleEditing.value) return
  const target = event.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    return
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    if (event.shiftKey) redoBoard()
    else undoBoard()
    return
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
    event.preventDefault()
    redoBoard()
    return
  }
  if (event.key === 'Escape' && placingTextStyle.value) {
    event.preventDefault()
    placingTextStyle.value = null
    return
  }
  if (event.key === 'Escape' && drawTool.value === 'tear') {
    event.preventDefault()
    if (tearState.value) {
      tearState.value = null
      return
    }
    if (tearTargetId.value) {
      clearActive()
      return
    }
    drawTool.value = null
    return
  }
  if ((event.key === 'Delete' || event.key === 'Backspace') && activeStrokeId.value) {
    event.preventDefault()
    removeStroke(activeStrokeId.value)
  }
}

const armTextPlacement = (style: 'mono' | 'handwritten') => {
  drawTool.value = null
  currentStroke.value = null
  tearState.value = null
  colourPickerOpen.value = false
  placingTextStyle.value = placingTextStyle.value === style ? null : style
  if (placingTextStyle.value) {
    clearActive()
    libraryOpen.value = false
  }
}

const onAddText = () => armTextPlacement('mono')

const onAddHandwrittenText = () => armTextPlacement('handwritten')

const onPlaceText = (event: PointerEvent) => {
  const style = placingTextStyle.value
  if (!style) return
  const { x, y } = canvasPointFromEvent(event)
  placingTextStyle.value = null
  const id = addText('', style, { x, y })
  nextTick(() => startEditing(id))
}

const startEditing = (id: string) => {
  dragState.value = null
  textEditGesture.value = null
  editingId.value = id
  const item = placements.value.find((entry) => entry.id === id)
  const isEmpty = !(item?.text || '').trim()
  nextTick(() => {
    const el = document.querySelector<HTMLElement>(`[data-editing="${id}"]`)
    if (!el) return
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(isEmpty) // empty → start; existing → end
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  })
}

const onTextBlur = (event: FocusEvent, id: string) => {
  const value = (event.target as HTMLElement).innerText.trim()
  editingId.value = null
  if (!value) {
    removeItem(id)
    return
  }
  updateText(id, value)
}

const onTextDblClick = (event: MouseEvent, id: string) => {
  event.preventDefault()
  event.stopPropagation()
  startEditing(id)
}

const onTextPointerDown = (event: PointerEvent, id: string) => {
  // Don't let the item wrapper also handle this press
  event.stopPropagation()
  if (editingId.value === id) return

  const wasSelected =
    selectedIds.value.length === 1 && selectedIds.value[0] === id
  textEditGesture.value = {
    id,
    x: event.clientX,
    y: event.clientY,
    wasSelected,
  }
  onPointerDown(event, id)
}

const onPointerDown = (event: PointerEvent, id: string) => {
  const target = event.currentTarget as HTMLElement

  // Tear stage 1: click an image to choose the tear target
  if (drawTool.value === 'tear') {
    const item = placements.value.find((entry) => entry.id === id)
    if (item?.kind === 'image') {
      selectedIds.value = [id]
      activeId.value = id
      activeStrokeId.value = null
    }
    return
  }

  // Shift+click toggles membership — no drag so the click stays a select action
  if (event.shiftKey) {
    bringToFront(id, { additive: true })
    return
  }

  const keepGroup =
    selectedIds.value.includes(id) && selectedIds.value.length > 1
  bringToFront(id, keepGroup ? { preserveSelection: true } : undefined)

  if (!canvasEl.value) return
  const canvasRect = canvasEl.value.getBoundingClientRect()
  const ids = keepGroup ? [...selectedIds.value] : [id]
  const origins: Record<string, { x: number; y: number }> = {}
  for (const sid of ids) {
    const item = placements.value.find((entry) => entry.id === sid)
    if (item) origins[sid] = { x: item.x, y: item.y }
  }
  dragState.value = {
    ids,
    origins,
    startPointerX: event.clientX - canvasRect.left,
    startPointerY: event.clientY - canvasRect.top,
  }
  target.setPointerCapture?.(event.pointerId)
}

const onResizeStart = (event: PointerEvent, id: string, corner: Corner) => {
  if (!canvasEl.value) return
  const itemEl = (event.target as HTMLElement).closest('.moodboard__item') as HTMLElement | null
  if (!itemEl) return

  const item = placements.value.find((p) => p.id === id)
  // Text size follows the copy — not a free resize
  if (!item || item.kind === 'text') return
  const scale = item?.scale ?? 1
  const rect = itemEl.getBoundingClientRect()
  const canvasRect = canvasEl.value.getBoundingClientRect()

  const left = rect.left - canvasRect.left
  const top = rect.top - canvasRect.top
  const right = left + rect.width
  const bottom = top + rect.height

  // Anchor = the corner opposite the one being dragged (stays fixed)
  const anchor = {
    tl: { x: right, y: bottom },
    tr: { x: left, y: bottom },
    bl: { x: right, y: top },
    br: { x: left, y: top },
  }[corner]

  resizeState.value = {
    id,
    corner,
    anchorX: anchor.x,
    anchorY: anchor.y,
    baseW: rect.width / scale,
    baseH: rect.height / scale,
  }
  itemEl.setPointerCapture?.(event.pointerId)
  bringToFront(id)
}

const onPointerMove = (event: PointerEvent) => {
  if (!canvasEl.value) return
  const canvasRect = canvasEl.value.getBoundingClientRect()

  if (tearState.value) {
    updateTear(event)
    return
  }

  if (arrowHandleDrag.value) {
    const { id, end } = arrowHandleDrag.value
    const stroke = strokes.value.find((s) => s.id === id)
    if (!stroke || stroke.points.length < 2) return
    const point = {
      x: event.clientX - canvasRect.left,
      y: event.clientY - canvasRect.top,
    }
    const next = stroke.points.map((p) => ({ ...p }))
    next[end] = point
    updateStrokePoints(id, next)
    return
  }

  if (resizeState.value) {
    const { id, corner, anchorX, anchorY, baseW, baseH } = resizeState.value
    const px = event.clientX - canvasRect.left
    const py = event.clientY - canvasRect.top
    const newW = Math.abs(px - anchorX)
    const newH = Math.abs(py - anchorY)
    const scale = Math.max(0.25, Math.min(6, Math.max(newW / baseW, newH / baseH)))
    const w = baseW * scale
    const h = baseH * scale
    const x = corner === 'br' || corner === 'tr' ? anchorX : anchorX - w
    const y = corner === 'br' || corner === 'bl' ? anchorY : anchorY - h
    updatePosition(id, x, y)
    updateScale(id, scale)
    return
  }

  if (dragState.value) {
    const { ids, origins, startPointerX, startPointerY } = dragState.value
    const dx = event.clientX - canvasRect.left - startPointerX
    const dy = event.clientY - canvasRect.top - startPointerY
    updatePositions(
      ids.map((sid) => {
        const origin = origins[sid] || { x: 0, y: 0 }
        return { id: sid, x: origin.x + dx, y: origin.y + dy }
      }),
    )
  }
}

const onPointerUp = (event?: PointerEvent) => {
  if (tearState.value) {
    commitTear()
    return
  }

  const gesture = textEditGesture.value
  textEditGesture.value = null
  if (gesture && event && gesture.wasSelected && editingId.value !== gesture.id) {
    const moved = Math.hypot(
      event.clientX - gesture.x,
      event.clientY - gesture.y,
    )
    // Second click on an already-selected text box → edit (if it wasn’t a drag)
    if (moved < 6) {
      dragState.value = null
      resizeState.value = null
      arrowHandleDrag.value = null
      startEditing(gesture.id)
      return
    }
  }

  dragState.value = null
  resizeState.value = null
  arrowHandleDrag.value = null
  flushHistoryCommit()
}

const downloadScreenshot = async () => {
  if (!canvasEl.value || !import.meta.client) return
  const { default: html2canvas } = await import('html2canvas')
  const canvas = await html2canvas(canvasEl.value, {
    backgroundColor: '#F1EDE4',
    scale: 2,
    useCORS: true,
    logging: false,
  })
  const link = document.createElement('a')
  link.download = 'studio-based-upon-moodboard.png'
  link.href = canvas.toDataURL('image/png')
  link.click()
}

/** Remote images can't use crossOrigin on Sanity (403) — proxy for canvas export. */
const isRemoteImageUrl = (url?: string | null) => {
  if (!url || !import.meta.client) return false
  if (url.startsWith('data:') || url.startsWith('blob:')) return false
  if (!/^https?:\/\//i.test(url)) return false
  try {
    return new URL(url, window.location.href).origin !== window.location.origin
  } catch {
    return true
  }
}

const proxiedImageUrl = (url: string) => {
  if (!isRemoteImageUrl(url)) return url
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

const loadCaptureImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load ${url}`))
    // Same-origin proxy — no crossOrigin attribute (avoids Sanity CORS 403)
    img.src = proxiedImageUrl(url)
  })

const boardCaptureBg = () =>
  getComputedStyle(document.documentElement)
    .getPropertyValue('--cream')
    .trim() || '#F1EDE4'

const applyCaptureClipPath = (
  ctx: CanvasRenderingContext2D,
  clip: string | undefined,
  w: number,
  h: number,
) => {
  const pts = parseMoodboardClipPath(clip, w, h)
  if (!pts?.length) return false
  ctx.beginPath()
  ctx.moveTo(pts[0]!.x, pts[0]!.y)
  for (let i = 1; i < pts.length; i += 1) {
    ctx.lineTo(pts[i]!.x, pts[i]!.y)
  }
  ctx.closePath()
  ctx.clip()
  return true
}

/** Draw board items onto a canvas via same-origin proxied images. */
const captureBoardPreviewFromItems = async (): Promise<{
  preview: string
  aspect: number
} | null> => {
  if (!canvasEl.value) return null
  const rect = canvasEl.value.getBoundingClientRect()
  if (rect.width < 2 || rect.height < 2) return null
  const scale = 0.35
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(rect.width * scale))
  canvas.height = Math.max(1, Math.round(rect.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = boardCaptureBg()
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const ordered = [...placements.value].sort((a, b) => a.z - b.z)
  for (const item of ordered) {
    const x = item.x * scale
    const y = item.y * scale
    const itemScale = (item.scale || 1) * scale
    if (item.kind === 'image' && item.imageUrl) {
      try {
        const img = await loadCaptureImage(item.imageUrl)
        const layoutW = item.width || 210
        const layoutH = item.height
          ? item.height
          : (img.naturalHeight / Math.max(img.naturalWidth, 1)) * layoutW
        const w = layoutW * itemScale
        const h = layoutH * itemScale
        ctx.save()
        ctx.translate(x, y)
        if (
          item.tearBackClipPath &&
          !isLikelyTransparentImage(item.imageUrl)
        ) {
          ctx.save()
          applyCaptureClipPath(ctx, item.tearBackClipPath, w, h)
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, w, h)
          ctx.restore()
        }
        if (item.clipPath) {
          applyCaptureClipPath(ctx, item.clipPath, w, h)
        }
        if (item.sourceWidth != null) {
          const srcW = item.sourceWidth * itemScale
          const srcH = (item.sourceHeight || item.sourceWidth) * itemScale
          const cropX = (item.cropX || 0) * itemScale
          const cropY = (item.cropY || 0) * itemScale
          ctx.drawImage(img, -cropX, -cropY, srcW, srcH)
        } else {
          ctx.drawImage(img, 0, 0, w, h)
        }
        ctx.restore()
      } catch {
        /* skip image that won't load */
      }
    } else if (item.kind === 'colour' && item.colour) {
      const size = 160 * itemScale
      ctx.fillStyle = item.colour
      ctx.fillRect(x, y, size, size)
    } else if (item.kind === 'text' && item.text) {
      ctx.fillStyle =
        getComputedStyle(document.documentElement)
          .getPropertyValue('--charcoal')
          .trim() || '#1a1a1a'
      ctx.font = `${14 * itemScale}px sans-serif`
      ctx.fillText(item.text.slice(0, 80), x, y + 14 * itemScale)
    }
  }

  return {
    preview: canvas.toDataURL('image/jpeg', 0.72),
    aspect: canvas.width / Math.max(canvas.height, 1),
  }
}

/** Compact JPEG for board list thumbnails (kept small for localStorage). */
const captureBoardPreview = async (): Promise<{
  preview: string
  aspect: number
} | null> => {
  if (!canvasEl.value || !import.meta.client) return null
  const prevTool = drawTool.value
  clearActive()
  drawTool.value = null
  libraryOpen.value = false
  switchOpen.value = false
  colourPickerOpen.value = false
  confirmingDelete.value = false
  isCapturingPreview.value = true
  await nextTick()
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  )
  try {
    // Prefer proxied draw — Sanity CDN blocks browser CORS (crossOrigin → 403)
    const shot = await captureBoardPreviewFromItems()
    if (shot?.preview) return shot

    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(canvasEl.value, {
      backgroundColor: boardCaptureBg(),
      scale: 0.4,
      useCORS: true,
      allowTaint: false,
      imageTimeout: 15000,
      logging: false,
      onclone: (_doc, element) => {
        element.classList.remove('grid-bg')
        element.style.backgroundImage = 'none'
        element.querySelectorAll('img').forEach((img) => {
          const src = img.getAttribute('src') || ''
          if (!isRemoteImageUrl(src)) return
          img.removeAttribute('crossorigin')
          img.src = proxiedImageUrl(src)
        })
      },
      ignoreElements: (el) => {
        const node = el as HTMLElement
        if (!node?.classList) return false
        return (
          node.classList.contains('moodboard__chip') ||
          node.classList.contains('moodboard__restore') ||
          node.classList.contains('moodboard__remove') ||
          node.classList.contains('moodboard__handle') ||
          node.classList.contains('moodboard__cycle') ||
          node.classList.contains('moodboard__tear-line') ||
          node.classList.contains('moodboard__actions') ||
          node.classList.contains('moodboard__panel') ||
          node.classList.contains('moodboard__pen-bar') ||
          node.classList.contains('moodboard__tear-hint') ||
          node.classList.contains('moodboard__tear-undo') ||
          node.classList.contains('moodboard__history') ||
          node.classList.contains('moodboard__confirm') ||
          node.classList.contains('moodboard__colour-popover')
        )
      },
    })
    return {
      preview: canvas.toDataURL('image/jpeg', 0.7),
      aspect: canvas.width / Math.max(canvas.height, 1),
    }
  } catch {
    return null
  } finally {
    isCapturingPreview.value = false
    drawTool.value = prevTool
  }
}

const sendEnquiry = async () => {
  if (!placements.value.length || !import.meta.client) return

  clearActive()
  await nextTick()

  let screenshot: string | null = null
  if (canvasEl.value) {
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(canvasEl.value, {
      backgroundColor: '#F1EDE4',
      scale: 1,
      useCORS: true,
      logging: false,
    })
    screenshot = canvas.toDataURL('image/png')
  }

  openFromMoodboard(placements.value, screenshot)
}

/** Keep draft in localStorage so refresh can reopen the board composer. */
let sessionPersistTimer: ReturnType<typeof setTimeout> | null = null
const queuePersistSession = () => {
  if (!import.meta.client) return
  if (sessionPersistTimer) clearTimeout(sessionPersistTimer)
  sessionPersistTimer = setTimeout(() => {
    sessionPersistTimer = null
    if (!isMoodboard.value) {
      clearMoodboardSession()
      return
    }
    persistMoodboardSession({
      activeBoardId: activeBoardId.value,
      placements: placements.value,
      strokes: strokes.value,
    })
  }, 120)
}

watch(
  [isMoodboard, placements, strokes, activeBoardId, parkedSelectionItems],
  () => {
    queuePersistSession()
  },
  { deep: true },
)

watch(
  [placements, strokes, tearUndo],
  () => {
    queueHistoryCommit()
  },
  { deep: true },
)

watch(surfacePresent, (present) => {
  if (present) nextTick(() => resetHistory())
  else resetHistory()
})

onMounted(() => {
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp as EventListener)
  window.addEventListener('keydown', onKeyDown)
  document.addEventListener('click', onDocumentClick)

  // Staged open: after Flip — show items + fade canvas grid in
  registerMoodboardStagedReveal(async () => {
    instantHide.value = false
    itemsOut.value = false
    gridOut.value = false
    await waitMs(MOODBOARD_GRID_FADE_MS)
  })

  // Staged open: tools + toolbox enter after grid
  registerMoodboardChromeEnter(async () => {
    chromeOut.value = false
    panelReady.value = true
    markMoodboardSurfaceReady()
    await waitMs(MOODBOARD_PANEL_FADE_MS)
  })

  // Resume board composer after refresh
  const session = readMoodboardSession()
  if (session?.open) {
    if (session.activeBoardId) setActiveBoard(session.activeBoardId)
    loadBoard(
      (session.placements || []) as typeof placements.value,
      (session.strokes || []) as typeof strokes.value,
    )
    setParkedSelectionItems(session.parked || [])
    openMoodboard({ skipBgFade: true, resume: true })
  }
})

onUnmounted(() => {
  // Keep cancelRevertTimer alive so discard can finish after this dialog unmounts.
  if (sessionPersistTimer) clearTimeout(sessionPersistTimer)
  if (historyTimer) clearTimeout(historyTimer)
  registerMoodboardStagedReveal(null)
  registerMoodboardChromeEnter(null)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp as EventListener)
  window.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('click', onDocumentClick)
})
</script>

<style scoped>
.moodboard {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: transparent;
  display: flex;
  flex-direction: column;
  overscroll-behavior: none;
}

/* Background layer — fades independently of the info panel */
.moodboard::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: var(--cream);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.42s ease;
}

.moodboard--ready::before {
  opacity: 1;
}

/* Close / staged open — kill composer instantly (flyer covers the board shot) */
.moodboard--instant-hide {
  opacity: 0 !important;
  transition: none !important;
  pointer-events: none !important;
}

.moodboard--instant-hide::before {
  opacity: 0 !important;
  transition: none !important;
}

.moodboard--items-out .moodboard__item,
.moodboard--items-out .moodboard__draw-layer {
  opacity: 0 !important;
  transition: opacity 0.32s ease;
}

/* Canvas grid as overlay so it can fade independently of cream/items */
.moodboard__canvas.grid-bg {
  background-image: none !important;
  background-color: transparent !important;
}

.moodboard__canvas.grid-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image:
    linear-gradient(var(--grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
  background-size: 48px 48px;
  opacity: 1;
  transition: opacity 0.32s ease;
}

.moodboard--grid-out .moodboard__canvas.grid-bg::before {
  opacity: 0;
  transition: none;
}

/* Thumbnail capture — board content only, no selection/tools chrome */
.moodboard--capturing .moodboard__canvas.grid-bg {
  background-image: none !important;
}

.moodboard--capturing .moodboard__canvas.grid-bg::before {
  opacity: 0 !important;
  visibility: hidden !important;
}

.moodboard--capturing .moodboard__item--active,
.moodboard--capturing .moodboard__item--active.moodboard__item--multi {
  box-shadow: none !important;
}

.moodboard--capturing .moodboard__chip,
.moodboard--capturing .moodboard__restore,
.moodboard--capturing .moodboard__remove,
.moodboard--capturing .moodboard__handle,
.moodboard--capturing .moodboard__cycle,
.moodboard--capturing .moodboard__tear-line,
.moodboard--capturing .moodboard__arrow-handle,
.moodboard--capturing .moodboard__arrow--active .moodboard__arrow-hit,
.moodboard--capturing .moodboard__history {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

.moodboard__actions,
.moodboard__pen-bar,
.moodboard__history {
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 0.32s ease,
    transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.moodboard__panel {
  opacity: 1;
  pointer-events: none;
  transform: translateY(calc(100% + var(--gutter) + 1rem));
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.moodboard--panel-ready .moodboard__panel {
  pointer-events: auto;
  transform: translateY(0);
}

.moodboard--panel-ready .moodboard__actions,
.moodboard--panel-ready .moodboard__pen-bar,
.moodboard--panel-ready .moodboard__history {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0);
}

.moodboard--panel-ready .moodboard__history {
  transform: translateX(-50%);
}

.moodboard--panel-ready .moodboard__tear-hint {
  opacity: 1;
}

.moodboard--panel-ready .moodboard__tear-undo {
  pointer-events: auto;
}

/* Close: tools slide off to the right, toolbox down */
.moodboard--chrome-out .moodboard__panel {
  pointer-events: none;
  transform: translateY(calc(100% + var(--gutter) + 1rem));
}

.moodboard--chrome-out .moodboard__actions,
.moodboard--chrome-out .moodboard__pen-bar {
  opacity: 0;
  pointer-events: none;
  transform: translateX(calc(100% + var(--gutter) + 1rem));
}

.moodboard--chrome-out .moodboard__history {
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 2.5rem);
}

.moodboard--items-out .moodboard__panel {
  pointer-events: none;
  transform: translateY(calc(100% + var(--gutter) + 1rem));
}

.moodboard--items-out .moodboard__actions,
.moodboard--items-out .moodboard__pen-bar,
.moodboard--items-out .moodboard__history {
  opacity: 0;
  pointer-events: none;
}

.moodboard__history {
  --history-cell: 36px;
  position: absolute;
  left: 50%;
  bottom: var(--history-cell);
  z-index: 400;
  display: flex;
  align-items: center;
  width: calc(calc(var(--history-cell) * 2) + 10px);
  height: var(--history-cell);
  transform: translateX(-50%);
  background: var(--warm-white);
  /* Match grid lines as painted on cream (raw --grid-line looks darker on frosted/white) */
  border: 1px solid color-mix(in srgb, var(--black) 6%, var(--cream));
  border-radius: 0px;
  box-sizing: border-box;
  overflow: hidden;
  gap: 7px;
  padding: 0 5px;
}

.moodboard__history-btn {
  flex: 1;
  height: 100%;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.15s ease;
}

.moodboard__history-btn:hover:not(:disabled) {
  color: var(--charcoal);
}

.moodboard__history-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.moodboard__history-btn svg {
  display: block;
}

.moodboard__history-divider {
  flex-shrink: 0;
  width: 1px;
  height: 1rem;
  background: var(--grid-line);
}

.moodboard__switcher {
  position: relative;
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
}

.moodboard__switcher-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  max-width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--charcoal);
}

.moodboard__panel-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--serif);
  font-size: var(--text-md);
  font-weight: 400;
  font-style: normal;
  letter-spacing: 0.01em;
  line-height: 1.15;
  text-transform: capitalize;
  color: var(--charcoal);
  caret-color: var(--charcoal);
  outline: none;
  cursor: pointer;
}

.moodboard__panel-title[contenteditable='true'] {
  cursor: text;
  overflow: visible;
  text-overflow: clip;
}

.moodboard__switcher-option {
  text-transform: capitalize;
}

.moodboard__switcher-caret-btn {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 1rem;
  height: 1rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}

.moodboard__switcher-caret-btn:hover {
  color: var(--charcoal);
}

.moodboard__switcher-caret {
  display: block;
  width: 7px;
  height: 7px;
  border-right: 1px solid currentColor;
  border-bottom: 1px solid currentColor;
  transform: rotate(45deg);
  transition: transform 0.2s ease;
  margin-bottom: 3px;
}

.moodboard__switcher-caret-btn[aria-expanded='true'] .moodboard__switcher-caret {
  transform: rotate(225deg);
  margin-bottom: -3px;
}

.moodboard__switcher-menu {
  position: absolute;
  left: 0;
  bottom: calc(100% + 0.4rem);
  z-index: 10;
  min-width: 100%;
  display: flex;
  flex-direction: column;
  padding: 0.25rem;
  background: var(--elevated-bg, var(--warm-white));
  border: 1px solid var(--grid-line);
  border-radius: 4px;
  box-shadow: none;
}

.moodboard__switcher-option {
  padding: 0.45rem 0.55rem;
  font-size: var(--text-xs);
  text-align: left;
  color: var(--muted);
  border: 0;
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  transition: color 0.15s ease;
}

.moodboard__switcher-option:hover,
.moodboard__switcher-option--active {
  color: var(--charcoal);
}

.moodboard__workspace {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.moodboard__canvas {
  position: relative;
  flex: 1;
  overflow: hidden;
  touch-action: none;
}

.moodboard__draw-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 200;
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.32s ease;
}

.moodboard__draw-layer--active {
  pointer-events: auto;
  cursor: crosshair;
}

.moodboard__arrow-hit {
  pointer-events: stroke;
  cursor: pointer;
}

.moodboard__arrow-handle {
  pointer-events: auto;
  fill: var(--elevated-bg);
  stroke: var(--charcoal);
  stroke-width: 1.5;
  cursor: grab;
}

.moodboard__arrow-handle:active {
  cursor: grabbing;
}

.moodboard__canvas--drawing .moodboard__item {
  cursor: crosshair;
  pointer-events: none;
}

/* Stage 1: pick an image. Stage 2 (tear-ready): overlay captures the stroke. */
.moodboard__canvas--tearing:not(.moodboard__canvas--tear-ready) .moodboard__item--image {
  cursor: pointer;
}

.moodboard__canvas--tear-ready .moodboard__item {
  pointer-events: none;
}

.moodboard__canvas--tear-ready {
  cursor: crosshair;
}

/* I-beam with top/bottom spurs — ready to place handwritten text */
.moodboard__place-layer {
  position: absolute;
  inset: 0;
  z-index: 500;
  /* white halo then charcoal stroke so it reads on light and dark boards */
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='24' viewBox='0 0 16 24'%3E%3Cg fill='none' stroke='white' stroke-width='3.5' stroke-linecap='round'%3E%3Cpath d='M3.5 2.5h9'/%3E%3Cpath d='M8 2.5v19'/%3E%3Cpath d='M3.5 21.5h9'/%3E%3C/g%3E%3Cg fill='none' stroke='%231a1a1a' stroke-width='1.6' stroke-linecap='round'%3E%3Cpath d='M3.5 2.5h9'/%3E%3Cpath d='M8 2.5v19'/%3E%3Cpath d='M3.5 21.5h9'/%3E%3C/g%3E%3C/svg%3E")
      8 12,
    text;
}

html.dark .moodboard__place-layer {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='24' viewBox='0 0 16 24'%3E%3Cg fill='none' stroke='%231a1a1a' stroke-width='3.5' stroke-linecap='round'%3E%3Cpath d='M3.5 2.5h9'/%3E%3Cpath d='M8 2.5v19'/%3E%3Cpath d='M3.5 21.5h9'/%3E%3C/g%3E%3Cg fill='none' stroke='%23f5f0e8' stroke-width='1.6' stroke-linecap='round'%3E%3Cpath d='M3.5 2.5h9'/%3E%3Cpath d='M8 2.5v19'/%3E%3Cpath d='M3.5 21.5h9'/%3E%3C/g%3E%3C/svg%3E")
      8 12,
    text;
}

.moodboard__tear-line {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 260;
  pointer-events: none;
  overflow: visible;
}

.moodboard__tear-hint {
  position: absolute;
  top: var(--gutter);
  left: 50%;
  z-index: 400;
  margin: 0;
  padding: 0.4rem 0.75rem;
  transform: translateX(-50%);
  font-size: var(--text-sm);
  color: var(--charcoal);
  background: var(--panel-bg, var(--warm-white));
  border: 1px solid var(--grid-line);
  opacity: 0;
  pointer-events: none;
}

.moodboard__tear-undo {
  position: absolute;
  top: var(--gutter);
  left: 50%;
  z-index: 400;
  transform: translateX(-50%);
  min-width: 7.5rem;
  background: var(--warm-white);
  border: 1px solid var(--grid-line);
  border-radius: 0;
}

.moodboard__item {
  position: absolute;
  top: 0;
  left: 0;
  width: 210px;
  cursor: grab;
  user-select: none;
  transform-origin: center;
  opacity: 1;
  transition: box-shadow 0.2s ease, opacity 0.32s ease;
}

/*
 * Outline is drawn in local space under scale() — multiply by --inv-scale
 * so it always reads as 1px (or 2px when multi-selected) on screen.
 */
.moodboard__item--active {
  box-shadow: 0 0 0 calc(1px * var(--inv-scale, 1))
    color-mix(in srgb, var(--charcoal) 40%, transparent);
}

.moodboard__item--active.moodboard__item--multi {
  box-shadow: 0 0 0 calc(2px * var(--inv-scale, 1))
    color-mix(in srgb, var(--charcoal) 40%, transparent);
}

.moodboard__item--contain img {
  object-fit: contain;
}

/* Natural drop size — box is already fitted to stack content proportions */
.moodboard__item--natural img:not(.moodboard__image--cropped) {
  width: 100%;
  height: 100%;
  aspect-ratio: auto;
  object-fit: fill;
  padding: 0;
  box-sizing: border-box;
}

.moodboard__item--returning {
  opacity: 0 !important;
  pointer-events: none;
}

/* Resize handles */
.moodboard__handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: var(--elevated-bg);
  border: 0.05em solid var(--charcoal);
  border-radius: 0px;
  z-index: 10;
}

.moodboard__handle--tl {
  top: 0;
  left: 0;
  cursor: nwse-resize;
}

.moodboard__handle--tr {
  top: 0;
  left: 100%;
  cursor: nesw-resize;
}

.moodboard__handle--bl {
  top: 100%;
  left: 0;
  cursor: nesw-resize;
}

.moodboard__handle--br {
  top: 100%;
  left: 100%;
  cursor: nwse-resize;
}

.moodboard__tear-back {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: #fff;
  pointer-events: none;
}

.moodboard__image-clip {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.moodboard__item img {
  position: relative;
  z-index: 1;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

.moodboard__image--cropped {
  position: absolute;
  z-index: 1;
  max-width: none;
  aspect-ratio: auto;
  object-fit: fill;
  pointer-events: none;
}

/* Match cart cell prev/next — boxed, bottom-right inset */
.moodboard__cycle {
  position: absolute;
  right: var(--thumb-ctrl-inset, 4px);
  bottom: var(--thumb-ctrl-inset, 4px);
  z-index: 3;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
  transform-origin: bottom right;
}

/* Colour card */
.moodboard__item--colour {
  width: 160px;
}

.moodboard__swatch {
  display: flex;
  flex-direction: column;
  background: var(--warm-white);
  border: none;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
}

.moodboard__swatch-fill {
  display: block;
  width: 100%;
  aspect-ratio: 1;
}

.moodboard__swatch-hex {
  padding: 0.6rem 0.75rem;
  font-size: var(--text-sm);
  letter-spacing: 0.08em;
  text-align: center;
  color: var(--charcoal);
  /* Keep type size stable when the item is scaled */
  transform: scale(var(--inv-scale, 1));
  transform-origin: center top;
}

/* Text item — box hugs the copy; not freely resized */
.moodboard__item--text {
  width: max-content;
  max-width: none;
  min-width: 0;
}

.moodboard__text {
  display: block;
  width: max-content;
  max-width: 400px;
  padding: 0.2rem 0.4rem;
  font-size: clamp(0.75rem, 1.2vw, 0.9rem);
  line-height: 1.25;
  color: var(--charcoal);
  outline: none;
  white-space: pre-wrap;
  cursor: grab;
  background: transparent;
  user-select: none;
  -webkit-user-select: none;
}

.moodboard__text--handwritten {
  font-family: var(--handwritten);
  font-size: clamp(0.95rem, 1.35vw, 1.3rem);
  font-style: normal;
  font-weight: 400;
  letter-spacing: 0.02em;
  line-height: 1.4;
  text-transform: none;
  color: var(--handwritten-color, var(--charcoal));
  max-width: 400px;
  padding: 0.1rem 0.15rem;
}

.moodboard__text[contenteditable='true'] {
  cursor: text;
  background: transparent;
  box-shadow: none;
  min-width: 0.65em;
  min-height: 1.2em;
  caret-color: var(--charcoal);
  user-select: text;
  -webkit-user-select: text;
}

.moodboard__text--handwritten[contenteditable='true'] {
  caret-color: var(--handwritten-color, var(--charcoal));
}

/* Spurred I-beam while waiting for the first character */
.moodboard__text[contenteditable='true']:empty::before,
.moodboard__text[contenteditable='true']:has(> br:only-child)::before {
  content: '';
  display: inline-block;
  width: 0.7em;
  height: 1.15em;
  vertical-align: -0.1em;
  background:
    linear-gradient(currentColor, currentColor) top / 100% 2px no-repeat,
    linear-gradient(currentColor, currentColor) bottom / 100% 2px no-repeat,
    linear-gradient(currentColor, currentColor) center / 1.5px 100% no-repeat;
  animation: moodboard-caret-blink 1.05s step-end infinite;
  pointer-events: none;
}

.moodboard__text[contenteditable='true']:empty,
.moodboard__text[contenteditable='true']:has(> br:only-child) {
  caret-color: transparent;
}

@keyframes moodboard-caret-blink {
  50% {
    opacity: 0;
  }
}

.moodboard__item--handwritten.moodboard__item--active {
  /* Keep selection as a light line only — no filled box */
  background: transparent;
}

/* Text: no selection outline unless part of a multi-select */
.moodboard__item--text.moodboard__item--active:not(.moodboard__item--multi) {
  box-shadow: none;
}

/* Shared chip controls (text remove) */
.moodboard__chip {
  position: absolute;
  top: -0.6rem;
  z-index: 4;
  height: 1.5rem;
  padding: 0 0.45rem;
  display: grid;
  place-items: center;
  font-size: 9px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1;
  color: var(--charcoal);
  background: var(--warm-white);
  border: 1px solid var(--grid-line);
  border-radius: 999px;
  opacity: 0;
  transition: opacity 0.15s ease;
  cursor: pointer;
  white-space: nowrap;
  pointer-events: none;
}

/* Match [-] remove control: inset, cream face, thumb radius */
.moodboard__restore {
  position: absolute;
  top: var(--thumb-ctrl-inset, 4px);
  left: var(--thumb-ctrl-inset, 4px);
  z-index: 4;
  height: var(--thumb-ctrl-size, 23px);
  padding: 0 0.45rem;
  display: grid;
  place-items: center;
  font-size: 9px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1;
  color: var(--thumb-ctrl-color, var(--charcoal));
  background: var(--thumb-ctrl-bg, var(--cream));
  border: 0;
  border-radius: var(--thumb-ctrl-radius, 4px);
  opacity: 0;
  transition: opacity 0.15s ease;
  cursor: pointer;
  white-space: nowrap;
  pointer-events: none;
  transform-origin: top left;
}

.moodboard__remove-chip {
  top: 0;
  right: 0;
  width: 1.5rem;
  padding: 0;
  border-radius: 2px;
  transform-origin: center center;
}

.moodboard__remove-minus {
  display: block;
  width: 0.65rem;
  height: 1.5px;
  background: currentColor;
}

/* Match cart cell remove control position (images / swatches) */
.moodboard__remove {
  position: absolute;
  top: var(--thumb-ctrl-inset, 4px);
  right: var(--thumb-ctrl-inset, 4px);
  z-index: 2;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
  transform-origin: top right;
  cursor: pointer;
}

.moodboard__item:hover .moodboard__chip,
.moodboard__item:hover .moodboard__restore,
.moodboard__item:hover .moodboard__remove,
.moodboard__item:hover .moodboard__cycle,
.moodboard__item--primary .moodboard__chip,
.moodboard__item--primary .moodboard__restore,
.moodboard__item--primary .moodboard__remove,
.moodboard__item--primary .moodboard__cycle {
  opacity: 1;
  pointer-events: auto;
}

/* Vertical tool rail — top right */
.moodboard__actions {
  position: absolute;
  top: var(--gutter);
  right: var(--gutter);
  z-index: 400;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.moodboard__action {
  width: 3rem;
  height: 3rem;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid var(--grid-line);
  background: transparent;
  color: var(--charcoal);
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.moodboard__action:hover {
  background: var(--elevated-bg, var(--warm-white));
  border-color: var(--charcoal);
}

.moodboard__action--active {
  background: var(--charcoal);
  color: var(--warm-white);
  border-color: var(--charcoal);
}

.moodboard__action--active:hover {
  background: var(--charcoal);
  color: var(--warm-white);
}

.moodboard__action--theme {
  position: relative;
}

.moodboard__theme-icon--moon {
  display: none;
}

/* Full :global — matches AppHeader theme icon swap */
:global(html.dark .moodboard__theme-icon--sun) {
  display: none;
}

:global(html.dark .moodboard__theme-icon--moon) {
  display: block;
}

/* Cart-style panel — bottom right */
.moodboard__panel {
  position: absolute;
  right: var(--gutter);
  bottom: calc(var(--gutter) + var(--boards-rail-push, 0px));
  z-index: 420;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: var(--side-column-width, 16rem);
  max-width: calc(100vw - (var(--gutter) * 2));
  padding: var(--gutter);
  box-sizing: border-box;
  background: var(--panel-bg, var(--warm-white));
  border: 1px solid color-mix(in srgb, var(--black) 6%, var(--cream));
  backdrop-filter: blur(50px);
  -webkit-backdrop-filter: blur(50px);
}

.moodboard__panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.moodboard__panel-close {
  flex-shrink: 0;
  width: 25px;
  height: 25px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--charcoal);
  background: var(--elevated-bg, #fff);
  color: var(--charcoal);
  box-sizing: border-box;
  cursor: pointer;
}

.moodboard__panel-close:hover {
  color: var(--accent, var(--charcoal));
  border-color: currentColor;
}

.moodboard__panel-close-icon {
  position: relative;
  display: block;
  width: 11px;
  height: 11px;
}

.moodboard__panel-close-icon::before,
.moodboard__panel-close-icon::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 1px;
  background: currentColor;
}

.moodboard__panel-close-icon::before {
  transform: translate(-50%, -50%) rotate(45deg);
}

.moodboard__panel-close-icon::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}

.moodboard__panel-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.moodboard__panel-count {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--muted);
  min-width: 0;
}

.moodboard__panel-tools {
  display: flex;
  align-items: center;
  gap: 0;
  margin-left: auto;
  flex-shrink: 0;
}

.moodboard__panel-tool {
  position: relative;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  /* Padding replaces gap so hover/tooltip stays continuous between icons */
  padding: 0.25rem;
  box-sizing: content-box;
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.15s ease;
}

.moodboard__panel-tool:hover {
  color: var(--charcoal);
}

.moodboard__panel-tool svg {
  display: block;
  shape-rendering: geometricPrecision;
}

.moodboard__panel-tooltip {
  position: absolute;
  bottom: calc(100% + 0.15rem);
  left: 50%;
  z-index: 5;
  padding: 0.35rem 0.55rem;
  font-size: var(--text-xs);
  color: var(--charcoal);
  white-space: nowrap;
  background: var(--elevated-bg);
  border: 1px solid var(--grid-line);
  border-radius: 6px;
  opacity: 0;
  pointer-events: none;
  transform: translateX(-50%) translateY(2px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.moodboard__panel-tool:hover .moodboard__panel-tooltip,
.moodboard__panel-tool:focus-visible .moodboard__panel-tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* Keep trailing tooltips inside the panel */
.moodboard__panel-tool:last-child .moodboard__panel-tooltip {
  left: auto;
  right: 0;
  transform: translateX(0) translateY(2px);
}

.moodboard__panel-tool:last-child:hover .moodboard__panel-tooltip,
.moodboard__panel-tool:last-child:focus-visible .moodboard__panel-tooltip {
  transform: translateX(0) translateY(0);
}

.moodboard__panel-link {
  align-self: flex-start;
  padding: 0;
  border: 0;
  background: transparent;
  font-size: var(--text-xs);
  color: var(--muted);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.moodboard__panel-link:hover {
  color: var(--charcoal);
}

.moodboard__panel .btn {
  width: 100%;
  border-radius: 0;
  border: 1px solid var(--grid-line);
}

.moodboard__panel .btn--filled {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--warm-white);
}

.moodboard__panel .btn--filled:hover {
  background: var(--charcoal);
  border-color: var(--charcoal);
  color: var(--warm-white);
}

.moodboard__confirm {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: grid;
  place-items: center;
  padding: var(--gutter);
  box-sizing: border-box;
  background: color-mix(in srgb, var(--charcoal) 28%, transparent);
  pointer-events: auto;
}

.moodboard__confirm-box {
  width: 100%;
  max-width: 22rem;
  padding: 1.5rem;
  background: var(--elevated-bg, var(--cream));
  border: 1px solid var(--grid-line);
  box-sizing: border-box;
}

.moodboard__confirm-title {
  margin: 0 0 0.5rem;
  font-size: var(--text-lg);
  color: var(--charcoal);
}

.moodboard__confirm-text {
  margin: 0 0 1.5rem;
  font-size: var(--text-sm);
  color: var(--muted);
}

.moodboard__confirm-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.moodboard__confirm-actions .btn {
  width: 100%;
  border-radius: 0;
  border: 1px solid var(--grid-line);
}

.moodboard__pen-bar {
  position: absolute;
  left: var(--gutter);
  bottom: var(--gutter);
  z-index: 400;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--warm-white);
  border: 1px solid var(--grid-line);
  border-radius: 999px;
}

.moodboard__pen-swatch {
  position: relative;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  border: 1px solid var(--grid-line);
  cursor: pointer;
}

.moodboard__pen-range {
  width: 7rem;
}

.moodboard__pen-clear {
  padding: 0.4rem 0.75rem;
  font-size: var(--text-xs);
}

.moodboard__action-swatch {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    #e0533d,
    #e0c93d,
    #4caf6d,
    #3d8fe0,
    #9b3de0,
    #e0533d
  );
}

.moodboard__action-text {
  font-size: 1.25rem;
  font-weight: 600;
}

.moodboard__action-text--script {
  font-family: var(--handwritten);
  font-style: normal;
  font-weight: 400;
  font-size: 1.35rem;
  line-height: 1;
  text-transform: none;
  letter-spacing: 0;
}

.moodboard__colour-tool {
  position: relative;
}

.moodboard__colour-popover {
  position: absolute;
  top: 50%;
  right: calc(100% + 0.65rem);
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.5rem;
  transform: translateY(-50%);
  background: var(--elevated-bg, var(--warm-white));
  border: 1px solid var(--grid-line);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.1);
}

.moodboard__colour-hex {
  width: 5.75rem;
  height: 2rem;
  padding: 0 0.55rem;
  border: 1px solid var(--grid-line);
  background: var(--warm-white);
  color: var(--charcoal);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.moodboard__colour-hex:focus {
  outline: none;
  border-color: var(--charcoal);
}

.moodboard__colour-preview {
  position: relative;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border: 1px solid var(--grid-line);
  cursor: pointer;
  overflow: hidden;
}

.moodboard__colour-add {
  height: 2rem;
  padding: 0 0.65rem;
  border: 1px solid var(--charcoal);
  background: var(--charcoal);
  color: var(--warm-white);
  cursor: pointer;
}

.moodboard__colour-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  border: 0;
  padding: 0;
}

.moodboard__sr-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

@media (max-width: 767px) {
  .moodboard__panel {
    width: calc(100vw - (var(--gutter) * 2));
  }

  .moodboard__actions {
    gap: 0.5rem;
  }

  .moodboard__action {
    width: 2.5rem;
    height: 2.5rem;
  }

}
</style>
