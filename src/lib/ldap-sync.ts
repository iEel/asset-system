import { prisma } from "@/lib/db"
import { logAudit } from "@/lib/audit-log"
import { searchLdapSyncUsers, type LdapConfigInput } from "@/lib/ldap-auth"
import { resolveLdapSyncAuditMetadata, type LdapSyncSource } from "@/lib/ldap-sync-audit"
import {
  buildLdapDeactivationImpacts,
  getActiveUserIdsForDeactivatedEmployees,
  type LdapDeactivationImpact,
} from "@/lib/ldap-sync-impact"
import { evaluateLdapDeactivationSafety, ldapSyncMaxScheduledDeactivationsKey } from "@/lib/ldap-sync-safety"
import { ldapSettingKeys } from "@/lib/system-setting-defaults"

type LdapSyncProfile = Awaited<ReturnType<typeof searchLdapSyncUsers>>[number]

export type LdapSyncPreview = {
  total: number
  creates: LdapSyncChange[]
  updates: LdapSyncChange[]
  deactivates: LdapSyncChange[]
  deactivationImpacts: LdapDeactivationImpact[]
  blockers: string[]
}

export type LdapSyncChange = {
  code: string
  name: string
  email: string | null
  reason: string
}

export type LdapSyncApplyResult = LdapSyncPreview & {
  applied: {
    created: number
    updated: number
    deactivated: number
    deactivatedUsers: number
  }
}

export async function loadLdapSettings(): Promise<LdapConfigInput> {
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: [...ldapSettingKeys] } },
    select: { key: true, value: true },
  })

  return Object.fromEntries(settings.map((setting) => [setting.key, setting.value])) as LdapConfigInput
}

export async function previewLdapSync(settings?: LdapConfigInput): Promise<LdapSyncPreview> {
  const resolvedSettings = settings ?? await loadLdapSettings()
  const profiles = await searchLdapSyncUsers(resolvedSettings, { requireSyncEnabled: false })
  const profilesByCode = new Map(profiles.map((profile) => [profile.code, profile]))
  const orgLookup = await loadOrgLookup()
  const orgDefaults = await resolveOrgDefaults(resolvedSettings, orgLookup)
  const existingEmployees = await prisma.employee.findMany({
    select: {
      id: true,
      code: true,
      fullNameTh: true,
      email: true,
      position: true,
      isActive: true,
      employmentStatus: true,
    },
  })
  const existingByCode = new Map(existingEmployees.map((employee) => [employee.code, employee]))
  const blockers: string[] = []

  const creates: LdapSyncChange[] = []
  const updates: LdapSyncChange[] = []
  const deactivates: LdapSyncChange[] = []
  const deactivationEmployees: Array<{
    id: string
    code: string
    fullNameTh: string
    email: string | null
  }> = []

  for (const profile of profiles) {
    const existing = existingByCode.get(profile.code)
    if (!existing) {
      const mapping = resolveOrgMapping(profile, orgLookup, orgDefaults)
      if (!mapping) {
        blockers.push(buildOrgMappingBlocker(profile))
      }

      creates.push(toChange(profile, "New LDAP user"))
      continue
    }

    const hasChanged =
      existing.fullNameTh !== profile.displayName ||
      (existing.email ?? "") !== (profile.email ?? "") ||
      (existing.position ?? "") !== (profile.position ?? "") ||
      !existing.isActive ||
      existing.employmentStatus !== "active"

    if (hasChanged) {
      updates.push(toChange(profile, "Profile changed"))
    }
  }

  for (const employee of existingEmployees) {
    if (!employee.isActive) continue
    if (!profilesByCode.has(employee.code)) {
      deactivationEmployees.push({
        id: employee.id,
        code: employee.code,
        fullNameTh: employee.fullNameTh,
        email: employee.email,
      })
      deactivates.push({
        code: employee.code,
        name: employee.fullNameTh,
        email: employee.email,
        reason: "Missing from LDAP sync result",
      })
    }
  }
  const deactivationImpacts = await loadDeactivationImpacts(deactivationEmployees)

  return {
    total: profiles.length,
    creates,
    updates,
    deactivates,
    deactivationImpacts,
    blockers,
  }
}

