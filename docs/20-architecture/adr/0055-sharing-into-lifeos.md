# ADR-0055: Sharing into LifeOS from another app

**Status:** Provisionally agreed · 2026-10-18

## Context

Joe wants a recipe on TikTok, Instagram or a web page shared straight into
an Idea ([RCP-003](../../10-requirements/modules/recipes.md#rcp-003--save-an-idea-from-another-app)),
on Android now and an iPhone later. Capture from outside the app is
otherwise Stage 10 ([ADR-0028](0028-capture-from-outside-the-app.md)).

## Decision

- **Android: the Web Share Target API.** The manifest's `share_target`
  makes the installed app appear in Android's share sheet; a share opens
  `/share` with the shared title, text and link, which offers *Recipe idea*
  (and, in Stage 10, a Thought).
- **The Idea is kept at once**, offline too, through the write queue, with
  the link as its source; `link-preview`
  ([ADR-0054](0054-the-ai-service-and-import.md)) fills its name and
  thumbnail when there's signal, never replacing what I typed.
- **A link saved before** is checked against the sources the device holds,
  and again by the server when it's sent.
- **An iPhone** can't be a share target for a web app. The planned route:
  an iOS Shortcut in the share sheet that opens LifeOS's `/share` with the
  link, needing no capture address; built when Joe wants it.

## Consequences

- `/share` is a signed-in page; signed out, it signs in and carries on.
- A browser walk covers `/share` with a link, offline, and a repeat.
