# On-Ground.ai — Call Centre Demo

Browser-based call-centre workspace for a retail sales agent, built for the On-Ground
engineering assignment. Agents get a daily brief, a ranked calling plan, lead profiles,
a calendar and team chat, and the app places **real phone calls**.

**Live demo:** https://on-ground-demo.vercel.app (passcode: ask the demo operator)

## Demo: a real phone call

**Recording:** [public/demo-ai-call.m4a](public/demo-ai-call.m4a) (37 s), also playable on the
live demo's Plan screen and at https://on-ground-demo.vercel.app/demo-ai-call.m4a.

What it is: the app's AI agent ("Avani") phones a verified Indian mobile number through
Twilio and speaks Hindi; the person called replies and the agent responds. The recording is
the opening of a 118-second call with the silent pauses cut out. It starts with Twilio's
trial announcement.

How it was recorded: at the handset, on speaker, with a laptop microphone. A Twilio trial
account cannot record calls, so there is no provider-side recording (see Limitations).

The live transcript the app showed for this part of the call:

> **Avani:** नमस्ते, मैं अवनि बोल रही हूँ, On-Ground demo store से। मैं आपको पिछले हफ़्ते orthopaedic
> mattress के बारे में … कॉल कर रही हूँ।
> **Avani:** क्षमा करें, क्या आप मुझे सुन पा रहे हैं?
> **Customer:** हां हां!
> **Avani:** बढ़िया। आपको mattress में सबसे ज़रूरी क्या है: बैक सपोर्ट, साइज़, बजट या डिलीवरी की तारीख?

An earlier 102-second call on the same build ran eight agent turns with five transcribed
replies, including a correct answer to a budget question (25,800 rupees, or EMI of 2,150 a
month). That call was taken on the earpiece, so its recording has only the customer's side.

## How calling works

There are three call paths. Only the first reaches an Indian phone on free trial accounts.

### 1. AI agent phone call (Twilio + AWS Bedrock) — the demo above

```
Browser ──POST /api/twilio/dial (passcode)──► Server ──REST: To + Url──► Twilio ──► phone rings
Twilio ──POST /api/twilio/agent?exp&sig (each turn)──► Server ──► Bedrock (Nova 2 Lite) writes the next line
Twilio ◄── TwiML: <Gather input="speech" language="hi-IN"><Say voice="Polly.Kajal-Neural">…</Say></Gather>
Browser ──POST /api/twilio/call-status (poll)──► Server ──► call status + live transcript
```

1. The browser asks the server to dial. The server creates the call with Twilio's REST API.
2. When the phone is answered, Twilio fetches the agent webhook. The server asks a Bedrock
   text model for the agent's next line and answers with TwiML.
3. Twilio speaks the line in Hindi (`<Say>`), listens, transcribes the reply (`<Gather>`),
   and posts it back to the webhook. This repeats for up to eight agent turns.
4. The browser polls for the call's real status and shows the transcript as it grows.

Code: `server/phone-agent.mjs` (prompt, Bedrock call, TwiML), `server/app.mjs` (routes),
`src/lib/twilio/twilio-client.ts` (status and transcript in the UI).

### 2. Human browser softphone (Telnyx WebRTC)

With the "AI agent" switch off, the agent's own microphone is connected to the phone
network through Telnyx WebRTC (`src/lib/telnyx/`): dial, ring, two-way audio, mute, hold,
timer. On a Telnyx trial this reaches US/CA and a few other countries, not India (the
gateway answers D13). The **Test call** button dials the project's own Telnyx US number as
a loopback.

### 3. Practice with AI (Amazon Nova 2 Sonic, in the browser)

Talk to the same agent through the laptop microphone, with no phone call. This is
speech-to-speech (interruptions work) and the browser records both sides in stereo. It
needs the local server (`npm run dev:all`), which bridges the browser to Bedrock over a
WebSocket (`server/agent.mjs`, `src/lib/agent/`). It is not available on the Vercel site.

## What it took to make a Twilio trial call work

Each of these was found by testing against the live account, and each one silently broke
calling until it was fixed:

| Finding | Consequence in this project |
| --- | --- |
| Twilio posts webhooks form-encoded; the server only parsed JSON. | The first version answered every call with "No destination" and never dialled a phone. Fixed with `express.urlencoded()`. |
| A trial blocks `<Dial>` to a number, `<Dial><Client>`, `<Stream>`, `<ConversationRelay>` and all recording. | No browser-to-phone bridging, no live audio streaming, no provider recording. |
| A trial accepts only `To` and `Url` when creating a call (no `From`, `Twiml`, `TimeLimit`). | The server sends exactly those two; Twilio picks its own trial caller number. |
| Browser (Voice SDK) calls on a trial live outside the account: their call IDs are not visible to the account's API, and their conferences are separate. | A browser leg and a phone leg put in the "same" conference never hear each other. The conference design was dropped and the Voice SDK removed. |
| The trial fetches the voice webhook through a proxy with no `X-Twilio-Signature`. | Signature validation rejected every real call. The webhook is now authorised by a signed, 15-minute token in its URL. |
| The trial proxy does not resolve a relative `<Gather action>`. | The callee's reply never came back. The action is now an absolute URL. |
| A trial allows 10 webhook hops per call and 5 seconds to answer each one. | The agent is capped at eight turns; replies come from a fast model (about 1.5 s). |

