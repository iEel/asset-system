"use client"

import { useTranslations } from "next-intl"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { FoldedSection, SelectField, type AssetFormDisclosure } from "@/components/assets/asset-form-section"
import type { AssetFormOption as Option, AssetField } from "@/lib/asset-form-rules"
import type { AssetOwnershipType } from "@/lib/asset-ownership"

export type AssetInstallAfterCreate = {
  parentAssetId: string
  componentRole: string
  slotNo: string
  reason: string
}

// ติดตั้งเป็นส่วนควบ, on create only (group 4 plan 2 Task 5 moved it out of asset-form.tsx; the state stays there). Folded
// since Task 6a.
export function AssetFormInstall({
  ownershipType,
  installAfterCreate,
  parentAssets,
  errorText,
  setInstallField,
  disclosure,
}: {
  ownershipType: AssetOwnershipType
  installAfterCreate: AssetInstallAfterCreate
  parentAssets: Option[]
  errorText: (key: AssetField) => string | undefined
  setInstallField: (field: keyof AssetInstallAfterCreate, value: string) => void
  disclosure: AssetFormDisclosure
}) {
  const t = useTranslations("asset")

  return (
    <FoldedSection title={t("installAfterCreate")} disclosure={disclosure}>
      <div className="md:col-span-2">
        <p className="text-sm text-muted-foreground">
          {ownershipType === "component" ? t("installAfterCreateComponentHelp") : t("installAfterCreateHelp")}
        </p>
      </div>
      <SelectField
        label={t("parentAsset")}
        id="asset-install-parent"
        value={installAfterCreate.parentAssetId}
        error={errorText("parentAssetId")}
        onChange={(value) => setInstallField("parentAssetId", value)}
      >
        <option value="">{t("skipInstallAfterCreate")}</option>
        {parentAssets.map((parentAsset) => (
          <option key={parentAsset.id} value={parentAsset.id}>{parentAsset.label}</option>
        ))}
      </SelectField>
      <Field
        label={t("componentRole")}
        id="asset-install-role"
        required={Boolean(installAfterCreate.parentAssetId)}
        error={errorText("componentRole")}
      >
        <Input
          value={installAfterCreate.componentRole}
          onChange={(event) => setInstallField("componentRole", event.target.value)}
          maxLength={100}
          placeholder="Harddisk"
          disabled={!installAfterCreate.parentAssetId}
        />
      </Field>
      <Field label={t("slotNo")} id="asset-install-slot" error={errorText("slotNo")}>
        <Input
          value={installAfterCreate.slotNo}
          onChange={(event) => setInstallField("slotNo", event.target.value)}
          maxLength={50}
          placeholder="Slot 1"
          disabled={!installAfterCreate.parentAssetId}
        />
      </Field>
      <Field label={t("reason")} id="asset-install-reason" error={errorText("installReason")}>
        <Input
          value={installAfterCreate.reason}
          onChange={(event) => setInstallField("reason", event.target.value)}
          maxLength={500}
          disabled={!installAfterCreate.parentAssetId}
        />
      </Field>
    </FoldedSection>
  )
}
