const { createHmac, randomUUID, timingSafeEqual } = require('node:crypto')
const http = require('node:http')

const PORT = 9000
const MAX_BODY_BYTES = 8 * 1024
const MAX_MESSAGE_LENGTH = 500
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const REQUEST_TIMEOUT_MS = 55 * 1000
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 30
const MODULE_IDS = new Set(['chat', 'study', 'thought', 'emotion', 'growth'])
const requestCounts = new Map()

function sendJson(res, status, body, origin = '') {
  res.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(body))
}

function isAllowedOrigin(req) {
  const origin = req.headers.origin
  const allowedOrigin = process.env.ALLOWED_ORIGIN || String(process.env.ALLOWED_ORIGINS || '').split(',')[0]?.trim()

  if (!origin) return ''
  return allowedOrigin && origin === allowedOrigin ? origin : null
}

function isRateLimited(req) {
  const forwarded = req.headers['x-forwarded-for']
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0])
    ?.trim() || req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  if (requestCounts.size > 10000) {
    for (const [key, value] of requestCounts) {
      if (value.resetAt <= now) requestCounts.delete(key)
    }
    if (requestCounts.size > 10000) requestCounts.clear()
  }
  const current = requestCounts.get(ip)

  if (!current || current.resetAt <= now) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  current.count += 1
  return current.count > RATE_LIMIT_MAX
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const declaredLength = Number(req.headers['content-length'] || 0)
    if (declaredLength > MAX_BODY_BYTES) {
      reject(Object.assign(new Error('request_too_large'), { status: 413 }))
      req.resume()
      return
    }

    const chunks = []
    let size = 0
    let tooLarge = false

    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        tooLarge = true
        return
      }
      chunks.push(chunk)
    })

    req.on('end', () => {
      if (tooLarge) {
        reject(Object.assign(new Error('request_too_large'), { status: 413 }))
        return
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
      } catch {
        reject(Object.assign(new Error('invalid_json'), { status: 400 }))
      }
    })

    req.on('error', reject)
  })
}

