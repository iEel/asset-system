import * as React from "react"
import { cn } from "@/lib/utils"
import { fieldControlVariants, fieldReadOnlyClasses, type FieldSize } from "@/components/ui/field-variants"

// The types a one-line field takes. A plain union on purpose: Exclude<HTMLInputTypeAttribute, ...> keeps
// `string & {}` and would accept anything. checkbox, radio, file, hidden, range and color are not fields.
export type InputType = "text" | "search" | "email" | "password" | "tel" | "url" | "number" | "date" | "datetime-local" | "time" | "month"

// Digits in these types line up in columns (the num utility).
const numericInputTypes: ReadonlySet<InputType> = new Set(["number", "date", "datetime-local", "time"])

// No directive and no hooks, so server pages can render it. The size prop is fieldSize: <input size> is an HTML attribute.
function Input({
  className,
  fieldSize,
  type,
  ...props
}: Omit<React.ComponentProps<"input">, "size" | "type"> & { fieldSize?: FieldSize; type?: InputType }) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(fieldControlVariants({ fieldSize }), fieldReadOnlyClasses, type !== undefined && numericInputTypes.has(type) && "num", className)}
      {...props}
    />
  )
}

export { Input }
