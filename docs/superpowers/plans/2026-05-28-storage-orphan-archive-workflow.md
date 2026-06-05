# Storage Orphan Archive Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe per-file Archive workflow to the Admin Storage Governance page so admins can move orphan upload files into `UPLOAD_DIR/.archive/YYYY-MM-DD/` without deleting them, while preventing active asset files from being moved and keeping an audit trail.

**Architecture:** Keep orphan detection in `src/lib/storage-governance.ts`, add path-safe archive helpers there, expose one protected POST route at `/api/admin/storage/archive-orphan`, and add a small client button in the Storage Governance dry-run table. The route re-checks the database at click time before moving a file, logs the action, and the page refreshes so archived files disappear from the orphan list. `scanUploadDirectory` must skip `.archive` so archived files do not show up as new orphan files.

**Tech Stack:** Next.js App Router, TypeScript, Prisma, Node `fs/promises`, `next-intl`, `sonner`, `node:test`.

---

## Scope

Implement these files:

- `src/lib/storage-governance.ts`
- `src/app/api/admin/storage/archive-orphan/route.ts`
- `src/components/admin/storage-archive-button.tsx`
- `src/app/[locale]/(dashboard)/admin/storage/page.tsx`
- `messages/en.json`
- `messages/th.json`
- `tests/storage-governance.test.ts`
- `tests/storage-archive-route.test.ts`
- `tests/storage-archive-ui.test.ts`
- `docs/08_PRODUCTION_READINESS.md`

Do not add bulk archive in this pass. Start with one file per click because it is easier to review, audit, and restore.

## Restore Behavior

Archive is a move, not a delete. A file archived from:

```text
UPLOAD_DIR/assets/photo.jpg
```

will move to:

```text
UPLOAD_DIR/.archive/2026-05-28/assets/photo.jpg
```

Manual restore remains simple: move the archived file back to the original relative path under `UPLOAD_DIR`. The audit log stores both paths.

---

## Task 1: Add Storage Archive Helper Tests

- [ ] Extend `tests/storage-governance.test.ts` with failing tests for archive path safety and archive scan behavior.

Add imports:

```ts
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import os from "node:os"
import path from "node:path"
```

Add these tests:

```ts
test("assertStorageRelativePath normalizes safe relative paths", () => {
  assert.equal(assertStorageRelativePath("assets\\photo.jpg"), "assets/photo.jpg")
  assert.equal(assertStorageRelativePath("assets/photo.jpg"), "assets/photo.jpg")
})

test("assertStorageRelativePath rejects unsafe archive inputs", () => {
  assert.throws(() => assertStorageRelativePath(""))
  assert.throws(() => assertStorageRelativePath("../secret.txt"))
  assert.throws(() => assertStorageRelativePath("/etc/passwd"))
  assert.throws(() => assertStorageRelativePath(".archive/2026-05-28/file.jpg"))
})

test("scanUploadDirectory excludes archive files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "asset-storage-"))
  await mkdir(path.join(root, "assets"), { recursive: true })
  await mkdir(path.join(root, ".archive", "2026-05-28", "assets"), { recursive: true })
  await writeFile(path.join(root, "assets", "active.jpg"), "active")
  await writeFile(path.join(root, ".archive", "2026-05-28", "assets", "old.jpg"), "old")

  const files = await scanUploadDirectory(root)

  assert.deepEqual(files.map((file) => file.relativePath), ["assets/active.jpg"])
})

test("archiveOrphanUploadFile moves a file into the dated archive", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "asset-storage-"))
  await mkdir(path.join(root, "assets"), { recursive: true })
  await writeFile(path.join(root, "assets", "orphan.jpg"), "orphan")

  const result = await archiveOrphanUploadFile({
    uploadDir: root,
    relativePath: "assets/orphan.jpg",
    archivedAt: new Date("2026-05-28T01:02:03.000Z"),
  })

  assert.equal(result.sourceRelativePath, "assets/orphan.jpg")
  assert.equal(result.archiveRelativePath, ".archive/2026-05-28/assets/orphan.jpg")
  assert.equal(existsSync(path.join(root, "assets", "orphan.jpg")), false)
  assert.equal(await readFile(path.join(root, ".archive", "2026-05-28", "assets", "orphan.jpg"), "utf8"), "orphan")
})

test("archiveOrphanUploadFile avoids overwriting archived files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "asset-storage-"))
  await mkdir(path.join(root, "assets"), { recursive: true })
  await mkdir(path.join(root, ".archive", "2026-05-28", "assets"), { recursive: true })
  await writeFile(path.join(root, "assets", "orphan.jpg"), "new")
  await writeFile(path.join(root, ".archive", "2026-05-28", "assets", "orphan.jpg"), "old")

  const result = await archiveOrphanUploadFile({
    uploadDir: root,
    relativePath: "assets/orphan.jpg",
    archivedAt: new Date("2026-05-28T01:02:03.000Z"),
  })

  assert.equal(result.archiveRelativePath, ".archive/2026-05-28/assets/orphan-1.jpg")
  assert.equal(await readFile(path.join(root, ".archive", "2026-05-28", "assets", "orphan.jpg"), "utf8"), "old")
  assert.equal(await readFile(path.join(root, ".archive", "2026-05-28", "assets", "orphan-1.jpg"), "utf8"), "new")
})
```

