import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The E2E suite's field audit walk and review (spec docs/superpowers/specs/2026-10-19-e2e-workflow-suite-design.md
// §6.2; the audit tasks EA1–EA5). One test per task, appended in order. The walk itself runs with `npm run test:e2e`
// against a running app; these pin what can be checked without one. The working tree is CRLF on Windows: every read
// strips \r.
const read = (file: string) => readFileSync(file, "utf8").replace(/\r/g, "")
const SPEC = "e2e/audit/field-audit.spec.ts"
// The Thai words of one namespace of messages/th.json, so the walk's words are the app's own.
const thai = (namespace: string) => JSON.parse(read("messages/th.json"))[namespace] as Record<string, string>

// The text of one block of the spec: from its describe line to the next top-level describe (or the end).
function block(source: string, title: string): string {
  const start = source.indexOf(`test.describe("${title}"`)
  assert.ok(start >= 0, `the block "${title}"`)
  const next = source.indexOf("\ntest.describe(", start + 1)
  return source.slice(start, next < 0 ? undefined : next)
}

test("the walk's records carry the run id and the project within the schemas' limits; IT staff open the round on the form after its errors under the fields (e2e audit task 1, EA1)", async () => {
  const { auditRecords, projectCode } = await import("../e2e/audit/audit-plan.ts")
  const { E2E_PROJECTS } = await import("../e2e/support/matrix.ts")
  // The longest run id the guard makes (after Z: T and the time).
  const runId = "E2E-1019T2359"
  assert.deepEqual(E2E_PROJECTS.map((project) => projectCode(project.name)), ["DL", "DD", "PL", "PD"])
  const tags = new Set<string>()
  for (const project of E2E_PROJECTS) {
    const records = auditRecords(runId, project.name)
    const prefix = `${runId}-${records.code}`
    // src/lib/validations/department.ts code max 20, location.ts code max 50, the asset tag column 50.
    assert.ok(records.department.code.startsWith(prefix) && records.department.code.length <= 20, records.department.code)
    for (const room of Object.values(records.rooms)) assert.ok(room.code.startsWith(prefix) && room.code.length <= 50 && room.name.startsWith(runId), room.code)
    for (const asset of records.assets) {
      assert.ok(asset.tag.startsWith(`${prefix}-`) && asset.tag.length <= 50, asset.tag)
      assert.ok(asset.name.startsWith(`${runId} ${records.code} `), asset.name)
      assert.ok(!tags.has(asset.tag), `${asset.tag} is the project's own`)
      tags.add(asset.tag)
    }
    // Room A: matched, mismatch, the parent and its two components; room B: not found and offline; the outsider is the
    // run's department in room A.
    const where = Object.fromEntries(records.assets.map((asset) => [asset.key, `${asset.room}/${asset.department}`]))
    assert.deepEqual(where, {
      matched: "roomA/round",
      mismatch: "roomA/round",
      parent: "roomA/round",
      component1: "roomA/round",
      component2: "roomA/round",
      notFound: "roomB/round",
      offline: "roomB/round",
      outOfScope: "roomA/run",
    })
    assert.deepEqual(records.components.map((component) => component.key), ["component1", "component2"])
    assert.ok(records.round.name.startsWith(runId) && records.ownRound.name.startsWith(runId) && records.unknownTag.startsWith(prefix))
  }
  assert.throws(() => projectCode("setup"), /no short code/)

  // Created through the app: the places as the seed admin, the assets and the component install as the person.
  const data = read("e2e/audit/audit-data.ts")
  for (const route of [`"/api/departments"`, `"/api/locations"`, `"/api/assets"`, "/components`"]) assert.ok(data.includes(route), route)
  assert.ok(!/prisma|mssql/i.test(data.replace(/^\/\/.*$/gm, "")), "no direct database access")

  // The spec: WebKit on the phone, one serial chain, IT staff open the round on the form; the errors under the fields.
  const spec = read(SPEC)
  assert.ok(!spec.includes(`from "@playwright/test"`), "the suite's own test")
  assert.ok(spec.split("\n").includes("runPhoneOnWebKit()"))
  assert.ok(spec.split("\n").includes(`test.describe.configure({ mode: "serial" })`))
  const open = block(spec, "IT staff open the round")
  assert.ok(open.includes(`asUser("itStaff")`))
  assert.ok(open.includes(`await measure.visit("/th/audit/rounds/new", "round form")`))
  assert.ok(open.includes(`toHaveText("${JSON.parse(read("messages/th.json")).common.validation.required}")`), "the required error under the name")
  assert.ok(open.includes(`toHaveText("${JSON.parse(read("messages/th.json")).common.validation.endBeforeStart}")`), "the date pair error under the end date")
  assert.ok(open.includes(thai("auditRound").createTitle) && open.includes(thai("auditRound").statusOpen))
})

