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

  if (props.cloneSource) {
    return <AssetForm {...props} />
  }

  return (
    <div className="space-y-4">
      <Segmented
        aria-label={t("createModeLabel")}
        value={mode}
        onValueChange={setMode}
        options={[
          { value: "single", label: t("createModeSingle") },
          { value: "batch", label: t("createModeBatch") },
        ]}
      />

      {mode === "single" ? <AssetForm {...props} /> : <AssetBatchForm {...props} />}
    </div>
  )
}
