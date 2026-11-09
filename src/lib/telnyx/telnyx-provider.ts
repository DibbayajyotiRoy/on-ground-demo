import type { CallInfo, TelephonyProvider } from '../call-types'
import { TelnyxTelephonyClient } from './telnyx-client'

export type TelnyxAuth =
  | { loginToken: string }
  | { login: string; password: string }

export function createTelnyxProvider(getAuth: () => Promise<TelnyxAuth>): TelephonyProvider {
  return {
    createClient(onState: (state: CallInfo) => void) {
      return new TelnyxTelephonyClient(getAuth, onState)
    },
  }
}
