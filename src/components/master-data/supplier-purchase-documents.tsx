import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { orNil } from "@/components/ui/nil"
import { formatCount, formatMoney } from "@/lib/display-format"
import { formatDate } from "@/lib/utils"

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
      <DataTable data-supplier-documents-desktop className="mt-4 hidden md:block">
        <DataTableHeader>
          <tr>
            <DataTableHead>{labels.documentNo}</DataTableHead>
            <DataTableHead>{labels.documentDate}</DataTableHead>
            <DataTableHead align="right">{labels.linkedAssets}</DataTableHead>
            <DataTableHead align="right">{labels.totalAmount}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {documents.map((document) => (
            <DataTableRow key={document.id}>
              <DataTableCell>
                <div className="font-medium text-foreground">{document.documentType} / <span className="tag">{document.documentNo}</span></div>
                <div className="text-xs text-muted-foreground">{orNil(documentReferences(document))}</div>
              </DataTableCell>
              <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDate(document.documentDate)}</DataTableCell>
              <DataTableCell numeric className="text-muted-foreground">{formatCount(document.linkedAssets)}</DataTableCell>
              <DataTableCell numeric className="text-muted-foreground">{formatMoney(document.totalAmount)}</DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      <div data-supplier-documents-mobile className="mt-4 grid gap-3 md:hidden">
        {documents.map((document) => (
          <article key={document.id} className="rounded-lg border border-border bg-background p-4">
            <div className="font-medium text-foreground">{document.documentType} / <span className="tag">{document.documentNo}</span></div>
            <div className="mt-1 text-xs text-muted-foreground">{orNil(documentReferences(document))}</div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <DocumentFact label={labels.documentDate} value={formatDate(document.documentDate)} />
              <DocumentFact label={labels.linkedAssets} value={formatCount(document.linkedAssets)} />
              <DocumentFact
                label={labels.totalAmount}
                value={formatMoney(document.totalAmount)}
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
