import { prisma } from "@/lib/db"

export type ScheduledJobStatusKeys = {
  lastRunAtKey: string
  lastStatusKey: string
  lastErrorKey: string
}

export function mapSystemSettings(settings: Array<{ key: string; value: string }>) {
  return new Map(settings.map((setting) => [setting.key, setting.value]))
}

export function getSettingValue(settings: Map<string, string>, key: string, fallback = "") {
  return settings.get(key) ?? fallback
}

export async function updateScheduledJobRunState({
  keys,
  status,
  error,
  ranAt = new Date(),
}: {
  keys: ScheduledJobStatusKeys
  status: "success" | "failed" | "skipped"
  error?: string | null
  ranAt?: Date
}) {
  await prisma.$transaction([
    upsertSetting(keys.lastRunAtKey, ranAt.toISOString(), "เวลาที่ scheduler ประมวลผลรอบล่าสุด"),
    upsertSetting(keys.lastStatusKey, status, "สถานะ scheduler รอบล่าสุด"),
    upsertSetting(keys.lastErrorKey, error ?? "", "Error ล่าสุดของ scheduler ถ้ามี"),
  ])
}

function upsertSetting(key: string, value: string, description: string) {
  return prisma.systemSetting.upsert({
    where: { key },
    update: { value, updatedBy: "system:scheduler" },
    create: {
      key,
      value,
      description,
      updatedBy: "system:scheduler",
    },
  })
}
