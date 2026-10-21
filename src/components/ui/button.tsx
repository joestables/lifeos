import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/** Button (components.md): one primary per view, for the main action. */
const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-control text-base font-semibold whitespace-nowrap transition-[background-color,color,box-shadow] outline-none select-none focus-visible:ring-3 focus-visible:ring-ring-soft disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-button hover:bg-[color-mix(in_oklch,var(--primary)_88%,var(--background))]',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-accent',
        outline: 'bg-card shadow-card hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-[color-mix(in_oklch,var(--destructive)_88%,var(--background))]',
        // Delete where it sits among other actions, quietly: red text, no fill.
        'ghost-destructive': 'text-destructive hover:bg-accent aria-expanded:bg-accent',
        // An action that reads as part of a line: the Type's text colour.
        link: 'text-tc-text underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-8 gap-1.5 px-3 text-sm',
        icon: 'size-10',
        'icon-sm': 'size-8',
      },
    },
    // A link sits in its line: no height or padding of its own.
    compoundVariants: [{ variant: 'link', className: 'h-auto px-0' }],
    defaultVariants: { variant: 'primary', size: 'default' },
  },
)

function Button({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
