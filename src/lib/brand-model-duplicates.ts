// Page group 7 plan 1: one duplicate rule for brands and models (spec §4.1). Two names are the same when they match after
// normalizeDuplicateName. A brand is unique over all brands, a model within its brand, against active and inactive
// records alike. Similar names (the rule, or one normalized name containing the other) are a warning, never a refusal.
// Brands and models number in the hundreds, so the reads take every name of the scope and compare in memory.
import { normalizeDuplicateName } from "./brand-model-query.ts"

export type NameClash = { id: string; name: string; isActive: boolean }

const NAME_SELECT = { id: true, name: true, isActive: true } as const

export type BrandNameDb = {
  assetBrand: { findMany: (args: { select: typeof NAME_SELECT }) => Promise<NameClash[]> }
}

export type ModelNameDb = {
  assetModel: { findMany: (args: { where: { brandId: string }; select: typeof NAME_SELECT }) => Promise<NameClash[]> }
}

// G7P1-R2: the similar list caps at 8 names, active first, then by name.
export const SIMILAR_NAME_LIMIT = 8

function firstClash(rows: NameClash[], name: string, excludeId?: string): NameClash | null {
  const wanted = normalizeDuplicateName(name)
  if (!wanted) return null
  const match = rows.find((row) => row.id !== excludeId && normalizeDuplicateName(row.name) === wanted)
  return match ? { id: match.id, name: match.name, isActive: match.isActive } : null
}

export async function findBrandNameClash(db: BrandNameDb, name: string, excludeId?: string): Promise<NameClash | null> {
  return firstClash(await db.assetBrand.findMany({ select: NAME_SELECT }), name, excludeId)
}

export async function findModelNameClash(
  db: ModelNameDb,
  brandId: string,
  name: string,
  excludeId?: string,
): Promise<NameClash | null> {
  return firstClash(await db.assetModel.findMany({ where: { brandId }, select: NAME_SELECT }), name, excludeId)
}

export function isSimilarName(a: string, b: string): boolean {
  const left = normalizeDuplicateName(a)
  const right = normalizeDuplicateName(b)
  if (!left || !right) return false
  return left === right || left.includes(right) || right.includes(left)
}

function similarList(rows: NameClash[], query: string): NameClash[] {
  if (!normalizeDuplicateName(query)) return []
  return rows
    .filter((row) => isSimilarName(query, row.name))
    .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name))
    .slice(0, SIMILAR_NAME_LIMIT)
    .map(({ id, name, isActive }) => ({ id, name, isActive }))
}

export async function listSimilarBrands(db: BrandNameDb, query: string): Promise<NameClash[]> {
  return similarList(await db.assetBrand.findMany({ select: NAME_SELECT }), query)
}

export async function listSimilarModels(db: ModelNameDb, brandId: string, query: string): Promise<NameClash[]> {
  return similarList(await db.assetModel.findMany({ where: { brandId }, select: NAME_SELECT }), query)
}

// G7P1-R1: 409 { code, field: "name", existing }. `error` and `fieldErrors` ride along so the V-track form helpers show
// it under the name field like any other refusal.
export function nameClashBody(kind: "brand" | "model", existing: NameClash) {
  return {
    error: kind === "brand" ? "Brand name already exists" : "Model name already exists for this brand",
    code: kind === "brand" ? ("BRAND_NAME_EXISTS" as const) : ("MODEL_NAME_EXISTS" as const),
    field: "name" as const,
    existing: { id: existing.id, name: existing.name, isActive: existing.isActive },
    fieldErrors: { name: "duplicate" },
  }
}

// The asset forms' users may hold asset:create or asset:edit without brand:view (the edit form has the quick add too,
// G7P1-R5), so any one of them reads the similar names.
export function canReadSimilarNames(has: (module: string, action: string) => boolean): boolean {
  return has("brand", "view") || has("asset", "create") || has("asset", "edit")
}
