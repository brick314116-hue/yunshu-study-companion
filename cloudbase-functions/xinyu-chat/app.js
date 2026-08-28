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
const BUILD_VERSION = '2026-08-19-profile-probe'
const DEFAULT_DATABASE_INSTANCE = 'tnt-nsoau01qw'
const DEFAULT_CHECKIN_WORKFLOW_ID = 5257662
const CHECKIN_TIMEOUT_MS = 30 * 1000
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

function isRateLimited(key) {
  const now = Date.now()
  if (requestCounts.size > 10000) {
    for (const [k, value] of requestCounts) {
      if (value.resetAt <= now) requestCounts.delete(k)
    }
    if (requestCounts.size > 10000) requestCounts.clear()
  }
  const current = requestCounts.get(key)
  if (!current || current.resetAt <= now) {
    requestCounts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
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

// 附件上传：单文件 base64 上限（约 6MB 原始），类型限图片/常见作业文档。
const UPLOAD_MAX_BYTES = 6 * 1024 * 1024
const UPLOAD_MIME_WHITELIST = new Set([
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/markdown',
])
const UPLOAD_EXT_WHITELIST = /\.(png|jpe?g|gif|webp|pdf|docx?|xlsx?|pptx?|txt|md)$/i

function readRawBody(req, cap) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let tooLarge = false
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > cap) { tooLarge = true; return }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (tooLarge) { reject(Object.assign(new Error('file_too_large'), { status: 413 })); return }
      resolve(Buffer.concat(chunks))
    })
    req.on('error', reject)
  })
}

