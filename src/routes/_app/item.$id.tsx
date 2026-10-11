import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { ItemPage, PageHeader } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { deleteItem, draftNote } from '@/app/item-navigation'
import { NoteBody } from '@/app/note-body'
import { ItemActions, ItemContent } from '@/app/items'
import { queue, useItem } from '@/data'
import { useIsMobile } from '@/hooks/use-mobile'
import { itemTitle, opensAsPage, typeLook } from '@/lib/item-types'

/**
 * An Item's own link (ITM-001): its own page where its Type opens as one (a
 * Note on a phone); otherwise its home page with it open in a popup.
 */
export const Route = createFileRoute('/_app/item/$id')({
  component: ItemRoute,
})

function ItemRoute() {
  const { id } = Route.useParams()
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const router = useRouter()
  const { new: isNew } = Route.useSearch()
  const { item: found, status } = useItem(queue, id)
  // A new Note, opened before it is kept (patterns.md#notes).
  const draft = isNew === 'note' && !found
  const item = found ?? (draft ? draftNote(id) : undefined)
  const asPage = item !== undefined && opensAsPage(item.type, isMobile)

  useEffect(() => {
    if (item && !asPage)
      void navigate({
        to: typeLook(item.type).home,
        search: { item: item.id, ...(draft ? { new: 'note' as const } : {}) },
        replace: true,
      })
  }, [item, asPage, draft, navigate])

  if (status === 'loading' && !draft) return null
  if (!item) {
    return (
      <>
        <PageHeader title="This can't be found" />
        <div className="px-5 sm:px-9">
          <Button onClick={() => void navigate({ to: '/inbox' })}>Go to Inbox</Button>
        </div>
      </>
    )
  }
  if (!asPage) return null

  const look = typeLook(item.type)
  const back = () =>
    router.history.canGoBack() ? router.history.back() : void navigate({ to: look.home })
  return (
    <ItemPage
      colour={look.colour}
      back={{ label: look.homeLabel, onClick: back }}
      title={itemTitle(item)}
      titleField={item.type === 'note' && <NoteBody key={item.id} item={item} draft={draft} />}
      actions={
        !draft && (
          <ItemActions
            item={item}
            onDelete={() => {
              back()
              deleteItem(item)
            }}
          />
        )
      }
    >
      {item.type !== 'note' && <ItemContent item={item} />}
    </ItemPage>
  )
}
