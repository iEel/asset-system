# Production Readiness Followups 6-7-8 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the three next production-readiness followups: Notification Digest scheduler visibility, stronger upload content validation with an optional scanner hook, and explicit lifecycle exception enforcement with controlled status correction.

**Architecture:** Keep the work in small policy/helper modules that the existing routes call. Readiness remains a pure helper plus the `/admin/readiness` page. Upload hardening stays centralized under `src/lib/uploads*` so every upload route benefits. Lifecycle exception behavior is encoded in tested policy helpers, then called by maintenance/disposal routes and a dedicated status-correction route rather than loosening normal checkout/transfer.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma 7, Node test runner, existing `SystemSetting` scheduler state helpers, optional ClamAV-compatible command-line scanner.

---

## Scope

This plan covers these recommendations:

- **6:** Add Notification Digest last-run status to production readiness, not only its token.
- **7:** Add upload content signature checks and an optional server-side malware scan hook.
- **8:** Decide and enforce lifecycle exception rules: normal checkout/transfer stays blocked; exception paths are maintenance close, disposal execution, and an explicit status-correction workflow for accidental status changes, including `Disposed` and `Retired`.

This plan does not build a privileged transfer wizard. It does add a compact controlled correction action so an authorized user can return an accidentally changed asset, including `Disposed` or `Retired`, back to `Ready` with a required reason and audit trail.

## File Structure

- Modify: `src/lib/system-setting-defaults.ts`
  - Add notification digest scheduler state setting keys.
- Modify: `src/app/api/notifications/digest/route.ts`
  - Persist scheduled digest success/failure using `updateScheduledJobRunState`.
- Modify: `src/lib/production-readiness.ts`
  - Treat scheduler run readiness as named job statuses and include missing jobs as warnings.
- Modify: `src/app/[locale]/(dashboard)/admin/readiness/page.tsx`
  - Pass PM, LDAP, and Notification Digest scheduler statuses to readiness.
- Modify: `messages/en.json`, `messages/th.json`
  - Adjust readiness copy if needed for “scheduler jobs” wording.
- Modify: `tests/production-readiness.test.ts`
  - Cover digest status success, missing, and failed.
- Modify: `tests/notification-digest.test.ts`
  - Cover digest state persistence behavior at route/helper boundary where practical.
- Create: `src/lib/upload-signature.ts`
  - Pure file-signature detection and MIME/extension compatibility policy.
- Create: `src/lib/upload-virus-scan.ts`
  - Optional ClamAV-compatible scanner hook controlled by environment variables.
- Modify: `src/lib/uploads.ts`
  - Keep metadata validation, add async content validation and scanner integration.
- Modify upload save call sites:
  - `src/lib/asset-operation-evidence.ts`
  - `src/lib/asset-component-evidence.ts`
  - `src/lib/purchase-documents.ts`
  - `src/app/api/assets/[id]/attachments/route.ts`
  - `src/app/api/models/[id]/attachments/route.ts`
  - `src/app/api/maintenance-tickets/[id]/attachments/route.ts`
  - `src/app/api/disposal-requests/[id]/attachments/route.ts`
  - `src/app/api/audit-findings/[id]/attachments/route.ts`
- Modify: `tests/upload-validation.test.ts`
  - Add magic-byte spoofing and scanner hook tests.
- Create: `src/lib/asset-lifecycle-exception-policy.ts`
  - Policy helpers for maintenance close, disposal execution, direct asset edit status changes, and controlled correction.
- Modify: `src/app/api/maintenance-tickets/[id]/route.ts`
  - Only allow maintenance close to move asset to `Ready` or `Pending Disposal`.
- Modify: `src/app/api/disposal-requests/[id]/route.ts`
  - Only allow disposal execution to move asset to `Disposed` or `Retired`.
- Create: `src/lib/validations/asset-status-correction.ts`
  - Request validation for status correction reason and target status.
- Create: `src/app/api/assets/[id]/status-correction/route.ts`
  - Dedicated correction endpoint with `asset:edit`, required reason, `assetMovement`, and `SystemLog`.
- Modify: `src/app/api/assets/[id]/route.ts`
  - Block protected lifecycle status changes through generic asset edit and instruct users to use status correction or the proper workflow.
- Modify: `src/lib/rbac-route-matrix.ts`
  - Add the status-correction route to the critical RBAC matrix.
