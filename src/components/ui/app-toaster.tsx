"use client"

import type { CSSProperties } from "react"
import { X } from "lucide-react"
import { useTranslations } from "next-intl"
import { Toaster } from "sonner"
import { toneIcons } from "@/components/ui/tone-icons"

const { success: SuccessIcon, info: InfoIcon, warning: WarningIcon, danger: DangerIcon } = toneIcons

// Each type has its own icon shape, so the tone reads without color. globals.css ("Quiet toasts") colors the icon and
// centers it on the first 22px line; the text stays foreground for every type.
const toastIcons = {
  success: <SuccessIcon className="size-4" />,
  info: <InfoIcon className="size-4" />,
  warning: <WarningIcon className="size-4" />,
  error: <DangerIcon className="size-4" />,
  close: <X className="size-4" />,
}

// sonner writes --width (356px) inline on its list, so the wider width that Thai text needs must come through style.
const toasterStyle = { "--width": "380px" } as CSSProperties

/** 8px under the shell's top edge (--shell-top). sonner 2 passes string offsets through as CSS. */
const toasterTop = "calc(var(--shell-top) + 8px)"

/**
 * The app's one toast region, rendered by src/app/[locale]/layout.tsx. No call site changes: toast.success / error /
 * warning keep working. Toasts sit 8px under the shell's top edge (--shell-top), stay 6 seconds (Thai sentences run longer; sonner pauses
 * on hover, focus and hidden tabs) and have a close button, because Escape only collapses the stack. The region and
 * the close button take their names from messages (notifications.title, common.close).
 */
export function AppToaster() {
  const tCommon = useTranslations("common")
  const tNotifications = useTranslations("notifications")

  return (
    <Toaster
      position="top-right"
      offset={{ top: toasterTop, right: 16 }}
      mobileOffset={{ top: toasterTop }}
      duration={6000}
      closeButton
      containerAriaLabel={tNotifications("title")}
      toastOptions={{ closeButtonAriaLabel: tCommon("close") }}
      icons={toastIcons}
      style={toasterStyle}
    />
  )
}
