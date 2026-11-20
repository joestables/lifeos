import { useNavigate } from '@tanstack/react-router'
import { ShirtIcon } from 'lucide-react'
import { useState } from 'react'
import {
  DayWeather,
  GarmentLine,
  ItemDialog,
  ItemRow,
  OutfitPhotos,
  OutfitPlanCard,
  SectionLabel,
  TypeTile,
} from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { queue, useForecast, usePhotoUrls, useWardrobe, type GarmentView } from '@/data'
import { dayTitle } from '@/lib/plan'
import { clothesTitle } from './day-actions'
import { garmentFace } from './garment-face'
import { outfitName } from './outfit-actions'

/** A day's clothes: its entries, what the card calls them, and their garments' small photos. */
function useDayClothes(day: string) {
  const wardrobe = useWardrobe(queue)
  const entries = wardrobe.days.get(day) ?? []
  const garments = entries.flatMap((e) => e.garments)
  const photos = usePhotoUrls(
    garments.map((g) => g.photo?.path),
    'small',
  )
  const photoOf = (g: GarmentView) => (g.photo ? photos.get(g.photo.path) : undefined)
  return {
    wardrobe,
    entries,
    title: entries.length > 0 ? clothesTitle(entries) : 'Outfit',
    photos: garments.map(photoOf),
    photoOf,
  }
}

/** The day's clothes on Week (WRD-026 1): one OutfitPlanCard, opening its popup. */
export function DayOutfitCard({
  day,
  past = false,
  wide = false,
  dragging = false,
}: {
  day: string
  past?: boolean
  wide?: boolean
  dragging?: boolean
}) {
  const clothes = useDayClothes(day)
  const [open, setOpen] = useState(false)
  return (
    <>
      <OutfitPlanCard
        title={clothes.title}
        photos={clothes.photos}
        past={past}
        wide={wide}
        dragging={dragging}
        onOpen={() => setOpen(true)}
      />
      {open && <DayOutfitsDialog day={day} onClose={() => setOpen(false)} />}
    </>
  )
}

/** The day's clothes on Today (WRD-026 1): an ItemRow, its photos at its end. */
export function DayOutfitRow({ day, past = false }: { day: string; past?: boolean }) {
  const clothes = useDayClothes(day)
  const [open, setOpen] = useState(false)
  return (
    <>
      <ItemRow
        leading={<TypeTile colour="orange" icon={ShirtIcon} />}
        title={clothes.title}
        meta={['Outfit']}
        past={past}
        trailing={<OutfitPhotos photos={clothes.photos} past={past} />}
        onOpen={() => setOpen(true)}
      />
      {open && <DayOutfitsDialog day={day} onClose={() => setOpen(false)} />}
    </>
  )
}

/**
 * The day's clothes opened (WRD-026 2): "Outfit · Wed 18 November", the
 * day's weather, each outfit's garments under its name, the single
 * garments under "Also", and Open in Wardrobe, on that week's Week tab.
 */
export function DayOutfitsDialog({ day, onClose }: { day: string; onClose: () => void }) {
  const navigate = useNavigate()
  const { wardrobe, entries, photoOf } = useDayClothes(day)
  const forecast = useForecast(wardrobe.place)
  const weather = day >= wardrobe.today ? forecast.days[day] : undefined
  const outfits = entries.filter((e) => e.outfit)
  const singles = entries.filter((e) => !e.outfit).flatMap((e) => e.garments)
  const lines = (garments: GarmentView[]) => (
    <div className="flex flex-col gap-0.5">
      {garments.map((g) => (
        <GarmentLine key={g.item.id} garment={garmentFace(g, photoOf(g))} />
      ))}
    </div>
  )
  return (
    <ItemDialog
      open
      onOpenChange={(o) => !o && onClose()}
      colour="orange"
      icon={ShirtIcon}
      typeLabel="Outfit"
      title={dayTitle(day, true)}
      footer={
        <Button
          onClick={() => {
            onClose()
            void navigate({ to: '/wardrobe', search: { tab: 'week', day } })
          }}
        >
          Open in Wardrobe
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        {weather && <DayWeather forecast={weather} />}
        {outfits.map((e) => (
          <section key={e.item.id}>
            <SectionLabel>{outfitName(e.outfit!)}</SectionLabel>
            {lines(e.garments)}
          </section>
        ))}
        {singles.length > 0 && (
          <section>
            {outfits.length > 0 && <SectionLabel>Also</SectionLabel>}
            {lines(singles)}
          </section>
        )}
      </div>
    </ItemDialog>
  )
}
