import { Phone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { Lead } from '@/lib/types'
import type { DashboardScreenProps } from '@/lib/contracts'

interface WaitingCardProps {
  leads: Lead[]
  onStartCall: DashboardScreenProps['onStartCall']
  onOpenLeads: DashboardScreenProps['onOpenLeads']
}

export function WaitingCard({ leads, onStartCall, onOpenLeads }: WaitingCardProps) {
  const waiting = leads.slice(0, 4)

  return (
    <Card className="rounded-2xl border-0 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-[#0b1e3f]">Who&apos;s waiting</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {waiting.map((lead) => (
          <div
            key={lead.id}
            className="flex items-center gap-3 rounded-xl bg-[#faf9f7] p-2.5"
          >
            <Avatar size="sm" className="bg-[#0b1e3f] text-white">
              <AvatarFallback className="bg-[#0b1e3f] text-xs text-white">
                {lead.initials}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => onOpenLeads(lead.id)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate text-sm font-medium text-[#0b1e3f]">{lead.name}</p>
              <p className="truncate text-xs text-muted-foreground">{lead.interest}</p>
            </button>
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className={
                  lead.status === 'ageing'
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-[#0f6e56]/20 bg-[#0f6e56]/5 text-[#0f6e56]'
                }
              >
                {lead.status}
              </Badge>
              <Button
                size="icon-xs"
                onClick={() => onStartCall({ name: lead.name, phone: lead.phone, leadId: lead.id })}
                className="bg-[#0f6e56] text-white hover:bg-[#0f6e56]/90"
              >
                <Phone className="size-3" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
