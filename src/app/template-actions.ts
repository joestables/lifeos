import { toast } from '@/components/ui/sonner'
import { archiveItem, duplicateTemplate, restoreItem, type TemplateView } from '@/data'
import { copyName, counted, since } from '@/lib/gym'

/** "5 exercises · 15 sets · Never used" (GYM-006 6, GYM-022 1). */
export function templateMeta(t: TemplateView): string[] {
  return [
    counted(t.exerciseCount, 'exercise'),
    counted(t.setCount, 'set'),
    t.lastUsed === null ? 'Never used' : since('Used', t.lastUsed),
  ]
}

/** A copy of a template under a new name, its exercises and sets as they are (GYM-006 5). */
export function duplicate(t: TemplateView, templates: readonly TemplateView[]): string {
  const name = copyName(
    t.item.title,
    templates.map((o) => o.item.title),
  )
  const id = duplicateTemplate(
    name,
    t.lines.flatMap((l) =>
      l.exercise ? [{ exerciseId: l.exercise.item.id, position: l.position, sets: l.sets }] : [],
    ),
  )
  toast(`Made "${name}"`)
  return id
}

/** Deleted to Recently deleted, with Undo; workouts that followed it keep their copy (GYM-006 5). */
export function deleteTemplate(t: TemplateView) {
  archiveItem(t.item.id)
  toast(`Deleted "${t.item.title}"`, {
    action: { label: 'Undo', onClick: () => restoreItem(t.item.id) },
  })
}
