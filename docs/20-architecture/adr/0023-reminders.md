# ADR-0023: Reminders

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-09 by [ADR-0037](0037-thoughts.md) (Thoughts). 2026-11-09 by [ADR-0065](0065-reminders-alerts-and-the-day.md) (they are called Alerts; Thoughts have none, and a date in a Thought makes none; Stage 7b, as it is built).

## Context

Capturing a reminder must be faster than setting a phone alarm (goal 2).

## Decision

- Called **Reminders**, **attachable to any Item**:
  - *relative* ("1 h before", "08:00 on the day"), anchored to one of the
    Item's times — `starts_at`, `do_on` or `due_on` — so it needs the Item to
    have that time;
  - *fixed* ("Saturday 10:00"), which works on anything, even an undated
    Thought, Note or recipe idea.
  - The delivery job reads a calculated `fires_at`.
- **Defaults per Type**, set once in Settings (e.g. Events 1 h before, Gym 30
  min before, Tasks on the do-on date, Shopping lists none).
- **On a Task, the default Reminder follows the do-on date.** A Task with a
  date but no time is reminded at a **default time per person** (09:00
  unless changed).
- Series Reminders copy to each generated occurrence; changing one
  occurrence doesn't affect the others.
- **Per person:** each member sets their own Reminders on a shared Item;
  snooze moves only yours; completing a Task clears its Reminders.
- **A Thought with a date gets a Reminder:** if capture finds a date in a
  line saved as a Thought, the Thought gets a fixed Reminder for that date, at the time
  given or the person's default time.

## Consequences

Location Reminders ("near Tesco") wait for the native wrapper. How
Reminders are delivered: [ADR-0044](0044-reminder-delivery.md)
(Provisionally agreed).
