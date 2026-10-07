"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useOptimistic, useRef, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { buildAssetQueryString, type AssetListFilters } from "@/lib/asset-list-query"
import { mergeAssetRegisterFilters } from "@/lib/asset-register-filters"

type AssetRegisterNavigation = {
  filters: AssetListFilters
  isPending: boolean
  navigate: (overrides: Partial<AssetListFilters>) => void
}

const AssetRegisterNavigationContext = createContext<AssetRegisterNavigation | null>(null)

export function AssetRegisterNavigationProvider({
  filters,
  children,
}: {
  filters: AssetListFilters
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [optimisticFilters, setOptimisticFilters] = useOptimistic(
    filters,
    (_current: AssetListFilters, next: AssetListFilters) => next,
  )
  // Two changes inside one debounce window must merge, not overwrite each other.
  const latestFiltersRef = useRef(optimisticFilters)

  useEffect(() => {
    latestFiltersRef.current = optimisticFilters
  }, [optimisticFilters])

  const navigate = useCallback((overrides: Partial<AssetListFilters>) => {
    const next = mergeAssetRegisterFilters(latestFiltersRef.current, overrides)
    latestFiltersRef.current = next
    startTransition(() => {
      setOptimisticFilters(next)
      router.replace(`${pathname}?${buildAssetQueryString(next)}`, { scroll: false })
    })
  }, [pathname, router, setOptimisticFilters])

  const value = useMemo(
    () => ({ filters: optimisticFilters, isPending, navigate }),
    [optimisticFilters, isPending, navigate],
  )

  return <AssetRegisterNavigationContext.Provider value={value}>{children}</AssetRegisterNavigationContext.Provider>
}

export function useAssetRegisterNavigation() {
  const value = useContext(AssetRegisterNavigationContext)
  if (!value) throw new Error("useAssetRegisterNavigation must be used inside AssetRegisterNavigationProvider")
  return value
}
