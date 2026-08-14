<script setup lang="ts">
import {
  ArrowRight,
  KeyRound,
  LogIn,
  Phone,
  ShieldCheck,
  UserRound,
} from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import {
  authConfigured,
  sendSmsCode,
  signInWithPhoneCode,
  signInWithUsernamePassword,
} from '../auth'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ success: []; register: []; close: [] }>()

const dialog = ref<HTMLDialogElement | null>(null)
const mode = ref<'password' | 'phone-code'>('password')
const error = ref('')
const loading = ref(false)
const submitted = ref(false)

// ─── 表单字段 ──────────────────────────────────────────
const phone = ref('')
const code = ref('')
const account = ref('')
const password = ref('')

// 验证码倒计时（秒），0 表示可发送
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | undefined

// getVerification 返回的 verification_id，登录时需回传
const verificationId = ref('')

// ─── 校验规则（对齐 CloudBase 要求）────────────────────
const PHONE_RE = /^1[3-9]\d{9}$/
// CloudBase 用户名/密码要求：用户名 2-32 字符，密码 8-64 字符
const USERNAME_MIN = 1
const USERNAME_MAX = 32
const PASSWORD_MIN = 8
const PASSWORD_MAX = 64

const phoneValid = computed(() => PHONE_RE.test(phone.value.trim()))
const accountValid = computed(() => {
  const v = account.value.trim()
  return v.length >= USERNAME_MIN && v.length <= USERNAME_MAX
})
const passwordValid = computed(() => password.value.length >= PASSWORD_MIN)

const phoneError = computed(() => {
  if (!phone.value) return ''
  if (!PHONE_RE.test(phone.value.trim())) return '请输入有效的 11 位手机号。'
  return ''
})
const accountError = computed(() => {
  if (!account.value) return ''
  const v = account.value.trim()
  if (v.length < USERNAME_MIN) return `用户名至少 ${USERNAME_MIN} 个字符。`
  if (v.length > USERNAME_MAX) return `用户名不超过 ${USERNAME_MAX} 个字符。`
  // 不允许纯空格或特殊控制字符
  if (/[\x00-\x1f]/.test(v)) return '用户名包含不允许的字符。'
  return ''
})
const passwordError = computed(() => {
  if (!password.value) return ''
  if (password.value.length < PASSWORD_MIN) return `密码至少 ${PASSWORD_MIN} 位。`
  if (password.value.length > PASSWORD_MAX) return `密码不超过 ${PASSWORD_MAX} 位。`
  return ''
})

// 当前模式是否可以提交
const canSubmit = computed(() => {
  if (loading.value) return false
  return mode.value === 'phone-code'
    ? phoneValid.value && code.value.length >= 4
    : accountValid.value && passwordValid.value
})

// ─── 验证码发送 ────────────────────────────────────────
const CODE_COOLDOWN = 60 // 秒
const MAX_DAILY_HINT = '同一手机号每天最多发送 5 条验证码，请勿频繁请求。'

const sendCode = async () => {
  if (countdown.value > 0 || loading.value) return
  const msg = phoneError.value
  if (msg) { error.value = msg; return }

  loading.value = true
  error.value = ''
  try {
    verificationId.value = await sendSmsCode(phone.value.trim())
    startCountdown()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '验证码发送失败，请稍后重试。'
    // 如果是频率限制，提示每日上限
    if (error.value.includes('频率') || error.value.includes('RATE') || error.value.includes('limit')) {
      error.value += '\n' + MAX_DAILY_HINT
    }
  } finally {
    loading.value = false
  }
}

const startCountdown = () => {
  countdown.value = CODE_COOLDOWN
  clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) clearInterval(countdownTimer)
  }, 1000)
}

// 清理倒计时
onMounted(() => clearInterval(countdownTimer))

