import type { PsychConsent } from './types'
import { getAccessToken } from './auth'

export type GuardianConsent = 'not_required' | 'pending' | 'confirmed' | 'rejected'

/** 当前使用边界协议版本。变更此值会让已确认过的用户重新看到弹窗。 */
export const CONSENT_VERSION = '2026-08-v1'

export interface UserProfile {
  displayName: string
  consentChoice: Exclude<PsychConsent, 'unknown'> | ''
  consentVersion: string
  consentAt: string | null
  guardianConsentStatus: GuardianConsent
}

// 用户资料读写统一走云函数（admin 身份），绕开前端文档库安全规则的身份传播问题：
// 本项目用 supabase-like 登录态，无法为 app.database() 建立可用的写会话，导致 owner-only
// 规则（auth.uid == doc.userId）在前端直连时返回 403。云函数以管理员身份操作，不受该规则限制。
const configuredEndpoint = import.meta.env.VITE_CHAT_API_URL?.trim()
const PROFILE_ENDPOINT = configuredEndpoint
  ? `${configuredEndpoint}?resource=profile`
  : 'https://xueou-d7gwem7g2452a7ea3-1462770697.ap-shanghai.app.tcloudbase.com/nuwax/api/chat?resource=profile'

const MAX_DISPLAY_NAME = 32

// 只允许中文、字母、数字、空格与少量安全标点；长度上限 32。
export function sanitizeDisplayName(raw: string): string {
  const trimmed = (raw || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_DISPLAY_NAME)
  return trimmed.replace(/[^\p{L}\p{N} _·•\-]/gu, '')
}

async function callProfile(method: 'GET' | 'POST', body?: Record<string, unknown>): Promise<Record<string, unknown>> {
  const token = await getAccessToken()
  const response = await fetch(PROFILE_ENDPOINT, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (response.redirected || response.headers.get('content-type')?.includes('text/html')) {
    throw new Error('登录状态已失效，请退出后重新登录。')
  }
  if (!response.ok) {
    let message = ''
    try {
      const data = (await response.json()) as Record<string, unknown>
      message = typeof data.error === 'string' ? data.error : ''
    } catch {
      /* ignore */
    }
    if (message) throw new Error(message)
    if (response.status === 401) {
      throw new Error('登录状态已失效，请重新登录后再试。')
    }
    if (response.status === 403) {
      throw new Error('请求来源被拦截（403），请检查云函数 ALLOWED_ORIGINS 配置。')
    }
    throw new Error(`用户资料接口失败（${response.status}）`)
  }
  return (await response.json()) as Record<string, unknown>
}

/**
 * 读取当前登录用户的资料。uid 由云函数从 access token 解析（网关 EnableAuth 注入上下文，
 * 失败则直接解 JWT），前端无需、也不应传入 uid（避免客户端伪造身份）。
 */
export async function loadUserProfile(_uid: string): Promise<UserProfile | null> {
  try {
    const data = await callProfile('GET')
    return {
      displayName: typeof data.displayName === 'string' ? data.displayName : '',
      consentChoice: data.consentChoice === 'accepted' || data.consentChoice === 'declined' ? data.consentChoice : '',
      consentVersion: typeof data.consentVersion === 'string' ? data.consentVersion : '',
      consentAt: data.consentAt ? String(data.consentAt) : null,
      guardianConsentStatus:
        (typeof data.guardianConsentStatus === 'string' ? data.guardianConsentStatus : 'not_required') as GuardianConsent,
    }
  } catch (error) {
    console.warn('读取用户资料失败：', error)
    return null
  }
}

/** 将用户的使用边界选择持久化到 user_profiles（经云函数 admin 写入）。 */
export async function saveConsent(
  _uid: string,
  choice: Exclude<PsychConsent, 'unknown'>,
): Promise<void> {
  await callProfile('POST', {
    consentChoice: choice,
    consentVersion: CONSENT_VERSION,
  })
}

/** 写入/更新当前用户的昵称（经云函数 admin 写入）。 */
export async function saveDisplayName(_uid: string, displayName: string): Promise<void> {
  await callProfile('POST', { displayName: sanitizeDisplayName(displayName) })
}

/** 根据已保存的用户资料推断 consent 状态。版本不匹配时返回 unknown（触发重新弹窗）。 */
export function restoreConsent(profile: UserProfile | null): PsychConsent {
  if (!profile?.consentAt) return 'unknown'
  if (profile.consentVersion !== CONSENT_VERSION) return 'unknown'
  // choice 缺失说明历史数据不完整，宁可重弹一次确认，也不能默认当作已同意。
  return profile.consentChoice === 'accepted' || profile.consentChoice === 'declined'
    ? profile.consentChoice
    : 'unknown'
}
