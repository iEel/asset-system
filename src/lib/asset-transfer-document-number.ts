export function renderTransferDocumentNo(date: Date, running: number): string {
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `TR-${year}${month}-${String(running).padStart(4, "0")}`
}
