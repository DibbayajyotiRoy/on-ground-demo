import { useMemo, useState } from 'react'
import {
  Phone,
  PhoneMissed,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Target,
  TrendingUp,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { leads, recentCalls } from '@/lib/mock-data'
import type { Lead } from '@/lib/types'
import type { LeadsDialogProps } from '@/lib/contracts'

function formatCurrency(value: number) {
  return `₹${value.toLocaleString('en-IN')}`
}

function LeadDetail({ lead, onStartCall }: { lead: Lead; onStartCall: LeadsDialogProps['onStartCall'] }) {
  const [signalsOpen, setSignalsOpen] = useState(true)
  const [journeyOpen, setJourneyOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{lead.name}</h2>
          <p className="text-sm text-white/80">{lead.phone}</p>
          <p className="mt-1 text-sm text-white/90">{lead.interest}</p>
        </div>
        <div className="rounded-xl bg-white/15 px-3 py-2 text-center backdrop-blur-sm">
          <p className="text-lg font-bold">{lead.attractivenessScore}</p>
          <p className="text-[10px] uppercase tracking-wide text-white/70">Attractiveness</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-white/10 p-2 text-center backdrop-blur-sm">
          <p className="text-base font-semibold">{lead.icp}</p>
          <p className="text-[10px] text-white/70">ICP</p>
        </div>
        <div className="rounded-xl bg-white/10 p-2 text-center backdrop-blur-sm">
          <p className="text-base font-semibold">{lead.intentScore}</p>
          <p className="text-[10px] text-white/70">Intent</p>
        </div>
        <div className="rounded-xl bg-white/10 p-2 text-center backdrop-blur-sm">
          <p className="text-base font-semibold">{formatCurrency(lead.expectedValue)}</p>
          <p className="text-[10px] text-white/70">Expected value</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-xl bg-white/10 p-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-white/80" />
            <span className="text-sm font-medium">Buying signals</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-white hover:bg-white/10"
            onClick={() => setSignalsOpen((o) => !o)}
          >
            {signalsOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        </div>
        {signalsOpen && (
          <Card className="border-0 bg-white/95 text-foreground shadow-none">
            <CardContent className="space-y-2 py-3">
              {lead.buyingSignals.map((signal, idx) => (
                <div key={idx}>
                  <p className="text-sm font-medium">{signal.label}</p>
                  <p className="text-xs text-muted-foreground">{signal.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-xl bg-white/10 p-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-white/80" />
            <span className="text-sm font-medium">Journey</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-white hover:bg-white/10"
            onClick={() => setJourneyOpen((o) => !o)}
          >
            {journeyOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        </div>
        {journeyOpen && (
          <Card className="border-0 bg-white/95 text-foreground shadow-none">
            <CardContent className="space-y-2 py-3">
              {lead.journey.map((step, idx) => (
                <div key={idx} className="flex gap-2 text-sm">
                  <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-purple-600" />
                  <span>
                    <span className="font-medium">{step.label}</span> — {step.detail}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-2 rounded-xl bg-white/10 p-3 text-sm backdrop-blur-sm">
        <div className="flex justify-between">
          <span className="text-white/70">Product</span>
          <span className="font-medium">{lead.product}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/70">Cross-sell</span>
          <span className="font-medium">{lead.crossSell}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/70">EMI</span>
          <span className="font-medium">{lead.emi}</span>
        </div>
      </div>

      <Button
        type="button"
        size="lg"
        className="w-full bg-green-600 text-white hover:bg-green-700"
        onClick={() => onStartCall({ name: lead.name, phone: lead.phone, leadId: lead.id })}
      >
        <Phone className="size-5" />
        Call lead
      </Button>
    </div>
  )
}

export function LeadsDialog({ open, leadId, onOpenChange, onStartCall }: LeadsDialogProps) {
  const startIndex = useMemo(() => {
    const idx = leads.findIndex((l) => l.id === leadId)
    return idx >= 0 ? idx : 0
  }, [leadId])

  const [page, setPage] = useState(startIndex)
  const [prev, setPrev] = useState({ open, startIndex })
  if (prev.open !== open || prev.startIndex !== startIndex) {
    setPrev({ open, startIndex })
    if (open) setPage(startIndex)
  }

  const lead = leads[page]
  const missedCount = useMemo(() => recentCalls.filter((c) => c.direction === 'missed').length, [])

  function goPrev() {
    setPage((p) => Math.max(0, p - 1))
  }

  function goNext() {
    setPage((p) => Math.min(leads.length - 1, p + 1))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="overflow-hidden border-0 bg-[#faf8f5] p-0 sm:max-w-md">
        <div className="relative bg-gradient-to-br from-purple-600 to-purple-900 p-5 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Lead profile</DialogTitle>
            <DialogDescription className="text-white/80">
              {page + 1} of {leads.length}
            </DialogDescription>
          </DialogHeader>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-3 right-3 text-white hover:bg-white/10"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </Button>

          {lead ? (
            <LeadDetail lead={lead} onStartCall={onStartCall} />
          ) : (
            <p className="py-8 text-center text-sm text-white/80">No lead selected.</p>
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 disabled:opacity-40"
              disabled={page === 0}
              onClick={goPrev}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1.5">
              {leads.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPage(idx)}
                  className={`h-2 w-2 rounded-full transition-colors ${idx === page ? 'bg-white' : 'bg-white/30 hover:bg-white/50'}`}
                  aria-label={`Go to lead ${idx + 1}`}
                />
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 disabled:opacity-40"
              disabled={page >= leads.length - 1}
              onClick={goNext}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="bg-muted/30 px-5 pb-5 pt-3">
          <div className="flex items-center justify-between rounded-xl bg-white p-3 text-sm shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <PhoneMissed className="size-4 text-red-500" />
              <span>Persistent missed calls</span>
            </div>
            <Badge variant="destructive" className="text-xs">
              {missedCount}
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
