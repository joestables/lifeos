import { HOUR_MS, readinessAt } from '@lifeos/fitness'
import { useState } from 'react'
import {
  BodyMap,
  LookAhead,
  OverallReadiness,
  PanelHeading,
  PanelRow,
  ReadinessRing,
  SortMenu,
  StatTile,
} from '@/components/lifeos'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CATEGORIES } from '@/data'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  aheadText,
  MUSCLE_SORTS,
  MUSCLE_SORTS_SHORT,
  recoveredText,
  sortMuscles,
  trainedWhen,
  type MuscleSort,
} from '@/lib/gym'
import type { SortDirection } from '@/lib/sort'
import { percent, recoveredBy, type MuscleRecovery, type Recovery } from './recovery'
import { useMuscleSort } from './gym-library'

const RECOVERS: Record<string, string> = {
  fast: 'recovers fast',
  normal: 'recovers normally',
  slow: 'recovers slowly',
}

/**
 * The Recovery tab (GYM-016): overall readiness, the body map and the
 * look-ahead slider under it; every muscle group beside it (under it on a phone), each
 * opening its readiness and its week against its targets.
 */
export function RecoveryTab({ recovery }: { recovery: Recovery }) {
  const [hours, setHours] = useState(0)
  const [open, setOpen] = useState<string | null>(null)
  const { sort, direction, change } = useMuscleSort()
  const phone = useIsMobile()
  const at = recovery.now + hours * HOUR_MS
  const rows = recovery.muscles.map((m) => ({
    ...m,
    name: m.muscle.name,
    readiness: percent(readinessAt(m.state, at)),
  }))
  const builtIn = Object.fromEntries(
    rows.filter((r) => r.muscle.builtIn).map((r) => [r.name, r.readiness]),
  )
  const sorted = sortMuscles(rows, sort, direction)
  const chosen = rows.find((r) => r.muscle.id === open)
  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <Card className="gap-5">
        <OverallReadiness percent={percent(recovery.overallAt(at))} when={aheadText(hours, at)} />
        <BodyMap
          readiness={builtIn}
          selected={chosen?.muscle.builtIn ? chosen.name : undefined}
          onSelect={(name) =>
            setOpen(rows.find((r) => r.muscle.builtIn && r.name === name)?.muscle.id ?? null)
          }
          className="mx-auto w-full max-w-md"
        />
        {/* Under the map (Joe, 3 November). */}
        <LookAhead hours={hours} onChange={setHours} />
      </Card>
      <Card className="gap-3">
        <PanelHeading title="Muscle groups" count={rows.length}>
          <SortMenu<MuscleSort>
            options={phone ? MUSCLE_SORTS_SHORT : MUSCLE_SORTS}
            value={sort}
            direction={direction}
            onChange={(s, d: SortDirection) => change(s, d)}
          />
        </PanelHeading>
        <div className="flex flex-col">
          {sorted.map((r) => (
            <PanelRow
              key={r.muscle.id}
              selected={open === r.muscle.id}
              leading={<ReadinessRing percent={r.readiness} />}
              title={r.name}
              meta={[
                r.lastTrained === null
                  ? 'Never trained'
                  : `Trained ${trainedWhen(r.lastTrained, recovery.now)}`,
                `×${r.frequency.toFixed(1)} a week`,
              ]}
              chevron={false}
              onOpen={() => setOpen(r.muscle.id)}
            />
          ))}
        </div>
      </Card>
      {chosen && (
        <MuscleDialog
          muscle={chosen}
          readiness={chosen.readiness}
          at={at}
          now={recovery.now}
          weeks={recovery.frequencyWeeks}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}

/**
 * A muscle group chosen (GYM-016 5): its readiness and when it will be fully
 * recovered, when it was last trained, its average frequency over 28 days,
 * or the weeks since my first workout (Joe, 2 and 3 November) and its stimulus sets this week against its target.
 */
function MuscleDialog({
  muscle: m,
  readiness,
  at,
  now,
  weeks,
  onClose,
}: {
  muscle: MuscleRecovery
  readiness: number
  at: number
  now: number
  /** The weeks its frequency is averaged over: "28 days", or fewer at first. */
  weeks: number
  onClose: () => void
}) {
  const until = recoveredBy(m, at)
  const category = CATEGORIES.find((c) => c.key === m.muscle.category)?.label
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-colour="coral" className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{m.muscle.name}</DialogTitle>
          <span className="text-sm text-muted-foreground">
            {category} · {RECOVERS[m.muscle.recoveryType]}
          </span>
        </DialogHeader>
        <div className="flex items-center gap-4">
          <ReadinessRing percent={readiness} size={64} />
          <div className="flex flex-col">
            <span className="text-h2 tabular-nums">{readiness} % ready</span>
            <span className="text-sm text-muted-foreground">
              {until === null ? 'Fully recovered' : `Fully recovered ${recoveredText(until)}`}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatTile
            inset
            label="Last trained"
            value={m.lastTrained === null ? 'Never' : capital(trainedWhen(m.lastTrained, now))}
          />
          <StatTile
            inset
            label="Frequency"
            value={`×${m.frequency.toFixed(1)}`}
            sub={`a week, ${weeks * 7} days`}
          />
          <StatTile
            inset
            label="Stimulus"
            value={`${m.week.stimulus.toFixed(1)} / ${m.muscle.stimulusTarget}`}
            sub="this week"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
