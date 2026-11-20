import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { DayEntry } from '@/data'
import { fromIsoDay, isoDayOf } from '@/lib/dates'
import { moveEntry } from './day-actions'

/** Move to… another day (WRD-022 2), a phone's way and a computer's too: a Calendar. */
export function MoveDialog({ entry, onClose }: { entry: DayEntry; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-colour="orange" className="w-auto">
        <DialogHeader>
          <DialogTitle>Move to</DialogTitle>
        </DialogHeader>
        <Calendar
          mode="single"
          selected={fromIsoDay(entry.day)}
          defaultMonth={fromIsoDay(entry.day)}
          onSelect={(d) => {
            if (d) moveEntry(entry, isoDayOf(d))
            onClose()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
