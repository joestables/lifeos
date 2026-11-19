import { nameColour, nearTwin } from '@lifeos/wardrobe'
import { useEffect, useId, useState } from 'react'
import { ColourLoupe, Swatch, Text } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { WardrobeEntry } from '@/data'
import { colourAt } from '@/lib/garment-photo'
import { Field } from './task-details'

/** A garment's colour as chosen on its sheet: one of mine, or a new one to make on Save. */
export type ColourChoice = { kind: 'mine'; id: string } | { kind: 'new'; hex: string; name: string }

const key = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** The photo's pixels, to read a colour from (a blob's, or Storage's, which allows it). */
function usePicture(url: string | undefined) {
  const [picture, setPicture] = useState<{ url: string; bitmap: ImageBitmap } | null>(null)
  useEffect(() => {
    if (!url) return
    let alive = true
    fetch(url)
      .then((r) => r.blob())
      .then((b) => createImageBitmap(b))
      .then((bitmap) => {
        if (alive) setPicture({ url, bitmap })
        else bitmap.close()
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [url])
  return picture && picture.url === url ? picture.bitmap : null
}

/**
 * New colour (WRD-007): the photo with the loupe, where I let go the
 * colour, starting at the estimate's; without a photo, the device's colour
 * picker (WRD-006 4). Its name is suggested; a name I have is refused,
 * offering that colour; a near twin says so, with Use.
 */
export function NewColourDialog({
  photo,
  start,
  mine,
  onUse,
  onClose,
}: {
  photo?: string
  start: string
  mine: readonly WardrobeEntry[]
  onUse: (choice: ColourChoice) => void
  onClose: () => void
}) {
  const ids = useId()
  const picture = usePicture(photo)
  const [hex, setHex] = useState(start)
  const [at, setAt] = useState({ x: 50, y: 50 })
  const [name, setName] = useState(() => nameColour(start))
  const [named, setNamed] = useState(false)
  const colours = mine.filter((c): c is WardrobeEntry & { hex: string } => c.hex !== null)
  const twin = nearTwin(hex, colours)
  const same = mine.find((c) => key(c.name) === key(name))
  const pick = (next: string) => {
    setHex(next)
    if (!named) setName(nameColour(next))
  }
  const use = () => {
    if (!name.trim() || same) return
    onUse({ kind: 'new', hex, name: name.trim() })
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-colour="orange">
        <DialogHeader>
          <DialogTitle>New colour</DialogTitle>
        </DialogHeader>
        {photo && (
          <ColourLoupe
            photo={photo}
            at={at}
            hex={hex}
            onPoint={(p) => {
              setAt(p)
              if (picture) pick(colourAt(picture, p))
            }}
          />
        )}
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            use()
          }}
        >
          <div className="flex items-end gap-3">
            {photo ? (
              <Swatch hex={hex} size="lg" />
            ) : (
              <label className="cursor-pointer rounded-full" aria-label="Swatch">
                <Swatch hex={hex} size="lg" />
                <input
                  type="color"
                  className="sr-only"
                  value={hex}
                  onChange={(e) => pick(e.target.value)}
                />
              </label>
            )}
            <div className="min-w-0 flex-1">
              <Field label="Name" htmlFor={`${ids}-name`}>
                <Input
                  id={`${ids}-name`}
                  value={name}
                  maxLength={40}
                  autoComplete="off"
                  aria-invalid={same ? true : undefined}
                  onChange={(e) => {
                    setName(e.target.value)
                    setNamed(true)
                  }}
                />
              </Field>
            </div>
          </div>
          {(same ?? twin) && (
            <div className="flex items-center gap-3 rounded-row bg-muted/60 p-3">
              <Swatch hex={(same ?? twin)!.hex ?? hex} size="md" />
              <Text as="span" size="sm" className="flex-1 font-semibold">
                {same ? `You have ${same.name}` : `Close to ${twin!.name}`}
              </Text>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onUse({ kind: 'mine', id: (same ?? twin)!.id })}
              >
                Use {(same ?? twin)!.name}
              </Button>
            </div>
          )}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={!name.trim() || !!same}>
              {same ? 'Make it' : twin ? `Make ${name.trim()}` : `Use ${name.trim() || 'it'}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
