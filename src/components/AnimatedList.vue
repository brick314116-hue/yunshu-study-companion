<script setup lang="ts">
import type { Conversation } from '../types'

defineProps<{
  items: Conversation[]
}>()
</script>

<template>
  <TransitionGroup appear name="animated-list" tag="div" class="animated-list">
    <div v-for="(item, index) in items" :key="item.id" class="animated-list-item">
      <slot name="item" :item="item" :index="index" />
    </div>
  </TransitionGroup>
</template>
