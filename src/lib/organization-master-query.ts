import type { Prisma } from "@prisma/client"

export const companySorts = ["createdAt", "code", "assetTagCode", "nameTh", "branches", "employees", "assets"] as const
export const branchSorts = ["createdAt", "code", "name", "company", "locations", "employees", "assets"] as const
export const employeeSorts = ["createdAt", "code", "fullNameTh", "company", "branch", "department", "employmentStatus", "assets"] as const
export const supplierSorts = ["createdAt", "code", "name", "contactPerson", "phone", "email", "assets", "purchaseDocuments"] as const
export const assetUsageFilters = ["all", "withAssets", "withoutAssets"] as const
export const branchUsageFilters = ["all", "withBranches", "withoutBranches"] as const
export const locationUsageFilters = ["all", "withLocations", "withoutLocations"] as const
export const employeeStatusFilters = ["all", "active", "resigned", "suspended"] as const
export const custodyUsageFilters = ["all", "withAssets", "withoutAssets"] as const
export const purchaseDocumentUsageFilters = ["all", "withPurchaseDocuments", "withoutPurchaseDocuments"] as const

export type CompanySort = (typeof companySorts)[number]
export type BranchSort = (typeof branchSorts)[number]
export type EmployeeSort = (typeof employeeSorts)[number]
export type SupplierSort = (typeof supplierSorts)[number]
export type AssetUsageFilter = (typeof assetUsageFilters)[number]
export type BranchUsageFilter = (typeof branchUsageFilters)[number]
export type LocationUsageFilter = (typeof locationUsageFilters)[number]
export type EmployeeStatusFilter = (typeof employeeStatusFilters)[number]
export type CustodyUsageFilter = (typeof custodyUsageFilters)[number]
export type PurchaseDocumentUsageFilter = (typeof purchaseDocumentUsageFilters)[number]

export type CompanyListParams = {
  search?: string | string[] | number | null
  page?: string | string[] | number | null
  pageSize?: string | string[] | number | null
  sort?: string | string[] | null
  direction?: string | string[] | null
  assetUsage?: string | string[] | null
  branchUsage?: string | string[] | null
}

export type BranchListParams = {
  search?: string | string[] | number | null
  page?: string | string[] | number | null
  pageSize?: string | string[] | number | null
  sort?: string | string[] | null
  direction?: string | string[] | null
  companyId?: string | string[] | null
  assetUsage?: string | string[] | null
  locationUsage?: string | string[] | null
}

export type EmployeeListParams = {
  search?: string | string[] | number | null
  page?: string | string[] | number | null
  pageSize?: string | string[] | number | null
  sort?: string | string[] | null
  direction?: string | string[] | null
  companyId?: string | string[] | null
  branchId?: string | string[] | null
  departmentId?: string | string[] | null
  employmentStatus?: string | string[] | null
  custodyUsage?: string | string[] | null
}

export type SupplierListParams = {
  search?: string | string[] | number | null
  page?: string | string[] | number | null
  pageSize?: string | string[] | number | null
  sort?: string | string[] | null
  direction?: string | string[] | null
  assetUsage?: string | string[] | null
  purchaseDocumentUsage?: string | string[] | null
}

export type CompanyListState = {
  search: string
  page: number
  pageSize: number
  sort: CompanySort
  direction: "asc" | "desc"
  assetUsage: AssetUsageFilter
  branchUsage: BranchUsageFilter
}

export type BranchListState = {
  search: string
  page: number
  pageSize: number
  sort: BranchSort
  direction: "asc" | "desc"
  companyId: string
  assetUsage: AssetUsageFilter
  locationUsage: LocationUsageFilter
}

export type EmployeeListState = {
  search: string
  page: number
  pageSize: number
  sort: EmployeeSort
  direction: "asc" | "desc"
  companyId: string
  branchId: string
  departmentId: string
  employmentStatus: EmployeeStatusFilter
  custodyUsage: CustodyUsageFilter
}

