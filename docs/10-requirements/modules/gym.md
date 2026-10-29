# Gym

*Stage 5, the `fitness` Module's Gym page. **Agreed by Joe, 29 October**,
written from Joe's notes (22 October) and his comments on the first and
second drafts (29 October). Claude's own suggestions are marked
**(suggested)**: Joe agreed them provisionally, and may change them. The recovery engine, Joe's
own, is [Annex A](#annex-a--the-recovery-engine). Cardio is Stage 8; Goals
follow Gym in Stage 5 with their own spec.*

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
- **Each group has two weekly targets:** how many workouts a week train it
  (frequency) and how many stimulus sets a week it gets (Joe, 29 October).
- Equipment, muscle groups and their settings are reference data, kept in
  Settings → Gym
  ([ADR-0014](../../20-architecture/adr/0014-reference-data-and-labels.md),
  Provisionally agreed).

### Exercises

- **An Exercise has a name, an equipment type, exactly one primary muscle
  group, any number of secondary groups, a working set, and optionally a
  goal** (Joe, 22 and 29 October). Notes (set-up, seat height) are optional
  (suggested).
- **A secondary group has a contribution**, 0.1 to 0.9 in steps of 0.1;
  the primary group's is always 1.0 (Joe, 29 October). Bench press: Chest
  primary, Triceps 0.4, Front delts 0.3.
- **The working set is a weight and reps** — "60 kg × 8" — and every
  Exercise has one (Joe, 29 October). A workout's set starts at it. I
  change it by hand, or from a workout's review when I've progressed.
- **The goal is a weight and reps too**, optional, and the Exercise's own:
  it is not a Goal on the Goals page, which is for the big picture (Joe,
  29 October).
- **Epley strength** measures a set: weight × (1 + (reps + RIR) ÷ 30),
  counting RIR as reps I could still have done. Only sets of 1–12 reps
  have one (Joe, 29 October). It is how sets, working sets and goals are
  compared; a working set or goal, having no RIR of its own, is taken at my
  preferred RIR, so a set matching it at that RIR equals it rather than
  beating it (Joe, 29 October).
- **The PR is worked out, never typed:** the set with the best Epley
  strength, with its date (Joe, 22 and 29 October).
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

- **A Workout template is a name and an ordered list of exercises**, each
  with its sets, and each set with a target RIR (Joe, 22 and 29 October).
  Weight and reps are never part of a template.
- **An exercise added to a template comes with one set**, its RIR at my
  **preferred RIR**; I add more sets and change each one's RIR (Joe, 29
  October). Preferred RIR is a Gym setting.
- **I reorder a template's exercises by dragging** (Joe, 22 October).
- **A template shows its coverage:** the stimulus sets it gives each muscle
  group, worked out as the recovery engine would from its sets' RIR and
  each exercise's contributions ([Annex A](#a31-stimulus-per-set); Joe, 29
  October).
- **Deleting a template** sends it to Recently deleted; workouts that
  followed it keep their copy
  ([ADR-0013](../../20-architecture/adr/0013-occurrences-snapshot-their-definition.md),
  Provisionally agreed).

### A workout

- **A Workout is planned for a day** — the one I pick, or today; a day
  only, never a time (Joe, 29 October) — from a template or from scratch, and starts only when I press **Start** (Joe,
  22 October). A planned Workout is on Plan
  ([ADR-0029](../../20-architecture/adr/0029-plan-reads-core-items.md),
  Provisionally agreed) and always Personal
  ([spaces and sharing](../cross-cutting/spaces-and-sharing.md)).
- **Its stages:** Planned → In progress → Done; or Skipped, when its day
  passes without it starting. One Workout is in progress at a time (Joe, 29
  October).
- **Starting copies the template** — each exercise, its sets and their RIR
  — and each exercise's working set as it stood, so a workout is always
  read against what it was (ADR-0013).
- **Every exercise starts in the backlog** (Joe, 22 October). I move one
  into the session when I begin it, so the session's order is the order I
  did them in. Nothing in a session is reordered by hand.
- **Several exercises can be under way at once:** any exercise in the
  session takes more sets until I mark it done, and marking it done can be
  undone (Joe, 29 October). Supersets need nothing more.
- **Each exercise expands and collapses** (Joe, 29 October): collapsed, it
  is one line (name, sets done of planned, best set); expanded, its sets.
- **Adding and swapping are quick** (Joe, 22 October). An exercise added in
  a session comes with one set at my preferred RIR (Joe, 29 October). Swap
  offers exercises with the same primary muscle group first.
