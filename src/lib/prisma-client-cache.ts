export const requiredPrismaDelegates = ["maintenancePlan"] as const

export function hasPrismaModelDelegate(client: unknown, delegate: string) {
  if (!client || typeof client !== "object") return false

  const modelDelegate = (client as Record<string, unknown>)[delegate]
  return (
    !!modelDelegate &&
    typeof modelDelegate === "object" &&
    typeof (modelDelegate as { findMany?: unknown }).findMany === "function"
  )
}

export function isPrismaClientCacheUsable(client: unknown) {
  return requiredPrismaDelegates.every((delegate) => hasPrismaModelDelegate(client, delegate))
}