export type SupplierListState = {
  search: string
  page: number
  pageSize: number
  sort: SupplierSort
  direction: "asc" | "desc"
  assetUsage: AssetUsageFilter
  purchaseDocumentUsage: PurchaseDocumentUsageFilter
}

export type CompanySummaryItem = {
  _count: {
    branches: number
    assets: number
  }
}

export type BranchSummaryItem = {
  _count: {
    locations: number
    assets: number
  }
}

export type EmployeeSummaryItem = {
  employmentStatus: string
  _count: {
    custodianAssets: number
  }
}

export type SupplierSummaryItem = {
  _count: {
    assets: number
    purchaseDocuments: number
  }
}

export function parseCompanyListParams(input: CompanyListParams): CompanyListState {
  const sortValue = firstValue(input.sort)
  const directionValue = firstValue(input.direction)

  return {
    search: firstValue(input.search).trim(),
    page: parsePositiveInteger(input.page, 1),
    pageSize: parsePageSize(input.pageSize),
    sort: companySorts.includes(sortValue as CompanySort) ? (sortValue as CompanySort) : "createdAt",
    direction: directionValue === "asc" ? "asc" : "desc",
    assetUsage: parseFilter(input.assetUsage, assetUsageFilters, "all"),
    branchUsage: parseFilter(input.branchUsage, branchUsageFilters, "all"),
  }
}

export function parseBranchListParams(input: BranchListParams): BranchListState {
  const sortValue = firstValue(input.sort)
  const directionValue = firstValue(input.direction)

  return {
    search: firstValue(input.search).trim(),
    page: parsePositiveInteger(input.page, 1),
    pageSize: parsePageSize(input.pageSize),
    sort: branchSorts.includes(sortValue as BranchSort) ? (sortValue as BranchSort) : "createdAt",
    direction: directionValue === "asc" ? "asc" : "desc",
    companyId: firstValue(input.companyId).trim(),
    assetUsage: parseFilter(input.assetUsage, assetUsageFilters, "all"),
    locationUsage: parseFilter(input.locationUsage, locationUsageFilters, "all"),
  }
}

export function parseEmployeeListParams(input: EmployeeListParams): EmployeeListState {
  const sortValue = firstValue(input.sort)
  const directionValue = firstValue(input.direction)

  return {
    search: firstValue(input.search).trim(),
    page: parsePositiveInteger(input.page, 1),
    pageSize: parsePageSize(input.pageSize),
    sort: employeeSorts.includes(sortValue as EmployeeSort) ? (sortValue as EmployeeSort) : "createdAt",
    direction: directionValue === "asc" ? "asc" : "desc",
    companyId: firstValue(input.companyId).trim(),
    branchId: firstValue(input.branchId).trim(),
    departmentId: firstValue(input.departmentId).trim(),
    employmentStatus: parseFilter(input.employmentStatus, employeeStatusFilters, "all"),
    custodyUsage: parseFilter(input.custodyUsage, custodyUsageFilters, "all"),
  }
}

export function parseSupplierListParams(input: SupplierListParams): SupplierListState {
  const sortValue = firstValue(input.sort)
  const directionValue = firstValue(input.direction)

  return {
    search: firstValue(input.search).trim(),
    page: parsePositiveInteger(input.page, 1),
    pageSize: parsePageSize(input.pageSize),
    sort: supplierSorts.includes(sortValue as SupplierSort) ? (sortValue as SupplierSort) : "createdAt",
    direction: directionValue === "asc" ? "asc" : "desc",
    assetUsage: parseFilter(input.assetUsage, assetUsageFilters, "all"),
    purchaseDocumentUsage: parseFilter(input.purchaseDocumentUsage, purchaseDocumentUsageFilters, "all"),
  }
}

