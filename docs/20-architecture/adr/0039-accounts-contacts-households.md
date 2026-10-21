# ADR-0039: Accounts and Households

**Status:** Provisionally agreed · 2026-10-09

**Amended:** 2026-10-18 by Joe, writing the Stage 4 specs (no Contacts: a Household's owner invites people by email; owner and members; a person may be in several Households).

## Context

An earlier draft kept sign-ups off: one Household, joined by an invitation
that also created the account. Joe wants LifeOS open to anyone, with sharing
only between people who have chosen each other.

## Decision

- **Anyone can sign up with Google** and use LifeOS in a personal capacity.
  Every account starts with its own Personal Space and nothing shared.
  Email/password sign-up stays off; the smoke-walk test account is created by
  hand ([ADR-0003](0003-new-supabase-project.md)).
- **No Contacts** (Joe, 18 October). Anyone can create a **Household**, and
  becomes its **owner**. The owner invites people by their Google email;
  **sharing starts only when the invitation is accepted**. Those who join are
  **members**, who can't invite others.
- **A person may be in several Households**, as owner or member. Households
  belong to the core, for every Module, not to food.
- **An invitation doesn't reveal who has an account:** it reads the same
  either way, and waits for that address to sign in, now or later.
- Leaving a Household follows [ADR-0016](0016-sharing-and-visibility.md).

## Consequences

- `core.space_members` gains each member's role (owner or member);
  invitations stay in `core.space_invites`.
- Personal use works from Stage 1; Households arrive with sharing in
  Stage 4 ([spaces and sharing](../../10-requirements/cross-cutting/spaces-and-sharing.md)).
- Open sign-up means limits are shared by everyone who joins: Google's
  unverified-app limit (100 users) for Calendar, Oura's 10-user limit, the
  free tier's storage and Gemini's free AI quota.
- An owner can't leave a Household, only delete it, for every member
  (Joe, 18 October;
  [HSH-004](../../10-requirements/cross-cutting/spaces-and-sharing.md#hsh-004--leaving-and-removing)).
