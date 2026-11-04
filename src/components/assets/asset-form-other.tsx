"use client"

import { useTranslations } from "next-intl"
import { Field } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { FormChangedField, type FormFieldChange } from "@/components/ui/form-changed-field"
import { FoldedSection, type AssetFormDisclosure } from "@/components/assets/asset-form-section"
import type { AssetDiffField } from "@/lib/asset-form-diff"
import type { AssetFormValues } from "@/lib/asset-form-rules"

// หมายเหตุ: the remark, folded (group 4 plan 2 Task 6a, P2-R11). The raw JSON editor left the form (the user's decision,
// 2026-11-02): the custom fields write their JSON from รายละเอียดเฉพาะทรัพย์สิน. On edit a changed remark shows its old
// value (Task 8).
export function AssetFormOther({
  values,
  setField,
  changeOf,
  disclosure,
}: {
  values: AssetFormValues
  setField: <K extends keyof AssetFormValues>(field: K, value: AssetFormValues[K]) => void
  changeOf: (field: AssetDiffField) => FormFieldChange | null
  disclosure: AssetFormDisclosure
}) {
  const t = useTranslations("asset")

  return (
    <FoldedSection title={t("remark")} disclosure={disclosure}>
      <div className="md:col-span-2">
        <FormChangedField change={changeOf("remark")}>
          <Field label={t("remark")} id="asset-remark">
            <Textarea value={values.remark ?? ""} onChange={(event) => setField("remark", event.target.value)} rows={4} className="min-h-28" />
          </Field>
        </FormChangedField>
      </div>
    </FoldedSection>
  )
}
