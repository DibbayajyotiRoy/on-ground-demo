export type AppView = 'dashboard' | 'plan' | 'calendar' | 'pulse'

export interface CallTarget {
  name: string
  phone: string
  leadId?: string
}

export interface LeadJourneyStep {
  label: string
  detail: string
}

export interface BuyingSignal {
  label: string
  detail: string
}

export interface Lead {
  id: string
  name: string
  initials: string
  phone: string
  interest: string
  product: string
  crossSell: string
  emi: string
  icp: number
  intentScore: number
  attractivenessScore: number
  expectedValue: number
  status: 'open' | 'ageing' | 'closed'
  journey: LeadJourneyStep[]
  buyingSignals: BuyingSignal[]
}

export type CallDirection = 'incoming' | 'outgoing' | 'missed'

export interface RecentCall {
  id: string
  direction: CallDirection
  name: string
  phone: string
  time: string
  duration: string
  outcome?: string
  sopScore?: number
}

export interface CalendarEvent {
  id: string
  date: string
  title: string
  time: string
  type: 'call' | 'meeting' | 'delivery' | 'training'
}

export interface TaskItem {
  id: string
  source: string
  title: string
  detail: string
  kind: 'callback' | 'leads' | 'outcome'
  leadId?: string
}

export interface Kudo {
  id: string
  from: string
  initials: string
  role: string
  message: string
  time: string
  tone: 'gold' | 'red' | 'green'
}

export interface PulseMessage {
  id: string
  author: string
  initials: string
  text: string
  time: string
  self?: boolean
}

export interface PulseChannel {
  id: string
  name: string
  description: string
  icon: string
  unread?: number
  messages: PulseMessage[]
}

export interface PulseAgent {
  id: string
  name: string
  icon: string
  description: string
}
