import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { todayIn } from '@lifeos/recurrence'
import { useState } from 'react'
import { PageAction, PageHeader, TabsRow, TypeScope } from '@/components/lifeos'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WeekTab } from '@/app/meal-week'
import { PantryTab } from '@/app/pantry-tab'
import { queue, useSettings } from '@/data'

/**
 * The Meal plan (patterns.md#meal-plan): the week's Meals (MPL-001–004)
 * and the Pantry (PAN-001–004), as two tabs.
 */
export const Route = createFileRoute('/_app/meal-plan')({
  validateSearch: (search: Record<string, unknown>): { tab?: 'pantry'; day?: string } => ({
    ...(search.tab === 'pantry' ? { tab: 'pantry' as const } : {}),
    ...(typeof search.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(search.day)
      ? { day: search.day }
      : {}),
  }),
  component: MealPlanPage,
})

function MealPlanPage() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const settings = useSettings(queue)
  const today = todayIn(settings.timezone)
  const tab = search.tab ?? 'week'
  const [creating, setCreating] = useState(false)
  const newEntry = () => setCreating(true)

  return (
    <TypeScope colour="green">
      <PageHeader
        title="Meal plan"
        action={tab === 'pantry' ? { label: 'New entry', onClick: newEntry } : undefined}
      />
      <div className="flex flex-col gap-4 px-5 pb-28 sm:px-9 sm:pb-8">
        <TabsRow>
          <Tabs
            value={tab}
            onValueChange={(v) =>
              void navigate({
                to: '.',
                search: (prev) => ({ ...prev, tab: v === 'pantry' ? 'pantry' : undefined }),
                replace: true,
              })
            }
          >
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="pantry">Pantry</TabsTrigger>
            </TabsList>
          </Tabs>
          {tab === 'pantry' && <PageAction label="New entry" onClick={newEntry} />}
        </TabsRow>
        {tab === 'pantry' ? (
          <PantryTab creating={creating} onCreating={setCreating} />
        ) : (
          <WeekTab
            day={search.day ?? today}
            today={today}
            onDay={(day) =>
              void navigate({
                to: '.',
                search: (prev) => ({ ...prev, day: day === today ? undefined : day }),
                replace: true,
              })
            }
          />
        )}
      </div>
    </TypeScope>
  )
}
