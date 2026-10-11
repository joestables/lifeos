-- Occurrences of a series, touched_at, and search. TSK-008, TSK-010,
-- TSK-011, SRC-001, NTE-001; ADR-0022, ADR-0030, ADR-0045.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(21);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'ben@example.com');
select id as a_space from core.spaces where created_by = '00000000-0000-4000-8000-00000000000a' \gset

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
set local role authenticated;

-- A weekly series and two of its occurrences.
insert into core.series (id, type, space_id, mode, rule, starts_on, timezone, template)
values ('00000000-0000-7000-8000-0000000000f1', 'task', :'a_space', 'schedule', 'FREQ=WEEKLY;BYDAY=MO',
        '2026-10-12', 'Europe/London', '{"title": "Bins"}');
insert into core.items (id, type, title, space_id, do_on, series_id, occurrence_on) values
  ('00000000-0000-7000-8000-000000000011', 'task', 'Bins', :'a_space', '2026-10-12', '00000000-0000-7000-8000-0000000000f1', '2026-10-12'),
  ('00000000-0000-7000-8000-000000000012', 'task', 'Bins', :'a_space', '2026-10-19', '00000000-0000-7000-8000-0000000000f1', '2026-10-19');

select throws_ok(
  format($$insert into core.items (id, type, space_id, do_on, series_id, occurrence_on) values
    ('00000000-0000-7000-8000-000000000013', 'task', %L, '2026-10-19', '00000000-0000-7000-8000-0000000000f1', '2026-10-19')$$, :'a_space'),
  '23505', null,
  'ADR-0045: a series makes one occurrence per date, however often it runs'
);
select throws_ok(
  format($$insert into core.series (type, space_id, mode, rule, starts_on, timezone)
    values ('note', %L, 'schedule', 'FREQ=DAILY', '2026-10-12', 'Europe/London')$$, :'a_space'),
  '23514', null,
  'TSK-008: only a Type with a do-on date can repeat'
);
select throws_ok(
  format($$insert into core.series (type, space_id, mode, rule, starts_on, timezone)
    values ('task', %L, 'schedule', 'every monday', '2026-10-12', 'Europe/London')$$, :'a_space'),
  '23514', null,
  'ADR-0045: a series holds an RRULE'
);

-- TSK-010, TSK-011: what the series writes doesn't count as my change.
select set_config('lifeos.series_writing', 'on', true);
update core.items set status = 'cancelled' where id = '00000000-0000-7000-8000-000000000011';
select set_config('lifeos.series_writing', '', true);
select is(
  (select touched_at from core.items where id = '00000000-0000-7000-8000-000000000011'),
  null,
  'TSK-010: an occurrence the series skips is not touched'
);
select core.update_item('00000000-0000-7000-8000-000000000012', '{"title": "Bins and recycling"}');
select isnt(
  (select touched_at from core.items where id = '00000000-0000-7000-8000-000000000012'),
  null,
  'TSK-011: an occurrence I change is touched, so the series leaves it alone'
);
-- Moving an occurrence keeps the date the series made it for.
select core.update_item('00000000-0000-7000-8000-000000000012', '{"do_on": "2026-10-20"}');
select is(
  (select occurrence_on from core.items where id = '00000000-0000-7000-8000-000000000012'),
  '2026-10-19'::date,
  'ADR-0045: a moved occurrence keeps the date it was made for'
);
-- Labelling an occurrence touches it too.
insert into core.items (id, type, title, space_id, do_on, series_id, occurrence_on) values
  ('00000000-0000-7000-8000-000000000014', 'task', 'Bins', :'a_space', '2026-10-26', '00000000-0000-7000-8000-0000000000f1', '2026-10-26');
select core.create_label('00000000-0000-7000-8000-0000000000a1', 'Home');
select core.add_label('00000000-0000-7000-8000-000000000014', '00000000-0000-7000-8000-0000000000a1');
select isnt(
  (select touched_at from core.items where id = '00000000-0000-7000-8000-000000000014'),
  null,
  'ADR-0022: labelling an occurrence touches it'
);
select is(
  (select count(*)::int from core.activity where item_id = '00000000-0000-7000-8000-000000000014' and verb = 'updated'),
  0,
  'ADR-0030: touched_at and the search index aren''t logged as changes'
);

