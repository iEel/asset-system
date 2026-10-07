export type ConfirmTone = "default" | "destructive"

export type ConfirmOptions = {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
}

export type ConfirmRequest = ConfirmOptions & {
  id: number
  resolve: (confirmed: boolean) => void
}

export type ConfirmQueue = {
  current: ConfirmRequest | null
  pending: ConfirmRequest[]
}

export const emptyConfirmQueue: ConfirmQueue = { current: null, pending: [] }

export function enqueueConfirm(queue: ConfirmQueue, request: ConfirmRequest): ConfirmQueue {
  if (!queue.current) return { current: request, pending: queue.pending }
  return { current: queue.current, pending: [...queue.pending, request] }
}

export function settleConfirm(queue: ConfirmQueue, id: number): { queue: ConfirmQueue; settled: ConfirmRequest | null } {
  if (!queue.current || queue.current.id !== id) return { queue, settled: null }
  const [next = null, ...rest] = queue.pending
  return { queue: { current: next, pending: rest }, settled: queue.current }
}
