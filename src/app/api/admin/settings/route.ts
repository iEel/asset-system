import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { validationFailedBody } from "@/lib/api-error-exposure"
import { settingFieldKeyFor } from "@/lib/field-errors"
import { logAudit } from "@/lib/audit-log"
import { CHECKIN_DEPARTMENT_SETTING_KEY, normalizeCheckinDepartmentCode } from "@/lib/checkin-department"
import { fieldErrorResponse } from "@/lib/field-error-response"
import { knownSystemSettingKeys, systemSettingDefaults } from "@/lib/system-setting-defaults"
import { systemSettingsUpdateSchema } from "@/lib/validations/system-settings"
import {
  dropEmptySecretSettings,
  getRestrictedSettingChangeError,
  ldapEndpointChangeNeedsPassword,
  maskSecretSystemSettings,
  redactSecretSettingValues,
  resolveSubmittedSecretSettings,
} from "@/lib/system-setting-secrets"

export async function GET() {
  try {
    const user = await requireAuth()
    requirePermission(user, "setting", "view")

    const existingSettings = await prisma.systemSetting.findMany({
      orderBy: { key: "asc" },
    })
    const existingKeys = new Set(existingSettings.map((setting) => setting.key))
    const missingDefaults = systemSettingDefaults.filter((setting) => !existingKeys.has(setting.key))
    const settings =
      missingDefaults.length > 0
        ? [
            ...existingSettings,
            ...missingDefaults.map((setting) => ({
              id: setting.key,
              key: setting.key,
              value: setting.value,
              description: setting.description,
              updatedAt: new Date(),
              updatedBy: null,
            })),
          ].sort((a, b) => a.key.localeCompare(b.key))
        : existingSettings

    return NextResponse.json(maskSecretSystemSettings(settings))
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(request: NextRequest) {
  let submitted: unknown = null
  try {
    const user = await requireAuth()
    requirePermission(user, "setting", "edit")

    submitted = await request.json()
    const input = systemSettingsUpdateSchema.parse(submitted)
    const keys = input.settings.map((setting) => setting.key)
    const existingSettings = await prisma.systemSetting.findMany({
      where: { key: { in: keys } },
      select: { id: true, key: true, value: true },
    })
    const existingByKey = new Map(existingSettings.map((setting) => [setting.key, setting]))
    const typedSettings = dropEmptySecretSettings(input.settings)
    const endpointNeedsPassword = ldapEndpointChangeNeedsPassword({
      changed: Object.fromEntries(typedSettings.map((setting) => [setting.key, setting.value])),
      stored: Object.fromEntries(existingSettings.map((setting) => [setting.key, setting.value])),
    })
    const submittedSettings = resolveSubmittedSecretSettings(
      typedSettings,
      new Map(existingSettings.map((setting) => [setting.key, setting.value])),
    ).map((setting) => (setting.key === CHECKIN_DEPARTMENT_SETTING_KEY ? { ...setting, value: normalizeCheckinDepartmentCode(setting.value) } : setting))
    const missingKeys = keys.filter((key) => !existingByKey.has(key) && !knownSystemSettingKeys.has(key))
    if (missingKeys.length > 0) {
      return NextResponse.json({ error: `Unknown settings: ${missingKeys.join(", ")}` }, { status: 400 })
    }

    const changedSettings = submittedSettings.filter((setting) => {
      const existing = existingByKey.get(setting.key)
      const defaultSetting = systemSettingDefaults.find((item) => item.key === setting.key)
      return (existing?.value ?? defaultSetting?.value) !== setting.value
    })
    if (changedSettings.length === 0) {
      return NextResponse.json({ updated: 0 })
    }
    const restrictedChangeError = getRestrictedSettingChangeError(
      changedSettings.map((setting) => setting.key),
      user.roles,
    )
    if (restrictedChangeError) {
      return NextResponse.json({ error: restrictedChangeError }, { status: 403 })
    }
    // After the role check, so a non-admin repointing LDAP still reads 403 (spec §15 item 3).
    if (endpointNeedsPassword) {
      return fieldErrorResponse({
        status: 400,
        error: "LDAP_PASSWORD_REQUIRED",
        code: "LDAP_PASSWORD_REQUIRED",
        fieldErrors: { "settings.ldap_bind_password": "ldapPasswordRequired" },
      })
    }
    // The return department (group 3 spec §12, P2-R8) must name an active department. Only a changed value is read:
    // a department closed later must not block saving unrelated settings, and the return itself refuses then.
    const checkinDepartmentChange = changedSettings.find((setting) => setting.key === CHECKIN_DEPARTMENT_SETTING_KEY)
    if (checkinDepartmentChange) {
      const department = await prisma.department.findFirst({
        where: { code: checkinDepartmentChange.value, isActive: true },
        select: { id: true },
      })
      if (!department) {
        return fieldErrorResponse({
          status: 400,
          error: "CHECKIN_DEPARTMENT_CODE_UNKNOWN",
          code: "CHECKIN_DEPARTMENT_CODE_UNKNOWN",
          fieldErrors: { [`settings.${CHECKIN_DEPARTMENT_SETTING_KEY}`]: "checkinDepartmentCodeUnknown" },
        })
      }
    }

    await prisma.$transaction(
      changedSettings.map((setting) => {
        const defaultSetting = systemSettingDefaults.find((item) => item.key === setting.key)
        return prisma.systemSetting.upsert({
          where: { key: setting.key },
          update: {
            value: setting.value,
            updatedBy: user.id,
          },
          create: {
            key: setting.key,
            value: setting.value,
            description: defaultSetting?.description,
            updatedBy: user.id,
          },
        })
      })
    )

    await logAudit({
      userId: user.id,
      action: "update",
      module: "setting",
      recordId: "system_settings",
      oldValue: redactSecretSettingValues(Object.fromEntries(
        changedSettings.map((setting) => {
          const defaultSetting = systemSettingDefaults.find((item) => item.key === setting.key)
          return [setting.key, existingByKey.get(setting.key)?.value ?? defaultSetting?.value]
        })
      )),
      newValue: redactSecretSettingValues(Object.fromEntries(changedSettings.map((setting) => [setting.key, setting.value]))),
    })

    return NextResponse.json({ updated: changedSettings.length })
  } catch (error) {
    // Each setting's error goes under settings.<key>, the field the form shows it under (V track spec §6.1).
    const validation = validationFailedBody(error, settingFieldKeyFor(submitted))
    if (validation) return NextResponse.json(validation, { status: 400 })
    return errorResponse(error, 400)
  }
}
