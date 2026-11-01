# Plan: Stage 5 — Gym

**Outcome** ([roadmap](../../roadmap.md)): Joe trains from LifeOS. **Gym**
has three tabs: **Workouts**, every workout and the templates;
**Recovery**, readiness on a body map, weekly targets and what to do
next; and **Progression**, muscle groups and the exercise library. A
workout is logged at the gym, offline too, exercises moving from the
backlog into the session in the order done. Joe's recovery engine works
out readiness and stimulus sets. Planned workouts are on Plan with no Plan
work ([ADR-0029](../../20-architecture/adr/0029-plan-reads-core-items.md)).
Goals and the measures registry follow, with their own spec.

**State:** started 29 October 2026, on its own branch while Stage 4b's
step 10 is still in hand ([its plan](stage-4b.md)); building waits for
Joe's word. Step 1 is done: Joe agreed the
[Gym spec](../../10-requirements/modules/gym.md) (GYM-001–021, with his
recovery engine as Annex A) on 29 October, Claude's suggestions in it
provisionally. Step 2, the decisions, is done (Joe, 29 October). Step 3,
the design, has its fourth pass for Joe (2 November).

## Steps

Steps marked **Joe** need Joe's go-ahead or action before Claude does them.
Every step that builds a screen follows the [design system](../../30-design/README.md)
checklist and brings its own Playwright walks, citing the requirements it
verifies, against a stand-in for Supabase.