export function buildCompanyWhere(state: CompanyListState): Prisma.CompanyWhereInput {
  return {
    isActive: true,
    ...(state.search
      ? {
          OR: [
            { code: { contains: state.search } },
            { assetTagCode: { contains: state.search } },
            { nameTh: { contains: state.search } },
            { nameEn: { contains: state.search } },
            { taxId: { contains: state.search } },
            { address: { contains: state.search } },
          ],
        }
      : {}),
    ...(state.assetUsage === "withAssets" ? { assets: { some: { isActive: true } } } : {}),
    ...(state.assetUsage === "withoutAssets" ? { assets: { none: { isActive: true } } } : {}),
    ...(state.branchUsage === "withBranches" ? { branches: { some: { isActive: true } } } : {}),
    ...(state.branchUsage === "withoutBranches" ? { branches: { none: { isActive: true } } } : {}),
  }
}

export function buildBranchWhere(state: BranchListState): Prisma.BranchWhereInput {
  return {
    isActive: true,
    ...(state.companyId ? { companyId: state.companyId } : {}),
    ...(state.search
      ? {
          OR: [
            { code: { contains: state.search } },
            { name: { contains: state.search } },
            { address: { contains: state.search } },
            { contactPerson: { contains: state.search } },
            { company: { code: { contains: state.search } } },
            { company: { nameTh: { contains: state.search } } },
          ],
        }
      : {}),
    ...(state.assetUsage === "withAssets" ? { assets: { some: { isActive: true } } } : {}),
    ...(state.assetUsage === "withoutAssets" ? { assets: { none: { isActive: true } } } : {}),
    ...(state.locationUsage === "withLocations" ? { locations: { some: { isActive: true } } } : {}),
    ...(state.locationUsage === "withoutLocations" ? { locations: { none: { isActive: true } } } : {}),
  }
}

export function buildEmployeeWhere(state: EmployeeListState): Prisma.EmployeeWhereInput {
  return {
    isActive: true,
    ...(state.companyId ? { companyId: state.companyId } : {}),
    ...(state.branchId ? { branchId: state.branchId } : {}),
    ...(state.departmentId ? { departmentId: state.departmentId } : {}),
    ...(state.employmentStatus !== "all" ? { employmentStatus: state.employmentStatus } : {}),
    ...(state.search
      ? {
          OR: [
            { code: { contains: state.search } },
            { fullNameTh: { contains: state.search } },
            { fullNameEn: { contains: state.search } },
            { email: { contains: state.search } },
            { position: { contains: state.search } },
            { company: { code: { contains: state.search } } },
            { company: { nameTh: { contains: state.search } } },
            { branch: { code: { contains: state.search } } },
            { branch: { name: { contains: state.search } } },
            { department: { code: { contains: state.search } } },
            { department: { name: { contains: state.search } } },
            { manager: { is: { code: { contains: state.search } } } },
            { manager: { is: { fullNameTh: { contains: state.search } } } },
          ],
        }
      : {}),
    ...(state.custodyUsage === "withAssets" ? { custodianAssets: { some: { isActive: true } } } : {}),
    ...(state.custodyUsage === "withoutAssets" ? { custodianAssets: { none: { isActive: true } } } : {}),
  }
}

export function buildSupplierWhere(state: SupplierListState): Prisma.SupplierWhereInput {
  return {
    isActive: true,
    ...(state.search
      ? {
          OR: [
            { code: { contains: state.search } },
            { name: { contains: state.search } },
            { contactPerson: { contains: state.search } },
            { phone: { contains: state.search } },
            { email: { contains: state.search } },
            { address: { contains: state.search } },
          ],
        }
      : {}),
    ...(state.assetUsage === "withAssets" ? { assets: { some: { isActive: true } } } : {}),
    ...(state.assetUsage === "withoutAssets" ? { assets: { none: { isActive: true } } } : {}),
    ...(state.purchaseDocumentUsage === "withPurchaseDocuments" ? { purchaseDocuments: { some: { isActive: true } } } : {}),
    ...(state.purchaseDocumentUsage === "withoutPurchaseDocuments" ? { purchaseDocuments: { none: { isActive: true } } } : {}),
  }
}

