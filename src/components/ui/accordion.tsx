import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'
import { ChevronDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Groups that can collapse (Tasks by Label). Bold trigger, no lines. */
function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn('flex flex-col gap-3', className)}
      {...props}
    />
  )
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn('flex flex-col', className)}
      {...props}
    />
  )
}

/** Put a ModuleTile before the text when the group has one. */
function AccordionTrigger({ className, children, ...props }: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          'flex flex-1 items-center gap-2.5 rounded-sm py-1 text-left font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring-soft [&[data-panel-open]>svg:last-child]:rotate-180',
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({ className, children, ...props }: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="h-(--accordion-panel-height) overflow-hidden transition-[height] data-ending-style:h-0 data-starting-style:h-0"
      {...props}
    >
      <div className={cn('pt-2', className)}>{children}</div>
    </AccordionPrimitive.Panel>
  )
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger }
