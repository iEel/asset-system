"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { ChevronRight } from "lucide-react"
import { linkVariants } from "@/components/ui/button-variants"
import { renderAssetTagExample } from "@/lib/category-prefix-groups"
import type { CategoryFormContext } from "@/lib/category-form-context"
import { cn } from "@/lib/utils"

// The read-only prefix box of section 1 (board MD-Category-Edit): the prefix from the settings (or ยังไม่ตั้ง, the code
// used instead), the categories that share it, an example tag rendered from the settings with the code as typed, and
// "แก้ในการตั้งค่า" with setting:view only. Nothing here is saved by the form. onLinkClick is the form's leave-without-
// saving guard.
export function CategoryPrefixBox({
  context,
  code,
  isEdit,
  onLinkClick,
}: {
  context: CategoryFormContext
  code: string
  isEdit: boolean
  onLinkClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void
}) {
  const t = useTranslations("category.form")
  const mono = (chunks: React.ReactNode) => <span className="tag text-foreground">{chunks}</span>
  const bold = (chunks: React.ReactNode) => <b className="font-semibold text-foreground">{chunks}</b>
  const typedCode = code.trim()
  const example = renderAssetTagExample(context.tagExample, context.prefix, typedCode)

  return (
    <div data-category-prefix-box className="flex min-w-0 flex-col gap-3 rounded-md border border-border bg-background px-3.5 py-3 sm:flex-row sm:items-start">
      <div className="shrink-0 sm:min-w-16 sm:text-center">
        <span className="block text-meta text-muted-foreground">{t("prefixLabel")}</span>
        {context.prefix ? (
          <span className="text-lg">
            <b className="tag font-medium text-foreground">{context.prefix}</b>
          </span>
        ) : (
          <span className="text-sm font-medium text-foreground">{t("prefixMissing")}</span>
        )}
      </div>
      <div className="grid min-w-0 flex-1 gap-1 text-sm text-muted-foreground">
        <p className="min-w-0 break-words">
          {context.prefix ? null : typedCode ? <>{t.rich("prefixFallback", { code: typedCode, mono })} · </> : null}
          {context.sharedWith.length > 0 ? <>{t.rich("prefixSharedWith", { names: context.sharedWith.join(", "), b: bold })} · </> : null}
          {t.rich("prefixExample", { tag: example, mono })}
        </p>
        <p className="text-meta text-faint-foreground">{isEdit ? t("prefixHelpEdit") : t("prefixHelpCreate")}</p>
      </div>
      {context.settingsHref ? (
        <Link href={context.settingsHref} onClick={onLinkClick} className={cn(linkVariants({ size: "meta" }), "inline-flex min-h-11 items-center gap-1 self-start sm:self-center md:min-h-0")}>
          {t("prefixSettingsLink")}
          <ChevronRight aria-hidden="true" className="size-3.5" />
        </Link>
      ) : null}
    </div>
  )
}
