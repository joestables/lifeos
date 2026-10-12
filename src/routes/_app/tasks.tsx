import { parseCapture } from '@lifeos/capture'
import { describeRule } from '@lifeos/recurrence'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SquareCheckBigIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AddRow, EmptyState, PageHeader, SectionLabel, TypeScope } from '@/components/lifeos'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useOpenCapture } from '@/app/open-capture'
import { createTaskFrom } from '@/app/task-actions'
import { useTaskFacts } from '@/app/task-facts'
import { TaskRow } from '@/app/task-row'
import { addLabel, queue, useItems, type Item, type RepeatMode } from '@/data'
import { completedTasks, recurringTasks, taskGroups, tasksByLabel } from '@/lib/tasks'

type View = 'all' | 'labels' | 'recurring' | 'done'
const VIEWS: { value: View; label: string }[] = [
  { value: 'all', label: 'All tasks' },
  { value: 'labels', label: 'By label' },
  { value: 'recurring', label: 'Recurring' },
  { value: 'done', label: 'Completed' },
]

/** My Tasks, by when, by Label, repeating, or done (views/tasks.md). */
export const Route = createFileRoute('/_app/tasks')({
  validateSearch: (search: Record<string, unknown>): { view?: View } =>
    search.view === 'labels' || search.view === 'recurring' || search.view === 'done'
      ? { view: search.view }
      : {},
  component: Tasks,
})

function Tasks() {
  const { view = 'all' } = Route.useSearch()
  const navigate = useNavigate()
  const openCapture = useOpenCapture()
  const { items, isLoading } = useItems(queue)
  const facts = useTaskFacts()
  const now = new Date()
  const hasTasks = useMemo(() => items.some((i) => i.type === 'task'), [items])

  /** In By label the group is the Label, so rows leave Labels out. */
  const row = (t: Item, showDay = false, withLabels = true, repeat?: string) => {
    const f = facts.of(t)
    return (
      <TaskRow
        key={t.id}
        task={t}
        now={now}
        showDay={showDay}
        {...f}
        labels={withLabels ? f.labels : []}
        repeat={repeat ?? f.repeat}
      />
    )
  }

  return (
    <TypeScope colour="blue">
      <PageHeader
        title="Tasks"
        action={{ label: 'New task', onClick: () => openCapture('task') }}
      />
      <div className="flex max-w-3xl flex-col gap-5 px-5 pb-28 sm:px-9 sm:pb-8">
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
        {!isLoading && !hasTasks && <EmptyState icon={SquareCheckBigIcon} title="No tasks yet" />}

        {view === 'all' &&
          taskGroups(items, now).map((g) => (
            <section key={g.key}>
              <SectionLabel danger={g.danger} count={g.tasks.length}>
                {g.label}
              </SectionLabel>
              <div className="flex flex-col gap-1.5">
                {g.tasks.map((t) => row(t, g.key === 'later' || g.key === 'someday'))}
              </div>
            </section>
          ))}

        {view === 'labels' && <ByLabel items={items} now={now} row={row} facts={facts} />}

        {view === 'recurring' &&
          recurringTasks(items, facts.series, now).map((g) => (
            <section key={g.key}>
              <SectionLabel count={g.tasks.length}>{g.label}</SectionLabel>
              <div className="flex flex-col gap-1.5">
                {g.tasks.map(({ task, series }) =>
                  // Its repeat in full, and its next date (views/tasks.md).
                  row(
                    task,
                    true,
                    true,
                    describeRule(series.rule, series.starts_on, series.mode as RepeatMode),
                  ),
                )}
              </div>
            </section>
          ))}

        {view === 'done' && (
          <div className="flex flex-col gap-1.5">{completedTasks(items).map((t) => row(t))}</div>
        )}
      </div>
    </TypeScope>
  )
}

/** Each Label's open Tasks, then No label; each Label's group ends with "Add a task" (TSK-001, TSK-004). */
function ByLabel({
  items,
  now,
  row,
  facts,
}: {
  items: Item[]
  now: Date
  row: (t: Item, showDay?: boolean, withLabels?: boolean) => React.ReactNode
  facts: ReturnType<typeof useTaskFacts>
}) {
  const groups = tasksByLabel(items, facts.labels, facts.itemLabels, now)
  // Every group open, including ones that arrive after the page is drawn,
  // unless I closed it.
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set())
  const keys = groups.map((g) => g.id ?? 'none')
  return (
    <Accordion
      multiple
      value={keys.filter((k) => !closed.has(k))}
      onValueChange={(open: string[]) => setClosed(new Set(keys.filter((k) => !open.includes(k))))}
    >
      {groups.map((g) => (
        <AccordionItem key={g.id ?? 'none'} value={g.id ?? 'none'}>
          <AccordionTrigger>
            {g.name}
            <Badge variant="outline" className="tabular-nums">
              {g.tasks.length}
            </Badge>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-1.5">
            {g.tasks.map((t) => row(t, true, false))}
            {g.id && (
              <AddRow
                placeholder="Add a task"
                className="px-3.5"
                onAdd={(line) => addLabel(createTaskFrom(line, parseCapture(line)), g.id!)}
              />
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
