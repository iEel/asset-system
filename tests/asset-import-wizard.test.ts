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

test("summarizes repeated import preview issues by field and code, each row once", () => {
  const summary = summarizeAssetImportPreviewIssues([
    { issues: [{ field: "categoryCode", code: "required" }, { field: "companyCode", code: "notFound" }] },
    { issues: [{ field: "categoryCode", code: "required" }] },
    // The same field and code twice on one row counts the row once.
    { issues: [{ field: "licenseTotalSeats", code: "licenceOnlyForLicence" }, { field: "licenseTotalSeats", code: "licenceOnlyForLicence" }] },
    { issues: [] },
  ])

  assert.deepEqual(summary, [
    { field: "categoryCode", code: "required", count: 2 },
    { field: "companyCode", code: "notFound", count: 1 },
    { field: "licenseTotalSeats", code: "licenceOnlyForLicence", count: 1 },
  ])
})
