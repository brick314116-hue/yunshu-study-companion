<script setup lang="ts">
import { Check } from '@lucide/vue'

defineProps<{
  currentStep: number
  total: number
}>()
</script>

<template>
  <div class="stepper">
    <ol class="stepper-track" aria-label="开始步骤">
      <li
        v-for="step in total"
        :key="step"
        :class="{ active: step === currentStep, complete: step < currentStep }"
        :aria-current="step === currentStep ? 'step' : undefined"
      >
        <span>
          <Check v-if="step < currentStep" :size="14" :stroke-width="2.2" aria-hidden="true" />
          <template v-else>{{ step }}</template>
        </span>
      </li>
    </ol>
    <div class="stepper-content">
      <slot />
    </div>
  </div>
</template>
