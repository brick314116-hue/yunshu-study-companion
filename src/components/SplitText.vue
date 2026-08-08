<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  text: string
  tag?: 'h1' | 'h2' | 'p' | 'span'
  delay?: number
}>(), {
  tag: 'h1',
  delay: 34,
})

const characters = computed(() => Array.from(props.text))
</script>

<template>
  <component :is="tag" class="split-text" :aria-label="text">
    <span
      v-for="(character, index) in characters"
      :key="`${text}-${index}`"
      aria-hidden="true"
      :style="{ '--split-delay': `${index * delay}ms` }"
    >{{ character === ' ' ? '\u00a0' : character }}</span>
  </component>
</template>
