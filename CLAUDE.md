# LifeOS — instructions for Claude

LifeOS v2 is being specified. Until the architecture is signed off, this
repository holds only `docs/`.

- Start at [docs/README.md](docs/README.md): the index, which document wins,
  and how to change documents.
- Use the terms in the [glossary](docs/00-foundation/glossary.md) (Item, Type,
  Trait, View, Screen, Module, Space…).
- Obey ADR status: **Accepted** is binding; **Proposed** is context;
  **Superseded** is history. A task that conflicts with an Accepted ADR stops
  and raises it rather than overriding it.
- Docs change in the same commit as the code they describe. Specs describe the
  present; ADRs and git hold the past.
- Browser walks run against a stand-in Supabase, never against real data
  ([environments](docs/40-operations/environments.md)).

## Lessons from v1

- Put the Supabase tools on the permission allowlist under every name the
  server registers, including the `_88FE637B` suffix.
- A credential is not a permission.
- A UI change is not verified because `tsc` passed.
- No paragraphs of explanation in the app (v1 style-guide rule 36).
