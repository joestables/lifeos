import { todayIn } from '@lifeos/recurrence'
import { useEffect, useMemo } from 'react'
import { queue, useItems, useSettings } from '@/data'
import { widgetChoices, widgetDays } from '@/lib/today-widget'

/**
 * In the Android app, hands the Today widget today's and tomorrow's cards
 * whenever they change on the phone, so it shows a change within seconds,
 * offline too (WID-002 5, ADR-0064). Mounted once in the app; renders
 * nothing.
 */
export function TodayWidgetFeed() {
  const settings = useSettings(queue)
  const { items, isLoading } = useItems(queue)
  const today = todayIn(settings.timezone)
  const days = useMemo(
    () =>
      isLoading
        ? null
        : JSON.stringify(widgetDays(items, today, settings.timezone, settings.planHiddenTypes)),
    [isLoading, items, today, settings.timezone, settings.planHiddenTypes],
  )
  useEffect(() => {
    if (!days) return
    void import('@/native/lifeos').then(({ LifeosNative }) =>
      LifeosNative.setPlan({ days: JSON.parse(days), choices: widgetChoices() }).catch(
        () => undefined,
      ),
    )
  }, [days])
  return null
}
