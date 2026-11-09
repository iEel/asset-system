"use client"

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import type { InspectionConfirmTab } from "@/lib/inspection-confirm-rules"
import type { InspectionBlockedEntry } from "./inspection-confirm-dialog"

/**
 * The last confirm's answer, for the round and tab it ran on: a 200's count, or a 409's blocked entries. focused: it has
 * taken focus once, so a later mount takes it again only when focus fell to the body.
 */
export type InspectionConfirmResult = { roundId: string; tab: InspectionConfirmTab; focused: boolean } & (
  | { kind: "success"; confirmed: number }
  | { kind: "changed"; blocked: InspectionBlockedEntry[] }
)

type ResultStore = { result: InspectionConfirmResult | null; setResult: Dispatch<SetStateAction<InspectionConfirmResult | null>> }

const InspectionConfirmResultContext = createContext<ResultStore | null>(null)

// Held by confirm/layout.tsx, above the page segment (as findings/layout.tsx holds the batch result, P4-R34): after a
// confirm the workspace replaces the URL with ?tab=<the same tab>, and a URL that differs from the one shown remounts the
// page's renders, the workspace with them. The answer must outlive that.
export function InspectionConfirmResultProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<InspectionConfirmResult | null>(null)
  return <InspectionConfirmResultContext.Provider value={{ result, setResult }}>{children}</InspectionConfirmResultContext.Provider>
}

export function useInspectionConfirmResult(): ResultStore {
  const store = useContext(InspectionConfirmResultContext)
  if (!store) throw new Error("The confirm workspace must be rendered within InspectionConfirmResultProvider")
  return store
}
