import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { buildReferenceLabelMap, labelOrDash } from "@/lib/asset-operation-document"
import { formatDate, formatDateTime } from "@/lib/utils"
import { OperationDocumentPrint } from "@/components/asset-operations/operation-document-print"
import { normalizeAssetReturnTo } from "@/lib/asset-return-navigation"
import { hasPermission } from "@/lib/auth-utils"
import { parseAssetTransactionSnapshot } from "@/lib/asset-transaction-snapshot"
import { TransactionCancelDialog } from "@/components/asset-operations/transaction-cancel-dialog"
import { linkVariants } from "@/components/ui/button-variants"
import { ASSET_MOVEMENT_DOCUMENT_PERMISSION } from "@/lib/asset-movement-labels"
import { buildCheckinDocumentLines, checkinDocumentReadIds, type CheckinDocumentLines } from "@/lib/checkin-document-lines"
import { buildCheckinDocumentMachineRows, readCheckinDocumentGroup } from "@/lib/checkin-document-group"
import { orNil } from "@/components/ui/nil"
import { formatCount } from "@/lib/display-format"
import type { Prisma } from "@prisma/client"

type CheckinPrintPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

const checkinInclude = {
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
  checkout: {
    select: {
      id: true,
      documentNo: true,
      checkoutType: true,
      handoverMode: true,
      checkoutDate: true,
      expectedReturnDate: true,
      custodianId: true,
      departmentId: true,
      locationId: true,
      parentAssetId: true,
      custodian: { select: { code: true, fullNameTh: true } },
    },
  },
} satisfies Prisma.AssetCheckinInclude

type CheckinDocumentRecord = Prisma.AssetCheckinGetPayload<{ include: typeof checkinInclude }>
type Translator = Awaited<ReturnType<typeof getTranslations>>

