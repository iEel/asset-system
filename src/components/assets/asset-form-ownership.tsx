"use client"

import { useTranslations } from "next-intl"
import { FieldGroup } from "@/components/ui/field-group"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Notice } from "@/components/ui/notice"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Segmented } from "@/components/ui/segmented"
import { useMediaQuery } from "@/components/ui/use-media-query"
import { CardGroup, SelectField } from "@/components/assets/asset-form-section"
import { FIELD_IDS, type AssetField, type AssetFormDepartmentLock, type AssetFormOption as Option, type AssetFormValues } from "@/lib/asset-form-rules"
import { assetOwnershipTypes, ownershipMayHaveHolder, type AssetOwnershipType } from "@/lib/asset-ownership"
import { cn } from "@/lib/utils"

// ความเป็นเจ้าของ, a group of the required card (group 4 plan 2 Task 6b, spec §7.3, §8, P2-R2, P2-R11): the ownership type
// as buttons from 768 px and the native select below (one rendered at a time, so #asset-ownership-type is the phone's
// control and the desktop's error focus lands on the group), the owner company and branch, แผนก (locked to the holder's
// on บุคคล and Stock), and the holder for every type that can have one, with the cross-company toggle. The state and the
// handlers stay in asset-form.tsx.
export function AssetFormOwnership({
  values,
  ownershipType,
  requiredFields,
  companies,
  branches,
  departments,
  employees,
  departmentLock,
  departmentLockText,
  allowCrossCompanyCustodian,
  hasCrossCompanyCustodian,
  errorText,
  onOwnershipTypeChange,
  onCompanyChange,
  onBranchChange,
  onDepartmentChange,
  onCustodianChange,
  onCrossCompanyCustodianToggle,
}: {
  values: AssetFormValues
  ownershipType: AssetOwnershipType
  requiredFields: readonly AssetField[]
  companies: Option[]
  // The branches of the owner company, the departments it may use and the employees in scope (asset-form.tsx filters).
  branches: Option[]
  departments: Option[]
  employees: Option[]
  departmentLock: AssetFormDepartmentLock
  // The locked department's name: the holder's, else the option's label.
  departmentLockText: string
  allowCrossCompanyCustodian: boolean
  hasCrossCompanyCustodian: boolean
  errorText: (key: AssetField) => string | undefined
  onOwnershipTypeChange: (value: string) => void
  onCompanyChange: (value: string) => void
  onBranchChange: (value: string) => void
  onDepartmentChange: (value: string) => void
  onCustodianChange: (value: string) => void
  onCrossCompanyCustodianToggle: (checked: boolean) => void
}) {
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const tTransfer = useTranslations("transfer")
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const isSoftwareLicense = ownershipType === "software_license"

  return (
    <CardGroup title={t("ownership")}>
      <div className="md:col-span-2">
        {isDesktop ? (
          <FieldGroup
            legend={t("ownershipType")}
            id={FIELD_IDS.ownershipType}
            required
            hint={t(`ownershipType_${ownershipType}_help`)}
            error={errorText("ownershipType")}
          >
            <Segmented
              labelledBy={`${FIELD_IDS.ownershipType}-legend`}
              showCheck
              value={ownershipType}
              options={assetOwnershipTypes.map((type) => ({ value: type, label: t(`ownershipType_${type}`) }))}
              onValueChange={onOwnershipTypeChange}
              className="max-w-full flex-wrap"
            />
          </FieldGroup>
        ) : (
          <SelectField
            label={t("ownershipType")}
            id="asset-ownership-type"
            value={ownershipType}
            required
            hint={t(`ownershipType_${ownershipType}_help`)}
            error={errorText("ownershipType")}
            onChange={onOwnershipTypeChange}
          >
            {assetOwnershipTypes.map((type) => (
              <option key={type} value={type}>{t(`ownershipType_${type}`)}</option>
            ))}
          </SelectField>
        )}
      </div>
      <SelectField
        label={t("assetOwnerCompany")}
        id="asset-company"
        value={values.companyId}
        required
        hint={t("assetOwnerCompanyHelp")}
        error={errorText("companyId")}
        onChange={onCompanyChange}
      >
        <option value="">{t("selectCompany")}</option>
        {companies.map((company) => <option key={company.id} value={company.id}>{company.label}</option>)}
      </SelectField>
      <SelectField
        label={t("assetOwnerBranch")}
        id="asset-branch"
        value={values.branchId}
        required
        hint={t("assetOwnerBranchHelp")}
        error={errorText("branchId")}
        onChange={onBranchChange}
      >
        <option value="">{t("selectBranch")}</option>
        {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.label}</option>)}
      </SelectField>
      {/* Locked to the holder's on บุคคล and Stock: the one option reads "ตามผู้ถือครอง: <แผนก>", as โอนย้าย's แผนก row. */}
      <SelectField
        label={t("department")}
        id="asset-department"
        value={values.departmentId ?? ""}
        required={requiredFields.includes("departmentId")}
        disabled={departmentLock.locked}
        error={departmentLock.locked ? undefined : errorText("departmentId")}
        onChange={onDepartmentChange}
      >
        {departmentLock.locked ? (
          <option value={values.departmentId ?? ""}>{tTransfer("followsHolder", { department: departmentLockText })}</option>
        ) : (
          <>
            <option value="">{t("selectDepartment")}</option>
            {departments.map((department) => <option key={department.id} value={department.id}>{department.label}</option>)}
          </>
        )}
      </SelectField>
      {ownershipMayHaveHolder(ownershipType) ? (
        <div>
          <SearchableSelect
            id="asset-custodian"
            label={isSoftwareLicense ? t("licenseAssignee") : t("custodian")}
            value={values.custodianId ?? ""}
            options={employees}
            placeholder={isSoftwareLicense ? t("selectLicenseAssignee") : t("selectCustodian")}
            searchPlaceholder={tCommon("searchSelectPlaceholder")}
            emptyLabel={tCommon("searchSelectNoResults")}
            error={errorText("custodianId")}
            onChange={onCustodianChange}
          />
          <label className="mt-2 flex min-h-11 items-start gap-2 py-2 text-meta text-muted-foreground">
            <input
              type="checkbox"
              checked={allowCrossCompanyCustodian}
              onChange={(event) => onCrossCompanyCustodianToggle(event.target.checked)}
              className={cn(checkboxVariants(), "mt-0.5")}
            />
            <span>
              <span className="block font-medium text-foreground">{t("allowCrossCompanyCustodian")}</span>
              <span>{t("allowCrossCompanyCustodianHelp")}</span>
            </span>
          </label>
          {hasCrossCompanyCustodian ? (
            <Notice tone="warning" className="mt-2">{t("crossCompanyCustodianWarning")}</Notice>
          ) : null}
        </div>
      ) : (
        <Notice tone="neutral" title={t("custodianNotRequired")}>
          {t("custodianNotRequiredHelp")}
        </Notice>
      )}
    </CardGroup>
  )
}
