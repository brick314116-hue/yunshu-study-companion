import assert from 'node:assert/strict'
import test from 'node:test'
import app from './app.js'

test('returns JSON and reuses the signed conversation session', async () => {
  process.env.ALLOWED_ORIGIN = 'https://example.com'
  process.env.NUWAX_BASE_URL = 'https://agent.example.com'
  process.env.NUWAX_API_KEY = 'test-key'
  process.env.NUWAX_AGENT_ID = '123'
  process.env.SESSION_SECRET = '12345678901234567890123456789012'

  const nativeFetch = globalThis.fetch
  let conversations = 0
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/conversation/add')) {
      conversations += 1
      return Response.json({ success: true, data: 456 })
    }
    return new Response('data: {"eventType":"FINAL_RESULT","data":{"outputText":"收到，我会陪你一起梳理。"}}\n\n')
  }
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve))

  try {
    const { port } = app.server.address()
    const send = (sessionToken) => nativeFetch(`http://127.0.0.1:${port}/api/chat`, {
      method: 'POST',
      headers: { Origin: 'https://example.com', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '你好', sessionToken }),
    })
    const first = await send()
    const firstBody = await first.json()
    assert.equal(firstBody.reply, '收到，我会陪你一起梳理。')
    assert.ok(firstBody.sessionToken)

    const second = await send(firstBody.sessionToken)
    assert.equal((await second.json()).reply, '收到，我会陪你一起梳理。')
    assert.equal(conversations, 1)
  } finally {
    globalThis.fetch = nativeFetch
    await new Promise((resolve) => app.server.close(resolve))
  }
})
