import type { Database } from './database.types'

/**
 * An Item as stored (core.items), without its search index, which stays on
 * the server.
 */
export type ItemRow = Omit<Database['core']['Tables']['items']['Row'], 'search'>

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
    | 'place'
    | 'status'
    | 'space_id'
    | 'starts_at'
    | 'ends_at'
    | 'all_day'
    | 'due_on'
    | 'do_on'
    | 'do_at'
    | 'slot'
    | 'position'
  >
>

type CoreFunctions = Database['core']['Functions']
type FoodFunctions = Database['food']['Functions']
type ShoppingFunctions = Database['shopping']['Functions']

/**
 * The database functions the write queue replays (ADR-0042): the core's by
 * name, a Module's with its schema first ("food.create_recipe").
 */
export type WriteFn =
  | keyof CoreFunctions
  | `food.${keyof FoodFunctions & string}`
  | `shopping.${keyof ShoppingFunctions & string}`

export type WriteArgs<F extends WriteFn = WriteFn> =
  F extends `food.${infer N extends keyof FoodFunctions}`
    ? FoodFunctions[N]['Args']
    : F extends `shopping.${infer N extends keyof ShoppingFunctions}`
      ? ShoppingFunctions[N]['Args']
      : F extends keyof CoreFunctions
        ? CoreFunctions[F]['Args']
        : never
