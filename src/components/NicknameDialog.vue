<script setup lang="ts">
import { Check, UserRound } from '@lucide/vue'
import { onMounted, ref, watch } from 'vue'

const props = defineProps<{ open: boolean; current: string }>()
const emit = defineEmits<{ save: [name: string]; close: [] }>()

const dialog = ref<HTMLDialogElement | null>(null)
const name = ref(props.current || '')
const submitted = ref(false)

watch(
  () => props.open,
  (open) => {
    if (open) {
      name.value = props.current || ''
      submitted.value = false
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

const save = () => {
  submitted.value = true
  emit('save', name.value.trim())
  close()
}
</script>

<template>
  <dialog
    ref="dialog"
    class="app-dialog nickname-dialog"
    aria-labelledby="nick-title"
    @close="!submitted && emit('close')"
  >
    <div class="dialog-surface">
      <div class="nick-mark" aria-hidden="true">
        <UserRound :size="24" :stroke-width="1.7" />
      </div>
      <h2 id="nick-title">设置你的称呼</h2>
      <p class="dialog-lead">
        这个称呼只用于云舒学伴首页与对话界面，不会传给女娲，也不会展示给其他人。
      </p>
      <label class="nick-field">
        <span>昵称</span>
        <input v-model="name" type="text" maxlength="32" placeholder="例如：小明" />
      </label>
      <p class="nick-hint">最多 32 个字符，仅支持中英文、数字与少量标点。</p>
      <div class="dialog-actions single">
        <button class="primary" type="button" @click="save">
          <Check :size="18" :stroke-width="1.8" /> 保存称呼
        </button>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.nick-mark {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  color: var(--text);
  background: var(--surface-muted);
  border-radius: 10px;
}
.nick-field {
  display: block;
  margin: 14px 0 6px;
}
.nick-field > span {
  display: block;
  margin-bottom: 7px;
  font-size: 13px;
  color: var(--text-muted);
}
.nick-field input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  font-size: 14.5px;
  color: var(--text);
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 10px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}
.nick-field input::placeholder {
  color: var(--text-soft);
}
.nick-field input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgb(61 125 214 / 12%);
}
.nick-hint {
  margin: 0 0 14px;
  font-size: 12px;
  color: var(--text-soft);
}
.dialog-actions.single .primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
}
</style>
