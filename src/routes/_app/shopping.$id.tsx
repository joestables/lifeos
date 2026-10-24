import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PageHeader } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { ShopPage } from '@/app/shop-page'
import { queue, useShopping } from '@/data'

/** A Shopping list's own page (ITM-006 1, SHP-001): a food shop or a list. */
export const Route = createFileRoute('/_app/shopping/$id')({
  component: ShoppingListRoute,
})

function ShoppingListRoute() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { byId, isLoading } = useShopping(queue)
  const list = byId.get(id)
  if (!list) {
    if (isLoading) return null
    return (
      <>
        <PageHeader title="This can't be found" />
        <div className="px-5 sm:px-9">
          <Button onClick={() => void navigate({ to: '/shopping' })}>Go to Shopping</Button>
        </div>
      </>
    )
  }
  return <ShopPage list={list} />
}
