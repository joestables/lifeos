import {
  ClockIcon,
  CopyIcon,
  HeartIcon,
  LinkIcon,
  PencilIcon,
  UsersIcon,
  UtensilsIcon,
} from 'lucide-react'
import { useId, useState } from 'react'
import {
  IngredientList,
  LogEntry,
  MethodSteps,
  RecipeColumns,
  RecipeFact,
  RecipeHeadingLayout,
  RecipePanel,
  RecipePhoto,
  RecipeText,
  StarRating,
} from '@/components/lifeos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Toggle } from '@/components/ui/toggle'
import {
  addVariation,
  archiveItem,
  restoreItem,
  setMark,
  updateItem,
  updateRecipe,
  noteChange,
  queue,
  useFoodSpaces,
  usePhotoUrls,
  useRecipeActivity,
  type Cook,
  type FoodData,
} from '@/data'
import type { RecipeView, VariationView } from '@/data/food-hooks'
import { toast } from '@/components/ui/sonner'
import { capturedWhen } from '@/lib/dates'
import { filterLog, recipeLog, type LogItem } from '@/lib/recipe-log'
import {
  STATE_NAMES,
  cookedLine,
  ingredientGroups,
  methodSteps,
  textParts,
  timesLine,
} from '@/lib/recipe-parts'
import { sourceHost } from '@/lib/recipes'
import { CookDialog } from './cooking'
import { MoreMenu } from './more-menu'
import { archiveRecipes, deleteRecipes } from './recipe-actions'
import { Field } from './task-details'
import { titlesOf, useWho } from './recipe-helpers'

/** Where the page goes: a mode of the same page (RCP-005, RCP-006, RCP-011). */
export interface RecipeGo {
  variation: (id: string) => void
  edit: (variation: string) => void
  /** A Variation just made: read once its editing is done. */
  editNew: (variation: string) => void
  editHeading: () => void
  cook: (variation: string) => void
  compare: () => void
  logCook: () => void
  recipe: (id: string) => void
  library: () => void
}

