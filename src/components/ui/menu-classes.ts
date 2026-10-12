/** Shared by DropdownMenu, Popover and Select (components.md: "as DropdownMenu"). */
export const popupClasses =
  'z-50 max-h-(--available-height) origin-(--transform-origin) overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-pop outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95'

export const menuItemClasses =
  'relative flex h-9 items-center gap-2.5 rounded-sm px-2.5 text-base outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4 [&_svg]:text-muted-foreground'

export const menuLabelClasses = 'px-2.5 pt-1.5 pb-1 text-xs font-semibold text-muted-foreground'
