import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { ColumnHeader } from "@/components/master-data/master-data-layout"
import { formatDate } from "@/lib/utils"

type AuditRoundDetailPageProps = {
  params: Promise<{ locale: string; id: string }>
}

export default async function AuditRoundDetailPage({ params }: AuditRoundDetailPageProps) {
  const { locale, id } = await params
  await requirePagePermission(locale, "audit", "view")
  const t = await getTranslations("auditRound")
  const tCommon = await getTranslations("common")

  const round = await prisma.auditRound.findFirst({
    where: { id, isActive: true },
    include: {
      scopeCompany: { select: { code: true, nameTh: true } },
      scopeBranch: { select: { code: true, name: true } },
      scopeDepartment: { select: { code: true, name: true } },
      scopeLocation: { select: { code: true, name: true } },
      scopeCategory: { select: { code: true, name: true } },
      items: {
        take: 100,
        orderBy: [{ auditStatus: "asc" }, { createdAt: "desc" }],
        include: {
          asset: {
            select: {
              assetTag: true,
              name: true,
              currentLocation: { select: { code: true, name: true } },
              custodian: { select: { code: true, fullNameTh: true } },
              condition: { select: { nameTh: true } },
            },
          },
        },
      },
      _count: { select: { items: true, findings: true } },
    },
  })
  if (!round) notFound()

  const pending = round.items.filter((item) => item.auditStatus === "pending").length
  const scanned = round.items.filter((item) => item.auditStatus === "scanned").length
  const progress = round._count.items > 0 ? Math.round(((round._count.items - pending) / round._count.items) * 100) : 0

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={`/${locale}/audit/rounds`} className="text-sm text-primary hover:underline">
            {tCommon("back")}
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-foreground">{round.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {round.auditNo} • {formatDate(round.startDate)} - {formatDate(round.endDate)}
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-warning/10 px-3 py-1 text-sm font-medium text-warning">
          {round.status}
        </span>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Metric label={t("totalExpected")} value={round._count.items} />
        <Metric label={t("pending")} value={pending} />
        <Metric label={t("scanned")} value={scanned} />
        <Metric label={t("progress")} value={`${progress}%`} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">{t("expectedAssets")}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <ColumnHeader>{t("assetTag")}</ColumnHeader>
                <ColumnHeader>{t("assetName")}</ColumnHeader>
                <ColumnHeader>{t("expectedLocation")}</ColumnHeader>
                <ColumnHeader>{t("expectedCustodian")}</ColumnHeader>
                <ColumnHeader>{t("status")}</ColumnHeader>
                <ColumnHeader>{t("result")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {round.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                round.items.map((item) => (
                  <tr key={item.id} className="hover:bg-accent/50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{item.asset.assetTag}</td>
                    <td className="min-w-56 px-4 py-3 text-foreground">{item.asset.name}</td>
                    <td className="min-w-56 px-4 py-3 text-muted-foreground">
                      {item.asset.currentLocation.code} - {item.asset.currentLocation.name}
                    </td>
                    <td className="min-w-56 px-4 py-3 text-muted-foreground">
                      {item.asset.custodian ? `${item.asset.custodian.code} - ${item.asset.custodian.fullNameTh}` : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{item.auditStatus}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{item.auditResult ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  )
}
