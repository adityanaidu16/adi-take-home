# Internal Tools Kit

A prototype of what replaces Microsoft Power Apps for a fintech that keeps
Microsoft 365. Entra ID still does sign-in and groups, SharePoint still holds
Microsoft-resident data; only the Power Apps licence goes away.

The model is:

1. **Apps are YAML config** in `apps/`. One generic UI renders any of them.
2. **Engineers own the building blocks in code** (`kit/blocks/`): data sources,
   actions, which fields are sensitive, which actions are risky, and the
   minimum approval each risky action always requires.
3. **A preset rules file decides the review path** for every change
   (`review/rules.yaml`): safe config changes are self-serve, risky ones are
   escalated to engineering review with the reasons listed.

Building app #1 costs a platform; app #11 costs a YAML file.

The renderer uses [Fluent UI v9](https://react.fluentui.dev) — the same design
language as Power Apps' modern controls and the rest of Microsoft 365 — so the
apps look familiar to people moving off Power Apps.

## Run it

Requires Node 20 and Docker.

```bash
cp .env.example .env
docker compose up -d          # Postgres + mock OIDC identity provider
npm install
npm run db:push && npm run seed
npm run graph-mock            # mock Microsoft Graph (second terminal)
npm run dev                   # http://localhost:3000
```

Sign in at http://localhost:3000 — you are redirected to the local identity
provider, where you type one of the seeded usernames (no password):

| user     | groups              | can do                                        |
|----------|---------------------|-----------------------------------------------|
| `sam`    | `refunds-analysts`  | see refunds (IBAN masked), request refunds     |
| `priya`  | `refunds-approvers` | see refunds unmasked, approve refunds          |
| `maria`  | `ops-leads`         | no access to the refunds app                   |
| `jordan` | `platform-eng`      | feature flags (once that app exists)           |
| `alex`   | `platform-eng`      | second approver for `platform-eng` changes     |

The demo path: sign in as `sam`, issue the $1,200 refund → it becomes a pending
approval, no money moves. Sign in as `priya` → she sees the full bank account
and approves → exactly one row appears in the mock ledger. `/audit` shows
request, approval and execution as separate append-only rows.

### Checks

```bash
npm run validate                # app configs parse and match the building blocks
npm run review -- --base main   # SELF-SERVE or ESCALATE for this branch
npm test                        # 27 tests: guardrails, maker-checker, masking, Graph, classifier
npm run typecheck
```

## Architecture

```
apps/              YAML app configs — the only thing a self-serve change touches
kit/
  auth/            OIDC sign-in, session cookie, group -> app role mapping
  config/          Zod schema + loader (validates config against the blocks)
  blocks/          data sources and actions, owned by engineering
    graph/         Microsoft Graph client + registered SharePoint lists
  approvals/       maker-checker engine (the only write path)
  audit/           append-only audit log
  ui/              generic table, action buttons
  view.ts          the only read path: authorization + server-side masking
review/            rules.yaml + classify.ts (self-serve vs escalate)
dev/               mock identity provider config, mock Microsoft Graph
```

### The rules that config cannot break

- **Server-side authorization.** Every read goes through `getAppView`, every
  write through `performAction`/`approve`. A hidden button is not a control;
  the tests call the server functions directly to prove it.
- **Sensitivity is declared in code.** `bank_account` and `customer_iban` are
  `sensitive: true` in `kit/blocks`. Config chooses who sees them unmasked; it
  cannot declare a field non-sensitive. Masking happens on the server, so the
  masked value is what reaches the browser.
- **Approval minimums are a floor.** `issue_refund` declares `risk: high` and
  "over $500 needs an approver". At runtime, approval is required if the
  action's rule fires **or** the config's rule fires — so config can add
  approvals but never remove them.
- **Maker-checker.** The requester can never approve their own request.
  Approval is a conditional update (`status: pending -> approved`) in the same
  transaction as the action, and the ledger has a unique constraint on the
  approval request id — approving twice still pays once.
- **Append-only audit.** Request, approval and execution are separate rows.
  Nothing in the kit updates or deletes audit rows.

### What config buys you, on top of a table

Three things the grid page gets for free, all on the same authorized, masked
read path:

- **Declarative summary.** `view.summary: { group_by, measure }` renders a
  dashboard strip above the grid, totalled from the rows the user is already
  allowed to see. The loader rejects a summary over a sensitive field, over a
  non-numeric measure, or over a field the view does not list — an aggregate
  is data, so it gets the same treatment as a column.
- **Audited export.** Export produces the CSV server-side from `getAppView`,
  so it can never contain more than the screen does (an analyst's export has
  `•••• 6819` where the IBAN would be), and every export writes a
  `view.exported` audit row. Exports are the quiet data-leak path in most
  internal tools; here it is instrumented by default.
- **My requests.** A requester cannot approve, and so could not previously see
  that their request existed — the nudge toward raising it twice. `/my-requests`
  shows their own requests and outcomes, masked with their own roles, with no
  approve control anywhere on the page. Records with a request in flight are
  badged "Awaiting approval" in the grid.

### Self-serve vs escalate

`npm run review -- --base main` parses the YAML on both sides of the branch and
compares keys — it does not diff text, so reformatting never escalates. It
escalates when: anything outside `apps/` changed, an app was deleted or a
non-YAML file added under `apps/`, config fails validation, an `approval` block
changed, `roles` changed on an existing app, `show_sensitive_to` changed, a
*new* app puts a code-declared sensitive field on screen, or the app uses an
action declared `risk: high`.

The new-app rule exists because the diffing rules have nothing to compare a new
file against: without it, the first app to show an IBAN would ship self-serve
and only *later* changes to who sees it would reach an engineer.

It is deterministic — no model call — and the rules live in `review/rules.yaml`
so the client can tune them. `.github/workflows/checks.yml` runs it on every
pull request, so the verdict is a property of the change rather than a command
someone remembers to run.

### Confirming a self-serve change from chat

App owners are ops staff, not engineers, and may not have GitHub accounts. A
confirmation arriving from Slack is accepted only through:

```bash
npm run approve -- --by slack:U01MARIA --base main
```

which recomputes the classification (a chat message cannot assert its own
verdict), refuses anything that is not `SELF-SERVE`, refuses anyone outside the
`owner` team named in the app's YAML, and prints an approval record to attach to
the pull request. Team membership lives in `review/owners.yaml` — outside
`apps/`, so changing it escalates. The Slack ✅ automation that calls this is in
`.agents/automations/slack-confirm-in-thread.md`.

Be clear about what this is: a Slack reaction is an identity claim, not an
authentication factor. The control is that only members of the owning team
resolve to an approval and everything else is refused and logged. Teams has no
reaction-trigger equivalent today, so on Teams the owning team approves the pull
request on GitHub instead.

## Microsoft integration

The principle: **write the real production code and fake Microsoft only at the
network boundary.** Going live is an environment-variable change, not a code
change.

**Sign-in** is standard OIDC authorization code flow via `openid-client`,
configured by `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`. Locally
that issuer is `mock-oauth2-server` in `docker-compose.yml`, which issues
Entra-shaped tokens (`oid`, `tid`, `preferred_username`, `name`).

*Switching to Entra ID:* create an app registration, set the three variables to
the tenant's. One real difference to plan for: Entra puts group **object IDs**
(GUIDs) in the `groups` claim, not names, and above ~200 groups it drops the
claim entirely and points at Graph instead ("group overage"). For this platform
we would use **Entra app roles** (the `roles` claim) rather than raw groups: the
app declares `analyst`/`approver`, an admin assigns groups to them in Entra, the
claim stays small and stable, and the YAML stops depending on GUIDs.

Because a token can arrive with no groups claim, group membership is resolved
in `kit/auth/directory.ts`: use the claim when it is there, otherwise ask the
directory. In production that fallback is `GET /v1.0/me/memberOf`. Locally it
reads `DIRECTORY_FILE` (`dev/directory.json`), which is also how the mock
identity provider's usernames get their groups — it cannot attach per-user
claims to a standard authorization-code exchange, since it matches only on the
token request's own form parameters.

**SharePoint data** goes through `kit/blocks/graph`: app-only client credentials
with a cached token, `GET /v1.0/sites/{siteId}/lists/{listId}/items?expand=fields`
following `@odata.nextLink`, and `PATCH .../items/{itemId}/fields`. Locally
`GRAPH_BASE_URL`/`GRAPH_TOKEN_URL` point at `dev/graph-mock`, which returns
responses shaped like the Graph docs, in two pages, so paging is exercised.

*Connecting to a real tenant:* set the `GRAPH_*` variables and grant
**`Sites.Selected`** — not `Sites.ReadWrite.All` — so an admin can grant access
to exactly the SharePoint sites this platform may read. `npm run test:live`
runs the Graph tests against a real tenant and skips otherwise. **These have
never been run against a real tenant.**

Registering a SharePoint list is a code change (`kit/blocks/graph/lists.ts`) and
therefore escalates; pointing an app at an already-registered list is config and
is self-serve.

## Devin's own instructions

- `.agents/skills/new-internal-tool/SKILL.md` — the procedure Devin follows for
  any "I need an internal tool" request: intake questions, config-vs-code
  decision, validate, classify, record a video, reply with the verdict.
- `REVIEW.md` — what Devin Review checks on escalated PRs.
- `AGENTS.md` — how to run, test and validate.

## Scope

### Why not KYC?

The client's third Power Apps app is a KYC review queue. It is deliberately not
in this prototype: it is likely the app most tied to Microsoft's platform (worth
confirming with them). Case data in Dataverse has to be exported to Postgres,
documents in SharePoint can stay where they are (SharePoint is Microsoft 365,
not Power Apps) and be read through the same Graph block as
`refund_exceptions`, the KYC vendor connector has to be rebuilt as a building
block, and Power Automate routing has to be rebuilt as approvals plus Teams
notifications. That is the most migration work of the three apps *and* the most
sensitive data. Refunds exercises the same kit machinery — a review queue,
masked fields, maker-checker, audit trail — at a fraction of the migration
cost. KYC is migrated last, after a security review of the kit.