export function buildCompanyOrderBy({
  sort,
  direction,
}: Pick<CompanyListState, "sort" | "direction">): Prisma.CompanyOrderByWithRelationInput {
  if (sort === "branches") return { branches: { _count: direction } }
  if (sort === "employees") return { employees: { _count: direction } }
  if (sort === "assets") return { assets: { _count: direction } }
  return { [sort]: direction }
}

export function buildBranchOrderBy({
  sort,
  direction,
}: Pick<BranchListState, "sort" | "direction">): Prisma.BranchOrderByWithRelationInput {
  if (sort === "company") return { company: { code: direction } }
  if (sort === "locations") return { locations: { _count: direction } }
  if (sort === "employees") return { employees: { _count: direction } }
  if (sort === "assets") return { assets: { _count: direction } }
  return { [sort]: direction }
}

export function buildEmployeeOrderBy({
  sort,
  direction,
}: Pick<EmployeeListState, "sort" | "direction">): Prisma.EmployeeOrderByWithRelationInput {
  if (sort === "company") return { company: { code: direction } }
  if (sort === "branch") return { branch: { code: direction } }
  if (sort === "department") return { department: { code: direction } }
  if (sort === "assets") return { custodianAssets: { _count: direction } }
  return { [sort]: direction }
}

export function buildSupplierOrderBy({
  sort,
  direction,
}: Pick<SupplierListState, "sort" | "direction">): Prisma.SupplierOrderByWithRelationInput {
  if (sort === "assets") return { assets: { _count: direction } }
  if (sort === "purchaseDocuments") return { purchaseDocuments: { _count: direction } }
  return { [sort]: direction }
}

export function buildCompanyQueryString(current: CompanyListState, next: Partial<CompanyListState>) {
  const merged = { ...current, ...next }
  const params = new URLSearchParams()
  if (merged.search) params.set("search", merged.search)
  params.set("page", String(merged.page))
  params.set("pageSize", String(merged.pageSize))
  params.set("sort", merged.sort)
  params.set("direction", merged.direction)
  params.set("assetUsage", merged.assetUsage)
  params.set("branchUsage", merged.branchUsage)
  return params.toString()
}

export function buildBranchQueryString(current: BranchListState, next: Partial<BranchListState>) {
  const merged = { ...current, ...next }
  const params = new URLSearchParams()
  if (merged.search) params.set("search", merged.search)
  params.set("page", String(merged.page))
  params.set("pageSize", String(merged.pageSize))
  params.set("sort", merged.sort)
  params.set("direction", merged.direction)
  if (merged.companyId) params.set("companyId", merged.companyId)
  params.set("assetUsage", merged.assetUsage)
  params.set("locationUsage", merged.locationUsage)
  return params.toString()
}

export function buildEmployeeQueryString(current: EmployeeListState, next: Partial<EmployeeListState>) {
  const merged = { ...current, ...next }
  const params = new URLSearchParams()
  if (merged.search) params.set("search", merged.search)
  params.set("page", String(merged.page))
  params.set("pageSize", String(merged.pageSize))
  params.set("sort", merged.sort)
  params.set("direction", merged.direction)
  if (merged.companyId) params.set("companyId", merged.companyId)
  if (merged.branchId) params.set("branchId", merged.branchId)
  if (merged.departmentId) params.set("departmentId", merged.departmentId)
  params.set("employmentStatus", merged.employmentStatus)
  params.set("custodyUsage", merged.custodyUsage)
  return params.toString()
}

export function buildSupplierQueryString(current: SupplierListState, next: Partial<SupplierListState>) {
  const merged = { ...current, ...next }
  const params = new URLSearchParams()
  if (merged.search) params.set("search", merged.search)
  params.set("page", String(merged.page))
  params.set("pageSize", String(merged.pageSize))
  params.set("sort", merged.sort)
  params.set("direction", merged.direction)
  params.set("assetUsage", merged.assetUsage)
  params.set("purchaseDocumentUsage", merged.purchaseDocumentUsage)
  return params.toString()
}

