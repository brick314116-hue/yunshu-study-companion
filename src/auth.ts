import type { AuthUser } from './types'

const envId = import.meta.env.VITE_CLOUDBASE_ENV_ID?.trim()
const region = import.meta.env.VITE_CLOUDBASE_REGION?.trim() || 'ap-shanghai'

interface CloudBaseAuth {
  getAccessToken: () => Promise<{ accessToken: string; env: string }>
  getSession: () => Promise<unknown>
  signUp: (credentials: { username: string; password: string }) => Promise<unknown>
  signInWithPassword: (credentials: { username: string; password: string }) => Promise<unknown>
  signOut: () => Promise<unknown>
}

let authPromise: Promise<CloudBaseAuth> | undefined

type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null

const readString = (value: unknown) => typeof value === 'string' ? value : ''

const resultError = (result: unknown) => {
  if (!isRecord(result) || !isRecord(result.error)) return ''
  return readString(result.error.message) || '登录失败，请检查账号和密码。'
}

const sessionData = (result: unknown) => {
  if (!isRecord(result) || !isRecord(result.data)) return null
  const session = isRecord(result.data.session) ? result.data.session : null
  const user = isRecord(result.data.user) ? result.data.user : null
  if (!session || !user) return null

  const loginType = readString(session.loginType || session.login_type).toUpperCase()
  if (loginType === 'ANONYMOUS') return null
  return { session, user }
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

const requireAuth = async () => {
  if (!envId) throw new Error('CloudBase 尚未配置，请先填写部署环境变量。')
  authPromise ??= import('@cloudbase/js-sdk').then(({ default: cloudbase }) =>
    cloudbase.init({ env: envId, region }).auth() as unknown as CloudBaseAuth,
  )
  return authPromise
}

export const authConfigured = Boolean(envId)

export const restoreAuth = async (): Promise<AuthUser | null> => {
  if (!envId) return null
  const result = await (await requireAuth()).getSession()
  const error = resultError(result)
  if (error) throw new Error(error)
  const current = sessionData(result)
  return current ? toAuthUser(current.user) : null
}

export const signIn = async (username: string, password: string): Promise<AuthUser> => {
  const result = await (await requireAuth()).signInWithPassword({ username, password })
  const error = resultError(result)
  if (error) throw new Error(error)
  const current = sessionData(result)
  if (!current) throw new Error('登录未完成，请重试。')
  return toAuthUser(current.user)
}

export const signUp = async (username: string, password: string): Promise<AuthUser> => {
  const result = await (await requireAuth()).signUp({ username, password })
  const error = resultError(result)
  if (error) throw new Error(error)
  const current = sessionData(result)
  if (!current) throw new Error('注册成功，请使用新账号登录。')
  return toAuthUser(current.user)
}

export const signOut = async () => {
  await (await requireAuth()).signOut()
}

export const getAccessToken = async () => {
  const { accessToken } = await (await requireAuth()).getAccessToken()
  if (!accessToken) throw new Error('登录已过期，请重新登录。')
  return accessToken
}
