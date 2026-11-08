"use client"

import { useTranslations } from "next-intl"
import { ChoiceCard } from "@/components/ui/choice-card"
import { Field } from "@/components/ui/field"
import { FieldGroup } from "@/components/ui/field-group"
import { FormSection } from "@/components/ui/form-section"
import { Input } from "@/components/ui/input"
import { useValidationMessage } from "@/components/ui/use-field-errors"
import type { AdminUserFieldErrors, AdminUserFormValues } from "@/components/admin/admin-user-form"

// บัญชีเข้าสู่ระบบ (spec §5.1). On create the AD/local choice comes first; the password shows on edit (to change it) or
// for a local account (required). On edit the name and email say that an AD sign-in overwrites them (§5.4: the system
// cannot tell an AD account from a local one, so it is a hint, not a lock).
export function UserAccountSection({
  isEdit,
  values,
  fieldErrors,
  usernameSuggested,
  onFieldChange,
  onAuthModeChange,
}: {
  isEdit: boolean
  values: AdminUserFormValues
  fieldErrors: AdminUserFieldErrors
  usernameSuggested: boolean
  onFieldChange: <K extends keyof AdminUserFormValues>(field: K, value: AdminUserFormValues[K]) => void
  onAuthModeChange: (mode: AdminUserFormValues["authMode"]) => void
}) {
  const t = useTranslations("adminUsersPage")
  const validationMessage = useValidationMessage()
  const adSyncedHint = isEdit ? t("form.adSyncedHint") : undefined

  return (
    <FormSection title={<span id="admin-user-account-heading">{t("form.accountSection")}</span>}>
      <div className="grid gap-5">
        {isEdit ? null : (
          <FieldGroup legend={t("form.authMode")}>
            <div className="grid gap-2 sm:grid-cols-2">
              <ChoiceCard
                type="radio"
                name="admin-user-auth-mode"
                value="ad"
                checked={values.authMode === "ad"}
                onChange={() => onAuthModeChange("ad")}
                label={t("form.authAd")}
                description={t("form.authAdHint")}
              />
              <ChoiceCard
                type="radio"
                name="admin-user-auth-mode"
                value="local"
                checked={values.authMode === "local"}
                onChange={() => onAuthModeChange("local")}
                label={t("form.authLocal")}
                description={t("form.authLocalHint")}
              />
            </div>
          </FieldGroup>
        )}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field
            label={t("username")}
            id="admin-user-username"
            required
            hint={usernameSuggested ? t("form.usernameSuggested") : undefined}
            error={fieldErrors.message("username")}
          >
            <Input
              value={values.username}
              onChange={(event) => onFieldChange("username", event.target.value)}
              required
              maxLength={100}
              autoComplete="off"
            />
          </Field>
          <Field label={t("displayName")} id="admin-user-display-name" required hint={adSyncedHint} error={fieldErrors.message("displayName")}>
            <Input
              value={values.displayName}
              onChange={(event) => onFieldChange("displayName", event.target.value)}
              required
              maxLength={200}
            />
          </Field>
          <Field label={t("email")} id="admin-user-email" hint={adSyncedHint} error={fieldErrors.message("email")}>
            <Input
              type="email"
              value={values.email}
              onChange={(event) => onFieldChange("email", event.target.value)}
              maxLength={200}
            />
          </Field>
          {isEdit || values.authMode === "local" ? (
            <Field
              label={isEdit ? t("newPassword") : t("password")}
              id="admin-user-password"
              required={!isEdit}
              hint={isEdit ? t("form.passwordEditHint") : undefined}
              error={fieldErrors.errors.password ? validationMessage(fieldErrors.errors.password, { min: 8, max: 100 }) : undefined}
            >
              <Input
                type="password"
                value={values.password}
                onChange={(event) => onFieldChange("password", event.target.value)}
                required={!isEdit}
                minLength={8}
                maxLength={100}
                autoComplete="new-password"
              />
            </Field>
          ) : null}
        </div>
      </div>
    </FormSection>
  )
}
