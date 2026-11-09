import { useEffect, useReducer, useState, type Dispatch } from 'react'
import type { PulseChannel, PulseMessage } from '@/lib/types'
import type { PulseScreenProps } from '@/lib/contracts'
import {
  dailyBrief,
  kudos,
  pulseAgents,
  pulseChannels,
  recentCalls,
} from '@/lib/mock-data'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Hash,
  Heart,
  MessageCircle,
  Phone,
  Search,
  Send,
  Smile,
  Sparkles,
  Star,
  ThumbsUp,
} from 'lucide-react'

const STORAGE_KEY = 'pulse-channels'

const dmChannels: PulseChannel[] = [
  {
    id: 'dm-sunita',
    name: 'Sunita Rao',
    description: 'Manager',
    icon: 'SR',
    messages: [
      {
        id: 'dm-1',
        author: 'Sunita Rao',
        initials: 'SR',
        text: 'Review the missed-call queue before 3pm.',
        time: '10:20 AM',
      },
    ],
  },
  {
    id: 'dm-priya',
    name: 'Priya Krishnan',
    description: 'Peer',
    icon: 'PK',
    messages: [
      {
        id: 'dm-2',
        author: 'Priya Krishnan',
        initials: 'PK',
        text: 'Ritu confirmed Saturday delivery works.',
        time: '10:26 AM',
      },
    ],
  },
  {
    id: 'dm-raju',
    name: 'Raju Kumar',
    description: 'Peer',
    icon: 'RK',
    messages: [
      {
        id: 'dm-3',
        author: 'Raju Kumar',
        initials: 'RK',
        text: 'The new comparison sheet is very useful.',
        time: '10:27 AM',
      },
    ],
  },
]

type View =
  | { name: 'home' }
  | { name: 'kudos' }
  | { name: 'channel'; channelId: string }
  | { name: 'customer' }

interface BotMessage {
  text: string
  self: boolean
  time: string
}

interface State {
  view: View
  botOpen: boolean
  botTab: 'brief' | 'chat'
  botMessages: BotMessage[]
  expandedAgent: string | null
  channels: PulseChannel[]
}

type Action =
  | { type: 'navigate'; view: View }
  | { type: 'openBot'; tab: 'brief' | 'chat' }
  | { type: 'closeBot' }
  | { type: 'sendBot'; text: string }
  | { type: 'toggleAgent'; id: string }
  | { type: 'loadChannels'; channels: PulseChannel[] }
  | { type: 'markRead'; channelId: string }
  | { type: 'postChannelMessage'; channelId: string; text: string }

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function initialChannels(): PulseChannel[] {
  return [...pulseChannels, ...dmChannels]
}

function loadChannels(): PulseChannel[] {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      return JSON.parse(saved) as PulseChannel[]
    } catch {
      // ignore corrupt storage
    }
  }
  return initialChannels()
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'navigate':
      return { ...state, view: action.view }
    case 'openBot':
      return { ...state, botOpen: true, botTab: action.tab }
    case 'closeBot':
      return { ...state, botOpen: false }
    case 'sendBot': {
      const now = formatTime(new Date())
      return {
        ...state,
        botMessages: [
          ...state.botMessages,
          { text: action.text, self: true, time: now },
          {
            text: 'Got it — I’ll surface that in your next brief.',
            self: false,
            time: now,
          },
        ],
      }
    }
    case 'toggleAgent':
      return {
        ...state,
        expandedAgent: state.expandedAgent === action.id ? null : action.id,
      }
    case 'loadChannels':
      return { ...state, channels: action.channels }
    case 'markRead':
      return {
        ...state,
        channels: state.channels.map((c) =>
          c.id === action.channelId ? { ...c, unread: 0 } : c
        ),
      }
    case 'postChannelMessage': {
      const now = formatTime(new Date())
      const newMessage: PulseMessage = {
        id: `msg-${Date.now()}`,
        author: 'You',
        initials: 'AR',
        text: action.text,
        time: now,
        self: true,
      }
      return {
        ...state,
        channels: state.channels.map((c) =>
          c.id === action.channelId
            ? {
                ...c,
                messages: [...c.messages, newMessage],
                unread: 0,
              }
            : c
        ),
      }
    }
    default:
      return state
  }
}