- Create: `src/components/assets/asset-status-correction-button.tsx`
  - Compact Asset Detail correction modal for allowed statuses.
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`
  - Show the correction action when the current status can be corrected.
- Modify: `tests/asset-operation-status-policy.test.ts`
  - Add lifecycle exception and status-correction policy tests.
- Modify docs:
  - `docs/05_ASSET_LIFECYCLE.md`
  - `docs/10_SECURITY_REVIEW.md`
  - `DEVELOPER_HANDOFF.md`
  - `DEPLOYMENT_UBUNTU_CLOUDFLARE.md`

---

### Task 1: Add Notification Digest Scheduler Status Keys

**Files:**
- Modify: `src/lib/system-setting-defaults.ts`
- Test: `tests/production-readiness.test.ts`

- [ ] **Step 1: Write failing readiness test for missing digest status**

Add a case to `tests/production-readiness.test.ts` that passes PM and LDAP as success but leaves digest empty. Expected readiness status should be `warning`, because one expected scheduler job has not run.

```ts
test("warns when notification digest scheduler status has not run yet", () => {
  const checks = buildProductionReadinessChecks({
    settings: new Map([
      ["asset_qr_public_base_url", "https://asset.example.com"],
      ["notification_return_due_soon_days", "3"],
      ["notification_audit_action_due_soon_days", "7"],
      ["notification_warranty_expiry_days", "30"],
      ["notification_license_expiry_days", "30"],
      ["retention_attachment_days", "1095"],
      ["retention_audit_log_days", "2555"],
      ["retention_orphan_file_days", "90"],
    ]),
    approverMatrix: [],
    activeAdminUsers: 2,
    activeUserCount: 4,
    masterDataCounts: {
      companies: 1,
      branches: 1,
      departments: 1,
      locations: 1,
      categories: 1,
      statuses: 1,
      conditions: 1,
    },
    deployment: {
      nodeEnv: "production",
      authUrl: "https://asset.example.com",
      nextAuthUrl: "https://asset.example.com",
      authSecret: "x".repeat(32),
      nextAuthSecret: "x".repeat(32),
      uploadDir: "/var/www/asset-system/uploads",
      databaseUrl: "sqlserver://db;database=asset;user=asset;password=secret",
      dbServer: "db",
      dbUser: "asset",
      dbPassword: "secret",
      maintenancePmGenerationToken: "pm-token",
      ldapSyncToken: "ldap-token",
      notificationDigestToken: "digest-token",
      schedulerRunStatuses: [
        { name: "pm_generate_due", status: "success" },
        { name: "ldap_sync", status: "success" },
        { name: "notification_digest", status: "" },
      ],
      backupStatus: "success",
      backupLastRunAt: "2026-05-20T01:00:00.000Z",
      backupLastRestoreTestAt: "2026-05-21T01:00:00.000Z",
      pwaAssets: { available: 10, total: 10 },
    },
  })

  assert.equal(checks.find((check) => check.key === "schedulerRuns")?.status, "warning")
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
node --test tests\production-readiness.test.ts
```

Expected: FAIL because `schedulerRunStatuses` does not exist yet or the helper still passes when any scheduler job is successful.

- [ ] **Step 3: Add notification digest status keys**

In `src/lib/system-setting-defaults.ts`, add constants beside PM/LDAP status keys:

```ts
export const notificationDigestLastRunAtKey = "notification_digest_last_run_at"
export const notificationDigestLastStatusKey = "notification_digest_last_status"
export const notificationDigestLastErrorKey = "notification_digest_last_error"
export const notificationDigestStatusSettingKeys = [
  notificationDigestLastRunAtKey,
  notificationDigestLastStatusKey,
  notificationDigestLastErrorKey,
] as const
```

- [ ] **Step 4: Run the focused test again**

Run:

```powershell
node --test tests\production-readiness.test.ts
```

Expected: still FAIL until `production-readiness.ts` is updated in Task 2.

---

### Task 2: Include Digest In Production Readiness

**Files:**
- Modify: `src/lib/production-readiness.ts`
- Modify: `src/app/[locale]/(dashboard)/admin/readiness/page.tsx`
- Modify: `messages/en.json`
- Modify: `messages/th.json`
- Test: `tests/production-readiness.test.ts`

- [ ] **Step 1: Update readiness input type**

In `src/lib/production-readiness.ts`, add a named scheduler status type:

```ts
export type SchedulerRunReadinessInput = {
  name: string
  status?: string | null
}
```

Then change `ProductionReadinessDeploymentInput` from:

```ts
schedulerLastRunStatuses?: string[]
```

to:

```ts
schedulerRunStatuses?: SchedulerRunReadinessInput[]
```

- [ ] **Step 2: Replace scheduler status helpers**

Replace `getSchedulerRunsStatus()` and `getSchedulerRunsValue()` with:

```ts
function getSchedulerRunsStatus(deployment?: ProductionReadinessDeploymentInput): ProductionReadinessStatus {
  const runs = deployment?.schedulerRunStatuses ?? []
  if (runs.length === 0) return "warning"
  if (runs.some((run) => run.status === "failed")) return "fail"
  if (runs.every((run) => run.status === "success")) return "pass"
  return "warning"
}

function getSchedulerRunsValue(deployment?: ProductionReadinessDeploymentInput) {
  const runs = deployment?.schedulerRunStatuses ?? []
  if (runs.length === 0) return "no runs yet"
  return runs
    .map((run) => `${run.name}: ${run.status?.trim() || "no runs yet"}`)
    .join(" / ")
}
```

- [ ] **Step 3: Update readiness page imports and deployment payload**

In `src/app/[locale]/(dashboard)/admin/readiness/page.tsx`, import the new digest key:

```ts
notificationDigestLastStatusKey,
```

Then replace the deployment property:

```ts
schedulerLastRunStatuses: [
  settings.get(pmAutoGenerationLastStatusKey) ?? "",
  settings.get(ldapSyncLastStatusKey) ?? "",
].filter(Boolean),
```

with:

```ts
schedulerRunStatuses: [
  { name: "pm_generate_due", status: settings.get(pmAutoGenerationLastStatusKey) },
  { name: "ldap_sync", status: settings.get(ldapSyncLastStatusKey) },
  { name: "notification_digest", status: settings.get(notificationDigestLastStatusKey) },
],
```

- [ ] **Step 4: Update tests that construct deployment input**

In `tests/production-readiness.test.ts`, replace existing `schedulerLastRunStatuses` usages with:

```ts
schedulerRunStatuses: [
  { name: "pm_generate_due", status: "success" },
  { name: "ldap_sync", status: "success" },
  { name: "notification_digest", status: "success" },
],
```

For failure tests, use:

```ts
schedulerRunStatuses: [
  { name: "pm_generate_due", status: "success" },
  { name: "ldap_sync", status: "failed" },
  { name: "notification_digest", status: "success" },
],
```

- [ ] **Step 5: Refresh readiness copy**

In `messages/en.json`, keep the key names but make the description cover all scheduler jobs:

```json
"check_schedulerRuns_description": "Checks the latest PM, LDAP sync, and notification digest scheduler results."
```

In `messages/th.json`, use:

```json
"check_schedulerRuns_description": "ตรวจผลรันล่าสุดของ scheduler สำหรับ PM, LDAP sync และ Notification Digest"
```

- [ ] **Step 6: Run focused readiness tests**

Run:

```powershell
node --test tests\production-readiness.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/lib/system-setting-defaults.ts src/lib/production-readiness.ts "src/app/[locale]/(dashboard)/admin/readiness/page.tsx" messages/en.json messages/th.json tests/production-readiness.test.ts
git commit -m "Add digest scheduler readiness status"
```

---

### Task 3: Persist Notification Digest Scheduled Run State

**Files:**
- Modify: `src/app/api/notifications/digest/route.ts`
- Test: `tests/notification-digest.test.ts`

- [ ] **Step 1: Add source-level regression test**

In `tests/notification-digest.test.ts`, add a test that checks the route uses `updateScheduledJobRunState` and the digest status keys. This matches the existing source-order style used by upload tests.

```ts
test("notification digest route records scheduler run state", () => {
  const source = readFileSync("src/app/api/notifications/digest/route.ts", "utf8")

  assert.match(source, /updateScheduledJobRunState/)
  assert.match(source, /notificationDigestLastRunAtKey/)
  assert.match(source, /notificationDigestLastStatusKey/)
  assert.match(source, /notificationDigestLastErrorKey/)
  assert.match(source, /status:\s*"success"/)
  assert.match(source, /status:\s*"failed"/)
})
```

If `readFileSync` is not already imported in that test file, add:

```ts
import { readFileSync } from "node:fs"
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test tests\notification-digest.test.ts
```

Expected: FAIL because the route does not yet record scheduler run state.

- [ ] **Step 3: Import status helpers in the route**

In `src/app/api/notifications/digest/route.ts`, import:

```ts
import { updateScheduledJobRunState } from "@/lib/scheduled-job-run-state"
import {
  notificationDigestLastErrorKey,
  notificationDigestLastRunAtKey,
  notificationDigestLastStatusKey,
} from "@/lib/system-setting-defaults"
```

Add near the top:

```ts
const notificationDigestSchedulerStatusKeys = {
  lastRunAtKey: notificationDigestLastRunAtKey,
  lastStatusKey: notificationDigestLastStatusKey,
  lastErrorKey: notificationDigestLastErrorKey,
}
```

- [ ] **Step 4: Persist success and failure for scheduled non-dry-run digest**

Change the route skeleton to keep scheduler state visible in `catch`:

```ts
export async function POST(request: NextRequest) {
  let schedulerAuthorized = false
  let shouldRecordSchedulerState = false
  try {
    schedulerAuthorized = isSchedulerAuthorized(request)
    const user = schedulerAuthorized ? null : await requireAuth()
    if (user) {
      requirePermission(user, "setting", "edit")
    }

    const payload = await request.json().catch(() => ({})) as {
      dryRun?: boolean
      locale?: string
      targetUserId?: string
    }
    shouldRecordSchedulerState = schedulerAuthorized && payload.dryRun !== true
    const locale: NotificationDigestLocale = payload.locale === "en" ? "en" : "th"
    const result = await deliverDailyNotificationDigest({
      locale,
      dryRun: payload.dryRun === true,
      targetUserId: typeof payload.targetUserId === "string" ? payload.targetUserId : undefined,
    })

    if (shouldRecordSchedulerState) {
      await updateScheduledJobRunState({
        keys: notificationDigestSchedulerStatusKeys,
        status: "success",
      })
    }

    await logAudit({
      userId: user?.id,
      action: result.dryRun ? "preview_notification_digest" : "deliver_notification_digest",
      module: "notification",
      recordId: result.referenceId,
      newValue: result,
      remark: schedulerAuthorized ? "scheduler" : "manual",
    })

    return NextResponse.json(result)
  } catch (error) {
    if (schedulerAuthorized && shouldRecordSchedulerState) {
      await updateScheduledJobRunState({
        keys: notificationDigestSchedulerStatusKeys,
        status: "failed",
        error: error instanceof Error ? error.message : "Notification digest failed",
      }).catch(() => undefined)
    }
    return errorResponse(error, 400)
  }
}
```

- [ ] **Step 5: Run focused digest tests**

Run:

```powershell
node --test tests\notification-digest.test.ts tests\production-readiness.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/app/api/notifications/digest/route.ts tests/notification-digest.test.ts
git commit -m "Track notification digest scheduler runs"
```

---

### Task 4: Add Upload Content Signature Validation

**Files:**
- Create: `src/lib/upload-signature.ts`
- Modify: `src/lib/uploads.ts`
- Test: `tests/upload-validation.test.ts`

- [ ] **Step 1: Add failing tests for spoofed file contents**

In `tests/upload-validation.test.ts`, add:

```ts
import {
  detectUploadFileSignature,
  isUploadSignatureAllowed,
} from "../src/lib/upload-signature.ts"
```

Add tests:

```ts
test("detects common upload file signatures", () => {
  assert.equal(detectUploadFileSignature(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])), "pdf")
  assert.equal(detectUploadFileSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "png")
  assert.equal(detectUploadFileSignature(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "jpeg")
  assert.equal(detectUploadFileSignature(new TextEncoder().encode("GIF89a")), "gif")
  assert.equal(detectUploadFileSignature(new Uint8Array([0x50, 0x4b, 0x03, 0x04])), "zip")
})

test("rejects mismatched MIME, extension, and file content signatures", () => {
  assert.equal(
    isUploadSignatureAllowed({
      mimeType: "application/pdf",
      extension: ".pdf",
      bytes: new TextEncoder().encode("MZ executable"),
    }),
    false
  )
  assert.equal(
    isUploadSignatureAllowed({
      mimeType: "image/png",
      extension: ".png",
      bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]),
    }),
    false
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test tests\upload-validation.test.ts
```

Expected: FAIL because `src/lib/upload-signature.ts` does not exist.

- [ ] **Step 3: Create signature helper**

Create `src/lib/upload-signature.ts`:

```ts
export type UploadFileSignature =
  | "avif"
  | "gif"
  | "heic"
  | "jpeg"
  | "ole"
  | "pdf"
  | "png"
  | "text"
  | "webp"
  | "zip"
  | "unknown"

type UploadSignatureInput = {
  mimeType: string
  extension: string
  bytes: Uint8Array
}

const zipOfficeExtensions = new Set([".docx", ".xlsx"])
const oleOfficeExtensions = new Set([".doc", ".xls"])

export function detectUploadFileSignature(bytes: Uint8Array): UploadFileSignature {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf"
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png"
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg"
  if (startsWithText(bytes, "GIF87a") || startsWithText(bytes, "GIF89a")) return "gif"
  if (bytes.length >= 12 && startsWithText(bytes, "RIFF") && textAt(bytes, 8, 12) === "WEBP") return "webp"
  if (bytes.length >= 12 && textAt(bytes, 4, 8) === "ftyp") {
    const brand = textAt(bytes, 8, 12)
    if (brand === "avif" || brand === "avis") return "avif"
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand)) return "heic"
  }
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return "ole"
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06]) || startsWith(bytes, [0x50, 0x4b, 0x07, 0x08])) return "zip"
  if (looksLikeText(bytes)) return "text"
  return "unknown"
}

