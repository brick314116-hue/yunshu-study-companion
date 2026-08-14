<script lang="ts">
// Vue Bits <Step /> —— 仅作为 <Stepper> 的插槽标记组件。
// Stepper 会从默认插槽里筛出 type === Step 的 vnode 作为一个步骤。
export default {
  name: 'Step',
}
</script>

<template>
  <div class="stepper-step">
    <slot />
  </div>
</template>
