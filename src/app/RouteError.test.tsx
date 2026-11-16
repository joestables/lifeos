import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const reportEvent = vi.fn()
vi.mock('@/data', () => ({ reportEvent: (...args: unknown[]) => reportEvent(...args) }))
vi.mock('@/components/lifeos', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}))

const load = async () => {
  vi.resetModules()
  const { RouteError } = await import('./RouteError')
  const { reloadForNewCode } = await import('./reload')
  return { RouteError, reloadForNewCode }
}
const shown = (RouteError: Awaited<ReturnType<typeof load>>['RouteError'], error: Error) =>
  render(<RouteError error={error} reset={() => {}} />)

describe('a screen that crashes (patterns.md#states)', () => {
  const reload = vi.fn()
  beforeEach(() => {
    sessionStorage.clear()
    reportEvent.mockReset()
    reload.mockReset()
    vi.stubGlobal('location', { ...window.location, reload, assign: reload })
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('says so, with Reload, and records the crash', async () => {
    const { RouteError } = await load()
    shown(RouteError, new TypeError('boom'))
    expect(screen.getByText('Something went wrong')).toBeTruthy()
    expect(reportEvent).toHaveBeenCalledWith('crash', 'boom', { name: 'TypeError' })
    expect(reload).not.toHaveBeenCalled()
  })

  it('reloads for a page whose code went with a new deploy, showing and recording nothing', async () => {
    const { RouteError } = await load()
    shown(RouteError, new TypeError('Failed to fetch dynamically imported module: /assets/x.js'))
    expect(reload).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Something went wrong')).toBeNull()
    expect(reportEvent).not.toHaveBeenCalled()
  })

  it('is not a crash while that reload is on its way: the page opened has no code yet', async () => {
    const { RouteError, reloadForNewCode } = await load()
    // main.tsx, on vite:preloadError; the router then finds no component to show.
    expect(reloadForNewCode('/gym')).toBe(true)
    shown(RouteError, new TypeError("Cannot read properties of undefined (reading 'component')"))
    expect(screen.queryByText('Something went wrong')).toBeNull()
    expect(reportEvent).not.toHaveBeenCalled()
  })

  it('a second failure within a minute is a crash', async () => {
    sessionStorage.setItem('reloaded-for-code', String(Date.now()))
    const { RouteError } = await load()
    shown(RouteError, new TypeError('Failed to fetch dynamically imported module: /assets/x.js'))
    expect(reload).not.toHaveBeenCalled()
    expect(screen.getByText('Something went wrong')).toBeTruthy()
    expect(reportEvent).toHaveBeenCalledTimes(1)
  })
})
