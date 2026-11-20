import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PageHeader } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { ListPage } from '@/app/list-page'
import { queue, useLists } from '@/data'

/** A List's own page (NTE-006 2): opened from Notes' Lists, Search or its link. */
export const Route = createFileRoute('/_app/lists/$id')({
  component: ListRoute,
})

function ListRoute() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { byId, isLoading } = useLists(queue)
  const list = byId.get(id)
  if (!list) {
    if (isLoading) return null
    return (
      <>
        <PageHeader title="This can't be found" />
        <div className="px-5 sm:px-9">
          <Button onClick={() => void navigate({ to: '/notes', search: { tab: 'lists' } })}>
            Go to Lists
          </Button>
        </div>
      </>
    )
  }
  return <ListPage list={list} />
}
