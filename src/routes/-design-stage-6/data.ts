import type { Forecast, GarmentFace } from '@/components/lifeos'
import { COLOURS, NEW_TEAL, garmentPhoto, type Category, type ColourKey } from './art'

/** Made-up wardrobe for Stage 6's design page. "Today" is Wednesday 18 November. */

const CATEGORY_NAME: Record<Category, string> = {
  tshirt: 'T-shirt',
  shirt: 'Shirt',
  jumper: 'Jumper',
  hoodie: 'Hoodie',
  jacket: 'Jacket',
  coat: 'Coat',
  trousers: 'Trousers',
  jeans: 'Jeans',
  shorts: 'Shorts',
  trainers: 'Trainers',
  shoes: 'Shoes',
}

/** Joe's categories, in his order (Settings → Wardrobe). */
export const CATEGORIES = [
  'T-shirts',
  'Shirts',
  'Jumpers',
  'Hoodies',
  'Jackets',
  'Coats',
  'Trousers',
  'Jeans',
  'Shorts',
  'Trainers',
  'Shoes',
]
export const SIZES = ['XS', 'S', 'M', 'L', 'XL', '30R', '32R', '32L', '34R', 'UK 9', 'UK 10']
export const FITS = ['Slim', 'Regular', 'Relaxed', 'Oversized']
export const TAGS = ['Gym', 'Work', 'Smart', 'Holiday', 'Lounge', 'Running']
export const BRANDS = [
  'Adidas',
  'Arket',
  'Barbour',
  'COS',
  'Carhartt',
  'Gymshark',
  "Levi's",
  'New Balance',
  'Nike',
  'Ralph Lauren',
  'Reiss',
  'Uniqlo',
]

type Spec = [
  id: string,
  category: Category,
  colour: ColourKey,
  brand: string,
  size: string,
  extra?: { fit?: string; tags?: string[]; favourite?: boolean; retired?: boolean },
]

const SPECS: Spec[] = [
  [
    'tee-white',
    'tshirt',
    'white',
    'Uniqlo',
    'M',
    { fit: 'Regular', tags: ['Lounge'], favourite: true },
  ],
  ['tee-navy', 'tshirt', 'navy', 'Uniqlo', 'M', { fit: 'Regular' }],
  ['tee-black', 'tshirt', 'black', 'COS', 'M', { fit: 'Relaxed' }],
  ['tee-gym', 'tshirt', 'grey', 'Gymshark', 'M', { fit: 'Slim', tags: ['Gym'] }],
  [
    'shirt-sky',
    'shirt',
    'sky',
    'Ralph Lauren',
    'M',
    { fit: 'Slim', tags: ['Work', 'Smart'], favourite: true },
  ],
  ['shirt-white', 'shirt', 'white', 'Reiss', 'M', { fit: 'Slim', tags: ['Work', 'Smart'] }],
  ['shirt-denim', 'shirt', 'denim', "Levi's", 'L', { fit: 'Regular' }],
  ['jumper-olive', 'jumper', 'olive', 'Arket', 'M', { fit: 'Regular', favourite: true }],
  ['jumper-navy', 'jumper', 'navy', 'COS', 'M', { fit: 'Relaxed', tags: ['Work'] }],
  ['jumper-cream', 'jumper', 'cream', 'Arket', 'L', { fit: 'Oversized' }],
  ['hoodie-black', 'hoodie', 'black', 'Nike', 'L', { fit: 'Relaxed', tags: ['Gym', 'Lounge'] }],
  ['hoodie-grey', 'hoodie', 'grey', 'Gymshark', 'M', { tags: ['Gym'] }],
  ['jacket-stone', 'jacket', 'stone', 'Carhartt', 'L', { fit: 'Relaxed', favourite: true }],
  ['jacket-olive', 'jacket', 'olive', 'Barbour', 'M', { fit: 'Regular' }],
  ['coat-navy', 'coat', 'navy', 'Reiss', 'M', { fit: 'Slim', tags: ['Work', 'Smart'] }],
  ['coat-camel', 'coat', 'camel', 'COS', 'M', { fit: 'Regular' }],
  ['chinos-navy', 'trousers', 'navy', 'Uniqlo', '32R', { fit: 'Slim', tags: ['Work'] }],
  ['chinos-stone', 'trousers', 'stone', 'Arket', '32R', { fit: 'Regular' }],
  ['trousers-charcoal', 'trousers', 'charcoal', 'Reiss', '32L', { fit: 'Slim', tags: ['Smart'] }],
  ['jeans-denim', 'jeans', 'denim', "Levi's", '32R', { fit: 'Slim', favourite: true }],
  ['jeans-black', 'jeans', 'black', "Levi's", '32R', { fit: 'Slim' }],
  ['shorts-sky', 'shorts', 'sky', 'Uniqlo', 'M', { tags: ['Holiday'] }],
  ['shorts-gym', 'shorts', 'black', 'Nike', 'M', { tags: ['Gym', 'Running'] }],
  ['trainers-white', 'trainers', 'white', 'New Balance', 'UK 9', { favourite: true }],
  ['trainers-grey', 'trainers', 'grey', 'Nike', 'UK 9', { tags: ['Running'] }],
  ['shoes-camel', 'shoes', 'camel', 'Reiss', 'UK 9', { tags: ['Smart'] }],
  ['shoes-black', 'shoes', 'black', 'Reiss', 'UK 9', { tags: ['Work', 'Smart'] }],
  ['jumper-burgundy', 'jumper', 'burgundy', 'Uniqlo', 'M', { retired: true }],
]