export function isUploadSignatureAllowed({ mimeType, extension, bytes }: UploadSignatureInput) {
  const signature = detectUploadFileSignature(bytes)
  const normalizedExtension = extension.toLowerCase()
  if (signature === "unknown") return false

  if (mimeType === "application/pdf") return normalizedExtension === ".pdf" && signature === "pdf"
  if (mimeType === "image/png") return normalizedExtension === ".png" && signature === "png"
  if (mimeType === "image/jpeg") return [".jpg", ".jpeg"].includes(normalizedExtension) && signature === "jpeg"
  if (mimeType === "image/gif") return normalizedExtension === ".gif" && signature === "gif"
  if (mimeType === "image/webp") return normalizedExtension === ".webp" && signature === "webp"
  if (mimeType === "image/avif") return normalizedExtension === ".avif" && signature === "avif"
  if (mimeType === "image/heic" || mimeType === "image/heif") return [".heic", ".heif"].includes(normalizedExtension) && signature === "heic"
  if (mimeType === "text/plain") return normalizedExtension === ".txt" && signature === "text"
  if (mimeType === "application/msword" || mimeType === "application/vnd.ms-excel") return oleOfficeExtensions.has(normalizedExtension) && signature === "ole"
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return zipOfficeExtensions.has(normalizedExtension) && signature === "zip"
  }

  return false
}

