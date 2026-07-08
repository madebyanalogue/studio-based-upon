<template>
  <div class="portable-text">
    <template v-for="(block, index) in blocks" :key="block._key || index">
      <p v-if="block._type === 'block'">
        <template v-for="(child, childIndex) in block.children" :key="childIndex">
          <strong v-if="child.marks?.includes('strong')">{{ child.text }}</strong>
          <em v-else-if="child.marks?.includes('em')">{{ child.text }}</em>
          <span v-else>{{ child.text }}</span>
        </template>
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  blocks: Array<{
    _key?: string
    _type: string
    children?: Array<{ text?: string; marks?: string[] }>
  }>
}>()
</script>
