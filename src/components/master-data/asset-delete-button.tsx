import { MasterDataDeleteButton } from "@/components/master-data/master-data-delete-button"

export function AssetDeleteButton({ id }: { id: string }) {
  return <MasterDataDeleteButton endpoint={`/api/assets/${id}`} />
}
