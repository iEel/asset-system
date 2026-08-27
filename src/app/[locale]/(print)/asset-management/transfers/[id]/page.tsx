import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { hasPermission } from "@/lib/auth-utils"
import { buildReferenceLabelMap, labelOrDash } from "@/lib/asset-operation-document"
import { parseAssetTransactionSnapshot } from "@/lib/asset-transaction-snapshot"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { normalizeAssetReturnTo } from "@/lib/asset-return-navigation"
import { formatDateTime } from "@/lib/utils"
import { OperationDocumentPrint } from "@/components/asset-operations/operation-document-print"
import { TransactionCancelDialog } from "@/components/asset-operations/transaction-cancel-dialog"

type TransferPrintPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function TransferPrintPage({ params, searchParams }: TransferPrintPageProps) {
  const { locale, id } = await params
  const filters = await searchParams
  const user = await requirePagePermission(locale, "asset", "view")
  const t = await getTranslations("transfer")
  const tAsset = await getTranslations("asset")
  const tCheckout = await getTranslations("checkout")
  const tCommon = await getTranslations("common")
  const tCancellation = await getTranslations("transactionCancellation")

  const transfer = await prisma.assetTransfer.findUnique({
    where: { id },
    include: {
      asset: {
        select: {
          id: true,
          assetTag: true,
          name: true,
          serialNumber: true,
          fixedAssetCode: true,
          company: { select: { code: true, nameTh: true } },
          branch: { select: { code: true, name: true } },
          category: { select: { code: true, name: true } },
        },
      },
    },
  })
  if (!transfer) notFound()

  const beforeSnapshot = parseAssetTransactionSnapshot(transfer.beforeSnapshotJson)
  const afterSnapshot = parseAssetTransactionSnapshot(transfer.afterSnapshotJson)
  const labels = await buildReferenceLabelMap([
    beforeSnapshot?.statusId,
    beforeSnapshot?.conditionId,
    beforeSnapshot?.currentLocationId,
    beforeSnapshot?.departmentId,
    afterSnapshot?.statusId,
    afterSnapshot?.conditionId,
    afterSnapshot?.currentLocationId,
    afterSnapshot?.departmentId,
  ])

  return (
    <OperationDocumentPrint
      title={t("title")}
      subtitle={`${transfer.asset.assetTag} - ${transfer.asset.name}`}
      backHref={filters.returnTo
        ? normalizeAssetReturnTo(locale, filters.returnTo)
        : `/${locale}/assets/${transfer.asset.id}`}
      backLabel={tCommon("back")}
      printLabel={t("printDocument")}
      toolbarActions={hasPermission(user, "asset", "edit") && transfer.transactionStatus === "active" ? (
        <TransactionCancelDialog
          type="transfer"
          transactionId={transfer.id}
          expectedUpdatedAt={transfer.updatedAt.toISOString()}
          originalOperator={transfer.createdBy}
          currentState={formatSnapshotState(afterSnapshot, labels)}
          restoreState={formatSnapshotState(beforeSnapshot, labels)}
          componentCount={beforeSnapshot?.components.length ?? 0}
          labels={buildCancellationLabels(tCancellation)}
        />
      ) : null}
      voidInfo={transfer.transactionStatus === "void" ? {
        label: tCancellation("voidLabel"),
        voidReasonLabel: tCancellation("voidReason"),
        voidedByLabel: tCancellation("voidedBy"),
        voidedAtLabel: tCancellation("voidedAt"),
        voidReason: transfer.voidReason,
        voidedBy: transfer.voidedBy,
        voidedAt: formatDateTime(transfer.voidedAt),
      } : null}
      sections={[
        {
          title: tCheckout("documentInfo"),
          fields: [
            { label: tCheckout("documentNo"), value: transfer.documentNo },
            { label: tCheckout("createdAt"), value: formatDateTime(transfer.createdAt) },
            { label: t("reason"), value: transfer.reason },
            { label: t("remark"), value: transfer.remark },
          ],
        },
        {
          title: tCheckout("assetInfo"),
          fields: [
            { label: tAsset("assetTag"), value: transfer.asset.assetTag },
            { label: tAsset("assetName"), value: transfer.asset.name },
            { label: tAsset("serialNumber"), value: transfer.asset.serialNumber },
            { label: tAsset("fixedAssetCode"), value: transfer.asset.fixedAssetCode },
            { label: tAsset("category"), value: `${transfer.asset.category.code} - ${transfer.asset.category.name}` },
            { label: tAsset("company"), value: `${transfer.asset.company.code} - ${transfer.asset.company.nameTh}` },
            { label: tAsset("branch"), value: `${transfer.asset.branch.code} - ${transfer.asset.branch.name}` },
          ],
        },
        {
          title: t("reviewDestination"),
          fields: [
            { label: t("from"), value: formatSnapshotState(beforeSnapshot, labels) },
            { label: t("reviewDestination"), value: formatSnapshotState(afterSnapshot, labels) },
            { label: tAsset("currentLocation"), value: labelOrDash(labels, afterSnapshot?.currentLocationId) },
            { label: tAsset("department"), value: labelOrDash(labels, afterSnapshot?.departmentId) },
          ],
        },
      ]}
      signatures={[
        { title: tCheckout("checkedOutBy"), helper: tCheckout("signatureDate") },
        { title: tCheckout("approver"), helper: tCheckout("signatureDate") },
      ]}
    />
  )
}

function formatSnapshotState(snapshot: ReturnType<typeof parseAssetTransactionSnapshot>, labels: Map<string, string>) {
  if (!snapshot) return "-"
  return `${labelOrDash(labels, snapshot.statusId)} · ${labelOrDash(labels, snapshot.currentLocationId)}`
}

function buildCancellationLabels(t: Awaited<ReturnType<typeof getTranslations>>) {
  return {
    action: t("action"), title: t("title"), description: t("description"), reasonLabel: t("reasonLabel"),
    reasonPlaceholder: t("reasonPlaceholder"), confirm: t("confirm"), cancel: t("cancel"), loading: t("loading"),
    blockedTitle: t("blockedTitle"), blockedDescription: t("blockedDescription"), success: t("success"), error: t("error"),
    reasonTooShort: t("reasonTooShort"), operator: t("operator"), currentState: t("currentState"), restoreState: t("restoreState"),
    components: t("components"), blockers: {
      unsupported_snapshot: t("blockers.unsupported_snapshot"), not_active: t("blockers.not_active"), not_latest: t("blockers.not_latest"),
      asset_changed: t("blockers.asset_changed"), components_changed: t("blockers.components_changed"), downstream_work: t("blockers.downstream_work"),
    },
  }
}
