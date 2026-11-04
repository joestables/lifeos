import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { CardRow, PageHeader, TypeScope, ValueStepper } from '@/components/lifeos'
import { Card } from '@/components/ui/card'
import { queue, updateGymSettings, useGym, type GymSettingsPatch } from '@/data'

/**
 * Settings → Gym → Recovery (GYM-019 3): the recovery engine's four
 * settings (Annex A2); the fixed constants aren't offered.
 */
export const Route = createFileRoute('/_app/settings/recovery')({
  component: Recovery,
})

const ROWS: {
  key: keyof GymSettingsPatch
  label: string
  short: string
  unit?: string
  range: [number, number]
}[] = [
  {
    key: 'points_per_fatigue_set',
    label: 'Points per fatigue set',
    short: 'Points',
    range: [1, 60],
  },
  {
    key: 't_fast_h',
    label: 'Fast muscles, 50 points in',
    short: 'Fast',
    unit: 'h',
    range: [1, 240],
  },
  {
    key: 't_normal_h',
    label: 'Normal muscles, 50 points in',
    short: 'Normal',
    unit: 'h',
    range: [1, 240],
  },
  {
    key: 't_slow_h',
    label: 'Slow muscles, 50 points in',
    short: 'Slow',
    unit: 'h',
    range: [1, 240],
  },
]

function Recovery() {
  const navigate = useNavigate()
  const { settings } = useGym(queue)
  const now: Record<string, number> = {
    points_per_fatigue_set: settings.pointsPerFatigueSet,
    t_fast_h: settings.tFastH,
    t_normal_h: settings.tNormalH,
    t_slow_h: settings.tSlowH,
  }
  return (
    <TypeScope colour="coral">
      <PageHeader
        title="Recovery"
        back={{ label: 'Settings', onClick: () => void navigate({ to: '/settings' }) }}
      />
      <div className="flex max-w-3xl flex-col gap-4 px-5 pb-8 sm:px-9">
        <Card className="gap-0 px-2 py-1.5">
          {ROWS.map((r) => {
            const value = now[r.key]!
            return (
              <CardRow key={r.key} className="px-3" label={r.label} chevron={false}>
                <ValueStepper
                  size="sm"
                  label={r.short}
                  value={String(value)}
                  unit={r.unit}
                  canDown={value > r.range[0]}
                  canUp={value < r.range[1]}
                  onStep={(d) => updateGymSettings({ [r.key]: value + d })}
                />
              </CardRow>
            )
          })}
        </Card>
      </div>
    </TypeScope>
  )
}
