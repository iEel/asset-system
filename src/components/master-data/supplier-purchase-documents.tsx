import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { KeyValueList } from "@/components/ui/key-value-list"
import { orNil } from "@/components/ui/nil"
import { formatCount, formatMoney } from "@/lib/display-format"
import type { SupplierDetailDocument } from "@/lib/supplier-detail"
import { formatDate } from "@/lib/utils"

export type SupplierPurchaseDocumentItem = SupplierDetailDocument

type SupplierPurchaseDocumentsProps = {
  documents: readonly SupplierPurchaseDocumentItem[]
  // The documents' links to active assets and their amounts, null as 0 (G8P3-R2): the table's last row.
  totals: { count: number; linkedAssets: number; amount: number }
  labels: {
    caption: string
    documentNo: string
    documentDate: string
    linkedAssets: string
    totalAmount: string
    noPurchaseDocuments: string
    noPurchaseDocumentsHelp: string
    // "ใบ PO", "ใบกำกับ", "สัญญา" … (asset.purchaseDocumentTypes); an unknown type shows as stored.
    typeLabels: Record<string, string>
    // An empty total (spec 2D M32 a): never 0.00.
    amountUnset: string
    // "รวม {n} เอกสาร"
    totalRow: string
  }
}

// Board MD-Supplier: every document, newest first, the type label and number with the PO and invoice under it, the
// linked assets and the amount, then the total row. Phone: the cards and a total line (spec §8 keeps the phone cards).
export function SupplierPurchaseDocuments({ documents, totals, labels }: SupplierPurchaseDocumentsProps) {
  if (documents.length === 0) {
    return (
      <ActionEmptyState
        title={labels.noPurchaseDocuments}
        description={labels.noPurchaseDocumentsHelp}
      />
    )
  }

  const typeLabel = (type: string) => labels.typeLabels[type] ?? type
  const amount = (value: number | null) => (value == null ? <span className="text-faint-foreground">{labels.amountUnset}</span> : formatMoney(value))

  return (
    <>
      {/* In the page's ContentPanel: the table has no frame of its own (no frame in a frame, 2D-2 R4). */}
      <DataTable data-supplier-documents-desktop framed={false} caption={labels.caption} className="hidden md:block">
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
                <div className="font-medium text-foreground">{typeLabel(document.documentType)} <span className="tag">{document.documentNo}</span></div>
                <div className="text-meta text-muted-foreground">{orNil(documentReferences(document, typeLabel))}</div>
              </DataTableCell>
              <DataTableCell className="whitespace-nowrap text-muted-foreground">{orNil(document.documentDate ? formatDate(document.documentDate) : null)}</DataTableCell>
              <DataTableCell numeric className={document.linkedAssets === 0 ? "text-warning" : "text-muted-foreground"}>{formatCount(document.linkedAssets)}</DataTableCell>
              <DataTableCell numeric className="text-muted-foreground">{amount(document.totalAmount)}</DataTableCell>
            </DataTableRow>
          ))}
          <tr data-supplier-documents-total className="bg-muted font-semibold">
            <th scope="row" colSpan={2} className="border-b border-border-soft p-3 pl-4 text-left text-foreground md:pl-5">{labels.totalRow}</th>
            <DataTableCell numeric className="text-foreground">{formatCount(totals.linkedAssets)}</DataTableCell>
            <DataTableCell numeric className="text-foreground">{formatMoney(totals.amount)}</DataTableCell>
          </tr>
        </DataTableBody>
      </DataTable>

      {/* A card in a panel is a quiet grouping (2D-2 R4); its facts are the shared label and value list (spec 2D D19). */}
      <div data-supplier-documents-mobile className="grid gap-3 md:hidden">
        {documents.map((document) => (
          <article key={document.id} className="min-w-0 rounded-md border border-border bg-background p-3">
            <div className="font-medium text-foreground">{typeLabel(document.documentType)} <span className="tag">{document.documentNo}</span></div>
            <div className="mt-1 text-meta text-muted-foreground">{orNil(documentReferences(document, typeLabel))}</div>
            <KeyValueList
              className="mt-3"
              items={[
                { key: "documentDate", label: labels.documentDate, value: document.documentDate ? formatDate(document.documentDate) : null },
                { key: "linkedAssets", label: labels.linkedAssets, value: formatCount(document.linkedAssets) },
                { key: "totalAmount", label: labels.totalAmount, value: amount(document.totalAmount) },
              ]}
            />
          </article>
        ))}
        <p data-supplier-documents-total className="flex flex-wrap justify-between gap-2 px-1 text-sm font-semibold text-foreground">
          <span>{labels.totalRow}</span>
          <span className="num">{formatMoney(totals.amount)}</span>
        </p>
      </div>
    </>
  )
}

// The PO and invoice numbers under the document's own number, each with its type label ("ใบกำกับ INV-69-10233"); the
// one that is the document's own number is not repeated.
function documentReferences(
  document: Pick<SupplierPurchaseDocumentItem, "documentNo" | "poNumber" | "invoiceNumber">,
  typeLabel: (type: string) => string
) {
  return [
    document.poNumber && document.poNumber !== document.documentNo ? `${typeLabel("purchase_order")} ${document.poNumber}` : null,
    document.invoiceNumber && document.invoiceNumber !== document.documentNo ? `${typeLabel("invoice")} ${document.invoiceNumber}` : null,
  ]
    .filter(Boolean)
    .join(" · ")
}
