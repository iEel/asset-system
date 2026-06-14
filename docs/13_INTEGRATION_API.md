# Integration API

The Integration API is a read-only API surface for trusted external systems that need operational Asset data without using UI/session routes. It lives under `/api/integrations/v1` and uses Bearer tokens that are stored on the server only as SHA-256 hashes.

Do not use normal user sessions or scheduler tokens for external-system access.

## Scopes

| Scope | Purpose |
|---|---|
| `asset:read` | Read asset list, asset detail, and incremental asset changes |
| `reference:read` | Read compact reference data such as statuses, companies, branches, and locations |
| `integration:read` | Read health/OpenAPI metadata for integration setup |

## Client Management

Integration clients are managed in the database table `integration_api_clients`. Operators should use `Admin > Integration API` (`/{locale}/admin/integrations`) for the normal token lifecycle:

- Create a client with a unique client ID, display name, and least-privilege scopes.
- Copy the plain token from the one-time create response into the external system secret manager.
- Rotate a client when a token may be exposed or on the agreed rotation schedule. The old token stops working immediately, and the new plain token is shown once.
- Disable a client to revoke access. Enable only after confirming the client is still approved.

The app stores only `tokenHash` and `tokenPreview`; it never stores the plain token. Admin API routes for this workflow live under `/api/admin/integration-clients`.

Normal token lifecycle work requires no `.env` changes; `.env` database connection settings stay unchanged.

## Manual Recovery Tool

Keep `npm run integration:token` available for controlled SQL recovery or troubleshooting only:

```powershell
npm run integration:token -- --client-id erp-readonly --name "ERP Read-only" --scopes asset:read,reference:read,integration:read
```

The script prints a plain token, SHA-256 hash, token preview, and manual client metadata to the terminal. It does not write secrets to disk. Prefer the admin UI for routine create/rotate/disable/enable work because the UI writes the database row and shows the one-time token response safely.

## Endpoints

All endpoints require `Authorization: Bearer <token>`.

| Endpoint | Scope | Notes |
|---|---|---|
| `GET /api/integrations/v1/health` | any valid integration token | Validates token and returns client/scopes |
| `GET /api/integrations/v1/assets` | `asset:read` | Bounded list with filters and paging |
| `GET /api/integrations/v1/assets/{assetTag}` | `asset:read` | Read one asset by Asset Tag |
| `GET /api/integrations/v1/assets/changes?updatedSince=...` | `asset:read` | Incremental sync with `nextCursor` and `highWaterMark` |
| `GET /api/integrations/v1/reference/statuses` | `reference:read` | Active lifecycle statuses |
| `GET /api/integrations/v1/reference/companies` | `reference:read` | Active companies |
| `GET /api/integrations/v1/reference/branches` | `reference:read` | Active branches, optional `companyCode` |
| `GET /api/integrations/v1/reference/locations` | `reference:read` | Active locations, optional `companyCode` and `branchCode` |
| `GET /api/integrations/v1/openapi` | `integration:read` | Authenticated OpenAPI JSON |

Asset DTOs intentionally exclude purchase price, supplier, PO, invoice, accounting/depreciation fields, attachments, and photos.

## Examples

```powershell
$token = "<plain-token-from-secret-manager>"
curl -H "Authorization: Bearer $token" https://asset.company.com/api/integrations/v1/health
curl -H "Authorization: Bearer $token" "https://asset.company.com/api/integrations/v1/assets?employeeCode=4079&limit=50"
curl -H "Authorization: Bearer $token" "https://asset.company.com/api/integrations/v1/assets/changes?updatedSince=2026-06-14T00:00:00.000Z"
```

For incremental sync, call `assets/changes` with the last stored `highWaterMark`. If `hasMore` is true, call again with the returned `nextCursor` until `hasMore` is false, then store the final `highWaterMark`.

## UAT

1. Confirm the manual SQL migration `prisma/manual-migrations/2026-06-14-add-integration-api-clients.sql` has been applied in the target non-production database.
2. Open `Admin > Integration API` and create a UAT client with the required read-only scopes.
3. Copy the one-time plain token into the test external system or a temporary UAT secret store.
4. Call `/api/integrations/v1/health`.
5. Verify `asset:read` can call asset endpoints but cannot call reference endpoints without `reference:read`.
6. Verify `assets/changes` requires `updatedSince` and returns stable `nextCursor`/`highWaterMark`.
7. Rotate the client and verify the old token fails while the new token succeeds.
8. Disable the client and verify all Integration API calls fail for that token.
9. Confirm system logs record request summaries with client ID, route, status, request ID, and result count without logging Bearer tokens or response payloads.

## Production Notes

- Store the plain token only in the external system secret manager.
- Apply `prisma/manual-migrations/2026-06-14-add-integration-api-clients.sql` after backup and approval before deploying or using the DB-backed token manager in production.
- Keep existing database connection settings unchanged.
- Use separate `clientId` values per external system.
- Start with least-privilege scopes and rotate tokens from `Admin > Integration API`, then update the external system with the one-time token.
- Emergency disable is available from the admin UI. If the UI is unavailable, use controlled SQL to set `integration_api_clients.enabled = 0` for the affected client or all clients.
- If rolling back to code that does not use `integration_api_clients`, roll back the application before removing the table.
- Keep rate limits and network allowlisting at the reverse proxy/firewall layer until an app-level rate limiter is explicitly designed.
- Do not expand DTOs with accounting, supplier, or evidence fields without a separate security and business review.
