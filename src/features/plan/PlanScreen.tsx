import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  FlaskConical,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Hash,
  Delete,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { leads, recentCalls } from '@/lib/mock-data'
import type { RecentCall, CallDirection } from '@/lib/types'
import type { PlanScreenProps } from '@/lib/contracts'

const ROWS_PER_PAGE = 2
const today = new Date()

function normalizePhone(value: string) {
  return value.replace(/\D/g, '')
}

function formatCurrency(value: number) {
  return `₹${value.toLocaleString('en-IN')}`
}

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
  const s = String(totalSeconds % 60).padStart(2, '0')
  return `${m}:${s}`
}

function phaseLabel(phase: string) {
  switch (phase) {
    case 'idle':
      return 'Idle'
    case 'requesting-token':
      return 'Requesting token'
    case 'connecting':
      return 'Connecting'
    case 'ready':
      return 'Ready'
    case 'ringing':
      return 'Ringing'
    case 'active':
      return 'Active call'
    case 'incoming':
      return 'Incoming call'
    case 'ended':
      return 'Call ended'
    case 'failed':
      return 'Call failed'
    default:
      return phase
  }
}

function directionIcon(direction: CallDirection) {
  switch (direction) {
    case 'incoming':
      return <PhoneIncoming className="size-4 text-green-600" />
    case 'outgoing':
      return <PhoneOutgoing className="size-4 text-blue-600" />
    case 'missed':
      return <PhoneMissed className="size-4 text-red-500" />
  }
}

function sopChecklist(score?: number) {
  const s = score ?? 0
  if (s >= 80) {
    return {
      pass: ['Warm greeting & brand intro', 'Need discovery & mattress use-case', 'Clear next step booked'],
      miss: ['Cross-sell pillow/protector mentioned', 'Warranty value reinforced'],
    }
  }
  if (s >= 60) {
    return {
      pass: ['Warm greeting & brand intro', 'Product mentioned'],
      miss: ['Need discovery incomplete', 'Cross-sell not attempted', 'Objection handling documented'],
    }
  }
  return {
    pass: ['Call connected'],
    miss: ['Need discovery', 'Product fit confirmed', 'Next step not set', 'Cross-sell / warranty not mentioned'],
  }
}

