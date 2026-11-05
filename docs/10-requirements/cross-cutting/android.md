# The Android app and widgets

*Stage 7 ([plan](../../50-progress/plans/stage-7.md)). The decisions come
first, then the requirements (drafted 5 November, from Joe's answers that
day, and his answers to its open points), then the deferred Thought
widget. How it is built: ADR-0061–0064 (Provisionally agreed).*

## Decisions

- **LifeOS on Joe's Android phone becomes an app** (Capacitor,
  [ADR-0034](../../20-architecture/adr/0034-stack.md)), installed from an
  APK, not from Google Play. On his phone it takes the installed web app's
  place.
- **It loads the live site** (Joe, 5 November), so every deploy reaches
  the phone at once, as it does now. Offline, it works as the installed
  web app does ([offline](offline.md)).
- **The web version is unchanged.** A computer, an iPhone, and the
  installed web app on any Android phone keep the website, its share
  target, its service worker and Web Push. The Android app differs only
  where it must:

  | | The web | The Android app |
  |---|---|---|
  | Signing in, connecting Google Calendar | In the page | In the phone's browser, then back to the app |
  | Notifications | Web Push | Firebase Cloud Messaging (FCM) |
  | On time | Within the minute run | Set on the phone, to the minute ([reminders](reminders.md#rem-010--on-time-on-the-android-app)) |
  | Alarms | None | A Reminder marked Alarm rings ([REM-011](reminders.md#rem-011--an-alarm)) |
  | Sharing into LifeOS | The manifest's share target | Android's share sheet, the same `/share` |
  | Widgets | None | Today, the day's Plan |

- **One widget: Today**, the day's Plan, with "+" to add to it as Plan
  does (Joe, 5 November). No others. A widget for capturing a Thought is
  [deferred](#deferred): Joe may change how Thoughts work.
- **A widget shows what the phone holds**; it doesn't run LifeOS's own
  code. The app keeps what Today shows on the phone whenever it changes,
  and a message from the server says when something changed elsewhere.
- **Widgets follow the design system**: its tokens and Type colours, dark
  and light with the phone ([design system](../../30-design/README.md)).
- **Health Connect is Stage 8's**, with Cardio, where it is first used
  (Joe, 5 November).

## Requirements

*Stage 7, agreed by Joe on 5 November. Statuses: proposed → agreed → built → verified. What the browser
tests can't reach is verified by Joe on his phone.*

### AND-001 — Install and update the app

**As** Joe, **I want** LifeOS as an app on my Android phone, kept up to
date without reinstalling, **so that** it can do what the web app can't.
Priority: Must · Status: agreed

Acceptance criteria
1. Given the APK, when I install it, then LifeOS is on my home screen with
   its icon, opens on Inbox, and shows as "LifeOS".
2. Given a change is deployed, then the app has it the next time it opens,
   as the web app does now; only a change to the app's own native parts
   needs a new APK, and the app says when one is ready to install.
3. Given I installed the app, then I can remove the installed web app
   from the phone and lose nothing: my data is on the server and the app
   fetches it.

### AND-002 — Sign in, and connect Google Calendar

**As** Joe, **I want** to sign in to the app and connect Google Calendar
there, **so that** it works as the web does.
Priority: Must · Status: agreed

Acceptance criteria
1. Given I'm signed out, when I choose Sign in with Google, then the
   phone's browser opens Google's sign-in and, once I've chosen my
   account, brings me back to the app signed in.
2. Given I'm signed in, then I stay signed in as I do on the web, until I
   sign out.
3. Given Settings → Google Calendar, when I connect it, then the same
   browser-and-back happens, and Calendar shows as connected.
4. Given I cancel in the browser, then I'm back in the app where I was,
   nothing changed.

### AND-003 — Like the web app, on the phone

**As** Joe, **I want** the app to behave like an Android app, **so that**
nothing about it feels like a web page.
Priority: Must · Status: agreed

Acceptance criteria
1. Given no signal, when I open the app, then it shows what it held and
   takes writes, sent when the signal returns
   ([OFF-*](offline.md)).
2. Given a popup, Sheet or menu is open, when I press Back, then it
   closes; otherwise Back goes to the page before, and from the first
   page it leaves the app.
3. Given a LifeOS link (joestables.uk) opened from another app, then it
   opens in the app, on that page.
4. Given the status bar and the gesture bar, then the app's pages sit
   between them, in the theme's colours, dark and light.
5. Given Cooking, then the screen stays awake as it does on the web
   ([ADR-0056](../../20-architecture/adr/0056-cooking-on-the-device.md)).

### AND-004 — Share into LifeOS from the app

**As** Joe, **I want** LifeOS in the share sheet when it's the app, **so
that** saving a recipe idea works as before
([RCP-003](../modules/recipes.md#rcp-003--save-an-idea-from-another-app)).
Priority: Must · Status: agreed

Acceptance criteria
1. Given I share a link from TikTok, Instagram or a web page to LifeOS,
   then RCP-003's criteria hold: an Idea kept at once, "Saved as an idea",
   back to the app I shared from; a link saved before named, with Open; no
   signal, kept and sent later.
2. Given the app is installed, then LifeOS appears once in the share
   sheet.

### AND-005 — The web stays as it is

**As** Joe, **I want** the computer, the iPhone and the web app unchanged
by the Android app, **so that** nothing I or my girlfriend use breaks.
Priority: Must · Status: agreed

Acceptance criteria
1. Given the website, the installed web app on an iPhone or Android, or a
   computer, then sign-in, Web Push notifications with their buttons, the
   share target and offline work exactly as before, and every browser and
   screenshot test passes unchanged.
2. Given code only the Android app uses, then the web never runs it.

### WID-002 — Today's Plan on the home screen

**As** Joe, **I want** today's Plan on my home screen, **so that** I see
the shape of my day without opening anything.
Priority: Must · Status: agreed

Acceptance criteria
1. Given the widget, then it shows today's date and today's cards as
   Plan's day shows them (PLN-002): all-day and untimed first, then by
   time; each card its Type's icon and colour, title, and time (or "All
   day"); done ones faded and struck through; only the Types I show on
   Plan (PLN-004).
2. Given more cards than fit, then the list scrolls inside the widget.
3. Given nothing today, then it says "Nothing planned".
4. Given I tap a card, then the app opens on that Item (ITM-001); given I
   tap the date, then Plan opens on today.
5. Given I change something on the phone, then the widget shows it within
   seconds; given it changes elsewhere (on my computer, by my girlfriend,
   from Google Calendar), then within a minute or two while the phone has
   signal; at midnight it moves to the new day.
6. Given no signal, then it shows what the phone last held.
7. Given the widget's size, then I can make it smaller or larger on the
   home screen and it shows as many cards as fit.
8. Given I press the "+" at the widget's top right, then the app opens on
   Plan's today with "+" pressed: I choose among the Schedulable Types,
   and the new Item is dated today, as PLN-006; saving it puts it on the
   widget at once.
9. Given a card, then it has no checkbox, as Plan's cards have none (Joe,
   14 October): I open the Item to tick it.

## Joe's answers (5 November)

To the open points drafted with the spec:

1. A Task from the capture widget: no longer applies, with WID-001
   deferred.
2. Adding from the Today widget: yes, with "+" (WID-002 8). It does what
   Plan's "+" does for today (PLN-006), not capture, so it can add any
   Schedulable Type.
3. Ticking from the Today widget: as on the web, no checkbox (WID-002 9).

## Deferred

Joe, 5 November: he may change how Thoughts work, so the widget for
capturing one waits until he has. Kept as drafted, not agreed.

### WID-001 — Capture a thought from the home screen

**As** Joe, **I want** a widget that captures a Thought, **so that** a
thought is out of my head without finding the app first.
Priority: Must · Status: deferred (Joe, 5 November)

Acceptance criteria
1. Given the widget on my home screen, then it is a single bar reading
   "Capture a thought", with LifeOS's icon.
2. Given I tap it, then capture opens straight away with the keyboard up,
   as CAP-001 in the app: a Thought by default, the switch to Task, dates
   understood (CAP-003), Labels (CAP-009).
3. Given I save, then the Thought (or Task) is kept, offline too, "Thought
   saved" shows, and I'm back on the home screen. Closing without saving
   also goes back to the home screen.
4. Given I'm signed out, then tapping it signs me in first and then opens
   capture.