## Limitations

- **Twilio trial:** calls reach verified numbers only; a trial announcement plays at the
  start of each call; 10 minutes per call and 75 voice minutes in total; no recording.
- **Recording:** the app cannot record a phone call's audio on the trial. It keeps the full
  transcript. The demo recording was made at the handset.
- **Speech recognition:** Twilio's Hindi recognition misheard some replies in the demo call.
- **Conversation state** is held in server memory per call. That is fine for one instance;
  a shared store would be needed to scale.
- **Speech-to-speech on a phone call** (Nova 2 Sonic) needs Twilio media streams, which
  require an upgraded account.
- **Telnyx trial** does not call India.

## Assignment requirements → where they live

| Requirement | Status | Where |
| --- | --- | --- |
| Daily brief + dashboard (KPIs, progress, earnings, tasks, charts) | ✅ | `src/features/dashboard/` |
| Calling plan: ranked calls-to-make, missed-call priorities, pagination | ✅ | `src/features/plan/PlanScreen.tsx` |
| Incoming calls view + answer flow | ✅ | Banner `Answer` button (Telnyx softphone) |
| Recent calls with outcomes + SOP scores, wrap-up flow | ✅ | Plan → Recent tab |
| Practise a call | ✅ | Plan → **Practice with AI** (local) and **Test call** (Telnyx loopback) |
| Keypad dialing | ✅ | Plan → Keypad (any number; a trial only rings verified ones) |
| Leads dialog (scores, journey, buying signals) | ✅ | `src/features/leads/LeadsDialog.tsx` |
| Calendar with events | ✅ | `src/features/calendar/CalendarScreen.tsx` |
| Pulse chat (channels, kudos, bot) | ✅ | `src/features/pulse/PulseScreen.tsx` |
| **Calling a real telephone number** | ✅ (trial-limited) | AI agent call over Twilio, live transcript in the app; see above |
| Honest failure states | ✅ | Failed calls show the provider's real status or error |
| Public deployment | ✅ | Vercel URL above |
| Recording of a real call | ✅ | `public/demo-ai-call.m4a` |

**Real:** the phone calls, call statuses, the agent's replies and the transcript.
**Mocked:** KPIs, leads, tasks, calendar and Pulse messages (practice data).

## Stack

React 19 + TypeScript + Vite · Tailwind v4 + shadcn/ui + Recharts · Express API
(`server/`, deployed as a Vercel function) · Twilio Programmable Voice · AWS Bedrock
(Nova 2 Lite for the phone agent, Nova 2 Sonic for practice) · `@telnyx/webrtc`.

## Security

- No provider credential reaches the browser. Dial, status and practice endpoints require
  `DEMO_PASSCODE` and are rate-limited.
- The agent webhook spends a model call per hit, so it only answers URLs carrying a signed,
  expiring token minted by the dial route. It never dials from request input.
- On Vercel, Bedrock is called with an IAM key that can invoke one model and nothing else.
- A trial account can only ring verified numbers, which is the main toll-fraud control here.

## Run locally

```bash
npm install
cp .env.example .env    # fill in the values described below
npm run dev:all         # app on :5173, API on :3001
node --test server/app.test.mjs
```

Environment:

- `DEMO_PASSCODE`: gate for all calling endpoints.
- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` (or `TWILIO_API_KEY_SID` +
  `TWILIO_API_KEY_SECRET` for REST; the auth token is still needed to sign webhook URLs).
- `PUBLIC_URL`: a public https address Twilio can reach for the agent webhook. On Vercel it
  defaults to the site's own host. Locally, point it at a tunnel or at the deployed site.
- AWS: locally the SDK uses your default AWS profile. On Vercel set
  `BEDROCK_ACCESS_KEY_ID` and `BEDROCK_SECRET_ACCESS_KEY`.
- Optional: `BEDROCK_MODEL_ID`, `BEDROCK_REGION`, `TWILIO_SAY_VOICE`, `TWILIO_SAY_RATE`,
  `NOVA_MODEL_ID`, `NOVA_REGION`, `NOVA_VOICE_ID`.
- Telnyx (softphone): `TELNYX_API_KEY`, `TELNYX_SIP_USERNAME`, `TELNYX_SIP_PASSWORD`,
  `VITE_TELNYX_PHONE_NUMBER`.

Twilio setup: create a trial account, verify the phone number you want to call
(Console → Verified Caller IDs), and copy the account SID and auth token. Nothing else
needs configuring: the server passes the webhook URL when it creates each call.

## Not built

Speech-to-speech on the phone line (needs a paid Twilio account) · provider-side call
recording · a Plivo adapter.
