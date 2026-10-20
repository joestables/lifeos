import { ImageIcon, LinkIcon, PlusIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { RecipePhoto } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/sonner'
import { photoFromLink, resizePhoto } from '@/lib/photo-resize'
import type { PhotoChoice } from './keep-photo'

/**
 * A Recipe's photo in a Dialog (patterns.md#recipes): the photo, then Change
 * photo (or Add a photo) — from a file or the camera, or from a link — and
 * Remove. Made small on the device as it is chosen.
 */
export function PhotoField({
  current,
  choice,
  onChoice,
}: {
  /** The photo it has now, to show. */
  current?: string
  choice: PhotoChoice
  onChoice: (choice: PhotoChoice) => void
}) {
  const file = useRef<HTMLInputElement>(null)
  const [linking, setLinking] = useState(false)
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const shown = choice === 'remove' ? undefined : choice ? choice.url : current
  // A picture chosen and then replaced is let go.
  useEffect(() => {
    const url = choice && choice !== 'remove' ? choice.url : null
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [choice])

  const take = async (blob: Promise<Blob> | Blob) => {
    setBusy(true)
    try {
      const made = await resizePhoto(await blob)
      onChoice({ ...made, url: URL.createObjectURL(made.blob) })
      setLinking(false)
      setLink('')
    } catch {
      toast('That picture can’t be used. Save it and choose it from a file')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {shown && <RecipePhoto src={shown} alt="Photo" className="w-28 rounded-md" />}
        <div className="flex flex-col items-start gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button type="button" variant="outline" size="sm" disabled={busy} />}
            >
              {shown ? (
                'Change photo'
              ) : (
                <>
                  <PlusIcon /> Add a photo
                </>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => file.current?.click()}>
                <ImageIcon /> From a file or the camera
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLinking(true)}>
                <LinkIcon /> From a link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {shown && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => onChoice(current ? 'remove' : null)}
            >
              Remove
            </Button>
          )}
        </div>
        <input
          ref={file}
          type="file"
          accept="image/*"
          hidden
          aria-label="Photo"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void take(f)
          }}
        />
      </div>
      {linking && (
        <div className="flex gap-2">
          <Input
            type="url"
            inputMode="url"
            autoFocus
            aria-label="Photo link"
            placeholder="Link to a picture"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              if (link.trim()) void take(photoFromLink(link.trim()))
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!link.trim() || busy}
            onClick={() => void take(photoFromLink(link.trim()))}
          >
            Use
          </Button>
        </div>
      )}
    </div>
  )
}
