import type { AuthUser } from './types'

const envId = import.meta.env.VITE_CLOUDBASE_ENV_ID?.trim()
const region = import.meta.env.VITE_CLOUDBASE_REGION?.trim() || 'ap-shanghai'

interface CloudBaseAuth {
  getAccessToken: () => Promise<{ accessToken: string; env: string }>
  getLoginState: () => Promise<unknown>
  getUserInfo: () => Promise<unknown>
  toDefaultLoginPage: (params?: { redirectUri?: string }) => Promise<unknown>
  signOut: () => Promise<unknown>
  signInWithEmailAndPassword: (email: string, password: string) => Promise<unknown>
  signUpWithEmailAndPassword: (email: string, password: string, options?: unknown) => Promise<unknown>
  signInWithPassword: (credentials: { username: string; password: string }) => Promise<unknown>
  sendPhoneCode: (phoneNumber: string) => Promise<unknown>
  signInWithPhoneCodeOrPassword: (credentials: { phoneNumber: string; phoneCode?: string; password?: string }) => Promise<unknown>
  signUpWithPhoneCode: (phoneNumber: string, phoneCode: string, password?: string) => Promise<unknown>
}

interface CloudBaseApp {
  auth: () => CloudBaseAuth
}

let appPromise: Promise<CloudBaseApp> | undefined

type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null

const readString = (value: unknown) => (typeof value === 'string' ? value : '')

/**
 * 清洗并汉化错误信息，彻底过滤一切 "[object Object]" 乱码
 */
function cleanErrorMessage(raw: string): string {
  // 剔除任何形式的 [object ...] 乱码
  let cleaned = raw.replace(/\[object\s*object\]/gi, '').replace(/\[object.*?\]/gi, '').trim()
  if (!cleaned) return '操作失败，请稍后重试。'

  const lower = cleaned.toLowerCase()
  if (
    /验证码.*(错误|过期|不正确|失效)|verification.*(invalid|expire|wrong|incorrect)|incorrect_verification_code|verification_code_expired/i.test(
      lower,
    )
  ) {
    return '验证码错误或已过期，请重新获取。'
  }
  if (/已注册|已存在|already.*(exist|register)|user_exist|phone_exist/i.test(lower)) {
    return '该手机号已注册，请直接登录。'
  }
  if (/该用户名已被占用|用户名.*(已被占用|已存在|重复)|username.*(taken|exist|already)/i.test(lower)) {
    return '该用户名已被占用，请换一个用户名。'
  }
  if (/密码.*(错误|不正确)|password.*(wrong|incorrect|invalid)/i.test(lower)) {
    return '密码错误，请检查后重试。'
  }
  if (/密码.*(太短|长度|位数|规范)|password.*(short|weak|length)/i.test(lower)) {
    return '密码长度或强度不符合要求，至少需要 8 位。'
  }
  if (/频率|过于频繁|rate.*limit|too.*many|request_limited/i.test(lower)) {
    return '操作过于频繁，请稍后再试。'
  }
  if (/failed to fetch|network.*error|网络异常/i.test(lower)) {
    return '网络连接失败，请检查网络后重试。'
  }
  if (/invalid.*username|用户名.*格式/i.test(lower)) {
    return '用户名格式不符合要求（支持字母/数字与 - _，不可为纯数字）。'
  }

  return cleaned
}

/**
 * 从各种类型的错误中深度提取人类可读的错误文本，坚决杜绝输出 "[object Object]"
 */
