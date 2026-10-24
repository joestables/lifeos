# ADR-0055: Sharing into LifeOS from another app

**Status:** Provisionally agreed · 2026-10-18
**Amended:** 2026-10-24 by Joe's answers for Stage 4b (saved with no choice to make; the iOS Shortcut built now).

## Context

Joe wants a recipe on TikTok, Instagram or a web page shared straight into
an Idea ([RCP-003](../../10-requirements/modules/recipes.md#rcp-003--save-an-idea-from-another-app)),
on Android now and an iPhone later. Capture from outside the app is
otherwise Stage 10 ([ADR-0028](0028-capture-from-outside-the-app.md)).

## Decision

- **Android: the Web Share Target API.** The manifest's `share_target`
  makes the installed app appear in Android's share sheet, as "LifeOS"; a
  share opens `/share` with the shared title, text and link, which keeps a
  Recipe idea at once and shows "Saved as an idea", closing back to the app
  shared from where Android allows it, else with Back (Joe, 24 October:
  he wants no choice to make; a Thought from a share waits for Stage 10).
  A web app can't save without opening a window; that would need a native
  Android app.
- **The Idea is kept at once**, offline too, through the write queue, with
  the link as its source; `link-preview`
  ([ADR-0054](0054-the-ai-service-and-import.md)) fills its name and
  thumbnail when there's signal, never replacing what I typed.
- **A link saved before** is checked against the sources the device holds,
  and again by the server when it's sent.
- **An iPhone** can't be a share target for a web app. An iOS Shortcut in
  the share sheet opens LifeOS's New idea with the link and its name filled
  in, needing no capture address; built in Stage 4b.

## Consequences

- `/share` is a signed-in page; signed out, it signs in and carries on.
- A browser walk covers `/share` with a link, offline, and a link saved before.
