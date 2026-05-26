"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { AssetBatchForm } from "@/components/assets/asset-batch-form"
import { AssetForm } from "@/components/assets/asset-form"

type AssetCreateWorkspaceProps = React.ComponentProps<typeof AssetForm>

export function AssetCreateWorkspace(props: AssetCreateWorkspaceProps) {
  const t = useTranslations("asset")
  const [mode, setMode] = useState<"single" | "batch">("single")

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-md border border-border bg-surface p-1">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`h-9 rounded px-3 text-sm font-medium transition-colors ${
            mode === "single" ? "bg-primary text-white" : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          {t("createModeSingle")}
        </button>
        <button
          type="button"
          onClick={() => setMode("batch")}
          className={`h-9 rounded px-3 text-sm font-medium transition-colors ${
            mode === "batch" ? "bg-primary text-white" : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          {t("createModeBatch")}
        </button>
      </div>

      {mode === "single" ? <AssetForm {...props} /> : <AssetBatchForm {...props} />}
    </div>
  )
}
