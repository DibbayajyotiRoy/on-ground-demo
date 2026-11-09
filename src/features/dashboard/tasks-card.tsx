import { Phone, Users, ClipboardCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TaskItem } from '@/lib/types'
import type { DashboardScreenProps } from '@/lib/contracts'

interface TasksCardProps {
  tasks: TaskItem[]
  onOpenLeads: DashboardScreenProps['onOpenLeads']
}

const kindIcon = {
  callback: <Phone className="size-4 text-[#0f6e56]" />,
  leads: <Users className="size-4 text-[#0b1e3f]" />,
  outcome: <ClipboardCheck className="size-4 text-amber-600" />,
}

export function TasksCard({ tasks, onOpenLeads }: TasksCardProps) {
  return (
    <Card className="rounded-2xl border-0 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-[#0b1e3f]">My Tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.map((task) => (
          <button
            key={task.id}
            type="button"
            disabled={!task.leadId}
            onClick={() => task.leadId && onOpenLeads(task.leadId)}
            className="flex w-full items-center gap-3 rounded-xl bg-[#faf9f7] p-2.5 text-left transition-colors hover:bg-[#0b1e3f]/5 disabled:cursor-default disabled:opacity-70"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
              {kindIcon[task.kind]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#0b1e3f]">{task.title}</p>
              <p className="text-xs text-muted-foreground">
                {task.source} · {task.detail}
              </p>
            </div>
            {task.leadId && (
              <span className="text-xs font-medium text-[#0f6e56]">Open</span>
            )}
          </button>
        ))}
      </CardContent>
    </Card>
  )
}
