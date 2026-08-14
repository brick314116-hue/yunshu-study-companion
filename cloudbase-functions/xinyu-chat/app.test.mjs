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
  process.env.CLOUDBASE_DATABASE_INSTANCE = 'tnt-nsoau01qw'

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
  assert.equal((await health.json()).databaseInstance, 'tnt-nsoau01qw')

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
  assert.equal(failedProfile.status, 500)
  assert.equal((await failedProfile.json()).error, '用户资料处理失败。')
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
  assert.equal(databaseConfigs.at(-1).instance, 'tnt-nsoau01qw')

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
