# Capture

*Stage 2. The decisions come first; the requirements, drafted at the start of
Stage 2, are at the end.*

## Decisions

- **Quick capture** is a Screen available everywhere; it makes a Thought, which
  lands in Inbox, with a one-tap switch to Task (and Event from Stage 3); a
  deterministic parser offers, never forces, a Task when it spots a date
  ([ADR-0027](../../20-architecture/adr/0027-quick-capture.md), Provisionally agreed).
- **A Thought whose text contains a date gets a Reminder** for that date
  ([ADR-0023](../../20-architecture/adr/0023-reminders.md), Provisionally agreed).
- **A bare date fills do-on**; a deadline must be said ("due fri", "by fri")
  ([ADR-0022](../../20-architecture/adr/0022-repeating-items.md), Provisionally agreed).
- **Sorting a Thought:** convert it in place into a Note, Task, List or other
  Capturable Type, or delete it (archive, with undo)
  ([ADR-0037](../../20-architecture/adr/0037-thoughts.md), Provisionally
  agreed).
- **Capture from outside the app** through a personal capture address
  ([ADR-0028](../../20-architecture/adr/0028-capture-from-outside-the-app.md),
  Provisionally agreed).
- Until Stage 3, an event-shaped line is saved as a Thought or a Task.

## Where capture comes from

- **In the app:** a shortcut, a button; a home-screen shortcut and
  share-to-LifeOS (both Android only).
- **The capture address:**
  - **iOS Shortcuts and Siri** — "Hey Siri, LifeOS: buy oat milk". This also
    covers the iPhone, which has no share target.
  - **Android:** an HTTP-shortcut app or the PWA's own home-screen shortcut;
    a widget later with the wrapper. Google Assistant can't post to a custom
    address since Conversational Actions closed in 2023, and Gemini offers
    no route either (re-checked 10 October 2026: the Gemini app is separate
    from the Gemini API and can't call a web address).
  - **Email** — a forwarding address, so an email or booking confirmation
    becomes a Thought with the email attached. An Edge Function can't receive
    mail, so this needs an **inbound-email service** in front, chosen in
    Stage 2 ([plan](../../50-progress/plans/stage-2.md#questions-for-joe-step-1)):
    Cloudflare Email Routing with an Email Worker (free; needs the domain's
    DNS on Cloudflare) or Postmark's inbound webhook.
  - Anything else that can make a web request (a browser bookmarklet for
    "save this page as a recipe idea").
- Capture's "buy oat milk" matches an Ingredient if one exists (Stage 4).


## Requirements

*Stage 2. Statuses: proposed → agreed → built → verified.*

### CAP-001 — Capture a thought in one line

**As** Joe, **I want** to jot a thought down in one line from anywhere,
**so that** it's out of my head in seconds and I can sort it later.
Priority: Must · Status: proposed

Acceptance criteria
1. Given I am on any page, when I open capture, type "ceramics class for the
   anniversary?" and save, then a Thought is created in my Personal Space and
   appears in Inbox, waiting to be sorted.
2. Given I switch capture to Task before saving "renew insurance fri", when I
   save, then a Task "Renew insurance" is created, to do on Friday, with my
   default Reminder at 09:00 on Friday.
3. Given I type "call mum fri 6pm" and leave it as a Thought, when the parser
   finds the date, then it offers "Task, Fri 18:00?" and does not switch on
   its own.
4. Given I have no signal, when I save, then the Item appears immediately and
   is sent when the connection returns.

### CAP-002 — Capture is one key or one tap away

**As** Joe, **I want** capture within reach on every page, **so that**
nothing is quicker than opening LifeOS and typing.
Priority: Must · Status: proposed

Acceptance criteria
1. Given I am on any page on a computer, when I press `N`, then capture opens
   with the cursor in the box; `Enter` saves and closes, `Esc` closes without
   saving.
2. Given I am on any page on a phone, then a capture button is in reach of
   my thumb, and tapping it opens capture with the keyboard up.
3. Given I save, then a toast says what was made ("Thought saved", "Task
   saved · Fri") with Undo, and Undo archives it.

### CAP-003 — Dates and times are understood, the same way everywhere

**As** Joe, **I want** to type dates the way I say them, **so that** I never
open a date picker for the common cases.
Priority: Must · Status: proposed

The parser is deterministic and runs on the device (no signal, no LLM);
the capture address and the Tasks View use the same one.

Acceptance criteria (unit tests)
1. Given "renew insurance fri", then do-on is the coming Friday (today, if it
   is Friday). "today", "tomorrow", "tmrw", weekday names, "next week" (next
   Monday), "in 3 days", "12 oct" and "12/10" (day first) are understood.
2. Given "call mum fri 6pm", then do-on is Friday and do-at 18:00; "18:00",
   "6.30pm" and "6:30pm" are understood. A time with no date is today, or
   tomorrow if the time has passed.
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
**so that** a jotted "dentist tue 3pm?" isn't forgotten in Inbox.
Priority: Should · Status: proposed

Acceptance criteria
1. Given I save "dentist tue 3pm?" as a Thought, then it has a fixed Reminder
   for Tuesday at 15:00; with a date but no time, at my default time.
2. Given I then convert it into a Task, then the Reminder stays
   ([ADR-0037](../../20-architecture/adr/0037-thoughts.md)).

### CAP-005 — The capture address

**As** Joe, **I want** a private web address that captures a line, **so
that** Siri, shortcuts and other apps can capture without opening LifeOS.
Priority: Must · Status: proposed

Acceptance criteria
1. Given Settings, when I create my capture address, then I see it once, can
   copy it, and LifeOS keeps only a hash of its secret.
2. Given the address, when anything posts "buy oat milk" to it, then a
   Thought is created in my Personal Space; "task renew insurance fri" makes
   a Task with the same parsing and Reminder as in the app.
3. Given I revoke the address in Settings, then posts to it are refused and
   create nothing; I can make a new one.
4. Given more than 30 posts in a minute, then the rest are refused; every
   post is logged without its text.
5. Given any post, then nothing in it is run or followed, it can read
   nothing back, and it can't write outside my Personal Space (database
   test).

### CAP-006 — Capture by voice on the iPhone

**As** Joe, **I want** to say "Hey Siri, LifeOS" and dictate a line, **so
that** capture is hands-free.
Priority: Should · Status: proposed

Acceptance criteria
1. Given a Shortcut set up as [integration setup](../../40-operations/integration-setup.md)
   describes, when I say "Hey Siri, LifeOS" and then "buy oat milk", then a
   Thought "buy oat milk" is in Inbox (checked by hand).

### CAP-007 — Capture by email

**As** Joe, **I want** to forward an email to LifeOS, **so that** a booking
or a request becomes a Thought without retyping it.
Priority: Should · Status: proposed

Acceptance criteria
1. Given my capture email address, when I forward an email to it, then a
   Thought is created whose title is the subject and whose body is the
   email's text.
2. Given the address is revoked, then mail to it creates nothing.

### CAP-008 — Capture from Android's home screen and share sheet

**As** Joe on Android, **I want** a home-screen shortcut to capture and
LifeOS in the share sheet, **so that** a link or a line from another app
lands in Inbox.
Priority: Should · Status: proposed

Acceptance criteria
1. Given LifeOS is installed, when I long-press its icon and choose Capture,
   then capture opens.
2. Given I share a page from another app to LifeOS, then capture opens with
   its title and link filled in.

Non-goals (Stage 2): natural-language repeats ("every monday") in capture;
an LLM in the capture path; matching Ingredients (Stage 4); Events (Stage 3);
attachments from email; a share target on iOS, which has none.
