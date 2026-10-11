import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Trash2Icon } from 'lucide-react'
import { EmptyState, ItemRow, PageHeader, TypeTile } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { archiveItem, queue, restoreItem, useDeletedItems } from '@/data'
import { whenAgo } from '@/lib/dates'
import { itemTitle, typeLook } from '@/lib/item-types'

/** Every deleted Item, of every Type, the most recently deleted first (ITM-003). */
export const Route = createFileRoute('/_app/settings/deleted')({
  component: RecentlyDeleted,
})

function RecentlyDeleted() {
  const navigate = useNavigate()
  const { items, isLoading } = useDeletedItems(queue)
  return (
    <>
      <PageHeader
        title="Recently deleted"
        back={{ label: 'Settings', onClick: () => void navigate({ to: '/settings' }) }}
      />
      <div className="max-w-3xl px-5 pb-8 sm:px-9">
        {!isLoading && items.length === 0 && (
          <EmptyState icon={Trash2Icon} title="Nothing deleted" />
        )}
        <div className="flex flex-col gap-1.5">
          {items.map((item) => {
            const look = typeLook(item.type)
            const title = itemTitle(item)
            return (
              <ItemRow
                key={item.id}
                leading={<TypeTile colour={look.colour} icon={look.icon} size="sm" />}
                title={title}
                meta={[look.label, `Deleted ${whenAgo(item.archived_at!)}`]}
                sync={item.sync}
                trailing={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      restoreItem(item.id)
                      toast(`Restored "${title}"`, {
                        action: { label: 'Undo', onClick: () => archiveItem(item.id) },
                      })
                    }}
                  >
                    Restore
                  </Button>
                }
              />
            )
          })}
        </div>
      </div>
    </>
  )
}
