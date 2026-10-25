/** What another app shares (the manifest's share_target: title, text, url). */
export interface Shared {
  title?: string | null
  text?: string | null
  url?: string | null
}

const URL_IN = /https?:\/\/[^\s<>"']+/i

/**
 * The link in a share (RCP-003 1): its url, else the first link in its text
 * or title, as TikTok and Instagram put it there. Nothing when there's none.
 */
export function sharedLink(shared: Shared): string | null {
  for (const part of [shared.url, shared.text, shared.title]) {
    const found = part ? URL_IN.exec(part)?.[0] : undefined
    if (found) return cleanLink(found.replace(/[.,!?)]+$/, ''))
  }
  return null
}

/**
 * A link as kept, so the same post shared twice is found again (RCP-003 2):
 * no fragment, no tracking (`utm_…`), no query at all on TikTok and
 * Instagram, whose shares add their own; no trailing slash.
 */
export function cleanLink(link: string): string {
  let url: URL
  try {
    url = new URL(link.trim())
  } catch {
    return link.trim()
  }
  url.hash = ''
  if (/(^|\.)(tiktok|instagram)\.com$/i.test(url.hostname)) url.search = ''
  for (const key of [...url.searchParams.keys()])
    if (/^utm_|^fbclid$|^igsh$/i.test(key)) url.searchParams.delete(key)
  return url.href.replace(/\/(?=$|\?)/, '')
}

/**
 * A name from what was shared, until the link's own arrives: the title, else
 * the text without its link, hashtags and mentions; first line only.
 */
export function sharedName(shared: Shared, link: string | null): string | null {
  for (const part of [shared.title, shared.text]) {
    const name = (part ?? '')
      .replace(URL_IN, '')
      .split('\n')
      .map((l) => l.replace(/[#@][\p{L}\p{N}_.]+/gu, '').trim())
      .find(Boolean)
    if (name && (!link || !link.includes(name))) return name.slice(0, 80).trim()
  }
  return null
}

/** The site a link is from, as the saved screen says it: "tiktok.com". */
export function siteOf(link: string): string {
  try {
    return new URL(link).hostname.replace(/^(www|m|vm|vt)\./, '')
  } catch {
    return link
  }
}

/** The Recipe or Idea a link is already a source of (RCP-003 2), if any. */
export function savedWith<
  R extends { item: { id: string }; variations: { fields: { sources: readonly string[] } }[] },
>(link: string, recipes: readonly R[]): R | undefined {
  const key = cleanLink(link)
  return recipes.find((r) =>
    r.variations.some((v) => v.fields.sources.some((s) => cleanLink(s) === key)),
  )
}

/** A name no Recipe of mine has: "Pancakes", else "Pancakes 2", and so on (RCP-002 2). */
export function freeName(name: string, taken: (name: string) => boolean): string {
  if (!taken(name)) return name
  for (let n = 2; ; n++) if (!taken(`${name} ${n}`)) return `${name} ${n}`
}
