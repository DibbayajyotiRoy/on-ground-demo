import { Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface EarningsCardProps {
  earnings: number
  detail: string
  target: string
}

export function EarningsCard({ earnings, detail, target }: EarningsCardProps) {
  const numericTarget = Number.parseInt(target.replace(/[^0-9]/g, ''), 10) || 6000
  const pct = Math.min(100, Math.round((earnings / numericTarget) * 100))

  return (
    <Card className="rounded-2xl border-0 bg-[#0b1e3f] text-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-white/90">
          <Wallet className="size-4 text-[#0f6e56]" />
          Earnings Today
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-3xl font-bold tracking-tight">₹{earnings.toLocaleString('en-IN')}</p>
          <p className="text-xs text-white/60">{detail}</p>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-white/70">{pct}% of {target} target</span>
            <span className="font-medium">{target}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#0f6e56] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
