import * as React from "react"
import { cn } from "@/lib/utils"
import { fieldReadOnlyClasses, textareaClasses } from "@/components/ui/field-variants"

// Server-safe. Callers set a taller box with min-h-28 / min-h-32 or rows.
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(textareaClasses, fieldReadOnlyClasses, className)} {...props} />
}

export { Textarea }