// ─── 提交登录 ──────────────────────────────────────────
const submit = async () => {
  if (loading.value || !canSubmit.value) return
  loading.value = true
  error.value = ''
  try {
    if (mode.value === 'phone-code') {
      await signInWithPhoneCode(phone.value.trim(), code.value.trim(), verificationId.value)
    } else {
      await signInWithUsernamePassword(account.value.trim(), password.value)
    }
    submitted.value = true
    emit('success')
    close()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '登录失败，请检查输入后重试。'
  } finally {
    loading.value = false
  }
}

// ─── 弹窗生命周期 ──────────────────────────────────────
watch(
  () => props.open,
  (open) => {
    if (open && !dialog.value?.open) {
      error.value = ''
      submitted.value = false
      dialog.value?.showModal()
    }
    if (!open && dialog.value?.open) dialog.value.close()
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

// 切换模式时清空错误和部分字段
watch(mode, () => { error.value = '' })
</script>

<template>
  <dialog
    ref="dialog"
    class="app-dialog auth-dialog"
    aria-labelledby="auth-title"
    @close="!submitted && emit('close')"
  >
    <div class="dialog-surface">
      <!-- 标题区 -->
      <div class="auth-mark" aria-hidden="true">
        <LogIn :size="24" :stroke-width="1.7" />
      </div>
      <h2 id="auth-title">登录云舒学伴</h2>
      <p class="dialog-lead">选择一种方式继续，你的身份由 CloudBase 安全管理。</p>

      <div v-if="!authConfigured" class="auth-config-note">
        CloudBase 认证尚未配置，请检查部署环境变量。
      </div>

      <div v-else class="auth-form">
        <!-- ═══ 手机号 + 验证码 ═══ -->
        <template v-if="mode === 'phone-code'">
          <label class="auth-field">
            <span><Phone :size="16" :stroke-width="1.8" /> 手机号</span>
            <input
              v-model="phone"
              type="tel"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="11"
              placeholder="请输入 11 位手机号"
              autocomplete="tel"
              :disabled="loading"
            />
          </label>
          <p v-if="phoneError" class="field-error">{{ phoneError }}</p>

          <label class="auth-field code-field">
            <span><ShieldCheck :size="16" :stroke-width="1.8" /> 验证码</span>
            <div class="code-input-row">
              <input
                v-model="code"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="6"
                placeholder="6 位验证码"
                autocomplete="one-time-code"
                :disabled="loading"
                @keyup.enter="submit"
              />
              <button
                type="button"
                class="code-send-btn"
                :disabled="countdown > 0 || loading || !phoneValid"
                @click="sendCode"
              >
                {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
              </button>
            </div>
          </label>
          <p v-if="countdown <= 0 && phoneValid" class="code-hint">{{ MAX_DAILY_HINT }}</p>
        </template>

        <!-- ═══ 用户名/手机号 + 密码（默认） ═══ -->
        <template v-else>
          <label class="auth-field">
            <span><UserRound :size="16" :stroke-width="1.8" /> 用户名 / 手机号</span>
            <input
              v-model="account"
              type="text"
              autocomplete="username"
              placeholder="用户名或手机号"
              :disabled="loading"
              @keyup.enter="submit"
            />
          </label>
          <p v-if="accountError" class="field-error">{{ accountError }}</p>

          <label class="auth-field">
            <span><KeyRound :size="16" :stroke-width="1.8" /> 密码</span>
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              :placeholder="`至少 ${PASSWORD_MIN} 位密码`"
              :disabled="loading"
              @keyup.enter="submit"
            />
          </label>
          <p v-if="passwordError" class="field-error">{{ passwordError }}</p>
        </template>

        <!-- 错误提示 -->
        <p v-if="error" class="auth-error" role="alert" style="white-space:pre-line">{{ error }}</p>

        <!-- 登录按钮 -->
        <div class="dialog-actions single">
          <button class="primary" type="button" :disabled="!canSubmit || loading" @click="submit">
            <template v-if="loading"><span class="btn-spinner" /> 处理中…</template>
            <template v-else>登 录<ArrowRight :size="18" :stroke-width="1.8" /></template>
          </button>
        </div>

        <!-- 注册入口（自定义注册流程，不跳转 CloudBase 默认页） -->
        <div class="auth-footer">
          <button type="button" class="auth-link" @click="mode = mode === 'password' ? 'phone-code' : 'password'">
            {{ mode === 'password' ? '验证码登录' : '密码登录' }}
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" class="auth-link" @click="emit('register')">注册</button>
        </div>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.auth-mark {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  color: var(--accent-strong);
  background: var(--accent-soft);
  border-radius: 10px;
}
.auth-config-note {
  margin-top: 14px;
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.7;
  color: #8b4b55;
  background: var(--danger-soft);
  border: 1px solid #f0d6da;
  border-radius: 10px;
}
.auth-form { margin-top: 6px; }

/* ─── Tab 切换 ─── */
.auth-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding: 4px;
  margin-bottom: 16px;
  background: var(--accent-faint);
  border-radius: 12px;
}
.auth-tabs button {
  padding: 8px 0;
  font-size: 13px;
  color: var(--text-muted);
  background: transparent;
  border: 0;
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.18s ease;
  white-space: nowrap;
}
.auth-tabs button.active {
  color: var(--accent-strong);
  font-weight: 600;
  background: #ffffff;
  box-shadow: 0 4px 14px rgb(53 116 168 / 10%);
}

/* ─── 表单字段 ─── */
.auth-field {
  display: block;
  margin-bottom: 6px;
}
.auth-field > span {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 7px;
  font-size: 13px;
  color: var(--text-muted);
}
.auth-field input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  font-size: 15px;
  color: var(--text);
  background: #fbfdff;
  border: 1px solid #d9e8f5;
  border-radius: 11px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}
.auth-field input:focus {
  outline: none;
  border-color: var(--accent-strong);
  box-shadow: 0 0 0 3px rgb(74 156 221 / 16%);
}
.auth-field input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.field-error {
  margin: 2px 0 10px;
  font-size: 12px;
  line-height: 1.5;
  color: #c45a5a;
}

/* ─── 验证码行 ─── */
.code-input-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.code-input-row input {
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  padding: 12px 14px;
  font-size: 15px;
  color: var(--text);
  background: #fbfdff;
  border: 1px solid #d9e8f5;
  border-radius: 11px;
  transition: border-color 0.18s ease;
}
.code-input-row input:focus {
  outline: none;
  border-color: var(--accent-strong);
  box-shadow: 0 0 0 3px rgb(74 156 221 / 16%);
}
.code-send-btn {
  flex-shrink: 0;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  color: #fff;
  background: linear-gradient(135deg, #74b9ef, #4a9cdd);
  border: 0;
  border-radius: 11px;
  cursor: pointer;
  transition: opacity 0.18s ease, transform 0.12s ease;
}
.code-send-btn:hover:not(:disabled) {
  opacity: 0.88;
  transform: translateY(-0.5px);
}
.code-send-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.code-hint {
  margin: 2px 0 8px;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--text-muted);
}

/* ─── 错误 / 按钮 / 底部 ─── */
.auth-error {
  margin: 4px 0 12px;
  font-size: 13px;
  line-height: 1.6;
  color: #b5495b;
}
.dialog-actions.single .primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 13px 0;
  font-size: 15.5px;
}
.btn-spinner {
  width: 17px;
  height: 17px;
  border: 2.5px solid rgb(255 255 255 / 35%);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.auth-footer {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
}
.auth-link {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--accent-strong);
  background: transparent;
  border: 0;
  cursor: pointer;
  padding: 4px 0;
}
.auth-link:hover { text-decoration: underline; }
.auth-alt {
  font-size: 12px;
  color: var(--accent-strong);
  background: transparent;
  border: 0;
  border-top: 1px solid #eef4fa;
  cursor: pointer;
  padding: 10px 0 0;
  width: 100%;
}
.auth-alt:hover { text-decoration: underline; opacity: 0.78; }
</style>
