"use client"

import { useTranslations } from "next-intl"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { FormChangedField, type FormFieldChange } from "@/components/ui/form-changed-field"
import { FoldedSection, SelectField, type AssetFormDisclosure } from "@/components/assets/asset-form-section"
import type { AssetDiffField } from "@/lib/asset-form-diff"
import type { AssetField, AssetFormOption as Option, AssetFormValues } from "@/lib/asset-form-rules"

// การจัดซื้อและประกัน (group 4 plan 2 Task 5 moved it out of asset-form.tsx). Folded since Task 6a; the documents box is
// its own section, asset-form-documents.tsx, which plan 3 replaces. On edit a changed field shows its old value (Task 8).
export function AssetFormPurchase({
  values,
  setField,
  errorText,
  suppliers,
  changeOf,
  disclosure,
}: {
  values: AssetFormValues
  setField: <K extends keyof AssetFormValues>(field: K, value: AssetFormValues[K]) => void
  errorText: (key: AssetField) => string | undefined
  suppliers: Option[]
  changeOf: (field: AssetDiffField) => FormFieldChange | null
  disclosure: AssetFormDisclosure
}) {
  const t = useTranslations("asset")

  return (
    // The anchor of the asset page's "บันทึกข้อมูลการซื้อ" and "เพิ่มข้อมูล" (group 1 asset detail task 8).
    <div id="purchase" className="scroll-mt-24">
      <FoldedSection title={t("purchaseWarranty")} disclosure={disclosure}>
        <FormChangedField change={changeOf("purchaseDate")}>
          <Field label={t("purchaseDate")} id="asset-purchase-date" error={errorText("purchaseDate")}>
            <Input type="date" value={values.purchaseDate ?? ""} onChange={(event) => setField("purchaseDate", event.target.value)} />
          </Field>
        </FormChangedField>
        <FormChangedField change={changeOf("purchasePrice")}>
          <Field label={t("purchasePriceBaht")} id="asset-purchase-price" error={errorText("purchasePrice")}>
            <Input type="number" min="0" step="0.01" inputMode="decimal" value={values.purchasePrice ?? ""} onChange={(event) => setField("purchasePrice", event.target.value)} />
          </Field>
        </FormChangedField>
        <FormChangedField change={changeOf("supplierId")}>
          <SelectField label={t("supplier")} id="asset-supplier" value={values.supplierId ?? ""} onChange={(value) => setField("supplierId", value)}>
            <option value="">{t("selectSupplier")}</option>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.label}</option>)}
          </SelectField>
        </FormChangedField>
        {/* The end cannot be picked before the start (spec U4, §7.4). */}
        <FormChangedField change={changeOf("warrantyStartDate")}>
          <Field label={t("warrantyStart")} id="asset-warranty-start" error={errorText("warrantyStartDate")}>
            <Input
              type="date"
              value={values.warrantyStartDate ?? ""}
              max={values.warrantyEndDate || undefined}
              onChange={(event) => setField("warrantyStartDate", event.target.value)}
            />
          </Field>
        </FormChangedField>
        <FormChangedField change={changeOf("warrantyEndDate")}>
          <Field label={t("warrantyEnd")} id="asset-warranty-end" error={errorText("warrantyEndDate")}>
            <Input
              type="date"
              value={values.warrantyEndDate ?? ""}
              min={values.warrantyStartDate || undefined}
              onChange={(event) => setField("warrantyEndDate", event.target.value)}
            />
          </Field>
        </FormChangedField>
        <FormChangedField change={changeOf("fixedAssetCode")}>
          <Field label={t("fixedAssetCode")} id="asset-fixed-asset-code" error={errorText("fixedAssetCode")}>
            <Input value={values.fixedAssetCode ?? ""} onChange={(event) => setField("fixedAssetCode", event.target.value)} maxLength={50} />
          </Field>
        </FormChangedField>
        <FormChangedField change={changeOf("poNumber")}>
          <Field label={t("poNumber")} id="asset-po-number" error={errorText("poNumber")}>
            <Input value={values.poNumber ?? ""} onChange={(event) => setField("poNumber", event.target.value)} maxLength={50} />
          </Field>
        </FormChangedField>
        <FormChangedField change={changeOf("invoiceNumber")}>
          <Field label={t("invoiceNumber")} id="asset-invoice-number" error={errorText("invoiceNumber")}>
            <Input value={values.invoiceNumber ?? ""} onChange={(event) => setField("invoiceNumber", event.target.value)} maxLength={50} />
          </Field>
        </FormChangedField>
      </FoldedSection>
    </div>
  )
}