// 前端把文件 base64 发上来，这里转存到女娲文件服务，返回附件引用。
async function handleUpload(req, res) {
  const id = requestId(req)
  authenticatedUserId(req)
  const config = getConfig()
  const raw = await readRawBody(req, UPLOAD_MAX_BYTES + 1024 * 1024)
  let body
  try { body = JSON.parse(raw.toString('utf8')) } catch {
    sendJson(res, 400, { error: '上传参数无效。' }); return
  }
  const name = String(body.name || 'file').slice(0, 120)
  const type = String(body.type || '')
  const base64 = String(body.base64 || '')
  if (!base64) { sendJson(res, 400, { error: '文件内容为空。' }); return }
  const buffer = Buffer.from(base64, 'base64')
  if (buffer.length > UPLOAD_MAX_BYTES) { sendJson(res, 413, { error: '单个文件不能超过 6MB。' }); return }
  if (!UPLOAD_MIME_WHITELIST.has(type) && !UPLOAD_EXT_WHITELIST.test(name)) {
    sendJson(res, 415, { error: '仅支持图片或常见文档（pdf/word/excel/ppt/txt）。' }); return
  }

  const form = new FormData()
  form.append('file', new Blob([buffer], { type: type || 'application/octet-stream' }), name)
  let upstream
  try {
    upstream = await fetch(`${config.baseUrl}/api/v1/file/upload?type=store`, {
      method: 'POST',
      headers: { Authorization: config.authorization },
      body: form,
    })
  } catch (error) {
    logError('upload', id, error)
    sendJson(res, 502, { error: `上传服务暂不可用：${error?.message || 'network'}` }); return
  }
  const result = await upstream.json().catch(() => null)
  const data = result?.data || {}
  if (!upstream.ok || !data.key) {
    logError('upload', id, Object.assign(new Error(String(result?.message || 'upload_failed')), { code: String(result?.code || upstream.status) }))
    sendJson(res, 502, { error: `上传失败(${upstream.status})：${result?.message || 'no key'}` }); return
  }
  sendJson(res, 200, {
    data: { key: data.key, url: data.url, fileName: data.fileName || name, mimeType: data.mimeType || type },
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
    // 数据实际存放在 tnt-nsoau01qw 实例；必须显式指定，默认实例是另一个空库。
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

// 数据库操作留痕：排查「能对话但表不更新」时，在函数日志里按 DB- 关键字过滤。
function logDb(id, action, detail) {
  console.log(`[xinyu-chat ${id}] DB-${action} ${detail}`)
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

function sessionDocumentId(uid, secret, agentKey = AGENT_KEY) {
  return createHmac('sha256', secret).update(`${uid}:${agentKey}`).digest('hex')
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
  const id = requestId(req)
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
  logDb(id, 'PROFILE-WRITE-OK', `doc=${current.documentId || uid} op=${current.documentId ? 'update' : 'set'} consent=${next.consentChoice || '-'}`)
  sendJson(res, 200, next)
}

// 自诊断端点（需登录态）：逐步验证 user_profiles 读、agent_sessions 探针写-读-删。
// 浏览器登录后访问 /nuwax/api/chat?resource=db-check 即可定位「表不更新」卡在哪一步。
async function handleDbCheck(req, res) {
  const id = requestId(req)
  const uid = authenticatedUserId(req)
  const config = getConfig()
  const db = cloudbaseDatabase(config)
  const steps = {}
  const step = async (name, fn) => {
    try {
      steps[name] = await fn()
      logDb(id, `CHECK-${name}-OK`, JSON.stringify(steps[name]).slice(0, 160))
    } catch (error) {
      const diagnostic = errorDiagnostic(error)
      steps[name] = { ok: false, code: diagnostic.code, message: diagnostic.message }
      logDb(id, `CHECK-${name}-FAIL`, `${diagnostic.code} ${diagnostic.message}`)
    }
  }

  await step('profiles-read', async () => {
    const result = await db.collection('user_profiles').where({ userId: uid }).limit(1).get()
    return { ok: true, found: (result?.data?.length ?? 0) > 0 }
  })
  // user_profiles 写探针：验证该集合的 admin 写入链路（独立诊断文档，写完即删，不碰真实资料）。
  const profileProbeId = `__diag__${uid}`
  await step('profiles-probe-write', async () => {
    await db.collection('user_profiles').doc(profileProbeId).set({ probe: true, at: new Date() })
    return { ok: true }
  })
  await step('profiles-probe-read', async () => {
    const result = await db.collection('user_profiles').doc(profileProbeId).get()
    return { ok: true, found: Boolean(result?.data) }
  })
  await step('profiles-probe-delete', async () => {
    await db.collection('user_profiles').doc(profileProbeId).remove()
    return { ok: true }
  })
  const probeDocId = sessionDocumentId(uid, config.userIdSecret, '__diag__')
  await step('sessions-probe-write', async () => {
    await db.collection('agent_sessions').doc(probeDocId).set({ probe: true, at: new Date() })
    return { ok: true }
  })
  await step('sessions-probe-read', async () => {
    const result = await db.collection('agent_sessions').doc(probeDocId).get()
    return { ok: true, found: Boolean(result?.data) }
  })
  await step('sessions-probe-delete', async () => {
    await db.collection('agent_sessions').doc(probeDocId).remove()
    return { ok: true }
  })

  sendJson(res, 200, {
    status: Object.values(steps).every((item) => item?.ok) ? 'ok' : 'degraded',
    version: BUILD_VERSION,
    envId: config.envId,
    databaseInstance: config.instance,
    databaseName: config.database || 'default',
    steps,
  })
}

async function readSession(db, uid, config, agentKey = AGENT_KEY) {
  const docId = sessionDocumentId(uid, config.userIdSecret, agentKey)
  const result = await db.collection('agent_sessions').doc(docId).get()
  const session = result?.data?.[0] || result?.data
  return Number.isSafeInteger(Number(session?.conversationId)) && Number(session.conversationId) > 0
    ? { conversationId: Number(session.conversationId) }
    : null
}

async function saveSession(db, uid, config, conversationId, agentKey = AGENT_KEY) {
  const docId = sessionDocumentId(uid, config.userIdSecret, agentKey)
  await db.collection('agent_sessions').doc(docId).set({
    userId: uid,
    agentKey,
    conversationId,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  return docId
}

// 女娲会话变量：匿名身份 + 称呼 + 同意版本 + 同意结果。
// psych_consent 由服务端从 user_profiles 读取后下发，declined 时女娲侧工作流
// （情绪/认知/记录增删改查）应据此拒绝并引导学业功能，前端隐藏入口只是第一道防线。
function conversationVariables(profile, subject) {
  return {
    subject_id: subject,
    display_name: profile.displayName,
    consent_version: profile.consentVersion,
    psych_consent: profile.consentChoice || 'unknown',
  }
}

// 表单情绪打卡：前端表单 → 本函数（鉴权 + consent 门禁 + 输入校验）→ 女娲工作流执行 API
// → 写 mood_checkin 表。psych_consent 在服务端强校验，前端隐藏入口只是第一道防线。
async function handleMoodCheckin(req, res) {
  const id = requestId(req)
  const uid = authenticatedUserId(req)
  if (isRateLimited(uid)) {
    sendJson(res, 429, { error: '请求过于频繁，请稍后再试。' })
    return
  }

  const config = getConfig()
  const workflowId = Number(process.env.NUWAX_CHECKIN_WORKFLOW_ID) || DEFAULT_CHECKIN_WORKFLOW_ID
  const workflowKey = process.env.NUWAX_WORKFLOW_API_KEY || process.env.NUWAX_API_KEY
  if (!workflowKey) {
    sendJson(res, 503, { error: '打卡服务尚未配置。' })
    return
  }

  const db = cloudbaseDatabase(config)
  const profile = await readProfile(db, uid)
  if (profile.consentChoice !== 'accepted') {
    sendJson(res, 403, { error: '情绪打卡需要先同意使用边界说明。' })
    return
  }

  const body = await readJson(req)
  const emotionName = typeof body.emotionName === 'string' ? body.emotionName.trim().slice(0, 32) : ''
  const intensityRaw = Number(body.intensity)
  const triggerSummary = typeof body.triggerSummary === 'string' ? body.triggerSummary.trim().slice(0, 80) : ''
  if (!emotionName) {
    sendJson(res, 400, { error: '请先选择一个情绪名称。' })
    return
  }
  if (!Number.isInteger(intensityRaw) || intensityRaw < 1 || intensityRaw > 5) {
    sendJson(res, 400, { error: '情绪强度需在 1-5 之间。' })
    return
  }

  const subject = subjectId(uid, config.userIdSecret)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), CHECKIN_TIMEOUT_MS)
  res.once('close', () => controller.abort())
  let upstream
  try {
    upstream = await fetch(`${config.baseUrl}/api/v1/workflow/${workflowId}/execute`, {
      method: 'POST',
      headers: {
        Authorization: workflowKey.startsWith('Bearer ') ? workflowKey : `Bearer ${workflowKey}`,
        'Content-Type': 'application/json',
        'External-Username': subject,
      },
      body: JSON.stringify({
        emotion_name: emotionName,
        intensity: intensityRaw,
        trigger_summary: triggerSummary,
        psych_consent: 'accepted',
        subject_id: subject,
      }),
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timeout)
    logError('checkin-upstream', id, error)
    sendJson(res, error?.name === 'AbortError' ? 504 : 502, {
      error: error?.name === 'AbortError' ? '打卡服务响应超时，请稍后重试。' : '暂时无法连接打卡服务。',
    })
    return
  }
  let result
  try {
    result = await upstream.json()
  } catch {
    clearTimeout(timeout)
    logError('checkin-parse', id, Object.assign(new Error(`status=${upstream.status}`), { code: `HTTP_${upstream.status}` }))
    sendJson(res, 502, { error: '打卡服务返回异常，请稍后重试。' })
    return
  }
  clearTimeout(timeout)
  const data = result?.data || {}
  const saved = String(data.success) === 'true' || data.success === true
  if (!upstream.ok || !result?.success || !saved) {
    logError('checkin-workflow', id, Object.assign(
      new Error(String(data.error_msg || result?.message || 'workflow_failed')),
      { code: String(result?.code || `HTTP_${upstream.status}`) },
    ))
    sendJson(res, 502, { error: '打卡保存失败，请稍后重试。' })
    return
  }
  logDb(id, 'CHECKIN-SAVE-OK', `subject=${subject.slice(0, 8)}… record=${data.record_id ?? '-'}`)
  sendJson(res, 200, { success: true, recordId: data.record_id ?? null })
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
      variables: conversationVariables(profile, subject),
      devMode: false,
    }),
  })
  const result = await response.json().catch(() => null)
  if (!response.ok || !result?.success || !Number.isSafeInteger(Number(result.data)) || Number(result.data) <= 0) {
    throw Object.assign(new Error('conversation_create_failed'), { status: 502 })
  }
  return Number(result.data)
}

// 智能体在回复末尾追加 [[action:xxx]] 时，云函数抽取为结构化 action 返回给前端。
// 前端据此弹本地表单类工具（如情绪打卡），不依赖智能体直接保存数据，
// 既能用对话意图识别做入口，又能用确定性的表单保证写入可靠、隔离合规。
const ACTION_TAG_REGEX = /\[\[action:([a-z][a-z0-9-]*)\]\]\s*$/i
const SUPPORTED_ACTIONS = new Set(['mood-checkin'])

function extractAction(reply) {
  if (!reply) return { reply: '', action: null }
  const match = reply.match(ACTION_TAG_REGEX)
  if (!match) return { reply, action: null }
  const action = match[1].toLowerCase()
  if (!SUPPORTED_ACTIONS.has(action)) return { reply, action: null }
  return { reply: reply.slice(0, match.index).replace(/\s+$/, ''), action }
}

// 女娲智能体在对话中调用工作流/插件/数据表时，SSE 流会把工具调用过程作为
// assistant MESSAGE 文本下发：<tool_use>…</tool_use>、<div><markdown-custom-process …></div>。
// 这些是平台内部协议标签，前端不可见、也不应进对话气泡。这里统一剥离，避免"吐代码"。
function stripToolCallNoise(text) {
  if (!text) return ''
  return text
    .replace(/<tool_use>[\s\S]*?<\/tool_use>/g, '')     // 闭合的工具调用块
    .replace(/<tool_use>[\s\S]*$/g, '')                  // 流式未闭合（到字符串末尾）
    .replace(/<div><markdown-custom-process[\s\S]*?<\/div>/g, '')  // 工作流/数据表执行卡片
    .replace(/<div><markdown-custom-process[^<]*<\/div>/g, '')
    .replace(/<\/?markdown-custom-process[^>]*>/g, '')
    .replace(/<\/?tool[\s\S]*$/g, '')                    // 半截残片（如被超时掐断的 <tool_）
    .replace(/<\/?tool_use>/g, '')                       // 残片
    .replace(/<\/?arguments>?/g, '')                    // 残片
    .replace(/\s+/g, ' ')
    .trim()
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
    const text = stripToolCallNoise(String(item?.text || ''))
    if (text) messages.push(text)
  }
  const reply = stripToolCallNoise(finalText || messages.join(' '))
  if (/Failed to process request:\s*Agent process failed|ACP InitializeRequest timeout/i.test(reply)) {
    throw Object.assign(new Error('agent_initialize_timeout'), {
      status: 502,
      publicMessage: '智能体服务启动超时，请稍后重试。',
    })
  }
  // 回合里出现过工具调用时，/chat 的 SSE 流常在首个 tool_use 处截断，需回查会话消息拿完整答案。
  const usedTools = /<tool|markdown-custom-process/.test(raw)
  return { ...extractAction(reply), usedTools }
}

