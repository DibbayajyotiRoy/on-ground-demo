import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

process.env.DEMO_PASSCODE = 'test-pass'
process.env.TWILIO_ACCOUNT_SID = 'ACtest'
process.env.TWILIO_AUTH_TOKEN = 'x'
process.env.TWILIO_PHONE_NUMBER = '+15005550006'

const { default: app } = await import('./app.mjs')
const { escapeXml, isValidAgentQuery, signAgentPath } = await import('./phone-agent.mjs')

let server
let base

before(async () => {
  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})

after(() => new Promise((resolve) => server.close(resolve)))

const toQuery = (signed) => Object.fromEntries(new URL('http://x' + signed).searchParams)
const flipLastChar = (s) => s.slice(0, -1) + (s.endsWith('0') ? '1' : '0')

test('agent token from signAgentPath is accepted', () => {
  assert.equal(isValidAgentQuery(toQuery(signAgentPath('/api/twilio/agent'))), true)
})

test('agent token rejects expired, tampered and empty queries', () => {
  const expired = toQuery(signAgentPath('/api/twilio/agent', Date.now() - 16 * 60 * 1000))
  assert.equal(isValidAgentQuery(expired), false)

  const good = toQuery(signAgentPath('/api/twilio/agent'))
  assert.equal(isValidAgentQuery({ ...good, sig: flipLastChar(good.sig) }), false)
  assert.equal(isValidAgentQuery({ ...good, exp: String(Number(good.exp) + 1) }), false)
  assert.equal(isValidAgentQuery({}), false)
})

test('agent webhook rejects a request without a token', async () => {
  const res = await fetch(`${base}/api/twilio/agent`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'CallSid=CAe1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c',
  })
  assert.equal(res.status, 403)
})

test('agent webhook rejects a malformed token', async () => {
  const res = await fetch(`${base}/api/twilio/agent?exp=1&sig=abc`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'CallSid=CAe1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c',
  })
  assert.equal(res.status, 403)
})

test('inbound voice route is gone', async () => {
  const res = await fetch(`${base}/api/twilio/voice`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'To=%2B15555550100',
  })
  assert.equal(res.status, 404)
})

test('dial rejects a wrong passcode', async () => {
  const res = await fetch(`${base}/api/twilio/dial`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ passcode: 'wrong', to: '+15555550100' }),
  })
  assert.equal(res.status, 401)
})

test('dial rejects an invalid phone number', async () => {
  const res = await fetch(`${base}/api/twilio/dial`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ passcode: 'test-pass', to: '12345' }),
  })
  assert.equal(res.status, 400)
})

test('call-status rejects an invalid call id', async () => {
  const res = await fetch(`${base}/api/twilio/call-status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ passcode: 'test-pass', callSid: 'nope' }),
  })
  assert.equal(res.status, 400)
})

test('escapeXml escapes markup characters', () => {
  assert.equal(escapeXml('a<b & "c"'), 'a&lt;b &amp; &quot;c&quot;')
})
