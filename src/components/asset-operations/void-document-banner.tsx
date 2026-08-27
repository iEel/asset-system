import { Ban } from "lucide-react"

export type VoidDocumentInfo = {
  label: string
  voidReasonLabel: string
  voidedByLabel: string
  voidedAtLabel: string
  voidReason: string | null
  voidedBy: string | null
  voidedAt: string | null
}

export function VoidDocumentBanner({ info }: { info: VoidDocumentInfo }) {
  return (
    <aside className="mb-6 break-inside-avoid rounded-md border border-danger/40 bg-danger/5 p-4 text-danger" role="status">
      <div className="flex items-center gap-2 text-sm font-bold">
        <Ban className="h-5 w-5" aria-hidden="true" />
        {info.label}
      </div>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
        <div><dt className="font-semibold">{info.voidReasonLabel}</dt><dd className="mt-0.5 break-words text-foreground">{info.voidReason || "-"}</dd></div>
        <div><dt className="font-semibold">{info.voidedByLabel}</dt><dd className="mt-0.5 break-words text-foreground">{info.voidedBy || "-"}</dd></div>
        <div><dt className="font-semibold">{info.voidedAtLabel}</dt><dd className="mt-0.5 break-words text-foreground">{info.voidedAt || "-"}</dd></div>
      </dl>
    </aside>
  )
}
