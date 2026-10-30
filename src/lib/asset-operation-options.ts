import { prisma } from "@/lib/db"
import { getCheckinReturnStatuses } from "@/lib/asset-status-flow"
import { getAssetOperationConditionOptions } from "@/lib/asset-lifecycle-policy"
import type { AssetOperationMode } from "@/lib/asset-operation-eligibility"
import { searchAssetOperationOptions, type AssetOperationSearchDb } from "@/lib/asset-operation-search"
import type { AssetOperationSearchRow } from "@/lib/asset-operation-search-rules"

export type AssetOperationOption = { id: string; label: string }
type EmployeeRow = { id: string; code: string; fullNameTh: string; departmentId: string; department?: { code: string; name: string }; branch?: { name: string } }
export type AssetOperationNamedOption = AssetOperationOption & { name: string }
/** An employee on รับคืน, โอนย้าย and ย้ายหลายรายการ: the department id comes free with the row. */
export type AssetOperationEmployeePlainOption = AssetOperationOption & { departmentId: string }
/**
 * ส่งมอบ's employee (group 3 spec §7.2, final review M4): the hint line "<แผนก> · <สาขา> · ตอนนี้ถือครองทรัพย์สินอยู่ N
 * รายการ", and the plain names the summary card and the read-back show (look L1).
 */
export type AssetOperationEmployeeOption = AssetOperationEmployeePlainOption & {
  /** fullNameTh */
  name: string
  departmentLabel: string
  departmentName: string
  branchLabel: string
  heldCount: number
}
export type AssetOperationMasterOptions<Employee extends AssetOperationEmployeePlainOption = AssetOperationEmployeePlainOption> = {
  employees: Employee[]
  departments: AssetOperationNamedOption[]
  locations: AssetOperationNamedOption[]
  statuses: AssetOperationNamedOption[]
  conditions: AssetOperationNamedOption[]
}

// The master lists the four transaction pages read (server search spec §3 goal 1): no asset, handover or repair. The
// asset of ส่งมอบ and โอนย้าย comes from the server search, one row at most here (getAssetOperationPreselect). Only
// { employeeDetail: true } (ส่งมอบ) reads the employee's department and branch and runs the held-count groupBy over
// the register (final review M4).
export async function getAssetOperationMasterOptions(options: { employeeDetail: true }): Promise<AssetOperationMasterOptions<AssetOperationEmployeeOption>>
export async function getAssetOperationMasterOptions(options?: { employeeDetail?: false }): Promise<AssetOperationMasterOptions>
export async function getAssetOperationMasterOptions(options?: { employeeDetail?: boolean }): Promise<AssetOperationMasterOptions<AssetOperationEmployeePlainOption | AssetOperationEmployeeOption>> {
  const employeeDetail = options?.employeeDetail === true
  const [employees, departments, locations, statuses, conditions, held] = await Promise.all([
    prisma.employee.findMany({
      where: { isActive: true },
      select: employeeDetail
        ? { id: true, code: true, fullNameTh: true, departmentId: true, department: { select: { code: true, name: true } }, branch: { select: { name: true } } }
        : { id: true, code: true, fullNameTh: true, departmentId: true },
      orderBy: { code: "asc" },
    }) as Promise<EmployeeRow[]>,
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.location.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    getCheckinReturnStatuses(),
    prisma.assetCondition.findMany({
      where: { isActive: true },
      select: { id: true, name: true, nameTh: true },
      orderBy: { sortOrder: "asc" },
    }),
    employeeDetail
      ? prisma.asset.groupBy({
        by: ["custodianId"],
        // Leaves out ส่วนควบ (spec §7.2): an asset owned as ส่วนควบ, and one installed in another whatever its ownership (it carries its parent's holder).
        where: { isActive: true, custodianId: { not: null }, ownershipType: { not: "component" }, installedInLinks: { none: { status: "installed", removedAt: null } } },
        _count: { _all: true },
      })
      : Promise.resolve([] as Array<{ custodianId: string | null; _count: { _all: number } }>),
  ])
  const heldCounts = new Map(held.map((group) => [group.custodianId, group._count._all]))

  return {
    employees: employees.map((employee) => {
      const plain = { id: employee.id, label: `${employee.code} - ${employee.fullNameTh}`, departmentId: employee.departmentId }
      if (!employeeDetail || !employee.department || !employee.branch) return plain
      return {
        ...plain,
        name: employee.fullNameTh,
        departmentLabel: `${employee.department.code} - ${employee.department.name}`,
        departmentName: employee.department.name,
        branchLabel: employee.branch.name,
        heldCount: heldCounts.get(employee.id) ?? 0,
      }
    }),
    departments: departments.map((department) => ({ id: department.id, label: `${department.code} - ${department.name}`, name: department.name })),
    locations: locations.map((location) => ({ id: location.id, label: `${location.code} - ${location.name}`, name: location.name })),
    statuses: statuses.map((status) => ({ id: status.id, label: status.nameTh, name: status.name })),
    conditions: getAssetOperationConditionOptions(conditions)
      .map((condition) => ({ id: condition.id, label: condition.nameTh, name: condition.name })),
  }
}

// ?assetId= on ส่งมอบ and โอนย้าย (spec 6.4): the search's by-id answer under the page's rule, so the form starts with
// the row chosen, or chosen-but-blocked with its reason. A repeated ?assetId= reaches the page as an array and the
// first counts, as asset-return-navigation reads returnTo (S-R5, S-R42). The pages call it after their permission check.
export async function getAssetOperationPreselect(
  mode: AssetOperationMode,
  assetId: string | string[] | undefined,
  options?: { detail?: boolean },
): Promise<AssetOperationSearchRow | null> {
  const id = Array.isArray(assetId) ? assetId[0] : assetId
  if (!id) return null
  const answer = await searchAssetOperationOptions(prisma as unknown as AssetOperationSearchDb, {
    mode,
    q: "",
    id,
    assignCustodian: false,
    ...(options?.detail ? { detail: true as const } : {}),
  })
  return answer.rows[0] ?? null
}
