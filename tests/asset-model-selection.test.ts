import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { resolveModelIdForScope } from "../src/lib/asset-model-selection.ts"

const models = [
  { id: "model-apc-ups", categoryId: "cat-ups", brandId: "brand-apc" },
  { id: "model-hp-notebook", categoryId: "cat-notebook", brandId: "brand-hp" },
  { id: "model-hp-notebook-alt", categoryId: "cat-notebook", brandId: "brand-hp" },
]

test("resolveModelIdForScope auto-selects the only model for a selected category and brand", () => {
  assert.equal(
    resolveModelIdForScope({
      models,
      categoryId: "cat-ups",
      brandId: "brand-apc",
      currentModelId: "",
    }),
    "model-apc-ups"
  )
})

test("resolveModelIdForScope keeps an existing model when it still matches the selected scope", () => {
  assert.equal(
    resolveModelIdForScope({
      models,
      categoryId: "cat-ups",
      brandId: "brand-apc",
      currentModelId: "model-apc-ups",
    }),
    "model-apc-ups"
  )
})

test("resolveModelIdForScope does not guess when multiple models match", () => {
  assert.equal(
    resolveModelIdForScope({
      models,
      categoryId: "cat-notebook",
      brandId: "brand-hp",
      currentModelId: "",
    }),
    ""
  )
})

test("resolveModelIdForScope does not guess without both category and brand", () => {
  assert.equal(
    resolveModelIdForScope({
      models,
      categoryId: "cat-ups",
      brandId: "",
      currentModelId: "",
    }),
    ""
  )
})

test("asset create forms auto-resolve model selection from category and brand changes", () => {
  const singleFormSource = readFileSync("src/components/assets/asset-form.tsx", "utf8")
  const batchFormSource = readFileSync("src/components/assets/asset-batch-form.tsx", "utf8")

  assert.match(singleFormSource, /import \{ resolveModelIdForScope \} from "@\/lib\/asset-model-selection"/)
  assert.match(batchFormSource, /import \{ resolveModelIdForScope \} from "@\/lib\/asset-model-selection"/)
  assert.match(singleFormSource, /modelId: resolveModelIdForScope\(/)
  assert.match(batchFormSource, /modelId: resolveModelIdForScope\(/)
})
