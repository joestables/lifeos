-- Stage 3 (plan step 9): connecting Google Calendar (GCL-001, ADR-0047).

-- ---------------------------------------------------------------------------
-- Connecting is LifeOS's own OAuth flow, run by the calendar-connect and
-- calendar-callback Edge Functions. The app starts it as me; Google sends me
-- back with a one-time state that names me; the refresh token goes into
-- Vault. A disconnected connection is kept, emptied, so reconnecting finds
-- its calendars and Google's ids again.

create table core_private.oauth_states (
  state uuid primary key default gen_random_uuid(),
  person_id uuid not null references core.people (id) on delete cascade,
  -- Where the app is, to come back to.
  return_to text not null check (length(return_to) <= 500),
  created_at timestamptz not null default now(),
  used_at timestamptz
);
alter table core_private.oauth_states enable row level security;

alter table core.connections add column disconnected_at timestamptz;
grant select (disconnected_at) on core.connections to authenticated;

-- I start connecting: a state for the callback to find me by.
create function core.calendar_begin(p_return_to text)
returns uuid
language sql security definer set search_path = '' as $$
  insert into core_private.oauth_states (person_id, return_to)
  values ((select auth.uid()), p_return_to)
  returning state
$$;

-- Google said yes: my connection, with its refresh token in Vault. A state
-- is good once, for 15 minutes.
create function core.calendar_connected(p_state uuid, p_account text, p_refresh_token text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  st core_private.oauth_states;
  c core.connections;
begin
  update core_private.oauth_states set used_at = now()
  where state = p_state and used_at is null and created_at > now() - interval '15 minutes'
  returning * into st;
  if st.state is null then
    raise exception 'That sign-in to Google has expired' using errcode = '22023';
  end if;

  insert into core.connections (person_id, provider, account)
  values (st.person_id, 'google_calendar', coalesce(p_account, ''))
  on conflict (person_id, provider) do update set
    account = coalesce(excluded.account, core.connections.account),
    state = 'connected',
    broken_since = null,
    disconnected_at = null
  returning * into c;

  if c.token_secret is null then
    update core.connections
    set token_secret = vault.create_secret(p_refresh_token, 'calendar_token_' || c.id, 'Google Calendar refresh token')
    where id = c.id;
  else
    perform vault.update_secret(c.token_secret, p_refresh_token);
  end if;
  return jsonb_build_object('connection', c.id, 'return_to', st.return_to);
end
$$;

-- The refresh token, for the Edge Functions only.
create function core.calendar_token(p_connection uuid)
returns text
language sql stable security definer set search_path = '' as $$
  select s.decrypted_secret from core.connections c
  join vault.decrypted_secrets s on s.id = c.token_secret
  where c.id = p_connection
$$;

revoke execute on function core.calendar_begin(text) from public;
revoke execute on function core.calendar_connected(uuid, text, text) from public;
revoke execute on function core.calendar_token(uuid) from public;
grant execute on function core.calendar_begin(text) to authenticated;
grant execute on function core.calendar_connected(uuid, text, text) to service_role;
grant execute on function core.calendar_token(uuid) to service_role;
