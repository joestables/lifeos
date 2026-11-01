import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { CardRow, PageHeader, TypeScope } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { MuscleGroupDialog } from '@/app/gym-settings'
import { muscleSummary } from '@/lib/gym'
import { CATEGORIES, queue, useGym, type MuscleView } from '@/data'

/**
 * Settings → Gym → Muscle groups (GYM-002, GYM-017): the twenty built in
 * and mine, by category, each with how it recovers and its weekly targets.
 */
export const Route = createFileRoute('/_app/settings/muscle-groups')({
  component: MuscleGroups,
})

function MuscleGroups() {
  const navigate = useNavigate()
  const gym = useGym(queue)
  const [open, setOpen] = useState<MuscleView | 'new' | null>(null)
  return (
    <TypeScope colour="coral">
      <PageHeader
        title="Muscle groups"
        back={{ label: 'Settings', onClick: () => void navigate({ to: '/settings' }) }}
      />
      <div className="flex max-w-3xl flex-col gap-4 px-5 pb-8 sm:px-9">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setOpen('new')}>
            <PlusIcon /> New muscle group
          </Button>
        </div>
        {CATEGORIES.map((c) => {
          const muscles = gym.muscles.filter((m) => m.category === c.key)
          if (!muscles.length) return null
          return (
            <Card key={c.key} className="gap-0 px-2 py-1.5">
              <div className="px-3 pt-2 pb-1">
                <CardTitle>{c.label}</CardTitle>
              </div>
              {muscles.map((m) => (
                <CardRow
                  key={m.id}
                  label={m.name}
                  value={muscleSummary(m)}
                  render={<button type="button" />}
                  onClick={() => setOpen(m)}
                />
              ))}
            </Card>
          )
        })}
      </div>
      {open && (
        <MuscleGroupDialog
          muscle={open === 'new' ? undefined : open}
          muscles={gym.muscles}
          inUse={open !== 'new' && gym.musclesInUse.has(open.id)}
          onClose={() => setOpen(null)}
        />
      )}
    </TypeScope>
  )
}
