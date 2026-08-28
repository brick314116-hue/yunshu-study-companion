import assert from 'node:assert/strict'
import test from 'node:test'
import app from './app.js'

const origin = 'https://example.com'
const contextFor = (uid) => Buffer.from(JSON.stringify({ uid })).toString('base64url')

function createDatabase() {
  const sessions = new Map()
  const profiles = new Map([['legacy-profile-a', { _id: 'legacy-profile-a', userId: 'user-a', displayName: '小安', consentVersion: 'v1' }]])

  return {
    sessions,
    profiles,
    database: {
      collection(name) {
        return {
          where(query) {
            return {
              limit() {
                return {
                  async get() {
                    return { data: name === 'user_profiles' ? [...profiles.values()].filter((item) => item.userId === query.userId) : [] }
                  },
                }
              },
            }
          },
          doc(id) {
            return {
              async get() {
                return { data: name === 'agent_sessions' && sessions.has(id) ? [sessions.get(id)] : [] }
              },
              async set(value) {
                if (name === 'user_profiles') profiles.set(id, { _id: id, ...value })
                else sessions.set(id, value)
              },
              async update(value) {
                if (name === 'user_profiles') profiles.set(id, { ...profiles.get(id), ...value })
                else sessions.set(id, { ...sessions.get(id), ...value })
              },
            }
          },
        }
      },
    },
  }
}