- [ ] Run the targeted test and confirm it fails because the helper functions do not exist yet.

```powershell
node --test tests\storage-governance.test.ts
```

Expected result:

```text
ReferenceError or SyntaxError caused by missing archive helper exports
```

---

## Task 2: Implement Storage Archive Helpers

- [ ] Update `src/lib/storage-governance.ts`.

Add imports:

```ts
import { constants } from "node:fs"
import { access, mkdir, rename, readdir, stat } from "node:fs/promises"
import path from "node:path"
```

Keep the existing `readdir`, `stat`, and `path` imports by merging them cleanly.

Add constants and types:

```ts
const ARCHIVE_DIRECTORY_NAME = ".archive"

export type StorageArchiveResult = {
  sourceRelativePath: string
  archiveRelativePath: string
}
```

Add these helpers:

```ts
export function assertStorageRelativePath(relativePath: string): string {
  const trimmed = relativePath.trim().replaceAll("\\", "/")

  if (!trimmed) {
    throw new Error("Storage path is required")
  }

  if (path.isAbsolute(trimmed)) {
    throw new Error("Storage path must be relative")
  }

  const normalized = path.posix.normalize(trimmed)
  const segments = normalized.split("/")

  if (normalized === "." || segments.includes("..")) {
    throw new Error("Storage path cannot traverse directories")
  }

  if (normalized === ARCHIVE_DIRECTORY_NAME || normalized.startsWith(`${ARCHIVE_DIRECTORY_NAME}/`)) {
    throw new Error("Archived files cannot be archived again")
  }

  return normalized
}

export function getStoragePathVariants(relativePath: string): string[] {
  const normalized = assertStorageRelativePath(relativePath)
  const windowsStyle = normalized.replaceAll("/", "\\")

  return Array.from(new Set([normalized, windowsStyle]))
}

function formatArchiveDate(archivedAt: Date): string {
  return archivedAt.toISOString().slice(0, 10)
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function resolveArchiveCollisionPath(destinationPath: string): Promise<string> {
  if (!(await pathExists(destinationPath))) {
    return destinationPath
  }

  const parsed = path.parse(destinationPath)

  for (let index = 1; index < 1000; index += 1) {
    const candidate = path.join(parsed.dir, `${parsed.name}-${index}${parsed.ext}`)

    if (!(await pathExists(candidate))) {
      return candidate
    }
  }

  throw new Error("Unable to find an available archive path")
}

function toPosixRelative(root: string, filePath: string): string {
  return path.relative(root, filePath).split(path.sep).join("/")
}

export async function archiveOrphanUploadFile({
  uploadDir,
  relativePath,
  archivedAt = new Date(),
}: {
  uploadDir: string
  relativePath: string
  archivedAt?: Date
}): Promise<StorageArchiveResult> {
  const root = path.resolve(uploadDir)
  const sourceRelativePath = assertStorageRelativePath(relativePath)
  const sourcePath = path.resolve(root, sourceRelativePath)
  const resolvedSourceRelativePath = path.relative(root, sourcePath)

  if (resolvedSourceRelativePath.startsWith("..") || path.isAbsolute(resolvedSourceRelativePath)) {
    throw new Error("Storage path must stay inside the upload directory")
  }

  const archiveDate = formatArchiveDate(archivedAt)
  const archiveRoot = path.resolve(root, ARCHIVE_DIRECTORY_NAME, archiveDate)
  const requestedDestinationPath = path.resolve(archiveRoot, sourceRelativePath)
  const destinationPath = await resolveArchiveCollisionPath(requestedDestinationPath)

  await mkdir(path.dirname(destinationPath), { recursive: true })
  await rename(sourcePath, destinationPath)

  return {
    sourceRelativePath,
    archiveRelativePath: toPosixRelative(root, destinationPath),
  }
}
```

