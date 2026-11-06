"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { ChevronRight, Info } from "lucide-react"
import type { CategoryFormContext } from "@/lib/category-form-context"
import { formatCount } from "@/lib/display-format"
import { categoryFormTotals, diffCategoryForm, type CategoryFormSnapshot } from "@/lib/category-form-summary"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

const emptySnapshot: CategoryFormSnapshot = { code: "", name: "", description: "", isActive: true, customFieldDefs: [], photoChecklist: [] }

// The side panel ผลของการแก้ไข (board MD-Category-Edit, G8P2-R3): the usage counts (edit), ตอนนี้ (the saved category)
// against หลังบันทึก (the live form state) for the custom fields, the required ones, the photo items and the status,
// what the new fields mean for the assets already in the category, and the prefix note. The create page has no saved
// column: หลังบันทึก only. Sticky beside the form from lg; on phones it follows the form in the DOM.
export function CategoryEditSummary({
  saved,
  values,
  context,
}: {
  saved?: CategoryFormSnapshot
  values: CategoryFormSnapshot
  context: CategoryFormContext
}) {
  const t = useTranslations("category")
  const tCommon = useTranslations("common")
  const after = categoryFormTotals(values)
  const now = saved ? categoryFormTotals(saved) : null
  const changes = diffCategoryForm(saved ?? emptySnapshot, values)
  const existingAssets = saved ? (context.usage?.assets ?? 0) : 0
  const bold = (chunks: React.ReactNode) => <b className="font-semibold text-foreground">{chunks}</b>
  const mono = (chunks: React.ReactNode) => <span className="tag text-foreground">{chunks}</span>
  const statusLabel = (active: boolean) => (active ? tCommon("active") : tCommon("inactive"))

  const rows = [
    { key: "fields", label: t("form.summaryFields"), now: now && t("form.summaryFieldCount", { count: now.fields }), after: t("form.summaryFieldCount", { count: after.fields }), changed: now ? now.fields !== after.fields : false },
    { key: "required", label: t("form.summaryRequired"), now: now && t("form.summaryFieldCount", { count: now.required }), after: t("form.summaryFieldCount", { count: after.required }), changed: now ? now.required !== after.required : false },
    { key: "photos", label: t("form.summaryPhotos"), now: now && t("form.summaryPhotoCount", { count: now.photos }), after: t("form.summaryPhotoCount", { count: after.photos }), changed: now ? now.photos !== after.photos : false },
    { key: "status", label: t("form.summaryStatus"), now: now && statusLabel(now.isActive), after: statusLabel(after.isActive), changed: now ? now.isActive !== after.isActive : false },
  ]

  const usage = saved && context.usage
    ? [
        { key: "models", label: t("form.summaryModels"), count: context.usage.models, href: context.usage.modelsHref },
        { key: "assets", label: t("form.summaryAssets"), count: context.usage.assets, href: context.usage.assetsHref },
      ]
    : []

  const notes: React.ReactNode[] = []
  if (changes.addedFieldNames.length > 0) notes.push(t.rich("form.summaryNewFields", { names: changes.addedFieldNames.join(", "), b: bold }))
  if (existingAssets > 0 && changes.fieldsAdded > 0) {
    if (changes.addedRequired > 0) {
      notes.push(t("form.summaryExistingAssetsRequired", { count: existingAssets }))
    } else {
      notes.push(t("form.summaryExistingAssets", { count: existingAssets }))
      notes.push(t("form.summaryRequiredHint"))
    }
  }

  return (
    <aside
      data-category-edit-summary
      aria-labelledby="category-summary-title"
      className={cn(getPanelClasses(), "grid min-w-0 content-start gap-4 p-4 sm:p-5 lg:sticky lg:top-4 lg:self-start")}
    >
      <h2 id="category-summary-title" className="text-base font-semibold text-foreground">
        {saved ? t("form.summaryTitle") : t("form.summaryTitleCreate")}
      </h2>

      {usage.length > 0 ? (
        <ul className="grid gap-1 text-sm">
          {usage.map((item) => {
            const content = (
              <>
                <span className="min-w-0 text-muted-foreground">{item.label}</span>
                <b className="ml-auto font-semibold text-foreground num">{formatCount(item.count)}</b>
              </>
            )
            return (
              <li key={item.key}>
                {item.href ? (
                  <Link href={item.href} className="flex min-h-9 items-center gap-2 -mx-2 rounded-md px-2 hover:bg-row-hover">
                    {content}
                    <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-faint-foreground" />
                  </Link>
                ) : (
                  <div className="flex min-h-9 items-center gap-2">{content}</div>
                )}
              </li>
            )
          })}
        </ul>
      ) : null}

      <table data-category-summary-table className="w-full table-fixed border-collapse text-sm">
        <caption className="sr-only">{saved ? t("form.summaryCaption") : t("form.summaryAfter")}</caption>
        <thead>
          <tr className="border-b border-border text-meta text-muted-foreground">
            <td className="w-[42%] pb-1.5" />
            {now ? <th scope="col" className="pb-1.5 text-left font-medium">{t("form.summaryNow")}</th> : null}
            <th scope="col" className="pb-1.5 text-left font-medium">{t("form.summaryAfter")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} data-summary-row={row.key} data-changed={row.changed || undefined} className="border-b border-border-soft last:border-b-0">
              <th scope="row" className="py-2 pr-2 text-left font-normal text-muted-foreground">{row.label}</th>
              {now ? <td className="py-2 pr-2 text-foreground num">{row.now}</td> : null}
              <td className={cn("py-2 num", row.changed ? "font-semibold text-foreground" : "text-foreground")}>{row.after}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {saved ? (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 border-t border-border-soft pt-3 text-sm">
          <dt className="text-muted-foreground">{t("form.summaryInfo")}</dt>
          <dd data-changed={changes.infoChanged || undefined} className={cn("min-w-0 break-words", changes.infoChanged ? "font-semibold text-foreground" : "text-foreground")}>
            {changes.infoChanged ? `${values.code.trim()} · ${values.name.trim()}` : t("form.summaryUnchanged")}
          </dd>
        </dl>
      ) : null}

      {notes.length > 0 ? (
        <ul className="grid gap-2 text-sm text-muted-foreground">
          {notes.map((note, index) => (
            <li key={index} className="flex items-start gap-2">
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-faint-foreground" />
              <span className="min-w-0 break-words">{note}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="border-t border-border-soft pt-3 text-meta text-muted-foreground">
        {context.prefix ? t.rich("form.summaryPrefixNote", { prefix: context.prefix, mono }) : t("form.summaryPrefixNoteNone")}
      </p>
    </aside>
  )
}
