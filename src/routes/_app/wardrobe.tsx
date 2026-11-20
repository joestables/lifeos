import { createFileRoute, useLocation, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { PageAction, PageHeader, TabsRow, TypeScope } from '@/components/lifeos'
import { toast } from '@/components/ui/sonner'
import { GarmentDialog } from '@/app/garment-dialog'
import { GarmentPhotoStep, type TakenPhoto } from '@/app/garment-camera'
import { GarmentSheetDialog } from '@/app/garment-sheet'
import { WardrobeTab } from '@/app/wardrobe-tab'
import { queue, usePhotoUrls, useWardrobe, type DayEntry } from '@/data'
import { WardrobeWeek } from '@/app/wardrobe-week'
import { OutfitDialog, OutfitEditor } from '@/app/outfit-dialogs'
import { OutfitsTab } from '@/app/outfits-tab'
import { useOutfitsView } from '@/app/outfits-view'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useIsMobile } from '@/hooks/use-mobile'

type Tab = 'wardrobe' | 'outfits' | 'week'

interface Search {
  tab?: 'outfits' | 'week'
  /** The Week's day, when not this week. */
  day?: string
  garment?: string
  outfit?: string
  /** The day's entry a garment or outfit was opened from. */
  on?: string
}

/**
 * Wardrobe (WRD-001–WRD-025): my garments as photo cards, added with the
 * camera and a sheet, each opening read-only, and built into outfits; my
 * outfits by collection, with the Planned outfits pane; and the Week, each
 * day's outfits and garments beside its forecast.
 */
export const Route = createFileRoute('/_app/wardrobe')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    ...(s.tab === 'outfits' || s.tab === 'week' ? { tab: s.tab } : {}),
    ...(typeof s.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.day) ? { day: s.day } : {}),
    ...(typeof s.garment === 'string' ? { garment: s.garment } : {}),
    ...(typeof s.outfit === 'string' ? { outfit: s.outfit } : {}),
    ...(typeof s.on === 'string' ? { on: s.on } : {}),
  }),
  component: Wardrobe,
})

/** Adding or editing a garment: the camera, or the sheet with what's chosen kept under it. */
interface Adding {
  editing?: string
  camera: boolean
  file?: File
  photo: TakenPhoto | null
  carried?: { category: string; size: string }
  /** Asked for from the sheet: closing the camera goes back to it. */
  fromSheet: boolean
}

