# Gym

*Stage 5, the `fitness` Module's Gym page. **Agreed by Joe, 29 October**,
written from Joe's notes (22 October) and his comments on the first and
second drafts (29 October); changed by his comments on the first and
second design passes (31 October, 1 November). Claude's own suggestions
are marked **(suggested)**: Joe agreed them provisionally (those of 31
October on 1 November), and may change them. The recovery engine, Joe's own, is
[Annex A](#annex-a--the-recovery-engine). Cardio is Stage 8; Goals follow
Gym in Stage 5 with their own spec.*

**In one line:** my exercises, templates and workouts; logging a workout
at the gym; how recovered each muscle is; and how each muscle and
exercise is progressing
([ADR-0026](../../20-architecture/adr/0026-navigation-drawer.md),
Provisionally agreed).

## Decisions

### Equipment and muscle groups

- **All weights are in kg** (Joe, 29 October).
- **Equipment types are all mine**, none built in, each with an
  **increment**: the step a weight goes up or down by (Joe, 22 and 29
  October). Increments are exact decimals, never rounded: 0.625 kg is
  0.625 kg, and 0.625 × 3 is 1.875 kg. **No Exercise can be made until I
  have at least one equipment type.**
- **Twenty muscle groups are built in**, each in one of four categories
  (Joe, 29 October):

  | Category | Muscle groups |
  |---|---|
  | Push | Chest, Front delts, Lateral delts, Triceps |
  | Pull | Lats, Traps, Rear delts, Biceps, Brachialis, Forearms |
  | Core | Abs, Obliques, Erectors |
  | Legs | Glutes, Quads, Hamstrings, Adductors, Abductors, Calves, Tibialis |

- **I can add muscle groups of my own**, each with a category (Joe, 22 and
  29 October). Built-in groups can't be renamed or deleted, and each has a
  place on the body map; my own groups are in every full list of groups,
  but not on the map (Joe, 29 October).
- **Each group has a recovery type**, fast, normal or slow, which sets how
  quickly it recovers ([Annex A](#a2-inputs-and-settings)). Defaults
  (Joe, 29 October): fast — Lateral delts, Rear delts, Biceps, Brachialis,
  Forearms, Triceps, Abs, Obliques, Calves, Tibialis; normal — Chest, Front
  delts, Lats, Traps, Adductors, Abductors; slow — Erectors, Glutes, Quads,
  Hamstrings.
- **Each group has two weekly targets:** its **desired weekly frequency**,
  how many workouts a week train it (Joe, 1 November), and how many stimulus sets a week it gets (Joe, 29 October).
- Equipment, muscle groups and their settings are reference data, kept in
  Settings → Gym
  ([ADR-0014](../../20-architecture/adr/0014-reference-data-and-labels.md),
  Provisionally agreed).

### Exercises

- **An Exercise has a name, an equipment type, exactly one primary muscle
  group, any number of secondary groups and a current set** (Joe, 22 and 29
  October), and optionally its setup and form notes ("Setup / form notes";
  Joe, 31 October).
- **An Exercise has no goal.** Goals for an exercise ("Bench 70 kg × 8")
  are kept in the Goals app, later in Stage 5 (Joe, 31 October).
- **A secondary group has a contribution**, 0.1 to 0.9 in steps of 0.1;
  the primary group's is always 1.0 (Joe, 29 October). Bench press: Chest
  primary, Triceps 0.4, Front delts 0.3.
- **The current set is a weight and reps** — "60 kg × 8", called
  **Current** in the app (Joe, 1 November) — and every Exercise has one (Joe, 29 October). A workout's set starts at it, and it
  shows on the exercise while I log (Joe, 31 October). I change it by
  hand, or from a workout's review.
- **Strength** measures a set: weight × (1 + (reps + RIR) ÷ 30), counting
  RIR as reps I could still have done — Epley's formula, which the app
  calls Strength and never names (Joe, 29 and 31 October). Only sets of
  1–12 reps have one (Joe, 29 October). A current set, having no RIR of
  its own, is taken at my preferred RIR, so a set matching it at that RIR
  equals it rather than beating it (Joe, 29 October).
- **The PR is worked out, never typed:** the set with the best strength,
  with its date (Joe, 22 and 29 October).
- **Changing an Exercise's muscle groups changes readiness at once:** the
  recovery engine replays past workouts with the new groups and
  contributions (Joe, 29 October; [Annex A](#a4-when-to-recompute)).
- **Archived, not deleted:** an archived Exercise leaves the library,
  pickers and swaps, and keeps its history
  ([ADR-0032](../../20-architecture/adr/0032-delete-means-archive.md),
  Provisionally agreed). One never used in a workout can be deleted
  (suggested).
- **A name is unique** among my Exercises, archived ones included
  (suggested).

### Templates

- **A Workout template is a name and an ordered list of exercises, each
  with a number of sets**, set with a stepper (Joe, 22 and 31 October).
  Weight, reps and RIR are never part of a template.
- **A template looks like a workout**: the same exercise cards, with a drag
  handle where a workout's expand button is, and no sets to log (Joe, 31
  October).
- **An exercise added to a template comes with one set** (Joe, 29
  October). I reorder exercises by dragging (Joe, 22 October).
- **A template shows its coverage:** the stimulus sets it gives each muscle
  group, worked out as the recovery engine would, each set taken at my
  **preferred RIR** (a Gym setting) and each exercise's contributions
  ([Annex A](#a31-stimulus-per-set); Joe, 29 and 31 October).
- **Deleting a template** sends it to Recently deleted; workouts that
  followed it keep their copy
  ([ADR-0013](../../20-architecture/adr/0013-occurrences-snapshot-their-definition.md),
  Provisionally agreed).

### A workout

- **A Workout is planned for a day** — the one I pick, or today; a day
  only, never a time (Joe, 29 October) — from a template or from scratch,
  and starts only when I press **Start** (Joe, 22 October). A planned
  Workout is on Plan
  ([ADR-0029](../../20-architecture/adr/0029-plan-reads-core-items.md),
  Provisionally agreed) and always Personal
  ([spaces and sharing](../cross-cutting/spaces-and-sharing.md)).
- **Its states:** Planned → In progress → Complete; or Skipped, when its
  day passes without it starting. One Workout is in progress at a time
  (Joe, 29 October). **Each state is a coloured pill** with its word:
  Complete green, In progress amber, Planned grey, Skipped red (Joe, 31
  October).
- **Starting copies the template** — each exercise and its number of sets
  — and each exercise's current set as it stood, so a workout is always
  read against what it was (ADR-0013).
- **A workout is logged on the phone** (Joe, 1 November): its screens are
  designed for a phone first; a computer shows the same in one column.
- **Every exercise starts in the backlog** (Joe, 22 October). **Add** moves
  one into the session when I begin it, so the session's order is the
  order I did them in (Joe, 31 October). Nothing in a session is reordered
  by hand.
- **Several exercises can be under way at once:** any exercise in the
  session takes more sets until I mark it done, and marking it done can be
  undone (Joe, 29 October). Supersets need nothing more.
- **Each exercise in the session expands and collapses**, its button first
  on its card (Joe, 29 and 31 October). Under its name, collapsed or not:
  sets logged of the template's number ("2 of 3 sets"). Expanded: its form
  notes, then its **Current** set in the same style with a dumbbell icon,
  then its sets; nothing more: no best set, no "last time" (Joe, 31
  October, 1 November).
- **The template's number of sets is a guide, not a limit:** no empty sets
  wait to be filled; **Log set** is always there, for as many sets as I do
  (Joe, 1 November).
- **A set is logged in a popup:** weight and reps as steppers side by
  side, headed "Weight (kg)" and "Reps", the steppers showing only the
  numbers, then RIR as buttons 0 to 5; they start at the Current set and
  my preferred RIR; weight steps by the equipment's increment, reps by 1
  (Joe, 22, 29 and 31 October, 1 November). Log set keeps what the
  steppers say; **Quick**, at the popup's bottom left, keeps a quick set
  instead (Joe, 3 November).
- **A quick set** — for a deload week I don't want on the record (Joe, 31
  October) — has no weight, reps or RIR. It counts towards sets done and,
  for the recovery engine, as 10 reps at RIR 2
  ([Annex A](#a2-inputs-and-settings)); it has no strength, so is never a
  PR, and is left out of progression and Strength history.
- **Logged sets are a quiet table** — Set, kg, Reps, RIR — on a phone and a
  computer, each row with an edit button that opens it in the same popup to
  change, or Delete; a quick set's row shows dashes (Joe, 1
  November). Where a set is written as text (Strength history), RIR reads
  in brackets, "(2 RIR)".
- **Adding and swapping go by muscle group** (Joe, 31 October): all the
  groups first, with a search; a group lists the exercises it is primary
  for, then those it is secondary for, a secondary's contribution in
  brackets ("Dips (0.5)"). An exercise added in a session comes with one
  set (Joe, 29 October).
- **An exercise is marked done** when I've done the sets I want, whatever
  the template said (Joe, 22 October).
- **Ending asks how it went, as stars, and my motivation beforehand, as
  Low, Okay or High** — three pills as wide as their words, each a face and
  its word, coloured red, amber and green when chosen (Joe, 22, 29 and 31
  October, 1 November), with optional notes; then the workout opens read-only for
  its review.
- **The review shows each exercise's Current set and PR as two figures,
  then what I logged as the same table, with each set's strength** (Joe, 1
  November). **Update current** opens a popup offering the
  workout's best set by strength, weight and reps side by side to change
  before saving, as in the set popup — the unit in the heading, never in
  the stepper (Joe, 3 November); the choice is mine (Joe, 22, 29 and 31 October, 1
  November). An exercise whose best set beat its Current set says so beside
  the button, so I know which to update (Joe, 1 November).
- **No rest timer** (Joe, 29 October).

### Recovery

- **The recovery engine** ([Annex A](#annex-a--the-recovery-engine); Joe,
  29 October) turns logged sets into each muscle group's **readiness**,
  0–100 %, at any moment, and the **stimulus sets** each workout gave it.
  It uses reps, RIR and contributions, not weight.
- **A muscle group is trained** in a workout when it gets 0.5 stimulus sets
  or more — the engine's own threshold
  ([Annex A](#a35-novelty-factor)) — so a workout counts towards a group's
  frequency only then (Joe, 29 October).
- **Average frequency** is how many workouts a week trained a group,
  averaged over the last 28 days: "×2.1" (Joe, 1 November).
- **The week is the last seven days** for weekly targets (Joe, 29
  October).
- **The body map** shows each built-in group's readiness, front and back,
  as a colour on one continuous scale — 0 % red, through amber, to 100 %
  green, with no bands — with no key under it (Joe, 22, 29 and 31
  October; [ADR-0043](../../20-architecture/adr/0043-colour-by-type.md),
  Provisionally agreed). The scale runs between the design system's
  `--destructive`, `--warning` and `--success`. **The map is a rendered
  figure** (Joe, 3 November;
  [ADR-0060](../../20-architecture/adr/0060-body-map-rendered.md),
  Provisionally agreed): a realistic body that looks 3D, front and back,
  each built-in group its own region with the body's light and shade over
  its colour; the head, hands, feet and muscles outside the twenty stay
  the body's neutral colour. Its look was chosen from look-dev boards:
  Slate, the muscles' fibres kept, short hair, the arms turned out and 15°
  in, the outline trimmed (Joe, 3 November).
- **Looking ahead:** a slider from Now to +48 hours, under the map, shows
  readiness as it will be then, if I train nothing more (Joe, 31 October);
  it sits in from each side by an hour's width (Joe, 3 November).
- **Every muscle group is listed beside the map**, each with a ring
  showing its readiness, when it was last trained and its average
  frequency, and nothing more; sorted by readiness, most recently trained
  or most frequently trained, either way round (Joe, 31 October and 1
  November) — on a phone the sorts say Readiness, Recent and Frequency
  (Joe, 3 November).
- **Averages are over the weeks I have:** an average a week — frequency
  over 28 days, Progression's over its period, All workouts' weekly
  sessions — is over the whole weeks closest to the time since my first
  workout when that is shorter, one at least, so my first weeks don't
  show diluted figures (Joe, 3 November).
- **Overall readiness** is the average readiness of the groups with a
  weekly target above zero (Joe, 29 October), shown a little larger than a
  page title (Joe, 31 October).
- **What to do next is one template**, the most suitable, on the Workouts
  tab under Today when nothing is planned for today (Joe, 31 October and 1
  November).

### Progression

- **Progression is mainly about muscle groups**, and also about each
  exercise (Joe, 29 October), over 1 month, 3 months and a year.
- **On a computer the list and the progression sit side by side:** muscles
  or exercises on the left, the one chosen on the right, with no new page
  (Joe, 31 October). On a phone, choosing one opens its page.
- **The lists stay short, and alike** (Joe, 1 and 3 November): a search,
  filters and a sort; a muscle shows a biceps tile, its category, when it
  was last trained and its stalled exercises; an exercise a dumbbell tile,
  its primary group, when last done and Stalled — not its Current set,
  which is in its figures. Sorts with short names, so the search has room:
  muscles A–Z, Recent and Group (by category); exercises A–Z, Recent and
  Muscle.
- **An exercise's progression** is its best set — the strongest — in each
  workout, as its weight, with its reps over each point; a single line,
  easier to read than a strength figure (Joe, 3 November); its Current set
  and PR, a few figures under the chart, and the best set of each of its
  last ten workouts (Joe, 22 and 31 October).
- **A chart is per workout, on time** (Joe, 3 November): a point for each
  workout, with its own tooltip, and the stimulus bars under it a week
  each, with theirs. **It spans the period chosen, or less:** when what it
  shows began within the period, it spans the whole weeks since — three
  weeks of an exercise show three weeks, not three months.
- **No strength shown as a bare number** where it could be hard to read
  (Joe, 3 November): the figures say weight × reps and RIR; strength stays
  as a column in the review's and Best sets' tables.
- **A muscle group's progression is its exercises' progression:** a pill
  for every exercise it is primary for and every one it is secondary for,
  each pill showing or hiding its line (Joe, 29 and 31 October). There is
  no one figure for the group.
- **At most three primary and three secondary lines at once**, primary in
  the Gym's coral, secondary in grey, each three told apart by solid,
  dashed and dotted, so no other colours are needed. To start, the three
  primary exercises with the most sets in the period show, and no
  secondary (Joe, 31 October).
- **Stimulus sets sit under each chart**, on the same weeks, as bars with
  the weekly target, headed "Chest stimulus", so I can see how volume and progress go together
  (Joe, 29 and 31 October). An exercise's chart shows its primary group's.
- **Stalled exercises are picked out** (Joe, 29 October): an exercise is
  Stalled when, of its last few workouts — **Workouts to stall**, one Gym
  setting for every exercise, 5 to start — none after the oldest beats the
  oldest's best strength; matching it isn't beating it. An exercise done
  fewer times than that is never Stalled, a workout of quick sets alone
  doesn't count as one, and there is no time limit (Joe, 1 November).
- **An exercise's trend** over the period is its best strength in its last
  workout against its first: rising or falling by more than 1 %, flat
  within it (suggested).

## What the page shows

**Gym**, coral, three tabs (Joe, 29 and 31 October):

- **Workouts** — on a computer two columns: on the left **Today** (the
  workout in progress or planned for today, or the one template to do
  next) and **Recent workouts** (the last five, then All workouts); on the
  right **Templates** (the six most recently used, then All templates). On
  a phone they stack: Today, Recent workouts (five), Templates (three)
  (Joe, 1 November). **All workouts** and **All templates** are pages of
  their own.
- **Recovery** — overall readiness, the body map and the look-ahead slider under it;
  beside them, every muscle group with its ring. On a phone the map, then
  the groups.
- **Progression** — Muscles · Exercises, and the period; on a computer the
  list and the chosen one's progression side by side.

A workout, an Exercise (on a phone) and a template each open on their own
page.

## Requirements

*Stage 5. Statuses: proposed → agreed → built → verified. All agreed (29
October); the changes of 31 October agreed with them, the new suggestions
waiting for Joe's yes.*

### GYM-001 — Equipment types

**As** Joe, **I want** to define my equipment types with their own
increments, **so that** steppers move by what my gym's weights actually go
up by.
Priority: Must · Status: verified (`gym.spec.ts`)

Acceptance criteria
1. Given Settings → Gym → Equipment, then I add, rename and delete
   equipment types, each with an increment in kg; there are none to begin
   with.
2. Given an increment of 0.625 kg, then steps of it are exact (0.625,
   1.25, 1.875…) and shown without trailing zeros.
3. Given no equipment types, then New exercise says one is needed first
   and opens Settings → Gym → Equipment.
4. Given an equipment type in use, then it can't be deleted until no
   Exercise uses it; changing its increment changes every Exercise using
   it.

### GYM-002 — Muscle groups

**As** Joe, **I want** the twenty muscle groups built in, by category, and
my own added, **so that** exercises and recovery use the groups I think
in.
Priority: Must · Status: built (1–3 verified by `gym.spec.ts`; 4 built, Recovery and Progression listing every group, the body map the built-in ones)

Acceptance criteria
1. Given Settings → Gym → Muscle groups, then the twenty built-in groups
   are listed under Push, Pull, Core and Legs, and can't be renamed or
   deleted.
2. Given Add, then I name a group of my own and choose its category; it
   can be renamed, and deleted once no Exercise uses it.
3. Given any group, then I set its recovery type and its two weekly
   targets: desired weekly frequency and stimulus sets a week (GYM-017).
4. Given a group of my own, then it has readiness, targets and
   progression like the others, and appears wherever all groups are
   listed, but not on the body map.

### GYM-003 — The exercise library

**As** Joe, **I want** all my exercises in one library, **so that** I can
find one and see where it stands.
Priority: Must · Status: verified (`gym.spec.ts`; 1's Stalled by `gym-progression.spec.ts`)

Acceptance criteria
1. Given Progression → Exercises, then every Exercise I haven't archived
   is listed: name, primary group, when last done, and a Stalled mark;
   its Current set and PR are in its figures (GYM-014 3).
2. Given a search, then Exercises match by name.
3. Given a filter by muscle group (primary or secondary), category,
   equipment or the templates it is in (Joe, 3 November), then only
   matching Exercises show; sorted A–Z, Recent (last done) or Muscle
   (primary group), either way round, my choice kept (suggested).
4. Given an Exercise chosen, then its progression (GYM-014) shows beside
   the list on a computer, or on its own page on a phone, with Edit and
   Archive in its "…".

### GYM-004 — Make and edit an exercise

**As** Joe, **I want** to describe each exercise once, **so that** logging,
swapping and recovery all know what it trains.
Priority: Must · Status: built (1–3 and 5 verified by `gym.spec.ts`; 4 built: readiness, stimulus sets and coverage worked out on the device from each Exercise's groups as they are)

Acceptance criteria
1. Given New exercise, then I give a name, an equipment type, one primary
   muscle group and a current set (weight and reps, as steppers like the
   set popup's: "Current weight (kg)" and "Current reps", stepped or typed;
   Joe, 3 November); secondary groups and
   setup and form notes ("Setup / form notes") are optional. There is no
   goal.
2. Given a secondary group, then I set its contribution with a stepper,
   0.1 to 0.9 in steps of 0.1; the primary group can't also be secondary.
3. Given an Exercise, then I edit any of these; the current set's weight
   moves by its equipment's increment.
4. Given a change to an Exercise's muscle groups or contributions, then
   readiness, stimulus sets and template coverage use the new ones at
   once, for past workouts too.
5. Given a name already used by one of my Exercises, then it is refused,
   and I'm told which.

### GYM-005 — Archive an exercise

**As** Joe, **I want** to archive exercises I no longer do, **so that** the
library and pickers show only what I use.
Priority: Must · Status: verified (the library and a template's Add and Swap by `gym.spec.ts`; a workout's by `gym-workouts.spec.ts`)

Acceptance criteria
1. Given an Exercise, when I archive it, then it leaves the library, Add
   and Swap, with Undo; its workouts, PR and progression are kept, and its
   sets still count in recovery.
2. Given a template containing it, then the template marks it archived,
   and a workout started from that template leaves it out (suggested).
3. Given Settings → Gym → Archived exercises, then I can bring one back as
   it was.
4. Given an Exercise never used in a workout, then it can be deleted
   instead.

### GYM-006 — Templates

**As** Joe, **I want** to make, edit and delete workout templates and see
what each covers, **so that** a planned workout starts with the right
exercises and trains what I mean it to.
Priority: Must · Status: verified (`gym-templates.spec.ts`; 6's when last used by `gym-workouts.spec.ts`)

Acceptance criteria
1. Given New template (on All templates), then I name it and add
   exercises as in a workout (GYM-009); each comes with one set.
2. Given an exercise in a template, then it is a workout's exercise card
   with a drag handle first, and its number of sets as a stepper (1 at
   least); no RIR.
3. Given a template's exercises, then I reorder them by dragging (on a
   phone too) and remove them.
4. Given a template, then its coverage shows the stimulus sets it gives
   each muscle group, by category, each set at my preferred RIR, beside
   each group's weekly stimulus target; it follows every change as I make
   it.
5. Given a template, then I can duplicate it (suggested), rename it, or
   delete it with Undo; past workouts that followed it are unchanged. A
   template a planned workout follows isn't deleted: I'm told which day,
   to change that workout's template or delete it first (Joe, 2 November).
6. Given the Workouts tab, then the six templates I used most recently
   show (three on a phone), each with its exercises, sets and when last
   used, then All templates (GYM-022).

### GYM-007 — Plan a workout

**As** Joe, **I want** to plan a workout for a day, from a template or from
scratch, **so that** it is on Plan and ready when I get to the gym.
Priority: Must · Status: verified (`gym-workouts.spec.ts`; 4 and 5 also by `src/lib/gym.test.ts`)

Acceptance criteria
1. Given New workout, then the three templates I used most recently are
   cards to choose from, the chosen one edged in coral, with Empty, and Another template… choosing any
   other; then a day (today to start). A template's name is the workout's
   name, an empty one is called "Workout" until I rename it.
2. Given a planned workout, then it shows on Plan on its day, coral, and
   opens there.
3. Given a planned workout, then I can change its day or template, or
   delete it, until I start it.
4. Given its day passes without it starting, then it is Skipped, and can
   still be started or deleted.
5. Given a workout anywhere, then its state is a pill with its word:
   Complete green, In progress amber, Planned grey, Skipped red.

### GYM-008 — Start and the backlog

**As** Joe, **I want** every exercise to wait in a backlog until I begin
it, **so that** the session records what I really did, in the order I did
it.
Priority: Must · Status: verified (`gym-workouts.spec.ts`)

Acceptance criteria
1. Given a planned workout, when I press Start, then it is In progress,
   its start time kept, dated today whichever day it was planned for, and
   its template's exercises and their numbers of sets, and each exercise's
   current set, are copied into it.
2. Given a workout in progress, then its exercises sit in the backlog, in
   the template's order, each with Add before its "…"; the session above
   it is empty.
3. Given Add on an exercise in the backlog, then it moves to the foot of
   the session, expanded for logging; exercises already begun stay as
   they are.
4. Given an exercise in the session, then its expand button comes first
   on its card; under its name, sets logged of the template's number ("2
   of 3 sets"), collapsed or not; expanded, its form notes, then "Current
   27.5 kg × 10" in the same style with a dumbbell icon, its sets and Log
   set, always there whatever the template's number.
5. Given several exercises in the session not yet done, then I log sets
   on any of them, in any order, so alternating two (a superset) needs
   nothing more.
6. Given an exercise in the session with no sets logged, then it can go
   back to the backlog.
7. Given another workout already in progress, then Start says so and
   offers to open it.
8. Given I leave the page or close the app, then the workout is just as I
   left it when I come back.

### GYM-009 — Add, swap and remove exercises

**As** Joe, **I want** to add or swap exercises by muscle group, **so
that** a busy machine doesn't break my plan.
Priority: Must · Status: verified (`gym-workouts.spec.ts`; in a template, `gym-templates.spec.ts`)

Acceptance criteria
1. Given Add exercise, in a workout or a template, then every muscle group
   is a button, by category, under a Find an exercise search.
2. Given a muscle group, then its exercises are listed, primary first,
   then secondary with their contribution in brackets ("Dips (0.5)"),
   under "‹ All muscle groups";
   choosing one adds it to the backlog with one set.
3. Given a search, then Exercises match by name across every group; a
   name not in the library can be made there and then (GYM-004 1).
4. Given Swap on an exercise not yet begun, then the same popup opens on
   its primary group, with "‹ All muscle groups"; the chosen exercise takes
   its place and its number of sets, at its own current set.
5. Given an exercise in the backlog, then I can remove it from this
   workout.

### GYM-010 — Log sets

**As** Joe, **I want** to log a set in a popup, tracked or quick, and see
and edit my sets as plain text, **so that** logging is quick and the
session isn't cluttered.
Priority: Must · Status: verified (`gym-workouts.spec.ts`, `src/lib/gym.test.ts`)

Acceptance criteria
1. Given Log set on an exercise, then a popup opens with weight and reps
   as steppers side by side,
   headed "Weight (kg)" and "Reps", starting at its Current
   set, then RIR as buttons 0 to 5, starting at my preferred RIR (or the
   last set I logged on it this workout; suggested).
2. Given a stepper, then weight moves by the equipment's increment and
   reps by 1; each can also be typed. Weight is never below 0 or reps
   below 1.
3. Given Quick, at the popup's bottom left, then the set is kept with no
   weight, reps or RIR (Joe, 3 November); it counts towards sets done and
   in the recovery engine as 10 reps at RIR 2, and nowhere in the record. A
   quick set opened to change has the steppers too: Save keeps what they
   say, Quick keeps it quick.
4. Given logged sets, then they are a table of kg, Reps and RIR, a quick
   set's row showing dashes, each row with an edit button that opens it in
   the same popup to change, or Delete (with Undo).
5. Given an exercise, then its Strength history is in its "…": its ten
   most recent sets, under their workouts, newest first, RIR in brackets,
   PRs marked.
6. Given a logged set with the best strength yet for the exercise, then
   it is marked as a PR; a set of more than 12 reps, or a quick set, has
   no strength, so is never one.

### GYM-011 — Mark an exercise done

**As** Joe, **I want** to mark an exercise done when I've done the sets I
want, **so that** I can see what's left.
Priority: Must · Status: verified (`gym-workouts.spec.ts`)

Acceptance criteria
1. Given an exercise in the session, then I log sets on it until I mark
   it done.
2. Given I mark it done, then it collapses and shows as done; **Done** is
   a button in both states, green and pressed once done, so pressing it
   again is plainly how to undo it (Joe, 3 November).
3. Given a done exercise, then it still opens to show its sets; pressing
   Done again undoes it, and I log or change sets again.

### GYM-012 — End a workout and review it

**As** Joe, **I want** to record how a workout went and then review it,
**so that** I can see what I did and move current sets on.
Priority: Must · Status: verified (`gym-workouts.spec.ts`)

Acceptance criteria
1. Given End workout, then I'm asked "How it went", as one to five stars,
   and "Motivation beforehand", as Low, Okay or High, and notes, all
   optional; End ends it, Complete, with its end time and duration.
2. Given exercises still in the backlog, then End says how many, and they
   are left out of the finished workout (suggested).
3. Given a finished workout, then it opens read-only: date, duration,
   ratings, notes; each exercise in the order done with its Current set and
   PR as two figures, then the sets I logged as a table with their
   strength; and the stimulus sets it
   gave each muscle group (suggested).
4. Given Update current on an exercise, then a popup offers the
   workout's best set by strength as the new Current set, weight and reps
   as steppers side by side, headed "Weight (kg)" and "Reps", which I can
   change before saving; nothing
   changes unless I save.
5. Given an exercise whose best set beat its Current set's strength, then
   "Beat current" shows beside its Update current.
6. *(Suggested)* Given a finished workout, then Edit lets me correct its
   sets, ratings and notes, or delete it; readiness, stimulus sets and PRs
   follow. An exercise whose last set I delete stays, "No sets logged", so
   I can log one again (Joe, 2 November).
7. Given Discard on a workout in progress, then it is deleted, with Undo.

### GYM-013 — Recent and all workouts

**As** Joe, **I want** my recent workouts at hand and every workout in a
list I can filter, sort and summarise, **so that** I can look back at my
training.
Priority: Must · Status: verified (`gym-workouts.spec.ts`; 3–5's filters, sort and figures also by `src/lib/gym.test.ts`)

Acceptance criteria
1. Given the Workouts tab, then Today shows the workout in progress and
   those planned for or done today (Joe, 2 November) — one done shows how
   long it took, "54 min" or "1 h 20", not its start and end (Joe, 3
   November) — and Recent workouts the last five (on a phone too),
   each with its name, date, exercises, sets and state pill, then All
   workouts.
2. Given All workouts, then every workout is listed, newest first, twenty
   to a page with pages to move between.
3. Given its filters (the Recipes library's FilterPanel), then I narrow by
   state, dates, template (any of the current ones, or none), exercise,
   muscle group trained, motivation (low, okay, high), sets logged,
   stimulus sets, exercises done, duration and how it went (the last five
   as ranges); my filters are kept.
4. Given a sort by date, duration, sets, stimulus sets, how it went or
   motivation, either way round, then the list follows, my choice kept.
5. Given what the filters show, then its average sets, average duration
   and weekly sessions ("×3.1", workouts a week over the whole weeks
   closest to the span shown, one at least) are shown above the list.

### GYM-014 — An exercise's progression

**As** Joe, **I want** to see how each exercise is progressing, against
the work its muscle is getting, **so that** I know what's working.
Priority: Must · Status: verified (`gym-progression.spec.ts`; Stalled, the trend and the lines by `packages/fitness`'s tests)

Acceptance criteria
1. Given an Exercise chosen, then a Best set chart shows, for 1 M, 3 M or
   1 Y — or the whole weeks since it was first done, when that is shorter
   — a point for each workout at its strongest set's weight, its reps
   ("×8") over the point, and the PR marked; a point's tooltip says the
   workout's date and name and its weight × reps and RIR (Joe, 3
   November).
2. Given the chart, then its primary group's weekly stimulus sets show as
   bars under it, on the same weeks, with the weekly target, headed
   "Chest stimulus"; a bar's tooltip says its week, its stimulus sets and
   the target.
3. Given the chart, then under it are its current set, its PR (weight ×
   reps, its RIR and date, opening that workout at the top of its page;
   Back returns to where I was) and the change in best strength over the
   chart's span, rising, flat (within 1 %) or falling.
4. Given its last ten workouts, then the best set of each is listed:
   date, weight, reps, RIR and strength.
5. Given its last workouts, as many as Workouts to stall (GYM-020 3), and
   none after the oldest beating the oldest's best strength, then the
   Exercise is marked Stalled, here and in the list.

### GYM-015 — A muscle group's progression

**As** Joe, **I want** to see how each muscle group is progressing, beside
the stimulus sets it got, **so that** I can judge how much volume works
for it.
Priority: Must · Status: verified (`gym-progression.spec.ts`; the starting lines and three of a kind by `packages/fitness`'s tests)

Acceptance criteria
1. Given Progression → Muscles, then every muscle group is listed with its
   category, when it was last trained ("Trained Sat 31 Oct") and its
   stalled exercises, nothing more; found by name, filtered by category
   and muscle group, sorted A–Z, Recent or Group, either way round, my
   choice kept (Joe, 3 November).
2. Given a muscle group chosen, then a chart shows the change in best
   strength of its exercises, a point for each workout, from their first
   in the period (or the whole weeks since it was first trained, when
   that is shorter), with its weekly stimulus sets as bars under it and
   its weekly target; points and bars each have their own tooltip.
3. Given the chart, then every exercise it is primary for and every one
   it is secondary for is a pill, primary then secondary (its contribution
   in brackets), each showing or hiding its line, under the headings
   Primary and Secondary alone.
4. Given at most three primary and three secondary lines at once, then
   primary lines are coral and secondary grey, solid, dashed and dotted in
   the order they were turned on; with three on, the rest of that kind
   can't be turned on until one is off.
5. Given a muscle group first chosen, then its three primary exercises
   with the most sets in the period show, and no secondary.

### GYM-016 — Readiness and the body map

**As** Joe, **I want** to see how recovered I am, now and over the next
two days, overall and muscle by muscle, **so that** I train what's ready.
Priority: Must · Status: verified (`gym-recovery.spec.ts`; 2–4's figures also by `src/lib/gym.test.ts`, the engine by `packages/fitness`'s tests; 1's map and its buttons also by `BodyMap.test.tsx`)

Acceptance criteria
1. Given the Recovery tab, then overall readiness shows as a percentage,
   a little larger than the page title, and the body map, a rendered
   figure that looks 3D, front and back, colours each built-in group on
   one continuous scale, from red at 0 % through amber to green at 100 %,
   with the figure's shading over the colour and no key.
2. Given the slider under the map, from Now to +48 hours, then the map, overall
   readiness and every ring show readiness at that time, if nothing more
   is trained, and the time it stands for is said ("Sat 09:00").
3. Given every group, my own included, then each is listed beside the map
   (under it on a phone) with a ring showing its readiness and its
   percentage, when it was last trained and its average frequency
   ("×2.1", workouts a week over the last 28 days, or over the whole
   weeks since my first workout when fewer), nothing more.
4. Given a sort by readiness, most recently trained or most frequently
   trained (on a phone: Readiness, Recent, Frequency), either way round,
   then the list follows, my choice kept.
5. Given a group, on the map or in the list, when I choose it, then I see
   its readiness, when it was last trained, its average frequency ("×2.4",
   "a week, 28 days", or fewer days in my first weeks; Joe, 2 and 3
   November), its stimulus sets this
   week against its target, and when it will be fully recovered.
6. Given a workout finished, edited or deleted, then readiness follows at
   once, offline too.
7. Given the map on a phone, then every built-in group on it can be
   chosen with a finger, the smallest (Brachialis, Abductors, Tibialis)
   too, and with the keyboard, each named with its readiness.

### GYM-017 — Weekly targets

**As** Joe, **I want** each muscle group to have a desired weekly
frequency and a stimulus-sets target, **so that** coverage and what to do
next know what I'm aiming for.
Priority: Must · Status: verified (1 by `gym.spec.ts`, 2 by `gym-recovery.spec.ts` and `packages/fitness`'s tests, 3 by `gym-templates.spec.ts`)

Acceptance criteria
1. Given each muscle group, then it has a desired weekly frequency
   (workouts a week) and a stimulus-sets target (sets a week), each
   changeable, or 0 for a group I don't train directly. Defaults: twice a
   week (suggested) and 4 stimulus sets (Joe, 29 October).
2. Given the last seven days, then a workout counts towards a group's
   frequency when it gave it 0.5 stimulus sets or more, and every
   workout's stimulus sets for the group add up towards its stimulus
   target.
3. Given a template's coverage, then each group's stimulus target is
   marked against it (GYM-006 4).

### GYM-018 — What to do next

**As** Joe, **I want** to be told which template suits me best today, **so
that** I train what is ready and due.
Priority: Should · Status: verified (`gym-recovery.spec.ts`; the score by `packages/fitness`'s tests, the time since last used by `src/lib/gym.test.ts`)

Acceptance criteria
1. Given no workout in progress, planned for today or done today, then the
   Workouts tab's
   Today suggests one template, the most suitable, with its readiness
   (the average readiness of the muscles it covers) and how long since I
   last used it: "Readiness 96 % · last used 5 days ago", or "never used"
   (Joe, 1 November).
2. Given my templates, then each is scored by the average readiness of
   the groups it covers, its coverage of each, and how long since those
   groups were last trained (Joe, 1 November); a group under 50 % ready
   with 2 stimulus sets or more of coverage keeps a template from being
   suggested (suggested). *(Suggested)* The groups it covers are those it
   gives 0.5 stimulus sets or more; each counts by its coverage, its
   readiness, and how due it is: fully once the days between its desired
   workouts (7 ÷ desired weekly frequency) have passed since it was last
   trained, or if never, half just after, and half for a group with no
   frequency target.
3. Given the suggestion, when I choose it, then New workout opens with it
   chosen for today.

### GYM-019 — The recovery engine

**As** Joe, **I want** readiness and stimulus sets worked out by the
recovery engine I've designed, **so that** they follow how I think muscles
respond to training.
Priority: Must · Status: verified (1 and 2 by `packages/fitness`'s tests, 3 by `gym.spec.ts`)

Acceptance criteria
1. Given logged sets, then each muscle group's readiness and each
   workout's stimulus sets are exactly as [Annex A](#annex-a--the-recovery-engine)
   sets out, its worked examples passing as tests; a set logged without
   numbers counts as 10 reps at RIR 2.
2. Given a workout saved after every other, then it is applied on its own;
   given one edited, deleted or back-dated, or a setting or an Exercise's
   groups changed, then the last 60 days are replayed in order.
3. Given Settings → Gym → Recovery, then I change points per fatigue set
   and the three recovery times, and each group's recovery type; the fixed
   constants aren't offered.

### GYM-020 — Settings for the Gym

**As** Joe, **I want** the Gym's settings in one place, **so that** it
starts each set the way I train.
Priority: Must · Status: verified (`gym.spec.ts`, the credit too; the set popup and coverage by `gym-workouts.spec.ts` and `gym-templates.spec.ts`)

Acceptance criteria
1. Given Settings → Gym, then Preferred RIR (a stepper, 1 to start; Joe,
   29 October) sets the RIR a set's popup starts at, and the RIR a
   template's coverage assumes.
3. Given Settings → Gym, then Workouts to stall (a stepper, 2 to 20, 5 to
   start; Joe, 1 November) sets how many of an exercise's last workouts
   Stalled looks at, for every exercise (GYM-014 5).
4. Given Settings → Gym, then Equipment (GYM-001), Muscle groups and their
   targets (GYM-002, GYM-017), Recovery (GYM-019) and Archived exercises
   (GYM-005) open from there, and one line under them credits the body
   map's source, Z-Anatomy, and its licence, CC BY-SA 4.0
   ([ADR-0060](../../20-architecture/adr/0060-body-map-rendered.md)).

### GYM-021 — The Gym everywhere

**As** Joe, **I want** the Gym to work without signal, **so that** a
basement gym doesn't stop me logging.
Priority: Must · Status: built (1 and 2 verified by `gym-workouts.spec.ts`, 1's readiness by `gym-recovery.spec.ts`; 3's changes kept in the database's activity log, by its triggers)

Acceptance criteria
1. Given no signal, then I start, log, swap, end and review a workout,
   change current sets, and see readiness; everything is sent later.
2. Given Search, then Exercises, templates and workouts are found by name.
3. Given a workout, an Exercise or a template, then its changes are in the
   activity log (suggested).

### GYM-022 — All templates

**As** Joe, **I want** every template in one list I can sort, **so that** I
can find and tidy them.
Priority: Must · Status: verified (`gym-templates.spec.ts`; uses over the last month by `src/lib/gym.test.ts`)

Acceptance criteria
1. Given All templates, then every template is listed — its name,
   exercises, sets and when last used — twenty to a page with pages to move
   between, and New template is the page's main action.
2. Given a sort by most recently used, most used over the last month,
   exercises, sets or A–Z, either way round, then the list follows, my
   choice kept.

Non-goals (Stage 5): cardio (Stage 8); Oura's readiness (Stage 8); a rest
timer; pounds; plate calculators; bodyweight tracking; sharing workouts or
templates with a Household; AI that writes programmes; warm-up sets (I
don't log them); a time of day for a planned workout; goals on an
Exercise (the Goals app's); RIR in a template; suggestions on Plan or in
Inbox; a body map that turns, or views other than front and back.

How it is held and worked out: [ADR-0058](../../20-architecture/adr/0058-fitness-in-the-database.md)
and [ADR-0059](../../20-architecture/adr/0059-recovery-on-the-device.md)
(Provisionally agreed); the [data model](../../20-architecture/data-model.md)'s
`fitness` rows.

## Annex A — The recovery engine

*Joe's design (29 October), part of this spec: GYM-019 builds it exactly.
It turns logged sets into two outputs for every muscle group.*

- **Readiness**: a 0–100 % score for how recovered the muscle is at any
  point in time.
- **Stimulus sets per workout**: how much effective training stimulus each
  workout gave the muscle.

Each muscle group has a weekly stimulus target (GYM-017). Adding up
stimulus sets across a week and comparing them with that target is not the
recovery engine's job; it only provides the per-workout figure.

### A1. Overview

```
Logged sets ──► Score each set ──► Total per muscle per workout ──► × Novelty factor ──► Readiness drop ──► Recovery over time
                       │
                       └──► Stimulus sets per muscle per workout (output)
```

Each working set gets two scores:

| Score | Meaning | Depends on |
|---|---|---|
| **Stimulus** (`s`) | How much growth signal the set sent | RIR only |
| **Fatigue** (`f`) | How much the set costs the muscle | RIR, plus a penalty for high-rep sets |

Fatigue drives readiness. Stimulus is reported per workout.

### A2. Inputs and settings

#### What the engine needs

| Input | Used for |
|---|---|
| Each set's **reps** and **RIR** | Set scores (A3.1–A3.3) |
| Each exercise's **primary muscle group** (contribution fixed at 1.0) and any **secondary groups** with their contribution (0.1–0.9) | Splitting each set's scores across muscles (A3.4) |
| Each workout's **completion time** (its end) | Start of the recovery window (A3.6–A3.8) and the novelty factor (A3.5) |
| Each muscle group's **recovery type**: fast, normal or slow | Choosing its recovery time constant (A3.7) |

Weight is logged with each set but is **not used** by the engine. A set
logged as a quick set (GYM-010 3) counts as **10 reps at RIR 2** (Joe,
31 October).

#### Tunable settings

In Settings → Gym → Recovery (GYM-019).

| Setting | Symbol | Default | Description |
|---|---|---|---|
| Points per fatigue set | `a` | 20 | Readiness points lost per fatigue set |
| Recovery time: fast | `T_fast` | 30 h | Hours for a fast-recovery muscle to recover a 50-point deficit |
| Recovery time: normal | `T_normal` | 42 h | As above, for normal-recovery muscles |
| Recovery time: slow | `T_slow` | 60 h | As above, for slow-recovery muscles |

#### Fixed constants

| Constant | Value | Description |
|---|---|---|
| RIR divisor | 10 | Each rep in reserve reduces a set's score by 0.1 |
| Rep factor table | A3.2 | Extra fatigue for sets above 8 reps |
| Novelty factor table | A3.5 | Extra fatigue when a muscle hasn't been trained for more than 7 days |
| Novelty stimulus threshold | 0.5 | Minimum stimulus sets for a workout to count as having trained a muscle |
| Readiness floor | 5 | Readiness never drops below 5 % |
| Recovery curve exponent | 2 | Recovery starts slowly and accelerates |

### A3. Calculations

#### A3.1 Stimulus per set

```
s = max(0, 1 − RIR / 10) × contribution
```

**In plain terms:** a set to failure scores 1.0. Each rep left in reserve
takes off 0.1, so RIR 2 scores 0.8 and RIR 5 scores 0.5. Reps don't affect
stimulus, because the growth signal comes mainly from the hard final reps
of a set, and every set at the same RIR contains about the same number of
those.

`contribution` is 1.0 for the exercise's primary muscle group and the
configured value for each secondary group. One set produces one stimulus
score **per muscle group** the exercise works.

#### A3.2 Rep factor

```
R(reps) = 1.00                       if reps ≤ 8
        = 1 + 0.05 × (reps − 8)      if 9 ≤ reps ≤ 12
        = 1.25                       if reps ≥ 13
```

| Reps | ≤ 8 | 9 | 10 | 11 | 12 | 13+ |
|---|---|---|---|---|---|---|
| R | 1.00 | 1.05 | 1.10 | 1.15 | 1.20 | 1.25 |

**In plain terms:** long sets involve more total work, so they cost more
fatigue. Up to 8 reps there is no extra cost. Each rep beyond that adds 5 %,
up to 25 % extra.

#### A3.3 Fatigue per set

```
f = s × R(reps)
```

**In plain terms:** fatigue starts from the stimulus score, so proximity to
failure stays the main factor, then gets scaled up for long sets. The rep
factor can offset at most about 2 RIR: 13 reps at RIR 2 (1.00) costs the
same as 8 reps at RIR 0 (1.00). A set far from failure never costs more
than a short set close to failure (12 reps at RIR 5 = 0.60; 5 reps at RIR 1
= 0.90).

#### A3.4 Workout totals per muscle

```
S_m = Σ s     over all sets in the workout that work muscle m
F_m = Σ f     over all sets in the workout that work muscle m
```

**In plain terms:** add up each muscle's scores across every set in the
workout, from both primary and secondary work.

`S_m` is an **output** of the engine: the stimulus sets muscle `m`
received in this workout.

#### A3.5 Novelty factor

```
d    = days between this workout and the muscle's last stimulated workout

N_m  = 1                           if d ≤ 7, or there is no previous stimulated workout
     = 1 + 0.5 × (d − 7) / 14      if 7 < d < 21
     = 1.5                         if d ≥ 21

F'_m = N_m × F_m
```

A **stimulated workout** for muscle `m` is a workout where `S_m ≥ 0.5`,
counting both primary and secondary work. The current workout is excluded
when looking for the previous one.

| Days since last stimulated | ≤ 7 | 10 | 14 | 17 | 21+ |
|---|---|---|---|---|---|
| N | 1.00 | 1.11 | 1.25 | 1.36 | 1.50 |

**In plain terms:** a muscle that hasn't been trained for a while takes more
of a hit from the same workout. This is the repeated bout effect: a recent
workout protects the muscle against damage from the next one, and that
protection fades with time off. Up to 7 days there is no extra cost. It
rises steadily to 25 % extra at 14 days and is capped at 50 % extra from 21
days.

- It applies to every muscle, after the workout's fatigue sets have been
  summed (A3.4).
- Because it multiplies fatigue, it makes both the drop and the recovery
  time bigger.
- A workout with less than 0.5 stimulus sets for a muscle still applies its
  fatigue, but doesn't reset that muscle's clock. One token set doesn't
  count as having trained it.
- Stimulus is not affected.
- With no training history (e.g. a new user), `N = 1`, so people who have
  been training elsewhere aren't over-penalised.

#### A3.6 Readiness drop

```
drop = a × F'_m
R0   = max(5, R_now − drop)
```

**In plain terms:**

- `R_now` is the muscle's readiness at the workout time: 100 if it is fully
  recovered, lower if it is still recovering from a previous workout.
- Each fatigue set, after the novelty factor, takes `a` points off
  (default 20).
- `R0` is the muscle's readiness immediately after the workout. It cannot
  go below 5 %.

#### A3.7 Recovery time

```
deficit = 100 − R0
T       = T_m × deficit / 50
```

where `T_m` is `T_fast`, `T_normal` or `T_slow`, depending on the muscle's
recovery type.

**In plain terms:** the deficit is how far below 100 % the muscle is, and
recovery time is directly proportional to it. `T_m` is how long the muscle
takes to recover a 50-point deficit; a 25-point deficit takes half as long,
and a 75-point deficit 1.5× as long. Each muscle therefore recovers at a
fixed average speed of `50 / T_m` points per hour.

#### A3.8 Readiness over time

```
R(t) = R0 + deficit × ((t − t0) / T)²     for t0 ≤ t < t0 + T
R(t) = 100                                for t ≥ t0 + T
```

`t0` is the time of the workout that set `R0`.

**In plain terms:** `(t − t0) / T` is the fraction of the recovery window
that has passed. Squaring it gives the fraction of the deficit recovered so
far:

| Window elapsed | 25 % | 50 % | 75 % | 100 % |
|---|---|---|---|---|
| Deficit recovered | 6 % | 25 % | 56 % | 100 % |

Recovery is slow at first and fastest just before full recovery, landing on
exactly 100 % at time `t0 + T`. A muscle that has never been trained is at
100 %.

#### A3.9 Training a muscle before it has recovered

When a new workout trains muscle `m`:

1. Evaluate `R_now = R(workout time)` from the muscle's current recovery
   curve.
2. Apply A3.5 and A3.6 to get the new `R0`.
3. Apply A3.7 to get the new `T` from the new, larger deficit.
4. Replace the muscle's recovery curve with the new `R0`, `t0` and `T`. If
   `S_m ≥ 0.5`, also record this workout as the muscle's last stimulated
   workout.

**In plain terms:** leftover fatigue makes the next drop go deeper and the
next recovery take longer. Each muscle has one active recovery curve at a
time, defined by three numbers (`R0`, `t0` and `T`), plus the time it was
last stimulated, which the novelty factor needs.

### A4. When to recompute

Readiness depends on the order of workouts, so each muscle's state is built
by processing workouts in order of completion time:

- **Workout saved at the latest time:** apply it incrementally (A3.9).
- **Workout edited, deleted or back-dated:** rebuild every muscle's state
  by replaying all workouts from a lookback window in chronological order.
  A 60-day window is ample. The longest possible recovery is
  `T_m × 95 / 50 = 1.9 × T_m` (114 h at `T_slow` = 60 h), and the novelty
  factor needs up to 21 days of earlier history to know when each muscle
  was last stimulated.
- **Settings changed** (`a`, any `T_m`, a muscle's recovery type, or an
  exercise's muscle groups or contributions): full replay.

Readiness is evaluated when it's needed, with `R(now)` from A3.8; nothing
time-dependent needs to be stored.

### A5. Formula summary

```
Per set, per muscle:   s = max(0, 1 − RIR/10) × contribution
                       f = s × R(reps)         R = 1 (≤ 8 reps), +0.05 per rep above 8, max 1.25

Per workout:           S_m  = Σ s              (output: stimulus sets for the muscle)
                       F_m  = Σ f
                       F'_m = N_m × F_m        N = 1 up to 7 days since S_m ≥ 0.5, 1.25 at 14 days, 1.5 at 21+ days
                       R0   = max(5, R_now − a × F'_m)
                       T    = T_m × (100 − R0) / 50

Over time:             R(t) = R0 + (100 − R0) × ((t − t0)/T)²     100 % once t ≥ t0 + T
```

### A6. Not in the engine

- **Weight** is logged but unused here. It could later power automatic
  calibration of `a` and `T_m` from performance (for example, if a muscle
  shown at 100 % performs below its recent best, lengthen its `T_m`).
- **Very low reps (< 5)** may give less stimulus per set than the formula
  assigns. Revisit if heavy low-rep work is common.
- **Weekly stimulus totals and display** of readiness or stimulus are
  outside the engine: GYM-014 to GYM-018.
