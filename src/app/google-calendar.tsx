import { CalendarX2Icon, EllipsisIcon, MailIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { CardRow } from '@/components/lifeos'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import {
  calendarAction,
  queue,
  setCalendarLevel,
  setNewEventsCalendar,
  useCalendar,
  type CalendarLink,
} from '@/data'
import { alertWhen, whenAgo } from '@/lib/dates'
import { CalendarSelect } from './calendar-select'
import { connectGoogleCalendar, isOn } from './google-source'

const LEVELS: { value: CalendarLink['level']; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'incoming', label: 'Incoming' },
  { value: 'two_way', label: 'Two-way' },
]

/**
 * A calendar's level (GCL-002 1), two-way only where I can edit it. The
 * first calendar made two-way becomes my default calendar; one that stops
 * being two-way stops being it (GCL-002 2).
 */
function LevelSelect({ link, links }: { link: CalendarLink; links: CalendarLink[] }) {
  const levels = LEVELS.filter(
    (l) => l.value !== 'two_way' || link.can_edit || link.level === 'two_way',
  )
  const change = (level: CalendarLink['level']) => {
    setCalendarLevel(link.id, level)
    const first = !links.some((l) => l.id !== link.id && l.level === 'two_way')
    if (level === 'two_way' && first) setNewEventsCalendar(link.id)
  }
  return (
    <Select
      value={link.level}
      items={levels}
      onValueChange={(level) => change(level as CalendarLink['level'])}
    >
      <SelectTrigger size="sm" className="w-32" aria-label={`${link.name}: sync`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {levels.map((l) => (
          <SelectItem key={l.value} value={l.value}>
            {l.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function CardTitleRow({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex h-8 items-center gap-3 pb-2">
      <h2 className="flex-1 text-h2">{title}</h2>
      {children}
    </div>
  )
}

/**
 * Settings → Google Calendar (patterns.md#settings, GCL-001, GCL-002):
 * connect; then the account and when it last synced, each calendar's level,
 * my default calendar once one is two-way, Sync now and Disconnect.
 */
export function GoogleCalendarCard() {
  const { connection, links, isLoading, isError, retry } = useCalendar(queue)
  const [busy, setBusy] = useState(false)
  const connected = isOn(connection)
  if (isError)
    return (
      <Card className="gap-0">
        <CardTitleRow title="Google Calendar" />
        <CardRow label="Couldn’t load">
          <Button variant="outline" size="sm" onClick={retry}>
            Try again
          </Button>
        </CardRow>
      </Card>
    )
  if (isLoading) return null

  const act = async (action: 'sync' | 'disconnect') => {
    setBusy(true)
    try {
      await calendarAction(action)
      toast(action === 'sync' ? 'Synced with Google Calendar' : 'Google Calendar disconnected')
    } catch {
      toast('Couldn’t reach Google Calendar. Try again in a moment')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="gap-0">
      <CardTitleRow title="Google Calendar">
        {connected && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Google Calendar options"
                  disabled={busy}
                />
              }
            >
              <EllipsisIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void act('sync')}>Sync now</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => void act('disconnect')}>
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardTitleRow>
      {connected ? (
        <>
          <CardRow
            icon={<MailIcon />}
            label={connection!.account || 'Google account'}
            value={
              connection!.state === 'broken'
                ? 'Not syncing'
                : connection!.last_synced_at
                  ? `Synced ${whenAgo(connection!.last_synced_at).replace(/^\w/, (c) => c.toLowerCase())}`
                  : 'Not synced yet'
            }
          />
          {links.map((l) => (
            <CardRow key={l.id} label={l.name} value={l.can_edit ? undefined : 'Can’t edit'}>
              <LevelSelect link={l} links={links} />
            </CardRow>
          ))}
          {links.some((l) => l.level === 'two_way') && (
            <CardRow label="Default calendar">
              <CalendarSelect
                size="sm"
                className="w-32"
                aria-label="Default calendar"
                links={links}
                value={links.find((l) => l.new_events)?.id ?? null}
                onChange={setNewEventsCalendar}
              />
            </CardRow>
          )}
        </>
      ) : (
        <CardRow label="Not connected">
          <Button variant="outline" size="sm" onClick={() => void connectGoogleCalendar()}>
            Connect
          </Button>
        </CardRow>
      )}
    </Card>
  )
}

/** Inbox's notice that Google Calendar has stopped (GCL-006 1), with Reconnect. */
export function CalendarBrokenAlert() {
  const { connection } = useCalendar(queue)
  if (!isOn(connection) || connection!.state !== 'broken') return null
  return (
    <Alert>
      <CalendarX2Icon />
      <AlertTitle>Google Calendar isn’t syncing</AlertTitle>
      {connection!.broken_since && (
        <AlertDescription>
          Since {alertWhen(connection!.broken_since).replace(/^\w/, (c) => c.toLowerCase())}
        </AlertDescription>
      )}
      <AlertAction>
        <Button variant="outline" size="sm" onClick={() => void connectGoogleCalendar()}>
          Reconnect
        </Button>
      </AlertAction>
    </Alert>
  )
}
