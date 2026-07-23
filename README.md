# Payment Chaser Agent

Drafts payment-chasing emails for UK construction subcontractors, in a tone
matched to how overdue an invoice is, and lets a human approve and send in one
click.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run db:generate          # only needed after changing lib/db/schema
npm run db:migrate           # apply migrations to DATABASE_URL
npm run db:seed              # inserts the default organisation
npm run dev
```

Requires a Postgres database reachable at `DATABASE_URL` (local Postgres in
development; Vercel Postgres in production, selected automatically via the
`VERCEL` env var). This was not available to verify end-to-end in the
environment this was built in — walk the golden path yourself before
considering the app done: import a CSV, confirm the dashboard shows correct
tiers/amounts, generate a draft, preview it, and test both
`SENDING_ENABLED` states.

## Environment variables

See `.env.example`. Notable ones:

- `SENDING_ENABLED` — kill switch. `false` (default) means every send is
  logged and previewed, nothing is dispatched. Only set `true` deliberately.
- `TEST_REDIRECT_EMAIL` — when set, all outbound mail goes here regardless of
  the invoice's client email, with `[would send to: x@y.com]` prefixed to the
  subject. Use this while testing with `SENDING_ENABLED=true` before pointing
  at real client inboxes.
- `DEFAULT_ORG_ID` — the single organisation this deployment serves. Every
  table row carries this as `organisationId`; when auth is added later, this
  is the one thing that changes (see "Multi-tenant readiness" below).

## Updating the statutory interest base rate

`lib/constants.ts` holds `BASE_RATE_PERCENT`, the Bank of England base rate
used in the statutory interest calculation (Late Payment of Commercial Debts
(Interest) Act 1998: base rate + 8%, plus a fixed compensation fee). This is
**not** fetched live — check
[the Bank of England's rate page](https://www.bankofengland.co.uk/monetary-policy/the-interest-rate-bank-rate)
periodically and update the constant (and its "Last verified" comment) when
the rate changes. Every interest figure shown in the UI carries "Indicative
calculation only. Not legal advice." — this is a calculation aid, not legal
advice, and the app never tells the model to state that interest *will* be
charged (see `lib/prompt.ts` and the backstop keyword guard in
`lib/email/safety.ts`).

## Architecture

- `/lib` — pure business logic (tier rules, interest, CSV normalisation,
  prompt assembly, money formatting). No database, no `process.env`, no Next
  runtime — enforced by ESLint `no-restricted-imports` rules in
  `eslint.config.mjs`. These are the functions covered by the unit test suite
  (`npm test`).
- `/lib/repositories` — the only code that queries the database. Every
  function takes `organisationId` as its first argument.
- `/lib/email`, `/lib/llm` — Resend and Anthropic wrappers. Not pure (they
  touch env/network), so they live outside `/lib`'s pure-function set, but
  are still only reachable through server actions in each route's
  `actions.ts` file, never directly from a page.
- `/lib/env.ts` — the one place `process.env` is read. `grep -r process.env`
  outside this file should return nothing.

## Multi-tenant readiness

This is a single-organisation deployment (`DEFAULT_ORG_ID`). Every table
carries `organisationId`, every repository function takes it as the first
parameter, and no route handler or server component queries the database
directly. Adding auth later means resolving `organisationId` from a session
instead of `lib/env`'s constant at the one call site in each `actions.ts` file
— the repository and `/lib` layers need no changes.

## Testing

```bash
npm test        # Vitest, runs the full /lib unit test suite
npx tsc --noEmit
npx eslint .
```
