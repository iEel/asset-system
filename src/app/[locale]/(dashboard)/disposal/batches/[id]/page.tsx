import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCount, formatPercent } from "@/lib/display-format"
import { formatDate } from "@/lib/utils"
import { readDisposalBatch, type DisposalBatchMachine } from "@/lib/disposal-batch-page-data"
import type { DisposalRoundBlockCode } from "@/lib/disposal-round-service"
import { appendOperationalReturnTo, normalizeDisposalBatchReturnTo } from "@/lib/operational-return-navigation"
import { AssetThumbnail } from "@/components/assets/asset-thumbnail"
import { DisposalAttachments } from "@/components/disposal/disposal-attachments"
import { DisposalBatchRoundButton } from "@/components/disposal/disposal-batch-round-button"
import { DisposalPhotoGallery } from "@/components/disposal/disposal-photo-gallery"
import { linkVariants } from "@/components/ui/button-variants"
import { ContentPanel, ContentPanelRows } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { KeyValueList } from "@/components/ui/key-value-list"
import { PaceBar } from "@/components/ui/pace-bar"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"

type DisposalBatchDetailPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

type MachineLabels = {
  useLotPhoto: string
  attachPhoto: string
  stage: (status: string) => string
}

const stages = ["pending", "approved", "disposed", "rejected"] as const