// 工具调用回合的完整答案在女娲侧服务端继续执行，/chat 流拿不到。
// 回查会话消息接口，取最后一条"不含工具标签"的助手消息作为权威回复。
const extractMessageList = (body) => {
  const d = body?.data
  if (Array.isArray(d)) return d
  if (Array.isArray(d?.list)) return d.list
  if (Array.isArray(d?.messages)) return d.messages
  if (Array.isArray(body?.list)) return body.list
  return []
}

async function fetchFinalReply(config, conversationId) {
  let fallback = ''
  for (let attempt = 0; attempt < 14; attempt++) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, 3000))
    try {
      const res = await fetch(`${config.baseUrl}/api/v1/chat/${conversationId}/messages?limit=50`, {
        headers: { Authorization: config.authorization },
      })
      if (!res.ok) continue
      const body = await res.json().catch(() => null)
      const list = extractMessageList(body)
      for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i]
        const role = String(m?.role || m?.messageType || '').toUpperCase()
        if (role !== 'ASSISTANT') continue
        const text = stripToolCallNoise(String(m?.text ?? m?.content ?? ''))
        if (!text) continue
        const clean = !/<tool|markdown-custom-process/.test(text)
        const finished = m?.finished === true || /ENDTURN/i.test(String(m?.finishReason || ''))
        // 干净（无工具标签）且已结束，或轮询足够久后的干净消息，直接采用
        if (clean && (finished || attempt >= 6)) return text
        if (finished && !fallback) fallback = text
      }
    } catch {
      /* 重试 */
    }
  }
  return fallback
}

