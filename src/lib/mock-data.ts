import type {
  CalendarEvent,
  Kudo,
  Lead,
  PulseAgent,
  PulseChannel,
  RecentCall,
  TaskItem,
} from './types'

export const leads: Lead[] = [
  {
    id: 'mukunda',
    name: 'Mukunda R.',
    initials: 'MR',
    phone: '+91 98765 43210',
    interest: 'Ortho GRID mattress · comparing brands',
    product: 'Ortho GRID Pro',
    crossSell: 'Ergo pillow set',
    emi: '₹2,150/month no-cost EMI likely to close',
    icp: 88,
    intentScore: 94,
    attractivenessScore: 96,
    expectedValue: 48500,
    status: 'open',
    journey: [
      { label: 'Website enquiry', detail: 'Compared Ortho GRID and Ortho GRID Pro twice.' },
      { label: 'Store visit', detail: 'Spent 28 minutes with the RT Nagar team.' },
      { label: 'Quote sent', detail: 'Quoted ₹48,500 including setup and delivery.' },
    ],
    buyingSignals: [
      { label: 'High intent', detail: 'Returned to the pricing page four times in two days.' },
      { label: 'Back-pain need', detail: 'Asked twice about spinal support and firmness.' },
      { label: 'Budget fit', detail: 'EMI affordability was the only unresolved objection.' },
    ],
  },
  {
    id: 'ritu',
    name: 'Ritu S.',
    initials: 'RS',
    phone: '+91 98450 12345',
    interest: 'Smart Luxe mattress · delivery timing',
    product: 'Smart Luxe Queen',
    crossSell: 'Mattress protector',
    emi: '₹1,675/month available, not yet discussed',
    icp: 84,
    intentScore: 91,
    attractivenessScore: 89,
    expectedValue: 33500,
    status: 'open',
    journey: [
      { label: 'Showroom visit', detail: 'Loved the Smart Luxe in-store experience.' },
      { label: 'Delivery question', detail: 'Asked how soon delivery can happen inside Bengaluru.' },
    ],
    buyingSignals: [
      { label: 'Ready to purchase', detail: 'Said “that works for me” during the previous call.' },
      { label: 'Delivery urgency', detail: 'Needs delivery before relatives arrive this weekend.' },
    ],
  },
  {
    id: 'kavitha',
    name: 'Kavitha R.',
    initials: 'KR',
    phone: '+91 97654 32109',
    interest: 'Hybrid mattress · wants showroom visit',
    product: 'Ortho Hybrid',
    crossSell: 'Adjustable bed base',
    emi: 'Not yet qualified',
    icp: 76,
    intentScore: 82,
    attractivenessScore: 81,
    expectedValue: 38900,
    status: 'open',
    journey: [
      { label: 'WhatsApp enquiry', detail: 'Asked when she can see the hybrid mattress.' },
      { label: 'Follow-up due', detail: 'No response since yesterday afternoon.' },
    ],
    buyingSignals: [
      { label: 'Product fit', detail: 'Compared hybrid and memory foam options.' },
      { label: 'Visit intent', detail: 'Requested a Saturday showroom slot.' },
    ],
  },
  {
    id: 'faizan',
    name: 'Faizan A.',
    initials: 'FA',
    phone: '+91 99012 34567',
    interest: 'Adjustable bed base · financing question',
    product: 'Motion Base Plus',
    crossSell: 'Tranquility topper',
    emi: 'Needs 12-month EMI breakdown',
    icp: 72,
    intentScore: 78,
    attractivenessScore: 74,
    expectedValue: 52900,
    status: 'ageing',
    journey: [
      { label: 'Call completed', detail: 'Discussed sleep posture and back support.' },
      { label: 'Awaiting EMI', detail: 'Asked us to call back after calculating EMI.' },
    ],
    buyingSignals: [
      { label: 'High value', detail: 'Interested in premium motion base package.' },
      { label: 'Financing friction', detail: 'Needs monthly payment clarity before committing.' },
    ],
  },
  {
    id: 'lakshmi',
    name: 'Lakshmi R.',
    initials: 'LR',
    phone: '+91 98123 45678',
    interest: 'Pillow and topper bundle',
    product: 'Ergo pillow pair',
    crossSell: 'Tranquility topper',
    emi: 'Cash purchase likely',
    icp: 68,
    intentScore: 71,
    attractivenessScore: 69,
    expectedValue: 12800,
    status: 'open',
    journey: [{ label: 'Referral', detail: 'Referred by a recent Ortho GRID customer.' }],
    buyingSignals: [{ label: 'Warm referral', detail: 'Trusts the referring customer and brand.' }],
  },
  {
    id: 'sameer',
    name: 'Sameer Q.',
    initials: 'SQ',
    phone: '+91 98876 54321',
    interest: 'Budget mattress · price comparison',
    product: 'GRID Essential',
    crossSell: 'Waterproof protector',
    emi: '₹950/month option may help',
    icp: 61,
    intentScore: 66,
    attractivenessScore: 63,
    expectedValue: 18900,
    status: 'open',
    journey: [{ label: 'Price enquiry', detail: 'Comparing two lower-priced competitors.' }],
    buyingSignals: [{ label: 'Price-led', detail: 'Needs warranty and durability reassurance.' }],
  },
]

