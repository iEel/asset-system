import { getTranslations } from "next-intl/server"
import { DisposalBatchForm } from "@/components/disposal/disposal-batch-form"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
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

  return <div className="space-y-6">
    <PageHeader
      title={t("batchCreateTitle")}
      meta={t("batchCreateHelp")}
      back={<PageBackLink href={`/${locale}/disposal`} label={t("backToQueue")} />}
    />
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
