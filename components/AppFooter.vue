<template>
  <footer class="footer">
    <div class="footer__inner">
      <p class="footer__copy">{{ copyright }}</p>
      <nav class="footer__nav" aria-label="Footer navigation">
        <NuxtLink
          v-for="item in headerMenu.items"
          :key="item._key"
          :to="item.path"
          class="serif-italic"
        >
          {{ item.text }}
        </NuxtLink>
      </nav>
    </div>
  </footer>
</template>

<script setup lang="ts">
const { copyright, headerMenu } = useSiteSettings()
</script>

<style scoped>
.footer {
  border-top: 1px solid var(--grid-line);
  background: var(--header-bg);
  padding: 2rem var(--gutter);
}

.footer__inner {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 2rem;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
}

.footer__copy {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--muted);
}

.footer__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 1.5rem;
  font-size: var(--text-sm);
}
</style>
