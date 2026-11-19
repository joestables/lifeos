import { createFileRoute, useLocation, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { PageAction, PageHeader, TabsRow, TypeScope } from '@/components/lifeos'
import { toast } from '@/components/ui/sonner'
import { GarmentDialog } from '@/app/garment-dialog'
import { GarmentPhotoStep, type TakenPhoto } from '@/app/garment-camera'
import { GarmentSheetDialog } from '@/app/garment-sheet'
import { WardrobeTab } from '@/app/wardrobe-tab'
import { queue, useLinks, usePhotoUrls, useWardrobe } from '@/data'
import { useIsMobile } from '@/hooks/use-mobile'

/**
 * Wardrobe (WRD-001–WRD-013): my garments as photo cards, added with the
 * camera and a sheet, each opening read-only. Outfits and Week come with
 * plan steps 8 and 9.
 */
export const Route = createFileRoute('/_app/wardrobe')({
  validateSearch: (s: Record<string, unknown>): { garment?: string } =>
    typeof s.garment === 'string' ? { garment: s.garment } : {},
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
  const links = useLinks(queue)
  const phone = useIsMobile()
  const [choosing, setChoosing] = useState(false)
  const [adding, setAdding] = useState<Adding | null>(null)
  const [added, setAdded] = useState<string | null>(null)
  const [lastPhoto, setLastPhoto] = useState<string | undefined>()

  const open = search.garment
    ? wardrobe.garments.find((g) => g.item.id === search.garment)
    : undefined
  const show = (id: string) =>
    void navigate({ to: '.', search: { garment: id }, state: { itemOpened: true } })
  const hide = () => {
    setAdded(null)
    if (location.state.itemOpened) router.history.back()
    else void navigate({ to: '.', search: {}, replace: true })
  }
  const editing = adding?.editing
    ? wardrobe.garments.find((g) => g.item.id === adding.editing)
    : undefined
  const photos = usePhotoUrls([open?.photo?.path, editing?.photo?.path])
  const outfitsOf = (id: string) =>
    new Set(
      links.filter((l) => l.link_type === 'includes' && l.to_item === id).map((l) => l.from_item),
    ).size

  const newGarment = (carried?: Adding['carried']) => {
    // Nothing to choose from yet: they are made in Settings (WRD-001 3).
    if (!wardrobe.lists.category.length || !wardrobe.lists.size.length)
      return void toast('Add categories and sizes first', {
        action: { label: 'Settings', onClick: () => void navigate({ to: '/settings/wardrobe' }) },
      })
    setAdding({ camera: phone, photo: null, fromSheet: false, ...(carried && { carried }) })
  }

  return (
    <TypeScope colour="orange">
      <PageHeader
        title="Wardrobe"
        action={choosing ? undefined : { label: 'New garment', onClick: () => newGarment() }}
      />
      <div className="flex flex-col gap-5 px-5 pb-28 sm:px-9 sm:pb-8">
        <TabsRow className="max-md:hidden">
          <PageAction label="New garment" onClick={() => newGarment()} />
        </TabsRow>
        <WardrobeTab
          wardrobe={wardrobe}
          onOpen={show}
          onNew={() => newGarment()}
          onChoosing={setChoosing}
        />
      </div>
      {open && !adding && (
        <GarmentDialog
          key={open.item.id}
          garment={open}
          photo={open.photo && photos.get(open.photo.path)}
          added={added === open.item.id}
          outfits={outfitsOf(open.item.id)}
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
