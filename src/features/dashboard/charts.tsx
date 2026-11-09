import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const callsData = [
  { day: 'Mon', calls: 12 },
  { day: 'Tue', calls: 18 },
  { day: 'Wed', calls: 15 },
  { day: 'Thu', calls: 22 },
  { day: 'Fri', calls: 19 },
  { day: 'Sat', calls: 26 },
  { day: 'Sun', calls: 14 },
]

const csatData = [
  { day: 'Mon', csat: 88 },
  { day: 'Tue', csat: 91 },
  { day: 'Wed', csat: 89 },
  { day: 'Thu', csat: 94 },
  { day: 'Fri', csat: 96 },
  { day: 'Sat', csat: 93 },
  { day: 'Sun', csat: 94 },
]

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-white px-2.5 py-1.5 text-xs shadow-md">
        <p className="font-medium text-[#0b1e3f]">{label}</p>
        <p className="text-[#0f6e56]">{payload[0].value}</p>
      </div>
    )
  }
  return null
}

export function CallsChart() {
  return (
    <Card className="rounded-2xl border-0 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-[#0b1e3f]">
          Calls handled last 7 days
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={callsData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f6e56" stopOpacity={1} />
                  <stop offset="100%" stopColor="#0f6e56" stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0b1e3f0d" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#0b1e3f05' }} />
              <Bar
                dataKey="calls"
                fill="url(#callsGradient)"
                radius={[6, 6, 0, 0]}
                isAnimationActive
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export function CsatChart() {
  return (
    <Card className="rounded-2xl border-0 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-[#0b1e3f]">
          CSAT trend last 7 days
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={csatData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="csatGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f6e56" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#0f6e56" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0b1e3f0d" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[80, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="csat"
                stroke="#0f6e56"
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 2, fill: '#fff', stroke: '#0f6e56' }}
                activeDot={{ r: 5, strokeWidth: 2, fill: '#0f6e56', stroke: '#fff' }}
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
