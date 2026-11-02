"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { AssetBatchForm } from "@/components/assets/asset-batch-form"
import { AssetForm } from "@/components/assets/asset-form"
import { Segmented } from "@/components/ui/segmented"

type AssetCreateWorkspaceProps = React.ComponentProps<typeof AssetForm>

export function AssetCreateWorkspace(props: AssetCreateWorkspaceProps) {
  const t = useTranslations("asset")
  const [mode, setMode] = useState<"single" | "batch">("single")
  // The two modes draw the switch in different places, so the pressed button is a new one: focus moves to it after a
  // change, never left on the page's body (WCAG 2.4.3, final review).
  const shownMode = useRef(mode)
  useEffect(() => {
    if (shownMode.current === mode) return
    shownMode.current = mode
    const group = `[data-slot="segmented"][aria-label="${CSS.escape(t("createModeLabel"))}"]`
    document.querySelector<HTMLElement>(`${group} [aria-pressed="true"]`)?.focus()
  }, [mode, t])
  // The single form shows the switch in its header (group 4 plan 2 Task 6a, spec §8); the batch form keeps it above.
  const modeSwitch = (
    <Segmented
      aria-label={t("createModeLabel")}
      value={mode}
      onValueChange={setMode}
      options={[
        { value: "single", label: t("createModeSingle") },
        { value: "batch", label: t("createModeBatch") },
      ]}
    />
  )

  if (props.cloneSource) {
    return <AssetForm {...props} />
  }

  if (mode === "single") return <AssetForm {...props} headerActions={modeSwitch} />

  return (
    <div className="space-y-4">
      {modeSwitch}
      <AssetBatchForm {...props} />
    </div>
  )
}
