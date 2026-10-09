-- Google is the only way to sign up. ACC-001; ADR-0039.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(3);

select throws_ok(
  $$insert into auth.users (id, email, raw_app_meta_data)
    values ('00000000-0000-4000-8000-0000000000e1', 'eve@example.com', '{"provider": "email", "providers": ["email"]}')$$,
  '42501', null,
  'ACC-001: an email/password sign-up through the API is refused'
);
select lives_ok(
  $$insert into auth.users (id, email, raw_app_meta_data)
    values ('00000000-0000-4000-8000-0000000000e2', 'gail@example.com', '{"provider": "google", "providers": ["google"]}')$$,
  'ACC-001: a Google sign-up goes through'
);
insert into core_private.password_accounts (email) values ('smoke@example.com');
select lives_ok(
  $$insert into auth.users (id, email, raw_app_meta_data)
    values ('00000000-0000-4000-8000-0000000000e3', 'Smoke@example.com', '{"provider": "email", "providers": ["email"]}')$$,
  'ADR-0003: the hand-made test account can have a password'
);

select * from finish(true);
rollback;
