import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { AddRow } from './AddRow'

/**
 * A Task's sub-tasks (components.md, TSK-006): tick, rename in place, or
 * empty a title and press Backspace to remove it; then "Add a sub-task".
 */
export function SubtaskList({
  subtasks,
  onToggle,
  onRename,
  onRemove,
  onAdd,
}: {
  subtasks: readonly { id: string; title: string; done: boolean }[]
  onToggle: (id: string, done: boolean) => void
  onRename: (id: string, title: string) => void
  onRemove: (id: string) => void
  onAdd: (title: string) => void
}) {
  return (
    <div className="flex flex-col">
      {subtasks.map((s) => (
        <div key={s.id} className="flex min-h-[34px] items-center gap-3 max-sm:min-h-10">
          <Checkbox
            aria-label={`Done: ${s.title}`}
            checked={s.done}
            onCheckedChange={(done) => onToggle(s.id, done)}
          />
          <input
            aria-label="Sub-task"
            defaultValue={s.title}
            onBlur={(e) =>
              e.target.value.trim() !== s.title && onRename(s.id, e.target.value.trim())
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Backspace' && e.currentTarget.value === '') {
                e.preventDefault()
                onRemove(s.id)
              }
            }}
            className={cn(
              'min-w-0 flex-1 bg-transparent text-base outline-none',
              s.done && 'text-muted-foreground line-through',
            )}
          />
        </div>
      ))}
      <AddRow placeholder="Add a sub-task" onAdd={onAdd} className="max-sm:min-h-10" />
    </div>
  )
}
