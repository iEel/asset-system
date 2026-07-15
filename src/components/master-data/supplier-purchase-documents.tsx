import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { formatCurrency, formatDate } from "@/lib/utils"

export type SupplierPurchaseDocumentItem = {
  id: string
  documentType: string
  documentNo: string
  poNumber: string | null
  invoiceNumber: string | null
  documentDate: Date | null
  totalAmount: number
  currency: string | null
  linkedAssets: number
}

type SupplierPurchaseDocumentsProps = {
  documents: SupplierPurchaseDocumentItem[]
  labels: {
    documentNo: string
    documentDate: string
    linkedAssets: string
    totalAmount: string
    noPurchaseDocuments: string
    noPurchaseDocumentsHelp: string
  }
}

export function SupplierPurchaseDocuments({ documents, labels }: SupplierPurchaseDocumentsProps) {
  if (documents.length === 0) {
    return (
      <ActionEmptyState
        title={labels.noPurchaseDocuments}
        description={labels.noPurchaseDocumentsHelp}
      />
    )
  }

  return (
    <>
      <div
        data-supplier-documents-desktop
        className="mt-4 hidden overflow-x-auto rounded-md border border-border md:block"
      >
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-medium">{labels.documentNo}</th>
              <th scope="col" className="px-3 py-2 text-left font-medium">{labels.documentDate}</th>
              <th scope="col" className="px-3 py-2 text-left font-medium">{labels.linkedAssets}</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">{labels.totalAmount}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {documents.map((document) => (
              <tr key={document.id}>
                <td className="px-3 py-2">
                  <div className="font-medium text-foreground">{document.documentType} / {document.documentNo}</div>
                  <div className="text-xs text-muted-foreground">{documentReferences(document) || "-"}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatDate(document.documentDate)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{document.linkedAssets.toLocaleString()}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-muted-foreground">{formatCurrency(document.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div data-supplier-documents-mobile className="mt-4 grid gap-3 md:hidden">
        {documents.map((document) => (
          <article key={document.id} className="rounded-lg border border-border bg-background p-4">
            <div className="font-medium text-foreground">{document.documentType} / {document.documentNo}</div>
            <div className="mt-1 text-xs text-muted-foreground">{documentReferences(document) || "-"}</div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <DocumentFact label={labels.documentDate} value={formatDate(document.documentDate)} />
              <DocumentFact label={labels.linkedAssets} value={document.linkedAssets.toLocaleString()} />
              <DocumentFact
                label={labels.totalAmount}
                value={formatCurrency(document.totalAmount)}
                className="col-span-2"
              />
            </dl>
          </article>
        ))}
      </div>
    </>
  )
}

function DocumentFact({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-foreground">{value}</dd>
    </div>
  )
}

function documentReferences(document: Pick<SupplierPurchaseDocumentItem, "poNumber" | "invoiceNumber">) {
  return [document.poNumber, document.invoiceNumber].filter(Boolean).join(" / ")
}
