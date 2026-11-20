import { useQuery } from '@tanstack/react-query'
import { useNow } from '@/hooks/use-now'

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

export const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

/** A day's sky, from its weather code (ADR-0068 6). */
export type Sky = 'sun' | 'sun-cloud' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder'

/** A day's forecast (WRD-025 1): its sky, high and low in °C, and highest chance of rain. */
export interface DayForecast {
  sky: Sky
  high: number
  low: number
  rain: number
}

/** The forecast as fetched: each day's, by its date in the place's own time. */
export interface Forecast {
  days: Record<string, DayForecast>
}

/** WMO weather codes as Open-Meteo gives them, to the few skies drawn (ADR-0068 6). */
export function skyOf(code: number): Sky {
  if (code === 0) return 'sun'
  if (code <= 2) return 'sun-cloud'
  if (code === 3) return 'cloud'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 57) return 'drizzle'
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'thunder'
  return 'cloud'
}

interface DailyAnswer {
  daily?: {
    time?: string[]
    weather_code?: (number | null)[]
    temperature_2m_max?: (number | null)[]
    temperature_2m_min?: (number | null)[]
    precipitation_probability_max?: (number | null)[]
  }
}

/** Reads Open-Meteo's daily answer; a day it can't read is left out. */
export function readForecast(body: DailyAnswer): Forecast {
  const d = body.daily
  const days: Record<string, DayForecast> = {}
  for (const [i, day] of (d?.time ?? []).entries()) {
    const code = d?.weather_code?.[i]
    const high = d?.temperature_2m_max?.[i]
    const low = d?.temperature_2m_min?.[i]
    if (code == null || high == null || low == null) continue
    days[day] = {
      sky: skyOf(code),
      high: Math.round(high),
      low: Math.round(low),
      rain: Math.round(d?.precipitation_probability_max?.[i] ?? 0),
    }
  }
  return { days }
}

/**
 * Sixteen days' forecast for a place (ADR-0068 3), in its own timezone.
 * Only the coordinates are sent.
 */
export async function fetchForecast(latitude: number, longitude: number): Promise<Forecast> {
  const url = `${FORECAST_URL}?${new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '16',
  })}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Open-Meteo answered ${res.status}`)
  return readForecast((await res.json()) as DailyAnswer)
}

const HOUR = 3600 * 1000

/**
 * The forecast to show (WRD-025; ADR-0068 4–5): fetched again when it's
 * more than an hour old, kept on the device with the rest of the cache;
 * one more than a day old isn't shown, and a failure shows none. `from`
 * says when it was fetched once it's out of date.
 */
export function useForecast(place: { latitude: number; longitude: number } | null): {
  days: Record<string, DayForecast>
  from?: number
} {
  const now = useNow()
  const query = useQuery({
    queryKey: ['weather', place?.latitude, place?.longitude],
    queryFn: () => fetchForecast(place!.latitude, place!.longitude),
    enabled: place !== null,
    staleTime: HOUR,
    gcTime: 24 * HOUR,
    retry: 1,
  })
  if (!place || !query.data) return { days: {} }
  const age = now - query.dataUpdatedAt
  if (age > 24 * HOUR) return { days: {} }
  return { days: query.data.days, ...(age > HOUR && { from: query.dataUpdatedAt }) }
}
