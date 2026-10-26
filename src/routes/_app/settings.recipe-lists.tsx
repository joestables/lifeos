import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PageHeader } from '@/components/lifeos'
import { ValueListCard } from '@/app/recipe-lists'
import { VALUE_LISTS } from '@/lib/recipes'

/**
 * My Recipe lists (RCP-018 1): categories, cuisines, tags, protein and
 * carbs, each a Card like Labels.
 */
export const Route = createFileRoute('/_app/settings/recipe-lists')({
  component: RecipeLists,
})

function RecipeLists() {
  const navigate = useNavigate()
  return (
    <>
      <PageHeader
        title="Recipe lists"
        back={{ label: 'Settings', onClick: () => void navigate({ to: '/settings' }) }}
      />
      <div className="flex max-w-3xl flex-col gap-4 px-5 pb-8 sm:px-9">
        {VALUE_LISTS.map((l) => (
          <ValueListCard key={l.kind} {...l} />
        ))}
      </div>
    </>
  )
}
