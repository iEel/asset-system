import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const th = JSON.parse(readFileSync("messages/th.json", "utf8"))

test("production readiness and approval inbox labels are Thai on the Thai page", () => {
  for (const value of [
    th.productionReadinessPage.check_uploadDir_title,
    th.productionReadinessPage.check_uploadScanner_title,
    th.approvalInboxPage.permissionKey,
  ]) {
    assert.match(value, /[฀-๿]/)
    assert.doesNotMatch(value, /Upload|Permission/)
  }
})
