import type React from "react"
import { cn } from "@/lib/utils"
import { getActionButtonClasses, type UiButtonSize, type UiButtonVariant } from "@/lib/design-system"

type ActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: UiButtonVariant
  size?: UiButtonSize
}

export function ActionButton({ variant = "secondary", size = "md", className, type = "button", ...props }: ActionButtonProps) {
  return <button type={type} className={cn(getActionButtonClasses(variant, size), className)} {...props} />
}
