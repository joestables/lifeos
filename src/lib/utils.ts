import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/** tailwind-merge, told about LifeOS's own tokens (theme.css), so it never drops one. */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['h1', 'h2', 'day', 'kbd'],
      radius: ['control', 'row'],
      shadow: ['card', 'pop', 'dialog', 'button', 'thumb'],
    },
  },
})

/** Joins class names, letting later Tailwind classes override earlier ones. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
