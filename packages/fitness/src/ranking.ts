// What to do next (GYM-018): the one template that suits me best today.

import { DAY_MS } from './engine.ts'
import { trains, WEEK_DAYS } from './targets.ts'

/** A group under 50 % ready… */
export const BLOCKING_READINESS = 50
/** …given 2 stimulus sets or more by a template keeps it from being suggested. */
export const BLOCKING_COVERAGE = 2

/** A muscle group as it stands now. */
export interface MuscleNow {
  readiness: number
  lastTrained: number | null
  /** Its desired weekly frequency; 0 for a group I don't train directly. */
  frequencyTarget: number
}

export interface TemplateCandidate {
  id: string
  name: string
  /** Its coverage: stimulus sets per group (targets.coverage). */
  coverage: ReadonlyMap<string, number>
}

export interface RankedTemplate {
  id: string
  score: number
  /** The average readiness of the groups it covers: "Readiness 96 %". */
  readiness: number
}

/**
 * How due a group is, 0.5 to 1: fully due once the days between its desired
 * workouts have passed since it was last trained, or if never; half for a
 * group with no frequency target.
 */
export function due(muscle: MuscleNow, now: number): number {
  if (muscle.frequencyTarget <= 0) return 0.5
  if (muscle.lastTrained === null) return 1
  const interval = WEEK_DAYS / muscle.frequencyTarget
  return 0.5 + 0.5 * Math.min(1, (now - muscle.lastTrained) / DAY_MS / interval)
}

/**
 * Templates, best first (GYM-018 2): each scored by the readiness of the
 * groups it trains, weighted by its coverage of each, and how due each is;
 * a template with a group under 50 % given 2 stimulus sets or more is left
 * out, and so is one that trains nothing. Ties go to the name.
 */
export function rankTemplates(
  templates: readonly TemplateCandidate[],
  muscleNow: (muscleId: string) => MuscleNow,
  now: number,
): RankedTemplate[] {
  const ranked: (RankedTemplate & { name: string })[] = []
  for (const t of templates) {
    const covered = [...t.coverage].filter(([, sets]) => trains(sets))
    if (covered.length === 0) continue
    const groups = covered.map(([id, sets]) => ({ sets, ...muscleNow(id) }))
    if (groups.some((g) => g.readiness < BLOCKING_READINESS && g.sets >= BLOCKING_COVERAGE))
      continue
    const weight = groups.reduce((sum, g) => sum + g.sets, 0)
    const score =
      groups.reduce((sum, g) => sum + g.sets * (g.readiness / 100) * due(g, now), 0) / weight
    ranked.push({
      id: t.id,
      name: t.name,
      score,
      readiness: groups.reduce((sum, g) => sum + g.readiness, 0) / groups.length,
    })
  }
  return ranked
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map(({ id, score, readiness }) => ({ id, score, readiness }))
}
