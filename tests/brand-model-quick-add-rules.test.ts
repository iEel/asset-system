import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { canReadSimilarNames } from "../src/lib/brand-model-duplicates.ts"
import { resolveModelIdForScope } from "../src/lib/asset-model-selection.ts"
import {
  quickAddAvailability,
  quickAddRequest,
  shouldOfferCreate,
  similarNamesUrl,
  withQuickAddOption,
} from "../src/lib/brand-model-quick-add-rules.ts"

// Page group 7 plan 1 Task 3 (spec §4.2, G7P1-R4, G7P1-R5): a brand or model is added from inside the asset create form,
// the batch form and the edit form, guarded by the duplicate rule, without losing what was typed. Sources are read with
// LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/assets/"
const P = "src/app/[locale]/(dashboard)/assets/"

test("quickAddAvailability: no brand:create first, then a model needs the form's brand and category", () => {
  assert.equal(quickAddAvailability({ kind: "brand", canCreate: false, brandId: null, categoryId: null }), "noPermission")
  assert.equal(quickAddAvailability({ kind: "model", canCreate: false, brandId: "b1", categoryId: "c1" }), "noPermission")
  assert.equal(quickAddAvailability({ kind: "model", canCreate: true, brandId: null, categoryId: "c1" }), "needBrandAndCategory")
  assert.equal(quickAddAvailability({ kind: "model", canCreate: true, brandId: "b1", categoryId: "" }), "needBrandAndCategory")
  assert.equal(quickAddAvailability({ kind: "model", canCreate: true, brandId: "b1", categoryId: "c1" }), "ok")
  // A brand needs neither.
  assert.equal(quickAddAvailability({ kind: "brand", canCreate: true, brandId: null, categoryId: null }), "ok")
})

test("shouldOfferCreate: two characters after trim, and no option with the same normalized name (G7P1-R4)", () => {
  assert.equal(shouldOfferCreate("latitude 5420", ["Latitude5420"]), false)
  assert.equal(shouldOfferCreate("La", []), true)
  assert.equal(shouldOfferCreate("L", []), false)
  assert.equal(shouldOfferCreate("  L  ", []), false)
  assert.equal(shouldOfferCreate("dell", ["Dell"]), false)
  assert.equal(shouldOfferCreate("D-E-L-L", ["Dell"]), false)
  // A similar but different name is offered: HP and HPE are both real.
  assert.equal(shouldOfferCreate("HPE", ["HP"]), true)
})

test("quickAddRequest posts the trimmed name with source asset-form; a model carries the form's brand and category", () => {
  assert.deepEqual(quickAddRequest("brand", "  Dell ", { brandId: null, categoryId: null }), {
    url: "/api/brands",
    body: { name: "Dell", source: "asset-form" },
  })
  assert.deepEqual(quickAddRequest("model", "Latitude 5440", { brandId: "b1", categoryId: "c1" }), {
    url: "/api/models",
    body: { name: "Latitude 5440", brandId: "b1", categoryId: "c1", source: "asset-form" },
  })
})

test("similarNamesUrl: nothing under two characters, a model needs its brand", () => {
  assert.equal(similarNamesUrl("brand", "D", null), null)
  assert.equal(similarNamesUrl("brand", " HP ", null), "/api/brand-models/similar?kind=brand&q=HP")
  assert.equal(similarNamesUrl("model", "Latitude", null), null)
  assert.equal(
    similarNamesUrl("model", "Latitude 54", "b 1"),
    "/api/brand-models/similar?kind=model&brandId=b+1&q=Latitude+54",
  )
})

test("withQuickAddOption adds a record once, and the category/brand filter keeps a new model", () => {
  const models = [{ id: "m1", label: "Latitude 5420", categoryId: "c1", brandId: "b1" }]
  const added = { id: "m2", label: "Latitude 5440", categoryId: "c1", brandId: "b1" }
  const next = withQuickAddOption(models, added)
  assert.deepEqual(next.map((model) => model.id), ["m1", "m2"])
  assert.equal(withQuickAddOption(next, added), next)
  // The model the quick add chose stays when category or brand is picked again with the same scope.
  assert.equal(resolveModelIdForScope({ models: next, categoryId: "c1", brandId: "b1", currentModelId: "m2" }), "m2")
  assert.deepEqual(
    next.filter((model) => model.categoryId === "c1" && model.brandId === "b1").map((model) => model.id),
    ["m1", "m2"],
  )
})

