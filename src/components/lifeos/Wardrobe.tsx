import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group'
import {
  CheckIcon,
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
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Toggle } from '@/components/ui/toggle'
import { useLongPress } from '@/hooks/use-long-press'
import { cn } from '@/lib/utils'
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
        <ShirtIcon aria-hidden className="size-9 opacity-45" strokeWidth={1.5} />
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
      </div>
    </div>
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
 * A field of the add sheet (WRD-005): its name, 13px bold, with what is
 * still needed in muted text at its end ("Needed"), then its control.
 */
export function SheetField({
  label,
  needed = false,
  aside,
  children,
}: {
  label: string
  needed?: boolean
  /** At the label's end: "Optional", "3 suggested". */
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-label={label} className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-2">
        <h3 className="text-sm font-bold">{label}</h3>
        {needed && <span className="text-xs font-semibold text-tc-text">Needed</span>}
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
  className,
}: {
  /** In my categories' order. */
  photos: (string | undefined)[]
  className?: string
}) {
  const shown = photos.slice(0, 4)
  const extra = photos.length - shown.length
  return (
    <div
      data-slot="outfit-picture"
      className={cn(
        'grid aspect-square gap-0.5 overflow-hidden bg-card',
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
}: {
  title: string
  count?: number
  aside?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <aside
      aria-label={title}
      data-slot="wardrobe-pane"
      className={cn(
        'sticky top-4 flex max-h-[calc(100svh-216px)] w-80 shrink-0 flex-col overflow-hidden rounded-lg bg-card shadow-card',
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
}: {
  photos: (string | undefined)[]
  name?: string
  meta: string
  picked?: boolean
  dragging?: boolean
  onRemove?: () => void
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
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn('truncate text-sm font-semibold', !name && 'text-muted-foreground')}>
          {name ?? 'Untitled outfit'}
        </span>
        <span className="truncate text-xs text-muted-foreground">{meta}</span>
      </span>
      <RemoveButton label="Remove from Planned outfits" onClick={onRemove} />
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
}: {
  title: string
  photos: (string | undefined)[]
  count: number
  /** What it counts: garments (the builder) or outfits (Planned outfits). */
  unit?: 'garment' | 'outfit'
  action?: ReactNode
  onOpen?: () => void
}) {
  const shown = photos.slice(-4)
  return (
    <div
      data-slot="tray"
      className="fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-20 flex h-16 items-center gap-3 rounded-lg bg-popover pr-2.5 pl-2.5 shadow-dialog md:hidden"
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
              <GarmentPhoto
                key={i}
                src={p}
                className={cn('size-11 rounded-md ring-2 ring-popover', i > 0 && '-ml-4')}
              />
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
}: {
  title: string
  count?: number
  aside?: ReactNode
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <>
      <div aria-hidden className="fixed inset-0 z-30 bg-overlay md:hidden" />
      <section
        role="dialog"
        aria-label={title}
        className="fixed inset-x-0 bottom-0 z-40 flex max-h-[85svh] flex-col rounded-t-xl bg-card pb-[env(safe-area-inset-bottom)] shadow-dialog md:hidden"
      >
        <span
          aria-hidden
          className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-input-strong"
        />
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

const SKY: Record<Sky, { icon: LucideIcon; label: string }> = {
  sun: { icon: SunIcon, label: 'Sunny' },
  'sun-cloud': { icon: CloudSunIcon, label: 'Sunny spells' },
  cloud: { icon: CloudIcon, label: 'Cloudy' },
  fog: { icon: CloudFogIcon, label: 'Fog' },
  drizzle: { icon: CloudDrizzleIcon, label: 'Drizzle' },
  rain: { icon: CloudRainIcon, label: 'Rain' },
  snow: { icon: CloudSnowIcon, label: 'Snow' },
  thunder: { icon: CloudLightningIcon, label: 'Thunder' },
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
  const { icon: Icon, label } = SKY[forecast.sky]
  const rain = forecast.rain >= 20 && (
    <span className="inline-flex items-center gap-px text-muted-foreground">
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
      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
      <span className="ml-0.5">{forecast.high}°</span>
      <span className="text-muted-foreground">{forecast.low}°</span>
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
 * An outfit on a day (WRD-020 3; Joe, 19 November): its garments, each its
 * own card, joined so they read as one, under its name (or "Outfit") in
 * the Type's text colour. `column`, a computer's narrow day: the garments
 * as square tiles stacked in one shadowed card, a 2px line in the Type's
 * colour down their left through a dot at each. `row`, a phone's day: the
 * Type's tint round them, the tiles in a row at 56px.
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
  const label = (
    <span className="flex min-w-0 items-center gap-1 text-xs font-bold text-tc-text">
      <ShirtIcon aria-hidden className="size-3 shrink-0" />
      <span className="truncate">{name ?? 'Outfit'}</span>
    </span>
  )
  if (layout === 'row')
    return (
      <div
        data-slot="day-outfit"
        data-picked={picked || undefined}
        className={cn(
          'flex min-w-0 flex-col gap-2 rounded-row bg-[color-mix(in_oklch,var(--tc)_var(--tile-mix),transparent)] p-2 data-picked:ring-2 data-picked:ring-ring',
          past && 'opacity-60',
          dragging && 'z-10 shadow-pop',
        )}
      >
        <div className="px-0.5">{label}</div>
        <div className="flex gap-1.5">
          {garments.map((g) => (
            <div key={g.id} className="size-14 shrink-0">
              <DayGarment garment={g} alone />
            </div>
          ))}
        </div>
      </div>
    )
  return (
    <div
      data-slot="day-outfit"
      data-picked={picked || undefined}
      className={cn(
        'flex min-w-0 flex-col gap-1.5 rounded-control bg-card p-1.5 shadow-card data-picked:ring-2 data-picked:ring-ring',
        past && 'opacity-60',
        dragging && 'z-10 shadow-pop',
      )}
    >
      <div className="px-0.5">{label}</div>
      <div className="relative flex flex-col gap-1.5 pl-3.5">
        <span aria-hidden className="absolute top-3 bottom-3 left-[5px] w-0.5 rounded-full bg-tc" />
        {garments.map((g) => (
          <div key={g.id} className="relative">
            <span
              aria-hidden
              className="absolute top-1/2 -left-[13px] z-10 size-2.5 -translate-y-1/2 rounded-full bg-tc ring-2 ring-card"
            />
            <DayGarment garment={g} />
          </div>
        ))}
      </div>
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
  onOpen,
}: {
  title: string
  photos: (string | undefined)[]
  past?: boolean
  wide?: boolean
  onOpen?: () => void
}) {
  const max = wide ? 6 : 4
  const shown = photos.length > max ? photos.slice(0, max - 1) : photos
  const extra = photos.length - shown.length
  return (
    <div
      data-slot="plan-card"
      data-colour="orange"
      className={cn(
        'relative flex min-w-0 flex-col rounded-control bg-card shadow-card',
        wide ? 'gap-1.5 px-3.5 py-3' : 'gap-1.5 px-2.5 py-[9px]',
        past && 'bg-[color-mix(in_oklch,var(--card)_50%,transparent)] shadow-none',
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
      <div className="flex gap-1">
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
    </div>
  )
}

/* ---------- Adding a garment on a phone ---------- */

/**
 * The camera (WRD-005 1): always dark, the view filling the screen, a
 * square frame to put the garment in (its corners marked), Close and the
 * flash at the top, then the last photo, the shutter (72px) and Skip at
 * the foot.
 */
export function CameraView({ view, last }: { view: string; last?: string }) {
  return (
    <div className="dark fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      <div className="flex h-16 shrink-0 items-center justify-between px-3">
        <Button variant="ghost" size="icon" aria-label="Close">
          <XIcon />
        </Button>
        <span className="text-sm font-semibold">New garment</span>
        <Button variant="ghost" size="icon" aria-label="Flash">
          <ZapIcon />
        </Button>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <StoredPicture src={view} alt="" className="absolute inset-0 size-full object-cover" />
        <div aria-hidden className="absolute inset-0 grid place-items-center">
          <div className="relative aspect-square w-[86%] rounded-lg outline-[100vmax] outline-solid outline-[color-mix(in_oklch,var(--background)_62%,transparent)]">
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
      <div className="flex h-36 shrink-0 items-center justify-between px-8 pb-[env(safe-area-inset-bottom)]">
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
          className="grid size-[76px] place-items-center rounded-full border-4 border-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring-soft"
        >
          <span className="size-[60px] rounded-full bg-foreground" />
        </button>
        <Button variant="ghost" size="sm" className="w-12 px-0">
          Skip
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
}: {
  photo: string
  at: { x: number; y: number }
  hex: string
}) {
  return (
    <div className="relative aspect-square w-full touch-none overflow-hidden rounded-lg select-none">
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
 * list is ordered, its Swatch for a colour, its name, how many use it,
 * muted and tabular, and its "…".
 */
export function ListEntryRow({
  name,
  uses,
  ordered = false,
  hex,
  fixed = false,
  menu,
}: {
  name: string
  /** "12 garments". */
  uses: string
  ordered?: boolean
  hex?: string
  /** My Outfits: no handle, no menu. */
  fixed?: boolean
  menu?: ReactNode
}) {
  return (
    <div className="flex min-h-12 min-w-0 items-center gap-2.5 rounded-row px-2 hover:bg-accent">
      {ordered && (
        <GripVerticalIcon
          aria-hidden
          className={cn(
            'size-4 shrink-0 text-muted-foreground',
            fixed ? 'invisible' : 'cursor-grab',
          )}
        />
      )}
      {hex && <Swatch hex={hex} size="md" />}
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</span>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{uses}</span>
      <span className={cn('shrink-0', fixed && 'invisible')}>{menu}</span>
    </div>
  )
}