export function extractErrorMessage(err: unknown, fallback = '操作失败，请稍后重试。'): string {
  if (!err) return fallback

  // 1. 本身为非空字符串
  if (typeof err === 'string') {
    const trimmed = err.trim()
    if (!trimmed || /\[object\s*object\]/i.test(trimmed)) return fallback
    return cleanErrorMessage(trimmed)
  }

  // 2. 为对象或 Error 实例
  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>

    // 优先深层提取更具体的消息字段
    const candidates: unknown[] = [
      obj.error_description,
      isRecord(obj.error) ? obj.error.message : undefined,
      isRecord(obj.error) ? obj.error.msg : undefined,
      isRecord(obj.error) ? obj.error.error_description : undefined,
      typeof obj.error === 'string' ? obj.error : undefined,
      obj.message,
      obj.msg,
      obj.errMsg,
      obj.errorMsg,
      isRecord(obj.data)
        ? (obj.data as any).message || (obj.data as any).msg || (obj.data as any).error
        : undefined,
    ]

    for (const c of candidates) {
      if (typeof c === 'string' && c.trim()) {
        const text = c.trim()
        if (!/\[object\s*object\]/i.test(text)) {
          return cleanErrorMessage(text)
        }
      }
    }

    // 尝试根据 code / status 进行错误码转译
    const rawCode =
      obj.code ||
      obj.errorCode ||
      obj.status ||
      (isRecord(obj.error) ? (obj.error as any).code : undefined)
    if (typeof rawCode === 'string' || typeof rawCode === 'number') {
      const codeStr = String(rawCode).trim()
      if (codeStr && !/\[object/i.test(codeStr) && codeStr.toLowerCase() !== 'unknown') {
        const translated = cleanErrorMessage(codeStr)
        if (translated && !translated.startsWith('操作失败')) {
          return translated
        }
        return '操作失败（' + codeStr + '）'
      }
    }

    // 尝试安全序列化排除空对象与 [object]
    try {
      const json = JSON.stringify(err)
      if (json && json !== '{}' && !json.includes('[object')) {
        const parsed = JSON.parse(json)
        if (parsed.message && typeof parsed.message === 'string') {
          return cleanErrorMessage(parsed.message)
        }
        if (parsed.error && typeof parsed.error === 'string') {
          return cleanErrorMessage(parsed.error)
        }
      }
    } catch {
      /* ignore */
    }
  }

  return fallback
}

export const resultError = (result: unknown): string => {
  if (!isRecord(result)) return ''
  if ('error' in result && result.error) {
    return extractErrorMessage(result.error, '操作失败，请检查输入后重试。')
  }
  if ('code' in result && typeof result.code === 'string') {
    const code = result.code.toLowerCase()
    if (code && code !== 'ok' && code !== 'success' && code !== '0') {
      return extractErrorMessage(result, '操作失败，请检查输入后重试。')
    }
  }
  return ''
}

// @cloudbase/js-sdk v3 的 getUserInfo() 返回 { data: { session, user } }
const authUserRecord = (info: unknown): RecordValue | null => {
  if (!isRecord(info)) return null
  const data = isRecord(info.data) ? info.data : {}
  const user = isRecord(data.user) ? data.user : null
  if (!user) return null
  const loginType = readString(data.loginType || data.login_type || user.loginType).toUpperCase()
  if (loginType === 'ANONYMOUS') return null
  return user
}

const toAuthUser = (user: RecordValue): AuthUser => {
  const metadata = isRecord(user.user_metadata) ? user.user_metadata : {}
  const displayName =
    readString(metadata.displayName) ||
    readString(metadata.username) ||
    readString(user.displayName) ||
    readString(user.username) ||
    '已登录用户'

  return {
    id: readString(user.id) || readString(user.uid),
    displayName,
  }
}

const requireApp = async (): Promise<CloudBaseApp> => {
  if (!envId) throw new Error('CloudBase 尚未配置，请先填写部署环境变量。')
  appPromise ??= import('@cloudbase/js-sdk').then(({ default: cloudbase }) =>
    cloudbase.init({ env: envId, region }) as unknown as CloudBaseApp,
  )
  return appPromise
}

export const authConfigured = Boolean(envId)

export const getAuth = async () => (await requireApp()).auth()

