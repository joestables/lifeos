# Capture

*Stage 2: capture in the app. Capture from outside the app comes after every
other stage (Stage 10). The decisions come first; the requirements, drafted
at the start of Stage 2, are at the end.*

> **Changing in Stage 7b** (spec agreed 9 November, not yet built): Makes "New" one smart line for Thoughts and Reminders, a time in it making a Reminder, and Thoughts get no Alerts (NEW-001–006, ALR-001). [Today, Reminders and Plan](today-reminders-plan.md). Until it is built, this page is how it works.

## Decisions

- **Quick capture** opens over whatever you are doing, from any page; it
  makes a Thought, which waits on Notes' Thoughts tab, with a one-tap switch to Task; a
  deterministic parser offers, never forces, a Task when it spots a date
  ([ADR-0027](../../20-architecture/adr/0027-quick-capture.md), Provisionally agreed).
- **A Thought whose text contains a date gets an Alert** for that date
  ([ADR-0023](../../20-architecture/adr/0023-reminders.md), Provisionally agreed).
- **A bare date fills do-on**; a deadline must be said ("due fri", "by fri")
  ([ADR-0022](../../20-architecture/adr/0022-repeating-items.md), Provisionally agreed).
- **Sorting a Thought:** convert it in place into a Note, Task, Shopping list or other
  Capturable Type, or delete it (archive, with undo)
  ([ADR-0037](../../20-architecture/adr/0037-thoughts.md), Provisionally
  agreed). From Stage 4 a Thought can become a Recipe Idea, any link in it
  kept as a source, or a Shopping list, split at its commas
  ([ITM-006](items.md#itm-006--food-items)).
- **Capture stays Thoughts and Tasks in Stage 4 too:** it makes no Recipe,
  Meal or Shopping list, and matches nothing against the Pantry; that
  happens when a Thought is sorted.
- **Capture from outside the app** through a personal capture address, built
  last, after every other stage
  ([ADR-0028](../../20-architecture/adr/0028-capture-from-outside-the-app.md),
  Provisionally agreed).
- **Capture makes Thoughts and Tasks only** (Joe, 14 October): an
  event-shaped line is saved as a Thought or a Task. Events are made on
  Week or Plan, by switching a Task, or by sorting a Thought
  ([events](events.md#decisions)).

## Where capture comes from

- **In the app (Stage 2):** "New" at the top right of every page (on a
  phone, in the top bar) and a key on a computer.
- **From outside the app (Stage 10)** — see [deferred](#deferred-to-stage-10):
  - **The capture address**, which anything that can make a web request can
    post to: **iOS Shortcuts and Siri** ("Hey Siri, LifeOS: buy oat milk"),
    which also covers the iPhone's lack of a share target; **Android**
    HTTP-shortcut apps. Google Assistant can't post to a custom address since
    Conversational Actions closed in 2023, and Gemini offers no route either
    (re-checked 10 October 2026: the Gemini app is separate from the Gemini
    API and can't call a web address).
  - **Email** — a forwarding address, so an email or booking confirmation
    becomes a Thought. This needs an inbound-email service in front, chosen
    then ([integration setup](../../40-operations/integration-setup.md#capture-address-email-after-stage-9)).
  - **Android:** the installed app's home-screen shortcut and share target
    (the share target comes earlier, in Stage 4, for recipe ideas:
    [RCP-003](../modules/recipes.md#rcp-003--save-an-idea-from-another-app)),
    and a widget for typing a Thought, drafted with the Android app and
    deferred until Joe settles any changes to Thoughts (Joe, 5 November;
    [WID-001](android.md#wid-001--capture-a-thought-from-the-home-screen)).

## Requirements

*Stage 2. Statuses: proposed → agreed → built → verified.*

### CAP-001 — Capture a thought in one line

**As** Joe, **I want** to jot a thought down in one line from anywhere,
**so that** it's out of my head in seconds and I can sort it later.
Priority: Must · Status: verified

Acceptance criteria
1. Given I am on any page, when I open capture, type "ceramics class for the
   anniversary?" and save, then a Thought is created in my Personal Space and
   appears on Notes' Thoughts, waiting to be sorted, counted on Today.
2. Given I switch capture to Task before saving "renew insurance fri", when I
   save, then a Task "Renew insurance" is created, to do on Friday, with my
   default Alert at 09:00 on Friday.
3. Given I type "call mum fri 6pm" and leave it as a Thought, when the parser
   finds the date, then it offers "Task, Fri 18:00?" and does not switch on
   its own.
4. Given I have no signal, when I save, then the Item appears immediately and
   is sent when the connection returns.

### CAP-002 — Capture from any page without losing my place

**As** Joe, **I want** capture one tap or one key away on every page, and to
come back to exactly what I was doing, **so that** capturing never
interrupts me.
Priority: Must · Status: verified

Acceptance criteria
1. Given I am on any page, on a phone or a computer, then capture opens with
   one tap (or one key on a computer), ready to type.
2. Given I was part-way through something (scrolled down a list, an Item
   open), when I save or close capture, then I am back exactly where I was,
   with nothing on the page changed except for the new Item where it
   belongs.
3. Given I save, then I'm told what was made ("Thought saved", "Task saved ·
   Fri") and can undo it.

### CAP-003 — Dates and times are understood, the same way everywhere

**As** Joe, **I want** to type dates the way I say them, **so that** I never
open a date picker for the common cases.
Priority: Must · Status: verified

Capture and adding a Task understand dates the same way, with no signal.

Acceptance criteria
1. Given "renew insurance fri", then do-on is the coming Friday (today, if it
   is Friday). "today", "tomorrow", "tmrw", weekday names, "next week" (next
   Monday), "in 3 days", "12 oct" and "12/10" (day first) are understood.
2. Given "call mum fri 6pm", then do-on is Friday and do-at 18:00; "18:00",
   "6.30pm" and "6:30pm" are understood. A time with no date is today, or
   tomorrow if the time has passed. An hour from 1 to 7 with no "am" or
   "pm" is the evening ("at 6" is 18:00); "07:30" is the morning.
3. Given "renew insurance due fri" or "by fri", then Friday is the due date,
   not the do-on date.
4. Given a word that is also an ordinary word ("may", "sun", "march",
   "second"), then it counts as a date only next to a number or after "on"
   ("3 may", "on sun").
5. Given the line becomes a Task, then the date words are removed from the
   title and its first letter is capitalised; a Thought keeps the line as
   typed.

### CAP-004 — A Thought with a date reminds me

**As** Joe, **I want** a dated Thought to remind me even before I sort it,
**so that** a jotted "dentist tue 3pm?" isn't forgotten among the Thoughts.
Priority: Should · Status: built (the Alert firing is verified with step 11)

Acceptance criteria
1. Given I save "dentist tue 3pm?" as a Thought, then it has an Alert for
   Tuesday at 15:00; with a date but no time, at my default time.
2. Given I then convert it into a Task, then the Alert stays
   ([ADR-0037](../../20-architecture/adr/0037-thoughts.md)).

### CAP-009 — Label what I capture

**As** Joe, **I want** to give a Thought or a Task its Labels as I capture
it, **so that** it is filed from the start.
Priority: Should · Status: verified

Acceptance criteria
1. Given my Labels shown as pills in capture, when I choose Home and save,
   then the Thought (or Task) has the Label Home.
2. Given I open capture again, then no Label is chosen.

Non-goals (Stage 2): repeats typed in words ("every monday"); an LLM in
capture; matching the Pantry or making food Items (Stage 4 does this when a
Thought is sorted); Events (Joe, 14 October); everything in
[deferred](#deferred-to-stage-10).

## Deferred to Stage 10

Joe's decision (10 October 2026): capture from outside the app is built after
every other stage. These are kept as candidate requirements, not agreed, and
are written in full then:

- **CAP-005 — The capture address:** a private web address, made and
  revoked in Settings, that creates a Thought (or, with "task", a Task) in
  its owner's Personal Space, parsed as in the app; rate-limited, logged
  without its text, and able to read nothing.
- **CAP-006 — Capture by voice on the iPhone:** "Hey Siri, LifeOS", through
  a Shortcut that posts to the capture address.
- **CAP-007 — Capture by email:** forwarding an email makes a Thought from
  its subject and text.
- **CAP-008 — Capture from Android's home screen and share sheet:** a
  shortcut on the app's icon, and LifeOS in the share sheet. Sharing a link
  as a recipe Idea comes first, in Stage 4
  ([RCP-003](../modules/recipes.md#rcp-003--save-an-idea-from-another-app)),
  with an iPhone to follow.
- The Android widget for typing a Thought: drafted with the Android app
  in Stage 7, then deferred until Joe settles any changes to Thoughts
  (Joe, 5 November;
  [WID-001](android.md#wid-001--capture-a-thought-from-the-home-screen)).
