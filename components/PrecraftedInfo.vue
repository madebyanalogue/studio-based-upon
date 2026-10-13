<script setup lang="ts">
type PortableBlock = {
  _key?: string
  _type: string
  children?: Array<{ text?: string; marks?: string[] }>
}

type PanelSize = {
  dimensions?: string
  price?: string
}

defineProps<{
  title: string
  pricingHeading: string
  pricingIntro: string
  pricingNotes: string[]
  leadTimesHeading: string
  leadTimes: string
  installHeading: string
  installNotes: PortableBlock[]
  panelSizes: PanelSize[]
  specSheetUrl?: string
}>()

const openId = ref('')

function toggle(id: string) {
  openId.value = openId.value === id ? '' : id
}

function isOpen(id: string) {
  return openId.value === id
}
</script>

<template>
  <div class="info">
    <h2 class="info__title">{{ title }}</h2>

    <div class="info__list">
      <div class="info__item" :class="{ 'info__item--open': isOpen('pricing') }">
        <button
          type="button"
          class="info__trigger interface"
          data-cursor="pointer"
          :aria-expanded="isOpen('pricing')"
          @click="toggle('pricing')"
        >
          <span>{{ pricingHeading }}</span>
          <span class="info__mark" aria-hidden="true" />
        </button>
        <div class="info__panel">
          <div class="info__panel-inner">
            <p v-if="pricingIntro">{{ pricingIntro }}</p>
            <ul class="info__pricing">
              <li v-for="(panel, i) in panelSizes" :key="i">
                <span class="info__dimensions">{{ panel.dimensions }}</span>
                <span class="info__price">{{ panel.price }}</span>
              </li>
            </ul>
            <p v-for="(note, i) in pricingNotes" :key="i" class="info__note">
              {{ note }}
            </p>
          </div>
        </div>
      </div>

      <div class="info__item" :class="{ 'info__item--open': isOpen('lead') }">
        <button
          type="button"
          class="info__trigger interface"
          data-cursor="pointer"
          :aria-expanded="isOpen('lead')"
          @click="toggle('lead')"
        >
          <span>{{ leadTimesHeading }}</span>
          <span class="info__mark" aria-hidden="true" />
        </button>
        <div class="info__panel">
          <div class="info__panel-inner">
            <p>{{ leadTimes }}</p>
          </div>
        </div>
      </div>

      <div class="info__item" :class="{ 'info__item--open': isOpen('install') }">
        <button
          type="button"
          class="info__trigger interface"
          data-cursor="pointer"
          :aria-expanded="isOpen('install')"
          @click="toggle('install')"
        >
          <span>{{ installHeading }}</span>
          <span class="info__mark" aria-hidden="true" />
        </button>
        <div class="info__panel">
          <div class="info__panel-inner">
            <SanityContent v-if="installNotes?.length" :blocks="installNotes" />
          </div>
        </div>
      </div>
    </div>

    <div class="info__actions">
      <NuxtLink to="/enquire" class="info__action info__action--enquire" data-cursor="pointer">
        Enquire
      </NuxtLink>
      <a
        v-if="specSheetUrl"
        class="info__action"
        data-cursor="pointer"
        :href="specSheetUrl"
        target="_blank"
        rel="noopener"
      >
        Download Spec Sheet
      </a>
    </div>
  </div>
</template>

<style scoped>
.info {
  width: 100%;
  text-align: left;
}

.info__title {
  font-size: var(--text-2xl);
  margin: 0 0 1.25rem;
  text-transform: none;
  font-family: var(--mono);
}

.info__list {
  border-top: 0;
}

.info__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  padding: 0.9rem 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.info__mark {
  position: relative;
  flex: none;
  width: 10px;
  height: 10px;
}

.info__mark::before,
.info__mark::after {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  width: 10px;
  height: 1px;
  background: currentColor;
}

.info__mark::after {
  transform: rotate(90deg);
  transition: transform 0.25s ease;
}

.info__item--open .info__mark::after {
  transform: rotate(0deg);
}

.info__panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.35s ease;
}

.info__item--open .info__panel {
  grid-template-rows: 1fr;
}

.info__panel-inner {
  overflow: hidden;
  color: var(--muted);
}

.info__item--open .info__panel-inner {
  padding-bottom: 1rem;
}

.info__panel-inner p {
  margin: 0 0 1rem;
}

.info__pricing {
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
}

.info__pricing li {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--grid-line);
  color: var(--charcoal);
  text-align: left;
}

.info__dimensions {
  font-family: var(--font-serif);
}

.info__note {
  font-size: var(--text-sm);
}

.info__actions {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 1.25rem;
}

.info__action {
  display: block;
  width: 100%;
  padding: 13px;
  border: 0;
  border-radius: 0;
  background: #2a2a2a;
  color: #f1ede4;
  font-size: 12px;
  font-family: var(--mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.info__action:hover {
  opacity: 0.9;
}

.info__action--enquire {
  background: var(--red);
  color: white;
}
</style>
