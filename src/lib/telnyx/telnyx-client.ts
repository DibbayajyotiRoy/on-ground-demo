import { TelnyxRTC } from '@telnyx/webrtc'
import type { INotification } from '@telnyx/webrtc'
import type { TelnyxAuth } from './telnyx-provider'
import type { CallInfo, TelephonyClient } from '../call-types'
import type { CallTarget } from '../types'

const callStateMap: Record<string, CallInfo['phase'] | undefined> = {
  new: 'connecting',
  requesting: 'connecting',
  trying: 'connecting',
  recovering: 'connecting',
  ringing: 'ringing',
  answering: 'connecting',
  early: 'ringing',
  active: 'active',
  held: 'active',
  hangup: 'ended',
  destroy: 'ended',
  purge: 'ended',
}

export class TelnyxTelephonyClient implements TelephonyClient {
  private rtc: TelnyxRTC | null = null
  private rtcReady = false
  private readyWaiters: { resolve: () => void; reject: (err: Error) => void }[] = []
  private callConnected = false
  private expectLoopback = false
  private secondCall: INotification['call'] | null = null
  private activeCall: INotification['call'] | null = null
  private state: CallInfo
  private durationTimer: ReturnType<typeof setInterval> | null = null
  private localElement: HTMLMediaElement | null = null
  private remoteElement: HTMLMediaElement | null = null

  private getAuth: () => Promise<TelnyxAuth>
  private onState: (state: CallInfo) => void

  constructor(
    getAuth: () => Promise<TelnyxAuth>,
    onState: (state: CallInfo) => void,
  ) {
    this.getAuth = getAuth
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
    if (!this.localElement) {
      this.localElement = document.createElement('audio')
      this.localElement.autoplay = true
      this.localElement.muted = true
      document.body.appendChild(this.localElement)
    }
    if (!this.remoteElement) {
      this.remoteElement = document.createElement('audio')
      this.remoteElement.autoplay = true
      document.body.appendChild(this.remoteElement)
    }
  }

  private removeAudioElements() {
    if (this.localElement) {
      this.localElement.remove()
      this.localElement = null
    }
    if (this.remoteElement) {
      this.remoteElement.remove()
      this.remoteElement = null
    }
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

  private handleNotification(notification: INotification) {
    const call = notification.call
    if (!call) return

    const direction = call.direction === 'inbound' ? 'incoming' : 'outgoing'
    const phase = callStateMap[call.state]

    // Loopback demo: when we dialed our own Telnyx number, the inbound leg
    // arrives as a second call — answer it automatically.
    if (
      this.expectLoopback &&
      direction === 'incoming' &&
      (call.state === 'ringing' || call.state === 'early')
    ) {
      this.secondCall = call
      void call.answer({
        remoteElement: this.remoteElement!,
        localElement: this.localElement!,
      })
      return
    }

    if (phase === 'active') {
      this.callConnected = true
      if (this.state.phase !== 'active') {
        this.activeCall = call
        this.startDurationTimer()
        this.emit({ phase, direction, startedAt: Date.now() })
      }
      return this.emit({ muted: call.isAudioMuted ?? false })
    }

    if (phase === 'ended') {
      if (this.secondCall && call.id === this.secondCall.id) {
        this.secondCall = null
        void this.activeCall?.hangup()
        return
      }
      const c = call as unknown as {
        cause?: string
        sipReason?: string
        sipCode?: number
      }
      const reason = c.sipReason || c.cause
      const wasConnected = this.callConnected
      this.stopDurationTimer()
      this.callConnected = false
      this.expectLoopback = false
      this.activeCall = null
      // A call that never connected isn't an ordinary "ended" — surface why.
      if (!wasConnected && direction === 'outgoing') {
        this.emit({
          phase: 'failed',
          direction,
          error: reason
            ? `${reason} (Telnyx)`
            : 'Call rejected by the network — check the destination is enabled on your Telnyx outbound profile',
        })
      } else {
        this.emit({ phase, direction })
      }
      return
    }

    this.activeCall = call
    if (phase) this.emit({ phase, direction })
    if (call.state === 'held') this.emit({ held: true })
    this.emit({ muted: call.isAudioMuted ?? false })
  }

  async connect() {
    if (this.rtc?.connected) return

    this.emit({ phase: 'requesting-token' })
    const auth = await this.getAuth()

    this.emit({ phase: 'connecting' })
    this.ensureAudioElements()

    const options = 'loginToken' in auth
      ? { login_token: auth.loginToken }
      : { login: auth.login, password: auth.password }
    this.rtc = new TelnyxRTC(options)
    this.rtc.localElement = this.localElement!
    this.rtc.remoteElement = this.remoteElement!

    this.rtc
      .on('telnyx.ready', () => {
        this.rtcReady = true
        this.emit({ phase: 'ready' })
        this.readyWaiters.forEach((w) => w.resolve())
        this.readyWaiters = []
      })
      .on('telnyx.error', (event) => {
        const err = new Error(event?.error?.message || 'Telnyx error')
        if (!this.rtcReady) {
          this.readyWaiters.forEach((w) => w.reject(err))
          this.readyWaiters = []
        }
        this.emit({ phase: 'failed', error: err.message })
      })
      .on('telnyx.notification', (notification) => this.handleNotification(notification))

    await this.rtc.connect()

    // newCall() before the gateway registration completes is rejected by
    // Telnyx with USER_BUSY, so wait for telnyx.ready before resolving.
    if (!this.rtcReady) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.readyWaiters = this.readyWaiters.filter((w) => w.resolve !== resolve)
          reject(new Error('Timed out waiting for Telnyx registration'))
        }, 12000)
        this.readyWaiters.push({
          resolve: () => { clearTimeout(timer); resolve() },
          reject: (err) => { clearTimeout(timer); reject(err) },
        })
      })
    }
  }

  disconnect() {
    this.stopDurationTimer()
    this.activeCall = null
    this.secondCall = null
    this.callConnected = false
    this.expectLoopback = false
    this.rtc?.disconnect()
    this.rtc = null
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
    if (!this.rtc) throw new Error('Client not connected')
    this.callConnected = false
    this.expectLoopback = target.phone === import.meta.env.VITE_TELNYX_PHONE_NUMBER
    this.emit({ phase: 'connecting', direction: 'outgoing', target })
    this.activeCall = this.rtc.newCall({
      destinationNumber: target.phone,
      callerName: target.name,
      remoteElement: this.remoteElement!,
      localElement: this.localElement!,
    })
  }

  async answer() {
    if (!this.activeCall) throw new Error('No incoming call')
    await this.activeCall.answer({
      remoteElement: this.remoteElement!,
      localElement: this.localElement!,
    })
  }

  async hangup() {
    await this.activeCall?.hangup()
    if (this.secondCall) {
      await this.secondCall.hangup()
      this.secondCall = null
    }
  }

  toggleMute() {
    if (!this.activeCall) return
    this.activeCall.toggleAudioMute()
    this.emit({ muted: this.activeCall.isAudioMuted })
  }

  toggleHold() {
    if (!this.activeCall) return
    void this.activeCall.toggleHold()
    this.emit({ held: !this.state.held })
  }
}