// 以宽松类型获取 auth 对象。当前环境为 supabase-like 新接口，
// 不同 SDK 形态下方法名/返回值不同，用 any 才能调用到正确的方法，
// 而不被旧接口声明误导（之前 login 失败正是因为调了不存在/失效的旧方法）。
const getRawAuth = async (): Promise<any> => (await getAuth()) as any

// 把 supabase-like 的 getCurrentUser 返回对象归一化成 AuthUser。
const normalizeCurrentUser = (cu: unknown): AuthUser | null => {
  if (!isRecord(cu)) return null
  const id = readString(cu.id) || readString(cu.uid)
  if (!id && !cu.username && !cu.displayName && !cu.display_name) return null
  const metadata = isRecord(cu.user_metadata) ? cu.user_metadata : {}
  const displayName =
    readString(metadata.displayName) ||
    readString(metadata.username) ||
    readString(cu.displayName) ||
    readString(cu.display_name) ||
    readString(cu.username) ||
    '已登录用户'
  return { id: id || 'session', displayName }
}

// 恢复登录态：优先读取已登录用户；未登录（无用户）属于正常状态，返回 null。
const MAX_AUTH_RETRIES = 3
const AUTH_RETRY_DELAY_MS = 350

// 读取当前登录用户（supabase-like 用 getCurrentUser，旧版用 getUserInfo）。
const readCurrentUser = async (auth: any): Promise<AuthUser | null> => {
  if (typeof auth.getCurrentUser === 'function') {
    for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
      try {
        const cu = await auth.getCurrentUser()
        const user = normalizeCurrentUser(cu)
        if (user) return user
        return null
      } catch (err) {
        console.warn(`[auth] readCurrentUser getCurrentUser attempt ${attempt + 1} failed:`, err)
        if (attempt < MAX_AUTH_RETRIES) await new Promise((r) => setTimeout(r, AUTH_RETRY_DELAY_MS))
      }
    }
    return null
  }
  if (typeof auth.getUserInfo === 'function') {
    for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
      try {
        const user = authUserRecord(await auth.getUserInfo())
        if (user) return toAuthUser(user)
        return null
      } catch (err) {
        console.warn(`[auth] readCurrentUser getUserInfo attempt ${attempt + 1} failed:`, err)
        if (attempt < MAX_AUTH_RETRIES) await new Promise((r) => setTimeout(r, AUTH_RETRY_DELAY_MS))
      }
    }
  }
  return null
}

// 从 access token（JWT）中解出真实用户 uid。
// 注意：CloudBase 的 auth.uid 安全规则依赖真实 uid，绝不能用 'session' 之类占位字符串替代，
// 否则 user_profiles 等 owner-only 集合的读/写会因 userId 不匹配而全部失效（表现为「同意弹窗每次都弹」）。
export const extractUidFromToken = (token: string): string | null => {
  if (!token || !token.includes('.')) return null
  try {
    const parts = token.split('.')
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    const candidates = [
      payload.uid,
      payload.sub,
      payload.user_id,
      payload.openid,
      payload.unionid,
      payload.id,
    ]
    for (const c of candidates) {
      if (typeof c === 'string' && c) return c
    }
    if (isRecord(payload.user)) {
      const u = payload.user
      const uid = u.uid || u.id || u.openid || u.user_id
      if (typeof uid === 'string' && uid) return uid
    }
    return null
  } catch {
    return null
  }
}

export const restoreAuth = async (): Promise<AuthUser | null> => {
  if (!envId) return null
  const auth = await getRawAuth()

  const user = await readCurrentUser(auth)
  // 只有当拿到真实 uid（非占位）时才信任 getCurrentUser 的结果；
  // 否则（getCurrentUser 失败 / 返回的对象没有 id）一律从 token 解真实 uid。
  if (user && user.id && user.id !== 'session') return user
  const fallbackName = user?.id === 'session' ? user.displayName : ''

  // 兜底：从 access token (JWT) 解出真实 uid，保证 user_profiles 的 owner-only 规则能命中。
  // 绝不用 'session' 占位 id，否则同意状态读不回、每次登录都弹窗。
  try {
    const token = await getAccessToken()
    const uid = extractUidFromToken(token)
    if (uid) {
      console.log('[auth] 已从 token 解出真实 uid，用于 owner-only 数据访问。')
      return { id: uid, displayName: fallbackName || '已登录用户' }
    }
  } catch (err) {
    console.warn('[auth] 从 token 解析 uid 失败：', err)
  }
  return null
}

