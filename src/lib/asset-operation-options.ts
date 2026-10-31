import { prisma } from "@/lib/db"
import { outstandingLinkWhere } from "@/lib/asset-component-outstanding"
import { getCheckinReturnStatuses } from "@/lib/asset-status-flow"
import { getAssetOperationConditionOptions, type AssetOperationConditionOperation } from "@/lib/asset-lifecycle-policy"
import type { AssetOperationMode } from "@/lib/asset-operation-eligibility"
import { searchAssetOperationOptions, type AssetOperationSearchDb } from "@/lib/asset-operation-search"
import type { AssetOperationSearchRow } from "@/lib/asset-operation-search-rules"

export type AssetOperationOption = { id: string; label: string }
type EmployeeRow = { id: string; code: string; fullNameTh: string; departmentId: string; department?: { code: string; name: string }; branch?: { name: string } }
type LocationRow = { id: string; code: string; name: string; branchId?: string; branch?: { name: string } }
export type AssetOperationNamedOption = AssetOperationOption & { name: string }
/** An employee on รับคืน and ย้ายหลายรายการ: the department id comes free with the row. */
export type AssetOperationEmployeePlainOption = AssetOperationOption & { departmentId: string }
/**
 * โอนย้าย's employee (group 3 plan 3 P3-R9): the name the summary shows (look L1) and the employee's own department's name,
 * read through the relation, so an inactive department is still named (spec §6 call 5: it is written as it is).
 */
export type AssetOperationEmployeeDepartmentOption = AssetOperationEmployeePlainOption & { name: string; departmentName: string }
/** โอนย้าย's room (P3-R9, P3-R13): its branch id, compared with the asset's own by id (names repeat across companies), and the branch name. */
export type AssetOperationLocationBranchOption = AssetOperationNamedOption & { branchId: string; branchName: string }
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
export type AssetOperationMasterOptions<
  Employee extends AssetOperationEmployeePlainOption = AssetOperationEmployeePlainOption,
  Location extends AssetOperationNamedOption = AssetOperationNamedOption,
> = {
  employees: Employee[]
  departments: AssetOperationNamedOption[]
  locations: Location[]
  statuses: AssetOperationNamedOption[]
  conditions: AssetOperationNamedOption[]
}

// The master lists the four transaction pages read (server search spec §3 goal 1): no asset, handover or repair. The
// asset of ส่งมอบ and โอนย้าย comes from the server search, one row at most here (getAssetOperationPreselect). Only
// { employeeDetail: true } (ส่งมอบ) reads the employee's department and branch and runs the held-count groupBy over
// the register (final review M4). The conditions are the operation's (group 3 spec §19.1): { conditionsFor: "checkout" }
// (ส่งมอบ) offers ใหม่/ดี/พอใช้; the default is รับคืน's list. { employeeDepartment: true, locationBranch: true } (โอนย้าย,
// group 3 plan 3 P3-R9) reads each employee's own department name and each room's branch, with no groupBy; each flag
// reads only its own list, and employeeDetail, a superset, wins over employeeDepartment.
export async function getAssetOperationMasterOptions(options: { employeeDetail: true; conditionsFor?: AssetOperationConditionOperation }): Promise<AssetOperationMasterOptions<AssetOperationEmployeeOption>>
export async function getAssetOperationMasterOptions(options: { employeeDepartment: true; locationBranch: true; conditionsFor?: AssetOperationConditionOperation }): Promise<AssetOperationMasterOptions<AssetOperationEmployeeDepartmentOption, AssetOperationLocationBranchOption>>
export async function getAssetOperationMasterOptions(options?: { employeeDetail?: false; conditionsFor?: AssetOperationConditionOperation }): Promise<AssetOperationMasterOptions>
export async function getAssetOperationMasterOptions(options?: { employeeDetail?: boolean; employeeDepartment?: boolean; locationBranch?: boolean; conditionsFor?: AssetOperationConditionOperation }): Promise<AssetOperationMasterOptions<AssetOperationEmployeePlainOption | AssetOperationEmployeeOption | AssetOperationEmployeeDepartmentOption, AssetOperationNamedOption | AssetOperationLocationBranchOption>> {
  const employeeDetail = options?.employeeDetail === true
  const employeeDepartment = options?.employeeDepartment === true
  const locationBranch = options?.locationBranch === true
  const [employees, departments, locations, statuses, conditions, held] = await Promise.all([
    prisma.employee.findMany({
      where: { isActive: true },
      select: employeeDetail
        ? { id: true, code: true, fullNameTh: true, departmentId: true, department: { select: { code: true, name: true } }, branch: { select: { name: true } } }
        : employeeDepartment
          ? { id: true, code: true, fullNameTh: true, departmentId: true, department: { select: { code: true, name: true } } }
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
      select: locationBranch
        ? { id: true, code: true, name: true, branchId: true, branch: { select: { name: true } } }
        : { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }) as Promise<LocationRow[]>,
    getCheckinReturnStatuses(),
    prisma.assetCondition.findMany({
      where: { isActive: true },
      select: { id: true, name: true, nameTh: true },
      orderBy: { sortOrder: "asc" },
    }),
    employeeDetail
      ? prisma.asset.groupBy({
        by: ["custodianId"],
        // Leaves out ส่วนควบ (spec §7.2): an asset owned as ส่วนควบ, and one installed in another (it carries its parent's
        // holder). An outstanding component counts: ผู้คืน holds it on its own (group 3 spec §8.5, P2-R17).
        where: {
          isActive: true,
          custodianId: { not: null },
          OR: [
            { ownershipType: { not: "component" }, installedInLinks: { none: { status: "installed", removedAt: null } } },
            { installedInLinks: { some: outstandingLinkWhere } },
          ],
        },
        _count: { _all: true },
      })
      : Promise.resolve([] as Array<{ custodianId: string | null; _count: { _all: number } }>),
  ])
  const heldCounts = new Map(held.map((group) => [group.custodianId, group._count._all]))

  return {
    employees: employees.map((employee) => {
      const plain = { id: employee.id, label: `${employee.code} - ${employee.fullNameTh}`, departmentId: employee.departmentId }
      if (employeeDetail && employee.department && employee.branch) {
        return {
          ...plain,
          name: employee.fullNameTh,
          departmentLabel: `${employee.department.code} - ${employee.department.name}`,
          departmentName: employee.department.name,
          branchLabel: employee.branch.name,
          heldCount: heldCounts.get(employee.id) ?? 0,
        }
      }
      if (employeeDepartment && employee.department) return { ...plain, name: employee.fullNameTh, departmentName: employee.department.name }
      return plain
    }),
    departments: departments.map((department) => ({ id: department.id, label: `${department.code} - ${department.name}`, name: department.name })),
    locations: locations.map((location) => {
      const named = { id: location.id, label: `${location.code} - ${location.name}`, name: location.name }
      if (!locationBranch || !location.branchId || !location.branch) return named
      return { ...named, branchId: location.branchId, branchName: location.branch.name }
    }),
    statuses: statuses.map((status) => ({ id: status.id, label: status.nameTh, name: status.name })),
    conditions: getAssetOperationConditionOptions(options?.conditionsFor ?? "checkin", conditions)
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
