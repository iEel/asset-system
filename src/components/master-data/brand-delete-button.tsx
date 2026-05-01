import { MasterDataDeleteButton } from "@/components/master-data/master-data-delete-button"

export function BrandDeleteButton({ id }: { id: string }) {
  return <MasterDataDeleteButton endpoint={`/api/brands/${id}`} />
}
