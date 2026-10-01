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
</style>