- **A set is weight, reps and RIR**, each with a stepper. Weight and reps
  start at the exercise's working set, RIR at the set's target; weight
  steps by the equipment's increment, reps and RIR by 1 (Joe, 22 and 29
  October).
- **An exercise is marked done** when I've done the sets I want, whatever
  the template said (Joe, 22 October).
- **Ending asks how it went and how motivated I was beforehand** (Joe, 22
  October), each 1–5 (suggested), asked at the end (Joe, 29 October), with optional
  notes; then the workout
  opens read-only for its review.
- **The review is where working sets move**: for each exercise, I can
  change its working weight and reps there, and the choice is mine (Joe,
  22 and 29 October). When a set beat the working set's Epley strength,
  that set is suggested as the new working set.
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
- **The week is the last seven days** for targets and warnings (Joe, 29
  October).
- **The body map** shows each built-in group's readiness, front and back,
  as a colour on one continuous scale — 0 % red, through amber, to 100 %
  green, with no bands — and with its percentage, so colour is never the
  only sign (Joe, 22 and 29 October;
  [ADR-0043](../../20-architecture/adr/0043-colour-by-type.md),
  Provisionally agreed). The scale runs between the design system's
  `--destructive`, `--warning` and `--success`, and goes into the design
  spec with the body map.
- **Overall readiness** is the average readiness of the groups with a
  weekly target above zero (Joe, 29 October).
- **What to do next:** templates are ranked by how ready the groups they
  cover are, and how far those groups are below their weekly targets (Joe,
  22 October).

### Progression

- **Progression is mainly about muscle groups**, and also about each
  exercise (Joe, 29 October), over 1 month, 3 months and a year.
- **An exercise's progression** is the best Epley strength in each
  workout, with its working set, PR and goal (Joe, 22 October).
- **A muscle group's progression is its exercises' progression:** the
  exercises it is primary for and those it is secondary for, together, each
  as its own line (Joe, 29 October). There is no one figure for the group.
- **Stimulus sets overlay progression:** the group's weekly stimulus sets
  as bars behind its lines, so I can see how volume and progress go
  together (Joe, 29 October). An exercise's chart shows its primary
  group's.
- **Stalled exercises are picked out** (Joe, 29 October): suggested, no
  rise in the best Epley strength across four weeks of training.

## What the page shows

**Gym**, coral, three tabs (Joe, 29 October):

- **Workouts** — the workout in progress or planned for today at the top,
  then every workout, newest first, with filters and sort; and my
  templates.
- **Recovery** — overall readiness, the body map, every group in a list by
  category (my own groups too) with its readiness and week against its
  targets, groups below target, and what to do next.
- **Progression** — muscle groups, and the exercise library, each
  Exercise opening on its progression (Joe, 29 October), with stalled
  exercises picked out.

A workout, an Exercise and a template each open on their own page.

## Requirements

*Stage 5. Statuses: proposed → agreed → built → verified. All agreed (29 October).*

### GYM-001 — Equipment types

**As** Joe, **I want** to define my equipment types with their own
increments, **so that** steppers move by what my gym's weights actually go
up by.
Priority: Must · Status: agreed

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
Priority: Must · Status: agreed

Acceptance criteria
1. Given Settings → Gym → Muscle groups, then the twenty built-in groups
   are listed under Push, Pull, Core and Legs, and can't be renamed or
   deleted.
2. Given Add, then I name a group of my own and choose its category; it
   can be renamed, and deleted once no Exercise uses it.
3. Given any group, then I set its recovery type and its two weekly
   targets: workouts a week and stimulus sets a week (GYM-017).
4. Given a group of my own, then it has readiness, targets and
   progression like the others, and appears wherever all groups are
   listed, but not on the body map.

### GYM-003 — The exercise library

**As** Joe, **I want** all my exercises in one library, **so that** I can
find one and see where it stands.
Priority: Must · Status: agreed

Acceptance criteria
1. Given the library, then every Exercise I haven't archived is listed:
   name, equipment, primary group, working set, PR, goal, when last done,
   and a Stalled mark.
2. Given a search, then Exercises match by name.
3. Given a filter by muscle group (primary or secondary), category or
   equipment, then only matching Exercises show; sorted A–Z, by last done
   or by primary group, my choice kept (suggested).
4. Given an Exercise, then its page shows its details, its progression
   (GYM-014) and its set history: the workouts it was in, newest first,
   with their sets and PRs marked.

### GYM-004 — Make and edit an exercise

**As** Joe, **I want** to describe each exercise once, **so that** logging,
swapping and recovery all know what it trains.
Priority: Must · Status: agreed