async function handleChat(req, res) {
  const id = requestId(req)
  const uid = authenticatedUserId(req)
  // 按 uid 限流：演示/教室场景多个用户常共用一个出口 IP，按 IP 限流会互相挤兑。
  if (isRateLimited(uid)) {
    sendJson(res, 429, { error: '请求过于频繁，请稍后再试。' })
    return
  }

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
  // 前端本地会话 id 作为 conversationKey：一个本地会话对应一个女娲会话，
  // 切换/回看历史对话时上下文不再互相覆盖。非法值一律回落到默认键。
  const conversationKey = typeof body.conversationKey === 'string' && /^[\w-]{1,64}$/.test(body.conversationKey)
    ? body.conversationKey
    : AGENT_KEY

  const db = cloudbaseDatabase(config)
  const profile = await readProfile(db, uid)
  const subject = subjectId(uid, config.userIdSecret)
  let session = body.newConversation === true ? null : await readSession(db, uid, config, conversationKey)
  if (session) {
    logDb(id, 'SESSION-REUSE', `key=${conversationKey} conversationId=${session.conversationId}`)
  } else {
    session = { conversationId: await createConversation(config, profile, subject) }
    logDb(id, 'SESSION-CREATE', `key=${conversationKey} conversationId=${session.conversationId}`)
    try {
      await saveSession(db, uid, config, session.conversationId, conversationKey)
      logDb(id, 'SESSION-SAVE-OK', `key=${conversationKey}`)
    } catch (error) {
      // 会话映射写失败不阻断对话（否则用户完全无法使用），但日志必须能看到。
      // 代价是下一次发言会新建女娲会话、丢失上下文；根因见 README「数据表不更新排查」。
      logError('session-save', id, error)
    }
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
        attachments: (Array.isArray(body.attachments) ? body.attachments : [])
          .slice(0, 5)
          .map((a) => ({
            fileKey: String(a?.fileKey || a?.key || ''),
            url: String(a?.url || ''),
            fileName: String(a?.fileName || ''),
            mimeType: String(a?.mimeType || ''),
          }))
          .filter((a) => a.fileKey),
        debug: false,
        variableParams: conversationVariables(profile, subject),
        filterSensitive: true,
        agentMode: config.agentMode,
        ...(config.sandboxId ? { sandboxId: config.sandboxId } : {}),
        ...(config.skillIds.length ? { skillIds: config.skillIds } : {}),
      }),
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timeout)
    logError('upstream', id, error)
    sendJson(res, error?.name === 'AbortError' ? 504 : 502, {
      error: error?.name === 'AbortError' ? '智能体响应超时，请稍后重试。' : '暂时无法连接智能体。',
    })
    return
  }

  if (!upstream.ok || !upstream.body) {
    clearTimeout(timeout)
    logError('upstream-http', id, Object.assign(new Error(`status=${upstream.status}`), {
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
    logError('upstream-stream', id, error)
    sendJson(res, error?.name === 'AbortError' ? 504 : 502, {
      error: error?.name === 'AbortError' ? '智能体响应超时，请稍后重试。' : '智能体响应读取失败，请稍后重试。',
    })
    return
  }
  clearTimeout(timeout)
  const parsed = parseAgentStream(raw)
  let reply = parsed.reply
  if (parsed.usedTools) {
    const full = await fetchFinalReply(config, session.conversationId)
    if (full) reply = full
  }
  if (!reply) {
    sendJson(res, 502, { error: '智能体没有返回可显示的内容。' })
    return
  }
  try {
    await db.collection('agent_sessions')
      .doc(sessionDocumentId(uid, config.userIdSecret, conversationKey))
      .update({ updatedAt: new Date() })
  } catch (error) {
    logError('session-touch', id, error)
  }
  const payload = { reply }
  if (parsed.action) payload.action = parsed.action
  sendJson(res, 200, payload)
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
  const resource = requestUrl.searchParams.get('resource')
  const isProfileRequest = isChatPath && resource === 'profile'
  const isDbCheckRequest = isChatPath && resource === 'db-check'
  const isMoodCheckinRequest = isChatPath && resource === 'mood-checkin'
  const isUploadRequest = isChatPath && resource === 'upload'
  if (req.method === 'POST' && isUploadRequest) {
    try {
      await handleUpload(req, res)
    } catch (error) {
      const id = requestId(req)
      logError('upload', id, error)
      if (!res.headersSent) {
        sendJson(res, error?.status || 500, {
          error: error?.status === 401 ? '登录状态无效，请重新登录。' :
            error?.status === 413 ? '文件太大，单个不能超过 6MB。' :
            error?.status === 415 ? '仅支持图片或常见文档。' : '上传失败。',
          requestId: id,
        })
      }
    }
    return
  }
  if (req.method === 'POST' && isMoodCheckinRequest) {
    try {
      await handleMoodCheckin(req, res)
    } catch (error) {
      const id = requestId(req)
      logError('mood-checkin', id, error)
      if (!res.headersSent) {
        sendJson(res, error?.status || 500, {
          error: error?.status === 401 ? '登录状态无效，请重新登录。' :
            error?.status === 403 ? '情绪打卡需要先同意使用边界说明。' :
            error?.status === 429 ? '请求过于频繁，请稍后再试。' :
            error?.status === 503 ? '打卡服务尚未配置完成。' : '打卡处理失败。',
          requestId: id,
        })
      }
    }
    return
  }
  if (req.method === 'GET' && isDbCheckRequest) {
    try {
      await handleDbCheck(req, res)
    } catch (error) {
      const id = requestId(req)
      logError('db-check', id, error)
      if (!res.headersSent) {
        sendJson(res, error?.status || 500, {
          error: error?.status === 401 ? '登录状态无效，请重新登录。' : '自诊断执行失败。',
          requestId: id,
        })
      }
    }
    return
  }
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
    stripToolCallNoise,
    extractAction,
    setDatabaseFactory: (factory) => { databaseFactory = factory },
    resetRequestCounts: () => requestCounts.clear(),
    subjectId,
  },
}
