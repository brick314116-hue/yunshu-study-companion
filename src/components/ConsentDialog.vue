<script setup lang="ts">
import { ChevronLeft, Database, ShieldCheck } from '@lucide/vue'
import { onMounted, ref, watch } from 'vue'
import type { PsychConsent } from '../types'
import Step from './Step.vue'
import Stepper from './Stepper.vue'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  choose: [consent: Exclude<PsychConsent, 'unknown'>]
}>()

const dialog = ref<HTMLDialogElement | null>(null)
const step = ref(1)
const stepperRef = ref<InstanceType<typeof Stepper> | null>(null)

watch(
  () => props.open,
  (open) => {
    if (open && !dialog.value?.open) {
      step.value = 1
      stepperRef.value?.goTo(1)
      dialog.value?.showModal()
    }
    if (!open && dialog.value?.open) dialog.value.close()
  },
  { immediate: true },
)

onMounted(() => {
  if (props.open && !dialog.value?.open) dialog.value?.showModal()
})

const handleChoose = (choice: Exclude<PsychConsent, 'unknown'>) => {
  try {
    if (dialog.value?.open) {
      dialog.value.close()
    }
  } catch {}
  emit('choose', choice)
}
</script>

<template>
  <dialog ref="dialog" class="app-dialog consent-dialog" aria-labelledby="consent-title" @cancel.prevent>
    <div class="dialog-surface">
      <Stepper
        ref="stepperRef"
        :initial-step="1"
        next-button-text="继续选择"
        :hide-footer="step === 2"
        :disable-step-indicators="false"
        @step-change="step = $event"
      >
        <!-- ═══ Step 1: 使用边界 ═══ -->
        <Step>
          <div class="consent-mark" aria-hidden="true">
            <ShieldCheck :size="25" :stroke-width="1.7" />
          </div>
          <h2 id="consent-title">开始前，先说明几件事</h2>
          <p class="dialog-lead">
            云小舒陪你学习、聊心情，但它不是医生或老师，不做诊断、不给你打分。
          </p>

          <div class="consent-points">
            <div>
              <Database :size="18" :stroke-width="1.7" />
              <span
                ><strong>本网站不保存对话记录</strong
                ><small>历史只在本次打开期间显示；刷新或退出后即清空。</small></span
              >
            </div>
            <div>
              <Database :size="18" :stroke-width="1.7" />
              <span
                ><strong>短期记录需要你确认</strong
                ><small>只保存你同意后的简要记录，最多留7天，也能随时删。</small></span
              >
            </div>
            <div>
              <ShieldCheck :size="18" :stroke-width="1.7" />
              <span
                ><strong>安全情况优先</strong
                ><small>出现紧迫危险时，应立即联系身边成年人或紧急服务。</small></span
              >
            </div>
          </div>
        </Step>

        <!-- ═══ Step 2: 选择 ═══ -->
        <Step>
          <div class="consent-mark" aria-hidden="true">
            <Database :size="25" :stroke-width="1.7" />
          </div>
          <h2>要不要开启"聊心情"和"换个想法"？</h2>
          <p class="dialog-lead">
            你可以开启聊心情和换个想法，也可以只用学习功能。这个选择不会影响登录。
          </p>

          <button class="step-back" type="button" @click="stepperRef?.back()">
            <ChevronLeft :size="16" :stroke-width="1.8" />
            返回上一步
          </button>
          <div class="dialog-actions">
            <button class="secondary" type="button" @click="handleChoose('declined')">
              仅使用学业功能
            </button>
            <button class="primary" type="button" @click="handleChoose('accepted')">
              同意使用
            </button>
          </div>
        </Step>
      </Stepper>
    </div>
  </dialog>
</template>
