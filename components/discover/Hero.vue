<template>
  <header class="discover-hero">
    <p v-if="eyebrow" class="discover-hero__eyebrow interface">{{ eyebrow }}</p>
    <h1 v-if="title" class="discover-hero__title serif">{{ title }}</h1>
    <p v-if="body" class="discover-hero__body">{{ body }}</p>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title?: string
  body?: string
}>()
</script>

<style scoped>
.discover-hero {
  padding:
    calc(var(--header-height) + clamp(2.5rem, 6vw, 4.5rem))
    var(--discover-gutter, var(--gutter))
    clamp(2.5rem, 5vw, 4rem);
  max-width: 42rem;
}

.discover-hero__eyebrow {
  margin: 0 0 0.85rem;
  font-size: var(--text-xs);
  color: var(--muted);
}

.discover-hero__title {
  margin: 0;
  font-size: clamp(2rem, 4.5vw, 3.25rem);
  line-height: 1.08;
  letter-spacing: 0.01em;
  font-weight: 400;
}

.discover-hero__body {
  margin: 1.15rem 0 0;
  max-width: 28rem;
  font-size: var(--text-base);
  line-height: 1.5;
  color: var(--muted);
}
</style>
