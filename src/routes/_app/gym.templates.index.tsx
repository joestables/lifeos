import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ClipboardListIcon } from 'lucide-react'
import { useState } from 'react'
import {
  EmptyState,
  PageAction,
  PageHeader,
  PanelRow,
  SortMenu,
  TypeScope,
} from '@/components/lifeos'
import { Card } from '@/components/ui/card'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { templateMeta } from '@/app/template-actions'
import { TemplateMenu, TemplateNameDialog, TemplateTile } from '@/app/template-parts'
import { useTemplateSort } from '@/app/gym-library'
import { queue, useGym, type TemplateView } from '@/data'
import {
  counted,
  sortTemplates,
  templateRows,
  TEMPLATE_SORTS,
  TEMPLATES_PER_PAGE,
  type TemplateSort,
} from '@/lib/gym'

/**
 * All templates (GYM-022): every template with its exercises, sets and when
 * last used, twenty to a page, sorted as I choose; New template is the
 * page's main action.
 */
export const Route = createFileRoute('/_app/gym/templates/')({
  component: AllTemplates,
})

function AllTemplates() {
  const navigate = useNavigate()
  const gym = useGym(queue)
  const { sort, direction, change } = useTemplateSort()
  const [page, setPage] = useState(1)
  const [naming, setNaming] = useState<TemplateView | 'new' | null>(null)
  const [now] = useState(() => Date.now())
  const sorted = sortTemplates(templateRows(gym.templates, now), sort, direction)
  const pages = Math.max(1, Math.ceil(sorted.length / TEMPLATES_PER_PAGE))
  const at = Math.min(page, pages)
  const shown = sorted.slice((at - 1) * TEMPLATES_PER_PAGE, at * TEMPLATES_PER_PAGE)
  const open = (id: string) => void navigate({ to: '/gym/templates/$id', params: { id } })
  const newTemplate = { label: 'New template', onClick: () => setNaming('new') }
  return (
    <TypeScope colour="coral">
      <PageHeader
        back={{ label: 'Gym', onClick: () => void navigate({ to: '/gym' }) }}
        title="All templates"
        action={newTemplate}
      />
      <div className="flex max-w-3xl flex-col gap-5 px-5 pb-28 sm:px-9 md:pb-12">
        <div className="flex items-center gap-3">
          <span className="flex-1 text-sm font-semibold text-muted-foreground tabular-nums">
            {counted(sorted.length, 'template')}
          </span>
          <SortMenu<TemplateSort>
            options={TEMPLATE_SORTS}
            value={sort}
            direction={direction}
            onChange={(s, d) => change(s, d)}
          />
          <PageAction label={newTemplate.label} onClick={newTemplate.onClick} />
        </div>
        {!gym.isLoading && sorted.length === 0 ? (
          <EmptyState icon={ClipboardListIcon} title="No templates yet" />
        ) : (
          <Card className="gap-0 py-3">
            {shown.map((t) => (
              <PanelRow
                key={t.item.id}
                leading={<TemplateTile />}
                title={t.item.title}
                meta={templateMeta(t)}
                chevron={false}
                onOpen={() => open(t.item.id)}
                trailing={
                  <TemplateMenu
                    template={t}
                    templates={gym.templates}
                    onRename={() => setNaming(t)}
                    onDuplicated={open}
                  />
                }
              />
            ))}
          </Card>
        )}
        {pages > 1 && (
          <Pagination className="justify-center pt-1">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  aria-disabled={at === 1}
                  onClick={() => setPage(Math.max(1, at - 1))}
                />
              </PaginationItem>
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <PaginationItem key={n}>
                  <PaginationLink isActive={n === at} onClick={() => setPage(n)}>
                    {n}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  aria-disabled={at === pages}
                  onClick={() => setPage(Math.min(pages, at + 1))}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
      {naming && (
        <TemplateNameDialog
          template={naming === 'new' ? undefined : naming}
          templates={gym.templates}
          onClose={() => setNaming(null)}
          onMade={open}
        />
      )}
    </TypeScope>
  )
}