export function buildCompanySummary(companies: CompanySummaryItem[]) {
  return {
    total: companies.length,
    withBranches: companies.filter((company) => company._count.branches > 0).length,
    withoutBranches: companies.filter((company) => company._count.branches === 0).length,
    withAssets: companies.filter((company) => company._count.assets > 0).length,
    withoutAssets: companies.filter((company) => company._count.assets === 0).length,
  }
}

export function buildBranchSummary(branches: BranchSummaryItem[]) {
  return {
    total: branches.length,
    withLocations: branches.filter((branch) => branch._count.locations > 0).length,
    withoutLocations: branches.filter((branch) => branch._count.locations === 0).length,
    withAssets: branches.filter((branch) => branch._count.assets > 0).length,
    withoutAssets: branches.filter((branch) => branch._count.assets === 0).length,
  }
}

export function buildEmployeeSummary(employees: EmployeeSummaryItem[]) {
  return {
    total: employees.length,
    active: employees.filter((employee) => employee.employmentStatus === "active").length,
    inactive: employees.filter((employee) => employee.employmentStatus !== "active").length,
    withAssets: employees.filter((employee) => employee._count.custodianAssets > 0).length,
    withoutAssets: employees.filter((employee) => employee._count.custodianAssets === 0).length,
    formerWithAssets: employees.filter((employee) => employee.employmentStatus !== "active" && employee._count.custodianAssets > 0).length,
  }
}

export function buildSupplierSummary(suppliers: SupplierSummaryItem[]) {
  return {
    total: suppliers.length,
    withAssets: suppliers.filter((supplier) => supplier._count.assets > 0).length,
    withoutAssets: suppliers.filter((supplier) => supplier._count.assets === 0).length,
    withPurchaseDocuments: suppliers.filter((supplier) => supplier._count.purchaseDocuments > 0).length,
    withoutPurchaseDocuments: suppliers.filter((supplier) => supplier._count.purchaseDocuments === 0).length,
  }
}

export function getCompanyDeleteBlockReason(counts: {
  branches: number
  departments: number
  employees: number
  assets: number
  auditRounds: number
}) {
  const reasons = [
    counts.branches > 0 ? `สาขา ${counts.branches} รายการ` : null,
    counts.departments > 0 ? `แผนก ${counts.departments} รายการ` : null,
    counts.employees > 0 ? `พนักงาน ${counts.employees} รายการ` : null,
    counts.assets > 0 ? `ทรัพย์สิน ${counts.assets} รายการ` : null,
    counts.auditRounds > 0 ? `รอบตรวจนับ ${counts.auditRounds} รายการ` : null,
  ].filter((reason): reason is string => Boolean(reason))

  if (reasons.length === 0) return null
  return `ไม่สามารถลบบริษัทนี้ได้ เพราะยังมี${joinThaiList(reasons)}ใช้งานอยู่`
}

export function getBranchDeleteBlockReason(counts: {
  locations: number
  employees: number
  assets: number
  auditRounds: number
}) {
  const reasons = [
    counts.locations > 0 ? `พื้นที่ ${counts.locations} รายการ` : null,
    counts.employees > 0 ? `พนักงาน ${counts.employees} รายการ` : null,
    counts.assets > 0 ? `ทรัพย์สิน ${counts.assets} รายการ` : null,
    counts.auditRounds > 0 ? `รอบตรวจนับ ${counts.auditRounds} รายการ` : null,
  ].filter((reason): reason is string => Boolean(reason))

  if (reasons.length === 0) return null
  return `ไม่สามารถลบสาขานี้ได้ เพราะยังมี${joinThaiList(reasons)}ใช้งานอยู่`
}

