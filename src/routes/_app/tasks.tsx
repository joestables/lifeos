import { createFileRoute, redirect } from '@tanstack/react-router'

/** Tasks became Plan in Stage 7b (PLA-001 1): an old link opens Plan, Recurring kept. */
export const Route = createFileRoute('/_app/tasks')({
  beforeLoad: ({ search }) => {
    const view = (search as Record<string, unknown>).view
    throw redirect({
      to: '/plan',
      search: view === 'recurring' ? { tab: 'recurring' as const } : {},
      replace: true,
    })
  },
})
