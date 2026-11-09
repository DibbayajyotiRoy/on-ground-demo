import { Card, CardContent } from '@/components/ui/card'
import { cn } from 'cn'

export interface KpiCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  tone?: 'green' | 'amber' | 'red' | 'navy'
}

const toneMap = {
  green: 'bg-[#0f6e56]/10 text-[#0f6e56]',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  navy: 'bg-[#0b1e3f]/10 text-[#0b1e3f]',
}

export function KpiCard({ label, value, icon, tone = 'navy' }: KpiCardProps) {
  return (
    <Card size="sm" className="rounded-2xl border-0 bg-white shadow-sm">
      <CardContent className="flex items-center gap-3">
        <div className={cn('flex size-9 items-center justify-center rounded-xl', toneMap[tone])}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold tracking-tight text-[#0b1e3f]">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
