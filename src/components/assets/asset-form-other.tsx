"use client"

import { useTranslations } from "next-intl"
import { Code2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { FoldedSection, type AssetFormDisclosure } from "@/components/assets/asset-form-section"
import type { AssetField, AssetFormValues } from "@/lib/asset-form-rules"

// ข้อมูลอื่น ๆ และขั้นสูง: the remark, and the custom fields' raw JSON behind its toggle (group 4 plan 2 Task 6a, P2-R11;
// they sat in the custom-fields section until then). Folded; an error in the JSON opens it and shows the JSON.
export function AssetFormOther({
  values,
  setField,
  errorText,
  showRawJson,
  toggleRawJson,
  onRawJsonChange,
  disclosure,
}: {
  values: AssetFormValues
  setField: <K extends keyof AssetFormValues>(field: K, value: AssetFormValues[K]) => void
  errorText: (key: AssetField) => string | undefined
  showRawJson: boolean
  toggleRawJson: () => void
  onRawJsonChange: (value: string) => void
  disclosure: AssetFormDisclosure
}) {
  const t = useTranslations("asset")

  return (
    <FoldedSection title={t("otherAdvanced")} disclosure={disclosure}>
      <div className="md:col-span-2">
        <Field label={t("remark")}>
          <Textarea value={values.remark ?? ""} onChange={(event) => setField("remark", event.target.value)} rows={4} className="min-h-28" />
        </Field>
      </div>
      <div className="space-y-4 border-t border-border pt-5 md:col-span-2">
        <Button variant="outline" size="md" onClick={toggleRawJson}>
          <Code2 aria-hidden="true" />
          {showRawJson ? t("hideJson") : t("showJson")}
        </Button>
        {showRawJson && (
          <Field label={t("customFieldsJson")} id="asset-custom-fields-json" hint={t("customFieldsJsonHelp")} error={errorText("customFieldsJson")}>
            <Textarea
              value={values.customFieldsJson ?? ""}
              onChange={(event) => onRawJsonChange(event.target.value)}
              rows={5}
              className="min-h-32 font-mono"
            />
          </Field>
        )}
      </div>
    </FoldedSection>
  )
}
