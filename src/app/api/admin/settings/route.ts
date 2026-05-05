import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { logAudit } from "@/lib/audit-log"
import { knownSystemSettingKeys, systemSettingDefaults } from "@/lib/system-setting-defaults"
import { systemSettingsUpdateSchema } from "@/lib/validations/system-settings"

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

    return NextResponse.json(settings)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "setting", "edit")

    const input = systemSettingsUpdateSchema.parse(await request.json())
    const keys = input.settings.map((setting) => setting.key)
    const existingSettings = await prisma.systemSetting.findMany({
      where: { key: { in: keys } },
      select: { id: true, key: true, value: true },
    })
    const existingByKey = new Map(existingSettings.map((setting) => [setting.key, setting]))
    const missingKeys = keys.filter((key) => !existingByKey.has(key) && !knownSystemSettingKeys.has(key))
    if (missingKeys.length > 0) {
      return NextResponse.json({ error: `Unknown settings: ${missingKeys.join(", ")}` }, { status: 400 })
    }

    const changedSettings = input.settings.filter((setting) => {
      const existing = existingByKey.get(setting.key)
      const defaultSetting = systemSettingDefaults.find((item) => item.key === setting.key)
      return (existing?.value ?? defaultSetting?.value) !== setting.value
    })
    if (changedSettings.length === 0) {
      return NextResponse.json({ updated: 0 })
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
      oldValue: Object.fromEntries(
        changedSettings.map((setting) => {
          const defaultSetting = systemSettingDefaults.find((item) => item.key === setting.key)
          return [setting.key, existingByKey.get(setting.key)?.value ?? defaultSetting?.value]
        })
      ),
      newValue: Object.fromEntries(changedSettings.map((setting) => [setting.key, setting.value])),
    })

    return NextResponse.json({ updated: changedSettings.length })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
