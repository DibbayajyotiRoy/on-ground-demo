import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { z } from 'zod'

dotenv.config()

const app = express()

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


// --- Twilio fallback (trial accounts dial verified numbers) ---

// Trial accounts cannot <Dial> a number, but <Dial><Conference> is allowed.
// Every leg (browser softphone and phone) runs this same TwiML and joins one conference.
const CONFERENCE_TWIML = '<Response><Dial timeLimit="180"><Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="true" waitUrl="">on-ground-demo</Conference></Dial></Response>'

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

app.post('/api/twilio/token', async (req, res) => {
  if (!requirePasscode(req, res)) return
  const {
    TWILIO_ACCOUNT_SID: sid,
    TWILIO_AUTH_TOKEN: authToken,
    TWILIO_TWIML_APP_SID: appSid,
    TWILIO_API_KEY_SID: keySid,
    TWILIO_API_KEY_SECRET: keySecret,
  } = process.env
  if (!sid || !authToken || !appSid) {
    return res.status(503).json({ error: 'Twilio not configured' })
  }
  try {
    const { default: twilio } = await import('twilio')
    const AccessToken = twilio.jwt.AccessToken
    // Voice SDK tokens must be signed with an API key pair when available;
    // the account auth-token path is rejected by the gateway (20101).
    const token = new AccessToken(sid, keySid || sid, keySecret || authToken, {
      identity: 'on-ground-agent',
      ttl: 3600,
    })
    const grant = new AccessToken.VoiceGrant({
      outgoingApplicationSid: appSid,
      incomingAllow: true,
    })
    token.addGrant(grant)
    res.json({ token: token.toJwt() })
  } catch {
    res.status(500).json({ error: 'Token minting failed' })
  }
})

const phoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/)
const callSidSchema = z.string().regex(/^CA[0-9a-f]{32}$/)

app.post('/api/twilio/dial', async (req, res) => {
  if (!requirePasscode(req, res)) return
  const to = phoneSchema.safeParse(req.body?.to)
  if (!to.success) {
    return res.status(400).json({ error: 'Invalid phone number' })
  }
  const client = await twilioClient()
  const { TWILIO_ACCOUNT_SID: accountSid, TWILIO_TWIML_APP_SID: appSid } = process.env
  if (!client || !appSid) {
    return res.status(503).json({ error: 'Twilio not configured' })
  }
  try {
    // Trial accounts accept only To + Url on call creation: no From (Twilio
    // picks its assigned trial number), no inline Twiml, no TimeLimit. The Url
    // is the TwiML App's public voice webhook, so local dev needs no tunnel.
    // ponytail: a paid account must also send From (a purchased number).
    const { voiceUrl } = await client.applications(appSid).fetch()
    const r = await client.request({
      method: 'post',
      uri: `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      data: { To: to.data, Url: voiceUrl },
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
    res.json({ status: call.status })
  } catch (err) {
    res.status(502).json({ error: err.message, code: err.code })
  }
})

// Voice webhook: the TwiML App's Voice URL. Every call leg (browser and phone)
// joins the same conference. Never reads request input, so it cannot be made to
// dial arbitrary numbers.
app.all('/api/twilio/voice', (_req, res) => {
  res.type('text/xml').send(CONFERENCE_TWIML)
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})


export default app