| # | Step | State | Produces |
|---|---|---|---|
| 1 | **Joe** — specs: equipment and muscle groups, exercises, templates, planning and logging a workout, the review, the workouts list, progression, readiness and the body map, weekly targets, what to do next, the recovery engine, Settings → Gym | Drafted from Joe's notes, 22 October; second draft 29 October with his comments and his recovery engine as Annex A; third draft the same day with his answers to the open points; agreed 29 October, the suggestions provisionally. **Done** | [gym](../../10-requirements/modules/gym.md) (GYM-*) |
| 2 | Decisions: how fitness is held in the database (Items, child rows, reference data, a planned day, Skipped, one in progress, exact weights, the snapshot); where the recovery engine and progression are worked out | Written 29 October: [ADR-0058](../../20-architecture/adr/0058-fitness-in-the-database.md) (Exercise, Workout template and Workout as Personal Items; a Workout planned by `do_on`, Skipped worked out; one primary group at 1.0 and secondary groups 0.1–0.9; template sets with RIR; entries in the backlog or the session, ordered as begun, each with a snapshot but not its groups; equipment, muscle groups and settings as each person's reference data, the twenty built-in groups shared; weights `numeric` in kg and whole grams on the device), [ADR-0059](../../20-architecture/adr/0059-recovery-on-the-device.md) (`packages/fitness` holds the engine, Epley strength, coverage, targets, ranking and progression, run on the device for the screens and by an Edge Function wherever the server needs a figure, never copied into SQL; nothing stored; a year of workouts kept on the device); the data model and glossary updated to match. Joe asked why the device and not the server; ADR-0059 was then widened so the server runs the same package. Joe agreed both, 29 October. **Done** | ADRs |
| 3 | **Joe** — design, with Claude design: the three tabs; a workout in progress (backlog, session, expanding and collapsing, steppers, set history); End and the review with its suggested working sets; New workout; a template with its coverage; an Exercise's page and chart; a muscle group's chart with its exercises' lines and stimulus-set bars; the body map, front and back, on one continuous red–amber–green scale; Settings → Gym. Into the design spec first (the body map and the scale are new), then the shared components, with the screenshot tests refreshed | First pass 29 October on a [design canvas](https://claude.ai/artifact/NXxJeLcMza7iuHQjqDadmG) (private to Joe), drawn from the real components on `/design-stage-5` (development and preview builds only; `DESIGN_PAGE=design-stage-5 scripts/design-shots.mjs` takes its screenshots), dark and light, computer and phone. Joe found it unpolished (31 October) and set out thirteen changes, which changed the spec too: no goal on an Exercise; Strength, never Epley; a template's exercises a number of sets, looking like a workout's; sets logged in a popup and read as text, or logged without numbers (10 reps at RIR 2 for recovery); Add exercise and Swap by muscle group; status pills; the Workouts tab in two columns, All workouts (filters, sort, pages, averages) and All templates (GYM-022); New workout's template cards; the review's PR, working set and Update working set; Recovery's look-ahead slider and rings, Up next and Below target moved off it; Progression's list beside its chart, with exercise pills (three primary, three secondary); the body map a stand-in to redraw after use; a larger overall readiness (`text-display`). Second pass the same day, every screen rebuilt and checked over several rounds of screenshots, with options A and B for a workout in progress and for RIR in the set popup, and four questions. Drafted in `@/components/lifeos` (`Gym.tsx`, `BodyMap.tsx`, `readiness.ts`) and specced as drafts in components.md: PanelHeading, PanelRow, PanelFooter, StatTile, WorkoutStatePill, ValueStepper and StepperField, ExerciseCard, SetLine, LogSetButton, FormNotes, MuscleChoice, StimulusRow, the readiness parts, BodyMap, ProgressChart, LinePill and ChartKey, SideColumns, ListDetail, RangeFilter; Badge gains `success`, Slider a thumb per value, FilterPanel a group's own control. Third pass 1 November after Joe's answers and further comments (he agreed the templates, Up next kept, the session in one column, the set popup's RIR buttons): one most suitable template; five recent workouts on a phone, no durations; Weekly sessions; a coral edge on the chosen RadioCard (now `--primary` everywhere); "3 of 3 sets" and a CurrentLine; Log set always there; sets edited in the popup (Delete there); Tracked · Quick; motivation as thumbs (MotivationChoice); "Current" for working set (spec, ADR-0058, data model, glossary); Beat current; Recovery's and Progression's rows down to last trained and average frequency; contributions in brackets; Desired weekly frequency; Dialog `list` for long popups on a phone. Options: logged sets as lines or a table (SetTable). Fourth pass 2 November: Joe chose the table for a workout in progress (phone and computer) and, for the review, Current and PR figures over the same table; "3 of 3 sets" kept when collapsed, Current moved under the form notes (dumbbell), a quick set's row as dashes; "Weight (kg)" in the popup's heading, Tracked · Quick a normal-width toggle; motivation as Low, Okay, High pills with coloured faces (MotivationChoice, MotivationBadge); Up next's "Readiness 96 %"; weekly sessions as "×3.1"; Templates and Settings back on the canvas. Waiting on Joe | [design system](../../30-design/README.md), components |
| 4 | Schema: the `fitness` Module in the ontology; the detail tables, child rows and reference data of ADR-0058, the twenty built-in muscle groups; the write functions; the activity log for fitness; the generated data model; database tests | — | Migrations, database tests |
| 5 | `packages/fitness`: strength and PRs, the recovery engine (Annex A), stimulus sets, coverage, weekly targets, stalled, ranking; unit tests from Annex A's examples | — | Package, unit tests citing GYM-019 |
| 6 | Settings → Gym and the library: equipment, muscle groups and their settings, Preferred RIR, the engine's settings; Exercises (making, editing, archiving); Gym joins its three tabs | — | Code, tests citing GYM-001–005, GYM-020 |
| 7 | Templates: making and editing, dragging, numbers of sets, coverage; All templates | — | Code, tests citing GYM-006 |
| 8 | Workouts: planning (and on Plan), Start, the backlog, adding and swapping, logging, done and undone, End and the review, the workouts list; offline and in Search | — | Code, tests citing GYM-007–013, GYM-021 |
| 9 | Recovery: readiness, the body map, weekly targets, what to do next | — | Code, tests citing GYM-016–018 |
| 10 | Progression: an Exercise's and a muscle group's charts, stimulus sets behind, stalled exercises | — | Code, tests citing GYM-014–015 |
| 11 | **Joe** — uses the Gym at the gym; what he trips over is fixed | — | Code, tests |
| 12 | **Joe** — Goals and the measures registry: their own spec, then their steps here | — | Spec, then code |

Each step's code goes into the specs' status as it lands (*built*, then
*verified* when a test citing the ID passes).

## Joe's brief (22 October)

Joe's notes, written into the spec's first draft: equipment types with
exact increments; built-in and custom muscle groups; exercises with an
equipment type, primary and secondary groups and a working weight; an
exercise library; templates; a workout planned for a day or today, from a
template or from scratch, started with Start; every exercise starting in
the backlog and moved into the session as it is done; easy adding and
swapping; sets of weight, reps and RIR with steppers; an exercise marked
done; ending with how it went and motivation beforehand, then a read-only
review that can move working weights; a filtered, sorted list of
workouts; progression over a month, three months and a year, with a
working weight, a PR by strength (Epley's formula) and a goal (since moved to the Goals app); archiving exercises;
readiness overall and per muscle on a body map; templates recommended
from readiness and frequency; and being told when frequency is too low.
His comments of 29 October, and his recovery engine, are written into the
spec as it stands.
