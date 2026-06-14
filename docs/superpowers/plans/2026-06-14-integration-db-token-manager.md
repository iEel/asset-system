# Integration API DB Token Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Integration API token management from `INTEGRATION_API_CLIENTS` environment JSON to a database-backed admin UI/API, without changing database connection environment variables and without adding Integration API write-back endpoints.

**Architecture:** Keep existing read-only `/api/integrations/v1` route handlers and helper names, replace the runtime token source with `integration_api_clients` rows, and add an admin management surface under `/{locale}/admin/integrations` plus `/api/admin/integration-clients`. Store only SHA-256 token hashes, show plain tokens once on create/rotate, audit every token lifecycle action, and keep existing scope checks and DTO redaction behavior.

**Tech Stack:** Next.js 16 App Router route handlers/pages, TypeScript, Prisma SQL Server, existing `requireAuth`/`requirePermission` RBAC utilities, `next-intl`, lucide icons, `node:test`, manual SQL migrations under `prisma/manual-migrations`.

---

## Guardrails

- Do not edit `.env`, `.env.local`, production env files, or any file matching `.env*` without explicit user approval.
- Do not change `DATABASE_URL`, DB instance/server/user/password settings, or scheduler/LDAP env settings.
- Do not add Integration API write endpoints in this phase; all public `/api/integrations/v1` routes remain read-only.
- Do not log or return plain tokens after the one-time create/rotate response.
- Do not return `tokenHash` from admin APIs, UI props, docs examples, or audit logs.
- Do not use `INTEGRATION_API_CLIENTS` as an active runtime auth source after this implementation.
- Keep existing helper names `requireIntegrationClient`, `requireIntegrationScope`, `authenticateIntegrationRequest`, `hashIntegrationToken`, `integrationErrorResponse`, and `logIntegrationApiAccess` unless a narrow internal refactor is needed.
- Preserve existing endpoint behavior for `/api/integrations/v1/health`, assets, changes, reference data, and OpenAPI.

## Task 1: Write Failing Tests For DB Token Management

**Files:**
- Modify: `tests/integration-api-auth.test.ts`
- Modify: `tests/integration-openapi.test.ts`
- Create: `tests/integration-api-client-store.test.ts`
- Create: `tests/integration-api-client-admin.test.ts`
- Create: `tests/integration-api-db-migration.test.ts`

- [ ] Update `tests/integration-api-auth.test.ts` so auth tests no longer depend on default `process.env.INTEGRATION_API_CLIENTS`.
- [ ] Keep a pure test seam for authenticating against an explicit in-memory client list so missing-token, bad-token, disabled-client, and insufficient-scope tests stay fast.
- [ ] Add tests for DB-client normalization:
  - valid scopes are de-duplicated and trimmed.
  - empty or invalid scope payloads are rejected.
  - disabled clients are not accepted by runtime auth.
  - wildcard scope behavior (`*`, `asset:*`) remains unchanged.
- [ ] Add tests for token generation and secret handling:
  - generated tokens use the `ams_` prefix and enough entropy.
  - token preview is non-secret and short.
  - API DTOs omit `tokenHash`.
  - create/rotate responses include plain token once.
- [ ] Add source tests for admin routes:
  - list route uses `requirePermission(user, "setting", "view")`.
  - create/enable/disable/rotate routes use `requirePermission(user, "setting", "edit")`.
  - mutation routes call `logAudit`.
  - route source does not include `tokenHash` in `NextResponse.json` payloads.
- [ ] Add migration source test that asserts `integration_api_clients` table, unique indexes on `clientId` and `tokenHash`, and runtime indexes exist in the manual SQL file.
- [ ] Update `tests/integration-openapi.test.ts` so docs/script assertions no longer require active `INTEGRATION_API_CLIENTS` setup text, but still assert token tooling is registered and does not write secrets to disk.

Expected focused test command after writing tests:

```powershell
node --import tsx --test tests/integration-api-auth.test.ts tests/integration-api-client-store.test.ts tests/integration-api-client-admin.test.ts tests/integration-api-db-migration.test.ts tests/integration-openapi.test.ts
```

At this point the command should fail because implementation does not exist yet.

