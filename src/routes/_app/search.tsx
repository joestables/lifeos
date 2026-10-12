import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { PageHeader } from '@/components/lifeos'
import { SearchCommand } from '@/app/search'

/**
 * Search as a page (SRC-001): a phone's, from the drawer. What was typed is
 * kept in the address, so going back from a result finds it again.
 */
export const Route = createFileRoute('/_app/search')({
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search.q === 'string' && search.q ? { q: search.q } : {},
  component: Search,
})

function Search() {
  const navigate = useNavigate()
  const { q = '' } = Route.useSearch()
  const [query, setQuery] = useState(q)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => input.current?.focus(), [])

  const change = (value: string) => {
    setQuery(value)
    void navigate({
      to: '.',
      search: (prev) => ({ ...prev, q: value || undefined }),
      replace: true,
    })
  }

  return (
    <>
      <PageHeader title="Search" />
      <div className="flex max-w-3xl flex-col px-5 pb-8 sm:px-9">
        <SearchCommand variant="page" query={query} onQueryChange={change} inputRef={input} />
      </div>
    </>
  )
}
