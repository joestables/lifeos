# ADR-0046: A Note's body is Markdown, edited in place

**Status:** Provisionally agreed · 2026-10-11 (Joe chose it from three
options while building Notes)

## Context

[NTE-004](../../10-requirements/views/notes.md#nte-004--simple-formatting)
asks for bulleted, numbered and check lists, bold, italic and links in a
Note, written without leaving the keyboard, with ticked lines kept. An
Item's `body` is a text column that search indexes
([SRC-001](../../10-requirements/cross-cutting/search.md#requirements)). Nothing yet said what format it holds or what
edits it.

## Decision

- **The body is Markdown**, CommonMark with task lists: `- [x] Passport`,
  `1. The Wager`, `**print it**`, `*Thu 5 Nov*`, `[text](https://…)`. It
  stays readable text, so search, other Modules, the capture address and an
  export read it as it is.
- **TipTap edits it in place** (ProseMirror, with `@tiptap/markdown`): the
  Note shows formatted while it is written, with Markdown shortcuts as you
  type ("- ", "1. ", "[ ] ") and the usual keys (Ctrl/⌘+B, I, K). Only what
  NTE-004 asks for is switched on: no headings, quotes, code or images.
- **Loaded only when a Note opens**, so the rest of the app doesn't carry
  it.
- **Cards on the Notes page show the start of the body** with checklists,
  lists and emphasis drawn by the app's own small reader of the same
  Markdown, not by TipTap.
- A round-trip test keeps the editor from changing what it was given.
- Checklist lines keep TipTap's own markup, styled like the Checkbox: on
  Chrome for Android the editor reads Enter from what the page becomes, and
  a custom line component broke leaving a checklist there.

## Consequences

- About 145 KB more (compressed), in the Note editor's own chunk, loaded
  when a Note first opens; the rest of the app is unchanged.
- A Thought converted into a Note keeps its text; plain text is already
  Markdown.
- Rejected: storing the editor's JSON (search, exports and other Modules
  would each have to convert it); a plain text box showing the Markdown
  symbols (ticking a checkbox would mean editing text).
