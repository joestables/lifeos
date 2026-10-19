import { useAuth, type FoodData } from '@/data'

/** Who did something, as far as I can tell: me, or someone in my Household. */
export function useWho() {
  const auth = useAuth()
  const me = auth.status === 'signed-in' ? auth.me : null
  return (id: string | null) => (id && id === me?.id ? me.name : 'Someone')
}

/** Titles of the Recipes I can see, to show "@" references by (RCP-008 3). */
export const titlesOf = (food: FoodData) =>
  new Map(food.recipes.filter((r) => r.state !== 'cancelled').map((r) => [r.item.id, r.item.title]))
