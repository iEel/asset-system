"use client"

import { useState, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { fieldLabelClasses } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// The LDAP bind password (board AD-Settings, group 12 plan 5 Task 4). The stored password never reaches the client: the
// page sends a placeholder, and this field only knows whether one is stored. The stored state is a read-only box
// ("•••••••• บันทึกไว้แล้ว" or "ยังไม่ได้ตั้ง") with a small เปลี่ยน link; change mode is a new-password input with a
// show/hide toggle and ยกเลิก, which returns to the stored state. value is only what the person typed.
export function LdapBindPasswordField({
  id,
  label,
  error,
  stored,
  open,
  value,
  onOpen,
  onCancel,
  onChange,
}: {
  id: string
  label: string
  error?: ReactNode
  stored: boolean
  open: boolean
  value: string
  onOpen: () => void
  onCancel: () => void
  onChange: (text: string) => void
}) {
  const t = useTranslations("systemSettingsPage")
  const tAuth = useTranslations("auth")
  const [shown, setShown] = useState(false)

  if (!open) {
    const stateId = `${id}-state`
    return (
      <div data-slot="field" className="grid min-w-0 content-start gap-1.5">
        <div className={fieldLabelClasses}>{label}</div>
        <div className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
          <span id={stateId} className={cn("min-w-0", stored ? "text-foreground" : "text-muted-foreground")}>
            {stored ? t("ldapBind.stored") : t("ldapBind.notSet")}
          </span>
          <Button variant="ghost" size="sm" className="text-primary" aria-label={`${t("ldapBind.change")} ${label}`} aria-describedby={stateId} onClick={onOpen}>
            {t("ldapBind.change")}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Field label={label} id={id} error={error} hint={stored ? t("ldapBind.keepHint") : undefined}>
      {(control) => (
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Input
              {...control}
              type={shown ? "text" : "password"}
              name="ldap-bind-password-new"
              autoComplete="new-password"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              className="pr-12 md:pr-10"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={shown ? tAuth("hidePassword") : tAuth("showPassword")}
              aria-pressed={shown}
              aria-controls={id}
              className="absolute top-1/2 right-0.5 -translate-y-1/2"
              onClick={() => setShown((visible) => !visible)}
            >
              {shown ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {t("ldapBind.cancel")}
          </Button>
        </div>
      )}
    </Field>
  )
}
