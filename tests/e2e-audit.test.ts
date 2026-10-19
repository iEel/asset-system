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
