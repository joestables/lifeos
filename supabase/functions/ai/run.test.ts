import { describe, expect, it } from 'vitest'
import {
  askGemini,
  fillLines,
  importRecipe,
  linkKind,
  publicUrl,
  readPage,
  readSource,
  Refused,
  youtubeId,
  type Fetch,
  type ImportDeps,
} from './run.ts'
import { importInput, pantryList } from './rules.ts'
import { parseRecipes, RESPONSE_SCHEMA } from './schema.ts'

const PANTRY = [
  { id: 'p-salt', name: 'Salt' },
  { id: 'p-onion', name: 'Onion' },
  { id: 'p-chorizo', name: 'Chorizo' },
]

const ingredient = (fields: Record<string, unknown>) => ({
  outcome: 'new',
  pantryRef: null,
  name: null,
  aisle: null,
  defaultUnit: null,
  group: null,
  amount: null,
  amountUpper: null,
  unit: null,
  isApproximate: false,
  sourceLine: '',
  ...fields,
})

const answer = (ingredients: unknown[], extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    isRecipe: true,
    recipes: [
      {
        name: 'Chicken and chorizo paella',
        ingredients,
        method: ['1. Dice 1 onion.', 'Fry it for 5 minutes.'],
        notes: 'Bomba rice is best.',
        prepTimeMinutes: 15,
        cookTimeMinutes: 40,
        servings: 4,
        categoryName: 'Dinner',
        cuisineName: 'Spanish',
        proteinNames: ['Chicken', 'Pork'],
        carbNames: ['Rice'],
        ...extra,
      },
    ],
  })

describe('links (ADR-0054)', () => {
  it('reads only public web addresses', () => {
    expect(publicUrl('https://www.bbcgoodfood.com/recipes/paella')).not.toBeNull()
    for (const bad of [
      'ftp://example.com/x',
      'http://localhost:8080',
      'http://10.0.0.4/recipe',
      'http://192.168.1.2',
      'http://169.254.169.254/latest',
      'http://intranet/recipe',
      'not a link',
    ])
      expect(publicUrl(bad), bad).toBeNull()
  })

  it('knows YouTube, TikTok and Instagram from a page', () => {
    const kind = (s: string) => linkKind(new URL(s))
    expect(kind('https://youtu.be/abc123')).toBe('youtube')
    expect(kind('https://m.youtube.com/watch?v=abc123')).toBe('youtube')
    expect(kind('https://www.tiktok.com/@cook/video/1')).toBe('tiktok')
    expect(kind('https://www.instagram.com/reel/x/')).toBe('instagram')
    expect(kind('https://www.bbcgoodfood.com/recipes/paella')).toBe('page')
    expect(youtubeId(new URL('https://youtu.be/abc123?t=4'))).toBe('abc123')
    expect(youtubeId(new URL('https://www.youtube.com/shorts/xyz_9'))).toBe('xyz_9')
    expect(youtubeId(new URL('https://www.youtube.com/watch?v=v1d'))).toBe('v1d')
  })
})

describe('reading a page (RCP-014 1)', () => {
  const html = `<html><head><title>Paella | Food site</title>
    <meta property="og:image" content="https://example.com/og.jpg">
    <script type="application/ld+json">{"@context":"https://schema.org","@graph":[
      {"@type":"WebPage","name":"x"},
      {"@type":["Recipe"],"name":"Paella","image":["https://example.com/paella.jpg"],
       "recipeIngredient":["200g chorizo"],"review":[{"reviewBody":"Lovely!"}]}]}</script>
    <script>var tracking = 1</script><style>.x{}</style></head>
    <body><nav>Home · Recipes</nav><h1>Paella</h1><p>Heat the oil &amp; fry the chorizo for 5&nbsp;minutes.</p>
    <footer>© Food site</footer></body></html>`

  it('takes the structured recipe, the readable text and the picture, not the clutter', () => {
    const page = readPage(html)
    expect(page.hasRecipe).toBe(true)
    expect(page.image).toBe('https://example.com/paella.jpg')
    expect(page.text).toContain('"recipeIngredient":["200g chorizo"]')
    expect(page.text).toContain('Heat the oil & fry the chorizo for 5 minutes.')
    expect(page.text).not.toMatch(/tracking|Lovely|Home · Recipes|© Food site/)
  })

  it('says a page with too little on it is too little', async () => {
    const fetch: Fetch = async () => new Response('<html><body><p>Not found</p></body></html>')
    await expect(readSource(fetch, 'https://example.com/gone')).rejects.toEqual(
      new Refused('too_little'),
    )
  })

  it('a YouTube link is given as video', async () => {
    const fetch: Fetch = async () => Response.json({ title: 'Easy paella', author_name: 'Cook' })
    const source = await readSource(fetch, 'https://youtu.be/abc123')
    expect(source.video).toBe('https://www.youtube.com/watch?v=abc123')
    expect(source.text).toContain('Easy paella')
  })
})

