import { useNavigate } from '@tanstack/react-router'
import { DumbbellIcon } from 'lucide-react'
import {
  PanelFooter,
  PanelHeading,
  PanelRow,
  TypeTile,
  WorkoutStatePill,
} from '@/components/lifeos'
import { Card } from '@/components/ui/card'
import type { GymData } from '@/data'
import { fromIsoDay, shortDate } from '@/lib/dates'
import { counted, pillState } from '@/lib/gym'
import { workoutMeta } from './all-workouts'

const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })

export function WorkoutTile() {
  return <TypeTile colour="coral" icon={DumbbellIcon} />
}

/**
 * Today (GYM-013 1): the workout in progress, or those planned for today;
 * what to do next comes with plan step 9 (GYM-018).
 */
export function TodayCard({ gym, today, phone }: { gym: GymData; today: string; phone: boolean }) {
  const navigate = useNavigate()
  const shown = gym.workouts.filter(
    (w) => w.stage === 'in_progress' || (w.stage === 'planned' && w.item.do_on === today),
  )
  return (
    <Card className="gap-3">
      <PanelHeading title="Today">
        <span className="text-sm text-muted-foreground">{shortDate(fromIsoDay(today))}</span>
      </PanelHeading>
      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing planned</p>
      ) : (
        <div className="flex flex-col">
          {shown.map((w) => (
            <PanelRow
              key={w.item.id}
              leading={<WorkoutTile />}
              title={w.item.title}
              meta={
                w.stage === 'in_progress'
                  ? [
                      `Started ${time.format(new Date(w.startedAt!))}`,
                      ...(phone ? [] : [counted(w.setCount, 'set')]),
                    ]
                  : [
                      counted(
                        gym.templates.find((t) => t.item.id === w.templateId)?.exerciseCount ?? 0,
                        'exercise',
                      ),
                    ]
              }
              trailing={<WorkoutStatePill state={pillState(w.stage, w.item.do_on, today)} />}
              onOpen={() => void navigate({ to: '/gym/workouts/$id', params: { id: w.item.id } })}
            />
          ))}
        </div>
      )}
    </Card>
  )
}

/** Recent workouts (GYM-013 1): the last five up to today, each with its state pill, then All workouts. */
export function RecentCard({ gym, today, phone }: { gym: GymData; today: string; phone: boolean }) {
  const navigate = useNavigate()
  const recent = gym.workouts.filter((w) => (w.item.do_on ?? '') <= today).slice(0, 5)
  return (
    <Card className="gap-3">
      <PanelHeading title="Recent workouts" />
      {recent.length === 0 ? (
        <p className="text-sm text-muted-foreground">No workouts yet</p>
      ) : (
        <div className="flex flex-col">
          {recent.map((w) => (
            <PanelRow
              key={w.item.id}
              leading={<WorkoutTile />}
              title={w.item.title}
              meta={workoutMeta(w, phone)}
              trailing={<WorkoutStatePill state={pillState(w.stage, w.item.do_on, today)} />}
              onOpen={() => void navigate({ to: '/gym/workouts/$id', params: { id: w.item.id } })}
            />
          ))}
        </div>
      )}
      <PanelFooter label="All workouts" onClick={() => void navigate({ to: '/gym/workouts' })} />
    </Card>
  )
}