export function PulseScreen({ onStartCall }: PulseScreenProps) {
  const [state, dispatch] = useReducer(reducer, undefined, (): State => ({
    view: { name: 'home' },
    botOpen: false,
    botTab: 'brief',
    botMessages: [],
    expandedAgent: null,
    channels: loadChannels(),
  }))

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.channels))
  }, [state.channels])

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col bg-gray-50">
      {state.view.name === 'home' && <HomeView state={state} dispatch={dispatch} />}
      {state.view.name === 'kudos' && <KudosView dispatch={dispatch} />}
      {state.view.name === 'channel' && (
        <ChannelView
          channelId={state.view.channelId}
          state={state}
          dispatch={dispatch}
        />
      )}
      {state.view.name === 'customer' && (
        <CustomerView onStartCall={onStartCall} dispatch={dispatch} />
      )}
      <BotSheet state={state} dispatch={dispatch} />
    </div>
  )
}

function HomeView({
  state,
  dispatch,
}: {
  state: State
  dispatch: Dispatch<Action>
}) {
  const publicChannels = state.channels.filter((c) => !c.id.startsWith('dm-'))
  const directChannels = state.channels.filter((c) => c.id.startsWith('dm-'))
  const customAgents = pulseAgents.filter((a) => a.id !== 'avani')

  return (
    <>
      <header className="bg-purple-900 px-4 pb-4 pt-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Pulse</h1>
            <p className="text-sm text-purple-200">
              The Sleep Company · Koramangala
            </p>
          </div>
          <Badge
            variant="secondary"
            className="bg-purple-800 text-purple-100 hover:bg-purple-800"
          >
            On Queue
          </Badge>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="space-y-3 p-3">
          <button
            type="button"
            onClick={() => dispatch({ type: 'openBot', tab: 'chat' })}
            className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left shadow-sm transition-colors active:bg-gray-50"
          >
            <Search className="size-4 text-gray-400" />
            <span className="text-sm text-gray-500">Search or ask AvaniBot</span>
          </button>

          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-purple-100 text-lg">
                  ✨
                </div>
                <div>
                  <div className="font-medium">AvaniBot</div>
                  <div className="text-xs text-gray-500">Always on</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-green-600 text-white hover:bg-green-700"
                  onClick={() => dispatch({ type: 'openBot', tab: 'brief' })}
                >
                  Daily Brief
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => dispatch({ type: 'openBot', tab: 'chat' })}
                >
                  Ask a question
                </Button>
              </div>
            </CardContent>
          </Card>

          <section>
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Custom Agents
            </h2>
            <div className="space-y-2">
              {customAgents.map((agent) => {
                const expanded = state.expandedAgent === agent.id
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => dispatch({ type: 'toggleAgent', id: agent.id })}
                    className="w-full rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition-colors active:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-gray-100 text-base">
                        {agent.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{agent.name}</div>
                        <div className="text-xs text-gray-500">
                          {agent.description}
                        </div>
                      </div>
                      {expanded ? (
                        <ChevronDown className="size-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="size-4 text-gray-400" />
                      )}
                    </div>
                    {expanded && (
                      <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                        Status: Active · Response: instant · Trained on store
                        SOPs and product catalogue.
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </section>

          <button
            type="button"
            onClick={() => dispatch({ type: 'navigate', view: { name: 'customer' } })}
            className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition-colors active:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-green-100 text-green-700">
                <MessageCircle className="size-5" />
              </div>
              <div>
                <div className="text-sm font-medium">Customer discussions</div>
                <div className="text-xs text-gray-500">WhatsApp relay · 2 open</div>
              </div>
            </div>
            <Badge variant="default" className="bg-green-600 text-white">
              2
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => dispatch({ type: 'navigate', view: { name: 'kudos' } })}
            className="flex w-full items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3 text-left shadow-sm transition-colors active:bg-amber-100"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <Sparkles className="size-5" />
              </div>
              <div>
                <div className="text-sm font-medium">Kudos</div>
                <div className="text-xs text-gray-600">You received praise</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-amber-200 text-amber-900 hover:bg-amber-200"
              >
                3 NEW
              </Badge>
              <span className="text-xs text-gray-600">All-time 12</span>
            </div>
          </button>

          <section>
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Channels
            </h2>
            <div className="space-y-2">
              {publicChannels.map((channel) => (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'markRead', channelId: channel.id })
                    dispatch({
                      type: 'navigate',
                      view: { name: 'channel', channelId: channel.id },
                    })
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition-colors active:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                      {channel.icon === '#' ? (
                        <Hash className="size-4" />
                      ) : (
                        <span>{channel.icon}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        #{channel.name}
                      </div>
                      <div className="truncate text-xs text-gray-500">
                        {channel.description}
                      </div>
                    </div>
                  </div>
                  {channel.unread ? (
                    <Badge variant="default" className="bg-purple-600 text-white">
                      {channel.unread}
                    </Badge>
                  ) : null}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Direct Messages
            </h2>
            <div className="space-y-2">
              {directChannels.map((channel) => (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: 'navigate',
                      view: { name: 'channel', channelId: channel.id },
                    })
                  }
                  className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition-colors active:bg-gray-50"
                >
                  <Avatar size="sm">
                    <AvatarFallback className="bg-purple-100 text-purple-700">
                      {channel.icon}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {channel.name}
                    </div>
                    <div className="truncate text-xs text-gray-500">
                      {channel.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </ScrollArea>
    </>
  )
}

function KudosView({
  dispatch,
}: {
  dispatch: Dispatch<Action>
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white p-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => dispatch({ type: 'navigate', view: { name: 'home' } })}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <h2 className="text-lg font-semibold">Kudos</h2>
      </div>
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {kudos.map((k) => {
            const toneClasses =
              k.tone === 'gold'
                ? 'bg-amber-50 border-amber-200'
                : k.tone === 'red'
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-emerald-50 border-emerald-200'
            const ToneIcon =
              k.tone === 'gold' ? Star : k.tone === 'red' ? Heart : ThumbsUp
            return (
              <Card
                key={k.id}
                className={toneClasses}
              >
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Avatar size="sm">
                      <AvatarFallback
                        className={
                          k.tone === 'gold'
                            ? 'bg-amber-100 text-amber-700'
                            : k.tone === 'red'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-700'
                        }
                      >
                        {k.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{k.from}</div>
                      <div className="text-xs text-gray-500">
                        {k.role} · {k.time}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-800">{k.message}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <ToneIcon className="size-3" />
                    <span className="capitalize">{k.tone}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </ScrollArea>
      <div className="border-t border-gray-200 bg-white p-3 text-center text-sm text-gray-600">
        All-time kudos: <span className="font-semibold text-gray-900">12</span>
      </div>
    </div>
  )
}

function ChannelView({
  channelId,
  state,
  dispatch,
}: {
  channelId: string
  state: State
  dispatch: Dispatch<Action>
}) {
  const channel = state.channels.find((c) => c.id === channelId)
  const [text, setText] = useState('')
  const [showEmojis, setShowEmojis] = useState(false)

  if (!channel) return null

  const isDm = channel.id.startsWith('dm-')

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    dispatch({ type: 'postChannelMessage', channelId, text: trimmed })
    setText('')
    setShowEmojis(false)
  }

  const handleAction = (actionText: string) => {
    dispatch({ type: 'postChannelMessage', channelId, text: actionText })
  }

  const appendEmoji = (emoji: string) => {
    setText((t) => t + emoji)
  }

  return (
    <div className="flex min-h-svh flex-col">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white p-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => dispatch({ type: 'navigate', view: { name: 'home' } })}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex items-center gap-3">
          {isDm ? (
            <Avatar size="sm">
              <AvatarFallback className="bg-purple-100 text-purple-700">
                {channel.icon}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex size-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
              {channel.icon === '#' ? (
                <Hash className="size-4" />
              ) : (
                <span>{channel.icon}</span>
              )}
            </div>
          )}
          <div>
            <div className="text-base font-semibold">
              {isDm ? channel.name : `#${channel.name}`}
            </div>
            <div className="text-xs text-gray-500">{channel.description}</div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="mb-3 space-y-3">
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Needs your input</div>
                  <div className="text-xs text-gray-600">
                    This thread is waiting on your response.
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-green-600 text-white hover:bg-green-700"
                  onClick={() => handleAction('I’m on it 👍')}
                >
                  I’m on it
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction('Forwarding to manager')}
                >
                  Forward to manager
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          {channel.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </div>
      </ScrollArea>

      <div className="border-t border-gray-200 bg-white p-3">
        {showEmojis && (
          <div className="mb-2 flex gap-1">
            {['👍', '🔥', '👏', '😊', '🎉'].map((emoji) => (
              <Button
                key={emoji}
                size="icon-xs"
                variant="ghost"
                onClick={() => appendEmoji(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setShowEmojis((s) => !s)}
          >
            <Smile className="size-5 text-gray-500" />
          </Button>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Reply..."
            className="flex-1"
          />
          <Button
            size="icon-sm"
            className="bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            disabled={!text.trim()}
            onClick={handleSend}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: PulseMessage }) {
  return (
    <div
      className={`flex ${message.self ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
          message.self
            ? 'rounded-br-sm bg-purple-100 text-purple-900'
            : 'rounded-bl-sm bg-white text-gray-800 shadow-sm ring-1 ring-gray-100'
        }`}
      >
        <div className="mb-0.5 flex items-center gap-2">
          <span className="text-xs font-semibold">
            {message.self ? 'You' : message.author}
          </span>
          <span className="text-[10px] text-gray-400">{message.time}</span>
        </div>
        <p className="leading-relaxed">{message.text}</p>
      </div>
    </div>
  )
}

function CustomerView({
  onStartCall,
  dispatch,
}: {
  onStartCall?: (target: { name: string; phone: string }) => void
  dispatch: Dispatch<Action>
}) {
  const items = [
    {
      type: 'whatsapp' as const,
      id: 'wa-mukunda',
      name: 'Mukunda R.',
      phone: '+91 98765 43210',
      detail: 'Ortho GRID mattress · comparing brands',
      time: 'Today · 10:08 AM',
    },
    {
      type: 'missed' as const,
      id: 'missed-ritu',
      name: 'Ritu S.',
      phone: '+91 98450 12345',
      detail: 'Missed call',
      time: recentCalls.find((c) => c.name === 'Ritu S.')?.time ?? 'Today',
    },
    {
      type: 'missed' as const,
      id: 'missed-faizan',
      name: 'Faizan A.',
      phone: '+91 99012 34567',
      detail: 'Missed call',
      time: recentCalls.find((c) => c.name === 'Faizan A.')?.time ?? 'Today',
    },
    {
      type: 'call' as const,
      id: 'call-mukunda',
      name: 'Mukunda R.',
      phone: '+91 98765 43210',
      detail: 'Incoming · 4m 12s · Follow-up booked',
      time: 'Today · 10:42 AM',
    },
  ]

  return (
    <div className="flex min-h-svh flex-col">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white p-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => dispatch({ type: 'navigate', view: { name: 'home' } })}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <h2 className="text-lg font-semibold">Customer discussions</h2>
      </div>
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {items.map((item) => {
            const missed = item.type === 'missed'
            return (
              <Card key={item.id}>
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex size-10 items-center justify-center rounded-full ${
                          item.type === 'whatsapp'
                            ? 'bg-green-100 text-green-700'
                            : missed
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {item.type === 'whatsapp' ? (
                          <MessageCircle className="size-5" />
                        ) : (
                          <Phone className="size-5" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.phone}</div>
                        <div className="text-xs text-gray-500">{item.time}</div>
                      </div>
                    </div>
                    {missed ? (
                      <Badge variant="destructive">Missed</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-gray-700">{item.detail}</p>
                  {onStartCall ? (
                    <Button
                      size="sm"
                      className="w-full bg-green-600 text-white hover:bg-green-700"
                      onClick={() =>
                        onStartCall({ name: item.name, phone: item.phone })
                      }
                    >
                      <Phone className="mr-1 size-3.5" /> Call back
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

function BotSheet({
  state,
  dispatch,
}: {
  state: State
  dispatch: Dispatch<Action>
}) {
  const [question, setQuestion] = useState('')

  const handleSend = () => {
    const trimmed = question.trim()
    if (!trimmed) return
    dispatch({ type: 'sendBot', text: trimmed })
    setQuestion('')
  }

  return (
    <Sheet
      open={state.botOpen}
      onOpenChange={(open) => {
        if (!open) dispatch({ type: 'closeBot' })
      }}
    >
      <SheetContent side="bottom" className="h-[75vh] rounded-t-2xl">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-purple-100 text-lg">
              ✨
            </div>
            <div>
              <SheetTitle>AvaniBot</SheetTitle>
              <SheetDescription>
                {state.botTab === 'brief' ? 'Your daily brief' : 'Ask a question'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {state.botTab === 'brief' ? (
          <div className="space-y-4 p-4">
            <div>
              <div className="text-lg font-semibold">{dailyBrief.title}, {dailyBrief.name}</div>
              <div className="text-sm text-gray-500">
                {dailyBrief.brand} · {dailyBrief.status}
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <Metric label="OG Score" value={`${dailyBrief.ogScore}`} />
              <Metric label="Handle time" value={dailyBrief.handleTime} />
              <Metric label="CSAT" value={dailyBrief.csat} />
              <Metric label="Queue" value={`${dailyBrief.queue}`} />
              <Metric label="Leads created" value={`${dailyBrief.leadsCreated}`} />
              <Metric label="Leads called" value={`${dailyBrief.leadsCalled}`} />
            </div>
            <Separator />
            <div>
              <div className="text-sm font-medium">Earnings</div>
              <div className="text-2xl font-bold text-green-700">
                ₹{dailyBrief.earnings.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-gray-500">
                {dailyBrief.earningsDetail} · Target {dailyBrief.earningsTarget}
              </div>
            </div>
            <Button
              className="w-full bg-green-600 text-white hover:bg-green-700"
              onClick={() => dispatch({ type: 'openBot', tab: 'chat' })}
            >
              Ask a follow-up
            </Button>
          </div>
        ) : (
          <div className="flex h-full flex-col p-4">
            <ScrollArea className="flex-1">
              <div className="space-y-3">
                {state.botMessages.length === 0 ? (
                  <div className="text-center text-sm text-gray-500">
                    Ask AvaniBot anything about leads, products, or SOPs.
                  </div>
                ) : (
                  state.botMessages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex ${m.self ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                          m.self
                            ? 'rounded-br-sm bg-purple-100 text-purple-900'
                            : 'rounded-bl-sm bg-gray-100 text-gray-800'
                        }`}
                      >
                        <div className="mb-0.5 flex items-center gap-2">
                          <span className="text-xs font-semibold">
                            {m.self ? 'You' : 'AvaniBot'}
                          </span>
                          <span className="text-[10px] text-gray-400">{m.time}</span>
                        </div>
                        {m.text}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <div className="mt-3 flex items-center gap-2">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Ask AvaniBot..."
                className="flex-1"
              />
              <Button
                size="icon-sm"
                className="bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                disabled={!question.trim()}
                onClick={handleSend}
              >
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  )
}
