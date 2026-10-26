import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { FileText } from "lucide-react"
import { AssetAttachments } from "@/components/assets/asset-attachments"
import { AssetPurchaseDocuments } from "@/components/assets/asset-purchase-documents"
import { AssetThumbnail } from "@/components/assets/asset-thumbnail"
import { linkVariants } from "@/components/ui/button-variants"
import { ContentPanel, ContentPanelRows } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import type { AssetFilesTabData } from "@/lib/asset-files-data"
import { isThumbnailable } from "@/lib/attachment-thumbnail"
import { cn, formatDate } from "@/lib/utils"

// The files tab (group 1 spec §7.7): the asset's own photos and files, its purchase documents, and the evidence from
// other work, read-only and each linked to its document. Only the two client parts write, and only for an editor.
export async function AssetFilesTab({ locale, assetId, data, canEdit }: { locale: string; assetId: string; data: AssetFilesTabData; canEdit: boolean }) {
  const t = await getTranslations({ locale, namespace: "asset" })

  return (
    <div className="space-y-6">
      <div id="photos" className="scroll-mt-24">
        <AssetAttachments assetId={assetId} photos={data.photos} documents={data.documents} missingChecklistLabels={data.missingChecklistLabels} canEdit={canEdit} />
      </div>
      <div id="purchase-documents" className="scroll-mt-24">
        <AssetPurchaseDocuments documents={data.purchaseDocuments} canEdit={canEdit} />
      </div>
      <ContentPanel divided flush title={t("filesTab.evidenceTitle")} description={t("filesTab.evidenceHelp")}>
        {data.evidence.length === 0 ? (
          <EmptyNote padded>{t("filesTab.evidenceEmpty")}</EmptyNote>
        ) : (
          <ContentPanelRows>
            {data.evidence.map((group) => (
              <li key={group.key} className="grid gap-2">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                  <span className="font-medium text-foreground">{t(`filesTab.evidenceKinds.${group.kind}`)}</span>
                  <Link href={group.href} className={linkVariants({ size: "inherit" })}>
                    <span className="tag">{group.code}</span>
                  </Link>
                  <span className="text-meta text-muted-foreground">{formatDate(group.at)}</span>
                </div>
                <ul className="flex flex-wrap gap-3">
                  {group.files.map((file) => {
                    const caption = file.labelKey ? t(file.labelKey) : file.name
                    return (
                      <li key={file.id} className="min-w-0">
                        <a href={`/api/attachments/${file.id}?inline=1`} target="_blank" rel="noreferrer" className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 max-w-60 items-center gap-2 text-sm md:min-h-0")}>
                          {isThumbnailable(file.fileType) ? (
                            <AssetThumbnail photo={{ id: file.id, alt: "", fileType: file.fileType }} assetTag={group.code} assetName={caption} size={44} preview={false} />
                          ) : (
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                              <FileText className="size-4" aria-hidden="true" />
                            </span>
                          )}
                          <span className="truncate">{caption}</span>
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ContentPanelRows>
        )}
      </ContentPanel>
    </div>
  )
}
