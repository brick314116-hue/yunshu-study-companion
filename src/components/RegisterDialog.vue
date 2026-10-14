<script setup lang="ts">
import { KeyRound, Phone, ShieldCheck, UserRound } from '@lucide/vue'
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { authConfigured, sendSmsCode, signUpWithPhone, bindUsername, isUsernameTaken } from '../auth'
import { saveDisplayName } from '../user-profile'
import Step from './Step.vue'
import Stepper from './Stepper.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ success: []; back: []; close: [] }>()

const dialog = ref<HTMLDialogElement | null>(null)
const error = ref('')
const loading = ref(false)
const submitted = ref(false)
const registrationStage = ref<'new' | 'registered' | 'bound'>('new')

// 注册分步：1=验证手机号 2=设置用户名与密码
const step = ref(1)
const stepperRef = ref<InstanceType<typeof Stepper> | null>(null)

// ─── 步骤 1：手机号 + 验证码 ──────────────────────────
const phone = ref('')
const code = ref('')

const PHONE_RE = /^1[3-9]\d{9}$/
const phoneValid = computed(() => PHONE_RE.test(phone.value.trim()))
const phoneError = computed(() => {
  if (!phone.value) return ''
  if (!PHONE_RE.test(phone.value.trim())) return '请输入有效的 11 位手机号。'
  return ''
})

// 验证码倒计时
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | undefined
const CODE_COOLDOWN = 60

// getVerification 返回的 verification_id，注册时必须回传才能校验验证码
const verificationId = ref('')

const startCountdown = () => {
  countdown.value = CODE_COOLDOWN
  clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) clearInterval(countdownTimer)
  }, 1000)
}

const sendCode = async () => {
  if (countdown.value > 0 || loading.value) return
  if (phoneError.value) {
    error.value = phoneError.value
    return
  }

  loading.value = true
  error.value = ''
  try {
    verificationId.value = await sendSmsCode(phone.value.trim())
    startCountdown()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '验证码发送失败'
    if (/(频率|RATE|limit|频繁)/i.test(error.value)) {
      error.value += '\n同一手机号每天最多发送 5 条验证码。'
    }
  } finally {
    loading.value = false
  }
}

onBeforeUnmount(() => clearInterval(countdownTimer))

// ─── 步骤 2：用户名 + 密码 ─────────────────────────────
const regUsername = ref('')
const regPassword = ref('')
const regPasswordConfirm = ref('')

// CloudBase 用户名规则：长度 1-32；可含字母数字与 - _；不允许纯数字；
// - _ 不能出现在开头或结尾。
const UN_MIN = 1
const UN_MAX = 32
const PW_MIN = 8
const PW_MAX = 64

const usernameValid = computed(() => {
  const v = regUsername.value.trim()
  if (v.length < UN_MIN || v.length > UN_MAX) return false
  if (/^\d+$/.test(v)) return false // 不允许纯数字
  if (/^[-_]/.test(v) || /[-_]$/.test(v)) return false // 不能以 - 或 _ 开头/结尾
  if (!/^[A-Za-z0-9_-]+$/.test(v)) return false // 仅允许字母数字与 - _
  return true
})
const passwordValid = computed(
  () => regPassword.value.length >= PW_MIN && regPassword.value.length <= PW_MAX,
)
const passwordsMatch = computed(
  () => !regPasswordConfirm.value || regPassword.value === regPasswordConfirm.value,
)

const step1Ready = computed(() => phoneValid.value && code.value.trim().length >= 4)
const canRegister = computed(
  () =>
    step1Ready.value &&
    usernameValid.value &&
    passwordValid.value &&
    passwordsMatch.value &&
    !!regPasswordConfirm.value,
)

// Stepper 的「下一步 / 完成」门控
const nextDisabled = computed(() => (step.value === 1 ? !step1Ready.value : !canRegister.value))

