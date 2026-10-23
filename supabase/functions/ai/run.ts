/**
 * The AI service's work (ADR-0054), apart from Deno so it can be tested:
 * reading a link, asking Gemini, and checking what comes back.
 */
import type {
  AiRefusal,
  FillAnswer,
  ImportAnswer,
  ImportedRecipe,
} from '../../../packages/food/src/imported.ts'
import {
  fillInput,
  importInput,
  PROMPT_VERSION,
  SYSTEM_INSTRUCTION,
  type Vocabulary,
} from './rules.ts'
import {
  LINES_SCHEMA,
  parseLines,
  parseRecipes,
  RESPONSE_SCHEMA,
  ValidationError,
  type PantryEntry,
} from './schema.ts'

export type Fetch = (input: string, init?: RequestInit) => Promise<Response>

/** A refusal said back to the app, rather than a failure. */
export class Refused extends Error {
  readonly reason: AiRefusal
  constructor(reason: AiRefusal) {
    super(reason)
    this.reason = reason
  }
}

// ---------------------------------------------------------------------------
// Links

export type LinkKind = 'youtube' | 'tiktok' | 'instagram' | 'page'

/** A public web address, never one inside a network or this machine. */
export function publicUrl(link: string): URL | null {
  let url: URL
  try {
    url = new URL(link.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const host = url.hostname.toLowerCase()
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    !host.includes('.') ||
    /^\[/.test(host) ||
    /^(0|10|127|169\.254|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(host)
  ) {
    return null
  }
  return url
}

export function linkKind(url: URL): LinkKind {
  const host = url.hostname.replace(/^(www|m)\./, '')
  if (host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com'))
    return 'youtube'
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return 'tiktok'
  if (host === 'instagram.com') return 'instagram'
  return 'page'
}

/** A YouTube link's video id, from watch, youtu.be, shorts or embed links. */
export function youtubeId(url: URL): string | null {
  if (url.hostname.endsWith('youtu.be')) return url.pathname.slice(1).split('/')[0] || null
  return (
    url.searchParams.get('v') ?? /^\/(shorts|embed|live)\/([\w-]+)/.exec(url.pathname)?.[2] ?? null
  )
}

// ---------------------------------------------------------------------------
// Pages

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
  deg: '°',
  ndash: '–',
  mdash: '—',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  hellip: '…',
}

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const n = code[1]?.toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1))
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : whole
    }
    return ENTITIES[code.toLowerCase()] ?? whole
  })
}

function meta(html: string, name: string): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = /\b(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]
    if (key?.toLowerCase() !== name) continue
    const content = /\bcontent\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1]
    if (content) return decodeEntities(content).trim()
  }
  return null
}

function isRecipeNode(node: unknown): node is Record<string, unknown> {
  if (!node || typeof node !== 'object') return false
  const type = (node as Record<string, unknown>)['@type']
  return type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))
}

/** Every schema.org Recipe in a page's JSON-LD, however it is nested. */
export function jsonLdRecipes(html: string): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = []
  const visit = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(visit)
    else if (isRecipeNode(node)) found.push(node)
    else if (node && typeof node === 'object') {
      const graph = (node as Record<string, unknown>)['@graph']
      if (graph) visit(graph)
    }
  }
  const scripts = html.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )
  for (const [, body] of scripts) {
    try {
      visit(JSON.parse(body!.trim()))
    } catch {
      // A broken block is skipped; the page's text still goes.
    }
  }
  // Reviews and ratings are long and say nothing about cooking.
  return found.map(
    ({ review, aggregateRating, ...rest }) => (void review, void aggregateRating, rest),
  )
}

function imageOf(recipe: Record<string, unknown> | undefined): string | null {
  const image = recipe?.image
  const first = Array.isArray(image) ? image[0] : image
  if (typeof first === 'string') return first
  if (first && typeof first === 'object' && typeof (first as { url?: unknown }).url === 'string')
    return (first as { url: string }).url
  return null
}

/** A page's readable text: no scripts, styles, menus or footers; blocks on lines of their own. */
export function readableText(html: string): string {
  const text = html
    .replace(
      /<(script|style|noscript|svg|template|iframe|head|nav|footer|form)\b[\s\S]*?<\/\1>/gi,
      ' ',
    )
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr|\/section|\/article|li|h\d)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
  return decodeEntities(text)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

