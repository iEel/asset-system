import { MasterDataDeleteButton } from "@/components/master-data/master-data-delete-button"

export function SupplierDeleteButton({ id }: { id: string }) {
  return <MasterDataDeleteButton endpoint={`/api/suppliers/${id}`} />
}
