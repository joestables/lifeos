-- Connecting Google Calendar is finished by the person who began it
-- (GCL-001, ADR-0047; Joe, 17 October). And the app can read what it asks
-- of my calendars.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'bob@example.com');
create function pg_temp.as_person(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true),
         set_config('request.jwt.claim.sub', p::text, true)
$$;

-- Bob begins, and sends Ann Google's consent page; Ann says yes there.
select pg_temp.as_person('00000000-0000-4000-8000-00000000000b');
set local role authenticated;
select core.calendar_begin('https://lifeos-bice-mu.vercel.app/settings') as state \gset
reset role;
select core.calendar_received(:'state', 'ann@gmail.com', 'ann-refresh') ->> 'finish' as code \gset
select is((select count(*)::int from core.connections), 0, 'GCL-001: Google''s answer connects no one by itself');
select throws_ok(format($$select core.calendar_received(%L, 'x', 'y')$$, :'state'), '22023', null,
  'GCL-001: a state is good once');

-- Ann's browser holds the code; finishing as Ann is refused (she didn't begin).
select pg_temp.as_person('00000000-0000-4000-8000-00000000000a');
set local role authenticated;
select throws_ok(format($$select core.calendar_finish(%L)$$, :'code'), '22023', null,
  'GCL-001: only the person who began can finish');
reset role;
select is((select count(*)::int from core.connections), 0, 'and nothing is connected');

-- Ann begins and finishes her own.
set local role authenticated;
select core.calendar_begin('https://lifeos-bice-mu.vercel.app/settings') as mine \gset
reset role;
select core.calendar_received(:'mine', 'ann@gmail.com', 'ann-refresh') ->> 'finish' as mycode \gset
set local role authenticated;
select core.calendar_finish(:'mycode') as conn \gset
reset role;
select is(core.calendar_token(:'conn'), 'ann-refresh', 'GCL-001: finished, my connection has its token');
select is((select decrypted_secret from vault.decrypted_secrets s join core_private.oauth_states o
  on o.token_secret = s.id where o.state = :'mine'), '', 'and the waiting copy is emptied');
set local role authenticated;
select throws_ok(format($$select core.calendar_finish(%L)$$, :'mycode'), '22023', null,
  'GCL-001: a finish code is good once');

-- What the app reads of my calendars, it may read.
select lives_ok(
  $$select item_id, calendar_link_id, external_id, made_in_lifeos from core.external_refs$$,
  'GCL-003: the app can read each Event''s reference, and whether I made it'
);
reset role;

select * from finish();
rollback;
