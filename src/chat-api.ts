import { getAccessToken } from './auth'
import type { ChatAttachment } from './types'

const configuredEndpoint = import.meta.env.VITE_CHAT_API_URL?.trim()
const endpoint =
  configuredEndpoint ||
  'https://xueou-d7gwem7g2452a7ea3-1462770697.ap-shanghai.app.tcloudbase.com/nuwax/api/chat'

type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null

const readString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const replyFromJson = (value: unknown): string => {
  if (!isRecord(value)) return ''
  const direct = readString(value.reply || value.outputText)
  if (direct) return direct

  if (typeof value.body === 'string') {
    try {
      return replyFromJson(JSON.parse(value.body))
    } catch {
      return ''
    }
  }
  return isRecord(value.data) ? replyFromJson(value.data) : ''
}

const responseError = async (response: Response) => {
  let message = ''
  try {
    const body = (await response.clone().json()) as unknown
    if (isRecord(body)) message = readString(body.error || body.message)
  } catch {
    // The status-specific message below is safer than returning an HTML error page.
  }

  if (response.status === 401 || response.status === 403) {
    return '登录状态已失效，请重新登录后再试。'
  }
  if (response.status === 404) return '对话接口尚未部署，请检查 CloudBase 的 /api/chat 路由。'
  return message || '暂时没有连接上云小舒，请稍后重试。'
}

export type ChatAction = 'mood-checkin'

export interface ChatResponse {
  reply: string
  action?: ChatAction
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })

/** 上传单个附件到云函数代理（再转存女娲），返回附件引用。 */
export const uploadAttachment = async (file: File): Promise<ChatAttachment> => {
  const accessToken = await getAccessToken()
  const base64 = await fileToBase64(file)
  const response = await fetch(`${endpoint}?resource=upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: file.name, type: file.type, base64 }),
  })
  if (!response.ok) {
    let message = ''
    try {
      const data = (await response.json()) as Record<string, unknown>
      message = typeof data.error === 'string' ? data.error : ''
    } catch {
      /* ignore */
    }
    throw new Error(message || `上传「${file.name}」失败`)
  }
  const body = (await response.json()) as Record<string, unknown>
  const d = (isRecord(body.data) ? body.data : body) as Record<string, unknown>
  return {
    fileKey: readString(d.key),
    url: readString(d.url) || undefined,
    fileName: readString(d.fileName) || file.name,
    mimeType: readString(d.mimeType) || file.type,
  }
}

export const requestChat = async (
  message: string,
  newConversation: boolean,
  conversationKey?: string,
  attachments?: ChatAttachment[],
): Promise<ChatResponse> => {
  if (!endpoint) throw new Error('对话接口尚未配置。')

  const accessToken = await getAccessToken()

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      agent: 'main',
      newConversation,
      // 本地会话 id：服务端以此把每个本地会话映射到独立女娲会话。
      ...(conversationKey ? { conversationKey } : {}),
      ...(attachments && attachments.length ? { attachments } : {}),
    }),
  })

  if (response.redirected || response.headers.get('content-type')?.includes('text/html')) {
    throw new Error('登录状态已失效，请退出后重新登录。')
  }

  if (!response.ok) throw new Error(await responseError(response))

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new Error('对话接口返回格式异常，请检查云函数部署。')
  }
  const reply = replyFromJson(body)
  if (!reply) throw new Error('智能体没有返回可显示的内容，请重新发送。')
  const action = isRecord(body) && readString(body.action) === 'mood-checkin' ? 'mood-checkin' : undefined
  return action ? { reply, action } : { reply }
}