Acceptance criteria
1. Given New exercise, then I give a name, an equipment type, one primary
   muscle group and a working set (weight and reps); secondary groups, a
   goal (weight and reps) and notes are optional.
2. Given a secondary group, then I set its contribution with a stepper,
   0.1 to 0.9 in steps of 0.1; the primary group can't also be secondary.
3. Given an Exercise, then I edit any of these; the working set's and
   goal's weight move by its equipment's increment.
4. Given a change to an Exercise's muscle groups or contributions, then
   readiness, stimulus sets and template coverage use the new ones at
   once, for past workouts too.
5. Given a name already used by one of my Exercises, then it is refused,
   and I'm told which.
6. *(Suggested)* Given a goal, then the Exercise shows how far its PR is
   from it by Epley strength, and marks it reached when a set's Epley
   strength matches the goal's.

### GYM-005 — Archive an exercise

**As** Joe, **I want** to archive exercises I no longer do, **so that** the
library and pickers show only what I use.
Priority: Must · Status: agreed

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
Priority: Must · Status: agreed

Acceptance criteria
1. Given New template, then I name it and add exercises from the library;
   each comes with one set at my preferred RIR.
2. Given an exercise in a template, then I add and remove sets, and set
   each set's RIR with a stepper.
3. Given a template's exercises, then I reorder them by dragging (on a
   phone too) and remove them.
4. Given a template, then its coverage shows the stimulus sets it gives
   each muscle group, by category, from its sets' RIR and each exercise's
   contributions, beside each group's weekly stimulus target; it follows
   every change as I make it.
5. Given a template, then I can duplicate it (suggested), rename it, or
   delete it with Undo; past workouts that followed it are unchanged.
6. Given the templates on the Workouts tab, then each shows its
   exercises, sets and when last done.

### GYM-007 — Plan a workout

**As** Joe, **I want** to plan a workout for a day, from a template or from
scratch, **so that** it is on Plan and ready when I get to the gym.
Priority: Must · Status: agreed

Acceptance criteria
1. Given New workout, then I choose a template or Empty, and a day (today
   to start); a template's name is the workout's name, an empty one is
   called "Workout" until I rename it.
2. Given a planned workout, then it shows on Plan on its day, coral, and
   opens there.
3. Given a planned workout, then I can change its day or template, or
   delete it, until I start it.
4. Given its day passes without it starting, then it is Skipped, and can
   still be started or deleted.
5. Given a template, when I press Start on it, then a workout for today is
   made and started at once.

### GYM-008 — Start and the backlog

**As** Joe, **I want** every exercise to wait in a backlog until I begin
it, **so that** the session records what I really did, in the order I did
it.
Priority: Must · Status: agreed

Acceptance criteria
1. Given a planned workout, when I press Start, then it is In progress,
   its start time kept, and its template's exercises, sets and RIR, and
   each exercise's working set, are copied into it.
2. Given a workout in progress, then its exercises sit in the backlog, in
   the template's order, collapsed; the session above it is empty.
3. Given an exercise in the backlog, when I begin it, then it moves to the
   foot of the session, expanded for logging; exercises already begun stay
   as they are.
4. Given any exercise, then I expand or collapse it; collapsed, it shows
   its name, sets done of planned, and best set.
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

**As** Joe, **I want** to add or swap exercises mid-workout without fuss,
**so that** a busy machine doesn't break my plan.
Priority: Must · Status: agreed

Acceptance criteria
1. Given Add, then a search over the library adds an exercise to the
   backlog, or straight into the session, with one set at my preferred
   RIR; recently done exercises come first (suggested).
2. Given a name not in the library, then I can make it there and then
   (GYM-004 1), and it joins the library.
3. Given Swap on an exercise not yet begun, then exercises with the same
   primary muscle group are offered first, then the rest by search; its
   sets and their RIR carry over, and the weight and reps are the new
   exercise's working set.
4. Given an exercise in the backlog, then I can remove it from this
   workout.

### GYM-010 — Log sets

**As** Joe, **I want** to log weight, reps and RIR with steppers, **so
that** logging takes a couple of taps between sets.
Priority: Must · Status: agreed

Acceptance criteria
1. Given an exercise in the session, then each planned set is a row of
   weight, reps and RIR: weight and reps start at its working set, RIR at
   the set's target.
2. Given a stepper, then weight moves by the equipment's increment, reps
   and RIR by 1; each can also be typed. Weight is never below 0, reps
   below 1, or RIR below 0.
