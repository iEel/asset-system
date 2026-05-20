import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

test("package exposes standard test and verification scripts", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> }

  assert.equal(packageJson.scripts.test, "node scripts/run-tests.mjs")
  assert.equal(packageJson.scripts.verify, "node scripts/verify.mjs")
  assert.equal(packageJson.scripts["notifications:digest"], "node scripts/send-notification-digest.mjs")
  assert.equal(packageJson.scripts["pm:generate-due:scheduled"], "node scripts/generate-due-pm.mjs --scheduled")
  assert.equal(packageJson.scripts["ldap:sync:scheduled"], "node scripts/ldap-sync.mjs --scheduled")
  assert.equal(packageJson.scripts["scheduler:heartbeat"], "node scripts/run-scheduled-jobs.mjs")
  assert.equal(existsSync("scripts/run-tests.mjs"), true)
  assert.equal(existsSync("scripts/verify.mjs"), true)
  assert.equal(existsSync("scripts/send-notification-digest.mjs"), true)
  assert.equal(existsSync("scripts/run-scheduled-jobs.mjs"), true)
})
