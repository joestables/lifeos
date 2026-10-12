import { supabase } from './supabase'

/** A search's results are asked for afresh, never kept on the device. */
export const searchKey = (query: string) => ['search', query] as const

/**
 * The Items whose words a search matches, best match first (SRC-001), by id:
 * the device already holds each Item, with its unsent changes. As many as
 * the server gives, as a repeating Task's later occurrences are left out.
 */
export async function searchItemIds(query: string): Promise<string[]> {
  const { data, error } = await supabase()
    .rpc('search_items', { p_query: query, p_limit: 100 })
    .select('id')
  if (error) throw error
  return data.map((row) => row.id)
}
