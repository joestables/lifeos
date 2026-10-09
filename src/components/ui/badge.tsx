import { cva, type VariantProps } from 'class-variance-authority'
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
        module: 'bg-[color-mix(in_oklch,var(--mc)_var(--tile-mix),transparent)] text-mc',
      },
    },
    defaultVariants: { variant: 'secondary' },
  },
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
