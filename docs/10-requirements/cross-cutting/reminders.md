# Reminders and notifications

*Stage 2 (Web Push); Stage 7 (the Android app: FCM, on time, alarms; REM-010
and REM-011 drafted 5 November). The decisions come
first; the requirements, drafted at the start of Stage 2, are at the end.*

## Decisions

- **Reminders attach to any Item**, relative to one of its times or at a
  fixed time; defaults per Type; a Task's default follows its do-on date at
  the person's default time (09:00 unless changed); an Event I make, 30
  minutes before it starts if it has a time, and one from Google Calendar
  none (Stage 3, [events](events.md#decisions)); Meals and Shopping lists
  none, though I may add one to either (Stage 4); per person; a Thought with
  a date gets one ([ADR-0023](../../20-architecture/adr/0023-reminders.md),
  Provisionally agreed).
- **Anchors per Type** are tabled in the
  [data model](../../20-architecture/data-model.md#time-fields-per-schedulable-type).
- **Delivery:** a minute job finds what is due and an Edge Function sends
  it by Web Push to each of the person's devices, recording each delivery
  (`core.reminder_deliveries`, `core.push_devices`)
  ([ADR-0044](../../20-architecture/adr/0044-reminder-delivery.md),
  Provisionally agreed).
- **Every Reminder goes to all of a person's devices** that have
  notifications on. There is no choosing a device per Reminder (Joe: it is
  always his phone, the installed app).
- **iOS shows no notification buttons.** Web Push works on iOS 16.4+ only
  from the Home Screen app, and its notifications have no actions
  (re-checked 10 October 2026), so on the iPhone a notification opens the
  Item. Done and Snooze buttons are for Android and computers.
- **Where they are set:** a Task's Reminders in its popup, on its do-on or
  due date or at a set time; an Event's in its popup, some minutes before it
  starts ("30 minutes before"), on the day it starts or days before at a
  time ("1 day before at 18:00"; an all-day Event's only so), or at a set
  time (Stage 3); a Thought's at a set time. Notes get theirs
  with their own page's menu, later.
- **What a notification says:** the Item's title (an overdue nudge
  "Overdue: …"), its do-on time and due date, or an Event's start and place
  ("Sat 17 Oct 13:00 · The Ivy"), Done (Tasks only) and "Snooze 1 hour". The digest says only its counts ("2 overdue · 3 today · 4 to
  sort") and opens Inbox.
- **On the Android app (Stage 7):** notifications come by Firebase Cloud
  Messaging (FCM) in place of Web Push, with the same Done and Snooze;
  each Reminder is also set on the phone, so it arrives on time even when
  the phone is idle; and a Reminder can be marked **Alarm**, to ring until
  dismissed (Joe, 5 November; [the Android app](android.md)). The web keeps
  Web Push.
- **Later:** location Reminders ("near Tesco").

## Requirements

*Stage 2. Statuses: proposed → agreed → built → verified. A real
notification on each platform is checked by hand.*

### REM-001 — Turn on notifications for a device

**As** Joe, **I want** to turn notifications on for each phone and computer
I use, **so that** Reminders reach me wherever I am.
Priority: Must · Status: verified

Acceptance criteria
1. Given none of my devices has notifications on, then Inbox offers to turn
   them on.
2. Given Settings, when I turn notifications on for this device and allow
   them, then this device receives my Reminders from then on; turning them
   off stops it. Settings lists my devices, and I can remove one.
3. Given an iPhone browser that isn't the installed app, then I'm told to
   add LifeOS to the Home Screen first, as iOS allows notifications only
   there.
4. Given the Android app (Stage 7, built, Joe checks it on his phone), then turning notifications
   on there works the same way, the device listed as "Android app"; the
   installed web app's entry on that phone can then be removed.

### REM-002 — A Task reminds me on its do-on date

**As** Joe, **I want** a dated Task to remind me without my asking, **so
that** setting a date is enough.
Priority: Must · Status: verified

Acceptance criteria
1. Given I give a Task a do-on date with no time, then it has a Reminder at
   my default time (09:00) on that date; with a time, at that time. In New
   task it shows among the Reminders before I save, so I can see it is
   there, and change or remove it there (Joe, 4 November). On a shared
   Task each member has their own default, as their Settings give it
   ([HSH-005](spaces-and-sharing.md#hsh-005--share-tasks-and-events) 4).
2. Given I move the do-on date or time, then the Reminder moves with it;
   if I removed or changed it, moving the date doesn't bring it back or add
   a second.
3. Given I clear the do-on date, then that Reminder goes; a Reminder I set
   myself at a fixed time stays.
4. Given a repeating Task, then each occurrence has the series' Reminders,
   and changing one occurrence's Reminder changes no other.

### REM-003 — Set my own Reminders

**As** Joe, **I want** to add, change and remove Reminders on any Item,
**so that** I'm reminded when it suits me.
Priority: Must · Status: verified (on Tasks, Thoughts and Events)

Acceptance criteria
1. Given an Item, then I can add a Reminder at a fixed date and time, or,
   on a Task, relative to its do-on or due date ("on the day at 08:00",
   "1 day before at 18:00"), on an Event, relative to its start
   ([EVT-003](events.md#evt-003--an-event-reminds-me)); it may have several.
2. Given a relative Reminder, when the date it hangs on moves, then the
   Reminder moves with it.
3. Given I remove a Reminder, then it doesn't fire.

### REM-004 — Delivered on time, once

**As** Joe, **I want** each Reminder to arrive on time and only once, **so
that** I can trust it instead of an alarm.
Priority: Must · Status: verified (a real notification on each device is checked by hand)

Acceptance criteria
1. Given a Reminder at 09:00, then a notification with the Item's title (and
   its do-on time or due date) reaches each of my devices with
   notifications on within a minute of 09:00.
2. Given anything is retried on the way, then each device gets the
   notification once; given two of my Reminders on one Item fall at the
   same moment (its default and one I set at its time), then each device
   gets one notification, and snoozing it doesn't send the other.
3. Given LifeOS couldn't send it at 09:00, then it is sent as soon as it can
   be, up to 12 hours late; after that it is recorded as missed and not
   sent.
4. Given a device can no longer receive notifications, then it stops being
   sent them, and the failure is recorded where Claude can find it.
5. Given the Task is done, or the Item archived, before 09:00, then nothing
   is sent.
6. Given I can no longer see the Item (I left its Household), then nothing
   is sent; and a Reminder of mine can only be on an Item I can see, made
   or changed (multi-user bug hunt, 4 November).
6. Given a Reminder whose time had already passed when it was set (a Task
   captured at 15:00 for today, its default at 09:00), then nothing is
   sent.

### REM-005 — Done and Snooze from the notification

**As** Joe on Android or a computer, **I want** to tick a Task or snooze it
from the notification, **so that** I needn't open the app.
Priority: Must · Status: built (verified but for a press with no signal, checked by hand)

Acceptance criteria
1. Given a Task's or a Thought's notification, when I choose Done, then it
   is done (a Thought leaves Inbox), offline too (sent when the connection
   returns).
2. Given any Reminder's notification, when I choose Snooze, then it comes
   back in one hour, for me only.
3. Given an Item that isn't Completable (a Note), then the notification
   offers Snooze only.

### REM-006 — A notification opens its Item

**As** Joe, **I want** tapping a notification to open what it's about,
**so that** I can act on it at once — on the iPhone above all.
Priority: Must · Status: verified

Acceptance criteria
1. Given a notification, when I tap it, then LifeOS opens on that Item's
   own page or popup (ITM-001), signed in, on any platform.

### REM-007 — Reminder defaults in Settings

**As** Joe, **I want** to set my default time and which Reminders I get
by default, **so that** the defaults suit my day.
Priority: Should · Status: verified

Acceptance criteria
1. Given Settings, when I change my default time to 08:00, then new
   date-only Reminders are at 08:00, and existing ones are unchanged.
2. Given Settings, then I can turn off the Task default (a dated Task
   reminds me on its do-on date) and the Thought default (a dated Thought
   reminds me); from Stage 3, the Event default (30 minutes before).

### REM-008 — A morning digest

**As** Joe, **I want** one notification each morning saying what needs me,
**so that** I know the shape of the day before opening anything.
Priority: Should · Status: verified

Acceptance criteria
1. Given the digest is on (it is by default, at 07:00), then each morning
   one notification says "2 overdue · 3 today · 4 thoughts", and tapping it
   opens Inbox. A Household's shared Tasks count for every member, as they
   are in every member's Inbox (HSH-005 3).
2. Given nothing needs me, then no digest is sent.
3. Given Settings, then I can change its time or turn it off.

### REM-009 — Overdue nudges

**As** Joe, **I want** a nudge when a Task goes past its due date, **so
that** a deadline doesn't slip by quietly.
Priority: Should · Status: verified

Acceptance criteria
1. Given a Task due yesterday that isn't done, then I get one notification
   at my default time today: "Overdue: Renew insurance", with Done and
   Snooze.
2. Given the morning digest is on, then overdue Tasks are counted in it
   instead, and no separate nudge is sent.
3. Given a Task stays overdue, then it is nudged only once.

### REM-010 — On time on the Android app

**As** Joe, **I want** a Reminder on the Android app at its minute, even
when the phone has been idle, **so that** I can trust it instead of a phone
alarm.
Priority: Must · Status: built (Stage 7, step 8a; criterion 5, the Cooking timer, with 8b; Joe checks it on his phone)

Acceptance criteria
1. Given a Reminder at 09:00, then the Android app notifies me at 09:00,
   not some seconds or minutes later, whether or not the phone was idle.
2. Given the Reminder was made, moved, snoozed or deleted on another
   device, then the phone's copy follows within a minute or two while it
   has signal, and every Reminder is checked again whenever the app opens.
3. Given the phone loses signal after a Reminder was set on it, then it
   still arrives on time.
4. Given the server's own notification for the same Reminder also
   arrives, then I see one notification, not two (REM-004 2).
5. Given a Cooking timer, then its end is on time the same way
   ([ADR-0056](../../20-architecture/adr/0056-cooking-on-the-device.md)).

### REM-011 — An alarm

**As** Joe, **I want** to mark a Reminder as an Alarm, **so that** LifeOS
can wake me or interrupt me as my phone's alarms do, and they can go.
Priority: Must · Status: agreed (Stage 7)

Acceptance criteria
1. Given a Reminder's settings in an Item's popup, then I can mark it
   Alarm; it is off by default.
2. Given an Alarm comes due on the Android app, then it rings with sound
   (and vibrates) until I stop it, showing over the lock screen with the
   Item's title and time, Stop and Snooze; Done too on a Completable
   Item.
3. Given an Alarm on a device that isn't the Android app, then it arrives
   there as an ordinary notification.
4. Given the phone is on silent or Do Not Disturb, then an Alarm still
   rings, as the clock app's do.

Non-goals (Stage 2): choosing which device a Reminder goes to;
location Reminders (later); notification
buttons on iOS, which it doesn't offer; email or SMS reminders; setting a
Reminder for someone else (each member sets their own, HSH-005 4); quiet
hours.
