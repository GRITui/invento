# invento → Grit BizSuite monorepo

As of this branch, invento's codebase (snapshot of `5da4925`, this repo's
`main`) has been merged into the **Grit BizSuite monorepo** as
**`apps/grit-inventory`**.

- Monorepo home: `GRITui/horeca-pos`, branch
  `claude/grit-bizsuite-monorepo-spec-0ol8qo` (repo restructured into a
  turbo/npm-workspaces monorepo per the Grit BizSuite blueprint spec).
- Grit Inventory pivot delivered there: multi-location stock (`StoreStock`-style
  per-location quantities), internal stock transfer orders, FIFO cost layers,
  barcode input interception, and event-driven integration — consumes
  `transaction.completed` from Grit POS (auto-decrement) and emits
  `inventory.threshold_breached` to Grit Taskboard via HMAC-signed internal
  webhooks (`packages/shared-events`).

## What this means for this repo

New Grit Inventory work should land in the monorepo, not here. This repo
remains the standalone invento M1 MVP history. If the monorepo direction is
reverted, `apps/grit-inventory` can be extracted back (it keeps its own
`package.json`, lockfile, and Vercel config, and still runs standalone).
