import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group'
import {
  CameraIcon,
  CheckIcon,
  CloudAlertIcon,
  ChevronUpIcon,
  CloudDrizzleIcon,
  CloudFogIcon,
  CloudIcon,
  CloudLightningIcon,
  CloudRainIcon,
  CloudSnowIcon,
  CloudSunIcon,
  DropletIcon,
  GripVerticalIcon,
  HeartIcon,
  ImageIcon,
  PlusIcon,
  ShirtIcon,
  SunIcon,
  XIcon,
  ZapIcon,
  type LucideIcon,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Toggle } from '@/components/ui/toggle'
import { useLasting } from '@/hooks/use-lasting'
import { useLongPress } from '@/hooks/use-long-press'
import type { Reorder } from '@/hooks/use-reorder'
import { cn } from '@/lib/utils'
import { REORDER_ROW } from './reorder'
import { StoredPicture } from './StoredPicture'

/* ---------- The colour Swatch (ADR-0067) ---------- */

/**
 * A garment's own colour (ADR-0067): the one colour on a screen that isn't
 * a token, because it is data. Round, with a faint inner edge so white
 * shows on light and black on dark. Always beside or named by its colour's
 * name, never alone.
 */
export function Swatch({
  hex,
  size = 'sm',
  className,
}: {
  hex: string
  /** 10px in a line of text, 16px in a chip, 24px in a list, 40px chosen large. */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}) {
  return (
    <span
      aria-hidden
      data-slot="swatch"
      className={cn(
        'inline-block shrink-0 rounded-full shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--foreground)_16%,transparent)]',
        size === 'xs' && 'size-2.5',
        size === 'sm' && 'size-4',
        size === 'md' && 'size-6',
        size === 'lg' && 'size-10',
        className,
      )}
      // The garment's colour itself: data, not a token (ADR-0067).
      style={{ backgroundColor: hex }}
    />
  )
}

/* ---------- A garment ---------- */

/**
 * A garment's photo, square as it was cropped; without one, the Type's tint
 * with a faint shirt. A retired garment's is greyed.
 */
export function GarmentPhoto({
  src,
  alt = '',
  retired = false,
  className,
}: {
  src?: string
  alt?: string
  retired?: boolean
  className?: string
}) {
  return (
    <div
      data-slot="garment-photo"
      className={cn(
        'relative grid aspect-square place-items-center overflow-hidden bg-[color-mix(in_oklch,var(--tc)_var(--tile-mix),transparent)] text-tc-text',
        className,
      )}
    >
      {src ? (
        <StoredPicture
          src={src}
          alt={alt}
          className={cn(
            'absolute inset-0 size-full object-cover',
            retired && 'opacity-55 grayscale',
          )}
        />
      ) : (
        <ShirtIcon
          aria-hidden
          className="size-9 max-h-3/5 max-w-3/5 opacity-45"
          strokeWidth={1.5}
        />
      )}
    </div>
  )
}

/** A garment as cards and rows show it. */
export interface GarmentFace {
  id: string
  photo?: string
  brand: string
  category: string
  size: string
  colour: { name: string; hex: string }
  fit?: string
  tags?: string[]
  favourite?: boolean
  retired?: boolean
  /** Not on the server yet, its photo included (WRD-005 6), or refused. */
  sync?: 'pending' | 'failed'
}

/** What pressing a card does: open it, choose it (Select), or add it to the Outfit builder. */
export type GarmentCardMode = 'browse' | 'select' | 'build'

const glass = 'bg-popover/85 shadow-card backdrop-blur-sm'

/**
 * A garment on the Wardrobe tab (WRD-001): its photo with its size on a
 * small glass pill and my heart, then its brand, and its colour and
 * category. The whole card opens it. Choosing several, a Checkbox takes the
 * heart's corner; building an outfit, a "+" does, a tick once it is in the
 * builder, and the whole card adds it or takes it out (WRD-014). Chosen or
 * in the builder, it is ringed.
 */
export function GarmentCard({
  garment,
  mode = 'browse',
  chosen = false,
  onOpen,
  onFavourite,
  onChoose,
  onLongPress,
}: {
  garment: GarmentFace
  mode?: GarmentCardMode
  /** Chosen in Select, or in the Outfit builder. */
  chosen?: boolean
  onOpen?: () => void
  onFavourite?: (on: boolean) => void
  onChoose?: (on: boolean) => void
  onLongPress?: () => void
}) {
  const longPress = useLongPress(onLongPress)
  const g = garment
  return (
    <div
      {...longPress}
      data-slot="garment-card"
      data-chosen={chosen || undefined}
      className="group/card relative flex min-w-0 flex-col overflow-hidden rounded-lg bg-card shadow-card transition-shadow data-chosen:ring-2 data-chosen:ring-ring"
    >
      <GarmentPhoto src={g.photo} retired={g.retired} />
      <span
        className={cn(
          'pointer-events-none absolute top-2 left-2 z-10 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold tabular-nums',
          glass,
        )}
      >
        {g.size}
      </span>
      {mode === 'select' ? (
        <span
          className={cn(
            'pointer-events-none absolute top-2 right-2 z-10 grid size-10 place-items-center rounded-control',
            glass,
          )}
        >
          <Checkbox checked={chosen} tabIndex={-1} aria-hidden />
        </span>
      ) : mode === 'build' ? (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute top-2 right-2 z-10 grid size-10 place-items-center rounded-control transition-colors [&_svg]:size-5',
            chosen ? 'bg-primary text-primary-foreground shadow-button' : glass,
          )}
        >
          {chosen ? <CheckIcon className="stroke-[2.5]" /> : <PlusIcon />}
        </span>
      ) : (
        <Toggle
          size="lg"
          aria-label="Favourite"
          pressed={g.favourite}
          onPressedChange={onFavourite}
          className={cn('absolute top-2 right-2 z-10 hover:bg-popover', glass)}
        >
          <HeartIcon />
        </Toggle>
      )}
      <div className="flex min-w-0 flex-col gap-0.5 px-3 pt-2.5 pb-3 group-data-[size=S]/grid:px-2.5 group-data-[size=S]/grid:pt-2 group-data-[size=S]/grid:pb-2.5">
        <button
          type="button"
          role={mode === 'browse' ? undefined : 'checkbox'}
          aria-checked={mode === 'browse' ? undefined : chosen}
          aria-label={
            mode === 'build'
              ? `${chosen ? 'Take out of' : 'Add to'} the outfit: ${g.colour.name} ${g.brand} ${g.category}`
              : undefined
          }
          onClick={mode === 'browse' ? onOpen : () => onChoose?.(!chosen)}
          className="truncate text-left font-semibold outline-none group-data-[size=S]/grid:text-sm after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring-soft"
        >
          {g.brand}
        </button>
        <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground group-data-[size=S]/grid:text-xs">
          <Swatch hex={g.colour.hex} size="xs" />
          <span className="truncate">
            {g.colour.name} · {g.category}
          </span>
        </span>
        <GarmentSync sync={g.sync} />
      </div>
    </div>
  )
}

