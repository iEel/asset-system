import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { DisposalBatchForm } from "@/components/disposal/disposal-batch-form"
import { requirePagePermission } from "@/lib/page-auth"
import { prisma } from "@/lib/db"
import { isDisposalBatchSchemaReady } from "@/lib/disposal-schema-readiness"
import { ActionEmptyState } from "@/components/ui/action-empty-state"

export default async function NewDisposalBatchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  await requirePagePermission(locale, "disposal", "create")
  const [t, schemaReady] = await Promise.all([
    getTranslations("disposalPage"),
    isDisposalBatchSchemaReady(),
  ])
  const employees = schemaReady ? await prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, code: true, fullNameTh: true },
      orderBy: { code: "asc" },
    }) : []
  const employeeOptions = employees.map((employee) => ({ id: employee.id, label: `${employee.code} - ${employee.fullNameTh}` }))

  return <div className="space-y-5">
    <div className="flex items-start gap-3">
      <Link href={`/${locale}/disposal`} aria-label={t("backToQueue")} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-surface hover:bg-accent"><ArrowLeft className="h-4 w-4" /></Link>
      <div><h1 className="text-2xl font-bold text-foreground">{t("batchCreateTitle")}</h1><p className="mt-1 text-sm text-muted-foreground">{t("batchCreateHelp")}</p></div>
    </div>
    {schemaReady ? <DisposalBatchForm employees={employeeOptions} /> : (
      <ActionEmptyState
        tone="error"
        title={t("batchSchemaMissingTitle")}
        description={t("batchSchemaMissingHelp")}
        actionHref={`/${locale}/disposal`}
        actionLabel={t("backToQueue")}
      />
    )}
  </div>
}
