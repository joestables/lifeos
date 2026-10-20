import { PlusIcon } from 'lucide-react'
import { useId, useState } from 'react'
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
import { archiveItem, createRecipe, updateVariation, type FoodData } from '@/data'
import { nameTaken } from '@/lib/recipes'
import { keepPhoto, type PhotoChoice } from './keep-photo'
import { PhotoField } from './photo-field'
import { Field } from './task-details'

/**
 * New idea (RCP-002 1): only the name is needed; any number of links and a
 * note are optional. Nothing is kept until Save.
 */
export function NewIdeaDialog({ food, onClose }: { food: FoodData; onClose: () => void }) {
  const ids = useId()
  const [name, setName] = useState('')
  const [links, setLinks] = useState([''])
  const [note, setNote] = useState('')
  const [tried, setTried] = useState(false)
  const [photo, setPhotoChoice] = useState<PhotoChoice>(null)
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
            <div className="flex flex-col gap-2">
              {links.map((l, i) => (
                <Input
                  key={i}
                  type="url"
                  inputMode="url"
                  aria-label={`Link ${i + 1}`}
                  value={l}
                  onChange={(e) =>
                    setLinks((ls) => ls.map((x, j) => (j === i ? e.target.value : x)))
                  }
                />
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start text-muted-foreground"
                onClick={() => setLinks((ls) => [...ls, ''])}
              >
                <PlusIcon /> Add a link
              </Button>
            </div>
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