describe('the prompt (ADR-0054)', () => {
  it('names the Pantry by reference, never by id, and carries my lists', () => {
    expect(pantryList(['Salt', 'Onion'])).toContain('- P1 Salt\n- P2 Onion')
    const input = importInput(
      { pantry: ['Salt'], categories: ['Dinner'], cuisines: [], proteins: [], carbs: [] },
      'THE PAGE',
    )
    expect(input).toContain('Categories:\n- Dinner')
    expect(input).toContain('Cuisines: (none yet — suggest one)')
    expect(input.endsWith('THE PAGE')).toBe(true)
  })

  it('requires every property, as v1 learned', () => {
    const recipe = RESPONSE_SCHEMA.properties.recipes.items
    expect(recipe.required.sort()).toEqual(Object.keys(recipe.properties).sort())
    const line = recipe.properties.ingredients.items
    expect(line.required.sort()).toEqual(Object.keys(line.properties).sort())
  })
})

describe('checking the answer (RCP-014 1, 8)', () => {
  it('matches lines to the Pantry, suggests new ones, and drops omitted ones', () => {
    const [recipe] = parseRecipes(
      answer([
        ingredient({ outcome: 'matched', pantryRef: 'P2', name: 'Onion', amount: '1' }),
        // A reference that isn't one: found by name.
        ingredient({ outcome: 'matched', pantryRef: 'P99', name: 'salt' }),
        // "New", but the Pantry has it.
        ingredient({ name: 'chorizo', aisle: 'chilled', amount: '200', unit: 'g' }),
        ingredient({
          name: 'Bomba Rice',
          aisle: 'cupboard',
          amount: '300',
          unit: 'g',
          group: 'For the rice',
        }),
        ingredient({ name: 'Saffron', aisle: null, amount: '1', amountUpper: '0.5', unit: 'tsp' }),
        ingredient({ outcome: 'omitted', sourceLine: 'oil, for greasing' }),
        ingredient({ name: null, sourceLine: '1 1/2 Tbsp' }),
      ]),
      PANTRY,
    )
    expect(recipe!.lines).toEqual([
      expect.objectContaining({ name: 'Onion', pantryId: 'p-onion', qty: 1, aisle: null }),
      expect.objectContaining({ name: 'Salt', pantryId: 'p-salt', qty: null }),
      expect.objectContaining({ name: 'Chorizo', pantryId: 'p-chorizo', qty: 200, unit: 'g' }),
      expect.objectContaining({
        name: 'Bomba Rice',
        pantryId: null,
        aisle: 'cupboard',
        group: 'For the rice',
      }),
      // No aisle given: Cupboard; a range's top below its bottom: dropped.
      expect.objectContaining({ name: 'Saffron', aisle: 'cupboard', qty: 1, qtyMax: null }),
    ])
    expect(recipe!.steps).toEqual(['Dice 1 onion.', 'Fry it for 5 minutes.'])
    expect(recipe).toMatchObject({
      category: 'Dinner',
      cuisine: 'Spanish',
      servings: 4,
      prepMin: 15,
    })
  })

  it('is nothing when the source isn’t a recipe', () => {
    expect(parseRecipes(JSON.stringify({ isRecipe: false, recipes: [] }), PANTRY)).toEqual([])
    expect(() => parseRecipes('not json', PANTRY)).toThrow()
  })
})

