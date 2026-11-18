# ADR-0068: Weather

**Status:** Provisionally agreed · 2026-11-18 (Joe)

## Context

Wardrobe's Week tab shows each day's forecast (Joe, 18 November;
[WRD-025](../../10-requirements/modules/wardrobe.md#wrd-025--the-weather)),
for one place set in Settings → Wardrobe. Weather was a later opportunity;
it comes in with Stage 6, for the Week tab and the day's card on Today and
Week. It is unlike the other Integrations
([integrations](../../10-requirements/cross-cutting/integrations.md#the-pattern)):
nothing to sign in to, nothing that becomes Items, nothing to keep.

## Decision

1. **Open-Meteo** gives the forecast and finds the place: its forecast API
   (`api.open-meteo.com`) and its geocoding API
   (`geocoding-api.open-meteo.com`). Free for personal, non-commercial use,
   with no key and no account; 16 days ahead.
2. **Called from the device**, not through an Edge Function: there is no
   secret to keep, and only the place's coordinates are sent, never who is
   asking.
3. **What is asked for:** each day's weather code, highest and lowest
   temperature (°C) and highest chance of rain, for 16 days, in the
   place's own timezone.
4. **The place is stored**, each person's: `wardrobe.settings(person,
   place_name, latitude, longitude)`
   ([ADR-0066](0066-wardrobe-in-the-database.md)). The forecast isn't:
   the device keeps the last one fetched with when it was fetched, fetches
   again when the Week tab or a day's card opens and it is more than an
   hour old, and shows nothing from one more than a day old (WRD-025 3).
5. **Failing quietly:** if Open-Meteo can't be reached or answers
   wrongly, the days show without weather and nothing else changes
   (WRD-025 5). Weather isn't in the nightly health check and never shows
   on Today as a broken Integration.
6. **The weather codes map to a few icons** (sun, sun and cloud, cloud,
   fog, drizzle, rain, snow, thunder), each a Lucide icon in the design
   spec, with the code's words as its label.

## Consequences

- [Integrations](../../10-requirements/cross-cutting/integrations.md) lists
  Weather as Stage 6, noting it doesn't follow the pattern.
- The walks use a stand-in for Open-Meteo, never the real service.
- Outfit suggestions from the weather aren't wanted (Joe, 18 November); run
  planning from it is still a later opportunity
  ([roadmap](../../roadmap.md#later-opportunities)).
