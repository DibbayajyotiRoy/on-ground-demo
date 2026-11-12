// Talk to the AI through the laptop microphone with no phone call, so it
// costs no Twilio minutes. Implements the shared TelephonyClient.

import { initialCallState, type CallInfo, type TelephonyClient } from '../call-types'
import type { CallTarget } from '../types'
import { startStereoRecorder } from '../recorder'
import { createVoiceAgent, type VoiceAgent } from './voice-agent'

export class PracticeClient implements TelephonyClient {
  private state: CallInfo = initialCallState
  private agent: VoiceAgent | null = null
  private mic: MediaStream | null = null
  private recorder: { stop(): Promise<Blob> } | null = null
  private timer: ReturnType<typeof setInterval> | null = null

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

  // Stops everything and emits the final state; a recording is kept when one was made.
  private async end(error?: string) {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.agent?.stop()
    this.agent = null
    this.mic?.getTracks().forEach((t) => t.stop())
    this.mic = null
    const recorder = this.recorder
    this.recorder = null
    const blob = await recorder?.stop().catch(() => null)
    const recordingUrl = blob ? URL.createObjectURL(blob) : undefined
    this.emit({ phase: error ? 'failed' : 'ended', error, recordingUrl })
  }

  async connect() {}

  disconnect() {
    void this.hangup()
  }

  async call(target: CallTarget) {
    if (this.state.recordingUrl) URL.revokeObjectURL(this.state.recordingUrl)
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
    try {
      const passcode = this.getPasscode()
      if (!passcode) throw new Error('Demo passcode required')
      this.mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      const agent = createVoiceAgent({
        passcode,
        onTranscript: (line) => this.emit({ transcript: [...(this.state.transcript ?? []), line] }),
        onError: (message) => this.emit({ error: message }),
      })
      this.agent = agent
      await agent.start(this.mic)
      agent.greet()
      this.recorder = startStereoRecorder(agent.output, this.mic)
      const startedAt = Date.now()
      this.emit({ phase: 'active', startedAt })
      this.timer = setInterval(() => {
        this.emit({ durationSeconds: Math.floor((Date.now() - startedAt) / 1000) })
      }, 1000)
    } catch (err) {
      await this.end(err instanceof Error ? err.message : 'Could not start practice call')
    }
  }

  async answer() {}

  async hangup() {
    await this.end()
  }

  toggleMute() {
    const track = this.mic?.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    this.emit({ muted: !track.enabled })
  }

  toggleHold() {}

  sendDtmf() {}
}
