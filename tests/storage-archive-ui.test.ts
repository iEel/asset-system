import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const pageSource = () => readFileSync("src/app/[locale]/(dashboard)/admin/storage/page.tsx", "utf8")
const buttonSource = () => readFileSync("src/components/admin/storage-archive-button.tsx", "utf8")
const rowSource = () => readFileSync("src/components/admin/storage/storage-row.tsx", "utf8").replace(/\r\n/g, "\n")
const storageMessages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).storagePage

// Group 12 plan 3 Task 4 (board AD-Storage): the rows moved to the client StorageRow, which takes the gate from the page
// as canArchive. The orphan-only, setting:edit-only rule is the same; only where it is written changed.
test("storage page uses the archive button only for orphan file actions", () => {
  const source = pageSource()
  const row = rowSource()

  assert.match(source, /import \{ hasPermission \} from "@\/lib\/auth-utils"/)
  assert.match(source, /import \{ StorageRow, storageRowGridClasses, type StorageRowView \} from "@\/components\/admin\/storage\/storage-row"/)
  assert.match(row, /import \{ StorageArchiveButton \} from "@\/components\/admin\/storage-archive-button"/)
  assert.match(source, /const user = await requirePagePermission\(locale, "setting", "view"\)/)
  assert.match(source, /const canArchiveStorageFiles = hasPermission\(user, "setting", "edit"\)/)
  assert.match(source, /<StorageRow key=\{row\.key\} row=\{row\} canArchive=\{canArchiveStorageFiles\} \/>/)
  assert.match(source, /<span className="text-right">\{t\("action"\)\}<\/span>/)
  assert.ok(row.includes("<StorageArchiveButton relativePath={row.path} />"))

  const buttonIndex = row.indexOf("<StorageArchiveButton relativePath={row.path} />")
  const archiveConditionIndex = row.lastIndexOf('row.kind === "orphan"', buttonIndex)
  const permissionConditionIndex = row.lastIndexOf("canArchive", buttonIndex)
  const unavailableIndex = row.indexOf('t("archiveUnavailable")', buttonIndex)

  assert.ok(archiveConditionIndex >= 0)
  assert.ok(permissionConditionIndex >= 0)
  assert.ok(permissionConditionIndex > archiveConditionIndex)
  assert.ok(unavailableIndex > buttonIndex)
  assert.equal(row.match(/<StorageArchiveButton/g)?.length, 1)
  assert.doesNotMatch(source, /<StorageArchiveButton/)
})

test("storage page messages include every key used by the page and archive button", () => {
  const usedKeys = new Set([...collectStorageMessageKeys(pageSource()), ...collectStorageMessageKeys(buttonSource()), ...collectStorageMessageKeys(rowSource())])

  for (const locale of ["th", "en"] as const) {
    const messages = storageMessages(locale)
    const missingKeys = Array.from(usedKeys).filter((key) => !(key in messages))
    assert.deepEqual(missingKeys, [], `${locale} storagePage is missing messages`)
  }
})

test("storage page passes the resolved upload root through dry-run scanning", () => {
  const source = pageSource()

  assert.match(source, /import \{ getUploadRoot \} from "@\/lib\/uploads"/)
  assert.match(source, /const uploadRoot = getUploadRoot\(\)/)
  assert.match(source, /scanUploadDirectory\(uploadRoot\)/)
  assert.match(source, /buildStorageGovernanceDryRun\(\{\s*attachments,\s*files: filesystemFiles,\s*uploadRoot,\s*\}\)/)
})

test("storage archive button confirms, posts archive request, and refreshes", () => {
  const source = buttonSource()

  assert.match(source, /^"use client"/)
  assert.match(source, /useTranslations\("storagePage"\)/)
  assert.match(source, /useRouter\(\)/)
  assert.match(source, /useState\(false\)/)
  assert.match(source, /await confirm\(\{\s*title: t\("archiveConfirm"/)
  assert.ok(source.includes('fetch("/api/admin/storage/archive-orphan"'))
  assert.match(source, /method: "POST"/)
  assert.match(source, /body: JSON\.stringify\(\{ relativePath \}\)/)
  assert.match(source, /payload\?\.error/)
  assert.match(source, /toast\.success\(t\("archiveSuccess"\)\)/)
  assert.match(source, /apiError\.toast\([^)]*t\("archiveFailed"\)/)
  assert.match(source, /router\.refresh\(\)/)
})

function collectStorageMessageKeys(source: string) {
  return Array.from(source.matchAll(/\bt\("([^"]+)"/g), (match) => match[1])
}
