import type { CallInfo, TelephonyProvider } from '../call-types'
import { TelnyxTelephonyClient } from './telnyx-client'

export function createTelnyxProvider(getToken: () => Promise<string>): TelephonyProvider {
  return {
    createClient(onState: (state: CallInfo) => void) {
      return new TelnyxTelephonyClient(getToken, onState)
    },
  }
}
