import type { CallInfo } from './call-types'
import type { CallTarget } from './types'

export interface DashboardScreenProps {
  onOpenLeads: (leadId?: string) => void
  onStartCall: (target: CallTarget) => void
}

export interface PlanScreenProps {
  call: CallInfo
  onStartCall: (target: CallTarget) => void
  onOpenLeads: (leadId?: string) => void
}

export interface CalendarScreenProps {
  onStartCall?: (target: CallTarget) => void
}

export interface PulseScreenProps {
  onStartCall?: (target: CallTarget) => void
}

export interface LeadsDialogProps {
  open: boolean
  leadId?: string
  onOpenChange: (open: boolean) => void
  onStartCall: (target: CallTarget) => void
}
