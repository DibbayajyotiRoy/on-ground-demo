import {
  BarChart3,
  ChevronDown,
  Clock,
  Smile,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { dailyBrief, dashboardTasks, leads } from '@/lib/mock-data'
import type { DashboardScreenProps } from '@/lib/contracts'
import { useState } from 'react'
import { KpiCard } from './kpi-card'
import { PinnedInput } from './pinned-input'
import { ProgressCard } from './progress-card'
import { EarningsCard } from './earnings-card'
import { WaitingCard } from './waiting-card'
import { TasksCard } from './tasks-card'
import { CallsChart, CsatChart } from './charts'

export function DashboardScreen({ onOpenLeads, onStartCall }: DashboardScreenProps) {
  const [today] = useState(() =>
    new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    })
  )

  return (
    <div className="min-h-svh bg-[#faf9f7]">
      <header className="bg-[#0b1e3f] text-white">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium text-white/60">{dailyBrief.brand}</p>
              <h1 className="mt-0.5 text-xl font-semibold tracking-tight">
                {dailyBrief.title}, {dailyBrief.name.split(' ')[0]}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="h-6 gap-1.5 border-0 bg-[#0f6e56] px-2.5 text-xs font-medium text-white shadow-[0_0_0_1px_#0f6e56]">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/70" />
                  <span className="relative inline-flex size-2 rounded-full bg-white" />
                </span>
                {dailyBrief.status}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
              >
                {today}
                <ChevronDown className="size-3.5" />
              </Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <KpiCard
              label="OG Score"
              value={dailyBrief.ogScore}
              icon={<BarChart3 className="size-5" />}
              tone="navy"
            />
            <KpiCard
              label="Avg Handle Time"
              value={dailyBrief.handleTime}
              icon={<Clock className="size-5" />}
              tone="amber"
            />
            <KpiCard
              label="CSAT Today"
              value={dailyBrief.csat}
              icon={<Smile className="size-5" />}
              tone="green"
            />
            <KpiCard
              label="In Queue"
              value={dailyBrief.queue}
              icon={<Users className="size-5" />}
              tone="red"
            />
            <div className="col-span-2 lg:col-span-1">
              <PinnedInput onStartCall={onStartCall} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <ProgressCard
                leadsCreated={dailyBrief.leadsCreated}
                leadsCalled={dailyBrief.leadsCalled}
              />
              <EarningsCard
                earnings={dailyBrief.earnings}
                detail={dailyBrief.earningsDetail}
                target={dailyBrief.earningsTarget}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <CallsChart />
              <CsatChart />
            </div>
          </div>

          <div className="space-y-4">
            <WaitingCard
              leads={leads}
              onStartCall={onStartCall}
              onOpenLeads={onOpenLeads}
            />
            <TasksCard tasks={dashboardTasks} onOpenLeads={onOpenLeads} />
          </div>
        </div>
      </main>
    </div>
  )
}