## Task 2: Add Prisma Model And Manual SQL Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/manual-migrations/2026-06-14-add-integration-api-clients.sql`

- [ ] Add the Prisma model near the system/authentication models:

```prisma
model IntegrationApiClient {
  id            String    @id @default(uuid())
  clientId      String    @unique @db.NVarChar(100)
  name          String    @db.NVarChar(200)
  tokenHash     String    @unique @db.NVarChar(64)
  tokenPreview  String    @db.NVarChar(20)
  scopesJson    String    @db.NVarChar(Max)
  enabled       Boolean   @default(true)
  lastUsedAt    DateTime?
  lastUsedIp    String?   @db.NVarChar(50)
  lastUserAgent String?   @db.NVarChar(500)
  createdBy     String?   @db.NVarChar(100)
  updatedBy     String?   @db.NVarChar(100)
  disabledBy    String?   @db.NVarChar(100)
  rotatedBy     String?   @db.NVarChar(100)
  disabledAt    DateTime?
  rotatedAt     DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([enabled, clientId], map: "IX_integration_api_clients_enabled_clientId")
  @@index([lastUsedAt], map: "IX_integration_api_clients_lastUsedAt")
  @@map("integration_api_clients")
}
```

- [ ] Create an idempotent SQL Server manual migration:
  - `CREATE TABLE [dbo].[integration_api_clients]` only when missing.
  - `enabled` uses `BIT NOT NULL` with default `1`.
  - timestamps use `DATETIME2`.
  - `tokenHash` is `NVARCHAR(64)` and never nullable.
  - `scopesJson` is `NVARCHAR(MAX)`.
  - add unique indexes on `clientId` and `tokenHash`.
  - add indexes on `(enabled, clientId)` and `lastUsedAt`.
- [ ] Do not run a production migration from the local environment. The docs/runbook will state that production must apply this SQL after backup/approval.
- [ ] Run `npx prisma generate` after schema edits so Prisma Client knows the new model.

## Task 3: Build DB Client Store And Runtime Auth

**Files:**
- Create: `src/lib/integration-client-store.ts`
- Modify: `src/lib/integration-auth.ts`
- Modify: `tests/integration-api-auth.test.ts`
- Modify: `tests/integration-api-client-store.test.ts`

- [ ] Implement pure helpers in `src/lib/integration-client-store.ts`:

```ts
export const INTEGRATION_SCOPES = ["asset:read", "reference:read", "integration:read"] as const

export function generateIntegrationPlainToken(): string
export function buildTokenPreview(token: string): string
export function normalizeIntegrationScopes(value: unknown): IntegrationScope[]
export function serializeIntegrationScopes(scopes: IntegrationScope[]): string
export function parseIntegrationScopesJson(value: string): IntegrationScope[]
export function toIntegrationClientDto(record: IntegrationApiClient): IntegrationClientDto
```

- [ ] Implement DB operations:

```ts
export async function listIntegrationClients(): Promise<IntegrationClientDto[]>
export async function createIntegrationClient(input, actorId): Promise<{ client: IntegrationClientDto; token: string }>
export async function rotateIntegrationClient(id: string, actorId: string): Promise<{ client: IntegrationClientDto; token: string }>
export async function setIntegrationClientEnabled(id: string, enabled: boolean, actorId: string): Promise<IntegrationClientDto>
export async function findEnabledIntegrationClientByToken(token: string, request?: Request): Promise<IntegrationClient | null>
```

- [ ] Runtime lookup must:
  - hash the incoming token with existing `hashIntegrationToken`.
  - query `prisma.integrationApiClient.findFirst({ where: { tokenHash, enabled: true } })`.
  - parse `scopesJson`.
  - update `lastUsedAt`, `lastUsedIp`, and `lastUserAgent` best-effort after successful auth.
  - ignore metadata update failures so a logging/metadata issue does not break read API calls.
- [ ] Modify `integration-auth.ts`:
  - keep helper names used by current routes.
  - remove the default `process.env.INTEGRATION_API_CLIENTS` runtime path.
  - keep an explicit in-memory auth helper only for tests if needed, but make route helpers DB-backed by default.
  - keep `IntegrationAuthContext` shape compatible with existing routes.
  - keep `IntegrationApiError` status/code behavior unchanged.
