import assert from "node:assert/strict"
import test from "node:test"

import { optionMatchesOrganizationScope } from "../src/lib/organization-option-filter.ts"

test("matches employees in the selected company branch and department", () => {
  assert.equal(
    optionMatchesOrganizationScope(
      { companyId: "company-1", branchId: "branch-1", departmentId: "department-it" },
      { companyId: "company-1", branchId: "branch-1", departmentId: "department-it" }
    ),
    true
  )
})

test("rejects employees from a different known branch or department", () => {
  assert.equal(
    optionMatchesOrganizationScope(
      { companyId: "company-1", branchId: "branch-2", branchCode: "OTHER", departmentId: "department-it" },
      { companyId: "company-1", branchId: "branch-1", branchCode: "SathuPradit", departmentId: "department-it" }
    ),
    false
  )
  assert.equal(
    optionMatchesOrganizationScope(
      { companyId: "company-1", branchId: "branch-1", departmentId: "department-hr" },
      { companyId: "company-1", branchId: "branch-1", departmentId: "department-it" }
    ),
    false
  )
})

test("matches legacy employees whose branch id is stale but branch code still matches selected branch", () => {
  assert.equal(
    optionMatchesOrganizationScope(
      {
        companyId: "company-grandlink",
        branchId: "sonic-sathu-branch-id",
        branchCode: "SathuPradit",
        departmentId: "department-it",
      },
      {
        companyId: "company-grandlink",
        branchId: "grandlink-sathu-branch-id",
        branchCode: "SathuPradit",
        departmentId: "department-it",
      }
    ),
    true
  )
})

test("keeps options visible when legacy option metadata is missing", () => {
  assert.equal(
    optionMatchesOrganizationScope(
      { companyId: "company-1", branchId: "branch-1" },
      { companyId: "company-1", branchId: "branch-1", departmentId: "department-it" }
    ),
    true
  )
})
