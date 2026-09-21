<template>
  <section
    class="story-break"
    :class="`story-break--${breaker.breakerType}`"
    aria-label="Editorial break"
  >
    <div
      v-if="breaker.breakerType !== 'statement' && breaker.imageUrl"
      class="story-break__media"
    >
      <img
        class="story-break__image"
        :src="breaker.imageUrl"
        :alt="breaker.heading || ''"
        loading="lazy"
        decoding="async"
        draggable="false"
      />
    </div>

    <div
      v-if="hasCopy"
      class="story-break__copy"
    >
      <p v-if="breaker.eyebrow" class="story-break__eyebrow interface">
        {{ breaker.eyebrow }}
      </p>
      <h2 v-if="breaker.heading" class="story-break__heading serif">
        {{ breaker.heading }}
      </h2>
      <p v-if="breaker.body" class="story-break__body">{{ breaker.body }}</p>
      <NuxtLink
        v-if="breaker.link && breaker.linkLabel"
        :to="internalLink"
        class="story-break__link interface"
        :external="isExternal"
        :target="isExternal ? '_blank' : undefined"
        :rel="isExternal ? 'noopener noreferrer' : undefined"
      >
        {{ breaker.linkLabel }}
      </NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { DiscoverBreakerBlock } from '~/composables/useCuratedDiscover'

const props = defineProps<{
  breaker: DiscoverBreakerBlock
}>()

const hasCopy = computed(
  () =>
    Boolean(
      props.breaker.eyebrow ||
        props.breaker.heading ||
        props.breaker.body ||
        (props.breaker.link && props.breaker.linkLabel),
    ),
)

const isExternal = computed(() => /^https?:\/\//i.test(props.breaker.link || ''))

const internalLink = computed(() => props.breaker.link || '/')
</script>

<style scoped>
.story-break {
  margin: 0 0 var(--discover-section-gap, 5rem);
  padding: 0 var(--discover-gutter, var(--gutter));
}

.story-break--statement {
  display: grid;
  place-items: start;
  padding-block: clamp(2rem, 6vw, 4.5rem);
}

.story-break--statement .story-break__copy {
  max-width: 38rem;
}

.story-break--image {
  padding-inline: 0;
}

.story-break--image .story-break__media {
  width: 100%;
}

.story-break--imageText {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.9fr);
  gap: clamp(1.5rem, 4vw, 3.5rem);
  align-items: center;
}

.story-break__media {
  overflow: hidden;
  background: color-mix(in srgb, var(--charcoal) 4%, transparent);
}

.story-break__image {
  display: block;
  width: 100%;
  height: auto;
  max-height: min(78vh, 820px);
  object-fit: cover;
}

.story-break--image .story-break__image {
  max-height: min(72vh, 760px);
}

.story-break__copy {
  min-width: 0;
}

.story-break__eyebrow {
  margin: 0 0 0.75rem;
  font-size: var(--text-xs);
  color: var(--muted);
}

.story-break__heading {
  margin: 0;
  font-size: clamp(1.65rem, 3.4vw, 2.75rem);
  line-height: 1.12;
  font-weight: 400;
}

.story-break__body {
  margin: 1rem 0 0;
  max-width: 28rem;
  font-size: var(--text-base);
  line-height: 1.5;
  color: var(--muted);
}

.story-break__link {
  display: inline-block;
  margin-top: 1.35rem;
  font-size: var(--text-xs);
  color: var(--charcoal);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.story-break__link:hover {
  opacity: 0.65;
}

@media (max-width: 899px) {
  .story-break--imageText {
    grid-template-columns: 1fr;
  }
}
</style>
