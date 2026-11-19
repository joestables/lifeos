/**
 * The weather (ADR-0068): Open-Meteo, called from the device with no key;
 * only a place's name or its coordinates are sent, never who is asking.
 */
export const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'

/** A place found by name (WRD-028 6): its name, where it is, and its region and country. */
export interface PlaceFound {
  id: string
  name: string
  /** "England, United Kingdom". */
  region: string
  latitude: number
  longitude: number
}

interface GeocodingResult {
  id: number
  name: string
  latitude: number
  longitude: number
  admin1?: string
  country?: string
}

/**
 * Places called `name`, the likeliest first, at most eight. Failing quietly
 * (ADR-0068 5): no signal, or an answer it can't read, finds none.
 */
export async function searchPlaces(name: string, signal?: AbortSignal): Promise<PlaceFound[]> {
  const q = name.trim()
  if (q.length < 2) return []
  const url = `${GEOCODING_URL}?${new URLSearchParams({ name: q, count: '8', language: 'en', format: 'json' })}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Open-Meteo answered ${res.status}`)
  const body = (await res.json()) as { results?: GeocodingResult[] }
  return (body.results ?? [])
    .filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number' && r.name)
    .map((r) => ({
      id: String(r.id),
      name: r.name,
      region: [r.admin1, r.country].filter((x) => x && x !== r.name).join(', '),
      latitude: Math.round(r.latitude * 1e5) / 1e5,
      longitude: Math.round(r.longitude * 1e5) / 1e5,
    }))
}

/** How a place is stored (`wardrobe.settings.place_name`): its name, then its region. */
export const placeLabel = (p: Pick<PlaceFound, 'name' | 'region'>) =>
  p.region ? `${p.name}, ${p.region}` : p.name

/** A stored place's name and region, shown on two lines. */
export function splitPlace(stored: string): { name: string; region: string } {
  const at = stored.indexOf(', ')
  return at < 0
    ? { name: stored, region: '' }
    : { name: stored.slice(0, at), region: stored.slice(at + 2) }
}
