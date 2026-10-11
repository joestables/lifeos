-- Functions are executable only by the roles granted them. The core schema
-- migration meant this with "alter default privileges in schema …
-- revoke execute … from public", but Postgres can't take away its built-in
-- grant to PUBLIC per schema, only for everything a role makes; so every
-- function was executable by PUBLIC. Nobody signed out could reach them
-- (anon has no usage on these schemas); this closes it anyway, and for the
-- functions made later.

revoke execute on all functions in schema core from public;
revoke execute on all functions in schema core_private from public;
revoke execute on all functions in schema ops from public;

-- Functions the migrations make from now on start with no PUBLIC grant;
-- each migration grants what each role needs.
alter default privileges for role postgres revoke execute on functions from public;
