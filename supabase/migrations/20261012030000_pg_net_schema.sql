-- pg_net belongs in the extensions schema, not public (the security advisor,
-- after 20261012024305_repeating_tasks). It can't be moved in place, so it
-- is made again there; nothing depends on it but the nightly-series job's
-- text, which names net.http_post, where pg_net always puts it.

drop extension if exists pg_net;
create extension pg_net with schema extensions;
