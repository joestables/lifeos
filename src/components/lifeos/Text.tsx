import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Words on a screen (components.md): the type scale's sizes, weights and
 * colours, chosen by name, so a screen places text but never styles it
 * (Joe, 15 November). `as` is the element; `className` only places it.
 */
const textVariants = cva('', {
  variants: {
    size: { base: '', sm: 'text-sm', xs: 'text-xs', h2: 'text-h2', day: 'text-day' },
    weight: { regular: '', semibold: 'font-semibold', bold: 'font-bold' },
    tone: {
      default: '',
      muted: 'text-muted-foreground',
      danger: 'text-destructive',
      type: 'text-tc-text',
    },
    tabular: { true: 'tabular-nums' },
  },
  defaultVariants: { size: 'base', weight: 'regular', tone: 'default' },
})

type TextProps = VariantProps<typeof textVariants> & {
  as?: 'span' | 'p' | 'div' | 'h2' | 'h3' | 'li' | 'label'
} & Omit<React.HTMLAttributes<HTMLElement>, 'color'>

export function Text({
  as: Tag = 'span',
  size,
  weight,
  tone,
  tabular,
  className,
  ...props
}: TextProps) {
  return (
    <Tag
      data-slot="text"
      className={cn(textVariants({ size, weight, tone, tabular }), className) || undefined}
      {...props}
    />
  )
}
