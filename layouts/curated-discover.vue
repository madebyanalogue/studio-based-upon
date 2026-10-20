<template>
  <div class="curated-layout">
    <slot />
  </div>
</template>

<style scoped>
.curated-layout {
  --discover-gutter: clamp(1.25rem, 3.5vw, 3rem);
  --discover-section-gap: clamp(3.5rem, 8vw, 7rem);
  --discover-rail-gap: clamp(1rem, 2vw, 1.75rem);
  min-height: 100dvh;
  background: var(--cream);
  color: var(--charcoal);
}

/*
 * Typology ends at the last centered rail — don't let #app's stack/bucket
 * padding add scroll past that midline stop.
 */
:global(#app:has(.curated-layout)) {
  padding-bottom: 0;
}
</style>
