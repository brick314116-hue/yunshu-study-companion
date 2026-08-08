import { getAccessToken } from './auth'

const configuredEndpoint = import.meta.env.VITE_CHAT_API_URL?.trim()
const endpoint = configuredEndpoint ||
  'https://xueou-d7gwem7g2452a7ea3-1462770697.ap-shanghai.app.tcloudbase.com/nuwax/api/chat'

let sessionToken = ''

export const resetChatSession = () => {
  sessionToken = ''
}

type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null

const readString = (value: unknown) => typeof value === 'string' ? value.trim() : ''

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
    const body = await response.clone().json() as unknown
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

export const requestChat = async (message: string, newConversation: boolean) => {
  if (!endpoint) throw new Error('对话接口尚未配置。')
  if (newConversation) sessionToken = ''
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
      sessionToken: sessionToken || undefined,
    }),
  })

  if (!response.ok) throw new Error(await responseError(response))

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new Error('对话接口返回格式异常，请检查云函数部署。')
  }
  const reply = replyFromJson(body)
  if (!reply) throw new Error('智能体没有返回可显示的内容，请重新发送。')
  if (isRecord(body) && typeof body.sessionToken === 'string') sessionToken = body.sessionToken
  return reply
}