- [ ] Update `walkUploadDirectory` so it skips `.archive` directories.

Change the loop inside `walkUploadDirectory` so directory entries are handled like this:

```ts
for (const entry of entries) {
  if (entry.isDirectory() && entry.name === ARCHIVE_DIRECTORY_NAME) {
    continue
  }

  const fullPath = path.join(currentDir, entry.name)

  if (entry.isDirectory()) {
    await walkUploadDirectory(rootDir, fullPath, results)
    continue
  }

  if (!entry.isFile()) {
    continue
  }

  const fileStats = await stat(fullPath)
  const relativePath = path.relative(rootDir, fullPath).split(path.sep).join("/")

  results.push({
    relativePath,
    sizeBytes: fileStats.size,
    modifiedAt: fileStats.mtime,
  })
}
```

- [ ] Run the targeted test and confirm it passes.

```powershell
node --test tests\storage-governance.test.ts
```

Expected result:

```text
# pass
# fail 0
```

- [ ] Commit this task.

```powershell
git add src/lib/storage-governance.ts tests/storage-governance.test.ts
git commit -m "Add storage archive helpers"
```

---

## Task 3: Add Protected Archive API Route

- [ ] Create `tests/storage-archive-route.test.ts` as a source-level safety test.

```ts
import { readFileSync } from "node:fs"
import test from "node:test"
import assert from "node:assert/strict"

const source = readFileSync("src/app/api/admin/storage/archive-orphan/route.ts", "utf8")

test("archive orphan route requires setting edit permission", () => {
  assert.match(source, /requirePermission\(user,\s*"setting",\s*"edit"\)/)
})

test("archive orphan route rechecks active attachment references", () => {
  assert.match(source, /prisma\.attachment\.findFirst/)
  assert.match(source, /isActive:\s*true/)
  assert.match(source, /filePath:\s*\{\s*in:\s*pathVariants\s*\}/)
})

test("archive orphan route moves through storage governance helper", () => {
  assert.match(source, /archiveOrphanUploadFile/)
  assert.match(source, /getUploadDir\(\)/)
})

test("archive orphan route writes an audit log", () => {
  assert.match(source, /logAudit/)
  assert.match(source, /storage_archive_orphan_file/)
})
```

- [ ] Run the new test and confirm it fails because the route does not exist.

```powershell
node --test tests\storage-archive-route.test.ts
```

Expected result:

```text
ENOENT: no such file or directory
```

- [ ] Create `src/app/api/admin/storage/archive-orphan/route.ts`.

