import type { LucideIcon } from 'lucide-react'
import { useRef, type FormEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { TypeColour } from './colours'

export interface CaptureType {
  key: string
  label: string
  colour: TypeColour
  icon: LucideIcon
}

/**
 * Capture (components.md): a Dialog near the top, so the page stays in
 * view. What it makes (Thought or Task), one line, then either the parser's
 * offer or the dates it understood.
 */
export function CaptureDialog({
  open,
  onOpenChange,
  types,
  type,
  onTypeChange,
  text,
  onTextChange,
  offer,
  understood = [],
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The Types it can make, the default first. */
  types: CaptureType[]
  type: string
  onTypeChange: (type: string) => void
  text: string
  onTextChange: (text: string) => void
  /** "Task, Fri 18:00?": taking it switches to that Type (CAP-001). */
  offer?: { type: string; label: string; onTake: () => void }
  /** What the line will be saved with: "Fri 16 Oct", "18:00". */
  understood?: { icon: LucideIcon; label: string }[]
  onSave: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const offered = types.find((t) => t.key === offer?.type)
  const save = (e: FormEvent) => {
    e.preventDefault()
    if (text.trim()) onSave()
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        initialFocus={input}
        className="top-[76px] max-w-[600px] translate-y-0 gap-0 p-0 sm:top-[12svh]"
      >
        <form onSubmit={save} className="flex flex-col">
          <div className="flex items-center gap-3 px-[18px] pt-[18px] sm:pr-5 sm:pl-[22px]">
            <DialogTitle className="flex-1">Capture</DialogTitle>
            <ToggleGroup
              aria-label="Save as"
              value={[type]}
              onValueChange={(value: string[]) => value[0] && onTypeChange(value[0])}
            >
              {types.map((t) => (
                <ToggleGroupItem key={t.key} value={t.key}>
                  <t.icon data-colour={t.colour} className="text-tc-text" aria-hidden />
                  {t.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="flex flex-col gap-3 px-[18px] pt-4 pb-[18px] sm:px-5">
            <Input
              ref={input}
              size="lg"
              aria-label="What's on your mind"
              autoComplete="off"
              enterKeyHint="done"
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
            />
            {offer && offered && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={offer.onTake}
              >
                <offered.icon data-colour={offered.colour} className="text-tc-text" aria-hidden />
                {offer.label}
              </Button>
            )}
            {understood.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {understood.map((u) => (
                  <Badge key={u.label} variant="secondary">
                    <u.icon aria-hidden />
                    {u.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="flex-row px-[18px] pb-[18px] sm:px-5 sm:pb-5 [&>*]:flex-1 sm:[&>*]:flex-none">
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={!text.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
