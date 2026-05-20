import assert from "node:assert/strict"
import test from "node:test"

import {
  getAssetImportWizardStep,
  summarizeAssetImportPreviewIssues,
} from "../src/lib/asset-import-wizard.ts"

test("resolves import wizard step from UI state", () => {
  assert.equal(getAssetImportWizardStep({}), "template")
  assert.equal(getAssetImportWizardStep({ isLoading: true }), "upload")
  assert.equal(getAssetImportWizardStep({ hasSelectedFile: true, hasPreview: true }), "review")
  assert.equal(getAssetImportWizardStep({ hasPreview: true, isImporting: true }), "import")
  assert.equal(getAssetImportWizardStep({ hasSuccess: true }), "complete")
})

test("summarizes repeated import preview issues", () => {
  const summary = summarizeAssetImportPreviewIssues([
    { errors: ["Missing Category", "Missing Company"] },
    { errors: ["Missing Category"] },
    { errors: [] },
  ])

  assert.deepEqual(summary, [
    { message: "Missing Category", count: 2 },
    { message: "Missing Company", count: 1 },
  ])
})
