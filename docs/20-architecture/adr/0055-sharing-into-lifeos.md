# ADR-0055: Sharing into LifeOS from another app

**Status:** Provisionally agreed · 2026-10-18

**Amended:** 2026-10-24 by Joe's answers for Stage 4b (saved with no choice to make; the iOS Shortcut built now); 2026-11-05 by [ADR-0061](0061-the-android-app.md) (the Android app takes shares through Android's own share sheet, opening the same `/share`).

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
  Android app. The Android app (Stage 7) takes the share itself and opens
  the same `/share` ([ADR-0061](0061-the-android-app.md)).
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

## As built (25 October, Stage 4b step 9)

- The manifest's `share_target` sends `title`, `text` and `url` to
  `/share` by GET. The link is the url, else the first link in the text or
  title (TikTok and Instagram put it there), kept without its fragment,
  `utm_…` tracking, or any query on TikTok and Instagram, so the same post
  shared twice is found again.
- The Idea is named from the shared title, else the text without its link
  and hashtags, else "Idea from tiktok.com", made unique among my Recipes
  ("Pancakes 2"). `link-preview` now answers a name as well as the picture;
  the device keeps a list of Ideas still to fill in and fills them when the
  app is open with signal, replacing the name only while the Idea still has
  the one it was kept with.
- **A link saved before** is checked against the sources the device holds,
  then, with signal, by reading `food.variation` for that source, so one
  saved on another device is found too. Offline, only the device's are
  checked; a second save of the same link from two devices with no signal
  isn't caught.
- Installed, the page closes itself after a moment and a half; where
  Android doesn't allow it, Back returns to the app shared from.
- Signed out, the share is kept on the device while I sign in, and the app
  carries on to `/share` once I'm in.
- **The iOS Shortcut** opens `/recipes?tab=ideas&share=<link>` (and
  `&name=` if it has one) in Safari: an iPhone's home-screen app can't be
  opened by a link, so it needs a sign-in in Safari once. New idea opens
  with the link, and fills the name and photo from `link-preview` while
  they're empty. How to make it is in
  [integration setup](../../40-operations/integration-setup.md#ios-shortcut-save-to-lifeos).

## As built (6 November, Stage 7 step 9)

- **The Android app** is in Android's share sheet for text (a link, or
  text with a link in it, as TikTok and Instagram send). The share reaches
  the page as the web's share target sends it, `/share?title=…&text=…`,
  through LifeOS's own plugin (`takeShare`, and a `share` event when the
  app was already open), so the page keeps the Idea exactly as on the web.
- **Back to the app shared from:** a minute and a half after "Saved as an
  idea", the app moves itself behind the app shared from (`leave`), and is
  left on what it showed before. "Already saved" stays, with Open.
- A phone with both the Android app and the web app installed from Chrome
  shows LifeOS twice in the share sheet; the web app is removed from the
  phone once the Android app is in use (AND-004 2).

