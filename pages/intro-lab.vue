<template>
  <div class="intro-lab">
    <LabSubnav />
    <LabFeatured :slugs="['birth-of-tramazite-mother-rain']" />
    <IntroLabStage
      :overlay="overlay"
      :overlay-anim="overlayAnim"
      :overlay-size="overlaySize"
      :overlay-strength="overlayStrength"
      :overlay-anim-strength="overlayAnimStrength"
      :overlay-sustain="overlaySustain"
      :bloom="bloom"
      :bloom-anim="bloomAnim"
      :bloom-strength="bloomStrength"
      :bloom-blend="bloomBlend"
      :darken="darken"
      :darken-anim="darkenAnim"
      :darken-strength="darkenStrength"
      :darken-blend="darkenBlend"
      :zoom="zoom"
    />

    <aside class="intro-lab__panel">
      <header class="intro-lab__head">
        <p class="intro-lab__eyebrow">Intro lab</p>
        <h1 class="intro-lab__title">Field layers</h1>
        <p class="intro-lab__note">
          Upscaled plates from <code>/intro</code>.
        </p>
      </header>

      <div class="intro-lab__block intro-lab__block--first">
        <label class="intro-lab__row">
          <input v-model="overlay" type="checkbox" />
          <span>Overlay <em>solid field + mouse; off = full base</em></span>
        </label>
        <label class="intro-lab__row intro-lab__row--emphasis" :class="{ 'is-dim': !overlay }">
          <input v-model="overlayAnim" type="checkbox" :disabled="!overlay" />
          <span>Overlay animation <em>rim auto-wand</em></span>
        </label>
        <p class="intro-lab__label">
          Mouse size <span>{{ overlaySize.toFixed(2) }}×</span>
        </p>
        <input
          v-model.number="overlaySize"
          class="intro-lab__range"
          type="range"
          min="0.25"
          max="2.5"
          step="0.05"
          :disabled="!overlay"
        />
        <p class="intro-lab__label">
          Mouse strength <span>{{ overlayStrength.toFixed(2) }}</span>
        </p>
        <input
          v-model.number="overlayStrength"
          class="intro-lab__range"
          type="range"
          min="0.25"
          max="2"
          step="0.05"
          :disabled="!overlay"
        />
        <p class="intro-lab__label">
          Overlay anim strength <span>{{ overlayAnimStrength.toFixed(2) }}</span>
        </p>
        <input
          v-model.number="overlayAnimStrength"
          class="intro-lab__range"
          type="range"
          min="0.25"
          max="4"
          step="0.05"
          :disabled="!overlay || !overlayAnim"
        />
        <p class="intro-lab__label">
          Sustain <span>{{ overlaySustain.toFixed(2) }}</span>
        </p>
        <input
          v-model.number="overlaySustain"
          class="intro-lab__range"
          type="range"
          min="0"
          max="1"
          step="0.02"
          :disabled="!overlay"
        />
        <p class="intro-lab__hint">Trail length after last mouse move — plate stays full through holes.</p>
      </div>

      <div class="intro-lab__block">
        <label class="intro-lab__row">
          <input v-model="bloom" type="checkbox" />
          <span>Bloom layer <em>map high-pass light</em></span>
        </label>
        <label class="intro-lab__row intro-lab__row--emphasis" :class="{ 'is-dim': !bloom }">
          <input v-model="bloomAnim" type="checkbox" :disabled="!bloom" />
          <span>Bloom animation <em>full-frame wander</em></span>
        </label>
        <p class="intro-lab__label">
          Bloom strength <span>{{ bloomStrength.toFixed(2) }}</span>
        </p>
        <input
          v-model.number="bloomStrength"
          class="intro-lab__range"
          type="range"
          min="0.15"
          max="2"
          step="0.05"
          :disabled="!bloom"
        />
        <p class="intro-lab__label">Bloom blend</p>
        <div class="intro-lab__seg intro-lab__seg--wrap">
          <button
            v-for="mode in bloomBlendModes"
            :key="mode"
            type="button"
            class="intro-lab__seg-btn"
            :class="{ 'is-on': bloomBlend === mode }"
            :disabled="!bloom"
            @click="bloomBlend = mode"
          >
            {{ mode }}
          </button>
        </div>
      </div>

      <div class="intro-lab__block">
        <label class="intro-lab__row">
          <input v-model="darken" type="checkbox" />
          <span>Darken layer <em>artwork darks only</em></span>
        </label>
        <label class="intro-lab__row intro-lab__row--emphasis" :class="{ 'is-dim': !darken }">
          <input v-model="darkenAnim" type="checkbox" :disabled="!darken" />
          <span>Darken animation <em>wand across deep tones</em></span>
        </label>
        <p class="intro-lab__label">
          Darken strength <span>{{ darkenStrength.toFixed(2) }}</span>
        </p>
        <input
          v-model.number="darkenStrength"
          class="intro-lab__range"
          type="range"
          min="0.15"
          max="2"
          step="0.05"
          :disabled="!darken"
        />
        <p class="intro-lab__label">Darken blend</p>
        <div class="intro-lab__seg intro-lab__seg--wrap">
          <button
            v-for="mode in darkenBlendModes"
            :key="mode"
            type="button"
            class="intro-lab__seg-btn"
            :class="{ 'is-on': darkenBlend === mode }"
            :disabled="!darken"
            @click="darkenBlend = mode"
          >
            {{ mode }}
          </button>
        </div>
      </div>

      <div class="intro-lab__block">
        <p class="intro-lab__label">
          Zoom <span>{{ zoom.toFixed(2) }}×</span>
        </p>
        <input
          v-model.number="zoom"
          class="intro-lab__range"
          type="range"
          min="1"
          max="2.5"
          step="0.05"
        />
      </div>

      <p class="intro-lab__assets">
        <span>backdrop-2 · 5480²</span>
        <span>dark-map · 5480²</span>
      </p>
    </aside>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  pageTransition: false,
})

