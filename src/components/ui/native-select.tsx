import * as React from "react"
import { cn } from "@/lib/utils"
import { fieldControlVariants, type FieldSize } from "@/components/ui/field-variants"

// The browser's own <select> with the field look. Named NativeSelect because four forms already declare a local
// `function Select` (spec I9). select-chevron draws the arrow (the system arrow returns in forced-colors mode) and
// pr-9 leaves room for it. No read-only look: :read-only always matches a <select>. Server-safe.
function NativeSelect({
  className,
  fieldSize,
  ...props
}: Omit<React.ComponentProps<"select">, "size" | "multiple"> & { fieldSize?: FieldSize }) {
  return <select data-slot="native-select" className={cn(fieldControlVariants({ fieldSize }), "select-chevron cursor-pointer pr-9", className)} {...props} />
}

export { NativeSelect }
