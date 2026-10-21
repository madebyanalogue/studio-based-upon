<template>
  <div class="d3-pick">
    <LabSubnav />
    <header class="d3-pick__bar">
      <div class="d3-pick__bar-copy">
        <p class="d3-pick__kicker interface">D3 pick</p>
        <h1 class="d3-pick__title">Select product frames</h1>
        <p class="d3-pick__meta interface">
          {{ selectedKeys.length }} selected
          <span aria-hidden="true">·</span>
          {{ visibleFrames.length }} shown
          <span aria-hidden="true">·</span>
          {{ frames.length }} total
        </p>
      </div>
      <div class="d3-pick__bar-tools">
        <label class="d3-pick__search">
          <span class="visually-hidden">Search</span>
          <input
            v-model="query"
            type="search"
            placeholder="Search title"
            autocomplete="off"
          />
        </label>
        <div class="d3-pick__filters" role="tablist" aria-label="Type">
          <button
            v-for="option in typeOptions"
            :key="option.id"
            type="button"
            class="interface"
            role="tab"
            :aria-selected="typeFilter === option.id"
            :class="{ 'is-on': typeFilter === option.id }"
            @click="typeFilter = option.id"
          >
            {{ option.label }}
          </button>
        </div>
        <label class="d3-pick__check interface">
          <input v-model="selectedOnly" type="checkbox" />
          Selected only
        </label>
        <div class="d3-pick__actions">
          <button type="button" class="btn" :disabled="!visibleFrames.length" @click="selectVisible">
            Select shown
          </button>
          <button type="button" class="btn" :disabled="!selectedKeys.length" @click="clearSelected">
            Clear
          </button>
          <button type="button" class="btn" :disabled="!payload.frames.length" @click="copyJson">
            {{ copied ? 'Copied' : 'Copy JSON' }}
          </button>
          <button
            type="button"
            class="btn btn--filled"
            :disabled="!payload.frames.length"
            @click="downloadJson"
          >
            Download JSON
          </button>
        </div>
      </div>
    </header>

    <p v-if="missingAssetCount" class="d3-pick__warn interface">
      {{ missingAssetCount }} selected
      {{ missingAssetCount === 1 ? 'frame has' : 'frames have' }}
      no Sanity asset id — those will not import.
    </p>

    <div class="d3-pick__grid">
      <button
        v-for="(frame, index) in visibleFrames"
        :key="frame.key"
        type="button"
        class="d3-pick__cell"
        :class="{ 'is-on': isSelected(frame.key) }"
        :aria-pressed="isSelected(frame.key)"
        :aria-label="`${isSelected(frame.key) ? 'Deselect' : 'Select'} ${frame.title}, frame ${frame.imageIndex + 1}`"
        @click="onToggle(frame, index, $event)"
      >
        <img :src="frame.thumb" :alt="frame.title" loading="lazy" draggable="false" />
        <span class="d3-pick__cell-mark" aria-hidden="true">{{ selectionOrder(frame.key) }}</span>
        <span class="d3-pick__cell-caption">
          <span class="d3-pick__cell-title">{{ frame.title }}</span>
          <span class="d3-pick__cell-sub">{{ frame.category }} · {{ frame.imageIndex + 1 }}</span>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PRODUCT_TYPE_FILTERS } from '~/composables/demoData'
import { productGalleryFrames } from '~/composables/productImages'
import { productPath, productSlug } from '~/composables/useProductCatalog'
import { IMAGE_WIDTH } from '~/composables/useSanityImage'

type PickFrame = {
  key: string
  productId: string
  assetId: string
  imageIndex: number
  title: string
  slug: string
  category: string
  link: string | null
  url: string
  thumb: string
}

const STORAGE_KEY = 'sba-d3-pick'
const typeOptions = [
  { id: 'all', label: 'All' },
  ...PRODUCT_TYPE_FILTERS.map((filter) => ({ id: filter.value, label: filter.label })),
]

