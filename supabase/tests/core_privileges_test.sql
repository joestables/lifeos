-- Functions are executable only by the roles granted them: nobody signed
-- out can run any, and nothing is granted to PUBLIC. ADR-0017, ADR-0042.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(2);

select is(
  (select array_agg(n.nspname || '.' || p.proname order by 1)
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('core', 'core_private', 'ops')
     and has_function_privilege('anon', p.oid, 'execute')),
  null,
  'ADR-0042: nobody signed out can run a LifeOS function'
);
select is(
  (select array_agg(n.nspname || '.' || p.proname order by 1)
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace, aclexplode(p.proacl) a
   where n.nspname in ('core', 'core_private', 'ops') and a.grantee = 0),
  null,
  'ADR-0042: no LifeOS function is granted to PUBLIC'
);
select * from finish();
rollback;
