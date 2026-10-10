import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()
/** Set to make the next sends throw, as fetch does offline (not a vi.fn, which records the throw). */
let offline = false
vi.mock('./supabase', () => ({
  supabase: () => ({
    rpc: async (...args: unknown[]) => {
      if (offline) throw new Error('Failed to fetch')
      return rpc(...args)
    },
  }),
}))

const { describeClick, lastActions, noteAction, reportEvent } = await import('./report')

describe('reporting problems (runbook.md#noticing-problems)', () => {
  beforeEach(() => rpc.mockReset())

  it('keeps only the last ten actions', () => {
    for (let i = 1; i <= 12; i++) noteAction(`navigate /page-${i}`)
    expect(lastActions()).toHaveLength(10)
    expect(lastActions()[0]?.did).toBe('navigate /page-3')
  })

  it('OFF-004: sends the event with the screen and the last actions', async () => {
    rpc.mockResolvedValue({ error: null })
    await reportEvent('write_refused', 'violates check', { fn: 'update_item' })
    expect(rpc).toHaveBeenCalledWith(
      'report_event',
      expect.objectContaining({
        p_kind: 'write_refused',
        p_message: 'violates check',
        p_details: { fn: 'update_item' },
        p_screen: '/',
        p_actions: expect.arrayContaining([expect.objectContaining({ did: 'navigate /page-12' })]),
      }),
    )
  })

  it('keeps a report it could not send, and sends it next time', async () => {
    rpc.mockResolvedValueOnce({ error: { message: 'offline' } }).mockResolvedValue({ error: null })
    await reportEvent('error', 'first')
    await reportEvent('error', 'second')
    expect(rpc.mock.calls.map(([, r]) => (r as { p_message: string }).p_message)).toEqual([
      'first',
      'first',
      'second',
    ])
  })

  it('never fails, even when sending throws', async () => {
    offline = true
    await expect(reportEvent('error', 'boom')).resolves.toBeUndefined()
    offline = false
  })

  it('records a click by the kind of control and its path, never its text', () => {
    document.body.innerHTML = `
      <button data-slot="button"><span id="inner">Book the dentist</span></button>
      <a href="/inbox">Inbox</a>`
    expect(describeClick(document.getElementById('inner')!)).toBe('click button')
    expect(describeClick(document.querySelector('a')!)).toBe('click a /inbox')
  })
})
