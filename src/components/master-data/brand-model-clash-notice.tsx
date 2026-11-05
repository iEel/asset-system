"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import type { NameClash } from "@/lib/brand-model-duplicates"
import type { NameClashKind } from "@/lib/brand-model-clash"
import { cn } from "@/lib/utils"

// Page group 7 plan 1 (spec §4.1): under the name field, the existing record a save clashed with. An active one is
// offered as "ใช้ {name}"; an inactive one as "เปิดใช้งาน {name}" only for a user with brand:edit (canReactivate),
// otherwise the line alone is the refusal. No routing here: the brands page forms and the asset form's quick add pass
// what "use" and "reactivate" do. id goes on the message line, for the name input's aria-describedby.
export function BrandModelClashNotice({
  clash,
  kind,
  canReactivate,
  onUse,
  onReactivate,
  id,
  className,
}: {
  clash: NameClash
  kind: NameClashKind
  canReactivate: boolean
  onUse: (clash: NameClash) => void
  onReactivate: (clash: NameClash) => Promise<void> | void
  id?: string
  className?: string
}) {
  const t = useTranslations("brandModel.clash")
  const [reactivating, setReactivating] = useState(false)

  async function handleReactivate() {
    setReactivating(true)
    try {
      await onReactivate(clash)
    } finally {
      setReactivating(false)
    }
  }

  return (
    <div data-slot="brand-model-clash" data-kind={kind} className={cn("grid justify-items-start gap-2", className)}>
      <FieldError id={id}>
        {clash.isActive ? t("exists", { name: clash.name }) : t("existsInactive", { name: clash.name })}
      </FieldError>
      {clash.isActive ? (
        <Button variant="outline" size="sm" onClick={() => onUse(clash)}>
          {t("use", { name: clash.name })}
        </Button>
      ) : canReactivate ? (
        <Button variant="outline" size="sm" busy={reactivating} onClick={handleReactivate}>
          {t("reactivate", { name: clash.name })}
        </Button>
      ) : null}
    </div>
  )
}
