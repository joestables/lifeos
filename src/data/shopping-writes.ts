import { newId } from './ids'
import type { ListFields, ShopLineFields } from './shopping'
import type { WriteQueue } from './queue/queue'

/**
 * Shopping's writes (ADR-0042, ADR-0057): each queues one function of the
 * `shopping` schema and returns at once; ids are made here. A Meal's lines
 * are the database's to write; these only tick them.
 */
export function shoppingWrites(queue: WriteQueue) {
  return {
    /** A new food shop, with its Meals (SHP-001 2, SHP-002 1). */
    createList(fields: ListFields, id = newId()): string {
      const { meals, do_on, space_id, title } = fields
      queue.enqueue(
        'shopping.create_list',
        {
          p_id: id,
          p_fields: {
            title,
            kind: 'food',
            ...(do_on && { do_on }),
            ...(space_id && { space_id }),
            ...(meals?.length && { meals }),
          },
        },
        [id],
      )
      return id
    },
    /** Meals onto a food shop (SHP-002 4); their lines follow. */
    addMeals(list: string, meals: readonly string[]): void {
      queue.enqueue('shopping.add_meals', { p_list: list, p_meals: [...meals] }, [list])
    },
    /** A Meal taken off (SHP-002 4); its unticked lines go. */
    removeMeal(list: string, meal: string): void {
      queue.enqueue('shopping.remove_meal', { p_list: list, p_meal: meal }, [list])
    },
    /** A line added by hand (SHP-003 1). */
    addShopLine(list: string, fields: ShopLineFields, id = newId()): string {
      queue.enqueue('shopping.add_line', { p_id: id, p_list: list, p_fields: fields }, [list])
      return id
    },
    updateShopLine(list: string, id: string, patch: ShopLineFields): void {
      queue.enqueue('shopping.update_line', { p_id: id, p_patch: patch }, [list])
    },
    deleteShopLine(list: string, id: string): void {
      queue.enqueue('shopping.delete_line', { p_id: id }, [list])
    },
    /** Lines ticked or unticked, a row of All's all at once (SHP-001 4). */
    tick(list: string, ids: readonly string[], checked: boolean): void {
      queue.enqueue('shopping.tick', { p_ids: [...ids], p_checked: checked }, [list])
    },
  }
}

export type ShoppingWrites = ReturnType<typeof shoppingWrites>
