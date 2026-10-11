import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { RouteError } from '@/app/RouteError'
import { noteAction, startReporting } from '@/data'
import { DataProvider } from '@/data/DataProvider'
import { routeTree } from './routeTree.gen'
import '@/styles/theme.css'

const router = createRouter({
  routeTree,
  defaultErrorComponent: RouteError,
  // Each page's code starts loading as a finger touches its link.
  defaultPreload: 'intent',
  // Back returns to the same place on the page (ITM-001); the page scrolls in
  // AppShell's ScrollArea, marked data-scroll-restoration-id="page".
  scrollRestoration: true,
})

startReporting()
router.subscribe('onResolved', ({ toLocation }) => noteAction(`navigate ${toLocation.pathname}`))

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const root = document.getElementById('root')
if (!root) throw new Error('No #root element')

createRoot(root).render(
  <StrictMode>
    <DataProvider>
      <RouterProvider router={router} />
    </DataProvider>
  </StrictMode>,
)
