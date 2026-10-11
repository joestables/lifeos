import { TaskItem } from '@tiptap/extension-list'
import { Placeholder } from '@tiptap/extensions'
import {
  EditorContent,
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  type ReactNodeViewProps,
} from '@tiptap/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { noteExtensions } from './extensions'

/** A checklist line, ticked with the design system's Checkbox. */
function CheckLine({ node, updateAttributes, editor }: ReactNodeViewProps) {
  return (
    <NodeViewWrapper as="li" className="flex min-h-[30px] items-start gap-3">
      <span
        contentEditable={false}
        className="flex h-[30px] items-center"
        // Ticking a line leaves the caret where it was, so typing goes on.
        onMouseDown={(e) => e.preventDefault()}
      >
        <Checkbox
          aria-label={node.textContent ? `Done: ${node.textContent}` : 'Done'}
          checked={node.attrs.checked as boolean}
          disabled={!editor.isEditable}
          onCheckedChange={(checked) => updateAttributes({ checked })}
        />
      </span>
      <NodeViewContent
        className={
          node.attrs.checked
            ? 'min-w-0 flex-1 py-[3px] text-muted-foreground line-through'
            : 'min-w-0 flex-1 py-[3px]'
        }
      />
    </NodeViewWrapper>
  )
}

const extensions = [
  ...noteExtensions.map((e) =>
    e.name === 'taskItem'
      ? TaskItem.extend({ addNodeView: () => ReactNodeViewRenderer(CheckLine) }).configure({
          nested: true,
        })
      : e,
  ),
  Placeholder.configure({ placeholder: 'Note' }),
]

/** Body styles: lists, checklists, emphasis and links (components.md, NoteEditor). */
const doc =
  'text-[15px] leading-[1.55] outline-none [&_p]:min-h-[1.55em] [&>*+*]:mt-2 [&_ul:not([data-type=taskList])]:list-disc [&_ol]:list-decimal [&_ul:not([data-type=taskList])]:pl-5 [&_ol]:pl-5 [&_li>p]:my-0 [&_strong]:font-bold [&_em]:italic [&_a]:text-tc-text [&_a]:underline [&_a]:underline-offset-2 [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:text-muted-foreground [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_ul[data-type=taskList]_ul]:pl-7'

/**
 * A Note being written (components.md): its title, then its body formatted
 * as it is typed, kept as Markdown (ADR-0046). Changes are reported as they
 * happen; the caller keeps them.
 */
export default function NoteEditor({
  title,
  body,
  onTitleChange,
  onBodyChange,
  autoFocusTitle = false,
  footer,
}: {
  title: string
  body: string
  onTitleChange: (title: string) => void
  onBodyChange: (markdown: string) => void
  autoFocusTitle?: boolean
  /** Its Labels and the LabelPicker. */
  footer?: ReactNode
}) {
  const onBody = useRef(onBodyChange)
  useEffect(() => {
    onBody.current = onBodyChange
  }, [onBodyChange])
  const editor = useEditor({
    extensions,
    content: body,
    contentType: 'markdown',
    editorProps: {
      attributes: { class: doc, 'aria-label': 'Note', role: 'textbox', 'aria-multiline': 'true' },
    },
    // Without the blank lines a list leaves at the end.
    onUpdate: ({ editor }) => onBody.current(editor.getMarkdown().trimEnd()),
  })

  return (
    <div className="flex flex-col gap-3.5">
      <input
        aria-label="Title"
        placeholder="Title"
        autoComplete="off"
        // A new Note starts with its title ready to type (patterns.md#notes).
        autoFocus={autoFocusTitle}
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && editor) {
            e.preventDefault()
            // At once, not on the next frame as commands.focus() does: what is
            // typed straight after Enter must land in the body.
            editor.view.focus()
            editor.commands.setTextSelection(1)
          }
        }}
        className="w-full bg-transparent text-[22px] leading-[1.2] font-[750] tracking-[-0.025em] outline-none placeholder:text-muted-foreground"
      />
      <EditorContent editor={editor} />
      {footer}
    </div>
  )
}
