import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

process.env.DEMO_PASSCODE = 'test-pass'
process.env.TWILIO_ACCOUNT_SID = 'ACtest'
process.env.TWILIO_AUTH_TOKEN = 'x'
process.env.TWILIO_PHONE_NUMBER = '+15005550006'

const { default: app } = await import('./app.mjs')

let server
let base

before(async () => {
  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})

after(() => new Promise((resolve) => server.close(resolve)))

async function assertConferenceTwiml(res) {
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type'), /^text\/xml/)
  const text = await res.text()
  assert.match(text, /<Conference/)
  assert.doesNotMatch(text, /5555550100/)
}

test('voice webhook (form POST) returns conference TwiML and ignores To', async () => {
  const res = await fetch(`${base}/api/twilio/voice`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'To=%2B15555550100',
  })
  await assertConferenceTwiml(res)
})

test('voice webhook (GET query) returns conference TwiML and ignores To', async () => {
  const res = await fetch(`${base}/api/twilio/voice?To=%2B15555550100`)
  await assertConferenceTwiml(res)
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
