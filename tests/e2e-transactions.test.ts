import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The E2E suite's asset transaction area (spec docs/superpowers/specs/2026-10-19-e2e-workflow-suite-design.md §6.1):
// the pure plan and the known findings are loaded; the specs, which run under Playwright, are read as text.
const read = (file: string) => readFileSync(file, "utf8").replace(/\r/g, "")

// Every transaction spec runs as IT staff, takes test from the suite's fixtures (measured, themed, signed in) and never
// from @playwright/test.
function readTxSpec(file: string): string {
  const source = read(file)
  assert.ok(source.split("\n").includes(`asUser("itStaff")`), `${file}: as IT staff`)
  assert.match(source, /from "\.\.\/support\/fixtures\.ts"/, `${file}: the suite's test`)
  assert.doesNotMatch(source, /from "@playwright\/test"/, `${file}: not Playwright's own test`)
  return source
}

// The expected-to-fail tests of a file, by the finding each names.
function expectedFailures(source: string): string[] {
  return [...source.matchAll(/test\.fail\(true, "(TX-A\d+): /g)].map((match) => match[1])
}

test("an asset registered on the form with a photo and a purchase document, a wrong entry first; the area's records carry the run and the project (e2e transactions task 1, TX1)", async () => {
  const plan = await import("../e2e/transactions/tx-plan.ts")
  const { E2E_PROJECTS } = await import("../e2e/support/matrix.ts")
  // One code per project of the foundation's matrix, so the four projects never share an asset.
  assert.deepEqual(Object.keys(plan.PROJECT_CODES), E2E_PROJECTS.map((project) => project.name))
  assert.equal(new Set(Object.values(plan.PROJECT_CODES)).size, 4)
  assert.equal(plan.txAssetTag("E2E-1019T2329", "phone-dark", "REG"), "E2E-1019T2329-PD-REG")
  assert.equal(plan.txAssetName("E2E-1019A", "desktop-light", "โน้ตบุ๊ก"), "E2E-1019A DL โน้ตบุ๊ก")
  assert.ok(plan.txAssetTag("E2E-1019T2329", "desktop-light", "BM3").length <= 50)
  assert.throws(() => plan.txAssetTag("E2E-1019A", "setup", "X"), /four device × theme projects/)
  assert.deepEqual(plan.secondLocation("E2E-1019A"), { code: "E2E-1019A-L2", name: "E2E-1019A ห้องปลายทาง E2E", locationType: "Room" })
  // Asia/Bangkok is UTC+7: 17:30 UTC is already the next day there.
  assert.equal(plan.bangkokDate(0, new Date("2026-10-19T17:30:00Z")), "2026-10-20")
  assert.equal(plan.bangkokDate(-1, new Date("2026-10-19T10:00:00Z")), "2026-10-18")
  assert.equal(plan.bangkokDate(7, new Date("2026-10-19T10:00:00Z")), "2026-10-26")
  assert.deepEqual(plan.PHONE_KEYBOARD_OPEN, { width: 390, height: 360 })

  // A known finding drops only its own rule on its own element, keeps axe's counts, and says so on the test.
  const known = await import("../e2e/transactions/known-findings.ts")
  const violation = (target: string) => ({ id: "svg-img-alt", impact: "serious", help: "", targets: [target] })
  const record = {
    label: "asset page",
    url: "/th/assets/1",
    loadMs: 1,
    domContentLoadedMs: 1,
    axe: { serious: 2, critical: 0, moderate: 0, minor: 0, failing: [violation(`svg[height="160"]`), violation("svg.chart")] },
  }
  const annotations: { type: string; description?: string }[] = []
  known.dropKnownAxe(record, known.KNOWN_AXE, { annotations } as never)
  assert.deepEqual(record.axe.failing.map((item) => item.targets[0]), ["svg.chart"])
  assert.equal(record.axe.serious, 2, "axe's counts stay in the summary")
  assert.match(annotations[0]?.description ?? "", /^TX-A2: /)
  // Every known finding has its expected-to-fail test.
  const findings = readTxSpec("e2e/transactions/findings.spec.ts")
  for (const entry of known.KNOWN_AXE) assert.ok(expectedFailures(findings).includes(entry.finding), entry.finding)

  // The register's thumbnails (the shared allow-list, ruling TX-R9): a 500 or a cancelled image of
  // /api/attachments/<id>/thumbnail passes; the same answer of the attachment itself does not.
  const core = await import("../e2e/support/measure-core.ts")
  const { ALLOW_LIST } = await import("../e2e/support/allow-list.ts")
  const register = "http://localhost:3100/th/assets"
  const attachment = "http://localhost:3100/api/attachments/23f49e63-83eb-44fb-ba55-4f77bef5b552"
  const classified = core.classify(
    {
      console: [],
      responses: [
        { method: "GET", url: `${attachment}/thumbnail`, status: 500, resourceType: "image", pageUrl: register },
        { method: "GET", url: attachment, status: 500, resourceType: "image", pageUrl: register },
      ],
      failures: [{ method: "GET", url: `${attachment}/thumbnail`, errorText: "net::ERR_ABORTED", resourceType: "image", pageUrl: register }],
    },
    ALLOW_LIST,
    [],
  )
  assert.deepEqual(classified.allowed.map((item) => item.id), ["foreign-attachment-thumbnail", "thumbnail-cancelled-on-leave"])
  assert.deepEqual(classified.unexpectedResponses.map((response) => response.url), [attachment])

  // The register spec: the wrong entry first (no room), the photo and the PDF, the save bar with the keyboard open.
  const spec = readTxSpec("e2e/transactions/register-asset.spec.ts")
  assert.match(spec, /await expectFieldError\(page, "asset-current-location", "กรุณาระบุข้อมูลนี้"\)/)
  assert.match(spec, /expect\(posted, "the wrong entry posts nothing"\)\.toBe\(0\)/)
  assert.match(spec, /setInputFiles\(PDF_FIXTURE\)/)
  assert.match(spec, /setInputFiles\(PHOTO_FIXTURE\)/)
  assert.match(spec, /if \(e2eDevice === "phone"\) await openPhoneKeyboard\(page\)/)
  assert.match(spec, /await expectReachable\(save\)/)
  // Every measured page of the area goes through the settle and the known list, never the bare Measure calls.
  const support = read("e2e/transactions/tx-support.ts")
  assert.match(support, /return dropKnownAxe\(await measure\.recordPage\(label\), KNOWN_AXE, testInfo\)/)
  assert.doesNotMatch(spec, /measure\.(visit|recordPage)\(/)
})
