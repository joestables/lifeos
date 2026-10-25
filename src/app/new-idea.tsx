import { useEffect, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/sonner'
import { Textarea } from '@/components/ui/textarea'
import { archiveItem, createRecipe, linkPreview, updateVariation, type FoodData } from '@/data'
import { resizePhoto } from '@/lib/photo-resize'
import { nameTaken } from '@/lib/recipes'
import { keepPhoto, type PhotoChoice } from './keep-photo'
import { LinksField } from './links-field'
import { PhotoField } from './photo-field'
import { Field } from './task-details'

/**
 * New idea (RCP-002 1): only the name is needed; any number of links and a
 * note are optional. Nothing is kept until Save. From the iOS Shortcut
 * (RCP-003 4) it opens with the shared link and its name filled in; with
 * signal, the link's own name and picture fill what is still empty.
 */
export function NewIdeaDialog({
  food,
  link,
  name: sharedName,
  onClose,
}: {
  food: FoodData
  link?: string
  name?: string
  onClose: () => void
}) {
  const ids = useId()
  const [name, setName] = useState(sharedName ?? '')
  const [links, setLinks] = useState([link ?? ''])
  const [note, setNote] = useState('')
  const [tried, setTried] = useState(false)
  const [photo, setPhotoChoice] = useState<PhotoChoice>(null)
  useEffect(() => {
    if (!link) return
    let gone = false
    void linkPreview(link).then(async (found) => {
      if (gone || !found) return
      if (found.name) setName((n) => n || found.name!)
      if (!found.photo) return
      try {
        const made = await resizePhoto(await (await fetch(found.photo)).blob())
        if (!gone) setPhotoChoice((c) => c ?? { ...made, url: URL.createObjectURL(made.blob) })
      } catch {
        // A picture the browser can't read: none chosen.
      }
    })
    return () => {
      gone = true
    }
  }, [link])
  const taken = name.trim() ? nameTaken(food.recipes, name) : undefined
  const problem = taken
    ? taken.mine
      ? 'You already have a recipe with this name'
      : 'A recipe in your Household has this name'
    : null

  const save = () => {
    setTried(true)
    if (!name.trim() || problem) return
    const { recipe, variation } = createRecipe(name.trim(), 'idea')
    keepPhoto(recipe, photo, undefined)
    const sources = links.map((l) => l.trim()).filter(Boolean)
    if (sources.length || note.trim())
      updateVariation(variation, {
        ...(sources.length ? { sources } : {}),
        ...(note.trim() ? { notes: note.trim() } : {}),
      })
    onClose()
    toast('Idea saved', { action: { label: 'Undo', onClick: () => archiveItem(recipe) } })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-colour="green">
        <DialogHeader>
          <DialogTitle>New idea</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <Field label="Name" htmlFor={`${ids}-name`}>
            <Input
              id={`${ids}-name`}
              autoFocus
              autoComplete="off"
              value={name}
              aria-invalid={(tried && problem !== null) || undefined}
              onChange={(e) => setName(e.target.value)}
            />
            {tried && problem && <p className="text-sm text-destructive">{problem}</p>}
          </Field>
          <Field label="Links">
            <LinksField links={links} onChange={setLinks} />
          </Field>
          <Field label="Note" htmlFor={`${ids}-note`}>
            <Textarea
              id={`${ids}-note`}
              placeholder="Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          <PhotoField choice={photo} onChoice={setPhotoChoice} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
