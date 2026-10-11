import { cva } from "class-variance-authority"

// One look for every field: <input>, <select>, <textarea> and the SearchableSelect trigger (spec 2A section 6.4).
// Plain TS with no React and no "@/" imports, so tests and src/lib/design-system.ts can import this file directly.
export type FieldSize = "md" | "lg" | "xl"

// Corners are rounded-md (8px), like the mockup's .input (spec I15). Tailwind emits aria-* after focus, so without
// the aria-invalid:focus:* row a focused invalid field would get a red ring; that row brings back the one focus color.
// No read-only: here, because :read-only matches every <select> and <button>; Input and Textarea add
// fieldReadOnlyClasses themselves. No placeholder color: the ::placeholder base rule in globals.css sets it.
const fieldBase = [
  "w-full min-w-0 rounded-md border border-input bg-surface px-3 text-foreground outline-none",
  "transition-[color,background-color,border-color,box-shadow] motion-reduce:transition-none",
  "focus:border-ring focus:ring-1 focus:ring-ring focus:shadow-field-focus",
  "aria-invalid:border-danger aria-invalid:ring-1 aria-invalid:ring-danger aria-invalid:shadow-field-error",
  "aria-invalid:focus:border-ring aria-invalid:focus:ring-ring aria-invalid:focus:shadow-field-focus",
  "disabled:cursor-not-allowed disabled:border-border disabled:bg-background disabled:text-faint-foreground",
].join(" ")

// Same size names as the buttons, switching at md. Below md every size is at least 44px with 16px text, so iOS
// does not zoom when a field is tapped. xl (the audit scan search) stays 48px and 16px at every width.
// Change the height through fieldSize: a className like h-12 cannot beat md:h-10.
export const fieldControlVariants = cva(fieldBase, {
  variants: {
    fieldSize: {
      md: "h-11 text-base md:h-9 md:text-sm",
      lg: "h-11 text-base md:h-10 md:text-sm",
      xl: "h-12 text-base",
    },
  },
  defaultVariants: {
    fieldSize: "lg",
  },
})

export const textareaClasses = `${fieldBase} min-h-24 py-2 text-base md:text-sm resize-y`

// A read-only value stays readable and copyable: quiet box, normal text color, same focus ring.
export const fieldReadOnlyClasses = "read-only:border-border read-only:bg-background"

// Native checkbox and radio. Color comes from accent-color and focus from the base :focus-visible outline
// (phase 1), so no outline-none. The 44px hit area belongs to the <label> row around the box.
export const checkboxVariants = cva("shrink-0 cursor-pointer disabled:cursor-not-allowed", {
  variants: {
    size: {
      md: "size-4",
      lg: "size-5",
    },
  },
  defaultVariants: {
    size: "md",
  },
})
