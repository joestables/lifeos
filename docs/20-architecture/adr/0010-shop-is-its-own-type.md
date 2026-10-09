# ADR-0010: Shop is its own Type

**Status:** Provisionally agreed · 2026-10-09

## Context

A shopping trip ("Tesco, Sat 10:00") is dated, done and reminded about; a
packing list is not.

## Decision

**A Shop is its own Type: a List with a date, a place and a done state.**

| | Shop | List |
|---|---|---|
| Holds lines, each with an optional "for" pointer | ✓ | ✓ |
| Schedulable: a date or time, and a place | ✓ | — |
| Completable: ticked off when the shop is done | ✓ | — |
| On Plan, with its own Reminder default | ✓ | — |
| Examples | Big shop, Boots run | Lisbon packing, DIY |

List ↔ Shop converts in place.

## Consequences

- Shops can have their own Reminder default.
- Open, for the Lists spec: on a repeating Shop, whether unticked lines carry
  over to the next occurrence.
