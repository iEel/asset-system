// Page group 7 plan 1 Task 3 (spec §4.2): adding a brand or model from inside the asset forms (create, batch, edit).
// Who may add, when the picker offers "เพิ่ม…ใหม่: {query}", what the dialog posts and how the new record joins the
// form's options. The server keeps the duplicate rule (Task 1); this only decides what the form offers.
import { normalizeDuplicateName } from "./brand-model-query.ts"

export type QuickAddKind = "brand" | "model"
export type QuickAddAvailability = "ok" | "noPermission" | "needBrandAndCategory"

// G7P1-R4: the create row needs at least this many characters after trim.
export const QUICK_ADD_MIN_QUERY_LENGTH = 2

// brand:create adds either kind; a model also needs the form's own brand and category (Review Focus 3, 4).
export function quickAddAvailability(input: {
  kind: QuickAddKind
  canCreate: boolean
  brandId: string | null
  categoryId: string | null
}): QuickAddAvailability {
  if (!input.canCreate) return "noPermission"
  if (input.kind === "model" && (!input.brandId || !input.categoryId)) return "needBrandAndCategory"
  return "ok"
}

// G7P1-R4: offered only for a query of 2+ characters that no option already names under the duplicate rule.
export function shouldOfferCreate(query: string, optionNames: readonly string[]): boolean {
  const trimmed = query.trim()
  if (trimmed.length < QUICK_ADD_MIN_QUERY_LENGTH) return false
  const wanted = normalizeDuplicateName(trimmed)
  if (!wanted) return false
  return !optionNames.some((name) => normalizeDuplicateName(name) === wanted)
}

// The dialog's save: the quick add always says where it came from (the system log's newValue.source).
export function quickAddRequest(
  kind: QuickAddKind,
  name: string,
  scope: { brandId: string | null; categoryId: string | null },
): { url: string; body: Record<string, string> } {
  const trimmed = name.trim()
  if (kind === "brand") return { url: "/api/brands", body: { name: trimmed, source: "asset-form" } }
  return {
    url: "/api/models",
    body: { name: trimmed, brandId: scope.brandId ?? "", categoryId: scope.categoryId ?? "", source: "asset-form" },
  }
}

// The live similar-names read (Task 1); null when there is nothing to ask.
export function similarNamesUrl(kind: QuickAddKind, query: string, brandId: string | null): string | null {
  const q = query.trim()
  if (q.length < QUICK_ADD_MIN_QUERY_LENGTH) return null
  if (kind === "model" && !brandId) return null
  const params = new URLSearchParams({ kind })
  if (kind === "model" && brandId) params.set("brandId", brandId)
  params.set("q", q)
  return `/api/brand-models/similar?${params.toString()}`
}

// Task 3 fix 1: an existing model the quick add picks (a similar one, the clash, a reactivated one) brings its own
// category, so an asset is never saved with a model of another category. A model whose category cannot be read is not
// picked at all (the form's own category would be a guess).
export type ExistingModelPick = { pick: true; categoryId: string; changesCategory: boolean } | { pick: false }

export function existingModelPick(
  modelCategoryId: string | null | undefined,
  formCategoryId: string | null | undefined,
): ExistingModelPick {
  if (!modelCategoryId) return { pick: false }
  return { pick: true, categoryId: modelCategoryId, changesCategory: modelCategoryId !== (formCategoryId || null) }
}

// The similar list names the category of a model that sits in another one ("· {category}"); null when it is the form's
// own or unknown.
export function otherCategoryId(modelCategoryId: string | null | undefined, formCategoryId: string | null | undefined): string | null {
  if (!modelCategoryId || modelCategoryId === (formCategoryId || null)) return null
  return modelCategoryId
}

// A record the quick add created, reactivated or used joins the form's options once, so the category/brand filter and
// the name suggestion see it. The same array comes back when it is already there.
export function withQuickAddOption<T extends { id: string }>(options: readonly T[], option: T): T[] {
  if (options.some((item) => item.id === option.id)) return options as T[]
  return [...options, option]
}