function VariationSwitcher({
  recipe,
  variation,
  onChange,
}: {
  recipe: RecipeView
  variation: VariationView
  onChange: (id: string) => void
}) {
  const live = recipe.variations.filter(
    (v) => v.item.status !== 'cancelled' || v.item.id === variation.item.id,
  )
  const { firstName } = useFoodSpaces(queue)
  // Someone else's Variation of a Recipe says whose it is (ADR-0051).
  const name = (v: VariationView) =>
    v.item.owner_id && v.item.owner_id !== recipe.item.owner_id && !v.mine
      ? `${v.item.title} (${firstName(v.item.owner_id)}'s)`
      : v.item.title
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span className="font-semibold text-muted-foreground">Variation</span>
      {live.length > 1 ? (
        <Select
          value={variation.item.id}
          items={live.map((v) => ({ value: v.item.id, label: name(v) }))}
          onValueChange={(v) => v && onChange(v)}
        >
          <SelectTrigger
            size="sm"
            aria-label="Variation"
            className="w-auto bg-transparent px-2 font-semibold hover:bg-accent"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {live.map((v) => (
              <SelectItem key={v.item.id} value={v.item.id}>
                {name(v)} · {STATE_NAMES[v.item.status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="px-2 font-semibold">{variation.item.title}</span>
      )}
      <Badge variant="outline">{STATE_NAMES[variation.item.status]}</Badge>
    </div>
  )
}

/** Name a copy of a Variation (RCP-009 1, RCP-017 2). */
function NameDialog({
  title,
  initial,
  onSave,
  onClose,
}: {
  title: string
  initial: string
  onSave: (name: string) => void
  onClose: () => void
}) {
  const nameId = useId()
  const [name, setName] = useState(initial)
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-colour="green">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            onSave(name.trim())
            onClose()
          }}
        >
          <Field label="Name" htmlFor={nameId}>
            <Input
              id={nameId}
              data-autofocus={!initial || undefined}
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Heading({
  recipe,
  variation,
  go,
}: {
  recipe: RecipeView
  variation: VariationView
  go: RecipeGo
}) {
  const [naming, setNaming] = useState<'duplicate' | 'mine' | 'new' | null>(null)
  const photo = usePhotoUrls([recipe.photo?.path]).get(recipe.photo?.path ?? '')
  const { firstName } = useFoodSpaces(queue)
  const h = recipe.heading
  // A member's Recipe says whose it is, first (patterns.md#recipes).
  const facts = [
    recipe.mine ? null : `By ${firstName(recipe.item.owner_id)}`,
    h.category,
    h.cuisine,
    ...h.protein,
    ...h.carbs,
    ...h.tags,
  ].filter((f): f is string => Boolean(f))
  const times = timesLine(variation)
  const source = variation.fields.sources[0]
  const live = recipe.variations.filter((v) => v.item.status !== 'cancelled')
  // An empty one, a Draft to fill (RCP-009 5, Joe, 26 October).
  const blank = (name: string) => {
    const id = addVariation(recipe.item.id, name)
    updateItem(id, { status: 'active' })
    go.editNew(id)
  }
  const copy = (name: string) =>
    go.editNew(
      addVariation(recipe.item.id, name, variation.item.id, [
        ...variation.lines.map((l) => l.id),
        ...variation.steps.map((st) => st.id),
      ]),
    )
  const deleteVariation = () => {
    const next = live.find((v) => v.item.id !== variation.item.id)
    archiveItem(variation.item.id)
    if (next) go.variation(next.item.id)
    toast(`Deleted "${variation.item.title}"`, {
      action: { label: 'Undo', onClick: () => restoreItem(variation.item.id) },
    })
  }

  const missing = recipe.mine && (!h.category || !h.cuisine)

  return (
    <>
      <RecipeHeadingLayout
        photo={<RecipePhoto src={photo} alt={recipe.item.title} className="w-full rounded-lg" />}
        details={
          <>
            <VariationSwitcher recipe={recipe} variation={variation} onChange={go.variation} />
            {facts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {facts.map((f) => (
                  <RecipeFact key={f}>{f}</RecipeFact>
                ))}
              </div>
            )}
            {missing && (
              // A Draft or Complete Recipe has both (Joe, 20 October).
              <Button variant="link" size="sm" className="self-start" onClick={go.editHeading}>
                {!h.category && !h.cuisine
                  ? 'Add a category and cuisine'
                  : !h.category
                    ? 'Add a category'
                    : 'Add a cuisine'}
              </Button>
            )}
            {(times || variation.fields.servings || source) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground [&_svg]:size-4">
                {times && (
                  <span className="inline-flex items-center gap-1.5">
                    <ClockIcon /> {times}
                  </span>
                )}
                {variation.fields.servings && (
                  <span className="inline-flex items-center gap-1.5">
                    <UsersIcon /> Serves {variation.fields.servings}
                  </span>
                )}
                {source && (
                  <a
                    href={source}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-w-0 items-center gap-1.5 hover:text-foreground"
                  >
                    <LinkIcon /> <span className="truncate">{sourceHost(source)}</span>
                  </a>
                )}
              </div>
            )}
            {recipe.cooks.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {cookedLine(recipe.cooks, (iso) => capturedWhen(iso))}
              </div>
            )}
          </>
        }
        actions={
          <>
            <Button onClick={() => go.cook(variation.item.id)}>
              <UtensilsIcon /> Start cooking
            </Button>
            {variation.mine ? (
              <Button variant="outline" onClick={() => go.edit(variation.item.id)}>
                <PencilIcon /> Edit
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setNaming('mine')}>
                <CopyIcon /> Add my variation
              </Button>
            )}
            <Toggle
              size="lg"
              aria-label="Favourite"
              pressed={recipe.favourite}
              onPressedChange={(on) => setMark(recipe.item.id, on)}
            >
              <HeartIcon />
            </Toggle>
            <MoreMenu>
              {recipe.mine && (
                <DropdownMenuItem onClick={go.editHeading}>Edit heading</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setNaming('new')}>New variation</DropdownMenuItem>
              {variation.mine && (
                <DropdownMenuItem onClick={() => setNaming('duplicate')}>
                  Duplicate this variation
                </DropdownMenuItem>
              )}
              {live.length > 1 && (
                <DropdownMenuItem onClick={go.compare}>Compare variations</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={go.logCook}>Log a cook</DropdownMenuItem>
              {recipe.mine &&
                variation.mine &&
                variation.item.status !== 'cancelled' &&
                recipe.defaultVariation?.item.id !== variation.item.id && (
                  <DropdownMenuItem
                    onClick={() =>
                      updateRecipe(recipe.item.id, { default_variation: variation.item.id })
                    }
                  >
                    Make it the default
                  </DropdownMenuItem>
                )}
              {(recipe.mine || (variation.mine && live.length > 1)) && <DropdownMenuSeparator />}
              {recipe.mine && (
                <DropdownMenuItem
                  onClick={() => {
                    archiveRecipes([recipe])
                    go.library()
                  }}
                >
                  Archive
                </DropdownMenuItem>
              )}
              {variation.mine && live.length > 1 && (
                <DropdownMenuItem variant="destructive" onClick={deleteVariation}>
                  Delete variation
                </DropdownMenuItem>
              )}
              {/* From its own page too, not only the library (Joe, 26 October). */}
              {recipe.mine && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    deleteRecipes([recipe])
                    go.library()
                  }}
                >
                  Delete recipe
                </DropdownMenuItem>
              )}
            </MoreMenu>
          </>
        }
      />
      {naming && (
        <NameDialog
          title={
            naming === 'new'
              ? 'New variation'
              : naming === 'mine'
                ? 'Add my variation'
                : 'Duplicate variation'
          }
          initial={
            naming === 'new'
              ? ''
              : naming === 'mine'
                ? variation.item.title
                : `${variation.item.title} copy`
          }
          onSave={naming === 'new' ? blank : copy}
          onClose={() => setNaming(null)}
        />
      )}
    </>
  )
}