```ts
import { NextRequest, NextResponse } from "next/server"

import { errorResponse } from "@/lib/api-response"
import { logAudit } from "@/lib/audit-log"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import {
  archiveOrphanUploadFile,
  assertStorageRelativePath,
  getStoragePathVariants,
} from "@/lib/storage-governance"
import { getUploadDir } from "@/lib/uploads"

export const runtime = "nodejs"

type ArchiveRequestBody = {
  relativePath?: string
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "setting", "edit")

    const body = (await request.json().catch(() => ({}))) as ArchiveRequestBody
    const relativePath = assertStorageRelativePath(body.relativePath ?? "")
    const pathVariants = getStoragePathVariants(relativePath)

    const activeAttachment = await prisma.attachment.findFirst({
      where: {
        isActive: true,
        filePath: { in: pathVariants },
      },
      select: {
        id: true,
        module: true,
        referenceId: true,
      },
    })

    if (activeAttachment) {
      return NextResponse.json(
        {
          error: "File is still referenced by an active attachment",
          attachmentId: activeAttachment.id,
        },
        { status: 409 },
      )
    }

    const archived = await archiveOrphanUploadFile({
      uploadDir: getUploadDir(),
      relativePath,
    })

    await logAudit({
      userId: user.id,
      action: "storage_archive_orphan_file",
      module: "storage",
      recordId: archived.sourceRelativePath.slice(0, 100),
      oldValue: { relativePath: archived.sourceRelativePath },
      newValue: { archiveRelativePath: archived.archiveRelativePath },
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    })

    return NextResponse.json({
      success: true,
      sourceRelativePath: archived.sourceRelativePath,
      archiveRelativePath: archived.archiveRelativePath,
    })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
```

- [ ] Run the route test and storage helper test.

```powershell
node --test tests\storage-governance.test.ts tests\storage-archive-route.test.ts
```

Expected result:

```text
# pass
# fail 0
```

- [ ] Commit this task.

```powershell
git add src/app/api/admin/storage/archive-orphan/route.ts tests/storage-archive-route.test.ts
git commit -m "Add storage orphan archive API"
```

---

## Task 4: Add Archive Button UI

- [ ] Create `tests/storage-archive-ui.test.ts` as a source-level UI coverage test.

```ts
import { readFileSync } from "node:fs"
import test from "node:test"
import assert from "node:assert/strict"

const pageSource = readFileSync("src/app/[locale]/(dashboard)/admin/storage/page.tsx", "utf8")
const buttonSource = readFileSync("src/components/admin/storage-archive-button.tsx", "utf8")

test("storage page renders archive button for orphan actions", () => {
  assert.match(pageSource, /StorageArchiveButton/)
  assert.match(pageSource, /action\.action === "archive_orphan_file"/)
})

test("storage archive button posts relativePath to archive endpoint", () => {
  assert.match(buttonSource, /\/api\/admin\/storage\/archive-orphan/)
  assert.match(buttonSource, /JSON\.stringify\(\{\s*relativePath\s*\}\)/)
  assert.match(buttonSource, /router\.refresh\(\)/)
})

test("storage archive button uses explicit confirmation", () => {
  assert.match(buttonSource, /window\.confirm/)
  assert.match(buttonSource, /archiveConfirm/)
})
```

- [ ] Run the UI test and confirm it fails because the component is missing.

```powershell
node --test tests\storage-archive-ui.test.ts
```

Expected result:

```text
ENOENT: no such file or directory
```

- [ ] Create `src/components/admin/storage-archive-button.tsx`.

```tsx
"use client"

import { Archive, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

export function StorageArchiveButton({ relativePath }: { relativePath: string }) {
  const t = useTranslations("storagePage")
  const router = useRouter()
  const [isArchiving, setIsArchiving] = useState(false)

  const handleArchive = async () => {
    if (!window.confirm(t("archiveConfirm", { file: relativePath }))) {
      return
    }

    setIsArchiving(true)

    try {
      const response = await fetch("/api/admin/storage/archive-orphan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relativePath }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error ?? t("archiveFailed"))
      }

      toast.success(t("archiveSuccess"))
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("archiveFailed"))
    } finally {
      setIsArchiving(false)
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleArchive}
      disabled={isArchiving}
      title={t("archiveAction")}
    >
      {isArchiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
      <span>{t("archiveAction")}</span>
    </Button>
  )
}
```

- [ ] Update `src/app/[locale]/(dashboard)/admin/storage/page.tsx`.

Add import:

```tsx
import { StorageArchiveButton } from "@/components/admin/storage-archive-button"
```

Add a new dry-run table action header:

```tsx
<TableHead className="text-right">{t("action")}</TableHead>
```

In the existing dry-run action row rendering block, render the last cell like this:

```tsx
<TableCell className="text-right">
  {action.action === "archive_orphan_file" ? (
    <StorageArchiveButton relativePath={action.relativePath} />
  ) : (
    <span className="text-xs text-muted-foreground">{t("archiveUnavailable")}</span>
  )}
</TableCell>
```

