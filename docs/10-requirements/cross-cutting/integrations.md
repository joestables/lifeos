# Integrations

*Each Integration's requirements are written in its stage. This page records
the shared pattern and what is known about each source.*

## The pattern

Connect (OAuth) → fetch new data (schedule or webhook) → store the raw
payload → map to Items, tagged with `external_id` so re-runs never duplicate.
Tokens in Supabase Vault (`core.connections`); ids and raw payloads in
`core.external_refs` ([contracts](../../20-architecture/contracts.md#integrationadapter)).
A broken Integration shows in Inbox and in the nightly health check.

## By source

| Source | Stage | What is known |
|---|---|---|
| **Google Calendar** | 3 | The events scope is "sensitive"; in *Testing* mode refresh tokens expire after 7 days, so publish the Google app to Production unverified (warning screen, fine under 100 users) and request `calendar.events` only. Supabase's Google sign-in doesn't hand over a lasting Calendar refresh token, so connecting Calendar is a separate OAuth flow run by an Edge Function. Repeating events are imported as individual instances. |
| **Oura** | 8 | Reported: personal access tokens were retired at the end of 2025, so OAuth only; new apps are limited to 10 users; Gen3+ rings need an active Oura Membership. No native app needed. Re-check before Stage 8. Sleep and readiness stay out of the Items table ([ADR-0015](../../20-architecture/adr/0015-health-data-as-a-time-series.md)). |
| **Health Connect** | 7–8 | Native Android only (e.g. `@capgo/capacitor-health`), so it waits for the wrapper. |
| **Finance** | 9 | Nationwide and Barclaycard via Open Banking aggregators (check current personal-use availability); Vanguard and Moneybox have no Open Banking or public API — manual balances or CSV import. |
| **Weather** | Later | An opportunity: feeds outfit suggestions and run planning ([roadmap](../../roadmap.md#later-opportunities)). |

Setup steps: [integration setup](../../40-operations/integration-setup.md).

## References

[Google sensitive scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification) ·
[Testing-mode token expiry](https://developers.google.com/identity/protocols/oauth2#expiration) ·
[Oura API support article](https://support.ouraring.com/hc/en-us/articles/4415266939155-The-Oura-API) ·
[Oura access restrictions](https://tryterra.co/blog/oura-api-ai-apps-access-permissions-commercial-restrictions) ·
[Capgo health plugin](https://capgo.app/docs/plugins/health/)
