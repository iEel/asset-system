import type React from "react"
import { Button } from "@/components/ui/button"
import type { UiButtonSize, UiButtonVariant } from "@/lib/design-system"

type ActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: UiButtonVariant
  size?: UiButtonSize
}

const variantMap = { primary: "default", secondary: "outline", danger: "destructive", ghost: "ghost" } as const
const sizeMap = { md: "default", sm: "sm" } as const

/**
 * @deprecated Use `Button`. Phase 2D moves the nine call sites and deletes this file.
 * The mapping is unchanged: primary→default, secondary→outline, danger→destructive (solid red, for dialog confirms
 * only; Button's `danger` is the outlined in-page variant), ghost→ghost; md→default (follows the 2D switch), sm→sm.
 */
export function ActionButton({ variant = "secondary", size = "md", type = "button", ...props }: ActionButtonProps) {
  return <Button type={type} variant={variantMap[variant]} size={sizeMap[size]} {...props} />
}
