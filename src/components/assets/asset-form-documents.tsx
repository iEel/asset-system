"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldError } from "@/components/ui/field"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Notice } from "@/components/ui/notice"
import { FoldedSection, SelectField, type AssetFormDisclosure, type AssetFormFieldErrors } from "@/components/assets/asset-form-section"
import { PurchaseDocumentPicker } from "@/components/assets/purchase-document-picker"
import {
  purchaseDocumentLimits,
  purchaseDocumentTypes,
  type AssetField,
  type AssetFormOption as Option,
  type PurchaseDocumentDraft,
  type PurchaseDocumentType,
} from "@/lib/asset-form-rules"
import {
  FOLLOW_ASSET_SUPPLIER,
  effectivePurchaseDocumentSupplierId,
  purchaseDocumentSupplierFromSelect,
  purchaseDocumentSupplierSelectValue,
} from "@/lib/asset-form-documents"
import type { PurchaseDocumentSearchAnswer, PurchaseDocumentSearchRow } from "@/lib/purchase-document-search-rules"
import { formatFileSize } from "@/lib/uploads"

// เอกสารจัดซื้อ (group 4 plan 3 Task 5, spec §9.1): two parts, side by side from 1024 px and stacked below it with the
// upload second. Left เลือกเอกสารที่มีอยู่, the search over the documents already in the system (the chosen ones as
// chips); right อัปโหลดเอกสารใหม่, the active draft and "+ เพิ่มอีกใบ", which moves it into the list above it. The active
// draft keeps the ids the E2E and the field errors use; the state, the pre-check and the uploads after the save stay in
// asset-form.tsx. The section's anchor is #documents (the failure landing, P3-R6).
export function AssetFormDocuments({
  errorText,
  fieldErrors,
  saving,
  canLink,
  chosen,
  recent,
  supplierId,
  removedIds,
  storedIds,
  onChoose,
  onRemove,
  suppliers,
  purchaseDocumentType,
  setPurchaseDocumentType,
  purchaseDocumentNo,
  setPurchaseDocumentNo,
  purchaseDocumentDate,
  setPurchaseDocumentDate,
  purchaseDocumentTotalAmount,
  setPurchaseDocumentTotalAmount,
  purchaseDocumentSupplierId,
  setPurchaseDocumentSupplierId,
  selectedPurchaseFile,
  selectPurchaseFile,
  addPurchaseDocument,
  newPurchaseDocuments,
  removePurchaseDocument,
  draftErrorText,
  failedNotice,
  disclosure,
}: {
  errorText: (key: AssetField) => string | undefined
  fieldErrors: AssetFormFieldErrors
  saving: boolean
  // Creating and linking a document needs asset:edit (P3-R2): without it the section holds a note only.
  canLink: boolean
  chosen: PurchaseDocumentSearchRow[]
  recent: PurchaseDocumentSearchAnswer
  // The asset's supplier: the picker's empty query lists its documents first.
  supplierId: string | null
  // Edit only: the stored documents marked for removal at บันทึกการแก้ไข (P3-R5).
  removedIds?: Set<string>
  // Edit only: the stored links (a chip chosen in this visit goes away at its ×, a stored one stays marked).
  storedIds?: ReadonlySet<string>
  onChoose: (row: PurchaseDocumentSearchRow) => void
  onRemove: (id: string) => void
  suppliers: Option[]
  purchaseDocumentType: PurchaseDocumentType
  setPurchaseDocumentType: (type: PurchaseDocumentType) => void
  purchaseDocumentNo: string
  setPurchaseDocumentNo: (value: string) => void
  purchaseDocumentDate: string
  setPurchaseDocumentDate: (value: string) => void
  purchaseDocumentTotalAmount: string
  setPurchaseDocumentTotalAmount: (value: string) => void
  // The draft's supplier: null "ตามทรัพย์สิน" (the default, the asset's), "" "ไม่ระบุผู้ขาย", else the one picked.
  purchaseDocumentSupplierId: string | null
  setPurchaseDocumentSupplierId: (value: string | null) => void
  selectedPurchaseFile: File | null
  selectPurchaseFile: (file: File | null) => void
  addPurchaseDocument: () => void
  newPurchaseDocuments: PurchaseDocumentDraft[]
  removePurchaseDocument: (id: string) => void
  // A queued draft the pre-check refused (its number already stored, or twice in this save).
  draftErrorText: (id: string) => string | undefined
  // The edit page's warning after a failed upload (P3-R6), or null.
  failedNotice: ReactNode
  disclosure: AssetFormDisclosure
}) {
  const t = useTranslations("asset")
  const supplierLabel = (id: string | null) => (id ? suppliers.find((supplier) => supplier.id === id)?.label : undefined)
  // A queued draft names the supplier it will be stored with: the asset's when it follows it, or ไม่ระบุผู้ขาย.
  const draftSupplierText = (draftSupplierId: string | null) => {
    const effective = effectivePurchaseDocumentSupplierId(draftSupplierId, supplierId)
    return effective ? supplierLabel(effective) : t("purchaseDocumentSupplierNone")
  }

  if (!canLink) {
    return (
      <div id="documents" className="scroll-mt-24">
        <FoldedSection title={t("purchaseDocuments")} disclosure={disclosure}>
          <Notice tone="neutral" className="md:col-span-2">{t("purchaseDocumentsNeedEdit")}</Notice>
        </FoldedSection>
      </div>
    )
  }

  return (
    // The anchor of the failure landing, ?documents=failed#documents (P3-R6).
    <div id="documents" className="scroll-mt-24">
      <FoldedSection title={t("purchaseDocuments")} disclosure={disclosure}>
        <div className="grid min-w-0 gap-4 md:col-span-2">
          {failedNotice}
          <p className="text-sm text-muted-foreground">{t("purchaseDocumentsHelp")}</p>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="grid min-w-0 content-start gap-3">
              <h3 className="text-meta font-medium text-muted-foreground">{t("existingPurchaseDocuments")}</h3>
              <PurchaseDocumentPicker
                id="asset-purchase-document"
                chosen={chosen}
                recent={recent}
                supplierId={supplierId}
                onChoose={onChoose}
                onRemove={onRemove}
                removedIds={removedIds}
                storedIds={storedIds}
                disabled={saving}
              />
            </div>

            <div className="grid min-w-0 content-start gap-3 border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
              <h3 className="text-meta font-medium text-muted-foreground">{t("createPurchaseDocument")}</h3>

              {newPurchaseDocuments.length > 0 && (
                <ul aria-label={t("purchaseDocumentQueuedList")} className="grid gap-2">
                  {newPurchaseDocuments.map((document) => {
                    const rowError = draftErrorText(document.id)
                    const supplier = draftSupplierText(document.supplierId)
                    return (
                      <li key={document.id}>
                        <div
                          id={`asset-purchase-document-draft-${document.id}`}
                          tabIndex={-1}
                          aria-describedby={rowError ? `asset-purchase-document-draft-${document.id}-error` : undefined}
                          className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="break-words text-sm font-medium text-foreground">
                              {t(`purchaseDocumentTypes.${document.documentType}`)} · {document.documentNo} · {document.file.name}
                            </div>
                            <div className="mt-0.5 break-words text-meta text-muted-foreground">
                              {[formatFileSize(document.file.size), supplier].filter(Boolean).join(" · ")}
                            </div>
                          </div>
                          <Button
                            variant="danger"
                            size="icon-sm"
                            className="shrink-0"
                            onClick={() => removePurchaseDocument(document.id)}
                            disabled={saving}
                            aria-label={t("purchaseDocumentRemoveNamed", { number: document.documentNo })}
                            title={t("purchaseDocumentRemoveNamed", { number: document.documentNo })}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                        {rowError ? (
                          <FieldError id={`asset-purchase-document-draft-${document.id}-error`} className="mt-1.5">{rowError}</FieldError>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}

              {/* The drop box's title is its name, so it takes the field's id, error tie and look itself (no Field label). */}
              <div>
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t("documentType")} id="asset-purchase-document-type">
                  <NativeSelect
                    value={purchaseDocumentType}
                    onChange={(event) => {
                      setPurchaseDocumentType(event.target.value as PurchaseDocumentType)
                      // The pre-check's refusal is of the type and the number together.
                      fieldErrors.clear("purchaseDocumentNo")
                    }}
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
                    maxLength={purchaseDocumentLimits.documentNo}
                  />
                </Field>
                <Field label={t("purchaseDocumentDate")} id="asset-purchase-document-date">
                  <Input type="date" value={purchaseDocumentDate} onChange={(event) => setPurchaseDocumentDate(event.target.value)} />
                </Field>
                <Field label={t("purchaseDocumentAmountBaht")} id="asset-purchase-document-amount" error={errorText("purchaseDocumentAmount")}>
                  <Input
                    type="number"
                    min="0"
                    max={purchaseDocumentLimits.amountMax}
                    step="0.01"
                    inputMode="decimal"
                    value={purchaseDocumentTotalAmount}
                    onChange={(event) => {
                      setPurchaseDocumentTotalAmount(event.target.value)
                      fieldErrors.clear("purchaseDocumentAmount")
                    }}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <SelectField
                    label={t("supplier")}
                    id="asset-purchase-document-supplier"
                    value={purchaseDocumentSupplierSelectValue(purchaseDocumentSupplierId)}
                    onChange={(value) => setPurchaseDocumentSupplierId(purchaseDocumentSupplierFromSelect(value))}
                  >
                    <option value={FOLLOW_ASSET_SUPPLIER}>{t("purchaseDocumentSupplierFollowsAsset")}</option>
                    <option value="">{t("purchaseDocumentSupplierNone")}</option>
                    {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.label}</option>)}
                  </SelectField>
                </div>
              </div>

              <div>
                <Button variant="outline" size="md" onClick={addPurchaseDocument} disabled={saving}>
                  <Plus aria-hidden="true" />
                  {t("addPurchaseDocument")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </FoldedSection>
    </div>
  )
}
