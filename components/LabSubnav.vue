<template>
  <nav class="lab-subnav" aria-label="Lab pages">
    <p class="lab-subnav__eyebrow">Lab</p>
    <ul class="lab-subnav__list">
      <li v-for="item in links" :key="item.to">
        <NuxtLink
          class="lab-subnav__link"
          :class="{ 'is-on': isActive(item.to) }"
          :to="item.to"
        >
          {{ item.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()

const links = [
  { to: '/webgl', label: 'Animated WebGL' },
  { to: '/webgl-home', label: 'WebGL home' },
  { to: '/webgl-metallic', label: 'WebGL metallic' },
  { to: '/intro-lab', label: 'Intro lab' },
  { to: '/d1', label: 'D1' },
  { to: '/d2', label: 'D2' },
  { to: '/d3', label: 'D3' },
  { to: '/d4', label: 'D4' },
  { to: '/d3-pick', label: 'D3 pick' },
] as const

const isActive = (to: string) =>
  route.path === to || route.path.startsWith(`${to}/`)
</script>

<style scoped>
.lab-subnav {
  position: fixed;
  top: 76px;
  right: 16px;
  z-index: 30;
  width: min(11.5rem, calc(100vw - 2rem));
  padding: 0.85rem 0.9rem 0.95rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: var(--panel-bg, rgba(255, 255, 255, 0.82));
  backdrop-filter: blur(12px);
  color: var(--charcoal, #222);
  pointer-events: auto;
}

.lab-subnav__eyebrow {
  margin: 0 0 0.55rem;
  font-family: var(--mono, ui-monospace, monospace);
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted, rgba(0, 0, 0, 0.45));
}

.lab-subnav__list {
  display: grid;
  gap: 0.2rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.lab-subnav__link {
  display: block;
  padding: 0.35rem 0.4rem;
  border: 1px solid transparent;
  color: inherit;
  font-size: 0.78rem;
  line-height: 1.3;
  letter-spacing: 0.02em;
  text-decoration: none;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}

.lab-subnav__link:hover {
  background: rgba(0, 0, 0, 0.04);
}

.lab-subnav__link.is-on {
  border-color: rgba(0, 0, 0, 0.14);
  background: rgba(0, 0, 0, 0.06);
  font-weight: 500;
}

:global(html.dark) .lab-subnav,
:global(body.intro-lab-active) .lab-subnav,
:global(body.webgl-layer-active) .lab-subnav {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(12, 12, 12, 0.88);
  color: #f1ede4;
}

:global(html.dark) .lab-subnav__eyebrow,
:global(body.intro-lab-active) .lab-subnav__eyebrow,
:global(body.webgl-layer-active) .lab-subnav__eyebrow {
  color: rgba(241, 237, 228, 0.5);
}

:global(html.dark) .lab-subnav__link:hover,
:global(body.intro-lab-active) .lab-subnav__link:hover,
:global(body.webgl-layer-active) .lab-subnav__link:hover {
  background: rgba(255, 255, 255, 0.06);
}

:global(html.dark) .lab-subnav__link.is-on,
:global(body.intro-lab-active) .lab-subnav__link.is-on,
:global(body.webgl-layer-active) .lab-subnav__link.is-on {
  border-color: rgba(241, 237, 228, 0.28);
  background: rgba(241, 237, 228, 0.1);
}
</style>