/** Said under the card once a garment has waited a while to send, or wasn't saved (patterns.md#states). */
function GarmentSync({ sync }: { sync?: 'pending' | 'failed' }) {
  const waiting = useLasting(sync === 'pending')
  if (sync === 'failed')
    return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <CloudAlertIcon className="size-3.5" /> Not saved
      </span>
    )
  if (!waiting) return null
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <CloudIcon className="size-3.5" /> Not sent yet
    </span>
  )
}

/**
 * A garment small, on one line (48px): its photo, brand, and colour and
 * category, then what ends it (a remove, a handle). In the Outfit builder,
 * the Planned Outfits pane's Garments and an outfit's popup.
 */
export function GarmentLine({
  garment,
  end,
  muted = false,
  onOpen,
}: {
  garment: GarmentFace
  end?: ReactNode
  /** Retired: faded, saying so. */
  muted?: boolean
  onOpen?: () => void
}) {
  const g = garment
  const label = (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-sm font-semibold">{g.brand}</span>
      <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <Swatch hex={g.colour.hex} size="xs" />
        <span className="truncate">
          {g.colour.name} · {g.category}
          {muted ? ' · Retired' : ` · ${g.size}`}
        </span>
      </span>
    </span>
  )
  return (
    <div
      data-slot="garment-line"
      className={cn(
        'relative flex min-h-12 min-w-0 items-center gap-3 rounded-row py-1 pr-1 pl-1',
        onOpen && 'hover:bg-accent',
        muted && 'opacity-60',
      )}
    >
      <GarmentPhoto src={g.photo} retired={muted} className="size-11 shrink-0 rounded-md" />
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 text-left outline-none after:absolute after:inset-0 after:rounded-row focus-visible:after:ring-3 focus-visible:after:ring-ring-soft"
        >
          {label}
        </button>
      ) : (
        label
      )}
      {end && <span className="relative z-10 flex shrink-0 items-center">{end}</span>}
    </div>
  )
}

/* ---------- Choosing values as pills ---------- */

/** A value to choose: a category, a size, a fit, a tag, a colour. */
export interface Choice {
  id: string
  name: string
  /** A colour's swatch. */
  hex?: string
  /** Muted after the name: "Closest". */
  note?: string
}

/**
 * Values as 36px pills to choose (WRD-005, WRD-008): one (`single`:
 * Category, Size, Fit, Colour) or any number (Tags). Off is outlined; on
 * is the page's Type tint with its text colour and a tick (a colour keeps
 * its Swatch and is ringed instead). They wrap. `add` ends the row: "+ Fit"
 * makes one inline. Pressed again, a single choice comes off.
 */
export function ChoiceChips({
  choices,
  chosen,
  onChange,
  single = false,
  compact = false,
  add,
  'aria-label': ariaLabel,
  className,
}: {
  /** 32px, as a filter's LabelChips are (the FilterPanel's Colour). */
  compact?: boolean
  choices: readonly Choice[]
  chosen: ReadonlySet<string>
  onChange: (chosen: string[]) => void
  single?: boolean
  /** The last chip: "+ Fit", "More sizes", "All colours". */
  add?: ReactNode
  'aria-label': string
  className?: string
}) {
  return (
    <ToggleGroupPrimitive
      multiple={!single}
      aria-label={ariaLabel}
      value={choices.filter((c) => chosen.has(c.id)).map((c) => c.id)}
      onValueChange={(value: string[]) => onChange(value)}
      data-slot="choice-chips"
      className={cn(
        'flex min-w-0 flex-wrap items-center',
        compact ? 'gap-1.5' : 'gap-2',
        className,
      )}
    >
      {choices.map((c) => {
        const on = chosen.has(c.id)
        return (
          <TogglePrimitive
            key={c.id}
            value={c.id}
            className={cn(
              'inline-flex shrink-0 items-center rounded-full text-sm font-semibold whitespace-nowrap shadow-[inset_0_0_0_1px_var(--border)] transition-[background-color,box-shadow,color] outline-none not-data-pressed:hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring-soft [&_svg]:size-3.5',
              compact
                ? 'h-8 gap-1.5 px-3 text-muted-foreground not-data-pressed:hover:text-foreground'
                : 'h-9 gap-2 px-3.5 text-foreground touch:h-11',
              c.hex
                ? compact
                  ? 'pl-1.5 data-pressed:bg-selected data-pressed:text-selected-foreground data-pressed:shadow-[inset_0_0_0_1.5px_var(--tc)]'
                  : 'pl-2 data-pressed:bg-selected data-pressed:text-selected-foreground data-pressed:shadow-[inset_0_0_0_1.5px_var(--tc)]'
                : 'data-pressed:bg-selected data-pressed:text-selected-foreground data-pressed:shadow-none',
            )}
          >
            {c.hex ? (
              <Swatch
                hex={c.hex}
                size={compact ? 'sm' : 'md'}
                className={compact ? 'size-5' : undefined}
              />
            ) : (
              on && <CheckIcon aria-hidden className="-ml-0.5 stroke-3" />
            )}
            {c.name}
            {c.note && (
              <span className="-ml-0.5 text-xs font-semibold text-muted-foreground">{c.note}</span>
            )}
            {c.hex && on && <CheckIcon aria-hidden className="-mr-0.5 stroke-3" />}
          </TogglePrimitive>
        )
      })}
      {add}
    </ToggleGroupPrimitive>
  )
}

/** The chip that ends a ChoiceChips row: "+ Fit", "New colour", "More sizes". Dashed, quiet. */
export function AddChip({
  icon: Icon = PlusIcon,
  children,
  onClick,
}: {
  icon?: LucideIcon | null
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-input-strong px-3.5 text-sm font-semibold whitespace-nowrap text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring-soft touch:h-11 [&_svg]:size-3.5"
    >
      {Icon && <Icon aria-hidden />}
      {children}
    </button>
  )
}

