# Typology snapshot — column-center

Frozen copy of the typology template from Oct 2026.

**Behaviour at snapshot:**
- Rows rest as a single centered column (one visible/snapped thumb each)
- Hover reveals the full horizontal row; other rows fade + grayscale
- Fixed left title with gooey swap
- Top/bottom page padding so first/last thumbs can sit on the vertical screen center

**Files:**
- `typology.vue` → restore to `pages/typology.vue`
- `CollectionRail.vue` → restore to `components/discover/CollectionRail.vue`
- `useTypologyRowHover.ts` → restore to `composables/useTypologyRowHover.ts`
- `curated-discover.vue` → restore to `layouts/curated-discover.vue`

Not routed — backup only. Live work continues on the originals under `pages/` / `components/` / `composables/`.