- [ ] Keep `logIntegrationApiAccess()` audit payload unchanged except that client data now comes from DB.
- [ ] Re-run the focused auth/store tests until they pass.

## Task 4: Add Admin API Routes

**Files:**
- Create: `src/lib/validations/integration-client.ts`
- Create: `src/app/api/admin/integration-clients/route.ts`
- Create: `src/app/api/admin/integration-clients/[id]/rotate/route.ts`
- Create: `src/app/api/admin/integration-clients/[id]/disable/route.ts`
- Create: `src/app/api/admin/integration-clients/[id]/enable/route.ts`
- Modify: `tests/integration-api-client-admin.test.ts`

- [ ] Add Zod schemas:

```ts
export const integrationClientCreateSchema = z.object({
  clientId: z.string().trim().min(3).max(100).regex(/^[A-Za-z0-9._:-]+$/),
  name: z.string().trim().min(1).max(200),
  scopes: z.array(z.enum(["asset:read", "reference:read", "integration:read"])).min(1),
})
```

- [ ] `GET /api/admin/integration-clients`:
  - `requireAuth()`.
  - `requirePermission(user, "setting", "view")`.
  - return `{ data: IntegrationClientDto[] }`.
  - never return token hash or plain token.
- [ ] `POST /api/admin/integration-clients`:
  - `requirePermission(user, "setting", "edit")`.
  - validate body.
  - create client row and return `{ data: clientDto, token }` with status `201`.
  - audit action `create_client`, module `integration_api`, `recordId = clientId`.
- [ ] Rotate route:
  - `POST /api/admin/integration-clients/[id]/rotate`.
  - replace `tokenHash`, `tokenPreview`, `rotatedAt`, `rotatedBy`, `updatedBy`.
  - return `{ data: clientDto, token }` once.
  - audit action `rotate_client`, no hash/plain token in audit values.
- [ ] Disable route:
  - `POST /api/admin/integration-clients/[id]/disable`.
  - set `enabled = false`, `disabledAt`, `disabledBy`, `updatedBy`.
  - audit action `disable_client`.
- [ ] Enable route:
  - `POST /api/admin/integration-clients/[id]/enable`.
  - set `enabled = true`, clear or preserve `disabledAt` based on implementation simplicity, and set `updatedBy`.
  - audit action `enable_client`.
- [ ] Use `errorResponse(error, 400)` for validation/create conflicts, matching admin route conventions.
- [ ] Keep all admin route handlers dynamic by default route behavior; do not add caching.

## Task 5: Add Admin UI And Navigation

**Files:**
- Create: `src/app/[locale]/(dashboard)/admin/integrations/page.tsx`
- Create: `src/components/admin/IntegrationClientManager.tsx`
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Modify: `tests/integration-api-client-admin.test.ts`

- [ ] Page server component:
  - call `requirePagePermission(locale, "setting", "view")`.
  - render an operational admin page, not a marketing hero.
  - pass localized labels to the client component.
- [ ] Client component:
  - fetch `/api/admin/integration-clients`.
  - show summary cards for active, disabled, and used-last-30-days clients.
  - show desktop table and mobile cards with `clientId`, `name`, scopes, status, token preview, last used, created/rotated/disabled metadata.
  - include create dialog/form with client id, name, and scope checkboxes.
  - show one-time token panel after create/rotate with copy action and clear warning.
  - require confirmation before closing the one-time token panel.
  - add disable/enable confirmation.
  - add stronger rotate confirmation explaining the old token stops working immediately.
- [ ] Use existing design conventions:
  - 8px or smaller radii unless local components already differ.
  - lucide icons in buttons where useful.
  - dense admin management layout.
  - no nested card-in-card page sections.
  - no visible explanatory copy about implementation internals beyond operator guidance.
- [ ] Update sidebar:
  - add `KeyRound` or similar lucide icon.
  - add `nav.integrationApi` under Administration.
  - use permission `{ module: "setting", action: "view" }`.
- [ ] Update Thai/English messages:
  - nav label: `เชื่อมต่อ API` / `Integration API`.
  - page labels, scopes, statuses, one-time token warnings, buttons, confirmations, errors.
