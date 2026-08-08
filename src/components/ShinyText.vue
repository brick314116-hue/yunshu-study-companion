<script setup lang="ts">
withDefaults(defineProps<{
  text: string
  disabled?: boolean
}>(), {
  disabled: false,
})
</script>

<template>
  <span class="shiny-text" :class="{ disabled }">{{ text }}</span>
</template>