// ─── 登录方式 ──────────────────────────────────────────────

// 跳转到 CloudBase 托管登录页（覆盖微信等其他登录方式）。
export const signInWithCloudBase = async () => {
  const result = await (await getAuth()).toDefaultLoginPage()
  const error = resultError(result)
  if (error) throw new Error(error)
}

// 邮箱 + 密码登录。
export const signInWithEmail = async (email: string, password: string) => {
  const result = await (await getAuth()).signInWithEmailAndPassword(email.trim(), password)
  const error = resultError(result)
  if (error) throw new Error(error)
}

// 用户名/邮箱/手机号 + 密码登录（CloudBase 统一入口）。
export const signInWithUsernamePassword = async (username: string, password: string) => {
  const account = username.trim()
  const credentials = /^1[3-9]\d{9}$/.test(account)
    ? { phone: account, password }
    : { username: account, password }
  const result = await getRawAuth().then((auth) => auth.signInWithPassword(credentials))
  const error = resultError(result)
  if (error) throw new Error(error)
}

// 手机号 + 验证码登录。
// 注意：本环境是 supabase-like 新接口，必须用 getVerification + signInWithSms，
// 旧的 signInWithPhoneCodeOrPassword 在本环境对验证码登录无效。
export const signInWithPhoneCode = async (
  phoneNumber: string,
  phoneCode: string,
  verificationId?: string,
) => {
  const auth = await getRawAuth()
  const phone = phoneNumber.trim()
  const raw = String(phoneCode).trim()
  try {
    if (typeof auth.signInWithSms === 'function') {
      const result = await auth.signInWithSms({
        // is_user: true 表示该手机号按「已注册用户登录」处理（注册流程另走 signUp）。
        verificationInfo: { verification_id: verificationId || '', is_user: true },
        verificationCode: raw,
        phoneNum: phone,
      })
      const error = resultError(result)
      if (error) throw new Error(formatLoginError(error))
      return
    }
    // 旧接口兜底
    if (typeof auth.signInWithPhoneCodeOrPassword === 'function') {
      const result = await auth.signInWithPhoneCodeOrPassword({ phoneNumber: phone, phoneCode: raw })
      const error = resultError(result)
      if (error) throw new Error(formatLoginError(error))
      return
    }
    throw new Error('当前环境不支持短信验证码登录。')
  } catch (e) {
    const msg = e instanceof Error ? e.message : '登录失败'
    console.error('[auth] 手机号+验证码登录失败:', e)
    throw new Error(formatLoginError(msg))
  }
}

// 手机号 + 密码登录（复用与"账号密码"相同的 signInWithPassword 入口）。
export const signInWithPhonePassword = async (phoneNumber: string, password: string) => {
  const auth = await getRawAuth()
  const phone = phoneNumber.trim()
  try {
    if (typeof auth.signInWithPassword === 'function') {
      const result = await auth.signInWithPassword({ phone, password })
      const error = resultError(result)
      if (error) throw new Error(formatLoginError(error))
      return
    }
    // 旧接口兜底
    if (typeof auth.signInWithPhoneCodeOrPassword === 'function') {
      const result = await auth.signInWithPhoneCodeOrPassword({ phoneNumber: phone, password })
      const error = resultError(result)
      if (error) throw new Error(formatLoginError(error))
      return
    }
    throw new Error('当前环境不支持手机号密码登录。')
  } catch (e) {
    const msg = e instanceof Error ? e.message : '登录失败'
    console.error('[auth] 手机号+密码登录失败:', e)
    throw new Error(formatLoginError(msg))
  }
}