const { items, precraftedItems } = await useLibraryCatalog()
const { imageUrl } = useSanityImage()

const query = ref('')
const typeFilter = ref('all')
const selectedOnly = ref(false)
const selectedKeys = ref<string[]>([])
const copied = ref(false)
let lastIndex = -1
let copyTimer = 0

const frames = computed<PickFrame[]>(() => {
  const list: PickFrame[] = []
  for (const item of [...items.value, ...precraftedItems.value]) {
    const gallery = productGalleryFrames(item)
    const slug = productSlug(item) || item._id
    const category = String(item.category || item.type || '').trim()
    gallery.forEach((frame, imageIndex) => {
      const assetId = String(frame.asset?._id || '')
      const url = imageUrl(frame, IMAGE_WIDTH.hero) || String(frame.asset?.url || '')
      const thumb = imageUrl(frame, 720) || url
      if (!url) return
      const productId = item._id
      list.push({
        key: assetId ? `${productId}::${assetId}` : `${productId}::${imageIndex}`,
        productId,
        assetId,
        imageIndex,
        title: item.title,
        slug: slug || productId,
        category: category || 'Work',
        link: productPath(item),
        url,
        thumb,
      })
    })
  }
  return list
})

const typeKey = (value: string) => value.toLowerCase().replace(/[^a-z]/g, '')

const visibleFrames = computed(() => {
  const q = query.value.trim().toLowerCase()
  const type = typeFilter.value
  const selected = new Set(selectedKeys.value)
  return frames.value.filter((frame) => {
    if (selectedOnly.value && !selected.has(frame.key)) return false
    if (type !== 'all' && typeKey(frame.category) !== type) return false
    if (q && !frame.title.toLowerCase().includes(q)) return false
    return true
  })
})

const selectedSet = computed(() => new Set(selectedKeys.value))
const isSelected = (key: string) => selectedSet.value.has(key)
const selectionOrder = (key: string) => {
  const index = selectedKeys.value.indexOf(key)
  return index >= 0 ? index + 1 : ''
}

const payload = computed(() => ({
  exportedAt: new Date().toISOString(),
  count: selectedKeys.value.length,
  frames: selectedKeys.value
    .map((key) => frames.value.find((frame) => frame.key === key))
    .filter((frame): frame is PickFrame => Boolean(frame))
    .map(({ key: _key, thumb: _thumb, ...frame }) => frame),
}))

const missingAssetCount = computed(
  () => payload.value.frames.filter((frame) => !frame.assetId).length,
)

const persist = () => {
  if (!import.meta.client) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedKeys.value))
  } catch {
    /* private mode */
  }
}

const toggleKeys = (keys: string[]) => {
  const next = [...selectedKeys.value]
  for (const key of keys) {
    const at = next.indexOf(key)
    if (at >= 0) next.splice(at, 1)
    else next.push(key)
  }
  selectedKeys.value = next
  persist()
}

const onToggle = (frame: PickFrame, index: number, event: MouseEvent) => {
  if (event.shiftKey && lastIndex >= 0) {
    const from = Math.min(lastIndex, index)
    const to = Math.max(lastIndex, index)
    const range = visibleFrames.value.slice(from, to + 1).map((entry) => entry.key)
    const adding = !isSelected(frame.key)
    const next = new Set(selectedKeys.value)
    for (const key of range) {
      if (adding) next.add(key)
      else next.delete(key)
    }
    selectedKeys.value = [...next]
    persist()
  } else {
    toggleKeys([frame.key])
  }
  lastIndex = index
}

const selectVisible = () => {
  const next = new Set(selectedKeys.value)
  for (const frame of visibleFrames.value) next.add(frame.key)
  selectedKeys.value = [...next]
  persist()
}

const clearSelected = () => {
  selectedKeys.value = []
  persist()
}

const jsonText = () => JSON.stringify(payload.value, null, 2)

