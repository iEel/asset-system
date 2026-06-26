import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Eye, ScanLine } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { ColumnHeader, MasterDataSearch } from "@/components/master-data/master-data-layout"
import { AuditMarkNotFoundButton } from "@/components/audit/audit-mark-not-found-button"
import { formatDateTime } from "@/lib/utils"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"
import { appendOperationalReturnTo, normalizeAuditRoundDetailReturnTo, normalizeAuditRoundWorkflowReturnTo } from "@/lib/operational-return-navigation"
import { isAuditRoundReadOnlyStatus } from "@/lib/audit-round-status"

type AuditPendingPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[]; search?: string | string[] }>
}

type AuditPendingItem = {
  id: string
  asset: {
    id: string
    assetTag: string
    name: string
    currentLocation: { code: string; name: string }
    custodian: { code: string; fullNameTh: string } | null
    movements: Array<{ performedAt: Date }>
  }
}

export default async function AuditPendingPage({ params, searchParams }: AuditPendingPageProps) {
  const { locale, id } = await params
  const rawSearchParams = await searchParams
  const { search = "" } = rawSearchParams
  await requirePagePermission(locale, "audit", "view")
  const t = await getTranslations("auditPending")
  const tCommon = await getTranslations("common")
  const searchText = resolveFirstSearchParam(search).trim()

  const round = await prisma.auditRound.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      auditNo: true,
      name: true,
      status: true,
      items: {
        where: {
          auditStatus: "pending",
          ...(searchText
            ? {
                asset: {
                  OR: [
                    { assetTag: { contains: searchText } },
                    { name: { contains: searchText } },
                    {
                      currentLocation: {
                        OR: [
                          { code: { contains: searchText } },
                          { name: { contains: searchText } },
                        ],
                      },
                    },
                    {
                      custodian: {
                        OR: [
                          { code: { contains: searchText } },
                          { fullNameTh: { contains: searchText } },
                        ],
                      },
                    },
                  ],
                },
              }
            : {}),
        },
        take: 200,
        orderBy: { createdAt: "asc" },
        include: {
          asset: {
            select: {
              id: true,
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
  if (!round || isAuditRoundReadOnlyStatus(round.status)) notFound()
  const returnToHref = normalizeAuditRoundWorkflowReturnTo(locale, round.id, rawSearchParams.returnTo)
  const scanReturnToHref = resolveAuditPendingScanReturnTo(locale, round.id, returnToHref)
  const clearSearchHref = appendOperationalReturnTo(`/${locale}/audit/rounds/${round.id}/pending`, returnToHref)
  const emptyTitle = searchText ? t("emptySearchTitle") : t("emptyTitle")
  const emptyHelp = searchText ? t("emptySearchHelp") : t("emptyHelp")
  const emptyActionHref = searchText ? clearSearchHref : returnToHref
  const emptyActionLabel = searchText ? t("clearSearch") : tCommon("back")

  return (
    <div>
      <div className="mb-6">
        <Link href={returnToHref} className="text-sm text-primary hover:underline">
          {tCommon("back")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("subtitle", { round: `${round.auditNo} - ${round.name}` })}
        </p>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-surface p-3 text-sm text-muted-foreground shadow-sm sm:p-4">
        {t("pendingCount", { count: round.items.length })}
      </div>

      <MasterDataSearch
        action={`/${locale}/audit/rounds/${round.id}/pending`}
        defaultValue={searchText}
        placeholder={t("searchPlaceholder")}
        submitLabel={tCommon("search")}
        hiddenInputs={{ returnTo: returnToHref }}
      />

      <div className={`${getMobileCardListClasses()} mb-4`}>
        {round.items.length === 0 ? (
          <ActionEmptyState
            icon={<ScanLine className="h-6 w-6" />}
            title={emptyTitle}
            description={emptyHelp}
            actionHref={emptyActionHref}
            actionLabel={emptyActionLabel}
          />
        ) : (
          round.items.map((item) => (
            <AuditPendingMobileCard
              key={item.id}
              item={item}
              locale={locale}
              roundId={round.id}
              scanReturnToHref={scanReturnToHref}
              labels={{
                expectedLocation: t("expectedLocation"),
                expectedCustodian: t("expectedCustodian"),
                lastAuditDate: t("lastAuditDate"),
                scanPendingAsset: t("scanPendingAsset"),
                viewAsset: t("viewAsset"),
              }}
            />
          ))
        )}
      </div>

      <div className={`${getDesktopTableOnlyClasses()} overflow-hidden rounded-lg border border-border bg-surface shadow-sm`}>
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
                  <td colSpan={6} className="px-4 py-8">
                    <ActionEmptyState
                      icon={<ScanLine className="h-6 w-6" />}
                      title={emptyTitle}
                      description={emptyHelp}
                      actionHref={emptyActionHref}
                      actionLabel={emptyActionLabel}
                    />
                  </td>
                </tr>
              ) : (
                round.items.map((item) => (
                  <ClickableTableRow
                    key={item.id}
                    href={`/${locale}/assets/${item.asset.id}`}
                    label={`${tCommon("view")}: ${item.asset.assetTag}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{item.asset.assetTag}</td>
                    <td className="min-w-56 px-4 py-3 text-foreground">{item.asset.name}</td>
                    <td className="min-w-56 px-4 py-3 text-muted-foreground">
                      {formatAuditPendingLocation(item.asset.currentLocation)}
                    </td>
                    <td className="min-w-56 px-4 py-3 text-muted-foreground">
                      {formatAuditPendingCustodian(item.asset.custodian)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatDateTime(item.asset.movements[0]?.performedAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <AuditMarkNotFoundButton itemId={item.id} />
                    </td>
                  </ClickableTableRow>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function AuditPendingMobileCard({
  item,
  locale,
  roundId,
  scanReturnToHref,
  labels,
}: {
  item: AuditPendingItem
  locale: string
  roundId: string
  scanReturnToHref: string
  labels: {
    expectedLocation: string
    expectedCustodian: string
    lastAuditDate: string
    scanPendingAsset: string
    viewAsset: string
  }
}) {
  const scanHref = buildAuditPendingScanHref({ locale, roundId, assetId: item.asset.id, returnTo: scanReturnToHref })

  return (
    <article className="min-w-0 rounded-md border border-border bg-background p-4">
      <div className="min-w-0">
        <div className="break-words text-sm font-semibold text-foreground">{item.asset.assetTag}</div>
        <p className="mt-1 line-clamp-2 text-sm text-foreground">{item.asset.name}</p>
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        <PendingInfo label={labels.expectedLocation} value={formatAuditPendingLocation(item.asset.currentLocation)} />
        <PendingInfo label={labels.expectedCustodian} value={formatAuditPendingCustodian(item.asset.custodian)} />
        <PendingInfo label={labels.lastAuditDate} value={formatDateTime(item.asset.movements[0]?.performedAt)} />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Link
          href={scanHref}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 sm:col-span-1"
        >
          <ScanLine className="h-4 w-4" />
          {labels.scanPendingAsset}
        </Link>
        <Link
          href={`/${locale}/assets/${item.asset.id}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Eye className="h-4 w-4" />
          {labels.viewAsset}
        </Link>
        <AuditMarkNotFoundButton itemId={item.id} variant="button" />
      </div>
    </article>
  )
}

function PendingInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm text-foreground">{value}</div>
    </div>
  )
}

function formatAuditPendingLocation(location: { code: string; name: string }) {
  return `${location.code} - ${location.name}`
}

function formatAuditPendingCustodian(custodian: { code: string; fullNameTh: string } | null) {
  return custodian ? `${custodian.code} - ${custodian.fullNameTh}` : "-"
}

function resolveAuditPendingScanReturnTo(locale: string, roundId: string, returnToHref: string) {
  try {
    const url = new URL(returnToHref, "http://asset.local")
    const scanPath = `/${locale}/audit/rounds/${roundId}/scan`
    if (url.pathname !== scanPath) return returnToHref
    return normalizeAuditRoundDetailReturnTo(locale, roundId, url.searchParams.get("returnTo") ?? undefined)
  } catch {
    return normalizeAuditRoundDetailReturnTo(locale, roundId, undefined)
  }
}

function buildAuditPendingScanHref({ locale, roundId, assetId, returnTo }: { locale: string; roundId: string; assetId: string; returnTo: string }) {
  const params = new URLSearchParams({ assetId, returnTo })
  return `/${locale}/audit/rounds/${roundId}/scan?${params.toString()}`
}

function resolveFirstSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? ""
  return value ?? ""
}