import { useLocation, useNavigate, useRouter } from '@tanstack/react-router'
import { toast } from '@/components/ui/sonner'
import { archiveItem, newId, restoreItem, type Item } from '@/data'
import { useIsMobile } from '@/hooks/use-mobile'
import { itemTitle, opensAsPage, RECIPE_TYPES } from '@/lib/item-types'

declare module '@tanstack/react-router' {
  interface HistoryState {
    /** The Item popup was opened by going forward, so closing it goes back. */
    itemOpened?: boolean
  }
}

/**
 * Opens an Item where its Type opens (ITM-001, patterns.md#opening-an-item):
 * a popup over this page, or a page of its own. Either way it has its own
 * entry in the history, so Back returns here.
 */
export function useOpenItem() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  return (item: Pick<Item, 'id' | 'type'>) => {
    if (item.type === 'recipe') {
      void navigate({ to: '/recipes/$id', params: { id: item.id } })
    } else if (item.type === 'shopping_list') {
      void navigate({ to: '/shopping/$id', params: { id: item.id } })
    } else if (opensAsPage(item.type, isMobile) || RECIPE_TYPES.includes(item.type)) {
      void navigate({ to: '/item/$id', params: { id: item.id } })
    } else {
      void navigate({
        to: '.',
        search: (prev) => ({ ...prev, item: item.id }),
        state: { itemOpened: true },
      })
    }
  }
}

/**
 * Opens a new, empty Note where Notes open (patterns.md#notes); nothing is
 * kept until something is typed.
 */
export function useNewNote() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  return () => {
    const id = newId()
    if (opensAsPage('note', isMobile)) {
      void navigate({ to: '/item/$id', params: { id }, search: { new: 'note' } })
    } else {
      void navigate({
        to: '.',
        search: (prev) => ({ ...prev, item: id, new: 'note' }),
        state: { itemOpened: true },
      })
    }
  }
}

/** Closes the Item popup, back to the page as it was. */
export function useCloseItem() {
  const navigate = useNavigate()
  const router = useRouter()
  const location = useLocation()
  return () => {
    if (location.state.itemOpened) router.history.back()
    else
      void navigate({
        to: '.',
        search: (prev) => ({ ...prev, item: undefined, new: undefined }),
        replace: true,
      })
  }
}

/** Deletes at once, with Undo (ITM-002); it stays in Recently deleted (ITM-003). */
export function deleteItem(item: Item) {
  archiveItem(item.id)
  toast(`Deleted "${itemTitle(item)}"`, {
    action: { label: 'Undo', onClick: () => restoreItem(item.id) },
  })
}

/** A Note opened before it is kept: "New note" (patterns.md#notes). */
export const draftNote = (id: string): Item => draftItem(id, 'note')

/** An Item not yet kept, with nothing in it. */
export function draftItem(id: string, type: string): Item {
  const at = new Date().toISOString()
  return {
    id,
    type,
    title: '',
    body: '',
    place: null,
    space_id: '',
    owner_id: '',
    status: 'active',
    starts_at: null,
    ends_at: null,
    all_day: null,
    due_on: null,
    do_on: null,
    do_at: null,
    slot: null,
    series_id: null,
    occurrence_on: null,
    position: null,
    touched_at: null,
    created_at: at,
    updated_at: at,
    archived_at: null,
  }
}
