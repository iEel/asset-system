"use client"

import { useTranslations } from "next-intl"
import { ContentPanel } from "@/components/ui/content-panel"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { Notice } from "@/components/ui/notice"
import { Textarea } from "@/components/ui/textarea"
import type { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"

export type RoleMeta = {
  name: string
  displayName: string
  displayNameTh: string
  description: string
  isActive: boolean
}

export type RoleField = "name" | "displayName" | "displayNameTh" | "description" | "permissionIds"

// ข้อมูลบทบาท (spec §7.1): the fields, ids and checks as before the board. A system role keeps its key and its status
// (both disabled), with the neutral notice; system_admin's notice also says its permissions are locked.
export function RoleDetailsSection({
  meta,
  fieldErrors,
  validationMessage,
  isSystemRole,
  permissionsLocked,
  onFieldChange,
}: {
  meta: RoleMeta
  fieldErrors: ReturnType<typeof useFieldErrors<RoleField>>
  validationMessage: ReturnType<typeof useValidationMessage>
  isSystemRole: boolean
  permissionsLocked: boolean
  onFieldChange: <K extends keyof RoleMeta>(field: K, value: RoleMeta[K]) => void
}) {
  const t = useTranslations("adminRolesPage")
  const tCommon = useTranslations("common")

  return (
    <ContentPanel divided title={t("roleMetadata")} description={t("metadataSubtitle")}>
      {/* D7: a condition before acting is a neutral Notice (it was a teal info box). */}
      {isSystemRole ? <Notice tone="neutral" className="mb-5">{permissionsLocked ? t("systemAdminGuard") : t("systemRoleGuard")}</Notice> : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label={t("roleKey")}
          id="role-key"
          required
          error={fieldErrors.errors.name ? validationMessage(fieldErrors.errors.name, { min: 2, max: 50 }) : undefined}
        >
          <Input
            value={meta.name}
            required
            pattern="[a-z][a-z0-9_]*"
            disabled={isSystemRole}
            onChange={(event) => onFieldChange("name", event.target.value)}
          />
        </Field>
        <Field label={t("displayName")} id="role-display-name" required error={fieldErrors.message("displayName")}>
          <Input
            value={meta.displayName}
            required
            maxLength={200}
            onChange={(event) => onFieldChange("displayName", event.target.value)}
          />
        </Field>
        <Field label={t("displayNameTh")} id="role-display-name-th" error={fieldErrors.message("displayNameTh")}>
          <Input
            value={meta.displayNameTh}
            maxLength={200}
            onChange={(event) => onFieldChange("displayNameTh", event.target.value)}
          />
        </Field>
        <label className="flex min-h-11 items-center gap-2 self-end text-sm font-medium text-foreground has-disabled:cursor-not-allowed has-disabled:text-faint-foreground">
          <input
            type="checkbox"
            checked={meta.isActive}
            disabled={isSystemRole}
            onChange={(event) => onFieldChange("isActive", event.target.checked)}
            className={checkboxVariants()}
          />
          {tCommon("active")}
        </label>
        <div className="md:col-span-2">
          <Field label={t("description")} id="role-description" error={fieldErrors.message("description")}>
            <Textarea
              value={meta.description}
              rows={3}
              maxLength={500}
              onChange={(event) => onFieldChange("description", event.target.value)}
            />
          </Field>
        </div>
      </div>
    </ContentPanel>
  )
}
