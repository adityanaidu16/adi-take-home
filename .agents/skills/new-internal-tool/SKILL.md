---
name: new-internal-tool
description: Procedure for any request to add or change an internal app in this repo (a new admin panel, queue, dashboard, or a change to who can see or do what). Use whenever someone asks for a new internal tool or a change to an existing one, including requests arriving from Slack.
---

# Building or changing an internal app

Apps in this repo are YAML config in `apps/`. The building blocks they compose
(data sources, actions, field sensitivity, approval minimums) are code in
`kit/blocks/` and are owned by engineering. Most requests are config only.

## 1. Intake

Answer these before writing anything. Ask the requester only what you cannot
determine from the repo:

- Who uses it? Which identity group are they in? (`kit/auth`, app `roles`)
- Who approves, if anything needs approving?
- What data does it show, and is any of it sensitive (account numbers, IBANs,
  identity documents)? Who may see the sensitive fields unmasked?
- Which registered data source covers it? Check `kit/blocks/index.ts` and
  `kit/blocks/graph/lists.ts` for already-registered SharePoint lists.

## 2. Decide config or code

- **Existing building blocks cover it** → change only `apps/<name>.yaml`.
- **It needs a new data source, action or SharePoint list** → say so explicitly
  in your reply, write it in `kit/blocks/`, and expect engineering review. Never
  work around a missing block from config.

Never remove or loosen an action's `minApproval`, and never change a field's
sensitivity to make an app easier to build.

## 3. Validate and classify

```bash
npm run validate
npm run review -- --base main
```

Put the classifier's verdict — `SELF-SERVE` or `ESCALATE: engineering review`
with its reasons — at the **top of the PR description** and at the top of your
reply to the requester. If it escalates, name the humans' decision: what
engineering needs to check.

## 4. Show it working

```bash
docker compose up -d && npm run db:push && npm run seed
npm run graph-mock &
npm run dev
```

Sign in as the users the change affects (sign-in is real OIDC against the local
identity provider; the login page takes the username, e.g. `sam`, `priya`,
`jordan`), exercise the new behaviour, and record it. Cover the negative case
too — the user who should *not* see the data, or who cannot approve their own
request. Post the recording in the thread for the requester to confirm.

## 5. Reply

Reply with: the verdict, the one-line description of what changed, the PR link,
and the recording. If it escalated, say who needs to review and why.
