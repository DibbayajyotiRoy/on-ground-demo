import { useCallback, useEffect, useRef, useState } from 'react'
import { Calendar, LayoutDashboard, MessagesSquare, Phone, KeyRound } from 'lucide-react'
import { DashboardScreen } from '@/features/dashboard/DashboardScreen'
import { PlanScreen } from '@/features/plan/PlanScreen'
import { CalendarScreen } from '@/features/calendar/CalendarScreen'
import { PulseScreen } from '@/features/pulse/PulseScreen'
import { LeadsDialog } from '@/features/leads/LeadsDialog'
import { CallStatusBanner } from '@/components/call-status-banner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { AppView, CallTarget } from '@/lib/types'
import { initialCallState, type CallInfo, type TelephonyClient } from '@/lib/call-types'
import { createTelnyxProvider } from '@/lib/telnyx/telnyx-provider'
import { cn } from '@/lib/utils'

const NAV_ITEMS: { view: AppView; label: string; icon: typeof LayoutDashboard }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'plan', label: 'Plan', icon: Phone },
  { view: 'calendar', label: 'Calendar', icon: Calendar },
  { view: 'pulse', label: 'Pulse', icon: MessagesSquare },
]

const PASSCODE_KEY = 'demo_passcode'

async function postJson(path: string, passcode: string): Promise<Response> {
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode }),
  })
}

// Trial-tier Telnyx accounts cannot mint telephony-credential tokens (error
// 10038), so try SIP user/pass login first and fall back to a login token
// when the account supports it.
const provider = createTelnyxProvider(async () => {
  const passcode = sessionStorage.getItem(PASSCODE_KEY)
  if (!passcode) throw new Error('Demo passcode required')

  const sipRes = await postJson('/api/telephony/sip-credentials', passcode)
  if (sipRes.ok) {
    const data = (await sipRes.json()) as { username?: string; password?: string }
    if (data.username && data.password) {
      return { login: data.username, password: data.password }
    }
  } else if (sipRes.status === 401) {
    sessionStorage.removeItem(PASSCODE_KEY)
    throw new Error('Unauthorized')
  }

  const tokenRes = await postJson('/api/telephony/token', passcode)
  if (!tokenRes.ok) {
    const body = (await tokenRes.json().catch(() => null)) as { error?: string } | null
    if (tokenRes.status === 401) sessionStorage.removeItem(PASSCODE_KEY)
    throw new Error(body?.error ?? `Token request failed (${tokenRes.status})`)
  }
  const data = (await tokenRes.json()) as { token?: string }
  if (!data.token) throw new Error('No token in response')
  return { loginToken: data.token }
})

