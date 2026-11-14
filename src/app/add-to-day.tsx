import { useNavigate } from '@tanstack/react-router'
import { queue, useGym } from '@/data'
import { AddMealDialog } from './add-meal'
import { NewEventDialog } from './event-details'
import { NewListDialog } from './new-list'
import { NewReminderDialog } from './new-reminder'
import { NewTaskDialog } from './new-task'
import { NewWorkoutDialog } from './new-workout'

/** What a day's "+" opens for the Type chosen: a new one on that day. */
export function AddToDayDialog({
  type,
  day,
  today,
  onClose,
}: {
  type: string
  day: string
  today: string
  onClose: () => void
}) {
  if (type === 'task') return <NewTaskDialog doOn={day} onClose={onClose} />
  if (type === 'reminder') return <NewReminderDialog day={day} onClose={onClose} />
  if (type === 'event') return <NewEventDialog day={day} onClose={onClose} />
  if (type === 'meal') return <AddMealDialog day={day} onClose={onClose} />
  if (type === 'shopping_list') return <NewListDialog kind="food" day={day} onClose={onClose} />
  if (type === 'workout') return <PlanWorkout day={day} today={today} onClose={onClose} />
  return null
}

/** A workout for the day: New workout, then its page (GYM-007). Only it loads the gym. */
function PlanWorkout({ day, today, onClose }: { day: string; today: string; onClose: () => void }) {
  const navigate = useNavigate()
  const gym = useGym(queue)
  return (
    <NewWorkoutDialog
      gym={gym}
      today={today}
      day={day}
      onClose={onClose}
      onMade={(id) => void navigate({ to: '/gym/workouts/$id', params: { id } })}
    />
  )
}
