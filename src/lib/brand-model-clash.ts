// Page group 7 plan 1 Task 2: the client side of the duplicate rule (spec §4.1, G7P1-R1). A form reads the 409 clash
// body with readNameClash and offers the existing record; "เปิดใช้งาน {name}" calls reactivateNameClash, which saves the
// record as it is with isActive true. Shared by the brands page forms and the asset form's quick add.
import type { NameClash } from "./brand-model-duplicates.ts"
import type { brandModelSources } from "./validations/brand-model.ts"

export type NameClashKind = "brand" | "model"
type BrandModelSource = (typeof brandModelSources)[number]

const KIND_BY_CODE: Record<string, NameClashKind> = {
  BRAND_NAME_EXISTS: "brand",
  MODEL_NAME_EXISTS: "model",
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function readNameClash(payload: unknown): { kind: NameClashKind; existing: NameClash } | null {
  if (!isRecord(payload) || typeof payload.code !== "string") return null
  const kind = KIND_BY_CODE[payload.code]
  const existing = payload.existing
  if (!kind || !isRecord(existing)) return null
  if (typeof existing.id !== "string" || typeof existing.name !== "string" || typeof existing.isActive !== "boolean") return null
  return { kind, existing: { id: existing.id, name: existing.name, isActive: existing.isActive } }
}

async function send(fetchImpl: typeof fetch, url: string, init?: RequestInit) {
  const response = await fetchImpl(url, init)
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(isRecord(body) && typeof body.error === "string" ? body.error : `Request failed (${response.status})`)
  return body
}

// The PUT schemas need every required field, so a model's brand and category are read first and sent back unchanged;
// specs is left out, and an update without it keeps the stored specs.
export async function reactivateNameClash(
  kind: NameClashKind,
  existing: NameClash,
  options: { fetchImpl?: typeof fetch; source?: BrandModelSource } = {},
): Promise<void> {
  const fetchImpl = options.fetchImpl ?? fetch
  const source = options.source ?? "master-data"
  const put = (url: string, body: Record<string, unknown>) =>
    send(fetchImpl, url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })

  if (kind === "brand") {
    await put(`/api/brands/${existing.id}`, { name: existing.name, isActive: true, source })
    return
  }

  const model = await send(fetchImpl, `/api/models/${existing.id}?includeInactive=1`)
  if (!isRecord(model) || typeof model.brandId !== "string" || typeof model.categoryId !== "string") {
    throw new Error("Model not found")
  }
  await put(`/api/models/${existing.id}`, {
    name: typeof model.name === "string" ? model.name : existing.name,
    brandId: model.brandId,
    categoryId: model.categoryId,
    isActive: true,
    source,
  })
}
