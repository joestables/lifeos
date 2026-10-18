import { ChefHatIcon, HeartIcon, StarIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Toggle } from '@/components/ui/toggle'
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
 * the Recipe.
 */
export function RecipeCard({
  name,
  photo,
  cuisine,
  draft = false,
  favourite = false,
  by,
  onOpen,
  onFavourite,
}: {
  name: string
  photo?: string
  cuisine?: string
  draft?: boolean
  favourite?: boolean
  /** In a Household: whose it is, when it isn't mine. */
  by?: string
  onOpen?: () => void
  onFavourite?: (on: boolean) => void
}) {
  return (
    <div
      data-slot="recipe-card"
      className="group/card relative flex min-w-0 flex-col overflow-hidden rounded-lg bg-card shadow-card"
    >
      <RecipePhoto src={photo} />
      <Toggle
        aria-label="Favourite"
        pressed={favourite}
        onPressedChange={onFavourite}
        className="absolute top-2 right-2 z-10 bg-popover/85 shadow-card backdrop-blur-sm hover:bg-popover"
      >
        <HeartIcon />
      </Toggle>
      <div className="flex min-w-0 flex-col gap-1 px-3.5 pt-2.5 pb-3">
        <button
          type="button"
          onClick={onOpen}
          className="truncate text-left font-[650] outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring-soft"
        >
          {name}
        </button>
        <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          <span className="truncate">{[cuisine, by].filter(Boolean).join(' · ')}</span>
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

/** RecipeCards in a grid: as many columns as fit at 190px or more, two on a phone. */
export function RecipeGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] sm:gap-3.5">
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
