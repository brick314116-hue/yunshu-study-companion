<script setup lang="ts">
import { Check, ClipboardList, LoaderCircle } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { MOOD_OPTIONS, submitMoodCheckin } from '../mood-checkin'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ submitted: []; close: [] }>()

const dialog = ref<HTMLDialogElement | null>(null)
const emotion = ref('')
const intensity = ref(0)
const trigger = ref('')
const submitting = ref(false)
const errorText = ref('')
const done = ref(false)

const canSubmit = computed(() => emotion.value !== '' && intensity.value >= 1 && intensity.value <= 5 && !submitting.value)

const reset = () => {
  emotion.value = ''
  intensity.value = 0
  trigger.value = ''
  submitting.value = false
  errorText.value = ''
  done.value = false
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      reset()
      if (!dialog.value?.open) dialog.value?.showModal()
    } else if (dialog.value?.open) dialog.value.close()
  },
  { immediate: true },
)

onMounted(() => {
  if (props.open && !dialog.value?.open) dialog.value?.showModal()
})

const close = () => {
  if (dialog.value?.open) dialog.value.close()
  emit('close')
}

const submit = async () => {
  if (!canSubmit.value) return
  submitting.value = true
  errorText.value = ''
  try {
    await submitMoodCheckin({
      emotionName: emotion.value,
      intensity: intensity.value,
      triggerSummary: trigger.value,
    })
    try {
      const today = new Date().toISOString().slice(0, 10)
      localStorage.setItem(`yunshu_checkin_${today}`, '1')
    } catch {
      /* ignore */
    }
    done.value = true
    setTimeout(() => {
      emit('submitted')
      close()
    }, 1400)
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '提交失败，请稍后重试。'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <dialog
    ref="dialog"
    class="app-dialog mood-dialog"
    aria-labelledby="mood-title"
    @close="emit('close')"
  >
    <div class="dialog-surface">
      <div class="mood-mark" aria-hidden="true">
        <ClipboardList :size="24" :stroke-width="1.7" />
      </div>
      <h2 id="mood-title">情绪打卡</h2>

      <template v-if="!done">
        <p class="dialog-lead">
          只记录此刻的状态，三个小步骤就完成；记录保存 7 天后自动删除。
        </p>

        <p class="mood-label">现在的情绪是</p>
        <div class="mood-options" role="radiogroup" aria-label="情绪名称">
          <button
            v-for="option in MOOD_OPTIONS"
            :key="option"
            type="button"
            role="radio"
            :aria-checked="emotion === option"
            :class="{ active: emotion === option }"
            @click="emotion = option"
          >
            {{ option }}
          </button>
        </div>

        <p class="mood-label">强度（1 最轻，5 最重）</p>
        <div class="mood-scale" role="radiogroup" aria-label="情绪强度">
          <button
            v-for="level in 5"
            :key="level"
            type="button"
            role="radio"
            :aria-checked="intensity === level"
            :class="{ active: intensity === level }"
            @click="intensity = level"
          >
            {{ level }}
          </button>
        </div>

        <label class="mood-field">
          <span>发生了什么（选填）</span>
          <textarea
            v-model="trigger"
            rows="2"
            maxlength="80"
            placeholder="例如：明天要交作业，还没写完"
          ></textarea>
        </label>

        <p v-if="errorText" class="mood-error" role="alert">{{ errorText }}</p>

        <div class="dialog-actions single">
          <button class="primary" type="button" :disabled="!canSubmit" @click="submit">
            <LoaderCircle v-if="submitting" :size="18" :stroke-width="1.8" class="spin" />
            <Check v-else :size="18" :stroke-width="1.8" />
            {{ submitting ? '正在保存…' : '确认打卡' }}
          </button>
        </div>
      </template>

      <template v-else>
        <div class="mood-done">
          <div class="mood-done-icon" aria-hidden="true">
            <Check :size="30" :stroke-width="2" />
          </div>
          <p>已记录 {{ emotion }} · 强度 {{ intensity }}/5</p>
          <small>记录保留 7 天，可在「我的记录」中查看或删除。</small>
        </div>
      </template>
    </div>
  </dialog>
</template>

<style scoped>
.mood-mark {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  color: var(--text);
  background: var(--surface-muted);
  border-radius: 10px;
}
.mood-label {
  margin: 16px 0 8px;
  font-size: 13px;
  color: var(--text-muted);
}
.mood-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.mood-options button {
  padding: 10px 0;
  font-size: 14px;
  color: var(--text);
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 10px;
  transition: border-color 0.18s ease, background-color 0.18s ease;
}
.mood-options button:hover {
  border-color: var(--accent);
}
.mood-options button.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #FFFFFF;
}
.mood-scale {
  display: flex;
  gap: 8px;
}
.mood-scale button {
  flex: 1;
  padding: 10px 0;
  font-size: 15px;
  color: var(--text);
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 10px;
  transition: border-color 0.18s ease, background-color 0.18s ease;
}
.mood-scale button.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #FFFFFF;
  font-weight: 600;
}
.mood-field {
  display: block;
  margin: 16px 0 4px;
}
.mood-field > span {
  display: block;
  margin-bottom: 7px;
  font-size: 13px;
  color: var(--text-muted);
}
.mood-field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 14px;
  font-size: 14px;
  font-family: inherit;
  color: var(--text);
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 10px;
  resize: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}
.mood-field textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgb(61 125 214 / 12%);
}
.mood-error {
  margin: 8px 0 0;
  font-size: 13px;
  color: #c2452d;
}
.dialog-actions.single .primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 14px;
}
.dialog-actions.single .primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.spin {
  animation: mood-spin 1s linear infinite;
}
@keyframes mood-spin {
  to { transform: rotate(360deg); }
}
.mood-done {
  display: grid;
  gap: 8px;
  padding: 20px 0 8px;
  justify-items: center;
  text-align: center;
}
.mood-done-icon {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  color: #FFFFFF;
  background: #2f9e6e;
  border-radius: 50%;
}
.mood-done p {
  margin: 4px 0 0;
  font-size: 15.5px;
  font-weight: 600;
}
.mood-done small {
  font-size: 12.5px;
  color: var(--text-soft);
}
</style>
