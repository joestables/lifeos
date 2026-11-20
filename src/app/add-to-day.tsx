import { useNavigate } from '@tanstack/react-router'
import { queue, useGym, useWardrobe } from '@/data'
import { AddMealDialog } from './add-meal'
import { NewEventDialog } from './event-details'
import { NewShopDialog } from './new-shop'
import { NewReminderDialog } from './new-reminder'
import { NewTaskDialog } from './new-task'
import { NewWorkoutDialog } from './new-workout'
import { AddClothesDialog } from './wardrobe-week'

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
  if (type === 'shopping_list') return <NewShopDialog day={day} onClose={onClose} />
  if (type === 'workout') return <PlanWorkout day={day} today={today} onClose={onClose} />
  if (type === 'outfit_worn') return <PlanClothes day={day} onClose={onClose} />
  return null
}

/** Clothes for the day: Wardrobe's own "Add to Wed 18 Nov" (WRD-022 1). Only it loads the wardrobe. */
function PlanClothes({ day, onClose }: { day: string; onClose: () => void }) {
  const wardrobe = useWardrobe(queue)
  return <AddClothesDialog day={day} wardrobe={wardrobe} onClose={onClose} />
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
