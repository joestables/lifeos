import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * The Meal plan became Recipes' Week and Pantry tabs (ADR-0069): a bookmark
 * or an old link opens the same tab, its day or Pending too.
 */
export const Route = createFileRoute('/_app/meal-plan')({
  beforeLoad: ({ search }) => {
    const s = search as Record<string, unknown>
    const pantry = s.tab === 'pantry'
    throw redirect({
      to: '/recipes',
      search: {
        tab: pantry ? 'pantry' : 'week',
        ...(pantry && s.view === 'pending' ? { view: 'pending' as const } : {}),
        ...(typeof s.day === 'string' ? { day: s.day } : {}),
      },
      replace: true,
    })
  },
})
