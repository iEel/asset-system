import { Fragment, type ReactNode } from "react"
import { orNil } from "@/components/ui/nil"
import { cn } from "@/lib/utils"

// nilLabel is what a screen reader says for an empty value, for example "ไม่มีผู้ถือครอง".
export type KeyValueItem = { key?: string; label: ReactNode; value: ReactNode; nilLabel?: string }

// Mockup dl.kv: a 120px label column beside the values; below sm one column, with 8px before each next label.
// An empty value shows Nil; 0 and false are values. 120px is a layout width inside this component, not a token.
// Server-safe.
export function KeyValueList({ items, className }: { items: readonly KeyValueItem[]; className?: string }) {
  return (
    <dl data-slot="key-value-list" className={cn("grid grid-cols-[120px_minmax(0,1fr)] gap-x-4 gap-y-2 max-sm:grid-cols-1 max-sm:gap-y-0.5 max-sm:[&>dd+dt]:mt-2", className)}>
      {items.map((item, index) => (
        <Fragment key={item.key ?? index}>
          <dt className="text-meta text-faint-foreground">{item.label}</dt>
          <dd className="m-0 min-w-0 break-words text-sm text-foreground">{orNil(item.value, item.nilLabel)}</dd>
        </Fragment>
      ))}
    </dl>
  )
}
