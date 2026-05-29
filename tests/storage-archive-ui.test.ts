import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const pageSource = () => readFileSync("src/app/[locale]/(dashboard)/admin/storage/page.tsx", "utf8")
const buttonSource = () => readFileSync("src/components/admin/storage-archive-button.tsx", "utf8")
const storageMessages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).storagePage

test("storage page uses the archive button only for orphan file actions", () => {
  const source = pageSource()

  assert.match(source, /import \{ hasPermission \} from "@\/lib\/auth-utils"/)
  assert.match(source, /import \{ StorageArchiveButton \} from "@\/components\/admin\/storage-archive-button"/)
  assert.match(source, /const user = await requirePagePermission\(locale, "setting", "view"\)/)
  assert.match(source, /const canArchiveStorageFiles = hasPermission\(user, "setting", "edit"\)/)
  assert.match(source, /<th[^>]*>\{t\("action"\)\}<\/th>/)
  assert.ok(source.includes("<StorageArchiveButton relativePath={action.relativePath} />"))

  const buttonIndex = source.indexOf("<StorageArchiveButton relativePath={action.relativePath} />")
  const archiveConditionIndex = source.lastIndexOf('action.action === "archive_orphan_file"', buttonIndex)
  const permissionConditionIndex = source.lastIndexOf("canArchiveStorageFiles", buttonIndex)
  const unavailableIndex = source.indexOf('t("archiveUnavailable")', buttonIndex)

  assert.ok(archiveConditionIndex >= 0)
  assert.ok(permissionConditionIndex >= 0)
  assert.ok(permissionConditionIndex > archiveConditionIndex)
  assert.ok(unavailableIndex > buttonIndex)
  assert.equal(source.match(/<StorageArchiveButton/g)?.length, 1)
})

test("storage page messages include every key used by the page and archive button", () => {
  const usedKeys = new Set([...collectStorageMessageKeys(pageSource()), ...collectStorageMessageKeys(buttonSource())])

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
  assert.match(source, /window\.confirm\(t\("archiveConfirm", \{ file: relativePath \}\)\)/)
  assert.ok(source.includes('fetch("/api/admin/storage/archive-orphan"'))
  assert.match(source, /method: "POST"/)
  assert.match(source, /body: JSON\.stringify\(\{ relativePath \}\)/)
  assert.match(source, /payload\?\.error/)
  assert.match(source, /toast\.success\(t\("archiveSuccess"\)\)/)
  assert.match(source, /toast\.error\([^)]*t\("archiveFailed"\)/)
  assert.match(source, /router\.refresh\(\)/)
})

function collectStorageMessageKeys(source: string) {
  return Array.from(source.matchAll(/\bt\("([^"]+)"/g), (match) => match[1])
}
