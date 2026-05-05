import { prisma } from "@/lib/db"
import { logAudit } from "@/lib/audit-log"
import { searchLdapSyncUsers, type LdapConfigInput } from "@/lib/ldap-auth"
import { ldapSettingKeys } from "@/lib/system-setting-defaults"

type LdapSyncProfile = Awaited<ReturnType<typeof searchLdapSyncUsers>>[number]

export type LdapSyncPreview = {
  total: number
  creates: LdapSyncChange[]
  updates: LdapSyncChange[]
  deactivates: LdapSyncChange[]
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
  const profiles = await searchLdapSyncUsers(resolvedSettings)
  const profilesByCode = new Map(profiles.map((profile) => [profile.code, profile]))
  const orgLookup = await loadOrgLookup()
  const orgDefaults = await resolveOrgDefaults(resolvedSettings, orgLookup)
  const existingEmployees = await prisma.employee.findMany({
    select: {
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
      deactivates.push({
        code: employee.code,
        name: employee.fullNameTh,
        email: employee.email,
        reason: "Missing from LDAP sync result",
      })
    }
  }

  return {
    total: profiles.length,
    creates,
    updates,
    deactivates,
    blockers,
  }
}

export async function applyLdapSync(userId?: string, settings?: LdapConfigInput): Promise<LdapSyncApplyResult> {
  const resolvedSettings = settings ?? await loadLdapSettings()
  const preview = await previewLdapSync(resolvedSettings)
  if (preview.blockers.length > 0) {
    return {
      ...preview,
      applied: { created: 0, updated: 0, deactivated: 0 },
    }
  }

  const profiles = await searchLdapSyncUsers(resolvedSettings)
  const orgLookup = await loadOrgLookup()
  const orgDefaults = await resolveOrgDefaults(resolvedSettings, orgLookup)

  const profilesByCode = new Map(profiles.map((profile) => [profile.code, profile]))
  let created = 0
  let updated = 0
  let deactivated = 0

  await prisma.$transaction(async (tx) => {
    for (const profile of profiles) {
      const existing = await tx.employee.findUnique({
        where: { code: profile.code },
        select: { id: true },
      })

      if (existing) {
        await tx.employee.update({
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
        await tx.user.updateMany({
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
      } else {
        const orgMapping = resolveOrgMapping(profile, orgLookup, orgDefaults)
        if (!orgMapping) {
          throw new Error(buildOrgMappingBlocker(profile))
        }

        await tx.employee.create({
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
    }

    if (resolvedSettings.ldap_sync_deactivate_missing === "true") {
      const activeEmployees = await tx.employee.findMany({
        where: { isActive: true },
        select: { code: true },
      })

      for (const employee of activeEmployees) {
        if (!profilesByCode.has(employee.code)) {
          await tx.employee.update({
            where: { code: employee.code },
            data: {
              isActive: false,
              employmentStatus: "resigned",
              updatedBy: userId,
            },
          })
          deactivated += 1
        }
      }
    }
  })

  const result = {
    ...preview,
    applied: {
      created,
      updated,
      deactivated,
    },
  }

  await logAudit({
    userId,
    action: "ldap_sync",
    module: "employee",
    recordId: "ldap_sync",
    newValue: result,
    remark: "LDAP employee sync applied",
  })

  return result
}

type OrgLookup = Awaited<ReturnType<typeof loadOrgLookup>>

type OrgMapping = {
  companyId: string
  branchId: string
  departmentId: string
}

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

function resolveOrgMapping(profile: LdapSyncProfile, lookup: OrgLookup, defaults: OrgMapping | null): OrgMapping | null {
  const company = findCompany(lookup, profile.companyName)
  const companyId = company?.id ?? defaults?.companyId
  const branch = findBranch(lookup, profile.branchName, companyId)
  const department = findDepartment(lookup, profile.departmentName, companyId)
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

function findBranch(lookup: OrgLookup, value: string | null | undefined, companyId: string | undefined) {
  const normalized = normalizeOrgValue(value)
  if (!normalized) return null

  return lookup.branches.find((branch) =>
    (!companyId || branch.companyId === companyId) &&
    [branch.code, branch.name].some((candidate) => normalizeOrgValue(candidate) === normalized)
  ) ?? null
}

function findDepartment(lookup: OrgLookup, value: string | null | undefined, companyId: string | undefined) {
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

async function resolveOrgDefaults(settings: LdapConfigInput, lookup: OrgLookup): Promise<OrgMapping | null> {
  const companyCode = settings.ldap_sync_default_company_code?.trim()
  const branchCode = settings.ldap_sync_default_branch_code?.trim()
  const departmentCode = settings.ldap_sync_default_department_code?.trim()

  if (!companyCode || !branchCode || !departmentCode) {
    return null
  }

  const company = findCompany(lookup, companyCode)
  const branch = findBranch(lookup, branchCode, company?.id)
  const department = findDepartment(lookup, departmentCode, company?.id)

  if (!company || !branch || !department) {
    return null
  }

  return {
    companyId: company.id,
    branchId: branch.id,
    departmentId: department.id,
  }
}

function buildOrgMappingBlocker(profile: LdapSyncProfile) {
  const company = profile.companyName || "-"
  const branch = profile.branchName || "-"
  const department = profile.departmentName || "-"
  return `Cannot map LDAP employee ${profile.code} to Company/Branch/Department from company=${company}, branch=${branch}, department=${department}; set matching master data or fallback defaults.`
}

function toChange(profile: LdapSyncProfile, reason: string): LdapSyncChange {
  return {
    code: profile.code,
    name: profile.displayName,
    email: profile.email,
    reason,
  }
}
