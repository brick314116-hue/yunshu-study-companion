import assert from 'node:assert/strict'
import test from 'node:test'
import app from './app.js'

const origin = 'https://example.com'
const contextFor = (uid) => Buffer.from(JSON.stringify({ uid })).toString('base64url')

function createDatabase() {
  const sessions = new Map()
  const profiles = new Map([['user-a', { displayName: '小安', consentVersion: 'v1' }]])

  return {
    sessions,
    database: {
      collection(name) {
        return {
          where(query) {
            return {
              limit() {
                return {
                  async get() {
                    return { data: name === 'user_profiles' && profiles.has(query.userId) ? [profiles.get(query.userId)] : [] }
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
                sessions.set(id, value)
              },
              async update(value) {
                sessions.set(id, { ...sessions.get(id), ...value })
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
  process.env.USER_ID_SECRET = '12345678901234567890123456789012'

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
})