/**
 * A field of the add sheet (WRD-005): its name, 13px bold, a muted note at
 * its end ("Optional"), then its control.
 */
export function SheetField({
  label,
  aside,
  children,
}: {
  label: string
  /** At the label's end: "Optional", "3 suggested". */
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-label={label} className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-2">
        <h3 className="text-sm font-bold">{label}</h3>
        {aside && <span className="ml-auto text-xs text-muted-foreground">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

/* ---------- Outfits ---------- */

/**
 * An outfit's garments' photos together, square, as a mosaic (WRD-016 2;
 * Joe, 19 November): one whole; two side by side; three as one large and
 * two small; four in a grid; more, the fourth saying "+2".
 */
export function OutfitPicture({
  photos,
  shape = 'square',
  className,
}: {
  /** In my categories' order. */
  photos: (string | undefined)[]
  /** Square, on a card and in a popup. */
  shape?: 'square'
  className?: string
}) {
  const shown = photos.slice(0, 4)
  const extra = photos.length - shown.length
  return (
    <div
      data-slot="outfit-picture"
      className={cn(
        'grid gap-0.5 overflow-hidden bg-card',
        shape === 'square' && 'aspect-square',
        shown.length === 1 && 'grid-cols-1',
        shown.length === 2 && 'grid-cols-2',
        shown.length >= 3 && 'grid-cols-2 grid-rows-2',
        className,
      )}
    >
      {shown.map((p, i) => (
        <div
          key={i}
          className={cn(
            'relative min-h-0 overflow-hidden',
            shown.length === 3 && i === 0 && 'row-span-2',
            shown.length === 2 && 'h-full',
          )}
        >
          <GarmentPhoto src={p} className="absolute inset-0 aspect-auto size-full" />
          {extra > 0 && i === 3 && (
            <span className="absolute inset-0 grid place-items-center bg-overlay text-h2 text-foreground backdrop-blur-[2px]">
              +{extra}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * An outfit on the Outfits tab (WRD-016): its picture, then its name (or
 * how many garments, when it has none) and a muted line. The whole card
 * opens it; choosing several, a Checkbox sits in its corner and it is
 * ringed when chosen.
 */
export function OutfitCard({
  photos,
  name,
  meta,
  selecting = false,
  selected = false,
  onOpen,
  onSelect,
}: {
  photos: (string | undefined)[]
  name?: string
  /** "4 garments · Worn 3×". */
  meta: string
  selecting?: boolean
  selected?: boolean
  onOpen?: () => void
  onSelect?: (on: boolean) => void
}) {
  return (
    <div
      data-slot="outfit-card"
      data-selected={selected || undefined}
      className="group/card relative flex min-w-0 flex-col overflow-hidden rounded-lg bg-card shadow-card data-selected:ring-2 data-selected:ring-ring"
    >
      <OutfitPicture photos={photos} />
      {selecting && (
        <span
          className={cn(
            'pointer-events-none absolute top-2 right-2 z-10 grid size-10 place-items-center rounded-control',
            glass,
          )}
        >
          <Checkbox checked={selected} tabIndex={-1} aria-hidden />
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-0.5 px-3 pt-2.5 pb-3">
        <button
          type="button"
          role={selecting ? 'checkbox' : undefined}
          aria-checked={selecting ? selected : undefined}
          onClick={selecting ? () => onSelect?.(!selected) : onOpen}
          className={cn(
            'truncate text-left font-semibold outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring-soft',
            !name && 'text-muted-foreground',
          )}
        >
          {name ?? 'Untitled outfit'}
        </button>
        <span className="truncate text-sm text-muted-foreground tabular-nums">{meta}</span>
      </div>
    </div>
  )
}

/**
 * A side pane of the Wardrobe page (WRD-014, WRD-021): a Card 320px wide
 * on a computer, held in view as the page scrolls. Its heading (`text-h2`)
 * with a count, anything at the heading's end, what it holds (scrolling
 * inside it), then its footer.
 */
export function WardrobePane({
  title,
  count,
  aside,
  footer,
  children,
  className,
  drop,
  dropping = false,
}: {
  title: string
  count?: number
  aside?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
  /** What's dragged onto it lands here: a day's outfit back into Planned outfits (WRD-021 6). */
  drop?: string
  dropping?: boolean
}) {
  return (
    <aside
      aria-label={title}
      data-slot="wardrobe-pane"
      data-drop={drop}
      className={cn(
        'sticky top-4 flex max-h-[calc(100svh-216px)] w-80 shrink-0 flex-col overflow-hidden rounded-lg bg-card shadow-card transition-shadow',
        dropping && 'ring-2 ring-ring',
        className,
      )}
    >
      <div className="flex h-14 shrink-0 items-center gap-2 pr-2.5 pl-4">
        <h2 className="text-h2">{title}</h2>
        {count !== undefined && <Badge variant="outline">{count}</Badge>}
        <span className="ml-auto flex items-center gap-1">{aside}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">{children}</div>
      {footer && (
        <div className="flex shrink-0 items-center gap-2 border-t border-hairline px-4 py-3">
          {footer}
        </div>
      )}
    </aside>
  )
}

/** A small round remove button, 28px: an "X" named for what it removes. */
export function RemoveButton({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      onClick={onClick}
      className="size-7 rounded-full"
    >
      <XIcon />
    </Button>
  )
}

/**
 * An outfit as a line in the Planned Outfits pane (WRD-021): a handle to
 * drag it by, its picture small, its name (or what it is) and its garments
 * muted, then a remove. Picked to place on a phone, it is ringed.
 */
export function PlannedOutfitLine({
  photos,
  name,
  meta,
  picked = false,
  dragging = false,
  onRemove,
  onOpen,
}: {
  photos: (string | undefined)[]
  name?: string
  meta: string
  picked?: boolean
  dragging?: boolean
  onRemove?: () => void
  /** Its popup, from its name. */
  onOpen?: () => void
}) {
  return (
    <div
      data-slot="planned-outfit"
      data-picked={picked || undefined}
      className={cn(
        'group/line relative flex min-w-0 items-center gap-2.5 rounded-row bg-card py-2 pr-1.5 pl-1 shadow-card data-picked:ring-2 data-picked:ring-ring',
        dragging && 'z-10 cursor-grabbing opacity-90 shadow-pop',
      )}
    >
      <GripVerticalIcon aria-hidden className="size-4 shrink-0 cursor-grab text-muted-foreground" />
      <OutfitPicture photos={photos} className="size-14 shrink-0 rounded-md" />
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 flex-col text-left outline-none after:absolute after:inset-0 after:rounded-row focus-visible:after:ring-3 focus-visible:after:ring-ring-soft"
      >
        <span className={cn('truncate text-sm font-semibold', !name && 'text-muted-foreground')}>
          {name ?? 'Untitled outfit'}
        </span>
        <span className="truncate text-xs text-muted-foreground">{meta}</span>
      </button>
      <span className="relative z-10">
        <RemoveButton
          label={`Remove ${name ?? 'Untitled outfit'} from Planned outfits`}
          onClick={onRemove}
        />
      </span>
    </div>
  )
}

/* ---------- The phone's tray ---------- */

/**
 * The phone's Outfit builder and Planned Outfits (WRD-014 2, WRD-021): a
 * `--card` bar fixed to the foot of the screen, above the safe area, its
 * garments' or outfits' photos overlapping small, what it is and how many,
 * and its action; pressed, it opens to show it all (TrayPanel).
 */
export function Tray({
  title,
  photos,
  count,
  unit = 'garment',
  action,
  onOpen,
  drop,
  dropping = false,
}: {
  title: string
  photos: (string | undefined)[]
  count: number
  /** What it counts: garments (the builder) or outfits (Planned outfits). */
  unit?: 'garment' | 'outfit'
  action?: ReactNode
  onOpen?: () => void
  /** What's dragged onto it lands here: a day's outfit back into Planned outfits (WRD-021 6). */
  drop?: string
  dropping?: boolean
}) {
  const shown = photos.slice(-4)
  return (
    <div
      data-slot="tray"
      data-drop={drop}
      className={cn(
        'fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-20 flex h-16 items-center gap-3 rounded-lg bg-popover pr-2.5 pl-2.5 shadow-dialog md:hidden',
        dropping && 'ring-2 ring-ring',
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${title}`}
        className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring-soft"
      >
        <span className="flex shrink-0 items-center">
          {shown.length === 0 ? (
            <span className="grid size-11 place-items-center rounded-md border border-dashed border-input-strong text-muted-foreground">
              <ShirtIcon aria-hidden className="size-4" />
            </span>
          ) : (
            shown.map((p, i) => (
              // On the bar's own colour: a tint over a tint showed where they overlap.
              <span
                key={i}
                className={cn(
                  'relative rounded-md bg-popover ring-2 ring-popover',
                  i > 0 && '-ml-4',
                )}
              >
                <GarmentPhoto src={p} className="size-11 rounded-md" />
              </span>
            ))
          )}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="flex items-center gap-1 text-sm font-semibold">
            {title}
            <ChevronUpIcon aria-hidden className="size-4 text-muted-foreground" />
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {count === 0
              ? unit === 'garment'
                ? 'Tap garments to add'
                : 'Nothing to plan'
              : `${count} ${unit}${count === 1 ? '' : 's'}`}
          </span>
        </span>
      </button>
      {action && <span className="relative z-10 shrink-0">{action}</span>}
    </div>
  )
}

/**
 * The tray opened (a phone): a panel attached to the foot of the screen,
 * `--card`, 24px radius on its top corners, `--shadow-dialog` over
 * `--overlay`, a grabber to pull it down, its title, what it holds
 * scrolling, and its footer. As tall as it needs, at most 85% of the
 * screen.
 */
export function TrayPanel({
  title,
  count,
  aside,
  footer,
  children,
  onClose,
  away = false,
}: {
  title: string
  count?: number
  aside?: ReactNode
  footer?: ReactNode
  children: ReactNode
  /** Back to the tray: the overlay, the grabber, or Escape. */
  onClose?: () => void
  /**
   * Out of the way while a line from it is dragged onto a day: hidden but
   * kept, so the finger's touch goes on (WRD-021 3).
   */
  away?: boolean
}) {
  return (
    <>
      <div
        aria-hidden
        className={cn('fixed inset-0 z-30 bg-overlay md:hidden', away && 'invisible')}
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-label={title}
        onKeyDown={(e) => e.key === 'Escape' && onClose?.()}
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 flex max-h-[85svh] flex-col rounded-t-xl bg-card pb-[env(safe-area-inset-bottom)] shadow-dialog md:hidden',
          away && 'invisible',
        )}
      >
        <button
          type="button"
          aria-label={`Close ${title}`}
          onClick={onClose}
          className="mx-auto grid h-6 w-16 shrink-0 place-items-center outline-none focus-visible:ring-3 focus-visible:ring-ring-soft"
        >
          <span aria-hidden className="h-1 w-10 rounded-full bg-input-strong" />
        </button>
        <div className="flex h-14 shrink-0 items-center gap-2 pr-3 pl-5">
          <h2 className="text-h2">{title}</h2>
          {count !== undefined && <Badge variant="outline">{count}</Badge>}
          <span className="ml-auto flex items-center gap-1">{aside}</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4">
          {children}
        </div>
        {footer && (
          <div className="flex shrink-0 items-center gap-2 border-t border-hairline px-5 py-3">
            {footer}
          </div>
        )}
      </section>
    </>
  )
}

/* ---------- The weather ---------- */

/** What the sky does, from Open-Meteo's weather code (ADR-0068 6). */
export type Sky = 'sun' | 'sun-cloud' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder'

/** Each sky's icon, its name, and its colour (tokens.md#colour-weather): sun warm, rain blue. */
const SKY: Record<Sky, { icon: LucideIcon; label: string; tone: string }> = {
  sun: { icon: SunIcon, label: 'Sunny', tone: 'text-[var(--weather-sun)]' },
  'sun-cloud': { icon: CloudSunIcon, label: 'Sunny spells', tone: 'text-[var(--weather-sun)]' },
  cloud: { icon: CloudIcon, label: 'Cloudy', tone: 'text-muted-foreground' },
  fog: { icon: CloudFogIcon, label: 'Fog', tone: 'text-muted-foreground' },
  drizzle: { icon: CloudDrizzleIcon, label: 'Drizzle', tone: 'text-[var(--weather-rain)]' },
  rain: { icon: CloudRainIcon, label: 'Rain', tone: 'text-[var(--weather-rain)]' },
  snow: { icon: CloudSnowIcon, label: 'Snow', tone: 'text-[var(--weather-snow)]' },
  thunder: { icon: CloudLightningIcon, label: 'Thunder', tone: 'text-[var(--weather-storm)]' },
}

/** A day's forecast (WRD-025). */
export interface Forecast {
  sky: Sky
  high: number
  low: number
  /** Highest chance of rain, %. */
  rain: number
}

/**
 * A day's forecast, on one quiet line (WRD-025): the sky's icon (named in
 * a tooltip and for screen readers), the high in the text's colour and the
 * low muted, then the chance of rain with a droplet when it is 20% or
 * more. Neutral, as weather isn't a Type. `stacked` puts the rain under
 * the temperatures (a narrow day column).
 */
export function DayWeather({
  forecast,
  stacked = false,
  className,
}: {
  forecast: Forecast
  stacked?: boolean
  className?: string
}) {
  const { icon: Icon, label, tone } = SKY[forecast.sky]
  const rain = forecast.rain >= 20 && (
    <span className="inline-flex items-center gap-px font-bold text-[var(--weather-rain)]">
      <DropletIcon aria-hidden className="size-3" />
      {forecast.rain}%
    </span>
  )
  return (
    <div
      data-slot="day-weather"
      aria-label={`${label}, ${forecast.high}° and ${forecast.low}°${forecast.rain >= 20 ? `, ${forecast.rain}% chance of rain` : ''}`}
      title={label}
      className={cn(
        'flex min-w-0 items-center gap-1 text-xs font-semibold whitespace-nowrap tabular-nums',
        stacked && 'flex-wrap gap-y-0.5',
        className,
      )}
    >
      <Icon aria-hidden className={cn('size-4 shrink-0', tone)} strokeWidth={2.25} />
      <span className="ml-0.5 font-bold text-foreground">{forecast.high}°</span>
      <span className="font-medium text-muted-foreground">{forecast.low}°</span>
      {rain && <span className={cn(stacked ? 'basis-full pl-5.5' : 'ml-1')}>{rain}</span>}
    </div>
  )
}

/* ---------- A day's clothes on the Week tab ---------- */

/**
 * A garment on a day (WRD-020 3), its own card: its photo square, named
 * for screen readers and in a tooltip. Standing alone (a single garment),
 * it has the card's shadow.
 */
export function DayGarment({
  garment,
  alone = false,
}: {
  garment: GarmentFace
  /** A single garment, not in an outfit. */
  alone?: boolean
}) {
  const g = garment
  const name = `${g.colour.name} ${g.brand} ${g.category}`
  return (
    <div
      data-slot="day-garment"
      role="img"
      aria-label={name}
      title={name}
      className={cn('overflow-hidden rounded-sm bg-card', alone && 'shadow-card')}
    >
      <GarmentPhoto src={g.photo} />
    </div>
  )
}

/**
 * An outfit on a day (WRD-020 3): its garments' tiles in the Type's tint,
 * under its name (or "Outfit") in the Type's text colour, the same on a
 * computer and a phone (Joe, 20 November). `column`, a computer's narrow
 * day: the tiles stacked, as wide as the day, as a single garment's are.
 * `row`, a phone's day: the tiles in a row at 56px, the tint only as wide
 * as they are.
 */
export function DayOutfit({
  name,
  garments,
  layout = 'column',
  past = false,
  dragging = false,
  picked = false,
}: {
  name?: string
  garments: GarmentFace[]
  layout?: 'column' | 'row'
  past?: boolean
  dragging?: boolean
  picked?: boolean
}) {
  const row = layout === 'row'
  return (
    <div
      data-slot="day-outfit"
      data-picked={picked || undefined}
      className={cn(
        'flex min-w-0 flex-col rounded-row bg-[color-mix(in_oklch,var(--tc)_var(--tile-mix),transparent)] data-picked:ring-2 data-picked:ring-ring',
        row ? 'w-fit max-w-full gap-2 p-2' : 'gap-1.5 p-1.5',
        past && 'opacity-60',
        dragging && 'z-10 opacity-40',
      )}
    >
      <span className="flex min-w-0 items-center gap-1 px-0.5 text-xs font-bold text-tc-text">
        <ShirtIcon aria-hidden className="size-3 shrink-0" />
        <span className="truncate">{name ?? 'Outfit'}</span>
      </span>
      <div className={cn('flex gap-1.5', !row && 'flex-col')}>
        {garments.map((g) => (
          <div key={g.id} className={cn(row && 'size-14 shrink-0')}>
            <DayGarment garment={g} />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * A day's clothes (WRD-020 3): on a phone, its outfits and single garments
 * on one line while they fit, then the next, their tiles' feet level; on a
 * computer, one under another down the day.
 */
export function DayClothes({
  layout,
  children,
}: {
  layout: 'column' | 'row'
  children: ReactNode
}) {
  return (
    <div
      data-slot="day-clothes"
      className={cn('flex min-w-0 gap-2', layout === 'row' ? 'flex-wrap items-end' : 'flex-col')}
    >
      {children}
    </div>
  )
}

/**
 * A day's clothes' photos small in a row (WRD-026 1): up to four, the last
 * "+2" when there are more; at the end of Today's row and in OutfitPlanCard.
 */
export function OutfitPhotos({
  photos,
  wide = false,
  past = false,
}: {
  photos: (string | undefined)[]
  wide?: boolean
  past?: boolean
}) {
  const max = wide ? 6 : 4
  const shown = photos.length > max ? photos.slice(0, max - 1) : photos
  const extra = photos.length - shown.length
  return (
    <div
      data-slot="outfit-photos"
      data-colour="orange"
      className="pointer-events-none flex shrink-0 gap-1"
    >
      {shown.map((p, i) => (
        <GarmentPhoto
          key={i}
          src={p}
          className={cn('shrink-0 rounded-sm', wide ? 'size-9' : 'size-7', past && 'opacity-60')}
        />
      ))}
      {extra > 0 && (
        <span
          className={cn(
            'grid shrink-0 place-items-center rounded-sm bg-muted text-2xs font-bold text-muted-foreground tabular-nums',
            wide ? 'size-9' : 'size-7',
          )}
        >
          +{extra}
        </span>
      )}
    </div>
  )
}

/**
 * A day's clothes on Today and Week (WRD-026): one card, shaped as a
 * PlanCard, "Outfit" in the Type's colour, what it is ("Navy work outfit",
 * "2 outfits", "3 garments"), and its garments' photos small in a row.
 */
export function OutfitPlanCard({
  title,
  photos,
  past = false,
  wide = false,
  dragging = false,
  onOpen,
}: {
  title: string
  photos: (string | undefined)[]
  past?: boolean
  wide?: boolean
  /** Being dragged to another day (WRD-026 4). */
  dragging?: boolean
  onOpen?: () => void
}) {
  return (
    <div
      data-slot="plan-card"
      data-colour="orange"
      className={cn(
        'relative flex min-w-0 flex-col rounded-control bg-card shadow-card transition-[box-shadow,opacity]',
        wide ? 'gap-1.5 px-3.5 py-3' : 'gap-1.5 px-2.5 py-[9px]',
        past && 'bg-[color-mix(in_oklch,var(--card)_50%,transparent)] shadow-none',
        dragging && 'z-10 cursor-grabbing shadow-pop',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-1.5 text-xs font-semibold [&_svg]:size-[13px]',
          past ? 'text-muted-foreground' : 'text-tc-text',
        )}
      >
        <ShirtIcon aria-hidden />
        Outfit
      </div>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'line-clamp-2 text-left font-semibold outline-none after:absolute after:inset-0 after:rounded-control focus-visible:after:ring-3 focus-visible:after:ring-ring-soft',
          wide ? 'text-base leading-[1.35]' : 'text-sm leading-[1.3]',
          past && 'text-muted-foreground',
        )}
      >
        {title}
      </button>
      <OutfitPhotos photos={photos} wide={wide} past={past} />
    </div>
  )
}

/* ---------- Adding a garment on a phone ---------- */

/**
 * The camera (WRD-005 1): always dark, the view filling the screen, a
 * square frame to put the garment in (its corners marked), Close and the
 * flash (where the camera has one) at the top, then the last photo, the
 * shutter (76px) and Skip at the foot. `children` is the live view.
 */
export function CameraView({
  children,
  last,
  onClose,
  onShoot,
  onSkip,
  flash,
  busy = false,
}: {
  children: ReactNode
  last?: string
  onClose?: () => void
  onShoot?: () => void
  onSkip?: () => void
  flash?: { on: boolean; onToggle: () => void }
  busy?: boolean
}) {
  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Camera"
      className="dark fixed inset-0 z-50 flex flex-col bg-background text-foreground"
    >
      <div className="box-content flex h-16 shrink-0 items-center justify-between px-3 pt-[env(safe-area-inset-top)]">
        <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
          <XIcon />
        </Button>
        <span className="text-sm font-semibold">New garment</span>
        {flash ? (
          <Toggle aria-label="Flash" pressed={flash.on} onPressedChange={flash.onToggle}>
            <ZapIcon />
          </Toggle>
        ) : (
          <span className="size-10" />
        )}
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {children}
        <div aria-hidden className="absolute inset-0 grid place-items-center [container-type:size]">
          <div className="relative aspect-square w-[min(86cqw,86cqh)] rounded-lg outline-[100vmax] outline-solid outline-[color-mix(in_oklch,var(--background)_62%,transparent)]">
            {(
              [
                '-top-1 -left-1 border-t-4 border-l-4 rounded-tl-xl',
                '-top-1 -right-1 border-t-4 border-r-4 rounded-tr-xl',
                '-bottom-1 -left-1 border-b-4 border-l-4 rounded-bl-xl',
                '-bottom-1 -right-1 border-b-4 border-r-4 rounded-br-xl',
              ] as const
            ).map((c) => (
              <span key={c} className={cn('absolute size-9 border-foreground', c)} />
            ))}
          </div>
        </div>
      </div>
      <div className="box-content flex h-36 shrink-0 items-center justify-between px-8 pb-[env(safe-area-inset-bottom)]">
        <span className="grid size-12 place-items-center overflow-hidden rounded-md bg-muted">
          {last ? (
            <StoredPicture src={last} alt="Last photo" className="size-full object-cover" />
          ) : (
            <ImageIcon aria-hidden className="size-5 text-muted-foreground" />
          )}
        </span>
        <button
          type="button"
          aria-label="Take photo"
          disabled={busy}
          onClick={onShoot}
          className="grid size-[76px] place-items-center rounded-full border-4 border-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring-soft disabled:opacity-50"
        >
          <span className="size-[60px] rounded-full bg-foreground" />
        </button>
        <Button variant="ghost" size="sm" className="w-12 px-0" onClick={onSkip}>
          Skip
        </Button>
      </div>
    </div>
  )
}

/** A frame drawn as it is, at its own size: no file made, so it shows at once. */
function FrameCanvas({
  frame,
  className,
  style,
}: {
  frame: ImageBitmap
  className?: string
  style?: CSSProperties
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    c.width = frame.width
    c.height = frame.height
    c.getContext('2d')?.drawImage(frame, 0, 0)
  }, [frame])
  return <canvas ref={ref} aria-hidden className={className} style={style} />
}

/**
 * The photo's square (WRD-005 2): always dark, as the camera; the picture
 * under a square window, the rest dimmed, dragged to move and pinched, or
 * scrolled, to zoom; Retake and Use photo at the foot. `crop` is the
 * square's centre (0–1 of the picture) and zoom (1 the largest square).
 */
export function PhotoCrop({
  src,
  width,
  height,
  crop,
  onCrop,
  onRetake,
  onUse,
  busy = false,
}: {
  /** The picture: a link, or a frame as taken, drawn without being made a file first. */
  src: string | ImageBitmap
  width: number
  height: number
  crop: { x: number; y: number; zoom: number }
  onCrop: (crop: { x: number; y: number; zoom: number }) => void
  onRetake: () => void
  onUse: () => void
  busy?: boolean
}) {
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const stage = useRef<HTMLDivElement>(null)
  const short = Math.min(width, height)
  // The picture drawn so the square window shows the crop's square.
  const scale = crop.zoom / short
  const drawnW = width * scale * 100
  const drawnH = height * scale * 100
  const left = 50 - crop.x * drawnW
  const top = 50 - crop.y * drawnH
  const move = (dx: number, dy: number, zoom = crop.zoom) => {
    const box = stage.current?.getBoundingClientRect()
    if (!box) return
    // A pixel on screen is this much of the picture's width and height.
    const kx = short / crop.zoom / box.width / width
    const ky = short / crop.zoom / box.height / height
    onCrop({ x: crop.x - dx * kx, y: crop.y - dy * ky, zoom })
  }
  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Crop the photo"
      className="dark fixed inset-0 z-50 flex flex-col bg-background text-foreground"
    >
      <div className="box-content flex h-16 shrink-0 items-center justify-center px-3 pt-[env(safe-area-inset-top)]">
        <span className="text-sm font-semibold">Move and zoom</span>
      </div>
      <div className="grid min-h-0 flex-1 place-items-center overflow-hidden">
        <div
          ref={stage}
          data-slot="photo-crop"
          className="relative aspect-square w-[min(86vw,70vh)] touch-none overflow-visible rounded-lg outline-[100vmax] outline-solid outline-[color-mix(in_oklch,var(--background)_62%,transparent)] select-none"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
          }}
          onPointerMove={(e) => {
            const was = pointers.current.get(e.pointerId)
            if (!was) return
            const now = { x: e.clientX, y: e.clientY }
            if (pointers.current.size === 2) {
              const [a, b] = [...pointers.current.values()]
              const other = a === was ? b! : a!
              const before = Math.hypot(was.x - other.x, was.y - other.y)
              const after = Math.hypot(now.x - other.x, now.y - other.y)
              if (before > 0) onCrop({ ...crop, zoom: crop.zoom * (after / before) })
            } else move(now.x - was.x, now.y - was.y)
            pointers.current.set(e.pointerId, now)
          }}
          onPointerUp={(e) => pointers.current.delete(e.pointerId)}
          onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
          onWheel={(e) => onCrop({ ...crop, zoom: crop.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08) })}
        >
          {typeof src === 'string' ? (
            <img
              src={src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none -z-10"
              // The picture under the window: computed from the crop.
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${drawnW}%`,
                height: `${drawnH}%`,
              }}
            />
          ) : (
            <FrameCanvas
              frame={src}
              className="pointer-events-none absolute -z-10"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${drawnW}%`,
                height: `${drawnH}%`,
              }}
            />
          )}
          {(
            [
              '-top-1 -left-1 border-t-4 border-l-4 rounded-tl-xl',
              '-top-1 -right-1 border-t-4 border-r-4 rounded-tr-xl',
              '-bottom-1 -left-1 border-b-4 border-l-4 rounded-bl-xl',
              '-bottom-1 -right-1 border-b-4 border-r-4 rounded-br-xl',
            ] as const
          ).map((c) => (
            <span key={c} aria-hidden className={cn('absolute size-9 border-foreground', c)} />
          ))}
        </div>
      </div>
      <div className="box-content flex h-28 shrink-0 items-center justify-between gap-3 px-6 pb-[env(safe-area-inset-bottom)]">
        <Button variant="ghost" onClick={onRetake}>
          <CameraIcon /> Retake
        </Button>
        <Button onClick={onUse} disabled={busy}>
          Use photo
        </Button>
      </div>
    </div>
  )
}

/** The loupe is 34% of the photo and magnifies it 2.5 times: its background is the photo at this many loupes wide. */
const LOUPE_BG = (100 / 34) * 2.5
/** The background position (%) that puts the photo's point at `p`% in the loupe's centre. */
const loupeAt = (p: number) => (((LOUPE_BG * p) / 100 - 0.5) / (LOUPE_BG - 1)) * 100

/**
 * Picking a colour from the photo (WRD-007 1): the photo, and a loupe at
 * `at` (in % of the photo) magnifying what is under it two and a half
 * times, a crosshair at its centre, ringed in the colour it reads.
 */
export function ColourLoupe({
  photo,
  at,
  hex,
  onPoint,
}: {
  photo: string
  at: { x: number; y: number }
  hex: string
  /** Where the finger or pointer is over the photo, in % of it, as it moves. */
  onPoint?: (at: { x: number; y: number }) => void
}) {
  const point = (e: ReactPointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const clamp = (v: number) => Math.min(100, Math.max(0, v))
    onPoint?.({
      x: clamp(((e.clientX - box.left) / box.width) * 100),
      y: clamp(((e.clientY - box.top) / box.height) * 100),
    })
  }
  return (
    <div
      data-slot="colour-loupe"
      className="relative aspect-square w-full cursor-crosshair touch-none overflow-hidden rounded-lg select-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        point(e)
      }}
      onPointerMove={(e) => e.buttons && point(e)}
    >
      <StoredPicture src={photo} alt="" className="absolute inset-0 size-full object-cover" />
      <div
        aria-hidden
        className="absolute aspect-square w-[34%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full shadow-pop"
        // Where the finger is: computed positions.
        style={{ left: `${at.x}%`, top: `${at.y}%` }}
      >
        <div
          className="absolute inset-0 bg-no-repeat"
          // The photo magnified (ZOOM), the point under the finger at the loupe's centre.
          style={{
            backgroundImage: `url("${photo}")`,
            backgroundSize: `${LOUPE_BG * 100}%`,
            backgroundPosition: `${loupeAt(at.x)}% ${loupeAt(at.y)}%`,
          }}
        />
        <span className="absolute inset-0 rounded-full shadow-[inset_0_0_0_5px_var(--card)]" />
        <span
          className="absolute inset-[5px] rounded-full"
          // Ringed in the colour it reads.
          style={{ boxShadow: `inset 0 0 0 4px ${hex}` }}
        />
        <span className="absolute top-1/2 left-1/2 h-4 w-px -translate-1/2 bg-card" />
        <span className="absolute top-1/2 left-1/2 h-px w-4 -translate-1/2 bg-card" />
      </div>
    </div>
  )
}

/* ---------- Settings ---------- */

/**
 * An entry of a Wardrobe list in Settings (WRD-028): a handle where the
 * list is ordered, dragged to reorder it (patterns.md#dragging; Alt+↑ and
 * Alt+↓ on the focused handle), its Swatch for a colour, its name, how many
 * use it, muted and tabular, and its "…".
 */
export function ListEntryRow({
  name,
  uses,
  ordered = false,
  hex,
  fixed = false,
  menu,
  reorder,
  onHandleKeyDown,
}: {
  name: string
  /** "12 garments". */
  uses: string
  ordered?: boolean
  hex?: string
  /** My Outfits: no handle, no menu. */
  fixed?: boolean
  menu?: ReactNode
  reorder?: Reorder
  onHandleKeyDown?: (e: KeyboardEvent) => void
}) {
  return (
    <div
      data-reorder-id={reorder?.id}
      data-reorder={reorder?.state}
      className={cn(
        'flex min-h-12 min-w-0 items-center gap-2.5 rounded-row px-2 hover:bg-accent',
        reorder && cn(REORDER_ROW, '[--reorder-gap:0px] select-none [-webkit-touch-callout:none]'),
      )}
    >
      {ordered &&
        (reorder && !fixed ? (
          <span
            {...reorder.handle}
            role="button"
            tabIndex={0}
            aria-label={`Drag ${name} to reorder`}
            onKeyDown={onHandleKeyDown}
            className="-mx-1.5 grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-control text-muted-foreground outline-none select-none [-webkit-touch-callout:none] hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring-soft"
          >
            <GripVerticalIcon className="size-4" />
          </span>
        ) : (
          // My Outfits keeps the handle's room, so its name lines up.
          <span aria-hidden className="-mx-1.5 grid size-8 shrink-0 place-items-center">
            <GripVerticalIcon
              className={cn('size-4 text-muted-foreground', fixed ? 'invisible' : 'cursor-grab')}
            />
          </span>
        ))}
      {hex && <Swatch hex={hex} size="md" />}
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</span>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{uses}</span>
      <span className={cn('flex min-w-8 shrink-0 justify-end', fixed && 'invisible')}>{menu}</span>
    </div>
  )
}

/* ---------- The garment's sheet ---------- */

/**
 * New garment, or a garment edited (WRD-005 3, WRD-010 2): one sheet, no
 * steps. On a phone the photo at 96px with the title it will have
 * (`text-day`), a note under it ("Category and size from the last one")
 * and Retake, then the fields; on a computer the photo stands in a muted
 * column on the left with its buttons, the title over the fields. The
 * footer, over a hairline, says what's needed until Save turns on.
 */
export function GarmentSheet({
  open,
  onOpenChange,
  title,
  label,
  photo,
  note,
  retake,
  photoButtons,
  footer,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The title it will have: "Navy Uniqlo T-shirt". */
  title: string
  /** What the sheet is, for screen readers: "New garment", "Edit garment". */
  label: string
  photo?: string
  note?: string
  /** A phone's "Retake". */
  retake?: ReactNode
  /** A computer's Camera and Choose file. */
  photoButtons?: ReactNode
  footer: ReactNode
  children: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent
        data-colour="orange"
        data-slot="garment-sheet"
        aria-label={label}
        className="gap-0 overflow-hidden p-0 md:max-w-[860px]"
      >
        <DialogTitle className="sr-only">{label}</DialogTitle>
        <div className="grid min-h-0 flex-1 md:grid-cols-[300px_minmax(0,1fr)]">
          <div className="hidden flex-col gap-3 bg-muted/50 p-6 md:flex">
            <GarmentPhoto src={photo} className="rounded-lg shadow-card" />
            {photoButtons && <div className="grid grid-cols-2 gap-2">{photoButtons}</div>}
          </div>
          <div className="flex max-h-[calc(100svh-180px)] min-h-0 flex-col gap-5 overflow-y-auto overscroll-contain p-5 md:max-h-[640px] md:p-6">
            <div className="flex items-center gap-4 md:hidden">
              <GarmentPhoto src={photo} className="size-24 shrink-0 rounded-lg shadow-card" />
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-day leading-tight">{title}</span>
                {note && (
                  <span className="text-xs font-semibold text-muted-foreground">{note}</span>
                )}
                {retake}
              </div>
            </div>
            <div className="hidden flex-col gap-1 md:flex">
              <span className="text-h2">{title}</span>
              {note && <span className="text-xs font-semibold text-muted-foreground">{note}</span>}
            </div>
            {children}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-hairline px-5 py-4 md:px-6">
          {footer}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** A fact of a garment in its popup (WRD-010 1): its label, muted, and its value. */
export function GarmentFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-9 items-center gap-3 text-sm">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="flex min-w-0 flex-wrap items-center gap-1.5 font-semibold">{children}</span>
    </div>
  )
}

/** A muted tile in a garment's popup: "Added", "2 Oct" (WRD-010 1). */
export function GarmentStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-row bg-muted/60 px-3 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  )
}

/* ---------- Placing on a day (a phone) ---------- */

/**
 * Where an outfit or garment chosen in the tray goes (WRD-021 5): a 44px
 * dashed button the width of the day, in the Type's text colour.
 */
export function PlaceHere({ day, onClick }: { day: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={`Place on ${day}`}
      onClick={onClick}
      className="flex h-11 items-center justify-center gap-1.5 rounded-row border-[1.5px] border-dashed border-ring text-sm font-semibold text-tc-text outline-none focus-visible:ring-3 focus-visible:ring-ring-soft"
    >
      <PlusIcon aria-hidden className="size-4" /> Place here
    </button>
  )
}

/**
 * What's being dragged onto a day on a phone (WRD-021 3): its picture,
 * small, lifted just above the finger so the day under it shows.
 */
export function DragGhost({
  point,
  photos,
}: {
  point: { x: number; y: number }
  photos: (string | undefined)[]
}) {
  return (
    <div
      aria-hidden
      data-slot="drag-ghost"
      className="pointer-events-none fixed z-50 w-16 -translate-x-1/2 -translate-y-[calc(100%+16px)] overflow-hidden rounded-md shadow-pop ring-2 ring-tc"
      style={{ left: point.x, top: point.y }}
    >
      <OutfitPicture photos={photos} />
    </div>
  )
}

/**
 * The tray while placing (WRD-021 5): what was chosen, small, "Choose a
 * day" and what it is, and Cancel.
 */
export function PlacingBar({
  photos,
  what,
  onCancel,
}: {
  photos: (string | undefined)[]
  /** "Weekend · 4 garments". */
  what: string
  onCancel: () => void
}) {
  return (
    <div
      role="status"
      data-slot="placing-bar"
      className="fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-20 flex h-16 items-center gap-3 rounded-lg bg-popover px-2.5 shadow-dialog md:hidden"
    >
      <OutfitPicture photos={photos} className="size-11 shrink-0 rounded-md" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold">Choose a day</span>
        <span className="truncate text-xs text-muted-foreground">{what}</span>
      </span>
      <Button variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  )
}

/**
 * A day's single garments (WRD-020 3), each tile the size an outfit's are:
 * on a phone in a row at 56px, level with an outfit's tiles; on a computer
 * stacked, as wide. `end` at the row's end: "Create outfit".
 */
export function DayGarmentRow({
  children,
  end,
  layout = 'row',
}: {
  children: ReactNode
  end?: ReactNode
  layout?: 'column' | 'row'
}) {
  if (layout === 'column')
    return (
      <div className="flex min-w-0 flex-col gap-1.5 px-1.5">
        {children}
        {end && <div className="self-center">{end}</div>}
      </div>
    )
  return (
    <div className="flex min-w-0 items-center gap-2 pb-2">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 [&>*]:size-14">{children}</div>
      {end && <div className="shrink-0">{end}</div>}
    </div>
  )
}
