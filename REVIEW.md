# Review checklist for escalated changes

Applies to any pull request the classifier marks `ESCALATE: engineering review`.
Check these before anything about style or structure.

1. **Data access goes through the kit.** No page, route handler or server
   action queries Prisma or calls an external API directly. Reads go through
   `getAppView`; writes go through `performAction` / `approve`.
2. **Sensitive fields are declared in code.** Any new field carrying account
   numbers, IBANs, government IDs, full names plus balances, or anything else a
   reviewer would not want in a screenshot, is marked `sensitive: true` in
   `kit/blocks`. Config can only widen who sees a masked field, never change
   what is sensitive.
3. **Approval rules are not weakened.** An action's `minApproval` may be made
   stricter, never looser or removed. Approval must still be a conditional
   update (`updateMany` on `status: "pending"`) inside the same transaction as
   the action, so double approval cannot execute twice.
4. **No self-approval.** The requester can never approve their own request, at
   the server, not in the UI.
5. **Audit coverage.** Every new action writes request / approval / execution
   rows to `AuditLog`, and nothing anywhere updates or deletes audit rows.
6. **Graph permissions stay least-privilege.** New SharePoint lists are
   registered in `kit/blocks/graph/lists.ts` with an explicit site and list id.
   The app must work with `Sites.Selected`; flag any change that implies
   `Sites.ReadWrite.All` or another tenant-wide scope.
7. **No `eval`, no expression strings, no dynamic imports from config.** Config
   conditions must stay structured. One exception, `apps/<slug>/dashboard.tsx`:
   the slug is not free text — the route reaches the import only after the app
   config loads and the file is found, and the module is lint-sandboxed to the
   kit client API. A static registry would satisfy the letter of this rule but
   put a file outside `apps/` in every new dashboard, escalating changes that
   are presentation only.
8. **Secrets stay in environment variables.** No tenant ids, client secrets or
   real customer data in the repo, tests or fixtures.

If a change adds a new data source or action, say plainly in the review what
new data the platform can now reach and who can reach it.
