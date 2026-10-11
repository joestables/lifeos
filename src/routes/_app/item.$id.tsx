import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { ItemPage, PageHeader } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { deleteItem } from '@/app/item-navigation'
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
  const { item, status } = useItem(queue, id)
  const asPage = item !== undefined && opensAsPage(item.type, isMobile)

  useEffect(() => {
    if (item && !asPage)
      void navigate({ to: typeLook(item.type).home, search: { item: item.id }, replace: true })
  }, [item, asPage, navigate])

  if (status === 'loading') return null
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
      actions={
        <ItemActions
          item={item}
          onDelete={() => {
            back()
            deleteItem(item)
          }}
        />
      }
    >
      <ItemContent item={item} />
    </ItemPage>
  )
}
