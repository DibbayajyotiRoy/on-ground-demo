import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { z } from 'zod'
import { getCall, nextTwiml } from './phone-agent.mjs'

dotenv.config()

const app = express()
// Behind Vercel's proxy the client address is in X-Forwarded-For; without this
// every caller shares one rate-limit bucket.
app.set('trust proxy', 1)

app.use(helmet())
app.use(cors({
  // In production the SPA and API are same-origin, so CORS is moot; reflect the
  // request origin rather than pinning a dev URL.
  origin: process.env.NODE_ENV === 'production' ? true : (process.env.VITE_DEV_ORIGIN || 'http://localhost:5173'),
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.use('/api/telephony', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
}))

app.use('/api/twilio', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
}))

app.use('/api/twilio/dial', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
}))

const tokenBodySchema = z.object({
  passcode: z.string(),
})

app.post('/api/telephony/token', async (req, res) => {
  const parsed = tokenBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid body' })
  }

  const { passcode } = parsed.data

  if (!process.env.DEMO_PASSCODE) {
    return res.status(503).json({ error: 'Service unavailable' })
  }

  if (passcode !== process.env.DEMO_PASSCODE) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!process.env.TELNYX_API_KEY || !process.env.TELNYX_TELEPHONY_CREDENTIAL_ID) {
    return res.status(503).json({ error: 'Service unavailable' })
  }

  try {
    const response = await fetch(
      `https://api.telnyx.com/v2/telephony_credentials/${process.env.TELNYX_TELEPHONY_CREDENTIAL_ID}/token`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    )

    if (!response.ok) {
      return res.status(502).json({ error: 'Upstream error' })
    }

    const data = await response.json()
    const loginToken = data.data?.token || data.token || data.login_token

    if (!loginToken) {
      return res.status(502).json({ error: 'Upstream error' })
    }

    res.json({ token: loginToken })
  } catch {
    res.status(502).json({ error: 'Upstream error' })
  }
})

// Trial-tier Telnyx accounts cannot mint telephony-credential tokens (feature
// 10038), so the browser can instead log in directly with the SIP credential
// user/pass stored server-side. Tokens remain the preferred path when available.
app.post('/api/telephony/sip-credentials', (req, res) => {
  const parsed = tokenBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid body' })
  }

  if (!process.env.DEMO_PASSCODE) {
    return res.status(503).json({ error: 'Service unavailable' })
  }

  if (parsed.data.passcode !== process.env.DEMO_PASSCODE) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const username = process.env.TELNYX_SIP_USERNAME
  const password = process.env.TELNYX_SIP_PASSWORD

  if (!username || !password) {
    return res.status(503).json({ error: 'Service unavailable' })
  }

  res.json({ username, password })
})


// --- Twilio (trial accounts dial verified numbers; the AI agent speaks on the phone line) ---

function requirePasscode(req, res) {
  const parsed = tokenBodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid body' })
    return null
  }
  if (!process.env.DEMO_PASSCODE) {
    res.status(503).json({ error: 'Service unavailable' })
    return null
  }
  if (parsed.data.passcode !== process.env.DEMO_PASSCODE) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }
  return parsed.data
}

// Returns a Twilio REST client, or null when the required env is missing.
async function twilioClient() {
  const {
    TWILIO_ACCOUNT_SID: accountSid,
    TWILIO_AUTH_TOKEN: authToken,
    TWILIO_API_KEY_SID: keySid,
    TWILIO_API_KEY_SECRET: keySecret,
  } = process.env
  if (!accountSid || !((keySid && keySecret) || authToken)) return null
  // Lazy import keeps the base app fast when Twilio is unused.
  const { default: twilio } = await import('twilio')
  return keySid && keySecret
    ? twilio(keySid, keySecret, { accountSid })
    : twilio(accountSid, authToken)
}

// Public base URL that Twilio can reach (webhook URL and signature check use it).
function publicUrl(req) {
  return process.env.PUBLIC_URL?.replace(/\/$/, '') || `https://${req.get('host')}`
}

const phoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/)
const callSidSchema = z.string().regex(/^CA[0-9a-f]{32}$/)

app.post('/api/twilio/dial', async (req, res) => {
  if (!requirePasscode(req, res)) return
  const to = phoneSchema.safeParse(req.body?.to)
  if (!to.success) {
    return res.status(400).json({ error: 'Invalid phone number' })
  }
  const client = await twilioClient()
  if (!client) {
    return res.status(503).json({ error: 'Twilio not configured' })
  }
  try {
    // Trial accounts accept only To + Url on call creation: no From, no inline Twiml.
    // Twilio fetches Url once the phone answers and then on every AI turn.
    // ponytail: a paid account must also send From (a purchased number).
    const r = await client.request({
      method: 'post',
      uri: `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Calls.json`,
      data: { To: to.data, Url: `${publicUrl(req)}/api/twilio/agent` },
    })
    const body = typeof r.body === 'string' ? JSON.parse(r.body) : r.body
    if (r.statusCode >= 300) {
      return res.status(502).json({ error: body.message, code: body.code })
    }
    res.json({ callSid: body.sid })
  } catch (err) {
    res.status(502).json({ error: err.message, code: err.code })
  }
})

// Twilio webhook for the AI agent: every turn of a phone call arrives here, and
// each turn spends a Bedrock call, so only requests signed by Twilio are answered.
async function handleAgentWebhook(req, res) {
  const { default: twilio } = await import('twilio')
  const valid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN ?? '',
    req.get('x-twilio-signature') ?? '',
    publicUrl(req) + req.originalUrl,
    req.body,
  )
  if (!valid) {
    // Names only, never values: enough to diagnose a signature mismatch.
    console.warn('twilio signature rejected', JSON.stringify({
      url: publicUrl(req) + req.originalUrl,
      hasSignature: !!req.get('x-twilio-signature'),
      contentType: req.get('content-type'),
      params: Object.keys(req.body ?? {}),
      twilioHeaders: Object.keys(req.headers).filter((h) => /twilio/i.test(h)),
    }))
    return res.status(403).type('text/plain').send('Forbidden')
  }
  res.type('text/xml').send(await nextTwiml(req.body.CallSid, req.body.SpeechResult))
}

app.post('/api/twilio/agent', handleAgentWebhook)
// The Twilio number's inbound webhook: a verified caller also reaches the agent.
app.post('/api/twilio/voice', handleAgentWebhook)

app.post('/api/twilio/call-status', async (req, res) => {
  if (!requirePasscode(req, res)) return
  const callSid = callSidSchema.safeParse(req.body?.callSid)
  if (!callSid.success) {
    return res.status(400).json({ error: 'Invalid call id' })
  }
  const client = await twilioClient()
  if (!client) {
    return res.status(503).json({ error: 'Twilio not configured' })
  }
  try {
    const call = req.body.hangup === true
      ? await client.calls(callSid.data).update({ status: 'completed' })
      : await client.calls(callSid.data).fetch()
    const { transcript = [], error } = getCall(callSid.data) ?? {}
    res.json({ status: call.status, transcript, error })
  } catch (err) {
    res.status(502).json({ error: err.message, code: err.code })
  }
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})


export default app