useHead({
  title: 'Intro lab — Studio Based Upon',
  bodyAttrs: {
    class: 'intro-lab-active',
  },
})

type BloomBlend =
  | 'screen'
  | 'lighten'
  | 'plus-lighter'
  | 'soft-light'
  | 'overlay'
  | 'color-dodge'
  | 'luminosity'
  | 'normal'

type DarkenBlend =
  | 'multiply'
  | 'darken'
  | 'color-burn'
  | 'soft-light'
  | 'overlay'
  | 'luminosity'
  | 'normal'

const bloomBlendModes: BloomBlend[] = [
  'screen',
  'lighten',
  'plus-lighter',
  'soft-light',
  'overlay',
  'color-dodge',
  'luminosity',
  'normal',
]

const darkenBlendModes: DarkenBlend[] = [
  'multiply',
  'darken',
  'color-burn',
  'soft-light',
  'overlay',
  'luminosity',
  'normal',
]

const overlay = ref(true)
const overlayAnim = ref(true)
const overlaySize = ref(0.9)
const overlayStrength = ref(1.95)
const overlayAnimStrength = ref(3.65)
const overlaySustain = ref(0.82)
const bloom = ref(true)
const bloomAnim = ref(true)
const bloomStrength = ref(1)
const bloomBlend = ref<BloomBlend>('plus-lighter')
const darken = ref(false)
const darkenAnim = ref(true)
const darkenStrength = ref(2)
const darkenBlend = ref<DarkenBlend>('soft-light')
const zoom = ref(1.2)

watch(bloom, (on) => {
  if (on) bloomAnim.value = true
})

watch(darken, (on) => {
  if (on) darkenAnim.value = true
})
</script>

<style scoped>
.intro-lab {
  min-height: 100dvh;
  background: #000;
  color: #f1ede4;
}

.intro-lab__panel {
  position: fixed;
  top: 1.25rem;
  left: 1.25rem;
  z-index: 20;
  width: min(20rem, calc(100vw - 2.5rem));
  max-height: calc(100dvh - 2.5rem);
  overflow: auto;
  padding: 1.1rem 1.15rem 1.2rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(8, 8, 8, 0.72);
  backdrop-filter: blur(14px);
  pointer-events: auto;
}

.intro-lab__head {
  margin-bottom: 1rem;
}

.intro-lab__eyebrow {
  margin: 0 0 0.35rem;
  font-family: var(--mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(241, 237, 228, 0.55);
}

.intro-lab__title {
  margin: 0 0 0.45rem;
  font-family: var(--serif, Georgia, serif);
  font-size: 1.35rem;
  font-weight: 400;
  letter-spacing: -0.02em;
}

.intro-lab__note {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.45;
  color: rgba(241, 237, 228, 0.62);
}

.intro-lab__note code {
  font-family: var(--mono);
  font-size: 0.72rem;
  color: rgba(241, 237, 228, 0.85);
}

.intro-lab__row {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  margin: 0 0 0.65rem;
  font-size: 0.86rem;
  line-height: 1.35;
  cursor: pointer;
  user-select: none;
}

.intro-lab__row.is-dim,
.intro-lab__block.is-dim {
  opacity: 0.4;
}

.intro-lab__row input {
  margin-top: 0.15rem;
  accent-color: #f1ede4;
}

.intro-lab__row em {
  display: block;
  font-style: normal;
  font-size: 0.72rem;
  color: rgba(241, 237, 228, 0.45);
}

.intro-lab__block {
  margin-top: 0.95rem;
  padding-top: 0.85rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.intro-lab__block--first {
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
}

.intro-lab__row--emphasis {
  padding: 0.45rem 0.5rem;
  margin-left: -0.5rem;
  margin-right: -0.5rem;
  border: 1px solid rgba(241, 237, 228, 0.18);
  background: rgba(241, 237, 228, 0.06);
}

.intro-lab__row--emphasis span {
  font-weight: 500;
}

.intro-lab__label {
  display: flex;
  justify-content: space-between;
  margin: 0 0 0.55rem;
  font-family: var(--mono);
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(241, 237, 228, 0.55);
}

.intro-lab__hint {
  margin: -0.15rem 0 0.55rem;
  font-size: 0.68rem;
  line-height: 1.35;
  color: rgba(241, 237, 228, 0.4);
}

.intro-lab__seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
}

.intro-lab__seg--wrap {
  grid-template-columns: 1fr 1fr;
}

.intro-lab__seg-btn {
  padding: 0.4rem 0.35rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: rgba(241, 237, 228, 0.7);
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.intro-lab__seg-btn.is-on {
  border-color: rgba(241, 237, 228, 0.45);
  background: rgba(241, 237, 228, 0.1);
  color: #f1ede4;
}

.intro-lab__seg-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.intro-lab__range {
  display: block;
  width: 100%;
  margin: 0 0 0.85rem;
  accent-color: #f1ede4;
}

.intro-lab__assets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem 1rem;
  margin: 1rem 0 0;
  padding-top: 0.85rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(241, 237, 228, 0.4);
}
</style>

<style>
body.intro-lab-active {
  background: #000;
}
</style>
