import { Markdown } from '@tiptap/markdown'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import StarterKit from '@tiptap/starter-kit'

/**
 * What a Note's body can hold (NTE-004, ADR-0046): paragraphs, bulleted,
 * numbered and check lists, bold, italic and links, kept as Markdown.
 */
export const noteExtensions = [
  StarterKit.configure({
    heading: false,
    blockquote: false,
    codeBlock: false,
    code: false,
    horizontalRule: false,
    strike: false,
    underline: false,
    link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Markdown,
]
