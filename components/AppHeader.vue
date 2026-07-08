<template>
  <header class="header">
    <div class="header__inner">
      <NuxtLink to="/" class="header__logo serif-italic" aria-label="Studio Based Upon home">
        <span v-if="logo" class="header__logo-svg" v-html="logo" />
        <span v-else>Studio Based Upon</span>
      </NuxtLink>

      <nav class="header__nav" aria-label="Main navigation">
        <NuxtLink
          v-for="item in headerMenu.items"
          :key="item._key"
          :to="item.path"
          class="header__nav-link serif-italic"
          :class="{ 'header__nav-link--active': isActive(item.path) }"
        >
          {{ item.text }}
        </NuxtLink>
      </nav>

      <div class="header__actions">
        <div class="header__moodboard-group">
          <button
            type="button"
            class="header__moodboard serif-italic"
            :class="{ 'header__moodboard--empty': firstBoardEmpty }"
            aria-label="Open moodboard"
            @click="isOpen = true"
          >
            <span>{{ activeMoodboard?.name || 'Collection' }}</span>
            <span class="header__moodboard-count">{{ count }}</span>
          </button>
          <button
            v-if="!firstBoardEmpty"
            type="button"
            class="header__moodboard-add"
            aria-label="Create new moodboard"
            @click="createMoodboard"
          >
            +
          </button>
        </div>

        <NuxtLink to="/contact" class="header__enquire btn">
          Enquire
        </NuxtLink>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const { logo, headerMenu } = useSiteSettings()
const { count, isOpen, activeMoodboard, createMoodboard, moodboards } = useBucket()
const route = useRoute()

const firstBoardEmpty = computed(() => (moodboards.value[0]?.items.length ?? 0) === 0)

const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(`${path}/`)
}
</script>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
}

.header__inner {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  min-height: var(--header-height);
  padding: 0 var(--gutter);
  gap: 1rem;
}

.header__logo {
  justify-self: start;
  font-size: var(--text-md);
  letter-spacing: 0.01em;
}

.header__logo-svg :deep(svg) {
  height: 28px;
  width: auto;
}

.header__nav {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.75rem 1.75rem;
}

.header__nav-link {
  font-size: var(--text-sm);
  color: var(--muted);
  transition: color 0.2s ease;
  white-space: nowrap;
}

.header__nav-link:hover,
.header__nav-link--active {
  color: var(--charcoal);
}

.header__actions {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header__moodboard-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header__moodboard {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: var(--text-sm);
  color: var(--charcoal);
  transition: color 0.2s ease;
}

.header__moodboard:hover {
  color: var(--accent);
}

.header__moodboard-count {
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0.1em 0.25rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  border: 1px solid transparent;
  background: var(--charcoal);
  color: var(--warm-white);
  font-family: var(--font-sans);
  font-style: normal;
  font-size: 0.7rem;
}

.header__moodboard--empty .header__moodboard-count {
  background: transparent;
  border-color: var(--muted);
  color: var(--muted);
}

.header__moodboard-add {
  width: 1.5rem;
  height: 1.5rem;
  display: grid;
  place-items: center;
  border: 1px solid var(--grid-line);
  border-radius: 999px;
  font-size: 1rem;
  line-height: 1;
  color: var(--charcoal);
  transition: background 0.2s ease, border-color 0.2s ease;
}

.header__moodboard-add:hover {
  background: #fff;
  border-color: var(--charcoal);
}

.header__enquire {
  padding: 0.45rem 0.9rem;
  font-size: var(--text-sm);
}

@media (max-width: 767px) {
  .header__inner {
    grid-template-columns: auto 1fr auto;
    gap: 0.5rem;
  }

  .header__logo {
    font-size: var(--text-sm);
  }

  .header__nav {
    gap: 0.5rem 0.75rem;
  }

  .header__nav-link {
    font-size: var(--text-xs);
  }

  .header__enquire {
    padding: 0.4rem 0.65rem;
    font-size: var(--text-xs);
  }
}
</style>
