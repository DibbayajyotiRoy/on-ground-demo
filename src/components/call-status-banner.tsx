import { useMemo } from 'react'
import { Mic, MicOff, Pause, Phone, PhoneOff } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import type { CallInfo, CallPhase } from '@/lib/call-types'

export interface CallStatusBannerProps {
  call: CallInfo
  onEnd: () => void
  onAnswer?: () => void
  onToggleMute: () => void
  onToggleHold: () => void
}

const phaseLabel: Record<CallPhase, string> = {
  idle: '',
  'requesting-token': 'Requesting token…',
  connecting: 'Connecting…',
  ready: 'Ready to call',
  ringing: 'Ringing…',
  active: 'Active call',
  incoming: 'Incoming call',
  ended: '',
  failed: 'Call failed',
}

function formatDuration(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function CallStatusBanner({
  call,
  onEnd,
  onAnswer,
  onToggleMute,
  onToggleHold,
}: CallStatusBannerProps) {
  const elapsed = useMemo(() => call.durationSeconds, [call.durationSeconds])

  if (call.phase === 'idle' || call.phase === 'ended') return null

  const showTimer = call.phase === 'active'
  const isConnectingPhase =
    call.phase === 'requesting-token' || call.phase === 'connecting' || call.phase === 'ringing'
  const bannerTone =
    call.phase === 'failed'
      ? 'bg-red-700'
      : call.phase === 'incoming' || isConnectingPhase
        ? 'bg-amber-600'
        : 'bg-[#0f6e56]'

  return (
    <div
      className={`${bannerTone} sticky top-0 z-50 text-white shadow-md`}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-sm font-semibold">{phaseLabel[call.phase]}</span>
          {call.target && (
            <span className="truncate text-xs text-white/90">
              {call.target.name} · {call.target.phone}
            </span>
          )}
          {call.error && <span className="text-xs text-white/80">{call.error}</span>}
          <div className="flex items-center gap-1.5">
            {call.muted && (
              <Badge variant="outline" className="h-5 border-white/30 bg-white/10 px-1.5 text-[10px] text-white">
                Muted
              </Badge>
            )}
            {call.held && (
              <Badge variant="outline" className="h-5 border-white/30 bg-white/10 px-1.5 text-[10px] text-white">
                On hold
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showTimer && (
            <span className="min-w-[3ch] text-right text-sm font-medium tabular-nums">
              {formatDuration(elapsed)}
            </span>
          )}
          {(call.phase === 'active' || call.phase === 'incoming' || call.held || call.muted) && (
            <>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={onToggleMute}
                className="text-white hover:bg-white/15"
                aria-label={call.muted ? 'Unmute' : 'Mute'}
              >
                {call.muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={onToggleHold}
                className="text-white hover:bg-white/15"
                aria-label={call.held ? 'Resume' : 'Hold'}
              >
                <Pause className="size-4" />
              </Button>
            </>
          )}
          {call.phase === 'incoming' && onAnswer && (
            <Button
              size="sm"
              onClick={onAnswer}
              className="gap-1 rounded-lg bg-white text-[#0f6e56] hover:bg-white/90"
            >
              <Phone className="size-4" />
              Answer
            </Button>
          )}
          <Button
            size="sm"
            onClick={onEnd}
            className="gap-1 rounded-lg bg-white text-red-700 hover:bg-white/90"
          >
            <PhoneOff className="size-4" />
            End
          </Button>
        </div>
      </div>
    </div>
  )
}
