import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PageAction, PageHeader, TabsRow, TypeScope } from '@/components/lifeos'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NewListDialog } from '@/app/new-list'
import { FoodTab, ListsTab } from '@/app/shopping-tabs'

/**
 * Shopping (patterns.md#shopping): Food, the food shops and each Space's
 * staples and Essentials; Lists, shopping that isn't food (SHP-001, SHP-005).
 * Online comes in a later stage.
 */
export const Route = createFileRoute('/_app/shopping/')({
  validateSearch: (search: Record<string, unknown>): { tab?: 'lists' } =>
    search.tab === 'lists' ? { tab: 'lists' } : {},
  component: ShoppingPage,
})

function ShoppingPage() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const tab = search.tab ?? 'food'
  const [creating, setCreating] = useState(false)
  const label = tab === 'food' ? 'New shop' : 'New list'
  const create = () => setCreating(true)
  return (
    <TypeScope colour="yellow">
      <PageHeader title="Shopping" action={{ label, onClick: create }} />
      <div className="flex flex-col gap-6 px-5 pb-28 sm:px-9 sm:pb-8">
        <TabsRow>
          <Tabs
            value={tab}
            onValueChange={(v) =>
              void navigate({
                to: '.',
                search: (prev) => ({
                  ...prev,
                  tab: v === 'lists' ? ('lists' as const) : undefined,
                }),
                replace: true,
              })
            }
          >
            <TabsList>
              <TabsTrigger value="food">Food</TabsTrigger>
              <TabsTrigger value="lists">Lists</TabsTrigger>
            </TabsList>
          </Tabs>
          <PageAction label={label} onClick={create} />
        </TabsRow>
        {tab === 'food' ? <FoodTab /> : <ListsTab />}
      </div>
      {creating && (
        <NewListDialog kind={tab === 'food' ? 'food' : 'list'} onClose={() => setCreating(false)} />
      )}
    </TypeScope>
  )
}
