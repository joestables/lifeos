import { ChefHatIcon, PlusIcon, SparklesIcon, StickyNoteIcon } from 'lucide-react'
import { useState } from 'react'
import { Fab } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAiStatus } from '@/data'
import { AI_REFUSALS } from './ai-words'

/**
 * "New" on both of Recipes' tabs (patterns.md#recipes, Joe, 23 October):
 * New recipe, New idea and Import; on a phone the Fab opens the same menu.
 * Import is greyed only once the AI is known not to be usable, saying why
 * (RCP-014 7): asked as the page opens, never making me wait on the menu.
 */
export function NewRecipeMenu({
  onRecipe,
  onIdea,
  onImport,
  fab = false,
}: {
  onRecipe: () => void
  onIdea: () => void
  onImport: () => void
  /** The phone's Fab, rather than the computer's PageAction. */
  fab?: boolean
}) {
  const [open, setOpen] = useState(false)
  const status = useAiStatus(true)
  const why = status && !status.available ? AI_REFUSALS[status.reason] : null
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={fab ? <Fab label="New" /> : <Button size="sm" className="hidden md:inline-flex" />}
      >
        {fab ? undefined : (
          <>
            <PlusIcon /> New
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={fab ? 'end' : 'start'} side={fab ? 'top' : 'bottom'}>
        <DropdownMenuItem onClick={onRecipe}>
          <ChefHatIcon /> New recipe
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onIdea}>
          <StickyNoteIcon /> New idea
        </DropdownMenuItem>
        <DropdownMenuItem disabled={status?.available === false} onClick={onImport}>
          <SparklesIcon />
          <span className="flex flex-col">
            Import
            {why && <span className="text-xs text-muted-foreground">{why}</span>}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
