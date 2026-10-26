// The records of one project's field audit walk (e2e/audit/audit-plan.ts), created through the app (spec §7: no direct
// SQL write, so the app's own rules apply):
// - the round's department and its two rooms through the master-data APIs, as the seed admin (IT staff hold no
//   department or location permission; the setup project creates the run's own the same way);
// - the assets through POST /api/assets and the two components through the component install
//   (POST /api/assets/<parent>/components), as the person who registers them (IT staff, or the IT head for their own
//   round), so the asset rules and the install checks run.
// The category, status and condition ids come from the asset form (/th/assets/new), the lists IT staff pick from when
// they register an asset. It is read on a page of its own, so the round form the person has open stays as it is: its
// conditions are chips with a searchable picker and hold no select to read (group 2 plan 1 task 4).
import type { APIRequestContext, Page } from "@playwright/test"
import { expect } from "../support/fixtures.ts"
import { auditRecords, type AuditAssetKey, type AuditRecords } from "./audit-plan.ts"
import type { RunData } from "../support/state.ts"

export type AuditMasterIds = { categoryDesktop: string; categoryComponent: string; statusReady: string; conditionGood: string; conditionFair: string }

export type AuditWalkData = {
  records: AuditRecords
  departmentId: string
  rooms: { roomA: string; roomB: string }
  assets: Record<AuditAssetKey, { id: string; tag: string; name: string }>
  masters: AuditMasterIds
}

async function created<T>(request: APIRequestContext, url: string, data: unknown): Promise<T> {
  const response = await request.post(url, { data })
  if (response.status() !== 201) throw new Error(`POST ${url} answered ${response.status()}: ${(await response.text()).slice(0, 300)}`)
  return (await response.json()) as T
}

// The options of one select of the asset form, by its id.
async function selectOptions(form: Page, id: string): Promise<{ value: string; label: string }[]> {
  const select = form.locator(`#${id}`)
  // The dashboard's loading.tsx streams the form, so its selects may still be empty here (13B loop 5).
  await expect(select.locator('option:not([value=""])').first()).toBeAttached()
  return select
    .locator("option")
    .evaluateAll((options) => options.map((option) => ({ value: (option as HTMLOptionElement).value, label: option.textContent?.trim() ?? "" })))
}

function optionId(options: { value: string; label: string }[], match: (label: string) => boolean, what: string): string {
  const option = options.find((candidate) => candidate.value && match(candidate.label))
  if (!option) throw new Error(`the asset form lists no ${what}`)
  return option.value
}

// Read on the asset form, in a page of its own beside the round form (as readAssetMasters in e2e/repair/repair-data.ts).
export async function readAuditMasters(page: Page): Promise<AuditMasterIds> {
  const form = await page.context().newPage()
  try {
    await form.goto("/th/assets/new")
    const categories = await selectOptions(form, "asset-category")
    const statuses = await selectOptions(form, "asset-status")
    const conditions = await selectOptions(form, "asset-condition")
    return {
      categoryDesktop: optionId(categories, (label) => label.startsWith("Desktop Computer - "), "Desktop Computer category"),
      categoryComponent: optionId(categories, (label) => label.startsWith("Computer Component - "), "Computer Component category"),
      statusReady: optionId(statuses, (label) => label === "พร้อมใช้งาน", "Ready status"),
      conditionGood: optionId(conditions, (label) => label === "ดี", "Good condition"),
      conditionFair: optionId(conditions, (label) => label === "พอใช้", "Fair condition"),
    }
  } finally {
    await form.close()
  }
}

// The department and the two rooms, as the seed admin. Before the round form opens: its scope list is the server's.
export async function createAuditPlaces(admin: APIRequestContext, run: RunData, runId: string, projectName: string) {
  const records = auditRecords(runId, projectName)
  const department = await created<{ id: string }>(admin, "/api/departments", { ...records.department, companyId: run.companyId, isActive: true })
  const roomA = await created<{ id: string }>(admin, "/api/locations", { ...records.rooms.roomA, branchId: run.branchId, isActive: true })
  const roomB = await created<{ id: string }>(admin, "/api/locations", { ...records.rooms.roomB, branchId: run.branchId, isActive: true })
  return { records, departmentId: department.id, rooms: { roomA: roomA.id, roomB: roomB.id } }
}

// The walk's assets and the parent's two components, as the signed-in person of this page.
export async function createAuditAssets(
  page: Page,
  run: RunData,
  places: Awaited<ReturnType<typeof createAuditPlaces>>,
  masters: AuditMasterIds,
): Promise<AuditWalkData> {
  const { records } = places
  const assets = {} as AuditWalkData["assets"]
  for (const plan of records.assets) {
    const asset = await created<{ id: string; assetTag: string }>(page.request, "/api/assets", {
      assetTag: plan.tag,
      name: plan.name,
      categoryId: plan.category === "component" ? masters.categoryComponent : masters.categoryDesktop,
      companyId: run.companyId,
      branchId: run.branchId,
      ownershipType: "shared",
      departmentId: plan.department === "round" ? places.departmentId : run.departmentId,
      currentLocationId: places.rooms[plan.room],
      homeLocationId: places.rooms[plan.room],
      statusId: masters.statusReady,
      conditionId: masters.conditionGood,
      remark: `${records.round.name} (E2E)`,
      // The schema takes a missing optional date or number only when its key is there (the asset form sends every
      // key; foundation note N3): a body without them answers 400 "required".
      licenseTotalSeats: null,
      licenseUsedSeats: null,
      purchaseDate: null,
      purchasePrice: null,
      warrantyStartDate: null,
      warrantyEndDate: null,
    })
    if (asset.assetTag !== plan.tag) throw new Error(`the asset was saved as ${asset.assetTag}, not ${plan.tag}`)
    assets[plan.key] = { id: asset.id, tag: plan.tag, name: plan.name }
  }
  for (const component of records.components) {
    await created(page.request, `/api/assets/${assets.parent.id}/components`, {
      componentAssetId: assets[component.key].id,
      componentRole: component.role,
      slotNo: component.slotNo,
      installedAt: null,
      reason: `${records.round.name} (E2E)`,
    })
  }
  return { records, departmentId: places.departmentId, rooms: places.rooms, assets, masters }
}