- [ ] Verify the page remains usable on mobile widths and desktop.

## Task 6: Update Token Script, Docs, Handoff, And Changelog

**Files:**
- Modify: `scripts/generate-integration-token.mjs`
- Modify: `docs/02_ARCHITECTURE.md`
- Modify: `docs/03_DATABASE.md`
- Modify: `docs/04_AUTH_RBAC.md`
- Modify: `docs/10_SECURITY_REVIEW.md`
- Modify: `docs/11_FEATURE_LIST.md`
- Modify: `docs/13_INTEGRATION_API.md`
- Modify: `docs/99_CHANGELOG.md`
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `tests/integration-openapi.test.ts`

- [ ] Update `scripts/generate-integration-token.mjs`:
  - keep `npm run integration:token`.
  - keep plain token and SHA-256 hash output for manual SQL recovery/troubleshooting.
  - remove the "set INTEGRATION_API_CLIENTS=..." example.
  - explicitly say the normal workflow is Admin > Integration API.
  - do not write files.
- [ ] Update `docs/13_INTEGRATION_API.md`:
  - document Admin UI token creation/disable/rotate.
  - document Bearer usage unchanged for external systems.
  - document scopes unchanged.
  - document one-time token handling.
  - document UAT steps using the UI.
  - document production deployment: apply manual SQL before build/restart, then create client in UI.
  - remove instructions that operators should edit `.env` or active `INTEGRATION_API_CLIENTS`.
- [ ] Update `docs/03_DATABASE.md` with the new table and manual migration note.
- [ ] Update `docs/04_AUTH_RBAC.md` with DB-managed integration clients and `setting:view/edit` admin permissions.
- [ ] Update `docs/10_SECURITY_REVIEW.md` with DB token hashing, one-time token display, no token hash in responses/logs, and rotation/revocation behavior.
- [ ] Update `docs/11_FEATURE_LIST.md` and `docs/99_CHANGELOG.md`.
- [ ] Update `DEVELOPER_HANDOFF.md` with implementation/deployment notes:
  - no `.env` token edit required after this phase.
  - production must apply `2026-06-14-add-integration-api-clients.sql`.
  - existing database connection env remains unchanged.

## Task 7: Verification And Commit Protocol

**Verification commands:**

```powershell
npx prisma generate
node --import tsx --test tests/integration-api-auth.test.ts tests/integration-api-client-store.test.ts tests/integration-api-client-admin.test.ts tests/integration-api-db-migration.test.ts tests/integration-openapi.test.ts
npm run lint -- --file src/lib/integration-auth.ts --file src/lib/integration-client-store.ts --file src/lib/validations/integration-client.ts --file src/components/admin/IntegrationClientManager.tsx
npm run build
```

- [ ] If Node tests fail with the known sandbox `spawn EPERM`, rerun the focused Node test command with user-approved escalation and report the exact command/outcome.
- [ ] If build fails due existing unrelated issues, report them separately and do not claim full verification.
- [ ] Before committing implementation, confirm `git status --short` contains no `.env*` changes.
- [ ] Stage only intended files.
- [ ] Inspect staged files:

```powershell
git diff --cached --name-only
git status --short
```

- [ ] Commit implementation with:

```powershell
git commit -m "Add database-backed integration API token manager"
```

- [ ] Push only after commit succeeds:

```powershell
git push origin master
```

## Rollback Notes

- Code rollback: revert the implementation commit(s) and redeploy the previous Integration API auth implementation.
- Data rollback: disable clients by setting `enabled = 0`; do not drop the table while deployed code reads from it.
- Emergency disable: set all `integration_api_clients.enabled = 0` through controlled SQL or UI.
- Full table drop is safe only after code rollback and after confirming no deployed route calls `prisma.integrationApiClient`.

## Execution Recommendation

Use `superpowers:subagent-driven-development` for implementation because this touches independent surfaces:

- database/schema/migration,
- auth runtime helper,
- admin API,
- admin UI,
- docs/tests.

Keep final integration and verification in the main session so staged changes and `.env` safety can be reviewed before commit/push.