// The batch page, board DP-Batch (request batches spec §5): the batch number with its name built from its machines,
// the progress "ตัดจำหน่ายแล้ว {x}/{y}" with the four stage counts, each machine with its own first photo or "ใช้รูปรวม"
// (and "แนบรูป" to its request's files), its request and its round; the lot photo and the batch's files on the side.
// From md, a viewer with disposal:edit starts a round from the machines that can join one (PB-R6); the phone reads.
export default async function DisposalBatchDetailPage({ params, searchParams }: DisposalBatchDetailPageProps) {
  const { locale, id } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "disposal", "view")
  const canEdit = hasPermission(user, "disposal", "edit")
  const canManage = hasPermission(user, "disposal", "create") || canEdit || hasPermission(user, "disposal", "approve")
  const [t, tCommon] = await Promise.all([getTranslations("disposalPage"), getTranslations("common")])
  // Back to the batch history list and its page when the user came from there, else to the disposal queue (spec 2B §5.9.2 row 5).
  const returnToHref = normalizeDisposalBatchReturnTo(locale, rawSearchParams.returnTo)
  // The round candidates are split by the round service's tick blocks only for a viewer who may record a round.
  const actor = canEdit
    ? { userId: user.id, employeeId: user.employeeId, roles: user.roles, permissions: user.permissions }
    : null
  const result = await readDisposalBatch(prisma, id, actor, {
    titleWords: {
      same: (name, count) => t("rounds.titleSame", { name, count }),
      mixed: (name, count) => t("rounds.titleMixed", { name, count }),
    },
  })
  if (!result) notFound()
  const { batch, counts, machines, lotPhotos, roundCandidates } = result

  const attachments = await prisma.attachment.findMany({
    where: { module: "disposal_batch", referenceId: batch.id, isActive: true },
    orderBy: { uploadedAt: "desc" },
  })
  const method = t.has(`types.${batch.disposalType}`) ? t(`types.${batch.disposalType}`) : batch.disposalType
  const batchHref = `/${locale}/disposal/batches/${batch.id}`
  const requestHref = (requestId: string) => appendOperationalReturnTo(`/${locale}/disposal/${requestId}`, batchHref)
  // "แนบรูป" opens the request's files (its #files panel) while the request still takes files.
  const attachHref = (machine: DisposalBatchMachine) =>
    canManage && (machine.requestStatus === "pending" || machine.requestStatus === "approved") ? `${requestHref(machine.requestId)}#files` : null
  const roundHref = (machine: DisposalBatchMachine) => (machine.round ? `/${locale}/disposal/rounds/${machine.round.id}` : null)
  const progressLabel = t("batchPage.progress", { disposed: formatCount(counts.disposed), total: formatCount(counts.total) })
  const labels: MachineLabels = {
    useLotPhoto: t("batchPage.useLotPhoto"),
    attachPhoto: t("batchPage.attachPhoto"),
    stage: (status) => (t.has(`statuses.${status}`) ? t(`statuses.${status}`) : status),
  }
  // The queue's tick reasons (disposal/page.tsx), so a machine that cannot join reads the same here.
  const tickReasons: Record<DisposalRoundBlockCode, string> = {
    DISPOSAL_SOD_CONFLICT: t("queue.roundTickApprover"),
    DISPOSAL_EVIDENCE_REQUIRED: t("queue.roundTickNoEvidence"),
    DISPOSAL_ASSET_INELIGIBLE: t("errors.DISPOSAL_ASSET_INELIGIBLE"),
    DISPOSAL_INVALID_STAGE: t("errors.DISPOSAL_INVALID_STAGE"),
    DISPOSAL_REQUEST_NOT_FOUND: t("errors.DISPOSAL_REQUEST_NOT_FOUND"),
    DISPOSAL_ROUND_LOST_METHOD: t("rounds.form.blocked.DISPOSAL_ROUND_LOST_METHOD"),
  }
  const blockedReasons = [...new Set(roundCandidates.blocked.map((entry) => tickReasons[entry.code]))].join(" · ")
  const showRound = canEdit && roundCandidates.joinableIds.length > 0
  const machinesTitle = t("batchPage.machinesTitle", { count: formatCount(counts.total) })

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: t("title"), href: `/${locale}/disposal` }, { label: batch.batchNo, code: true }]}
        title={<span className="tag font-medium">{batch.batchNo}</span>}
        meta={
          <>
            <span className="text-foreground [overflow-wrap:anywhere]">{batch.title}</span>
            <span data-disposal-batch-meta="">{method} · {batch.requestedByName ?? "–"} · {formatDate(batch.requestDate)}</span>
          </>
        }
        back={<PageBackLink href={returnToHref} label={tCommon("back")} />}
      />

      <StatStrip
        items={[
          {
            key: "progress",
            label: progressLabel,
            value: formatPercent(counts.total > 0 ? counts.disposed / counts.total : 0),
            meter: <PaceBar value={counts.total > 0 ? counts.disposed / counts.total : 0} pace={null} label={progressLabel} behind={false} />,
          },
          ...stages.map((stage) => ({ key: stage, label: t(`statuses.${stage}`), value: formatCount(counts[stage]) })),
        ]}
      />

      {showRound || (canEdit && roundCandidates.blocked.length > 0) ? (
        <>
          <div data-disposal-batch-round="" className="hidden md:flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
            {showRound ? (
              <DisposalBatchRoundButton ids={roundCandidates.joinableIds} href={`/${locale}/disposal/rounds/new`} label={t("batchPage.roundCreate", { count: formatCount(roundCandidates.joinableIds.length) })} />
            ) : null}
            {roundCandidates.blocked.length > 0 ? (
              <p data-disposal-batch-round-blocked="" className="text-meta text-muted-foreground">
                {t("batchPage.roundBlocked", { count: formatCount(roundCandidates.blocked.length), reasons: blockedReasons })}
              </p>
            ) : null}
          </div>
          {showRound ? <p data-disposal-batch-round-phone-note="" className="text-meta text-muted-foreground md:hidden">{t("queue.roundPhoneNote")}</p> : null}
        </>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <ContentPanel divided flush title={machinesTitle} className="min-w-0">
          {machines.length === 0 ? (
            <EmptyNote padded className="md:hidden">{tCommon("noData")}</EmptyNote>
          ) : (
            <ContentPanelRows className="md:hidden">
              {machines.map((machine) => (
                <li key={machine.requestId}>
                  <MachineCard machine={machine} requestHref={requestHref(machine.requestId)} attachHref={attachHref(machine)} roundHref={roundHref(machine)} labels={labels} />
                </li>
              ))}
            </ContentPanelRows>
          )}
          <DataTable framed={false} className="hidden md:block" caption={machinesTitle} scrollHint={tCommon("tableScrollHint")}>
            <DataTableHeader>
              <tr>
                <DataTableHead>{t("rounds.colPhoto")}</DataTableHead>
                <DataTableHead>{t("rounds.colAsset")}</DataTableHead>
                <DataTableHead>{t("rounds.colTag")}</DataTableHead>
                <DataTableHead>{t("rounds.colSerial")}</DataTableHead>
                <DataTableHead>{t("rounds.colRequest")}</DataTableHead>
                <DataTableHead>{tCommon("status")}</DataTableHead>
                <DataTableHead>{t("rounds.roundLabel")}</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {machines.length === 0 ? (
                <TableEmptyRow colSpan={7}>{tCommon("noData")}</TableEmptyRow>
              ) : machines.map((machine) => (
                <tr key={machine.requestId} data-disposal-batch-row="">
                  <DataTableCell className="whitespace-nowrap"><MachinePhoto machine={machine} attachHref={attachHref(machine)} labels={labels} /></DataTableCell>
                  <DataTableCell className="min-w-56 text-foreground">{machine.assetName}</DataTableCell>
                  <DataTableCell className="whitespace-nowrap"><span className="tag">{machine.assetTag}</span></DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-muted-foreground">{machine.serialNumber ?? "–"}</DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <Link href={requestHref(machine.requestId)} className={linkVariants({ size: "inherit" })}><span className="tag">{machine.disposalNo}</span></Link>
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap"><StatusBadge label={labels.stage(machine.requestStatus)} status={machine.requestStatus} /></DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-muted-foreground"><RoundLink machine={machine} href={roundHref(machine)} /></DataTableCell>
                </tr>
              ))}
            </DataTableBody>
          </DataTable>
        </ContentPanel>

        <aside className="min-w-0 space-y-6">
          <ContentPanel title={t("batchPage.lotTitle")}>
            <DisposalPhotoGallery
              photos={lotPhotos.map((photo) => ({ id: photo.id, originalName: photo.originalName }))}
              documents={[]}
              assetName={batch.title}
              isLost={batch.disposalType === "lost"}
            />
          </ContentPanel>
          <ContentPanel title={t("batchSharedDetail")}>
            <KeyValueList
              items={[
                { key: "disposalType", label: t("disposalType"), value: method },
                { key: "requestedBy", label: t("requestedBy"), value: batch.requestedByName },
                { key: "approver", label: t("approver"), value: batch.approverName ?? t("centralApprovalQueue") },
                { key: "requestDate", label: t("requestDate"), value: formatDate(batch.requestDate) },
                { key: "reason", label: t("reason"), value: <span className="whitespace-pre-wrap">{batch.reason}</span> },
              ]}
            />
          </ContentPanel>
          <DisposalAttachments requestId={batch.id} attachments={attachments} canManage={canManage} uploadEndpoint={`/api/disposal-batches/${batch.id}/attachments`} title={t("batchSharedEvidence")} />
        </aside>
      </div>
    </div>
  )
}