const usernameHint = computed(() => {
  if (!regUsername.value) return `${UN_MIN}-${UN_MAX} 个字符，支持字母/数字与 - _（不可为纯数字、不能以 - _ 开头结尾）`
  const len = regUsername.value.trim().length
  if (len < UN_MIN) return `还需 ${UN_MIN - len} 个字符`
  if (len > UN_MAX) return `超出 ${len - UN_MAX} 个字符`
  if (/^\d+$/.test(regUsername.value.trim())) return '用户名不能是纯数字'
  if (/^[-_]/.test(regUsername.value.trim()) || /[-_]$/.test(regUsername.value.trim()))
    return '- 或 _ 不能出现在开头或结尾'
  if (!/^[A-Za-z0-9_-]+$/.test(regUsername.value.trim())) return '仅支持字母、数字与 - _'
  return '✓ 格式正确'
})
const passwordHint = computed(() => {
  if (!regPassword.value) return `至少 ${PW_MIN} 位，建议字母+数字+符号组合`
  if (regPassword.value.length < PW_MIN) return `还需 ${PW_MIN - regPassword.value.length} 位`
  if (regPassword.value.length > PW_MAX) return '超出长度上限'
  return '✓ 强度合格'
})
const confirmHint = computed(() => {
  if (!regPasswordConfirm.value) return '再次输入密码以确认'
  if (!passwordsMatch.value) return '两次密码不一致'
  return '✓ 已确认'
})

const title = computed(() => (step.value === 1 ? '验证手机号' : '创建你的账号'))
const lead = computed(() =>
  step.value === 1
    ? '我们需要先验证你的手机号，确保每个账号真实有效。'
    : '设置一个用户名和密码完成注册。用户名将作为你在心隅学伴中的称呼，请勿使用真实姓名。',
)

const register = async () => {
  if (!canRegister.value || loading.value) return
  loading.value = true
  error.value = ''
  const username = regUsername.value.trim()
  try {
    if (registrationStage.value === 'new') {
      // 注册前先检查用户名是否可用（best-effort，避免"账号已建但用户名被占用"的尴尬状态）
      try {
        const taken = await isUsernameTaken(username)
        if (taken) {
          error.value = '该用户名已被占用，请换一个用户名。'
          return
        }
      } catch {
        // 检查方法不可用时不阻断注册，交由后续 bindUsername 兜底
      }

      // 手机号 + 验证码注册（带密码），CloudBase 会自动登录并生成账号。
      await signUpWithPhone(phone.value.trim(), code.value.trim(), regPassword.value, verificationId.value)
      registrationStage.value = 'registered'
    }

    // 注册成功后已自动登录：把用户名绑到 CloudBase 账号认证，
    // 这样之后才能用「用户名 + 密码」登录（而不仅仅是手机号）。
    if (registrationStage.value === 'registered') {
      await bindUsername(username)
      registrationStage.value = 'bound'
    }

    // 同时写入资料；失败时不能假装整套注册流程已经完成。
    await saveDisplayName('', username)
    submitted.value = true
    emit('success')
    close()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '注册失败，请检查后重试'
    if (registrationStage.value === 'new' && /已注册|已存在|already/i.test(error.value)) {
      stepperRef.value?.goTo(1)
      error.value += '\n该手机号已注册，请直接登录。'
    }
  } finally {
    loading.value = false
  }
}

const onStepChange = (next: number) => {
  step.value = next
  error.value = ''
}

