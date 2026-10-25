// The records the cross-cutting workflows stand on (spec §6.5–§6.7): E2E assets that IT staff register through the
// app's own asset API with their session, in the run's company, branch, department and room, and a handover to an E2E
// employee through the checkout API. The asset form's own choices (category, status, condition) are read from the form
// IT staff open, so no lookup needs a permission they do not have. Every tag and name carries the run id and the
// project, so the four projects never share a record (spec §11 "Run order").
import type { APIRequestContext, Browser, Page, TestInfo } from "@playwright/test"
import { expect } from "../../support/fixtures.ts"
import type { Measure } from "../../support/measure.ts"
import { authStateFile, fromRoot } from "../../support/paths.ts"
import { readRunData, readRunState, type RunData } from "../../support/state.ts"

export type AssetChoices = { categoryId: string; readyStatusId: string; draftStatusId: string; goodConditionId: string }

export type E2eAsset = { id: string; assetTag: string; name: string }

export type AssetSpec = {
  // The tag's last part, unique in the test: RPT1, OWN, ...
  slug: string
  name: string
  ownershipType?: "personal" | "shared" | "stock"
  purchasePrice?: number
  // Ready unless the test needs a Draft asset (the audit round's scope, field-errors.spec.ts).
  status?: "ready" | "draft"
}

// The run's marker for this project: E2E-1019N-desktop-light. Every tag and name of a test starts with it.
export function projectMarker(testInfo: TestInfo): string {
  return `${readRunState().runId}-${testInfo.project.name}`
}

// The asset form's choices: its "Monitor" category (else its first), and the Ready and Draft statuses and the Good
// condition by their Thai labels (the dev data's nameTh). With a measure, the visit is measured like any page of the
// test.
export async function readAssetChoices(page: Page, measure?: Measure): Promise<AssetChoices> {
  if (measure) await measure.visit("/th/assets/new", "asset form (its choices)")
  else await page.goto("/th/assets/new")
  // The dashboard's loading.tsx streams the form, so its selects may still be empty here (13B loop 5): wait for the
  // options this helper needs before reading them.
  await expect(page.locator('#asset-category option:not([value=""])').first()).toBeAttached()
  await expect(page.locator("#asset-status option", { hasText: /^พร้อมใช้งาน$/ })).toHaveCount(1)
  await expect(page.locator("#asset-status option", { hasText: /^ร่าง$/ })).toHaveCount(1)
  await expect(page.locator("#asset-condition option", { hasText: /^ดี$/ })).toHaveCount(1)
  const options = async (id: string) =>
    page.locator(`#${id} option`).evaluateAll((nodes) => nodes.map((node) => ({ value: (node as HTMLOptionElement).value, label: (node.textContent ?? "").trim() })))
  const categories = (await options("asset-category")).filter((option) => option.value)
  const statuses = await options("asset-status")
  const conditions = await options("asset-condition")
  const category = categories.find((option) => option.label.startsWith("Monitor ")) ?? categories[0]
  const ready = statuses.find((option) => option.label === "พร้อมใช้งาน")
  const draft = statuses.find((option) => option.label === "ร่าง")
  const good = conditions.find((option) => option.label === "ดี")
  if (!category || !ready || !draft || !good) throw new Error("the asset form has no category, no Ready or Draft status, or no Good condition")
  return { categoryId: category.value, readyStatusId: ready.value, draftStatusId: draft.value, goodConditionId: good.value }
}

async function created<T>(request: APIRequestContext, url: string, data: unknown): Promise<T> {
  const response = await request.post(url, { data })
  if (response.status() !== 201 && response.status() !== 200) {
    throw new Error(`POST ${url} answered ${response.status()}: ${(await response.text()).slice(0, 300)}`)
  }
  return (await response.json()) as T
}

