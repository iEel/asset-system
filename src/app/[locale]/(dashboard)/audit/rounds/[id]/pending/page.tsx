import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { ColumnHeader } from "@/components/master-data/master-data-layout"
import { AuditMarkNotFoundButton } from "@/components/audit/audit-mark-not-found-button"
import { formatDateTime } from "@/lib/utils"

type AuditPendingPageProps = {
  params: Promise<{ locale: string; id: string }>
}

export default async function AuditPendingPage({ params }: AuditPendingPageProps) {
  const { locale, id } = await params
  await requirePagePermission(locale, "audit", "view")
  const t = await getTranslations("auditPending")
  const tCommon = await getTranslations("common")

  const round = await prisma.auditRound.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      auditNo: true,
      name: true,
      items: {
        where: { auditStatus: "pending" },
        take: 200,
        orderBy: { createdAt: "asc" },
        include: {
          asset: {
            select: {
              assetTag: true,
              name: true,
              currentLocation: { select: { code: true, name: true } },
              custodian: { select: { code: true, fullNameTh: true } },
              movements: {
                where: { movementType: { contains: "audit" } },
                orderBy: { performedAt: "desc" },
                take: 1,
                select: { performedAt: true },
              },
            },
          },
        },
      },
    },
  })
  if (!round) notFound()

  return (
    <div>
      <div className="mb-6">
        <Link href={`/${locale}/audit/rounds/${round.id}`} className="text-sm text-primary hover:underline">
          {tCommon("back")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {round.auditNo} - {round.name}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <ColumnHeader>{t("assetTag")}</ColumnHeader>
                <ColumnHeader>{t("assetName")}</ColumnHeader>
                <ColumnHeader>{t("expectedLocation")}</ColumnHeader>
                <ColumnHeader>{t("expectedCustodian")}</ColumnHeader>
                <ColumnHeader>{t("lastAuditDate")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
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
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatDateTime(item.asset.movements[0]?.performedAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <AuditMarkNotFoundButton itemId={item.id} />
                    </td>
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
