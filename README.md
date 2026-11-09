# On-Ground.ai — Call Centre Demo

Browser-based call-centre workspace for a retail sales agent, built for the On-Ground
engineering assignment. Agents get a daily brief, ranked calling plan, lead profiles,
calendar, and team chat — and can make **real phone calls from the browser** via
Telnyx WebRTC.

**Live demo:** https://on-ground-demo.vercel.app (passcode: ask the demo operator)

## Assignment requirements → where they live

| OnGround requirement | Status | Where |
| --- | --- | --- |
| Daily brief + dashboard (KPIs, progress, earnings, tasks, charts) | ✅ | `src/features/dashboard/` |
| Calling plan: ranked calls-to-make, missed-call priorities, pagination | ✅ | `src/features/plan/PlanScreen.tsx` |
| Incoming calls view + answer flow | ✅ | Banner `Answer` button, `TelnyxTelephonyClient.answer()` |
| Recent calls with outcomes + SOP scores, wrap-up flow | ✅ | Plan → Recent tab |
| Practise/test a call | ✅ | Plan → **Test call** (real PSTN loopback through Telnyx US number) |
| Keypad dialing | ✅ | Plan → Keypad sheet |
| Leads dialog (scores, journey, buying signals) | ✅ | `src/features/leads/LeadsDialog.tsx` |
| Calendar with events | ✅ | `src/features/calendar/CalendarScreen.tsx` |
| Pulse chat (channels, kudos, bot) | ✅ | `src/features/pulse/PulseScreen.tsx` |
| **Real browser → phone calling** | ✅ (trial-limited) | `src/lib/telnyx/` — Telnyx WebRTC, mute/hold/timer/hangup; trial tier allows US/CA/verified numbers only (documented below) |
| Honest failure states | ✅ | Failed calls show the gateway's real reason (D13/D60 codes) |
| Public deployment | ✅ | Vercel URL above |
| Original code, git history, README | ✅ | This repo |
| Screen recording of the call | ✅ | See submission email |

## What's real vs. mocked

- **Real:** browser ↔ PSTN calls (dial, ring, two-way audio, mute, hold, timer) via
  Telnyx WebRTC; SIP login/token flow; call states.
- **Mocked:** KPIs, leads, tasks, calendar, pulse messages (practice data).

A failed call always shows an honest **failed** state — the demo never fakes "connected".

## Stack

React 19 + TypeScript + Vite · Tailwind v4 + shadcn/ui (Base UI) + Recharts ·
Express API (`server/`, runs as Vercel serverless functions) · `@telnyx/webrtc` ·
mock data in `localStorage`.

```
Browser ──POST /api/telephony/* (passcode-gated)──► Server ──► Telnyx (SIP creds / token)
Browser ◄──────── SIP login / WebRTC login token ◄─────────────┘
TelnyxRTC ◄─────────────────── call signaling / audio ────────────────────► Telnyx ◄─► PSTN
```

- `server/app.mjs` — Express app: `/api/telephony/token` (paid accounts) and
  `/api/telephony/sip-credentials` (trial accounts; Telnyx gates the token API behind
  an upgrade — error 10038). Passcode-gated, rate-limited, helmet, zod.
- `src/lib/telnyx/` — provider-agnostic `TelephonyClient` + Telnyx implementation.
  `connect()` waits for `telnyx.ready` before dialing (prevents USER_BUSY rejects).
- `src/App.tsx` — shell (sidebar + mobile tabs), passcode dialog, call wiring.
- `src/features/` — Dashboard, Plan (keypad, wrap-up), Calendar, Pulse, Leads.

## Security

- Telnyx API key and SIP credentials **never reach the client bundle** — the browser
  gets at most a short-lived WebRTC login token or the SIP user/pass, both gated
  behind `DEMO_PASSCODE` + rate limit.
- Restrict destinations + set a spend cap on the Telnyx Outbound Voice Profile before
  sharing the URL (a WebRTC client can dial any number the profile allows).

## Run locally

```bash
npm install
cp .env.example .env   # fill in: DEMO_PASSCODE, TELNYX_API_KEY,
                       # TELNYX_SIP_USERNAME / TELNYX_SIP_PASSWORD (trial)
npm run dev:all          # app :5173, api :3001
```

Scripts: `dev` (vite) · `dev:server` (api) · `dev:all` · `build` · `start` (serve dist+api) · `lint`.

## Telnyx setup (5 min)

1. Portal → **Voice → SIP Connections** → add a **Credentials** connection.
2. On it → **Credentials** tab → add a user/pass → put them in `.env`.
3. **Numbers** → buy a number → assign it to the connection (caller ID).
4. **Voice → Outbound Voice Profiles** → enable the countries you'll call.
5. Trial tier: US/CA/AU/SG/DE/FR/NL/JP/HK allowed; **India needs a card on file**
   (pay-as-you-go, no monthly fee). Indian numbers require DoT-KYC providers
   (Exotel/CallHippo) — hence the US-number demo path.

## Screens

**Dashboard** (brief, KPIs, charts, quick dial) · **Plan** (ranked leads, missed-call
priorities, recent calls, keypad, live call status) · **Calendar** (month view, call
events) · **Pulse** (team channels, kudos, bot) · **Leads** (profiles, scores, journey).

## Not built (out of scope)

Pipecat voice-AI agent · Plivo adapter (interface ready) · India outbound without
card.
