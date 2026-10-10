import { useSyncExternalStore } from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

const phone = '(max-width: 640px)'
const subscribe = (onChange: () => void) => {
  const query = matchMedia(phone)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/** Confirms what just happened, with Undo where possible. Bottom right; bottom on a phone. */
function Toaster(props: ToasterProps) {
  const isPhone = useSyncExternalStore(
    subscribe,
    () => matchMedia(phone).matches,
    () => false,
  )
  return (
    <Sonner
      position={isPhone ? 'bottom-center' : 'bottom-right'}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-[var(--width)] items-center gap-3 rounded-lg bg-popover px-4 py-3 text-base text-popover-foreground shadow-pop',
          title: 'font-semibold',
          description: 'text-sm text-muted-foreground',
          actionButton:
            'ml-auto inline-flex h-8 items-center rounded-control px-3 text-sm font-semibold hover:bg-accent',
          icon: '[&_svg]:size-4',
          success: '[&_[data-icon]]:text-success',
          error: '[&_[data-icon]]:text-destructive',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
export { toast } from 'sonner'