// One E2E asset, Ready (or Draft), in the run's room and department (a shared or stock asset needs the department).
export async function createAsset(request: APIRequestContext, testInfo: TestInfo, choices: AssetChoices, spec: AssetSpec, run: RunData = readRunData()): Promise<E2eAsset> {
  const assetTag = `${projectMarker(testInfo)}-${spec.slug}`
  const name = `${projectMarker(testInfo)} ${spec.name}`
  const asset = await created<{ id: string; assetTag: string; name: string }>(request, "/api/assets", {
    assetTag,
    name,
    categoryId: choices.categoryId,
    companyId: run.companyId,
    branchId: run.branchId,
    ownershipType: spec.ownershipType ?? "shared",
    departmentId: run.departmentId,
    homeLocationId: run.locationId,
    currentLocationId: run.locationId,
    statusId: spec.status === "draft" ? choices.draftStatusId : choices.readyStatusId,
    conditionId: choices.goodConditionId,
    purchaseDate: "2026-01-15",
    purchasePrice: spec.purchasePrice ?? 12500,
    // The schema's preprocessed optional fields take a missing value only when the key is there (the form sends
    // every key; foundation note N3).
    licenseTotalSeats: null,
    licenseUsedSeats: null,
    warrantyStartDate: null,
    warrantyEndDate: null,
    remark: `${readRunState().runId} cross-cutting`,
    isActive: true,
  })
  if (asset.assetTag !== assetTag) throw new Error(`the asset was saved with the tag ${asset.assetTag}, not ${assetTag}`)
  return { id: asset.id, assetTag: asset.assetTag, name: asset.name }
}

// A permanent handover to an employee through the checkout API: the asset becomes In Use with that custodian. It
// returns the handover (its id is the return form's checkoutId).
export async function handOver(request: APIRequestContext, asset: E2eAsset, custodianId: string, choices: AssetChoices): Promise<{ id: string }> {
  return created<{ id: string }>(request, `/api/assets/${asset.id}/checkout`, {
    handoverMode: "permanent_assignment",
    checkoutType: "user",
    custodianId,
    checkoutDate: new Date().toISOString(),
    expectedReturnDate: null,
    conditionBefore: choices.goodConditionId,
    remark: `${readRunState().runId} handover`,
  })
}

// The return of a handover through the checkin API, back to Ready in the run's room; it returns the return (its id is
// the RT- document's).
export async function returnAsset(request: APIRequestContext, asset: E2eAsset, checkoutId: string, choices: AssetChoices, run: RunData = readRunData()): Promise<{ id: string }> {
  return created<{ id: string }>(request, `/api/assets/${asset.id}/checkin`, {
    checkoutId,
    returnDate: new Date().toISOString(),
    returnBy: run.employees.receiver1.fullNameTh,
    returnByEmployeeId: run.employees.receiver1.id,
    receiveBy: run.employees.itStaff.fullNameTh,
    receiveByEmployeeId: run.employees.itStaff.id,
    conditionAfter: choices.goodConditionId,
    nextStatusId: choices.readyStatusId,
    nextLocationId: run.locationId,
    remark: `${readRunState().runId} return`,
  })
}

// The asset as the API reads it back (GET /api/assets/<id>): its status, custodian and room after a step.
export async function readAsset(request: APIRequestContext, assetId: string) {
  const response = await request.get(`/api/assets/${assetId}`)
  if (!response.ok()) throw new Error(`GET /api/assets/${assetId} answered ${response.status()}`)
  return (await response.json()) as { id: string; assetTag: string; custodianId: string | null; currentLocationId: string; status: { name: string; nameTh: string } }
}

export type ItStaffDesk ={ assets: E2eAsset[]; choices: AssetChoices; request: APIRequestContext; close: () => Promise<void> }

// IT staff register the assets another person's test looks at, in a browser context of their own (the asset form for
// its choices, then the asset API): the test's own page stays that person's. The caller closes it.
export async function registerAssetsAsItStaff(browser: Browser, testInfo: TestInfo, specs: readonly AssetSpec[]): Promise<ItStaffDesk> {
  const { baseURL, runId } = readRunState()
  const context = await browser.newContext({ baseURL, locale: "th-TH", timezoneId: "Asia/Bangkok", storageState: fromRoot(authStateFile(runId, "itStaff")) })
  const page = await context.newPage()
  const choices = await readAssetChoices(page)
  const assets: E2eAsset[] = []
  for (const spec of specs) assets.push(await createAsset(context.request, testInfo, choices, spec))
  return { assets, choices, request: context.request, close: () => context.close() }
}