function Wardrobe() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()
  const location = useLocation()
  const wardrobe = useWardrobe(queue)
  const phone = useIsMobile()
  const tab: Tab = search.tab ?? 'wardrobe'
  const outfitsView = useOutfitsView()
  const [outfitEditor, setOutfitEditor] = useState<{ editing?: string } | null>(null)
  const viewing = wardrobe.lists.collection.find((c) => c.id === outfitsView.kept.collection)
  const openOutfit = search.outfit
    ? wardrobe.outfits.find((o) => o.item.id === search.outfit)
    : undefined
  // The tab and the Week's day stay as popups open and close.
  const base: Search = {
    ...(search.tab && { tab: search.tab }),
    ...(search.day && { day: search.day }),
  }
  const entryOf = (id?: string) =>
    id ? [...wardrobe.days.values()].flat().find((e) => e.item.id === id) : undefined
  const showOutfit = (id: string, entry?: DayEntry) =>
    void navigate({
      to: '.',
      search: {
        ...base,
        ...(!search.tab && { tab: 'outfits' as const }),
        outfit: id,
        ...(entry && { on: entry.item.id }),
      },
      state: { itemOpened: true },
    })
  const toTab = (next: Tab) =>
    void navigate({ to: '.', search: next === 'wardrobe' ? {} : { tab: next }, replace: true })
  const [choosing, setChoosing] = useState(false)
  const [adding, setAdding] = useState<Adding | null>(null)
  const [added, setAdded] = useState<string | null>(null)
  const [lastPhoto, setLastPhoto] = useState<string | undefined>()

  const open = search.garment
    ? wardrobe.garments.find((g) => g.item.id === search.garment)
    : undefined
  const show = (id: string, entry?: DayEntry) =>
    void navigate({
      to: '.',
      search: { ...base, garment: id, ...(entry && { on: entry.item.id }) },
      state: { itemOpened: true },
    })
  const hide = () => {
    setAdded(null)
    if (location.state.itemOpened) router.history.back()
    else void navigate({ to: '.', search: base, replace: true })
  }
  const editing = adding?.editing
    ? wardrobe.garments.find((g) => g.item.id === adding.editing)
    : undefined
  const photos = usePhotoUrls([open?.photo?.path, editing?.photo?.path])
  const outfitsOf = (id: string) =>
    wardrobe.outfits.filter((o) => o.garments.some((g) => g.item.id === id))

  const newGarment = (carried?: Adding['carried']) => {
    // Nothing to choose from yet: they are made in Settings (WRD-001 3).
    if (!wardrobe.lists.category.length || !wardrobe.lists.size.length)
      return void toast('Add categories and sizes first', {
        action: { label: 'Settings', onClick: () => void navigate({ to: '/settings/wardrobe' }) },
      })
    setAdding({ camera: phone, photo: null, fromSheet: false, ...(carried && { carried }) })
  }

  const action =
    tab === 'outfits'
      ? { label: 'New outfit', onClick: () => setOutfitEditor({}) }
      : tab === 'week'
        ? undefined
        : { label: 'New garment', onClick: () => newGarment() }

  return (
    <TypeScope colour="orange">
      <PageHeader title="Wardrobe" action={choosing || !action ? undefined : action} />
      <div className="flex flex-col gap-5 px-5 pb-28 sm:px-9 sm:pb-8">
        <TabsRow>
          <Tabs value={tab} onValueChange={(v: Tab) => toTab(v)}>
            <TabsList aria-label="View">
              <TabsTrigger value="wardrobe">Wardrobe</TabsTrigger>
              <TabsTrigger value="outfits">Outfits</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
            </TabsList>
          </Tabs>
          {action && <PageAction label={action.label} onClick={action.onClick} />}
        </TabsRow>
        {tab === 'week' ? (
          <WardrobeWeek
            wardrobe={wardrobe}
            day={search.day ?? wardrobe.today}
            onDay={(day) =>
              void navigate({
                to: '.',
                search: { tab: 'week', ...(day !== wardrobe.today && { day }) },
                replace: true,
              })
            }
            onOpenOutfit={showOutfit}
            onOpenGarment={show}
          />
        ) : tab === 'outfits' ? (
          <OutfitsTab
            wardrobe={wardrobe}
            view={outfitsView}
            onOpen={showOutfit}
            onNew={() => setOutfitEditor({})}
            onChoosing={setChoosing}
          />
        ) : (
          <WardrobeTab
            wardrobe={wardrobe}
            onOpen={show}
            onNew={() => newGarment()}
            onChoosing={setChoosing}
            onOpenOutfit={showOutfit}
          />
        )}
      </div>
      {openOutfit && !outfitEditor && (
        <OutfitDialog
          key={openOutfit.item.id}
          outfit={openOutfit}
          wardrobe={wardrobe}
          collection={viewing}
          onClose={hide}
          entry={entryOf(search.on)}
          onEdit={() => setOutfitEditor({ editing: openOutfit.item.id })}
          onOpenGarment={(id) =>
            void navigate({ to: '.', search: { ...base, garment: id }, replace: true })
          }
        />
      )}
      {outfitEditor && (
        <OutfitEditor
          wardrobe={wardrobe}
          outfit={
            outfitEditor.editing
              ? wardrobe.outfits.find((o) => o.item.id === outfitEditor.editing)
              : undefined
          }
          collection={viewing?.id}
          onClose={() => setOutfitEditor(null)}
          onOpenOutfit={(id) => {
            setOutfitEditor(null)
            showOutfit(id)
          }}
          onSaved={(id) => {
            const wasNew = !outfitEditor.editing
            setOutfitEditor(null)
            if (wasNew) showOutfit(id)
          }}
        />
      )}
      {open && !adding && (
        <GarmentDialog
          key={open.item.id}
          garment={open}
          photo={open.photo && photos.get(open.photo.path)}
          added={added === open.item.id}
          outfits={outfitsOf(open.item.id)}
          onOpenOutfit={(id) => showOutfit(id)}
          entry={entryOf(search.on)}
          onClose={hide}
          onEdit={() =>
            setAdding({ editing: open.item.id, camera: false, photo: null, fromSheet: false })
          }
          onAddAnother={() => {
            const carried = { category: open.row.category_id, size: open.row.size_id }
            hide()
            newGarment(carried)
          }}
        />
      )}
      {adding && (adding.photo !== null || !adding.camera || adding.fromSheet) && (
        <GarmentSheetDialog
          key={adding.editing ?? 'new'}
          hidden={adding.camera}
          wardrobe={wardrobe}
          garment={editing}
          photo={adding.photo}
          photoUrl={editing?.photo && photos.get(editing.photo.path)}
          carried={adding.carried}
          onRetake={() => setAdding({ ...adding, camera: true, fromSheet: true })}
          onCamera={() => setAdding({ ...adding, camera: true, fromSheet: true })}
          onFile={(file) => setAdding({ ...adding, camera: true, file, fromSheet: true })}
          onClose={() => setAdding(null)}
          onSaved={(id) => {
            if (adding.photo) setLastPhoto(adding.photo.url)
            const wasNew = !adding.editing
            setAdding(null)
            if (wasNew) setAdded(id)
            if (wasNew || search.garment !== id) show(id)
          }}
        />
      )}
      {adding?.camera && (
        <GarmentPhotoStep
          file={adding.file}
          last={lastPhoto}
          onTaken={(photo) => setAdding({ ...adding, camera: false, file: undefined, photo })}
          onSkip={() => setAdding({ ...adding, camera: false, file: undefined })}
          onClose={() =>
            adding.fromSheet
              ? setAdding({ ...adding, camera: false, file: undefined })
              : setAdding(null)
          }
        />
      )}
    </TypeScope>
  )
}
