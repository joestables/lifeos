# Capture

*Stage 2. Requirements not yet written beyond CAP-001; this page records the
decisions they build on.*

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
    address since Conversational Actions closed in 2023; re-check whether
    Gemini offers a route before Stage 2.
  - **Email** — a forwarding address, so an email or booking confirmation
    becomes a Thought with the email attached. An Edge Function can't receive
    mail, so this needs an **inbound-email service** in front (Cloudflare
    Email Routing, Postmark or Mailgun inbound), chosen in Stage 2.
  - Anything else that can make a web request (a browser bookmarklet for
    "save this page as a recipe idea").
- Capture's "buy oat milk" matches an Ingredient if one exists (Stage 4).

## Requirements

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

Non-goals: natural-language recurrence in the first release; an LLM in the
capture path.