If the empty-state row uses `colSpan={3}`, change it to:

```tsx
colSpan={4}
```

- [ ] Run the UI and helper tests.

```powershell
node --test tests\storage-governance.test.ts tests\storage-archive-route.test.ts tests\storage-archive-ui.test.ts
```

Expected result:

```text
# pass
# fail 0
```

- [ ] Commit this task.

```powershell
git add src/components/admin/storage-archive-button.tsx src/app/[locale]/(dashboard)/admin/storage/page.tsx tests/storage-archive-ui.test.ts
git commit -m "Add storage archive action UI"
```

---

## Task 5: Add Translations and Production Notes

- [ ] Update `messages/en.json` under `storagePage`.

Add keys:

```json
"action": "Action",
"archiveAction": "Archive",
"archiveConfirm": "Move {file} to .archive? This does not delete the file.",
"archiveSuccess": "File moved to archive.",
"archiveFailed": "Archive failed.",
"archiveUnavailable": "Review only"
```

- [ ] Update `messages/th.json` under `storagePage`.

Add keys:

```json
"action": "การทำงาน",
"archiveAction": "Archive",
"archiveConfirm": "ย้าย {file} ไป .archive ใช่ไหม? ระบบจะยังไม่ลบไฟล์",
"archiveSuccess": "ย้ายไฟล์เข้า archive แล้ว",
"archiveFailed": "Archive ไม่สำเร็จ",
"archiveUnavailable": "ตรวจสอบเท่านั้น"
```

- [ ] Update `docs/08_PRODUCTION_READINESS.md` with a short Storage Governance note.

Add this under the upload or operations section:

```md
### Storage Governance Archive

The Admin Storage Governance page can archive orphan files one at a time. Archive moves the file from `UPLOAD_DIR/<relativePath>` to `UPLOAD_DIR/.archive/YYYY-MM-DD/<relativePath>` and does not delete it. The API re-checks that no active `Attachment` row references the file before moving it, and writes a `storage_archive_orphan_file` audit log entry with the source and archive paths.

To restore a file, move it from `.archive/YYYY-MM-DD/<relativePath>` back to `UPLOAD_DIR/<relativePath>`, then refresh the Storage Governance page.
```

- [ ] Run JSON validation through the normal test/build flow in the final verification task.

- [ ] Commit this task.

```powershell
git add messages/en.json messages/th.json docs/08_PRODUCTION_READINESS.md
git commit -m "Document storage archive workflow"
```

---

## Task 6: Full Verification

- [ ] Run the focused tests.

```powershell
node --test tests\storage-governance.test.ts tests\storage-archive-route.test.ts tests\storage-archive-ui.test.ts
```

Expected result:

```text
# pass
# fail 0
```

- [ ] Run the full project verification.

```powershell
npm run verify
```

Expected result:

```text
lint passes
all tests pass
production build succeeds
```

- [ ] Start or reuse the local dev server and inspect `/th/admin/storage` in the browser.

Expected browser checks:

- The Storage Governance page loads for a user with `setting:view`.
- Orphan dry-run rows show an Archive button.
- Missing DB file rows show "ตรวจสอบเท่านั้น".
- Clicking Archive shows a confirmation with the file path.
- After confirming a true orphan file, the toast reports success and the row disappears after refresh.
- Active attachment files cannot be archived; the API returns `409`.

- [ ] Check git status.

```powershell
git status --short --branch
```

Expected result after committing all tasks:

```text
## master
```

or a clean branch ahead of master if implementation is done on a feature branch.

---

## Operational Notes

- Archive is reversible because the file remains under `UPLOAD_DIR/.archive/YYYY-MM-DD/`.
- `.archive` must stay excluded from `scanUploadDirectory`; otherwise archived files would reappear as orphan candidates.
- The API must use `setting:edit`; viewing the page can remain `setting:view`.
- The route must re-check `Attachment.isActive = true` at click time. The dry-run table is advisory and can be stale.
- Do not add a bulk archive button until single-file audit and restore behavior has been used safely in production.
