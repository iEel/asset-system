import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { SearchField } from "@/components/ui/search-field"

export function MasterDataSearch({
  action,
  defaultValue,
  placeholder,
  submitLabel,
  hiddenInputs = {},
  children,
}: {
  action: string
  defaultValue: string
  placeholder: string
  submitLabel: string
  hiddenInputs?: Record<string, string | number>
  // More toolbar fields (a FilterSelect with hideLabel and fieldSize="md"), placed between the search and the button.
  children?: ReactNode
}) {
  // A toolbar, not a card (B3(4)): no frame, 36px from md, stacked at 44px below sm. mb-4 beats the page root's
  // space-y-6, so the search sits 16px above its table. The field is named by the button's word ("ค้นหา"), like
  // the register search; the placeholder is read as its description. No clear button: a server page has no handler.
  return (
    <form role="search" action={action} className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {Object.entries(hiddenInputs).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SearchField name="search" defaultValue={defaultValue} placeholder={placeholder} aria-label={submitLabel} fieldSize="md" className="sm:flex-[1_1_320px]" />
      {children}
      <Button type="submit" variant="outline" size="md">{submitLabel}</Button>
    </form>
  )
}