describe('asking Gemini (ADR-0054)', () => {
  it('falls back to the second model when the first is out of quota, then says so', async () => {
    const asked: string[] = []
    const fetch: Fetch = async (url) => {
      asked.push(url)
      return url.includes('lite')
        ? Response.json({ candidates: [{ content: { parts: [{ text: '{"ok":1}' }] } }] })
        : new Response('quota', { status: 429 })
    }
    const gemini = { key: 'k', models: ['flash', 'flash-lite'] }
    expect(await askGemini(fetch, gemini, {})).toBe('{"ok":1}')
    expect(asked).toHaveLength(2)
    const none: Fetch = async () => new Response('quota', { status: 429 })
    await expect(askGemini(none, gemini, {})).rejects.toEqual(new Refused('quota'))
  })
})

describe('recipe.import (RCP-014)', () => {
  const page = `<html><body><h1>Paella</h1><p>${'Fry the chorizo and onion, add the rice. '.repeat(12)}</p></body></html>`
  const deps = (over: Partial<ImportDeps> = {}): ImportDeps => ({
    fetch: async (url) =>
      url.includes('generativelanguage')
        ? Response.json({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: answer([
                        ingredient({ outcome: 'matched', pantryRef: 'P3', name: 'Chorizo' }),
                      ]),
                    },
                  ],
                },
              },
            ],
          })
        : new Response(page),
    gemini: { key: 'k', models: ['flash'] },
    vocabulary: async () => ({
      pantry: PANTRY,
      lists: { categories: [], cuisines: [], proteins: [], carbs: [] },
    }),
    take: async () => 29,
    ...over,
  })

  it('reads the page, takes a use, and answers the recipe', async () => {
    const result = await importRecipe(deps(), 'https://example.com/paella')
    expect(result).toMatchObject({ ok: true, left: 29, photo: null })
    expect(result.ok && result.recipes[0]!.lines[0]!.pantryId).toBe('p-chorizo')
  })

  it('takes no use when the page can’t be read, and none is left to take', async () => {
    let taken = 0
    const take = async () => (taken++, null)
    await expect(importRecipe(deps({ take }), 'http://localhost/x')).rejects.toEqual(
      new Refused('bad_link'),
    )
    expect(taken).toBe(0)
    await expect(importRecipe(deps({ take }), 'https://example.com/paella')).rejects.toEqual(
      new Refused('allowance'),
    )
  })
})

describe('recipe.fill_lines (RCP-007 5)', () => {
  it('sends the method, references as their names, and answers its lines', async () => {
    const sent: string[] = []
    const fetch: Fetch = async (_url, init) => {
      sent.push(String(init?.body))
      return Response.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    ingredients: [
                      ingredient({
                        outcome: 'matched',
                        pantryRef: 'P2',
                        name: 'Onion',
                        amount: '1',
                      }),
                      ingredient({ name: 'Katsu Sauce', aisle: 'cupboard' }),
                    ],
                  }),
                },
              ],
            },
          },
        ],
      })
    }
    const result = await fillLines(
      {
        fetch,
        gemini: { key: 'k', models: ['flash'] },
        vocabulary: async () => ({
          pantry: PANTRY,
          lists: { categories: [], cuisines: [], proteins: [], carbs: [] },
        }),
        take: async () => 28,
      },
      ['Fry 1 onion.', 'Pour over the @[Katsu sauce](01990000-0000-7000-8000-000000000411).'],
    )
    expect(sent[0]).toContain('1. Fry 1 onion.\\n2. Pour over the Katsu sauce.')
    expect(sent[0]).not.toContain('01990000')
    expect(result).toMatchObject({ ok: true, left: 28 })
    expect(result.ok && result.lines.map((l) => [l.name, l.pantryId])).toEqual([
      ['Onion', 'p-onion'],
      ['Katsu Sauce', null],
    ])
  })

  it('an empty method asks nothing', async () => {
    let taken = 0
    const result = await fillLines(
      {
        fetch: async () => new Response(''),
        gemini: { key: 'k', models: ['flash'] },
        vocabulary: async () => ({
          pantry: [],
          lists: { categories: [], cuisines: [], proteins: [], carbs: [] },
        }),
        take: async () => (taken++, 1),
      },
      ['  '],
    )
    expect(result).toEqual({ ok: false, reason: 'not_recipe' })
    expect(taken).toBe(0)
  })
})
