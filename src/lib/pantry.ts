/** The Pantry's aisles, in shopping order (ADR-0012, PAN-001). */
export const AISLES = {
  fruit_veg: 'Fruit & Veg',
  bakery: 'Bakery',
  protein: 'Protein',
  chilled: 'Chilled',
  cupboard: 'Cupboard',
  frozen: 'Frozen',
} as const

export type Aisle = keyof typeof AISLES