export function PlanScreen({ call, onStartCall, onOpenLeads, onTestCall }: PlanScreenProps) {
  const [activeTab, setActiveTab] = useState('calls')
  const [page, setPage] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reviewCall, setReviewCall] = useState<RecentCall | null>(null)
  const [dialed, setDialed] = useState('')
  const [keypadOpen, setKeypadOpen] = useState(false)

  // Simulated live transcript (matches the mock's transcript panel; practice
  // content, revealed line-by-line while the call is active).
  const TRANSCRIPT_LINES = [
    { at: 2, speaker: 'Agent (You)', text: 'Hi, this is Arvind from The Sleep Company — am I speaking with the right person?' },
    { at: 6, speaker: 'Customer', text: 'Yes, speaking. I had asked about the Ortho GRID mattress last week.' },
    { at: 12, speaker: 'Agent (You)', text: 'Right! Your quote is still valid — the no-cost EMI works out to ₹2,150 a month.' },
    { at: 18, speaker: 'Customer', text: 'That fits my budget. What about delivery to Whitefield?' },
    { at: 25, speaker: 'Agent (You)', text: 'Delivery within 4 days, free installation included. Shall I book it?' },
    { at: 32, speaker: 'Customer', text: 'Yes, go ahead. Send me the confirmation on WhatsApp.' },
  ]
  const visibleTranscript = TRANSCRIPT_LINES.filter((l) => l.at <= call.durationSeconds)

  const todayLabel = format(today, 'EEEE, d MMMM yyyy')

  const callsToMake = useMemo(
    () => leads.filter((l) => l.status === 'open' || l.status === 'ageing').sort((a, b) => b.attractivenessScore - a.attractivenessScore),
    []
  )

  const totalPages = Math.max(1, Math.ceil(callsToMake.length / ROWS_PER_PAGE))
  const safePage = Math.min(page, totalPages - 1)
  const pageRows = callsToMake.slice(safePage * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE + ROWS_PER_PAGE)

  const missedCalls = useMemo(
    () =>
      recentCalls
        .filter((c) => c.direction === 'missed')
        .map((c) => ({
          call: c,
          lead: leads.find((l) => normalizePhone(l.phone) === normalizePhone(c.phone) || l.name === c.name),
        }))
        .sort((a, b) => (b.lead?.expectedValue ?? 0) - (a.lead?.expectedValue ?? 0)),
    []
  )
  const missedCount = missedCalls.length
  const missedValue = missedCalls.reduce((sum, { lead }) => sum + (lead?.expectedValue ?? 0), 0)

  const matchedLeadForKeypad = useMemo(
    () => leads.find((l) => normalizePhone(l.phone) === normalizePhone(dialed)),
    [dialed]
  )

  function toggleExpand(id: string) {
    setExpandedId((current) => (current === id ? null : id))
  }

  function handleStartCall(target: { name: string; phone: string; leadId?: string }) {
    onStartCall(target)
    setKeypadOpen(false)
  }

  function handleKeypadCall() {
    if (matchedLeadForKeypad) {
      handleStartCall({ name: matchedLeadForKeypad.name, phone: matchedLeadForKeypad.phone, leadId: matchedLeadForKeypad.id })
      setDialed('')
    }
  }

  function appendDigit(digit: string) {
    setDialed((prev) => prev + digit)
  }

  function backspace() {
    setDialed((prev) => prev.slice(0, -1))
  }

  function clearDialed() {
    setDialed('')
  }

  return (
    <div className="flex min-h-full flex-col gap-4 bg-[#f5f5f5] p-4">
      <header className="flex flex-col gap-3 rounded-2xl bg-[#1c1c1e] p-4 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold leading-tight">Today's calling plan</h1>
          <p className="text-xs text-white/70">Planner · {todayLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {onTestCall && (
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/10 text-white hover:bg-white/20"
              onClick={onTestCall}
            >
              <FlaskConical className="size-4" />
              Test call
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/10 text-white hover:bg-white/20"
            onClick={() => onOpenLeads()}
          >
            Leads
          </Button>
          <Sheet open={keypadOpen} onOpenChange={setKeypadOpen}>
            <SheetTrigger asChild>
              <Button size="sm" className="bg-green-600 text-white hover:bg-green-700">
                <Phone className="size-4" />
                Keypad
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl bg-[#faf8f5]">
              <SheetHeader>
                <SheetTitle>Dialpad</SheetTitle>
                <SheetDescription>
                  Calls are restricted to verified lead numbers in your data.
                </SheetDescription>
              </SheetHeader>
              <div className="mx-auto w-full max-w-sm">
                <div className="mb-4 rounded-xl bg-white p-3 text-center text-2xl font-medium tracking-widest ring-1 ring-black/5">
                  {dialed || <span className="text-muted-foreground">—</span>}
                </div>
                {matchedLeadForKeypad ? (
                  <p className="mb-3 text-center text-sm text-green-700">
                    Matched: {matchedLeadForKeypad.name}
                  </p>
                ) : dialed ? (
                  <p className="mb-3 text-center text-sm text-muted-foreground">
                    No verified lead matches this number.
                  </p>
                ) : (
                  <p className="mb-3 text-center text-sm text-muted-foreground">
                    Enter a lead number to enable calling.
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                    <Button
                      key={digit}
                      type="button"
                      variant="secondary"
                      size="lg"
                      className="h-14 text-lg"
                      onClick={() => appendDigit(digit)}
                    >
                      {digit === '*' ? <span className="text-xl">∗</span> : digit === '#' ? <Hash className="size-5" /> : digit}
                    </Button>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Button type="button" variant="outline" size="lg" className="h-12" onClick={clearDialed}>
                    Clear
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    className="h-12 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                    disabled={!matchedLeadForKeypad}
                    onClick={handleKeypadCall}
                  >
                    <Phone className="size-5" />
                    Call
                  </Button>
                  <Button type="button" variant="outline" size="lg" className="h-12" onClick={backspace}>
                    <Delete className="size-5" />
                    Back
                  </Button>
                </div>
              </div>
              <SheetFooter />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {call.phase !== 'idle' && (
        <Card className="border-l-4 border-l-green-600 bg-[#faf8f5]">
          <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-green-100 text-green-700">
                <Phone className="size-5" />
              </div>
              <div>
                <p className="font-medium">{phaseLabel(call.phase)}</p>
                <p className="text-xs text-muted-foreground">
                  {call.target ? `${call.target.name} · ${call.target.phone}` : 'No target set'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-lg font-semibold tabular-nums">{formatDuration(call.durationSeconds)}</p>
                <p className="text-xs text-muted-foreground">Duration</p>
              </div>
              {call.error && (
                <Badge variant="destructive" className="whitespace-normal text-xs">
                  {call.error}
                </Badge>
              )}
            </div>
          </CardContent>
          {call.phase === 'active' && (
            <div className="border-t border-black/5 px-4 py-3">
              <div className="flex items-center gap-2 pb-2">
                <span className="size-1.5 animate-pulse rounded-full bg-green-500" />
                <p className="text-xs font-semibold tracking-wide text-[#1d9e75] uppercase">Live transcript</p>
                <Badge variant="secondary" className="text-[10px]">practice content</Badge>
              </div>
              <div className="flex max-h-44 flex-col gap-2 overflow-y-auto">
                {visibleTranscript.map((line, i) => (
                  <div key={i} className="rounded-lg bg-[#f7f7f7] px-3 py-2">
                    <p className="text-[11px] font-semibold text-[#1d9e75]">{line.speaker}</p>
                    <p className="text-sm text-gray-800">{line.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
      {call.phase === 'idle' && (
        <Card className="bg-[#faf8f5]">
          <CardContent className="flex items-center gap-3 py-4 text-muted-foreground">
            <Phone className="size-5" />
            <p className="text-sm">No active call. Pick a lead or use the keypad to start calling.</p>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="w-full bg-white shadow-sm">
          <TabsTrigger value="calls" className="flex-1">
            Calls to make
          </TabsTrigger>
          <TabsTrigger value="incoming" className="flex-1">
            Incoming
          </TabsTrigger>
          <TabsTrigger value="recent" className="flex-1">
            Recent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calls" className="mt-3 space-y-3">
          {pageRows.map((lead) => (
            <Card key={lead.id} className="overflow-hidden bg-[#faf8f5]">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{lead.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{lead.phone}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={lead.status === 'ageing' ? 'destructive' : 'secondary'} className="text-xs capitalize">
                      {lead.status}
                    </Badge>
                    <p className="mt-1 text-xs font-medium text-green-700">Score {lead.attractivenessScore}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{lead.interest}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {lead.product}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Cross-sell: {lead.crossSell}
                  </Badge>
                </div>
                {expandedId === lead.id && (
                  <div className="space-y-3 rounded-xl bg-white p-3 text-sm ring-1 ring-black/5">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">EMI / Payment</p>
                      <p>{lead.emi}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Journey</p>
                      <ul className="mt-1 space-y-1">
                        {lead.journey.map((step, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span className="mt-1.5 block h-1.5 w-1.5 rounded-full bg-green-600" />
                            <span>
                              <span className="font-medium">{step.label}</span> — {step.detail}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => toggleExpand(lead.id)}
                  >
                    {expandedId === lead.id ? (
                      <>
                        <ChevronUp className="size-4" /> Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="size-4" /> Details
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 bg-green-600 text-white hover:bg-green-700"
                    onClick={() => handleStartCall({ name: lead.name, phone: lead.phone, leadId: lead.id })}
                  >
                    <Phone className="size-4" />
                    Place call
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {safePage + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="incoming" className="mt-3 space-y-3">
          <Card className="bg-gradient-to-r from-amber-50 to-orange-50">
            <CardContent className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Missed calls</p>
                <p className="text-xs text-muted-foreground">
                  {missedCount} missed · call back to recover value
                </p>
              </div>
              <p className="text-lg font-semibold text-orange-700">
                {formatCurrency(missedValue)} <span className="text-xs font-normal text-muted-foreground">at stake</span>
              </p>
            </CardContent>
          </Card>

          {missedCalls.map(({ call, lead }) => (
            <Card key={call.id} className="bg-[#faf8f5]">
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-red-100">
                    <PhoneMissed className="size-4 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium">{call.name}</p>
                    <p className="text-xs text-muted-foreground">{call.phone}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  {lead && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-700">{formatCurrency(lead.expectedValue)}</p>
                      <p className="text-xs text-muted-foreground">{lead.interest}</p>
                    </div>
                  )}
                  <Button
                    size="sm"
                    className="bg-green-600 text-white hover:bg-green-700"
                    onClick={() =>
                      handleStartCall({
                        name: lead?.name ?? call.name,
                        phone: lead?.phone ?? call.phone,
                        leadId: lead?.id,
                      })
                    }
                  >
                    <PhoneIncoming className="size-4" />
                    Call back
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {missedCalls.length === 0 && (
            <div className="rounded-xl bg-white p-6 text-center text-sm text-muted-foreground shadow-sm">
              No missed calls today.
            </div>
          )}
        </TabsContent>

        <TabsContent value="recent" className="mt-3 space-y-3">
          {recentCalls.map((call) => (
            <button
              key={call.id}
              type="button"
              onClick={() => setReviewCall(call)}
              className="w-full rounded-xl bg-white p-3 text-left shadow-sm transition-colors hover:bg-[#faf8f5]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {directionIcon(call.direction)}
                  <div>
                    <p className="text-sm font-medium">{call.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {call.time} · {call.duration}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {call.outcome && <Badge variant="secondary" className="text-xs">{call.outcome}</Badge>}
                  {typeof call.sopScore === 'number' && (
                    <Badge variant="outline" className="text-xs">
                      SOP {call.sopScore}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={reviewCall !== null} onOpenChange={(open) => !open && setReviewCall(null)}>
        <DialogContent className="bg-[#faf8f5]">
          <DialogHeader>
            <DialogTitle>SOP review</DialogTitle>
            <DialogDescription>
              {reviewCall?.name} · {reviewCall?.time}
            </DialogDescription>
          </DialogHeader>
          {reviewCall && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold">
                  {reviewCall.sopScore ?? '—'}
                </div>
                <div>
                  <p className="font-medium">SOP score</p>
                  <p className="text-xs text-muted-foreground">
                    {reviewCall.sopScore && reviewCall.sopScore >= 80
                      ? 'Strong call — minor coaching points'
                      : reviewCall.sopScore && reviewCall.sopScore >= 60
                        ? 'Decent — a few misses to coach'
                        : 'Needs coaching — several SOP misses'}
                  </p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Pass</p>
                <ul className="space-y-1">
                  {sopChecklist(reviewCall.sopScore).pass.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 block size-1.5 rounded-full bg-green-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Miss</p>
                <ul className="space-y-1">
                  {sopChecklist(reviewCall.sopScore).miss.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 block size-1.5 rounded-full bg-red-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewCall(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
