// Twilio adapter implementing the shared TelephonyClient. The browser carries no
// audio here: the server dials the phone and the AI agent speaks over TwiML
// (server/phone-agent.mjs). This client shows status and the live transcript.

import type { CallInfo, TelephonyClient, TranscriptLine } from '../call-types'
import type { CallTarget } from '../types'

const POLL_MS = 1500
const FAILED_STATUSES = ['busy', 'failed', 'no-answer', 'canceled']

interface ApiResponse {
  error?: string
  callSid?: string
  status?: string
  transcript?: TranscriptLine[]
}

export class TwilioTelephonyClient implements TelephonyClient {
  private state: CallInfo = {
    phase: 'idle',
    direction: 'outgoing',
    durationSeconds: 0,
    muted: false,
    held: false,
  }
  private callSid?: string
  private wasActive = false
  private poll?: ReturnType<typeof setInterval>
  private timer?: ReturnType<typeof setInterval>

  private getPasscode: () => string | null
  private onState: (state: CallInfo) => void

  constructor(getPasscode: () => string | null, onState: (state: CallInfo) => void) {
    this.getPasscode = getPasscode
    this.onState = onState
  }

  private emit(update: Partial<CallInfo>) {
    this.state = { ...this.state, ...update }
    this.onState({ ...this.state })
  }

  private async post(path: string, body: Record<string, unknown>) {
    const passcode = this.getPasscode()
    if (!passcode) throw new Error('Demo passcode required')
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode, ...body }),
    })
    const data = (await res.json().catch(() => ({}))) as ApiResponse
    return { ok: res.ok, status: res.status, data }
  }

  private stopTimers() {
    if (this.poll) clearInterval(this.poll)
    if (this.timer) clearInterval(this.timer)
    this.poll = undefined
    this.timer = undefined
  }

  // Stops polling and emits the final state for this call.
  private end(update: Partial<CallInfo>) {
    this.stopTimers()
    this.callSid = undefined
    this.emit(update)
  }

  private async tick() {
    const callSid = this.callSid
    if (!callSid) return
    const res = await this.post('/api/twilio/call-status', { callSid }).catch(() => null)
    if (!res?.ok || !this.callSid) return
    const { status, transcript, error } = res.data

    if (status === 'queued' || status === 'ringing') {
      this.emit({ phase: 'ringing' })
    } else if (status === 'in-progress') {
      if (!this.wasActive) {
        this.wasActive = true
        this.emit({ phase: 'active', startedAt: Date.now() })
        this.timer = setInterval(() => {
          if (this.state.startedAt) {
            this.emit({ durationSeconds: Math.floor((Date.now() - this.state.startedAt) / 1000) })
          }
        }, 1000)
      }
      if (transcript && transcript.length !== this.state.transcript?.length) this.emit({ transcript })
      if (error) this.emit({ error })
    } else if (status === 'completed' && this.wasActive) {
      this.end({ phase: 'ended', transcript, error })
    } else if (status === 'completed' || (status && FAILED_STATUSES.includes(status))) {
      this.end({ phase: 'failed', transcript, error: `Phone did not connect (${status})` })
    }
  }

  async connect() {}

  disconnect() {
    void this.hangup()
    this.emit({
      phase: 'idle',
      direction: 'outgoing',
      durationSeconds: 0,
      startedAt: undefined,
      target: undefined,
      error: undefined,
      muted: false,
      held: false,
    })
  }

  async call(target: CallTarget) {
    this.stopTimers()
    this.wasActive = false
    this.callSid = undefined
    this.emit({
      phase: 'connecting',
      direction: 'outgoing',
      target,
      mode: 'ai',
      transcript: [],
      recordingUrl: undefined,
      error: undefined,
      durationSeconds: 0,
      startedAt: undefined,
      muted: false,
    })

    const to = target.phone.replace(/(?!^\+)\D/g, '')
    let callSid: string
    try {
      const dial = await this.post('/api/twilio/dial', { to })
      if (!dial.ok || !dial.data.callSid) {
        throw new Error(dial.data.error ?? `Could not dial (HTTP ${dial.status})`)
      }
      callSid = dial.data.callSid
    } catch (err) {
      this.emit({ phase: 'failed', error: err instanceof Error ? err.message : 'Could not start call' })
      return
    }

    // Hung up while dialling: the phone must not ring on.
    if (this.state.phase !== 'connecting') {
      await this.post('/api/twilio/call-status', { callSid, hangup: true }).catch(() => {})
      return
    }
    this.callSid = callSid
    this.emit({ phase: 'ringing' })
    this.poll = setInterval(() => void this.tick(), POLL_MS)
  }

  async hangup() {
    const callSid = this.callSid
    this.end({ phase: 'ended' })
    if (callSid) await this.post('/api/twilio/call-status', { callSid, hangup: true }).catch(() => {})
  }

  // The browser carries no audio on these calls, so these are no-ops.
  async answer() {}
  toggleMute() {}
  toggleHold() {}
  sendDtmf() {}
}