test("the similar names read accepts asset:edit too, for the edit form's quick add (G7P1-R5)", () => {
  const grants = (list: string[]) => (module: string, action: string) => list.includes(`${module}:${action}`)
  assert.equal(canReadSimilarNames(grants(["asset:edit"])), true)
  assert.equal(canReadSimilarNames(grants(["asset:view"])), false)
})

test("SearchableSelect takes an optional createRow: a create item, or a hint where nothing can be added", () => {
  const source = read("src/components/ui/searchable-select.tsx")
  assert.match(source, /createRow\?: SearchableSelectCreateRow/)
  assert.match(source, /\| \{ blockedHint: string \}/)
  assert.match(source, /onCreate: \(query: string\) => void/)
  assert.match(source, /isExactMatch: \(query: string\) => boolean/)
  // Without createRow the list and the empty line are as before.
  assert.match(source, /<CommandEmpty>\{blockedHint \?\? emptyLabel\}<\/CommandEmpty>/)
})

test("both asset forms pick brand and model with SearchableSelect and a createRow", () => {
  const single = read(`${C}asset-form.tsx`)
  assert.match(single, /<SearchableSelect\n\s+id="asset-brand"/)
  assert.match(single, /<SearchableSelect\n\s+id="asset-model"/)
  assert.doesNotMatch(single, /<SelectField label=\{t\("brand"\)\}/)
  assert.doesNotMatch(single, /<SelectField label=\{t\("model"\)\}/)
  const batch = read(`${C}asset-batch-form.tsx`)
  assert.match(batch, /<SearchableSelect\n\s+id="asset-batch-brand"/)
  assert.match(batch, /<SearchableSelect\n\s+id="asset-batch-model"/)
  for (const source of [single, batch]) {
    assert.match(source, /createRow=\{brandCreateRow\}/)
    assert.match(source, /createRow=\{modelCreateRow\}/)
    assert.match(source, /quickAddAvailability\(\{ kind: "model", canCreate: canCreateBrandModel/)
    assert.match(source, /<BrandModelQuickAddDialog/)
  }
})

test("after a quick add the form picks the record through the handler a pick uses, nothing else changes", () => {
  for (const file of ["asset-form.tsx", "asset-batch-form.tsx"]) {
    const source = read(`${C}${file}`)
    // The new record joins the options first, then the same handler a pick calls sets brandId or modelId.
    assert.match(source, /const nextBrands = withQuickAddOption\(brandOptions, record\)/)
    assert.match(source, /handleBrandChange\(record\.id, \{ brands: nextBrands, models: modelOptions \}\)/)
    assert.match(source, /const nextModels = withQuickAddOption\(modelOptions, record\)/)
    assert.match(source, /handleModelChange\(record\.id, \{ brands: brandOptions, models: nextModels \}\)/)
    assert.match(source, /onChange=\{\(value\) => handleBrandChange\(value\)\}/)
    assert.match(source, /onChange=\{\(value\) => handleModelChange\(value\)\}/)
  }
})

test("the quick-add dialog posts source asset-form, reads similar names after 250 ms and answers a clash", () => {
  const source = read(`${C}brand-model-quick-add-dialog.tsx`)
  assert.match(source, /quickAddRequest\(kind, name, \{ brandId: brand\?\.id \?\? null, categoryId \}\)/)
  assert.match(source, /const SIMILAR_DELAY_MS = 250\n/)
  assert.match(source, /setTimeout\([\s\S]*?, SIMILAR_DELAY_MS\)/)
  assert.match(source, /similarNamesUrl\(kind, name, brand\?\.id \?\? null\)/)
  assert.match(source, /readNameClash\(payload\)/)
  assert.match(source, /<BrandModelClashNotice/)
  assert.match(source, /reactivateNameClash\(kind, existing, \{ source: "asset-form" \}\)/)
  // No <form>: the dialog renders in a portal and a submit would bubble to the asset form through React.
  assert.doesNotMatch(source, /<form/)
})

test("the create and edit pages pass brand:create and brand:edit to the form", () => {
  for (const page of ["new/page.tsx", "[id]/edit/page.tsx"]) {
    const source = read(`${P}${page}`)
    assert.match(source, /canCreateBrandModel=\{hasPermission\(user, "brand", "create"\)\}/)
    assert.match(source, /canReactivateBrandModel=\{hasPermission\(user, "brand", "edit"\)\}/)
  }
})
