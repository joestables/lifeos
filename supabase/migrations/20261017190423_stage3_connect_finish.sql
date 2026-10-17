-- Stage 3 (Joe, 17 October): connecting Google Calendar is finished by the
-- person who began it (GCL-001, ADR-0047). Google's callback carries no app
-- sign-in, so a consent link made by one person and opened by another
-- would have tied the other's Google calendar to the first's LifeOS. Now
-- the callback only holds the token against its state and sends me back to
-- the app with a one-time finish code; the app, signed in as me, finishes,
-- and the database refuses anyone but the person who began.
--
-- And the app may read whether a Google event was made in LifeOS
-- (stage3_refs_origin), which its read of my calendars asks for.

grant select (made_in_lifeos) on core.external_refs to authenticated;

alter table core_private.oauth_states
  add column token_secret uuid,
  add column account text,
  add column finish_code uuid unique,
  add column received_at timestamptz,
  add column finished_at timestamptz;

-- Google said yes: the token waits, in Vault, against the state (good once,
-- for 15 minutes), for me to finish.
create function core.calendar_received(p_state uuid, p_account text, p_refresh_token text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  st core_private.oauth_states;
begin
  update core_private.oauth_states set used_at = now()
  where state = p_state and used_at is null and created_at > now() - interval '15 minutes'
  returning * into st;
  if st.state is null then
    raise exception 'That sign-in to Google has expired' using errcode = '22023';
  end if;
  update core_private.oauth_states set
    token_secret = vault.create_secret(p_refresh_token, 'calendar_pending_' || st.state,
                                       'Google Calendar refresh token, waiting to be finished'),
    account = coalesce(p_account, ''),
    finish_code = gen_random_uuid(),
    received_at = now()
  where state = st.state
  returning * into st;
  return jsonb_build_object('finish', st.finish_code, 'return_to', st.return_to);
end
$$;

-- I finish connecting: only the person who began, once, within 15 minutes.
-- My connection takes the token; the waiting copy is emptied.
create function core.calendar_finish(p_code uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  st core_private.oauth_states;
  c core.connections;
  token text;
begin
  update core_private.oauth_states set finished_at = now()
  where finish_code = p_code and finished_at is null
    and received_at > now() - interval '15 minutes'
    and person_id = (select auth.uid())
  returning * into st;
  if st.state is null then
    raise exception 'That sign-in to Google has expired' using errcode = '22023';
  end if;
  select decrypted_secret into token from vault.decrypted_secrets where id = st.token_secret;

  insert into core.connections (person_id, provider, account)
  values (st.person_id, 'google_calendar', st.account)
  on conflict (person_id, provider) do update set
    account = coalesce(nullif(excluded.account, ''), core.connections.account),
    state = 'connected',
    broken_since = null,
    disconnected_at = null
  returning * into c;
  if c.token_secret is null then
    update core.connections
    set token_secret = vault.create_secret(token, 'calendar_token_' || c.id, 'Google Calendar refresh token')
    where id = c.id;
  else
    perform vault.update_secret(c.token_secret, token);
  end if;
  perform vault.update_secret(st.token_secret, '');
  return c.id;
end
$$;

-- The callback no longer connects anyone itself.
revoke execute on function core.calendar_connected(uuid, text, text) from service_role;

revoke execute on function core.calendar_received(uuid, text, text) from public;
revoke execute on function core.calendar_finish(uuid) from public;
grant execute on function core.calendar_received(uuid, text, text) to service_role;
grant execute on function core.calendar_finish(uuid) to authenticated;
