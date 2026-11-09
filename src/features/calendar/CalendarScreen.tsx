import { useMemo, useState } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Phone, CalendarDays, Clock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { calendarEvents, leads } from '@/lib/mock-data'
import type { CalendarEvent } from '@/lib/types'
import type { CalendarScreenProps } from '@/lib/contracts'

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const eventColors: Record<CalendarEvent['type'], string> = {
  call: 'bg-green-500',
  meeting: 'bg-blue-500',
  delivery: 'bg-orange-500',
  training: 'bg-purple-500',
}

const eventBadgeVariant: Record<CalendarEvent['type'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  call: 'default',
  meeting: 'secondary',
  delivery: 'destructive',
  training: 'outline',
}

const today = new Date()

function formatCurrency(value: number) {
  return `₹${value.toLocaleString('en-IN')}`
}

function findLeadForEvent(event: CalendarEvent) {
  const firstName = event.title.split(' ')[0].toLowerCase()
  return leads.find((l) => l.name.toLowerCase().startsWith(firstName))
}

export function CalendarScreen({ onStartCall }: CalendarScreenProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today))
  const [selectedDate, setSelectedDate] = useState<Date>(today)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const gridDays = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of calendarEvents) {
      const key = event.date
      const list = map.get(key) ?? []
      list.push(event)
      map.set(key, list)
    }
    return map
  }, [])

  const eventsForSelected = useMemo(() => {
    const key = format(selectedDate, 'yyyy-MM-dd')
    return eventsByDate.get(key) ?? []
  }, [eventsByDate, selectedDate])

  function eventsOnDay(day: Date) {
    const key = format(day, 'yyyy-MM-dd')
    return eventsByDate.get(key) ?? []
  }

  function goPrevMonth() {
    setCurrentMonth((m) => startOfMonth(subMonths(m, 1)))
  }

  function goNextMonth() {
    setCurrentMonth((m) => startOfMonth(addMonths(m, 1)))
  }

  function goToday() {
    const now = new Date()
    setCurrentMonth(startOfMonth(now))
    setSelectedDate(now)
  }

  return (
    <div className="flex min-h-full flex-col gap-4 bg-[#f5f5f5] p-4">
      <header className="flex flex-col gap-3 rounded-2xl bg-[#1c1c1e] p-4 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/10">
            <CalendarDays className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Calendar</h1>
            <p className="text-xs text-white/70">{format(currentMonth, 'MMMM yyyy')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="bg-white/10 text-white hover:bg-white/20"
            onClick={goToday}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="bg-white/10 text-white hover:bg-white/20"
            onClick={goPrevMonth}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="bg-white/10 text-white hover:bg-white/20"
            onClick={goNextMonth}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </header>

      <Card className="bg-[#faf8f5]">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">{format(currentMonth, 'MMMM yyyy')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {dayLabels.map((label) => (
              <div key={label} className="py-2 text-center text-xs font-medium text-muted-foreground">
                {label}
              </div>
            ))}
            {gridDays.map((day) => {
              const inMonth = isSameMonth(day, currentMonth)
              const isToday = isSameDay(day, today)
              const isSelected = isSameDay(day, selectedDate)
              const dayEvents = eventsOnDay(day)

              if (!inMonth) {
                return <div key={day.toISOString()} className="min-h-[5rem] rounded-xl" />
              }

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`flex min-h-[5rem] flex-col items-start gap-1 rounded-xl bg-white p-2 text-left transition-colors hover:bg-[#f0eee9] ${
                    isSelected ? 'ring-2 ring-green-600' : 'ring-1 ring-black/5'
                  } ${isToday ? 'bg-green-50' : ''}`}
                >
                  <span className={`text-xs font-medium ${isToday ? 'text-green-700' : ''}`}>{format(day, 'd')}</span>
                  <div className="flex w-full flex-wrap gap-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <span
                        key={event.id}
                        className={`block h-1.5 w-1.5 rounded-full ${eventColors[event.type]}`}
                        title={event.title}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] leading-none text-muted-foreground">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                  <div className="flex w-full flex-col gap-0.5 overflow-hidden">
                    {dayEvents.slice(0, 2).map((event) => (
                      <span key={event.id} className="truncate text-[10px] text-muted-foreground">
                        {event.title}
                      </span>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#faf8f5]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Events · {format(selectedDate, 'EEEE, d MMMM')}</CardTitle>
            {eventsForSelected.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {eventsForSelected.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {eventsForSelected.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No events on this day.</p>
          )}
          {eventsForSelected.map((event, idx) => {
            const lead = findLeadForEvent(event)
            return (
              <div key={event.id}>
                {idx > 0 && <Separator className="my-3" />}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 items-center justify-center rounded-full bg-white ring-1 ring-black/5">
                      <Clock className="size-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{event.title}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant={eventBadgeVariant[event.type]} className="text-[10px] capitalize">
                          {event.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{event.time}</span>
                      </div>
                      {lead && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {lead.name} · {lead.phone} · expected {formatCurrency(lead.expectedValue)}
                        </p>
                      )}
                    </div>
                  </div>
                  {event.type === 'call' && onStartCall && (
                    <Button
                      type="button"
                      size="sm"
                      className="bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      disabled={!lead}
                      onClick={() => {
                        if (lead) {
                          onStartCall({ name: lead.name, phone: lead.phone, leadId: lead.id })
                        }
                      }}
                    >
                      <Phone className="size-4" />
                      Call now
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
