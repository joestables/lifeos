import type { LucideIcon } from 'lucide-react'
import { PlusIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BrandMark } from './BrandMark'
import type { TypeColour } from './colours'
import { TypeScope } from './TypeScope'
import { TypeTile } from './TypeTile'

/*
 * Drawings of the Android app's native parts (components.md: TodayWidget,
 * AlarmScreen; draft, Stage 7). Android draws the real ones in Kotlin from
 * the same spec; these are what the design pages show and what the native
 * code is checked against.
 */

export type WidgetCard = {
  colour: TypeColour
  icon: LucideIcon
  type: string
  title: string
  time?: string
  done?: boolean
}

/** Android's widget grid, at a 390dp phone (tokens.md#sizes). */
const SIZES = {
  '4x2': 'w-[358px] h-[170px]',
  '4x3': 'w-[358px] h-[260px]',
  '4x4': 'w-[358px] h-[350px]',
  '2x2': 'w-[170px] h-[170px]',
} as const

/**
 * The Today widget (WID-002): the date and "+", then today's Items as
 * WidgetLines, scrolling; "Nothing planned" when there are none; "Sign in to
 * LifeOS" when signed out.
 */
export function TodayWidget({
  size = '4x3',
  date,
  cards = [],
  signedOut = false,
}: {
  size?: keyof typeof SIZES
  /** "Thu 5 Nov" */
  date: string
  cards?: WidgetCard[]
  signedOut?: boolean
}) {
  return (
    <div
      data-slot="today-widget"
      className={cn(
        'flex flex-col gap-2.5 overflow-hidden rounded-xl bg-background p-3.5 text-foreground',
        SIZES[size],
      )}
    >
      {signedOut ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2.5 text-center">
          <BrandMark />
          <span className="text-sm font-semibold">Sign in to LifeOS</span>
        </div>
      ) : (
        <>
          <div className="flex shrink-0 items-center justify-between gap-2">
            <span className="truncate text-h2">{date}</span>
            <Button variant="secondary" size="icon-sm" aria-label="Add to today">
              <PlusIcon />
            </Button>
          </div>
          {cards.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Nothing planned
            </div>
          ) : (
            <div className="flex min-h-0 flex-col gap-1.5">
              {cards.map((c) => (
                <WidgetLine key={c.title} {...c} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/**
 * One of the day's Items in the Today widget: a 40px line on the card fill
 * with the hairline edge, its Type's icon in the Type's text colour, its
 * title (weight 600, one line) and its time at the end (muted, tabular).
 * Done: faded and struck through, as on Plan.
 */
function WidgetLine({ colour, icon: Icon, type, title, time, done = false }: WidgetCard) {
  return (
    <div
      data-colour={colour}
      className={cn(
        'flex h-10 shrink-0 items-center gap-2.5 rounded-control bg-card px-3 shadow-[0_0_0_1px_var(--hairline)]',
        done && 'opacity-50',
      )}
    >
      <Icon aria-label={type} className="size-4 shrink-0 text-tc-text" />
      <span className={cn('min-w-0 flex-1 truncate text-sm font-semibold', done && 'line-through')}>
        {title}
      </span>
      {time && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{time}</span>}
    </div>
  )
}

/**
 * An Alarm ringing (REM-011), full screen over the lock screen: the Item's
 * tile, the time, the date and the title; Stop, Snooze 1 hour, and Done for
 * a Completable Item.
 */
export function AlarmScreen({
  colour,
  icon,
  time,
  date,
  title,
  completable = false,
}: {
  colour: Exclude<TypeColour, 'none'>
  icon: LucideIcon
  /** "07:00" */
  time: string
  /** "Thu 5 Nov" */
  date: string
  title: string
  completable?: boolean
}) {
  return (
    <TypeScope
      colour={colour}
      className="flex min-h-svh flex-col bg-background px-5 pt-[22svh] pb-9 text-foreground"
    >
      <div className="flex flex-1 flex-col items-center gap-3 text-center">
        <TypeTile colour={colour} icon={icon} size="lg" />
        <span className="text-clock tabular-nums">{time}</span>
        <span className="text-base text-muted-foreground">{date}</span>
        <h1 className="mt-3 line-clamp-3 text-h1 break-words">{title}</h1>
      </div>
      <div className="flex flex-col gap-2.5">
        <Button>Stop</Button>
        <Button variant="secondary">Snooze 1 hour</Button>
        {completable && <Button variant="outline">Done</Button>}
      </div>
    </TypeScope>
  )
}

/**
 * The page bundled in the app for a first launch with no signal
 * (patterns.md#the-android-app).
 */
export function NoConnection({ action }: { action?: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background px-5 text-center text-foreground">
      <BrandMark />
      <h1 className="text-h2">No connection</h1>
      <p className="text-sm text-muted-foreground">Connect to open LifeOS the first time</p>
      <div className="mt-2">{action}</div>
    </div>
  )
}

/**
 * The app icon's graph in one colour (`currentColor`), as Android's themed
 * icon draws its monochrome layer (patterns.md#the-android-app; draft).
 */
export function MonochromeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      aria-hidden
      className={className}
      stroke="currentColor"
      fill="currentColor"
    >
      <line x1="256.0" y1="106.0" x2="385.9" y2="181.0" strokeOpacity={0.4} strokeWidth={10} />
      <line x1="385.9" y1="181.0" x2="385.9" y2="331.0" strokeOpacity={0.4} strokeWidth={10} />
      <line x1="385.9" y1="331.0" x2="256.0" y2="406.0" strokeOpacity={0.4} strokeWidth={10} />
      <line x1="256.0" y1="406.0" x2="126.1" y2="331.0" strokeOpacity={0.4} strokeWidth={10} />
      <line x1="126.1" y1="331.0" x2="126.1" y2="181.0" strokeOpacity={0.4} strokeWidth={10} />
      <line x1="126.1" y1="181.0" x2="256.0" y2="106.0" strokeOpacity={0.4} strokeWidth={10} />
      <line x1="256" y1="256" x2="256.0" y2="106.0" strokeOpacity={0.7} strokeWidth={12} />
      <line x1="256" y1="256" x2="385.9" y2="181.0" strokeOpacity={0.7} strokeWidth={12} />
      <line x1="256" y1="256" x2="385.9" y2="331.0" strokeOpacity={0.7} strokeWidth={12} />
      <line x1="256" y1="256" x2="256.0" y2="406.0" strokeOpacity={0.7} strokeWidth={12} />
      <line x1="256" y1="256" x2="126.1" y2="331.0" strokeOpacity={0.7} strokeWidth={12} />
      <line x1="256" y1="256" x2="126.1" y2="181.0" strokeOpacity={0.7} strokeWidth={12} />
      <circle cx="256.0" cy="106.0" r="36" />
      <circle cx="385.9" cy="181.0" r="36" />
      <circle cx="385.9" cy="331.0" r="36" />
      <circle cx="256.0" cy="406.0" r="36" />
      <circle cx="126.1" cy="331.0" r="36" />
      <circle cx="126.1" cy="181.0" r="36" />
      <circle cx="256" cy="256" r="44" />
    </svg>
  )
}
