// Twilio Voice SDK (browser) adapter implementing the shared TelephonyClient.
// Used as a fallback when Telnyx trial limits block a destination: Twilio trial
// accounts can call numbers the owner has verified, which unlocks dialling the
// demo operator's own phone.

import { Call, Device } from '@twilio/voice-sdk'
import type { Call as TwilioCall } from '@twilio/voice-sdk'
import type { CallInfo, TelephonyClient } from '../call-types'
import type { CallTarget } from '../types'

export type TwilioAuth = { token: string }

export class TwilioTelephonyClient implements TelephonyClient {
  private device: Device | null = null
  private outgoing: TwilioCall | null = null
  private incoming: TwilioCall | null = null
  private state: CallInfo
  private durationTimer: ReturnType<typeof setInterval> | null = null
  private localElement: HTMLMediaElement | null = null
  private remoteElement: HTMLMediaElement | null = null

  private getToken: () => Promise<string>
  private onState: (state: CallInfo) => void

  constructor(
    getToken: () => Promise<string>,
    onState: (state: CallInfo) => void,
  ) {
    this.getToken = getToken
    this.onState = onState
    this.state = {
      phase: 'idle',
      direction: 'outgoing',
      durationSeconds: 0,
      muted: false,
      held: false,
    }
  }

  private emit(update: Partial<CallInfo>) {
    this.state = { ...this.state, ...update }
    this.onState({ ...this.state })
  }

  private ensureAudioElements() {
    if (!this.remoteElement) {
      this.remoteElement = document.createElement('audio')
      this.remoteElement.autoplay = true
      document.body.appendChild(this.remoteElement)
    }
    if (!this.localElement) {
      this.localElement = document.createElement('audio')
      this.localElement.autoplay = true
      this.localElement.muted = true
      document.body.appendChild(this.localElement)
    }
  }

  private removeAudioElements() {
    this.localElement?.remove()
    this.remoteElement?.remove()
    this.localElement = null
    this.remoteElement = null
  }

  private startDurationTimer() {
    this.stopDurationTimer()
    this.durationTimer = setInterval(() => {
      if (this.state.startedAt) {
        this.emit({
          durationSeconds: Math.floor((Date.now() - this.state.startedAt) / 1000),
        })
      }
    }, 1000)
  }

  private stopDurationTimer() {
    if (this.durationTimer) {
      clearInterval(this.durationTimer)
      this.durationTimer = null
    }
  }

  private wireOutgoing(call: TwilioCall, direction: 'incoming' | 'outgoing') {
    call.on('ringing', () => this.emit({ phase: 'ringing', direction }))
    call.on('accept', () => {
      this.startDurationTimer()
      this.emit({ phase: 'active', direction, startedAt: Date.now() })
    })
    call.on('mute', (muted) => this.emit({ muted }))
    call.on('error', (err) => {
      this.stopDurationTimer()
      this.emit({
        phase: 'failed',
        error: err?.message || 'Twilio call error',
      })
    })
    call.on('cancel', () => {
      // Outgoing call cancelled before connecting (busy, declined, blocked).
      if (this.state.phase !== 'active') {
        this.stopDurationTimer()
        this.emit({
          phase: 'failed',
          error: 'Call did not connect — Twilio trial can only dial verified numbers',
        })
      }
    })
    call.on('disconnect', () => {
      const wasActive = this.state.phase === 'active'
      this.stopDurationTimer()
      this.outgoing = null
      this.emit({ phase: wasActive ? 'ended' : 'failed', error: wasActive ? undefined : 'Call ended before connecting' })
    })
  }

  async connect() {
    if (this.device) return
    this.emit({ phase: 'requesting-token' })
    const token = await this.getToken()
    this.emit({ phase: 'connecting' })
    this.ensureAudioElements()

    this.device = new Device(token, {
      codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
      // Allow incoming (from verified callers dialling the Twilio number).
      closeProtection: false,
    })

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out registering Twilio device')), 15000)
      this.device!.on('registered', () => {
        clearTimeout(timer)
        this.emit({ phase: 'ready' })
        resolve()
      })
      this.device!.on('error', (err) => {
        clearTimeout(timer)
        this.emit({ phase: 'failed', error: err?.message || 'Twilio device error' })
        reject(new Error(err?.message || 'Twilio device error'))
      })
      this.device!.on('incoming', (call) => {
        this.incoming = call
        this.emit({ phase: 'incoming', direction: 'incoming' })
        this.wireOutgoing(call, 'incoming')
      })
      this.device!.register().catch((err) => {
        clearTimeout(timer)
        reject(err instanceof Error ? err : new Error(String(err)))
      })
    })
  }

  disconnect() {
    this.stopDurationTimer()
    try {
      this.outgoing?.disconnect()
      this.device?.destroy()
    } catch {
      // device may already be destroyed
    }
    this.device = null
    this.outgoing = null
    this.incoming = null
    this.removeAudioElements()
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
    if (!this.device) throw new Error('Device not connected')
    this.emit({ phase: 'connecting', direction: 'outgoing', target })
    const conn = await this.device.connect({
      params: { To: target.phone, CallerName: target.name },
    })
    this.outgoing = conn
    this.wireOutgoing(conn, 'outgoing')
  }

  async answer() {
    if (!this.incoming) throw new Error('No incoming call')
    const call = this.incoming
    this.outgoing = call
    this.incoming = null
    await call.accept()
  }

  async hangup() {
    this.outgoing?.disconnect()
    this.incoming?.reject()
    this.outgoing = null
    this.incoming = null
  }

  toggleMute() {
    if (!this.outgoing) return
    this.outgoing.mute(!this.outgoing.isMuted())
    this.emit({ muted: this.outgoing.isMuted() })
  }

  toggleHold() {
    // Twilio Voice JS SDK has no client-side hold; would need a REST-based
    // <Enqueue>/<Conference> flow. Not needed for the demo path.
    this.emit({ held: false })
  }

  sendDtmf(digits: string) {
    void this.outgoing?.sendDigits(digits)
  }
}
