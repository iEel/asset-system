# Integration Read API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only, versioned Integration API so trusted external systems can read Asset data without using UI/session API routes.

**Architecture:** Keep existing app/RBAC routes unchanged and add `/api/integrations/v1` endpoints protected by Bearer integration tokens and scopes. Store initial integration clients in environment configuration, emit audit logs for calls, and expose stable DTOs instead of raw Prisma payloads.

**Tech Stack:** Next.js App Router route handlers, TypeScript, Prisma, `node:test`, existing audit log and API response conventions.

---

### Task 1: Integration Foundation

**Files:**
- Create: `src/lib/integration-auth.ts`
- Create: `src/app/api/integrations/v1/health/route.ts`
- Modify: `src/lib/rbac-route-matrix.ts`
- Modify: `docs/02_ARCHITECTURE.md`
- Modify: `docs/04_AUTH_RBAC.md`
- Modify: `docs/10_SECURITY_REVIEW.md`
- Modify: `docs/11_FEATURE_LIST.md`
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/99_CHANGELOG.md`
- Test: `tests/integration-api-auth.test.ts`

- [x] Write failing auth helper tests for hashed token parsing, missing token, bad token, and missing scope.
- [x] Implement token hashing, env client parsing, Bearer auth, scope checks, request id, JSON error shape, and audit helper.
- [x] Add a scoped health endpoint and route-inventory custom-auth classification.
- [x] Update docs and commit/push Phase 1 only.

### Task 2: Asset Read API

**Files:**
- Create: `src/lib/integration-assets.ts`
- Create: `src/app/api/integrations/v1/assets/route.ts`
- Create: `src/app/api/integrations/v1/assets/[assetTag]/route.ts`
- Update docs/handoff/changelog.
- Test: `tests/integration-assets.test.ts`

- [ ] Write failing tests for safe DTO mapping and list filter parsing.
- [ ] Implement read-only asset list/detail endpoints under `asset:read`.
- [ ] Keep purchase/accounting/supplier/document/photo data out of DTOs.
- [ ] Update docs and commit/push Phase 2 only.

### Task 3: Reference And Change Feed

**Files:**
- Create: `src/lib/integration-reference.ts`
- Create: `src/app/api/integrations/v1/assets/changes/route.ts`
- Create: `src/app/api/integrations/v1/reference/statuses/route.ts`
- Create: `src/app/api/integrations/v1/reference/locations/route.ts`
- Create: `src/app/api/integrations/v1/reference/companies/route.ts`
- Create: `src/app/api/integrations/v1/reference/branches/route.ts`
- Update docs/handoff/changelog.
- Test: `tests/integration-reference.test.ts`

- [ ] Write failing tests for reference DTOs and cursor encoding/decoding.
- [ ] Implement `updatedSince` change feed with bounded pagination and stable cursor.
- [ ] Implement safe reference endpoints under `reference:read`.
- [ ] Update docs and commit/push Phase 3 only.

### Task 4: Hardening And Handoff

**Files:**
- Create: `src/app/api/integrations/v1/openapi/route.ts`
- Create: `scripts/generate-integration-token.mjs`
- Create: `docs/13_INTEGRATION_API.md`
- Modify: `package.json`
- Update docs/handoff/changelog.
- Test: `tests/integration-openapi.test.ts`

- [ ] Write failing tests for OpenAPI route source, token generation script registration, and docs references.
- [ ] Add authenticated OpenAPI JSON endpoint and local token/hash generation script.
- [ ] Document env configuration, rotation, scopes, examples, UAT, and production notes.
- [ ] Update docs and commit/push Phase 4 only.
