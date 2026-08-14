const { createHmac, randomUUID } = require('node:crypto')
const http = require('node:http')

const PORT = 9000
const MAX_BODY_BYTES = 8 * 1024
const MAX_MESSAGE_LENGTH = 500
const configuredTimeoutMs = Number(process.env.NUWAX_REQUEST_TIMEOUT_MS)
const REQUEST_TIMEOUT_MS = Number.isFinite(configuredTimeoutMs)
  ? Math.min(Math.max(configuredTimeoutMs, 30 * 1000), 240 * 1000)
  : 180 * 1000
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 30
const AGENT_KEY = 'main'
const BUILD_VERSION = '2026-08-14-upstream-timeout-sandbox'
const DEFAULT_DATABASE_INSTANCE = 'tnt-nsoau01qw'
const requestCounts = new Map()
let databaseFactory

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(body))
}

function allowedOrigins() {
  return String(process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function requestOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return ''
  return allowedOrigins().includes(origin) ? origin : null
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
  const agentId = Number(process.env.NUWAX_MAIN_AGENT_ID || process.env.NUWAX_AGENT_ID)
  const userIdSecret = process.env.USER_ID_SECRET
  const sandboxId = Number(process.env.NUWAX_SANDBOX_ID)
  const skillIds = String(process.env.NUWAX_SKILL_IDS || '')
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isSafeInteger(value) && value > 0)
  const agentMode = String(process.env.NUWAX_AGENT_MODE || 'yolo').trim().slice(0, 32)
  const database = getDatabaseConfig()
  const origins = allowedOrigins()

  if (!baseUrl || !apiKey || !Number.isSafeInteger(agentId) || agentId <= 0 ||
      !userIdSecret || userIdSecret.length < 32 || !origins.length || origins.includes('*')) {
    throw Object.assign(new Error('service_not_configured'), { status: 503 })
  }

  return {
    baseUrl,
    authorization: apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`,
    agentId,
    sandboxId: Number.isSafeInteger(sandboxId) && sandboxId > 0 ? sandboxId : undefined,
    skillIds,
    agentMode,
    ...database,
    userIdSecret,
  }
}

function getDatabaseConfig() {
  const envId = process.env.CLOUDBASE_ENV_ID || process.env.TCB_ENV
  if (!envId) throw Object.assign(new Error('service_not_configured'), { status: 503 })
  return {
    envId,
    instance: process.env.CLOUDBASE_DATABASE_INSTANCE || DEFAULT_DATABASE_INSTANCE,
    database: process.env.CLOUDBASE_DATABASE_NAME || undefined,
  }
}

function bearerToken(req) {
  const value = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization
  return typeof value === 'string' && /^Bearer\s+\S+$/.test(value) ? value.slice(7).trim() : ''
}

function requestId(req) {
  const value = Array.isArray(req.headers['x-cloudbase-request-id'])
    ? req.headers['x-cloudbase-request-id'][0]
    : req.headers['x-cloudbase-request-id']
  return typeof value === 'string' && /^[\w-]{1,128}$/.test(value) ? value : randomUUID()
}

function safeErrorCode(error) {
  const data = error?.response?.data
  return String(error?.code || data?.code || error?.name || error?.status || 'unknown').slice(0, 80)
}

function errorDiagnostic(error) {
  const data = error?.response?.data
  return {
    code: safeErrorCode(error),
    message: String(data?.message || error?.message || '')
      .replace(/https?:\/\/\S+/g, '[url]')
      .replace(/[\r\n]+/g, ' ')
      .slice(0, 300),
    sdkRequestId: String(data?.requestId || error?.requestId || error?.request_id || '').slice(0, 128),
  }
}

function logError(scope, id, error) {
  const diagnostic = errorDiagnostic(error)
  console.error(`[xinyu-chat ${id}] ${scope} code=${diagnostic.code} message=${diagnostic.message} sdkRequestId=${diagnostic.sdkRequestId}`)
}

function decodeContext(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  const raw = value.trim()
  try {
    return JSON.parse(raw)
  } catch {
    try {
      return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
    } catch {
      return null
    }
  }
}

function uidFromJwt(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const payload = decodeContext(parts[1])
  if (!payload || typeof payload !== 'object') return null
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp !== undefined && (!Number.isFinite(Number(payload.exp)) || Number(payload.exp) <= now)) return null
  if (payload.nbf !== undefined && (!Number.isFinite(Number(payload.nbf)) || Number(payload.nbf) > now)) return null
  const candidates = [
    payload.uid,
    payload.sub,
    payload.user_id,
    payload.openid,
    payload.unionid,
    payload.id,
    payload.user?.uid,
    payload.user?.id,
  ]
  for (const value of candidates) {
    if (typeof value === 'string' && /^[\w-]{1,128}$/.test(value)) return value
  }
  return null
}

function authenticatedUserId(req) {
  const token = bearerToken(req)
  if (!token) throw Object.assign(new Error('unauthorized'), { status: 401 })

  // 1. Try the gateway-injected context first.
  const header = Array.isArray(req.headers['x-cloudbase-context'])
    ? req.headers['x-cloudbase-context'][0]
    : req.headers['x-cloudbase-context']
  const context = decodeContext(header)
  let uid = context?.uid || context?.user?.uid

  // 2. Fall back to parsing the JWT payload directly.
  if (typeof uid !== 'string' || !/^[\w-]{1,128}$/.test(uid)) {
    uid = uidFromJwt(token)
  }

  if (typeof uid !== 'string' || !/^[\w-]{1,128}$/.test(uid)) {
    throw Object.assign(new Error('unauthorized'), { status: 401 })
  }
  return uid
}

function subjectId(uid, secret) {
  return createHmac('sha256', secret).update(uid).digest('hex')
}

function sessionDocumentId(uid, secret) {
  return createHmac('sha256', secret).update(`${uid}:${AGENT_KEY}`).digest('hex')
}

function cloudbaseDatabase(config) {
  if (databaseFactory) return databaseFactory(config)
  const cloudbase = require('@cloudbase/js-sdk')
  const app = cloudbase.init({ env: config.envId, region: process.env.CLOUDBASE_REGION || 'ap-shanghai' })
  return app.database({ instance: config.instance, database: config.database })
}

function sanitizeDisplayName(value) {
  return typeof value === 'string'
    ? value.replace(/\s+/g, ' ').trim().slice(0, 32).replace(/[^\p{L}\p{N} _·•\-]/gu, '')
    : ''
}

async function readProfile(db, uid) {
  const result = await db.collection('user_profiles').where({ userId: uid }).limit(1).get()
  const profile = result?.data?.[0] || {}
  return {
    documentId: typeof profile._id === 'string' ? profile._id : '',
    displayName: sanitizeDisplayName(profile.displayName),
    consentChoice: profile.consentChoice === 'accepted' || profile.consentChoice === 'declined' ? profile.consentChoice : '',
    consentVersion: typeof profile.consentVersion === 'string' ? profile.consentVersion : '',
    consentAt: profile.consentAt || null,
    guardianConsentStatus: typeof profile.guardianConsentStatus === 'string' ? profile.guardianConsentStatus : 'not_required',
    createdAt: profile.createdAt || null,
  }
}

async function handleProfile(req, res) {
  const uid = authenticatedUserId(req)
  const db = cloudbaseDatabase(getDatabaseConfig())
  const current = await readProfile(db, uid)
  if (req.method === 'GET') {
    sendJson(res, 200, {
      displayName: current.displayName,
      consentChoice: current.consentChoice,
      consentVersion: current.consentVersion,
      consentAt: current.consentAt,
      guardianConsentStatus: current.guardianConsentStatus,
    })
    return
  }

  const body = await readJson(req)
  const now = new Date()
  const next = {
    userId: uid,
    displayName: body.displayName === undefined ? current.displayName : sanitizeDisplayName(body.displayName),
    consentChoice: current.consentChoice,
    consentVersion: current.consentVersion,
    consentAt: current.consentAt,
    guardianConsentStatus: current.guardianConsentStatus,
    createdAt: current.createdAt || now,
    updatedAt: now,
  }
  if (body.consentChoice !== undefined) {
    if ((body.consentChoice !== 'accepted' && body.consentChoice !== 'declined') || typeof body.consentVersion !== 'string') {
      sendJson(res, 400, { error: '使用边界选择无效。' })
      return
    }
    next.consentChoice = body.consentChoice
    next.consentVersion = body.consentVersion.slice(0, 64)
    next.consentAt = now
  }
  const document = db.collection('user_profiles').doc(current.documentId || uid)
  if (current.documentId) await document.update(next)
  else await document.set(next)
  sendJson(res, 200, next)
}

async function readSession(db, uid, config) {
  const result = await db.collection('agent_sessions').doc(sessionDocumentId(uid, config.userIdSecret)).get()
  const session = result?.data?.[0] || result?.data
  return Number.isSafeInteger(Number(session?.conversationId)) && Number(session.conversationId) > 0
    ? { conversationId: Number(session.conversationId) }
    : null
}

async function saveSession(db, uid, config, conversationId) {
  await db.collection('agent_sessions').doc(sessionDocumentId(uid, config.userIdSecret)).set({
    userId: uid,
    agentKey: AGENT_KEY,
    conversationId,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

async function createConversation(config, profile, subject) {
  const response = await fetch(`${config.baseUrl}/api/v1/chat/conversation/add`, {
    method: 'POST',
    headers: {
      Authorization: config.authorization,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agentId: config.agentId,
      variables: {
        subject_id: subject,
        display_name: profile.displayName,
        consent_version: profile.consentVersion,
      },
      devMode: false,
    }),
  })
  const result = await response.json().catch(() => null)
  if (!response.ok || !result?.success || !Number.isSafeInteger(Number(result.data)) || Number(result.data) <= 0) {
    throw Object.assign(new Error('conversation_create_failed'), { status: 502 })
  }
  return Number(result.data)
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
    if (event?.eventType === 'ERROR') {
      const detail = String(event.data?.message || event.data?.error || event.message || JSON.stringify(event.data || ''))
      throw Object.assign(new Error(
        /ACP InitializeRequest timeout/i.test(detail) ? 'agent_initialize_timeout' : 'nuwax_upstream_error',
      ), {
        status: 502,
        publicMessage: /ACP InitializeRequest timeout/i.test(detail)
          ? '智能体服务启动超时，请稍后重试。'
          : '智能体服务暂时异常，请稍后重试。',
      })
    }
    if (event?.eventType === 'FINAL_RESULT') {
      finalText = String(event.data?.outputText || '').trim() || finalText
      continue
    }
    const item = event?.eventType === 'MESSAGE' ? event.data || {} : null
    if (String(item?.role || '').toUpperCase() !== 'ASSISTANT' || String(item?.type || '').toUpperCase() === 'THINK') continue
    const text = String(item?.text || '').trim()
    if (text) messages.push(text)
  }
  const reply = finalText || messages.join('')
  if (/Failed to process request:\s*Agent process failed|ACP InitializeRequest timeout/i.test(reply)) {
    throw Object.assign(new Error('agent_initialize_timeout'), {
      status: 502,
      publicMessage: '智能体服务启动超时，请稍后重试。',
    })
  }
  return reply
}

async function handleChat(req, res) {
  if (isRateLimited(req)) {
    sendJson(res, 429, { error: '请求过于频繁，请稍后再试。' })
    return
  }

  const uid = authenticatedUserId(req)
  const config = getConfig()
  const body = await readJson(req)
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    sendJson(res, 400, { error: `消息不能为空，且不能超过${MAX_MESSAGE_LENGTH}字。` })
    return
  }
  if (body.agent !== undefined && body.agent !== AGENT_KEY) {
    sendJson(res, 400, { error: '不支持的智能体。' })
    return
  }

  const db = cloudbaseDatabase(config)
  const profile = await readProfile(db, uid)
  const subject = subjectId(uid, config.userIdSecret)
  let session = body.newConversation === true ? null : await readSession(db, uid, config)
  if (!session) {
    session = { conversationId: await createConversation(config, profile, subject) }
    await saveSession(db, uid, config, session.conversationId)
  }

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
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        conversationId: session.conversationId,
        message,
        attachments: [],
        debug: false,
        variableParams: {
          subject_id: subject,
          display_name: profile.displayName,
          consent_version: profile.consentVersion,
        },
        filterSensitive: true,
        agentMode: config.agentMode,
        ...(config.sandboxId ? { sandboxId: config.sandboxId } : {}),
        ...(config.skillIds.length ? { skillIds: config.skillIds } : {}),
      }),
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timeout)
    logError('upstream', requestId(req), error)
    sendJson(res, error?.name === 'AbortError' ? 504 : 502, {
      error: error?.name === 'AbortError' ? '智能体响应超时，请稍后重试。' : '暂时无法连接智能体。',
    })
    return
  }

  if (!upstream.ok || !upstream.body) {
    clearTimeout(timeout)
    logError('upstream-http', requestId(req), Object.assign(new Error(`status=${upstream.status}`), {
      code: `HTTP_${upstream.status}`,
    }))
    sendJson(res, 502, { error: '智能体暂时无法回复。' })
    return
  }
  let raw
  try {
    raw = await upstream.text()
  } catch (error) {
    clearTimeout(timeout)
    logError('upstream-stream', requestId(req), error)
    sendJson(res, error?.name === 'AbortError' ? 504 : 502, {
      error: error?.name === 'AbortError' ? '智能体响应超时，请稍后重试。' : '智能体响应读取失败，请稍后重试。',
    })
    return
  }
  clearTimeout(timeout)
  const reply = parseAgentStream(raw)
  if (!reply) {
    sendJson(res, 502, { error: '智能体没有返回可显示的内容。' })
    return
  }
  await db.collection('agent_sessions').doc(sessionDocumentId(uid, config.userIdSecret)).update({ updatedAt: new Date() })
  sendJson(res, 200, { reply })
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, 'http://localhost')
  const rawPathname = requestUrl.pathname
  // The HTTP gateway strips the matched prefix when EnablePathTransmission=false,
  // so a request to /nuwax/api/chat reaches the function as /. We still normalize
  // /nuwax/api/chat in case the flag is ever switched to true.
  const pathname = rawPathname.startsWith('/nuwax') ? (rawPathname.slice('/nuwax'.length) || '/') : rawPathname
  const origin = requestOrigin(req)
  if ((pathname === '/' || pathname.startsWith('/api/')) && origin === null) {
    sendJson(res, 403, { error: '不允许的请求来源。' })
    return
  }
  if (req.method === 'OPTIONS') {
    if (!origin) {
      sendJson(res, 403, { error: '不允许的请求来源。' })
      return
    }
    res.writeHead(204, { 'Cache-Control': 'no-store' })
    res.end()
    return
  }
  const isChatPath = pathname === '/' || pathname === '/api/chat' || pathname === '/nuwax/api/chat'
  const isProfileRequest = isChatPath && requestUrl.searchParams.get('resource') === 'profile'
  if ((req.method === 'GET' || req.method === 'POST') && isProfileRequest) {
    try {
      await handleProfile(req, res)
    } catch (error) {
      const id = requestId(req)
      logError('profile', id, error)
      if (!res.headersSent) {
        sendJson(res, error?.status || 500, {
          error: error?.status === 401 ? '登录状态无效，请重新登录。' : '用户资料处理失败。',
          requestId: id,
        })
      }
    }
    return
  }
  if (req.method === 'GET' && (pathname === '/' || pathname === '/health')) {
    const database = getDatabaseConfig()
    sendJson(res, 200, {
      status: 'ok',
      version: BUILD_VERSION,
      envId: database.envId,
      databaseInstance: database.instance,
      databaseName: database.database || 'default',
      upstreamTimeoutMs: REQUEST_TIMEOUT_MS,
      sandboxConfigured: Boolean(Number(process.env.NUWAX_SANDBOX_ID) > 0),
    })
    return
  }
  if (req.method === 'POST' && isChatPath) {
    try {
      await handleChat(req, res)
    } catch (error) {
      const id = requestId(req)
      logError('request', id, error)
      if (!res.headersSent) {
        sendJson(res, error?.status || 500, {
          error: error?.publicMessage || (error?.status === 401 ? '登录状态无效，请重新登录。' :
            error?.status === 503 ? '服务尚未配置完成。' : '请求处理失败。'),
          requestId: id,
        })
      }
    }
    return
  }
  sendJson(res, 404, { error: '接口不存在。' })
})

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`nuwax-chat-proxy listening on port ${PORT}`)
  })
}

module.exports = {
  server,
  _test: {
    parseAgentStream,
    setDatabaseFactory: (factory) => { databaseFactory = factory },
    resetRequestCounts: () => requestCounts.clear(),
    subjectId,
  },
}
