import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PageHeader, TypeScope } from '@/components/lifeos'
import { RetiredCard, WardrobeListCard, WeatherCard } from '@/app/wardrobe-settings'
import { queue, useWardrobe } from '@/data'

/**
 * Settings → Wardrobe (WRD-028): a Card per list, each empty to begin with;
 * Categories, Sizes and Collections, then Colours, Fits, Brands and Tags,
 * the weather's place, and Retired garments. Two columns on a computer.
 */
export const Route = createFileRoute('/_app/settings/wardrobe')({
  component: WardrobeSettings,
})

function WardrobeSettings() {
  const navigate = useNavigate()
  const wardrobe = useWardrobe(queue)
  return (
    <TypeScope colour="orange">
      <PageHeader
        title="Wardrobe"
        back={{ label: 'Settings', onClick: () => void navigate({ to: '/settings' }) }}
      />
      <div className="grid items-start gap-5 px-5 pb-8 sm:px-9 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-5">
          <WardrobeListCard list="category" wardrobe={wardrobe} />
          <WardrobeListCard list="size" wardrobe={wardrobe} />
          <WardrobeListCard list="collection" wardrobe={wardrobe} />
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <WardrobeListCard list="colour" wardrobe={wardrobe} />
          <WardrobeListCard list="fit" wardrobe={wardrobe} />
          <WardrobeListCard list="brand" wardrobe={wardrobe} />
          <WardrobeListCard list="tag" wardrobe={wardrobe} />
          <WeatherCard wardrobe={wardrobe} />
          <RetiredCard wardrobe={wardrobe} />
        </div>
      </div>
    </TypeScope>
  )
}
