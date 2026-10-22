# Gym

*Stage 5, the `fitness` Module's Gym page. **A first draft for Joe to
refine**, written from Joe's notes (22 October), with Claude's own
suggestions marked **(suggested)**. Everything is *proposed* until Joe
agrees it. Cardio is Stage 8; Goals, the Goals page and the measures
registry follow Gym in Stage 5 and have their own spec.*

**In one line:** my exercises, templates and workouts; logging a workout
at the gym; how each exercise is progressing; and how recovered each
muscle is ([ADR-0026](../../20-architecture/adr/0026-navigation-drawer.md),
Provisionally agreed).

## Decisions

### Equipment and muscle groups

- **Equipment types are mine to keep**, each with an **increment**: the
  step the weight goes up or down by (Joe, 22 October). Increments are
  exact decimals, never rounded: 0.625 kg is 0.625 kg, and 0.625 × 3 is
  1.875 kg. Weights are in kg (suggested, as Recipes are metric).
- **A starting list** (suggested), each editable: Barbell 2.5, Dumbbell 2,
  EZ bar 2.5, Smith machine 2.5, Machine 5, Cable 2.5, Kettlebell 4,
  Bodyweight 1.25 (added weight; 0 is bodyweight alone), Band and Other
  with no weight.
- **Seventeen muscle groups are built in**, and I can add my own (Joe, 22
  October). The seventeen (suggested): Chest, Front delts, Side delts, Rear
  delts, Biceps, Triceps, Forearms, Lats, Traps, Lower back, Abs, Obliques,
  Glutes, Quads, Hamstrings, Adductors, Calves. Built-in groups can't be
  renamed or deleted, and each has a place on the body map; my own groups
  show in a list beside it.
- Equipment and muscle groups are reference data, kept in Settings → Gym
  ([ADR-0014](../../20-architecture/adr/0014-reference-data-and-labels.md),
  Provisionally agreed).

### Exercises

- **An Exercise has a name, an equipment type, primary and secondary muscle
  groups, a working weight and a goal** (Joe, 22 October). At least one
  primary group; secondary groups optional. Notes (set-up, seat height)
  optional (suggested).
- **The working weight** is what a set's weight starts at in a workout. I
  change it by hand, or from a workout's review when I've progressed.
- **The PR is worked out, never typed:** the set with the best Epley
  estimate, weight × (1 + reps ÷ 30), with its date (Joe, 22 October).
