import { Input as InputPrimitive } from '@base-ui/react/input'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/** Filled, never outlined; the card fill and the 3px halo on focus (components.md). */
const fieldClasses =
  'w-full min-w-0 rounded-control border border-transparent bg-input text-base text-foreground transition-[background-color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:bg-card focus-visible:ring-3 focus-visible:ring-ring-soft disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 aria-invalid:ring-[color-mix(in_oklch,var(--destructive)_25%,transparent)]'

const inputVariants = cva(fieldClasses, {
  variants: {
    size: { default: 'h-10 px-3.5', sm: 'h-8 px-2.5 text-sm', lg: 'h-13 px-4 text-[16px]' },
  },
  defaultVariants: { size: 'default' },
})

function Input({
  className,
  size,
  ...props
}: Omit<InputPrimitive.Props, 'size'> & VariantProps<typeof inputVariants>) {
  return (
    <InputPrimitive
      data-slot="input"
      className={cn(inputVariants({ size }), className)}
      {...props}
    />
  )
}

export { Input, fieldClasses }