const copyJson = async () => {
  const text = jsonText()
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    document.body.appendChild(area)
    area.select()
    document.execCommand('copy')
    area.remove()
  }
  copied.value = true
  window.clearTimeout(copyTimer)
  copyTimer = window.setTimeout(() => {
    copied.value = false
  }, 1600)
}

const downloadJson = () => {
  const blob = new Blob([jsonText()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `d3-pick-${payload.value.count}.json`
  link.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (Array.isArray(parsed)) selectedKeys.value = parsed.filter((key) => typeof key === 'string')
  } catch {
    selectedKeys.value = []
  }
})

onBeforeUnmount(() => {
  window.clearTimeout(copyTimer)
})

useHead(() => ({
  title: 'D3 pick — Studio Based Upon',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
}))
</script>

<style scoped>
.d3-pick {
  min-height: 100dvh;
  padding: calc(var(--header-height) + 18px) 18px 120px;
  background: var(--cream);
  color: var(--charcoal);
}

.d3-pick__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px 28px;
  margin-bottom: 22px;
}

.d3-pick__kicker {
  margin: 0 0 6px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.d3-pick__title {
  margin: 0;
  font-family: var(--lacquer);
  font-size: clamp(1.8rem, 3vw, 2.4rem);
  font-weight: 400;
  line-height: 1;
}

.d3-pick__meta {
  margin: 10px 0 0;
  color: var(--muted);
}

.d3-pick__bar-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  max-width: 52rem;
}

.d3-pick__search input {
  width: min(16rem, 100%);
  margin: 0;
  padding: 0.55rem 0.8rem;
  border: 1px solid color-mix(in srgb, currentColor 28%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--cream) 88%, transparent);
  color: inherit;
  font: inherit;
}

.d3-pick__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.d3-pick__filters button {
  margin: 0;
  padding: 0.4rem 0.75rem;
  border: 1px solid color-mix(in srgb, currentColor 28%, transparent);
  border-radius: 999px;
  background: transparent;
  color: inherit;
}

.d3-pick__filters button.is-on {
  border-color: currentColor;
}

.d3-pick__check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.d3-pick__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.d3-pick__warn {
  margin: 0 0 16px;
  color: var(--red);
}

.d3-pick__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 8px;
}

.d3-pick__cell {
  position: relative;
  aspect-ratio: 1;
  margin: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid transparent;
  background: var(--sand);
  color: inherit;
  cursor: pointer;
}

.d3-pick__cell.is-on {
  border-color: var(--charcoal);
  box-shadow: inset 0 0 0 2px var(--charcoal);
}

.d3-pick__cell img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.d3-pick__cell-mark {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 1;
  min-width: 1.4rem;
  padding: 0.15rem 0.35rem;
  border-radius: 999px;
  background: var(--charcoal);
  color: var(--cream);
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.06em;
  line-height: 1.3;
  opacity: 0;
}

.d3-pick__cell.is-on .d3-pick__cell-mark {
  opacity: 1;
}

.d3-pick__cell-caption {
  position: absolute;
  inset: auto 0 0 0;
  display: grid;
  gap: 2px;
  padding: 28px 8px 8px;
  background: linear-gradient(to top, rgb(17 17 17 / 0.72), transparent);
  color: #f1ede4;
  opacity: 0;
  text-align: left;
  transition: opacity 0.2s ease;
}

.d3-pick__cell:hover .d3-pick__cell-caption,
.d3-pick__cell.is-on .d3-pick__cell-caption {
  opacity: 1;
}

.d3-pick__cell-title,
.d3-pick__cell-sub {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.d3-pick__cell-title {
  font-size: 11px;
  letter-spacing: 0.04em;
}

.d3-pick__cell-sub {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.75;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

@media (max-width: 720px) {
  .d3-pick {
    padding-left: 10px;
    padding-right: 10px;
  }

  .d3-pick__grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 6px;
  }
}
</style>