- **The goal** is what I'm working towards (Joe, 22 October); see [open
  point 1](#open-points-for-joe) for what it measures and how it meets
  Goals.
- **Archived, not deleted:** an archived Exercise leaves the library,
  pickers and swaps, and keeps its history; templates that use it say so
  (Joe, 22 October;
  [ADR-0032](../../20-architecture/adr/0032-delete-means-archive.md),
  Provisionally agreed). One never used in a workout can be deleted
  (suggested).
- **A name is unique** among my Exercises, archived ones included
  (suggested).

### Templates

- **A Workout template is a name and an ordered list of exercises**, each
  with a number of sets and, optionally, a target RIR (Joe, 22 October).
  Weight and reps are never part of a template: they come from the
  working weight and from me on the day.
- **I reorder a template's exercises by dragging** (Joe, 22 October).
- **A template shows the sets it gives each muscle group** (suggested), so
  I can see what it trains before I start it.
- **Deleting a template** sends it to Recently deleted; workouts that
  followed it keep their copy
  ([ADR-0013](../../20-architecture/adr/0013-occurrences-snapshot-their-definition.md),
  Provisionally agreed).

### A workout

- **A Workout is planned for a day** — the one I pick, or today — from a
  template or from scratch, and starts only when I press **Start** (Joe,
  22 October). A planned Workout is on Plan
  ([ADR-0029](../../20-architecture/adr/0029-plan-reads-core-items.md),
  Provisionally agreed) and always Personal
  ([spaces and sharing](../cross-cutting/spaces-and-sharing.md)).
- **Its stages:** Planned → In progress → Done; or Skipped, when a planned
  day passes or I skip it (suggested). One Workout is in progress at a time
  (suggested).
- **Starting copies the template** — each exercise, its sets and RIR, and
  the working weight as it stood — so a workout is always read against
  what it was, after the template or working weight has moved on
  (ADR-0013).
- **Every exercise starts in the backlog** (Joe, 22 October). I move one
  into the session when I begin it, so the session's order is the order I
  did them in. Nothing in a session is reordered by hand.
- **Adding and swapping are quick** (Joe, 22 October). Add takes any
  Exercise from the library, or makes a new one on the spot (name,
  equipment, primary group). Swap replaces an exercise not yet done with
  one sharing a primary muscle group, those sharing the most first; its
  planned sets carry over.
- **A set is weight, reps and RIR**, each with a stepper; weight steps by
  the exercise's equipment increment, reps and RIR by 1 (Joe, 22 October).
  A template's planned sets show as rows to fill; any set can be added,
  changed or removed.
- **An exercise is marked done** when I've done the sets I want, whatever
  the template said (Joe, 22 October).
- **Ending asks how it went and how motivated I was beforehand** (Joe, 22
  October), each on a scale of 1–5 (suggested), with optional notes; then
  the workout opens read-only for its review.
- **The review is where working weights move**: for each exercise, I can
  raise (or lower) its working weight there (Joe, 22 October). An exercise
  whose every set met its reps and RIR is suggested for a raise of one
  increment (suggested; [open point 5](#open-points-for-joe)).

### Progress

- **Each exercise shows its progression over 1 month, 3 months and a
  year** (Joe, 22 October): the best Epley estimate in each workout, the
  working weight over time, the PR and the goal, with the trend over the
  period — the change, and whether it is rising, flat or falling.
- **Stalled** (suggested): an exercise whose estimate hasn't risen for four
  weeks of training is marked as such.

### Recovery and readiness

- **Each muscle group has a readiness**, 0–100 %, from the sets that
  trained it and how long ago: a primary set counts fully, a secondary set
  half, and each group recovers over its own time (suggested; [open
  point 2](#open-points-for-joe)). **Overall readiness** is the average of
  the groups trained in the last week (suggested).
- **The body map** shows each muscle's readiness, front and back, in
  red → amber → green with the percentage, so colour is never the only
  sign (Joe, 22 October;
  [ADR-0043](../../20-architecture/adr/0043-colour-by-type.md),
  Provisionally agreed).
- **Training frequency** is how often each muscle group is trained: hard
  sets a week, and days a week it is trained (suggested). Each group has a
  target, with a sensible default; falling below it tells me (Joe, 22
  October).
- **What to do next:** templates are ranked by how ready their muscles
  are and how far below their frequency target they are (Joe, 22 October),
  the reason said in a few words ("Back and biceps 92 % ready, trained
  once this week").
- Oura's readiness joins this in Stage 8; suggestions on Plan and in Inbox
  stay [later](../../roadmap.md#later-opportunities).

## What the page shows

**Gym**, coral, tabs (suggested): **Today** — the workout in progress or
planned for today, what to do next, overall readiness and the body map,
and any muscle trained too little; **Workouts** — every workout, newest
first, with filters and sort; **Exercises** — the library; **Templates**.
A workout in progress, an Exercise and a template each open on their own
page.

## Requirements

*Stage 5. Statuses: proposed → agreed → built → verified. All proposed.*

### GYM-001 — Equipment types

**As** Joe, **I want** my equipment types with their own increments, **so
that** steppers move by what my gym's weights actually go up by.
Priority: Must · Status: proposed

Acceptance criteria
1. Given Settings → Gym → Equipment, then I add, rename and delete
   equipment types, each with an increment; the starting list is there to
   begin with.
2. Given an increment of 0.625 kg, then steps of it are exact (0.625,
   1.25, 1.875…) and shown without trailing zeros.
3. Given an equipment type in use, then it can't be deleted until no
   Exercise uses it; changing its increment changes every Exercise using it.

### GYM-002 — Muscle groups

**As** Joe, **I want** the seventeen muscle groups built in, and my own
added, **so that** exercises and recovery use the groups I think in.
Priority: Must · Status: proposed

Acceptance criteria
1. Given Settings → Gym → Muscle groups, then the seventeen built-in groups
   are listed and can't be renamed or deleted.
2. Given Add, then I name a group of my own; it can be renamed, and deleted
   once no Exercise uses it.
3. Given a group of my own, then it has readiness and frequency like the
   others, and shows in a list beside the body map.

### GYM-003 — The exercise library

**As** Joe, **I want** all my exercises in one library, **so that** I can
find one and see where it stands.
Priority: Must · Status: proposed

Acceptance criteria
1. Given the Exercises tab, then every Exercise I haven't archived is
   listed: name, equipment, primary groups, working weight, PR, goal and
   when last done.
2. Given a search, then Exercises match by name.
3. Given a filter by muscle group (primary or secondary) or equipment,
   then only matching Exercises show; sorted A–Z, by last done, or by
   muscle group (suggested), my choice kept.
4. Given an Exercise, then its page shows its details, its progression
   (GYM-014) and the workouts it was in, newest first, with their sets.

### GYM-004 — Make and edit an exercise

**As** Joe, **I want** to describe each exercise once, **so that** logging,
swapping and recovery all know what it trains.
Priority: Must · Status: proposed

Acceptance criteria
1. Given New exercise, then I give a name, an equipment type and at least
   one primary muscle group; secondary groups, a working weight, a goal
   and notes are optional.
2. Given an Exercise, then I edit any of these; the working weight's
   stepper moves by its equipment's increment.
3. Given a name already used by one of my Exercises, then it is refused,
   and I'm told which.
4. Given a change to an Exercise's muscle groups, then recovery and
   frequency use the new groups from then on; past workouts keep theirs
   (suggested).

### GYM-005 — Archive an exercise

**As** Joe, **I want** to archive exercises I no longer do, **so that** the
library and pickers show only what I use.
Priority: Must · Status: proposed

Acceptance criteria
1. Given an Exercise, when I archive it, then it leaves the library, Add
   and Swap, with Undo; its workouts, PR and progression are kept.
2. Given a template containing it, then the template marks it archived,
   and a workout started from that template leaves it out (suggested).
3. Given Settings → Gym → Archived exercises, then I can bring one back as
   it was.
4. Given an Exercise never used in a workout, then it can be deleted
   instead.

### GYM-006 — Templates

**As** Joe, **I want** to make, edit and delete workout templates, **so
that** a planned workout starts with the right exercises.
Priority: Must · Status: proposed

Acceptance criteria
1. Given New template, then I name it and add exercises from the library,
   each with a number of sets (3 to start; suggested) and an optional
   target RIR.
2. Given a template's exercises, then I reorder them by dragging (on a
   phone too) and remove them.
3. Given a template, then it shows the sets it gives each muscle group,
   primary and secondary.
4. Given a template, then I can duplicate it (suggested), rename it, or
   delete it with Undo; past workouts that followed it are unchanged.
5. Given the Templates tab, then my templates are listed with their
   exercises, sets and when last done.

### GYM-007 — Plan a workout

**As** Joe, **I want** to plan a workout for a day, from a template or from
scratch, **so that** it is on Plan and ready when I get to the gym.
Priority: Must · Status: proposed

Acceptance criteria
1. Given New workout, then I choose a template or Empty, and a day (today
   to start); a template's name is the workout's name, an empty one is
   called "Workout" until I rename it.
2. Given a planned workout, then it shows on Plan on its day, coral, and
   opens there.
3. Given a planned workout, then I can change its day or template, or
   delete it, until I start it.
4. Given its day passes without it starting, then it shows as Skipped
   (suggested), and can still be started or deleted.
5. Given a template, when I press Start on it, then a workout for today is
   made and started at once.

### GYM-008 — Start and the backlog

**As** Joe, **I want** every exercise to wait in a backlog until I begin
it, **so that** the session records what I really did, in the order I did
it.
Priority: Must · Status: proposed

Acceptance criteria
1. Given a planned workout, when I press Start, then it is In progress,
   its start time kept, and its template, sets, RIR and working weights
   are copied into it.
2. Given a workout in progress, then its exercises sit in the backlog, in
   the template's order, each with its planned sets; the session above it
   is empty.
3. Given an exercise in the backlog, when I begin it, then it moves to the
   foot of the session and opens for logging.
4. Given an exercise in the session with no sets logged, then it can go
   back to the backlog.
5. Given another workout already in progress, then Start says so and
   offers to open it.
6. Given I leave the page or close the app, then the workout is just as I
   left it when I come back.

### GYM-009 — Add, swap and remove exercises

**As** Joe, **I want** to add or swap exercises mid-workout without
fuss, **so that** a busy machine doesn't break my plan.
Priority: Must · Status: proposed

Acceptance criteria
1. Given Add, then a search over the library adds an exercise to the
   backlog, or straight into the session; recently done exercises come
   first (suggested).
2. Given a name not in the library, then I can make it there and then
   (name, equipment, primary group), and it joins the library.
3. Given Swap on an exercise not yet done, then exercises sharing a
   primary muscle group are offered, most groups shared first, then the
   rest by search; the planned sets carry over and the working weight is
   the new exercise's.
4. Given an exercise in the backlog, then I can remove it from this
   workout.

### GYM-010 — Log sets

**As** Joe, **I want** to log weight, reps and RIR with steppers, **so
that** logging takes a couple of taps between sets.
Priority: Must · Status: proposed

Acceptance criteria
1. Given an exercise in the session, then each planned set is a row of
   weight, reps and RIR; weight starts at the working weight, RIR at the
   template's target, and reps blank (suggested: the previous set's reps
   once one is logged).
2. Given a stepper, then weight moves by the equipment's increment, reps
   and RIR by 1; each can also be typed. Weight is never below 0; RIR is
   0 or more.
3. Given a row, when I tick it, then the set is logged; a logged set can be
   changed or removed, and Add set adds a row with the last set's values.
4. Given an exercise, then I see what I did last time (date, sets)
   (suggested).
5. Given a logged set with the best Epley estimate yet for the exercise,
   then it is marked as a PR (suggested).
6. *(Suggested)* Given a set is logged, then a rest timer starts, which I
   can dismiss; its length is set in Settings → Gym.

### GYM-011 — Mark an exercise done

**As** Joe, **I want** to mark an exercise done when I've done the sets I
want, **so that** I can see what's left.
Priority: Must · Status: proposed

Acceptance criteria
1. Given an exercise in the session, when I mark it done, then it closes
   to a summary line (sets, best set) and any unlogged planned sets are
   dropped.
2. Given a done exercise, then I can reopen it to add or change sets.

### GYM-012 — End a workout and review it

**As** Joe, **I want** to record how a workout went and then review it,
**so that** I can see what I did and move working weights on.
Priority: Must · Status: proposed

Acceptance criteria
1. Given End workout, then I'm asked how it went and how motivated I was
   beforehand, 1–5 each, and notes, all optional; Save ends it, Done, with
   its end time and duration.
2. Given exercises still in the backlog, then End says how many, and they
   are left out of the finished workout (suggested).
3. Given a finished workout, then it opens read-only: date, duration,
   ratings, notes, and each exercise in the order done with its sets, any
   PRs, and how it compares with last time (suggested).
4. Given the review, then each exercise shows its working weight with a
   stepper; changing it there changes the Exercise's working weight. One
   whose every planned set met its reps and RIR suggests one increment more
   (suggested).
5. *(Suggested)* Given a finished workout, then Edit lets me correct its
   sets, ratings and notes; recovery and PRs follow.
6. Given Discard on a workout in progress, then it is deleted, with Undo.

### GYM-013 — The workouts list

**As** Joe, **I want** every workout in one list, filtered and sorted,
**so that** I can look back at my training.
Priority: Must · Status: proposed

Acceptance criteria
1. Given the Workouts tab, then workouts show newest first: name, date,
   duration, exercises, sets, and how it went.
2. Given filters by template, exercise, muscle group, stage (Planned, Done,
   Skipped) and dates, then only matching workouts show, my filters kept.
3. Given a sort by date, duration, sets or how it went, then the list
   follows, my choice kept.

### GYM-014 — Progression

**As** Joe, **I want** to see how each exercise is progressing over a
month, three months and a year, **so that** I know what's working.
Priority: Must · Status: proposed

Acceptance criteria
1. Given an Exercise's page, then a chart shows, for 1 M, 3 M or 1 Y: the
   best Epley estimate in each workout, the working weight over time, the
   PR, and the goal as a line.
2. Given the period, then I'm told the change in estimate and working
   weight over it, and whether it is rising, flat or falling.
3. Given the PR, then it shows weight × reps, its estimate and its date,
   and opens that workout.
4. *(Suggested)* Given no rise in the estimate across four weeks of
   training, then the Exercise is marked Stalled, in the library too.
5. *(Suggested)* Given an overview of progress, then every Exercise trained
   in the period shows its change, best first.

### GYM-015 — Readiness and the body map

**As** Joe, **I want** to see how recovered I am, overall and muscle by
muscle, **so that** I train what's ready.
Priority: Must · Status: proposed

Acceptance criteria
1. Given the Today tab, then overall readiness shows as a percentage, and
   the body map, front and back, colours each muscle by its readiness.
2. Given a muscle on the map (or a group of my own in the list), when I
   choose it, then I see its readiness, when it was last trained, its sets
   this week against its target, and when it will be fully recovered.
3. Given a workout finished or edited, then readiness follows at once,
   offline too.
4. Given recovery settings in Settings → Gym, then each group's recovery
   time can be changed (suggested).

### GYM-016 — Training frequency

**As** Joe, **I want** to be told when I'm training a muscle too little,
**so that** nothing gets left behind.
Priority: Must · Status: proposed

Acceptance criteria
1. Given each muscle group, then it has a weekly target (suggested: 10
   hard sets and twice a week), changeable in Settings → Gym, or off for a
   group I don't train directly.
2. Given a group below its target over the last 7 days (suggested: and
   last trained more than its recovery time ago), then Today lists it, with
   its sets this week and when it was last trained.
3. *(Suggested)* Given a group below its target two weeks running, then a
   nudge appears in Inbox, once a week at most.

### GYM-017 — What to do next

**As** Joe, **I want** to be told which template to do next, **so that** I
train what is both ready and most behind.
Priority: Should · Status: proposed

Acceptance criteria
1. Given my templates, then Today ranks the top three by how ready their
   primary muscles are and how far behind their frequency they are, each
   with a short reason.
2. Given a muscle under 50 % ready (suggested), then a template that works
   it hard is not suggested first.
3. Given a suggestion, when I choose it, then a workout from it is planned
   for today, ready to Start.

### GYM-018 — The Gym everywhere

**As** Joe, **I want** the Gym to work without signal, **so that** a
basement gym doesn't stop me logging.
Priority: Must · Status: proposed

Acceptance criteria
1. Given no signal, then I start, log, swap, end and review a workout, and
   change working weights; everything is sent later.
2. Given Search, then Exercises, templates and workouts are found by name.
3. Given a workout, an Exercise or a template, then its changes are in the
   activity log (suggested).

Non-goals (Stage 5): cardio (Stage 8); Oura's readiness (Stage 8);
supersets and circuits ([open point 3](#open-points-for-joe)); pounds;
plate calculators; bodyweight tracking; sharing workouts or templates with
a Household; AI that writes programmes; suggestions on Plan or in Inbox
beyond GYM-016 3.

## Open points for Joe

1. **The goal against Goals.** Stage 5 also brings Goals, whose *target*
   kind is "Bench 60 kg", measured by the best estimated 1RM
   ([ADR-0024](../../20-architecture/adr/0024-goals.md),
   [ADR-0025](../../20-architecture/adr/0025-goal-on-track-by-kind.md),
   Provisionally agreed). Recommendation: an Exercise's goal **is** a
   target Goal for that Exercise — set from the Exercise's page, shown
   there and on the Goals page — so there is one kind of goal, not two.
   The trade-off: a Goal Item is heavier than a field, and Gym waits on
   Goals for it. Either way: is the goal a weight to lift for so many reps
   (60 kg × 5), an estimated 1RM, or a working weight? And a date by
   which, or none?
2. **The recovery model.** The roadmap says "v1's recovery model"; for
   Recipes you wanted first principles, not v1. Port v1's model (point me
   at it) or use the one above: fatigue from sets (primary 1, secondary ½,
   RIR 0–1 counting more), each group recovering over its own time
   (suggested defaults: 48 h for small groups, 72 h for large)?
3. **Supersets.** The backlog puts one exercise in the session at a time.
   Do you alternate two exercises (A1/A2)? If so, two can be in progress
   at once, in the order begun.
4. **RIR in templates:** one target per exercise, or per set (e.g. 2, 1,
   0)?
5. **Suggesting a raise:** when every set met its reps at or above its
   target RIR — but templates carry no reps. Use a rep target per exercise
   (e.g. 8–12, raise at the top), or leave the raise wholly to you?
6. **Epley and high reps:** Epley overstates sets above about 12 reps.
   Count only sets of 1–12 reps towards the PR? And should RIR count
   (reps + RIR as the reps to failure)?
7. **Dumbbells:** is the weight per dumbbell (the usual way) or the pair?
8. **Warm-up sets:** mark a set as warm-up, left out of PRs, volume and
   recovery?
9. **Time of day:** is a planned workout just a day, or a day and an
   optional time (Plan then places it in the day)?
10. **"Motivation beforehand":** asked at the end, as you wrote, or at
    Start, when it's fresh?

Once these are agreed, the data model's `fitness` rows follow: increment
moves from the Exercise to its equipment; muscle groups become primary and
secondary rows; `rpe` becomes `rir`; the Workout gains its ratings
([data model](../../20-architecture/data-model.md)).
