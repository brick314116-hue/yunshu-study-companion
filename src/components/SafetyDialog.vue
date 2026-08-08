<script setup lang="ts">
import { Phone, ShieldCheck, X } from '@lucide/vue'
import { ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const dialog = ref<HTMLDialogElement | null>(null)

watch(
  () => props.open,
  (open) => {
    if (open && !dialog.value?.open) dialog.value?.showModal()
    if (!open && dialog.value?.open) dialog.value.close()
  },
)

const closeOnBackdrop = (event: MouseEvent) => {
  if (event.target === dialog.value) emit('close')
}
</script>

<template>
  <dialog
    ref="dialog"
    class="app-dialog safety-dialog"
    aria-labelledby="safety-title"
    @close="emit('close')"
    @cancel="emit('close')"
    @click="closeOnBackdrop"
  >
    <div class="dialog-surface">
      <header class="dialog-header">
        <span class="dialog-icon danger"><ShieldCheck :size="22" :stroke-width="1.8" /></span>
        <button type="button" title="关闭" aria-label="关闭安全求助" @click="emit('close')">
          <X :size="19" :stroke-width="1.8" />
        </button>
      </header>

      <h2 id="safety-title">现在先保证安全</h2>
      <p class="dialog-lead">如果你有伤害自己或他人的想法，请不要独自承担，也不要继续普通学习任务。</p>

      <ol class="safety-steps">
        <li><strong>离开危险物品和地点</strong><span>去有其他人在的安全空间。</span></li>
        <li><strong>立刻告诉身边成年人</strong><span>联系监护人、老师或其他可信任的人，请对方陪着你。</span></li>
        <li><strong>危险迫在眉睫时立即求助</strong><span>在中国大陆拨打 110 或 120。</span></li>
      </ol>

      <div class="hotline-grid">
        <a href="tel:110"><Phone :size="17" :stroke-width="1.8" /><span><strong>110</strong><small>紧急报警求助</small></span></a>
        <a href="tel:120"><Phone :size="17" :stroke-width="1.8" /><span><strong>120</strong><small>医疗急救</small></span></a>
        <a href="tel:12355"><Phone :size="17" :stroke-width="1.8" /><span><strong>12355</strong><small>青少年服务台</small></span></a>
        <a href="tel:12356"><Phone :size="17" :stroke-width="1.8" /><span><strong>12356</strong><small>心理援助热线</small></span></a>
      </div>

      <p class="safety-footnote">热线服务可能因地区和时段不同而变化。无法接通时，请继续联系当地紧急服务或身边成年人。</p>
    </div>
  </dialog>
</template>
