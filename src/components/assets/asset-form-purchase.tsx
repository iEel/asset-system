"use client"

import { useTranslations } from "next-intl"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChoiceCard } from "@/components/ui/choice-card"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field, FieldError } from "@/components/ui/field"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { orNil } from "@/components/ui/nil"
import { Section, SelectField, type AssetFormFieldErrors } from "@/components/assets/asset-form-section"
import {
  purchaseDocumentTypes,
  type AssetField,
  type AssetFormOption as Option,
  type AssetFormValues,
  type PurchaseDocumentDraft,
  type PurchaseDocumentOption,
  type PurchaseDocumentType,
} from "@/lib/asset-form-rules"
import { formatFileSize } from "@/lib/uploads"

// การจัดซื้อและประกัน with the documents box (group 4 plan 2 Task 5 moved it out of asset-form.tsx; the state and the
// follow-up upload stay there). Plan 3 replaces the documents box in this one place.
export function AssetFormPurchase({
  values,
  setField,
  errorText,
  fieldErrors,
  saving,
  suppliers,
  purchaseDocumentOptions,
  selectedPurchaseDocumentIds,
  togglePurchaseDocument,
  purchaseDocumentType,
  setPurchaseDocumentType,
  purchaseDocumentNo,
  setPurchaseDocumentNo,
  purchaseDocumentDate,
  setPurchaseDocumentDate,
  purchaseDocumentTotalAmount,
  setPurchaseDocumentTotalAmount,
  selectedPurchaseFile,
  selectPurchaseFile,
  addPurchaseDocument,
  newPurchaseDocuments,
  removePurchaseDocument,
}: {
  values: AssetFormValues
  setField: <K extends keyof AssetFormValues>(field: K, value: AssetFormValues[K]) => void
  errorText: (key: AssetField) => string | undefined
  fieldErrors: AssetFormFieldErrors
  saving: boolean
  suppliers: Option[]
  purchaseDocumentOptions: PurchaseDocumentOption[]
  selectedPurchaseDocumentIds: string[]
  togglePurchaseDocument: (id: string) => void
  purchaseDocumentType: PurchaseDocumentType
  setPurchaseDocumentType: (type: PurchaseDocumentType) => void
  purchaseDocumentNo: string
  setPurchaseDocumentNo: (value: string) => void
  purchaseDocumentDate: string
  setPurchaseDocumentDate: (value: string) => void
  purchaseDocumentTotalAmount: string
  setPurchaseDocumentTotalAmount: (value: string) => void
  selectedPurchaseFile: File | null
  selectPurchaseFile: (file: File | null) => void
  addPurchaseDocument: () => void
  newPurchaseDocuments: PurchaseDocumentDraft[]
  removePurchaseDocument: (id: string) => void
}) {
  const t = useTranslations("asset")

  return (
    // The anchor of the asset page's "บันทึกข้อมูลการซื้อ" and "เพิ่มข้อมูล" (group 1 asset detail task 8).
    <div id="purchase" className="scroll-mt-24">
      <Section title={t("purchaseWarranty")}>
        <Field label={t("purchaseDate")} id="asset-purchase-date" error={errorText("purchaseDate")}>
          <Input type="date" value={values.purchaseDate ?? ""} onChange={(event) => setField("purchaseDate", event.target.value)} />
        </Field>
        <Field label={t("purchasePriceBaht")} id="asset-purchase-price" error={errorText("purchasePrice")}>
          <Input type="number" min="0" step="0.01" inputMode="decimal" value={values.purchasePrice ?? ""} onChange={(event) => setField("purchasePrice", event.target.value)} />
        </Field>
        <SelectField label={t("supplier")} value={values.supplierId ?? ""} onChange={(value) => setField("supplierId", value)}>
          <option value="">{t("selectSupplier")}</option>
          {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.label}</option>)}
        </SelectField>
        {/* The end cannot be picked before the start (spec U4, §7.4). */}
        <Field label={t("warrantyStart")} id="asset-warranty-start" error={errorText("warrantyStartDate")}>
          <Input
            type="date"
            value={values.warrantyStartDate ?? ""}
            max={values.warrantyEndDate || undefined}
            onChange={(event) => setField("warrantyStartDate", event.target.value)}
          />
        </Field>
        <Field label={t("warrantyEnd")} id="asset-warranty-end" error={errorText("warrantyEndDate")}>
          <Input
            type="date"
            value={values.warrantyEndDate ?? ""}
            min={values.warrantyStartDate || undefined}
            onChange={(event) => setField("warrantyEndDate", event.target.value)}
          />
        </Field>
        <Field label={t("fixedAssetCode")} id="asset-fixed-asset-code" error={errorText("fixedAssetCode")}>
          <Input value={values.fixedAssetCode ?? ""} onChange={(event) => setField("fixedAssetCode", event.target.value)} maxLength={50} />
        </Field>
        <Field label={t("poNumber")} id="asset-po-number" error={errorText("poNumber")}>
          <Input value={values.poNumber ?? ""} onChange={(event) => setField("poNumber", event.target.value)} maxLength={50} />
        </Field>
        <Field label={t("invoiceNumber")} id="asset-invoice-number" error={errorText("invoiceNumber")}>
          <Input value={values.invoiceNumber ?? ""} onChange={(event) => setField("invoiceNumber", event.target.value)} maxLength={50} />
        </Field>
        <div className="md:col-span-2">
          <div className="rounded-md border border-border bg-background p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-foreground">{t("purchaseDocuments")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t("purchaseDocumentsHelp")}</p>
            </div>

            <div className="mb-4 space-y-2">
              <h4 className="text-meta font-medium text-muted-foreground">{t("existingPurchaseDocuments")}</h4>
              {purchaseDocumentOptions.length === 0 ? (
                <EmptyNote>{t("noPurchaseDocuments")}</EmptyNote>
              ) : (
                // Each document is a shared ChoiceCard (spec 2D D9): Enter in it no longer submits the form.
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                  {purchaseDocumentOptions.map((document) => (
                    <ChoiceCard
                      key={document.id}
                      type="checkbox"
                      checked={selectedPurchaseDocumentIds.includes(document.id)}
                      onChange={() => togglePurchaseDocument(document.id)}
                      label={<>{t(`purchaseDocumentTypes.${document.documentType}`)} · <span className="tag">{document.documentNo}</span></>}
                      description={<>{orNil(document.supplierName)} · {t("linkedAssets", { count: document.assetCount })}</>}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <h4 className="mb-3 text-meta font-medium text-muted-foreground">{t("createPurchaseDocument")}</h4>
              <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-4">
                <Field label={t("documentType")}>
                  <NativeSelect
                    value={purchaseDocumentType}
                    onChange={(event) => setPurchaseDocumentType(event.target.value as PurchaseDocumentType)}
                  >
                    {purchaseDocumentTypes.map((type) => (
                      <option key={type} value={type}>{t(`purchaseDocumentTypes.${type}`)}</option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label={t("purchaseDocumentNo")} id="asset-purchase-document-no" error={errorText("purchaseDocumentNo")}>
                  <Input
                    value={purchaseDocumentNo}
                    onChange={(event) => {
                      setPurchaseDocumentNo(event.target.value)
                      fieldErrors.clear("purchaseDocumentNo")
                    }}
                    maxLength={100}
                  />
                </Field>
                <Field label={t("purchaseDocumentDate")}>
                  <Input type="date" value={purchaseDocumentDate} onChange={(event) => setPurchaseDocumentDate(event.target.value)} />
                </Field>
                <Field label={t("purchaseDocumentAmountBaht")} id="asset-purchase-document-amount" error={errorText("purchaseDocumentAmount")}>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={purchaseDocumentTotalAmount}
                    onChange={(event) => {
                      setPurchaseDocumentTotalAmount(event.target.value)
                      fieldErrors.clear("purchaseDocumentAmount")
                    }}
                  />
                </Field>
              </div>
              {/* The drop box's title is its name, so it takes the field's id, error tie and look itself (no Field label). */}
              <FileDropzone
                file={selectedPurchaseFile}
                onFileChange={selectPurchaseFile}
                id="asset-purchase-document-file"
                aria-invalid={fieldErrors.errors.purchaseDocumentFile ? true : undefined}
                aria-describedby={fieldErrors.errors.purchaseDocumentFile ? "asset-purchase-document-file-error" : undefined}
                disabled={saving}
                accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.doc,.docx"
                title={t("dropPurchaseDocumentTitle")}
                hint={t("dropFileSelected")}
                browseLabel={t("dropFileHint")}
              />
              {fieldErrors.errors.purchaseDocumentFile ? (
                <FieldError id="asset-purchase-document-file-error" className="mt-1.5">{errorText("purchaseDocumentFile")}</FieldError>
              ) : null}
            </div>

            <Button variant="outline" size="md" className="mt-3" onClick={addPurchaseDocument} disabled={saving}>
              <Plus aria-hidden="true" />
              {t("addPurchaseDocument")}
            </Button>

            {newPurchaseDocuments.length > 0 && (
              <div className="mt-4 space-y-2">
                {newPurchaseDocuments.map((document) => (
                  <div key={document.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">
                        {t(`purchaseDocumentTypes.${document.documentType}`)} · {document.documentNo} · {document.file.name}
                      </div>
                      <div className="mt-0.5 text-meta text-muted-foreground">{formatFileSize(document.file.size)}</div>
                    </div>
                    <Button
                      variant="danger"
                      size="icon-sm"
                      className="shrink-0"
                      onClick={() => removePurchaseDocument(document.id)}
                      aria-label={t("removePurchaseDocument")}
                      title={t("removePurchaseDocument")}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>
    </div>
  )
}