// 把原始报错转成友好的中文提示，彻底过滤掉 "[object Object]"
export function formatLoginError(raw: unknown): string {
  const msg = extractErrorMessage(raw, '登录失败，请检查输入后重试。')
  const hint = classifyPhoneLoginError(msg)
  if (hint && hint !== msg && !hint.includes(msg)) {
    return hint + '\n（详细信息：' + msg + '）'
  }
  return hint || msg || '登录失败，请检查输入后重试。'
}

// 将 CloudBase 返回的原始错误信息分类为用户友好的提示。
function classifyPhoneLoginError(raw: string): string {
  const cleaned = cleanErrorMessage(raw)
  const lower = cleaned.toLowerCase()
  if (/未注册|不存在|no.*account|not.*found|not.*exist|INVALID_USER|USER_NOT_FOUND/i.test(raw)) {
    return '该手机号尚未注册，请先注册账号。'
  }
  if (/验证码|verification|code.*invalid|code.*expire|code.*wrong|INCORRECT_VERIFICATION_CODE|VERIFICATION_CODE_EXPIRED/i.test(lower)) {
    return '验证码错误或已过期，请重新获取。'
  }
  if (/密码|password.*incorrect|password.*wrong|INVALID_PASSWORD|PASSWORD_WRONG/i.test(lower)) {
    return '密码错误，请检查后重试。'
  }
  if (/频率|频率限制|rate|limit|too.*many|REQUEST_LIMITED/i.test(lower)) {
    return '操作过于频繁，请稍后再试。'
  }
  if (/参数|param|invalid/i.test(lower)) {
    return '输入信息有误，请检查手机号和验证码格式。'
  }
  return cleaned || '登录失败，请检查输入后重试。'
}

// 发送手机验证码。
// 本环境（supabase-like）使用 getVerification({ phone_number }) 发送，
// 返回 verification_id，需在下一次 signInWithSms 时回传。旧接口用 sendPhoneCode 兜底。
// 返回 verification_id（旧接口返回空字符串）。
export const sendSmsCode = async (phoneNumber: string): Promise<string> => {
  const auth = await getRawAuth()
  const phone = phoneNumber.trim()
  try {
    if (typeof auth.getVerification === 'function') {
      const res = await auth.getVerification({ phone_number: phone })
      const obj: RecordValue = isRecord(res) ? res : isRecord((res as any)?.data) ? ((res as any).data as RecordValue) : {}
      const verificationId =
        readString(obj.verification_id) || readString(obj.messageId) || readString(obj.ver)
      return verificationId
    }
    // 旧接口兜底
    if (typeof auth.sendPhoneCode === 'function') {
      const result = await auth.sendPhoneCode(phone)
      const err = resultError(result)
      if (err) throw new Error(err)
      return ''
    }
    throw new Error('当前环境不支持短信验证码登录。')
  } catch (e) {
    const msg = extractErrorMessage(e, '验证码发送失败，请稍后重试。')
    console.error('[auth] 发送验证码失败:', e)
    throw new Error(msg)
  }
}

// ─── 注册 ──────────────────────────────────────────────────

// 手机号 + 验证码注册（可选设置密码）。注册成功后自动登录。
// 本环境用 signUp({ phone_number, verification_code, verification_id, password })
// （supabase-like 新接口）；verification_id 来自 getVerification，必须回传才能校验验证码。
export const signUpWithPhone = async (
  phoneNumber: string,
  phoneCode: string,
  password?: string,
  verificationId?: string,
): Promise<void> => {
  const auth = await getRawAuth()
  const phone = phoneNumber.trim()
  const raw = String(phoneCode).trim()
  try {
    if (typeof auth.signUp === 'function') {
      const body: RecordValue = { phone_number: phone, verification_code: raw }
      if (verificationId) body.verification_id = verificationId
      if (password) body.password = password
      const result = await auth.signUp(body)
      const error = resultError(result)
      if (error) throw new Error(error)
      return
    }
    // 旧接口兜底
    if (typeof auth.signUpWithPhoneCode === 'function') {
      const result = await auth.signUpWithPhoneCode(phone, raw, password)
      const error = resultError(result)
      if (error) throw new Error(error)
      return
    }
    throw new Error('当前环境不支持手机号注册。')
  } catch (e) {
    const msg = extractErrorMessage(e, '注册失败，请检查手机号与验证码后重试。')
    console.error('[auth] 手机号注册失败:', e)
    throw new Error(msg)
  }
}

