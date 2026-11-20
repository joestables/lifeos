-- The Today widget's day's clothes (Stage 6 step 10, WRD-026 1, TDY-006):
-- every Outfit worn on a day is one card, named as Today names it.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(4);

insert into auth.users (id, email) values ('00000000-0000-4000-8000-00000000000a', 'ann@example.com');
select id as a_space from core.spaces where created_by = '00000000-0000-4000-8000-00000000000a' \gset
update core.people set timezone = 'Europe/London';
insert into core.push_devices (id, person_id, kind, endpoint, label, created_at) values
  ('00000000-0000-7000-8000-0000000000f1', '00000000-0000-4000-8000-00000000000a', 'fcm',
   'fcm-token-ann-phone-0123456789', 'Android app', '2030-01-01 00:00:00+00');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true),
  set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
set local role authenticated;
select core.device_secret('00000000-0000-7000-8000-0000000000f1') as secret \gset
reset role;
select (now() at time zone 'Europe/London')::date as today \gset

-- Three garments; an outfit of two; today the outfit and a single garment,
-- tomorrow two single garments.
insert into core.items (id, type, title, space_id, owner_id, do_on, created_at) values
  ('00000000-0000-7000-8000-000000000101', 'garment', 'Navy shirt', :'a_space', '00000000-0000-4000-8000-00000000000a', null, '2026-10-01 09:00+00'),
  ('00000000-0000-7000-8000-000000000102', 'garment', 'Grey chinos', :'a_space', '00000000-0000-4000-8000-00000000000a', null, '2026-10-01 09:00+00'),
  ('00000000-0000-7000-8000-000000000103', 'garment', 'Black coat', :'a_space', '00000000-0000-4000-8000-00000000000a', null, '2026-10-01 09:00+00'),
  ('00000000-0000-7000-8000-000000000201', 'outfit', 'Navy work', :'a_space', '00000000-0000-4000-8000-00000000000a', null, '2026-10-01 09:00+00'),
  ('00000000-0000-7000-8000-000000000301', 'outfit_worn', 'Navy work', :'a_space', '00000000-0000-4000-8000-00000000000a', :'today', '2026-10-01 09:00+00'),
  ('00000000-0000-7000-8000-000000000302', 'outfit_worn', 'Black coat', :'a_space', '00000000-0000-4000-8000-00000000000a', :'today', '2026-10-01 09:01+00'),
  ('00000000-0000-7000-8000-000000000303', 'outfit_worn', 'Navy shirt', :'a_space', '00000000-0000-4000-8000-00000000000a', :'today'::date + 1, '2026-10-01 09:00+00'),
  ('00000000-0000-7000-8000-000000000304', 'outfit_worn', 'Grey chinos', :'a_space', '00000000-0000-4000-8000-00000000000a', :'today'::date + 1, '2026-10-01 09:01+00');
insert into core.links (from_item, to_item, link_type, origin, created_by) values
  ('00000000-0000-7000-8000-000000000201', '00000000-0000-7000-8000-000000000101', 'includes', 'action', '00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-7000-8000-000000000201', '00000000-0000-7000-8000-000000000102', 'includes', 'action', '00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-7000-8000-000000000301', '00000000-0000-7000-8000-000000000201', 'wears', 'action', '00000000-0000-4000-8000-00000000000a');
-- (An outfit's garments are kept as it is worn, by the wears link's trigger.)
insert into wardrobe.worn_garments (worn_id, garment_id) values
  ('00000000-0000-7000-8000-000000000302', '00000000-0000-7000-8000-000000000103'),
  ('00000000-0000-7000-8000-000000000303', '00000000-0000-7000-8000-000000000101'),
  ('00000000-0000-7000-8000-000000000304', '00000000-0000-7000-8000-000000000102');

create temp view cards as
  select p.day, c from core.device_plan('00000000-0000-7000-8000-0000000000f1', :'secret') p,
    jsonb_array_elements(p.cards) c;
grant select on cards to public;

select is(
  (select array_agg(c ->> 'title' || ' ' || (c ->> 'type') || ' ' || (c ->> 'colour')) from cards where day = :'today'),
  array['Navy work outfit_worn orange'],
  'WRD-026 1: an outfit and a single garment on a day are one orange card, the outfit''s name'
);
select is(
  (select array_agg(c ->> 'title') from cards where day = :'today'::date + 1),
  array['2 garments'],
  'single garments alone: how many'
);
update core.items set title = '' where id = '00000000-0000-7000-8000-000000000201';
select is(
  (select array_agg(c ->> 'title') from cards where day = :'today'),
  array['Outfit · 2 garments'],
  'an outfit with no name: "Outfit" and its garments'
);
update core.items set do_on = :'today' where type = 'outfit_worn';
insert into core.items (id, type, title, space_id, owner_id, do_on) values
  ('00000000-0000-7000-8000-000000000305', 'outfit_worn', 'Navy work', :'a_space', '00000000-0000-4000-8000-00000000000a', :'today');
insert into core.links (from_item, to_item, link_type, origin, created_by) values
  ('00000000-0000-7000-8000-000000000305', '00000000-0000-7000-8000-000000000201', 'wears', 'action', '00000000-0000-4000-8000-00000000000a');
select is(
  (select array_agg(c ->> 'title') from cards where day = :'today'),
  array['2 outfits'],
  'two outfits: how many'
);
select * from finish();
rollback;