export async function applyLdapSync(
  userId?: string,
  settings?: LdapConfigInput,
  options: { source?: LdapSyncSource } = {}
): Promise<LdapSyncApplyResult> {
  const resolvedSettings = settings ?? await loadLdapSettings()
  const preview = await previewLdapSync(resolvedSettings)
  if (preview.blockers.length > 0) {
    return {
      ...preview,
      applied: { created: 0, updated: 0, deactivated: 0, deactivatedUsers: 0 },
    }
  }

  if (resolvedSettings.ldap_sync_enabled !== "true") {
    throw new Error("LDAP sync is not enabled")
  }

  const deactivationSafety = evaluateLdapDeactivationSafety({
    isScheduled: options.source === "scheduled",
    deactivateMissingEnabled: resolvedSettings.ldap_sync_deactivate_missing === "true",
    deactivationCount: preview.deactivates.length,
    maxScheduledDeactivations: resolvedSettings[ldapSyncMaxScheduledDeactivationsKey],
  })
  if (deactivationSafety.status === "blocked") {
    throw new Error(deactivationSafety.reason)
  }

  const orgLookup = await loadOrgLookup()
  const orgDefaults = await resolveOrgDefaults(resolvedSettings, orgLookup)
  const profiles = await searchLdapSyncUsers(resolvedSettings, { requireSyncEnabled: true })
  const profilesByCode = new Map(profiles.map((profile) => [profile.code, profile]))
  const createCodes = new Set(preview.creates.map((change) => change.code))
  const updateCodes = new Set(preview.updates.map((change) => change.code))
  const deactivateCodes = new Set(preview.deactivates.map((change) => change.code))

  let created = 0
  let updated = 0
  let deactivated = 0
  let deactivatedUsers = 0

  await runInBatches(
    profiles.filter((profile) => createCodes.has(profile.code)),
    async (profile) => {
      const orgMapping = resolveOrgMapping(profile, orgLookup, orgDefaults)
      if (!orgMapping) {
        throw new Error(buildOrgMappingBlocker(profile))
      }

      await prisma.employee.create({
        data: {
          code: profile.code,
          fullNameTh: profile.displayName,
          email: profile.email,
          position: profile.position,
          companyId: orgMapping.companyId,
          branchId: orgMapping.branchId,
          departmentId: orgMapping.departmentId,
          employmentStatus: "active",
          isActive: true,
          createdBy: userId,
          updatedBy: userId,
        },
      })
      created += 1
    }
  )

  await runInBatches(
    profiles.filter((profile) => updateCodes.has(profile.code)),
    async (profile) => {
      await prisma.employee.update({
        where: { code: profile.code },
        data: {
          fullNameTh: profile.displayName,
          email: profile.email,
          position: profile.position,
          employmentStatus: "active",
          isActive: true,
          updatedBy: userId,
        },
      })
      await prisma.user.updateMany({
        where: {
          OR: [
            { username: profile.username },
            ...(profile.email ? [{ email: profile.email }] : []),
          ],
        },
        data: {
          displayName: profile.displayName,
          ...(profile.email ? { email: profile.email } : {}),
        },
      })
      updated += 1
    }
  )

  if (resolvedSettings.ldap_sync_deactivate_missing === "true") {
    const deactivateEmployeeIds = preview.deactivationImpacts.map((impact) => impact.employeeId)
    await runInBatches(
      preview.deactivates.filter((employee) => deactivateCodes.has(employee.code) && !profilesByCode.has(employee.code)),
      async (employee) => {
        await prisma.employee.update({
          where: { code: employee.code },
          data: {
            isActive: false,
            employmentStatus: "resigned",
            updatedBy: userId,
          },
        })
        deactivated += 1
      }
    )
    if (deactivateEmployeeIds.length > 0) {
      const linkedUsers = await prisma.user.findMany({
        where: { employeeId: { in: deactivateEmployeeIds } },
        select: { id: true, employeeId: true, username: true, isActive: true },
      })
      const userIdsToDeactivate = getActiveUserIdsForDeactivatedEmployees({
        employeeIds: deactivateEmployeeIds,
        users: linkedUsers,
      })
      if (userIdsToDeactivate.length > 0) {
        const result = await prisma.user.updateMany({
          where: { id: { in: userIdsToDeactivate } },
          data: { isActive: false },
        })
        deactivatedUsers = result.count
      }
    }
  }

  const result = {
    ...preview,
    applied: {
      created,
      updated,
      deactivated,
      deactivatedUsers,
    },
  }

  const auditMetadata = resolveLdapSyncAuditMetadata(userId, options.source)
  await logAudit({
    userId: auditMetadata.userId,
    action: "ldap_sync",
    module: "employee",
    recordId: "ldap_sync",
    newValue: result,
    remark: auditMetadata.remark,
  })

  return result
}

type OrgLookup = Awaited<ReturnType<typeof loadOrgLookup>>

type OrgMapping = {
  companyId: string
  branchId: string
  departmentId: string
}

