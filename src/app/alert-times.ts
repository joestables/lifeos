import { useCallback, useMemo } from 'react'
import { queue, useAlerts, useSettings, type Alert, type Item } from '@/data'
import { alertTimes, type AlertTime } from '@/lib/plan'

/**
 * Each Reminder's Alerts as days and times, for Plan and the Today widget
 * to place it on each day it alerts (RMD-003 1).
 */
export function useAlertTimes(): (item: Item) => AlertTime[] {
  const settings = useSettings(queue)
  const alerts = useAlerts(queue)
  const byItem = useMemo(() => {
    const m = new Map<string, Alert[]>()
    for (const a of alerts) m.set(a.item_id, [...(m.get(a.item_id) ?? []), a])
    return m
  }, [alerts])
  return useCallback(
    (item: Item) => alertTimes(item, byItem.get(item.id) ?? [], settings.timezone),
    [byItem, settings.timezone],
  )
}
