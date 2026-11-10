# Capture

*Stage 2: capture in the app; from Stage 7b, "New", one smart line for
Thoughts and Reminders. Capture from outside the app comes after every
other stage (Stage 10). The decisions come first; the requirements, drafted
at the start of Stage 2 and in [Today, Reminders and
Plan](today-reminders-plan.md), are at the end.*

## Decisions

- **"New"** opens over whatever you are doing, from any page: one line, with
  no switch between Types. A time in it makes a **Reminder**, its words an
  Alert pill and out of the title; none makes a **Thought**, which waits on
  Notes' Thoughts tab. A deterministic parser reads the times, with no
  signal (Joe, 9 November; [ADR-0027](../../20-architecture/adr/0027-quick-capture.md),
  [ADR-0065](../../20-architecture/adr/0065-reminders-alerts-and-the-day.md)
  11, Provisionally agreed).
- **A Thought gets no Alert from its text**: a line with a time is a
  Reminder (ADR-0065 5; the Thought default went from Settings).
- **A bare date fills do-on** when a line becomes a Task (sorting a Thought,
  CAP-003); a deadline must be said ("due fri", "by fri")
  ([ADR-0022](../../20-architecture/adr/0022-repeating-items.md), Provisionally agreed).
- **Sorting a Thought:** convert it in place into a Note, Task, Shopping list or other
  Capturable Type, or delete it (archive, with undo)
  ([ADR-0037](../../20-architecture/adr/0037-thoughts.md), Provisionally
  agreed). From Stage 4 a Thought can become a Recipe Idea, any link in it
  kept as a source, or a Shopping list, split at its commas
  ([ITM-006](items.md#itm-006--food-items)).
- **Capture makes no food:** no Recipe, Meal or Shopping list, and it
  matches nothing against the Pantry; that happens when a Thought is
  sorted.
- **Capture from outside the app** through a personal capture address, built
  last, after every other stage
  ([ADR-0028](../../20-architecture/adr/0028-capture-from-outside-the-app.md),
  Provisionally agreed).
- **"New" makes Thoughts and Reminders only** (Joe, 9 November): Tasks and
  Events are made on Plan and Week, by converting, or by sorting a Thought
  ([events](events.md#decisions)).

## Where capture comes from

- **In the app:** "New" at the top right of every page (on a phone, in the
  top bar), N on a computer, and Notes' New thought.
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
2. Given I have no signal, when I save, then the Item appears immediately and
   is sent when the connection returns.

(Its switch to Task, and the offer of one for a dated line, went with "New"
in Stage 7b: a time in the line makes a Reminder, NEW-002.)

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
3. Given I save, then I'm told what was made ("Thought saved", "Reminder
   saved · Tue 10 Nov, 20:00") and can undo it.

### CAP-003 — Dates and times are understood, the same way everywhere

**As** Joe, **I want** to type dates the way I say them, **so that** I never
open a date picker for the common cases.
Priority: Must · Status: verified

A Thought sorted into a Task or an Event, and adding a Task, understand
dates the same way, with no signal. "New" reads its line by NEW-003.

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
   title and its first letter is capitalised.

### CAP-004 — A Thought with a date reminds me

**As** Joe, **I want** a dated Thought to remind me even before I sort it,
**so that** a jotted "dentist tue 3pm?" isn't forgotten among the Thoughts.
Priority: Should · Status: superseded (Stage 7b: a line with a time is a Reminder, NEW-002; a Thought has no Alerts, ALR-001)

Acceptance criteria
1. ~~Given I save "dentist tue 3pm?" as a Thought, then it has an Alert for
   Tuesday at 15:00.~~ "New" makes it a Reminder for Tuesday at 15:00.

### CAP-009 — Label what I capture

**As** Joe, **I want** to give a Thought its Labels as I capture it, **so
that** it is filed from the start.
Priority: Should · Status: verified

Acceptance criteria
1. Given my Labels shown as pills in capture, when I choose Home and save,
   then the Thought has the Label Home; a Reminder has none (NEW-006 1).
2. Given I open capture again, then no Label is chosen.

## "New"

*Stage 7b, agreed by Joe on 9 November in [Today, Reminders and
Plan](today-reminders-plan.md); built in its step 7.*

### NEW-001 — The "New" button

**As** Joe, **I want** "New" where it always is, **so that** making a
Reminder is one tap from anywhere.
Priority: Must · Status: verified (`capture.spec.ts`)

Acceptance criteria
1. Given any page, then "New" is at the top right on a computer and in the
   top bar on a phone: the quiet button it is now, with a bell and a plus
   in place of the speech bubble; on a computer, N opens it too.
2. Given I press it, then "New" opens over the page, the line ready to type
   in, as capture does now (CAP-002).

### NEW-002 — One smart line

**As** Joe, **I want** to type a reminder as I'd say it, **so that** it's
quick and there's nothing to choose first.
Priority: Must · Status: verified (`capture.spec.ts`)

Acceptance criteria
1. Given "New", then it is one line ("Remind me to…"), quick times under it
   (NEW-005), and Cancel and Save; there is no Thought / Reminder switch.
2. Given the line has a time (one typed, NEW-003, or one added, NEW-005),
   then Save makes a Reminder; with none, a Thought. A tile at the top right
   says which as I type: the Reminder's blue bell or the Thought's yellow
   lightbulb. The button says only "Save".
3. Given the line is empty, then Save is off; Enter saves.
4. Given I save, then it is made in my Personal Space, offline too (CAP-001
   4), and "New" closes.

### NEW-003 — Times are understood, and kept out of the title

**As** Joe, **I want** "clean bedroom tues 8pm" to become "Clean bedroom"
at 20:00 on Tuesday, **so that** the title reads as I'd write it.
Priority: Must · Status: verified (`capture.spec.ts`, `packages/capture`'s `reminder.test.ts`)

Acceptance criteria
1. Given I type "clean bedroom tues 8pm", then the words for the time
   become an Alert pill, Tue 10 Nov, 20:00, and the title is "Clean
   bedroom" (its first letter a capital); the words are understood as
   everywhere else (CAP-003), "tues", "thurs" and "weds" too. The words
   leave the line for their pill once a word that isn't part of a time
   follows them ("… tues 8pm with mum"), or on Save; until then the pill
   shows beside them.
2. Given "… tues 8pm and 9pm", then there are two Alert pills.
3. Given a date with no time ("call mum tomorrow"), then the Alert is at my
   default time (09:00 unless changed).
4. Given a time with no date ("bins out 7pm"), then it is today, or
   tomorrow if 19:00 has passed; a weekday is the next one, today if its
   time is still to come.
5. Given "in 2 hours", "tonight", "this weekend", then they are understood
   as the quick times are (NEW-005).
6. Given no Alert can be in the past, then nothing typed makes one.
7. Given "every tuesday", then no Repeat is set from the line (Joe, 9
   November); a Repeat is set in the Reminder's popup (RMD-004).

### NEW-004 — Alert pills in the line

**As** Joe, **I want** each Alert as a pill I can change or remove,
**so that** fixing what was understood is a tap.
Priority: Must · Status: verified (`capture.spec.ts`)

Acceptance criteria
1. Given an Alert, typed or added, then it is a pill in the line after the
   title, in the Reminder's blue tint, with a bell (an alarm clock for an
   Alarm) and its date and time, and × at its end.
2. Given I tap a pill, then the Alert dialog opens: its date and time, and
   Alarm (RMD-002 2).
3. Given I press × on a pill, or Backspace at the end of the line when its
   words end there, then the pill is removed (a typed time's words stay, as
   words); the last one removed, the line is a Thought again. A changed
   pill's words leave the line.

### NEW-005 — Quick times

**As** Joe, **I want** the likely times a tap away, **so that** on my
phone I needn't type a time at all.
Priority: Must · Status: verified (`capture.spec.ts`, `src/lib/new-line.test.ts`)

Acceptance criteria
1. Given "New", then under the line are three pills: **In 1 hour**; the
   likeliest next time — **This evening** (18:00) before 17:00, **Tomorrow
   morning** (my default time tomorrow) from 17:00; and **More**.
2. Given I tap one, then its Alert is added as a pill (NEW-004); the pill
   tapped doesn't stay chosen, and tapping it again adds nothing new.
3. Given More, then it offers In 1 hour, This evening (until 18:00),
   Tomorrow morning, This weekend (the next Saturday at my default time
   still to come) each with its time, and
   "Pick a date and time", which opens the Alert dialog.
4. Given a phone, then the pills scroll sideways rather than wrapping.

### NEW-006 — A Thought from "New"

**As** Joe, **I want** to jot a Thought as before, **so that** an idea
with no time is still captured in seconds.
Priority: Must · Status: verified (`capture.spec.ts`, `today.spec.ts`)

Acceptance criteria
1. Given the line has no time, then my Labels show under the quick times,
   to give the Thought (CAP-009); with a time, they hide (a Reminder has
   none).
2. Given I save a Thought, then it waits in Notes' Thoughts tab (NTE-005),
   counted on Today's Thoughts line (TDY-001 3).

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
