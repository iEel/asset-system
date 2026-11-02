"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { AssetBatchForm } from "@/components/assets/asset-batch-form"
import { AssetForm } from "@/components/assets/asset-form"
import { Segmented } from "@/components/ui/segmented"

type AssetCreateWorkspaceProps = React.ComponentProps<typeof AssetForm>

export function AssetCreateWorkspace(props: AssetCreateWorkspaceProps) {
  const t = useTranslations("asset")
  const [mode, setMode] = useState<"single" | "batch">("single")
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