function startsWith(bytes: Uint8Array, prefix: number[]) {
  return prefix.every((value, index) => bytes[index] === value)
}

function startsWithText(bytes: Uint8Array, prefix: string) {
  return textAt(bytes, 0, prefix.length) === prefix
}

function textAt(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end))
}

function looksLikeText(bytes: Uint8Array) {
  if (bytes.length === 0) return false
  return !bytes.slice(0, 512).some((byte) => byte === 0)
}
```

- [ ] **Step 4: Add async content validation wrapper**

In `src/lib/uploads.ts`, import the helper:

```ts
import { isUploadSignatureAllowed } from "@/lib/upload-signature"
```

Add:

```ts
export async function validateUploadFileContent(file: File) {
  const extension = path.extname(file.name).toLowerCase()
  const bytes = new Uint8Array(await file.slice(0, 4096).arrayBuffer())
  if (!isUploadSignatureAllowed({ mimeType: file.type, extension, bytes })) {
    throw new Error("File content does not match the declared file type")
  }
}
```

Keep the existing synchronous `validateUploadFile(file)` for metadata checks.

- [ ] **Step 5: Run focused upload tests**

Run:

```powershell
node --test tests\upload-validation.test.ts
```

Expected: PASS for helper-level tests; route call-site tests are added in Task 5.

- [ ] **Step 6: Commit**

```powershell
git add src/lib/upload-signature.ts src/lib/uploads.ts tests/upload-validation.test.ts
git commit -m "Validate upload file signatures"
```

---

### Task 5: Wire Upload Validation And Optional Scanner Hook

**Files:**
- Create: `src/lib/upload-virus-scan.ts`
- Modify: `src/lib/uploads.ts`
- Modify upload save call sites listed in File Structure.
- Test: `tests/upload-validation.test.ts`
- Docs: `DEPLOYMENT_UBUNTU_CLOUDFLARE.md`, `docs/10_SECURITY_REVIEW.md`

- [ ] **Step 1: Add source-order regression test for content validation**

Update the existing upload route source-order test in `tests/upload-validation.test.ts` to require both metadata and content validation before `writeFile`:

```ts
assert.match(source, /validateUploadFile\(file\)[\s\S]*await validateUploadFileContent\(file\)[\s\S]*await writeFile\(/, route)
```

For helper files that save uploads, add this file list:

```ts
const uploadHelperFiles = [
  "src/lib/asset-operation-evidence.ts",
  "src/lib/asset-component-evidence.ts",
  "src/lib/purchase-documents.ts",
]
```

Assert each contains:

```ts
assert.match(source, /validateUploadFile\(file\)[\s\S]*await validateUploadFileContent\(file\)[\s\S]*await writeFile\(/, helper)
```

- [ ] **Step 2: Run upload test to verify it fails**

Run:

```powershell
node --test tests\upload-validation.test.ts
```

Expected: FAIL until call sites include `validateUploadFileContent(file)`.

- [ ] **Step 3: Update helper call sites**

In these files, import `validateUploadFileContent` from `@/lib/uploads`:

- `src/lib/asset-operation-evidence.ts`
- `src/lib/asset-component-evidence.ts`
- `src/lib/purchase-documents.ts`

Then change each save function from:

```ts
validateUploadFile(file)
const uploadRoot = getUploadRoot()
```

to:

```ts
validateUploadFile(file)
await validateUploadFileContent(file)
const uploadRoot = getUploadRoot()
```

- [ ] **Step 4: Update direct route call sites**

In each attachment route that currently calls `validateUploadFile(file)`, import and call content validation before `file.arrayBuffer()`:

```ts
validateUploadFile(file)
await validateUploadFileContent(file)
```

Apply this to:

- `src/app/api/assets/[id]/attachments/route.ts`
- `src/app/api/models/[id]/attachments/route.ts`
- `src/app/api/maintenance-tickets/[id]/attachments/route.ts`
- `src/app/api/disposal-requests/[id]/attachments/route.ts`
- `src/app/api/audit-findings/[id]/attachments/route.ts`

- [ ] **Step 5: Add optional ClamAV-compatible scanner helper**

Create `src/lib/upload-virus-scan.ts`:

```ts
import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

export type UploadVirusScanConfig = {
  enabled: boolean
  command: string
}

export function resolveUploadVirusScanConfig(env = process.env): UploadVirusScanConfig {
  return {
    enabled: env.UPLOAD_VIRUS_SCAN_ENABLED === "true",
    command: env.UPLOAD_VIRUS_SCAN_COMMAND?.trim() || "clamdscan",
  }
}

export async function scanUploadedFile(filePath: string, config = resolveUploadVirusScanConfig()) {
  if (!config.enabled) return { scanned: false as const }

  try {
    await execFileAsync(config.command, ["--no-summary", filePath], { timeout: 30_000 })
    return { scanned: true as const, clean: true as const }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload virus scan failed"
    throw new Error(`Upload virus scan rejected the file: ${message}`)
  }
}
```

- [ ] **Step 6: Integrate scanner after write and before DB record creation**

For direct route call sites, after `await writeFile(filePath, bytes)` and before `prisma.attachment.create`, call:

```ts
await scanUploadedFile(filePath)
```

For helper save functions, call `await scanUploadedFile(filePath)` immediately after `await writeFile(filePath, bytes)` and before returning metadata.

Import:

```ts
import { scanUploadedFile } from "@/lib/upload-virus-scan"
```

- [ ] **Step 7: Document scanner env**

In `DEPLOYMENT_UBUNTU_CLOUDFLARE.md`, add optional env keys:

```env
UPLOAD_VIRUS_SCAN_ENABLED=false
UPLOAD_VIRUS_SCAN_COMMAND=clamdscan
```

Add a note:

```md
If `UPLOAD_VIRUS_SCAN_ENABLED=true`, install and test the scanner command on the server first. The app rejects uploads when the scanner command returns a non-zero exit code.
```

In `docs/10_SECURITY_REVIEW.md`, update the uploads row to mention file signature validation and optional scanner hook.

- [ ] **Step 8: Run focused upload tests**

Run:

```powershell
node --test tests\upload-validation.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add src/lib/upload-virus-scan.ts src/lib/uploads.ts src/lib/asset-operation-evidence.ts src/lib/asset-component-evidence.ts src/lib/purchase-documents.ts src/app/api/assets/[id]/attachments/route.ts src/app/api/models/[id]/attachments/route.ts src/app/api/maintenance-tickets/[id]/attachments/route.ts src/app/api/disposal-requests/[id]/attachments/route.ts src/app/api/audit-findings/[id]/attachments/route.ts tests/upload-validation.test.ts DEPLOYMENT_UBUNTU_CLOUDFLARE.md docs/10_SECURITY_REVIEW.md
git commit -m "Harden upload content validation"
```

---

### Task 6: Add Lifecycle Exception And Correction Policy Tests

**Files:**
- Create: `src/lib/asset-lifecycle-exception-policy.ts`
- Modify: `tests/asset-operation-status-policy.test.ts`

- [ ] **Step 1: Write failing policy tests**

In `tests/asset-operation-status-policy.test.ts`, add imports:

```ts
import {
  getAssetRegisterStatusChangeError,
  getAssetStatusCorrectionError,
  getDisposalExecutionStatusError,
  getMaintenanceCloseStatusError,
} from "../src/lib/asset-lifecycle-exception-policy.ts"
```

Add tests:

```ts
test("maintenance close can only return assets to Ready or Pending Disposal", () => {
  assert.equal(getMaintenanceCloseStatusError({ name: "Ready" }), null)
  assert.equal(getMaintenanceCloseStatusError({ name: "Pending Disposal" }), null)
  assert.match(getMaintenanceCloseStatusError({ name: "Disposed" }) ?? "", /maintenance close/i)
  assert.match(getMaintenanceCloseStatusError({ name: "Checked Out" }) ?? "", /maintenance close/i)
})

test("disposal execution can only finalize assets as Disposed or Retired", () => {
  assert.equal(getDisposalExecutionStatusError({ name: "Disposed" }), null)
  assert.equal(getDisposalExecutionStatusError({ name: "Retired" }), null)
  assert.match(getDisposalExecutionStatusError({ name: "Ready" }) ?? "", /disposal execution/i)
  assert.match(getDisposalExecutionStatusError({ name: "Pending Disposal" }) ?? "", /disposal execution/i)
})

test("protected lifecycle status changes cannot use the generic asset edit route", () => {
  assert.equal(getAssetRegisterStatusChangeError({ name: "Ready" }, { name: "Draft" }), null)
  assert.match(
    getAssetRegisterStatusChangeError({ name: "Disposed" }, { name: "Ready" }) ?? "",
    /status correction/i
  )
  assert.match(
    getAssetRegisterStatusChangeError({ name: "Ready" }, { name: "Disposed" }) ?? "",
    /proper workflow/i
  )
})

test("controlled correction can restore closed or review-required assets to Ready", () => {
  for (const source of ["Pending Disposal", "Disposed", "Retired", "Lost", "Missing", "Under Maintenance", "Pending Repair"]) {
    assert.equal(getAssetStatusCorrectionError({ name: source }, { name: "Ready" }), null)
  }

  assert.match(getAssetStatusCorrectionError({ name: "Disposed" }, { name: "Checked Out" }) ?? "", /Ready/i)
  assert.match(getAssetStatusCorrectionError({ name: "Ready" }, { name: "Disposed" }) ?? "", /not needed/i)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test tests\asset-operation-status-policy.test.ts
```

Expected: FAIL because the policy module does not exist.

- [ ] **Step 3: Create lifecycle exception policy helper**

Create `src/lib/asset-lifecycle-exception-policy.ts`:

```ts
export type AssetLifecycleStatus = {
  name?: string | null
  nameTh?: string | null
}

const maintenanceCloseAllowed = new Set(["ready", "pending disposal"])
const disposalExecutionAllowed = new Set(["disposed", "retired"])
const correctionSourceStatuses = new Set([
  "pending disposal",
  "disposed",
  "retired",
  "lost",
  "missing",
  "under maintenance",
  "pending repair",
])
const correctionTargetStatuses = new Set(["ready"])
const protectedLifecycleStatuses = new Set([...correctionSourceStatuses, "checked out", "in transit"])

export function getMaintenanceCloseStatusError(status: AssetLifecycleStatus | null | undefined) {
  const statusName = normalizeStatusName(status?.name)
  if (statusName && maintenanceCloseAllowed.has(statusName)) return null
  return "Maintenance close can only move an asset to Ready or Pending Disposal"
}

export function getDisposalExecutionStatusError(status: AssetLifecycleStatus | null | undefined) {
  const statusName = normalizeStatusName(status?.name)
  if (statusName && disposalExecutionAllowed.has(statusName)) return null
  return "Disposal execution can only move an asset to Disposed or Retired"
}

export function getAssetRegisterStatusChangeError(
  currentStatus: AssetLifecycleStatus | null | undefined,
  nextStatus: AssetLifecycleStatus | null | undefined
) {
  const currentName = normalizeStatusName(currentStatus?.name)
  const nextName = normalizeStatusName(nextStatus?.name)
  if (!currentName || !nextName || currentName === nextName) return null
  if (protectedLifecycleStatuses.has(currentName) || protectedLifecycleStatuses.has(nextName)) {
    return "Protected lifecycle status changes must use status correction or the proper workflow"
  }
  return null
}

export function getAssetStatusCorrectionError(
  currentStatus: AssetLifecycleStatus | null | undefined,
  nextStatus: AssetLifecycleStatus | null | undefined
) {
  const currentName = normalizeStatusName(currentStatus?.name)
  const nextName = normalizeStatusName(nextStatus?.name)
  if (!correctionSourceStatuses.has(currentName)) {
    return "Status correction is not needed for this asset status"
  }
  if (!correctionTargetStatuses.has(nextName)) {
    return "Status correction can only move the asset back to Ready"
  }
  return null
}

function normalizeStatusName(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ""
}
```

- [ ] **Step 4: Run focused policy test**

Run:

```powershell
node --test tests\asset-operation-status-policy.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/asset-lifecycle-exception-policy.ts tests/asset-operation-status-policy.test.ts
git commit -m "Add lifecycle correction policy tests"
```

---

### Task 7: Enforce Lifecycle Exception And Correction Policy In Routes

**Files:**
- Modify: `src/app/api/maintenance-tickets/[id]/route.ts`
- Modify: `src/app/api/disposal-requests/[id]/route.ts`
- Modify: `src/app/api/assets/[id]/route.ts`
- Create: `src/lib/validations/asset-status-correction.ts`
- Create: `src/app/api/assets/[id]/status-correction/route.ts`
- Modify: `src/lib/rbac-route-matrix.ts`
- Modify docs: `docs/05_ASSET_LIFECYCLE.md`, `docs/10_SECURITY_REVIEW.md`, `DEVELOPER_HANDOFF.md`
- Test: `tests/asset-operation-status-policy.test.ts`

- [ ] **Step 1: Update maintenance route to select status name**

In `src/app/api/maintenance-tickets/[id]/route.ts`, import:

```ts
import { getMaintenanceCloseStatusError } from "@/lib/asset-lifecycle-exception-policy"
```

Change next status lookup from:

```ts
const nextStatus = await prisma.assetStatus.findFirst({
  where: { id: input.nextStatusId, isActive: true },
  select: { id: true },
})
```

to:

```ts
const nextStatus = await prisma.assetStatus.findFirst({
  where: { id: input.nextStatusId, isActive: true },
  select: { id: true, name: true, nameTh: true },
})
```

Then add:

```ts
const nextStatusError = getMaintenanceCloseStatusError(nextStatus)
if (nextStatusError) return NextResponse.json({ error: nextStatusError }, { status: 400 })
```

- [ ] **Step 2: Update disposal route to select status name**

In `src/app/api/disposal-requests/[id]/route.ts`, import:

```ts
import { getDisposalExecutionStatusError } from "@/lib/asset-lifecycle-exception-policy"
```

Inside the `action === "execute"` branch, change next status lookup to select `name` and `nameTh`, then add:

```ts
const nextStatusError = getDisposalExecutionStatusError(nextStatus)
if (nextStatusError) return NextResponse.json({ error: nextStatusError }, { status: 400 })
```

Do not apply this disposal execution policy to the decision reject branch. Rejection is not final disposal execution.

- [ ] **Step 3: Block protected lifecycle changes in generic asset edit**

In `src/app/api/assets/[id]/route.ts`, import:

```ts
import { getAssetRegisterStatusChangeError } from "@/lib/asset-lifecycle-exception-policy"
```

Change the existing asset lookup in `PUT` from:

```ts
const existing = await prisma.asset.findFirst({
  where: { id, isActive: true },
})
```

to include the current status:

```ts
const existing = await prisma.asset.findFirst({
  where: { id, isActive: true },
  include: { status: { select: { name: true, nameTh: true } } },
})
```

Before `assertUniqueSerial`, load the requested next status only when the status changes:

```ts
const nextStatus = input.statusId !== existing.statusId
  ? await prisma.assetStatus.findFirst({
      where: { id: input.statusId, isActive: true },
      select: { id: true, name: true, nameTh: true },
    })
  : null
if (input.statusId !== existing.statusId && !nextStatus) {
  return NextResponse.json({ error: "Asset status not found" }, { status: 404 })
}
const statusChangeError = getAssetRegisterStatusChangeError(existing.status, nextStatus)
if (statusChangeError) return NextResponse.json({ error: statusChangeError }, { status: 400 })
```

Update the `logAssetMovements` parameter type to allow the extra `status` relation without changing the movement logic.

- [ ] **Step 4: Add status correction request validation**

Create `src/lib/validations/asset-status-correction.ts`:

```ts
import { z } from "zod"

export const assetStatusCorrectionSchema = z.object({
  nextStatusId: z.string().trim().min(1),
  reason: z.string().trim().min(5).max(1000),
})

export type AssetStatusCorrectionInput = z.infer<typeof assetStatusCorrectionSchema>
```

- [ ] **Step 5: Add dedicated status correction route**

Create `src/app/api/assets/[id]/status-correction/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-response"
import { logAudit } from "@/lib/audit-log"
import { getAssetStatusCorrectionError } from "@/lib/asset-lifecycle-exception-policy"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { assetStatusCorrectionSchema } from "@/lib/validations/asset-status-correction"

type AssetStatusCorrectionContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: AssetStatusCorrectionContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const { id } = await context.params
    const input = assetStatusCorrectionSchema.parse(await request.json())
    const asset = await prisma.asset.findFirst({
      where: { id, isActive: true },
      include: { status: { select: { id: true, name: true, nameTh: true } } },
    })
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })

    const nextStatus = await prisma.assetStatus.findFirst({
      where: { id: input.nextStatusId, isActive: true },
      select: { id: true, name: true, nameTh: true },
    })
    if (!nextStatus) return NextResponse.json({ error: "Asset status not found" }, { status: 404 })

    const statusError = getAssetStatusCorrectionError(asset.status, nextStatus)
    if (statusError) return NextResponse.json({ error: statusError }, { status: 400 })

    const updatedAsset = await prisma.$transaction(async (tx) => {
      const updated = await tx.asset.update({
        where: { id },
        data: { statusId: nextStatus.id, updatedBy: user.id },
      })

      await tx.assetMovement.create({
        data: {
          assetId: asset.id,
          movementType: "status_correction",
          fromValue: asset.statusId,
          toValue: nextStatus.id,
          reason: input.reason,
          referenceType: "asset",
          referenceId: asset.id,
          performedBy: user.id,
          remark: "Controlled lifecycle correction",
        },
      })

      return updated
    })

    await logAudit({
      userId: user.id,
      action: "correct_status",
      module: "asset",
      recordId: asset.id,
      oldValue: { statusId: asset.statusId, statusName: asset.status.name },
      newValue: { statusId: nextStatus.id, statusName: nextStatus.name, reason: input.reason },
    })

    return NextResponse.json(updatedAsset)
  } catch (error) {
    return errorResponse(error, 400)
  }
}
```

- [ ] **Step 6: Add status correction route to RBAC matrix**

In `src/lib/rbac-route-matrix.ts`, add an entry near other asset detail routes:

```ts
{
  filePath: "src/app/api/assets/[id]/status-correction/route.ts",
  label: "Asset status correction",
  checks: [{ module: "asset", action: "edit" }],
},
```

- [ ] **Step 7: Run focused policy and RBAC tests**

Run:

```powershell
node --test tests\asset-operation-status-policy.test.ts tests\rbac-route-matrix.test.ts
```

Expected: PASS.

- [ ] **Step 8: Update lifecycle docs**

In `docs/05_ASSET_LIFECYCLE.md`, update Current Code Enforcement with:

```md
- Maintenance close only allows next asset status `Ready` or `Pending Disposal`.
- Disposal execution only allows final asset status `Disposed` or `Retired`.
- Generic asset edit cannot change protected lifecycle statuses such as `Pending Disposal`, `Disposed`, `Retired`, `Lost`, `Missing`, `Under Maintenance`, or `Pending Repair`; use status correction or the proper workflow.
- Status correction can restore accidentally changed `Pending Disposal`, `Disposed`, `Retired`, `Lost`, `Missing`, `Under Maintenance`, or `Pending Repair` assets back to `Ready` with a required reason, asset movement, and audit log.
- Normal checkout and transfer remain blocked for closed or review-required statuses.
```

In Validation Recommendations, keep future workflows explicit:

```md
- If the organization needs to move `Pending Disposal` assets before final execution, add a privileged transfer workflow with separate approval/audit evidence.
- If the organization needs richer return-to-service steps than a status correction, add a dedicated workflow with inspection evidence before checkout.
```

- [ ] **Step 9: Update security review and handoff**

In `docs/10_SECURITY_REVIEW.md`, update the Asset lifecycle row status/recommendation to mention maintenance close and disposal execution policy helpers.

In `DEVELOPER_HANDOFF.md`, extend the lifecycle hardening bullet with:

```md
Maintenance close is limited to Ready/Pending Disposal, disposal execution is limited to Disposed/Retired, and protected lifecycle status corrections can restore accidental Pending Disposal/Disposed/Retired/Lost/Missing/Under Maintenance/Pending Repair statuses back to Ready with a required reason and audit trail.
```

- [ ] **Step 10: Run focused lifecycle tests**

Run:

```powershell
node --test tests\asset-operation-status-policy.test.ts tests\rbac-route-matrix.test.ts
```

Expected: PASS.

- [ ] **Step 11: Commit**

```powershell
git add src/app/api/maintenance-tickets/[id]/route.ts src/app/api/disposal-requests/[id]/route.ts src/app/api/assets/[id]/route.ts src/app/api/assets/[id]/status-correction/route.ts src/lib/validations/asset-status-correction.ts src/lib/rbac-route-matrix.ts docs/05_ASSET_LIFECYCLE.md docs/10_SECURITY_REVIEW.md DEVELOPER_HANDOFF.md
git commit -m "Add controlled asset status correction"
```

---

### Task 8: Add Asset Detail Status Correction Action

**Files:**
- Create: `src/components/assets/asset-status-correction-button.tsx`
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`
- Modify: `messages/en.json`
- Modify: `messages/th.json`
- Test: `tests/asset-operation-status-policy.test.ts`

