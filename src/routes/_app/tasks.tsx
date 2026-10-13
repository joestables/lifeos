import { describeRule } from '@lifeos/recurrence'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SquareCheckBigIcon, TagIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  EmptyState,
  LabelChips,
  PageAction,
  PageHeader,
  SectionLabel,
  TabsRow,
  TypeScope,
} from '@/components/lifeos'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLabelFilter, validateLabels, type LabelsSearch } from '@/app/label-filter'
import { NewTaskDialog } from '@/app/new-task'
import { useTaskFacts } from '@/app/task-facts'
import { TaskRow } from '@/app/task-row'
import { queue, useItems, type Item, type RepeatMode } from '@/data'
import { completedTasks, recurringTasks, taskGroups } from '@/lib/tasks'

type View = 'all' | 'recurring' | 'done'
const VIEWS: { value: View; label: string }[] = [
  { value: 'all', label: 'All tasks' },
  { value: 'recurring', label: 'Recurring' },
  { value: 'done', label: 'Completed' },
]

/** My Tasks, by when, repeating, or done, narrowed to the Labels I choose (views/tasks.md). */
export const Route = createFileRoute('/_app/tasks')({
  validateSearch: (search: Record<string, unknown>): { view?: View } & LabelsSearch => ({
    ...(search.view === 'recurring' || search.view === 'done' ? { view: search.view } : {}),
    ...validateLabels(search),
  }),
  component: Tasks,
})

function Tasks() {
  const search = Route.useSearch()
  const view = search.view ?? 'all'
  const navigate = useNavigate()
  const filter = useLabelFilter(search.labels)
  const [adding, setAdding] = useState(false)
  const { items: everything, isLoading } = useItems(queue)
  const facts = useTaskFacts()
  const now = new Date()
  const hasTasks = useMemo(() => everything.some((i) => i.type === 'task'), [everything])
  // The chosen Labels narrow every view (TSK-004).
  const items = everything.filter((i) => i.type !== 'task' || filter.shows(i.id))

  const row = (t: Item, showDay = false, repeat?: string) => {
    const f = facts.of(t)
    return (
      <TaskRow key={t.id} task={t} now={now} showDay={showDay} {...f} repeat={repeat ?? f.repeat} />
    )
  }
  const groups = view === 'all' ? taskGroups(items, now) : []
  const recurring = view === 'recurring' ? recurringTasks(items, facts.series, now) : []
  const done = view === 'done' ? completedTasks(items) : []
  const nothingShown = groups.length + recurring.length + done.length === 0

  return (
    <TypeScope colour="blue">
      <PageHeader title="Tasks" action={{ label: 'New task', onClick: () => setAdding(true) }} />
      {adding && <NewTaskDialog labelIds={[...filter.chosen]} onClose={() => setAdding(false)} />}
      <div className="flex max-w-3xl flex-col gap-5 px-5 pb-28 sm:px-9 sm:pb-8">
        <div className="flex flex-col gap-3">
          <TabsRow>
            <Tabs
              value={view}
              onValueChange={(value: View) =>
                void navigate({
                  to: '.',
                  search: (prev) => ({ ...prev, view: value === 'all' ? undefined : value }),
                  replace: true,
                })
              }
            >
              <TabsList aria-label="View">
                {VIEWS.map((v) => (
                  <TabsTrigger key={v.value} value={v.value}>
                    {v.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <PageAction label="New task" onClick={() => setAdding(true)} />
          </TabsRow>
          {filter.labels.length > 0 && (
            <LabelChips labels={filter.labels} chosen={filter.chosen} onChange={filter.choose} />
          )}
        </div>
        {!isLoading && !hasTasks && <EmptyState icon={SquareCheckBigIcon} title="No tasks yet" />}
        {hasTasks && filter.chosen.size > 0 && nothingShown && (
          <EmptyState icon={TagIcon} title={filter.nothing('tasks')} />
        )}

        {groups.map((g) => (
          <section key={g.key}>
            <SectionLabel danger={g.danger} count={g.tasks.length}>
              {g.label}
            </SectionLabel>
            <div className="flex flex-col gap-1.5">
              {g.tasks.map((t) => row(t, g.key === 'later' || g.key === 'someday'))}
            </div>
          </section>
        ))}

        {recurring.map((g) => (
          <section key={g.key}>
            <SectionLabel count={g.tasks.length}>{g.label}</SectionLabel>
            <div className="flex flex-col gap-1.5">
              {g.tasks.map(({ task, series }) =>
                // Its repeat in full, and its next date (views/tasks.md).
                row(
                  task,
                  true,
                  describeRule(series.rule, series.starts_on, series.mode as RepeatMode),
                ),
              )}
            </div>
          </section>
        ))}

        {done.length > 0 && <div className="flex flex-col gap-1.5">{done.map((t) => row(t))}</div>}
      </div>
    </TypeScope>
  )
}
