/** The units a line may have (ADR-0053): none for a count or an unmeasured line. */
export const LINE_UNITS = ['', 'g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup'] as const

/** A step's text being typed, in StepEditor's box: as tall as its text. */
export const STEP_FIELD =
  'field-sizing-content min-h-10 w-full min-w-0 flex-1 resize-none rounded-control bg-input px-3 py-2 leading-[1.6] outline-none focus-visible:ring-3 focus-visible:ring-ring-soft'
