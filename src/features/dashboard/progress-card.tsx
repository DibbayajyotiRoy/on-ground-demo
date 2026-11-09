import { Target, Phone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface ProgressCardProps {
  leadsCreated: number
  leadsCalled: number
}

function ProgressRow({
  icon,
  label,
  value,
  goal,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  goal: number
  color: string
}) {
  const pct = Math.min(100, Math.round((value / goal) * 100))
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-[#0b1e3f]">
          {icon}
          <span className="font-medium">{label}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {value} / {goal}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#0b1e3f]/5">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export function ProgressCard({ leadsCreated, leadsCalled }: ProgressCardProps) {
  return (
    <Card className="rounded-2xl border-0 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-[#0b1e3f]">My Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <ProgressRow
          icon={<Target className="size-4 text-[#0f6e56]" />}
          label="Leads Created"
          value={leadsCreated}
          goal={5}
          color="#0f6e56"
        />
        <ProgressRow
          icon={<Phone className="size-4 text-[#0b1e3f]" />}
          label="Leads Called"
          value={leadsCalled}
          goal={4}
          color="#0b1e3f"
        />
      </CardContent>
    </Card>
  )
}