test('uses gateway identity for session isolation and ignores forged identity fields', async (t) => {
  process.env.ALLOWED_ORIGINS = origin
  process.env.CLOUDBASE_ENV_ID = 'test-env'
  process.env.NUWAX_BASE_URL = 'https://agent.example.com'
  process.env.NUWAX_API_KEY = 'test-key'
  process.env.NUWAX_MAIN_AGENT_ID = '123'
  process.env.NUWAX_SANDBOX_ID = '789'
  process.env.NUWAX_SKILL_IDS = '42, 43'
  process.env.NUWAX_AGENT_MODE = 'yolo'
  process.env.USER_ID_SECRET = '12345678901234567890123456789012'
  process.env.CLOUDBASE_DATABASE_INSTANCE = 'tnt-testinst'

  const { database, sessions, profiles } = createDatabase()
  const databaseConfigs = []
  app._test.setDatabaseFactory((config) => {
    databaseConfigs.push(config)
    return database
  })
  app._test.resetRequestCounts()
  const nativeFetch = globalThis.fetch
  const created = []
  const chatRequests = []
  globalThis.fetch = async (url, options = {}) => {
    const body = JSON.parse(options.body)
    if (String(url).endsWith('/conversation/add')) {
      created.push(body)
      return Response.json({ success: true, data: 456 + created.length - 1 })
    }
    chatRequests.push(body)
    return new Response('data: {"eventType":"FINAL_RESULT","data":{"outputText":"收到，我会陪你一起梳理。"}}\n\n')
  }
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve))
  t.after(async () => {
    globalThis.fetch = nativeFetch
    app._test.setDatabaseFactory(undefined)
    await new Promise((resolve) => app.server.close(resolve))
  })

  const { port } = app.server.address()
  const health = await nativeFetch(`http://127.0.0.1:${port}/health`, {
    headers: { Origin: origin },
  })
  assert.equal(health.status, 200)
  assert.equal((await health.json()).databaseInstance, 'tnt-testinst')

  app._test.setDatabaseFactory(() => ({
    collection() {
      throw Object.assign(new Error('database instance not found'), {
        code: 'DATABASE_NOT_FOUND',
        requestId: 'sdk-request-1',
      })
    },
  }))
  const failedProfile = await nativeFetch(`http://127.0.0.1:${port}/?resource=profile`, {
    headers: {
      Origin: origin,
      Authorization: 'Bearer valid-token',
      'x-cloudbase-context': contextFor('user-a'),
    },
  })
  // readProfile 读失败时优雅降级为空资料（200），不再抛 500
  assert.equal(failedProfile.status, 200)
  assert.equal((await failedProfile.json()).consentChoice, '')
  app._test.setDatabaseFactory((config) => {
    databaseConfigs.push(config)
    return database
  })

  assert.throws(
    () => app._test.parseAgentStream('data: {"eventType":"FINAL_RESULT","data":{"outputText":"Failed to process request: Agent process failed: ACP InitializeRequest timeout (50s), project_id=1674213"}}\n\n'),
    (error) => error.status === 502 && error.publicMessage === '智能体服务启动超时，请稍后重试。',
  )
  assert.throws(
    () => app._test.parseAgentStream('data: {"eventType":"ERROR","data":{"message":"ACP InitializeRequest timeout (50s), project_id=1674213"}}\n\n'),
    (error) => error.status === 502 && error.publicMessage === '智能体服务启动超时，请稍后重试。',
  )

  const send = (uid, body = {}, token = 'valid-token') => nativeFetch(`http://127.0.0.1:${port}/api/chat`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(uid ? { 'x-cloudbase-context': contextFor(uid) } : {}),
    },
    body: JSON.stringify({ message: '你好', agent: 'main', ...body }),
  })

  assert.equal((await send('user-a', {}, '')).status, 401)
  assert.equal(created.length, 0)

  const first = await send('user-a')
  assert.equal(first.status, 200)
  assert.deepEqual(await first.json(), { reply: '收到，我会陪你一起梳理。' })
  assert.equal(created.length, 1)
  assert.equal(created[0].variables.display_name, '小安')
  assert.equal(created[0].variables.subject_id, app._test.subjectId('user-a', process.env.USER_ID_SECRET))
  assert.equal('web_user_id' in created[0].variables, false)
  assert.equal('selectedComponents' in chatRequests.at(-1), false)
  assert.equal(chatRequests.at(-1).sandboxId, 789)
  assert.deepEqual(chatRequests.at(-1).skillIds, [42, 43])
  assert.equal(chatRequests.at(-1).agentMode, 'yolo')

  const forged = await send('user-a', {
    uid: 'user-b',
    userId: 'user-b',
    subject_id: 'other-user',
    agentId: 999,
    conversationId: 999,
    sessionToken: 'old-browser-session',
  })
  assert.equal(forged.status, 200)
  assert.equal(created.length, 1)
  assert.equal(chatRequests.at(-1).conversationId, 456)
  assert.equal(chatRequests.at(-1).variableParams.subject_id, app._test.subjectId('user-a', process.env.USER_ID_SECRET))

  const otherUser = await send('user-b')
  assert.equal(otherUser.status, 200)
  assert.equal(created.length, 2)
  assert.equal(created[1].variables.subject_id, app._test.subjectId('user-b', process.env.USER_ID_SECRET))
  assert.notEqual(created[0].variables.subject_id, created[1].variables.subject_id)
  assert.deepEqual([...sessions.values()].map((item) => item.userId).sort(), ['user-a', 'user-b'])
  assert.equal(databaseConfigs.at(-1).instance, 'tnt-testinst')

  const profile = (method, body) => nativeFetch(`http://127.0.0.1:${port}/?resource=profile`, {
    method,
    headers: {
      Origin: origin,
      Authorization: 'Bearer valid-token',
      'x-cloudbase-context': contextFor('user-a'),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const existing = await profile('GET')
  assert.equal(existing.status, 200)
  assert.equal((await existing.json()).displayName, '小安')

  const saved = await profile('POST', {
    displayName: '  小 安<script>  ',
    consentChoice: 'declined',
    consentVersion: '2026-08-v1',
    userId: 'forged-user',
  })
  assert.equal(saved.status, 200)
  assert.equal(profiles.size, 1)
  assert.equal(profiles.get('legacy-profile-a').userId, 'user-a')
  assert.equal(profiles.get('legacy-profile-a').displayName, '小 安script')
  assert.equal(profiles.get('legacy-profile-a').consentChoice, 'declined')
})

test('stripToolCallNoise removes agent tool-call markup from SSE text', () => {
  const { stripToolCallNoise, parseAgentStream } = app._test

  // 1. 闭合的 <tool_use> 块 + 数据表执行卡片，应被完全剥离
  const noisy = '<tool_use>\n  <name>record_query</name>\n  <arguments>{"owner_uid": "1785295571"}</arguments>\n</tool_use>好的，我帮你查一下。<div><markdown-custom-process executeId="abc" type="Workflow" status="FINISHED" name="记录查询"></markdown-custom-process></div>你最近没有保存记录。'
  assert.equal(stripToolCallNoise(noisy), '好的，我帮你查一下。你最近没有保存记录。')

  // 2. 流式未闭合的 tool_use（到字符串末尾）
  assert.equal(stripToolCallNoise('开始 <tool_use>\n  <name>TABLE_SQL'), '开始')

  // 3. 空字符串
  assert.equal(stripToolCallNoise(''), '')
  assert.equal(stripToolCallNoise(null), '')
  assert.equal(stripToolCallNoise(undefined), '')

  // 4. 正常文本不受影响
  assert.equal(stripToolCallNoise('你做得很好，继续加油。'), '你做得很好，继续加油。')

  // 4b. 被超时掐断的半截残片（<tool_ / <tool_use 未写完）整体剥离
  assert.equal(stripToolCallNoise('<tool_'), '')
  assert.equal(stripToolCallNoise('<tool_use\n  <name>record_query'), '')
  assert.equal(stripToolCallNoise('查到了。<tool_'), '查到了。')

  // 5. 整段 SSE 流经 parseAgentStream 后回复干净
  const sse = [
    'data: {"eventType":"MESSAGE","data":{"role":"ASSISTANT","type":"TEXT","text":"<tool_use>\\n  <name>record_query</name>\\n  <arguments>{\\"owner_uid\\": \\"1785295571\\"}</arguments>\\n</tool_use>"}}',
    '',
    'data: {"eventType":"MESSAGE","data":{"role":"ASSISTANT","type":"TEXT","text":"<div><markdown-custom-process executeId=\\"abc\\" type=\\"Table\\" status=\\"FINISHED\\" name=\\"mood_log[更新、删除、查询SQL执行]\\"></markdown-custom-process></div>"}}',
    '',
    'data: {"eventType":"FINAL_RESULT","data":{"outputText":"你最近7天保存了2条情绪记录。"}}',
    '',
  ].join('\r\n\r\n')
  const parsed = parseAgentStream(sse)
  assert.equal(parsed.reply, '你最近7天保存了2条情绪记录。')
  assert.equal(parsed.action, null)
})

test('extractAction pulls [[action:xxx]] tag from reply end', () => {
  const { extractAction } = app._test

  // 1. 末尾带 mood-checkin 标记 → 剥离并返回 action
  const r1 = extractAction('好的，我们开始记录一下此刻的情绪吧。[[action:mood-checkin]]')
  assert.equal(r1.action, 'mood-checkin')
  assert.equal(r1.reply, '好的，我们开始记录一下此刻的情绪吧。')

  // 2. 标记前有空白 → 也剥离干净
  const r2 = extractAction('我先帮你打开打卡表单。  [[action:mood-checkin]]  ')
  assert.equal(r2.action, 'mood-checkin')
  assert.equal(r2.reply, '我先帮你打开打卡表单。')

  // 3. 未识别的 action 名 → 不识别，原样返回
  const r3 = extractAction('随便说点什么[[action:unknown-thing]]')
  assert.equal(r3.action, null)
  assert.equal(r3.reply, '随便说点什么[[action:unknown-thing]]')

  // 4. 无标记 → 原样返回
  const r4 = extractAction('你做得很好，继续加油。')
  assert.equal(r4.action, null)
  assert.equal(r4.reply, '你做得很好，继续加油。')

  // 5. 标记在中间（非末尾）→ 不识别
  const r5 = extractAction('[[action:mood-checkin]] 这是开头')
  assert.equal(r5.action, null)

  // 6. 空值
  assert.deepEqual(extractAction(''), { reply: '', action: null })
  assert.deepEqual(extractAction(null), { reply: '', action: null })
})

test('maps one local conversationKey to one nuwax conversation and passes psych_consent', async (t) => {
  process.env.ALLOWED_ORIGINS = origin
  process.env.CLOUDBASE_ENV_ID = 'test-env'
  process.env.NUWAX_BASE_URL = 'https://agent.example.com'
  process.env.NUWAX_API_KEY = 'test-key'
  process.env.NUWAX_MAIN_AGENT_ID = '123'
  process.env.USER_ID_SECRET = '12345678901234567890123456789012'
  process.env.CLOUDBASE_DATABASE_INSTANCE = 'tnt-testinst'

  const { database, sessions } = createDatabase()
  app._test.setDatabaseFactory(() => database)
  app._test.resetRequestCounts()
  const nativeFetch = globalThis.fetch
  const created = []
  const chatRequests = []
  globalThis.fetch = async (url, options = {}) => {
    const body = JSON.parse(options.body)
    if (String(url).endsWith('/conversation/add')) {
      created.push(body)
      return Response.json({ success: true, data: 900 + created.length - 1 })
    }
    chatRequests.push(body)
    return new Response('data: {"eventType":"FINAL_RESULT","data":{"outputText":"好的。"}}\n\n')
  }
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve))
  t.after(async () => {
    globalThis.fetch = nativeFetch
    app._test.setDatabaseFactory(undefined)
    await new Promise((resolve) => app.server.close(resolve))
  })

  const send = (conversationKey) => nativeFetch('http://127.0.0.1:1/api/chat'.replace(':1', `:${app.server.address().port}`), {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      Authorization: 'Bearer valid-token',
      'x-cloudbase-context': contextFor('user-c'),
    },
    body: JSON.stringify({ message: '你好', conversationKey }),
  })

  // 同一个 conversationKey：第一次新建，第二次复用同一女娲会话
  assert.equal((await send('conv-1')).status, 200)
  assert.equal((await send('conv-1')).status, 200)
  assert.equal(created.length, 1)
  // 另一个 conversationKey：各自独立的女娲会话
  assert.equal((await send('conv-2')).status, 200)
  assert.equal(created.length, 2)
  assert.notEqual(chatRequests.at(-1).conversationId, chatRequests.at(-2).conversationId)
  // 会话变量带 psych_consent（该用户无 profile → unknown）
  assert.equal(created[0].variables.psych_consent, 'unknown')
  assert.equal(chatRequests[0].variableParams.psych_consent, 'unknown')
  // 会话映射按 key 分文档保存
  assert.equal([...sessions.values()].filter((item) => item.agentKey?.startsWith('conv-')).length, 2)
})