type OrgDefaults = Partial<OrgMapping>

async function loadOrgLookup() {
  const [companies, branches, departments] = await Promise.all([
    prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, code: true, nameTh: true, nameEn: true },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, companyId: true },
    }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, companyId: true },
    }),
  ])

  return { companies, branches, departments }
}

function resolveOrgMapping(profile: LdapSyncProfile, lookup: OrgLookup, defaults: OrgDefaults | null): OrgMapping | null {
  const company = findCompany(lookup, profile.companyName)
  const companyId = company?.id ?? defaults?.companyId
  const branch = companyId ? findBranch(lookup, profile.branchName, companyId) : null
  const department = findDepartment(lookup, profile.departmentName, companyId) ?? findDepartment(lookup, profile.departmentName)
  const branchId = branch?.id ?? defaults?.branchId
  const departmentId = department?.id ?? defaults?.departmentId

  if (!companyId || !branchId || !departmentId) {
    return null
  }

  return {
    companyId,
    branchId,
    departmentId,
  }
}

function findCompany(lookup: OrgLookup, value: string | null | undefined) {
  const normalized = normalizeOrgValue(value)
  if (!normalized) return null

  return lookup.companies.find((company) =>
    [company.code, company.nameTh, company.nameEn].some((candidate) => normalizeOrgValue(candidate) === normalized)
  ) ?? null
}

function findBranch(lookup: OrgLookup, value: string | null | undefined, companyId?: string) {
  const normalized = normalizeOrgValue(value)
  if (!normalized) return null

  return lookup.branches.find((branch) =>
    (!companyId || branch.companyId === companyId) &&
    [branch.code, branch.name].some((candidate) => normalizeOrgValue(candidate) === normalized)
  ) ?? null
}

function findDepartment(lookup: OrgLookup, value: string | null | undefined, companyId?: string) {
  const normalized = normalizeOrgValue(value)
  if (!normalized) return null

  return lookup.departments.find((department) =>
    (!companyId || !department.companyId || department.companyId === companyId) &&
    [department.code, department.name].some((candidate) => normalizeOrgValue(candidate) === normalized)
  ) ?? null
}

function normalizeOrgValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ""
}

async function resolveOrgDefaults(settings: LdapConfigInput, lookup: OrgLookup): Promise<OrgDefaults | null> {
  const companyCode = settings.ldap_sync_default_company_code?.trim()
  const branchCode = settings.ldap_sync_default_branch_code?.trim()
  const departmentCode = settings.ldap_sync_default_department_code?.trim()

  if (!companyCode && !branchCode && !departmentCode) {
    return null
  }

  const company = companyCode ? findCompany(lookup, companyCode) : null
  const branch = branchCode ? findBranch(lookup, branchCode, company?.id) : null
  const department = departmentCode ? findDepartment(lookup, departmentCode, company?.id) : null

  return {
    ...(company ? { companyId: company.id } : {}),
    ...(branch ? { branchId: branch.id } : {}),
    ...(department ? { departmentId: department.id } : {}),
  }
}

function buildOrgMappingBlocker(profile: LdapSyncProfile) {
  const company = profile.companyName || "-"
  const branch = profile.branchName || "-"
  const department = profile.departmentName || "-"
  return `Cannot map LDAP employee ${profile.code} to Company/Branch/Department from company=${company}, branch=${branch}, department=${department}; set matching Company master data and reusable Branch/Department master data, or fallback defaults.`
}

function toChange(profile: LdapSyncProfile, reason: string): LdapSyncChange {
  return {
    code: profile.code,
    name: profile.displayName,
    email: profile.email,
    reason,
  }
}

async function runInBatches<T>(items: T[], action: (item: T) => Promise<void>, batchSize = 10) {
  for (let index = 0; index < items.length; index += batchSize) {
    await Promise.all(items.slice(index, index + batchSize).map((item) => action(item)))
  }
}

async function loadDeactivationImpacts(employees: Array<{
  id: string
  code: string
  fullNameTh: string
  email: string | null
}>) {
  const employeeIds = employees.map((employee) => employee.id)
  if (employeeIds.length === 0) return []

  const [assets, users] = await Promise.all([
    prisma.asset.findMany({
      where: { isActive: true, custodianId: { in: employeeIds } },
      select: { id: true, assetTag: true, name: true, custodianId: true },
      orderBy: { assetTag: "asc" },
    }),
    prisma.user.findMany({
      where: { employeeId: { in: employeeIds } },
      select: { id: true, employeeId: true, username: true, isActive: true },
    }),
  ])

  return buildLdapDeactivationImpacts({ employees, assets, users })
}
