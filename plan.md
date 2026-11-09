# On-Ground Call Centre demo — revised deadline plan

## Context

The assignment requires original screens plus a real browser-to-phone call, a public demo, meaningful Git history, README, and a recording of at most two minutes. At 14:05 IST on 9 November, roughly eight hours remain before the 22:06 deadline.

The architecture is sound. The main risk is not React; it is provisioning a telephony account and completing an India outbound call. The plan therefore proves telephony first, starts Git and deployment early, and cuts all nonessential scope.

## Review verdict

**Proceed with React + TypeScript, Telnyx WebRTC, Node.js, shadcn/ui, Tailwind, and EvilCharts. Keep Plivo as the fallback. Delay Pipecat until every mandatory item works.**

Accepted review changes:

- Telnyx and Plivo signups begin in parallel.
- A real phone must ring by 15:00 or implementation switches provider without further Telnyx debugging.
- Git starts immediately; commits land after each screen.
- A deployed skeleton and public real-call test happen before UI polish.
- Provider-side outbound restrictions are mandatory because a browser WebRTC JWT can dial without passing through our Node API.
- An insurance recording is captured as soon as the first local call works.
- Pipecat is optional and time-boxed; no AI work precedes the mandatory flow.

**Twilio is not added as a fallback.** The current Twilio trial explicitly blocks `<Dial><Number>`, `<Dial><Client>`, and `<Stream>`, so the suggested free browser-to-PSTN/Pipecat route is not available despite older tutorials implying otherwise. [Twilio trial restrictions](https://www.twilio.com/docs/usage/trials/try-out-voice)

Removed from the plan: AWS Connect, WhatsApp integration, a Pipecat practice bot, live transcription, advanced AI assist, and automated Playwright test matrices.

## Selected stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS.
- **UI:** shadcn/ui and Lucide, themed with measured design tokens from the mock. Do not copy its markup or CSS.
- **Charts:** EvilCharts Recharts variants for calls and CSAT. [EvilCharts](https://evilcharts.com/docs)
- **Data:** local JSON/mock modules and localStorage for messages/call outcomes; no database or external chat service.
- **Calling:** `@telnyx/webrtc` behind a provider adapter; Plivo Browser SDK if the Telnyx gate fails.
- **Backend:** Node/Express for Telephony credential tokens, demo authentication, validation, and optional AI call initiation.
- **Deployment:** deploy the frontend and token API early; Vercel is suitable for the stateless human-call backend. Use a non-sleeping persistent host only if optional Pipecat is attempted.
- **Optional AI:** Pipecat + Telnyx WebSocket + Deepgram + Gemini, only after mandatory delivery is complete.

## Immediate account setup

### Telnyx and Plivo in parallel now

**Telnyx**

1. Create an account at [Telnyx signup](https://telnyx.com/sign-up), verify email, and confirm trial credit.
2. Verify a consented mobile number we own; trial calls may target only that verified number.
3. Check documentation requirements before submitting the single permitted trial number order. Purchase one voice-capable local number if eligible.
4. Create a SIP Credential Connection named `onground-demo` and one telephony credential for the browser agent.
5. Create a server-only API key. The backend will call `POST /v2/telephony_credentials/{id}/token`; API keys, SIP passwords, and token material never reach the browser or Git.
6. Assign the number to the credential connection and configure its Outbound Voice Profile.
7. In that profile, apply the narrowest available destination/country restrictions and daily spend limit. Keep the account in trial for the demo.
8. Store server values in Git-ignored environment settings: `TELNYX_API_KEY`, `TELNYX_CONNECTION_ID`, `TELNYX_TELEPHONY_CREDENTIAL_ID`, `TELNYX_PHONE_NUMBER`, `DEMO_VERIFIED_DESTINATION`, and `DEMO_PASSCODE`.

[Telnyx trial workflow](https://developers.telnyx.com/docs/account-setup/using-trial-account) · [Trial limitations](https://developers.telnyx.com/docs/account-setup/levels-and-capabilities/trial) · [WebRTC setup](https://developers.telnyx.com/docs/development/webrtc/js-sdk/tutorials/make-your-first-call) · [JWT authentication](https://developers.telnyx.com/docs/voice/webrtc/auth/jwt)

**Plivo in parallel**

1. Create a [Plivo](https://www.plivo.com/) account; its advertised trial includes $10 credit without a card.
2. Verify the same consented destination as a sandbox number.
3. Check India voice routing and number documentation before renting a voice-enabled number.
4. If Telnyx fails the 15:00 gate, create the Plivo endpoint/application and switch the provider adapter to `plivo-browser-sdk`.

[Plivo pricing](https://www.plivo.com/pricing/) · [Plivo Browser SDK](https://www.plivo.com/docs/voice/sdk/browser/overview)

Do not create Twilio, AWS, Meta, Deepgram, Gemini, or Pipecat Cloud accounts now.

## Security controls

- Require `DEMO_PASSCODE` on `/api/telephony/token`; never hardcode it into React.
- Rate-limit token and call-initiation endpoints and return fresh credential tokens only after passcode verification.
- Use provider-side outbound destination and spend restrictions as the primary toll-fraud control. A backend destination allowlist alone cannot constrain calls made directly by the browser SDK.
- Enforce `DEMO_VERIFIED_DESTINATION` server-side for any optional AI outbound call.
- Never expose API keys, credential secrets, token material, or personal phone numbers in source, logs, screenshots, recordings, or the client bundle.

## Parallel-agent execution

The parent agent defines shared types, design tokens, app shell, state contracts, and ownership boundaries before delegation. Coder agents then work concurrently only in their assigned feature directories, while the parent performs integration, type/build fixes, and final verification.

- **Telephony agent:** owns `server/`, `src/lib/telnyx/`, and telephony state/config utilities; implements the passcode-protected token API and Telnyx adapter.
- **Dashboard agent:** owns `src/features/dashboard/` and the call-status/banner components rendered by the shell.
- **Planner agent:** owns `src/features/plan/`, `src/features/leads/`, and `src/features/calendar/`; builds ranked outgoing/incoming lists, paging, wrap-up/review, leads dialog, and month grid.
- **Pulse agent:** owns `src/features/pulse/` and channel/DM/Kudos interactions.
- **Documentation/deployment agent:** waits until integration begins, then owns deployment configuration, README setup instructions, and submission checklist.

Agents must not edit shared shell, package manifests, or another agent's files. Any cross-feature need is expressed through shared interfaces and left for parent integration. The telephony proof-of-concept remains the first integration gate; other agents continue UI work in parallel rather than waiting idle.

## Implementation and gated timeline

### 14:05–14:20 — repository and parallel provisioning

- Initialize Git, make the scaffold commit, create/push the GitHub repository.
- Start Telnyx and Plivo signup/verification in parallel.
- **Gate:** repository pushed; both provider onboarding flows underway.

### 14:20–15:00 — mandatory calling proof

- Implement the passcode-protected Telephony token endpoint.
- Register `@telnyx/webrtc`, request microphone permission from a user action, and render remote audio.
- Implement SDK-driven registering/ready/ringing/connected/ended/failed states, mute, hangup, and two-way audio.
- Call the verified real phone. A failed attempt must never appear connected.
- **Hard gate at 15:00:** if the phone is not ringing, switch to Plivo with no further Telnyx debugging. If neither provider works, report the blocker before any paid upgrade.

### 15:00–15:30 — public proof and insurance

- Deploy the minimal app and token API.
- Repeat the real call from the public HTTPS URL in Chrome.
- Record a short insurance clip showing the working local/public call and the real phone; hide personal numbers.
- Commit and push the working call flow.

### 15:30–15:45 — design foundation

- Measure the mock's font sizes, colors, radii, and spacing in DevTools and translate them into the Tailwind/shadcn theme.
- Do not copy source markup or stylesheets.

### 15:45–19:15 — all mandatory screens, committing per screen

- **Shell:** responsive navigation, top bar, notifications/profile affordances.
- **Dashboard:** KPI cards, earnings, tasks, and EvilCharts seven-day calls/CSAT charts.
- **Plan:** Calls to make ranked by score with expandable rows/paging; Incoming with value at stake and Call back on every row; Recent with type/time/duration and review.
- **Leads dialog:** open from dashboard tasks, ICP/intent scores, collapsible buying signals, previous/next paging.
- **Calendar:** month grid, event dots, Today, previous/next month.
- **Pulse:** AvaniBot, role/task agents, channels, direct messages, Kudos.
- **Pulse channel:** back navigation, pinned Needs your input card with two actions and reply box, aligned bubbles/times, and working message posting.
- **Gate at 19:15:** every must-build screen exists and is navigable.

### 19:15–19:45 — complete call integration

- Wire Place call, Call back, and keypad actions to the proven call service.
- Add call wrap-up with outcome/notes and save real attempts to Recent.
- Commit, push, redeploy, and repeat the public call.

### 19:45–21:00 — optional only

- Attempt Pipecat AI-to-human calling only if all mandatory items are complete, deployed, and verified.
- Time-box it to this window and use a host that supports the persistent Python WebSocket without sleeping.
- Otherwise use the time for mandatory bug fixes and submission preparation.
- **Gate at 21:00:** drop AI completely if not genuinely working; document the omission honestly.

### 21:00–21:35 — submission package

- Finish README: stack, local/ hosted setup, environment variables, AI tools used, and exactly how real calling works.
- Final build, deployment, real-call check, and recording under two minutes.
- Confirm public link, Git history, README, and recording are present.

### 21:35 — submit

Send to `sales@on-ground.ai` with subject `Assignment Submission: <full name>`, leaving roughly 30 minutes of buffer.

## Verification

Keep verification focused:

- Run `npm run build` and `npm run lint` on the deliverable.
- Complete one real call locally and one on the public URL; confirm two-way audio, status, mute, hangup, and wrap-up.
- Make one manual laptop-width and one phone-width pass over every required screen and interaction.
- Verify microphone-denied and failed-call states report errors honestly.
- Check the built bundle, Git history, logs, and recording for secrets/personal numbers.
- Confirm the README setup and all submission links work.

No automated Playwright matrix is required for this deadline.

## Assumptions

- The user performs provider signup, phone verification, and any identity/documentation steps; secrets are entered directly into environment settings, not chat.
- Only a consented, verified phone is called during trials.
- Telnyx/Plivo provisioning and India routing remain unverified until a real call succeeds.
- Human-to-human calling is mandatory. Pipecat and every other AI feature are expendable.
- The project scaffold already exists from the earlier Vite command; no application source has been written yet.
