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

app.use('/api/telephony', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
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

app.post('/api/twilio/token', (req, res) => {
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
    // Lazy import keeps the base app fast when Twilio is unused.
    return import('twilio').then(({ default: twilio }) => {
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
    })
  } catch {
    res.status(500).json({ error: 'Token minting failed' })
  }
})

// Voice webhook invoked by Twilio when the browser initiates a call.
// Must be publicly reachable — set as the TwiML App's Voice URL.
app.all('/api/twilio/voice', (req, res) => {
  const to = req.body?.To || req.query?.To
  res.type('text/xml')
  if (!to) {
    return res.send('<Response><Say>No destination.</Say></Response>')
  }
  res.send(
    `<Response><Dial callerId="${process.env.TWILIO_PHONE_NUMBER || ''}">${to.replace(/[^+\d]/g, '')}</Dial></Response>`,
  )
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})


export default app
