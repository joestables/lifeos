/**
 * A row that reorders (patterns.md#dragging): faded while dragged, and a 2px
 * `--ring` line, rounded, in the gap above it (or below the last row) where
 * the dragged row will go. `--reorder-gap` is the gap between rows (8px).
 */
export const REORDER_ROW =
  'relative [--reorder-gap:8px] data-[reorder=dragging]:opacity-50 ' +
  'data-[reorder=before]:before:absolute data-[reorder=before]:before:inset-x-0 data-[reorder=before]:before:z-10 data-[reorder=before]:before:h-0.5 data-[reorder=before]:before:rounded-full data-[reorder=before]:before:bg-ring data-[reorder=before]:before:top-[calc(var(--reorder-gap)/-2-1px)] ' +
  'data-[reorder=after]:after:absolute data-[reorder=after]:after:inset-x-0 data-[reorder=after]:after:z-10 data-[reorder=after]:after:h-0.5 data-[reorder=after]:after:rounded-full data-[reorder=after]:after:bg-ring data-[reorder=after]:after:bottom-[calc(var(--reorder-gap)/-2-1px)]'
