import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import type * as React from 'react'
import { DayPicker } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { buttonVariants } from './button'

/** The Calendar itself, loaded when first needed (calendar.tsx). Weeks start on Monday. */
function Calendar({ className, classNames, ...props }: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      weekStartsOn={1}
      showOutsideDays
      className={cn('w-fit', className)}
      classNames={{
        months: 'relative flex flex-col',
        month: 'flex flex-col gap-3',
        nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
        button_previous: cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' })),
        button_next: cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' })),
        month_caption: 'flex h-8 items-center justify-center',
        caption_label: 'text-base font-bold',
        weekdays: 'flex',
        weekday: 'w-[34px] text-xs font-semibold text-muted-foreground',
        week: 'mt-0.5 flex',
        day: 'size-[34px] p-0 text-center',
        day_button:
          'size-[34px] rounded-control text-sm tabular-nums outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring-soft',
        today: '[&>button]:bg-accent [&>button]:font-bold',
        selected:
          '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary',
        outside: 'text-muted-foreground opacity-60',
        disabled: 'opacity-40',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeftIcon className="size-4" />
          ) : (
            <ChevronRightIcon className="size-4" />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
