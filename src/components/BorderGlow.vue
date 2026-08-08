<script setup lang="ts">
import { computed, ref } from 'vue'

const x = ref(50)
const y = ref(50)
const visible = ref(false)
const glowStyle = computed(() => ({
  '--glow-x': `${x.value}%`,
  '--glow-y': `${y.value}%`,
  '--glow-opacity': visible.value ? '1' : '0',
}))

const moveGlow = (event: PointerEvent) => {
  const element = event.currentTarget as HTMLElement
  const bounds = element.getBoundingClientRect()
  x.value = ((event.clientX - bounds.left) / bounds.width) * 100
  y.value = ((event.clientY - bounds.top) / bounds.height) * 100
  visible.value = true
}
</script>

<template>
  <div
    class="border-glow"
    :style="glowStyle"
    @pointerenter="visible = true"
    @pointermove="moveGlow"
    @pointerleave="visible = false"
  >
    <slot />
  </div>
</template>