// ─── 弹窗生命周期 ──────────────────────────────────────
watch(
  () => props.open,
  (open) => {
    if (open && !dialog.value?.open) {
      step.value = 1
      error.value = ''
      submitted.value = false
      registrationStage.value = 'new'
      phone.value = ''
      code.value = ''
      verificationId.value = ''
      regUsername.value = ''
      regPassword.value = ''
      regPasswordConfirm.value = ''
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
</script>

<template>
  <dialog
    ref="dialog"
    class="app-dialog register-dialog"
    aria-labelledby="reg-title"
    @close="!submitted && emit('close')"
  >
    <div class="dialog-surface">
      <div class="auth-mark" aria-hidden="true">
        <UserRound :size="24" :stroke-width="1.7" />
      </div>
      <h2 id="reg-title">{{ title }}</h2>
      <p class="dialog-lead">{{ lead }}</p>

      <div v-if="!authConfigured" class="auth-config-note">CloudBase 认证尚未配置。</div>

      <div v-else class="auth-form">
        <Stepper
          ref="stepperRef"
          :initial-step="1"
          next-button-text="下一步"
          back-button-text="上一步"
          complete-button-text="完成注册"
          :next-disabled="nextDisabled"
          :next-loading="loading"
          @step-change="onStepChange"
          @final-step-completed="register"
        >
          <!-- ═══ Step 1: 手机号 + 验证码 ═══ -->
          <Step>
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
            <p v-if="countdown <= 0 && phoneValid" class="code-hint">
              同一手机号每天最多发送 5 条验证码，请勿频繁请求。
            </p>
          </Step>

          <!-- ═══ Step 2: 用户名 + 密码 ═══ -->
          <Step>
            <label class="auth-field">
              <span><UserRound :size="16" :stroke-width="1.8" /> 用户名</span>
              <input
                v-model="regUsername"
                type="text"
                autocomplete="username"
                placeholder="字母/数字，可含 - _，不可为纯数字"
                :disabled="loading"
              />
            </label>
            <p class="field-hint" :class="{ ok: usernameValid }">{{ usernameHint }}</p>

            <label class="auth-field">
              <span><KeyRound :size="16" :stroke-width="1.8" /> 设置密码</span>
              <input
                v-model="regPassword"
                type="password"
                autocomplete="new-password"
                placeholder="至少 8 位密码"
                :disabled="loading"
              />
            </label>
            <p class="field-hint" :class="{ ok: passwordValid }">{{ passwordHint }}</p>

            <label class="auth-field">
              <span><ShieldCheck :size="16" :stroke-width="1.8" /> 确认密码</span>
              <input
                v-model="regPasswordConfirm"
                type="password"
                autocomplete="new-password"
                placeholder="再次输入密码以确认"
                :disabled="loading"
              />
            </label>
            <p class="field-hint" :class="{ ok: passwordsMatch && !!regPasswordConfirm }">
              {{ confirmHint }}
            </p>
          </Step>
        </Stepper>

        <!-- 错误提示 -->
        <p v-if="error" class="auth-error" role="alert" style="white-space: pre-line">{{ error }}</p>

        <!-- 底部 -->
        <div class="auth-footer">
          <button type="button" class="auth-alt" @click="emit('back')">已有账号？去登录</button>
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
  color: var(--text);
  background: var(--surface-muted);
  border-radius: 10px;
}
.auth-config-note {
  margin-top: 14px;
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--danger);
  background: var(--danger-soft);
  border: 1px solid #F2D9DF;
  border-radius: 10px;
}
.auth-form {
  margin-top: 10px;
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
  font-size: 14.5px;
  color: var(--text);
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 10px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}
.auth-field input::placeholder {
  color: var(--text-soft);
}
.auth-field input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgb(61 125 214 / 12%);
}
.auth-field input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.field-error {
  margin: 2px 0 10px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--danger);
}
.field-hint {
  margin: 2px 0 12px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-soft);
}
.field-hint.ok {
  color: var(--success);
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
  font-size: 14.5px;
  color: var(--text);
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 10px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}
.code-input-row input::placeholder {
  color: var(--text-soft);
}
.code-input-row input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgb(61 125 214 / 12%);
}
.code-send-btn {
  flex-shrink: 0;
  padding: 0 12px;
  font-size: 13.5px;
  font-weight: 500;
  white-space: nowrap;
  color: var(--accent);
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.18s ease;
}
.code-send-btn:hover:not(:disabled) {
  color: var(--accent-strong);
  border-color: var(--text-soft);
  background: var(--surface-soft);
}
.code-send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.code-hint {
  margin: 2px 0 8px;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--text-soft);
}

/* ─── 错误 / 底部 ─── */
.auth-error {
  margin: 12px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--danger);
}
.auth-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}
.auth-alt {
  width: 100%;
  padding: 10px 0 0;
  font-size: 12.5px;
  color: var(--accent);
  background: transparent;
  border: 0;
  border-top: 1px solid var(--line);
  cursor: pointer;
}
.auth-alt:hover {
  color: var(--accent-strong);
  text-decoration: underline;
}
</style>
