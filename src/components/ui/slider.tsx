import { Slider as SliderPrimitive } from '@base-ui/react/slider'
import { cn } from '@/lib/utils'

/** 6px track, --primary range, 16px thumb. Durations and amounts. */
/** One thumb, or one per value for a range (components.md). */
function Slider({ className, ...props }: SliderPrimitive.Root.Props) {
  const values = props.value ?? props.defaultValue
  const thumbs = Array.isArray(values) ? values.length : 1
  return (
    <SliderPrimitive.Root data-slot="slider" className={cn('w-full', className)} {...props}>
      <SliderPrimitive.Control className="flex h-4 w-full touch-none items-center select-none">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative h-1.5 w-full rounded-full bg-muted"
        >
          <SliderPrimitive.Indicator data-slot="slider-range" className="rounded-full bg-primary" />
          {Array.from({ length: thumbs }, (_, i) => (
            <SliderPrimitive.Thumb
              key={i}
              index={thumbs > 1 ? i : undefined}
              data-slot="slider-thumb"
              className="block size-4 rounded-full bg-switch-thumb shadow-[0_0_0_1.5px_var(--primary),var(--shadow-thumb)] outline-none focus-visible:ring-3 focus-visible:ring-ring-soft"
            />
          ))}
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
