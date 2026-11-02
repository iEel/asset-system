"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { ContentPanel } from "@/components/ui/content-panel"
import { PaceBar } from "@/components/ui/pace-bar"

// The first card of the asset form (group 4 plan 2 Task 6a, spec §8, P2-R11): every field a save needs, with
// "กรอกแล้ว n จาก m ช่องที่ต้องกรอก" and a bar (no pace mark: there is no target date). Its groups are CardGroups, so no
// panel sits in the panel. The required fields never fold.
export function AssetFormRequiredCard({ title, counter, children }: { title: string; counter?: { filled: number; total: number } | null; children: ReactNode }) {
  const t = useTranslations("asset")
  const counterText = counter ? t("requiredFilled", { filled: counter.filled, total: counter.total }) : null

  return (
    <ContentPanel title={title}>
      {counter ? (
        <div className="mb-5 grid gap-2">
          {/* The bar's own name is the same sentence, so the line is read once. */}
          <p className="text-sm text-muted-foreground" aria-hidden="true">{counterText}</p>
          <PaceBar value={counter.total > 0 ? counter.filled / counter.total : 0} pace={null} label={counterText ?? ""} behind={false} />
        </div>
      ) : null}
      <div className="space-y-6">{children}</div>
    </ContentPanel>
  )
}