export function getEmployeeDeleteBlockReason(counts: {
  custodianAssets: number
  subordinates: number
  userAccounts: number
  openCheckouts: number
  auditRounds: number
}) {
  const reasons = [
    counts.custodianAssets > 0 ? `ทรัพย์สินที่ถือครอง ${counts.custodianAssets} รายการ` : null,
    counts.subordinates > 0 ? `ผู้ใต้บังคับบัญชา ${counts.subordinates} รายการ` : null,
    counts.userAccounts > 0 ? `บัญชีผู้ใช้ ${counts.userAccounts} รายการ` : null,
    counts.openCheckouts > 0 ? `รายการส่งมอบค้างคืน ${counts.openCheckouts} รายการ` : null,
    counts.auditRounds > 0 ? `รอบตรวจนับ ${counts.auditRounds} รายการ` : null,
  ].filter((reason): reason is string => Boolean(reason))

  if (reasons.length === 0) return null
  return `ไม่สามารถลบพนักงานนี้ได้ เพราะยังมี${joinThaiList(reasons)}ใช้งานอยู่`
}

export function getSupplierDeleteBlockReason(counts: {
  assets: number
  maintenanceTickets: number
  purchaseDocuments: number
}) {
  const reasons = [
    counts.assets > 0 ? `ทรัพย์สิน ${counts.assets} รายการ` : null,
    counts.maintenanceTickets > 0 ? `งานซ่อม ${counts.maintenanceTickets} รายการ` : null,
    counts.purchaseDocuments > 0 ? `เอกสารจัดซื้อ ${counts.purchaseDocuments} รายการ` : null,
  ].filter((reason): reason is string => Boolean(reason))

  if (reasons.length === 0) return null
  return `ไม่สามารถลบผู้ขายนี้ได้ เพราะยังมี${joinThaiList(reasons)}ใช้งานอยู่`
}

export function buildCompanyDrilldownHrefs({
  locale,
  companyId,
}: {
  locale: string
  companyId: string
}) {
  const encodedCompanyId = encodeURIComponent(companyId)
  return {
    assets: `/${locale}/assets?companyId=${encodedCompanyId}&page=1`,
    branches: `/${locale}/master-data/branches?companyId=${encodedCompanyId}&page=1`,
  }
}

export function buildBranchDrilldownHrefs({
  locale,
  branchId,
}: {
  locale: string
  branchId: string
}) {
  const encodedBranchId = encodeURIComponent(branchId)
  return {
    assets: `/${locale}/assets?branchId=${encodedBranchId}&page=1`,
    locations: `/${locale}/master-data/locations?branchId=${encodedBranchId}&page=1`,
  }
}

export function buildEmployeeDrilldownHrefs({
  locale,
  employeeId,
}: {
  locale: string
  employeeId: string
}) {
  const encodedEmployeeId = encodeURIComponent(employeeId)
  return {
    assets: `/${locale}/assets?custodianId=${encodedEmployeeId}&page=1`,
  }
}

export function buildSupplierDrilldownHrefs({
  locale,
  supplierId,
}: {
  locale: string
  supplierId: string
}) {
  const encodedSupplierId = encodeURIComponent(supplierId)
  return {
    assets: `/${locale}/assets?supplierId=${encodedSupplierId}&page=1`,
  }
}

function firstValue(value: string | string[] | number | null | undefined) {
  if (Array.isArray(value)) return String(value[0] ?? "")
  return String(value ?? "")
}

function parsePositiveInteger(value: string | string[] | number | null | undefined, fallback: number) {
  const parsed = Number(firstValue(value))
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(1, Math.floor(parsed))
}

function parsePageSize(value: string | string[] | number | null | undefined) {
  const raw = firstValue(value).trim()
  if (!raw) return 25
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return 25
  return Math.min(100, Math.max(10, Math.floor(parsed)))
}

function parseFilter<TValue extends string>(
  value: string | string[] | null | undefined,
  allowedValues: readonly TValue[],
  fallback: TValue
) {
  const normalized = firstValue(value)
  return allowedValues.includes(normalized as TValue) ? (normalized as TValue) : fallback
}

function joinThaiList(values: string[]) {
  if (values.length <= 1) return values[0] ?? ""
  return `${values.slice(0, -1).join(", ")} และ${values.at(-1)}`
}
