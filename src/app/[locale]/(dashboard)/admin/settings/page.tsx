import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { SystemSettingsForm } from "@/components/admin/system-settings-form"

type SettingsPageProps = {
  params: Promise<{ locale: string }>
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale } = await params
  await requirePagePermission(locale, "setting", "view")
  const t = await getTranslations("systemSettingsPage")
  const tCommon = await getTranslations("common")

  const settings = await prisma.systemSetting.findMany({
    orderBy: { key: "asc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <SystemSettingsForm
        settings={settings.map((setting) => ({
          key: setting.key,
          value: setting.value,
          description: setting.description,
        }))}
        labels={{
          key: t("key"),
          value: t("value"),
          description: t("description"),
          save: tCommon("save"),
          success: t("savedSuccess"),
          error: tCommon("error"),
        }}
      />
    </div>
  )
}
