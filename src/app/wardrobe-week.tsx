import { addDays } from '@lifeos/recurrence'
import { Link } from '@tanstack/react-router'
import { CloudSunIcon, PlusIcon, ShirtIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  DayColumn,
  DayGarment,
  DayGarmentRow,
  DayOutfit,
  DayWeather,
  GarmentLine,
  MealDay,
  PlaceHere,
  PlacingBar,
  PlanToolbar,
  Text,
  type Forecast,
} from '@/components/lifeos'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/components/ui/sonner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  createOutfitFromDay,
  useForecast,
  usePhotoUrls,
  type DayEntry,
  type GarmentView,
  type OutfitView,
  type WardrobeData,
} from '@/data'
import { useIsMobile } from '@/hooks/use-mobile'
import { useMealDrag } from '@/hooks/use-meal-drag'
import { fromIsoDay, shortDate } from '@/lib/dates'
import { weekOf, weekTitle } from '@/lib/plan'
import { matchesSearch } from '@/lib/wardrobe'
import { garmentFace } from './garment-face'
import { garmentCount, outfitName } from './outfit-actions'
import { PlannedPane, type Pick } from './outfits-tab'
import { dayLabel, moveEntry, place } from './day-actions'
import { SearchField } from './search-field'

const month = new Intl.DateTimeFormat('en-GB', { month: 'short' })
const clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })

/** A day's single garments made an outfit (WRD-023 1), unless they're one already. */
function createFromDay(singles: DayEntry[], wardrobe: WardrobeData, open: (id: string) => void) {
  const garments = singles.flatMap((e) => e.garments.map((g) => g.item.id))
  const same = wardrobe.sameOutfit(garments)
  if (same) {
    toast(`Already an outfit: ${outfitName(same)}`, {
      action: { label: 'Open', onClick: () => open(same.item.id) },
    })
    return
  }
  const { outfit } = createOutfitFromDay(singles.map((e) => e.item.id))
  toast('Outfit made', { action: { label: 'Open', onClick: () => open(outfit) } })
}

