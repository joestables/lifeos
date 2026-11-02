import { formatKg } from '@lifeos/fitness'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PlusIcon, WrenchIcon } from 'lucide-react'
import { useState } from 'react'
import { CardRow, EmptyState, PageHeader, TypeScope } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EquipmentDialog } from '@/app/gym-settings'
import { queue, useGym, type EquipmentView } from '@/data'

/**
 * Settings → Gym → Equipment (GYM-001): mine, none to begin with, each with
 * the increment its weights step by.
 */
export const Route = createFileRoute('/_app/settings/equipment')({
  component: Equipment,
})

function Equipment() {
  const navigate = useNavigate()
  const gym = useGym(queue)
  const [open, setOpen] = useState<EquipmentView | 'new' | null>(null)
  const uses = (id: string) => gym.exercises.filter((x) => x.equipment?.id === id).length
  return (
    <TypeScope colour="coral">
      <PageHeader
        title="Equipment"
        back={{ label: 'Settings', onClick: () => void navigate({ to: '/settings' }) }}
      />
      <div className="flex max-w-3xl flex-col gap-4 px-5 pb-8 sm:px-9">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setOpen('new')}>
            <PlusIcon /> New equipment
          </Button>
        </div>
        {!gym.isLoading && gym.equipment.length === 0 && (
          <EmptyState icon={WrenchIcon} title="No equipment yet" />
        )}
        {gym.equipment.length > 0 && (
          <Card className="gap-0 px-2 py-1.5">
            {gym.equipment.map((e) => (
              <CardRow
                key={e.id}
                label={e.name}
                value={`${formatKg(e.incrementGrams)} kg`}
                render={<button type="button" />}
                onClick={() => setOpen(e)}
              />
            ))}
          </Card>
        )}
      </div>
      {open && (
        <EquipmentDialog
          equipment={open === 'new' ? undefined : open}
          existing={gym.equipment}
          inUse={open === 'new' ? 0 : uses(open.id)}
          onClose={() => setOpen(null)}
        />
      )}
    </TypeScope>
  )
}
