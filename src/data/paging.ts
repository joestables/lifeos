/**
 * The most rows the Data API returns for one request: `max_rows`, 1000 on
 * Supabase's hosted projects and in `supabase/config.toml`. A table read
 * whole is read a page at a time, or the rows past it are silently left
 * out (ADR-0042).
 */
export const PAGE_ROWS = 1000

type Page<T> = PromiseLike<{ data: T[] | null; error: unknown }>

/**
 * Every row, a page at a time, until a page comes back short. The query
 * must be in a stable order (a unique column last), so no row is skipped
 * or read twice between pages.
 */
export async function allRows<T>(page: (from: number, to: number) => Page<T>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_ROWS) {
    const { data, error } = await page(from, from + PAGE_ROWS - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_ROWS) return rows
  }
}
