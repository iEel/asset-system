import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { DisposalBatchForm } from "@/components/disposal/disposal-batch-form"
import { buttonVariants } from "@/components/ui/button-variants"
import { Notice } from "@/components/ui/notice"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { requirePagePermission } from "@/lib/page-auth"
import { prisma } from "@/lib/db"
import { defaultDisposalRequester } from "@/lib/disposal-request-form-rules"
import { isDisposalBatchSchemaReady } from "@/lib/disposal-schema-readiness"
import { ActionEmptyState } from "@/components/ui/action-empty-state"

const PENDING_DISPOSAL_STATUS = "Pending Disposal"

// สร้างชุดคำขอตัดจำหน่าย (DP-Batch-New, request batches spec §4). The form is for the computer: below md the page shows
// only its header and a notice with a link to the single request form; the form itself hides there.
export default async function NewDisposalBatchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const user = await requirePagePermission(locale, "disposal", "create")
  const [t, schemaReady] = await Promise.all([
    getTranslations("disposalPage"),
    isDisposalBatchSchemaReady(),
  ])
  const back = <PageBackLink href={`/${locale}/disposal`} label={t("backToQueue")} />

  if (!schemaReady) {
    return <div className="space-y-6">
      <PageHeader title={t("batchCreateTitle")} meta={t("batchCreateHelp")} back={back} />
      <ActionEmptyState
        tone="error"
        title={t("batchSchemaMissingTitle")}
        description={t("batchSchemaMissingHelp")}
        actionHref={`/${locale}/disposal`}
        actionLabel={t("backToQueue")}
      />
    </div>
  }

  const [employees, pendingStatus] = await Promise.all([
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, code: true, fullNameTh: true, department: { select: { name: true } } },
      orderBy: { code: "asc" },
    }),
    prisma.assetStatus.findFirst({ where: { name: PENDING_DISPOSAL_STATUS, isActive: true }, select: { nameTh: true } }),
  ])
  // Pickers keep "code - name", and the requester's adds the department, as the single form (group 6 spec §8.3).
  const employeeOptions = employees.map((employee) => ({
    id: employee.id,
    label: `${employee.code} - ${employee.fullNameTh} · ${employee.department.name}`,
  }))
  // The requester starts as the signed-in user's employee; with no link it stays empty and the hint says so.
  const requester = defaultDisposalRequester({ employeeId: user.employeeId ?? null }, employeeOptions)

  return <>
    <div data-disposal-batch-phone className="space-y-6 md:hidden">
      <PageHeader title={t("batchCreateTitle")} meta={t("batchCreateHelp")} back={back} />
      <Notice
        tone="info"
        title={t("batchForm.phoneTitle")}
        action={<Link href={`/${locale}/disposal/new`} className={buttonVariants({ variant: "outline", size: "md" })}>{t("batchForm.phoneLink")}</Link>}
      />
    </div>
    <DisposalBatchForm
      breadcrumbs={[{ label: t("title"), href: `/${locale}/disposal` }, { label: t("batchCreateTitle") }]}
      back={back}
      locale={locale}
      cancelHref={`/${locale}/disposal`}
      employees={employeeOptions}
      initialRequesterId={requester.requestedById}
      requesterNeedsChoice={requester.needsChoice}
      pendingDisposalLabel={pendingStatus?.nameTh ?? PENDING_DISPOSAL_STATUS}
    />
  </>
}
