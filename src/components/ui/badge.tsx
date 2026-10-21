import { cva, type VariantProps } from 'class-variance-authority'
import { XIcon } from 'lucide-react'
import type * as React from 'react'
import { cn } from '@/lib/utils'

/** Badge (components.md): short labels only — a Label, a state, a count. */
const badgeVariants = cva(
  'inline-flex h-[22px] shrink-0 items-center gap-1 rounded-full px-[9px] text-xs leading-none font-semibold whitespace-nowrap [&_svg]:size-3',
  {
    variants: {
      variant: {
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'bg-muted text-muted-foreground',
        destructive: 'bg-[color-mix(in_oklch,var(--destructive)_13%,transparent)] text-destructive',
        type: 'bg-[color-mix(in_oklch,var(--tc)_var(--tile-mix),transparent)] text-tc-text',
      },
    },
    defaultVariants: { variant: 'secondary' },
  },
)

function Badge({
  className,
  variant,
  onRemove,
  removeLabel,
  children,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & {
    /** A value being chosen in a form: an X at its end takes it away. */
    onRemove?: () => void
    removeLabel?: string
  }) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
      {onRemove && (
        <button
          type="button"
          aria-label={removeLabel}
          className="-mr-1 grid size-4 place-items-center rounded-full outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onRemove}
        >
          <XIcon />
        </button>
      )}
    </span>
  )
}

export { Badge, badgeVariants }