test('mood check-in enforces consent, validates input and proxies the workflow', async (t) => {
  process.env.ALLOWED_ORIGINS = origin
  process.env.CLOUDBASE_ENV_ID = 'test-env'
  process.env.NUWAX_BASE_URL = 'https://agent.example.com'
  process.env.NUWAX_API_KEY = 'test-key'
  process.env.NUWAX_MAIN_AGENT_ID = '123'
  process.env.NUWAX_CHECKIN_WORKFLOW_ID = '5257662'
  process.env.USER_ID_SECRET = '12345678901234567890123456789012'
  process.env.CLOUDBASE_DATABASE_INSTANCE = 'tnt-testinst'

  const { database, profiles } = createDatabase()
  app._test.setDatabaseFactory(() => database)
  app._test.resetRequestCounts()
  const nativeFetch = globalThis.fetch
  const workflowCalls = []
  let workflowSucceeds = true
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).includes('/api/v1/workflow/5257662/execute')) {
      workflowCalls.push({ url: String(url), options })
      return Response.json(workflowSucceeds
        ? { code: '0000', success: true, data: { success: 'true', record_id: '77' } }
        : { code: '0000', success: true, data: { success: 'false', record_id: '', error_msg: '未通过知情同意校验' } })
    }
    throw new Error(`unexpected fetch: ${url}`)
  }
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve))
  t.after(async () => {
    globalThis.fetch = nativeFetch
    app._test.setDatabaseFactory(undefined)
    await new Promise((resolve) => app.server.close(resolve))
  })

  const checkin = (body) => nativeFetch(`http://127.0.0.1:${app.server.address().port}/?resource=mood-checkin`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      Authorization: 'Bearer valid-token',
      'x-cloudbase-context': contextFor('user-a'),
    },
    body: JSON.stringify(body),
  })

  // 未登录 → 401
  const anonymous = await nativeFetch(`http://127.0.0.1:${app.server.address().port}/?resource=mood-checkin`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ emotionName: '焦虑', intensity: 3 }),
  })
  assert.equal(anonymous.status, 401)
  assert.equal(workflowCalls.length, 0)

  // consent 为空（历史资料未确认）→ 403，工作流未被调用
  const noConsent = await checkin({ emotionName: '焦虑', intensity: 3 })
  assert.equal(noConsent.status, 403)
  assert.equal(workflowCalls.length, 0)

  // declined → 403
  profiles.get('legacy-profile-a').consentChoice = 'declined'
  assert.equal((await checkin({ emotionName: '焦虑', intensity: 3 })).status, 403)
  assert.equal(workflowCalls.length, 0)

  // accepted 后：输入校验（空名称 / 越界强度）→ 400
  profiles.get('legacy-profile-a').consentChoice = 'accepted'
  assert.equal((await checkin({ emotionName: '  ', intensity: 3 })).status, 400)
  assert.equal((await checkin({ emotionName: '焦虑', intensity: 9 })).status, 400)
  assert.equal((await checkin({ emotionName: '焦虑', intensity: 2.5 })).status, 400)
  assert.equal(workflowCalls.length, 0)

  // 合法提交 → 调用工作流并透传 subject_id
  const ok = await checkin({ emotionName: '焦虑', intensity: 3, triggerSummary: '考试压力' })
  assert.equal(ok.status, 200)
  assert.deepEqual(await ok.json(), { success: true, recordId: '77' })
  assert.equal(workflowCalls.length, 1)
  const sent = JSON.parse(workflowCalls[0].options.body)
  assert.equal(sent.emotion_name, '焦虑')
  assert.equal(sent.intensity, 3)
  assert.equal(sent.trigger_summary, '考试压力')
  assert.equal(sent.psych_consent, 'accepted')
  assert.equal(sent.subject_id, app._test.subjectId('user-a', process.env.USER_ID_SECRET))
  assert.equal(workflowCalls[0].options.headers['External-Username'], sent.subject_id)

  // 工作流返回失败 → 502
  workflowSucceeds = false
  const failed = await checkin({ emotionName: '焦虑', intensity: 3 })
  assert.equal(failed.status, 502)
  assert.equal((await failed.json()).error, '打卡保存失败，请稍后重试。')
})
