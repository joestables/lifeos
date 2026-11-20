import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * Shopping became Recipes' Shop tab, and its other lists Notes' Lists
 * (ADR-0069): a bookmark or an old link opens the one it meant.
 */
export const Route = createFileRoute('/_app/shopping/')({
  beforeLoad: ({ search }) => {
    throw redirect(
      (search as Record<string, unknown>).tab === 'lists'
        ? { to: '/notes', search: { tab: 'lists' }, replace: true }
        : { to: '/recipes', search: { tab: 'shop' }, replace: true },
    )
  },
})
