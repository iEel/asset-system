import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { KeyValueList } from "@/components/ui/key-value-list"
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
  // null when the document has no total (spec 2D M32 a): it shows Nil, never 0.00.
  totalAmount: number | null
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
      {/* In the page's ContentPanel: the table has no frame of its own (no frame in a frame, 2D-2 R4). */}
      <DataTable data-supplier-documents-desktop framed={false} className="hidden md:block">
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
                <div className="text-meta text-muted-foreground">{orNil(documentReferences(document))}</div>
              </DataTableCell>
              <DataTableCell className="whitespace-nowrap text-muted-foreground">{orNil(document.documentDate ? formatDate(document.documentDate) : null)}</DataTableCell>
              <DataTableCell numeric className="text-muted-foreground">{formatCount(document.linkedAssets)}</DataTableCell>
              <DataTableCell numeric className="text-muted-foreground">{orNil(formatMoney(document.totalAmount))}</DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      {/* A card in a panel is a quiet grouping (2D-2 R4); its facts are the shared label and value list (spec 2D D19). */}
      <div data-supplier-documents-mobile className="grid gap-3 md:hidden">
        {documents.map((document) => (
          <article key={document.id} className="min-w-0 rounded-md border border-border bg-background p-3">
            <div className="font-medium text-foreground">{document.documentType} / <span className="tag">{document.documentNo}</span></div>
            <div className="mt-1 text-meta text-muted-foreground">{orNil(documentReferences(document))}</div>
            <KeyValueList
              className="mt-3"
              items={[
                { key: "documentDate", label: labels.documentDate, value: document.documentDate ? formatDate(document.documentDate) : null },
                { key: "linkedAssets", label: labels.linkedAssets, value: formatCount(document.linkedAssets) },
                { key: "totalAmount", label: labels.totalAmount, value: formatMoney(document.totalAmount) },
              ]}
            />
          </article>
        ))}
      </div>
    </>
  )
}

function documentReferences(document: Pick<SupplierPurchaseDocumentItem, "poNumber" | "invoiceNumber">) {
  return [document.poNumber, document.invoiceNumber].filter(Boolean).join(" / ")
}