-- SRC-001: search.
select core.create_item('00000000-0000-7000-8000-000000000021', 'task', '{"title": "Renew car insurance"}');
select core.create_item('00000000-0000-7000-8000-000000000022', 'note', '{"title": "House details", "body": "Home insurance renews in January"}');
select core.create_item('00000000-0000-7000-8000-000000000023', 'note', '{"title": "Boiler"}');
select core.create_label('00000000-0000-7000-8000-0000000000a2', 'Insurers');
select core.add_label('00000000-0000-7000-8000-000000000023', '00000000-0000-7000-8000-0000000000a2');
select core.create_item('00000000-0000-7000-8000-000000000024', 'thought', '{"title": "insurance for the bike?"}');
select core.archive_item('00000000-0000-7000-8000-000000000024');

select is(
  (select array_agg(id order by id) from core.search_items('insur')),
  array['00000000-0000-7000-8000-000000000021', '00000000-0000-7000-8000-000000000022',
        '00000000-0000-7000-8000-000000000023']::uuid[],
  'SRC-001: "insur" finds a word starting so in a title, a body or a Label'
);
select is(
  (select id from core.search_items('INSUR') limit 1),
  '00000000-0000-7000-8000-000000000021'::uuid,
  'SRC-001: a match in the title comes first, whatever the case typed'
);
select is(
  (select count(*)::int from core.search_items('insur') where id = '00000000-0000-7000-8000-000000000024'),
  0,
  'SRC-001: a deleted Item isn''t found'
);
select is(
  (select array_agg(id) from core.search_items('home insur')),
  array['00000000-0000-7000-8000-000000000022']::uuid[],
  'SRC-001: every word typed must match'
);
select is(
  (select count(*)::int from core.search_items('  ,. ')),
  0,
  'SRC-001: nothing typed finds nothing'
);
select is(
  (select count(*)::int from core.search_items('o''brien; drop table')),
  0,
  'SRC-001: punctuation is only a word break'
);

-- A renamed Label is found by its new name, and the Note isn't "changed".
-- (now() is fixed inside a test's transaction, so the Note is dated earlier first.)
reset role;
set local session_replication_role = replica;
update core.items set updated_at = '2026-01-01T00:00:00Z' where id = '00000000-0000-7000-8000-000000000023';
set local session_replication_role = origin;
set local role authenticated;
select core.rename_label('00000000-0000-7000-8000-0000000000a2', 'Plumbing');
select is(
  (select array_agg(id) from core.search_items('plumb')),
  array['00000000-0000-7000-8000-000000000023']::uuid[],
  'SRC-001: a renamed Label is found by its new name'
);
select is(
  (select updated_at from core.items where id = '00000000-0000-7000-8000-000000000023'),
  '2026-01-01T00:00:00Z'::timestamptz,
  'NTE-001: renaming a Label doesn''t move its Notes to the top'
);
select core.remove_label('00000000-0000-7000-8000-000000000023', '00000000-0000-7000-8000-0000000000a2');
select is(
  (select count(*)::int from core.search_items('plumb')),
  0,
  'SRC-001: a Label taken off is no longer found'
);
select core.update_item('00000000-0000-7000-8000-000000000023', '{"body": "Worcester Greenstar 30i"}');
select is(
  (select array_agg(id) from core.search_items('greenst')),
  array['00000000-0000-7000-8000-000000000023']::uuid[],
  'SRC-001: an edited body is found at once'
);
select isnt(
  (select updated_at from core.items where id = '00000000-0000-7000-8000-000000000023'),
  '2026-01-01T00:00:00Z'::timestamptz,
  'NTE-001: editing a Note does move it to the top'
);
reset role;

-- As Ben.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000b', true);
set local role authenticated;
select is(
  (select count(*)::int from core.search_items('insur')),
  0,
  'SRC-001: Ben finds none of Ann''s Items'
);
select is(
  (select count(*)::int from core.series),
  0,
  'ACC-002: Ben can''t see Ann''s series'
);
reset role;
select * from finish();
rollback;
