# CortexFlow — Real Execution Engine (Backend Rebuild)

This replaces the placeholder execution system with an actual
workflow engine: branching DAG execution, real AI node calls, real
integrations, real triggers, and a Redis/BullMQ queue so runs don't
depend on a browser tab staying open.

## 1. Install & run

```bash
cd server
npm install
cp .env.example .env   # fill in MONGODB_URI, JWT_SECRET, REDIS_URL, and at least one AI key

# You need Redis running locally (or point REDIS_URL at a hosted one):
redis-server

# Two processes now, not one:
npm run dev          # the API (port 5000)
npm run dev:worker    # the worker that actually executes workflows
```

If `npm run dev:worker` isn't running, jobs will sit in the queue as
`"queued"` forever — the API only ever enqueues, it never executes a
workflow directly anymore.

## 2. What changed and why

| Area | Before | Now |
|---|---|---|
| Engine | Linear `Node → Success → Node` stub | Real DAG traversal from the trigger node(s), following only the branch edges a Condition/Decision node actually produced. Untaken branches are recorded as `skipped`. |
| AI nodes | Returned a canned "reached execution stage" message | Real calls to OpenAI / Anthropic / Gemini (whichever key is set). Agent, Classifier, Extractor, Generator, and Decision are each implemented with their own prompt shape and output parsing. |
| Integrations | UI-only | `services/integrations/*` make real API calls (Gmail via SMTP, Slack/Discord via webhook or bot token, Google Sheets via a service account, Notion, HubSpot, and a generic outbound Webhook node). Credentials are stored per-user in a new `Integration` model and looked up by provider at run time — never stored on the workflow itself. |
| Triggers | None | `services/triggerService.js`: manual (direct), webhook (`POST /api/webhooks/:token`, public, optional shared-secret header), schedule (BullMQ repeatable/cron job), event (internal pub/sub via `emitEvent()`). |
| Branching | Not possible | Edges carry an optional `branch` (or `sourceHandle`) value. A Condition or Decision node sets `output.branch` (e.g. `"yes"` / `"no"`); the engine only walks edges whose `branch` matches. |
| Queue | None — execution was synchronous and fake | `queue/workflowQueue.js` (BullMQ Queue) + `queue/worker.js` (BullMQ Worker, its own process). 3 attempts with exponential backoff per job. |
| Execution history | Pre-baked "success" records | `Execution.results[]` is updated node-by-node in real time as the worker runs (`running` → `success`/`failed`/`skipped`), so `GET /api/executions/:id` gives you a live, accurate view — matching the "✓ Trigger / ✓ AI Agent / ✗ Send Email + error" shape you described. |

## 3. New/changed files

**New:**
- `models/Integration.js`
- `services/ai/providers.js`, `services/ai/aiService.js`
- `services/integrations/{index,gmail,slack,discord,googleSheets,notion,hubspot,webhook}.js`
- `services/logicService.js`, `services/templateUtils.js`, `services/executionService.js`, `services/triggerService.js`
- `queue/connection.js`, `queue/workflowQueue.js`, `queue/worker.js`
- `controllers/webhookController.js`, `controllers/integrationController.js`
- `routes/webhookRoutes.js`, `routes/integrationRoutes.js`
- `.env.example`

**Rewritten (the 9 you flagged):**
- `services/workflowEngine.js`, `models/Execution.js`, `routes/executionRoutes.js`,
  `controllers/executionController.js`, `controllers/workflowController.js`,
  `middleware/authMiddleware.js`, `routes/authRoutes.js`, `controllers/authController.js`

**Left as-is:** `models/User.js` — the existing `apiKey` field already covered what
the new API-key auth path needed; no schema change was necessary.

**Also touched (not in your list, but required for the above to function):**
- `models/Workflow.js` — added `trigger` config and made edges branch-aware (`branch`/`sourceHandle`). Without this, edges have no way to carry "yes"/"no" and schedule/webhook triggers have nowhere to store their config.
- `server.js` — wired up the two new route files.
- `package.json` — added `bullmq`, `ioredis`, `nodemailer`, `googleapis`; added `worker`/`dev:worker` scripts.

## 4. How branching works in a workflow doc

An edge can specify which branch it belongs to:

```json
{ "id": "e2", "source": "decision-1", "target": "send-email-1", "branch": "yes" }
{ "id": "e3", "source": "decision-1", "target": "stop-1",        "branch": "no"  }
```

A Decision or Classifier node's config declares its possible outputs:

```json
{
  "data": {
    "kind": "ai",
    "key": "decision",
    "config": { "question": "Is this customer interested?", "options": ["yes", "no"] }
  }
}
```

The engine executes the Decision node, gets back `{ decision: "yes", branch: "yes", ... }`,
and only follows the edge tagged `"yes"`. The `"no"` branch's node is recorded with
`status: "skipped"` in the execution record.

## 5. Connecting an integration (example: Slack)

```
POST /api/integrations
{
  "provider": "slack",
  "name": "Team Slack",
  "credentials": { "webhookUrl": "https://hooks.slack.com/services/..." }
}
```

Then in a workflow's Slack action node:

```json
{ "data": { "kind": "action", "key": "slackMessage", "config": { "message": "New lead: {{trigger.payload.name}}" } } }
```

`{{trigger.payload.name}}` (and any `{{node.output.path}}`-style reference into
`context.trigger` / `context.ai` / `context.logic` / `context.action` /
`context.nodes.<nodeId>`) gets interpolated before the Slack call is made.

## 6. Known limitations / next steps

- **Delay nodes** run inline in the worker process and are capped at 5 minutes to
  avoid tying up a worker slot indefinitely. A "wait 3 days" step should really be
  modeled as two separate scheduled workflows — that's a reasonable next feature
  (splitting a workflow at a long delay into a BullMQ delayed job) but isn't built yet.
- **No live push (websocket/SSE)** for execution status — the client polls
  `GET /api/executions/:id`. Wiring a socket layer on top of the worker's
  `onNodeComplete` callback would make the UI feel more real-time.
- **Google Sheets / Gmail** need real credentials (a Google service account and a
  Gmail app password, respectively) to actually send anything — without them the
  node fails with a clear "integration not connected" error rather than pretending
  to succeed.
- **Encryption at rest for `Integration.credentials`** isn't implemented — they're
  stored as plain `Mixed` in Mongo. Fine for a portfolio/demo project; add
  field-level encryption (e.g. via `mongoose-encryption` or KMS-backed) before
  handling real user credentials in production.
- This was built and syntax-checked (`node --check` on every file + a static
  require-path resolver) but **not run end-to-end**, since this sandbox has no
  outbound network access to `npm install` the new dependencies or connect to a
  real Redis/Mongo instance. Run `npm install` and smoke-test locally before
  deploying.