export default async function CheckinPrintPage({ params, searchParams }: CheckinPrintPageProps) {
  const { locale, id } = await params
  const filters = await searchParams
  const user = await requirePagePermission(locale, "asset", "view")

  const t = await getTranslations("checkin")
  const tCheckout = await getTranslations("checkout")
  const tAsset = await getTranslations("asset")
  const tCommon = await getTranslations("common")
  const tCancellation = await getTranslations("transactionCancellation")

  const checkin = await prisma.assetCheckin.findUnique({ where: { id }, include: checkinInclude })
  if (!checkin) notFound()

  // A multi-asset return (group 7 plan 4, G7P4-R1): the records that share this RT- number, date, returner and receiver.
  // A one-machine document keeps the layout below.
  const documentRecords = await readCheckinDocumentGroup(checkin, (query) => prisma.assetCheckin.findMany({ ...query, include: checkinInclude }))
  if (documentRecords.length > 1) {
    return renderMultiMachineDocument({
      anchor: checkin,
      records: documentRecords,
      backHref: filters.returnTo ? normalizeAssetReturnTo(locale, filters.returnTo) : `/${locale}/assets/${checkin.asset.id}`,
      canCancel: hasPermission(user, "asset", "edit"),
      t,
      tCommon,
      tCheckout,
      tCancellation,
    })
  }

  const beforeSnapshot = parseAssetTransactionSnapshot(checkin.beforeSnapshotJson)
  const afterSnapshot = parseAssetTransactionSnapshot(checkin.afterSnapshotJson)

  const [photoAttachments, returnSignatureAttachment, receiveSignatureAttachment, lateReturns] = await Promise.all([
    prisma.attachment.findMany({
      where: { module: "checkin_photo_after", referenceId: checkin.id },
      select: { id: true },
      orderBy: { uploadedAt: "asc" },
    }),
    prisma.attachment.findFirst({
      where: { module: "checkin_return_signature", referenceId: checkin.id },
      select: { id: true },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.attachment.findFirst({
      where: { module: "checkin_receive_signature", referenceId: checkin.id },
      select: { id: true },
      orderBy: { uploadedAt: "desc" },
    }),
    // The late returns of the components this RT- left out (group 3 spec §8.6, P2-R2), one line each under its component.
    prisma.assetMovement.findMany({
      where: { referenceType: "checkin", referenceId: checkin.id, movementType: "component_late_return" },
      orderBy: { performedAt: "asc" },
      select: { assetId: true, toValue: true },
    }),
  ])
  const lineReadIds = checkinDocumentReadIds(afterSnapshot, lateReturns)

  const [labels, lineComponents] = await Promise.all([
    buildReferenceLabelMap([
      checkin.checkout.departmentId,
      checkin.checkout.locationId,
      checkin.checkout.parentAssetId,
      checkin.conditionAfter,
      checkin.nextStatus,
      checkin.nextLocationId,
      beforeSnapshot?.statusId,
      beforeSnapshot?.currentLocationId,
      afterSnapshot?.statusId,
      afterSnapshot?.currentLocationId,
      ...lineReadIds.labelIds,
    ]),
    prisma.asset.findMany({ where: { id: { in: lineReadIds.componentIds } }, select: { id: true, assetTag: true, name: true } }),
  ])
  const documentLines = buildCheckinDocumentLines({
    afterSnapshot,
    lateReturns,
    components: new Map(lineComponents.map((component) => [component.id, { assetTag: component.assetTag, name: component.name }])),
    labels,
    locale,
    canViewRepair: hasPermission(user, ASSET_MOVEMENT_DOCUMENT_PERMISSION.repair.module, "view"),
  })
  const checkoutDestination = getCheckoutDestination(checkin.checkout.checkoutType, {
    custodian: checkin.checkout.custodian ? `${checkin.checkout.custodian.code} - ${checkin.checkout.custodian.fullNameTh}` : null,
    department: labelOrDash(labels, checkin.checkout.departmentId),
    location: labelOrDash(labels, checkin.checkout.locationId),
    parentAsset: labelOrDash(labels, checkin.checkout.parentAssetId),
  })
  const custodyTypeLabel = checkin.checkout.handoverMode === "permanent_assignment"
    ? t("permanentAssignmentShort")
    : checkin.checkout.handoverMode === "temporary_loan"
      ? t("temporaryLoanShort")
      : t("handoverModeMissing")

  return (
    <OperationDocumentPrint
      title={t("returnDocumentTitle")}
      subtitle={`${checkin.asset.assetTag} - ${checkin.asset.name}`}
      backHref={filters.returnTo
        ? normalizeAssetReturnTo(locale, filters.returnTo)
        : `/${locale}/assets/${checkin.asset.id}`}
      backLabel={tCommon("back")}
      printLabel={t("printReturn")}
      toolbarActions={hasPermission(user, "asset", "edit") && checkin.transactionStatus === "active" ? (
        <TransactionCancelDialog
          type="checkin"
          transactionId={checkin.id}
          expectedUpdatedAt={checkin.updatedAt.toISOString()}
          originalOperator={checkin.receiveBy}
          currentState={formatSnapshotState(afterSnapshot, labels)}
          restoreState={formatSnapshotState(beforeSnapshot, labels)}
          componentCount={beforeSnapshot?.components.length ?? 0}
          labels={buildCancellationLabels(tCancellation)}
        />
      ) : null}
      voidInfo={checkin.transactionStatus === "void" ? {
        label: tCancellation("voidLabel"), voidReasonLabel: tCancellation("voidReason"), voidedByLabel: tCancellation("voidedBy"),
        voidedAtLabel: tCancellation("voidedAt"), voidReason: checkin.voidReason, voidedBy: checkin.voidedBy,
        voidedAt: formatDateTime(checkin.voidedAt),
      } : null}
      sections={[
        {
          title: t("documentInfo"),
          fields: [
            { label: t("documentNo"), value: checkin.documentNo ?? checkin.id },
            { label: t("returnDate"), value: formatDate(checkin.returnDate) },
            { label: tCheckout("documentNo"), value: checkin.checkout.documentNo ?? checkin.checkout.id },
            { label: t("custodyType"), value: custodyTypeLabel },
            { label: t("createdAt"), value: formatDateTime(checkin.createdAt) },
          ],
        },
        {
          title: t("assetInfo"),
          fields: [
            { label: tAsset("assetTag"), value: checkin.asset.assetTag },
            { label: tAsset("assetName"), value: checkin.asset.name },
            { label: tAsset("serialNumber"), value: checkin.asset.serialNumber },
            { label: tAsset("fixedAssetCode"), value: checkin.asset.fixedAssetCode },
            { label: tAsset("category"), value: `${checkin.asset.category.code} - ${checkin.asset.category.name}` },
            { label: tAsset("company"), value: `${checkin.asset.company.code} - ${checkin.asset.company.nameTh}` },
            { label: tAsset("branch"), value: `${checkin.asset.branch.code} - ${checkin.asset.branch.name}` },
            { label: tCheckout("checkoutTo"), value: checkoutDestination },
          ],
        },
        {
          title: t("returnInfo"),
          fields: [
            { label: t("returnBy"), value: checkin.returnBy },
            { label: t("receiveBy"), value: checkin.receiveBy },
            { label: t("conditionAfter"), value: labelOrDash(labels, checkin.conditionAfter) },
            { label: t("photoAfter"), value: photoAttachments.length > 0 || checkin.photoAfter ? t("evidenceAttached") : "-" },
            { label: t("nextStatus"), value: labelOrDash(labels, checkin.nextStatus) },
            { label: t("nextLocation"), value: labelOrDash(labels, checkin.nextLocationId) },
            { label: t("missingAccessories"), value: checkin.missingAccessories },
            { label: t("damageNote"), value: checkin.damageNote },
            { label: t("remark"), value: checkin.remark },
          ],
        },
      ]}
      lines={documentLines.components.length > 0 || documentLines.repair ? renderCheckinDocumentLines(documentLines, t) : null}
      signatures={[
        { title: t("returnBy"), helper: t("signatureDate"), imageSrc: returnSignatureAttachment ? `/api/attachments/${returnSignatureAttachment.id}?inline=1` : null },
        { title: t("receiveBy"), helper: t("signatureDate"), imageSrc: receiveSignatureAttachment ? `/api/attachments/${receiveSignatureAttachment.id}?inline=1` : null },
        { title: t("approver"), helper: t("signatureDate") },
      ]}
    />
  )
}

// The RT- of a multi-asset return (group 7 plan 4): one row per machine with its HO-, a voided row struck through, the
// signatures once (the same files are attached to every record, G7P4-R5) and each active row's own cancel, which voids
// that record only. The whole document reads VOID only when every row is voided.
async function renderMultiMachineDocument({
  anchor, records, backHref, canCancel, t, tCommon, tCheckout, tCancellation,
}: {
  anchor: CheckinDocumentRecord
  records: CheckinDocumentRecord[]
  backHref: string
  canCancel: boolean
  t: Translator
  tCommon: Translator
  tCheckout: Translator
  tCancellation: Translator
}) {
  const snapshots = new Map(records.map((record) => [record.id, {
    before: parseAssetTransactionSnapshot(record.beforeSnapshotJson),
    after: parseAssetTransactionSnapshot(record.afterSnapshotJson),
  }]))
  const [returnSignatureAttachment, receiveSignatureAttachment, labels] = await Promise.all([
    prisma.attachment.findFirst({
      where: { module: "checkin_return_signature", referenceId: anchor.id },
      select: { id: true },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.attachment.findFirst({
      where: { module: "checkin_receive_signature", referenceId: anchor.id },
      select: { id: true },
      orderBy: { uploadedAt: "desc" },
    }),
    buildReferenceLabelMap(records.flatMap((record) => {
      const { before, after } = snapshots.get(record.id) ?? { before: null, after: null }
      return [record.conditionAfter, record.nextStatus, record.nextLocationId, before?.statusId, before?.currentLocationId, after?.statusId, after?.currentLocationId]
    })),
  ])
  const rows = buildCheckinDocumentMachineRows(records, labels)
  const recordById = new Map(records.map((record) => [record.id, record]))
  const cancellationLabels = buildCancellationLabels(tCancellation)
  const allVoided = records.every((record) => record.transactionStatus === "void")
  const machineCount = t("documentMachineCount", { count: formatCount(records.length) })

  return (
    <OperationDocumentPrint
      title={t("returnDocumentTitle")}
      subtitle={`${anchor.documentNo ?? anchor.id} · ${machineCount}`}
      backHref={backHref}
      backLabel={tCommon("back")}
      printLabel={t("printReturn")}
      voidInfo={allVoided ? {
        label: tCancellation("voidLabel"), voidReasonLabel: tCancellation("voidReason"), voidedByLabel: tCancellation("voidedBy"),
        voidedAtLabel: tCancellation("voidedAt"), voidReason: anchor.voidReason, voidedBy: anchor.voidedBy,
        voidedAt: formatDateTime(anchor.voidedAt),
      } : null}
      sections={[
        {
          title: t("documentInfo"),
          fields: [
            { label: t("documentNo"), value: anchor.documentNo ?? anchor.id },
            { label: t("returnDate"), value: formatDate(anchor.returnDate) },
            { label: t("documentMachines"), value: machineCount },
            { label: t("createdAt"), value: formatDateTime(anchor.createdAt) },
          ],
        },
        {
          title: t("returnInfo"),
          fields: [
            { label: t("returnBy"), value: anchor.returnBy },
            { label: t("receiveBy"), value: anchor.receiveBy },
          ],
        },
      ]}
      lines={(
        <section>
          <h2 className="mb-2 text-sm font-bold text-foreground">{t("documentMachines")}</h2>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full min-w-[640px] border-collapse border border-border text-sm print:min-w-0">
              <thead>
                <tr className="text-left text-xs font-semibold text-muted-foreground">
                  <th scope="col" className="border-b border-border px-3 py-2">{t("documentMachineColumn")}</th>
                  <th scope="col" className="border-b border-border px-3 py-2">{t("conditionAfter")}</th>
                  <th scope="col" className="border-b border-border px-3 py-2">{t("nextStatus")}</th>
                  <th scope="col" className="border-b border-border px-3 py-2">{t("nextLocation")}</th>
                  <th scope="col" className="border-b border-border px-3 py-2">{tCheckout("documentNo")}</th>
                  {canCancel ? <th scope="col" className="print:hidden border-b border-border px-3 py-2"><span className="sr-only">{t("documentMachineActions")}</span></th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const record = recordById.get(row.checkinId) ?? anchor
                  const snapshot = snapshots.get(row.checkinId) ?? { before: null, after: null }
                  return (
                    <tr
                      key={row.checkinId}
                      data-document-machine={row.checkinId}
                      data-voided={row.voided ? "true" : undefined}
                      className="break-inside-avoid border-b border-border-soft align-top last:border-b-0"
                    >
                      <td className="px-3 py-2">
                        <div className={row.voided ? "line-through" : undefined}>
                          <span className="font-semibold">{row.assetTag}</span> {row.assetName}
                        </div>
                        {row.voided ? <div className="mt-1 text-xs font-semibold text-danger">{t("documentMachineVoided")}</div> : null}
                        {row.damageNote ? (
                          <div data-document-machine-note="damage" className="mt-1 whitespace-pre-line break-words text-xs">
                            <span className="font-semibold">{t("damageNote")}:</span> {row.damageNote}
                          </div>
                        ) : null}
                        {row.remark ? (
                          <div data-document-machine-note="remark" className="mt-1 whitespace-pre-line break-words text-xs">
                            <span className="font-semibold">{t("remark")}:</span> {row.remark}
                          </div>
                        ) : null}
                      </td>
                      <td className={row.voided ? "px-3 py-2 line-through" : "px-3 py-2"}>{orNil(row.condition)}</td>
                      <td className={row.voided ? "px-3 py-2 line-through" : "px-3 py-2"}>{orNil(row.nextStatus)}</td>
                      <td className={row.voided ? "px-3 py-2 line-through" : "px-3 py-2"}>{orNil(row.nextLocation)}</td>
                      <td className={row.voided ? "px-3 py-2 line-through" : "px-3 py-2"}>{row.handoverNo}</td>
                      {canCancel ? (
                        <td className="print:hidden px-3 py-2 text-right">
                          {record.transactionStatus === "active" ? (
                            <TransactionCancelDialog
                              type="checkin"
                              transactionId={record.id}
                              expectedUpdatedAt={record.updatedAt.toISOString()}
                              originalOperator={record.receiveBy}
                              currentState={formatSnapshotState(snapshot.after, labels)}
                              restoreState={formatSnapshotState(snapshot.before, labels)}
                              componentCount={snapshot.before?.components.length ?? 0}
                              labels={cancellationLabels}
                            />
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
      signatures={[
        { title: t("returnBy"), helper: t("signatureDate"), imageSrc: returnSignatureAttachment ? `/api/attachments/${returnSignatureAttachment.id}?inline=1` : null },
        { title: t("receiveBy"), helper: t("signatureDate"), imageSrc: receiveSignatureAttachment ? `/api/attachments/${receiveSignatureAttachment.id}?inline=1` : null },
        { title: t("approver"), helper: t("signatureDate") },
      ]}
    />
  )
}

// The RT-'s lines (P2-R5) on the A4 paper; a VOID RT- shows them too, under its void banner.
function renderCheckinDocumentLines(lines: CheckinDocumentLines, t: Awaited<ReturnType<typeof getTranslations>>) {
  return (
    <>
      {lines.components.length > 0 ? (
        <section className="break-inside-avoid">
          <h2 className="mb-2 text-sm font-bold">{t("documentMissingComponents")}</h2>
          <ul className="border border-border text-sm">
            {lines.components.map((line, index) => (
              <li
                key={`${line.kind}-${line.componentAssetId}-${index}`}
                data-document-line={line.kind}
                className={line.kind === "returned" ? "border-b border-border py-2 pl-6 pr-3 last:border-b-0" : "border-b border-border px-3 py-2 last:border-b-0"}
              >
                {line.kind === "returned"
                  ? t("documentComponentReturned", { tag: line.tag, date: line.day, name: line.receivedBy })
                  : line.holder
                    ? t("documentMissingComponentHeld", { component: line.component, holder: line.holder, location: line.location })
                    : t("documentMissingComponentPlace", { component: line.component, location: line.location })}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {lines.repair ? (
        <section className="break-inside-avoid">
          <h2 className="mb-2 text-sm font-bold">{t("documentRepair")}</h2>
          <p data-document-line="repair" className="border border-border px-3 py-2 text-sm">
            {lines.repair.href ? (
              <Link href={lines.repair.href} className={linkVariants({ size: "inherit" })}>
                {t(lines.repair.key, { repairNo: lines.repair.repairNo })}
              </Link>
            ) : (
              t(lines.repair.key, { repairNo: lines.repair.repairNo })
            )}
          </p>
        </section>
      ) : null}
    </>
  )
}

function formatSnapshotState(snapshot: ReturnType<typeof parseAssetTransactionSnapshot>, labels: Map<string, string>) {
  if (!snapshot) return null
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

function getCheckoutDestination(
  checkoutType: string,
  labels: { custodian: string | null; department: string; location: string; parentAsset: string }
) {
  if (checkoutType === "user") return labels.custodian || "-"
  if (checkoutType === "department") return labels.department
  if (checkoutType === "location") return labels.location
  return labels.parentAsset
}