function getConfig() {
  const baseUrl = process.env.NUWAX_BASE_URL?.replace(/\/$/, '')
  const apiKey = process.env.NUWAX_API_KEY
  const agentId = Number(process.env.NUWAX_AGENT_ID || process.env.NUWAX_MAIN_AGENT_ID)
  const sessionSecret = process.env.SESSION_SECRET || process.env.USER_ID_SECRET
  const allowedOrigin = process.env.ALLOWED_ORIGIN || process.env.ALLOWED_ORIGINS

  if (!baseUrl || !apiKey || !Number.isSafeInteger(agentId) || agentId <= 0 || !sessionSecret || !allowedOrigin) {
    throw Object.assign(new Error('service_not_configured'), { status: 503 })
  }
  if (sessionSecret.length < 32) {
    throw Object.assign(new Error('invalid_session_secret'), { status: 503 })
  }

  return {
    baseUrl,
    authorization: apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`,
    agentId,
    sessionSecret,
  }
}

function parseAgentStream(raw) {
  let finalText = ''
  const messages = []
  for (const block of raw.split(/\r?\n\r?\n/)) {
    const data = block.split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart()).join('\n')
    if (!data || data === '[DONE]') continue
    let event
    try { event = JSON.parse(data) } catch { continue }
    if (event?.eventType === 'ERROR') throw new Error(event.error || 'Nuwax error')
    if (event?.eventType === 'FINAL_RESULT') {
      finalText = String(event.data?.outputText || '').trim() || finalText
      continue
    }
    const item = event?.eventType === 'MESSAGE' ? event.data || {} : null
    if (String(item?.role || '').toUpperCase() !== 'ASSISTANT' || String(item?.type || '').toUpperCase() === 'THINK') continue
    const text = String(item?.text || '').trim()
    if (text) messages.push(text)
  }
  return finalText || messages.join('')
}

function signSession(session, secret) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  const signature = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

function verifySession(token, secret) {
  const [payload, signature, extra] = String(token || '').split('.')
  if (!payload || !signature || extra) return null

  const expected = createHmac('sha256', secret).update(payload).digest()
  let received
  try {
    received = Buffer.from(signature, 'base64url')
  } catch {
    return null
  }

  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (
      !Number.isSafeInteger(session.conversationId) ||
      session.conversationId <= 0 ||
      typeof session.webUserId !== 'string' ||
      session.webUserId.length > 64 ||
      !Number.isFinite(session.expiresAt) ||
      session.expiresAt <= Date.now()
    ) return null
    return session
  } catch {
    return null
  }
}

async function createConversation(config, growthEnabled) {
  const webUserId = randomUUID()
  const response = await fetch(`${config.baseUrl}/api/v1/chat/conversation/add`, {
    method: 'POST',
    headers: {
      Authorization: config.authorization,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agentId: config.agentId,
      variables: {
        web_user_id: webUserId,
        growth_enabled: growthEnabled,
        consent_version: 'v1',
      },
      devMode: false,
    }),
  })
  const result = await response.json().catch(() => null)

  if (!response.ok || !result?.success || !Number.isSafeInteger(Number(result.data)) || Number(result.data) <= 0) {
    throw Object.assign(new Error('conversation_create_failed'), { status: 502 })
  }

  return {
    conversationId: Number(result.data),
    webUserId,
    expiresAt: Date.now() + SESSION_TTL_MS,
  }
}

async function handleChat(req, res, origin) {
  if (isRateLimited(req)) {
    sendJson(res, 429, { error: '请求过于频繁，请稍后再试。' }, origin)
    return
  }

  const body = await readJson(req)
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const moduleId = MODULE_IDS.has(body.moduleId) ? body.moduleId : 'chat'
  const growthEnabled = body.growthEnabled === true

  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    sendJson(res, 400, { error: `消息不能为空，且不能超过${MAX_MESSAGE_LENGTH}字。` }, origin)
    return
  }

  const config = getConfig()
  const suppliedToken = typeof body.sessionToken === 'string' ? body.sessionToken : ''
  let session = body.newConversation === true
    ? null
    : suppliedToken ? verifySession(suppliedToken, config.sessionSecret) : null

  if (suppliedToken && !session) {
    sendJson(res, 401, { error: '会话已失效，请新建对话。' }, origin)
    return
  }

  if (!session) session = await createConversation(config, growthEnabled)
  const sessionToken = signSession(session, config.sessionSecret)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  res.once('close', () => controller.abort())

  let upstream
  try {
    upstream = await fetch(`${config.baseUrl}/api/v1/chat/${session.conversationId}`, {
      method: 'POST',
      headers: {
        Authorization: config.authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: session.conversationId,
        message,
        attachments: [],
        debug: false,
        selectedComponents: [],
        variableParams: {
          web_user_id: session.webUserId,
          active_module: moduleId,
          growth_enabled: growthEnabled,
        },
        filterSensitive: true,
      }),
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timeout)
    if (!res.headersSent) {
      sendJson(res, error?.name === 'AbortError' ? 504 : 502, {
        error: error?.name === 'AbortError' ? '智能体响应超时，请稍后重试。' : '暂时无法连接智能体。',
      }, origin)
    }
    return
  }

  if (!upstream.ok || !upstream.body) {
    clearTimeout(timeout)
    sendJson(res, 502, { error: '智能体暂时无法回复。' }, origin)
    return
  }

  const reply = parseAgentStream(await upstream.text())
  clearTimeout(timeout)
  if (!reply) {
    sendJson(res, 502, { error: '智能体没有返回可显示的内容。' }, origin)
    return
  }
  sendJson(res, 200, { reply, sessionToken }, origin)
}

const server = http.createServer(async (req, res) => {
  const origin = isAllowedOrigin(req)
  if (origin === null) {
    sendJson(res, 403, { error: '不允许的请求来源。' })
    return
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const pathname = new URL(req.url, 'http://localhost').pathname
  if (req.method === 'GET' && (pathname === '/' || pathname === '/health')) {
    sendJson(res, 200, { status: 'ok' }, origin)
    return
  }

  if (req.method === 'POST' && pathname === '/api/chat') {
    try {
      await handleChat(req, res, origin)
    } catch (error) {
      if (!res.headersSent) {
        sendJson(res, error?.status || 500, {
          error: error?.status === 503 ? '服务尚未配置完成。' : '请求处理失败。',
        }, origin)
      }
    }
    return
  }

  sendJson(res, 404, { error: '接口不存在。' }, origin)
})

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`nuwax-chat-proxy listening on port ${PORT}`)
  })
}

module.exports = { server, _test: { parseAgentStream } }
