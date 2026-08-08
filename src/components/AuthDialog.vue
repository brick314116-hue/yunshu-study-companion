<script setup lang="ts">
import { KeyRound, LogIn, ShieldCheck, UserRound, X } from '@lucide/vue'
import { nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  configured: boolean
  loading: boolean
  error: string
}>()

const emit = defineEmits<{
  close: []
  login: [username: string, password: string]
  register: [username: string, password: string]
}>()

const dialog = ref<HTMLDialogElement | null>(null)
const usernameInput = ref<HTMLInputElement | null>(null)
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const validationError = ref('')
const registering = ref(false)

watch(
  () => props.open,
  async (open) => {
    if (open && !dialog.value?.open) {
      validationError.value = ''
      password.value = ''
      confirmPassword.value = ''
      dialog.value?.showModal()
      await nextTick()
      usernameInput.value?.focus()
    }
    if (!open && dialog.value?.open) dialog.value.close()
  },
  { immediate: true },
)

onMounted(() => {
  if (props.open && !dialog.value?.open) dialog.value?.showModal()
})

const submit = () => {
  const account = username.value.trim()
  if (!account || !password.value) {
    validationError.value = '请输入用户名和密码。'
    return
  }
  if (registering.value && password.value !== confirmPassword.value) {
    validationError.value = '两次输入的密码不一致。'
    return
  }
  validationError.value = ''
  if (registering.value) emit('register', account, password.value)
  else emit('login', account, password.value)
}
</script>

<template>
  <dialog
    ref="dialog"
    class="app-dialog auth-dialog"
    aria-labelledby="auth-title"
    @cancel.prevent="!loading && emit('close')"
  >
    <form class="dialog-surface auth-surface" @submit.prevent="submit">
      <header class="dialog-header">
        <span class="dialog-icon" aria-hidden="true">
          <KeyRound :size="22" :stroke-width="1.7" />
        </span>
        <button type="button" aria-label="关闭登录" :disabled="loading" @click="emit('close')">
          <X :size="18" :stroke-width="1.8" />
        </button>
      </header>

      <h2 id="auth-title">{{ registering ? '注册云舒学伴' : '登录云舒学伴' }}</h2>
      <p class="dialog-lead">账号只用于隔离你的会话与短期记录，不会传给智能体。</p>

      <div v-if="configured" class="auth-fields">
        <label>
          <span>用户名</span>
          <span class="auth-input">
            <UserRound :size="18" :stroke-width="1.7" aria-hidden="true" />
            <input
              ref="usernameInput"
              v-model="username"
              type="text"
              name="username"
              autocomplete="username"
              maxlength="64"
              placeholder="请输入用户名"
              :disabled="loading"
              required
            />
          </span>
        </label>
        <label>
          <span>密码</span>
          <span class="auth-input">
            <KeyRound :size="18" :stroke-width="1.7" aria-hidden="true" />
            <input
              v-model="password"
              type="password"
              name="password"
              autocomplete="current-password"
              maxlength="128"
              placeholder="请输入密码"
              :disabled="loading"
              required
            />
          </span>
        </label>
        <label v-if="registering">
          <span>确认密码</span>
          <span class="auth-input">
            <KeyRound :size="18" :stroke-width="1.7" aria-hidden="true" />
            <input
              v-model="confirmPassword"
              type="password"
              name="confirm-password"
              autocomplete="new-password"
              maxlength="128"
              placeholder="请再次输入密码"
              :disabled="loading"
              required
            />
          </span>
        </label>
        <p v-if="validationError || error" class="auth-error" role="alert">
          {{ validationError || error }}
        </p>
        <button class="auth-submit" type="submit" :disabled="loading">
          <LogIn :size="18" :stroke-width="1.8" />
          <span>{{ loading ? '正在提交...' : registering ? '注册' : '登录' }}</span>
        </button>
        <button
          class="auth-switch"
          type="button"
          :disabled="loading"
          @click="registering = !registering; validationError = ''"
        >
          {{ registering ? '已有账号，去登录' : '没有账号，去注册' }}
        </button>
        <p class="auth-help">这里不会要求你填写真实姓名、学校或联系方式。</p>
      </div>

      <div v-else class="auth-config-notice" role="status">
        <ShieldCheck :size="21" :stroke-width="1.7" />
        <div>
          <strong>CloudBase 认证尚未配置</strong>
          <p>部署时填写环境 ID 并开启用户名密码登录后，这里即可正常使用。</p>
        </div>
      </div>
    </form>
  </dialog>
</template>