/** What a page says about a recipe, for the model, and its picture. */
export function readPage(html: string): { text: string; image: string | null; hasRecipe: boolean } {
  const recipes = jsonLdRecipes(html)
  const title = meta(html, 'og:title') ?? /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim()
  const parts = [
    title ? `Title: ${decodeEntities(title)}` : '',
    recipes.length > 0
      ? `Structured recipe data:\n${JSON.stringify(recipes).slice(0, 20_000)}`
      : '',
    // With structured data the text only adds notes and tips: less of it,
    // so the model answers sooner.
    `The page's text:\n${readableText(html).slice(0, recipes.length > 0 ? 12_000 : 30_000)}`,
  ]
  return {
    text: parts.filter(Boolean).join('\n\n'),
    image: imageOf(recipes[0]) ?? meta(html, 'og:image'),
    hasRecipe: recipes.length > 0,
  }
}

const BROWSER = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  'Accept-Language': 'en-GB,en;q=0.9',
}

async function fetchText(fetch: Fetch, url: string, accept = 'text/html'): Promise<string> {
  const res = await fetch(url, {
    headers: { ...BROWSER, Accept: accept },
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Refused('unreachable')
  return (await res.text()).slice(0, 3_000_000)
}

/** What the model is given to read: text, and for YouTube the video itself. */
export interface Source {
  text: string
  video: string | null
  image: string | null
}

/** Reads a link (ADR-0054): a page, a YouTube video, or a TikTok or Instagram post. */
export async function readSource(fetch: Fetch, link: string): Promise<Source> {
  const url = publicUrl(link)
  if (!url) throw new Refused('bad_link')
  const kind = linkKind(url)

  if (kind === 'youtube') {
    const id = youtubeId(url)
    if (!id) throw new Refused('bad_link')
    const watch = `https://www.youtube.com/watch?v=${id}`
    const embed = await fetchText(
      fetch,
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watch)}`,
      'application/json',
    )
      .then((t) => JSON.parse(t) as { title?: string; author_name?: string })
      .catch(() => ({}) as { title?: string; author_name?: string })
    return {
      text: `A YouTube video${embed.title ? `: "${embed.title}"` : ''}${embed.author_name ? ` by ${embed.author_name}` : ''}. Watch it, and listen to it, for the recipe.`,
      video: watch,
      image: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    }
  }

  if (kind === 'tiktok') {
    const embed = (await fetchText(
      fetch,
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url.href)}`,
      'application/json',
    )
      .then((t) => JSON.parse(t))
      .catch(() => ({}))) as { title?: string; author_name?: string; thumbnail_url?: string }
    const text = (embed.title ?? '').trim()
    if (text.length < 80) throw new Refused('too_little')
    return {
      text: `A TikTok video's caption${embed.author_name ? ` by ${embed.author_name}` : ''}:\n${text}`,
      video: null,
      image: embed.thumbnail_url ?? null,
    }
  }

  const html = await fetchText(fetch, url.href).catch((e) => {
    throw e instanceof Refused ? e : new Refused('unreachable')
  })
  if (kind === 'instagram') {
    const text = meta(html, 'og:description') ?? meta(html, 'description') ?? ''
    if (text.length < 80) throw new Refused('too_little')
    return {
      text: `An Instagram post's caption:\n${text}`,
      video: null,
      image: meta(html, 'og:image'),
    }
  }
  const page = readPage(html)
  if (!page.hasRecipe && page.text.length < 300) throw new Refused('too_little')
  return { text: page.text, video: null, image: page.image }
}