/** The machine's own first photo, or the muted "ใช้รูปรวม" with "แนบรูป" to its request's files. */
function MachinePhoto({ machine, attachHref, labels }: { machine: DisposalBatchMachine; attachHref: string | null; labels: MachineLabels }) {
  if (machine.ownPhotoId === null) {
    return (
      <span data-disposal-batch-lot-photo="" className="flex items-center gap-2">
        <span className="inline-flex size-11 shrink-0 items-center justify-center whitespace-normal rounded-md border border-border bg-muted p-0.5 text-center text-xs leading-tight text-muted-foreground">{labels.useLotPhoto}</span>
        {attachHref ? <Link href={attachHref} className={linkVariants({ size: "inherit" })}>{labels.attachPhoto}</Link> : null}
      </span>
    )
  }
  return (
    <AssetThumbnail
      photo={{ id: machine.ownPhotoId, alt: machine.assetName, fileType: "image/jpeg" }}
      assetTag={machine.assetTag}
      assetName={machine.assetName}
      size={44}
    />
  )
}

/** A recorded machine's round "DPR-… · {date}", linking the round page; – before it is in one. */
function RoundLink({ machine, href }: { machine: DisposalBatchMachine; href: string | null }) {
  if (!machine.round || !href) return <>–</>
  return (
    <Link href={href} className={linkVariants({ size: "inherit" })}>
      <span className="tag">{machine.round.roundNo}</span> · {formatDate(machine.round.executionDate)}
    </Link>
  )
}

function MachineCard({ machine, requestHref, attachHref, roundHref, labels }: { machine: DisposalBatchMachine; requestHref: string; attachHref: string | null; roundHref: string | null; labels: MachineLabels }) {
  return (
    <article className="flex items-start gap-3">
      <MachinePhoto machine={machine} attachHref={null} labels={labels} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 text-sm font-medium text-foreground [overflow-wrap:anywhere]">{machine.assetName}</div>
          <StatusBadge label={labels.stage(machine.requestStatus)} status={machine.requestStatus} />
        </div>
        <div className="text-meta text-muted-foreground">
          <span className="tag">{machine.assetTag}</span>
          {machine.serialNumber ? <> · {machine.serialNumber}</> : null}
        </div>
        <div className="mt-1 text-meta text-muted-foreground">
          <Link href={requestHref} className={linkVariants({ size: "inherit" })}><span className="tag">{machine.disposalNo}</span></Link>
          {machine.round && roundHref ? <> · <RoundLink machine={machine} href={roundHref} /></> : null}
          {attachHref ? <> · <Link href={attachHref} className={linkVariants({ size: "inherit" })}>{labels.attachPhoto}</Link></> : null}
        </div>
      </div>
    </article>
  )
}
