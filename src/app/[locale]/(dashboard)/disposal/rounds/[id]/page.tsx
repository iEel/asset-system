import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { FileSpreadsheet } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { formatMoney } from "@/lib/display-format"
import { readDisposalRound, type DisposalRoundMachine } from "@/lib/disposal-round-page-data"
import { formatDate } from "@/lib/utils"
import { AssetThumbnail } from "@/components/assets/asset-thumbnail"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ContentPanel, ContentPanelRows } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader } from "@/components/ui/data-table"
import { KeyValueList } from "@/components/ui/key-value-list"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"

type DisposalRoundPageProps = {
  params: Promise<{ locale: string; id: string }>
}

// The round page (DP-Batch look, group 6 spec §11.3): the round's facts and its machines with a photo each. A round
// is always complete, so the batch page's progress card and 5-cell strip are left out (P4-R3: no files of its own).
export default async function DisposalRoundPage({ params }: DisposalRoundPageProps) {
  const { locale, id } = await params
  await requirePagePermission(locale, "disposal", "view")
  const [t, tCommon] = await Promise.all([getTranslations("disposalPage"), getTranslations("common")])
  const result = await readDisposalRound(prisma, id, {
    titleWords: {
      same: (name, count) => t("rounds.titleSame", { name, count }),
      mixed: (name, count) => t("rounds.titleMixed", { name, count }),
    },
  })
  if (!result) notFound()
  const { round, machines } = result
  const method = t(`types.${round.disposalType}`)
  const requestHref = (requestId: string) => `/${locale}/disposal/${requestId}`

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: t("title"), href: `/${locale}/disposal` },
          { label: t("rounds.listTitle"), href: `/${locale}/disposal/rounds` },
          { label: round.roundNo, code: true },
        ]}
        title={t("rounds.pageTitle", { title: round.title })}
        meta={(
          <span data-disposal-round-meta="">
            <span className="tag">{round.roundNo}</span> · {method} · {formatDate(round.executionDate)} · {t("rounds.recordedBy", { name: round.recordedByName })}
          </span>
        )}
        back={<PageBackLink href={`/${locale}/disposal/rounds`} label={tCommon("back")} />}
        actions={(
          // The accounting Excel (spec §11.5, decision 7): a file download, so a plain link.
          <a href={`/api/disposal-rounds/${round.id}/report`} download className={buttonVariants({ size: "md" })} data-disposal-round-report="">
            <FileSpreadsheet aria-hidden="true" />
            {t("rounds.exportReport")}
          </a>
        )}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <ContentPanel divided flush title={t("rounds.machinesTitle", { count: machines.length })} className="min-w-0">
          <ContentPanelRows className="md:hidden">
            {machines.map((machine) => (
              <li key={machine.requestId}><MachineCard machine={machine} href={requestHref(machine.requestId)} noPhoto={t("rounds.noPhoto")} approverLabel={t("rounds.colApprover")} /></li>
            ))}
          </ContentPanelRows>
          <DataTable framed={false} className="hidden md:block" caption={t("rounds.machinesTitle", { count: machines.length })} scrollHint={tCommon("tableScrollHint")}>
            <DataTableHeader>
              <tr>
                <DataTableHead>{t("rounds.colPhoto")}</DataTableHead>
                <DataTableHead>{t("rounds.colAsset")}</DataTableHead>
                <DataTableHead>{t("rounds.colTag")}</DataTableHead>
                <DataTableHead>{t("rounds.colSerial")}</DataTableHead>
                <DataTableHead>{t("rounds.colRequest")}</DataTableHead>
                <DataTableHead>{t("rounds.colApprover")}</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {machines.map((machine) => (
                <tr key={machine.requestId} data-disposal-round-row="">
                  <DataTableCell><MachinePhoto machine={machine} noPhoto={t("rounds.noPhoto")} /></DataTableCell>
                  <DataTableCell className="text-foreground [overflow-wrap:anywhere]">{machine.assetName}</DataTableCell>
                  <DataTableCell className="whitespace-nowrap"><span className="tag">{machine.assetTag}</span></DataTableCell>
                  <DataTableCell className="text-muted-foreground [overflow-wrap:anywhere]">{machine.serialNumber ?? "–"}</DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <Link href={requestHref(machine.requestId)} className={linkVariants({ size: "inherit" })}><span className="tag">{machine.disposalNo}</span></Link>
                  </DataTableCell>
                  <DataTableCell className="text-muted-foreground">{machine.approverName ?? "–"}</DataTableCell>
                </tr>
              ))}
            </DataTableBody>
          </DataTable>
        </ContentPanel>

        <aside className="min-w-0">
          <ContentPanel title={t("rounds.infoTitle")}>
            <KeyValueList
              items={[
                { key: "method", label: t("rounds.method"), value: method },
                { key: "executionDate", label: t("rounds.executionDate"), value: formatDate(round.executionDate) },
                { key: "recipient", label: t("rounds.recipient"), value: round.recipientName },
                { key: "documentNo", label: t("rounds.documentNo"), value: <span className="tag">{round.documentNo}</span> },
                ...(round.saleValue != null
                  ? [{ key: "saleValue", label: t("rounds.saleValue"), value: <span className="num">{formatMoney(round.saleValue, { unit: tCommon("baht") })}</span> }]
                  : []),
                { key: "remark", label: t("rounds.remark"), value: round.remark ? <span className="whitespace-pre-wrap">{round.remark}</span> : null },
                { key: "executedBy", label: t("rounds.executedBy"), value: round.executedByName },
              ]}
            />
          </ContentPanel>
        </aside>
      </div>
    </div>
  )
}

function MachinePhoto({ machine, noPhoto }: { machine: DisposalRoundMachine; noPhoto: string }) {
  if (!machine.firstPhotoId) {
    return <span className="inline-flex size-11 items-center justify-center rounded-md border border-border bg-muted p-0.5 text-center text-xs leading-tight text-muted-foreground">{noPhoto}</span>
  }
  return (
    <AssetThumbnail
      photo={{ id: machine.firstPhotoId, alt: machine.assetName, fileType: "image/jpeg" }}
      assetTag={machine.assetTag}
      assetName={machine.assetName}
      size={44}
    />
  )
}

function MachineCard({ machine, href, noPhoto, approverLabel }: { machine: DisposalRoundMachine; href: string; noPhoto: string; approverLabel: string }) {
  return (
    <article className="flex items-start gap-3">
      <MachinePhoto machine={machine} noPhoto={noPhoto} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground [overflow-wrap:anywhere]">{machine.assetName}</div>
        <div className="text-meta text-muted-foreground">
          <span className="tag">{machine.assetTag}</span>
          {machine.serialNumber ? <> · {machine.serialNumber}</> : null}
        </div>
        <div className="mt-1 text-meta text-muted-foreground">
          <Link href={href} className={linkVariants({ size: "inherit" })}><span className="tag">{machine.disposalNo}</span></Link>
          {machine.approverName ? <> · {approverLabel} {machine.approverName}</> : null}
        </div>
      </div>
    </article>
  )
}
