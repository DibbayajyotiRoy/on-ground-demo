import { useState } from 'react'
import { Phone } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { CallTarget } from '@/lib/types'

export interface PinnedInputProps {
  onStartCall: (target: CallTarget) => void
}

export function PinnedInput({ onStartCall }: PinnedInputProps) {
  const [phone, setPhone] = useState('')

  const handleCall = () => {
    const trimmed = phone.trim()
    if (!trimmed) return
    onStartCall({ name: 'New caller', phone: trimmed })
  }

  return (
    <Card size="sm" className="rounded-2xl border-0 bg-white shadow-sm">
      <CardContent className="flex flex-col gap-2">
        <label htmlFor="pinned-phone" className="text-xs font-medium text-[#0b1e3f]">
          Quick dial
        </label>
        <div className="flex gap-2">
          <Input
            id="pinned-phone"
            type="tel"
            placeholder="Enter customer phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCall()
            }}
            className="h-9 rounded-xl border-[#0b1e3f]/10 bg-[#faf9f7] text-sm"
          />
          <Button
            size="icon"
            onClick={handleCall}
            disabled={!phone.trim()}
            className="h-9 w-9 shrink-0 rounded-xl bg-[#0f6e56] text-white hover:bg-[#0f6e56]/90 disabled:opacity-40"
          >
            <Phone className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