export const recentCalls: RecentCall[] = [
  { id: 'call-1', direction: 'incoming', name: 'Mukunda R.', phone: '+91 98765 43210', time: 'Today · 10:42 AM', duration: '4m 12s', outcome: 'Follow-up booked', sopScore: 82 },
  { id: 'call-2', direction: 'outgoing', name: 'Kavitha R.', phone: '+91 97654 32109', time: 'Today · 11:15 AM', duration: '2m 05s', outcome: 'Visit booked', sopScore: 74 },
  { id: 'call-3', direction: 'missed', name: 'Ritu S.', phone: '+91 98450 12345', time: 'Today · 11:20 AM', duration: '—' },
  { id: 'call-4', direction: 'missed', name: 'Faizan A.', phone: '+91 99012 34567', time: 'Today · 10:05 AM', duration: '—' },
  { id: 'call-5', direction: 'outgoing', name: 'Faizan A.', phone: '+91 99012 34567', time: 'Yesterday · 4:40 PM', duration: '6m 40s', outcome: 'EMI requested', sopScore: 67 },
]

export const dashboardTasks: TaskItem[] = [
  { id: 'task-callback', source: 'Call Centre Team', title: '2 callbacks', detail: 'next 4:30pm', kind: 'callback', leadId: 'ritu' },
  { id: 'task-hot', source: 'AvaniBot', title: '2 hot leads', detail: 'untouched for 24h', kind: 'leads', leadId: 'mukunda' },
  { id: 'task-outcome', source: 'AvaniBot', title: '1 outcome', detail: 'to log', kind: 'outcome', leadId: 'mukunda' },
]

export const calendarEvents: CalendarEvent[] = [
  { id: 'event-1', date: '2026-11-09', title: 'Mukunda follow-up call', time: '4:30 PM', type: 'call' },
  { id: 'event-2', date: '2026-11-09', title: 'Warranty training', time: '6:00 PM', type: 'training' },
  { id: 'event-3', date: '2026-11-11', title: 'Kavitha showroom visit', time: '11:30 AM', type: 'meeting' },
  { id: 'event-4', date: '2026-11-14', title: 'Ortho GRID delivery', time: '10:00 AM', type: 'delivery' },
  { id: 'event-5', date: '2026-11-17', title: 'Team call QA review', time: '5:00 PM', type: 'meeting' },
]

export const pulseAgents: PulseAgent[] = [
  { id: 'avani', name: 'AvaniBot', icon: '✨', description: 'Daily briefs, answers and coaching' },
  { id: 'shipping', name: 'Manage Shipment', icon: '📦', description: 'Delivery updates and exceptions' },
  { id: 'tickets', name: 'Quotation Tickets', icon: '🎫', description: 'Quote approvals and ticket status' },
  { id: 'onboarding', name: 'New Hire Onboarding', icon: '🎉', description: 'Training and policy guidance' },
]

export const pulseChannels: PulseChannel[] = [
  {
    id: 'callcentre-team',
    name: 'callcentre-team',
    description: 'Manager: Review call QA scores this week!',
    icon: '#',
    messages: [
      { id: 'msg-1', author: 'Sunita Rao', initials: 'SR', text: 'Review the missed-call queue before 3pm.', time: '10:20 AM' },
      { id: 'msg-2', author: 'Priya Krishnan', initials: 'PK', text: 'Ritu confirmed Saturday delivery works.', time: '10:26 AM' },
      { id: 'msg-3', author: 'You', initials: 'AR', text: 'Calling Mukunda after the warranty module.', time: '10:31 AM', self: true },
    ],
  },
  {
    id: 'all-stores',
    name: 'all-stores',
    description: 'New Ortho Grid campaign from 1 June!',
    icon: '#',
    unread: 4,
    messages: [
      { id: 'msg-4', author: 'Marketing', initials: 'MK', text: 'New Ortho Grid assets are ready in the drive.', time: '10:22 AM' },
      { id: 'msg-5', author: 'Raju Kumar', initials: 'RK', text: 'The new comparison sheet is very useful.', time: '10:27 AM' },
    ],
  },
  {
    id: 'avani-coaching',
    name: 'avani-coaching',
    description: 'Your warranty score dropped 12% this week',
    icon: '✨',
    unread: 1,
    messages: [
      { id: 'msg-6', author: 'Avani AI', initials: 'AI', text: 'Mention warranty on every premium mattress call.', time: '9:01 AM' },
      { id: 'msg-7', author: 'You', initials: 'AR', text: 'Added warranty language to my call notes.', time: '9:05 AM', self: true },
    ],
  },
]

export const kudos: Kudo[] = [
  { id: 'kudo-1', from: 'Sunita Rao', initials: 'SR', role: 'Manager', message: 'Great work with Mukunda — closed that warranty objection beautifully.', time: '12:40pm · Today', tone: 'gold' },
  { id: 'kudo-2', from: 'Raju Kumar', initials: 'RK', role: 'Peer', message: 'Nice cross-sell on the Tranquo chair! Impressed by how you read the customer.', time: 'Yesterday', tone: 'red' },
  { id: 'kudo-3', from: 'Sunita Rao', initials: 'SR', role: 'Manager', message: 'Top SOP score this week — store leader!', time: '2 days ago', tone: 'green' },
]

export const dailyBrief = {
  title: 'Good afternoon',
  name: 'Arvind Rajan',
  brand: 'The Sleep Company · Call Centre',
  status: 'On Queue',
  ogScore: 76,
  handleTime: '4m 12s',
  csat: '94%',
  queue: 2,
  leadsCreated: 3,
  leadsCalled: 2,
  earnings: 5200,
  earningsDetail: '₹1,700 from coached moves',
  earningsTarget: '₹6,000',
}
