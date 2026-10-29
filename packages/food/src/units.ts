/**
 * The units a line may have (ADR-0053): metric, a 250 ml cup, or none for a
 * count or an unmeasured line. The only conversion factors in LifeOS: the database's
 * check uses the same ones.
 */
export const UNITS = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup'] as const
export type Unit = (typeof UNITS)[number]

export type Kind = 'weight' | 'volume'

/** Each unit in its kind's base unit: grams or millilitres. */
export const FACTORS: Record<Unit, { kind: Kind; base: number }> = {
  g: { kind: 'weight', base: 1 },
  kg: { kind: 'weight', base: 1000 },
  ml: { kind: 'volume', base: 1 },
  l: { kind: 'volume', base: 1000 },
  tsp: { kind: 'volume', base: 5 },
  tbsp: { kind: 'volume', base: 15 },
  cup: { kind: 'volume', base: 250 },
}

export function isUnit(value: string): value is Unit {
  return (UNITS as readonly string[]).includes(value)
}

/** What people type for each unit ("grams", "Tbsp", "teaspoons"). */
const ALIASES: Record<string, Unit> = {
  g: 'g',
  gr: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kgs: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  ml: 'ml',
  millilitre: 'ml',
  millilitres: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  l: 'l',
  litre: 'l',
  litres: 'l',
  liter: 'l',
  liters: 'l',
  tsp: 'tsp',
  tsps: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tbsp: 'tbsp',
  tbsps: 'tbsp',
  tbs: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  cup: 'cup',
  cups: 'cup',
}

export function unitOf(word: string): Unit | undefined {
  return ALIASES[word.toLowerCase().replace(/\.$/, '')]
}