- [ ] **Step 1: Export correction capability helper**

In `src/lib/asset-lifecycle-exception-policy.ts`, add:

```ts
export function canCorrectAssetStatus(status: AssetLifecycleStatus | null | undefined) {
  return correctionSourceStatuses.has(normalizeStatusName(status?.name))
}
```

- [ ] **Step 2: Add policy test for correction visibility helper**

In `tests/asset-operation-status-policy.test.ts`, import `canCorrectAssetStatus` and add:

```ts
test("status correction action is only visible for recoverable statuses", () => {
  for (const statusName of ["Pending Disposal", "Disposed", "Retired", "Lost", "Missing", "Under Maintenance", "Pending Repair"]) {
    assert.equal(canCorrectAssetStatus({ name: statusName }), true)
  }
  assert.equal(canCorrectAssetStatus({ name: "Ready" }), false)
  assert.equal(canCorrectAssetStatus({ name: "Checked Out" }), false)
})
```

- [ ] **Step 3: Create client correction button**

Create `src/components/assets/asset-status-correction-button.tsx`:

```tsx
"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { RotateCcw } from "lucide-react"

type AssetStatusCorrectionButtonProps = {
  assetId: string
  readyStatusId: string
  labels: {
    button: string
    title: string
    description: string
    reason: string
    reasonPlaceholder: string
    cancel: string
    submit: string
    submitting: string
    success: string
    errorFallback: string
  }
}

export function AssetStatusCorrectionButton({ assetId, readyStatusId, labels }: AssetStatusCorrectionButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function submitCorrection() {
    setError(null)
    const response = await fetch(`/api/assets/${assetId}/status-correction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nextStatusId: readyStatusId, reason }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      setError(payload?.error ?? labels.errorFallback)
      return
    }
    setOpen(false)
    setReason("")
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm font-medium text-warning hover:bg-warning/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        {labels.button}
      </button>
      {open ? (
        <div className="rounded-lg border border-warning/30 bg-surface p-4 shadow-sm">
          <h3 className="font-semibold text-foreground">{labels.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{labels.description}</p>
          <label className="mt-3 block text-sm font-medium text-foreground" htmlFor="asset-status-correction-reason">
            {labels.reason}
          </label>
          <textarea
            id="asset-status-correction-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={labels.reasonPlaceholder}
            className="mt-1 min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-md border border-border px-3 py-2 text-sm font-medium">
              {labels.cancel}
            </button>
            <button
              type="button"
              disabled={isPending || reason.trim().length < 5}
              onClick={submitCorrection}
              className="min-h-11 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {isPending ? labels.submitting : labels.submit}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 4: Wire the action into Asset Detail**

In `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`, import:

```ts
import { AssetStatusCorrectionButton } from "@/components/assets/asset-status-correction-button"
import { canCorrectAssetStatus } from "@/lib/asset-lifecycle-exception-policy"
```

Load the Ready status near other page data:

```ts
const readyStatusPromise = prisma.assetStatus.findFirst({
  where: { isActive: true, OR: [{ name: "Ready" }, { nameTh: "พร้อมใช้งาน" }] },
  select: { id: true },
})
```

Include `readyStatus` in the page `Promise.all` result, then render below the quick action cards or near the lifecycle/status panel:

```tsx
{readyStatus && canCorrectAssetStatus(asset.status) ? (
  <AssetStatusCorrectionButton
    assetId={asset.id}
    readyStatusId={readyStatus.id}
    labels={{
      button: t("statusCorrectionButton"),
      title: t("statusCorrectionTitle"),
      description: t("statusCorrectionDescription"),
      reason: t("statusCorrectionReason"),
      reasonPlaceholder: t("statusCorrectionReasonPlaceholder"),
      cancel: t("cancel"),
      submit: t("statusCorrectionSubmit"),
      submitting: t("statusCorrectionSubmitting"),
      success: t("statusCorrectionSuccess"),
      errorFallback: t("statusCorrectionError"),
    }}
  />
) : null}
```

If `cancel` is not in the asset detail namespace, use the existing common translation namespace already loaded on the page.

- [ ] **Step 5: Add translations**

In `messages/en.json`, under the asset detail namespace used by `page.tsx`, add:

```json
"statusCorrectionButton": "Correct Status",
"statusCorrectionTitle": "Return asset to Ready",
"statusCorrectionDescription": "Use this only to correct an accidental lifecycle status. The reason is saved to the movement timeline and audit log.",
"statusCorrectionReason": "Correction reason",
"statusCorrectionReasonPlaceholder": "Example: Disposal was executed by mistake; asset is still in service.",
"statusCorrectionSubmit": "Return to Ready",
"statusCorrectionSubmitting": "Saving...",
"statusCorrectionSuccess": "Status corrected",
"statusCorrectionError": "Unable to correct status"
```

In `messages/th.json`, add:

```json
"statusCorrectionButton": "แก้ไขสถานะ",
"statusCorrectionTitle": "เปลี่ยนกลับเป็นพร้อมใช้งาน",
"statusCorrectionDescription": "ใช้เฉพาะกรณีแก้ไขสถานะ lifecycle ที่กดผิด ระบบจะบันทึกเหตุผลใน timeline และ audit log",
"statusCorrectionReason": "เหตุผลการแก้ไข",
"statusCorrectionReasonPlaceholder": "ตัวอย่าง: กดดำเนินการตัดจำหน่ายผิด ทรัพย์สินยังใช้งานอยู่",
"statusCorrectionSubmit": "เปลี่ยนกลับเป็นพร้อมใช้งาน",
"statusCorrectionSubmitting": "กำลังบันทึก...",
"statusCorrectionSuccess": "แก้ไขสถานะแล้ว",
"statusCorrectionError": "ไม่สามารถแก้ไขสถานะได้"
```

- [ ] **Step 6: Run focused tests**

Run:

```powershell
node --test tests\asset-operation-status-policy.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/lib/asset-lifecycle-exception-policy.ts src/components/assets/asset-status-correction-button.tsx "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" messages/en.json messages/th.json tests/asset-operation-status-policy.test.ts
git commit -m "Add asset status correction action"
```

---

### Task 9: Full Verification And Push

**Files:**
- All files changed by Tasks 1-8.

- [ ] **Step 1: Check git status**

Run:

```powershell
git status --short --branch
```

Expected: only intended files are modified or staged. `package-lock.json` must not be staged unless there was an intentional dependency change.

- [ ] **Step 2: Run full verification**

Run:

```powershell
npm run verify
```

Expected:

- ESLint passes.
- Node tests pass.
- Next production build passes.

- [ ] **Step 3: Inspect final diff**

Run:

```powershell
git diff --stat
git diff --name-status
```

Expected: changes match Tasks 1-7.

- [ ] **Step 4: Push**

If all commits were created separately:

```powershell
git push origin master
```

If execution kept all changes in one final commit instead, use:

```powershell
git add src/lib/system-setting-defaults.ts src/lib/production-readiness.ts "src/app/[locale]/(dashboard)/admin/readiness/page.tsx" src/app/api/notifications/digest/route.ts src/lib/upload-signature.ts src/lib/upload-virus-scan.ts src/lib/uploads.ts src/lib/asset-operation-evidence.ts src/lib/asset-component-evidence.ts src/lib/purchase-documents.ts src/app/api/assets/[id]/attachments/route.ts src/app/api/models/[id]/attachments/route.ts src/app/api/maintenance-tickets/[id]/attachments/route.ts src/app/api/disposal-requests/[id]/attachments/route.ts src/app/api/audit-findings/[id]/attachments/route.ts src/lib/asset-lifecycle-exception-policy.ts src/lib/validations/asset-status-correction.ts src/app/api/assets/[id]/route.ts src/app/api/assets/[id]/status-correction/route.ts src/app/api/maintenance-tickets/[id]/route.ts src/app/api/disposal-requests/[id]/route.ts src/lib/rbac-route-matrix.ts src/components/assets/asset-status-correction-button.tsx "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" tests/production-readiness.test.ts tests/notification-digest.test.ts tests/upload-validation.test.ts tests/asset-operation-status-policy.test.ts messages/en.json messages/th.json DEPLOYMENT_UBUNTU_CLOUDFLARE.md docs/05_ASSET_LIFECYCLE.md docs/10_SECURITY_REVIEW.md DEVELOPER_HANDOFF.md
git diff --cached --name-status
git commit -m "Complete production readiness followups"
git push origin master
```

- [ ] **Step 5: Confirm local and remote match**

Run:

```powershell
git status --short --branch
git rev-list --left-right --count HEAD...origin/master
```

Expected:

```text
0	0
```

---

## Self-Review

- Spec coverage: Task 1-3 cover recommendation 6, Task 4-5 cover recommendation 7, Task 6-8 cover recommendation 8 including `Disposed`/`Retired` correction, Task 9 covers verification and push.
- Placeholder scan: no placeholder implementation steps remain.
- Type consistency: scheduler readiness uses `schedulerRunStatuses` consistently; upload signature helper uses `Uint8Array`; lifecycle policy status shape matches existing `AssetStatus` selections.
- Scope check: this is one multi-part production-readiness plan, but each task is independently committable and testable.
