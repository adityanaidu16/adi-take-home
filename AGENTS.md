# Repo conventions

- Apps are YAML files in `apps/`. Everything an app can do is declared there; it
  cannot introduce new capabilities.
- Data sources and actions live in `kit/blocks/` and are the only place that
  talks to a database or an external API. Pages never query directly.
- Sensitivity (`sensitive: true` on a field) and the minimum approval rule on an
  action are declared in code and cannot be removed by config.
- Authorization and masking happen on the server, in `kit/view.ts` and
  `kit/approvals/engine.ts`. Hiding a button is not a control.
- `AuditLog` is append-only: only `create`, never `update` or `delete`.
- No `eval`, no expression strings in config. Conditions are `{ field, equals }`
  or `{ field, gt }`.

## Commands

```bash
docker compose up -d        # Postgres + mock OIDC identity provider
npm run db:push && npm run seed
npm run graph-mock          # mock Microsoft Graph, in a second terminal
npm run dev                 # http://localhost:3000

npm run validate            # app configs parse and match the building blocks
npm run review -- --base main   # SELF-SERVE or ESCALATE for the current branch
npm test
npm run typecheck
```