export interface DesignGarment extends GarmentFace {
  kind: Category
}

export const GARMENTS: DesignGarment[] = SPECS.map(([id, kind, colour, brand, size, extra], i) => ({
  id,
  kind,
  brand,
  size,
  category: CATEGORY_NAME[kind],
  colour: COLOURS[colour],
  photo: garmentPhoto(kind, COLOURS[colour].hex, i),
  ...extra,
}))

export const G = Object.fromEntries(GARMENTS.map((g) => [g.id, g])) as Record<string, DesignGarment>

/** Every garment the Wardrobe tab shows: Owned ones, newest first. */
export const OWNED = GARMENTS.filter((g) => !g.retired)

export interface DesignOutfit {
  id: string
  name?: string
  garments: DesignGarment[]
  worn: number
  collections: string[]
  photos: (string | undefined)[]
}

const outfit = (
  id: string,
  ids: string[],
  worn: number,
  collections: string[],
  name?: string,
): DesignOutfit => {
  const garments = ids.map((i) => G[i]!)
  return {
    id,
    name,
    garments,
    worn,
    collections,
    photos: garments.map((g) => g.photo),
  }
}

export const OUTFITS: DesignOutfit[] = [
  outfit('o-work', ['shirt-sky', 'chinos-navy', 'shoes-camel'], 6, ['Work'], 'Navy work'),
  outfit('o-weekend', ['jacket-stone', 'tee-white', 'jeans-denim', 'trainers-white'], 9, [
    'Lisbon',
  ]),
  outfit('o-olive', ['jumper-olive', 'chinos-stone', 'trainers-white'], 4, [], 'Olive knit'),
  outfit('o-gym', ['tee-gym', 'shorts-gym', 'trainers-grey'], 14, ['Gym'], 'Push day'),
  outfit(
    'o-smart',
    ['coat-navy', 'shirt-white', 'trousers-charcoal', 'shoes-black'],
    2,
    ['Work'],
    'Dinner out',
  ),
  outfit('o-lisbon', ['shirt-denim', 'shorts-sky', 'trainers-white'], 0, ['Lisbon']),
  outfit('o-cosy', ['hoodie-black', 'jeans-black', 'trainers-white'], 5, []),
  outfit(
    'o-camel',
    ['coat-camel', 'jumper-cream', 'jeans-denim', 'shoes-black'],
    1,
    [],
    'Camel coat',
  ),
  outfit('o-navy', ['jumper-navy', 'chinos-stone', 'trainers-white'], 3, ['Work']),
]

export const O = Object.fromEntries(OUTFITS.map((o) => [o.id, o])) as Record<string, DesignOutfit>

export const outfitMeta = (o: DesignOutfit) =>
  [`${o.garments.length} garments`, o.worn ? `Worn ${o.worn}×` : 'Not worn yet'].join(' · ')

/** Joe's own collections, in his order; My Outfits is always first. */
export const COLLECTIONS = ['Work', 'Lisbon', 'Gym']

/** The week shown: Monday 16 to Sunday 22 November, today Wednesday 18. */
export const WEEK: {
  key: string
  name: string
  number: number
  today?: boolean
  past?: boolean
  forecast?: Forecast
  outfits: { outfit: DesignOutfit; garments?: DesignGarment[] }[]
  single: DesignGarment[]
}[] = [
  {
    key: 'mon',
    name: 'Mon',
    number: 16,
    past: true,
    outfits: [{ outfit: O['o-work']! }],
    single: [],
  },
  {
    key: 'tue',
    name: 'Tue',
    number: 17,
    past: true,
    outfits: [{ outfit: O['o-gym']! }, { outfit: O['o-olive']! }],
    single: [],
  },
  {
    key: 'wed',
    name: 'Wed',
    number: 18,
    today: true,
    forecast: { sky: 'rain', high: 11, low: 6, rain: 80 },
    outfits: [{ outfit: O['o-work']! }],
    single: [G['coat-navy']!],
  },
  {
    key: 'thu',
    name: 'Thu',
    number: 19,
    forecast: { sky: 'cloud', high: 12, low: 7, rain: 30 },
    outfits: [{ outfit: O['o-gym']! }],
    single: [],
  },
  {
    key: 'fri',
    name: 'Fri',
    number: 20,
    forecast: { sky: 'sun-cloud', high: 13, low: 5, rain: 10 },
    outfits: [{ outfit: O['o-smart']! }],
    single: [],
  },
  {
    key: 'sat',
    name: 'Sat',
    number: 21,
    forecast: { sky: 'sun', high: 14, low: 4, rain: 0 },
    outfits: [],
    single: [G['jumper-olive']!, G['jeans-denim']!],
  },
  {
    key: 'sun',
    name: 'Sun',
    number: 22,
    forecast: { sky: 'drizzle', high: 10, low: 6, rain: 60 },
    outfits: [],
    single: [],
  },
]

/** Outfits waiting in the Planned Outfits pane. */
export const PLANNED = [O['o-weekend']!, O['o-cosy']!, O['o-camel']!]

/** A new garment photographed in a colour Joe hasn't got (WRD-006 3). */
export const TEAL_TEE = garmentPhoto('tshirt', NEW_TEAL.hex, 1)