### Known gaps

This is a ~2 hour prototype. Deliberately not built:

- Never run against a real Entra tenant or real Graph. Admin consent, tenant
  policies, conditional access, group overage and real throttling (429 /
  `Retry-After`) are untested.
- Deployment. No hosting, TLS, secrets manager or CI pipeline.
- The classifier runs in CI but is not yet a *required* status check, and
  nothing blocks merging an `ESCALATE` change without an engineer's approval.
  Both are branch-protection settings on the repository.
- `review/owners.yaml` is hand-maintained. It should be generated from the same
  Entra groups that drive app roles.
- A *new* app's `owner` is self-declared: confirmation checks the confirmer is a
  real member of the team the file names, but nothing assigns that team
  independently. (Reassigning an *existing* app's owner is refused.) Closing
  this needs an app-to-team registry maintained outside the pull request.
- The Slack confirmation automation is written but unverified: the docs do not
  say whether a reaction trigger exposes the reactor's identity to the session,
  and the prompt fails closed if it does not.
- No config previews before merge.
- Reads of sensitive fields are not audited, only actions.
- Audit protection is application-level only. Production would revoke
  `UPDATE`/`DELETE` on the audit table from the application role.
- No schema changes against live data, no migrations story beyond `db:push`.
- Payments and KYC vendors are mocked; the ledger is a table.
- Migrating data out of Dataverse, and Microsoft sources other than the
  SharePoint pattern (Excel, Outlook, Teams).
- The Graph write in `update_exception_status` runs inside the database
  transaction, so a SharePoint failure rolls back the audit row but a database
  failure after a successful PATCH cannot roll SharePoint back. Real systems
  need an outbox for this.
