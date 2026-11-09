-- Repeating Tasks: setting, changing and stopping a repeat, after
-- completion, and the nightly run. TSK-008–011; ADR-0022, ADR-0045.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(28);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'ben@example.com');
select id as a_space from core.spaces where created_by = '00000000-0000-4000-8000-00000000000a' \gset

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
set local role authenticated;

-- "Bins" every Monday at 18:30, labelled Home, due the day after.
select core.create_label('00000000-0000-7000-8000-0000000000a1', 'Home');
select core.create_item('00000000-0000-7000-8000-000000000101', 'task',
  '{"title": "Bins", "do_on": "2026-10-12", "do_at": "18:30", "due_on": "2026-10-13"}');
select core.add_label('00000000-0000-7000-8000-000000000101', '00000000-0000-7000-8000-0000000000a1');

select core.set_repeat(
  '00000000-0000-7000-8000-000000000101',
  '00000000-0000-7000-8000-0000000001f1',
  'schedule', 'FREQ=WEEKLY;BYDAY=MO', '2026-10-12', 'Europe/London',
  '{"title": "Bins", "do_at": "18:30", "due_offset_days": 1, "label_ids": ["00000000-0000-7000-8000-0000000000a1"]}',
  '[{"id": "00000000-0000-7000-8000-000000000101", "on": "2026-10-12"},
    {"id": "00000000-0000-7000-8000-000000000102", "on": "2026-10-19"},
    {"id": "00000000-0000-7000-8000-000000000103", "on": "2026-10-26"},
    {"id": "00000000-0000-7000-8000-000000000104", "on": "2026-11-02"}]',
  '2026-11-02'
);

select is(
  (select (series_id, occurrence_on, touched_at)::text from core.items where id = '00000000-0000-7000-8000-000000000101'),
  '(00000000-0000-7000-8000-0000000001f1,2026-10-12,)',
  'TSK-008: the Task becomes its series'' first occurrence, untouched'
);
select is(
  (select array_agg(do_on::text || ' ' || do_at::text || ' due ' || due_on::text order by do_on)
   from core.items where series_id = '00000000-0000-7000-8000-0000000001f1'),
  array['2026-10-12 18:30:00 due 2026-10-13', '2026-10-19 18:30:00 due 2026-10-20',
        '2026-10-26 18:30:00 due 2026-10-27', '2026-11-02 18:30:00 due 2026-11-03'],
  'TSK-008: each occurrence is made with the Task''s time and its due date the same distance after'
);
select is(
  (select count(*)::int from core.item_labels l join core.items i on i.id = l.item_id
   where i.series_id = '00000000-0000-7000-8000-0000000001f1'),
  4,
  'TSK-008: each occurrence has the Task''s Labels'
);
select is(
  (select count(*)::int from core.items where series_id = '00000000-0000-7000-8000-0000000001f1' and touched_at is not null),
  0,
  'ADR-0022: what the series makes is untouched'
);
select is(
  (select generated_until from core.series where id = '00000000-0000-7000-8000-0000000001f1'),
  '2026-11-02'::date,
  'ADR-0045: the series records how far it is made'
);

-- The queue replays it: nothing new.
select core.set_repeat(
  '00000000-0000-7000-8000-000000000101',
  '00000000-0000-7000-8000-0000000001f1',
  'schedule', 'FREQ=WEEKLY;BYDAY=MO', '2026-10-12', 'Europe/London',
  '{"title": "Bins"}',
  '[{"id": "00000000-0000-7000-8000-000000000101", "on": "2026-10-12"}]',
  '2026-11-02'
);
select is(
  (select count(*)::int from core.items where series_id = '00000000-0000-7000-8000-0000000001f1'),
  4,
  'OFF-002: setting a repeat twice makes it once'
);

