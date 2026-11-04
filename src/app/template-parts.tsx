import { useNavigate } from '@tanstack/react-router'
import { ClipboardListIcon, CopyIcon, EllipsisIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { useId, useState } from 'react'
import { PanelFooter, PanelHeading, PanelRow, TypeTile } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  createTemplate,
  updateItem,
  type GymData,
  type TemplateView,
  type WorkoutView,
} from '@/data'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { fromIsoDay, shortDate } from '@/lib/dates'
import { sameName, sortTemplates } from '@/lib/gym'
import { deleteTemplate, duplicate, plannedFrom, templateMeta } from './template-actions'
import { Field } from './task-details'

/** A template's tile (patterns.md#icons). */
export function TemplateTile() {
  return <TypeTile colour="coral" icon={ClipboardListIcon} />
}

/** A template's name: a new one, or a new name for one (GYM-006 1, 5). */
export function TemplateNameDialog({
  template,
  templates,
  onClose,
  onMade,
}: {
  template?: TemplateView
  templates: readonly TemplateView[]
  onClose: () => void
  onMade?: (id: string) => void
}) {
  const ids = useId()
  const [name, setName] = useState(template?.item.title ?? '')
  const taken = templates.find(
    (t) => t.item.id !== template?.item.id && sameName(t.item.title, name),
  )
  const ready = name.trim() !== '' && !taken
  const save = () => {
    if (!ready) return
    if (template) updateItem(template.item.id, { title: name.trim() })
    else onMade?.(createTemplate(name))
    onClose()
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-colour="coral" className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{template ? 'Rename template' : 'New template'}</DialogTitle>
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
              value={name}
              autoFocus
              maxLength={60}
              autoComplete="off"
              placeholder="Push A"
              onChange={(e) => setName(e.target.value)}
              aria-invalid={taken ? true : undefined}
            />
            {taken && (
              <p className="text-sm text-destructive">You already have {taken.item.title}</p>
            )}
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!ready}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** A template's "…": Rename, Duplicate, Delete (GYM-006 5). */
export function TemplateMenu({
  template,
  templates,
  workouts,
  onRename,
  onDuplicated,
  onDeleted,
}: {
  template: TemplateView
  templates: readonly TemplateView[]
  /** Every workout: one planned to follow it keeps it from being deleted. */
  workouts: readonly WorkoutView[]
  onRename: () => void
  onDuplicated?: (id: string) => void
  onDeleted?: () => void
}) {
  const [blocked, setBlocked] = useState<WorkoutView[] | null>(null)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={`${template.item.title} options`} />
          }
        >
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onRename}>
            <PencilIcon /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDuplicated?.(duplicate(template, templates))}>
            <CopyIcon /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              // A planned workout follows it: change or delete that first (GYM-006 5).
              const planned = plannedFrom(template, workouts)
              if (planned.length) return setBlocked(planned)
              deleteTemplate(template)
              onDeleted?.()
            }}
          >
            <Trash2Icon /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={blocked !== null} onOpenChange={(o) => !o && setBlocked(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{template.item.title} is planned</AlertDialogTitle>
            <AlertDialogDescription>
              {blocked
                ?.map((w) => (w.item.do_on ? shortDate(fromIsoDay(w.item.do_on)) : w.item.title))
                .join(', ')}
              . Change its template or delete it first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setBlocked(null)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/**
 * Templates on the Workouts tab (GYM-006 6): the six used most recently
 * (three on a phone), each with its exercises, sets and when last used, then
 * All templates.
 */
export function TemplatesCard({ gym, count }: { gym: GymData; count: number }) {
  const navigate = useNavigate()
  const shown = sortTemplates(
    gym.templates.map((t) => ({
      ...t,
      name: t.item.title,
      usesThisMonth: 0,
    })),
    'recent',
    'desc',
  ).slice(0, count)
  return (
    <Card className="gap-3">
      <PanelHeading title="Templates" />
      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">No templates yet</p>
      ) : (
        <div className="flex flex-col">
          {shown.map((t) => (
            <PanelRow
              key={t.item.id}
              leading={<TemplateTile />}
              title={t.item.title}
              meta={templateMeta(t)}
              onOpen={() => void navigate({ to: '/gym/templates/$id', params: { id: t.item.id } })}
            />
          ))}
        </div>
      )}
      <PanelFooter label="All templates" onClick={() => void navigate({ to: '/gym/templates' })} />
    </Card>
  )
}
