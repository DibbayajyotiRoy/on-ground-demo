import type { CallTarget } from './types'

export type CallPhase =
  | 'idle'
  | 'requesting-token'
  | 'connecting'
  | 'ready'
  | 'ringing'
  | 'active'
  | 'incoming'
  | 'ended'
  | 'failed'

export interface CallInfo {
  phase: CallPhase
  direction: 'incoming' | 'outgoing'
  target?: CallTarget
  startedAt?: number
  durationSeconds: number
  muted: boolean
  held: boolean
  error?: string
}

export interface TelephonyClient {
  connect(): Promise<void>
  disconnect(): void
  call(target: CallTarget): Promise<void>
  answer(): Promise<void>
  hangup(): Promise<void>
  toggleMute(): void
  toggleHold(): void
  sendDtmf(digits: string): void
}

export interface TelephonyProvider {
  createClient(onState: (state: CallInfo) => void): TelephonyClient
}

export const initialCallState: CallInfo = {
  phase: 'idle',
  direction: 'outgoing',
  durationSeconds: 0,
  muted: false,
  held: false,
}
