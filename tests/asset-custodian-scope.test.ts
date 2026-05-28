import assert from "node:assert/strict"
import test from "node:test"

import { buildCustodianScopeAudit } from "../src/lib/asset-custodian-scope.ts"

test("builds no custodian scope audit for same company and branch", () => {
  assert.equal(
    buildCustodianScopeAudit(
      { companyId: "company-1", branchId: "branch-1", custodianId: "employee-1" },
      { id: "employee-1", companyId: "company-1", branchId: "branch-1" }
    ),
    null
  )
})

test("builds explicit custodian scope audit for cross-company custody", () => {
  assert.deepEqual(
    buildCustodianScopeAudit(
      { companyId: "asset-company", branchId: "asset-branch", custodianId: "employee-2" },
      {
        id: "employee-2",
        companyId: "custodian-company",
        branchId: "custodian-branch",
        company: { code: "CUS", nameTh: "บริษัทผู้ถือครอง" },
        branch: { code: "CBR", name: "สาขาผู้ถือครอง" },
      }
    ),
    {
      crossCompanyCustodian: true,
      crossBranchCustodian: true,
      assetCompanyId: "asset-company",
      assetBranchId: "asset-branch",
      custodianId: "employee-2",
      custodianCompanyId: "custodian-company",
      custodianBranchId: "custodian-branch",
      custodianCompanyLabel: "CUS - บริษัทผู้ถือครอง",
      custodianBranchLabel: "CBR - สาขาผู้ถือครอง",
    }
  )
})
