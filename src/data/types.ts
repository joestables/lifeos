import type { Database } from './database.types'

/** An Item as stored (core.items). */
export type ItemRow = Database['core']['Tables']['items']['Row']

/** Whether the server has an Item's latest change yet (OFF-001, OFF-004). */
export type SyncState = 'pending' | 'failed'

/** An Item as the app shows it: the server's row with any unsent changes laid over it. */
export type Item = ItemRow & { sync?: SyncState }

/** The fields a write may set (core_private.check_fields). */
export type ItemFields = Partial<
  Pick<
    ItemRow,
    | 'title'
    | 'body'
    | 'status'
    | 'space_id'
    | 'starts_at'
    | 'ends_at'
    | 'all_day'
    | 'due_on'
    | 'do_on'
    | 'do_at'
    | 'slot'
  >
>

type CoreFunctions = Database['core']['Functions']

/** The database functions the write queue replays (ADR-0042). */
export type WriteFn = keyof CoreFunctions

export type WriteArgs<F extends WriteFn = WriteFn> = CoreFunctions[F]['Args']
