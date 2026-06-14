# Integration API DB Token Manager Design

## Goal

Move Integration API token management from `INTEGRATION_API_CLIENTS` in `.env` to a database-backed admin workflow, while keeping the Integration API read-only and keeping normal database connection environment variables unchanged.

## Non-Negotiables

- Do not modify `.env`, `.env.local`, or production env files without explicit user approval.
- Do not change `DATABASE_URL` or any database connection configuration.
- Do not add write-back Integration API endpoints in this phase.
- Do not log or return plain tokens after the one-time create/rotate response.
- Keep existing scopes: `asset:read`, `reference:read`, and `integration:read`.
- Keep current read-only Integration API endpoint behavior and DTO redaction rules.

## Recommended Approach

Use a database-only token source of truth.

The admin UI creates, disables, and rotates integration clients. The public Integration API hashes the incoming Bearer token, looks up an enabled client in the database, checks scopes, and proceeds with existing route logic. The env-based `INTEGRATION_API_CLIENTS` source is retired for runtime auth so token lifecycle can be managed without restart.

Rejected alternatives:

- Env fallback plus DB clients: easier migration, but confusing because revoking in the UI might not revoke an env token.
- UI that only generates env JSON: avoids migration, but still requires manual env edits and restarts, which is exactly the current operational pain.

## Data Model

Add Prisma model `IntegrationApiClient` mapped to table `integration_api_clients`.

Fields:

- `id`: UUID primary key.
- `clientId`: stable public identifier, unique, shown in logs and UI.
- `name`: human-readable system name.
- `tokenHash`: SHA-256 hash of the plain token, unique, never shown in UI.
- `tokenPreview`: short non-secret suffix such as last 6 characters of the generated token for operator recognition.
- `scopesJson`: JSON string array of scopes, stored as `NVARCHAR(MAX)` for SQL Server compatibility.
- `enabled`: boolean runtime gate.
- `lastUsedAt`, `lastUsedIp`, `lastUserAgent`: best-effort usage metadata.
- `createdBy`, `updatedBy`, `disabledBy`, `rotatedBy`: user ids as `NVARCHAR(100)`.
- `disabledAt`, `rotatedAt`, `createdAt`, `updatedAt`: lifecycle timestamps.

Indexes:

- Unique index on `clientId`.
- Unique index on `tokenHash`.
- Index on `enabled, clientId`.
- Index on `lastUsedAt`.

Add manual SQL migration under `prisma/manual-migrations/` because production deployment already uses explicit SQL notes for DB changes.

## Auth Flow

`src/lib/integration-auth.ts` will keep the existing public helper names so current routes do not need broad rewrites.

Runtime behavior:

1. Read `Authorization: Bearer <token>`.
2. Hash the plain token with existing SHA-256 helper.
3. Query `integration_api_clients` for matching `tokenHash` and `enabled = true`.
4. Parse `scopesJson`.
5. Require the requested scope with the same wildcard behavior as today.
6. Return the same `IntegrationAuthContext` shape used by routes.
7. Update `lastUsedAt`, `lastUsedIp`, and `lastUserAgent` in a best-effort write after authentication. Failure to update metadata must not fail the API request.

The helper must not read `INTEGRATION_API_CLIENTS` for runtime authentication after this phase.

## Admin API

Add routes under `/api/admin/integration-clients`.

Permissions:

- `GET`: `setting:view`
- `POST`: `setting:edit`
- rotate/disable/enable actions: `setting:edit`

Endpoints:

- `GET /api/admin/integration-clients`: list clients without token hashes.
- `POST /api/admin/integration-clients`: create client and return the plain token once.
- `POST /api/admin/integration-clients/{id}/rotate`: replace token hash and return the new plain token once.
- `POST /api/admin/integration-clients/{id}/disable`: set `enabled = false`.
- `POST /api/admin/integration-clients/{id}/enable`: set `enabled = true`.

Audit logging:

- Module: `integration_api`
- Actions: `create_client`, `rotate_client`, `disable_client`, `enable_client`
- Record id: `clientId`
- Values: client id, name, scopes, enabled state, token preview only.
- Never include plain token or token hash in `system_logs`.

## Admin UI

Add page `/{locale}/admin/integrations`.

Navigation:

- Add a settings/admin menu item named Integration API / เชื่อมต่อ API.
- Show only to users with `setting:view`.

Page layout:

- Summary cards: active clients, disabled clients, clients used in last 30 days.
- Main table/card list: client id, name, scopes, enabled, token preview, last used, created by, actions.
- Create dialog: name, client id, scope checkboxes, create button.
- One-time token panel after create/rotate: clear warning that the token is shown once, copy button, and confirmation checkbox/button before closing.
- Disable/enable actions with confirmation.
- Rotate action with stronger confirmation because old token stops working immediately.

UX rules:

- Do not display token hash.
- Do not show plain token in normal list.
- Keep management dense and operational, not a marketing-style page.
- Use existing form/button/card styling and lucide icons.
- Desktop and mobile must both be usable.

## Script Update

Keep `npm run integration:token` as a local helper for generating a token and SHA-256 hash for troubleshooting or manual SQL recovery, but update output wording so it no longer instructs admins to edit `INTEGRATION_API_CLIENTS`.

The script must not write secrets to disk.

## Documentation

Update:

- `docs/13_INTEGRATION_API.md`: DB-managed clients, UI workflow, usage examples, UAT, production notes.
- `docs/03_DATABASE.md`: new table and migration note.
- `docs/04_AUTH_RBAC.md`: token scope and admin permission behavior.
- `docs/10_SECURITY_REVIEW.md`: secret handling and audit logging.
- `docs/11_FEATURE_LIST.md`: Integration API token manager.
- `DEVELOPER_HANDOFF.md`: implementation and deployment notes.

Deployment note:

- Apply the manual SQL migration before building/restarting production.
- No `.env` token edit is required for DB-managed clients.
- Existing env DB connection settings remain unchanged.

## Testing Strategy

Use TDD for implementation.

Focused tests:

- DB client normalization and scope parsing.
- Runtime auth rejects missing, unknown, disabled, and insufficient-scope tokens.
- Runtime auth accepts an enabled DB client with the required scope.
- Admin route source checks for `requirePermission(..., "setting", "edit")` on mutations.
- Admin route responses never include token hashes.
- UI source includes one-time token handling and scope checkboxes.
- Manual migration contains table, unique indexes, and runtime indexes.
- Docs no longer instruct operators to use `INTEGRATION_API_CLIENTS` as the active runtime source.

Verification commands:

- `npm run lint -- --file src/lib/integration-auth.ts`
- Focused `node --import tsx --test ...` tests for integration auth/admin/API docs.
- `npm run build`

If the sandbox still raises `spawn EPERM` for Node tests, rerun the focused test command with user-approved escalation and report that clearly.

## Rollback

Code rollback:

- Revert the DB token manager commits.
- Restore env-based auth from the previous Integration API implementation if needed.

Database rollback:

- Disable Integration API routes by removing clients or disabling all rows.
- Dropping `integration_api_clients` should only happen after code rollback and after confirming no runtime route uses the table.

Operational rollback:

- Because this phase removes env token runtime auth, production should not deploy the code until the migration is applied and at least one DB client is created through UI or controlled SQL.

## Out Of Scope

- Write-back Integration API endpoints.
- App-level rate limiting.
- IP allowlist UI.
- Per-client field-level DTO policies.
- OAuth/JWT integration.
- Editing `.env` or production env files.