/** A cook as it was cooked (RCP-012 2): its snapshot, read-only. */
function SnapshotDialog({ cook, onClose }: { cook: Cook; onClose: () => void }) {
  const snap = cook.snapshot as {
    name?: string
    servings?: number | null
    lines?: {
      heading: string | null
      name: string | null
      qty: number | null
      qty_max: number | null
      approx: boolean
      unit: string | null
    }[]
    steps?: string[]
  }
  const factor = snap.servings && cook.servings ? cook.servings / snap.servings : 1
  const groups = ingredientGroups(
    (snap.lines ?? []).map((l, i) => ({
      id: String(i),
      variation_id: '',
      position: String(i).padStart(4, '0'),
      heading: l.heading,
      pantry_id: null,
      text: l.name,
      qty: l.qty,
      qty_max: l.qty_max,
      approx: l.approx,
      unit: l.unit,
    })),
    new Map(),
    factor,
  )
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-colour="green">
        <DialogHeader>
          <DialogTitle>
            {snap.name ?? 'What I cooked'}
            {cook.servings ? ` · Serves ${cook.servings}` : ''}
          </DialogTitle>
        </DialogHeader>
        {snap.lines === undefined ? (
          <p className="text-muted-foreground">Kept once this cook is sent.</p>
        ) : (
          <div className="flex flex-col gap-5">
            <IngredientList groups={groups} />
            <MethodSteps
              steps={(snap.steps ?? [])
                .filter((t) => t.trim())
                .map((t, i) => ({ key: String(i), parts: textParts(t, new Map()) }))}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function LogLines({
  items,
  onSnapshot,
  onEdit,
  onNote,
  me,
}: {
  items: LogItem[]
  onSnapshot: (cook: Cook) => void
  /** My own cook's verdict and notes, to change (RCP-013 4). */
  onEdit: (cook: Cook) => void
  /** My own edit's note, to write (Joe, 20 October). */
  onNote: (item: LogItem) => void
  me: string
}) {
  const who = useWho()
  return (
    <>
      {items.map((l) => {
        const mine = l.actor === me
        return (
          <LogEntry
            key={l.key}
            who={who(l.actor)}
            what={l.what}
            when={capturedWhen(l.at)}
            verdict={l.cook?.verdict ? <StarRating value={l.cook.verdict} size="sm" /> : undefined}
            notes={l.cook?.notes ?? undefined}
            menu={
              mine && (l.cook || l.activity !== undefined) ? (
                <MoreMenu>
                  {l.cook ? (
                    <DropdownMenuItem onClick={() => onEdit(l.cook!)}>
                      <PencilIcon /> Change how it went
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => onNote(l)}>
                      <PencilIcon /> {l.detail ? 'Change the note' : 'Say what changed'}
                    </DropdownMenuItem>
                  )}
                </MoreMenu>
              ) : undefined
            }
          >
            {l.cook ? (
              <Button variant="link" size="sm" onClick={() => onSnapshot(l.cook!)}>
                What I cooked{l.cook.servings ? ` · Serves ${l.cook.servings}` : ''}
              </Button>
            ) : (
              l.detail
            )}
          </LogEntry>
        )
      })}
    </>
  )
}

/** My own words on what an edit changed (RCP-013); emptied, the note goes. */
function NoteDialog({ item, onClose }: { item: LogItem; onClose: () => void }) {
  const [note, setNote] = useState(item.detail ?? '')
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-colour="green">
        <DialogHeader>
          <DialogTitle>What changed?</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (note.trim() !== (item.detail ?? '')) noteChange(item.activity!, note.trim())
            onClose()
          }}
        >
          <Textarea
            data-autofocus={!item.detail || undefined}
            aria-label="What changed"
            placeholder="More honey; the sauce simmers longer"
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** How many of the log See all shows at a time. */
const PAGE = 20

/** The latest of a Recipe's log, and all of it, filtered, on See all (RCP-013). */
function RecipeLog({ recipe, food }: { recipe: RecipeView; food: FoodData }) {
  const { activity, notes } = useRecipeActivity(queue, [
    recipe.item.id,
    ...recipe.variations.map((v) => v.item.id),
  ])
  const log = recipeLog(recipe, activity, notes)
  const [all, setAll] = useState(false)
  const [filter, setFilter] = useState('all')
  const [shown, setShown] = useState(PAGE)
  const [snapshot, setSnapshot] = useState<Cook | null>(null)
  const [editing, setEditing] = useState<Cook | null>(null)
  const [noting, setNoting] = useState<LogItem | null>(null)
  const lines = (items: LogItem[]) => (
    <LogLines
      items={items}
      onSnapshot={setSnapshot}
      onEdit={setEditing}
      onNote={setNoting}
      me={food.me}
    />
  )
  const filters = [
    { value: 'all', label: 'Everything' },
    { value: 'cooks', label: 'Cooks' },
    ...recipe.variations.map((v) => ({ value: v.item.id, label: v.item.title })),
  ]
  const filtered = filterLog(log, filter)
  return (
    <RecipePanel
      title="Log"
      action={
        log.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShown(PAGE)
              setAll(true)
            }}
          >
            See all
          </Button>
        )
      }
    >
      {log.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing yet</p>
      ) : (
        lines(log.slice(0, 3))
      )}
      {all && (
        <Dialog open onOpenChange={setAll}>
          <DialogContent data-colour="green">
            <DialogHeader>
              <DialogTitle>Log</DialogTitle>
            </DialogHeader>
            <Select
              value={filter}
              items={filters}
              onValueChange={(v) => {
                if (!v) return
                setFilter(v)
                setShown(PAGE)
              }}
            >
              <SelectTrigger size="sm" aria-label="Show" className="w-auto self-start">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filters.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-col gap-4">{lines(filtered.slice(0, shown))}</div>
            {filtered.length > shown && (
              // A long log comes twenty at a time (Joe, 20 October).
              <Button variant="outline" onClick={() => setShown((n) => n + PAGE)}>
                Show more
              </Button>
            )}
          </DialogContent>
        </Dialog>
      )}
      {snapshot && <SnapshotDialog cook={snapshot} onClose={() => setSnapshot(null)} />}
      {noting && <NoteDialog item={noting} onClose={() => setNoting(null)} />}
      {editing && (
        <CookDialog
          cook={editing}
          variation={recipe.variations.find((v) => v.item.id === editing.variation_id)!}
          servings={editing.servings}
          onClose={() => setEditing(null)}
        />
      )}
    </RecipePanel>
  )
}

