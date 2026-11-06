import { EllipsisIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { CardRow, TimeField } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/sonner'
import { Switch } from '@/components/ui/switch'
import { queue, removeDevice, setDevice, updateSettings, useDevices, useSettings } from '@/data'
import { isAndroidApp } from '@/native/platform'
import { pushSupport, turnOnNotifications, useThisDevice } from './notifications'

function Titled({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="gap-1.5">
      <h2 className="mb-2 flex h-8 items-center text-h2">{title}</h2>
      {children}
    </Card>
  )
}

/** Why this device can't turn notifications on, in a few words (REM-001 3). */
const WHY_NOT = {
  'ios-browser': 'Add LifeOS to your Home Screen first',
  unsupported: 'Not available in this browser',
  denied: "Blocked in this browser's settings",
} as const

/**
 * Notifications (REM-001): turn them on for this device, and each of my
 * devices with its switch, or removed.
 */
export function NotificationsCard() {
  const { devices } = useDevices(queue)
  const { endpoint, refresh } = useThisDevice()
  const support = pushSupport()
  const [denied, setDenied] = useState(
    () => support === 'ok' && !isAndroidApp() && Notification.permission === 'denied',
  )
  const thisOne = devices.find((d) => d.endpoint === endpoint && d.gone_at === null)

  const turnOn = async () => {
    const result = await turnOnNotifications()
    if (result === 'denied') setDenied(true)
    if (result === 'failed') toast("Couldn't turn notifications on. Try again")
    refresh()
  }

  const why = support !== 'ok' ? WHY_NOT[support] : denied ? WHY_NOT.denied : undefined

  return (
    <Titled title="Notifications">
      {!thisOne && (
        <CardRow label="This device">
          {why ? (
            <span className="text-sm text-muted-foreground">{why}</span>
          ) : (
            <Button variant="outline" size="sm" onClick={() => void turnOn()}>
              Turn on
            </Button>
          )}
        </CardRow>
      )}
      {devices.map((d) => (
        <CardRow
          key={d.id}
          label={d.label || 'A device'}
          value={
            d.gone_at !== null
              ? "Can't be reached"
              : d.id === thisOne?.id
                ? 'This device'
                : undefined
          }
        >
          <Switch
            aria-label={`Notifications on ${d.label || 'this device'}`}
            checked={d.enabled && d.gone_at === null}
            disabled={d.gone_at !== null}
            onCheckedChange={(on) => setDevice(d.id, on)}
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" aria-label={`${d.label} options`} />}
            >
              <EllipsisIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onClick={() => removeDevice(d.id)}>
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardRow>
      ))}
    </Titled>
  )
}

/** A time in Settings, kept as it is chosen. */
function SettingTime({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (time: string) => void
}) {
  return (
    <TimeField
      aria-label={label}
      className="w-32"
      value={value.slice(0, 5)}
      onChange={(t) => t && t !== value.slice(0, 5) && onChange(t)}
    />
  )
}

/** Reminders (REM-007, REM-008): my default time, the defaults by Type, the morning digest. */
export function RemindersCard() {
  const settings = useSettings(queue)
  return (
    <Titled title="Reminders">
      <CardRow label="Default time">
        <SettingTime
          key={settings.defaultReminderTime}
          label="Default time"
          value={settings.defaultReminderTime}
          onChange={(time) => updateSettings({ default_reminder_time: time })}
        />
      </CardRow>
      <CardRow label="Dated tasks">
        <Switch
          aria-label="Remind me of dated tasks"
          checked={settings.taskReminders}
          onCheckedChange={(on) => updateSettings({ reminder_defaults: { task: on } })}
        />
      </CardRow>
      <CardRow label="Dated thoughts">
        <Switch
          aria-label="Remind me of dated thoughts"
          checked={settings.thoughtReminders}
          onCheckedChange={(on) => updateSettings({ reminder_defaults: { thought: on } })}
        />
      </CardRow>
      <CardRow label="Events, 30 min before">
        <Switch
          aria-label="Remind me 30 minutes before events"
          checked={settings.eventReminders}
          onCheckedChange={(on) => updateSettings({ reminder_defaults: { event: on } })}
        />
      </CardRow>
      <CardRow label="Morning digest">
        <Switch
          aria-label="Morning digest"
          checked={settings.digestOn}
          onCheckedChange={(on) => updateSettings({ digest_on: on })}
        />
      </CardRow>
      {settings.digestOn && (
        <CardRow label="Digest time">
          <SettingTime
            key={settings.digestTime}
            label="Digest time"
            value={settings.digestTime}
            onChange={(time) => updateSettings({ digest_time: time })}
          />
        </CardRow>
      )}
    </Titled>
  )
}