// 邮箱 + 密码注册。
export const signUpWithEmail = async (email: string, password: string) => {
  const result = await (await getAuth()).signUpWithEmailAndPassword(email.trim(), password)
  const error = resultError(result)
  if (error) throw new Error(error)
}

// 绑定用户名到 CloudBase 账号认证（必须在已登录状态下调用）。
// CloudBase 不允许直接用「用户名+密码」注册，必须先以其他方式（手机号）登录后，
// 再调用 updateUsername 把用户名绑到当前账号；之后才能用
// signInWithPassword({ username, password }) 以用户名登录。
// 用户名规则（CloudBase）：长度 1-32；可含字母数字与 - _；不允许纯数字；
// - _ 不能出现在开头或结尾。
export const bindUsername = async (username: string): Promise<void> => {
  const auth = await getRawAuth()
  const uname = username.trim()

  // 1) 占用检查（best-effort，避免绑定失败后才发现）
  try {
    if (typeof auth.isUsernameRegistered === 'function') {
      const taken = await auth.isUsernameRegistered(uname)
      if (taken) throw new Error('该用户名已被占用，请换一个用户名。')
    }
  } catch (e) {
    const msg = extractErrorMessage(e)
    if (/占用|taken|exist/i.test(msg)) throw new Error('该用户名已被占用，请换一个用户名。')
    console.warn('[auth] 用户名占用检查失败，继续尝试绑定：', e)
  }

  // 2) 多策略尝试绑定用户名（兼容不同版本 CloudBase SDK）
  let bound = false
  let lastError: unknown = null

  // 策略 A：auth.updateUserBasicInfo (CloudBase v3 官方提供的方法)
  if (!bound && typeof auth.updateUserBasicInfo === 'function') {
    try {
      const res = await auth.updateUserBasicInfo({ username: uname })
      const err = resultError(res)
      if (!err) bound = true
      else lastError = err
    } catch (e) {
      lastError = e
    }
  }

  // 策略 B：auth.updateUser (带 error/data 的封装)
  if (!bound && typeof auth.updateUser === 'function') {
    try {
      const res = await auth.updateUser({ username: uname })
      const err = resultError(res)
      if (!err) bound = true
      else lastError = err
    } catch (e) {
      lastError = e
    }
  }

  // 策略 C：auth.oauthInstance?.authApi?.updateUserBasicInfo
  if (!bound && auth.oauthInstance?.authApi?.updateUserBasicInfo) {
    try {
      const res = await auth.oauthInstance.authApi.updateUserBasicInfo({ username: uname })
      const err = resultError(res)
      if (!err) bound = true
      else lastError = err
    } catch (e) {
      lastError = e
    }
  }

  // 策略 D：currentUser 实例上的方法（兼容旧环境）
  if (!bound) {
    let currentUser: any = auth.currentUser
    if (!currentUser && typeof auth.getCurrentUser === 'function') {
      try { currentUser = await auth.getCurrentUser() } catch { /* ignore */ }
    }
    if (currentUser) {
      if (typeof currentUser.updateUserBasicInfo === 'function') {
        try {
          const res = await currentUser.updateUserBasicInfo({ username: uname })
          const err = resultError(res)
          if (!err) bound = true
          else lastError = err
        } catch (e) { lastError = e }
      } else if (typeof currentUser.updateUsername === 'function') {
        try {
          const res = await currentUser.updateUsername(uname)
          const err = resultError(res)
          if (!err) bound = true
          else lastError = err
        } catch (e) { lastError = e }
      } else if (typeof currentUser.update === 'function') {
        try {
          const res = await currentUser.update({ username: uname })
          const err = resultError(res)
          if (!err) bound = true
          else lastError = err
        } catch (e) { lastError = e }
      }
    }
  }

  if (!bound) {
    console.warn('[auth] 绑定用户名到认证凭证未成功（SDK当前环境受限），依靠资料库称呼兜底：', lastError)
    if (lastError) {
      const msg = extractErrorMessage(lastError)
      if (/占用|已存在|exist|taken/i.test(msg)) {
        throw new Error('该用户名已被占用，请换一个用户名。')
      }
    }
  }
}