3. Given a row, when I tick it, then the set is logged; a logged set can be
   changed or removed, and Add set adds a row with the last set's values.
4. Given an exercise, then its set history is a tap away: past workouts'
   sets, newest first, with PRs marked.
5. Given a logged set with the best Epley strength yet for the exercise,
   then it is marked as a PR; a set of more than 12 reps has no Epley
   strength, so is never one.

### GYM-011 — Mark an exercise done

**As** Joe, **I want** to mark an exercise done when I've done the sets I
want, **so that** I can see what's left.
Priority: Must · Status: agreed

Acceptance criteria
1. Given an exercise in the session, then I add sets to it until I mark
   it done.
2. Given I mark it done, then it collapses and any unlogged sets are
   dropped.
3. Given a done exercise, then I can undo done, and add or change sets
   again.

### GYM-012 — End a workout and review it

**As** Joe, **I want** to record how a workout went and then review it,
**so that** I can see what I did and move working sets on.
Priority: Must · Status: agreed

Acceptance criteria
1. Given End workout, then I'm asked how it went and how motivated I was
   beforehand, 1–5 each, and notes, all optional; Save ends it, Done, with
   its end time and duration.
2. Given exercises still in the backlog, then End says how many, and they
   are left out of the finished workout (suggested).
3. Given a finished workout, then it opens read-only: date, duration,
   ratings, notes; each exercise in the order done with its sets and any
   PRs; and the stimulus sets it gave each muscle group (suggested).
4. Given the review, then each exercise shows its working set with
   steppers; changing it there changes the Exercise's working set. Nothing
   changes unless I change it.
5. Given an exercise whose best set beat its working set's Epley strength,
   then that set (weight × reps) is suggested as the new working set, taken
   with one tap.
6. *(Suggested)* Given a finished workout, then Edit lets me correct its
   sets, ratings and notes, or delete it; readiness, stimulus sets and PRs
   follow.
7. Given Discard on a workout in progress, then it is deleted, with Undo.

### GYM-013 — The workouts list

**As** Joe, **I want** every workout in one list, filtered and sorted,
**so that** I can look back at my training.
Priority: Must · Status: agreed

Acceptance criteria
1. Given the Workouts tab, then workouts show newest first: name, date,
   duration, exercises, sets, and how it went.
2. Given filters by template, exercise, muscle group, stage (Planned, In
   progress, Done, Skipped) and dates, then only matching workouts show, my
   filters kept.
3. Given a sort by date, duration, sets, how it went or motivation, then
   the list follows, my choice kept.

### GYM-014 — An exercise's progression

**As** Joe, **I want** to see how each exercise is progressing, against
the work its muscle is getting, **so that** I know what's working.
Priority: Must · Status: agreed

Acceptance criteria
1. Given an Exercise's page, then a chart shows, for 1 M, 3 M or 1 Y: the
   best Epley strength in each workout, its working set's Epley strength
   over time, the PR, and the goal's as a line.
2. Given the chart, then its primary group's weekly stimulus sets show as
   bars behind it.
3. Given the period, then I'm told the change in best Epley strength over
   it, and whether it is rising, flat or falling.
4. Given the PR, then it shows weight × reps @ RIR, its Epley strength and
   its date, and opens that workout.
5. Given no rise in the best Epley strength across four weeks of training
   (suggested), then the Exercise is marked Stalled, here, in the library
   and on the Progression tab.

### GYM-015 — A muscle group's progression

**As** Joe, **I want** to see how each muscle group is progressing, beside
the stimulus sets it got, **so that** I can judge how much volume works
for it.
Priority: Must · Status: agreed

Acceptance criteria
1. Given the Progression tab, then every muscle group is listed by
   category with its average weekly stimulus sets over the period (1 M,
   3 M or 1 Y), how many of its exercises are rising, and its stalled
   exercises.
2. Given a muscle group, then a chart shows the best Epley strength of
   each exercise it is primary or secondary for, one line each, as a
   change from the start of the period, with its weekly stimulus sets as
   bars behind and its weekly stimulus target as a line.
3. Given the chart, then I can show or hide each exercise's line; primary
   exercises show to start, secondary ones (with their contribution)
   hidden (suggested).
4. Given a muscle group, then its exercises are listed, primary then
   secondary, each with its change over the period and opening its page.

### GYM-016 — Readiness and the body map

**As** Joe, **I want** to see how recovered I am, overall and muscle by
muscle, **so that** I train what's ready.
Priority: Must · Status: agreed