-- TSK-008 3: 18:30 London either side of the clocks going back (25 October).
select is(
  (select array_agg(to_char(r.fires_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') order by r.fires_at)
   from core.alerts r join core.items i on i.id = r.item_id
   where i.id in ('00000000-0000-7000-8000-000000000102', '00000000-0000-7000-8000-000000000103')),
  array['2026-10-19 17:30', '2026-10-26 18:30'],
  'TSK-008: every occurrence is at 18:30 London time, either side of the clocks changing'
);

-- TSK-011 1: changing one occurrence changes only it.
select core.update_item('00000000-0000-7000-8000-000000000102', '{"title": "Bins and recycling"}');
select is(
  (select array_agg(title order by do_on) from core.items where series_id = '00000000-0000-7000-8000-0000000001f1'),
  array['Bins', 'Bins and recycling', 'Bins', 'Bins'],
  'TSK-011: a change to one occurrence changes only that one'
);

-- TSK-011 2: from 26 October, every Tuesday instead. The 19th (changed
-- above) is before it; mark 2 November as changed too.
select core.update_item('00000000-0000-7000-8000-000000000104', '{"title": "Bins (bank holiday)"}');
select core.set_repeat(
  '00000000-0000-7000-8000-000000000103',
  '00000000-0000-7000-8000-0000000001f2',
  'schedule', 'FREQ=WEEKLY;BYDAY=TU', '2026-10-26', 'Europe/London',
  '{"title": "Bins", "do_at": "18:30", "label_ids": []}',
  '[{"id": "00000000-0000-7000-8000-000000000103", "on": "2026-10-27"},
    {"id": "00000000-0000-7000-8000-000000000105", "on": "2026-11-03"}]',
  '2026-11-03'
);
select is(
  (select ended_on from core.series where id = '00000000-0000-7000-8000-0000000001f1'),
  '2026-10-25'::date,
  'TSK-011: the old repeat ends the day before'
);
select is(
  (select array_agg(id::text || ' ' || coalesce(series_id::text, '') order by id)
   from core.items where id in ('00000000-0000-7000-8000-000000000101', '00000000-0000-7000-8000-000000000102')),
  array['00000000-0000-7000-8000-000000000101 00000000-0000-7000-8000-0000000001f1',
        '00000000-0000-7000-8000-000000000102 00000000-0000-7000-8000-0000000001f1'],
  'TSK-011: earlier occurrences are unchanged'
);
select is(
  (select (series_id, do_on)::text from core.items where id = '00000000-0000-7000-8000-000000000103'),
  '(00000000-0000-7000-8000-0000000001f2,2026-10-27)',
  'TSK-011: from there it follows the new repeat'
);
select is(
  (select (series_id, archived_at is null, title)::text from core.items where id = '00000000-0000-7000-8000-000000000104'),
  '(00000000-0000-7000-8000-0000000001f1,t,"Bins (bank holiday)")',
  'TSK-011: an occurrence I had changed stays as it is'
);
select is(
  (select count(*)::int from core.items where series_id = '00000000-0000-7000-8000-0000000001f2'),
  2,
  'TSK-011: the new repeat makes its own occurrences'
);

-- TSK-011 3: stopping from 27 October keeps it, done and changed ones, and
-- takes away untouched ones after it.
insert into core.items (id, type, title, space_id, do_on, series_id, occurrence_on) values
  ('00000000-0000-7000-8000-000000000106', 'task', 'Bins', :'a_space', '2026-11-10', '00000000-0000-7000-8000-0000000001f2', '2026-11-10');
select core.update_item('00000000-0000-7000-8000-000000000106', '{"status": "done"}');
select core.stop_repeat('00000000-0000-7000-8000-000000000103');
select is(
  (select array_agg(id::text || ' ' || (archived_at is null) order by id)
   from core.items where series_id = '00000000-0000-7000-8000-0000000001f2'),
  array['00000000-0000-7000-8000-000000000103 true',
        '00000000-0000-7000-8000-000000000105 false',
        '00000000-0000-7000-8000-000000000106 true'],
  'TSK-011: stopping takes away future occurrences I hadn''t changed, and keeps the rest'
);
select is(
  (select ended_on from core.series where id = '00000000-0000-7000-8000-0000000001f2'),
  '2026-10-27'::date,
  'TSK-011: a stopped repeat ends with the Task it was stopped from'
);
select is(
  (select touched_at from core.items where id = '00000000-0000-7000-8000-000000000105'),
  null,
  'ADR-0022: what stopping takes away isn''t counted as my change (it stays out of Recently deleted)'
);

-- TSK-009: "descale the kettle" three months after it's done.
select core.create_item('00000000-0000-7000-8000-000000000201', 'task', '{"title": "Descale the kettle", "do_on": "2026-10-10"}');
select core.set_repeat(
  '00000000-0000-7000-8000-000000000201',
  '00000000-0000-7000-8000-0000000002f1',
  'after_completion', 'FREQ=MONTHLY;INTERVAL=3', '2026-10-10', 'Europe/London',
  '{"title": "Descale the kettle"}',
  '[{"id": "00000000-0000-7000-8000-000000000201", "on": "2026-10-10"}]',
  '2026-10-10'
);
select core.complete_occurrence('00000000-0000-7000-8000-000000000201', '00000000-0000-7000-8000-000000000202', '2027-01-10');
select core.complete_occurrence('00000000-0000-7000-8000-000000000201', '00000000-0000-7000-8000-000000000202', '2027-01-10');
select is(
  (select array_agg(status || ' ' || do_on order by do_on) from core.items where series_id = '00000000-0000-7000-8000-0000000002f1'),
  array['done 2026-10-10', 'active 2027-01-10'],
  'TSK-009: ticking it on 10 October makes the next on 10 January, once'
);

-- A Task on a schedule is ticked the same way, and makes nothing.
select core.complete_occurrence('00000000-0000-7000-8000-000000000101', '00000000-0000-7000-8000-000000000299', '2026-10-19');
select is(
  (select count(*)::int from core.items where id = '00000000-0000-7000-8000-000000000299'),
  0,
  'TSK-008: ticking a Task on a schedule makes nothing new'
);

-- The nightly run is the service role's alone.
select throws_ok('select * from core.series_to_extend()', '42501', null,
  'ADR-0045: a person can''t run the nightly series run');
select throws_ok($$select core.finish_series_run(true)$$, '42501', null,
  'ADR-0045: nor finish it');

reset role;
set local role service_role;

-- A daily "Vitamins" series, made to today, extended by the run.
-- Dates as London has them: the run decides what is due in the series' timezone.
select (now() at time zone 'Europe/London')::date as london_today \gset
insert into core.series (id, type, space_id, owner_id, mode, rule, starts_on, timezone, template, generated_until)
values ('00000000-0000-7000-8000-0000000003f1', 'task', :'a_space', '00000000-0000-4000-8000-00000000000a',
        'schedule', 'FREQ=DAILY', (:'london_today')::date - 2, 'Europe/London', '{"title": "Vitamins"}', (:'london_today')::date - 1);
insert into core.items (id, type, title, space_id, owner_id, do_on, series_id, occurrence_on) values
  ('00000000-0000-7000-8000-000000000301', 'task', 'Vitamins', :'a_space', '00000000-0000-4000-8000-00000000000a', (:'london_today')::date - 2, '00000000-0000-7000-8000-0000000003f1', (:'london_today')::date - 2),
  ('00000000-0000-7000-8000-000000000302', 'task', 'Vitamins', :'a_space', '00000000-0000-4000-8000-00000000000a', (:'london_today')::date - 1, '00000000-0000-7000-8000-0000000003f1', (:'london_today')::date - 1);
update core.items set touched_at = now(), body = 'Took half' where id = '00000000-0000-7000-8000-000000000301';

select is(core.series_secret_ok('guess'), false,
  'ADR-0045: the nightly run refuses a call without its secret');
select ok(
  exists (select 1 from core.series_to_extend() where id = '00000000-0000-7000-8000-0000000003f1'),
  'ADR-0045: the run finds each series still making occurrences'
);
select ok(
  exists (select 1 from core.series_to_extend()
          where id = '00000000-0000-7000-8000-0000000002f1' and last_done_on is null),
  'ADR-0045: an after-completion series with one open needs nothing'
);
-- TSK-009: the open one deleted, nothing comes back overnight.
update core.items set archived_at = now() where id = '00000000-0000-7000-8000-000000000202';
select ok(
  exists (select 1 from core.series_to_extend()
          where id = '00000000-0000-7000-8000-0000000002f1' and last_done_on is null),
  'TSK-009: an after-completion series whose open one I deleted makes no more'
);
update core.items set archived_at = null where id = '00000000-0000-7000-8000-000000000202';
select core.extend_series('00000000-0000-7000-8000-0000000003f1', array[(:'london_today')::date, (:'london_today')::date + 1], (:'london_today')::date + 1);
select core.extend_series('00000000-0000-7000-8000-0000000003f1', array[(:'london_today')::date, (:'london_today')::date + 1], (:'london_today')::date + 1);
select is(
  (select count(*)::int from core.items where series_id = '00000000-0000-7000-8000-0000000003f1'),
  4,
  'ADR-0045: running twice still leaves one occurrence a day'
);
select is(
  (select (generated_until - (:'london_today')::date) from core.series where id = '00000000-0000-7000-8000-0000000003f1'),
  1,
  'ADR-0045: the run records how far it made the series'
);

-- TSK-010: today's has come due, so yesterday's untouched one is skipped;
-- the day before's, which I changed, stays open.
select core.finish_series_run(true, '{"series": 1}');
select is(
  (select array_agg(status order by occurrence_on) from core.items where series_id = '00000000-0000-7000-8000-0000000003f1'),
  array['active', 'cancelled', 'active', 'active'],
  'TSK-010: a missed occurrence I hadn''t changed is skipped when a newer one comes due; one I had changed stays open'
);
reset role;
select is(
  (select ok from ops.heartbeats where name = 'extend-series'),
  true,
  'ADR-0045: the run records its heartbeat'
);

select * from finish();
rollback;