// 检查用户名是否已被占用（注册前预校验，best-effort）。
// 返回 true=已占用；false=可用；null=无法判断（方法不可用，交由 bindUsername 兜底）。
export const isUsernameTaken = async (username: string): Promise<boolean | null> => {
  const auth = await getRawAuth()
  if (typeof auth.isUsernameRegistered !== 'function') return null
  try {
    return Boolean(await auth.isUsernameRegistered(username.trim()))
  } catch {
    return null
  }
}

// ─── 通用 ──────────────────────────────────────────────────

export const signOut = async () => {
  await (await getAuth()).signOut()
}

/**
 * 获取当前有效的 access token，用于 API 请求的 Authorization 头。
 *
 * 本环境（supabase-like CloudBase v3.7+）的 token 来源可能有多种：
 *   1. auth.getAccessToken() —— 官方接口，返回 { accessToken, env }
 *   2. auth.getSession() —— supabase 风格，返回 { session: { access_token } }
 *   3. auth.getLoginState() —— 兜底，返回 { access_token / accessToken / accessKey }
 *
 * 按优先级依次尝试，拿到第一个非空 token 即返回。
 */
export const getAccessToken = async (): Promise<string> => {
  const auth = await getRawAuth()

  // ── 策略 1：官方 getAccessToken ──────────────────────
  try {
    if (typeof auth.getAccessToken === 'function') {
      const result: unknown = await auth.getAccessToken()
      if (typeof result === 'string' && result.trim()) {
        return result.trim()
      }
      if (isRecord(result)) {
        const token =
          readString(result.accessToken) || readString(result.access_token) || readString(result.token)
        if (token) {
          return token
        }
      }
    }
  } catch (err) {
    console.warn('[auth] getAccessToken() 失败:', err)
  }

  // ── 策略 2：supabase 风格 getSession() ───────────────
  try {
    if (typeof auth.getSession === 'function') {
      const session: unknown = await auth.getSession()
      if (typeof session === 'string' && session.trim()) {
        return session.trim()
      }
      if (isRecord(session)) {
        const data = isRecord(session.data) ? session.data : session
        const sess = isRecord(data.session) ? data.session : data
        const token =
          readString(sess.access_token) || readString(sess.accessToken) || readString(sess.token)
        if (token) {
          return token
        }
      }
    }
  } catch (err) {
    console.warn('[auth] getSession() 失败:', err)
  }

  // ── 策略 3：getLoginState() 兜底 ─────────────────────
  try {
    if (typeof auth.getLoginState === 'function') {
      const state: unknown = await auth.getLoginState()
      if (typeof state === 'string' && state.trim()) {
        return state.trim()
      }
      if (isRecord(state)) {
        const token =
          readString(state.access_token) ||
          readString(state.accessToken) ||
          readString(state.accessKey) ||
          readString(state.token) ||
          readString(state.credential)
        if (token) {
          return token
        }
      }
    }
  } catch (err) {
    console.warn('[auth] getLoginState() 失败:', err)
  }

  throw new Error('登录已过期，请重新登录。')
}