Acceptance criteria
1. Given the Recovery tab, then overall readiness shows as a percentage,
   and the body map, front and back, shows each built-in group's readiness
   by its percentage and a colour on one continuous scale, from red at 0 %
   through amber to green at 100 %.
2. Given every group, my own included, then a list by category shows its
   readiness.
3. Given a group, on the map or in the list, when I choose it, then I see
   its readiness, when it was last trained, its week against its targets,
   and when it will be fully recovered.
4. Given a workout finished, edited or deleted, then readiness follows at
   once, offline too.

### GYM-017 — Weekly targets

**As** Joe, **I want** each muscle group to have a weekly frequency and
stimulus-sets target, and to be told when I fall short, **so that**
nothing gets left behind.
Priority: Must · Status: agreed

Acceptance criteria
1. Given each muscle group, then it has a frequency target (workouts a
   week) and a stimulus-sets target (sets a week), each changeable, or 0
   for a group I don't train directly. Defaults: twice a week (suggested)
   and 4 stimulus sets (Joe, 29 October).
2. Given the last seven days, then a workout counts towards a group's
   frequency when it gave it 0.5 stimulus sets or more, and every
   workout's stimulus sets for the group add up towards its stimulus
   target.
3. Given a group below either target, then the Recovery tab lists it, with
   its workouts and stimulus sets this week against its targets, and when
   it was last trained.
4. *(Suggested)* Given a group below a target and fully recovered, then it
   is flagged as needing training, not just behind.

### GYM-018 — What to do next

**As** Joe, **I want** to be told which template to do next, **so that** I
train what is both ready and most behind.
Priority: Should · Status: agreed

Acceptance criteria
1. Given my templates, then the Recovery tab ranks the top three: each
   template scores by the readiness of the groups it covers and how far
   those groups are below their weekly targets, weighted by its coverage
   of each (suggested), with a short reason ("Back and biceps 92 % ready,
   4 of 10 sets this week").
2. Given a group under 50 % ready (suggested), then a template whose
   coverage of it is 2 stimulus sets or more is not ranked first.
3. Given a suggestion, when I choose it, then a workout from it is planned
   for today, ready to Start.

### GYM-019 — The recovery engine

**As** Joe, **I want** readiness and stimulus sets worked out by the
recovery engine I've designed, **so that** they follow how I think muscles
respond to training.
Priority: Must · Status: agreed

Acceptance criteria
1. Given logged sets, then each muscle group's readiness and each
   workout's stimulus sets are exactly as [Annex A](#annex-a--the-recovery-engine)
   sets out, its worked examples passing as tests.
2. Given a workout saved after every other, then it is applied on its own;
   given one edited, deleted or back-dated, or a setting or an Exercise's
   groups changed, then the last 60 days are replayed in order.
3. Given Settings → Gym → Recovery, then I change points per fatigue set
   and the three recovery times, and each group's recovery type; the fixed
   constants aren't offered.

### GYM-020 — Settings for the Gym

**As** Joe, **I want** the Gym's settings in one place, **so that** it
starts each set the way I train.
Priority: Must · Status: agreed

Acceptance criteria
1. Given Settings → Gym, then Preferred RIR (a stepper, 1 to start; Joe,
   29 October) sets the RIR a new set starts at, in a template or a session.
2. Given Settings → Gym, then Equipment (GYM-001), Muscle groups and their
   targets (GYM-002, GYM-017), Recovery (GYM-019) and Archived exercises
   (GYM-005) open from there.

### GYM-021 — The Gym everywhere

**As** Joe, **I want** the Gym to work without signal, **so that** a
basement gym doesn't stop me logging.
Priority: Must · Status: agreed

Acceptance criteria
1. Given no signal, then I start, log, swap, end and review a workout,
   change working sets, and see readiness; everything is sent later.
2. Given Search, then Exercises, templates and workouts are found by name.
3. Given a workout, an Exercise or a template, then its changes are in the
   activity log (suggested).

Non-goals (Stage 5): cardio (Stage 8); Oura's readiness (Stage 8); a rest
timer; pounds; plate calculators; bodyweight tracking; sharing workouts or
templates with a Household; AI that writes programmes; warm-up sets (I
don't log them); a time of day for a planned workout; the Exercise's goal
as a Goal on the Goals page; suggestions on Plan or in Inbox.

How it is held and worked out: [ADR-0058](../../20-architecture/adr/0058-fitness-in-the-database.md)
and [ADR-0059](../../20-architecture/adr/0059-recovery-on-the-device.md)
(Proposed); the [data model](../../20-architecture/data-model.md)'s
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

Weight is logged with each set but is **not used** by the engine.

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
