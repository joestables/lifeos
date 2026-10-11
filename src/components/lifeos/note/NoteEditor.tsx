import { Placeholder } from '@tiptap/extensions'
import { EditorContent, useEditor } from '@tiptap/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { noteExtensions } from './extensions'
import './note-editor.css'

const extensions = [...noteExtensions, Placeholder.configure({ placeholder: 'Note' })]

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
      attributes: {
        class: 'note-doc',
        'aria-label': 'Note',
        role: 'textbox',
        'aria-multiline': 'true',
      },
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
