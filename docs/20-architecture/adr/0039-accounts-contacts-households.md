# ADR-0039: Accounts, Contacts and Households

**Status:** Provisionally agreed · 2026-10-09

## Context

An earlier draft kept sign-ups off: one Household, joined by an invitation
that also created the account. Joe wants LifeOS open to anyone, with sharing
only between people who have chosen each other, in two steps.

## Decision

- **Anyone can sign up with Google** and use LifeOS in a personal capacity.
  Every account starts with its own Personal Space and nothing shared.
  Email/password sign-up stays off; the smoke-walk test account is created by
  hand ([ADR-0003](0003-new-supabase-project.md)).
- **Contacts:** you connect with someone by searching for their Google email
  address and sending a request. When they accept, you are Contacts. Being
  Contacts shares nothing.
- **Households:** once two people are Contacts, either can create a Household
  and invite the other. **Sharing starts only when the invitation is
  accepted.** Members are equal; a person is in one Household at most.
- Leaving a Household follows [ADR-0016](0016-sharing-and-visibility.md).

## Consequences

- New tables: `core.contacts` (requests and accepted pairs); invitations to a
  Household stay in `core.space_invites`.
- Personal use works from Stage 1; Contacts and Households arrive with
  Household sharing in Stage 4.
- Open sign-up means limits are shared by everyone who joins: Google's
  unverified-app limit (100 users) for Calendar, Oura's 10-user limit, the
  free tier's storage and the AI budget.
- Open: how search avoids revealing who has an account (for example,
  matching only an exact address, and answering the same whether or not one
  exists); whether a Contact can be removed, and what that does to a shared
  Household.
