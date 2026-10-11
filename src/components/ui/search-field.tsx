import * as React from "react"
import { Loader2, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { FieldSize } from "@/components/ui/field-variants"

type SearchFieldProps = Omit<React.ComponentProps<"input">, "size" | "type"> & {
  type?: "search" | "text"
  fieldSize?: FieldSize
  loading?: boolean
  // At most one extra icon button, 44px wide or less (the audit scan camera button, for example).
  trailing?: React.ReactNode
} & ({ onClear?: undefined; clearLabel?: undefined } | { onClear: () => void; clearLabel: string })

// A search box: icon laid over an Input with pl-9, so border, focus, error and disabled stay on one element.
// className goes on the wrapper (layout); every other prop goes to the Input. Server pages may use it without
// onClear (a server page cannot pass a function). The WebKit clear button is always hidden so every browser matches.
function SearchField({ className, type = "search", fieldSize, loading = false, trailing, onClear, clearLabel, value, ...props }: SearchFieldProps) {
  const showClear = onClear !== undefined && value !== undefined && String(value) !== ""
  const trailingCount = (showClear ? 1 : 0) + (trailing ? 1 : 0)

  return (
    <div data-slot="search-field" className={cn("relative min-w-0", className)}>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-faint-foreground" aria-hidden="true">
        {loading ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <Search className="size-4" />}
      </span>
      <Input
        type={type}
        fieldSize={fieldSize}
        value={value}
        className={cn("pl-9 [&::-webkit-search-cancel-button]:appearance-none", trailingCount === 1 && "pr-12", trailingCount === 2 && "pr-24")}
        {...props}
      />
      {trailingCount > 0 ? (
        <div className="absolute inset-y-0 right-0.5 flex items-center gap-0.5">
          {showClear ? (
            <button type="button" aria-label={clearLabel} onClick={onClear} className="inline-flex h-full w-11 items-center justify-center rounded-control text-faint-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
          {trailing}
        </div>
      ) : null}
    </div>
  )
}

export { SearchField }
