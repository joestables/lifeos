import { createFileRoute, redirect } from '@tanstack/react-router'

/** Inbox became Today in Stage 7b (TDY-001 7): a bookmark or an old notification opens Today. */
export const Route = createFileRoute('/_app/inbox')({
  beforeLoad: ({ search }) => {
    const item = (search as Record<string, unknown>).item
    throw redirect({
      to: '/today',
      search: typeof item === 'string' ? { item } : {},
      replace: true,
    })
  },
})
