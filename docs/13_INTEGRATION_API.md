# Integration API

The Integration API is a read-only API surface for trusted external systems that need operational Asset data without using UI/session routes. It lives under `/api/integrations/v1` and uses Bearer tokens that are stored on the server only as SHA-256 hashes.

Do not use normal user sessions or scheduler tokens for external-system access.

## Scopes

| Scope | Purpose |
|---|---|
| `asset:read` | Read asset list, asset detail, and incremental asset changes |
| `reference:read` | Read compact reference data such as statuses, companies, branches, and locations |
| `integration:read` | Read health/OpenAPI metadata for integration setup |

## Environment Configuration

Store clients in `INTEGRATION_API_CLIENTS` as JSON. The `tokenHash` value is the SHA-256 hash of the plain token.

```json
[
  {
    "clientId": "erp-readonly",
    "name": "ERP Read-only",
    "tokenHash": "sha256-hex-placeholder",
    "scopes": ["asset:read", "reference:read", "integration:read"],
    "enabled": true
  }
]
```

Generate a new token and hash locally:

```powershell
npm run integration:token -- --client-id erp-readonly --name "ERP Read-only" --scopes asset:read,reference:read,integration:read
```

The script prints the plain token once for the calling system and an `INTEGRATION_API_CLIENTS` JSON entry for the server. It does not write secrets to disk.

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

1. Generate a token with `npm run integration:token`.
2. Add the generated hash JSON to `INTEGRATION_API_CLIENTS` in a non-production environment.
3. Restart the app and call `/api/integrations/v1/health`.
4. Verify `asset:read` can call asset endpoints but cannot call reference endpoints without `reference:read`.
5. Verify `assets/changes` requires `updatedSince` and returns stable `nextCursor`/`highWaterMark`.
6. Confirm system logs record request summaries with client ID, route, status, request ID, and result count.

## Production Notes

- Store the plain token only in the external system secret manager.
- Store only `tokenHash` in the app environment.
- Use separate `clientId` values per external system.
- Start with least-privilege scopes and rotate tokens by adding a new hash, deploying it, switching the external system, then disabling the old client.
- Keep rate limits and network allowlisting at the reverse proxy/firewall layer until an app-level rate limiter is explicitly designed.
- Do not expand DTOs with accounting, supplier, or evidence fields without a separate security and business review.