export default function App() {
  const [view, setView] = useState<AppView>('dashboard')
  const [call, setCall] = useState<CallInfo>(initialCallState)
  const [leadsOpen, setLeadsOpen] = useState(false)
  const [leadId, setLeadId] = useState<string | undefined>(undefined)
  const [passcodeOpen, setPasscodeOpen] = useState(false)
  const [passcodeInput, setPasscodeInput] = useState('')
  const [passcodeError, setPasscodeError] = useState<string | undefined>(undefined)
  const [pendingTarget, setPendingTarget] = useState<CallTarget | null>(null)

  const clientRef = useRef<TelephonyClient | null>(null)
  const callRef = useRef(call)
  useEffect(() => {
    callRef.current = call
  }, [call])

  useEffect(() => {
    return () => clientRef.current?.disconnect()
  }, [])

  const openLeads = useCallback((id?: string) => {
    setLeadId(id)
    setLeadsOpen(true)
  }, [])

  const initiateCall = useCallback(async (target: CallTarget) => {
    setView('plan')
    try {
      if (!clientRef.current) {
        clientRef.current = provider.createClient(setCall)
      }
      const client = clientRef.current
      if (callRef.current.phase === 'idle' || callRef.current.phase === 'failed' || callRef.current.phase === 'ended' || callRef.current.phase === 'ready') {
        await client.connect()
      }
      await client.call(target)
    } catch (err) {
      setCall((c) => ({
        ...c,
        phase: 'failed',
        target,
        error: err instanceof Error ? err.message : 'Could not start call',
      }))
    }
  }, [])

  const startCall = useCallback((target: CallTarget) => {
    if (callRef.current.phase === 'active' || callRef.current.phase === 'ringing' || callRef.current.phase === 'incoming') {
      return
    }
    if (!sessionStorage.getItem(PASSCODE_KEY)) {
      setPendingTarget(target)
      setPasscodeInput('')
      setPasscodeError(undefined)
      setPasscodeOpen(true)
      return
    }
    void initiateCall(target)
  }, [initiateCall])

  const submitPasscode = useCallback(() => {
    const value = passcodeInput.trim()
    if (!value) {
      setPasscodeError('Enter the demo passcode')
      return
    }
    sessionStorage.setItem(PASSCODE_KEY, value)
    setPasscodeOpen(false)
    if (pendingTarget) {
      const target = pendingTarget
      setPendingTarget(null)
      void initiateCall(target)
    }
  }, [passcodeInput, pendingTarget, initiateCall])

  const endCall = useCallback(() => {
    void clientRef.current?.hangup()
  }, [])

  const toggleMute = useCallback(() => {
    clientRef.current?.toggleMute()
  }, [])

  const toggleHold = useCallback(() => {
    clientRef.current?.toggleHold()
  }, [])

  const callActive =
    call.phase !== 'idle' && call.phase !== 'ended' && call.phase !== 'failed'

  const nav = (
    <>
      {NAV_ITEMS.map(({ view: v, label, icon: Icon }) => (
        <button
          key={v}
          onClick={() => setView(v)}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
            view === v
              ? 'bg-white/10 font-bold text-white'
              : 'font-medium text-white/70 hover:bg-white/5 hover:text-white',
          )}
        >
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg',
              view === v ? 'bg-[#2fbf94] text-white' : 'bg-white/10 text-white/80',
            )}
          >
            <Icon className="size-4" />
          </span>
          {label}
        </button>
      ))}
    </>
  )

  return (
    <div className="min-h-svh bg-[#faf9f7]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col gap-1 bg-gradient-to-b from-[#123c30] to-[#0d2e26] p-3 shadow-lg md:flex">
        <div className="px-3 pt-2 pb-5 text-base font-extrabold text-white">On-Ground.ai</div>
        {nav}
      </aside>

      <div className="md:pl-56">
        <CallStatusBanner
          call={call}
          onEnd={endCall}
          onToggleMute={toggleMute}
          onToggleHold={toggleHold}
        />
        <main className={cn('pb-20 md:pb-0', callActive && 'pt-0')}>
          {view === 'dashboard' && (
            <DashboardScreen onOpenLeads={openLeads} onStartCall={startCall} />
          )}
          {view === 'plan' && (
            <PlanScreen call={call} onStartCall={startCall} onOpenLeads={openLeads} />
          )}
          {view === 'calendar' && <CalendarScreen onStartCall={startCall} />}
          {view === 'pulse' && <PulseScreen onStartCall={startCall} />}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-black/10 bg-white/95 backdrop-blur md:hidden">
        {NAV_ITEMS.map(({ view: v, label, icon: Icon }) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]',
              view === v ? 'font-bold text-[#0f6e56]' : 'text-gray-500',
            )}
          >
            <Icon className="size-5" />
            {label}
          </button>
        ))}
      </nav>

      <LeadsDialog
        open={leadsOpen}
        leadId={leadId}
        onOpenChange={setLeadsOpen}
        onStartCall={startCall}
      />

      <Dialog open={passcodeOpen} onOpenChange={setPasscodeOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-4" /> Demo passcode
            </DialogTitle>
            <DialogDescription>
              Enter the demo passcode to enable live calling. The token request is rate-limited
              and your Telnyx credentials never leave the server.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              submitPasscode()
            }}
          >
            <Input
              type="password"
              autoFocus
              value={passcodeInput}
              onChange={(e) => {
                setPasscodeInput(e.target.value)
                setPasscodeError(undefined)
              }}
              placeholder="Passcode"
            />
            {passcodeError && <p className="text-sm text-red-600">{passcodeError}</p>}
            <Button type="submit" className="bg-[#0f6e56] text-white hover:bg-[#0c5a46]">
              Start calling
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
