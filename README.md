# On-Ground.ai — Call Centre Demo

A browser-based call-centre workspace for a mattress retail sales agent, built for the
On-Ground engineering assignment. Agents get a daily brief, a ranked calling plan, lead
profiles, a calendar, and a team-chat pulse view — and can place **real telephone calls**
from the browser via Telnyx WebRTC.

## What's real vs. mocked

| Area | Status |
| --- | --- |
| Browser → PSTN phone calls (place, ring, answer audio, mute, hold, hang up, duration) | **Real** — Telnyx WebRTC |
| Telephony credentials & API keys | Server-side only, never in the bundle |
| Dashboard KPIs, leads, tasks, calendar events, pulse messages | Mocked practice data (clearly labelled) |

A failed or unauthenticated call always shows an honest **failed** state — the demo never
pretends a call connected.

## Stack

- **Frontend:** React 19 + TypeScript + Vite, Tailwind CSS v4, shadcn/ui (Base UI), Recharts
- **Telephony:** `@telnyx/webrtc` (SIP credential login tokens minted by the backend)
- **Backend:** Express 5 (`server/index.mjs`) — token endpoint with passcode gate, rate
  limiting, helmet, zod validation; serves the built SPA in production
- **Data:** local mock modules + `localStorage` (pulse channels persist across reloads)

## Architecture

```
Browser (React)                Express server (Node)              Telnyx
────────────────────────────────────────────────────────────────────────────
Place call ──► POST /api/telephony/token (passcode) ──► mints WebRTC login token
      │                                                   (TELNYX_API_KEY +
      ◄── short-lived JWT ◄──                             credential ID)
TelnyxRTC connects with login_token, places call to target.phone (E.164)
SDK call-state notifications ──► CallInfo state ──► banner + plan screen
```

- `src/lib/call-types.ts` — provider-agnostic `TelephonyClient`/`TelephonyProvider`
  interfaces, so Plivo (or another WebRTC SIP provider) can be swapped in without
  touching UI code.
- `src/lib/telnyx/` — Telnyx implementation (SDK state machine → `CallInfo` phases,
  duration timer, mute/hold toggles, remote/local audio elements).
- `src/App.tsx` — app shell (sidebar + mobile tab bar), passcode dialog, call lifecycle
  wiring shared by all screens.

## Security notes

- The Telnyx API key **never reaches the browser**; the frontend only receives a
  short-lived WebRTC login token, gated behind `DEMO_PASSCODE` and rate-limited
  (20 requests / 15 min / IP).
- Because a browser holding a WebRTC token can dial any number the outbound profile
  allows, also restrict destinations and set a daily spend cap in the **Telnyx portal**
  (Outbound Voice Profile) before sharing a public URL.

## Getting started

```bash
npm install
cp .env.example .env        # fill in DEMO_PASSCODE + Telnyx values
npm run dev:all             # Vite (5173) + API server (3001), /api proxied
```

Open http://localhost:5173, go to **Plan**, hit **Place call** on a lead, and enter the
demo passcode when prompted.

For a production-style run:

```bash
npm run build && npm start  # serves dist/ + API on PORT (default 3001)
```

### Telnyx setup (summary)

1. Create a Telnyx account, buy/provision a number, and enable **Voice**.
2. Create a **SIP Credential Connection** (WebRTC) and a telephony credential for the
   agent; note the credential ID.
3. Copy `TELNYX_API_KEY`, `TELNYX_TELEPHONY_CREDENTIAL_ID`, and `DEMO_PASSCODE` into `.env`.
4. Trial accounts may need to verify outbound destinations and enable India/geo
   permissions on the outbound profile — check the portal before demoing.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server only |
| `npm run dev:server` | API server only |
| `npm run dev:all` | Both, concurrently |
| `npm run build` | Type-check + production build |
| `npm run start` | Serve production build + API |
| `npm run lint` | oxlint |

## Screens

- **Dashboard** — daily brief, KPIs, progress, earnings, waiting leads, tasks, 7-day
  charts, quick dial.
- **Plan** — ranked calls-to-make with lead details, missed-call prioritisation, recent
  calls with outcomes/SOP scores, dial keypad, live call status, wrap-up review.
- **Calendar** — month view with events; call events link back to leads.
- **Pulse** — team channels, kudos, custom agents, AvaniBot brief/Q&A (local mock).
- **Leads** — swipeable lead profiles with ICP/intent/expected value, journey and buying
  signals.

## Future work (out of current scope)

- Pipecat voice-AI agent for the "practice a call" flow (optional per assignment).
- Plivo provider adapter (interface already in place).