test("IT staff walk room A by typing on the phone, on a slow network: matched, mismatch with its photo, a parent with components, unknown and out of scope (e2e audit task 2, EA2)", async () => {
  const steps = await import("../e2e/audit/scan-steps.ts")
  // Spec §8: slow 4G on the phone's walk (latency, every request), and the keyboard-open height.
  assert.equal(steps.SLOW_4G_ROUND_TRIP_MS, 150)
  // The pages, RSC payloads and assets are slowed; the app's API calls are not (WebKit cannot resend an intercepted body).
  const slowed = (url: string) => steps.isSlowedOnThePhone(new URL(url, "http://localhost:3100"))
  assert.deepEqual(["/th/audit/rounds/r1/scan", "/th/audit/rounds/r1?_rsc=a", "/_next/static/chunks/a.js", "/api/audit-rounds/r1/scan", "/api/assets/a1/attachments"].map(slowed), [true, true, true, false, false])
  assert.deepEqual(steps.KEYBOARD_OPEN_VIEWPORT, { width: 390, height: 360 })
  assert.equal(steps.escapeRegExp("E2E-1019A-DL-A1 (x)"), "E2E-1019A-DL-A1 \\(x\\)")
  assert.ok(steps.tagPattern("E2E-1019A-DL-A1").test("ดู E2E-1019A-DL-A1 จอภาพ"))

  // The words the walk types and reads are the app's own (messages/th.json auditScan).
  const words = thai("auditScan")
  const helper = read("e2e/audit/scan-steps.ts")
  for (const key of ["searchItemsLabel", "roomSheetTitle"]) assert.ok(helper.includes(`"${words[key]}"`), key)
  const walk = block(read(SPEC), "IT staff walk room A")
  for (const key of ["saveAllMatch", "photoRequiredCondition", "addNotePhoto", "componentMarkMissing", "componentMissingConfirm", "searchRegister", "recordOutOfScope", "saveOutOfScope"]) {
    assert.ok(walk.includes(words[key]), key)
  }
  assert.ok(walk.includes(`asUser("itStaff")`))
  assert.ok(walk.includes(`if (e2eDevice === "phone") await scan.slowNetwork(page)`), "slow 4G on the phone only")
  // Found by typing: the tag for most, a word of the name for the mismatch.
  assert.ok(walk.includes("scan.findAndOpen(page, assets.matched.tag, assets.matched.tag)"))
  assert.ok(walk.includes(`scan.findAndOpen(page, "เครื่องพิมพ์", assets.mismatch.tag)`))
  // The mismatch: another department and the condition, with the photo; the parent asks while a component is unchecked.
  assert.ok(walk.includes(`"บันทึก · ไม่ตรง 2 ข้อ (แผนก, สภาพ)"`))
  assert.ok(walk.includes(`scan.addPhoto(page, fromRoot("e2e/fixtures/photo.png"))`))
  assert.ok(walk.includes(`page.getByRole("alertdialog", { name: "ส่วนควบยังตรวจไม่ครบ 1 ชิ้น" })`))
  assert.ok(walk.includes(`expect(parentScans, "cancelling the question sends nothing").toEqual([])`))
  // The keyboard-open height on the phone, then back.
  assert.ok(walk.includes("await page.setViewportSize(scan.KEYBOARD_OPEN_VIEWPORT)") && walk.includes("await page.setViewportSize(PHONE.viewport)"))
})