/**
 * A Recipe's page, to read (RCP-005): the heading, then the Variation's
 * ingredients, method, notes and log, side by side on a computer.
 */
export function RecipeRead({
  recipe,
  variation,
  food,
  go,
}: {
  recipe: RecipeView
  variation: VariationView
  food: FoodData
  go: RecipeGo
}) {
  const titles = titlesOf(food)
  const groups = ingredientGroups(variation.lines, food.pantry)
  const steps = methodSteps(variation.steps, titles)
  const notes = variation.fields.notes
  const openRecipe = ({ id }: { id?: string | null }) => id && go.recipe(id)
  return (
    <div className="flex flex-col gap-5 px-5 pb-12 sm:px-9">
      <Heading recipe={recipe} variation={variation} go={go} />
      <RecipeColumns layout="read">
        <RecipePanel title="Ingredients">
          {groups.length ? (
            <IngredientList groups={groups} />
          ) : (
            <p className="text-sm text-muted-foreground">No ingredients yet</p>
          )}
        </RecipePanel>
        <RecipePanel title="Method">
          {steps.length ? (
            <MethodSteps steps={steps} onRecipe={openRecipe} />
          ) : (
            <p className="text-sm text-muted-foreground">No method yet</p>
          )}
        </RecipePanel>
        <div className="flex flex-col gap-4">
          {notes && (
            <RecipePanel title="Notes">
              <p className="leading-relaxed">
                <RecipeText parts={textParts(notes, titles)} onRecipe={openRecipe} />
              </p>
            </RecipePanel>
          )}
          <RecipeLog recipe={recipe} food={food} />
        </div>
      </RecipeColumns>
    </div>
  )
}
