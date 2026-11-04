import { FileText } from "lucide-react"
import { linkVariants } from "@/components/ui/button-variants"
import type { AuditFindingEvidenceAttachment } from "@/lib/audit-findings-page-data"
import { formatFileSize } from "@/lib/uploads"
import { cn, formatDateTime } from "@/lib/utils"

// A finding's evidence files in its review panel: each opens inline in a new tab. Shared by the findings page and the
// approvals page (group 6 plan 2 Task 4). Server-safe.
export function AuditFindingEvidenceList({ attachments, labels }: { attachments: AuditFindingEvidenceAttachment[]; labels: { title: string; count: string; open: string } }) {
  if (attachments.length === 0) return null

  return (
    <div className="mt-3 min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="text-meta font-medium text-foreground">{labels.title}</div>
        <div className="text-meta text-muted-foreground">{labels.count}</div>
      </div>
      <ul className="mt-1 grid">
        {attachments.map((attachment) => (
          <li key={attachment.id} className="min-w-0">
            <a
              href={`/api/attachments/${attachment.id}?inline=1`}
              target="_blank"
              rel="noreferrer"
              aria-label={`${labels.open}: ${attachment.originalName}`}
              className={cn(linkVariants({ size: "inherit" }), "flex min-h-11 min-w-0 items-center gap-2")}
            >
              <FileText aria-hidden="true" className="size-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{attachment.originalName}</span>
                <span className="mt-0.5 block truncate text-meta font-normal text-muted-foreground">
                  {formatFileSize(attachment.fileSize)} · {formatDateTime(attachment.uploadedAt)}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
