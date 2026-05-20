import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

test("package exposes standard test and verification scripts", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> }

  assert.equal(packageJson.scripts.test, "node scripts/run-tests.mjs")
  assert.equal(packageJson.scripts.verify, "node scripts/verify.mjs")
  assert.equal(packageJson.scripts["notifications:digest"], "node scripts/send-notification-digest.mjs")
  assert.equal(existsSync("scripts/run-tests.mjs"), true)
  assert.equal(existsSync("scripts/verify.mjs"), true)
  assert.equal(existsSync("scripts/send-notification-digest.mjs"), true)
})
