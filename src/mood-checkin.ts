import { getAccessToken } from './auth'

/** 表单情绪打卡的可选情绪（与情绪抽取工作流的枚举保持一致）。 */
export const MOOD_OPTIONS = [
  '焦虑', '低落', '挫败', '愤怒', '恐惧',
  '孤独', '疲惫', '平静', '积极',
] as const

export interface MoodCheckinInput {
  emotionName: string
  intensity: number
  triggerSummary?: string
}

export interface MoodCheckinResult {
  success: boolean
  recordId: string | null
}

const configuredEndpoint = import.meta.env.VITE_CHAT_API_URL?.trim()
const CHECKIN_ENDPOINT = configuredEndpoint
  ? `${configuredEndpoint}?resource=mood-checkin`
  : 'https://xueou-d7gwem7g2452a7ea3-1462770697.ap-shanghai.app.tcloudbase.com/nuwax/api/chat?resource=mood-checkin'

/**
 * 提交情绪打卡表单。consent 校验与输入合法性都在云函数侧完成，
 * 前端只负责收集与展示，不传 uid / subject_id（服务端自行推导）。
 */
export async function submitMoodCheckin(input: MoodCheckinInput): Promise<MoodCheckinResult> {
  const token = await getAccessToken()
  const response = await fetch(CHECKIN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      emotionName: input.emotionName.trim().slice(0, 32),
      intensity: input.intensity,
      triggerSummary: (input.triggerSummary || '').trim().slice(0, 80),
      // 服务端文档库读取不可靠时的同意声明兜底（前端仅在已同意时打开打卡）。
      consent: 'accepted',
    }),
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
    if (response.status === 401 || response.status === 403) {
      // 403 主要是未同意使用边界，保留服务端文案。
      if (response.status === 401) throw new Error('登录状态已失效，请重新登录后再试。')
    }
    throw new Error(message || `情绪打卡提交失败（${response.status}）`)
  }
  const data = (await response.json()) as Record<string, unknown>
  return {
    success: data.success === true,
    recordId: typeof data.recordId === 'string' ? data.recordId : null,
  }
}