/** A picture as a data URL, for the device to make small, or nothing. */
export async function pictureOf(
  fetch: Fetch,
  link: string | null,
  base: string,
): Promise<string | null> {
  if (!link) return null
  try {
    const url = publicUrl(new URL(link, base).href)
    if (!url) return null
    const res = await fetch(url.href, { headers: BROWSER, signal: AbortSignal.timeout(10_000) })
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok || !type.startsWith('image/')) return null
    const bytes = new Uint8Array(await res.arrayBuffer())
    if (bytes.length > 4_000_000) return null
    let binary = ''
    for (let i = 0; i < bytes.length; i += 0x8000)
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    return `data:${type.split(';')[0]};base64,${btoa(binary)}`
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Gemini

export interface Gemini {
  key: string
  /** The free Flash model, then its fallback when the first is out of quota. */
  models: readonly string[]
}

/** The request for one task: the system instruction, the input, the video, JSON to the schema. */
export function geminiBody(input: string, video: string | null, schema: unknown) {
  return {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [
      {
        role: 'user',
        parts: [...(video ? [{ fileData: { fileUri: video } }] : []), { text: input }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseJsonSchema: schema,
      temperature: 0.2,
    },
  }
}

/**
 * How little to think, in each model family's words: Gemini 3's level, then
 * 2.5's budget, then the model's own default. A model refusing one (400,
 * naming thinking) is asked with the next. Thinking is most of the wait.
 */
const THINKING: readonly (Record<string, unknown> | null)[] = [
  { thinkingLevel: 'low' },
  { thinkingBudget: 0 },
  null,
]

/** The longest one answer may take: the function must reply before its own limit. */
export const GEMINI_TIMEOUT = 100_000

/**
 * Asks each model in turn until one answers: out of quota (429) or busy
 * (503), the next is tried; all out of quota is `quota`, too slow is `slow`.
 */
export async function askGemini(
  fetch: Fetch,
  gemini: Gemini,
  body: { generationConfig: Record<string, unknown> },
  timeout = GEMINI_TIMEOUT,
): Promise<string> {
  const until = Date.now() + timeout
  let lastStatus = 0
  for (const model of gemini.models) {
    for (const thinking of THINKING) {
      const started = Date.now()
      const generationConfig = thinking
        ? { ...body.generationConfig, thinkingConfig: thinking }
        : body.generationConfig
      let res: Response
      try {
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': gemini.key },
            body: JSON.stringify({ ...body, generationConfig }),
            signal: AbortSignal.timeout(Math.max(1, until - Date.now())),
          },
        )
      } catch (e) {
        if (e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError'))
          throw new Refused('slow')
        throw e
      }
      console.log(
        'ai: gemini',
        model,
        JSON.stringify(thinking),
        res.status,
        Date.now() - started,
        'ms',
      )
      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[]
        }
        const text =
          data.candidates?.[0]?.content?.parts
            ?.filter((p) => !p.thought)
            .map((p) => p.text ?? '')
            .join('') ?? ''
        if (!text) throw new ValidationError('The AI gave no answer')
        return text
      }
      lastStatus = res.status
      const said = await res.text()
      if (res.status === 400 && /think/i.test(said)) continue
      if (res.status === 429 || res.status === 503 || res.status === 404) break
      throw new Error(`Gemini ${model}: ${res.status} ${said.slice(0, 300)}`)
    }
  }
  if (lastStatus === 429) throw new Refused('quota')
  throw new Error(`Gemini: ${lastStatus}`)
}

// ---------------------------------------------------------------------------
// Tasks

export interface ImportDeps {
  fetch: Fetch
  gemini: Gemini
  /** The Pantry's ingredients and my lists, read as me. */
  vocabulary: () => Promise<{ pantry: PantryEntry[]; lists: Omit<Vocabulary, 'pantry'> }>
  /** Takes one of today's uses: what's left after, or null when none was. */
  take: (task: string, details: Record<string, unknown>) => Promise<number | null>
}

/** `recipe.import` (RCP-014): a link read, written up in Joe's style, checked. */
export async function importRecipe(deps: ImportDeps, link: string): Promise<ImportAnswer> {
  const source = await readSource(deps.fetch, link)
  const { pantry, lists } = await deps.vocabulary()
  const left = await deps.take('recipe.import', { prompt: PROMPT_VERSION })
  if (left === null) throw new Refused('allowance')
  const input = importInput({ ...lists, pantry: pantry.map((p) => p.name) }, source.text)
  const [text, photo] = await Promise.all([
    askGemini(deps.fetch, deps.gemini, geminiBody(input, source.video, RESPONSE_SCHEMA)),
    pictureOf(deps.fetch, source.image, link),
  ])
  const recipes: ImportedRecipe[] = parseRecipes(text, pantry)
  if (recipes.length === 0) return { ok: false, reason: 'not_recipe' }
  return { ok: true, recipes, photo, left }
}

/**
 * `recipe.fill_lines` (RCP-007 5): the ingredients a method uses. The
 * method is sent, and only when I ask (ADR-0054, Joe, 23 October); "@"
 * references go as the names they show.
 */
export async function fillLines(deps: ImportDeps, steps: unknown): Promise<FillAnswer> {
  const method = (Array.isArray(steps) ? steps : [])
    .filter((s): s is string => typeof s === 'string')
    .map((s) => s.replace(/@\[([^\]]+)\]\([^)]*\)/g, '$1').trim())
    .filter(Boolean)
    .slice(0, 100)
  if (method.length === 0) return { ok: false, reason: 'not_recipe' }
  const { pantry } = await deps.vocabulary()
  const left = await deps.take('recipe.fill_lines', { prompt: PROMPT_VERSION })
  if (left === null) throw new Refused('allowance')
  const text = await askGemini(
    deps.fetch,
    deps.gemini,
    geminiBody(
      fillInput(
        pantry.map((p) => p.name),
        method,
      ),
      null,
      LINES_SCHEMA,
    ),
  )
  return { ok: true, lines: parseLines(text, pantry), left }
}
