import { ChefHatIcon, HeartIcon, StarIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Toggle } from '@/components/ui/toggle'
import { useLongPress } from '@/hooks/use-long-press'
import { cn } from '@/lib/utils'

/**
 * A Recipe's photo, or, without one, a quiet placeholder: the Type's tint
 * with a faint chef's hat. Square corners are left to the card around it.
 */
export function RecipePhoto({
  src,
  alt = '',
  className,
}: {
  src?: string
  alt?: string
  className?: string
}) {
  return (
    <div
      data-slot="recipe-photo"
      className={cn(
        'relative grid aspect-[4/3] place-items-center overflow-hidden bg-[color-mix(in_oklch,var(--tc)_var(--tile-mix),transparent)] text-tc-text',
        className,
      )}
    >
      {src ? (
        <img src={src} alt={alt} className="absolute inset-0 size-full object-cover" />
      ) : (
        <ChefHatIcon aria-hidden className="size-9 opacity-45" strokeWidth={1.5} />
      )}
    </div>
  )
}

/**
 * A Recipe in the library (RCP-001): its photo with my heart over it, its
 * name, its cuisine and, for a Draft, a "Draft" badge. The whole card opens
 * the Recipe. While choosing several, a checkbox takes the heart's corner
 * and the whole card chooses it; a chosen card is ringed. One that can't be
 * chosen (`unavailable`, saying why) fades, as a MealCard does.
 */
export function RecipeCard({
  name,
  photo,
  cuisine,
  draft = false,
  favourite = false,
  by,
  selecting = false,
  selected = false,
  unavailable,
  onOpen,
  onFavourite,
  onSelect,
  onLongPress,
}: {
  name: string
  photo?: string
  cuisine?: string
  draft?: boolean
  favourite?: boolean
  /** In a Household: whose it is, when it isn't mine. */
  by?: string
  /** Choosing several (a computer's Select; a long press on a phone). */
  selecting?: boolean
  selected?: boolean
  /** Choosing several: why this one can't be chosen ("Sam's"; Joe, 26 October). */
  unavailable?: string
  onOpen?: () => void
  onFavourite?: (on: boolean) => void
  onSelect?: (on: boolean) => void
  /** A long press by touch: starts choosing several (RCP-004). */
  onLongPress?: () => void
}) {
  const longPress = useLongPress(onLongPress)
  return (
    <div
      {...longPress}
      data-slot="recipe-card"
      data-selected={selected || undefined}
      className={cn(
        'group/card relative flex min-w-0 flex-col overflow-hidden rounded-lg bg-card shadow-card data-selected:ring-2 data-selected:ring-ring',
        selecting && unavailable && 'pointer-events-none opacity-45 shadow-none [&_img]:grayscale',
      )}
    >
      <RecipePhoto src={photo} />
      {selecting && unavailable ? null : selecting ? (
        <span className="pointer-events-none absolute top-2 right-2 z-10 grid size-10 place-items-center rounded-control bg-popover/85 shadow-card backdrop-blur-sm">
          <Checkbox checked={selected} tabIndex={-1} aria-hidden />
        </span>
      ) : (
        <Toggle
          size="lg"
          aria-label="Favourite"
          pressed={favourite}
          onPressedChange={onFavourite}
          className="absolute top-2 right-2 z-10 bg-popover/85 shadow-card backdrop-blur-sm hover:bg-popover"
        >
          <HeartIcon />
        </Toggle>
      )}
      <div className="flex min-w-0 flex-col gap-1 px-3.5 pt-2.5 pb-3 group-data-[size=S]/grid:gap-0.5 group-data-[size=S]/grid:px-2.5 group-data-[size=S]/grid:pt-2 group-data-[size=S]/grid:pb-2.5">
        <button
          type="button"
          role={selecting ? 'checkbox' : undefined}
          aria-checked={selecting ? selected : undefined}
          aria-disabled={selecting && unavailable ? true : undefined}
          tabIndex={selecting && unavailable ? -1 : undefined}
          onClick={selecting ? () => onSelect?.(!selected) : onOpen}
          className="truncate text-left font-[650] outline-none group-data-[size=S]/grid:text-sm after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring-soft"
        >
          {name}
        </button>
        <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground group-data-[size=S]/grid:text-xs">
          <span className="truncate">
            {[cuisine, selecting && unavailable ? unavailable : by].filter(Boolean).join(' · ')}
          </span>
          {draft && (
            <Badge variant="outline" className="ml-auto shrink-0">
              Draft
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

/** The card sizes the library offers (S / M / L). */
export type CardSize = 'S' | 'M' | 'L'

/**
 * RecipeCards in a grid, at the size I choose: as many columns as fit at
 * 150, 200 or 280px; on a phone three, two or one across.
 */
export function RecipeGrid({ size = 'M', children }: { size?: CardSize; children: ReactNode }) {
  return (
    <div
      data-size={size}
      className={cn(
        'group/grid grid gap-2.5 sm:gap-3.5',
        size === 'S' && 'grid-cols-3 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]',
        size === 'M' && 'grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]',
        size === 'L' && 'grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]',
      )}
    >
      {children}
    </div>
  )
}

/** A verdict out of five, as stars in the Type's colour; set by pressing one. */
export function StarRating({
  value,
  onChange,
  size = 'default',
}: {
  value: number
  onChange?: (value: number) => void
  size?: 'default' | 'sm'
}) {
  return (
    <div
      role={onChange ? 'radiogroup' : 'img'}
      aria-label={`${value} out of 5`}
      className="flex items-center"
    >
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={`${n} out of 5`}
            onClick={() => onChange(n === value ? 0 : n)}
            className="grid size-9 place-items-center rounded-control text-muted-foreground outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring-soft"
          >
            <StarIcon
              className={cn('size-6', n <= value && 'fill-current text-tc-text')}
              strokeWidth={1.75}
            />
          </button>
        ) : (
          <StarIcon
            key={n}
            aria-hidden
            className={cn(
              size === 'sm' ? 'size-3.5' : 'size-4',
              n <= value ? 'fill-current text-tc-text' : 'text-muted-foreground/45',
            )}
          />
        ),
      )}
    </div>
  )
}
