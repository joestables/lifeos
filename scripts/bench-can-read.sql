-- The can_read benchmark (Stage 1, step 11; ADR-0017): seeded data on a
-- throwaway database, never the live project. Run by scripts/bench-can-read.sh.
\set ON_ERROR_STOP 1
set client_min_messages = warning;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ann@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'ben@example.com');
insert into core.spaces (id, kind, name, created_by)
values ('00000000-0000-7000-8000-0000000000aa', 'household', 'Home', '00000000-0000-4000-8000-00000000000a');
insert into core.space_members (space_id, person_id) values
  ('00000000-0000-7000-8000-0000000000aa', '00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-7000-8000-0000000000aa', '00000000-0000-4000-8000-00000000000b');

-- Ann: 4,000 Personal Tasks over a year, 1,000 Thoughts and Notes, 600
-- Household Events; 600 of her Tasks are "for" an Event (visible to Ben one
-- hop away). Ben: 2,000 Personal Tasks.
create temp table people (id uuid, space uuid, n int);
insert into people
select p.id, s.id, case when p.id = '00000000-0000-4000-8000-00000000000a' then 4000 else 2000 end
from core.people p join core.spaces s on s.created_by = p.id and s.kind = 'personal';

insert into core.items (type, title, space_id, owner_id, do_on, status)
select 'task', 'Task ' || g, p.space, p.id, date '2026-01-01' + (g % 365),
       case when g % 5 = 0 then 'done' else 'active' end
from people p, generate_series(1, p.n) g;

insert into core.items (type, title, space_id, owner_id)
select case when g % 2 = 0 then 'thought' else 'note' end, 'Thing ' || g, p.space, p.id
from people p, generate_series(1, 1000) g
where p.id = '00000000-0000-4000-8000-00000000000a';

insert into core.items (type, title, space_id, owner_id, starts_at)
select 'event', 'Event ' || g, '00000000-0000-7000-8000-0000000000aa',
       '00000000-0000-4000-8000-00000000000a', timestamptz '2026-01-01 18:00Z' + (g % 365) * interval '1 day'
from generate_series(1, 600) g;

insert into core.links (from_item, to_item, link_type, created_by)
select t.id, e.id, 'for', '00000000-0000-4000-8000-00000000000a'
from (select id, row_number() over (order by id) r from core.items
      where type = 'task' and owner_id = '00000000-0000-4000-8000-00000000000a' limit 600) t
join (select id, row_number() over (order by id) r from core.items where type = 'event') e using (r);

-- Ann: 300 Recipes, each with two Variations (Stage 4), seen by Ben through
-- the Household, not a link (ADR-0051).
insert into core.items (id, type, title, space_id, owner_id)
select ('00000000-0000-7000-9000-' || lpad(to_hex(g), 12, '0'))::uuid, 'recipe', 'Recipe ' || g,
       p.space, p.id
from people p, generate_series(1, 300) g
where p.id = '00000000-0000-4000-8000-00000000000a';
insert into core.items (id, type, title, space_id, owner_id, status)
select ('00000000-0000-7000-a000-' || lpad(to_hex(g * 2 + v), 12, '0'))::uuid, 'variation', 'Way ' || v,
       p.space, p.id, 'active'
from people p, generate_series(1, 300) g, generate_series(0, 1) v
where p.id = '00000000-0000-4000-8000-00000000000a';
insert into core.links (from_item, to_item, link_type, created_by)
select ('00000000-0000-7000-a000-' || lpad(to_hex(g * 2 + v), 12, '0'))::uuid,
       ('00000000-0000-7000-9000-' || lpad(to_hex(g), 12, '0'))::uuid,
       'variation_of', '00000000-0000-4000-8000-00000000000a'
from generate_series(1, 300) g, generate_series(0, 1) v;

analyze;

select format('seeded: %s Items, %s links', (select count(*) from core.items), (select count(*) from core.links));
