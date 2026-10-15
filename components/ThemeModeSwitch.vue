<template>
  <div class="theme-mode" role="group" aria-label="Colour mode" data-cursor="default" @click.stop>
    <button
      type="button"
      class="theme-mode__label"
      :aria-pressed="!isDark"
      @click.stop="setTheme('light')"
    >
      Light
    </button>
    <button
      type="button"
      class="theme-mode__switch"
      :aria-pressed="isDark"
      aria-label="Switch colour mode"
      @click.stop="toggleTheme"
    >
      <span class="theme-mode__thumb" :class="{ 'is-dark': isDark }" aria-hidden="true" />
    </button>
    <button
      type="button"
      class="theme-mode__label"
      :aria-pressed="isDark"
      @click.stop="setTheme('dark')"
    >
      Dark
    </button>
  </div>
</template>

<script setup lang="ts">
const { isDark, setTheme, toggleTheme } = useTheme()
</script>

<style scoped>
.theme-mode {
  display: flex;
  align-items: center;
  gap: 0;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  line-height: 1;
  text-transform: uppercase;
}

.theme-mode__switch {
  position: relative;
  flex: 0 0 auto;
  width: 40px;
  height: 12px;
  margin: 0;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  box-sizing: border-box;
  cursor: pointer;
}

.theme-mode__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--red);
  transform: translateX(0);
  transition: transform 0.35s ease;
  pointer-events: none;
}

.theme-mode__thumb.is-dark {
  transform: translateX(28px);
}

.theme-mode__label {
  width: 80px;
  margin: 0;
  padding: 10px 15px;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  text-align: left;
  line-height: 1;
  cursor: pointer;
  opacity: 0.4;
  transition: opacity 0.35s ease;
}

.theme-mode__label:first-child {
  text-align: right;
}

.theme-mode__label[aria-pressed='true'] {
  opacity: 1;
}

@media (hover: hover) and (pointer: fine) {
  .theme-mode:has(.theme-mode__label:hover) .theme-mode__label[aria-pressed='true']:not(:hover) {
    opacity: 0.4;
  }

  .theme-mode__label:hover {
    opacity: 1;
  }
}
</style>