/** A day's "+" (WRD-022 1): an outfit or a single garment, from a search. */
function AddToDayDialog({
  day,
  wardrobe,
  onClose,
}: {
  day: string
  wardrobe: WardrobeData
  onClose: () => void
}) {
  const [showing, setShowing] = useState<'outfits' | 'garments'>('outfits')
  const [search, setSearch] = useState('')
  const words = search.trim().toLowerCase()
  const outfits = wardrobe.outfits.filter(
    (o) =>
      !words ||
      o.name.toLowerCase().includes(words) ||
      o.garments.some((g) => matchesSearch(g, search)),
  )
  const garments = wardrobe.garments.filter((g) => !g.retired && matchesSearch(g, search))
  const photos = usePhotoUrls(
    showing === 'outfits'
      ? outfits.flatMap((o) => o.garments.map((g) => g.photo?.path))
      : garments.map((g) => g.photo?.path),
    'small',
  )
  const photoOf = (g: GarmentView) => (g.photo ? photos.get(g.photo.path) : undefined)
  const choose = (pick: Pick) => {
    place(pick, day, wardrobe)
    onClose()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-colour="orange">
        <DialogHeader>
          <DialogTitle>Add to {dayLabel(day)}</DialogTitle>
        </DialogHeader>
        <Tabs value={showing} onValueChange={(v: 'outfits' | 'garments') => setShowing(v)}>
          <TabsList aria-label="Add">
            <TabsTrigger value="outfits">Outfits</TabsTrigger>
            <TabsTrigger value="garments">Garments</TabsTrigger>
          </TabsList>
        </Tabs>
        <SearchField
          label={showing === 'outfits' ? 'Search outfits' : 'Search clothes'}
          value={search}
          onChange={setSearch}
        />
        <div className="flex flex-col gap-0.5">
          {showing === 'outfits'
            ? outfits.map((o) => (
                <OutfitChoice
                  key={o.item.id}
                  outfit={o}
                  photoOf={photoOf}
                  onChoose={() => choose({ kind: 'outfit', id: o.item.id })}
                />
              ))
            : garments.map((g) => (
                <GarmentLine
                  key={g.item.id}
                  garment={garmentFace(g, photoOf(g))}
                  onOpen={() => choose({ kind: 'garment', id: g.item.id })}
                />
              ))}
          {(showing === 'outfits' ? outfits : garments).length === 0 && (
            <Text as="p" size="sm" tone="muted">
              {showing === 'outfits' ? 'No outfits' : 'No garments'}
            </Text>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** An outfit to choose: its first garment's line, named for the outfit. */
function OutfitChoice({
  outfit,
  photoOf,
  onChoose,
}: {
  outfit: OutfitView
  photoOf: (g: GarmentView) => string | undefined
  onChoose: () => void
}) {
  const first = outfit.garments[0]
  if (!first) return null
  return (
    <GarmentLine
      garment={{
        ...garmentFace(first, photoOf(first)),
        brand: outfitName(outfit),
        colour: { name: garmentCount(outfit.garments.length), hex: first.colour?.hex ?? '' },
        category: outfit.garments
          .map((g) => g.category?.name)
          .filter(Boolean)
          .join(', '),
      }}
      onOpen={onChoose}
    />
  )
}

/**
 * Wardrobe's Week (WRD-020–WRD-025): Monday to Sunday, columns on a
 * computer and days down a phone, each day's forecast at its head, then
 * its outfits, their garments joined, and its single garments; the Planned
 * outfits pane beside it, dragged from onto days (on a phone, chosen in
 * the tray and placed on a day).
 */
export function WardrobeWeek({
  wardrobe,
  day,
  onDay,
  onOpenOutfit,
  onOpenGarment,
}: {
  wardrobe: WardrobeData
  day: string
  onDay: (day: string) => void
  /** An outfit pressed, with the day's entry it was pressed on. */
  onOpenOutfit: (id: string, entry?: DayEntry) => void
  onOpenGarment: (id: string, entry?: DayEntry) => void
}) {
  const isMobile = useIsMobile()
  const today = wardrobe.today
  const week = weekOf(day)
  const forecast = useForecast(wardrobe.place)
  const [adding, setAdding] = useState<string | null>(null)
  const [picked, setPicked] = useState<Pick | undefined>()
  const entries = week.flatMap((d) => wardrobe.days.get(d) ?? [])
  const pickedOutfit =
    picked?.kind === 'outfit' ? wardrobe.outfits.find((o) => o.item.id === picked.id) : undefined
  const pickedGarment =
    picked?.kind === 'garment' ? wardrobe.garments.find((g) => g.item.id === picked.id) : undefined
  const photos = usePhotoUrls(
    [
      ...entries.flatMap((e) => e.garments.map((g) => g.photo?.path)),
      ...(pickedOutfit?.garments.map((g) => g.photo?.path) ?? []),
      pickedGarment?.photo?.path,
    ],
    'small',
  )
  const photoOf = (g: GarmentView) => (g.photo ? photos.get(g.photo.path) : undefined)
  const drag = useMealDrag((key, drop) => {
    const [kind, id] = key.split(':')
    if (!id) return
    if (kind === 'worn') {
      const entry = entries.find((e) => e.item.id === id)
      if (entry) moveEntry(entry, drop)
    } else place({ kind: kind as Pick['kind'], id }, drop, wardrobe)
  })

  // A phone opens on today (WRD-020 1).
  const days = useRef<HTMLDivElement>(null)
  const monday = week[0]
  useEffect(() => {
    if (!isMobile) return
    days.current?.querySelector(`[data-day="${today}"]`)?.scrollIntoView({ block: 'start' })
  }, [isMobile, today, monday])

  const weatherOf = (d: string): Forecast | undefined => (d >= today ? forecast.days[d] : undefined)

  const outfitTile = (e: DayEntry, layout: 'column' | 'row') => (
    <button
      key={e.item.id}
      type="button"
      aria-label={`${e.item.title || 'Outfit'}, ${dayLabel(e.day)}`}
      className="min-w-0 rounded-control text-left outline-none focus-visible:ring-3 focus-visible:ring-ring-soft"
      onClick={() => e.outfit && onOpenOutfit(e.outfit.item.id, e)}
      {...(!isMobile && drag.handle(`worn:${e.item.id}`))}
    >
      <DayOutfit
        name={e.outfit ? outfitName(e.outfit) : e.item.title || 'Outfit'}
        garments={e.garments.map((g) => garmentFace(g, photoOf(g)))}
        layout={layout}
        past={e.past}
        dragging={drag.dragging === `worn:${e.item.id}`}
      />
    </button>
  )
  const garmentTile = (e: DayEntry) =>
    e.garments.map((g) => (
      <button
        key={`${e.item.id}:${g.item.id}`}
        type="button"
        aria-label={`${g.title}, ${dayLabel(e.day)}`}
        className="min-w-0 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring-soft data-past:opacity-60"
        data-past={e.past || undefined}
        onClick={() => onOpenGarment(g.item.id, e)}
        {...(!isMobile && drag.handle(`worn:${e.item.id}`))}
      >
        <DayGarment garment={garmentFace(g, photoOf(g))} alone />
      </button>
    ))
  const createButton = (singles: DayEntry[], phone: boolean) =>
    singles.length >= 2 &&
    (phone ? (
      <Button
        variant="ghost"
        size="sm"
        className="ml-auto"
        onClick={() => createFromDay(singles, wardrobe, onOpenOutfit)}
      >
        <PlusIcon /> Create outfit
      </Button>
    ) : (
      // A narrow day: the shirt alone, named in its tooltip.
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Create outfit"
              className="self-center"
              onClick={() => createFromDay(singles, wardrobe, onOpenOutfit)}
            />
          }
        >
          <ShirtIcon />
        </TooltipTrigger>
        <TooltipContent>Create outfit</TooltipContent>
      </Tooltip>
    ))

  return (
    <div className="flex flex-col gap-4">
      <PlanToolbar
        title={weekTitle(week[0]!, isMobile)}
        day={day}
        onChooseDay={onDay}
        layout="week"
        onToday={() => onDay(today)}
        onPrevious={() => onDay(addDays(day, -7))}
        onNext={() => onDay(addDays(day, 7))}
        step="week"
      />
      {!wardrobe.isLoading && !wardrobe.place && (
        <Alert>
          <CloudSunIcon />
          <AlertTitle>No weather yet</AlertTitle>
          <AlertDescription>Set the place for each day's forecast</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" render={<Link to="/settings/wardrobe" />}>
              Set location
            </Button>
          </AlertAction>
        </Alert>
      )}
      {forecast.from && (
        <Text as="p" size="sm" tone="muted">
          Forecast from {clock.format(new Date(forecast.from))}
        </Text>
      )}
      {isMobile ? (
        <div ref={days} className="flex flex-col gap-3">
          {week.map((d) => {
            const list = wardrobe.days.get(d) ?? []
            const singles = list.filter((e) => !e.outfit)
            const date = fromIsoDay(d)
            const w = weatherOf(d)
            return (
              <div key={d} data-day={d} className="scroll-mt-4">
                <MealDay
                  name={shortDate(date).slice(0, 3)}
                  date={`${date.getDate()} ${month.format(date)}`}
                  today={d === today}
                  action={
                    <>
                      {w && <DayWeather forecast={w} />}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Add to ${dayLabel(d)}`}
                        onClick={() => setAdding(d)}
                      >
                        <PlusIcon />
                      </Button>
                    </>
                  }
                >
                  {list.filter((e) => e.outfit).map((e) => outfitTile(e, 'row'))}
                  {singles.length > 0 && (
                    <DayGarmentRow>{singles.flatMap(garmentTile)}</DayGarmentRow>
                  )}
                  {createButton(singles, true)}
                  {picked && (
                    <PlaceHere
                      day={dayLabel(d)}
                      onClick={() => {
                        place(picked, d, wardrobe)
                        setPicked(undefined)
                      }}
                    />
                  )}
                </MealDay>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex items-start gap-6">
          <div className="grid min-w-0 flex-1 grid-cols-7 gap-2.5">
            {week.map((d) => {
              const list = wardrobe.days.get(d) ?? []
              const singles = list.filter((e) => !e.outfit)
              const date = fromIsoDay(d)
              const w = weatherOf(d)
              return (
                <div key={d} data-drop={d} className="flex min-w-0">
                  <DayColumn
                    name={shortDate(date).slice(0, 3)}
                    number={date.getDate()}
                    today={d === today}
                    tall
                    dropping={drag.over === d}
                    subhead={w ? <DayWeather forecast={w} stacked /> : null}
                    add={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Add to ${dayLabel(d)}`}
                        onClick={() => setAdding(d)}
                      >
                        <PlusIcon />
                      </Button>
                    }
                  >
                    {list.filter((e) => e.outfit).map((e) => outfitTile(e, 'column'))}
                    {singles.length > 0 && (
                      <div className="flex flex-col gap-1.5 px-3">
                        {singles.flatMap(garmentTile)}
                      </div>
                    )}
                    {createButton(singles, false)}
                  </DayColumn>
                </div>
              )
            })}
          </div>
          <PlannedPane
            wardrobe={wardrobe}
            onOpen={(id) => onOpenOutfit(id)}
            week={{ drag: (key) => drag.handle(key), picked, onPick: setPicked }}
          />
        </div>
      )}
      {isMobile &&
        (picked ? (
          <PlacingBar
            photos={
              pickedOutfit
                ? pickedOutfit.garments.map(photoOf)
                : pickedGarment
                  ? [photoOf(pickedGarment)]
                  : []
            }
            what={
              pickedOutfit
                ? `${outfitName(pickedOutfit)} · ${garmentCount(pickedOutfit.garments.length)}`
                : (pickedGarment?.title ?? '')
            }
            onCancel={() => setPicked(undefined)}
          />
        ) : (
          <PlannedPane
            wardrobe={wardrobe}
            onOpen={(id) => onOpenOutfit(id)}
            week={{ drag: () => ({}), picked, onPick: setPicked }}
          />
        ))}
      {adding && (
        <AddToDayDialog day={adding} wardrobe={wardrobe} onClose={() => setAdding(null)} />
      )}
    </div>
  )
}
