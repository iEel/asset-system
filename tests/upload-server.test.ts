import assert from "node:assert/strict"
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import * as nodeModule from "node:module"
import { tmpdir } from "node:os"
import path from "node:path"
import { after, test } from "node:test"
import { pathToFileURL } from "node:url"

// A refused or rolled-back save removes the files it wrote (group 3 follow-up C): the helpers delete inside the upload
// root only, ignore a file already gone and never throw.
const registerHooks = (nodeModule as unknown as {
  registerHooks(options: {
    resolve(specifier: string, context: unknown, nextResolve: (specifier: string, context: unknown) => unknown): unknown
  }): void
}).registerHooks

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})

const uploadRoot = mkdtempSync(path.join(tmpdir(), "asset-upload-root-"))
const outsideRoot = mkdtempSync(path.join(tmpdir(), "asset-upload-outside-"))
process.env.UPLOAD_DIR = uploadRoot
after(() => {
  rmSync(uploadRoot, { recursive: true, force: true })
  rmSync(outsideRoot, { recursive: true, force: true })
})

const { createUploadCleanup, discardUploadedFiles } = await import(pathToFileURL("src/lib/upload-server.ts").href) as typeof import("../src/lib/upload-server.ts")

function writeUpload(directory: string, name: string) {
  const folder = path.join(directory, "operations", "checkout")
  mkdirSync(folder, { recursive: true })
  const filePath = path.join(folder, name)
  writeFileSync(filePath, "evidence")
  return filePath
}

async function quietly<T>(run: () => Promise<T>) {
  const warnings: unknown[][] = []
  const original = console.warn
  console.warn = (...args: unknown[]) => { warnings.push(args) }
  try {
    return { result: await run(), warnings }
  } finally {
    console.warn = original
  }
}

test("discardUploadedFiles deletes a file inside the upload root and ignores one already gone", async () => {
  const saved = writeUpload(uploadRoot, "saved.png")
  const missing = path.join(uploadRoot, "operations", "checkout", "missing.png")

  const { warnings } = await quietly(() => discardUploadedFiles([saved, missing]))

  assert.equal(existsSync(saved), false)
  assert.deepEqual(warnings, [], "a missing file is not worth a warning")
})

test("discardUploadedFiles refuses a path outside the upload root, keeps that file, and never throws", async () => {
  const outside = writeUpload(outsideRoot, "outside.png")
  const inside = writeUpload(uploadRoot, "inside.png")

  const { warnings } = await quietly(() => discardUploadedFiles([outside, inside]))

  assert.equal(existsSync(outside), true, "a file outside the upload root is never deleted")
  assert.equal(existsSync(inside), false, "a refused path does not stop the next one")
  assert.equal(warnings.length, 1)
  assert.match(String(warnings[0].join(" ")), /outside\.png/)
  assert.doesNotMatch(String(warnings[0].join(" ")), new RegExp(outsideRoot.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")), "only the path's last segment is logged")
})

test("createUploadCleanup discards the tracked files only while the save is uncommitted", async () => {
  const refused = writeUpload(uploadRoot, "refused.png")
  const rolledBack = createUploadCleanup()
  rolledBack.track(refused)
  await rolledBack.discardIfUncommitted()
  assert.equal(existsSync(refused), false)

  const kept = writeUpload(uploadRoot, "kept.png")
  const committed = createUploadCleanup()
  committed.track(kept)
  committed.commit()
  await committed.discardIfUncommitted()
  assert.equal(existsSync(kept), true, "a committed save keeps its file")

  const untouched = createUploadCleanup()
  await assert.doesNotReject(() => untouched.discardIfUncommitted())
})
