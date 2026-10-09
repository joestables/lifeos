-- Google is the only way to sign up (ADR-0039, ACC-001). Email/password
-- sign-up through the API is refused, except for the addresses listed here
-- (the smoke-walk test account, created by hand: ADR-0003).
--
-- It refuses only sign-ups whose provider is plainly 'email', so a Google
-- sign-up can never be caught by it.

create table core_private.password_accounts (
  email text primary key check (email = lower(email))
);
alter table core_private.password_accounts enable row level security;

create function core_private.block_password_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_app_meta_data ->> 'provider' = 'email'
    and not exists (select 1 from core_private.password_accounts where email = lower(new.email)) then
    raise exception 'Sign up with Google' using errcode = '42501';
  end if;
  return new;
end
$$;

create trigger block_password_signup before insert on auth.users
for each row execute function core_private.block_password_signup();
